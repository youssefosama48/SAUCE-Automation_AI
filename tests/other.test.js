const { expect } = require('chai');
const DriverFactory = require('../utils/driver');
const LoginPage = require('../pages/LoginPage');
const config = require('../config/test.config');
const reporter = require('../utils/reporter');

describe('other', function() {
  this.timeout(60000);
  
  let driverFactory;
  let driver;
  let loginPage;

  before(async function() {
    driverFactory = new DriverFactory();
    driver = await driverFactory.createDriver();
    loginPage = new LoginPage(driver);
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

  it('TC-007: Login page elements are displayed correctly', async function() {
    // ZEPHYR: TC-007 -> SAUC-T52
    const startTime = Date.now();
    let status = 'PASS';
    let error = null;

    try {
      // Step 1: Navigate to login page
      await loginPage.navigate();
      const url = await loginPage.getCurrentUrl();
      expect(url).to.include('saucedemo.com');

      // Step 2: Verify username field is visible
      const isUsernameDisplayed = await loginPage.isUsernameInputDisplayed();
      expect(isUsernameDisplayed).to.be.true;

      // Step 3: Verify password field is visible
      const isPasswordDisplayed = await loginPage.isPasswordInputDisplayed();
      expect(isPasswordDisplayed).to.be.true;

      // Step 4: Verify login button is visible
      const isLoginButtonDisplayed = await loginPage.isLoginButtonDisplayed();
      expect(isLoginButtonDisplayed).to.be.true;

    } catch (err) {
      status = 'FAIL';
      error = err.message;
      throw err;
    } finally {
      const duration = Date.now() - startTime;
      reporter.addResult('SAUC-T52', 'TC-007', 'Login page elements are displayed correctly', status, duration, error);
    }
  });
});