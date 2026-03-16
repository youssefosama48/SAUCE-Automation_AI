const { expect } = require('chai');
const DriverFactory = require('../utils/driver');
const LoginPage = require('../pages/LoginPage');
const config = require('../config/test.config');
const reporter = require('../utils/reporter');

describe('invalid_login', function() {
  this.timeout(60000);
  let driver;
  let loginPage;
  
  before(async function() {
    driver = await DriverFactory.createDriver();
    loginPage = new LoginPage(driver);
  });
  
  after(async function() {
    await DriverFactory.quitDriver(driver);
  });
  
  beforeEach(async function() {
    await loginPage.navigate();
  });
  
  it('TC-002: Invalid login with incorrect password', async function() {
    // ZEPHYR: TC-002 -> SAUC-T71
    const startTime = Date.now();
    let testStatus = 'FAIL';
    let errorMessage = null;
    
    try {
      await loginPage.enterUsername(config.credentials.valid_user);
      const usernameEntered = await driver.findElement(loginPage.locators.usernameInput).getAttribute('value');
      expect(usernameEntered).to.equal(config.credentials.valid_user);
      
      await loginPage.enterPassword('wrong_password');
      const passwordEntered = await driver.findElement(loginPage.locators.passwordInput).getAttribute('value');
      expect(passwordEntered).to.equal('wrong_password');
      
      await loginPage.clickLoginButton();
      
      const isErrorDisplayed = await loginPage.isErrorMessageDisplayed();
      expect(isErrorDisplayed).to.be.true;
      
      const errorText = await loginPage.getErrorMessage();
      expect(errorText).to.include('Username and password do not match');
      
      testStatus = 'PASS';
    } catch (error) {
      testStatus = 'FAIL';
      errorMessage = error.message;
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      reporter.addResult('SAUC-T71', 'TC-002', 'Invalid login with incorrect password', testStatus, duration, errorMessage);
    }
  });
  
  it('TC-003: Invalid login with unregistered user', async function() {
    // ZEPHYR: TC-003 -> SAUC-T72
    const startTime = Date.now();
    let testStatus = 'FAIL';
    let errorMessage = null;
    
    try {
      await loginPage.enterUsername('invalid_user');
      const usernameEntered = await driver.findElement(loginPage.locators.usernameInput).getAttribute('value');
      expect(usernameEntered).to.equal('invalid_user');
      
      await loginPage.enterPassword(config.credentials.password);
      const passwordEntered = await driver.findElement(loginPage.locators.passwordInput).getAttribute('value');
      expect(passwordEntered).to.equal(config.credentials.password);
      
      await loginPage.clickLoginButton();
      
      const isErrorDisplayed = await loginPage.isErrorMessageDisplayed();
      expect(isErrorDisplayed).to.be.true;
      
      const errorText = await loginPage.getErrorMessage();
      expect(errorText).to.not.be.empty;
      
      testStatus = 'PASS';
    } catch (error) {
      testStatus = 'FAIL';
      errorMessage = error.message;
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      reporter.addResult('SAUC-T72', 'TC-003', 'Invalid login with unregistered user', testStatus, duration, errorMessage);
    }
  });
  
  it('TC-004: Login with empty username', async function() {
    // ZEPHYR: TC-004 -> SAUC-T73
    const startTime = Date.now();
    let testStatus = 'FAIL';
    let errorMessage = null;
    
    try {
      await loginPage.clearUsername();
      const usernameValue = await driver.findElement(loginPage.locators.usernameInput).getAttribute('value');
      expect(usernameValue).to.equal('');
      
      await loginPage.enterPassword(config.credentials.password);
      const passwordEntered = await driver.findElement(loginPage.locators.passwordInput).getAttribute('value');
      expect(passwordEntered).to.equal(config.credentials.password);
      
      await loginPage.clickLoginButton();
      
      const isErrorDisplayed = await loginPage.isErrorMessageDisplayed();
      expect(isErrorDisplayed).to.be.true;
      
      const errorText = await loginPage.getErrorMessage();
      expect(errorText).to.include('Username is required');
      
      testStatus = 'PASS';
    } catch (error) {
      testStatus = 'FAIL';
      errorMessage = error.message;
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      reporter.addResult('SAUC-T73', 'TC-004', 'Login with empty username', testStatus, duration, errorMessage);
    }
  });
  
  it('TC-005: Login with empty password', async function() {
    // ZEPHYR: TC-005 -> SAUC-T74
    const startTime = Date.now();
    let testStatus = 'FAIL';
    let errorMessage = null;
    
    try {
      await loginPage.enterUsername(config.credentials.valid_user);
      const usernameEntered = await driver.findElement(loginPage.locators.usernameInput).getAttribute('value');
      expect(usernameEntered).to.equal(config.credentials.valid_user);
      
      await loginPage.clearPassword();
      const passwordValue = await driver.findElement(loginPage.locators.passwordInput).getAttribute('value');
      expect(passwordValue).to.equal('');
      
      await loginPage.clickLoginButton();
      
      const isErrorDisplayed = await loginPage.isErrorMessageDisplayed();
      expect(isErrorDisplayed).to.be.true;
      
      const errorText = await loginPage.getErrorMessage();
      expect(errorText).to.include('Password is required');
      
      testStatus = 'PASS';
    } catch (error) {
      testStatus = 'FAIL';
      errorMessage = error.message;
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      reporter.addResult('SAUC-T74', 'TC-005', 'Login with empty password', testStatus, duration, errorMessage);
    }
  });
  
  it('TC-006: Login with both fields empty', async function() {
    // ZEPHYR: TC-006 -> SAUC-T75
    const startTime = Date.now();
    let testStatus = 'FAIL';
    let errorMessage = null;
    
    try {
      await loginPage.clearUsername();
      const usernameValue = await driver.findElement(loginPage.locators.usernameInput).getAttribute('value');
      expect(usernameValue).to.equal('');
      
      await loginPage.clearPassword();
      const passwordValue = await driver.findElement(loginPage.locators.passwordInput).getAttribute('value');
      expect(passwordValue).to.equal('');
      
      await loginPage.clickLoginButton();
      
      const isErrorDisplayed = await loginPage.isErrorMessageDisplayed();
      expect(isErrorDisplayed).to.be.true;
      
      const errorText = await loginPage.getErrorMessage();
      expect(errorText).to.not.be.empty;
      
      testStatus = 'PASS';
    } catch (error) {
      testStatus = 'FAIL';
      errorMessage = error.message;
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      reporter.addResult('SAUC-T75', 'TC-006', 'Login with both fields empty', testStatus, duration, errorMessage);
    }
  });
});