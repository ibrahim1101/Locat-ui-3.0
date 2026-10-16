# Optional Linux host connector — preparation only

This profile addresses the container-loopback boundary without changing Matrix authorization or transport policy. Locat Node runs on the Linux host at `127.0.0.1:8787`. Its existing Synapse upstream stays private at host loopback, with the existing application-service registration, database and stable identities. Only the connector uses Docker host networking. The original bridge profile remains available for web/API-only preparation.

`compose.cloudflare-host.yml` has no published ports and requires the explicit `prepared-host-connector` profile. It mounts only connector configuration and an existing private tunnel credential, uses a read-only root filesystem, drops capabilities and prevents privilege escalation. It does not mount the Locat database, Matrix credentials, Docker socket or SSH configuration. No source tool creates a tunnel, changes DNS or starts this service.

## Prepare the configuration

From the application directory, prepare a new private directory outside this repository. Its parent must already exist. Supply the intended HTTPS DNS origin and an existing tunnel UUID obtained through separately authorized provisioning:

```sh
node tools/prepare-host-connector.mjs /srv/locat-private/connector https://locat.example.com EXISTING_TUNNEL_UUID
```

The command writes `host-connector.yml` as JSON-compatible YAML, directory mode 0700 and file mode 0600 where supported. Existing directories/files are never overwritten. It neither reads nor generates a tunnel credential. The only ingress targets `http://127.0.0.1:8787` with the exact configured Host header; other hostnames receive 404. Metrics bind to `127.0.0.1:2000`. The exported configuration function supports distinct unprivileged backend/metrics ports; the CLI uses these defaults. No personal hostname is required.

The existing host Node process must use matching settings:

```dotenv
LOCAT_HOST=127.0.0.1
LOCAT_PORT=8787
LOCAT_PUBLIC_ORIGIN=https://locat.example.com
LOCAT_TLS_TERMINATION=proxy
LOCAT_PROXY_PEERS=127.0.0.1
```

Keep its existing database path, `LOCAT_MATRIX_UPSTREAM=http://127.0.0.1:8008`, canonical `LOCAT_MATRIX_SERVER_NAME`, and private `LOCAT_MATRIX_APPSERVICE_FILE`. Do not recreate an instance/database/registration to change connectivity. Proxy termination and direct-listener TLS are mutually exclusive. This profile does not automatically configure or restart Node or Synapse. Changing the browser origin creates a separate browser storage boundary; established device keys are not migrated automatically.

For the repository-root Compose profile, supply these private operator variables:

```dotenv
CLOUDFLARED_IMAGE=cloudflare/cloudflared@sha256:OPERATOR_VERIFIED_DIGEST
LOCAT_HOST_CONNECTOR_CONFIG_FILE=/srv/locat-private/connector/host-connector.yml
LOCAT_TUNNEL_CREDENTIALS_FILE=/srv/locat-private/existing-tunnel.json
```

Verify the chosen image architecture and nonroot UID. Grant only that UID the necessary private-file read access; do not make real credentials world-readable. Rootless Docker UID mapping needs separate validation. Nothing automatically changes ownership or permissions of existing operator files.

## Validate without public activation

Compose rendering does not start a container:

```sh
docker compose -f compose.cloudflare-host.yml --profile prepared-host-connector config --quiet
```

The prepared ingress can be checked by the selected image with networking disabled and no credentials mounted:

```sh
docker run --rm --network none --read-only --cap-drop ALL \
  --security-opt no-new-privileges:true \
  --mount "type=bind,src=${LOCAT_HOST_CONNECTOR_CONFIG_FILE},dst=/etc/cloudflared/config.yml,readonly" \
  "$CLOUDFLARED_IMAGE" tunnel --config /etc/cloudflared/config.yml ingress validate
```

These commands may need an image download. They do not run `tunnel run`, create a tunnel or route public traffic. Public activation still requires approval of the exact hostname/tunnel/DNS changes; no activation command is part of automated acceptance.

The CI-only `node tools/host-connector-acceptance.mjs` renders the real Compose profile, validates ingress and positive/negative hostname matching using cloudflared 2026.10.1 with networking disabled, then starts a fresh synthetic loopback Locat gateway. A nonroot Node container on Linux host networking checks exact Host/Origin, Secure/HttpOnly session cookies, authenticated private WebSocket upgrade and denial after logout. It mounts no account data or credentials. A local `--local-only` run checks the gateway boundary while explicitly omitting Docker/cloudflared acceptance. These are private-hop tests; the health socket is not Matrix messaging transport.

## Trust boundaries and remaining acceptance

Docker host networking shares the host network namespace. A compromised connector can reach other host-loopback services, so the connector/image is a trusted host-network process. The ingress configuration must expose only Locat; never add routes for Synapse/admin, PostgreSQL, SSH, metrics or Docker. Existing Matrix upstream validation continues to reject arbitrary plaintext bridge endpoints. Untrusted forwarded client-IP headers remain ignored; proxy auth requests currently share the conservative peer rate bucket.

This profile targets Linux Docker Engine. Docker Desktop/Windows, ARM64 images, Raspberry Pi resource/performance tests, actual cloudflared edge connections, public HTTPS/WSS reconnect, and two users on separate internet networks still require acceptance. No global/federation/native milestone is closed by configuration rendering or private-hop tests. Cloudflare Tunnel is not TURN, and no relay/media allocation is claimed. Keep backups and identity recovery requirements from the master roadmap.

Primary references checked 2026-10-16: [Docker host networking](https://docs.docker.com/engine/network/drivers/host/), [Cloudflare configuration and offline ingress validation](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/local-management/configuration-file/), [cloudflared 2026.10.1 release](https://github.com/cloudflare/cloudflared/releases/tag/2026.10.1). The CI version is a reproducible test input, not an automatic production image selection or an independent security review.
