require("dotenv").config();
const { getOnlyProvider } = require("./chain/provider");
const { getBlockCollection } = require("./mongo/col");
const { sleep } = require("./utils");
const { getBlocks, getFirstNonBlockHash, } = require("./mongo/service");

const step = parseInt(process.env.SCAN_STEP) || 500;

async function main() {
  let start = await getFirstNonBlockHash();
  if (!start) {
    console.log('All good!')
    process.exit(0)
  }

  while (true) {
    let end = start + step;
    const blocks = await getBlocks(start, end);
    if ((blocks || []).length <= 0) {
      console.log('find no blocks, sleep 3 secs')
      await sleep(3000)
      continue
    }

    const promises = []
    const col = await getBlockCollection()
    for (const block of blocks) {
      const height = block.height
      promises.push(getBlockHash(height))
    }

    const hashes = await Promise.all(promises);
    const bulk = col.initializeUnorderedBulkOp();
    for (const { height, blockHash } of hashes) {
      bulk.find({ height }).update({ $set: { blockHash } })
    }

    await bulk.execute()
    console.log(`${ start } - ${ end } done!`)

    await sleep(1);
    start = end + 1;
  }
}

async function getBlockHash(height) {
  const provider = await getOnlyProvider()
  const blockHash = await provider.send('chain_getBlockHash', [height])

  return {
    height,
    blockHash
  }
}

main().catch(e => console.error('main error:', e));
