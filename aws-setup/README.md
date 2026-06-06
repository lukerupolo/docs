# AWS access for Claude Code on the web

Goal: let Claude Code sessions you **dispatch from your phone** access your
AWS account. Those sessions run in an isolated, ephemeral cloud container that
does **not** inherit any AWS config from your local machine, so credentials
must be injected into the web *environment* itself.

## What this directory provides (already done in this repo)

- `../.claude/aws-setup.sh` — installs the AWS CLI (if missing) and verifies
  `aws sts get-caller-identity` on session start.
- `../.claude/settings.json` — a `SessionStart` hook that runs the script.
- `iam-policy.json` — a least-privilege **starter** policy (read-mostly).
  Widen it to the actions you actually need; avoid `AdministratorAccess`.

## What only you can do (requires your AWS login + web console)

These cannot be automated by an agent — they live in the AWS console and the
Claude Code web settings, which the container cannot reach.

### 1. Create a dedicated IAM user + access key
1. AWS console → **IAM → Users → Create user** (e.g. `claude-code-web`),
   programmatic access only (no console password).
2. Attach a policy — start from `iam-policy.json`, tighten/expand as needed.
3. **Security credentials → Create access key** → copy the Access key ID and
   Secret access key (the secret is shown only once).

### 2. Add the keys to your web environment as SECRETS
In Claude Code on the web, open the environment your sessions are dispatched
into and add:

```
AWS_ACCESS_KEY_ID      = <access key id>     # secret
AWS_SECRET_ACCESS_KEY  = <secret access key> # secret
AWS_REGION             = us-east-1
AWS_DEFAULT_REGION     = us-east-1
```

Never commit these keys to the repo.

### 3. Set the environment network policy to allow AWS
The container's outbound traffic is governed by the environment's network
policy. Choose one that permits `*.amazonaws.com`, or the CLI calls will fail.
See https://code.claude.com/docs/en/claude-code-on-the-web

## Verify
Dispatch a session from your phone and run:

```bash
aws sts get-caller-identity
```

A returned ARN + account ID means it's working. The `SessionStart` hook also
runs this automatically and prints a warning if anything is missing.

## Security notes
- Least privilege: grant only what sessions need; widen later.
- Long-lived access keys are sensitive — rotate periodically; delete
  immediately if leaked.
- Prefer a dedicated IAM user over your root/admin identity.
