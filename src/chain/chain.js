function currentChain() {
  if (["polkadot", "kusama", "westmint"].includes(process.env.CHAIN)) {
    return process.env.CHAIN;
  } else {
    return "kusama";
  }
}

const CHAINS = {
  POLKADOT: "polkadot",
  KUSAMA: "kusama",
  WESTMINT: "westmint",
};

module.exports = {
  currentChain,
  CHAINS,
};
