const { getVersionCollection } = require("./col");

async function getLatestRuntimeVersion() {
  const col = await getVersionCollection();

  const versions = await col.find({}).sort({ height: -1 }).limit(1).toArray()

  if (versions.length <= 0) {
    return null
  }

  return versions[0];
}

module.exports = {
  getLatestRuntimeVersion,
}
