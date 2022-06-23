const { ApiPromise, WsProvider } = require("@polkadot/api");
const { spec } = require("@edgeware/node-types")

let provider = null;
let api = null;

function getEndPoint() {
  const endPoint = process.env.WS_ENDPOINT;
  if (!endPoint) {
    throw new Error("WS_ENDPOINT not set");
  }

  return endPoint
}

async function getApi() {
  if (!api) {
    provider = new WsProvider(getEndPoint(), 1000);

    api = await ApiPromise.create({ provider, typesBundle: spec.typesBundle, });
    console.log(`Connected to ${ getEndPoint() }`)
  }

  api.on("error", (err) => {
    console.error("api error, will restart:", err);
    process.exit(0);
  });
  api.on("disconnected", () => {
    console.error("api disconnected, will restart:");
    process.exit(0);
  });

  return {
    api,
    provider
  };
}

function isApiConnected() {
  return provider && provider.isConnected
}

async function disconnect() {
  if (provider) {
    provider.disconnect();
  }
}

module.exports = {
  getApi,
  disconnect,
  isApiConnected,
};
