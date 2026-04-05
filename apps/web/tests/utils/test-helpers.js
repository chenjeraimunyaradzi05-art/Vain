"use strict";

const DEFAULT_BASE_URL = "http://127.0.0.1:3000";
const DEFAULT_API_BASE_URL = "http://127.0.0.1:3001";

function getBaseUrl() {
  return process.env.E2E_BASE_URL || process.env.BASE_URL || DEFAULT_BASE_URL;
}

function getApiBaseUrl() {
  return process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_BASE_URL;
}

async function safeGoto(page, path, options = {}) {
  const baseUrl = getBaseUrl();
  const url = path.startsWith("http") ? path : `${baseUrl}${path}`;
  await page.goto(url, { waitUntil: "domcontentloaded", ...options });
}

async function waitForAppReady(
  page,
  selectors = ["main", "[role='main']", ".container", "#__next"]
) {
  const selector = selectors.join(", ");
  await page.waitForSelector(selector, { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(300);
}

async function setAuthToken(page, token) {
  await page.evaluate((t) => {
    localStorage.setItem("token", t);
  }, token);
}

async function loginViaApi(request, { email, password }) {
  const apiBaseUrl = getApiBaseUrl();
  const loginRes = await request.post(`${apiBaseUrl}/auth/login`, {
    data: { email, password },
  });

  if (!loginRes.ok()) {
    return { ok: false, status: loginRes.status() };
  }

  const data = await loginRes.json();
  return { ok: true, token: data.token, user: data.user };
}

async function loginAndSetToken({ page, request, email, password }) {
  const result = await loginViaApi(request, { email, password });
  if (!result.ok) return result;

  await safeGoto(page, "/login");
  await setAuthToken(page, result.token);

  return result;
}

module.exports = {
  getBaseUrl,
  getApiBaseUrl,
  safeGoto,
  waitForAppReady,
  setAuthToken,
  loginViaApi,
  loginAndSetToken,
};
