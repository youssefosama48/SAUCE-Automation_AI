const { expect } = require('chai');
const DriverFactory = require('../utils/driver');
const LoginPage = require('../pages/LoginPage');
const InventoryPage = require('../pages/InventoryPage');
const config = require('../config/test.config');
const reporter = require('../utils/reporter');

describe('valid_login', function() {
  this.timeout(60000);
  
  let driverFactory;
  let driver;
  let loginPage;
  let inventoryPage;

  before(async function() {
    driverFactory = new DriverFactory();
    driver = await driverFactory.createDriver();
    loginPage = new LoginPage(driver);
    inventoryPage = new InventoryPage(driver);
  });

  after(async function() {
    await driverFactory.quitDriver();
    await reporter.writeResults();
  });

  afterEach(async function() {
    if (this.currentTest.state === 'failed') {
      const screenshot = await driver.takeScreenshot();
      console.log('Screenshot captured for failed test');
    }
  });

  it('TC-001: Successful login with valid credentials', async function() {
    // ZEPHYR: TC-001 -> SAUC-T46
    const startTime = Date.now();
    let status = 'PASS';
    let error = null;

    try {
      // Step 1: Navigate to SauceDemo login page
      await loginPage.navigate();
      const url = await loginPage.getCurrentUrl();
      expect(url).to.include('saucedemo.com');

      // Step 2: Enter username in username field
      await loginPage.enterUsername(config.credentials.valid_user);

      // Step 3: Enter password in password field
      await loginPage.enterPassword(config.credentials.password);

      // Step 4: Click login button
      await loginPage.clickLogin();

      // Step 5: Verify inventory page URL and product list
      await inventoryPage.waitForPageLoad();
      const inventoryUrl = await inventoryPage.getCurrentUrl();
      expect(inventoryUrl).to.include('/inventory.html');
      
      const productCount = await inventoryPage.getProductCount();
      expect(productCount).to.be.greaterThan(0);

    } catch (err) {
      status = 'FAIL';
      error = err.message;
      throw err;
    } finally {
      const duration = Date.now() - startTime;
      reporter.addResult('SAUC-T46', 'TC-001', 'Successful login with valid credentials', status, duration, error);
    }
  });

  it('TC-008: Verify inventory page after successful login', async function() {
    // ZEPHYR: TC-008 -> SAUC-T53
    const startTime = Date.now();
    let status = 'PASS';
    let error = null;

    try {
      // Step 1: Login with valid credentials
      await loginPage.navigate();
      await loginPage.login(config.credentials.valid_user, config.credentials.password);

      // Step 2: Verify inventory page URL
      await inventoryPage.waitForPageLoad();
      const url = await inventoryPage.getCurrentUrl();
      expect(url).to.include('/inventory.html');

      // Step 3: Verify product items are displayed
      const productCount = await inventoryPage.getProductCount();
      expect(productCount).to.be.greaterThan(0);

      // Step 4: Verify shopping cart icon is present
      const isCartDisplayed = await inventoryPage.isShoppingCartIconDisplayed();
      expect(isCartDisplayed).to.be.true;

    } catch (err) {
      status = 'FAIL';
      error = err.message;
      throw err;
    } finally {
      const duration = Date.now() - startTime;
      reporter.addResult('SAUC-T53', 'TC-008', 'Verify inventory page after successful login', status, duration, error);
    }
  });
});