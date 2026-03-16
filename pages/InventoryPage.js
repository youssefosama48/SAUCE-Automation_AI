const { By, until } = require('selenium-webdriver');
const config = require('../config/test.config');

class InventoryPage {
  constructor(driver) {
    this.driver = driver;
    this.timeout = config.timeout.explicit;
    
    this.locators = {
      shoppingCartIcon: By.css(config.pages.inventory_page.elements.shopping_cart_icon.locator),
      productItem: By.className(config.pages.inventory_page.elements.product_item.locator),
      addToCartButton: By.css(config.pages.inventory_page.elements.add_to_cart_button.locator)
    };
  }
  
  async waitForPageLoad() {
    await this.driver.wait(
      until.elementLocated(this.locators.shoppingCartIcon),
      this.timeout,
      'Inventory page did not load'
    );
  }
  
  async isOnInventoryPage() {
    try {
      await this.waitForPageLoad();
      const currentUrl = await this.driver.getCurrentUrl();
      return currentUrl.includes('inventory.html');
    } catch (error) {
      return false;
    }
  }
  
  async getCurrentUrl() {
    return await this.driver.getCurrentUrl();
  }
  
  async getProductCount() {
    const products = await this.driver.findElements(this.locators.productItem);
    return products.length;
  }
  
  async clickAddToCart(index = 0) {
    const addToCartButtons = await this.driver.findElements(this.locators.addToCartButton);
    if (addToCartButtons.length > index) {
      await addToCartButtons[index].click();
    }
  }
  
  async getShoppingCartBadgeCount() {
    try {
      const cartBadge = await this.driver.findElement(By.css('.shopping_cart_badge'));
      const badgeText = await cartBadge.getText();
      return parseInt(badgeText, 10);
    } catch (error) {
      return 0;
    }
  }
}

module.exports = InventoryPage;