const { MongoClient } = require("mongodb");

function getDbName() {
  const dbName = process.env.MONGO_DB_NAME;
  if (!dbName) {
    throw new Error("MONGO_DB_NAME not set")
  }

  return dbName
}

const statusCollectionName = "status";
// store runtime versions
const versionCollectionName = "version";
const blockCollectionName = "block";

let statusCol = null;
let blockCol = null;
let versionCol = null;

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
  versionCol = db.collection(versionCollectionName);

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

async function getVersionCollection() {
  await tryInit(versionCol);
  return versionCol;
}

module.exports = {
  getStatusCollection,
  getBlockCollection,
  getVersionCollection,
}
