#!/bin/bash

# This script temporarily disables husky hooks in CI environments
# It's used before running semantic-release to prevent hook execution

echo "Disabling husky hooks for CI..."

# Create a .huskyrc file in the home directory to disable husky
echo "HUSKY=0" > ~/.huskyrc

# Also set environment variable for this session
export HUSKY=0

# Ensure hooks are executable (even though they won't run)
chmod +x .husky/pre-commit || true
chmod +x .husky/commit-msg || true
chmod +x .husky/pre-push || true

echo "Husky hooks disabled for CI environment"
