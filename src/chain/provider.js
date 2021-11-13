const { WsProvider } = require("@polkadot/api");

let provider = null;

async function getOnlyProvider() {
  if (!provider) {
    const endPoint = process.env.WS_ENDPOINT;
    if (!endPoint) {
      throw new Error("WS_ENDPOINT not set");
    }

    provider = new WsProvider(endPoint, 1000);
  }

  await provider.isReady
  return provider
}

function isProviderConnected() {
  return provider && provider.isConnected
}

module.exports = {
  getOnlyProvider,
  isProviderConnected,
}
