const W3CWebSocket = require("websocket").w3cwebsocket;
const { refetchAccessToken } = require("./enablementkey-helper");
const { encryptDecryptPayload } = require("./ws-payload-helper");
const { containerType, databaseHandler, sendToMixpanel, recordLatestEvent, getQueuedEvents, popQueuedEvents, addQueueEvents, eventLaunchUrlBuilder, isJSON, updateNetwork } = require("./common-helper");
const { payloadContent, wsEvents, operationTypes, dataName, auditLog, appEvents, containerTypes } = require("./constant");
const { v4: uuidv4 } = require("uuid");

let eventHandler,
  wsClient,
  wsTimeout,
  contId,
  providerLogOut = false;
let isConnected = false;

const eventServices = (emitter) => {
  eventHandler = new WebSocketEventHandler(databaseHandler, emitter, updateNetwork);
  emitter.on(wsEvents.USER_CONTEXT, async (data) => {
    try {
      if (data.eventCode === appEvents.login) {
        await databaseHandler(operationTypes.SET, dataName.PROVIDER_ID, data?.providerId);
      }
      console.log("DATA SENDING TO BE ",data)
      let { jwePayload, wsId, wsTs } = await encryptDecryptPayload(data, payloadContent.ENCRYPT, wsEvents.USER_CONTEXT);
      await databaseHandler(operationTypes.SET, dataName.LATEST_EVENT, wsId);
      const payload = {
        action: wsEvents.USER_CONTEXT,
        message: jwePayload,
      };
      await databaseHandler(operationTypes.SET, wsId, {
        payload,
        wsTs,
        event: payload.action,
      });
      if (isConnected) {
        eventSender(wsId, payload);
      } else {
        console.log("Websocket not connected queueing payload");
        addQueueEvents(wsId);
      }
    } catch (err) {
      console.error("Unable to proccess user context event : ", err);
    }
  });
};

const connectSocket = async () => {
  let envVars = await databaseHandler(operationTypes.GET, dataName.ENVIRONMENT_VARIABLE);
  envVars = envVars && JSON.parse(envVars);
  const accessDetails = await databaseHandler(operationTypes.GET, dataName.TOKEN_DETAILS);
  const { accessToken, organizationId, containerId } = accessDetails && JSON.parse(accessDetails);
  contId = containerId;
  wsClient = await new W3CWebSocket(`${envVars.WEBSOCKET_API_URL}?organizationId=${organizationId}`, [accessToken]);
};

const handlePong = () => {
  if (isConnected) {
    clearTimeout(wsTimeout);
    wsTimeout = setTimeout(() => {
      console.log("Websocket connection error");
      if (wsClient.readyState !== W3CWebSocket.CLOSED) wsClient.close();
      if (!providerLogOut) {
        initWebSocket();
      }
    }, 1000 * 10);
  }
};

async function initWebSocket() {
  if (!wsClient || (wsClient.readyState !== W3CWebSocket.CONNECTING && wsClient.readyState !== W3CWebSocket.OPEN)) {
    await connectSocket();
  }
  wsClient.onopen = async () => {
    console.log("EVENT: Connected to websocket");
    isConnected = true;
    providerLogOut = false;
    let containerInfo = await databaseHandler(operationTypes.GET, dataName.CONTAINER_INFO);
    if (!containerInfo) {
      let { jwePayload, wsId } = await encryptDecryptPayload({ containerId: contId }, payloadContent.ENCRYPT, wsEvents.CONTAINER_INFO);
      let payload = {
        action: wsEvents.CONTAINER_INFO,
        message: jwePayload,
      };
      eventSender(wsId, payload);
    }
    eventHandler.processQueuedContainerLaunch();
    eventHandler.processQueuedConfigUpdateEvent();
    handleQueuedMessages();
    auditLogEventHandler(auditLog.WEBSOCKET_CONNECTED);
    setInterval(() => {
      if (wsClient.readyState === W3CWebSocket.OPEN) {
        wsClient.send(JSON.stringify({ action: "ping" }));
      }
    }, 1000 * 5);
  };

  wsClient.onmessage = async (message) => await handleOnMessage(message);

  wsClient.onclose = () => handleOnClose();

  wsClient.onerror = () => handleOnError();
}

