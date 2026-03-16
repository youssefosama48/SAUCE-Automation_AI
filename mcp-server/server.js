/**
 * QA Automation MCP Server
 * ─────────────────────────────────────────────────────────────────────────────
 * Receives Jira webhooks → Claude generates test cases → Zephyr Scale Cloud
 * creates tests & cycle → Claude generates Selenium scripts → pushed to GitHub
 */

const express     = require('express');
const axios       = require('axios');
const Anthropic   = require('@anthropic-ai/sdk');
const { Octokit } = require('@octokit/rest');
const path        = require('path');
const fs          = require('fs');

const config      = require('../config/pipeline.config.json');
const secrets     = require('../config/secrets.json');

const app         = express();
app.use(express.json());

const anthropic   = new Anthropic({ apiKey: secrets.anthropic.apiKey });
const octokit     = new Octokit({ auth: secrets.github.token });

// Deduplication — prevents same story being processed twice
let processingStories = new Set();

// ─── Utility ──────────────────────────────────────────────────────────────────

function log(step, msg, data = '') {
  const ts = new Date().toISOString();
  console.log(`[${ts}] [${step}] ${msg}`, data ? JSON.stringify(data, null, 2) : '');
}

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

// Extract full error detail from axios errors
function extractError(err) {
  if (err.response?.data) {
    return typeof err.response.data === 'object'
      ? JSON.stringify(err.response.data)
      : err.response.data;
  }
  return err.message;
}

// Zephyr Scale Cloud API headers
function zephyrHeaders() {
  return {
    Authorization: `Bearer ${secrets.zephyr.apiToken}`,
    'Content-Type': 'application/json',
    'Accept':       'application/json',
  };
}

// ─── Step 1 · Jira webhook endpoint ───────────────────────────────────────────

