#!/usr/bin/env bash
# Compatibility wrapper. New templates should source agent-env.sh directly.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$ROOT/agent-env.sh"