const handleOnMessage = async (message) => {
  let isAck = isJSON(message.data);
  if (isAck?.message) {
    console.log("Invalid websocket data ", isAck);
  } else if (isAck?.ACK) {
    handleAcknowledgment(isAck);
  } else {
    try {
      if (message.data === "pong") {
        handlePong();
      } else {
        let decryptedData = await encryptDecryptPayload(message.data, payloadContent.DECRYPT);
        console.log("Incoming event ", decryptedData[payloadContent.WS_EVENT]);
        auditLogEventHandler(auditLog.INCOMING_EVENT, decryptedData[payloadContent.WS_EVENT]);
        eventHandler.handleEvents(decryptedData);
      }
    } catch (err) {
      console.log("Failed to receive websocket data: ", err);
    }
  }
};

const handleOnClose = () => {
  isConnected = false;
  eventHandler.stopQueuedHandler();
  console.log("Websocket closed");
};

const handleOnError = () => {
  isConnected = false;
  console.log("Error while connection websocket ");
  eventHandler.stopQueuedHandler();
  let connectionInterval = setTimeout(async () => {
    if ((!providerLogOut && wsClient.readyState !== W3CWebSocket.CONNECTING) || wsClient.readyState !== W3CWebSocket.CLOSING || wsClient.readyState !== W3CWebSocket.OPEN) {
      console.log(wsClient.readyState);
      await refetchAccessToken();
      initWebSocket();
    } else {
      clearTimeout(connectionInterval);
    }
  }, 10000);
};

function attemptAcknowledge(id, attempts, payload) {
  if (attempts <= 0) {
    console.log("All attempts to get acknowledgment payload failed.");
    addQueueEvents(id);
    return;
  }
  let ackReceiver = setTimeout(async () => {
    let ackPayload = await databaseHandler(operationTypes.GET, id);
    clearTimeout(ackReceiver);
    if (ackPayload) {
      if (wsClient.readyState === W3CWebSocket.OPEN) wsClient.send(JSON.stringify(payload));
      attempts--;
      attemptAcknowledge(id, attempts, payload);
    }
  }, 30000);
}

function eventSender(id, payload) {
  if (wsClient.readyState === W3CWebSocket.OPEN) {
    wsClient.send(JSON.stringify(payload));
    let attempts = 2;
    attemptAcknowledge(id, attempts, payload);
  } else {
    console.log("Websocket not connected !");
    console.log("Queuing payload ");
    addQueueEvents(id);
  }
}

async function handleAcknowledgment(message) {
  await databaseHandler(operationTypes.DEL, message.ACK);
}

async function sendAcknowledgment(id, event) {
  let ackPayload = {
    ACK: id,
  };
  if (event === wsEvents.CONTAINER_LAUNCH) event = wsEvents.USER_CONTEXT;
  const payload = {
    action: event,
    message: ackPayload,
  };
  if (isConnected && wsClient.readyState === W3CWebSocket.OPEN) wsClient.send(JSON.stringify(payload));
}

