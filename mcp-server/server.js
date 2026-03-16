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

async function generateSeleniumScripts(testCases, testKeys) {
  log('CLAUDE', 'Generating Selenium JS automation scripts');

  let prompt = `
You are a senior Selenium automation engineer.

Project configuration:
${JSON.stringify(config, null, 2)}

Generate complete, production-ready Selenium WebDriver JavaScript test files using Mocha + Chai.
Follow the Page Object Model strictly.

Rules:
- Use Microsoft Edge browser (config.project.browser)
- Use explicit waits via until module
- Follow the repository structure: tests/, pages/, utils/, config/
- Each test file must have a describe block matching the flowRef
- Each it() block must reference the Zephyr test key as a comment: // ZEPHYR: TC-001 -> ZS-123
- After all tests write results to ./results/test-results.json with shape:
  { "timestamp": "ISO", "cycleId": "...", "results": [{ "testCaseKey": "ZS-xxx", "tcId": "TC-001", "name": "...", "status": "PASS|FAIL", "duration": 0, "error": null }] }
- Import page objects from pages/ folder
- Use the exact locators from config

Test cases with their Zephyr keys:
${testCases.map((tc, i) => `${tc.id} -> ${testKeys[i]}: ${tc.name}`).join('\n')}

Full test cases:
${JSON.stringify(testCases, null, 2)}

Return ONLY a JSON array where each object has:
{
  "filename": "tests/valid_login.test.js",
  "content": "full file content as a string"
}

Include:
1. Page objects: pages/LoginPage.js, pages/InventoryPage.js
2. Test specs grouped by flowRef
3. utils/driver.js — Edge driver factory with headless support
4. utils/reporter.js — writes results JSON
5. config/test.config.js — runtime config

CRITICAL RULES for the JSON array:
- Every object MUST have a non-empty "filename" string like "tests/login.test.js"
- Every object MUST have a non-empty "content" string with the full file code
- filename MUST start with one of: tests/, pages/, utils/, config/
- NEVER return an object with an empty filename or empty content
- NEVER include objects without both filename and content fields

Return raw JSON array only — no markdown, no code fences, no extra text.
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

  // Add GitHub Actions workflow file — triggers CI on push/merge
  const workflowContent = `name: QA Automation — Selenium Edge

on:
  push:
    branches: [master, main]
    paths:
      - 'tests/**'
      - 'pages/**'
      - 'utils/**'
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

      - name: Run Selenium tests
        env:
          HEADLESS: 'true'
          MCP_SERVER_URL: \${{ secrets.MCP_SERVER_URL }}
          ZEPHYR_CYCLE_ID: \${{ vars.ZEPHYR_CYCLE_ID }}
        run: npm test 2>&1 | tee results/console.log || true

      - name: Generate results JSON if missing
        if: always()
        run: |
          mkdir -p results
          if [ ! -f results/test-results.json ]; then
            echo "Test results file not found — generating fallback JSON"
            TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)
            echo "{" > results/test-results.json
            echo "  \"timestamp\": \"$TIMESTAMP\"," >> results/test-results.json
            echo "  \"environment\": \"CI / Edge / Headless\"," >> results/test-results.json
            echo "  \"cycleId\": \"unknown\"," >> results/test-results.json
            echo "  \"summary\": { \"total\": 0, \"passed\": 0, \"failed\": 0, \"skipped\": 0, \"duration\": 0 }," >> results/test-results.json
            echo "  \"results\": []," >> results/test-results.json
            echo "  \"error\": \"Tests did not run or reporter did not write results\"" >> results/test-results.json
            echo "}" >> results/test-results.json
            echo "Fallback JSON created"
          fi
          cat results/test-results.json

      - name: Print results summary
        if: always()
        run: |
          echo "======================================"
          echo "         TEST RESULTS SUMMARY"
          echo "======================================"
          if [ -f results/test-results.json ]; then
            jq -r '"Timestamp: \(.timestamp)"' results/test-results.json || true
            jq -r '"Cycle ID:  \(.cycleId)"' results/test-results.json || true
            jq -r '"Total:     \(.summary.total)"' results/test-results.json || true
            jq -r '"Passed:    \(.summary.passed)"' results/test-results.json || true
            jq -r '"Failed:    \(.summary.failed)"' results/test-results.json || true
            jq -r '"Duration:  \(.summary.duration)ms"' results/test-results.json || true
            echo "--------------------------------------"
            echo "Individual results:"
            jq -r '.results[] | "[\(.status)] \(.tcId) — \(.name)"' results/test-results.json || echo "No individual results"
            echo "======================================"
          else
            echo "No results file found"
          fi

      - name: Upload results JSON artifact
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: test-results-\${{ github.run_number }}
          path: results/test-results.json
          retention-days: 30

      - name: Upload console log artifact
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: console-log-\${{ github.run_number }}
          path: results/console.log
          retention-days: 7

      - name: Update Zephyr test cycle status
        if: always()
        run: |
          if [ -f results/test-results.json ] && [ -n "\${{ secrets.MCP_SERVER_URL }}" ]; then
            echo "Posting results to Zephyr via MCP server..."
            HTTP_STATUS=$(curl -s -o /tmp/zephyr_resp.json -w "%{http_code}" \
              -X POST "\${{ secrets.MCP_SERVER_URL }}/zephyr/update-results" \
              -H "Content-Type: application/json" \
              -d @results/test-results.json)
            echo "Zephyr update HTTP status: $HTTP_STATUS"
            cat /tmp/zephyr_resp.json
          fi

      - name: Fail workflow if tests failed
        if: always()
        run: |
          if [ -f results/test-results.json ]; then
            FAILED=$(jq '.summary.failed // 0' results/test-results.json)
            if [ "$FAILED" -gt "0" ]; then
              echo "$FAILED test(s) FAILED"
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
      test: "mocha --recursive tests/ --timeout 60000 --reporter spec --exit",
      "test:json": "mocha --recursive tests/ --timeout 60000 --reporter json --exit > results/test-results-mocha.json || true"
    },
    dependencies: {
      "selenium-webdriver": "^4.21.0"
    },
    devDependencies: {
      "chai": "^5.1.0",
      "mocha": "^10.4.0"
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
    const { results } = req.body;
    if (!results?.length) return res.status(400).json({ error: 'No results provided' });

    let metaPath = path.join(__dirname, '../config/cycle_meta.json');
    let meta     = JSON.parse(fs.readFileSync(metaPath));
    let { cycleId } = meta;

    const { baseUrl, projectKey } = config.zephyr;
    const headers = zephyrHeaders();

    log('ZEPHYR', `Updating ${results.length} results on cycle ${cycleId}`);

    for (let r of results) {
      let statusMap = {
        'PASS': 'Pass',
        'FAIL': 'Fail',
        'SKIP': 'Blocked',
      };

      try {
        await axios.put(
          `${baseUrl}/testexecutions/${r.testCaseKey}`,
          {
            projectKey,
            testCycleKey:    cycleId,
            statusName:      statusMap[r.status] || 'Not Executed',
            comment:         r.error || `Automated run — ${r.status}`,
            environmentName: 'CI / Edge / Headless',
          },
          { headers }
        );
        log('ZEPHYR', `Updated ${r.testCaseKey} -> ${r.status}`);
      } catch (err) {
        log('ZEPHYR', `Failed to update ${r.testCaseKey}: ${extractError(err)}`);
      }
    }

    res.json({ message: 'Zephyr updated', updatedCount: results.length, cycleId });

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
