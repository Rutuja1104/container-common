import { appEvents, wsEvents } from "./constant";
const http = require("http");
let notificationService, API_KEY, isListening;

const parseContextData = (data) => {
  switch (data?.context?.event_code) {
    case appEvents?.providerView:
      return {
        eventCode: data?.context?.event_code || undefined,
        providerId: data?.context?.providerId || undefined,
        patient: {},
        machineName: data?.machineName || undefined,
      };
    case appEvents?.patientSwitch:
      return {
        eventCode: appEvents.patientView,
        providerId: data?.context?.providerId || undefined,
        patient: {
          mrn: data?.context?.patientId || undefined,
          lastname: data?.context?.lastname || undefined,
          firstname: data?.context?.firstname || undefined,
          PatientBirthDate:
            data?.prefetch?.patientToGreet?.birthDate || undefined,
        },
        patientId: data?.context?.patientId || undefined,
        machineName: data?.machineName || undefined,
      };
    case appEvents?.patientOpen:
      return {
        eventCode: appEvents.patientView,
        providerId: data?.context?.providerId || undefined,
        patient: {
          mrn: data?.context?.patientId || undefined,
          lastname: data?.context?.lastname || undefined,
          firstname: data?.context?.firstname || undefined,
          dob: data?.prefetch?.patientToGreet?.birthDate || undefined,
        },
        patientId: data?.context?.patientId || undefined,
        machineName: data?.machineName || undefined,
      };
    case appEvents?.patientClose:
      return {
        eventCode: appEvents?.login,
        providerId: data?.context?.providerId || undefined,
        patient: {
          mrn: data?.context?.patientId || undefined,
          lastname: data?.context?.lastname || undefined,
          firstname: data?.context?.firstname || undefined,
          dob: data?.prefetch?.patientToGreet?.birthDate || undefined,
        },
        patientId: data?.context?.patientId || undefined,
        machineName: data?.machineName || undefined,
      };
    case appEvents?.login:
      return {
        eventCode: data?.context?.event_code || undefined,
        providerId: data?.context?.providerId || undefined,
        patient: {
          mrn: data?.context?.patientId || undefined,
          lastname: data?.context?.lastname || undefined,
          firstname: data?.context?.firstname || undefined,
          dob: data?.prefetch?.patientToGreet?.birthDate || undefined,
        },
        patientId: data?.context?.patientId || undefined,
        machineName: data?.machineName || undefined,
      };
    case appEvents?.PatientChartView:
      return {
        eventCode: data?.context?.event_code || undefined,
        providerId: data?.context?.providerId || undefined,
        patient: {
          mrn: data?.context?.patientId || undefined,
          lastname: data?.context?.lastname || undefined,
          firstname: data?.context?.firstname || undefined,
          dob: data?.prefetch?.patientToGreet?.birthDate || undefined,
        },
        patientId: data?.context?.patientId || undefined,
        machineName: data?.machineName || undefined,
      };
    case appEvents?.patientView:
      return {
        eventCode: data?.context?.event_code || undefined,
        providerId: data?.context?.providerId || undefined,
        patient: {
          mrn: data?.context?.patientId || undefined,
          lastname: data?.context?.lastname || undefined,
          firstname: data?.context?.firstname || undefined,
          dob: data?.prefetch?.patientToGreet?.birthDate || undefined,
        },
        patientId: data?.context?.patientId || undefined,
        machineName: data?.machineName || undefined,
      };
    case appEvents?.logout:
      return {
        event_code: data?.context?.event_code || undefined,
        providerId: data?.context?.providerId || undefined,
        machineName: data?.machineName || undefined,
      };
    default:
      break;
  }
};

const requestListener = (req, res) => {
  const apiKey = req.headers["authorization"];

  if (req.method === "POST") {
    let body = "";

    req.on("data", async (chunk) => {
      body += chunk.toString();
    });

    req.on("end", () => {
      if (!apiKey || apiKey !== API_KEY) {
        if (!apiKey) {
          res.writeHead(403, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              message: "Missing Authentication Token",
            })
          );
        } else if (apiKey !== API_KEY) {
          res.writeHead(401, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              message: "Invalid Apikey",
            })
          );
        }
      } else {
        try {
          res.writeHead(200, { "Content-Type": "application/json" });
          let resObj = JSON.parse(body);
          let contextData = parseContextData(resObj);
          notificationService.publish(
            wsEvents.USER_CONTEXT,
            JSON.stringify(contextData)
          );
          res.end(
            JSON.stringify({
              status: true,
              data: {
                body: null,
                message: "Success",
              },
              error: null,
            })
          );
        } catch (error) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid JSON" }));
        }
      }
    });
  } else {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not Found" }));
  }
};

const server = http.createServer(requestListener);

export const startApiListner = (config, emitterInstance) => {
  notificationService = emitterInstance;
  API_KEY = config?.apiKey;
  server.listen(config?.port, "127.0.0.1", () => {
    console.log(`listening ${config?.port} port`);
  });
};

export const stopApiListener = () => {
  server.on("listening", () => {
    isListening = true;
    console.log("Server is listening");
  });

  server.on("close", () => {
    isListening = false;
    console.log("Server has been closed");
  });

  if (isListening && server) {
    server.close((err) => {
      if (err) {
        console.error("Error closing the server:", err);
      } else {
        console.log("Server closed successfully");
      }
    });
  } else {
    console.log("Server is not running");
  }
};
