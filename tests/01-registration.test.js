const { until, By } = require("selenium-webdriver");
const { login, logout, runSuite, BASE_URL } = require("../helpers/driver");

const tests = [
  {
    name: "Verify registration page does not exist",
    expected: "No registration page exists, 404 or redirect to login",
    fn: async (driver) => {
      await driver.get(BASE_URL);
      await driver.wait(until.elementLocated(By.css(".login_logo")), 10000);
      const loginPageVisible = await driver.findElement(By.css(".login_logo")).isDisplayed();
      
      await driver.get(BASE_URL + "/register.html");
      await driver.sleep(2000);
      
      const currentUrl = await driver.getCurrentUrl();
      const pageSource = await driver.getPageSource();
      const has404 = pageSource.toLowerCase().includes("404") || pageSource.toLowerCase().includes("not found");
      const isLoginPage = currentUrl.includes("saucedemo.com") && !currentUrl.includes("register");
      
      return {
        expectedResult: "No registration page exists, returns 404 or redirects to login",
        actualResult: "Login page visible: " + loginPageVisible + ", Register URL redirected: " + isLoginPage + ", Has 404: " + has404 + ", Current URL: " + currentUrl
      };
    }
  },
  {
    name: "Verify registration fields requirement - name, email, password",
    expected: "Registration page should not exist",
    fn: async (driver) => {
      await driver.get(BASE_URL + "/register");
      await driver.sleep(2000);
      
      const currentUrl = await driver.getCurrentUrl();
      let hasNameField = false;
      let hasEmailField = false;
      let hasPasswordField = false;
      
      try {
        await driver.findElement(By.id("name"));
        hasNameField = true;
      } catch (e) {
        hasNameField = false;
      }
      
      try {
        await driver.findElement(By.id("email"));
        hasEmailField = true;
      } catch (e) {
        hasEmailField = false;
      }
      
      try {
        await driver.findElement(By.id("register-password"));
        hasPasswordField = true;
      } catch (e) {
        hasPasswordField = false;
      }
      
      return {
        expectedResult: "Registration page does not exist in SauceDemo",
        actualResult: "Current URL: " + currentUrl + ", Name field: " + hasNameField + ", Email field: " + hasEmailField + ", Password field: " + hasPasswordField
      };
    }
  },
  {
    name: "Successful user registration with valid data",
    expected: "Registration feature does not exist",
    fn: async (driver) => {
      await driver.get(BASE_URL + "/register");
      await driver.sleep(2000);
      
      const currentUrl = await driver.getCurrentUrl();
      let registrationFormExists = false;
      
      try {
        await driver.findElement(By.id("register-button"));
        registrationFormExists = true;
      } catch (e) {
        registrationFormExists = false;
      }
      
      return {
        expectedResult: "Registration page does not exist, cannot test registration flow",
        actualResult: "Current URL: " + currentUrl + ", Registration form exists: " + registrationFormExists
      };
    }
  },
  {
    name: "Registration fails with invalid email format",
    expected: "Registration feature does not exist",
    fn: async (driver) => {
      await driver.get(BASE_URL + "/register");
      await driver.sleep(2000);
      
      const currentUrl = await driver.getCurrentUrl();
      let canTestInvalidEmail = false;
      
      try {
        const emailField = await driver.findElement(By.id("email"));
        await emailField.sendKeys("invalidemail.com");
        canTestInvalidEmail = true;
      } catch (e) {
        canTestInvalidEmail = false;
      }
      
      return {
        expectedResult: "Registration page does not exist, cannot test email validation",
        actualResult: "Current URL: " + currentUrl + ", Can test invalid email: " + canTestInvalidEmail
      };
    }
  },
  {
    name: "Registration fails with weak password",
    expected: "Registration feature does not exist",
    fn: async (driver) => {
      await driver.get(BASE_URL + "/register");
      await driver.sleep(2000);
      
      const currentUrl = await driver.getCurrentUrl();
      let canTestWeakPassword = false;
      
      try {
        const passwordField = await driver.findElement(By.id("register-password"));
        await passwordField.sendKeys("123");
        canTestWeakPassword = true;
      } catch (e) {
        canTestWeakPassword = false;
      }
      
      return {
        expectedResult: "Registration page does not exist, cannot test password validation",
        actualResult: "Current URL: " + currentUrl + ", Can test weak password: " + canTestWeakPassword
      };
    }
  },
  {
    name: "Registration fails with empty required fields",
    expected: "Registration feature does not exist",
    fn: async (driver) => {
      await driver.get(BASE_URL + "/register");
      await driver.sleep(2000);
      
      const currentUrl = await driver.getCurrentUrl();
      let hasRegisterButton = false;
      
      try {
        await driver.findElement(By.id("register-button"));
        hasRegisterButton = true;
      } catch (e) {
        hasRegisterButton = false;
      }
      
      return {
        expectedResult: "Registration page does not exist, cannot test empty fields validation",
        actualResult: "Current URL: " + currentUrl + ", Has register button: " + hasRegisterButton
      };
    }
  },
  {
    name: "Registration fails with already registered email",
    expected: "Registration feature does not exist",
    fn: async (driver) => {
      await driver.get(BASE_URL + "/register");
      await driver.sleep(2000);
      
      const currentUrl = await driver.getCurrentUrl();
      let canTestDuplicateEmail = false;
      
      try {
        const emailField = await driver.findElement(By.id("email"));
        await emailField.sendKeys("testuser@example.com");
        canTestDuplicateEmail = true;
      } catch (e) {
        canTestDuplicateEmail = false;
      }
      
      return {
        expectedResult: "Registration page does not exist, cannot test duplicate email",
        actualResult: "Current URL: " + currentUrl + ", Can test duplicate email: " + canTestDuplicateEmail
      };
    }
  },
  {
    name: "Registration with special characters in name field",
    expected: "Registration feature does not exist",
    fn: async (driver) => {
      await driver.get(BASE_URL + "/register");
      await driver.sleep(2000);
      
      const currentUrl = await driver.getCurrentUrl();
      let canTestSpecialChars = false;
      
      try {
        const nameField = await driver.findElement(By.id("name"));
        await nameField.sendKeys("John O'Neil-Smith");
        canTestSpecialChars = true;
      } catch (e) {
        canTestSpecialChars = false;
      }
      
      return {
        expectedResult: "Registration page does not exist, cannot test special characters",
        actualResult: "Current URL: " + currentUrl + ", Can test special characters: " + canTestSpecialChars
      };
    }
  }
];

runSuite("Registration Tests", tests);
