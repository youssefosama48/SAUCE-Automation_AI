const { until } = require("selenium-webdriver");
const { login, logout, runSuite, SELECTORS, BASE_URL } = require("../helpers/driver");

const tests = [
  {
    name: "TC-006: Password field masking verification",
    expected: "Password field has type password and characters are not visible",
    fn: async (driver) => {
      await driver.get(BASE_URL);
      
      const passwordField = await driver.wait(
        until.elementLocated(SELECTORS.login.password),
        5000
      );
      
      await passwordField.sendKeys("secret_sauce");
      
      const passwordType = await passwordField.getAttribute("type");
      const passwordValue = await passwordField.getAttribute("value");
      
      const isMasked = passwordType === "password";
      
      return {
        expectedResult: "Password field has type password and characters are not visible",
        actualResult: isMasked
          ? "Password field type is 'password' (masked) with value length: " + passwordValue.length
          : "Password field type is '" + passwordType + "' (not masked)",
      };
    },
  },
];

runSuite("Other", tests);