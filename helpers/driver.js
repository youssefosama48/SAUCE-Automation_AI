// ─────────────────────────────────────────────────────────────────────────────
// helpers/driver.js — shared WebDriver factory & utilities
// ─────────────────────────────────────────────────────────────────────────────

const { Builder, By, until } = require("selenium-webdriver");
const edge = require("selenium-webdriver/edge");
const path = require("path");
const fs   = require("fs");

const BASE_URL = "https://www.saucedemo.com";

// ─── Selectors map (all pages) ────────────────────────────────────────────────
const SELECTORS = {
  // ── Login Page ──────────────────────────────────────────────────────────────
  login: {
    username:      By.id("user-name"),
    password:      By.id("password"),
    loginBtn:      By.id("login-button"),
    errorMsg:      By.css("[data-test='error']"),
    errorClose:    By.css(".error-button"),
    loginLogo:     By.css(".login_logo"),
  },

  // ── Header (all pages after login) ──────────────────────────────────────────
  header: {
    burgerMenu:    By.id("react-burger-menu-btn"),
    cartIcon:      By.css(".shopping_cart_link"),
    cartBadge:     By.css(".shopping_cart_badge"),
    appLogo:       By.css(".app_logo"),
    pageTitle:     By.css(".title"),
    // Burger menu items
    menuAllItems:  By.id("inventory_sidebar_link"),
    menuAbout:     By.id("about_sidebar_link"),
    menuLogout:    By.id("logout_sidebar_link"),
    menuReset:     By.id("reset_sidebar_link"),
    menuClose:     By.id("react-burger-cross-btn"),
  },

  // ── Inventory Page ───────────────────────────────────────────────────────────
  inventory: {
    container:         By.css(".inventory_container"),
    list:              By.css(".inventory_list"),
    items:             By.css(".inventory_item"),
    itemName:          By.css(".inventory_item_name"),
    itemDesc:          By.css(".inventory_item_desc"),
    itemPrice:         By.css(".inventory_item_price"),
    itemImg:           By.css(".inventory_item_img"),
    addToCartBtn:      By.css("[data-test^='add-to-cart']"),
    removeBtn:         By.css("[data-test^='remove']"),
    sortDropdown:      By.css("[data-test='product-sort-container']"),
  },

  // ── Product Detail Page ──────────────────────────────────────────────────────
  productDetail: {
    backBtn:           By.id("back-to-products"),
    itemName:          By.css(".inventory_details_name"),
    itemDesc:          By.css(".inventory_details_desc"),
    itemPrice:         By.css(".inventory_details_price"),
    itemImg:           By.css(".inventory_details_img"),
    addToCartBtn:      By.css("[data-test^='add-to-cart']"),
    removeBtn:         By.css("[data-test^='remove']"),
  },

  // ── Cart Page ────────────────────────────────────────────────────────────────
  cart: {
    container:         By.css(".cart_contents_container"),
    items:             By.css(".cart_item"),
    itemName:          By.css(".inventory_item_name"),
    itemDesc:          By.css(".inventory_item_desc"),
    itemPrice:         By.css(".inventory_item_price"),
    itemQty:           By.css(".cart_quantity"),
    removeBtn:         By.css("[data-test^='remove']"),
    continueShopBtn:   By.id("continue-shopping"),
    checkoutBtn:       By.id("checkout"),
  },

  // ── Checkout Step One (Your Info) ────────────────────────────────────────────
  checkoutOne: {
    firstName:         By.id("first-name"),
    lastName:          By.id("last-name"),
    postalCode:        By.id("postal-code"),
    continueBtn:       By.id("continue"),
    cancelBtn:         By.id("cancel"),
    errorMsg:          By.css("[data-test='error']"),
  },

  // ── Checkout Step Two (Overview) ─────────────────────────────────────────────
  checkoutTwo: {
    container:         By.css(".checkout_summary_container"),
    items:             By.css(".cart_item"),
    itemName:          By.css(".inventory_item_name"),
    itemPrice:         By.css(".inventory_item_price"),
    subtotalLabel:     By.css(".summary_subtotal_label"),
    taxLabel:          By.css(".summary_tax_label"),
    totalLabel:        By.css(".summary_total_label"),
    finishBtn:         By.id("finish"),
    cancelBtn:         By.id("cancel"),
  },

  // ── Checkout Complete ────────────────────────────────────────────────────────
  checkoutComplete: {
    container:         By.css(".checkout_complete_container"),
    header:            By.css(".complete-header"),
    text:              By.css(".complete-text"),
    ponyExpressImg:    By.css(".pony_express"),
    backHomeBtn:       By.id("back-to-products"),
  },
};

// ─── Driver Factory ───────────────────────────────────────────────────────────
async function buildDriver() {
  const isWindows  = process.platform === "win32";
  const localExe   = path.join(__dirname, "..", "msedgedriver.exe");
  let driverPath;

  if (isWindows && fs.existsSync(localExe)) {
    driverPath = localExe;
  } else if (isWindows) {
    driverPath = "msedgedriver.exe";
  } else {
    driverPath = "msedgedriver";
  }

  const options = new edge.Options();
  options.addArguments("--headless");
  options.addArguments("--no-sandbox");
  options.addArguments("--disable-dev-shm-usage");
  options.addArguments("--disable-gpu");
  options.addArguments("--window-size=1920,1080");
  options.addArguments("--disable-extensions");
  options.addArguments("--remote-debugging-port=9222");
  options.addArguments("--disable-setuid-sandbox");

  const service = new edge.ServiceBuilder(driverPath);
  const driver  = await new Builder()
    .forBrowser("MicrosoftEdge")
    .setEdgeOptions(options)
    .setEdgeService(service)
    .build();

  await driver.manage().setTimeouts({ implicit: 10000, pageLoad: 30000, script: 30000 });
  return driver;
}

