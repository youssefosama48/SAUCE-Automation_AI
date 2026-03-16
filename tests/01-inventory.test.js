const { until, By } = require("selenium-webdriver");
const { login, logout, runSuite, BASE_URL } = require("../helpers/driver");

const tests = [
  {
    name: "Verify inventory page loads after successful login",
    expected: "Inventory page displays with product list, shopping cart icon, and menu",
    fn: async (driver) => {
      await driver.get(BASE_URL);
      await driver.wait(until.elementLocated(By.id("user-name")), 10000);
      await driver.findElement(By.id("user-name")).sendKeys("standard_user");
      await driver.findElement(By.id("password")).sendKeys("secret_sauce");
      await driver.findElement(By.id("login-button")).click();
      await driver.wait(until.urlContains("/inventory.html"), 8000);
      const url = await driver.getCurrentUrl();
      await driver.wait(until.elementLocated(By.css(".inventory_container")), 10000);
      const inventoryContainer = await driver.findElement(By.css(".inventory_container"));
      const isDisplayed = await inventoryContainer.isDisplayed();
      const cartIcon = await driver.findElement(By.css(".shopping_cart_link"));
      const cartDisplayed = await cartIcon.isDisplayed();
      const menuBtn = await driver.findElement(By.id("react-burger-menu-btn"));
      const menuDisplayed = await menuBtn.isDisplayed();
      return {
        expectedResult: "User is redirected to inventory page at /inventory.html with all elements visible",
        actualResult: "URL: " + url + ", Inventory visible: " + isDisplayed + ", Cart visible: " + cartDisplayed + ", Menu visible: " + menuDisplayed,
      };
    },
  },
  {
    name: "Verify all product details display correctly",
    expected: "Each product shows name, image, price, and Add to Cart button",
    fn: async (driver) => {
      await login(driver, "standard_user", "secret_sauce");
      await driver.wait(until.elementLocated(By.css(".inventory_item")), 10000);
      const firstProduct = await driver.findElement(By.css(".inventory_item"));
      const productName = await firstProduct.findElement(By.css(".inventory_item_name"));
      const nameDisplayed = await productName.isDisplayed();
      const productImage = await firstProduct.findElement(By.css(".inventory_item_img"));
      const imageDisplayed = await productImage.isDisplayed();
      const productPrice = await firstProduct.findElement(By.css(".inventory_item_price"));
      const priceDisplayed = await productPrice.isDisplayed();
      const priceText = await productPrice.getText();
      const addButton = await firstProduct.findElement(By.css("[data-test^='add-to-cart']"));
      const buttonDisplayed = await addButton.isDisplayed();
      return {
        expectedResult: "All required elements are present and visible for each product",
        actualResult: "Name visible: " + nameDisplayed + ", Image visible: " + imageDisplayed + ", Price visible: " + priceDisplayed + " (" + priceText + "), Button visible: " + buttonDisplayed,
      };
    },
  },
  {
    name: "Verify product sorting from low to high price",
    expected: "Products are sorted by price in ascending order",
    fn: async (driver) => {
      await login(driver, "standard_user", "secret_sauce");
      await driver.wait(until.elementLocated(By.css(".product_sort_container")), 10000);
      const sortDropdown = await driver.findElement(By.css(".product_sort_container"));
      await sortDropdown.click();
      await driver.findElement(By.css("option[value='lohi']")).click();
      await driver.sleep(1000);
      const prices = await driver.findElements(By.css(".inventory_item_price"));
      const firstPriceText = await prices[0].getText();
      const lastPriceText = await prices[prices.length - 1].getText();
      const firstPrice = parseFloat(firstPriceText.replace("$", ""));
      const lastPrice = parseFloat(lastPriceText.replace("$", ""));
      const isSorted = firstPrice <= lastPrice;
      return {
        expectedResult: "First product has lowest price, last product has highest price",
        actualResult: "First price: $" + firstPrice + ", Last price: $" + lastPrice + ", Sorted correctly: " + isSorted,
      };
    },
  },
  {
    name: "Verify navigation to product detail page via product name",
    expected: "Clicking product title navigates to product details page",
    fn: async (driver) => {
      await login(driver, "standard_user", "secret_sauce");
      await driver.wait(until.elementLocated(By.css(".inventory_item")), 10000);
      const firstProduct = await driver.findElement(By.css(".inventory_item"));
      const productNameLink = await firstProduct.findElement(By.css(".inventory_item_name"));
      const productName = await productNameLink.getText();
      await productNameLink.click();
      await driver.wait(until.urlContains("/inventory-item.html"), 8000);
      const url = await driver.getCurrentUrl();
      await driver.wait(until.elementLocated(By.css(".inventory_details_name")), 10000);
      const detailName = await driver.findElement(By.css(".inventory_details_name"));
      const detailNameText = await detailName.getText();
      const detailPrice = await driver.findElement(By.css(".inventory_details_price"));
      const priceDisplayed = await detailPrice.isDisplayed();
      const detailDesc = await driver.findElement(By.css(".inventory_details_desc"));
      const descDisplayed = await detailDesc.isDisplayed();
      return {
        expectedResult: "Product details including name, image, price, and description are visible",
        actualResult: "URL: " + url + ", Product name: " + detailNameText + ", Price visible: " + priceDisplayed + ", Description visible: " + descDisplayed,
      };
    },
  },
  {
    name: "Verify navigation to product detail page via product image",
    expected: "Clicking product image navigates to product details page",
    fn: async (driver) => {
      await login(driver, "standard_user", "secret_sauce");
      await driver.wait(until.elementLocated(By.css(".inventory_item")), 10000);
      const firstProduct = await driver.findElement(By.css(".inventory_item"));
      const productImage = await firstProduct.findElement(By.css(".inventory_item_img a"));
      await productImage.click();
      await driver.wait(until.urlContains("/inventory-item.html"), 8000);
      const url = await driver.getCurrentUrl();
      await driver.wait(until.elementLocated(By.css(".inventory_details")), 10000);
      const detailsContainer = await driver.findElement(By.css(".inventory_details"));
      const isDisplayed = await detailsContainer.isDisplayed();
      const detailName = await driver.findElement(By.css(".inventory_details_name"));
      const nameDisplayed = await detailName.isDisplayed();
      return {
        expectedResult: "Product detail page displays correct product information",
        actualResult: "URL: " + url + ", Details visible: " + isDisplayed + ", Name visible: " + nameDisplayed,
      };
    },
  },
  {
    name: "Verify inventory page does not load without login",
    expected: "Direct access to inventory page redirects to login when not authenticated",
    fn: async (driver) => {
      await driver.get(BASE_URL + "/inventory.html");
      await driver.wait(until.urlIs(BASE_URL + "/"), 8000);
      const url = await driver.getCurrentUrl();
      await driver.wait(until.elementLocated(By.css(".login_logo")), 10000);
      const loginLogo = await driver.findElement(By.css(".login_logo"));
      const logoDisplayed = await loginLogo.isDisplayed();
      const errorElement = await driver.findElements(By.css("[data-test='error']"));
      const hasError = errorElement.length > 0;
      return {
        expectedResult: "Login page is displayed with appropriate message or user cannot access inventory",
        actualResult: "Redirected to: " + url + ", Login logo visible: " + logoDisplayed + ", Error shown: " + hasError,
      };
    },
  },
];

runSuite("Inventory Tests", tests);