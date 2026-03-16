/**
 * ─────────────────────────────────────────────────────────────────────────────
 * QA Automation MCP Server
 * ─────────────────────────────────────────────────────────────────────────────
 * Full 11-step pipeline:
 *  1.  Jira story created
 *  2.  Webhook received by this server
 *  3.  MCP calls Claude → generate test cases
 *  4.  Claude returns structured test cases (steps, test data, expected results)
 *  5.  Create Zephyr test cycle + add test cases with full test script
 *  6.  MCP reads helpers/driver.js
 *  7.  MCP calls Claude → generate Selenium Node.js scripts
 *  8.  Scripts pushed to GitHub → CI/CD triggers automatically
 *  9.  CI/CD produces results JSON (name, status, expected, actual, duration)
 * 10.  MCP receives results → updates Zephyr cycle with status + comments
 * 11.  Zephyr cycle complete, pipeline ends
 * ─────────────────────────────────────────────────────────────────────────────
 */

const express     = require('express');
const axios       = require('axios');
const Anthropic   = require('@anthropic-ai/sdk');
const { Octokit } = require('@octokit/rest');
const path        = require('path');
const fs          = require('fs');

const config  = require('../config/pipeline.config.json');
const secrets = require('../config/secrets.json');

const app       = express();
app.use(express.json({ limit: '10mb' }));

const anthropic = new Anthropic({ apiKey: secrets.anthropic.apiKey });
const octokit   = new Octokit({ auth: secrets.github.token });

// ─── Deduplication ────────────────────────────────────────────────────────────
let processingStories = new Set();

