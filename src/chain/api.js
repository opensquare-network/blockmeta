const { ApiPromise, WsProvider } = require("@polkadot/api");
const { currentChain } = require("./chain");

let provider = null;
let api = null;

const defaultEndPoint = {
  kusama: "wss://kusama.elara.patract.io",
  polkadot: "wss://polkadot.elara.patract.io/",
};

function getEndPoint() {
  const chain = currentChain();
  if ("kusama" === chain) {
    const endpoint = process.env.KSM_WS_ENDPOINT || defaultEndPoint.kusama
    console.log('endpoint', endpoint)
    return endpoint;
  } else {
    const endpoint = process.env.DOT_WS_ENDPOINT || defaultEndPoint.polkadot
    console.log('endpoint', endpoint)
    return endpoint;
  }
}

async function getApi() {
  if (!api) {
    provider = new WsProvider(getEndPoint());
    api = await ApiPromise.create({ provider });
  }

  return api;
}

async function disconnect() {
  if (provider) {
    provider.disconnect();
  }
}

module.exports = {
  getApi,
  disconnect,
};
