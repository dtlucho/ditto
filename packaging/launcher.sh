#!/bin/bash
# Ditto.app launcher — opens a Terminal window running Ditto.
# The binary and mocks directory live next to the .app in the same folder.

DIR="$(cd "$(dirname "$0")/../../.." && pwd)"
BINARY="$DIR/ditto"
MOCKS="$DIR/mocks"

# Create mocks directory if it doesn't exist
mkdir -p "$MOCKS"

# Open a Terminal window running Ditto.
# The user sees the logs, can Ctrl+C to stop, and closing the window kills Ditto.
osascript <<SCRIPT
tell application "Terminal"
  activate
  do script "clear && \"$BINARY\" --mocks \"$MOCKS\"; echo ''; echo 'Ditto stopped. You can close this window.'"
end tell
SCRIPT
