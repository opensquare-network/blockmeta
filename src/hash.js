require("dotenv").config();
const { getApi } = require("./chain/api");
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

    const col = await getBlockCollection()
    const bulk = col.initializeUnorderedBulkOp();
    for (const block of blocks) {
      const height = block.height

      const { provider } = await getApi()
      const blockHash = await provider.send('chain_getBlockHash', [height])
      bulk.find({ height }).update({ $set: { blockHash } })
    }

    await bulk.execute()
    console.log(`${start} - ${end} done!`)

    await sleep(1);
    start = end + 1;
  }
}

main().catch(e => console.error('main error:', e));
