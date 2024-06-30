const browserCrypto = require("crypto-browserify");
const { JSEncrypt } = require("jsencrypt");
const os = require("os");
const { Buffer } = require("buffer");
const { databaseHandler, setEnvironmentVariables, containerType } = require("./common-helper");
const { callAPI } = require("./api-client");
const { containerTypes, operationTypes, dataName, browserConst } = require("./constant");

// DOTO  - Set this on container level move the os library
const getDeviceDetail = async () => {
  const interfaces = os.networkInterfaces();
  switch (containerType()) {
    case containerTypes.DESKTOP:
      for (let k in interfaces) {
        for (let k2 in interfaces[k]) {
          let address = interfaces[k][k2];
          if (address.family === "IPv4" && !address.internal) {
            return address.mac;
          }
        }
      }
      break;
    case containerTypes.BROWSER:
      try {
        const data = await callAPI(browserConst.API_IP_ADDRESS_URL);
        return data?.ip;
      } catch (error) {
        console.log(error);
      }
      break;
    default:
      console.log("No container found");
  }
};

export const enablementPayloadGenerator = async (decryptedData) => {
  const decodedEnablementData = decryptedData && JSON.parse(Buffer.from(decryptedData, "base64").toString());
  const orgId = decodedEnablementData?.organizationId;
  const removedOrg = await databaseHandler(operationTypes.GET, dataName.REMOVED_ORG);
  if (removedOrg === orgId) {
    return;
  }

  const apiUrl = decodedEnablementData?.containerEnvironmentVariables?.CONNECT_API_URL;
  await databaseHandler(operationTypes.SET, dataName.ENVIRONMENT_VARIABLE, decodedEnablementData?.containerEnvironmentVariables);
  const envVars = await setEnvironmentVariables();
  const { publicKey, privateKey } = generateKeyPair();
  await databaseHandler(operationTypes.SET, dataName.PRIVATE_KEY, privateKey);
  await databaseHandler(operationTypes.SET, dataName.PUBLIC_KEY, publicKey);
  const serverPubKey = decodedEnablementData?.publicKey?.replace(/\\n/g, "\n");
  await databaseHandler(operationTypes.SET, dataName.SERVER_PUBLIC_KEY, serverPubKey);
  const iv = browserCrypto.randomBytes(16);
  let dataToEncrypt = {
    publicKey: publicKey,
    initializeVector: iv,
  };
  dataToEncrypt = JSON.stringify(dataToEncrypt);
  const chunkSize = 100;
  const encryptedpublicKeyChunks = [];
  let encryptedDeviceData;
  const enablementKeyId = decodedEnablementData?.enablementKeyId;

  for (let i = 0; i < dataToEncrypt.length; i += chunkSize) {
    const chunk = dataToEncrypt.slice(i, i + chunkSize);
    const encryptedChunk = browserCrypto.publicEncrypt(serverPubKey, Buffer.from(chunk));
    encryptedpublicKeyChunks.push(encryptedChunk);
  }

  const hexKey = decodedEnablementData?.encryptionKey;
  const key = Buffer.from(hexKey, "hex");
  let tokenDetails = await databaseHandler(operationTypes.GET, dataName.TOKEN_DETAILS);
  let contId;
  if (tokenDetails) {
    let { containerId } = JSON.parse(tokenDetails);
    contId = containerId;
  }
  const machineName = containerType() === containerTypes.DESKTOP ? os.userInfo().username.toLowerCase() : "";
  const deviceId = await getDeviceDetail();
  const payload = {
    enablemenKeyId: enablementKeyId,
    organizationId: orgId,
    networkId: decodedEnablementData?.networkId,
    containerData: { deviceId },
    type: containerType(),
    machineName: machineName,
    containerId: contId,
  };

  let deviceInfo = {
    ...payload,
    username: machineName,
    source: containerType(),
  };

  databaseHandler(operationTypes.SET, dataName.CONTAINER_DETAILS, deviceInfo);
  const cipher = browserCrypto.createCipheriv("aes-256-cbc", key, iv);
  let encryptedData = cipher.update(JSON.stringify(payload), "utf8", "hex");
  encryptedData += cipher.final("hex");
  encryptedDeviceData = Buffer.from(encryptedData).toString("base64");

  return {
    encryptedpublicKeyChunks,
    encryptedDeviceData,
    enablementKeyId,
    orgId,
    apiUrl,
    envVars,
  };
};

const generateKeyPair = () => {
  const encryptor = new JSEncrypt({ default_key_size: 2048 });
  encryptor.getKey();
  const publicKey = encryptor.getPublicKey();
  const privateKey = encryptor.getPrivateKey();
  return { publicKey, privateKey };
};

export async function checkEnablement(content) {
  try {
    if (content) {
      const { encryptedpublicKeyChunks, encryptedDeviceData, enablementKeyId, apiUrl, envVars } = await enablementPayloadGenerator(content?.enablementKey);
      if (encryptedDeviceData) {
        const config = {
          data: {
            encryptedpublicKeyChunks,
            encryptedData: encryptedDeviceData,
          },
          url: `${apiUrl}/v1/container/enable/${enablementKeyId}`,
        };
        const token = await callAPI(``, config);
        if (token) {
          const tokenDetails = token?.data?.body;
          if (tokenDetails) {
            await databaseHandler(operationTypes.SET, dataName.TOKEN_DETAILS, tokenDetails);
            await databaseHandler(operationTypes.SET, dataName.ENABLEMENT_KEY, {
              enablementKey: content?.enablementKey,
            });
            let containerId = token.data.body.containerId;
            let containerDetails = await databaseHandler(operationTypes.GET, dataName.CONTAINER_DETAILS);
            containerDetails = containerDetails && JSON.parse(containerDetails);
            containerDetails = { containerId, ...containerDetails };
            await databaseHandler(operationTypes.SET, dataName.CONTAINER_DETAILS, containerDetails);
            return envVars;
          }
        }
      }
    }
  } catch (err) {
    throw new Error(err);
  }
}

export const refetchAccessToken = async () => {
  let envVars = await databaseHandler(operationTypes.GET, dataName.ENVIRONMENT_VARIABLE);
  envVars = JSON.parse(envVars);
  let accessDetails = await databaseHandler(operationTypes.GET, dataName.TOKEN_DETAILS);
  accessDetails = JSON.parse(accessDetails);
  const { refreshToken, organizationId } = accessDetails;
  const config = {
    url: `${envVars.AUTH_API_URL}/v1/refreshToken`,
    data: {
      refreshToken: refreshToken,
      organizationId,
    },
  };
  callAPI(``, config)
    .then(async (resp) => {
      if (resp.status && resp?.data?.body) {
        accessDetails.accessToken = resp.data.body.accessToken;
        accessDetails.refreshToken = resp.data.body.refreshToken;
        await databaseHandler(operationTypes.SET, dataName.TOKEN_DETAILS, accessDetails);
      }
    })
    .catch(async (err) => {
      err = containerType() === containerType.DESKTOP ? JSON.parse(JSON.stringify(err)) : err;
      if (err.status === 401 || err?.response.status === 401) {
        const content = await databaseHandler(operationTypes.GET, dataName.ENABLEMENT_KEY);
        await checkEnablement(JSON.parse(content));
      }
    });
};