app.post('/webhook/jira', async (req, res) => {
  try {
    const { issue } = req.body;
    if (!issue) return res.status(400).json({ error: 'No issue in payload' });

    let key = issue.key;

    // Prevent duplicate processing for the same story
    if (processingStories.has(key)) {
      log('WEBHOOK', `Skipping duplicate webhook for ${key}`);
      return res.status(200).json({ message: 'Already processing', storyKey: key });
    }
    processingStories.add(key);

    // Remove from set after 60 seconds
    setTimeout(() => processingStories.delete(key), 60000);

    let summary            = issue.fields.summary;
    let description        = issue.fields.description || '';
    let acceptanceCriteria = issue.fields.customfield_10016 || '';
    let issueType          = issue.fields.issuetype?.name  || 'Story';
    let priority           = issue.fields.priority?.name   || 'Medium';

    let story = {
      key,
      summary,
      description,
      acceptanceCriteria,
      issueType,
      priority,
    };

    log('WEBHOOK', `Received Jira story: ${story.key}`, { summary: story.summary });

    // Respond immediately then run pipeline async
    res.status(202).json({ message: 'Processing started', storyKey: story.key });

    return runPipeline(story).catch(err => {
      log('PIPELINE', `Fatal error for ${story.key}: ${extractError(err)}`);
      processingStories.delete(key);
    });

  } catch (err) {
    log('WEBHOOK', `Error: ${extractError(err)}`);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
});

// ─── Main pipeline ─────────────────────────────────────────────────────────────

async function runPipeline(story) {
  log('PIPELINE', `Starting for ${story.key}`);

  // Step 3-4 · Claude generates test cases
  let testCases;
  try {
    testCases = await generateTestCases(story);
    log('PIPELINE', `Generated ${testCases.length} test cases`);
  } catch (err) {
    throw new Error(`[generateTestCases] ${extractError(err)}`);
  }

  // Step 5 · Create tests in Zephyr Scale Cloud + test cycle
  let testKeys, cycleId;
  try {
    ({ testKeys, cycleId } = await createZephyrTestsAndCycle(story, testCases));
    log('PIPELINE', `Zephyr cycle created: ${cycleId}`, { testKeys });
  } catch (err) {
    throw new Error(`[createZephyrTestsAndCycle] ${extractError(err)}`);
  }

  // Step 6 · Claude generates Selenium scripts
  let scripts;
  try {
    scripts = await generateSeleniumScripts(testCases, testKeys);
    log('PIPELINE', `Generated ${scripts.length} Selenium scripts`);
  } catch (err) {
    throw new Error(`[generateSeleniumScripts] ${extractError(err)}`);
  }

  // Step 7 · Push scripts to GitHub
  try {
    await pushToGitHub(story, testCases, scripts);
    log('PIPELINE', 'Scripts pushed to GitHub — Actions will trigger automatically');
  } catch (err) {
    throw new Error(`[pushToGitHub] ${extractError(err)}`);
  }

  log('PIPELINE', `Completed successfully for ${story.key}`);
}

// ─── Step 3-4 · Claude generates test cases ───────────────────────────────────

async function generateTestCases(story) {
  log('CLAUDE', `Generating test cases for "${story.summary}"`);

  let prompt = `
You are a senior QA engineer for a Selenium JavaScript automation project targeting SauceDemo (https://www.saucedemo.com/).

Project config:
${JSON.stringify(config.project, null, 2)}

Page element locators available:
${JSON.stringify(config.pages, null, 2)}

Test flows already in config:
${JSON.stringify(config.test_flows, null, 2)}

Jira Story:
  Key:         ${story.key}
  Summary:     ${story.summary}
  Description: ${story.description}
  Acceptance Criteria: ${story.acceptanceCriteria}

Generate comprehensive test cases for this story. Return ONLY a valid JSON array with no markdown fences.
Each test case must follow this exact schema:
{
  "id": "TC-001",
  "name": "Short descriptive name",
  "objective": "What this test validates",
  "preconditions": ["list", "of", "preconditions"],
  "steps": [
    {
      "step": 1,
      "action": "Enter username and password",
      "testData": { "Username": "standard_user", "Password": "secret_sauce" },
      "expectedResult": "User is logged in and navigated to inventory page"
    }
  ],
  "testData": {
    "username": "standard_user",
    "password": "secret_sauce"
  },
  "tags": ["smoke", "regression"],
  "priority": "High|Medium|Low",
  "flowRef": "valid_login|invalid_login|add_product_to_cart|other"
}

IMPORTANT rules for steps:
- Each step MUST have its own "testData" object with the specific data used in that step only
- If a step uses a username, include "Username": "standard_user" in that step's testData
- If a step uses a password, include "Password": "secret_sauce" in that step's testData
- If a step verifies a URL, include "Expected URL": "/inventory.html" in that step's testData
- If a step has no specific data, use an empty object {} for testData
- The "action" field should be a clear human-readable instruction like "Enter username standard_user in the username field"
- The "expectedResult" should be a clear outcome like "User is redirected to inventory page"
- Keep step actions and expected results as short readable sentences

Cover: happy paths, edge cases, boundary conditions, and negative scenarios.
Use only the locators defined in the page config above.
IMPORTANT: Generate a maximum of 8 test cases to keep the response concise.
Keep each test case steps to a maximum of 5 steps.
Keep all text values short and concise — no long sentences.
Return the raw JSON array only — no prose, no markdown, no code fences.
  `.trim();

  let response = await anthropic.messages.create({
    model:      'claude-sonnet-4-5',
    max_tokens: 16000,
    messages:   [{ role: 'user', content: prompt }],
  });

  let raw     = response.content[0].text.trim();
  let cleaned = raw
    .replace(/^```(?:json)?\n?/, '')
    .replace(/\n?```$/, '')
    .trim();

  // Extract only the JSON array
  let startIndex = cleaned.indexOf('[');
  let endIndex   = cleaned.lastIndexOf(']');
  if (startIndex === -1 || endIndex === -1) {
    throw new Error('Claude did not return a valid JSON array for test cases');
  }
  cleaned = cleaned.substring(startIndex, endIndex + 1);

  let testCases = JSON.parse(cleaned);

  // Assign sequential IDs
  testCases.forEach((tc, i) => {
    tc.id = `TC-${String(i + 1).padStart(3, '0')}`;
  });

  return testCases;
}

// ─── Step 5 · Create Zephyr Scale Cloud tests + cycle ─────────────────────────

async function createZephyrTestsAndCycle(story, testCases) {
  const { baseUrl, projectKey } = config.zephyr;
  const headers = zephyrHeaders();

  log('ZEPHYR', `Creating ${testCases.length} test cases in project ${projectKey}`);

  let testKeys = [];

  for (let tc of testCases) {

    // Build steps for testScript — included in test case creation payload
    let scriptSteps = tc.steps.map(s => {
      // Build readable test data string for this step
      let stepData = '';
      if (s.testData && Object.keys(s.testData).length > 0) {
        stepData = Object.entries(s.testData)
          .map(([k, v]) => `${k}: ${v}`)
          .join(' | ');
      } else if (tc.testData && Object.keys(tc.testData).length > 0) {
        stepData = Object.entries(tc.testData)
          .map(([k, v]) => `${k}: ${v}`)
          .join(' | ');
      }
      // Official Zephyr Scale Cloud field names from API docs
      return {
        description:    s.action         || '',
        testData:       stepData          || '',
        expectedResult: s.expectedResult  || '',
      };
    });

    // Step 1 — Create test case WITHOUT steps (name, objective, precondition only)
    let payload = {
      projectKey,
      name:         tc.name,
      objective:    tc.objective || '',
      precondition: Array.isArray(tc.preconditions)
        ? tc.preconditions.join('\n')
        : tc.preconditions || '',
      comment:      tc.objective || '',
      estimatedTime: 60000,
      labels:        Array.isArray(tc.tags) ? tc.tags : [],
      priority:      mapPriority(tc.priority),
      status:        'Draft',
    };

    log('ZEPHYR', `  Creating test "${tc.name}" with ${scriptSteps.length} steps`);

    let testKey;
    try {
      let resp = await axios.post(`${baseUrl}/testcases`, payload, { headers });
      testKey = resp.data.key;
      testKeys.push(testKey);
      log('ZEPHYR', `Created test: ${testKey} — ${tc.name}`);
    } catch (err) {
      log('ZEPHYR', `Failed to create test "${tc.name}": ${extractError(err)}`);
      log('ZEPHYR', `Payload sent: ${JSON.stringify(payload)}`);
      throw err;
    }

    // Step 2 — Add steps to Test Script section
    // Confirmed correct format: POST /testcases/{key}/teststeps
    // { mode: "OVERWRITE", items: [{ inline: { description, testData, expectedResult } }] }
    if (scriptSteps.length > 0) {
      try {
        await axios.post(
          `${baseUrl}/testcases/${testKey}/teststeps`,
          {
            mode:  'OVERWRITE',
            items: scriptSteps.map(s => ({
              inline: {
                description:    s.description    || '',
                testData:       s.testData        || '',
                expectedResult: s.expectedResult  || '',
              },
            })),
          },
          { headers }
        );
        log('ZEPHYR', `  Added ${scriptSteps.length} steps to ${testKey}`);
      } catch (stepErr) {
        log('ZEPHYR', `  Steps failed for ${testKey}: ${extractError(stepErr)}`);
      }
    }
  }

  // ── Create test cycle (no statusName — uses project default) ──────────────
  let cyclePayload = {
    projectKey,
    name:        `${story.key} — Automated Regression Cycle`,
    description: `Auto-generated cycle for ${story.summary}`,
    // statusName intentionally omitted — Zephyr uses the project default status
  };

  let cycleResp;
  try {
    cycleResp = await axios.post(`${baseUrl}/testcycles`, cyclePayload, { headers });
  } catch (err) {
    log('ZEPHYR', `Failed to create cycle: ${extractError(err)}`);
    throw err;
  }

  let cycleId = cycleResp.data.key || cycleResp.data.id;
  log('ZEPHYR', `Created cycle: ${cycleId}`);

  // ── Add test cases to cycle — one execution per test case ──────────────────
  let addedCount = 0;
  for (let testKey of testKeys) {
    try {
      await axios.post(
        `${baseUrl}/testexecutions`,
        {
          projectKey,
          testCycleKey:  cycleId,
          testCaseKey:   testKey,
          statusName:    'Not Executed',
        },
        { headers }
      );
      addedCount++;
      log('ZEPHYR', `Added ${testKey} to cycle ${cycleId}`);
    } catch (err) {
      log('ZEPHYR', `Failed to add ${testKey} to cycle: ${extractError(err)}`);
      throw err;
    }
  }
  log('ZEPHYR', `Added ${addedCount} tests to cycle ${cycleId}`);

  // Persist cycleId and testKeys for Step 10
  let metaPath = path.join(__dirname, '../config/cycle_meta.json');
  let meta     = fs.existsSync(metaPath)
    ? JSON.parse(fs.readFileSync(metaPath))
    : {};
  meta.cycleId  = cycleId;
  meta.testKeys = testKeys;
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));

  return { testKeys, cycleId };
}

