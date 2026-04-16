#!/bin/bash
# Ditto.app launcher — starts Ditto and opens the dashboard.
# The binary and mocks directory live next to the .app in the same folder.

DIR="$(cd "$(dirname "$0")/../../.." && pwd)"
BINARY="$DIR/ditto"
MOCKS="$DIR/mocks"

# Create mocks directory if it doesn't exist
mkdir -p "$MOCKS"

# Launch Ditto in the background
"$BINARY" --mocks "$MOCKS" &
DITTO_PID=$!

# Wait a moment for the server to start, then open the dashboard
sleep 1
open "http://localhost:8888/__ditto__/"

# Keep the app alive while ditto runs
wait $DITTO_PID
