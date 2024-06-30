const { containerTypes, operationTypes, dataName, browserConst } = require("./constant");
const os = require("os");

let containerName, mixpanel, databaseInstance;

const initCommonInstance = (container, dataInstance) => {
    containerName = container;
    databaseInstance = dataInstance;
}

const containerType = () => {
    return containerName;
}
const dbInstance = () => {
    return databaseInstance;
}

const setEnvironmentVariables = async () => {
    let variables = await databaseHandler(operationTypes.GET, dataName.ENVIRONMENT_VARIABLE);
    switch (containerType()) {
        case containerTypes.DESKTOP:
            variables = JSON.parse(variables);
            for (const key in variables) {
                process.env[key] = variables[key];
            }
            break;
        case containerTypes.BROWSER:
            return variables;
    }
};

function arrayBufferToHexString(buffer) {
    return Array.prototype.map.call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2)).join('');
}

function hexStringToArrayBuffer(hexString) {
    const bytes = [];
    for (let i = 0; i < hexString.length; i += 2) {
        bytes.push(parseInt(hexString.substr(i, 2), 16));
    }
    return new Uint8Array(bytes).buffer;
}

async function encryptData(data, key) {
    const encodedData = new TextEncoder().encode(JSON.stringify(data));
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for AES-GCM
    const cryptoKey = await crypto.subtle.importKey('raw', key, 'AES-GCM', true, ['encrypt']);
    const encryptedData = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, encodedData);
    return { iv: iv, encryptedData: new Uint8Array(encryptedData) };
}

async function decryptData(encryptedData, key, iv) {
    const cryptoKey = await crypto.subtle.importKey('raw', key, 'AES-GCM', true, ['decrypt']);
    const decryptedData = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, cryptoKey, encryptedData);
    return JSON.parse(new TextDecoder().decode(decryptedData));
}

const databaseHandler = async (operationType, dataName, dataValue) => {
    try {
        let db = dbInstance();
        switch (containerType()) {
            case containerTypes.DESKTOP:
                if (operationType === operationTypes.SET) {
                    await db.setData(dataName, JSON.stringify(dataValue));
                }
                if (operationType === operationTypes.GET) {
                    return await db.getData(dataName);
                }
                if (operationType === operationTypes.DEL) {
                    return db.delData(dataName);
                }
                break;
            case containerTypes.BROWSER:
                const secretKey = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(dataName));
                if (operationType === operationTypes.SET) {
                    const { iv, encryptedData } = await encryptData(dataValue, secretKey);
                    await db.storage.local.set({ [dataName]: { iv: arrayBufferToHexString(iv), encryptedData: arrayBufferToHexString(encryptedData) } });
                }
                if (operationType === operationTypes.GET) {
                    let value = await db.storage.local.get([`${dataName}`]);
                    if (value[dataName]) {
                        const decryptedData = await decryptData(hexStringToArrayBuffer(value[dataName].encryptedData), secretKey, hexStringToArrayBuffer(value[dataName].iv));
                        return JSON.stringify(decryptedData);
                    }
                    else return undefined;
                }
                if (operationType === operationTypes.DEL) {
                    return db.storage.local.remove(dataName);
                }
                break;
        }
    }
    catch (err) {
        console.log("Error : ", err);
    }
}
const initSentry = async (sentry) => {
    let envVars = await databaseHandler(operationTypes.GET, dataName.ENVIRONMENT_VARIABLE);
    envVars = envVars && JSON.parse(envVars);
    if (envVars && envVars?.ENV === "CERT" || envVars?.ENV === "PROD") {
        try {
            let containerDetails = await databaseHandler(operationTypes.GET, dataName.CONTAINER_DETAILS);
            containerDetails = containerDetails && JSON.parse(containerDetails);
            const dsn = (containerType() === containerTypes.DESKTOP) ? envVars?.SENTRY_DSN_DESKTOP : envVars?.SENTRY_API_URL;
            sentry.init({
                dsn: dsn,
                environment: envVars?.ENV,
            });

            for (const [tagName, tagValue] of Object.entries(containerDetails)) {
                sentry.setTag(tagName, tagValue);
            }

        } catch (error) {
            console.error("Error:", error);
        }
    }
};

