#!/usr/bin/env node
// tests/scripts/run-hts-tests.js
// Script to run HTS Browser E2E tests with various configurations

const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Test configurations
const TEST_CONFIGS = {
  'hts-basic': {
    name: 'HTS Browser Basic Tests',
    files: ['hts-browser.spec.js'],
    grep: undefined,
    timeout: 60000
  },
  'hts-api': {
    name: 'HTS Browser API Tests',
    files: ['hts-browser-api.spec.js'],
    grep: undefined,
    timeout: 120000
  },
  'hts-integration': {
    name: 'HTS Browser Integration Tests',
    files: ['hts-browser-integration.spec.js'],
    grep: undefined,
    timeout: 180000
  },
  'hts-errors': {
    name: 'HTS Browser Error Scenarios',
    files: ['hts-browser-error-scenarios.spec.js'],
    grep: undefined,
    timeout: 120000
  },
  'hts-all': {
    name: 'All HTS Browser Tests',
    files: ['hts-browser*.spec.js'],
    grep: undefined,
    timeout: 300000
  },
  'hts-smoke': {
    name: 'HTS Browser Smoke Tests',
    files: ['hts-browser.spec.js', 'hts-browser-api.spec.js'],
    grep: '@smoke|should load|should search|should initialize',
    timeout: 60000
  }
};

// Browser configurations
const BROWSER_CONFIGS = {
  'chromium': { name: 'Chromium', project: 'chromium' },
  'firefox': { name: 'Firefox', project: 'firefox' },
  'webkit': { name: 'WebKit', project: 'webkit' },
  'chrome': { name: 'Google Chrome', project: 'Google Chrome' },
  'edge': { name: 'Microsoft Edge', project: 'Microsoft Edge' },
  'mobile': { name: 'Mobile Chrome', project: 'Mobile Chrome' }
};

class HTSTestRunner {
  constructor() {
    this.testDir = path.resolve(__dirname, '../e2e');
    this.configFile = path.resolve(__dirname, '../playwright.config.js');
    this.outputDir = path.resolve(__dirname, '../test-results');
  }

  async run(options = {}) {
    const {
      config = 'hts-basic',
      browser = 'chromium',
      headed = false,
      debug = false,
      workers = undefined,
      retries = undefined,
      reporter = 'line',
      updateSnapshots = false,
      trace = false,
      video = false
    } = options;

    console.log(`\n🧪 Running HTS Browser E2E Tests`);
    console.log(`📋 Config: ${TEST_CONFIGS[config]?.name || config}`);
    console.log(`🌐 Browser: ${BROWSER_CONFIGS[browser]?.name || browser}`);
    console.log(`📁 Output: ${this.outputDir}`);
    console.log(`⏱️  Timeout: ${TEST_CONFIGS[config]?.timeout || 60000}ms\n`);

    const testConfig = TEST_CONFIGS[config];
    if (!testConfig) {
      throw new Error(`Unknown test configuration: ${config}`);
    }

    const browserConfig = BROWSER_CONFIGS[browser];
    if (!browserConfig) {
      throw new Error(`Unknown browser configuration: ${browser}`);
    }

    // Build Playwright command
    const playwrightCmd = this.buildPlaywrightCommand({
      config: testConfig,
      browser: browserConfig,
      headed,
      debug,
      workers,
      retries,
      reporter,
      updateSnapshots,
      trace,
      video
    });

    console.log(`🚀 Executing: ${playwrightCmd}\n`);

    return this.executeCommand(playwrightCmd);
  }

  buildPlaywrightCommand(options) {
    const {
      config,
      browser,
      headed,
      debug,
      workers,
      retries,
      reporter,
      updateSnapshots,
      trace,
      video
    } = options;

    let cmd = `npx playwright test`;

    // Add config file
    cmd += ` --config="${this.configFile}"`;

    // Add test files
    if (config.files) {
      config.files.forEach(file => {
        cmd += ` "${path.join(this.testDir, file)}"`;
      });
    }

    // Add project (browser)
    cmd += ` --project="${browser.project}"`;

    // Add grep pattern if specified
    if (config.grep) {
      cmd += ` --grep="${config.grep}"`;
    }

    // Add timeout
    if (config.timeout) {
      cmd += ` --timeout=${config.timeout}`;
    }

    // Add headed mode
    if (headed) {
      cmd += ` --headed`;
    }

    // Add debug mode
    if (debug) {
      cmd += ` --debug`;
    }

    // Add workers
    if (workers) {
      cmd += ` --workers=${workers}`;
    }

    // Add retries
    if (retries !== undefined) {
      cmd += ` --retries=${retries}`;
    }

    // Add reporter
    if (reporter) {
      cmd += ` --reporter=${reporter}`;
    }

    // Add update snapshots
    if (updateSnapshots) {
      cmd += ` --update-snapshots`;
    }

    // Add trace
    if (trace) {
      cmd += ` --trace=on`;
    }

    // Add video
    if (video) {
      cmd += ` --video=on`;
    }

    return cmd;
  }

