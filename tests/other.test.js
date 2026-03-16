const { expect } = require('chai');
const DriverFactory = require('../utils/driver');
const LoginPage = require('../pages/LoginPage');
const config = require('../config/test.config');
const reporter = require('../utils/reporter');

describe('other', function() {
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
  
  it('TC-007: Password field masking verification', async function() {
    // ZEPHYR: TC-007 -> SAUC-T76
    const startTime = Date.now();
    let testStatus = 'FAIL';
    let errorMessage = null;
    
    try {
      await loginPage.enterPassword(config.credentials.password);
      const passwordValue = await loginPage.getPasswordFieldValue();
      expect(passwordValue).to.equal(config.credentials.password);
      
      const fieldType = await loginPage.getPasswordFieldType();
      expect(fieldType).to.equal('password');
      
      const passwordField = await driver.findElement(loginPage.locators.passwordInput);
      const isPassword = await passwordField.getAttribute('type');
      expect(isPassword).to.equal('password');
      
      testStatus = 'PASS';
    } catch (error) {
      testStatus = 'FAIL';
      errorMessage = error.message;
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      reporter.addResult('SAUC-T76', 'TC-007', 'Password field masking verification', testStatus, duration, errorMessage);
    }
  });
  
  it('TC-008: Login button state validation', async function() {
    // ZEPHYR: TC-008 -> SAUC-T77
    const startTime = Date.now();
    let testStatus = 'FAIL';
    let errorMessage = null;
    
    try {
      const initialState = await loginPage.isLoginButtonEnabled();
      expect(initialState).to.be.true;
      
      await loginPage.enterUsername(config.credentials.valid_user);
      const usernameEntered = await driver.findElement(loginPage.locators.usernameInput).getAttribute('value');
      expect(usernameEntered).to.equal(config.credentials.valid_user);
      
      const afterUsernameState = await loginPage.isLoginButtonEnabled();
      expect(afterUsernameState).to.be.true;
      
      await loginPage.enterPassword(config.credentials.password);
      const passwordEntered = await driver.findElement(loginPage.locators.passwordInput).getAttribute('value');
      expect(passwordEntered).to.equal(config.credentials.password);
      
      const finalState = await loginPage.isLoginButtonEnabled();
      expect(finalState).to.be.true;
      
      testStatus = 'PASS';
    } catch (error) {
      testStatus = 'FAIL';
      errorMessage = error.message;
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      reporter.addResult('SAUC-T77', 'TC-008', 'Login button state validation', testStatus, duration, errorMessage);
    }
  });
});