const initMixpanel = async (containerMixpanel) => {
    let env = await databaseHandler(operationTypes.GET, dataName.ENVIRONMENT_VARIABLE);
    const { MIXPANEL_ID, ENV } = env && JSON.parse(env);
    if (ENV === "CERT" || ENV === "PROD") {
        try {
            mixpanel = containerMixpanel
            let containerDetails = await databaseHandler(operationTypes.GET, dataName.CONTAINER_DETAILS);
            containerDetails = containerDetails && JSON.parse(containerDetails);
            let cfg = containerType() === containerTypes.BROWSER ? { debug: true, api_host: browserConst.API_MIX_PANEL_URL } : { keepAlive: true, geolocate: true };
            mixpanel.init(MIXPANEL_ID, cfg);
            let event = `${containerType()}_CONTAINER_STARTED`.toUpperCase();
            mixpanel.track(event, containerDetails);
        } catch (err) {
            console.log('Error initializing Mixpanel:', err);
        }
    }
};

async function sendToMixpanel(eventName, extraData) {
    try {
        if (mixpanel) {
            let containerDetails = await databaseHandler(operationTypes.GET, dataName.CONTAINER_DETAILS);
            containerDetails = containerDetails && JSON.parse(containerDetails);

            if (extraData) {
                containerDetails = { containerDetails, ...extraData };
            }
            let data = await databaseHandler(operationTypes.GET, dataName.CONTAINER_INFO);
            data = data && JSON.parse(data);
            containerDetails = { containerDetails, ...data }
            switch (containerType()) {
                case containerTypes.DESKTOP:
                    let osType = os.type();
                    if (osType === "Darwin") osType = "MacOS";
                    containerDetails.$os = osType;
                    break;
                case containerTypes.BROWSER:
                    const uniqueId = data?.uuid; 
                    mixpanel.identify(uniqueId);
                    break;
            }
            let event = eventName.toUpperCase();
            mixpanel.track(event, containerDetails);
        }
    } catch (err) {
        console.log("Error : ", err);
    }
}

async function recordLatestEvent(eventName, payload) {
    await databaseHandler(operationTypes.SET, `latest_${eventName}`, payload);
}
async function updateNetwork(networkId, isRemove) {
    try {
        if (networkId !== undefined || networkId !== null) {
            let networks = await databaseHandler(operationTypes.GET, dataName.NETWORKS);
            if (networks !== undefined) {
                networks = JSON.parse(networks);
                let isAvailable = networks.includes(networkId);
                if (!isAvailable) {
                    networks.push(networkId);
                    console.log("NEW NETWORK ", networks);
                }
                else if (isRemove) {
                    networks.splice(networks.indexOf(networkId), 1);
                }
            } else {
                networks = [networkId];
            }
            await databaseHandler(operationTypes.SET, dataName.PRIMARY_NETWORK, networks[0]);
            await databaseHandler(operationTypes.SET, dataName.NETWORKS, networks);
        }
    } catch (err) {
        console.log("ERROR ", err);
    }
}

async function addQueueEvents(id) {
    try {
        let queue = await databaseHandler(operationTypes.GET, dataName.QUEUED_EVENTS);
        let newQueue;
        if (queue !== undefined) {
            queue = JSON.parse(queue);
            queue.push(id);
            newQueue = queue;
        } else {
            newQueue = [id];
        }
        await databaseHandler(operationTypes.SET, dataName.QUEUED_EVENTS, newQueue);
    } catch (err) {
        console.log("ERROR ", err);
    }
}

async function popQueuedEvents(id) {
    try {
        await databaseHandler(operationTypes.DEL, id);
        let queue = await databaseHandler(operationTypes.GET, dataName.QUEUED_EVENTS);
        if (queue !== undefined) {
            queue = JSON.parse(queue);
            queue.splice(queue.indexOf(id), 1);
            await databaseHandler(operationTypes.SET, dataName.QUEUED_EVENTS, queue);
        }
    } catch {
        console.error("Unable to delete element from queue ");
    }
}

async function getQueuedEvents() {
    let queue = await databaseHandler(operationTypes.GET, dataName.QUEUED_EVENTS);
    if (queue !== undefined) return JSON.parse(queue);
    else return undefined;
}

async function eventLaunchUrlBuilder(jwt, event, configData) {
    let template = configData?.launch?.eventLaunchUrls?.template;
    let launchUrl = configData?.launch?.eventLaunchUrls[event];
    return template.replace("{base}", launchUrl).replace("{jwt}", jwt);
}
function isJSON(str) {
    try {
        return JSON.parse(str);
    } catch (e) {
        return false;
    }
}

module.exports = {
    setEnvironmentVariables,
    databaseHandler,
    initSentry,
    initCommonInstance,
    containerType,
    dbInstance,
    initMixpanel,
    sendToMixpanel,
    recordLatestEvent,
    getQueuedEvents,
    popQueuedEvents,
    addQueueEvents,
    eventLaunchUrlBuilder,
    isJSON,
    updateNetwork
};