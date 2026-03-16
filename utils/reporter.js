const fs = require('fs');
const path = require('path');

class TestReporter {
  constructor() {
    this.results = [];
    this.cycleId = null;
  }

  setCycleId(cycleId) {
    this.cycleId = cycleId;
  }

  addResult(testResult) {
    this.results.push({
      testCaseKey: testResult.testCaseKey,
      tcId: testResult.tcId,
      name: testResult.name,
      status: testResult.status,
      duration: testResult.duration || 0,
      error: testResult.error || null
    });
  }

  writeResults() {
    const resultsDir = path.join(process.cwd(), 'results');
    
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const report = {
      timestamp: new Date().toISOString(),
      cycleId: this.cycleId,
      results: this.results
    };

    const filePath = path.join(resultsDir, 'test-results.json');
    fs.writeFileSync(filePath, JSON.stringify(report, null, 2));
    
    console.log(`\nTest results written to: ${filePath}`);
    console.log(`Total tests: ${this.results.length}`);
    console.log(`Passed: ${this.results.filter(r => r.status === 'PASS').length}`);
    console.log(`Failed: ${this.results.filter(r => r.status === 'FAIL').length}`);
  }

  getResults() {
    return this.results;
  }

  clearResults() {
    this.results = [];
  }
}

module.exports = new TestReporter();