// ─── Common Actions ───────────────────────────────────────────────────────────
async function login(driver, username = "standard_user", password = "secret_sauce") {
  await driver.get(BASE_URL);
  await driver.wait(until.elementLocated(SELECTORS.login.username), 10000);
  await driver.findElement(SELECTORS.login.username).sendKeys(username);
  await driver.findElement(SELECTORS.login.password).sendKeys(password);
  await driver.findElement(SELECTORS.login.loginBtn).click();
  await driver.wait(until.urlContains("/inventory.html"), 8000);
}

async function logout(driver) {
  await driver.findElement(SELECTORS.header.burgerMenu).click();
  await driver.wait(until.elementLocated(SELECTORS.header.menuLogout), 5000);
  await driver.findElement(SELECTORS.header.menuLogout).click();
  await driver.wait(until.urlIs(`${BASE_URL}/`), 5000);
}

// ─── Test Runner ──────────────────────────────────────────────────────────────
async function runSuite(suiteName, tests) {
  console.log(`\n╔══════════════════════════════════════════════════════════╗`);
  console.log(`║  ${suiteName.padEnd(55)}║`);
  console.log(`╚══════════════════════════════════════════════════════════╝\n`);

  const results   = [];
  const startTime = new Date();

  for (let i = 0; i < tests.length; i++) {
    const { name, expected, fn } = tests[i];
    const testStart = new Date();
    console.log(`─── Test ${i + 1}/${tests.length}: ${name}`);

    let driver;
    try {
      driver = await buildDriver();
      const outcome = await fn(driver);
      const duration = ((new Date() - testStart) / 1000).toFixed(2);

      const actualResult   = outcome?.actualResult   || "Test completed successfully";
      const expectedResult = outcome?.expectedResult || expected || "Test passes without error";
      const executionNote  = outcome?.executionNote  || null;

      console.log(`     Status         : PASS ✅`);
      console.log(`     Expected       : ${expectedResult}`);
      console.log(`     Actual         : ${actualResult}`);
      if (executionNote) console.log(`     Note           : ${executionNote}`);
      console.log(`     Duration       : ${duration}s\n`);

      results.push({
        id:             i + 1,
        name,
        status:         "PASS",
        expectedResult,
        actualResult,
        executionNote:  executionNote || "",
        errorDetail:    "",
        duration:       `${duration}s`,
      });

    } catch (err) {
      const duration = ((new Date() - testStart) / 1000).toFixed(2);
      const expectedResult = expected || "Test passes without error";

      console.log(`     Status         : FAIL ❌`);
      console.log(`     Expected       : ${expectedResult}`);
      console.log(`     Actual         : ${err.message}`);
      console.log(`     Duration       : ${duration}s\n`);

      results.push({
        id:             i + 1,
        name,
        status:         "FAIL",
        expectedResult,
        actualResult:   err.message,
        executionNote:  "",
        errorDetail:    err.message,
        duration:       `${duration}s`,
      });
    } finally {
      if (driver) await driver.quit();
    }
  }

  const endTime = new Date();
  const passed  = results.filter((r) => r.status === "PASS").length;
  const failed  = results.length - passed;
  const total   = ((endTime - startTime) / 1000).toFixed(2);

  const report = {
    suite:       suiteName,
    browser:     "Microsoft Edge (headless)",
    environment: process.platform === "win32" ? "Windows (local)" : "Linux (CI)",
    startTime:   startTime.toISOString(),
    endTime:     endTime.toISOString(),
    duration:    `${total}s`,
    summary:     { total: results.length, passed, failed, status: failed === 0 ? "ALL PASSED" : "SOME FAILED" },
    tests:       results,
  };

  const outFile = path.join(__dirname, "..", `results-${suiteName.replace(/\s+/g, "-").toLowerCase()}.json`);
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2), "utf-8");
  console.log(`📄 Results saved → ${outFile}`);

  console.log(`\n╔══════════════════════════════════════════════════════════╗`);
  console.log(`║  SUMMARY                                                 ║`);
  console.log(`╠══════════════════════════════════════════════════════════╣`);
  console.log(`║  Total    : ${String(results.length).padEnd(44)}║`);
  console.log(`║  Passed   : ${String(passed).padEnd(44)}║`);
  console.log(`║  Failed   : ${String(failed).padEnd(44)}║`);
  console.log(`║  Duration : ${String(total + "s").padEnd(44)}║`);
  console.log(`╚══════════════════════════════════════════════════════════╝\n`);

  if (failed > 0) {
    results.filter((r) => r.status === "FAIL")
      .forEach((r) => console.log(`   ❌ ${r.name}\n      └─ Expected : ${r.expectedResult}\n      └─ Actual   : ${r.actualResult}`));
    process.exit(1);
  } else {
    console.log("🎉 All tests passed!");
    process.exit(0);
  }
}

module.exports = { buildDriver, login, logout, runSuite, SELECTORS, BASE_URL };
