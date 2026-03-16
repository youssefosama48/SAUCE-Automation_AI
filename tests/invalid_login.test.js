const { expect } = require('chai');
const DriverFactory = require('../utils/driver');
const LoginPage = require('../pages/LoginPage');
const config = require('../config/test.config');
const reporter = require('../utils/reporter');

describe('invalid_login', function() {
  this.timeout(60000);
  
  let driverFactory;
  let driver;
  let loginPage;

  beforeEach(async function() {
    driverFactory = new DriverFactory();
    driver = await driverFactory.createDriver();
    loginPage = new LoginPage(driver);
  });

  afterEach(async function() {
    if (this.currentTest.state === 'failed') {
      const screenshot = await driver.takeScreenshot();
      console.log('Screenshot captured for failed test');
    }
    await driverFactory.quitDriver();
  });

  after(async function() {
    await reporter.writeResults();
  });

  it('TC-002: Login fails with invalid username', async function() {
    // ZEPHYR: TC-002 -> SAUC-T47
    const startTime = Date.now();
    let status = 'PASS';
    let error = null;

    try {
      // Step 1: Navigate to login page
      await loginPage.navigate();

      // Step 2: Enter invalid username
      await loginPage.enterUsername('invalid_user');

      // Step 3: Enter incorrect password
      await loginPage.enterPassword('wrong_password');

      // Step 4: Click login button
      await loginPage.clickLogin();

      // Verify error message is displayed
      const isErrorDisplayed = await loginPage.isErrorMessageDisplayed();
      expect(isErrorDisplayed).to.be.true;

      // Step 5: Verify user remains on login page
      const currentUrl = await loginPage.getCurrentUrl();
      expect(currentUrl).to.include('saucedemo.com');
      expect(currentUrl).to.not.include('/inventory.html');

    } catch (err) {
      status = 'FAIL';
      error = err.message;
      throw err;
    } finally {
      const duration = Date.now() - startTime;
      reporter.addResult('SAUC-T47', 'TC-002', 'Login fails with invalid username', status, duration, error);
    }
  });

  it('TC-003: Login fails with empty credentials', async function() {
    // ZEPHYR: TC-003 -> SAUC-T48
    const startTime = Date.now();
    let status = 'PASS';
    let error = null;

    try {
      // Step 1: Navigate to login page
      await loginPage.navigate();

      // Step 2 & 3: Leave username and password fields empty
      await loginPage.enterUsername('');
      await loginPage.enterPassword('');

      // Step 4: Click login button
      await loginPage.clickLogin();

      // Verify error message is displayed
      const isErrorDisplayed = await loginPage.isErrorMessageDisplayed();
      expect(isErrorDisplayed).to.be.true;

      // Step 5: Verify error message content
      const errorText = await loginPage.getErrorMessage();
      expect(errorText).to.include('Username is required');

    } catch (err) {
      status = 'FAIL';
      error = err.message;
      throw err;
    } finally {
      const duration = Date.now() - startTime;
      reporter.addResult('SAUC-T48', 'TC-003', 'Login fails with empty credentials', status, duration, error);
    }
  });

  it('TC-004: Login fails with valid username and empty password', async function() {
    // ZEPHYR: TC-004 -> SAUC-T49
    const startTime = Date.now();
    let status = 'PASS';
    let error = null;

    try {
      // Step 1: Navigate to login page
      await loginPage.navigate();

      // Step 2: Enter valid username
      await loginPage.enterUsername(config.credentials.valid_user);

      // Step 3: Leave password field empty
      await loginPage.enterPassword('');

      // Step 4: Click login button
      await loginPage.clickLogin();

      // Verify error message is displayed
      const isErrorDisplayed = await loginPage.isErrorMessageDisplayed();
      expect(isErrorDisplayed).to.be.true;

      // Step 5: Verify password required error
      const errorText = await loginPage.getErrorMessage();
      expect(errorText).to.include('Password is required');

    } catch (err) {
      status = 'FAIL';
      error = err.message;
      throw err;
    } finally {
      const duration = Date.now() - startTime;
      reporter.addResult('SAUC-T49', 'TC-004', 'Login fails with valid username and empty password', status, duration, error);
    }
  });

  it('TC-005: Login fails with empty username and valid password', async function() {
    // ZEPHYR: TC-005 -> SAUC-T50
    const startTime = Date.now();
    let status = 'PASS';
    let error = null;

    try {
      // Step 1: Navigate to login page
      await loginPage.navigate();

      // Step 2: Leave username field empty
      await loginPage.enterUsername('');

      // Step 3: Enter valid password
      await loginPage.enterPassword(config.credentials.password);

      // Step 4: Click login button
      await loginPage.clickLogin();

      // Verify error message is displayed
      const isErrorDisplayed = await loginPage.isErrorMessageDisplayed();
      expect(isErrorDisplayed).to.be.true;

      // Step 5: Verify username required error
      const errorText = await loginPage.getErrorMessage();
      expect(errorText).to.include('Username is required');

    } catch (err) {
      status = 'FAIL';
      error = err.message;
      throw err;
    } finally {
      const duration = Date.now() - startTime;
      reporter.addResult('SAUC-T50', 'TC-005', 'Login fails with empty username and valid password', status, duration, error);
    }
  });

  it('TC-006: Login fails with valid username and wrong password', async function() {
    // ZEPHYR: TC-006 -> SAUC-T51
    const startTime = Date.now();
    let status = 'PASS';
    let error = null;

    try {
      // Step 1: Navigate to login page
      await loginPage.navigate();

      // Step 2: Enter valid username
      await loginPage.enterUsername(config.credentials.valid_user);

      // Step 3: Enter incorrect password
      await loginPage.enterPassword('wrong_password');

      // Step 4: Click login button
      await loginPage.clickLogin();

      // Verify error message is displayed
      const isErrorDisplayed = await loginPage.isErrorMessageDisplayed();
      expect(isErrorDisplayed).to.be.true;

      // Step 5: Verify credentials mismatch error
      const errorText = await loginPage.getErrorMessage();
      expect(errorText).to.include('Username and password do not match');

    } catch (err) {
      status = 'FAIL';
      error = err.message;
      throw err;
    } finally {
      const duration = Date.now() - startTime;
      reporter.addResult('SAUC-T51', 'TC-006', 'Login fails with valid username and wrong password', status, duration, error);
    }
  });
});