#!/usr/bin/env bash
#
# AWS setup + verification for Claude Code on the web sessions.
#
# This runs in the ephemeral cloud container (e.g. for sessions you dispatch
# from your phone). It does NOT create credentials — it expects them to be
# injected as environment SECRETS in the Claude Code web environment settings:
#
#   AWS_ACCESS_KEY_ID
#   AWS_SECRET_ACCESS_KEY
#   AWS_REGION (and/or AWS_DEFAULT_REGION)
#
# See aws-setup/README.md for the one-time manual steps only the account
# owner can perform.

set -uo pipefail

echo "[aws-setup] Checking AWS configuration..."

# 1. Confirm credentials are present in the environment.
if [[ -z "${AWS_ACCESS_KEY_ID:-}" || -z "${AWS_SECRET_ACCESS_KEY:-}" ]]; then
  echo "[aws-setup] WARNING: AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY are not set."
  echo "[aws-setup] Add them as secrets in your Claude Code web environment settings."
  echo "[aws-setup] (see aws-setup/README.md)"
  exit 0   # don't fail the session; just warn
fi

# Default region if none provided.
export AWS_REGION="${AWS_REGION:-${AWS_DEFAULT_REGION:-us-east-1}}"
export AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-$AWS_REGION}"
echo "[aws-setup] Region: $AWS_REGION"

# 2. Install the AWS CLI if it isn't already available.
if ! command -v aws >/dev/null 2>&1; then
  echo "[aws-setup] AWS CLI not found; installing..."
  tmp="$(mktemp -d)"
  if curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "$tmp/awscliv2.zip"; then
    unzip -q "$tmp/awscliv2.zip" -d "$tmp"
    if command -v sudo >/dev/null 2>&1; then
      sudo "$tmp/aws/install" --update >/dev/null 2>&1 || "$tmp/aws/install" --update >/dev/null 2>&1
    else
      "$tmp/aws/install" --bin-dir "$HOME/.local/bin" --install-dir "$HOME/.local/aws-cli" --update >/dev/null 2>&1
      export PATH="$HOME/.local/bin:$PATH"
    fi
    rm -rf "$tmp"
  else
    echo "[aws-setup] WARNING: could not download AWS CLI (network policy may block it)."
    exit 0
  fi
fi

# 3. Verify the credentials actually work (requires the network policy to allow AWS).
echo "[aws-setup] Verifying identity..."
if aws sts get-caller-identity --output json 2>/tmp/aws-err.log; then
  echo "[aws-setup] AWS access OK."
else
  echo "[aws-setup] WARNING: 'aws sts get-caller-identity' failed."
  echo "[aws-setup] Check that (a) the keys are valid and (b) the environment's"
  echo "[aws-setup] network policy permits *.amazonaws.com. Details:"
  cat /tmp/aws-err.log
fi
