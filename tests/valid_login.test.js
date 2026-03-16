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
    driver = await driverFactory.createDriver(false);
    loginPage = new LoginPage(driver);
    inventoryPage = new InventoryPage(driver);
  });
  
  after(async function() {
    await driverFactory.quitDriver();
    reporter.writeResults();
  });
  
  it('Valid Login with Standard User', async function() {
    // ZEPHYR: TC-001 -> SAUC-T78
    const startTime = Date.now();
    let testStatus = 'PASS';
    let errorMessage = null;
    
    try {
      await loginPage.navigate();
      
      await loginPage.enterUsername(config.credentials.valid_user);
      
      await loginPage.enterPassword(config.credentials.password);
      
      await loginPage.clickLogin();
      
      await inventoryPage.waitForPageLoad();
      const currentUrl = await inventoryPage.getCurrentUrl();
      expect(currentUrl).to.equal(config.pages.inventory_page.url);
      
      const isInventoryLoaded = await inventoryPage.isLoaded();
      expect(isInventoryLoaded).to.be.true;
      
    } catch (error) {
      testStatus = 'FAIL';
      errorMessage = error.message;
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      reporter.addResult({
        testCaseKey: 'SAUC-T78',
        tcId: 'TC-001',
        name: 'Valid Login with Standard User',
        status: testStatus,
        duration: duration,
        error: errorMessage
      });
    }
  });
});