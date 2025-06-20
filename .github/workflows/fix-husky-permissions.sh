#!/bin/bash

# This script ensures that husky hooks are executable in CI environments
# It should be run as part of the CI workflow before semantic-release

echo "Making husky hooks executable..."
chmod +x "$(pwd)/.husky/pre-commit" || true
chmod +x "$(pwd)/.husky/commit-msg" || true
chmod +x "$(pwd)/.husky/pre-push" || true
echo "Husky hooks permissions updated!"

# List the permissions to verify
ls -la "$(pwd)/.husky/"
