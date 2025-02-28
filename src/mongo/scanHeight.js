const { getStatusCollection } = require("./col");

const genesisHeight = 1;
const mainScanName = "main-scan-height";

function getGenesisHeight() {
  if ("cere-testnet" === process.env.CHAIN) {
    return 891032;
  }

  return genesisHeight;
}

async function getNextScanHeight() {
  const statusCol = await getStatusCollection();
  const heightInfo = await statusCol.findOne({ name: mainScanName });

  if (!heightInfo) {
    return getGenesisHeight();
  } else if (typeof heightInfo.value === "number") {
    return heightInfo.value + 1;
  } else {
    console.error("Scan height value error in DB!");
    process.exit(1);
  }
}

async function updateScanHeight(height) {
  const statusCol = await getStatusCollection();
  await statusCol.findOneAndUpdate(
    { name: mainScanName },
    { $set: { value: height } },
    { upsert: true }
  );
}

module.exports = {
  getNextScanHeight,
  updateScanHeight,
};
