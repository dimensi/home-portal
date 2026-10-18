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

Enable Coolify's source-commit injection for the application. Coolify provides `SOURCE_COMMIT` from the accepted webhook; Compose uses it both as the immutable GHCR image tag and as the revision returned by `/api/health`.

The Compose file also mounts `/var/run/docker.sock` read-only, joins the external `web` network, listens on container port `8080`, and uses `/api/health` through the image health check.

Attach the application to any Docker networks required to reach the services it should preview. Keep host aliases, local IP addresses, private domains, and credential mounts in Coolify or private server configuration.

## GitHub Actions secrets

Add these repository secrets:

| Secret | Value |
| --- | --- |
| `COOLIFY_WEBHOOK_URL` | Full URL of Coolify's manual GitHub webhook endpoint |
| `COOLIFY_WEBHOOK_SECRET` | Application's manual GitHub webhook signing secret |

Create a repository variable named `COOLIFY_DEPLOY_ENABLED`. Keep it set to `false` while bootstrapping the application: the workflow will test and publish the image but skip the deploy job. After checking the first package and Coolify configuration, set the variable to `true` and manually run `Build and Deploy` once. Future pushes to `main` will then deploy automatically.

The workflow signs the exact request body with HMAC-SHA256 and sends a GitHub-compatible `push` event after the image is published. It succeeds only when Coolify accepts exactly one deployment and returns its deployment UUID. This credential can trigger only the configured application; it cannot read or modify other Coolify resources.

Webhook acceptance means the deployment was queued. Check the Coolify deployment result and verify `/api/health` after the first release; the webhook does not grant the workflow broader read access for polling.

Save a password-manager item named **Home Portal / Coolify webhook** containing both values and a link to this runbook. The secret signs deployment requests; it is not a general Coolify API token. The endpoint can be shared by applications, while the signing secret and repository match restrict the target.

To rotate the secret, replace this application's manual GitHub webhook secret in Coolify and update `COOLIFY_WEBHOOK_SECRET` in GitHub to the same value. Run **Build and Deploy**, then confirm the native deployment finishes and `/api/health` reports the expected commit.

## Protect production

Protect `main` with the `CI / test` check if changes should be reviewed before release. Consider a GitHub environment with required reviewers if production deployments need a separate approval gate.

After the first deployment, verify the application health endpoint and load the dashboard through its configured ingress. Screenshot previews also need network access from the container to their target services.
