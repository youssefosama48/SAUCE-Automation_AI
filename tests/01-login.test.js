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
    expected: "Error message is displayed indicating username and password do not match",
    fn: async (driver) => {
      await driver.get(BASE_URL);
      await driver.wait(until.elementLocated(By.id("user-name")), 10000);
      await driver.findElement(By.id("user-name")).sendKeys("invalid_user123");
      await driver.findElement(By.id("password")).sendKeys("secret_sauce");
      await driver.findElement(By.id("login-button")).click();
      await driver.wait(until.elementLocated(By.css("[data-test='error']")), 5000);
      const errorElement = await driver.findElement(By.css("[data-test='error']"));
      const errorText = await errorElement.getText();
      return {
        expectedResult: "Error message displayed indicating username and password do not match",
        actualResult: "Error message: " + errorText,
      };
    },
  },
  {
    name: "Login fails with incorrect password",
    expected: "Error message is displayed indicating credentials are incorrect",
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
        expectedResult: "Error message displayed indicating credentials are incorrect",
        actualResult: "Error message: " + errorText,
      };
    },
  },
  {
    name: "Login fails with empty username field",
    expected: "Error message displayed indicating username is required",
    fn: async (driver) => {
      await driver.get(BASE_URL);
      await driver.wait(until.elementLocated(By.id("user-name")), 10000);
      await driver.findElement(By.id("password")).sendKeys("secret_sauce");
      await driver.findElement(By.id("login-button")).click();
      await driver.wait(until.elementLocated(By.css("[data-test='error']")), 5000);
      const errorElement = await driver.findElement(By.css("[data-test='error']"));
      const errorText = await errorElement.getText();
      return {
        expectedResult: "Error message displayed indicating username is required",
        actualResult: "Error message: " + errorText,
      };
    },
  },
  {
    name: "Login fails with empty password field",
    expected: "Error message displayed indicating password is required",
    fn: async (driver) => {
      await driver.get(BASE_URL);
      await driver.wait(until.elementLocated(By.id("user-name")), 10000);
      await driver.findElement(By.id("user-name")).sendKeys("standard_user");
      await driver.findElement(By.id("login-button")).click();
      await driver.wait(until.elementLocated(By.css("[data-test='error']")), 5000);
      const errorElement = await driver.findElement(By.css("[data-test='error']"));
      const errorText = await errorElement.getText();
      return {
        expectedResult: "Error message displayed indicating password is required",
        actualResult: "Error message: " + errorText,
      };
    },
  },
  {
    name: "Login fails with both fields empty",
    expected: "Error message displayed indicating username is required",
    fn: async (driver) => {
      await driver.get(BASE_URL);
      await driver.wait(until.elementLocated(By.id("user-name")), 10000);
      await driver.findElement(By.id("login-button")).click();
      await driver.wait(until.elementLocated(By.css("[data-test='error']")), 5000);
      const errorElement = await driver.findElement(By.css("[data-test='error']"));
      const errorText = await errorElement.getText();
      return {
        expectedResult: "Error message displayed indicating username is required",
        actualResult: "Error message: " + errorText,
      };
    },
  },
  {
    name: "Login with locked out user",
    expected: "Error message displayed indicating user has been locked out",
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
        expectedResult: "Error message displayed indicating user has been locked out",
        actualResult: "Error message: " + errorText,
      };
    },
  },
  {
    name: "Verify shopping cart is accessible after login",
    expected: "Shopping cart icon is displayed and user can navigate to cart page",
    fn: async (driver) => {
      await login(driver, "standard_user", "secret_sauce");
      await driver.wait(until.elementLocated(By.css(".shopping_cart_link")), 5000);
      const cartIcon = await driver.findElement(By.css(".shopping_cart_link"));
      const isCartDisplayed = await cartIcon.isDisplayed();
      await cartIcon.click();
      await driver.wait(until.urlContains("/cart.html"), 5000);
      const url = await driver.getCurrentUrl();
      const cartContainer = await driver.findElement(By.css(".cart_contents_container"));
      const isCartPageDisplayed = await cartContainer.isDisplayed();
      return {
        expectedResult: "Shopping cart icon is displayed and user can navigate to cart page",
        actualResult: "Cart icon visible: " + isCartDisplayed + ", navigated to: " + url + ", cart page displayed: " + isCartPageDisplayed,
      };
    },
  },
];

runSuite("Login Tests", tests);
