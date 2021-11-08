const { getVersionCollection, getBlockCollection } = require("./col");

async function getLatestRuntimeVersion() {
  const col = await getVersionCollection();

  const versions = await col.find({}).sort({ height: -1 }).limit(1).toArray()

  if (versions.length <= 0) {
    return null
  }

  return versions[0];
}

async function getFirstNonBlockHash() {
  const col = await getBlockCollection();
  const block = await col.find({ blockHash: { $exists: false } }).sort({ height: 1 }).limit(1).toArray()
  if (!block) {
    return null
  }

  return block[0].height
}

async function getBlocks(startHeight, endHeight) {
  const col = await getBlockCollection();
  return await col
    .find({
      $and: [
        { height: { $gte: startHeight } },
        { height: { $lte: endHeight } },
        { blockHash: { $exists: false } }
      ],
    })
    .sort({ height: 1 })
    .toArray();
}

module.exports = {
  getLatestRuntimeVersion,
  getBlocks,
  getFirstNonBlockHash,
}
