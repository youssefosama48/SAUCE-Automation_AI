const { expect } = require('chai');
const DriverFactory = require('../utils/driver');
const LoginPage = require('../pages/LoginPage');
const InventoryPage = require('../pages/InventoryPage');
const config = require('../config/test.config');
const reporter = require('../utils/reporter');

describe('valid_login', function() {
  this.timeout(60000);
  let driver;
  let loginPage;
  let inventoryPage;
  
  before(async function() {
    driver = await DriverFactory.createDriver();
    loginPage = new LoginPage(driver);
    inventoryPage = new InventoryPage(driver);
  });
  
  after(async function() {
    await reporter.writeResults();
    await DriverFactory.quitDriver(driver);
  });
  
  it('TC-001: Valid login with standard user', async function() {
    // ZEPHYR: TC-001 -> SAUC-T70
    const startTime = Date.now();
    let testStatus = 'FAIL';
    let errorMessage = null;
    
    try {
      await loginPage.navigate();
      
      await loginPage.enterUsername(config.credentials.valid_user);
      const usernameEntered = await driver.findElement(loginPage.locators.usernameInput).getAttribute('value');
      expect(usernameEntered).to.equal(config.credentials.valid_user);
      
      await loginPage.enterPassword(config.credentials.password);
      const passwordEntered = await driver.findElement(loginPage.locators.passwordInput).getAttribute('value');
      expect(passwordEntered).to.equal(config.credentials.password);
      
      await loginPage.clickLoginButton();
      
      await inventoryPage.waitForPageLoad();
      const currentUrl = await inventoryPage.getCurrentUrl();
      expect(currentUrl).to.include('inventory.html');
      expect(currentUrl).to.equal('https://www.saucedemo.com/inventory.html');
      
      testStatus = 'PASS';
    } catch (error) {
      testStatus = 'FAIL';
      errorMessage = error.message;
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      reporter.addResult('SAUC-T70', 'TC-001', 'Valid login with standard user', testStatus, duration, errorMessage);
    }
  });
});