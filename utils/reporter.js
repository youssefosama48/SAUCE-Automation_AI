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

  addResult(testCaseKey, tcId, name, status, duration, error = null) {
    this.results.push({
      testCaseKey,
      tcId,
      name,
      status,
      duration,
      error
    });
  }

  async writeResults() {
    const resultsDir = path.join(process.cwd(), 'results');
    
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const report = {
      timestamp: new Date().toISOString(),
      cycleId: this.cycleId || 'default-cycle',
      results: this.results
    };

    const filePath = path.join(resultsDir, 'test-results.json');
    
    fs.writeFileSync(filePath, JSON.stringify(report, null, 2), 'utf8');
    
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