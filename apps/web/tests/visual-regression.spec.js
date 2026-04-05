"use strict";

const { test, expect } = require("@playwright/test");
const { safeGoto, waitForAppReady } = require("./utils/test-helpers");

const enabled = String(process.env.VISUAL_REGRESSION || "").toLowerCase() === "1";

test.describe("Visual regression (opt-in)", () => {
  test.skip(!enabled, "Set VISUAL_REGRESSION=1 to enable screenshot comparisons");

  test("home page matches snapshot", async ({ page }) => {
    await safeGoto(page, "/");
    await waitForAppReady(page, ["nav", "header", "main", "#__next"]);
    await expect(page).toHaveScreenshot("home.png", { fullPage: true });
  });

  test("jobs page matches snapshot", async ({ page }) => {
    await safeGoto(page, "/jobs");
    await waitForAppReady(page, ["main", "h1", "#__next"]);
    await expect(page).toHaveScreenshot("jobs.png", { fullPage: true });
  });
});
