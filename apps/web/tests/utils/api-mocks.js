"use strict";

const { getApiBaseUrl } = require("./test-helpers");

function apiUrl(path) {
  const apiBaseUrl = getApiBaseUrl();
  return path.startsWith("http") ? path : `${apiBaseUrl}${path}`;
}

async function mockJson(page, pathOrUrl, body, options = {}) {
  const { status = 200, method } = options;
  const url = apiUrl(pathOrUrl);

  await page.route(url, async (route, request) => {
    if (method && request.method().toLowerCase() !== String(method).toLowerCase()) {
      return route.fallback();
    }

    await route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
}

module.exports = {
  apiUrl,
  mockJson,
};
