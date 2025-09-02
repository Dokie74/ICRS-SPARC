#!/usr/bin/env node
// tests/run-tests.js
// Test execution script for ICRS SPARC Shipping and Receiving comprehensive test suites

import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

class TestRunner {
  constructor() {
    this.results = {
      backendServices: null,
      backendApi: null,
      frontendComponents: null,
      modalWorkflows: null,
      e2eWorkflows: null,
      startTime: new Date(),
      endTime: null
    };
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  async runCommand(command, args = [], options = {}) {
    return new Promise((resolve, reject) => {
      this.log(`Running: ${command} ${args.join(' ')}`, 'blue');
      
      const process = spawn(command, args, {
        stdio: 'inherit',
        shell: true,
        ...options
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve(code);
        } else {
          reject(new Error(`Command failed with exit code ${code}`));
        }
      });

      process.on('error', (error) => {
        reject(error);
      });
    });
  }

  async checkPrerequisites() {
    this.log('🔍 Checking prerequisites...', 'cyan');
    
    try {
      // Check if frontend and backend are running
      const frontendResponse = await fetch('http://localhost:3000').catch(() => null);
      const backendResponse = await fetch('http://localhost:5000/health').catch(() => null);
      
      if (!frontendResponse) {
        throw new Error('Frontend not running on localhost:3000. Please start with: npm run dev');
      }
      
      if (!backendResponse) {
        this.log('⚠️  Backend not running on localhost:5000. Some tests may fail.', 'yellow');
      }
      
      // Check test dependencies
      const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8'));
      const requiredDeps = ['@playwright/test', 'jest', '@testing-library/react'];
      
      for (const dep of requiredDeps) {
        if (!packageJson.devDependencies?.[dep] && !packageJson.dependencies?.[dep]) {
          this.log(`⚠️  Missing dependency: ${dep}`, 'yellow');
        }
      }
      
      this.log('✅ Prerequisites check completed', 'green');
      return true;
      
    } catch (error) {
      this.log(`❌ Prerequisites check failed: ${error.message}`, 'red');
      return false;
    }
  }

  async runBackendServiceTests() {
    this.log('🔧 Running backend service tests...', 'cyan');
    
    try {
      await this.runCommand('npx', ['jest', 
        'tests/backend/services/',
        '--coverage', 
        '--coverageDirectory=test-results/coverage/backend-services',
        '--testTimeout=30000'
      ], {
        env: { ...process.env, NODE_ENV: 'test' }
      });
      
      this.results.backendServices = { passed: true };
      this.log('✅ Backend service tests passed', 'green');
      
    } catch (error) {
      this.results.backendServices = { passed: false, error: error.message };
      this.log('❌ Backend service tests failed', 'red');
      throw error;
    }
  }

  async runBackendApiTests() {
    this.log('🌐 Running backend API integration tests...', 'cyan');
    
    try {
      await this.runCommand('npx', ['jest', 
        'tests/backend/api/',
        '--coverage',
        '--coverageDirectory=test-results/coverage/backend-api',
        '--testTimeout=45000',
        '--runInBand' // Run sequentially for database tests
      ], {
        env: { ...process.env, NODE_ENV: 'test' }
      });
      
      this.results.backendApi = { passed: true };
      this.log('✅ Backend API tests passed', 'green');
      
    } catch (error) {
      this.results.backendApi = { passed: false, error: error.message };
      this.log('❌ Backend API tests failed', 'red');
      throw error;
    }
  }

  async runFrontendComponentTests() {
    this.log('🎨 Running frontend component tests...', 'cyan');
    
    try {
      await this.runCommand('npx', ['jest', 
        'tests/frontend/',
        '--coverage',
        '--coverageDirectory=test-results/coverage/frontend',
        '--testTimeout=20000',
        '--setupFilesAfterEnv=<rootDir>/tests/jest.setup.js'
      ], {
        env: { ...process.env, NODE_ENV: 'test' }
      });
      
      this.results.frontendComponents = { passed: true };
      this.log('✅ Frontend component tests passed', 'green');
      
    } catch (error) {
      this.results.frontendComponents = { passed: false, error: error.message };
      this.log('❌ Frontend component tests failed', 'red');
      throw error;
    }
  }

  async runModalWorkflowTests() {
    this.log('🎭 Running modal workflow tests...', 'cyan');
    
    try {
      await this.runCommand('npx', ['jest', 
        'tests/frontend/modals/',
        '--coverage',
        '--coverageDirectory=test-results/coverage/modals',
        '--testTimeout=25000',
        '--setupFilesAfterEnv=<rootDir>/tests/jest.setup.js'
      ], {
        env: { ...process.env, NODE_ENV: 'test' }
      });
      
      this.results.modalWorkflows = { passed: true };
      this.log('✅ Modal workflow tests passed', 'green');
      
    } catch (error) {
      this.results.modalWorkflows = { passed: false, error: error.message };
      this.log('❌ Modal workflow tests failed', 'red');
      throw error;
    }
  }

