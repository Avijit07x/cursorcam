#!/bin/sh
value=$(tr '\n' ' ' | sed -n 's/.*"command"[[:space:]]*:[[:space:]]*"\([^"\\]*\(\\.[^"\\]*\)*\)".*/\1/p')
[ -n "$value" ] || exit 0

start='(^|[;&|(`]|\\n)[[:space:]]*(sudo[[:space:]]+)?'
end='[[:space:]]*($|[;&|)`]|\\n)'
bare="${start}((env|printenv)([[:space:]]+-[-a-zA-Z0-9]+)*|set|export([[:space:]]+-p)?|(declare|typeset)([[:space:]]+-[px]+)?)${end}"
proc='/proc/[^[:space:]]*/environ'
code='(console\.(log|dir|table|error|info)|JSON\.stringify|pprint|print|dict)\([[:space:]]*(process\.env|os\.environ)[[:space:]]*[),]'

if printf '%s\n' "$value" | grep -Eq -e "$bare" -e "$proc" -e "$code"; then
  echo 'CursorCam blocked this command: it prints every environment variable, and those can hold passwords and keys. Print only the variable you need, like: printenv HOME' >&2
  exit 2
fi
exit 0
