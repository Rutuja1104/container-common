const { databaseHandler } = require("./common-helper");
const { dataName, operationTypes } = require("./constant");
const { contianerLogsSender } = require("./websocket");
const log = require("loglevel");

log.setLevel(log.levels.INFO);

const getContainerDetails = async () => {
  let containerDetails = await databaseHandler(
    operationTypes.GET,
    dataName.CONTAINER_DETAILS
  );
  containerDetails = containerDetails && JSON.parse(containerDetails);
  return containerDetails;
};

async function logWithLevel(level, ...args) {
  let data = await getContainerDetails();
  const baseLogObject = {
    containerId: data?.containerId,
    networkId: data?.networkId,
    organizationId: data?.organizationId,
  };
  const logData = {
    ...baseLogObject,
    level: level.toUpperCase(),
    message: args,
    timestamp: new Date().toISOString(),
  };

  if (logData?.message) {
    contianerLogsSender(logData);
    log[level](logData);
  }
}

export function customLogger() {
  console.error = function (...args) {
    logWithLevel("error", ...args);
  };

  console.warn = function (...args) {
    logWithLevel("warn", ...args);
  };

  console.log = function (...args) {
    logWithLevel("info", ...args);
  };

  console.info = function (...args) {
    logWithLevel("info", ...args);
  };
}
