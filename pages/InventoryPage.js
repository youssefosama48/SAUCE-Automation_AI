const { By, until } = require('selenium-webdriver');
const config = require('../config/test.config');

class InventoryPage {
  constructor(driver) {
    this.driver = driver;
    this.url = config.pages.inventory_page.url;
    
    this.shoppingCartIcon = By.css(config.pages.inventory_page.elements.shopping_cart_icon.locator);
    this.productItem = By.className(config.pages.inventory_page.elements.product_item.locator);
    this.addToCartButton = By.css(config.pages.inventory_page.elements.add_to_cart_button.locator);
  }

  async waitForPageLoad() {
    await this.driver.wait(until.elementLocated(this.shoppingCartIcon), config.timeouts.explicit);
    await this.driver.wait(until.elementLocated(this.productItem), config.timeouts.explicit);
  }

  async isLoaded() {
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

  async clickAddToCart() {
    const element = await this.driver.wait(
      until.elementLocated(this.addToCartButton),
      config.timeouts.explicit
    );
    await element.click();
  }

  async getProductCount() {
    const elements = await this.driver.findElements(this.productItem);
    return elements.length;
  }

  async isShoppingCartVisible() {
    try {
      const element = await this.driver.findElement(this.shoppingCartIcon);
      return await element.isDisplayed();
    } catch (error) {
      return false;
    }
  }
}

module.exports = InventoryPage;