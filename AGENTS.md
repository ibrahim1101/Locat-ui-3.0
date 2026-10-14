# Locat UI 3.0 engineering rules

- Develop only on integration/locat-core in this repository. The original Locat repository is a read-only feature reference. Preserve existing account/media data through additive migrations.
- Every new option, dialog and section must follow the current UI 3.0 design system: src/ui, layouts/Screen, existing theme tokens, typography, spacing and responsive layouts. Use the shared Sheet/TextField/Button/Slider controls; browser prompt/confirm dialogs are not application UI. System file and permission pickers remain native platform surfaces.
- Buttons inside submission forms must explicitly set type="submit"; the shared Button defaults to type="button".
- Live routes must show real authenticated or explicitly local data. Unsupported options need a truthful unavailable state and reason. Never render preview conversations/devices/media/events as live content.
- Local mode has no authenticated identity and cannot authorize server features. Backend authorization remains mandatory regardless of UI state.
- Do not claim E2EE, native storage protection, bit-perfect audio, universal codec support or complete platform compatibility without the relevant implementation and actual verification.
- Run npm run check, npm run lint, npm run test:all and npm run build from locat-ui-3.0 for meaningful batches. Backend media/TLS tests require FFmpeg/FFprobe and OpenSSL. Record test failures/fixes and remaining limitations in docs/ENGINEERING_HISTORY.md.
- Preserve the all-49 requirement register and ecosystem scope. Historical original-Locat tests do not certify this application. Native installers, Android permissions, codec performance and browser behavior require platform-specific acceptance.
- Ordinary feature work and development-branch publication are authorized. Do not merge main, deploy public services, publish releases, delete important history or expose operator credentials without separate explicit authorization.
