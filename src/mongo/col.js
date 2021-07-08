const { MongoClient } = require("mongodb");
const { currentChain, CHAINS } = require("../chain/chain");

function getDbName() {
  const chain = currentChain();
  if (CHAINS.KUSAMA === chain) {
    return process.env.MONGO_DB_KSM_NAME || "meta-ksm";
  } else if (CHAINS.WESTMINT === chain) {
    return process.env.MONGO_DB_WESTMINT_NAME || "meta-westmint";
  } else if (CHAINS.STATEMINE === chain) {
    return process.env.MONGO_DB_STATEMINE_NAME || "meta-statemine";
  } else {
    return process.env.MONGO_DB_DOT_NAME || "meta-dot";
  }
}

const statusCollectionName = "status";
const blockCollectionName = "block";

let statusCol = null;
let blockCol = null

let client = null;
let db = null;

const mongoUrl = process.env.MONGO_URL || "mongodb://localhost:27017";

async function initDb() {
  client = await MongoClient.connect(mongoUrl, {
    useUnifiedTopology: true,
  });

  db = client.db(getDbName());
  statusCol = db.collection(statusCollectionName);
  blockCol = db.collection(blockCollectionName);

  await _createIndexes();
}

async function _createIndexes() {
  if (!db) {
    console.error("Please call initDb first");
    process.exit(1);
  }

  await blockCol.createIndex({ height: -1 }, { unique: true })

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

async function getBlockCollection() {
  await tryInit(blockCol);
  return blockCol;
}

module.exports = {
  getStatusCollection,
  getBlockCollection,
}