// Map priority string to Zephyr Scale Cloud format
function mapPriority(priority) {
  const map = {
    'High':   'High',
    'Medium': 'Medium',
    'Low':    'Low',
  };
  return map[priority] || 'Medium';
}

// ─── Step 6 · Claude generates Selenium scripts ───────────────────────────────

// Exact driver.js content to always push to repo
const DRIVER_JS_CONTENT = `${driver_js.replace(/`/g, "\`").replace(/\$\{/g, "\${").replace(/\\/g, "\\\\")}`;

async function generateSeleniumScripts(testCases, testKeys) {
  log('CLAUDE', 'Generating Selenium JS automation scripts');

  let prompt = `
You are a senior Selenium automation engineer generating test scripts for SauceDemo.

The project uses a custom test runner — NOT Mocha. Study this pattern carefully:

EXACT SCRIPT STRUCTURE — follow this precisely:
=================================================
const { until } = require("selenium-webdriver");
const { login, logout, runSuite, SELECTORS, BASE_URL } = require("../helpers/driver");

const tests = [
  {
    name:     "Test name here",
    expected: "What should happen",
    fn: async (driver) => {
      // test steps using driver directly
      // use SELECTORS from helpers/driver
      return {
        expectedResult: "What should happen",
        actualResult:   "What actually happened",
      };
    },
  },
];

