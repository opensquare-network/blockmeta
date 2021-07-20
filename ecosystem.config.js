const commonPart = {
  script: "src/index.js",
  log_date_format: "YYYY-MM-DD HH:mm Z",
  env: {
    NODE_ENV: "development",
  },
  env_production: {
    NODE_ENV: "production",
  },
};

function getEnvConfig(chainName) {
  return {
    env: {
      ...commonPart.env,
      CHAIN: chainName,
    },
    env_production: {
      ...commonPart.env_production,
      CHAIN: chainName,
    },
  };
}

const dotScanConfig = {
  ...commonPart,
  ...getEnvConfig("polkadot"),
};

const ksmScanConfig = {
  ...commonPart,
  ...getEnvConfig("kusama"),
};

const westmintConfig = {
  ...commonPart,
  ...getEnvConfig("westmint"),
}

const statemineConfig = {
  ...commonPart,
  ...getEnvConfig("statemine")
}

module.exports = {
  apps: [
    // prod-scan
    {
      name: "meta-scan-dot",
      ...dotScanConfig,
    },
    {
      name: "meta-scan-dot-staging",
      ...dotScanConfig,
    },
    {
      name: "meta-scan-ksm",
      ...ksmScanConfig,
    },
    {
      name: "meta-scan-ksm-staging",
      ...ksmScanConfig,
    },
    {
      name: "meta-scan-westmint",
      ...westmintConfig,
    },
    {
      name: "meta-scan-westmint-staging",
      ...westmintConfig,
    },
    {
      name: "meta-scan-statemine",
      ...statemineConfig
    },
    {
      name: "meta-scan-statemine-staging",
      ...statemineConfig
    },
  ]
}
