const { Builder, Browser } = require('selenium-webdriver');
const edge = require('selenium-webdriver/edge');
const config = require('../config/test.config');

class DriverFactory {
  constructor() {
    this.driver = null;
  }

  async createDriver(headless = false) {
    const options = new edge.Options();
    
    if (headless) {
      options.addArguments('--headless');
      options.addArguments('--disable-gpu');
    }
    
    options.addArguments('--no-sandbox');
    options.addArguments('--disable-dev-shm-usage');
    options.addArguments('--window-size=1920,1080');
    options.addArguments('--disable-blink-features=AutomationControlled');
    options.setEdgeOptions(options);

    this.driver = await new Builder()
      .forBrowser(Browser.EDGE)
      .setEdgeOptions(options)
      .build();

    await this.driver.manage().setTimeouts({
      implicit: config.timeouts.implicit,
      pageLoad: config.timeouts.pageLoad
    });

    await this.driver.manage().window().maximize();

    return this.driver;
  }

  async quitDriver() {
    if (this.driver) {
      await this.driver.quit();
      this.driver = null;
    }
  }

  getDriver() {
    return this.driver;
  }
}

module.exports = DriverFactory;