// ─── Step 6 · Load helpers/driver.js at startup ───────────────────────────────
let DRIVER_JS_CONTENT = '';
const DRIVER_PATHS = [
  path.join(__dirname, '../helpers/driver.js'),
  path.join(__dirname, 'driver.js'),
  path.join(process.cwd(), 'helpers/driver.js'),
];
for (const p of DRIVER_PATHS) {
  if (fs.existsSync(p)) {
    DRIVER_JS_CONTENT = fs.readFileSync(p, 'utf8');
    log('SERVER', `Loaded helpers/driver.js from: ${p}`);
    break;
  }
}
if (!DRIVER_JS_CONTENT) {
  console.warn('[SERVER] WARNING: helpers/driver.js not found — scripts will be pushed without it');
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function log(step, msg, data = '') {
  const ts = new Date().toISOString();
  console.log(`[${ts}] [${step}] ${msg}`, data ? JSON.stringify(data, null, 2) : '');
}

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function extractError(err) {
  if (err.response?.data) {
    return typeof err.response.data === 'object'
      ? JSON.stringify(err.response.data)
      : String(err.response.data);
  }
  return err.message;
}

function zephyrHeaders() {
  return {
    Authorization: `Bearer ${secrets.zephyr.apiToken}`,
    'Content-Type': 'application/json',
    Accept:         'application/json',
  };
}

function parseJson(raw) {
  let cleaned = raw.trim()
    .replace(/^```(?:json)?\n?/, '')
    .replace(/\n?```$/, '')
    .trim();
  const s = cleaned.indexOf('[');
  const e = cleaned.lastIndexOf(']');
  if (s === -1 || e === -1) throw new Error('Response does not contain a JSON array');
  return JSON.parse(cleaned.substring(s, e + 1));
}

// ─── Step 2 · Webhook endpoint ────────────────────────────────────────────────

app.post('/webhook/jira', async (req, res) => {
  try {
    const { issue } = req.body;
    if (!issue) return res.status(400).json({ error: 'No issue in payload' });

    const key = issue.key;
    if (processingStories.has(key)) {
      log('WEBHOOK', `Skipping duplicate for ${key}`);
      return res.status(200).json({ message: 'Already processing', storyKey: key });
    }
    processingStories.add(key);
    setTimeout(() => processingStories.delete(key), 120000);

    const story = {
      key,
      summary:            issue.fields.summary            || '',
      description:        issue.fields.description        || '',
      acceptanceCriteria: issue.fields.customfield_10016  || '',
      issueType:          issue.fields.issuetype?.name    || 'Story',
      priority:           issue.fields.priority?.name     || 'Medium',
    };

    log('WEBHOOK', `Received story: ${key}`, { summary: story.summary });

    res.status(202).json({ message: 'Processing started', storyKey: key });

    runPipeline(story).catch(err => {
      log('PIPELINE', `Fatal error for ${key}: ${extractError(err)}`);
      processingStories.delete(key);
    });

  } catch (err) {
    log('WEBHOOK', `Error: ${extractError(err)}`);
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

// ─── Main pipeline ────────────────────────────────────────────────────────────

async function runPipeline(story) {
  log('PIPELINE', `▶ Starting pipeline for ${story.key}`);

  // ── Step 3-4 · Claude generates test cases ───────────────────────────────
  log('PIPELINE', `[3] Calling Claude to generate test cases...`);
  const testCases = await generateTestCases(story);
  log('PIPELINE', `[3] ✓ Generated ${testCases.length} test cases`);

  // ── Step 5 · Zephyr — create cycle + test cases with full test script ─────
  log('PIPELINE', `[5] Creating Zephyr test cycle and test cases...`);
  const { testKeys, cycleId } = await createZephyrCycleAndTests(story, testCases);
  log('PIPELINE', `[5] ✓ Cycle: ${cycleId} | Tests: ${testKeys.join(', ')}`);

  // ── Step 6-7 · Claude generates Selenium scripts ──────────────────────────
  log('PIPELINE', `[6] Reading helpers/driver.js and generating Selenium scripts...`);
  const scripts = await generateSeleniumScripts(testCases, testKeys);
  log('PIPELINE', `[7] ✓ Generated ${scripts.length} script files`);

  // ── Step 8 · Push to GitHub → CI/CD triggers ─────────────────────────────
  log('PIPELINE', `[8] Pushing scripts to GitHub...`);
  await pushToGitHub(story, testCases, testKeys, cycleId, scripts);
  log('PIPELINE', `[8] ✓ Scripts pushed — GitHub Actions will run automatically`);

  log('PIPELINE', `✅ Pipeline complete for ${story.key}`);
}

// ─── Step 3-4 · Claude generates test cases ──────────────────────────────────

async function generateTestCases(story) {
  log('CLAUDE', `Generating test cases for: "${story.summary}"`);

  const prompt = `
You are a senior QA engineer. Generate test cases for this Jira story targeting SauceDemo (https://www.saucedemo.com).

Project:
${JSON.stringify(config.project, null, 2)}

Locators:
${JSON.stringify(config.pages, null, 2)}

Jira Story:
  Key:                 ${story.key}
  Summary:             ${story.summary}
  Description:         ${story.description}
  Acceptance Criteria: ${story.acceptanceCriteria}

Return ONLY a JSON array. Each test case schema:
{
  "id": "TC-001",
  "name": "Short descriptive test name",
  "objective": "What this test validates",
  "preconditions": "Preconditions as a single string",
  "flowRef": "valid_login | invalid_login | add_product_to_cart | other",
  "priority": "High | Medium | Low",
  "tags": ["smoke"],
  "steps": [
    {
      "step": 1,
      "action": "Clear human-readable action to perform",
      "testData": "Specific input values for this step e.g. Username: standard_user, Password: secret_sauce",
      "expectedResult": "Clear expected outcome after this step"
    }
  ]
}

Rules:
- Max 8 test cases
- Max 5 steps per test case
- Cover: happy paths, negative scenarios, edge cases
- Steps must be human-readable and clear
- testData per step must be a plain string (not object) e.g. "Username: standard_user"
- Keep all values short and concise
- Return raw JSON array only — no markdown, no code fences
`.trim();

  const response = await anthropic.messages.create({
    model:      'claude-sonnet-4-5',
    max_tokens: 16000,
    messages:   [{ role: 'user', content: prompt }],
  });

  const testCases = parseJson(response.content[0].text);
  testCases.forEach((tc, i) => { tc.id = `TC-${String(i + 1).padStart(3, '0')}`; });
  return testCases;
}

// ─── Step 5 · Create Zephyr cycle + test cases with test script ───────────────

async function createZephyrCycleAndTests(story, testCases) {
  const { baseUrl, projectKey } = config.zephyr;
  const headers = zephyrHeaders();

  log('ZEPHYR', `Creating ${testCases.length} test cases in project ${projectKey}`);
  const testKeys = [];

  for (const tc of testCases) {
    // ── Create test case (no steps yet) ──────────────────────────────────────
    const payload = {
      projectKey,
      name:         tc.name,
      objective:    tc.objective    || '',
      precondition: tc.preconditions || '',
      estimatedTime: 60000,
      labels:        Array.isArray(tc.tags) ? tc.tags : [],
      priority:      mapPriority(tc.priority),
      status:        'Draft',
    };

    let testKey;
    try {
      const resp = await axios.post(`${baseUrl}/testcases`, payload, { headers });
      testKey = resp.data.key;
      testKeys.push(testKey);
      log('ZEPHYR', `  ✓ Created: ${testKey} — ${tc.name}`);
    } catch (err) {
      log('ZEPHYR', `  ✗ Failed to create "${tc.name}": ${extractError(err)}`);
      throw err;
    }

    // ── Add steps to Test Script section ─────────────────────────────────────
    // Format confirmed: POST /teststeps { mode: "OVERWRITE", items: [{ inline: {...} }] }
    if (tc.steps?.length) {
      const stepItems = tc.steps.map(s => ({
        inline: {
          description:    s.action         || '',
          testData:       String(s.testData || ''),
          expectedResult: s.expectedResult  || '',
        },
      }));

      try {
        await axios.post(
          `${baseUrl}/testcases/${testKey}/teststeps`,
          { mode: 'OVERWRITE', items: stepItems },
          { headers }
        );
        log('ZEPHYR', `  ✓ Added ${stepItems.length} steps to ${testKey}`);
      } catch (stepErr) {
        log('ZEPHYR', `  ✗ Steps failed for ${testKey}: ${extractError(stepErr)}`);
        // Don't throw — test case was created, steps are optional
      }
    }
  }

  // ── Create test cycle ─────────────────────────────────────────────────────
  let cycleId;
  try {
    const cycleResp = await axios.post(
      `${baseUrl}/testcycles`,
      {
        projectKey,
        name:        `${story.key} — Auto Regression Cycle`,
        description: `Generated by QA pipeline for: ${story.summary}`,
      },
      { headers }
    );
    cycleId = cycleResp.data.key || cycleResp.data.id;
    log('ZEPHYR', `  ✓ Created cycle: ${cycleId}`);
  } catch (err) {
    log('ZEPHYR', `  ✗ Failed to create cycle: ${extractError(err)}`);
    throw err;
  }

  // ── Add each test case to the cycle as an execution ───────────────────────
  for (const testKey of testKeys) {
    try {
      await axios.post(
        `${baseUrl}/testexecutions`,
        {
          projectKey,
          testCycleKey: cycleId,
          testCaseKey:  testKey,
          statusName:   'Not Executed',
        },
        { headers }
      );
      log('ZEPHYR', `  ✓ Added ${testKey} → cycle ${cycleId}`);
    } catch (err) {
      log('ZEPHYR', `  ✗ Failed to add ${testKey} to cycle: ${extractError(err)}`);
      throw err;
    }
  }

  // ── Save cycle meta for CI/CD to read ────────────────────────────────────
  const metaPath = path.join(__dirname, '../config/cycle_meta.json');
  fs.writeFileSync(metaPath, JSON.stringify({ cycleId, testKeys, storyKey: '' }, null, 2));

  return { testKeys, cycleId };
}

function mapPriority(p) {
  return { High: 'High', Medium: 'Medium', Low: 'Low' }[p] || 'Medium';
}

// ─── Step 6-7 · Claude generates Selenium scripts ────────────────────────────

async function generateSeleniumScripts(testCases, testKeys) {
  log('CLAUDE', 'Generating Selenium Node.js scripts');

  const driverSnippet = DRIVER_JS_CONTENT
    ? `The helpers/driver.js file provides these exports:
- buildDriver()  — creates Edge headless WebDriver
- login(driver, username, password) — logs in and waits for /inventory.html
- logout(driver) — clicks burger menu → logout
- runSuite(suiteName, tests) — runs all tests, creates fresh driver per test,
  saves results to: results-{suite-name}.json at project root
- SELECTORS — all page locators (login, header, inventory, cart, checkout)
- BASE_URL — https://www.saucedemo.com`
    : 'helpers/driver.js is not available — implement driver setup inline.';

  const prompt = `
You are a senior Selenium automation engineer generating Node.js test scripts for SauceDemo.

${driverSnippet}

EXACT SCRIPT PATTERN — copy this structure precisely:

const { until, By } = require("selenium-webdriver");
const { login, logout, runSuite, SELECTORS, BASE_URL } = require("../helpers/driver");

const tests = [
  // ── Example 1: Login test using SELECTORS ──
  {
    name:     "Valid login redirects to inventory page",
    expected: "User is redirected to /inventory.html",
    fn: async (driver) => {
      await driver.get(BASE_URL);
      // CORRECT: pass SELECTORS.login.username directly to elementLocated
      await driver.wait(until.elementLocated(SELECTORS.login.username), 10000);
      await driver.findElement(SELECTORS.login.username).sendKeys("standard_user");
      await driver.findElement(SELECTORS.login.password).sendKeys("secret_sauce");
      await driver.findElement(SELECTORS.login.loginBtn).click();
      await driver.wait(until.urlContains("/inventory.html"), 8000);
      const url = await driver.getCurrentUrl();
      return {
        expectedResult: "User is redirected to /inventory.html",
        actualResult:   "Redirected to: " + url,
      };
    },
  },

  // ── Example 2: Error message test ──
  {
    name:     "Empty credentials shows error",
    expected: "Error message: Username is required",
    fn: async (driver) => {
      await driver.get(BASE_URL);
      await driver.wait(until.elementLocated(SELECTORS.login.loginBtn), 10000);
      await driver.findElement(SELECTORS.login.loginBtn).click();
      // CORRECT: pass SELECTORS.login.errorMsg directly — it is already a By locator
      const errorEl = await driver.wait(until.elementLocated(SELECTORS.login.errorMsg), 8000);
      const text = await errorEl.getText();
      if (!text.includes("Username is required")) throw new Error("Unexpected error: " + text);
      return {
        expectedResult: "Error message: Username is required",
        actualResult:   "Error shown: " + text,
      };
    },
  },
];

runSuite("Login Tests", tests);

CRITICAL LOCATOR RULES:
- SELECTORS.login.username IS already a By.id("user-name") object — pass it directly
- CORRECT: driver.wait(until.elementLocated(SELECTORS.login.username), 10000)
- CORRECT: driver.findElement(SELECTORS.login.username)
- WRONG:   driver.findElement(By.id(SELECTORS.login.username))  ← double-wrapped = Invalid locator
- WRONG:   driver.findElement({ id: SELECTORS.login.username }) ← not a By object
- NEVER wrap SELECTORS values in By.id() or By.css() — they are ALREADY By objects

RESULTS JSON produced by runSuite (saved to results-{suite-name}.json):
{
  "suite": "Suite Name Tests",
  "browser": "Microsoft Edge (headless)",
  "environment": "Linux (CI)",
  "startTime": "ISO",
  "endTime": "ISO",
  "duration": "Xs",
  "summary": { "total": N, "passed": N, "failed": N, "status": "ALL PASSED|SOME FAILED" },
  "tests": [
    {
      "id": 1, "name": "...", "status": "PASS|FAIL",
      "expectedResult": "...", "actualResult": "...",
      "executionNote": "", "errorDetail": "", "duration": "Xs"
    }
  ]
}

Project credentials:
- Valid user:    standard_user / secret_sauce
- Locked user:  locked_out_user / secret_sauce
- Invalid user: wrong_user / wrong_password

Test cases to implement (id → Zephyr key → name):
${testCases.map((tc, i) => `${tc.id} → ${testKeys[i]}: ${tc.name}`).join('\n')}

Full test case details:
${JSON.stringify(testCases, null, 2)}

INSTRUCTIONS:
1. Group test cases by flowRef into separate files
2. Filename pattern: tests/01-login.test.js, tests/02-cart.test.js etc.
3. Each test in the array = one test case from above
4. Use SELECTORS — never hardcode any CSS/ID locators
5. Each fn MUST return { expectedResult, actualResult }
6. Make tests independent — runSuite gives each a fresh driver
7. DO NOT generate helpers/driver.js — it is provided separately

Return ONLY a JSON array:
[
  { "filename": "tests/01-login.test.js", "content": "full file source code" }
]

CRITICAL RULES — violating any of these will break the pipeline:
1. Every object MUST have non-empty "filename" starting with tests/
2. Every object MUST have non-empty "content" with complete, syntactically valid JS
3. NEVER use chai, mocha, jasmine, jest or any test framework — use runSuite only
4. NEVER use require("chai") or require("mocha") — they are not installed
5. NEVER use template literals with backticks in actualResult/expectedResult strings — use string concatenation instead
   WRONG:  actualResult: BACKTICK + "URL is: " + url + BACKTICK
   RIGHT:  actualResult: "URL is: " + url
6. NEVER mix backtick template literals and double-quoted strings in the same expression
7. Always close all brackets, braces and parentheses — no truncated files
8. Only test features that actually exist in SauceDemo — do NOT generate tests for registration, signup, or features that don't exist
9. Return raw JSON array only — no markdown, no code fences, no explanation
`.trim();

  const response = await anthropic.messages.create({
    model:      'claude-sonnet-4-5',
    max_tokens: 16000,
    messages:   [{ role: 'user', content: prompt }],
  });

  const scripts = parseJson(response.content[0].text);

  // Filter empty scripts
  const validScripts = scripts.filter(s => s.filename?.trim() && s.content?.trim());

  // Fix common Claude template literal mistakes in generated scripts
  // Replace backtick template literals in string values with concatenation
  const fixedScripts = validScripts.map(s => {
    let content = s.content;

    // Fix mixed quote template literals that cause SyntaxError
    // e.g. actualResult: `some text ${var}." → actualResult: "some text " + var + "."
    // We do a basic fix: ensure no unclosed backtick template literals
    // by replacing simple `text ${var}` patterns with "text " + var
    content = content
      // Remove chai/mocha imports — they are not installed
      .replace(/const\s*\{[^}]+\}\s*=\s*require\(.[chai|mocha].\);?\n?/g, '')
      .replace(/const\s*\w+\s*=\s*require\(.[chai|mocha].\);?\n?/g, '');

    return { ...s, content };
  });

  log('CLAUDE', 'Scripts generated and sanitized: ' + fixedScripts.map(s => s.filename).join(', '));
  return fixedScripts;
}

// ─── Step 8 · Push to GitHub → triggers CI/CD ────────────────────────────────

async function pushToGitHub(story, testCases, testKeys, cycleId, scripts) {
  const { owner, repo, branch } = config.github;
  const commitBranch = `qa/auto-${slugify(story.key)}-${Date.now()}`;

  log('GITHUB', `Pushing to ${owner}/${repo} → branch ${commitBranch}`);

  // Get base SHA
  const { data: ref } = await octokit.git.getRef({ owner, repo, ref: `heads/${branch}` });
  const baseSha = ref.object.sha;

  const treeItems = [];

  // ── 1. Test scripts generated by Claude ───────────────────────────────────
  for (const { filename, content } of scripts) {
    const { data: blob } = await octokit.git.createBlob({
      owner, repo,
      content:  Buffer.from(content).toString('base64'),
      encoding: 'base64',
    });
    treeItems.push({ path: filename, mode: '100644', type: 'blob', sha: blob.sha });
    log('GITHUB', `  + ${filename}`);
  }

  // ── 2. helpers/driver.js ──────────────────────────────────────────────────
  if (DRIVER_JS_CONTENT) {
    const { data: blob } = await octokit.git.createBlob({
      owner, repo,
      content:  Buffer.from(DRIVER_JS_CONTENT).toString('base64'),
      encoding: 'base64',
    });
    treeItems.push({ path: 'helpers/driver.js', mode: '100644', type: 'blob', sha: blob.sha });
    log('GITHUB', '  + helpers/driver.js');
  }

  // ── 3. config/cycle_meta.json (so CI can read cycleId) ───────────────────
  const meta = { cycleId, testKeys, storyKey: story.key };
  const { data: metaBlob } = await octokit.git.createBlob({
    owner, repo,
    content:  Buffer.from(JSON.stringify(meta, null, 2)).toString('base64'),
    encoding: 'base64',
  });
  treeItems.push({ path: 'config/cycle_meta.json', mode: '100644', type: 'blob', sha: metaBlob.sha });
  log('GITHUB', '  + config/cycle_meta.json');

  // ── 4. package.json ───────────────────────────────────────────────────────
  const pkgJson = {
    name: 'saucedemo-qa-automation',
    version: '1.0.0',
    engines: { node: '>=24.0.0' },
    scripts: {
      test: 'for f in tests/*.test.js; do node "$f" || true; done',
    },
    dependencies: {
      'selenium-webdriver': '^4.21.0',
    },
    devDependencies: {
      'chai':  '^5.1.0',
      'mocha': '^10.4.0',
    },
  };
  const { data: pkgBlob } = await octokit.git.createBlob({
    owner, repo,
    content:  Buffer.from(JSON.stringify(pkgJson, null, 2)).toString('base64'),
    encoding: 'base64',
  });
  treeItems.push({ path: 'package.json', mode: '100644', type: 'blob', sha: pkgBlob.sha });
  log('GITHUB', '  + package.json');

  // ── 5. .github/workflows/qa-automation.yml ────────────────────────────────
  const workflow = buildWorkflow();
  const { data: wfBlob } = await octokit.git.createBlob({
    owner, repo,
    content:  Buffer.from(workflow).toString('base64'),
    encoding: 'base64',
  });
  treeItems.push({ path: '.github/workflows/qa-automation.yml', mode: '100644', type: 'blob', sha: wfBlob.sha });
  log('GITHUB', '  + .github/workflows/qa-automation.yml');

  // ── Commit + branch + PR ──────────────────────────────────────────────────
  const { data: tree }   = await octokit.git.createTree({ owner, repo, base_tree: baseSha, tree: treeItems });
  const { data: commit } = await octokit.git.createCommit({
    owner, repo,
    message: `[QA-AUTO] ${story.key}: ${testCases.length} tests generated by Claude`,
    tree:    tree.sha,
    parents: [baseSha],
  });
  await octokit.git.createRef({ owner, repo, ref: `refs/heads/${commitBranch}`, sha: commit.sha });
  await octokit.pulls.create({
    owner, repo,
    title: `[QA-AUTO] ${story.key} — ${testCases.length} Selenium tests`,
    body:  `**Story:** ${story.key} — ${story.summary}\n\n**Tests generated:** ${testCases.length}\n**Zephyr Cycle:** ${cycleId}\n\nMerging this PR triggers GitHub Actions CI.`,
    head:  commitBranch,
    base:  branch,
  });

  log('GITHUB', `✓ PR created on branch ${commitBranch}`);
}

// ─── GitHub Actions workflow ──────────────────────────────────────────────────

function buildWorkflow() {
  return `name: QA Automation — Selenium Edge

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
          echo "Edge installed: $(microsoft-edge --version)"

      - name: Install EdgeDriver
        run: |
          npm install -g edgedriver
          edgedriver --version

      - name: Install project dependencies
        run: npm install

      - name: Create results directory
        run: mkdir -p results

      - name: Remove old mocha-style test files
        run: |
          echo "Removing old mocha/chai test files that use describe()..."
          for f in tests/*.test.js; do
            if grep -q "describe(" "$f" 2>/dev/null; then
              echo "REMOVING old mocha file: $f"
              rm "$f"
            elif grep -q "require('chai')" "$f" 2>/dev/null || grep -q 'require("chai")' "$f" 2>/dev/null; then
              echo "REMOVING chai file: $f"
              rm "$f"
            else
              echo "OK (runSuite pattern): $f"
            fi
          done

      - name: Validate test file syntax before running
        run: |
          echo "Checking test file syntax..."
          for f in tests/*.test.js; do
            [ -f "$f" ] || continue
            node --check "$f" 2>&1
            if [ $? -ne 0 ]; then
              echo "SYNTAX ERROR — removing: $f"
              rm "$f"
            else
              echo "VALID: $f"
            fi
          done

      - name: Run all Selenium test suites
        id: run_tests
        run: |
          echo "Running test files..."
          shopt -s nullglob
          files=(tests/*.test.js)
          if [ \${#files[@]} -eq 0 ]; then
            echo "No test files found in tests/"
            exit 0
          fi
          for f in "\${files[@]}"; do
            echo "=== Running: $f ==="
            node "$f" 2>&1 || true
          done
          echo "All test suites finished"

      - name: Collect and merge results into test-results.json
        if: always()
        run: |
          mkdir -p results
          node << 'SCRIPT'
          const fs = require('fs');
          const path = require('path');

          // Collect all results-*.json files from project root
          const root = process.cwd();
          const files = fs.readdirSync(root).filter(f => f.startsWith('results-') && f.endsWith('.json'));
          console.log('Results files found:', files);

          let allTests   = [];
          let totPassed  = 0;
          let totFailed  = 0;

          for (const file of files) {
            try {
              const data = JSON.parse(fs.readFileSync(path.join(root, file)));
              const tests = data.tests || [];
              allTests  = allTests.concat(tests);
              totPassed += data.summary?.passed || 0;
              totFailed += data.summary?.failed || 0;
              // Move to results/
              fs.copyFileSync(path.join(root, file), path.join(root, 'results', file));
            } catch (e) {
              console.error('Could not parse', file, e.message);
            }
          }

          // Read cycleId
          let cycleId = 'unknown';
          try {
            cycleId = JSON.parse(fs.readFileSync('config/cycle_meta.json')).cycleId || 'unknown';
          } catch {}

          const combined = {
            timestamp:   new Date().toISOString(),
            environment: 'CI / Edge / Headless / Node 24',
            cycleId,
            summary: {
              total:   allTests.length,
              passed:  totPassed,
              failed:  totFailed,
              skipped: 0,
              status:  totFailed === 0 ? 'ALL PASSED' : 'SOME FAILED',
            },
            results: allTests.map(t => ({
              name:           t.name,
              status:         t.status,
              expectedResult: t.expectedResult || '',
              actualResult:   t.actualResult   || '',
              duration:       t.duration       || '0s',
              error:          t.errorDetail    || null,
            })),
          };

          fs.writeFileSync('results/test-results.json', JSON.stringify(combined, null, 2));
          console.log('Merged results written:', allTests.length, 'tests');
          SCRIPT

      - name: Print results summary
        if: always()
        run: |
          echo "============================================"
          echo "          TEST RESULTS SUMMARY"
          echo "============================================"
          if [ -f results/test-results.json ]; then
            node -e "
              const r = JSON.parse(require('fs').readFileSync('results/test-results.json'));
              console.log('Cycle ID : ' + r.cycleId);
              console.log('Total    : ' + r.summary.total);
              console.log('Passed   : ' + r.summary.passed);
              console.log('Failed   : ' + r.summary.failed);
              console.log('Status   : ' + r.summary.status);
              console.log('--------------------------------------------');
              (r.results || []).forEach(t => {
                const icon = t.status === 'PASS' ? '✓' : '✗';
                console.log(icon + ' [' + t.status + '] ' + t.name);
                if (t.status === 'FAIL') {
                  console.log('   Expected: ' + t.expectedResult);
                  console.log('   Actual:   ' + t.actualResult);
                }
              });
              console.log('============================================');
            "
          else
            echo "No test-results.json found"
          fi

      - name: Upload test-results.json artifact
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

      - name: Step 10 — Send results to MCP server → update Zephyr cycle
        if: always()
        run: |
          if [ -f results/test-results.json ] && [ -n "\${{ secrets.MCP_SERVER_URL }}" ]; then
            echo "Sending results to MCP server..."
            HTTP_STATUS=$(curl -s -o /tmp/zephyr_response.json -w "%{http_code}" \\
              -X POST "\${{ secrets.MCP_SERVER_URL }}/zephyr/update-results" \\
              -H "Content-Type: application/json" \\
              -d @results/test-results.json)
            echo "Response HTTP \$HTTP_STATUS:"
            cat /tmp/zephyr_response.json
          else
            echo "Skipping — MCP_SERVER_URL not set or no results file"
          fi

      - name: Fail if any tests failed
        if: always()
        run: |
          if [ -f results/test-results.json ]; then
            node -e "
              const r = JSON.parse(require('fs').readFileSync('results/test-results.json'));
              if (r.summary.failed > 0) {
                console.error(r.summary.failed + ' test(s) FAILED');
                process.exit(1);
              }
            "
          fi
`;
}

// ─── Step 10 · Receive results from CI → full Zephyr cycle update ─────────────
//
// Flow per test case:
//  1. Open the test cycle → find the execution for this test case
//  2. Start execution (set to "In Progress")
//  3. Update actual results per step in the test script
//  4. Post comment with full details (expected, actual, duration, error)
//  5. Set final status: Pass / Fail
//  6. Repeat for every test case in the results JSON
// ─────────────────────────────────────────────────────────────────────────────

app.post('/zephyr/update-results', async (req, res) => {
  try {
    const body    = req.body;
    const results = body.results || [];
    const summary = body.summary || {};

    if (!results.length) return res.status(400).json({ error: 'No results in payload' });

    // ── Resolve cycleId ───────────────────────────────────────────────────────
    let cycleId  = body.cycleId || null;
    let testKeys = [];
    try {
      const meta = JSON.parse(fs.readFileSync(path.join(__dirname, '../config/cycle_meta.json')));
      if (!cycleId) cycleId = meta.cycleId;
      testKeys = meta.testKeys || [];
    } catch { /* ignore */ }
    if (!cycleId) return res.status(400).json({ error: 'cycleId not found in payload or cycle_meta.json' });

    const { baseUrl, projectKey } = config.zephyr;
    const headers  = zephyrHeaders();
    const statusMap = { PASS: 'Pass', FAIL: 'Fail', SKIP: 'Blocked' };

    log('ZEPHYR', '═══════════════════════════════════════════════════════');
    log('ZEPHYR', `Step 10 — Updating Zephyr Cycle: ${cycleId}`);
    log('ZEPHYR', `Results: Total=${summary.total} | Passed=${summary.passed} | Failed=${summary.failed}`);
    log('ZEPHYR', '═══════════════════════════════════════════════════════');

    let updated = 0;
    let skipped = 0;
    const updateLog = [];

    // ── Step 1 · Get all executions in the cycle ──────────────────────────────
    let cycleExecutions = [];
    try {
      const execResp = await axios.get(
        `${baseUrl}/testexecutions?testCycle=${cycleId}&projectKey=${projectKey}&maxResults=200`,
        { headers }
      );
      cycleExecutions = execResp.data?.values || execResp.data?.results || [];
      log('ZEPHYR', `Found ${cycleExecutions.length} executions in cycle ${cycleId}`);
    } catch (err) {
      log('ZEPHYR', `Could not fetch cycle executions: ${extractError(err)} — will use testKeys by index`);
    }

    // ── Step 2-7 · Process each test result ───────────────────────────────────
    for (let i = 0; i < results.length; i++) {
      const r = results[i];

      log('ZEPHYR', `\n── [${i + 1}/${results.length}] Processing: "${r.name}" → ${r.status}`);

      // Find the Zephyr test case key — match by index from testKeys
      const testCaseKey = r.testCaseKey || testKeys[i] || null;
      if (!testCaseKey) {
        log('ZEPHYR', `  Skipping — no Zephyr key for result ${i + 1} "${r.name}"`);
        skipped++;
        continue;
      }

      // Find the execution ID for this test case in the cycle
      let executionKey = null;
      const matchedExec = cycleExecutions.find(e =>
        e.testCase?.key === testCaseKey ||
        e.testCaseKey   === testCaseKey ||
        e.key           === testCaseKey
      );
      if (matchedExec) {
        executionKey = matchedExec.key || matchedExec.id;
        log('ZEPHYR', `  Matched execution: ${executionKey} for test case ${testCaseKey}`);
      } else {
        executionKey = testCaseKey;
        log('ZEPHYR', `  Using testCaseKey directly: ${testCaseKey}`);
      }

      // ── Step 3 · Fetch test steps from Zephyr to match actual results ────────
      let existingSteps = [];
      try {
        const stepsResp = await axios.get(
          `${baseUrl}/testcases/${testCaseKey}/teststeps`,
          { headers }
        );
        existingSteps = stepsResp.data?.values
          || stepsResp.data?.steps
          || stepsResp.data
          || [];
        if (!Array.isArray(existingSteps)) existingSteps = [];
        log('ZEPHYR', `  Fetched ${existingSteps.length} existing steps for ${testCaseKey}`);
      } catch (err) {
        log('ZEPHYR', `  Could not fetch steps for ${testCaseKey}: ${extractError(err)}`);
      }

      // ── Step 4 · Build comment with full execution details ───────────────────
      const commentLines = [
        '=== Automated Test Execution Result ===',
        'Test Case  : ' + r.name,
        'Status     : ' + r.status + (r.status === 'PASS' ? ' ✓' : ' ✗'),
        'Duration   : ' + (r.duration || 'N/A'),
        '',
        'Expected Result:',
        r.expectedResult || '(not recorded)',
        '',
        'Actual Result:',
        r.actualResult   || '(not recorded)',
      ];
      if (r.error) {
        commentLines.push('', 'Error Details:', r.error);
      }
      commentLines.push('', '=== End of Result ===');
      const comment = commentLines.join('\n');

      // ── Step 5 · Update execution status, comment, and duration ─────────────
      try {
        // Convert duration string like "3.45s" to milliseconds
        let durationMs = 0;
        if (r.duration) {
          const match = String(r.duration).match(/([\d.]+)/);
          if (match) durationMs = Math.round(parseFloat(match[1]) * 1000);
        }

        await axios.put(
          `${baseUrl}/testexecutions/${executionKey}`,
          {
            projectKey,
            testCycleKey:    cycleId,
            statusName:      statusMap[r.status] || 'Not Executed',
            comment:         comment,
            executionTime:   durationMs,
            environmentName: 'CI / Edge / Headless / Node 24',
            executedById:    secrets.zephyr.assignee || undefined,
          },
          { headers }
        );
        log('ZEPHYR', `  ✓ Status updated: ${executionKey} → ${r.status}`);
        updated++;
      } catch (err) {
        log('ZEPHYR', `  ✗ Status update failed for ${executionKey}: ${extractError(err)}`);
      }

      // ── Step 5b · Update actual results per step in test script ─────────────
      // Zephyr Scale Cloud: PATCH /testcases/{key}/teststeps to update actualResult per step
      if (existingSteps.length > 0) {
        try {
          // Build updated steps with actualResult filled in
          const updatedSteps = existingSteps.map((step, idx) => {
            const inline = step.inline || step;
            return {
              inline: {
                description:    inline.description    || inline.step   || '',
                testData:       inline.testData        || inline.data   || '',
                expectedResult: inline.expectedResult  || inline.result || '',
                actualResult:   r.actualResult         || '',
              },
            };
          });

          await axios.post(
            `${baseUrl}/testcases/${testCaseKey}/teststeps`,
            { mode: 'OVERWRITE', items: updatedSteps },
            { headers }
          );
          log('ZEPHYR', `  ✓ Actual results written to ${updatedSteps.length} test steps`);
        } catch (err) {
          log('ZEPHYR', `  ✗ Step actual results update failed: ${extractError(err)}`);
        }
      }

      updateLog.push({
        testCaseKey,
        executionKey,
        name:     r.name,
        status:   r.status,
        duration: r.duration || '0s',
      });

      log('ZEPHYR', `  ✓ Complete: ${testCaseKey} [${r.status}]`);
    }

    log('ZEPHYR', '\n═══════════════════════════════════════════════════════');
    log('ZEPHYR', `✅ Cycle ${cycleId} fully updated`);
    log('ZEPHYR', `   Updated: ${updated} | Skipped: ${skipped}`);
    log('ZEPHYR', '═══════════════════════════════════════════════════════');

    res.json({
      message:    'Zephyr cycle fully updated',
      cycleId,
      updated,
      skipped,
      summary,
      updateLog,
    });

  } catch (err) {
    log('ZEPHYR-UPDATE', `Error: ${extractError(err)}`);
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

// ─── Health check ─────────────────────────────────────────────────────────────

app.get('/health', (_, res) => res.json({
  status:    'ok',
  ts:        new Date().toISOString(),
  driverJs:  DRIVER_JS_CONTENT ? 'loaded' : 'missing',
}));

// ─── Start ────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  log('SERVER', `MCP server running on port ${PORT}`);
  log('SERVER', `driver.js: ${DRIVER_JS_CONTENT ? '✓ loaded' : '✗ NOT FOUND — place at helpers/driver.js'}`);
});

module.exports = app;
