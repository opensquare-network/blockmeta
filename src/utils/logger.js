const log4js = require("log4js");

const logLevel = process.env.LOG_LEVEL || "debug";
const isProduction = process.env.NODE_ENV === "production";
const chain = process.env.CHAIN || "kusama";

const scanFileCategory = "meta-scan";

log4js.configure({
  appenders: {
    [scanFileCategory]: { type: "file", filename: `log/${chain}/meta-scan.log` },
    errorFile: {
      type: "file",
      filename: `log/${chain}/errors.log`,
    },
    errors: {
      type: "logLevelFilter",
      level: "ERROR",
      appender: "errorFile",
    },
    out: { type: "stdout" },
  },
  categories: {
    default: {
      appenders: [isProduction ? scanFileCategory : "out", "errors"],
      level: logLevel,
    },
  }
})

const logger = log4js.getLogger(scanFileCategory);

module.exports = {
  logger
}
