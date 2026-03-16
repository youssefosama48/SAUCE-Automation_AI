const { until, By } = require("selenium-webdriver");
const { login, logout, runSuite, BASE_URL } = require("../helpers/driver");

const tests = [
  {
    name: "TC-001: Successful login with valid credentials",
    expected: "User is redirected to inventory page with shopping cart visible",
    fn: async (driver) => {
      await driver.get(BASE_URL);
      await driver.wait(until.elementLocated(By.id("user-name")), 10000);
      await driver.findElement(By.id("user-name")).sendKeys("standard_user");
      await driver.findElement(By.id("password")).sendKeys("secret_sauce");
      await driver.findElement(By.id("login-button")).click();
      await driver.wait(until.urlContains("/inventory.html"), 8000);
      const url = await driver.getCurrentUrl();
      const cartVisible = await driver.findElement(By.css(".shopping_cart_link")).isDisplayed();
      const inventoryVisible = await driver.findElement(By.css(".inventory_container")).isDisplayed();
      return {
        expectedResult: "User is redirected to /inventory.html and cart icon is visible",
        actualResult: "URL: " + url + ", Cart visible: " + cartVisible + ", Inventory visible: " + inventoryVisible,
      };
    },
  },
  {
    name: "TC-002: Login fails with invalid password",
    expected: "Error message is displayed about username and password mismatch",
    fn: async (driver) => {
      await driver.get(BASE_URL);
      await driver.wait(until.elementLocated(By.id("user-name")), 10000);
      await driver.findElement(By.id("user-name")).sendKeys("standard_user");
      await driver.findElement(By.id("password")).sendKeys("wrong_password");
      await driver.findElement(By.id("login-button")).click();
      await driver.wait(until.elementLocated(By.css("[data-test='error']")), 5000);
      const errorText = await driver.findElement(By.css("[data-test='error']")).getText();
      const url = await driver.getCurrentUrl();
      return {
        expectedResult: "Error message contains 'Username and password do not match'",
        actualResult: "Error: " + errorText + ", URL: " + url,
      };
    },
  },
  {
    name: "TC-003: Login fails with invalid username",
    expected: "Error message is displayed about username and password mismatch",
    fn: async (driver) => {
      await driver.get(BASE_URL);
      await driver.wait(until.elementLocated(By.id("user-name")), 10000);
      await driver.findElement(By.id("user-name")).sendKeys("invalid_user_123");
      await driver.findElement(By.id("password")).sendKeys("secret_sauce");
      await driver.findElement(By.id("login-button")).click();
      await driver.wait(until.elementLocated(By.css("[data-test='error']")), 5000);
      const errorText = await driver.findElement(By.css("[data-test='error']")).getText();
      const url = await driver.getCurrentUrl();
      return {
        expectedResult: "Error message contains 'Username and password do not match'",
        actualResult: "Error: " + errorText + ", URL: " + url,
      };
    },
  },
  {
    name: "TC-004: Login fails with empty username field",
    expected: "Error message is displayed that Username is required",
    fn: async (driver) => {
      await driver.get(BASE_URL);
      await driver.wait(until.elementLocated(By.id("user-name")), 10000);
      await driver.findElement(By.id("password")).sendKeys("secret_sauce");
      await driver.findElement(By.id("login-button")).click();
      await driver.wait(until.elementLocated(By.css("[data-test='error']")), 5000);
      const errorText = await driver.findElement(By.css("[data-test='error']")).getText();
      const url = await driver.getCurrentUrl();
      return {
        expectedResult: "Error message contains 'Username is required'",
        actualResult: "Error: " + errorText + ", URL: " + url,
      };
    },
  },
  {
    name: "TC-005: Login fails with empty password field",
    expected: "Error message is displayed that Password is required",
    fn: async (driver) => {
      await driver.get(BASE_URL);
      await driver.wait(until.elementLocated(By.id("user-name")), 10000);
      await driver.findElement(By.id("user-name")).sendKeys("standard_user");
      await driver.findElement(By.id("login-button")).click();
      await driver.wait(until.elementLocated(By.css("[data-test='error']")), 5000);
      const errorText = await driver.findElement(By.css("[data-test='error']")).getText();
      const url = await driver.getCurrentUrl();
      return {
        expectedResult: "Error message contains 'Password is required'",
        actualResult: "Error: " + errorText + ", URL: " + url,
      };
    },
  },
  {
    name: "TC-006: Login fails with both fields empty",
    expected: "Error message is displayed that Username is required",
    fn: async (driver) => {
      await driver.get(BASE_URL);
      await driver.wait(until.elementLocated(By.id("user-name")), 10000);
      await driver.findElement(By.id("login-button")).click();
      await driver.wait(until.elementLocated(By.css("[data-test='error']")), 5000);
      const errorText = await driver.findElement(By.css("[data-test='error']")).getText();
      const url = await driver.getCurrentUrl();
      return {
        expectedResult: "Error message contains 'Username is required'",
        actualResult: "Error: " + errorText + ", URL: " + url,
      };
    },
  },
  {
    name: "TC-007: Login with locked out user",
    expected: "Error message is displayed that user has been locked out",
    fn: async (driver) => {
      await driver.get(BASE_URL);
      await driver.wait(until.elementLocated(By.id("user-name")), 10000);
      await driver.findElement(By.id("user-name")).sendKeys("locked_out_user");
      await driver.findElement(By.id("password")).sendKeys("secret_sauce");
      await driver.findElement(By.id("login-button")).click();
      await driver.wait(until.elementLocated(By.css("[data-test='error']")), 5000);
      const errorText = await driver.findElement(By.css("[data-test='error']")).getText();
      const url = await driver.getCurrentUrl();
      return {
        expectedResult: "Error message contains 'this user has been locked out'",
        actualResult: "Error: " + errorText + ", URL: " + url,
      };
    },
  },
  {
    name: "TC-008: Verify password field masking",
    expected: "Password field has type attribute set to password",
    fn: async (driver) => {
      await driver.get(BASE_URL);
      await driver.wait(until.elementLocated(By.id("password")), 10000);
      const passwordField = await driver.findElement(By.id("password"));
      await passwordField.sendKeys("secret_sauce");
      const fieldType = await passwordField.getAttribute("type");
      const fieldValue = await passwordField.getAttribute("value");
      return {
        expectedResult: "Password field type is 'password' to mask characters",
        actualResult: "Field type: " + fieldType + ", Value length: " + fieldValue.length,
      };
    },
  },
];

runSuite("Login Tests", tests);