runSuite("Suite Name", tests);
=================================================

HOW runSuite WORKS (do NOT reimplement it):
- Creates a new driver per test automatically
- Catches errors and marks test FAIL
- Saves results to: results-{suite-name-lowercase-hyphenated}.json
- Results JSON shape per test: { id, name, status, expectedResult, actualResult, executionNote, errorDetail, duration }
- Overall shape: { suite, browser, environment, startTime, endTime, duration, summary: {total,passed,failed,status}, tests: [...] }

SELECTORS available (from helpers/driver.js):
- SELECTORS.login.username, .password, .loginBtn, .errorMsg, .errorClose, .loginLogo
- SELECTORS.header.burgerMenu, .cartIcon, .cartBadge, .menuLogout
- SELECTORS.inventory.container, .items, .addToCartBtn, .removeBtn, .sortDropdown
- SELECTORS.cart.container, .items, .checkoutBtn, .continueShopBtn, .removeBtn
- SELECTORS.checkoutOne.firstName, .lastName, .postalCode, .continueBtn
- SELECTORS.checkoutTwo.finishBtn, .totalLabel
- SELECTORS.checkoutComplete.header, .backHomeBtn

HELPER FUNCTIONS:
- login(driver, username, password) — logs in and waits for inventory page
- logout(driver) — opens burger menu and clicks logout

PROJECT CONFIG:
- Base URL: https://www.saucedemo.com
- Valid user: standard_user / secret_sauce
- Locked user: locked_out_user / secret_sauce
- Browser: Microsoft Edge headless

Test cases to implement (with their Zephyr keys):
${testCases.map((tc, i) => `${tc.id} -> ${testKeys[i]}: ${tc.name}`).join('\n')}

Full test cases details:
${JSON.stringify(testCases, null, 2)}

