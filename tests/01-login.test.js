const { until, By } = require("selenium-webdriver");
const { login, logout, runSuite, SELECTORS, BASE_URL } = require("../helpers/driver");

const tests = [
  {
    name: "TC-001: Successful login with valid credentials",
    expected: "User is redirected to /inventory.html and shopping cart is visible",
    fn: async (driver) => {
      await driver.get(BASE_URL);
      await driver.wait(until.elementLocated(SELECTORS.login.username), 10000);
      await driver.findElement(SELECTORS.login.username).sendKeys("standard_user");
      await driver.findElement(SELECTORS.login.password).sendKeys("secret_sauce");
      await driver.findElement(SELECTORS.login.loginBtn).click();
      await driver.wait(until.urlContains("/inventory.html"), 8000);
      const url = await driver.getCurrentUrl();
      const cartIcon = await driver.wait(until.elementLocated(SELECTORS.header.cart), 8000);
      const cartVisible = await cartIcon.isDisplayed();
      if (!cartVisible) throw new Error("Shopping cart icon not visible");
      return {
        expectedResult: "User is redirected to /inventory.html and shopping cart is visible",
        actualResult: "Redirected to: " + url + ", cart visible: " + cartVisible
      };
    }
  },

  {
    name: "TC-002: Login with invalid username",
    expected: "Error message displayed: Username and password do not match",
    fn: async (driver) => {
      await driver.get(BASE_URL);
      await driver.wait(until.elementLocated(SELECTORS.login.username), 10000);
      await driver.findElement(SELECTORS.login.username).sendKeys("invalid_user123");
      await driver.findElement(SELECTORS.login.password).sendKeys("secret_sauce");
      await driver.findElement(SELECTORS.login.loginBtn).click();
      const errorEl = await driver.wait(until.elementLocated(SELECTORS.login.errorMsg), 8000);
      const text = await errorEl.getText();
      if (!text.includes("Username and password do not match")) throw new Error("Unexpected error: " + text);
      return {
        expectedResult: "Error message displayed: Username and password do not match",
        actualResult: "Error shown: " + text
      };
    }
  },

  {
    name: "TC-003: Login with invalid password",
    expected: "Error message displayed: Username and password do not match",
    fn: async (driver) => {
      await driver.get(BASE_URL);
      await driver.wait(until.elementLocated(SELECTORS.login.username), 10000);
      await driver.findElement(SELECTORS.login.username).sendKeys("standard_user");
      await driver.findElement(SELECTORS.login.password).sendKeys("wrong_password");
      await driver.findElement(SELECTORS.login.loginBtn).click();
      const errorEl = await driver.wait(until.elementLocated(SELECTORS.login.errorMsg), 8000);
      const text = await errorEl.getText();
      if (!text.includes("Username and password do not match")) throw new Error("Unexpected error: " + text);
      return {
        expectedResult: "Error message displayed: Username and password do not match",
        actualResult: "Error shown: " + text
      };
    }
  },

  {
    name: "TC-004: Login with empty username field",
    expected: "Error message: Username is required",
    fn: async (driver) => {
      await driver.get(BASE_URL);
      await driver.wait(until.elementLocated(SELECTORS.login.password), 10000);
      await driver.findElement(SELECTORS.login.password).sendKeys("secret_sauce");
      await driver.findElement(SELECTORS.login.loginBtn).click();
      const errorEl = await driver.wait(until.elementLocated(SELECTORS.login.errorMsg), 8000);
      const text = await errorEl.getText();
      if (!text.includes("Username is required")) throw new Error("Unexpected error: " + text);
      return {
        expectedResult: "Error message: Username is required",
        actualResult: "Error shown: " + text
      };
    }
  },

  {
    name: "TC-005: Login with empty password field",
    expected: "Error message: Password is required",
    fn: async (driver) => {
      await driver.get(BASE_URL);
      await driver.wait(until.elementLocated(SELECTORS.login.username), 10000);
      await driver.findElement(SELECTORS.login.username).sendKeys("standard_user");
      await driver.findElement(SELECTORS.login.loginBtn).click();
      const errorEl = await driver.wait(until.elementLocated(SELECTORS.login.errorMsg), 8000);
      const text = await errorEl.getText();
      if (!text.includes("Password is required")) throw new Error("Unexpected error: " + text);
      return {
        expectedResult: "Error message: Password is required",
        actualResult: "Error shown: " + text
      };
    }
  },

  {
    name: "TC-006: Login with both fields empty",
    expected: "Error message: Username is required",
    fn: async (driver) => {
      await driver.get(BASE_URL);
      await driver.wait(until.elementLocated(SELECTORS.login.loginBtn), 10000);
      await driver.findElement(SELECTORS.login.loginBtn).click();
      const errorEl = await driver.wait(until.elementLocated(SELECTORS.login.errorMsg), 8000);
      const text = await errorEl.getText();
      if (!text.includes("Username is required")) throw new Error("Unexpected error: " + text);
      return {
        expectedResult: "Error message: Username is required",
        actualResult: "Error shown: " + text
      };
    }
  },

  {
    name: "TC-007: Login with locked out user",
    expected: "Error message: User has been locked out",
    fn: async (driver) => {
      await driver.get(BASE_URL);
      await driver.wait(until.elementLocated(SELECTORS.login.username), 10000);
      await driver.findElement(SELECTORS.login.username).sendKeys("locked_out_user");
      await driver.findElement(SELECTORS.login.password).sendKeys("secret_sauce");
      await driver.findElement(SELECTORS.login.loginBtn).click();
      const errorEl = await driver.wait(until.elementLocated(SELECTORS.login.errorMsg), 8000);
      const text = await errorEl.getText();
      if (!text.includes("locked out")) throw new Error("Unexpected error: " + text);
      return {
        expectedResult: "Error message: User has been locked out",
        actualResult: "Error shown: " + text
      };
    }
  },

  {
    name: "TC-008: Login with special characters in credentials",
    expected: "Error message displayed without system errors",
    fn: async (driver) => {
      await driver.get(BASE_URL);
      await driver.wait(until.elementLocated(SELECTORS.login.username), 10000);
      await driver.findElement(SELECTORS.login.username).sendKeys("user@#$%");
      await driver.findElement(SELECTORS.login.password).sendKeys("pass!@#$%^&*()");
      await driver.findElement(SELECTORS.login.loginBtn).click();
      const errorEl = await driver.wait(until.elementLocated(SELECTORS.login.errorMsg), 8000);
      const text = await errorEl.getText();
      const hasValidError = text.includes("Username and password do not match") || text.includes("Epic sadface");
      if (!hasValidError) throw new Error("Unexpected error format: " + text);
      return {
        expectedResult: "Error message displayed without system errors",
        actualResult: "Error handled gracefully: " + text
      };
    }
  }
];

runSuite("Login Tests", tests);