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
  
  before(async function() {
    driverFactory = new DriverFactory();
    driver = await driverFactory.createDriver(false);
    loginPage = new LoginPage(driver);
  });
  
  after(async function() {
    await driverFactory.quitDriver();
  });
  
  beforeEach(async function() {
    await loginPage.navigate();
  });
  
  it('Invalid Login with Wrong Password', async function() {
    // ZEPHYR: TC-002 -> SAUC-T79
    const startTime = Date.now();
    let testStatus = 'PASS';
    let errorMessage = null;
    
    try {
      await loginPage.enterUsername(config.credentials.valid_user);
      
      await loginPage.enterPassword('wrong_password');
      
      await loginPage.clickLogin();
      
      const isErrorDisplayed = await loginPage.isErrorMessageDisplayed();
      expect(isErrorDisplayed).to.be.true;
      
      const errorText = await loginPage.getErrorMessage();
      expect(errorText).to.include('Username and password do not match');
      
    } catch (error) {
      testStatus = 'FAIL';
      errorMessage = error.message;
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      reporter.addResult({
        testCaseKey: 'SAUC-T79',
        tcId: 'TC-002',
        name: 'Invalid Login with Wrong Password',
        status: testStatus,
        duration: duration,
        error: errorMessage
      });
    }
  });
  
  it('Invalid Login with Unregistered User', async function() {
    // ZEPHYR: TC-003 -> SAUC-T80
    const startTime = Date.now();
    let testStatus = 'PASS';
    let errorMessage = null;
    
    try {
      await loginPage.enterUsername('invalid_user');
      
      await loginPage.enterPassword('any_password');
      
      await loginPage.clickLogin();
      
      const isErrorDisplayed = await loginPage.isErrorMessageDisplayed();
      expect(isErrorDisplayed).to.be.true;
      
    } catch (error) {
      testStatus = 'FAIL';
      errorMessage = error.message;
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      reporter.addResult({
        testCaseKey: 'SAUC-T80',
        tcId: 'TC-003',
        name: 'Invalid Login with Unregistered User',
        status: testStatus,
        duration: duration,
        error: errorMessage
      });
    }
  });
  
  it('Login with Empty Username', async function() {
    // ZEPHYR: TC-004 -> SAUC-T81
    const startTime = Date.now();
    let testStatus = 'PASS';
    let errorMessage = null;
    
    try {
      await loginPage.enterUsername('');
      
      await loginPage.enterPassword(config.credentials.password);
      
      await loginPage.clickLogin();
      
      const isErrorDisplayed = await loginPage.isErrorMessageDisplayed();
      expect(isErrorDisplayed).to.be.true;
      
      const errorText = await loginPage.getErrorMessage();
      expect(errorText).to.include('Username is required');
      
    } catch (error) {
      testStatus = 'FAIL';
      errorMessage = error.message;
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      reporter.addResult({
        testCaseKey: 'SAUC-T81',
        tcId: 'TC-004',
        name: 'Login with Empty Username',
        status: testStatus,
        duration: duration,
        error: errorMessage
      });
    }
  });
  
  it('Login with Empty Password', async function() {
    // ZEPHYR: TC-005 -> SAUC-T82
    const startTime = Date.now();
    let testStatus = 'PASS';
    let errorMessage = null;
    
    try {
      await loginPage.enterUsername(config.credentials.valid_user);
      
      await loginPage.enterPassword('');
      
      await loginPage.clickLogin();
      
      const isErrorDisplayed = await loginPage.isErrorMessageDisplayed();
      expect(isErrorDisplayed).to.be.true;
      
      const errorText = await loginPage.getErrorMessage();
      expect(errorText).to.include('Password is required');
      
    } catch (error) {
      testStatus = 'FAIL';
      errorMessage = error.message;
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      reporter.addResult({
        testCaseKey: 'SAUC-T82',
        tcId: 'TC-005',
        name: 'Login with Empty Password',
        status: testStatus,
        duration: duration,
        error: errorMessage
      });
    }
  });
  
  it('Login with Both Fields Empty', async function() {
    // ZEPHYR: TC-006 -> SAUC-T83
    const startTime = Date.now();
    let testStatus = 'PASS';
    let errorMessage = null;
    
    try {
      await loginPage.enterUsername('');
      
      await loginPage.enterPassword('');
      
      await loginPage.clickLogin();
      
      const isErrorDisplayed = await loginPage.isErrorMessageDisplayed();
      expect(isErrorDisplayed).to.be.true;
      
    } catch (error) {
      testStatus = 'FAIL';
      errorMessage = error.message;
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      reporter.addResult({
        testCaseKey: 'SAUC-T83',
        tcId: 'TC-006',
        name: 'Login with Both Fields Empty',
        status: testStatus,
        duration: duration,
        error: errorMessage
      });
    }
  });
});