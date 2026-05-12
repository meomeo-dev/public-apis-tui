#!/usr/bin/env bash
# Environment bridge for Claude Code.
# No concrete secrets or endpoints are defined here; values only come from the caller's environment.

if [ -n "${ANTHROPIC_API_KEY:-}" ]; then
  export ANTHROPIC_API_KEY
elif [ -z "${ANTHROPIC_API_KEY:-}" ]; then
  if [ -n "${LITELLM_MASTER_KEY:-}" ]; then
    export ANTHROPIC_API_KEY="$LITELLM_MASTER_KEY"
  elif [ -n "${LITELLM_API_KEY:-}" ]; then
    export ANTHROPIC_API_KEY="$LITELLM_API_KEY"
  fi
fi

if [ -n "${ANTHROPIC_BASE_URL:-}" ]; then
  export ANTHROPIC_BASE_URL
elif [ -z "${ANTHROPIC_BASE_URL:-}" ]; then
  if [ -n "${LITELLM_BASE_URL:-}" ]; then
    export ANTHROPIC_BASE_URL="$LITELLM_BASE_URL"
  elif [ -n "${LITELLM_API_BASE:-}" ]; then
    export ANTHROPIC_BASE_URL="$LITELLM_API_BASE"
  fi
fi

export CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC="${CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC:-1}"
export DISABLE_TELEMETRY="${DISABLE_TELEMETRY:-1}"
export CLAUDE_CODE_ENABLE_TELEMETRY="${CLAUDE_CODE_ENABLE_TELEMETRY:-0}"
export DISABLE_AUTOUPDATER="${DISABLE_AUTOUPDATER:-1}"
export CLAUDE_CODE_IDE_SKIP_AUTO_INSTALL="${CLAUDE_CODE_IDE_SKIP_AUTO_INSTALL:-true}"
export ENABLE_EXPERIMENTAL_MCP_CLI="${ENABLE_EXPERIMENTAL_MCP_CLI:-true}"
