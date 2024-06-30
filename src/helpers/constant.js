const containerTypes = {
  DESKTOP: "desktop",
  BROWSER: "browser",
};

const operationTypes = {
  SET: "set",
  GET: "get",
  DEL: "del",
};

const dataName = {
  PRIVATE_KEY: "privateKey",
  PUBLIC_KEY: "publicKey",
  SERVER_PUBLIC_KEY: "serverPublicKey",
  ENABLEMENT_KEY: "enablementKey",
  CONTAINER_DETAILS: "container_details",
  TOKEN_DETAILS: "tokenDetails",
  ENVIRONMENT_VARIABLE: "enviromentVariable",
  REMOVED_ORG: "removedOrg",
  NETWORKS: "networks",
  PRIMARY_NETWORK: "primaryNetwork",
  QUEUED_EVENTS: "queued_events",
  PROVIDER_ID: "providerId",
  LATEST_EVENT: "latest_event",
  CONTAINER_INFO: "container_info",
};

const payloadContent = {
  ENCRYPT: "ENCRYPT",
  DECRYPT: "DECRYPT",
  WS_ISS: "idp:Insiteflow",
  WS_CORRELATION_ID: "https://insiteflow.io/ws-correlation-id",
  WS_NETWORK_ID: "https://insiteflow.io/ws-networkId",
  WS_PARALLEL: " https://insiteflow.io/ws-parallel",
  WS_EVENT: "https://insiteflow.io/ws-event",
  WS_TS: "https://insitefow.io/ws-ts",
  WS_ID: "https://insiteflow.io/ws-id",
  WS_PAYLOAD: "https://insiteflow.io/ws-payload",
  WS_METADATA: "https://insiteflow.io/ws-metadata",
};

const appEvents = {
  patientView: "patient_view",
  logout: "provider_logout",
  login: "provider_login",
  providerView: "provider_view",
  patientSwitch: "patient_switch",
  patientOpen: "patient-open",
  patientClose: "patient_close",
  PatientChartView: "patient_chart_view",
};

const wsEvents = {
  USER_CONTEXT: "user_context",
  AUDIT_LOG: "audit_logs",
  REMOVED_CONFIG: "removed_config",
  DEFAULT_CONFIGURATION: "default_config",
  UPDATED_CONFIGURATION: "updated_config",
  CONTAINER_LAUNCH: "container_launch",
  CONTAINERS_CLOUDWATCH_LOGS: "containers_cloudwatch_logs",
  CONTAINER_INFO: "container_info",
};
const browserConst = {
  API_IP_ADDRESS_URL: "https://api.ipify.org/?format=json",
  API_MIX_PANEL_URL: "https://api.mixpanel.com",
};

const auditLog = {
  USER_CONTEXT_DISCOVERED: "user_context_discovered",
  ENABLEMENTKEY_SUCCESS: "enablementkey_successful",
  ENABLEMENTKEY_DISCOVERED: "enablementkey_discovered",
  WEBSOCKET_CONNECTED: "websocket_connected",
  WEBSOCKET_DISCONNECTED: "websocket_disconnected",
  INCOMING_EVENT: "incoming_event",
  CONTAINER_UPDATED: "container_updated",
  NETWORK_CONFIG_NOT_FOUND: "network_config_not_found",
  NO_OP: "No_Op",
  CONFIGURATION_UPDATED: "config_updated",
  NETWORK_REMOVED: "network_removed",
  ORG_REMOVED: "organization_removed",
};

const rendererAuditEvents = {
  VIEWPORT_MAXIMIZE: "viewport_maximize",
  VIEWPORT_MINIMIZE: "viewport_minimize",
  VIEWPORT_OPEN: "viewport_open",
  VIEWPORT_SWITCH: "viewport_switch",
  VIEWPORT_RESET: "viewport_reset",
  VIEWPORT_DRAG: "viewport_drag",
  VIEWPORT_CLOSE: "viewport_close",
  VIEWPORT_QUIT: "viewport_quit",
  NOTIFICATION_DISPLAYED: "notification_displayed",
  NOTIFICATION_ACKNOWLEDGED: "notification_acknowledged",
  NOTIFICATION_DISMISSED: "notification_dismissed",
  NOTIFICATION_SKIPPED: "notification_skipped",
  NOTIFICATION_CLOSED: "notification_closed",
  CONTEXT_EXPIRED: "context_expired",
};

module.exports = {
  containerTypes,
  operationTypes,
  dataName,
  payloadContent,
  appEvents,
  wsEvents,
  browserConst,
  auditLog,
  rendererAuditEvents,
};
