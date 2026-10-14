# Locat 3.0 development backend

This backend is an **experimental local-only** authentication service. It is not the full Locat backend and is not ready for production.

## Start

From `locat-ui-3.0/`, run the backend and Vite in separate terminals:

```powershell
node server/index.mjs
npm run dev
```

The backend listens on `127.0.0.1:8787`; Vite listens on `127.0.0.1:5173` and proxies `/api` to the backend. Check `http://127.0.0.1:5173/api/ready`. No hosted server or Tailscale is required for desktop development.

## Scope

- `POST /api/auth/register` creates a new development account.
- `POST /api/auth/login` issues an HttpOnly, SameSite=Strict session cookie.
- `GET /api/auth/me` validates the session.
- `POST /api/auth/logout` revokes the session.
- `GET /api/ready` returns Locat readiness.

All state-changing requests require the matching `Origin` header. The browser API client uses same-origin credentials. Data is written to `server/data/dev-auth.json` by default. Do not commit this file.

**Not yet implemented:** rate limiting, SQLite, encrypted messaging, device pairing, mobile access, account reset, or full UI 3.0 live adapter. This is a disposable development database. Do not expose the service outside the loopback interface.

## Known limitations to resolve before wider testing

The current registration endpoint does not automatically sign in. Passwords are hashed using scrypt, but no request throttling is in place yet. The development API does not generate cryptographic messaging identities, and the existing UI preview is still separate from the real backend. Do not describe login as end-to-end integrated until the live entrypoint is wired and tested.

The live UI is opt-in. To return to the preview in PowerShell, run `Remove-Item Env:VITE_LOCAT_LIVE` before starting Vite. The backend must be running for live sign-in. This mode is currently **authentication integration testing**, not a production app: many signed-in screens still display preview fixture data and are not backed by real services. Do not treat displayed messages, media, or device state as real user data.\n