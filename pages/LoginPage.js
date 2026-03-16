const { By, until } = require('selenium-webdriver');
const config = require('../config/test.config');

class LoginPage {
  constructor(driver) {
    this.driver = driver;
    this.timeout = config.timeout.explicit;
    
    this.usernameInput = By.id(config.pages.login_page.elements.username_input.locator);
    this.passwordInput = By.id(config.pages.login_page.elements.password_input.locator);
    this.loginButton = By.id(config.pages.login_page.elements.login_button.locator);
    this.errorMessage = By.css(config.pages.login_page.elements.error_message.locator);
  }

  async navigate() {
    await this.driver.get(config.pages.login_page.url);
    await this.waitForPageLoad();
  }

  async waitForPageLoad() {
    await this.driver.wait(
      until.elementLocated(this.usernameInput),
      this.timeout,
      'Username input not found'
    );
    await this.driver.wait(
      until.elementLocated(this.loginButton),
      this.timeout,
      'Login button not found'
    );
  }

  async enterUsername(username) {
    const element = await this.driver.wait(
      until.elementLocated(this.usernameInput),
      this.timeout
    );
    await element.clear();
    await element.sendKeys(username);
  }

  async enterPassword(password) {
    const element = await this.driver.wait(
      until.elementLocated(this.passwordInput),
      this.timeout
    );
    await element.clear();
    await element.sendKeys(password);
  }

  async clickLogin() {
    const element = await this.driver.wait(
      until.elementLocated(this.loginButton),
      this.timeout
    );
    await element.click();
  }

  async login(username, password) {
    await this.enterUsername(username);
    await this.enterPassword(password);
    await this.clickLogin();
  }

  async getErrorMessage() {
    try {
      const element = await this.driver.wait(
        until.elementLocated(this.errorMessage),
        this.timeout
      );
      return await element.getText();
    } catch (error) {
      return null;
    }
  }

  async isErrorMessageDisplayed() {
    try {
      const element = await this.driver.wait(
        until.elementLocated(this.errorMessage),
        this.timeout
      );
      return await element.isDisplayed();
    } catch (error) {
      return false;
    }
  }

  async isUsernameInputDisplayed() {
    try {
      const element = await this.driver.findElement(this.usernameInput);
      return await element.isDisplayed();
    } catch (error) {
      return false;
    }
  }

  async isPasswordInputDisplayed() {
    try {
      const element = await this.driver.findElement(this.passwordInput);
      return await element.isDisplayed();
    } catch (error) {
      return false;
    }
  }

  async isLoginButtonDisplayed() {
    try {
      const element = await this.driver.findElement(this.loginButton);
      return await element.isDisplayed();
    } catch (error) {
      return false;
    }
  }

  async getCurrentUrl() {
    return await this.driver.getCurrentUrl();
  }
}

module.exports = LoginPage;