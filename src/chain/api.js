const { ApiPromise, WsProvider } = require("@polkadot/api");
const { currentChain, CHAINS } = require("./chain");

let provider = null;
let api = null;

const defaultEndPoint = {
  kusama: "wss://kusama.elara.patract.io",
  polkadot: "wss://polkadot.elara.patract.io/",
  westmint: "wss://westmint.westend.elara.patract.io/",
  statemine: "wss://statemine.kusama.elara.patract.io",
  karura: "wss://karura.kusama.elara.patract.io",
};

function getEndPoint() {
  const chain = currentChain();
  if ("kusama" === chain) {
    return process.env.KSM_WS_ENDPOINT || defaultEndPoint.kusama;
  } else if ("westmint" === chain) {
    return process.env.WESTMINT_WS_ENDPOINT || defaultEndPoint.westmint;
  } else if ("statemine" === chain) {
    return process.env.STATEMINE_WS_ENDPOINT || defaultEndPoint.statemine;
  } else if (CHAINS.KARURA === chain) {
    return process.env.KARURA_WS_ENDPOINT || defaultEndPoint.karura;
  } else {
    return process.env.DOT_WS_ENDPOINT || defaultEndPoint.polkadot
  }
}

async function getApi() {
  if (!api) {
    provider = new WsProvider(getEndPoint(), 1000);
    api = await ApiPromise.create({ provider });
  }

  return {
    api,
    provider
  };
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
