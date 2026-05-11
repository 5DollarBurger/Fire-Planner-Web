#!/bin/bash
# Blocks Claude from writing to sensitive files that should never be auto-edited.

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('file_path', ''))" 2>/dev/null)

PROTECTED=(".env.local" ".env")

for pattern in "${PROTECTED[@]}"; do
  if [[ "$FILE_PATH" == *"$pattern" && "$FILE_PATH" != *".example" ]]; then
    echo "BLOCKED: $FILE_PATH is a protected env file. Update .env.local.example instead, then apply manually." >&2
    exit 2
  fi
done

exit 0
