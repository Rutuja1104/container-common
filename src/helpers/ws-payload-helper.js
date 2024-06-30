const { JWK, JWE, JWS } = require("node-jose");
const { databaseHandler } = require("./common-helper");
const { operationTypes, dataName, payloadContent, appEvents, wsEvents } = require("./constant");
const { v4: uuidv4 } = require("uuid");

let wsId, wsTs, correlationId;
const verify = async (key, jws) => {
  return JWS.createVerify(key).verify(jws);
};

const sign = async (key, data, event, networkId) => {
  const opt = { compact: true, fields: { typ: "jwt" } };
  wsId = uuidv4();
  wsTs = Math.floor(new Date().getTime());
  let jwt = {
    iss: payloadContent.WS_ISS,
    exp: Math.floor(new Date().getTime() / 1000) + 30,
    iat: Math.floor(new Date().getTime() / 1000),
    [payloadContent.WS_PAYLOAD]: data,
    [payloadContent.WS_ID]: wsId,
    [payloadContent.WS_TS]: wsTs,
    [payloadContent.WS_EVENT]: event,
  };
  if (data.eventCode === appEvents.patientView) {
    correlationId = uuidv4();
  }
  if (event === wsEvents.AUDIT_LOG) {
    jwt = {
      ...jwt,
      [payloadContent.WS_PARALLEL]: true,
      [payloadContent.WS_NETWORK_ID]: networkId,
    };
    if (correlationId) {
      jwt = {
        ...jwt,
        [payloadContent.WS_CORRELATION_ID]: correlationId,
      };
    }
  }
  if (event === wsEvents.USER_CONTEXT && correlationId) {
    jwt = {
      ...jwt,
      [payloadContent.WS_CORRELATION_ID]: correlationId,
    };
  }
  if (data.eventCode === appEvents.logout) {
    correlationId = "";
  }
  const buffer = Buffer.from(JSON.stringify(jwt));
  return JWS.createSign(opt, key).update(buffer).final();
};

const encrypt = async (key, input) => {
  const buffer = Buffer.from(input);
  return JWE.createEncrypt({ format: "compact", contentAlg: "A256GCM", alg: "RSA-OAEP" }, key).update(buffer).final();
};

export const encryptDecryptPayload = async (data, operation, event, networkId) => {
  try {
    const devicePrivatekeyData = await databaseHandler(operationTypes.GET, dataName.PRIVATE_KEY);
    const serverPubKeyData = await databaseHandler(operationTypes.GET, dataName.SERVER_PUBLIC_KEY);
    const privateKeyPEM = JSON.parse(devicePrivatekeyData);
    const serverPublicKeyPEM = JSON.parse(serverPubKeyData);
    const keystore = JWK.createKeyStore();
    keystore.add(privateKeyPEM, "pem");
    keystore.add(serverPublicKeyPEM, "pem");
    const publicKey = await JWK.asKey(serverPublicKeyPEM, "pem");
    const privateKey = await JWK.asKey(privateKeyPEM, "pem");
    let signedPayload, jwePayload, decrypted, verified, verifiedPayload;
    switch (operation) {
      case payloadContent.ENCRYPT:
        signedPayload = await sign(privateKey, data, event, networkId);
        jwePayload = await encrypt(publicKey, signedPayload);
        return { jwePayload, wsId, wsTs };
      case payloadContent.DECRYPT:
        decrypted = await JWE.createDecrypt(keystore).decrypt(data);
        verified = await verify(publicKey, decrypted.payload.toString());
        verifiedPayload = verified?.payload && JSON.parse(verified.payload.toString());
        return verifiedPayload;
      default:
        console.log("Invalid format");
    }
  } catch (err) {
    console.error(err);
  }
};
