#!/usr/bin/env node

/**
 * This script ensures that husky hooks are executable after installation.
 * It runs as part of the postinstall process.
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Ensuring husky hooks are executable...');

try {
  const huskyDir = path.join(process.cwd(), '.husky');

  // Check if .husky directory exists
  if (fs.existsSync(huskyDir)) {
    // Make pre-commit hook executable
    if (fs.existsSync(path.join(huskyDir, 'pre-commit'))) {
      execFileSync('chmod', ['+x', path.join(huskyDir, 'pre-commit')]);
      console.log('✅ Made pre-commit hook executable');
    }

    // Make commit-msg hook executable
    if (fs.existsSync(path.join(huskyDir, 'commit-msg'))) {
      execFileSync('chmod', ['+x', path.join(huskyDir, 'commit-msg')]);
      console.log('✅ Made commit-msg hook executable');
    }

    // Make pre-push hook executable
    if (fs.existsSync(path.join(huskyDir, 'pre-push'))) {
      execFileSync('chmod', ['+x', path.join(huskyDir, 'pre-push')]);
      console.log('✅ Made pre-push hook executable');
    }

    console.log('🎉 All husky hooks are now executable!');
  } else {
    console.log(
      '⚠️ Husky directory not found. Skipping hook permission setup.',
    );
  }
} catch (error) {
  console.error('❌ Error making husky hooks executable:', error.message);
  // Don't exit with error to avoid breaking the install process
}
