const { By, until } = require('selenium-webdriver');
const config = require('../config/test.config');

class InventoryPage {
  constructor(driver) {
    this.driver = driver;
    this.timeout = config.timeout.explicit;
    
    this.shoppingCartIcon = By.css(config.pages.inventory_page.elements.shopping_cart_icon.locator);
    this.productItem = By.className(config.pages.inventory_page.elements.product_item.locator);
    this.addToCartButton = By.css(config.pages.inventory_page.elements.add_to_cart_button.locator);
  }

  async waitForPageLoad() {
    await this.driver.wait(
      until.elementLocated(this.productItem),
      this.timeout,
      'Product items not found on inventory page'
    );
    await this.driver.wait(
      until.elementLocated(this.shoppingCartIcon),
      this.timeout,
      'Shopping cart icon not found'
    );
  }

  async isInventoryPageDisplayed() {
    try {
      await this.waitForPageLoad();
      const url = await this.driver.getCurrentUrl();
      return url.includes('/inventory.html');
    } catch (error) {
      return false;
    }
  }

  async getProductItems() {
    await this.driver.wait(
      until.elementsLocated(this.productItem),
      this.timeout
    );
    return await this.driver.findElements(this.productItem);
  }

  async getProductCount() {
    const products = await this.getProductItems();
    return products.length;
  }

  async isShoppingCartIconDisplayed() {
    try {
      const element = await this.driver.wait(
        until.elementLocated(this.shoppingCartIcon),
        this.timeout
      );
      return await element.isDisplayed();
    } catch (error) {
      return false;
    }
  }

  async clickShoppingCart() {
    const element = await this.driver.wait(
      until.elementLocated(this.shoppingCartIcon),
      this.timeout
    );
    await element.click();
  }

  async addFirstProductToCart() {
    const buttons = await this.driver.findElements(this.addToCartButton);
    if (buttons.length > 0) {
      await buttons[0].click();
    }
  }

  async getCurrentUrl() {
    return await this.driver.getCurrentUrl();
  }

  async verifyUrl() {
    const url = await this.getCurrentUrl();
    return url.includes(config.pages.inventory_page.url);
  }
}

module.exports = InventoryPage;