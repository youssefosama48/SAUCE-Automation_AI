const { until, By } = require("selenium-webdriver");
const { login, logout, runSuite, BASE_URL } = require("../helpers/driver");

const tests = [
  {
    name: "Successful login with valid credentials",
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
        actualResult: "Redirected to: " + url + ", inventory displayed: " + isDisplayed,
      };
    },
  },
  {
    name: "Login fails with invalid username",
    expected: "Error message is displayed: Username and password do not match",
    fn: async (driver) => {
      await driver.get(BASE_URL);
      await driver.wait(until.elementLocated(By.id("user-name")), 10000);
      await driver.findElement(By.id("user-name")).sendKeys("invalid_user");
      await driver.findElement(By.id("password")).sendKeys("secret_sauce");
      await driver.findElement(By.id("login-button")).click();
      await driver.wait(until.elementLocated(By.css("[data-test='error']")), 5000);
      const errorElement = await driver.findElement(By.css("[data-test='error']"));
      const errorText = await errorElement.getText();
      return {
        expectedResult: "Error message displayed about username and password mismatch",
        actualResult: "Error message: " + errorText,
      };
    },
  },
  {
    name: "Login fails with incorrect password",
    expected: "Error message is displayed: Username and password do not match",
    fn: async (driver) => {
      await driver.get(BASE_URL);
      await driver.wait(until.elementLocated(By.id("user-name")), 10000);
      await driver.findElement(By.id("user-name")).sendKeys("standard_user");
      await driver.findElement(By.id("password")).sendKeys("wrong_password");
      await driver.findElement(By.id("login-button")).click();
      await driver.wait(until.elementLocated(By.css("[data-test='error']")), 5000);
      const errorElement = await driver.findElement(By.css("[data-test='error']"));
      const errorText = await errorElement.getText();
      return {
        expectedResult: "Error message displayed about username and password mismatch",
        actualResult: "Error message: " + errorText,
      };
    },
  },
  {
    name: "Login fails with empty username field",
    expected: "Error message is displayed: Username is required",
    fn: async (driver) => {
      await driver.get(BASE_URL);
      await driver.wait(until.elementLocated(By.id("user-name")), 10000);
      await driver.findElement(By.id("password")).sendKeys("secret_sauce");
      await driver.findElement(By.id("login-button")).click();
      await driver.wait(until.elementLocated(By.css("[data-test='error']")), 5000);
      const errorElement = await driver.findElement(By.css("[data-test='error']"));
      const errorText = await errorElement.getText();
      return {
        expectedResult: "Error message displayed: Username is required",
        actualResult: "Error message: " + errorText,
      };
    },
  },
  {
    name: "Login fails with empty password field",
    expected: "Error message is displayed: Password is required",
    fn: async (driver) => {
      await driver.get(BASE_URL);
      await driver.wait(until.elementLocated(By.id("user-name")), 10000);
      await driver.findElement(By.id("user-name")).sendKeys("standard_user");
      await driver.findElement(By.id("login-button")).click();
      await driver.wait(until.elementLocated(By.css("[data-test='error']")), 5000);
      const errorElement = await driver.findElement(By.css("[data-test='error']"));
      const errorText = await errorElement.getText();
      return {
        expectedResult: "Error message displayed: Password is required",
        actualResult: "Error message: " + errorText,
      };
    },
  },
  {
    name: "Login fails with both fields empty",
    expected: "Error message is displayed: Username is required",
    fn: async (driver) => {
      await driver.get(BASE_URL);
      await driver.wait(until.elementLocated(By.id("user-name")), 10000);
      await driver.findElement(By.id("login-button")).click();
      await driver.wait(until.elementLocated(By.css("[data-test='error']")), 5000);
      const errorElement = await driver.findElement(By.css("[data-test='error']"));
      const errorText = await errorElement.getText();
      return {
        expectedResult: "Error message displayed: Username is required",
        actualResult: "Error message: " + errorText,
      };
    },
  },
  {
    name: "Login fails with locked out user",
    expected: "Error message is displayed: User has been locked out",
    fn: async (driver) => {
      await driver.get(BASE_URL);
      await driver.wait(until.elementLocated(By.id("user-name")), 10000);
      await driver.findElement(By.id("user-name")).sendKeys("locked_out_user");
      await driver.findElement(By.id("password")).sendKeys("secret_sauce");
      await driver.findElement(By.id("login-button")).click();
      await driver.wait(until.elementLocated(By.css("[data-test='error']")), 5000);
      const errorElement = await driver.findElement(By.css("[data-test='error']"));
      const errorText = await errorElement.getText();
      return {
        expectedResult: "Error message displayed: User has been locked out",
        actualResult: "Error message: " + errorText,
      };
    },
  },
];

runSuite("Login Tests", tests);
