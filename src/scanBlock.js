const { extractAuthor } = require("@polkadot/api-derive/type/util");

const eventsKey =
  "0x26aa394eea5630e07c48ae0c9558cef780d41e5e16056765bc8461851072c9d7";

async function scanByHeight(api, provider, scanHeight) {
  let blockHash;
  try {
    blockHash = await provider.send("chain_getBlockHash", [scanHeight]);
  } catch (e) {
    console.error("Can not get block hash");
    throw e;
  }

  const promises = [
    provider.send("chain_getBlock", [blockHash]),
    provider.send("state_getStorageAt", [eventsKey, blockHash]),
    provider.send("state_getRuntimeVersion", [blockHash]),
  ];

  const saveValidator = !!process.env.SAVE_VALIDATOR;
  if (saveValidator) {
    const blockApi = await api.at(blockHash);
    if (blockApi.query.session?.validators) {
      promises.push(blockApi.query.session.validators());
    }
  }

  const [block, allEvents, runtimeVersion, validators] =
    await Promise.all(promises);

  let meta = {
    height: scanHeight,
    blockHash,
    block: block,
    events: allEvents,
  };

  if (saveValidator && validators) {
    const digest = api.registry.createType(
      "Digest",
      block.block.header.digest,
      true,
    );
    const author = extractAuthor(digest, validators || []);
    meta.author = author?.toString();
  }

  return {
    meta,
    version: {
      height: scanHeight,
      runtimeVersion,
    },
  };
}

module.exports = {
  eventsKey,
  scanByHeight,
};
