#!/usr/bin/env bash
# Environment bridge for agent CLI runners.
# No concrete secrets or endpoints are defined here; values only come from the
# caller's environment or an explicitly provided env file.

if [ -n "${AGENT_ENV_FILE:-}" ]; then
  if [ ! -r "$AGENT_ENV_FILE" ]; then
    echo "AGENT_ENV_FILE is not readable: $AGENT_ENV_FILE" >&2
    exit 64
  fi
  set -a
  # shellcheck disable=SC1090
  . "$AGENT_ENV_FILE"
  set +a
fi

if [ -n "${AGENT_CLI_RUNNER_ENV_FILE:-}" ]; then
  if [ ! -r "$AGENT_CLI_RUNNER_ENV_FILE" ]; then
    echo "AGENT_CLI_RUNNER_ENV_FILE is not readable: $AGENT_CLI_RUNNER_ENV_FILE" >&2
    exit 64
  fi
  set -a
  # shellcheck disable=SC1090
  . "$AGENT_CLI_RUNNER_ENV_FILE"
  set +a
fi

AGENT_CLI_RUNNER="${AGENT_CLI_RUNNER:-claude_code}"
export AGENT_CLI_RUNNER

if [ -n "${ANTHROPIC_API_KEY:-}" ]; then
  export ANTHROPIC_API_KEY
elif [ -n "${LITELLM_MASTER_KEY:-}" ]; then
  export ANTHROPIC_API_KEY="$LITELLM_MASTER_KEY"
elif [ -n "${LITELLM_API_KEY:-}" ]; then
  export ANTHROPIC_API_KEY="$LITELLM_API_KEY"
fi

if [ -n "${ANTHROPIC_BASE_URL:-}" ]; then
  export ANTHROPIC_BASE_URL
elif [ -n "${LITELLM_BASE_URL:-}" ]; then
  export ANTHROPIC_BASE_URL="$LITELLM_BASE_URL"
elif [ -n "${LITELLM_API_BASE:-}" ]; then
  export ANTHROPIC_BASE_URL="$LITELLM_API_BASE"
fi

export CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC="$(
  printf '%s' "${CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC:-1}"
)"
export DISABLE_TELEMETRY="${DISABLE_TELEMETRY:-1}"
export CLAUDE_CODE_ENABLE_TELEMETRY="${CLAUDE_CODE_ENABLE_TELEMETRY:-0}"
export DISABLE_AUTOUPDATER="${DISABLE_AUTOUPDATER:-1}"
export CLAUDE_CODE_IDE_SKIP_AUTO_INSTALL="${CLAUDE_CODE_IDE_SKIP_AUTO_INSTALL:-true}"
export ENABLE_EXPERIMENTAL_MCP_CLI="${ENABLE_EXPERIMENTAL_MCP_CLI:-true}"

export CODEX_BIN="${CODEX_BIN:-codex}"
export CODEX_TIMEOUT_MS="${CODEX_TIMEOUT_MS:-${AGENT_TIMEOUT_MS:-180000}}"

codex_config_file="${CODEX_CONFIG_FILE:-}"
if [ -z "$codex_config_file" ]; then
  if [ -n "${CODEX_HOME:-}" ]; then
    codex_config_file="$CODEX_HOME/config.toml"
  else
    codex_config_file="$HOME/.codex/config.toml"
  fi
fi

if [ -r "$codex_config_file" ]; then
  codex_env_keys="$(
    awk -F= '
      /^[[:space:]]*env_key[[:space:]]*=/ {
        value = $2
        gsub(/^[[:space:]"\047]+|[[:space:]"\047]+$/, "", value)
        if (value ~ /^[A-Za-z_][A-Za-z0-9_]*$/) print value
      }
    ' "$codex_config_file" | sort -u
  )"
  while IFS= read -r name; do
    if [ -z "$name" ]; then continue; fi
    eval "value=\${$name-}"
    if [ -n "$value" ]; then export "$name=$value"; fi
  done <<EOF
$codex_env_keys
EOF
fi
