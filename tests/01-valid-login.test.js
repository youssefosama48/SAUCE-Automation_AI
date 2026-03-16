const { until } = require("selenium-webdriver");
const { login, logout, runSuite, SELECTORS, BASE_URL } = require("../helpers/driver");

const tests = [
  {
    name: "TC-001: Valid login with standard user",
    expected: "User is redirected to inventory page and URL contains inventory.html",
    fn: async (driver) => {
      await driver.get(BASE_URL);
      
      const usernameField = await driver.wait(
        until.elementLocated(SELECTORS.login.username),
        5000
      );
      await usernameField.sendKeys("standard_user");
      
      const passwordField = await driver.findElement(SELECTORS.login.password);
      await passwordField.sendKeys("secret_sauce");
      
      const loginBtn = await driver.findElement(SELECTORS.login.loginBtn);
      await loginBtn.click();
      
      await driver.wait(until.elementLocated(SELECTORS.inventory.container), 5000);
      
      const currentUrl = await driver.getCurrentUrl();
      const containsInventory = currentUrl.includes("inventory.html");
      
      return {
        expectedResult: "User is redirected to inventory page and URL contains inventory.html",
        actualResult: containsInventory
          ? "User successfully redirected to inventory page with URL: " + currentUrl
          : "Unexpected URL: " + currentUrl,
      };
    },
  },
];

runSuite("Valid Login", tests);