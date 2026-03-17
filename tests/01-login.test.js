const { until, By } = require("selenium-webdriver");
const { login, logout, runSuite, BASE_URL } = require("../helpers/driver");

const tests = [
  {
    name: "Successful login with valid credentials",
    expected: "User is redirected to inventory page",
    fn: async (driver) => {
      await driver.get(BASE_URL);
      await driver.wait(until.elementLocated(By.id("user-name")), 10000);
      await driver.findElement(By.id("user-name")).sendKeys("standard_user");
      await driver.findElement(By.id("password")).sendKeys("secret_sauce");
      await driver.findElement(By.id("login-button")).click();
      await driver.wait(until.urlContains("/inventory.html"), 8000);
      const url = await driver.getCurrentUrl();
      return {
        expectedResult: "User is redirected to inventory page at https://www.saucedemo.com/inventory.html",
        actualResult: "Redirected to: " + url,
      };
    },
  },
  {
    name: "Login failure with invalid username",
    expected: "Error message is displayed for invalid username",
    fn: async (driver) => {
      await driver.get(BASE_URL);
      await driver.wait(until.elementLocated(By.id("user-name")), 10000);
      await driver.findElement(By.id("user-name")).sendKeys("invalid_user");
      await driver.findElement(By.id("password")).sendKeys("secret_sauce");
      await driver.findElement(By.id("login-button")).click();
      await driver.wait(until.elementLocated(By.css("[data-test='error']")), 5000);
      const errorMessage = await driver.findElement(By.css("[data-test='error']")).getText();
      return {
        expectedResult: "Error message is displayed: Username and password do not match any user in this service",
        actualResult: "Error message: " + errorMessage,
      };
    },
  },
  {
    name: "Login failure with invalid password",
    expected: "Error message is displayed for invalid password",
    fn: async (driver) => {
      await driver.get(BASE_URL);
      await driver.wait(until.elementLocated(By.id("user-name")), 10000);
      await driver.findElement(By.id("user-name")).sendKeys("standard_user");
      await driver.findElement(By.id("password")).sendKeys("wrong_password");
      await driver.findElement(By.id("login-button")).click();
      await driver.wait(until.elementLocated(By.css("[data-test='error']")), 5000);
      const errorMessage = await driver.findElement(By.css("[data-test='error']")).getText();
      return {
        expectedResult: "Error message is displayed indicating authentication failure",
        actualResult: "Error message: " + errorMessage,
      };
    },
  },
  {
    name: "Login failure with empty credentials",
    expected: "Error message is displayed for empty username",
    fn: async (driver) => {
      await driver.get(BASE_URL);
      await driver.wait(until.elementLocated(By.id("user-name")), 10000);
      await driver.findElement(By.id("login-button")).click();
      await driver.wait(until.elementLocated(By.css("[data-test='error']")), 5000);
      const errorMessage = await driver.findElement(By.css("[data-test='error']")).getText();
      return {
        expectedResult: "Error message is displayed: Username is required",
        actualResult: "Error message: " + errorMessage,
      };
    },
  },
  {
    name: "Login failure with empty username",
    expected: "Error message is displayed for empty username",
    fn: async (driver) => {
      await driver.get(BASE_URL);
      await driver.wait(until.elementLocated(By.id("user-name")), 10000);
      await driver.findElement(By.id("password")).sendKeys("secret_sauce");
      await driver.findElement(By.id("login-button")).click();
      await driver.wait(until.elementLocated(By.css("[data-test='error']")), 5000);
      const errorMessage = await driver.findElement(By.css("[data-test='error']")).getText();
      return {
        expectedResult: "Error message is displayed: Username is required",
        actualResult: "Error message: " + errorMessage,
      };
    },
  },
  {
    name: "Login failure with empty password",
    expected: "Error message is displayed for empty password",
    fn: async (driver) => {
      await driver.get(BASE_URL);
      await driver.wait(until.elementLocated(By.id("user-name")), 10000);
      await driver.findElement(By.id("user-name")).sendKeys("standard_user");
      await driver.findElement(By.id("login-button")).click();
      await driver.wait(until.elementLocated(By.css("[data-test='error']")), 5000);
      const errorMessage = await driver.findElement(By.css("[data-test='error']")).getText();
      return {
        expectedResult: "Error message is displayed: Password is required",
        actualResult: "Error message: " + errorMessage,
      };
    },
  },
  {
    name: "Password field masking verification",
    expected: "Password field has type='password' attribute",
    fn: async (driver) => {
      await driver.get(BASE_URL);
      await driver.wait(until.elementLocated(By.id("password")), 10000);
      const passwordField = await driver.findElement(By.id("password"));
      await passwordField.sendKeys("secret_sauce");
      const fieldType = await passwordField.getAttribute("type");
      return {
        expectedResult: "Password field has type='password' attribute",
        actualResult: "Password field type: " + fieldType,
      };
    },
  },
  {
    name: "Login with locked out user",
    expected: "Error message is displayed for locked out user",
    fn: async (driver) => {
      await driver.get(BASE_URL);
      await driver.wait(until.elementLocated(By.id("user-name")), 10000);
      await driver.findElement(By.id("user-name")).sendKeys("locked_out_user");
      await driver.findElement(By.id("password")).sendKeys("secret_sauce");
      await driver.findElement(By.id("login-button")).click();
      await driver.wait(until.elementLocated(By.css("[data-test='error']")), 5000);
      const errorMessage = await driver.findElement(By.css("[data-test='error']")).getText();
      return {
        expectedResult: "Error message is displayed: Sorry, this user has been locked out",
        actualResult: "Error message: " + errorMessage,
      };
    },
  },
];

runSuite("Login Tests", tests);
