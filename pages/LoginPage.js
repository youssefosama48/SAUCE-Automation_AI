const { By, until } = require('selenium-webdriver');
const config = require('../config/test.config');

class LoginPage {
  constructor(driver) {
    this.driver = driver;
    this.timeout = config.timeout.explicit;
    
    this.locators = {
      usernameInput: By.id(config.pages.login_page.elements.username_input.locator),
      passwordInput: By.id(config.pages.login_page.elements.password_input.locator),
      loginButton: By.id(config.pages.login_page.elements.login_button.locator),
      errorMessage: By.css(config.pages.login_page.elements.error_message.locator)
    };
  }
  
  async navigate() {
    await this.driver.get(config.pages.login_page.url);
    await this.waitForPageLoad();
  }
  
  async waitForPageLoad() {
    await this.driver.wait(
      until.elementLocated(this.locators.usernameInput),
      this.timeout,
      'Login page did not load'
    );
  }
  
  async enterUsername(username) {
    const usernameField = await this.driver.wait(
      until.elementLocated(this.locators.usernameInput),
      this.timeout
    );
    await usernameField.clear();
    await usernameField.sendKeys(username);
  }
  
  async enterPassword(password) {
    const passwordField = await this.driver.wait(
      until.elementLocated(this.locators.passwordInput),
      this.timeout
    );
    await passwordField.clear();
    await passwordField.sendKeys(password);
  }
  
  async clickLoginButton() {
    const loginBtn = await this.driver.wait(
      until.elementLocated(this.locators.loginButton),
      this.timeout
    );
    await this.driver.wait(until.elementIsVisible(loginBtn), this.timeout);
    await loginBtn.click();
  }
  
  async login(username, password) {
    await this.enterUsername(username);
    await this.enterPassword(password);
    await this.clickLoginButton();
  }
  
  async getErrorMessage() {
    const errorElement = await this.driver.wait(
      until.elementLocated(this.locators.errorMessage),
      this.timeout
    );
    await this.driver.wait(until.elementIsVisible(errorElement), this.timeout);
    return await errorElement.getText();
  }
  
  async isErrorMessageDisplayed() {
    try {
      const errorElement = await this.driver.wait(
        until.elementLocated(this.locators.errorMessage),
        this.timeout
      );
      return await errorElement.isDisplayed();
    } catch (error) {
      return false;
    }
  }
  
  async getPasswordFieldType() {
    const passwordField = await this.driver.findElement(this.locators.passwordInput);
    return await passwordField.getAttribute('type');
  }
  
  async isLoginButtonEnabled() {
    const loginBtn = await this.driver.findElement(this.locators.loginButton);
    return await loginBtn.isEnabled();
  }
  
  async getPasswordFieldValue() {
    const passwordField = await this.driver.findElement(this.locators.passwordInput);
    return await passwordField.getAttribute('value');
  }
  
  async clearUsername() {
    const usernameField = await this.driver.findElement(this.locators.usernameInput);
    await usernameField.clear();
  }
  
  async clearPassword() {
    const passwordField = await this.driver.findElement(this.locators.passwordInput);
    await passwordField.clear();
  }
}

module.exports = LoginPage;