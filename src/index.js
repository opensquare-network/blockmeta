require("dotenv").config();

const { extractAuthor } = require("@polkadot/api-derive/type/util");
const { getNextScanHeight, updateScanHeight } = require("./mongo/scanHeight");
const { getApi } = require("./chain/api");
const { updateHeight, getLatestHeight } = require("./chain/latestHead");
const { sleep } = require("./utils");
const { getBlockCollection, getVersionCollection } = require("./mongo/col")
const { logger } = require("./utils/logger")
const { deleteFromHeight } = require("./mongo/delete")
const { getLatestRuntimeVersion } = require("./mongo/service");
const { extractDifferentVersions } = require("./utils/runtimeVersions")

const eventsKey = '0x26aa394eea5630e07c48ae0c9558cef780d41e5e16056765bc8461851072c9d7';

let latestVersion = null;

async function insertBlocksMeta(blocksData = []) {
  if (blocksData.length <= 0) {
    return
  }

  const col = await getBlockCollection()
  const bulk = col.initializeUnorderedBulkOp();
  for (const data of blocksData) {
    bulk.insert(data)
  }
  await bulk.execute()
}

async function insertVersions(versions = []) {
  if (versions.length <= 0) {
    return
  }

  const col = await getVersionCollection();
  const bulk = col.initializeUnorderedBulkOp();
  for (const version of versions) {
    bulk.insert(version)
  }
  await bulk.execute()
}

async function main() {
  await updateHeight();
  let scanHeight = await getNextScanHeight();
  const { api, provider } = await getApi();
  await deleteFromHeight(scanHeight);
  logger.info(`deleted from ${ scanHeight }`);
  const step = parseInt(process.env.SCAN_STEP) || 5;
  latestVersion = await getLatestRuntimeVersion();

  while (true) {
    const chainHeight = getLatestHeight();

    if (scanHeight > chainHeight) {
      // Just wait if the to scan height greater than current chain height
      await sleep(1000);
      continue;
    }

    const targetHeights = [];
    let height = scanHeight;
    while (height <= chainHeight && height < scanHeight + step) {
      targetHeights.push(height++)
    }

    const destHeight = targetHeights[targetHeights.length - 1]

    try {
      const promises = targetHeights.map(height => scanByHeight(api, provider, height));
      const dataArr = await Promise.all(promises);
      const metaArr = dataArr.map(i => i.meta);
      const runtimeVersions = dataArr.map(i => i.version);
      const differentVersions = extractDifferentVersions(runtimeVersions, latestVersion?.runtimeVersion);

      await insertBlocksMeta(metaArr);
      await insertVersions(differentVersions);

      if (runtimeVersions.length > 0) {
        latestVersion = runtimeVersions[runtimeVersions.length - 1]
      }
    } catch (e) {
      await deleteFromHeight(scanHeight)
      logger.info(`deleted from ${ scanHeight }`);
      await sleep(3000);
      logger.error(`Error with block scan ${ scanHeight }...${ destHeight }`, e);
      continue;
    }

    logger.info(`${ destHeight } done`)
    await updateScanHeight(destHeight);
    scanHeight = destHeight + 1;
    await sleep(1);
  }
}

async function scanByHeight(api, provider, scanHeight) {
  let blockHash;
  try {
    blockHash = await provider.send('chain_getBlockHash', [scanHeight])
  } catch (e) {
    console.error("Can not get block hash");
    throw e;
  }

  const blockApi = await api.at(blockHash);
  const [block, allEvents, runtimeVersion, validators] = await Promise.all([
    provider.send('chain_getBlock', [blockHash]),
    provider.send('state_getStorageAt', [eventsKey, blockHash]),
    provider.send('chain_getRuntimeVersion', [blockHash]),
    blockApi.query.session.validators(),
  ])

  const digest = api.registry.createType('Digest', block.block.header.digest, true)
  const author = extractAuthor(digest, validators);

  const meta = {
    height: scanHeight,
    block: block,
    events: allEvents,
    author: author?.toString(),
  }

  return {
    meta,
    version: {
      height: scanHeight,
      runtimeVersion,
    },
  }
}

async function test() {
  const { api, provider } = await getApi()

  const data = await scanByHeight(api, provider, 501);
  console.log(data)
}

main().catch(e => logger.error('main error:', e));
// test()
