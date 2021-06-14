const { getNextScanHeight, updateScanHeight } = require("./mongo/scanHeight");
const { getApi } = require("./chain/api");
const { updateHeight, getLatestHeight } = require("./chain/latestHead");
const { sleep } = require("./utils");

async function main() {
  await updateHeight();
  let scanHeight = await getNextScanHeight();
  const api = await getApi();

  while (true) {
    const chainHeight = getLatestHeight();

    if (scanHeight > chainHeight) {
      // Just wait if the to scan height greater than current chain height
      await sleep(1000);
      continue;
    }

    try {
      await scanByHeight(api, scanHeight);
    } catch (e) {
      await sleep(3000);
      console.error(`Error with block scan ${scanHeight}`, e);
      continue;
    }

    await updateScanHeight(scanHeight++);
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

  const block = await api.rpc.chain.getBlock(blockHash);
  const allEvents = await api.query.system.events.at(blockHash);

  console.log(block, allEvents)
}

// FIXME: log the error
main().catch(console.error);
