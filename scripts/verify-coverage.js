#!/usr/bin/env node

/**
 * This script verifies that test coverage meets the required thresholds.
 * It's used in the pre-commit hook to ensure code quality.
 */

const fs = require('fs');
const path = require('path');

// Read the coverage summary
const coveragePath = path.join(
  __dirname,
  '..',
  'coverage',
  'coverage-summary.json',
);

try {
  if (!fs.existsSync(coveragePath)) {
    console.error(
      '❌ No coverage report found. Please run tests with coverage first.',
    );
    process.exit(1);
  }

  const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
  const total = coverage.total;

  // Get thresholds from package.json
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const thresholds = packageJson.jest.coverageThreshold.global;

  // Check if coverage meets thresholds
  const results = [];

  if (total.branches.pct < thresholds.branches) {
    results.push(
      `❌ Branch coverage (${total.branches.pct}%) is below threshold (${thresholds.branches}%)`,
    );
  }

  if (total.functions.pct < thresholds.functions) {
    results.push(
      `❌ Function coverage (${total.functions.pct}%) is below threshold (${thresholds.functions}%)`,
    );
  }

  if (total.lines.pct < thresholds.lines) {
    results.push(
      `❌ Line coverage (${total.lines.pct}%) is below threshold (${thresholds.lines}%)`,
    );
  }

  if (total.statements.pct < thresholds.statements) {
    results.push(
      `❌ Statement coverage (${total.statements.pct}%) is below threshold (${thresholds.statements}%)`,
    );
  }

  if (results.length > 0) {
    console.error('Coverage does not meet thresholds:');
    results.forEach((result) => console.error(result));
    process.exit(1);
  }

  console.log('✅ All coverage thresholds met!');
  console.log(
    `Branches: ${total.branches.pct}% (threshold: ${thresholds.branches}%)`,
  );
  console.log(
    `Functions: ${total.functions.pct}% (threshold: ${thresholds.functions}%)`,
  );
  console.log(`Lines: ${total.lines.pct}% (threshold: ${thresholds.lines}%)`);
  console.log(
    `Statements: ${total.statements.pct}% (threshold: ${thresholds.statements}%)`,
  );

  process.exit(0);
} catch (error) {
  console.error('Error verifying coverage:', error);
  process.exit(1);
}
