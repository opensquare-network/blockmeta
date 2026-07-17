require("dotenv").config();

const { createClient } = require("@polkadot-api/substrate-client");
const { Binary } = require("@polkadot-api/substrate-bindings");
const { getWsProvider } = require("@polkadot-api/ws-provider");
const { getApi } = require("./chain/api");
const {
  disconnect: disconnectMongo,
  getBlockCollection,
  getVersionCollection,
} = require("./mongo/col");
const { logger } = require("./utils/logger");
const { scanByHeight } = require("./scanBlock");
const { decodeBlockData } = require("./utils/papi/decode");

const FORMAT_ARG_MAX_DEPTH = 5;
const FORMAT_STRING_MAX_LENGTH = 100;
const FORMAT_HEX_PREVIEW_BYTES = 66;
const FORMAT_ARRAY_PREVIEW_LENGTH = 300;

function truncate(value, maximumLength) {
  if (value.length <= maximumLength) return value;
  return value.slice(0, maximumLength) + "...";
}

function formatVariant(value, depth) {
  if (value.type && value.value !== undefined) {
    return value.type + "(" + formatArg(value.value, depth + 1) + ")";
  }
  if (value.tag && value.value !== undefined) {
    return value.tag + "(" + formatArg(value.value, depth + 1) + ")";
  }
  return null;
}

function formatObject(value, depth) {
  const variant = formatVariant(value, depth);
  if (variant) return variant;

  const entries = Object.entries(value);
  if (entries.length === 0) return "{}";
  if (entries.length > 4) return "{" + entries.length + " fields}";
  return (
    "{" +
    entries
      .map(([key, item]) => key + ": " + formatArg(item, depth + 1))
      .join(", ") +
    "}"
  );
}

function formatArray(value, depth) {
  const items = value.map((item) => formatArg(item, depth + 1)).join(", ");
  return "[" + truncate(items, FORMAT_ARRAY_PREVIEW_LENGTH) + "]";
}

function formatArg(value, depth = 0) {
  if (depth > FORMAT_ARG_MAX_DEPTH) return "...";
  if (value === null || value === undefined) return String(value);
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "boolean" || typeof value === "number") {
    return String(value);
  }
  if (typeof value === "string")
    return truncate(value, FORMAT_STRING_MAX_LENGTH);
  if (value instanceof Uint8Array) {
    return truncate(Binary.toHex(value), FORMAT_HEX_PREVIEW_BYTES);
  }
  if (Array.isArray(value)) return formatArray(value, depth);
  return formatObject(value, depth);
}

function formatTimestamp(timestamp) {
  return timestamp + " -> " + new Date(Number(timestamp)).toISOString();
}

function printEvents(events) {
  console.log("=== Events ===");
  for (const [index, event] of events.entries()) {
    let details = formatArg(event.args);
    if (event.pallet === "System" && event.name === "ExtrinsicSuccess") {
      details = "weight=" + (event.args.dispatch_info?.weight?.ref_time || "?");
    }
    console.log(
      "  [" +
        index +
        "] " +
        event.pallet +
        "." +
        event.name +
        "  " +
        truncate(details, 200),
    );
  }
}

function printExtrinsics(extrinsics) {
  console.log("\n=== Extrinsics ===");
  for (const [index, extrinsic] of extrinsics.entries()) {
    if (extrinsic.empty) {
      console.log("  [" + index + "] <empty>");
      continue;
    }
    if (extrinsic.error) {
      console.log("  [" + index + "] <decode error: " + extrinsic.error + ">");
      continue;
    }

    let details = truncate(formatArg(extrinsic.args), 500);
    if (extrinsic.pallet === "Timestamp" && extrinsic.name === "set") {
      details = "now: " + formatTimestamp(extrinsic.args.now);
    }
    console.log(
      "  [" +
        index +
        "] " +
        extrinsic.pallet +
        "." +
        extrinsic.name +
        "  " +
        details,
    );
  }
}

function printBlockTime(extrinsics) {
  const timestamp = extrinsics.find((extrinsic) => {
    return extrinsic.pallet === "Timestamp" && extrinsic.name === "set";
  });
  if (timestamp?.args?.now) {
    console.log("\n=== Block Time ===");
    console.log("  " + formatTimestamp(timestamp.args.now));
  }
}

function printDecodedBlock(meta, version, decodedBlock) {
  console.log("\nBlock #" + meta.height);
  console.log("Hash: " + meta.blockHash);
  console.log(
    "Runtime: " +
      (version.runtimeVersion?.specName || "?") +
      " v" +
      (version.runtimeVersion?.specVersion || "?"),
  );
  console.log("");

  printEvents(decodedBlock.events);
  printExtrinsics(decodedBlock.extrinsics);
  printBlockTime(decodedBlock.extrinsics);
}

async function decodeAndPrintBlock(meta, version) {
  const papiProvider = getWsProvider(process.env.WS_ENDPOINT);
  const papiClient = createClient(papiProvider);
  try {
    const metadataHex = await papiClient.request("state_getMetadata", [
      meta.blockHash,
    ]);
    const decodedBlock = decodeBlockData(meta, metadataHex);
    printDecodedBlock(meta, version, decodedBlock);
  } finally {
    papiClient.destroy();
  }
}

async function saveBlockData(meta, version) {
  const blockCol = await getBlockCollection();
  await blockCol.updateOne(
    { height: meta.height },
    { $set: meta },
    { upsert: true },
  );

  const versionCol = await getVersionCollection();
  await versionCol.updateOne(
    { height: version.height },
    { $set: version },
    { upsert: true },
  );
}

async function play() {
  const { api, provider } = await getApi();
  try {
    const targetHeight = 18310888;
    logger.info(`Fetching block #${targetHeight}...`);

    const { meta, version } = await scanByHeight(api, provider, targetHeight);
    logger.info(`Block hash: ${meta.blockHash}`);

    await saveBlockData(meta, version);
    logger.info(`Block data saved to MongoDB`);

    await decodeAndPrintBlock(meta, version);
  } finally {
    await provider.disconnect();
    await disconnectMongo();
  }
}

play().catch((e) => {
  logger.error("play error:", e);
  process.exit(1);
});
