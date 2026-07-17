require("dotenv").config();

const { getNextScanHeight, updateScanHeight } = require("./mongo/scanHeight");
const { getApi, isApiConnected } = require("./chain/api");
const { updateHeight, getLatestHeight } = require("./chain/latestHead");
const { sleep } = require("./utils");
const { getBlockCollection, getVersionCollection } = require("./mongo/col");
const { logger } = require("./utils/logger");
const { deleteFromHeight } = require("./mongo/delete");
const { getLatestRuntimeVersion } = require("./mongo/service");
const { extractDifferentVersions } = require("./utils/runtimeVersions");
const { eventsKey, scanByHeight } = require("./scanBlock");

let latestVersion = null;

async function insertBlocksMeta(blocksData = []) {
  if (blocksData.length <= 0) {
    return;
  }

  const col = await getBlockCollection();
  const bulk = col.initializeUnorderedBulkOp();
  for (const data of blocksData) {
    bulk.insert(data);
  }
  await bulk.execute();
}

async function insertVersions(versions = []) {
  if (versions.length <= 0) {
    return;
  }

  const col = await getVersionCollection();
  const bulk = col.initializeUnorderedBulkOp();
  for (const version of versions) {
    bulk.insert(version);
  }
  await bulk.execute();
}

async function getToScanHeight() {
  let scanHeight = await getNextScanHeight();
  if (process.env.SCAN_FROM_LATEST === "1") {
    scanHeight = getLatestHeight();
  }

  return scanHeight;
}

async function main() {
  await updateHeight();
  let scanHeight = await getToScanHeight();
  const { api, provider } = await getApi();
  await deleteFromHeight(scanHeight);
  logger.info(`deleted from ${scanHeight}`);
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
      targetHeights.push(height++);
    }

    const destHeight = targetHeights[targetHeights.length - 1];

    try {
      const promises = targetHeights.map((height) =>
        scanByHeight(api, provider, height),
      );
      const dataArr = await Promise.all(promises);
      const metaArr = dataArr.map((i) => i.meta);
      const runtimeVersions = dataArr.map((i) => i.version);
      const differentVersions = extractDifferentVersions(
        runtimeVersions,
        latestVersion?.runtimeVersion,
      );

      await insertBlocksMeta(metaArr);
      await insertVersions(differentVersions);

      if (runtimeVersions.length > 0) {
        latestVersion = runtimeVersions[runtimeVersions.length - 1];
      }
    } catch (e) {
      await deleteFromHeight(scanHeight);
      logger.info(`deleted from ${scanHeight}`);

      if (!isApiConnected()) {
        logger.info(`provider disconnected, will restart`);
        process.exit(0);
      }

      await sleep(3000);
      logger.error(`Error with block scan ${scanHeight}...${destHeight}`, e);
      continue;
    }

    logger.info(`${destHeight} done`);
    await updateScanHeight(destHeight);
    scanHeight = destHeight + 1;
    await sleep(1);
  }
}

async function test() {
  const { api, provider } = await getApi();

  const data = await scanByHeight(api, provider, 501);
  console.log(data);
}

main().catch((e) => logger.error("main error:", e));
// test()