async function handleQueuedMessages() {
  let queue = await getQueuedEvents();
  if (queue !== undefined) {
    queue.forEach(async (id) => {
      let payload = await databaseHandler(operationTypes.GET, id);
      if (payload) {
        payload = JSON.parse(payload);
        let currentTime = new Date();
        let difference = Math.floor((currentTime - payload.wsTs) / 60000);
        if (payload.event === wsEvents.USER_CONTEXT) {
          if (difference <= 10) {
            console.log("the payload for resneding is ", payload);
            eventSender(id, payload.payload);
          }
        } else {
          eventSender(id, payload.payload);
        }
        await popQueuedEvents(id);
      }
    });
    await databaseHandler(operationTypes.DEL, dataName.QUEUED_EVENTS);
  }
}
class WebSocketEventHandler {
  constructor(databaseHandler, notificationService, updateNetwork) {
    this.databaseHandler = databaseHandler;
    this.notificationService = notificationService;
    this.configQueue = [];
    this.containerQueue = [];
    this.containerEventTimeout = "";
    this.updateConfigTimeout = "";
    this.updateNetwork = updateNetwork;
  }
  handleEvents(eventData) {
    let payload = eventData[payloadContent.WS_PAYLOAD];
    let networkId = eventData[payloadContent.WS_NETWORK_ID];
    payload = { networkId, ...payload };
    let wsId = eventData[payloadContent.WS_ID];
    let processInQueue = eventData[payloadContent.WS_PARALLEL];
    switch (eventData[payloadContent.WS_EVENT]) {
      case wsEvents.DEFAULT_CONFIGURATION:
      case wsEvents.UPDATED_CONFIGURATION:
        if (!processInQueue) {
          this.enqueueConfigUpdateEvent(payload);
        } else {
          this.handleConfigUpdate(payload);
        }
        break;
      case wsEvents.CONTAINER_LAUNCH:
        if (!processInQueue) {
          this.enqueueContainerLaunchEvent(eventData);
        } else {
          this.handleContainerLaunch(eventData);
        }
        break;
      case wsEvents.REMOVED_CONFIG:
        if (payload?.networkId) {
          this.handleNetworkRemove(payload.networkId);
        } else if (payload?.organizationId) {
          this.handleOrgRemove(payload);
        }
        break;
      case wsEvents.CONTAINER_INFO:
        this.handleContainerInfo(payload);
        break;
      default:
        console.log(`Event not found ${eventData[payloadContent.WS_EVENT]}`);
    }
    sendAcknowledgment(wsId, eventData[payloadContent.WS_EVENT]);
  }

  handleContainerInfo(payload) {
    this.databaseHandler(operationTypes.SET, dataName.CONTAINER_INFO, payload);
  }

  processQueuedContainerLaunch() {
    if (this.containerQueue.length > 0) {
      let payload = this.containerQueue.shift();
      this.handleContainerLaunch(payload);
    }
    this.containerEventTimeout = setTimeout(() => {
      this.processQueuedContainerLaunch();
    }, 100);
  }

  processQueuedConfigUpdateEvent() {
    if (this.configQueue.length > 0) {
      let payload = this.configQueue.shift();
      this.handleConfigUpdate(payload);
    }
    this.updateConfigTimeout = setTimeout(() => {
      this.processQueuedConfigUpdateEvent();
    }, 200);
  }

  stopQueuedHandler() {
    if (this.containerEventTimeout) {
      clearTimeout(this.containerEventTimeout);
    }
    if (this.updateConfigTimeout) {
      clearTimeout(this.updateConfigTimeout);
    }
  }
  async handleConfigUpdate(payload) {
    let networkId = payload.networkId;
    const configData = JSON.stringify(payload);
    console.log("Config updated for network ", networkId);
    updateNetwork(networkId);
    await this.databaseHandler(operationTypes.SET, `configData_${networkId}`, payload);
    auditLogEventHandler(auditLog.CONFIGURATION_UPDATED, configData, networkId);
    this.notificationService.publish("config-updated", configData);
  }

  async handleContainerLaunch(eventData) {
    let payload = eventData[payloadContent.WS_PAYLOAD];
    let networkId = eventData[payloadContent.WS_NETWORK_ID];
    console.log("INCOMING PAYLOAD IS ",payload)
    if (payload?.launchToken) {
      payload = { networkId, ...payload };
      let wsMetaData = eventData[payloadContent.WS_METADATA];
      await recordLatestEvent(wsEvents.CONTAINER_LAUNCH, wsMetaData);
      let configData = await this.databaseHandler(operationTypes.GET, `configData_${networkId}`);
      if (configData) {
        configData = JSON.parse(configData);
        let url = await eventLaunchUrlBuilder(payload?.launchToken, payload.eventCode, configData);
        if (payload["get-notification-data-for-user-context"] && payload["get-counts-for-user-context"]?.count>0) {
          let notificationData = payload["get-notification-data-for-user-context"].notifications;
          payload = {
            ...payload,
            notificationData,
            url,
            count: payload["get-counts-for-user-context"]?.count,
          };
          const content = JSON.stringify(payload);
          await this.notificationService.publish("show-notification", content);
          auditLogEventHandler(wsEvents.CONTAINER_LAUNCH, payload, networkId);
        } else if (payload["get-counts-for-user-context"]) {
          payload = {
            ...payload,
            url,
          };
          payload = JSON.stringify(payload);
          await this.notificationService.publish("container-launch", payload);
          auditLogEventHandler(wsEvents.CONTAINER_LAUNCH, payload, networkId);
        }
      } else {
        console.log("Error : Config not available for this network ", networkId);
        auditLogEventHandler(auditLog.NETWORK_CONFIG_NOT_FOUND, payload, networkId);
      }
    } else {
      console.log("No context to show on UI");
      let defaultContent = JSON.stringify({
        networkId,
        fromNotification: true,
        ...{
          "get-counts-for-user-context": { count: 0 },
          url: "",
        },
      });
      this.notificationService.publish("container-launch", defaultContent);
      auditLogEventHandler(auditLog.NO_OP, payload, networkId);
      sendToMixpanel(auditLog.NO_OP, networkId);
    }
  }

