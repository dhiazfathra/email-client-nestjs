#!/bin/sh
set -e

# Function to handle SIGTERM
term_handler() {
  echo "Received SIGTERM signal, shutting down gracefully..."
  # Forward the signal to the Node.js process
  kill -SIGTERM "$child"

  # Wait for the process to terminate
  wait "$child"
  echo "Application terminated gracefully"
  exit 0
}

# Set up the trap for SIGTERM
trap term_handler SIGTERM

# Start the application
npm run start:prod &

# Store the PID of the npm process
child=$!

# Wait for the process to terminate
wait "$child"
