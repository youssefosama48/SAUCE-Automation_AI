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
    driver = await driverFactory.createDriver(false);
    loginPage = new LoginPage(driver);
  });
  
  after(async function() {
    await driverFactory.quitDriver();
  });
  
  beforeEach(async function() {
    await loginPage.navigate();
  });
  
  it('Password Field Masking Verification', async function() {
    // ZEPHYR: TC-007 -> SAUC-T84
    const startTime = Date.now();
    let testStatus = 'PASS';
    let errorMessage = null;
    
    try {
      await loginPage.enterPassword('secret_sauce');
      
      const fieldType = await loginPage.getPasswordFieldType();
      expect(fieldType).to.equal('password');
      
    } catch (error) {
      testStatus = 'FAIL';
      errorMessage = error.message;
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      reporter.addResult({
        testCaseKey: 'SAUC-T84',
        tcId: 'TC-007',
        name: 'Password Field Masking Verification',
        status: testStatus,
        duration: duration,
        error: errorMessage
      });
    }
  });
  
  it('Login Form Fields Presence', async function() {
    // ZEPHYR: TC-008 -> SAUC-T85
    const startTime = Date.now();
    let testStatus = 'PASS';
    let errorMessage = null;
    
    try {
      const isUsernamePresent = await loginPage.isUsernameFieldPresent();
      expect(isUsernamePresent).to.be.true;
      
      const isPasswordPresent = await loginPage.isPasswordFieldPresent();
      expect(isPasswordPresent).to.be.true;
      
      const isLoginButtonPresent = await loginPage.isLoginButtonPresent();
      expect(isLoginButtonPresent).to.be.true;
      
    } catch (error) {
      testStatus = 'FAIL';
      errorMessage = error.message;
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      reporter.addResult({
        testCaseKey: 'SAUC-T85',
        tcId: 'TC-008',
        name: 'Login Form Fields Presence',
        status: testStatus,
        duration: duration,
        error: errorMessage
      });
    }
  });
});