  handleNetworkRemove(networkId) {
    this.updateNetwork(networkId, true);
    this.databaseHandler(operationTypes.DEL, `configData_${networkId}`);
    this.notificationService.publish("network-removed", JSON.stringify({ networkId }));
    auditLogEventHandler(auditLog.NETWORK_REMOVED, networkId, networkId);
  }

  async handleOrgRemove(payload) {
    await this.databaseHandler(operationTypes.DEL, dataName.TOKEN_DETAILS);
    await this.databaseHandler(operationTypes.DEL, dataName.ENABLEMENT_KEY);
    let networks = await this.databaseHandler(operationTypes.GET, dataName.NETWORKS);
    if (networks) {
      networks = JSON.parse(networks);
      networks.forEach((networkId) => {
        this.databaseHandler(operationTypes.DEL, `configData_${networkId}`);
      });
    }
    auditLogEventHandler(auditLog.ORG_REMOVED, payload);
    console.log("Organization removed");
    this.notificationService.publish("organization-removed", JSON.stringify({ payload }));
  }

  enqueueConfigUpdateEvent(payload) {
    this.configQueue.push(payload);
  }

  enqueueContainerLaunchEvent(payload) {
    this.containerQueue.push(payload);
  }
}

const auditLogEventHandler = async (event, info, networkId) => {
  let containerDate = await databaseHandler(operationTypes.GET, dataName.CONTAINER_DETAILS);
  containerDate = containerDate && JSON.parse(containerDate);
  const auditInfo = containerType() === containerTypes.DESKTOP ? { hostname: containerDate.username, machineId: containerDate.machineId } : {};
  const body = {
    source: `${containerType()} container`,
    timestamp: Date.now(),
    event: event,
    data: {
      ...auditInfo,
      metadata: info,
    },
  };
  let { jwePayload, wsId, wsTs } = await encryptDecryptPayload(body, payloadContent.ENCRYPT, wsEvents.AUDIT_LOG, networkId);
  const payload = {
    action: wsEvents.AUDIT_LOG,
    message: jwePayload,
  };
  databaseHandler(operationTypes.SET, wsId, {
    payload,
    wsTs,
    event: payload.action,
  });
  eventSender(wsId, payload);
};
const contianerLogsSender = (jwt) => {
  const wsId = uuidv4();
  const wsTs = Math.floor(new Date().getTime());
  let body = {
    iss: payloadContent.WS_ISS,
    exp: Math.floor(new Date().getTime() / 1000) + 30,
    iat: Math.floor(new Date().getTime() / 1000),
    [payloadContent.WS_PAYLOAD]: jwt,
    [payloadContent.WS_ID]: wsId,
    [payloadContent.WS_TS]: wsTs,
    [payloadContent.WS_EVENT]: wsEvents.CONTAINERS_CLOUDWATCH_LOGS,
  };
  const payload = {
    action: wsEvents.CONTAINERS_CLOUDWATCH_LOGS,
    message: body,
  };
  if (wsClient?.readyState === W3CWebSocket.OPEN) {
    wsClient.send(JSON.stringify(payload));
  }
};

const checkWsConnection = () => {
  return wsClient?.readyState === W3CWebSocket.OPEN;
};

const closeWsConnection = () => {
  if (wsClient?.readyState === W3CWebSocket.OPEN) {
    wsClient.close();
    providerLogOut = true;
    isConnected = false;
  }
};

module.exports = {
  initWebSocket,
  auditLogEventHandler,
  contianerLogsSender,
  checkWsConnection,
  closeWsConnection,
  eventServices,
};
