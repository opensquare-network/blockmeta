const { basilisk } = require("./bundle/basilisk");
const { ApiPromise, WsProvider } = require("@polkadot/api");
const { versionedKhala, typesChain } = require("@phala/typedefs")
const kint = require("./kintsugi");
const { karuraOptions } = require("./karura/options")
const { bifrostOptions } = require("./bifrost/options")

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

    if (['kar', 'karura', 'aca', 'acala'].includes(process.env.CHAIN)) {
      api = await ApiPromise.create({ ...karuraOptions, provider, });
    } else if (['basilisk'].includes(process.env.CHAIN)) {
      const typesBundle = { spec: { basilisk }, }
      api = await ApiPromise.create({ provider, typesBundle });
    } else if (['kintsugi', 'interlay'].includes(process.env.CHAIN)) {
      const typesBundle = { spec: { 'kintsugi-parachain': kint, }, }
      api = await ApiPromise.create({ provider, typesBundle, rpc: kint.providerRpc, });
    } else if (['kha', 'khala'].includes(process.env.CHAIN)) {
      const typesBundle = {
        spec: {
          khala: versionedKhala
        },
      }
      api = await ApiPromise.create({ provider, typesBundle, typesChain });
    } else if (['bifrost', 'bnc'].includes(process.env.CHAIN)) {
      api = await ApiPromise.create({ ...bifrostOptions, provider, });
    } else {
      api = await ApiPromise.create({ provider });
    }
    console.log(`Connected to ${ getEndPoint() }`)

    api.on("error", (err) => {
      console.error("api error, will restart:", err);
      process.exit(0);
    });
    api.on("disconnected", () => {
      console.error("api disconnected, will restart:");
      process.exit(0);
    });
  }

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
