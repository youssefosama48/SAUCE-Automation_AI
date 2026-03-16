module.exports = {
  project: {
    name: 'SauceDemo Automation',
    url: 'https://www.saucedemo.com/',
    browser: 'Microsoft Edge',
    framework: 'Selenium',
    language: 'JavaScript',
    runtime: 'Node.js'
  },
  credentials: {
    valid_user: 'standard_user',
    locked_user: 'locked_out_user',
    password: 'secret_sauce'
  },
  pages: {
    login_page: {
      url: 'https://www.saucedemo.com/',
      elements: {
        username_input: {
          locator_type: 'id',
          locator: 'user-name'
        },
        password_input: {
          locator_type: 'id',
          locator: 'password'
        },
        login_button: {
          locator_type: 'id',
          locator: 'login-button'
        },
        error_message: {
          locator_type: 'css',
          locator: '[data-test="error"]'
        }
      }
    },
    inventory_page: {
      url: 'https://www.saucedemo.com/inventory.html',
      elements: {
        shopping_cart_icon: {
          locator_type: 'css',
          locator: '[data-test="shopping-cart-link"]'
        },
        product_item: {
          locator_type: 'class',
          locator: 'inventory_item'
        },
        add_to_cart_button: {
          locator_type: 'css',
          locator: 'button.btn_inventory'
        }
      }
    }
  },
  automation_rules: {
    locator_priority: ['id', 'css', 'name', 'xpath'],
    use_explicit_waits: true,
    page_object_model: true,
    headless_support: true
  },
  zephyr: {
    baseUrl: 'https://api.zephyrscale.smartbear.com/v2',
    projectKey: 'SAUC',
    boardId: '1',
    version: '1.0'
  },
  github: {
    owner: 'youssefosama48',
    repo: 'SAUCE-Automation_AI',
    branch: 'main'
  },
  mcpServer: {
    port: 3000,
    callbackUrl: 'https://loquaciously-untattered-izola.ngrok-free.dev '
  },
  timeout: {
    implicit: 10000,
    explicit: 15000,
    page_load: 30000
  },
  headless: process.env.HEADLESS === 'true' || false
};