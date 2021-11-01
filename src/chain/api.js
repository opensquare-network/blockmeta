const { basilisk } = require("./bundle/basilisk");
const { ApiPromise, WsProvider } = require("@polkadot/api");
const { typesBundleForPolkadot } = require('@acala-network/type-definitions');
const { versionedKhala, typesChain } = require("@phala/typedefs")

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

    if (['kar', 'karura'].includes(process.env.CHAIN)) {
      const typesBundle = { ...typesBundleForPolkadot, }
      api = await ApiPromise.create({ provider, typesBundle });
    } else if (['basilisk'].includes(process.env.CHAIN)) {
      const typesBundle = { spec: { basilisk }, }
      api = await ApiPromise.create({ provider, typesBundle });
    } else if (['kha', 'khala'].includes(process.env.CHAIN)) {
      const typesBundle = {
        spec: {
          khala: versionedKhala
        },
      }
      api = await ApiPromise.create({ provider, typesBundle, typesChain });
    } else {
      api = await ApiPromise.create({ provider });
    }
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
