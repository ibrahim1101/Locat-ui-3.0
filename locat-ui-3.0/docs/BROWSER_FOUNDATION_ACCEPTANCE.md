# Built UI browser foundation acceptance

A pinned Playwright Test 1.64.1 Chromium job now accompanies the existing Node/source checks. Run from the application directory after installing the browser runtime:

```
npm ci
npx playwright install --with-deps chromium
npm run build
npm run test:browser
```

`npm run test:browser -- --list` validates test discovery without launching a browser. Discovery, syntax checks and fixture readiness are not a passing browser acceptance run.

## What the test exercises

The fixture starts the actual Node server with the production build, a generated one-day loopback-only HTTPS certificate and a new temporary SQLite database. It never accepts an existing server URL or database path. Its child environment is an allowlist of runtime paths plus explicit fixture configuration, excluding operator Locat/Matrix/relay secrets and deployment settings. The server and its private files are stopped/removed during teardown, including failure paths.

The test creates a synthetic account through a browser fetch, signs in through the actual built UI, and checks the browser's Secure/HttpOnly/SameSite=Strict cookie metadata and absence of the HttpOnly cookie from document.cookie. It checks secure-context/Web Crypto/IndexedDB/Web Locks availability and a native Web Lock acquisition. The Devices UI registers/proves its real nonextractable P-256 Link identity; native IndexedDB retains that key and public identity across a same-context page reload. Secrets UI creates a real encrypted store and record, changes its wrapping passphrase, locks, reloads and reopens the original record using the new phrase. Captured private-store writes must exclude the synthetic passphrases, entry name and secret value.

This first browser test does not run Matrix/Synapse, Rust crypto, SAS, exclusive Matrix stores, key-history workers/import/export, cross-signing, conversation Send or full recovery. Native hardware key protection, OS/browser restart durability, cross-tab contention, cross-site SameSite enforcement, browser certificate trust and physical devices remain separate acceptance work. Chromium on Linux does not certify Firefox, WebKit, Android WebView, Windows/macOS desktop shells or actual media codecs.

## Certificate and network scope

Only the isolated browser context permits the generated self-signed certificate through Playwright ignoreHTTPSErrors. HTTP routing is restricted to the exact loopback fixture origin and service workers are blocked. This is not production browser CA/trust acceptance. Existing Node HTTPS acceptance separately trusts only its generated fixture CA. No browser-wide certificate policy or operator certificate is changed.

## CI evidence

The browser-foundation job installs Chromium/dependencies, builds the app and runs this test. It uploads only the runner JSON report for seven days; no production dataset or operator credentials are used. A successful source/unit build or test discovery is not evidence that this job ran. Record the exact successful workflow/commit when observed before claiming browser execution.

At introduction, local checks include fixture HTTPS readiness, script syntax and one discovered test. The local environment has no Chromium executable; previous browser downloads returned invalid artifacts, so browser execution is delegated to CI rather than simulated. Full browser acceptance remains pending until a successful run is actually observed.

Primary tooling references: https://playwright.dev/docs/intro and https://playwright.dev/docs/ci-intro.

## First executed CI run and fixture correction

Workflow 38745774227 on commit 4819b99 successfully installed Chromium and executed the test against the built app. It failed at synthetic account creation (HTTP 400): the fixture used browser.<suffix>, while server usernames accept only 3–32 lowercase letters/digits/underscores. The fixture now uses browser_<suffix> and reports the API error on a status assertion. The registration hint was corrected to the same server policy. This is an observed failed browser run, not acceptance success; later successful evidence must identify its exact commit/run.

The login recovery notice was also corrected to distinguish existing room-history import/export from planned complete account/device identity recovery. Account creation no longer claims that all private-tool keys were already created; setup remains explicit. No authentication validation was weakened.
