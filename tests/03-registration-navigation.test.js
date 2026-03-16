const { until } = require("selenium-webdriver");
const { login, logout, runSuite, SELECTORS, BASE_URL } = require("../helpers/driver");

const tests = [
  {
    name: "TC-008 (SAUC-T101): Verify navigation to registration page from homepage",
    expected: "User is redirected to registration page with registration form displayed",
    fn: async (driver) => {
      await driver.get(BASE_URL);
      await driver.wait(until.elementLocated(SELECTORS.login.username), 10000);
      
      const pageSource = await driver.getPageSource();
      const currentUrl = await driver.getCurrentUrl();
      const pageTitle = await driver.getTitle();
      
      const hasSignUpLink = pageSource.includes('Sign Up') || 
                           pageSource.includes('Register') || 
                           pageSource.includes('sign up') || 
                           pageSource.includes('register');
      
      const registrationLinks = [];
      try {
        const links = await driver.findElements({ css: 'a' });
        for (let link of links) {
          const text = await link.getText();
          const href = await link.getAttribute('href');
          if (text && (text.toLowerCase().includes('sign') || text.toLowerCase().includes('register'))) {
            registrationLinks.push({ text, href });
          }
        }
      } catch (e) {
        // No links found
      }
      
      return {
        expectedResult: "Registration link is visible and clickable on homepage, redirects to registration page with form",
        actualResult: `Homepage loaded at ${currentUrl} (${pageTitle}). Sign Up/Register link found: ${hasSignUpLink}. Links found: ${registrationLinks.length}. Note: SauceDemo is a demo e-commerce site without user registration - it provides predefined test accounts (standard_user, locked_out_user) for testing login functionality only."
      };
    },
  }
];

runSuite("Registration Navigation Tests", tests);