  async runE2EWorkflowTests() {
    this.log('🌐 Running E2E workflow tests...', 'cyan');
    
    try {
      await this.runCommand('npx', ['playwright', 'test', 
        'tests/e2e/',
        '--config=tests/playwright.config.js',
        '--reporter=html,json',
        '--output-dir=test-results/playwright'
      ]);
      
      this.results.e2eWorkflows = { passed: true };
      this.log('✅ E2E workflow tests passed', 'green');
      
    } catch (error) {
      this.results.e2eWorkflows = { passed: false, error: error.message };
      this.log('❌ E2E workflow tests failed', 'red');
      throw error;
    }
  }

  async generateReport() {
    this.log('📊 Generating test report...', 'cyan');
    
    this.results.endTime = new Date();
    const duration = this.results.endTime - this.results.startTime;
    
    const report = {
      timestamp: this.results.startTime.toISOString(),
      duration: `${Math.round(duration / 1000)}s`,
      testSuite: 'ICRS SPARC Shipping & Receiving',
      environment: {
        nodeEnv: process.env.NODE_ENV || 'test',
        platform: process.platform,
        nodeVersion: process.version
      },
      results: this.results,
      summary: {
        total: 5,
        passed: Object.values(this.results).filter(r => r?.passed).length,
        failed: Object.values(this.results).filter(r => r?.passed === false).length
      }
    };
    
    // Ensure test-results directory exists
    await fs.mkdir('test-results', { recursive: true }).catch(() => {});
    
    // Write detailed report
    await fs.writeFile(
      'test-results/test-report.json', 
      JSON.stringify(report, null, 2)
    );
    
    // Write summary for CI/CD
    const summaryLines = [
      '# Test Results Summary',
      '',
      `**Test Suite:** ${report.testSuite}`,
      `**Duration:** ${report.duration}`,
      `**Total Tests:** ${report.summary.total}`,
      `**Passed:** ${report.summary.passed}`,
      `**Failed:** ${report.summary.failed}`,
      '',
      '## Test Categories',
      '',
      `- **Backend Services:** ${this.results.backendServices?.passed ? '✅ PASSED' : '❌ FAILED'}`,
      `- **Backend API:** ${this.results.backendApi?.passed ? '✅ PASSED' : '❌ FAILED'}`,
      `- **Frontend Components:** ${this.results.frontendComponents?.passed ? '✅ PASSED' : '❌ FAILED'}`,
      `- **Modal Workflows:** ${this.results.modalWorkflows?.passed ? '✅ PASSED' : '❌ FAILED'}`,
      `- **E2E Workflows:** ${this.results.e2eWorkflows?.passed ? '✅ PASSED' : '❌ FAILED'}`,,
    ];
    
    if (report.summary.failed > 0) {
      summaryLines.push('', '## Failures');
      for (const [type, result] of Object.entries(this.results)) {
        if (result?.passed === false) {
          summaryLines.push(`- **${type}:** ${result.error}`);
        }
      }
    }
    
    await fs.writeFile('test-results/summary.md', summaryLines.join('\n'));
    
    this.log('✅ Test report generated', 'green');
    return report;
  }

  printSummary(report) {
    this.log('\n' + '='.repeat(60), 'blue');
    this.log('📋 TEST EXECUTION SUMMARY', 'blue');
    this.log('='.repeat(60), 'blue');
    
    this.log(`Test Suite: ${report.testSuite}`, 'cyan');
    this.log(`Duration: ${report.duration}`, 'cyan');
    this.log(`Timestamp: ${report.timestamp}`, 'cyan');
    
    this.log('\n📊 Results:', 'magenta');
    this.log(`  Total: ${report.summary.total}`, 'blue');
    this.log(`  Passed: ${report.summary.passed}`, 'green');
    this.log(`  Failed: ${report.summary.failed}`, report.summary.failed > 0 ? 'red' : 'green');
    
    this.log('\n🔍 Details:', 'magenta');
    for (const [type, result] of Object.entries(this.results)) {
      if (result) {
        const status = result.passed ? '✅ PASSED' : '❌ FAILED';
        const color = result.passed ? 'green' : 'red';
        this.log(`  ${type.toUpperCase()}: ${status}`, color);
        if (!result.passed && result.error) {
          this.log(`    Error: ${result.error}`, 'red');
        }
      }
    }
    
    this.log('\n📄 Reports:', 'magenta');
    this.log('  Detailed: test-results/test-report.json', 'blue');
    this.log('  Summary: test-results/summary.md', 'blue');
    
    if (process.env.CI) {
      this.log('\n🤖 CI/CD:', 'magenta');
      this.log('  Reports available as build artifacts', 'blue');
    }
    
    this.log('\n' + '='.repeat(60), 'blue');
  }

