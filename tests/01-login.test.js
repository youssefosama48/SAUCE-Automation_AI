const { until } = require("selenium-webdriver");
const { login, logout, runSuite, SELECTORS, BASE_URL } = require("../helpers/driver");

const tests = [
  {
    name: "TC-001 (SAUC-T110): Successful login with valid credentials",
    expected: "User is redirected to inventory page and session is created",
    fn: async (driver) => {
      await driver.get(BASE_URL);
      await driver.wait(until.elementLocated(SELECTORS.login.username), 10000);
      
      const usernameField = await driver.findElement(SELECTORS.login.username);
      await usernameField.sendKeys("standard_user");
      
      const passwordField = await driver.findElement(SELECTORS.login.password);
      await passwordField.sendKeys("secret_sauce");
      
      const loginButton = await driver.findElement(SELECTORS.login.loginButton);
      await loginButton.click();
      
      await driver.wait(until.urlContains("/inventory.html"), 10000);
      const currentUrl = await driver.getCurrentUrl();
      
      const productsVisible = await driver.findElements(SELECTORS.inventory.inventoryItem);
      
      return {
        expectedResult: "User is on the inventory page with products displayed",
        actualResult: "Redirected to " + currentUrl + " with " + productsVisible.length + " products displayed"
      };
    }
  },
  {
    name: "TC-002 (SAUC-T111): Login fails with empty username",
    expected: "Error message is displayed: Username is required",
    fn: async (driver) => {
      await driver.get(BASE_URL);
      await driver.wait(until.elementLocated(SELECTORS.login.username), 10000);
      
      const passwordField = await driver.findElement(SELECTORS.login.password);
      await passwordField.sendKeys("secret_sauce");
      
      const loginButton = await driver.findElement(SELECTORS.login.loginButton);
      await loginButton.click();
      
      await driver.wait(until.elementLocated(SELECTORS.login.errorMessage), 10000);
      const errorElement = await driver.findElement(SELECTORS.login.errorMessage);
      const errorText = await errorElement.getText();
      
      return {
        expectedResult: "Error message is displayed: Username is required",
        actualResult: "Error message displayed: " + errorText
      };
    }
  },
  {
    name: "TC-003 (SAUC-T112): Login fails with empty password",
    expected: "Error message is displayed: Password is required",
    fn: async (driver) => {
      await driver.get(BASE_URL);
      await driver.wait(until.elementLocated(SELECTORS.login.username), 10000);
      
      const usernameField = await driver.findElement(SELECTORS.login.username);
      await usernameField.sendKeys("standard_user");
      
      const loginButton = await driver.findElement(SELECTORS.login.loginButton);
      await loginButton.click();
      
      await driver.wait(until.elementLocated(SELECTORS.login.errorMessage), 10000);
      const errorElement = await driver.findElement(SELECTORS.login.errorMessage);
      const errorText = await errorElement.getText();
      
      return {
        expectedResult: "Error message is displayed: Password is required",
        actualResult: "Error message displayed: " + errorText
      };
    }
  },
  {
    name: "TC-004 (SAUC-T113): Login fails with invalid username",
    expected: "Error message is displayed indicating invalid credentials",
    fn: async (driver) => {
      await driver.get(BASE_URL);
      await driver.wait(until.elementLocated(SELECTORS.login.username), 10000);
      
      const usernameField = await driver.findElement(SELECTORS.login.username);
      await usernameField.sendKeys("invalid_user_123");
      
      const passwordField = await driver.findElement(SELECTORS.login.password);
      await passwordField.sendKeys("secret_sauce");
      
      const loginButton = await driver.findElement(SELECTORS.login.loginButton);
      await loginButton.click();
      
      await driver.wait(until.elementLocated(SELECTORS.login.errorMessage), 10000);
      const errorElement = await driver.findElement(SELECTORS.login.errorMessage);
      const errorText = await errorElement.getText();
      
      return {
        expectedResult: "Error message is displayed indicating invalid credentials",
        actualResult: "Error message displayed: " + errorText
      };
    }
  },
  {
    name: "TC-005 (SAUC-T114): Login fails with incorrect password",
    expected: "Error message is displayed indicating invalid credentials",
    fn: async (driver) => {
      await driver.get(BASE_URL);
      await driver.wait(until.elementLocated(SELECTORS.login.username), 10000);
      
      const usernameField = await driver.findElement(SELECTORS.login.username);
      await usernameField.sendKeys("standard_user");
      
      const passwordField = await driver.findElement(SELECTORS.login.password);
      await passwordField.sendKeys("wrong_password");
      
      const loginButton = await driver.findElement(SELECTORS.login.loginButton);
      await loginButton.click();
      
      await driver.wait(until.elementLocated(SELECTORS.login.errorMessage), 10000);
      const errorElement = await driver.findElement(SELECTORS.login.errorMessage);
      const errorText = await errorElement.getText();
      
      return {
        expectedResult: "Error message is displayed indicating invalid credentials",
        actualResult: "Error message displayed: " + errorText
      };
    }
  },
  {
    name: "TC-006 (SAUC-T115): Login fails with both empty fields",
    expected: "Error message is displayed: Username is required",
    fn: async (driver) => {
      await driver.get(BASE_URL);
      await driver.wait(until.elementLocated(SELECTORS.login.username), 10000);
      
      const loginButton = await driver.findElement(SELECTORS.login.loginButton);
      await loginButton.click();
      
      await driver.wait(until.elementLocated(SELECTORS.login.errorMessage), 10000);
      const errorElement = await driver.findElement(SELECTORS.login.errorMessage);
      const errorText = await errorElement.getText();
      
      return {
        expectedResult: "Error message is displayed: Username is required",
        actualResult: "Error message displayed: " + errorText
      };
    }
  },
  {
    name: "TC-007 (SAUC-T116): Login with locked out user",
    expected: "Error message is displayed: Sorry, this user has been locked out",
    fn: async (driver) => {
      await driver.get(BASE_URL);
      await driver.wait(until.elementLocated(SELECTORS.login.username), 10000);
      
      const usernameField = await driver.findElement(SELECTORS.login.username);
      await usernameField.sendKeys("locked_out_user");
      
      const passwordField = await driver.findElement(SELECTORS.login.password);
      await passwordField.sendKeys("secret_sauce");
      
      const loginButton = await driver.findElement(SELECTORS.login.loginButton);
      await loginButton.click();
      
      await driver.wait(until.elementLocated(SELECTORS.login.errorMessage), 10000);
      const errorElement = await driver.findElement(SELECTORS.login.errorMessage);
      const errorText = await errorElement.getText();
      
      return {
        expectedResult: "Error message is displayed: Sorry, this user has been locked out",
        actualResult: "Error message displayed: " + errorText
      };
    }
  },
  {
    name: "TC-008 (SAUC-T117): Error message dismissal functionality",
    expected: "User is successfully logged in and redirected to inventory page",
    fn: async (driver) => {
      await driver.get(BASE_URL);
      await driver.wait(until.elementLocated(SELECTORS.login.username), 10000);
      
      let usernameField = await driver.findElement(SELECTORS.login.username);
      await usernameField.sendKeys("invalid_user");
      
      let passwordField = await driver.findElement(SELECTORS.login.password);
      await passwordField.sendKeys("wrong_pass");
      
      let loginButton = await driver.findElement(SELECTORS.login.loginButton);
      await loginButton.click();
      
      await driver.wait(until.elementLocated(SELECTORS.login.errorMessage), 10000);
      const errorDisplayed = await driver.findElement(SELECTORS.login.errorMessage).isDisplayed();
      
      const closeButton = await driver.findElement(SELECTORS.login.errorButton);
      await closeButton.click();
      
      await driver.sleep(500);
      
      usernameField = await driver.findElement(SELECTORS.login.username);
      await usernameField.clear();
      await usernameField.sendKeys("standard_user");
      
      passwordField = await driver.findElement(SELECTORS.login.password);
      await passwordField.clear();
      await passwordField.sendKeys("secret_sauce");
      
      loginButton = await driver.findElement(SELECTORS.login.loginButton);
      await loginButton.click();
      
      await driver.wait(until.urlContains("/inventory.html"), 10000);
      const currentUrl = await driver.getCurrentUrl();
      
      return {
        expectedResult: "User is successfully logged in and redirected to inventory page",
        actualResult: "Error dismissed, then successfully logged in and redirected to " + currentUrl
      };
    }
  }
];

runSuite("Login Tests", tests);