const { Builder, Browser } = require('selenium-webdriver');
const edge = require('selenium-webdriver/edge');
const config = require('../config/test.config');

class DriverFactory {
  static async createDriver() {
    const options = new edge.Options();
    
    if (config.headless || process.env.HEADLESS === 'true') {
      options.addArguments('--headless');
      options.addArguments('--disable-gpu');
    }
    
    options.addArguments('--no-sandbox');
    options.addArguments('--disable-dev-shm-usage');
    options.addArguments('--window-size=1920,1080');
    options.addArguments('--disable-blink-features=AutomationControlled');
    
    const driver = await new Builder()
      .forBrowser(Browser.EDGE)
      .setEdgeOptions(options)
      .build();
    
    await driver.manage().setTimeouts({
      implicit: config.timeout.implicit,
      pageLoad: config.timeout.page_load
    });
    
    await driver.manage().window().maximize();
    
    return driver;
  }
  
  static async quitDriver(driver) {
    if (driver) {
      await driver.quit();
    }
  }
}

module.exports = DriverFactory;