INSTRUCTIONS:
1. Group test cases by flowRef into separate test files
2. Each file: tests/XX-{flowRef}.test.js (e.g. tests/01-login.test.js)
3. Each test in the array maps to one test case above
4. Use SELECTORS — never hardcode locators
5. Each fn must return { expectedResult, actualResult }
6. Keep tests independent — each gets a fresh driver via runSuite

CRITICAL RULES:
- Every object MUST have non-empty "filename" starting with tests/
- Every object MUST have non-empty "content"
- ONLY generate test files — do NOT generate helpers/driver.js (it is provided separately)
- Return raw JSON array only — no markdown, no code fences

Return ONLY this JSON array:
[
  { "filename": "tests/01-login.test.js", "content": "full file content" },
  { "filename": "tests/02-cart.test.js",  "content": "full file content" }
]
  `.trim();

  let response = await anthropic.messages.create({
    model:      'claude-sonnet-4-5',
    max_tokens: 16000,
    messages:   [{ role: 'user', content: prompt }],
  });

  let raw     = response.content[0].text.trim();
  let cleaned = raw
    .replace(/^```(?:json)?\n?/, '')
    .replace(/\n?```$/, '')
    .trim();

  // Extract only the JSON array
  let startIndex = cleaned.indexOf('[');
  let endIndex   = cleaned.lastIndexOf(']');
  if (startIndex === -1 || endIndex === -1) {
    throw new Error('Claude did not return a valid JSON array for scripts');
  }
  cleaned = cleaned.substring(startIndex, endIndex + 1);

  return JSON.parse(cleaned);
}

// ─── Step 7 · Push scripts to GitHub ──────────────────────────────────────────

async function pushToGitHub(story, testCases, scripts) {
  const { owner, repo, branch } = config.github;
  let commitBranch = `qa/auto-${slugify(story.key)}-${Date.now()}`;

  log('GITHUB', `Pushing to ${owner}/${repo} on branch ${commitBranch}`);

  // Get base SHA of target branch
  let { data: ref } = await octokit.git.getRef({
    owner, repo, ref: `heads/${branch}`,
  });
  let baseSha = ref.object.sha;

  // Filter out any scripts with empty or invalid filenames
  let validScripts = scripts.filter(s => s.filename && s.filename.trim() !== '' && s.content && s.content.trim() !== '');
  log('GITHUB', `Valid scripts to push: ${validScripts.length} of ${scripts.length}`);

  // Build tree of files — scripts generated by Claude
  let treeItems = await Promise.all(
    validScripts.map(async ({ filename, content }) => {
      let { data: blob } = await octokit.git.createBlob({
        owner, repo,
        content:  Buffer.from(content).toString('base64'),
        encoding: 'base64',
      });
      return { path: filename, mode: '100644', type: 'blob', sha: blob.sha };
    })
  );

  // Add generated test cases JSON artifact
  let { data: tcBlob } = await octokit.git.createBlob({
    owner, repo,
    content:  Buffer.from(JSON.stringify(testCases, null, 2)).toString('base64'),
    encoding: 'base64',
  });
  treeItems.push({
    path: 'config/generated_test_cases.json',
    mode: '100644',
    type: 'blob',
    sha:  tcBlob.sha,
  });

  // Always push helpers/driver.js — the exact file from the project
  let { data: driverBlob } = await octokit.git.createBlob({
    owner, repo,
    content:  Buffer.from(DRIVER_JS_CONTENT).toString('base64'),
    encoding: 'base64',
  });
  treeItems.push({
    path: 'helpers/driver.js',
    mode: '100644',
    type: 'blob',
    sha:  driverBlob.sha,
  });

  // Push cycle_meta.json so Actions can read the cycleId
  let cycleMeta = { cycleId: '', testKeys: [] };
  try {
    const metaPath = require('path').join(__dirname, '../config/cycle_meta.json');
    cycleMeta = JSON.parse(require('fs').readFileSync(metaPath));
  } catch { /* use defaults */ }
  let { data: metaBlob } = await octokit.git.createBlob({
    owner, repo,
    content:  Buffer.from(JSON.stringify(cycleMeta, null, 2)).toString('base64'),
    encoding: 'base64',
  });
  treeItems.push({
    path: 'config/cycle_meta.json',
    mode: '100644',
    type: 'blob',
    sha:  metaBlob.sha,
  });

  // Add GitHub Actions workflow file — triggers CI on push/merge
  const workflowContent = `name: QA Automation — Selenium Edge

on:
  push:
    branches: [master, main]
    paths:
      - 'tests/**'
      - 'helpers/**'
      - 'config/**'
  pull_request:
    branches: [master, main]
  workflow_dispatch:

jobs:
  selenium-tests:
    name: Selenium Tests (Edge / Headless)
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js 24
        uses: actions/setup-node@v4
        with:
          node-version: '24'

      - name: Install Microsoft Edge
        run: |
          curl https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > microsoft.gpg
          sudo install -o root -g root -m 644 microsoft.gpg /etc/apt/trusted.gpg.d/
          sudo sh -c 'echo "deb [arch=amd64] https://packages.microsoft.com/repos/edge stable main" > /etc/apt/sources.list.d/microsoft-edge.list'
          sudo apt-get update
          sudo apt-get install -y microsoft-edge-stable
          echo "Edge version: $(microsoft-edge --version)"

      - name: Install EdgeDriver
        run: |
          npm install -g edgedriver
          edgedriver --version

      - name: Install dependencies
        run: npm install

      - name: Create results directory
        run: mkdir -p results

      - name: Run all test suites
        run: |
          mkdir -p results
          echo "Running all test files in tests/ folder..."
          for f in tests/*.test.js; do
            echo "--- Running: $f ---"
            node "$f" 2>&1 || true
          done
          echo "All suites completed"

      - name: Collect and merge all results JSON files
        if: always()
        run: |
          mkdir -p results
          echo "Collecting results JSON files..."
          ls -la results-*.json 2>/dev/null || echo "No results files at root"

          # Move any results files from root to results/
          mv results-*.json results/ 2>/dev/null || true

          # List what we have
          ls -la results/ || true

          # Merge all results-*.json into one combined file
          if ls results/results-*.json 1> /dev/null 2>&1; then
            echo "Merging results files..."
            node -e "
              const fs = require('fs');
              const files = fs.readdirSync('results').filter(f => f.startsWith('results-') && f.endsWith('.json'));
              console.log('Found files:', files);

              let allTests = [];
              let totalPassed = 0;
              let totalFailed = 0;

              for (const file of files) {
                const data = JSON.parse(fs.readFileSync('results/' + file));
                allTests = allTests.concat(data.tests || []);
                totalPassed += data.summary?.passed || 0;
                totalFailed += data.summary?.failed || 0;
              }

              // Read cycleId from config
              let cycleId = 'unknown';
              try {
                const meta = JSON.parse(fs.readFileSync('config/cycle_meta.json'));
                cycleId = meta.cycleId || 'unknown';
              } catch(e) {}

              const combined = {
                timestamp:   new Date().toISOString(),
                environment: 'CI / Edge / Headless / Node 24',
                cycleId,
                summary: {
                  total:   allTests.length,
                  passed:  totalPassed,
                  failed:  totalFailed,
                  skipped: 0,
                  status:  totalFailed === 0 ? 'ALL PASSED' : 'SOME FAILED'
                },
                results: allTests.map(t => ({
                  tcId:           t.id || '',
                  testCaseKey:    t.zephyrKey || '',
                  name:           t.name,
                  status:         t.status,
                  expectedResult: t.expectedResult || '',
                  actualResult:   t.actualResult   || '',
                  duration:       t.duration       || '0s',
                  error:          t.errorDetail    || null
                }))
              };

              fs.writeFileSync('results/test-results.json', JSON.stringify(combined, null, 2));
              console.log('Combined results written: ' + allTests.length + ' tests');
            "
          else
            echo "No results files found — creating fallback"
            TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)
            node -e "
              const fs = require('fs');
              let cycleId = 'unknown';
              try { cycleId = JSON.parse(fs.readFileSync('config/cycle_meta.json')).cycleId || 'unknown'; } catch(e) {}
              const fallback = {
                timestamp: new Date().toISOString(),
                environment: 'CI / Edge / Headless / Node 24',
                cycleId,
                summary: { total: 0, passed: 0, failed: 0, skipped: 0, status: 'NO TESTS RAN' },
                results: [],
                error: 'No test result files were generated'
              };
              fs.mkdirSync('results', { recursive: true });
              fs.writeFileSync('results/test-results.json', JSON.stringify(fallback, null, 2));
              console.log('Fallback results written');
            "
          fi

      - name: Print results summary
        if: always()
        run: |
          echo "======================================"
          echo "       TEST RESULTS SUMMARY"
          echo "======================================"
          if [ -f results/test-results.json ]; then
            jq -r '"Cycle ID : " + .cycleId' results/test-results.json || true
            jq -r '"Total    : " + (.summary.total | tostring)' results/test-results.json || true
            jq -r '"Passed   : " + (.summary.passed | tostring)' results/test-results.json || true
            jq -r '"Failed   : " + (.summary.failed | tostring)' results/test-results.json || true
            jq -r '"Status   : " + .summary.status' results/test-results.json || true
            echo "--------------------------------------"
            jq -r '.results[] | "[" + .status + "] " + .name' results/test-results.json || echo "No results"
            echo "======================================"
          else
            echo "No results/test-results.json found"
          fi

      - name: Upload results JSON artifact
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: test-results-\${{ github.run_number }}
          path: results/test-results.json
          retention-days: 30

      - name: Upload all raw results artifacts
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: raw-results-\${{ github.run_number }}
          path: results/
          retention-days: 7

      - name: Send results to MCP server → update Zephyr cycle
        if: always()
        run: |
          if [ -f results/test-results.json ] && [ -n "\${{ secrets.MCP_SERVER_URL }}" ]; then
            echo "Sending results to MCP server for Zephyr update..."
            cat results/test-results.json
            HTTP_STATUS=$(curl -s -o /tmp/zephyr_resp.json -w "%{http_code}" \
              -X POST "\${{ secrets.MCP_SERVER_URL }}/zephyr/update-results" \
              -H "Content-Type: application/json" \
              -d @results/test-results.json)
            echo "MCP response (HTTP $HTTP_STATUS):"
            cat /tmp/zephyr_resp.json
          else
            echo "Skipping Zephyr update — no results file or MCP_SERVER_URL not set"
          fi

      - name: Fail workflow if tests failed
        if: always()
        run: |
          if [ -f results/test-results.json ]; then
            FAILED=$(jq '.summary.failed // 0' results/test-results.json)
            if [ "$FAILED" -gt "0" ]; then
              echo "$FAILED test(s) FAILED — see results above"
              exit 1
            fi
          fi
`;
  let { data: wfBlob } = await octokit.git.createBlob({
    owner, repo,
    content:  Buffer.from(workflowContent).toString('base64'),
    encoding: 'base64',
  });
  treeItems.push({
    path: '.github/workflows/qa-automation.yml',
    mode: '100644',
    type: 'blob',
    sha:  wfBlob.sha,
  });

  // Add package.json
  const packageJson = {
    name: "saucedemo-qa-automation",
    version: "1.0.0",
    engines: {
      node: ">=24.0.0"
    },
    scripts: {
      test: "for f in tests/*.test.js; do node $f; done"
    },
    dependencies: {
      "selenium-webdriver": "^4.21.0"
    }
  };
  let { data: pkgBlob } = await octokit.git.createBlob({
    owner, repo,
    content:  Buffer.from(JSON.stringify(packageJson, null, 2)).toString('base64'),
    encoding: 'base64',
  });
  treeItems.push({
    path: 'package.json',
    mode: '100644',
    type: 'blob',
    sha:  pkgBlob.sha,
  });

  let { data: tree } = await octokit.git.createTree({
    owner, repo, base_tree: baseSha, tree: treeItems,
  });

  let { data: commit } = await octokit.git.createCommit({
    owner, repo,
    message: `[QA-AUTO] ${story.key}: ${testCases.length} tests generated by Claude`,
    tree:    tree.sha,
    parents: [baseSha],
  });

  // Create new branch
  await octokit.git.createRef({
    owner, repo,
    ref: `refs/heads/${commitBranch}`,
    sha: commit.sha,
  });

  // Open PR for team review
  await octokit.pulls.create({
    owner, repo,
    title: `[QA-AUTO] ${story.key}: Selenium tests — ${testCases.length} cases`,
    body:  `Auto-generated by the QA AI pipeline.\n\n**Story:** ${story.key} — ${story.summary}\n\n**Test cases:** ${testCases.length}\n\nMerging this PR will trigger the GitHub Actions CI run.`,
    head:  commitBranch,
    base:  branch,
  });

  log('GITHUB', `PR created for branch ${commitBranch}`);
}

// ─── Step 10 · Update Zephyr with test results ────────────────────────────────

app.post('/zephyr/update-results', async (req, res) => {
  try {
    // Accept full results object from GitHub Actions
    const body = req.body;
    const results  = body.results || [];
    const cycleId  = body.cycleId || null;
    const summary  = body.summary || {};

    if (!results.length) return res.status(400).json({ error: 'No results provided' });

    // Use cycleId from request body first, fall back to cycle_meta.json
    let activeCycleId = cycleId;
    if (!activeCycleId) {
      try {
        let metaPath = path.join(__dirname, '../config/cycle_meta.json');
        let meta     = JSON.parse(fs.readFileSync(metaPath));
        activeCycleId = meta.cycleId;
      } catch { /* use null */ }
    }
    if (!activeCycleId) return res.status(400).json({ error: 'No cycleId found in request or cycle_meta.json' });

    const { baseUrl, projectKey } = config.zephyr;
    const headers = zephyrHeaders();

    log('ZEPHYR', `Updating ${results.length} results on cycle ${activeCycleId}`);
    log('ZEPHYR', `Summary — Total: ${summary.total} | Passed: ${summary.passed} | Failed: ${summary.failed}`);

    let statusMap = { 'PASS': 'Pass', 'FAIL': 'Fail', 'SKIP': 'Blocked' };
    let updated = 0;
    let skipped = 0;

    for (let r of results) {
      // Match test to Zephyr key — results may have testCaseKey or we match by name
      let zephyrKey = r.testCaseKey || null;

      if (!zephyrKey) {
        log('ZEPHYR', `  Skipping "${r.name}" — no testCaseKey`);
        skipped++;
        continue;
      }

      // Build comment with expected and actual result
      let comment = `Status: ${r.status}\n`;
      if (r.expectedResult) comment += `Expected: ${r.expectedResult}\n`;
      if (r.actualResult)   comment += `Actual:   ${r.actualResult}\n`;
      if (r.error)          comment += `Error:    ${r.error}`;

      try {
        await axios.put(
          `${baseUrl}/testexecutions/${zephyrKey}`,
          {
            projectKey,
            testCycleKey:    activeCycleId,
            statusName:      statusMap[r.status] || 'Not Executed',
            comment:         comment.trim(),
            environmentName: 'CI / Edge / Headless / Node 24',
          },
          { headers }
        );
        log('ZEPHYR', `  ✓ ${zephyrKey} [${r.status}] — ${r.name}`);
        updated++;
      } catch (err) {
        log('ZEPHYR', `  ✗ Failed ${zephyrKey}: ${extractError(err)}`);
      }
    }

    log('ZEPHYR', `Done — Updated: ${updated} | Skipped: ${skipped}`);
    res.json({
      message:      'Zephyr updated',
      cycleId:      activeCycleId,
      updatedCount: updated,
      skippedCount: skipped,
      summary,
    });

  } catch (err) {
    log('ZEPHYR-UPDATE', `Error: ${extractError(err)}`);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
});

// ─── Health check ──────────────────────────────────────────────────────────────

app.get('/health', (_, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// ─── Start ─────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => log('SERVER', `MCP server running on port ${PORT}`));

module.exports = app;
