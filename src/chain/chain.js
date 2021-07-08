const CHAINS = {
  POLKADOT: "polkadot",
  KUSAMA: "kusama",
  WESTMINT: "westmint",
  STATEMINE: "statemine",
};

function currentChain() {
  const chains = Object.values(CHAINS)

  if (chains.includes(process.env.CHAIN)) {
    return process.env.CHAIN;
  } else {
    return CHAINS.POLKADOT;
  }
}

module.exports = {
  currentChain,
  CHAINS,
};
