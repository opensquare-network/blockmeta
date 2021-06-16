require("dotenv").config();
const { getNextScanHeight, updateScanHeight } = require("./mongo/scanHeight");
const { getApi } = require("./chain/api");
const { updateHeight, getLatestHeight } = require("./chain/latestHead");
const { sleep } = require("./utils");
const { getBlockCollection } = require("./mongo/col")
const { logger } = require("./utils/logger")
const { deleteFromHeight } = require("./mongo/delete")

async function main() {
  await updateHeight();
  let scanHeight = await getNextScanHeight();
  const api = await getApi();
  await deleteFromHeight(scanHeight);
  const step = parseInt(process.env.SCAN_STEP) || 100

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
      const promises = targetHeights.map(height => scanByHeight(api, height))
      await Promise.all(promises)
    } catch (e) {
      await deleteFromHeight(scanHeight)
      await sleep(3000);
      console.error(`Error with block scan ${scanHeight}...${destHeight}`, e);
      continue;
    }

    await updateScanHeight(destHeight);
    scanHeight = destHeight + 1
  }
}

async function scanByHeight(api, scanHeight) {
  let blockHash;
  try {
    blockHash = await api.rpc.chain.getBlockHash(scanHeight);
  } catch (e) {
    console.error("Can not get block hash");
    throw e;
  }

  const [block, allEvents, runtimeVersion] = await Promise.all([
    api.rpc.chain.getBlock(blockHash),
    api.query.system.events.at(blockHash),
    api.rpc.state.getRuntimeVersion(blockHash)
  ])

  const col = await getBlockCollection()
  await col.insertOne({
    height: scanHeight,
    block: block.toHex(),
    events: allEvents.toHex(),
    specVersion: runtimeVersion.specVersion.toNumber()
  })

  logger.info(`${scanHeight} done`);
}

// FIXME: log the error
main().catch(console.error);
