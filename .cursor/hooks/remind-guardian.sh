#!/bin/bash
# Read stdin (but we don't really need to parse it if we just blindly inject context)
cat > /dev/null

echo '{
  "additional_context": "SYSTEM HOOK: You just modified a file. You MUST use the Project-Guardian MCP (add_observation, etc.) to record this change in memory.db before finishing your response."
}'
exit 0
