const { until } = require("selenium-webdriver");
const { login, logout, runSuite, SELECTORS, BASE_URL } = require("../helpers/driver");

const tests = [
  {
    name: "TC-002: Invalid login with wrong password",
    expected: "Error message is displayed containing mismatch text",
    fn: async (driver) => {
      await driver.get(BASE_URL);
      
      const usernameField = await driver.wait(
        until.elementLocated(SELECTORS.login.username),
        5000
      );
      await usernameField.sendKeys("standard_user");
      
      const passwordField = await driver.findElement(SELECTORS.login.password);
      await passwordField.sendKeys("wrong_password");
      
      const loginBtn = await driver.findElement(SELECTORS.login.loginBtn);
      await loginBtn.click();
      
      const errorMsg = await driver.wait(
        until.elementLocated(SELECTORS.login.errorMsg),
        5000
      );
      const errorText = await errorMsg.getText();
      
      return {
        expectedResult: "Error message is displayed containing mismatch text",
        actualResult: "Error message displayed: " + errorText,
      };
    },
  },
  {
    name: "TC-003: Invalid login with unregistered username",
    expected: "Error message is displayed for unregistered user",
    fn: async (driver) => {
      await driver.get(BASE_URL);
      
      const usernameField = await driver.wait(
        until.elementLocated(SELECTORS.login.username),
        5000
      );
      await usernameField.sendKeys("unregistered_user");
      
      const passwordField = await driver.findElement(SELECTORS.login.password);
      await passwordField.sendKeys("any_password");
      
      const loginBtn = await driver.findElement(SELECTORS.login.loginBtn);
      await loginBtn.click();
      
      const errorMsg = await driver.wait(
        until.elementLocated(SELECTORS.login.errorMsg),
        5000
      );
      const errorText = await errorMsg.getText();
      
      return {
        expectedResult: "Error message is displayed for unregistered user",
        actualResult: "Error message displayed: " + errorText,
      };
    },
  },
  {
    name: "TC-004: Login with empty username",
    expected: "Error message shown for empty username - Username is required",
    fn: async (driver) => {
      await driver.get(BASE_URL);
      
      const passwordField = await driver.wait(
        until.elementLocated(SELECTORS.login.password),
        5000
      );
      await passwordField.sendKeys("secret_sauce");
      
      const loginBtn = await driver.findElement(SELECTORS.login.loginBtn);
      await loginBtn.click();
      
      const errorMsg = await driver.wait(
        until.elementLocated(SELECTORS.login.errorMsg),
        5000
      );
      const errorText = await errorMsg.getText();
      
      return {
        expectedResult: "Error message shown for empty username - Username is required",
        actualResult: "Error message displayed: " + errorText,
      };
    },
  },
  {
    name: "TC-005: Login with empty password",
    expected: "Error message shown for empty password - Password is required",
    fn: async (driver) => {
      await driver.get(BASE_URL);
      
      const usernameField = await driver.wait(
        until.elementLocated(SELECTORS.login.username),
        5000
      );
      await usernameField.sendKeys("standard_user");
      
      const loginBtn = await driver.findElement(SELECTORS.login.loginBtn);
      await loginBtn.click();
      
      const errorMsg = await driver.wait(
        until.elementLocated(SELECTORS.login.errorMsg),
        5000
      );
      const errorText = await errorMsg.getText();
      
      return {
        expectedResult: "Error message shown for empty password - Password is required",
        actualResult: "Error message displayed: " + errorText,
      };
    },
  },
  {
    name: "TC-007: Login with both fields empty",
    expected: "Error message indicates missing fields - Username is required",
    fn: async (driver) => {
      await driver.get(BASE_URL);
      
      const loginBtn = await driver.wait(
        until.elementLocated(SELECTORS.login.loginBtn),
        5000
      );
      await loginBtn.click();
      
      const errorMsg = await driver.wait(
        until.elementLocated(SELECTORS.login.errorMsg),
        5000
      );
      const errorText = await errorMsg.getText();
      
      return {
        expectedResult: "Error message indicates missing fields - Username is required",
        actualResult: "Error message displayed: " + errorText,
      };
    },
  },
  {
    name: "TC-008: Valid login with locked out user",
    expected: "Error message indicates user is locked - Sorry, this user has been locked out",
    fn: async (driver) => {
      await driver.get(BASE_URL);
      
      const usernameField = await driver.wait(
        until.elementLocated(SELECTORS.login.username),
        5000
      );
      await usernameField.sendKeys("locked_out_user");
      
      const passwordField = await driver.findElement(SELECTORS.login.password);
      await passwordField.sendKeys("secret_sauce");
      
      const loginBtn = await driver.findElement(SELECTORS.login.loginBtn);
      await loginBtn.click();
      
      const errorMsg = await driver.wait(
        until.elementLocated(SELECTORS.login.errorMsg),
        5000
      );
      const errorText = await errorMsg.getText();
      
      return {
        expectedResult: "Error message indicates user is locked - Sorry, this user has been locked out",
        actualResult: "Error message displayed: " + errorText,
      };
    },
  },
];

runSuite("Invalid Login", tests);