const { WsProvider } = require("@polkadot/api");

async function getOnlyProvider() {
  const endPoint = process.env.WS_ENDPOINT;
  if (!endPoint) {
    throw new Error("WS_ENDPOINT not set");
  }

  const provider = new WsProvider(endPoint, 1000);

  await provider.isReady
  return provider
}

module.exports = {
  getOnlyProvider,
}
