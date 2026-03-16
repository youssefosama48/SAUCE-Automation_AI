# SauceDemo Automation Framework

## Overview
This is a production-ready Selenium WebDriver automation framework for testing SauceDemo application using Microsoft Edge browser, JavaScript, Mocha, and Chai.

## Project Structure
```
.
├── config/
│   └── test.config.js       # Test configuration
├── pages/
│   ├── LoginPage.js         # Login page object
│   └── InventoryPage.js     # Inventory page object
├── tests/
│   ├── valid_login.test.js  # Valid login test cases
│   ├── invalid_login.test.js # Invalid login test cases
│   └── other.test.js        # Other test cases
├── utils/
│   ├── driver.js            # WebDriver factory
│   └── reporter.js          # Test results reporter
├── results/
│   └── test-results.json    # Test execution results
├── package.json
└── README.md
```

## Prerequisites
- Node.js (v14 or higher)
- Microsoft Edge browser installed
- npm or yarn package manager

## Installation
```bash
npm install
```

## Running Tests

### Run all tests
```bash
npm test
```

### Run specific test suites
```bash
npm run test:valid-login
npm run test:invalid-login
npm run test:other
```

### Run tests in headless mode
```bash
npm run test:headless
```

## Test Cases

### Valid Login Flow (valid_login)
- **TC-001 (SAUC-T46)**: Successful login with valid credentials
- **TC-008 (SAUC-T53)**: Verify inventory page after successful login

### Invalid Login Flow (invalid_login)
- **TC-002 (SAUC-T47)**: Login fails with invalid username
- **TC-003 (SAUC-T48)**: Login fails with empty credentials
- **TC-004 (SAUC-T49)**: Login fails with valid username and empty password
- **TC-005 (SAUC-T50)**: Login fails with empty username and valid password
- **TC-006 (SAUC-T51)**: Login fails with valid username and wrong password

### Other Flow (other)
- **TC-007 (SAUC-T52)**: Login page elements are displayed correctly

## Test Results
After test execution, results are automatically written to `./results/test-results.json` in the following format:
```json
{
  "timestamp": "2024-01-01T12:00:00.000Z",
  "cycleId": "default-cycle",
  "results": [
    {
      "testCaseKey": "SAUC-T46",
      "tcId": "TC-001",
      "name": "Successful login with valid credentials",
      "status": "PASS",
      "duration": 5000,
      "error": null
    }
  ]
}
```

## Features
- **Page Object Model**: Clean separation of page elements and test logic
- **Explicit Waits**: Robust element waiting strategies
- **Microsoft Edge Support**: Configured for Edge browser with headless mode
- **Detailed Reporting**: JSON-based test results with Zephyr integration
- **Screenshot on Failure**: Automatic screenshot capture for failed tests
- **Configurable**: Easy configuration management through config files

## Configuration
Edit `config/test.config.js` to modify:
- Browser settings
- Timeout values
- Application URLs
- Test credentials
- Zephyr integration details

## Zephyr Integration
Test cases are mapped to Zephyr Scale:
- Project Key: SAUC
- Each test references its Zephyr test case key
- Results are formatted for Zephyr API integration

## Contributing
Follow these guidelines:
1. Maintain Page Object Model structure
2. Use explicit waits for all element interactions
3. Add appropriate assertions using Chai
4. Update test results mapping for new test cases
5. Keep configuration centralized in config files

## License
MIT