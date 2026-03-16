const { until, By } = require("selenium-webdriver");
const { login, logout, runSuite, BASE_URL } = require("../helpers/driver");

const tests = [
  {
    name: "Verify login page elements are displayed",
    expected: "All login page elements are visible and enabled",
    fn: async (driver) => {
      await driver.get(BASE_URL);
      await driver.wait(until.elementLocated(By.id("user-name")), 10000);
      const usernameField = await driver.findElement(By.id("user-name"));
      const passwordField = await driver.findElement(By.id("password"));
      const loginButton = await driver.findElement(By.id("login-button"));
      const loginLogo = await driver.findElement(By.css(".login_logo"));
      const usernameDisplayed = await usernameField.isDisplayed();
      const usernameEnabled = await usernameField.isEnabled();
      const passwordDisplayed = await passwordField.isDisplayed();
      const passwordEnabled = await passwordField.isEnabled();
      const loginButtonDisplayed = await loginButton.isDisplayed();
      const loginButtonEnabled = await loginButton.isEnabled();
      const logoDisplayed = await loginLogo.isDisplayed();
      return {
        expectedResult: "Username field, password field, login button, and logo are all visible and enabled",
        actualResult: "Username visible: " + usernameDisplayed + ", enabled: " + usernameEnabled + ", Password visible: " + passwordDisplayed + ", enabled: " + passwordEnabled + ", Login button visible: " + loginButtonDisplayed + ", enabled: " + loginButtonEnabled + ", Logo visible: " + logoDisplayed,
      };
    },
  },
];

runSuite("UI Elements Tests", tests);
