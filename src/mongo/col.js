const { MongoClient } = require("mongodb");
const { currentChain } = require("../chain/chain");

function getDbName() {
  const chain = currentChain();
  if ("kusama" === chain) {
    return process.env.MONGO_DB_KSM_NAME || "meta-ksm";
  } else {
    return process.env.MONGO_DB_DOT_NAME || "meta-dot";
  }
}

const statusCollectionName = "status";
let statusCol = null;

let client = null;
let db = null;

const mongoUrl = process.env.MONGO_URL || "mongodb://localhost:27017";

async function initDb() {
  client = await MongoClient.connect(mongoUrl, {
    useUnifiedTopology: true,
  });

  db = client.db(getDbName());
  statusCol = db.collection(statusCollectionName);

  await _createIndexes();
}

async function _createIndexes() {
  if (!db) {
    console.error("Please call initDb first");
    process.exit(1);
  }

  // TODO: create indexes for better query performance
}

async function tryInit(col) {
  if (!col) {
    await initDb();
  }
}

async function getStatusCollection() {
  await tryInit(statusCol);
  return statusCol;
}

module.exports = {
  getStatusCollection
}
