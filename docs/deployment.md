# Deployment

The repository ships an immutable GitHub Actions to GHCR to Coolify release path. The workflow never copies source files to a server and does not contain hostnames, credentials, or Coolify resource identifiers.

## 1. Publish the container package

Create the GitHub repository and push the project to `main`. The `Build and Deploy` workflow uses the repository `GITHUB_TOKEN` with `packages: write` permission to publish:

- `ghcr.io/<owner>/<repository>:latest`
- `ghcr.io/<owner>/<repository>:<full-commit-sha>`

The commit SHA is the deployment source of truth. `latest` is provided for convenient manual use.

If the repository is public, set the GHCR package visibility separately if you want anonymous pulls. Otherwise configure Coolify with a GitHub Container Registry credential that can read the package.

## 2. Create the Coolify application

Create a Git-based Docker Compose application in Coolify from this repository and enable native Raw Docker Compose mode. Raw mode preserves the explicit container name, read-only bind mounts, host entries, and external `web` network. The checked-in Compose file pulls the published image, so the server does not build the application source.

Configure these runtime variables in Coolify:

| Variable | Purpose |
| --- | --- |
| `IMAGE_OWNER` | GitHub account that owns the GHCR package |
| `CADDY_CONFIG_PATH` | Private absolute host path to the Caddyfile mounted read-only |
| `SERVICES_CONFIG_PATH` | Private absolute host path to the external services JSON mounted read-only |
| `HOME_HOST_ENTRY` | Optional Compose `extra_hosts` entry for the primary host |
| `NAS_HOST_ENTRY` | Optional Compose `extra_hosts` entry for a secondary host |
| `DOCKER_HOSTNAME` | Hostname used for links derived from published Docker ports |
| `PORTAL_BIND` | Complete Compose port mapping, for example `127.0.0.1:8088:8080` |

Enable Coolify's source-commit injection for the application. Coolify provides `SOURCE_COMMIT` from the pinned deployment revision; Compose uses it both as the immutable GHCR image tag and as the revision returned by `/api/health`.

The Compose file also mounts `/var/run/docker.sock` read-only, joins the external `web` network, listens on container port `8080`, and uses `/api/health` through the image health check.

Attach the application to any Docker networks required to reach the services it should preview. Keep host aliases, local IP addresses, private domains, and credential mounts in Coolify or private server configuration.

## GitHub Actions secrets

Create a GitHub Environment named `production`, restrict its deployment branches to `main`, and add these environment secrets under **Settings → Environments → production**:

| Secret | Value |
| --- | --- |
| `COOLIFY_SSH_HOST` | SSH bastion hostname |
| `COOLIFY_SSH_PORT` | SSH bastion port |
| `COOLIFY_SSH_USER` | Existing deployment SSH account |
| `COOLIFY_SSH_KEY` | Existing deployment SSH private key |
| `COOLIFY_SSH_KNOWN_HOSTS` | Pinned SSH host-key entry for the bastion |
| `COOLIFY_TOKEN` | Shared pet-project CLI and CI API key |
| `COOLIFY_APP_UUID` | This application's resource UUID |

The workflow's deploy job references `environment: production`. Restrict this Environment to `main`, without required reviewers, and store deployment access only here rather than duplicating repository secrets. Keep the SSH connection settings and application UUID separate from the token so each application's target remains explicit. The deploy job opens a strict host-key-checked SSH forward on `127.0.0.1:18000`, calls Coolify through that loopback address, and always closes the tunnel and removes its temporary key material. The tunnel reuses the existing deployment SSH account and private key to forward to `127.0.0.1:8000`; it needs no additional VPN or SSH key.

Create a repository variable named `COOLIFY_DEPLOY_ENABLED`. Keep it `false` while bootstrapping; after checking the first package and Coolify configuration, set it to `true` and run **Build and Deploy**. The deploy job's condition is evaluated before environment variables are available, so this switch stays at repository scope.

The workflow pins the application through `PATCH /api/v1/applications/<application-uuid>` with `git_commit_sha` set to the release SHA, then calls `POST /api/v1/deploy` with the application UUID. It waits for that native deployment, verifies its commit, and waits for `running:healthy`. Compose receives the same revision through `SOURCE_COMMIT` and pulls the matching immutable GHCR tag.

## Shared Coolify access

The owner reuses the unchanged existing CLI key (token ID `7`) for interactive CLI access and the pet-project CI workflows. It has only **read**, **write**, and **deploy** abilities, with expiry **Never**. This key grants access across those Coolify resources; keep it private and out of source code, logs, screenshots, issues, and chat.

Save the existing value in a Bitwarden item named **Home pet projects / Coolify CLI and CI**. Include the instance URL, abilities, expiry **Never**, the supported project list, and this runbook link. The private server handoff named `coolify-shared-access.json` identifies the same existing key; read it only in a trusted session. Do not create another key merely to configure the CLI or another authorized CI consumer.

Use that value in the CLI's private instance configuration and in each authorized repository's **production** Environment as `COOLIFY_TOKEN`. Keep each repository's SSH connection secrets and `COOLIFY_APP_UUID` separate. CI reaches the Coolify API through its SSH tunnel; the private instance URL remains part of interactive CLI configuration. Production is restricted to `main` and needs no manual approver. Runtime application secrets and GHCR authorization remain independent.

For rotation, create the replacement deliberately, update the private CLI configuration and every authorized production Environment, then run and verify each deployment. Revoke the previous key only after every consumer has succeeded. A successful queue response alone is insufficient: confirm the native deployment finishes, runtime is healthy, and the expected immutable revision is running.

## Protect production

Protect `main` with the existing build and test checks if changes should be reviewed before release. The production Environment permits only `main` and has no manual deployment approval gate.

After the first deployment, verify the application health endpoint and load the dashboard through its configured ingress. Screenshot previews also need network access from the container to their target services.
