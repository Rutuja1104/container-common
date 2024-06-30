const axios = require("axios");
const { containerTypes } = require("./constant");
const { containerType } = require("./common-helper");
export async function callAPI(endpoint,
  {
    data,
    token,
    headers: customHeaders,
    url,
    maxRetries = 10,
    retryDelay = 1000,
    ...customConfig
  } = {}
) {
  const newUrl = (endpoint !== "") ? endpoint : url;
  const config = {
    method: data ? "POST" : "GET",
    headers: {
      ...(token && token !== "" ? { Authorization: `Bearer ${token}` } : {}),
      ...(data && data !== "" ? { "Content-Type": "application/json" } : {}),
      ...customHeaders,
    },
    ...customConfig,
  };

  let retries = 0;
  const handleRequest = async () => {
    try {
      let resp;
      switch (containerType()) {
        case containerTypes.DESKTOP:
          resp = await axios(newUrl, { ...config, data: data || null });
          return resp;
        case containerTypes.BROWSER:
          resp = await fetch(newUrl, { ...config, body: data ? JSON.stringify(data) : null });
          resp.data = await resp.json();
          resp.data.body = resp.data?.data?.body || resp.data;
          return resp;
      }
    }
    catch (err) {
      return err;
    }
  }
  let response = await handleRequest();
  if (response.status >= 400 && response.status <= 499) {
    return Promise.reject(response);
  }

  if (response.status === 200) {
    return response.data;
  }
  if (response.status >= 500) {
    while (retries < maxRetries) {
      try {
        retries++;
        console.log(`Retrying request (attempt ${retries})...`);
        response = await handleRequest();
        if (response.status >= 400 && response.status <= 499) {
          return Promise.reject(response.data);
        }

        if (response.status === 200) {
          return response.data;
        }
      } catch (error) {
        return Promise.reject(error);
      }
    }
    if (response.status >= 500) {
      return Promise.reject(response);
    }
  }

  console.log(`Max retries (${maxRetries}) reached without a valid response.`);
  return Promise.reject(response);
}