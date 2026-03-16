const { By, until } = require('selenium-webdriver');
const config = require('../config/test.config');

class LoginPage {
  constructor(driver) {
    this.driver = driver;
    this.url = config.pages.login_page.url;
    
    this.usernameInput = By.id(config.pages.login_page.elements.username_input.locator);
    this.passwordInput = By.id(config.pages.login_page.elements.password_input.locator);
    this.loginButton = By.id(config.pages.login_page.elements.login_button.locator);
    this.errorMessage = By.css(config.pages.login_page.elements.error_message.locator);
  }

  async navigate() {
    await this.driver.get(this.url);
    await this.waitForPageLoad();
  }

  async waitForPageLoad() {
    await this.driver.wait(until.elementLocated(this.usernameInput), config.timeouts.explicit);
    await this.driver.wait(until.elementLocated(this.passwordInput), config.timeouts.explicit);
    await this.driver.wait(until.elementLocated(this.loginButton), config.timeouts.explicit);
  }

  async enterUsername(username) {
    const element = await this.driver.wait(
      until.elementLocated(this.usernameInput),
      config.timeouts.explicit
    );
    await element.clear();
    await element.sendKeys(username);
  }

  async enterPassword(password) {
    const element = await this.driver.wait(
      until.elementLocated(this.passwordInput),
      config.timeouts.explicit
    );
    await element.clear();
    await element.sendKeys(password);
  }

  async clickLogin() {
    const element = await this.driver.wait(
      until.elementLocated(this.loginButton),
      config.timeouts.explicit
    );
    await element.click();
  }

  async getErrorMessage() {
    const element = await this.driver.wait(
      until.elementLocated(this.errorMessage),
      config.timeouts.explicit
    );
    return await element.getText();
  }

  async isErrorMessageDisplayed() {
    try {
      const element = await this.driver.wait(
        until.elementLocated(this.errorMessage),
        config.timeouts.explicit
      );
      return await element.isDisplayed();
    } catch (error) {
      return false;
    }
  }

  async login(username, password) {
    await this.enterUsername(username);
    await this.enterPassword(password);
    await this.clickLogin();
  }

  async isUsernameFieldPresent() {
    try {
      const element = await this.driver.findElement(this.usernameInput);
      return await element.isDisplayed();
    } catch (error) {
      return false;
    }
  }

  async isPasswordFieldPresent() {
    try {
      const element = await this.driver.findElement(this.passwordInput);
      return await element.isDisplayed();
    } catch (error) {
      return false;
    }
  }

  async isLoginButtonPresent() {
    try {
      const element = await this.driver.findElement(this.loginButton);
      return await element.isDisplayed();
    } catch (error) {
      return false;
    }
  }

  async getPasswordFieldType() {
    const element = await this.driver.wait(
      until.elementLocated(this.passwordInput),
      config.timeouts.explicit
    );
    return await element.getAttribute('type');
  }

  async getCurrentUrl() {
    return await this.driver.getCurrentUrl();
  }
}

module.exports = LoginPage;