  async run() {
    try {
      this.log('🚀 Starting ICRS SPARC Shipping & Receiving Test Suite', 'green');
      this.log(`Timestamp: ${this.results.startTime.toISOString()}`, 'blue');
      
      // Check prerequisites
      const prereqsPassed = await this.checkPrerequisites();
      if (!prereqsPassed) {
        process.exit(1);
      }
      
      let hasFailures = false;
      
      // Run test suites
      try {
        await this.runBackendServiceTests();
      } catch (error) {
        hasFailures = true;
        if (process.argv.includes('--fail-fast')) {
          throw error;
        }
      }
      
      try {
        await this.runBackendApiTests();
      } catch (error) {
        hasFailures = true;
        if (process.argv.includes('--fail-fast')) {
          throw error;
        }
      }
      
      try {
        await this.runFrontendComponentTests();
      } catch (error) {
        hasFailures = true;
        if (process.argv.includes('--fail-fast')) {
          throw error;
        }
      }
      
      try {
        await this.runModalWorkflowTests();
      } catch (error) {
        hasFailures = true;
        if (process.argv.includes('--fail-fast')) {
          throw error;
        }
      }
      
      try {
        await this.runE2EWorkflowTests();
      } catch (error) {
        hasFailures = true;
        if (process.argv.includes('--fail-fast')) {
          throw error;
        }
      }
      
      // Generate report
      const report = await this.generateReport();
      this.printSummary(report);
      
      if (hasFailures) {
        this.log('\n❌ Some tests failed. Check the detailed report for more information.', 'red');
        process.exit(1);
      } else {
        this.log('\n🎉 All tests passed successfully!', 'green');
        process.exit(0);
      }
      
    } catch (error) {
      this.log(`\n💥 Test execution failed: ${error.message}`, 'red');
      
      // Try to generate report even if tests failed
      try {
        const report = await this.generateReport();
        this.printSummary(report);
      } catch (reportError) {
        this.log(`Failed to generate report: ${reportError.message}`, 'red');
      }
      
      process.exit(1);
    }
  }
}

// Command line interface
function printHelp() {
  console.log(`
ICRS SPARC Shipping & Receiving Test Runner

Usage: node run-tests.js [options]

Options:
  --backend-only       Run only backend tests (services + API)
  --frontend-only      Run only frontend tests (components + modals)
  --services-only      Run only backend service tests
  --api-only           Run only API integration tests
  --components-only    Run only frontend component tests
  --modals-only        Run only modal workflow tests
  --e2e-only           Run only E2E workflow tests
  --fail-fast          Stop on first failure
  --coverage           Generate coverage report
  --help, -h           Show this help message

Examples:
  node run-tests.js                     Run all test suites
  node run-tests.js --backend-only      Run backend services + API tests
  node run-tests.js --e2e-only          Run only E2E workflow tests
  node run-tests.js --fail-fast         Stop on first failure
  node run-tests.js --coverage          Generate detailed coverage
`);
}

// Main execution
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  printHelp();
  process.exit(0);
}

const runner = new TestRunner();

// Override run method based on command line arguments
if (process.argv.includes('--backend-only')) {
  runner.run = async function() {
    await this.checkPrerequisites();
    await this.runBackendServiceTests();
    await this.runBackendApiTests();
    const report = await this.generateReport();
    this.printSummary(report);
  };
} else if (process.argv.includes('--frontend-only')) {
  runner.run = async function() {
    await this.checkPrerequisites();
    await this.runFrontendComponentTests();
    await this.runModalWorkflowTests();
    const report = await this.generateReport();
    this.printSummary(report);
  };
} else if (process.argv.includes('--services-only')) {
  runner.run = async function() {
    await this.checkPrerequisites();
    await this.runBackendServiceTests();
    const report = await this.generateReport();
    this.printSummary(report);
  };
} else if (process.argv.includes('--api-only')) {
  runner.run = async function() {
    await this.checkPrerequisites();
    await this.runBackendApiTests();
    const report = await this.generateReport();
    this.printSummary(report);
  };
} else if (process.argv.includes('--components-only')) {
  runner.run = async function() {
    await this.checkPrerequisites();
    await this.runFrontendComponentTests();
    const report = await this.generateReport();
    this.printSummary(report);
  };
} else if (process.argv.includes('--modals-only')) {
  runner.run = async function() {
    await this.checkPrerequisites();
    await this.runModalWorkflowTests();
    const report = await this.generateReport();
    this.printSummary(report);
  };
} else if (process.argv.includes('--e2e-only')) {
  runner.run = async function() {
    await this.checkPrerequisites();
    await this.runE2EWorkflowTests();
    const report = await this.generateReport();
    this.printSummary(report);
  };
}

runner.run().catch((error) => {
  console.error('Test runner crashed:', error);
  process.exit(1);
});