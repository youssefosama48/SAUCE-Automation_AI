const { until, By } = require("selenium-webdriver");
const { login, logout, runSuite, BASE_URL } = require("../helpers/driver");

const tests = [
  {
    name: "TC-001: Successful login with valid credentials",
    expected: "User is redirected to inventory page and products are displayed",
    fn: async (driver) => {
      await driver.get(BASE_URL);
      await driver.wait(until.elementLocated(By.id("user-name")), 10000);
      await driver.findElement(By.id("user-name")).sendKeys("standard_user");
      await driver.findElement(By.id("password")).sendKeys("secret_sauce");
      await driver.findElement(By.id("login-button")).click();
      await driver.wait(until.urlContains("/inventory.html"), 8000);
      const url = await driver.getCurrentUrl();
      const inventoryContainer = await driver.findElement(By.css(".inventory_container"));
      const isDisplayed = await inventoryContainer.isDisplayed();
      return {
        expectedResult: "User is redirected to inventory page and products are displayed",
        actualResult: "Redirected to: " + url + ", Inventory displayed: " + isDisplayed,
      };
    },
  },
  {
    name: "TC-002: Login fails with invalid username",
    expected: "Error message is displayed: Username and password do not match any user",
    fn: async (driver) => {
      await driver.get(BASE_URL);
      await driver.wait(until.elementLocated(By.id("user-name")), 10000);
      await driver.findElement(By.id("user-name")).sendKeys("invalid_user");
      await driver.findElement(By.id("password")).sendKeys("secret_sauce");
      await driver.findElement(By.id("login-button")).click();
      await driver.wait(until.elementLocated(By.css("[data-test='error']")), 5000);
      const errorMessage = await driver.findElement(By.css("[data-test='error']")).getText();
      return {
        expectedResult: "Error message contains: Username and password do not match",
        actualResult: "Error message: " + errorMessage,
      };
    },
  },
  {
    name: "TC-003: Login fails with invalid password",
    expected: "Error message is displayed: Username and password do not match any user",
    fn: async (driver) => {
      await driver.get(BASE_URL);
      await driver.wait(until.elementLocated(By.id("user-name")), 10000);
      await driver.findElement(By.id("user-name")).sendKeys("standard_user");
      await driver.findElement(By.id("password")).sendKeys("wrong_password");
      await driver.findElement(By.id("login-button")).click();
      await driver.wait(until.elementLocated(By.css("[data-test='error']")), 5000);
      const errorMessage = await driver.findElement(By.css("[data-test='error']")).getText();
      return {
        expectedResult: "Error message contains: Username and password do not match",
        actualResult: "Error message: " + errorMessage,
      };
    },
  },
  {
    name: "TC-004: Login fails with empty username field",
    expected: "Error message is displayed: Username is required",
    fn: async (driver) => {
      await driver.get(BASE_URL);
      await driver.wait(until.elementLocated(By.id("user-name")), 10000);
      await driver.findElement(By.id("password")).sendKeys("secret_sauce");
      await driver.findElement(By.id("login-button")).click();
      await driver.wait(until.elementLocated(By.css("[data-test='error']")), 5000);
      const errorMessage = await driver.findElement(By.css("[data-test='error']")).getText();
      return {
        expectedResult: "Error message contains: Username is required",
        actualResult: "Error message: " + errorMessage,
      };
    },
  },
  {
    name: "TC-005: Login fails with empty password field",
    expected: "Error message is displayed: Password is required",
    fn: async (driver) => {
      await driver.get(BASE_URL);
      await driver.wait(until.elementLocated(By.id("user-name")), 10000);
      await driver.findElement(By.id("user-name")).sendKeys("standard_user");
      await driver.findElement(By.id("login-button")).click();
      await driver.wait(until.elementLocated(By.css("[data-test='error']")), 5000);
      const errorMessage = await driver.findElement(By.css("[data-test='error']")).getText();
      return {
        expectedResult: "Error message contains: Password is required",
        actualResult: "Error message: " + errorMessage,
      };
    },
  },
  {
    name: "TC-006: Login fails with both fields empty",
    expected: "Error message is displayed: Username is required",
    fn: async (driver) => {
      await driver.get(BASE_URL);
      await driver.wait(until.elementLocated(By.id("user-name")), 10000);
      await driver.findElement(By.id("login-button")).click();
      await driver.wait(until.elementLocated(By.css("[data-test='error']")), 5000);
      const errorMessage = await driver.findElement(By.css("[data-test='error']")).getText();
      return {
        expectedResult: "Error message contains: Username is required",
        actualResult: "Error message: " + errorMessage,
      };
    },
  },
  {
    name: "TC-007: Login with locked out user",
    expected: "Error message is displayed: Sorry, this user has been locked out",
    fn: async (driver) => {
      await driver.get(BASE_URL);
      await driver.wait(until.elementLocated(By.id("user-name")), 10000);
      await driver.findElement(By.id("user-name")).sendKeys("locked_out_user");
      await driver.findElement(By.id("password")).sendKeys("secret_sauce");
      await driver.findElement(By.id("login-button")).click();
      await driver.wait(until.elementLocated(By.css("[data-test='error']")), 5000);
      const errorMessage = await driver.findElement(By.css("[data-test='error']")).getText();
      return {
        expectedResult: "Error message contains: this user has been locked out",
        actualResult: "Error message: " + errorMessage,
      };
    },
  },
  {
    name: "TC-008: Verify login page elements are present",
    expected: "All required elements are present on the login page",
    fn: async (driver) => {
      await driver.get(BASE_URL);
      await driver.wait(until.elementLocated(By.id("user-name")), 10000);
      const usernameField = await driver.findElement(By.id("user-name"));
      const passwordField = await driver.findElement(By.id("password"));
      const loginButton = await driver.findElement(By.id("login-button"));
      const loginLogo = await driver.findElement(By.css(".login_logo"));
      const usernameDisplayed = await usernameField.isDisplayed();
      const passwordDisplayed = await passwordField.isDisplayed();
      const loginButtonDisplayed = await loginButton.isDisplayed();
      const logoDisplayed = await loginLogo.isDisplayed();
      const usernameEnabled = await usernameField.isEnabled();
      const passwordEnabled = await passwordField.isEnabled();
      const loginButtonEnabled = await loginButton.isEnabled();
      return {
        expectedResult: "Username field, password field, login button, and logo are all visible and enabled",
        actualResult: "Username visible: " + usernameDisplayed + ", enabled: " + usernameEnabled + ", Password visible: " + passwordDisplayed + ", enabled: " + passwordEnabled + ", Login button visible: " + loginButtonDisplayed + ", enabled: " + loginButtonEnabled + ", Logo visible: " + logoDisplayed,
      };
    },
  },
];

runSuite("Login Tests", tests);