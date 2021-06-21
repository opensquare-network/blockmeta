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

module.exports = {
  apps: [
    // prod-scan
    {
      name: "meta-scan-dot",
      ...dotScanConfig,
    },
    {
      name: "meta-scan-ksm",
      ...ksmScanConfig,
    },
    {
      name: "meta-scan-westmint",
      ...westmintConfig,
    },
  ]
}
