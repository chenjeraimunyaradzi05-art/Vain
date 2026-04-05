#!/usr/bin/env node

/**
 * Comprehensive Test Runner
 * 
 * This script runs all tests across the monorepo with proper setup and reporting.
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  apps: ['api', 'web', 'mobile'],
  testTypes: ['unit', 'integration', 'e2e'],
  timeout: 300000, // 5 minutes
  parallel: true,
  coverage: true,
  reportFormats: ['text', 'json', 'html']
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

// Logging utilities
const log = {
  info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}[WARN]${colors.reset} ${msg}`),
  step: (msg) => console.log(`${colors.cyan}[STEP]${colors.reset} ${msg}`)
};

// Check if app exists
function appExists(appName) {
  const appPath = path.join(process.cwd(), 'apps', appName);
  return fs.existsSync(appPath) && fs.existsSync(path.join(appPath, 'package.json'));
}

// Run command with timeout
function runCommand(command, cwd, timeout = config.timeout) {
  return new Promise((resolve, reject) => {
    log.step(`Running: ${command}`);
    
    const child = spawn(command, { 
      shell: true, 
      cwd,
      stdio: 'pipe'
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`Command timed out after ${timeout}ms`));
    }, timeout);

    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });

    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

// Install dependencies for an app
async function installDependencies(appName) {
  const appPath = path.join(process.cwd(), 'apps', appName);
  
  try {
    log.step(`Installing dependencies for ${appName}...`);
    await runCommand('npm ci', appPath);
    log.success(`Dependencies installed for ${appName}`);
  } catch (error) {
    log.error(`Failed to install dependencies for ${appName}: ${error.message}`);
    throw error;
  }
}

// Run tests for an app
async function runAppTests(appName, testType = 'all') {
  const appPath = path.join(process.cwd(), 'apps', appName);
  
  try {
    log.step(`Running ${testType} tests for ${appName}...`);
    
    let command;
    switch (testType) {
      case 'unit':
        command = appName === 'web' ? 'npm run test:unit' : 'npm run test:unit';
        break;
      case 'integration':
        command = appName === 'web' ? 'npm run test:e2e' : 'npm run test:integration';
        break;
      case 'e2e':
        command = appName === 'web' ? 'npm run test:e2e' : 'npm run test:legacy';
        break;
      case 'coverage':
        command = 'npm run test:coverage';
        break;
      default:
        command = 'npm test';
    }

    const result = await runCommand(command, appPath);
    
    if (result.code === 0) {
      log.success(`${appName} ${testType} tests passed`);
      return { success: true, output: result.stdout };
    } else {
      log.error(`${appName} ${testType} tests failed`);
      return { success: false, output: result.stderr };
    }
  } catch (error) {
    log.error(`Failed to run tests for ${appName}: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Run linting for an app
async function runLinting(appName) {
  const appPath = path.join(process.cwd(), 'apps', appName);
  
  try {
    log.step(`Running linting for ${appName}...`);
    const result = await runCommand('npm run lint', appPath);
    
    if (result.code === 0) {
      log.success(`${appName} linting passed`);
      return { success: true };
    } else {
      log.warn(`${appName} linting issues found`);
      return { success: false, output: result.stderr };
    }
  } catch (error) {
    log.error(`Failed to run linting for ${appName}: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Run type checking for an app
async function runTypeChecking(appName) {
  const appPath = path.join(process.cwd(), 'apps', appName);
  
  try {
    log.step(`Running type checking for ${appName}...`);
    const result = await runCommand('npm run typecheck', appPath);
    
    if (result.code === 0) {
      log.success(`${appName} type checking passed`);
      return { success: true };
    } else {
      log.warn(`${appName} type checking issues found`);
      return { success: false, output: result.stderr };
    }
  } catch (error) {
    log.error(`Failed to run type checking for ${appName}: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Build an app
async function buildApp(appName) {
  const appPath = path.join(process.cwd(), 'apps', appName);
  
  try {
    log.step(`Building ${appName}...`);
    const result = await runCommand('npm run build', appPath);
    
    if (result.code === 0) {
      log.success(`${appName} build completed`);
      return { success: true };
    } else {
      log.error(`${appName} build failed`);
      return { success: false, output: result.stderr };
    }
  } catch (error) {
    log.error(`Failed to build ${appName}: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Main test runner
async function runTests(options = {}) {
  const {
    apps = config.apps,
    testTypes = config.testTypes,
    skipInstall = false,
    skipLint = false,
    skipTypeCheck = false,
    skipBuild = false,
    parallel = config.parallel
  } = options;

  log.info('Starting comprehensive test run...');
  
  const results = {
    apps: {},
    summary: {
      total: 0,
      passed: 0,
      failed: 0
    }
  };

  // Filter apps that exist
  const existingApps = apps.filter(appExists);
  
  if (existingApps.length === 0) {
    log.error('No valid apps found to test');
    return results;
  }

  log.info(`Testing apps: ${existingApps.join(', ')}`);

  // Process each app
  for (const appName of existingApps) {
    log.info(`\n${'='.repeat(50)}`);
    log.info(`Testing ${appName}`);
    log.info(`${'='.repeat(50)}`);
    
    results.apps[appName] = {
      install: { success: true },
      lint: { success: true },
      typecheck: { success: true },
      build: { success: true },
      tests: {}
    };

    try {
      // Install dependencies
      if (!skipInstall) {
        const installResult = await installDependencies(appName);
        results.apps[appName].install = installResult;
        if (!installResult.success) {
          continue; // Skip other steps if install fails
        }
      }

      // Run linting
      if (!skipLint) {
        const lintResult = await runLinting(appName);
        results.apps[appName].lint = lintResult;
      }

      // Run type checking
      if (!skipTypeCheck) {
        const typeCheckResult = await runTypeChecking(appName);
        results.apps[appName].typecheck = typeCheckResult;
      }

      // Run tests
      for (const testType of testTypes) {
        const testResult = await runAppTests(appName, testType);
        results.apps[appName].tests[testType] = testResult;
        results.summary.total++;
        if (testResult.success) {
          results.summary.passed++;
        } else {
          results.summary.failed++;
        }
      }

      // Build app
      if (!skipBuild) {
        const buildResult = await buildApp(appName);
        results.apps[appName].build = buildResult;
      }

    } catch (error) {
      log.error(`Unexpected error testing ${appName}: ${error.message}`);
      results.apps[appName].error = error.message;
      results.summary.failed++;
    }
  }

  // Print summary
  log.info(`\n${'='.repeat(50)}`);
  log.info('TEST SUMMARY');
  log.info(`${'='.repeat(50)}`);
  
  log.info(`Total tests: ${results.summary.total}`);
  log.success(`Passed: ${results.summary.passed}`);
  log.error(`Failed: ${results.summary.failed}`);
  
  // Print detailed results
  for (const appName of existingApps) {
    const appResult = results.apps[appName];
    log.info(`\n${appName}:`);
    log.info(`  Install: ${appResult.install.success ? '✅' : '❌'}`);
    log.info(`  Lint: ${appResult.lint.success ? '✅' : '❌'}`);
    log.info(`  Type Check: ${appResult.typecheck.success ? '✅' : '❌'}`);
    log.info(`  Build: ${appResult.build.success ? '✅' : '❌'}`);
    
    for (const testType of testTypes) {
      const testResult = appResult.tests[testType];
      log.info(`  ${testType}: ${testResult.success ? '✅' : '❌'}`);
    }
  }

  return results;
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const options = {};

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--skip-install':
        options.skipInstall = true;
        break;
      case '--skip-lint':
        options.skipLint = true;
        break;
      case '--skip-typecheck':
        options.skipTypeCheck = true;
        break;
      case '--skip-build':
        options.skipBuild = true;
        break;
      case '--no-parallel':
        options.parallel = false;
        break;
      case '--apps':
        options.apps = args[i + 1].split(',');
        i++;
        break;
      case '--tests':
        options.testTypes = args[i + 1].split(',');
        i++;
        break;
      case '--help':
      case '-h':
        console.log(`
Usage: node scripts/test-runner.js [options]

Options:
  --skip-install      Skip dependency installation
  --skip-lint         Skip linting
  --skip-typecheck    Skip type checking
  --skip-build        Skip building
  --no-parallel       Run tests sequentially
  --apps <apps>       Comma-separated list of apps to test (default: api,web,mobile)
  --tests <types>     Comma-separated list of test types (default: unit,integration,e2e)
  --help, -h          Show this help message

Examples:
  node scripts/test-runner.js
  node scripts/test-runner.js --apps api,web --tests unit,integration
  node scripts/test-runner.js --skip-install --skip-build
        `);
        process.exit(0);
        break;
    }
  }

  try {
    const results = await runTests(options);
    
    // Exit with appropriate code
    if (results.summary.failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    log.error(`Test runner failed: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { runTests, runAppTests, runLinting, runTypeChecking, buildApp };
