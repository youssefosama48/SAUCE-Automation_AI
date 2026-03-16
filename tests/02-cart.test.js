const { until, By } = require("selenium-webdriver");
const { login, logout, runSuite, BASE_URL } = require("../helpers/driver");

const tests = [
  {
    name: "Verify add product to cart and badge updates",
    expected: "Adding a product updates the cart badge counter to 1",
    fn: async (driver) => {
      await login(driver, "standard_user", "secret_sauce");
      await driver.wait(until.elementLocated(By.css(".inventory_item")), 10000);
      const cartBadgesBefore = await driver.findElements(By.css(".shopping_cart_badge"));
      const badgeCountBefore = cartBadgesBefore.length === 0 ? "0" : await cartBadgesBefore[0].getText();
      const firstProduct = await driver.findElement(By.css(".inventory_item"));
      const addButton = await firstProduct.findElement(By.css("[data-test^='add-to-cart']"));
      await addButton.click();
      await driver.sleep(500);
      await driver.wait(until.elementLocated(By.css(".shopping_cart_badge")), 5000);
      const cartBadge = await driver.findElement(By.css(".shopping_cart_badge"));
      const badgeCount = await cartBadge.getText();
      const removeButton = await firstProduct.findElement(By.css("[data-test^='remove']"));
      const buttonText = await removeButton.getText();
      return {
        expectedResult: "Cart badge displays number 1 and button text changes to Remove",
        actualResult: "Badge before: " + badgeCountBefore + ", Badge after: " + badgeCount + ", Button text: " + buttonText,
      };
    },
  },
  {
    name: "Verify multiple products can be added to cart",
    expected: "Cart badge increments correctly when adding multiple products",
    fn: async (driver) => {
      await login(driver, "standard_user", "secret_sauce");
      await driver.wait(until.elementLocated(By.css(".inventory_item")), 10000);
      const products = await driver.findElements(By.css(".inventory_item"));
      const firstAddButton = await products[0].findElement(By.css("[data-test^='add-to-cart']"));
      await firstAddButton.click();
      await driver.sleep(500);
      await driver.wait(until.elementLocated(By.css(".shopping_cart_badge")), 5000);
      let cartBadge = await driver.findElement(By.css(".shopping_cart_badge"));
      const badgeCount1 = await cartBadge.getText();
      const secondAddButton = await products[1].findElement(By.css("[data-test^='add-to-cart']"));
      await secondAddButton.click();
      await driver.sleep(500);
      cartBadge = await driver.findElement(By.css(".shopping_cart_badge"));
      const badgeCount2 = await cartBadge.getText();
      const thirdAddButton = await products[2].findElement(By.css("[data-test^='add-to-cart']"));
      await thirdAddButton.click();
      await driver.sleep(500);
      cartBadge = await driver.findElement(By.css(".shopping_cart_badge"));
      const badgeCount3 = await cartBadge.getText();
      return {
        expectedResult: "Cart badge updates to 1, then 2, then 3",
        actualResult: "After 1st add: " + badgeCount1 + ", After 2nd add: " + badgeCount2 + ", After 3rd add: " + badgeCount3,
      };
    },
  },
];

runSuite("Cart Tests", tests);