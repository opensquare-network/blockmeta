const { ApiPromise, WsProvider } = require("@polkadot/api");
const {
  karuraOptions,
  khalaOptions,
  basiliskOptions,
  crustOptions,
  kintsugiOptions,
  polkadexOptions,
  bifrostOptions,
  soraOptions,
  crabOptions,
  zeitgeistOptions,
  litentryOptions,
} = require("@osn/provider-options")

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
  if (api) {
    return {
      api,
      provider,
    }
  }

  provider = new WsProvider(getEndPoint(), 1000);

  let customizedOptions = {};
  if (['kar', 'karura', 'aca', 'acala'].includes(process.env.CHAIN)) {
    customizedOptions = karuraOptions;
  } else if (['basilisk'].includes(process.env.CHAIN)) {
    customizedOptions = basiliskOptions;
  } else if (['kintsugi', 'interlay'].includes(process.env.CHAIN)) {
    customizedOptions = kintsugiOptions;
  } else if (['crust'].includes(process.env.CHAIN)) {
    customizedOptions = crustOptions;
  } else if (['polkadex'].includes(process.env.CHAIN)) {
    customizedOptions = polkadexOptions;
  } else if (['kha', 'khala', 'pha', 'phala'].includes(process.env.CHAIN)) {
    customizedOptions = khalaOptions;
  } else if (['bifrost', 'bnc'].includes(process.env.CHAIN)) {
    customizedOptions = bifrostOptions;
  } else if (['sora'].includes(process.env.CHAIN)) {
    customizedOptions = soraOptions;
  } else if (['crab'].includes(process.env.CHAIN)) {
    customizedOptions = crabOptions;
  } else if (['zeitgeist'].includes(process.env.CHAIN)) {
    customizedOptions = zeitgeistOptions;
  } else if (['litentry', 'lit'].includes(process.env.CHAIN)) {
    customizedOptions = litentryOptions;
  }

  let options = { provider };
  api = await ApiPromise.create({
    ...customizedOptions,
    ...options,
  });
  console.log(`Connected to ${ getEndPoint() }`)

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