  executeCommand(command) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, {
        shell: true,
        stdio: 'inherit',
        cwd: path.resolve(__dirname, '..')
      });

      child.on('close', (code) => {
        if (code === 0) {
          console.log('\n✅ Tests completed successfully!');
          resolve(code);
        } else {
          console.log(`\n❌ Tests failed with exit code ${code}`);
          reject(new Error(`Tests failed with exit code ${code}`));
        }
      });

      child.on('error', (error) => {
        console.error('\n❌ Failed to start test process:', error);
        reject(error);
      });
    });
  }

  async generateReport() {
    console.log('\n📊 Generating test report...');
    
    const reportCmd = `npx playwright show-report --port=0 "${path.join(this.outputDir, 'playwright-report')}"`;
    
    return this.executeCommand(reportCmd);
  }

  async listTests() {
    console.log('\n📝 Available test configurations:');
    
    Object.entries(TEST_CONFIGS).forEach(([key, config]) => {
      console.log(`  ${key.padEnd(15)} - ${config.name}`);
      console.log(`  ${' '.repeat(15)}   Files: ${config.files.join(', ')}`);
      console.log(`  ${' '.repeat(15)}   Timeout: ${config.timeout}ms`);
      if (config.grep) {
        console.log(`  ${' '.repeat(15)}   Pattern: ${config.grep}`);
      }
      console.log('');
    });

    console.log('\n🌐 Available browsers:');
    Object.entries(BROWSER_CONFIGS).forEach(([key, config]) => {
      console.log(`  ${key.padEnd(15)} - ${config.name}`);
    });
  }

  async install() {
    console.log('\n📦 Installing Playwright browsers...');
    
    const installCmd = 'npx playwright install';
    
    return this.executeCommand(installCmd);
  }

  async clean() {
    console.log('\n🧹 Cleaning test results...');
    
    if (fs.existsSync(this.outputDir)) {
      fs.rmSync(this.outputDir, { recursive: true, force: true });
      console.log('✅ Test results cleaned');
    } else {
      console.log('ℹ️  No test results to clean');
    }
  }
}

// CLI handling
if (require.main === module) {
  const args = process.argv.slice(2);
  const runner = new HTSTestRunner();

  const parseArguments = () => {
    const options = {};
    let command = 'run';

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      const nextArg = args[i + 1];

      switch (arg) {
        case '--config':
        case '-c':
          options.config = nextArg;
          i++;
          break;
        case '--browser':
        case '-b':
          options.browser = nextArg;
          i++;
          break;
        case '--headed':
          options.headed = true;
          break;
        case '--debug':
          options.debug = true;
          break;
        case '--workers':
          options.workers = parseInt(nextArg);
          i++;
          break;
        case '--retries':
          options.retries = parseInt(nextArg);
          i++;
          break;
        case '--reporter':
          options.reporter = nextArg;
          i++;
          break;
        case '--update-snapshots':
          options.updateSnapshots = true;
          break;
        case '--trace':
          options.trace = true;
          break;
        case '--video':
          options.video = true;
          break;
        case 'list':
          command = 'list';
          break;
        case 'install':
          command = 'install';
          break;
        case 'clean':
          command = 'clean';
          break;
        case 'report':
          command = 'report';
          break;
        case '--help':
        case '-h':
          command = 'help';
          break;
        default:
          if (!arg.startsWith('-') && !options.config) {
            options.config = arg;
          }
          break;
      }
    }

    return { command, options };
  };

  const showHelp = () => {
    console.log(`
🧪 HTS Browser E2E Test Runner

Usage:
  node run-hts-tests.js [command] [options]

Commands:
  run                    Run tests (default)
  list                   List available test configurations
  install                Install Playwright browsers
  clean                  Clean test results
  report                 Open test report
  --help, -h             Show this help

Options:
  --config, -c <name>    Test configuration (default: hts-basic)
  --browser, -b <name>   Browser to use (default: chromium)
  --headed               Run in headed mode
  --debug                Run in debug mode
  --workers <num>        Number of worker processes
  --retries <num>        Number of retries
  --reporter <name>      Test reporter
  --update-snapshots     Update visual snapshots
  --trace                Record traces
  --video                Record videos

Examples:
  node run-hts-tests.js                           # Run basic tests in Chromium
  node run-hts-tests.js hts-all --browser chrome  # Run all tests in Chrome
  node run-hts-tests.js --headed --debug          # Run with UI and debugging
  node run-hts-tests.js list                      # List available configurations
`);
  };

  const main = async () => {
    try {
      const { command, options } = parseArguments();

      switch (command) {
        case 'run':
          await runner.run(options);
          break;
        case 'list':
          await runner.listTests();
          break;
        case 'install':
          await runner.install();
          break;
        case 'clean':
          await runner.clean();
          break;
        case 'report':
          await runner.generateReport();
          break;
        case 'help':
          showHelp();
          break;
        default:
          console.error(`Unknown command: ${command}`);
          showHelp();
          process.exit(1);
      }
    } catch (error) {
      console.error('\n❌ Error:', error.message);
      process.exit(1);
    }
  };

  main();
}

module.exports = HTSTestRunner;