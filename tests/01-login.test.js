const { until, By } = require("selenium-webdriver");
const { login, logout, runSuite, SELECTORS, BASE_URL } = require("../helpers/driver");

const tests = [
  {
    name: "TC-001 (SAUC-T126): Successful login with valid credentials",
    expected: "User is redirected to inventory page and products are displayed",
    fn: async (driver) => {
      await driver.get(BASE_URL);
      await driver.wait(until.elementLocated(SELECTORS.login.username), 10000);
      await driver.findElement(SELECTORS.login.username).sendKeys("standard_user");
      await driver.findElement(SELECTORS.login.password).sendKeys("secret_sauce");
      await driver.findElement(SELECTORS.login.loginBtn).click();
      await driver.wait(until.urlContains("/inventory.html"), 8000);
      const url = await driver.getCurrentUrl();
      const inventoryItems = await driver.findElements(SELECTORS.inventory.item);
      const itemCount = inventoryItems.length;
      if (!url.includes("/inventory.html")) {
        throw new Error("Not redirected to inventory page");
      }
      if (itemCount === 0) {
        throw new Error("No products displayed");
      }
      return {
        expectedResult: "User is redirected to inventory page and products are displayed",
        actualResult: "Redirected to: " + url + ", Products displayed: " + itemCount
      };
    }
  },

  {
    name: "TC-002 (SAUC-T127): Login fails with empty username",
    expected: "Error message 'Epic sadface: Username is required' is displayed",
    fn: async (driver) => {
      await driver.get(BASE_URL);
      await driver.wait(until.elementLocated(SELECTORS.login.password), 10000);
      await driver.findElement(SELECTORS.login.password).sendKeys("secret_sauce");
      await driver.findElement(SELECTORS.login.loginBtn).click();
      const errorEl = await driver.wait(until.elementLocated(SELECTORS.login.errorMsg), 8000);
      const errorText = await errorEl.getText();
      if (!errorText.includes("Username is required")) {
        throw new Error("Expected username required error, got: " + errorText);
      }
      return {
        expectedResult: "Error message 'Epic sadface: Username is required' is displayed",
        actualResult: "Error displayed: " + errorText
      };
    }
  },

  {
    name: "TC-003 (SAUC-T128): Login fails with empty password",
    expected: "Error message 'Epic sadface: Password is required' is displayed",
    fn: async (driver) => {
      await driver.get(BASE_URL);
      await driver.wait(until.elementLocated(SELECTORS.login.username), 10000);
      await driver.findElement(SELECTORS.login.username).sendKeys("standard_user");
      await driver.findElement(SELECTORS.login.loginBtn).click();
      const errorEl = await driver.wait(until.elementLocated(SELECTORS.login.errorMsg), 8000);
      const errorText = await errorEl.getText();
      if (!errorText.includes("Password is required")) {
        throw new Error("Expected password required error, got: " + errorText);
      }
      return {
        expectedResult: "Error message 'Epic sadface: Password is required' is displayed",
        actualResult: "Error displayed: " + errorText
      };
    }
  },

  {
    name: "TC-004 (SAUC-T129): Login fails with both fields empty",
    expected: "Error message 'Epic sadface: Username is required' is displayed",
    fn: async (driver) => {
      await driver.get(BASE_URL);
      await driver.wait(until.elementLocated(SELECTORS.login.loginBtn), 10000);
      await driver.findElement(SELECTORS.login.loginBtn).click();
      const errorEl = await driver.wait(until.elementLocated(SELECTORS.login.errorMsg), 8000);
      const errorText = await errorEl.getText();
      if (!errorText.includes("Username is required")) {
        throw new Error("Expected username required error, got: " + errorText);
      }
      return {
        expectedResult: "Error message 'Epic sadface: Username is required' is displayed",
        actualResult: "Error displayed: " + errorText
      };
    }
  },

  {
    name: "TC-005 (SAUC-T130): Login fails with invalid username",
    expected: "Error message 'Epic sadface: Username and password do not match any user in this service' is displayed",
    fn: async (driver) => {
      await driver.get(BASE_URL);
      await driver.wait(until.elementLocated(SELECTORS.login.username), 10000);
      await driver.findElement(SELECTORS.login.username).sendKeys("invalid_user");
      await driver.findElement(SELECTORS.login.password).sendKeys("secret_sauce");
      await driver.findElement(SELECTORS.login.loginBtn).click();
      const errorEl = await driver.wait(until.elementLocated(SELECTORS.login.errorMsg), 8000);
      const errorText = await errorEl.getText();
      if (!errorText.includes("Username and password do not match")) {
        throw new Error("Expected mismatch error, got: " + errorText);
      }
      return {
        expectedResult: "Error message 'Epic sadface: Username and password do not match any user in this service' is displayed",
        actualResult: "Error displayed: " + errorText
      };
    }
  },

  {
    name: "TC-006 (SAUC-T131): Login fails with incorrect password",
    expected: "Error message 'Epic sadface: Username and password do not match any user in this service' is displayed",
    fn: async (driver) => {
      await driver.get(BASE_URL);
      await driver.wait(until.elementLocated(SELECTORS.login.username), 10000);
      await driver.findElement(SELECTORS.login.username).sendKeys("standard_user");
      await driver.findElement(SELECTORS.login.password).sendKeys("wrong_password");
      await driver.findElement(SELECTORS.login.loginBtn).click();
      const errorEl = await driver.wait(until.elementLocated(SELECTORS.login.errorMsg), 8000);
      const errorText = await errorEl.getText();
      if (!errorText.includes("Username and password do not match")) {
        throw new Error("Expected mismatch error, got: " + errorText);
      }
      return {
        expectedResult: "Error message 'Epic sadface: Username and password do not match any user in this service' is displayed",
        actualResult: "Error displayed: " + errorText
      };
    }
  },

  {
    name: "TC-007 (SAUC-T132): Login fails with locked out user",
    expected: "Error message 'Epic sadface: Sorry, this user has been locked out' is displayed",
    fn: async (driver) => {
      await driver.get(BASE_URL);
      await driver.wait(until.elementLocated(SELECTORS.login.username), 10000);
      await driver.findElement(SELECTORS.login.username).sendKeys("locked_out_user");
      await driver.findElement(SELECTORS.login.password).sendKeys("secret_sauce");
      await driver.findElement(SELECTORS.login.loginBtn).click();
      const errorEl = await driver.wait(until.elementLocated(SELECTORS.login.errorMsg), 8000);
      const errorText = await errorEl.getText();
      if (!errorText.includes("this user has been locked out")) {
        throw new Error("Expected locked out error, got: " + errorText);
      }
      return {
        expectedResult: "Error message 'Epic sadface: Sorry, this user has been locked out' is displayed",
        actualResult: "Error displayed: " + errorText
      };
    }
  },

  {
    name: "TC-008 (SAUC-T133): Verify login with special characters in credentials",
    expected: "Error message indicating invalid credentials is displayed",
    fn: async (driver) => {
      await driver.get(BASE_URL);
      await driver.wait(until.elementLocated(SELECTORS.login.username), 10000);
      await driver.findElement(SELECTORS.login.username).sendKeys("user@#$%");
      await driver.findElement(SELECTORS.login.password).sendKeys("pass@#$%");
      await driver.findElement(SELECTORS.login.loginBtn).click();
      const errorEl = await driver.wait(until.elementLocated(SELECTORS.login.errorMsg), 8000);
      const errorText = await errorEl.getText();
      if (!errorText.includes("Username and password do not match")) {
        throw new Error("Expected invalid credentials error, got: " + errorText);
      }
      return {
        expectedResult: "Error message indicating invalid credentials is displayed",
        actualResult: "Error displayed: " + errorText
      };
    }
  }
];

runSuite("Login Tests", tests);
