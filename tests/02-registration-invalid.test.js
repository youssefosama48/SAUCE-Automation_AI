const { until } = require("selenium-webdriver");
const { login, logout, runSuite, SELECTORS, BASE_URL } = require("../helpers/driver");

const tests = [
  {
    name: "TC-002 (SAUC-T95): Registration fails with invalid email format",
    expected: "Error message displayed stating email format is invalid and registration is not submitted",
    fn: async (driver) => {
      await driver.get(BASE_URL);
      await driver.wait(until.elementLocated(SELECTORS.login.username), 10000);
      
      const currentUrl = await driver.getCurrentUrl();
      const pageTitle = await driver.getTitle();
      
      return {
        expectedResult: "Email field shows validation warning for invalid format 'invalid-email-format' and prevents submission",
        actualResult: `SauceDemo (${pageTitle}) at ${currentUrl} does not have registration functionality. Cannot validate email format rules as no registration form exists."
      };
    },
  },
  {
    name: "TC-003 (SAUC-T96): Registration fails when password does not meet security requirements",
    expected: "Error message displayed indicating password requirements not met (min 8 chars, 1 uppercase, 1 number, 1 special)",
    fn: async (driver) => {
      await driver.get(BASE_URL);
      await driver.wait(until.elementLocated(SELECTORS.login.username), 10000);
      
      const loginFormExists = await driver.findElement(SELECTORS.login.username).isDisplayed();
      
      return {
        expectedResult: "Password field shows validation error for weak password 'pass123' and form cannot be submitted",
        actualResult: `Login form displayed: ${loginFormExists}. SauceDemo has no registration feature. Cannot test password security requirements validation."
      };
    },
  },
  {
    name: "TC-004 (SAUC-T97): Registration fails when passwords do not match",
    expected: "Error message displayed stating passwords do not match and form is not submitted",
    fn: async (driver) => {
      await driver.get(BASE_URL);
      await driver.wait(until.elementLocated(SELECTORS.login.username), 10000);
      
      const pageSource = await driver.getPageSource();
      const hasConfirmPasswordField = pageSource.toLowerCase().includes('confirm password');
      
      return {
        expectedResult: "Confirm Password field shows validation warning when 'Test@1234' does not match 'Test@5678'",
        actualResult: `Confirm Password field present: ${hasConfirmPasswordField}. SauceDemo does not support user registration. Cannot test password match validation."
      };
    },
  },
  {
    name: "TC-005 (SAUC-T98): Registration fails with already registered email",
    expected: "Error message displayed indicating email already exists and registration fails",
    fn: async (driver) => {
      await driver.get(BASE_URL);
      await driver.wait(until.elementLocated(SELECTORS.login.username), 10000);
      
      const url = await driver.getCurrentUrl();
      
      return {
        expectedResult: "Error message indicates 'existing@test.com' is already registered and prevents duplicate registration",
        actualResult: `Current URL: ${url}. SauceDemo uses predefined test accounts only (standard_user, locked_out_user, etc.). No registration endpoint to test duplicate email validation."
      };
    },
  },
  {
    name: "TC-006 (SAUC-T99): Registration validation for empty required fields",
    expected: "Validation errors displayed for all required fields and user remains on registration page",
    fn: async (driver) => {
      await driver.get(BASE_URL);
      await driver.wait(until.elementLocated(SELECTORS.login.username), 10000);
      
      const usernameField = await driver.findElement(SELECTORS.login.username);
      const passwordField = await driver.findElement(SELECTORS.login.password);
      const fieldsVisible = (await usernameField.isDisplayed()) && (await passwordField.isDisplayed());
      
      return {
        expectedResult: "Validation errors displayed for empty Full Name, Email, Password, Confirm Password fields",
        actualResult: `Login page has username and password fields (visible: ${fieldsVisible}). SauceDemo has no registration form. Cannot test empty field validation for registration."
      };
    },
  }
];

runSuite("Invalid Registration Tests", tests);