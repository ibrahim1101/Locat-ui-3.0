# LOCAT — COMPLETE ECOSYSTEM MASTER DEVELOPMENT DIRECTIVE

## MISSION: BUILD THE ENTIRE LOCAT ECOSYSTEM

You are the principal software architect, lead full-stack engineer, security architect, native application engineer, DevOps engineer, QA lead, and technical project manager for **Locat**.

Your mission is to transform Locat into an exceptional, privacy-first, self-hosted, cross-platform personal digital ecosystem.

**This is an implementation assignment, not a brainstorming or planning-only assignment.**

I authorize the complete development scope specified below. Every feature is included in the long-term roadmap. Do not arbitrarily discard features because they are complex, time-consuming, or require substantial engineering.

I understand that the complete scope will require many engineering sessions, testing cycles, and releases. Work continuously within available session limits, preserve progress, and make the next session straightforward to resume.

**Do not repeatedly ask me which feature to build next. You have my approval to make ordinary technical decisions, implement features, write tests, create development branches, and commit and push development changes within the boundaries below.**

Do not confuse this authorization with permission to deploy publicly, publish releases, incur expenses, expose secrets, delete important data, or merge into protected branches.

---

# 1. PROJECT AND REPOSITORY

**Active repository:**

https://github.com/ibrahim1101/Locat-ui-3.0

**Active development branch:**

`integration/locat-core`

**Application directory:**

`locat-ui-3.0/`

**Original reference repository:**

https://github.com/ibrahim1101/Locat

The original repository is read-only reference material for recovering existing functionality, specifications, algorithms, tests, and UI behavior.

The new Locat UI 3.0 repository is the source of truth for future development.

## Mandatory initial actions

1. Connect to GitHub and inspect the actual repository.
2. Fetch the latest remote branch state.
3. Read the existing architecture, source code, tests, CI configuration, and documentation.
4. Read:
   - `docs/ENGINEERING_HISTORY.md`
   - `docs/LOCAT_INTEGRATION_EXECUTION_TRACKER.md`
   - `docs/ORIGINAL_LOCAT_REQUIREMENTS.md`
   - `docs/PORTED_INTEGRATIONS.md`
   - `docs/SELF_HOSTING.md`
   - `docs/PRIVATE_STORAGE.md`
   - `docs/LINK_INTEGRATION.md`
   - `docs/REMOTE_INTEGRATION.md`
5. Locate additional relevant documentation and source files.
6. Compare existing implementation with the original Locat repository.
7. Identify working, incomplete, preview-only, untested, and missing functionality.
8. Preserve all existing user data and implemented features.
9. Run the available validation commands and record actual results.
10. Begin implementing the highest-priority incomplete functionality immediately.

Do not assume the latest known commit is still HEAD. Verify the current branch before making changes.

---

# 2. NON-NEGOTIABLE DESIGN REQUIREMENTS

Preserve the premium **Locat UI 3.0** visual identity.

- Matte black and dark surfaces.
- Burnt-orange accent styling.
- Subtle background patterns.
- Premium, restrained typography.
- Smooth, purposeful animations.
- Responsive layouts.
- Consistent navigation.
- Accessible controls.
- High-quality empty, loading, offline, and error states.
- Consistent buttons, sheets, dialogs, cards, inputs, and menus.
- Android and Windows adaptive interfaces.
- System light/dark appearance support where appropriate.
- No unrelated visual themes or mismatched components.
- No excessive dashboard clutter.
- No unnecessary external branding.

Every new module must look like a native part of Locat.

Reuse existing design tokens and shared components.

Avoid creating a completely separate frontend for each module.

**Do not replace functional behavior with visual mockups.**

---

# 3. ARCHITECTURAL OBJECTIVE

Locat must become a unified modular platform with:

- Shared account and identity management.
- Strong authentication and session security.
- Module-specific authorization.
- Local-first functionality where practical.
- Self-hosted backend services.
- Durable relational persistence.
- Client-side encryption where required.
- Secure device identity and pairing.
- Background jobs and notifications.
- Real-time synchronization.
- Media processing and streaming.
- Native operating-system integrations.
- Permission-controlled automation.
- Auditable administrative operations.
- A documented extension architecture.
- Automated testing and reproducible builds.

Favor well-maintained, established technologies and reviewed security protocols.

Do not invent cryptographic protocols where vetted alternatives exist.

Use shared platform services instead of duplicating storage, authentication, search, synchronization, and notification implementations across modules.

Maintain strict isolation between accounts, modules, devices, and security domains.

---

# 4. COMPLETE FEATURE SCOPE

Every module and capability below belongs to the master roadmap.

Existing implementations must be audited and completed rather than unnecessarily rewritten.

## A. LOCAT MESSAGES

Build a fully functional private messaging system.

Required capabilities:

- One-to-one conversations.
- Authenticated user discovery.
- Contact requests and approvals.
- Contact removal and blocking.
- Verified end-to-end encryption.
- Device identity and key verification.
- Secure multi-device key management.
- Offline message delivery.
- Durable conversation history.
- Delivery and read receipts.
- Typing indicators.
- Replies and reactions.
- Forwarding.
- Message editing and deletion.
- Conversation search over authorized decrypted data.
- Encrypted file attachments.
- Voice messages.
- Image and video attachments.
- Group conversations.
- Group roles and membership controls.
- Group encryption lifecycle.
- Disappearing messages.
- View-limited media where technically supportable, with honest limitations.
- Scheduled messages.
- Pinned and saved messages.
- Muting and notification controls.
- Conversation export with appropriate authorization.
- Backup and recovery design.
- Spam and abuse controls.
- Privacy settings.
- Multi-device synchronization.

**Security gate:** do not enable real private messaging until a suitable reviewed E2EE protocol/library is selected, integrated, and tested.

Ciphertext transport alone is not sufficient.

## B. LOCAT CALLS

Implement secure real-time communication.

- One-to-one voice calls.
- Video calls.
- Group calls.
- Screen sharing.
- Microphone and camera controls.
- Device selection.
- Call notifications.
- Call history.
- Connection quality indicators.
- Adaptive media quality.
- WebRTC connectivity.
- Optional TURN infrastructure.
- Encrypted media transport.
- Identity verification.
- Explicit permission handling.
- Background and incoming-call behavior where supported.
- Native Android and Windows integration.

Document the exact encryption and trust properties. Do not claim end-to-end encryption without validating the complete media and key-management architecture.

## C. LOCAT LINK

Complete secure cross-device connectivity.

- Trusted device enrollment.
- Device discovery on the local network.
- mDNS or equivalent discovery where appropriate.
- Secure pairing.
- Mutual identity verification.
- Device naming.
- Peer-key pinning.
- Pair approval and revocation.
- Encrypted text transfer.
- Encrypted file transfer.
- Large-file chunking.
- Resumable transfers.
- Transfer checksums.
- Transfer progress and receipts.
- Cancellation and retry.
- Universal clipboard.
- Cross-device drag-and-drop.
- Phone-to-PC sharing.
- PC-to-phone sharing.
- Notification mirroring with explicit consent.
- Cross-device media discovery.
- Transfer history.
- Device presence.
- LAN-first connectivity without mandatory Tailscale.
- Optional secure remote relay when off-network.

## D. LOCAT REMOTE

Develop authorized remote desktop functionality.

- Browser screen viewing.
- Windows desktop capture.
- Android screen sharing where supported.
- Explicit source consent.
- Secure remote keyboard and mouse control.
- Multi-monitor support.
- Remote audio.
- Adaptive streaming quality.
- Session expiry.
- Session recording only with explicit consent.
- Connection status.
- Revocation.
- Permission auditing.
- Secure unattended access for deliberately enrolled personal devices.
- Device-specific access policies.
- Clipboard and file integration.
- Connection recovery.
- Optional remote connectivity through a relay.

Never silently activate cameras, microphones, screen capture, or remote input.

## E. LOCAT DRIVE

Create a complete self-hosted personal cloud.

- File uploads and downloads.
- Folder management.
- Encrypted storage options.
- File synchronization.
- File version history.
- Recycle bin.
- File previews.
- Search.
- Tags.
- Shared folders.
- Expiring sharing links.
- Recipient authorization.
- Download permissions.
- Storage quotas.
- Offline files.
- Selective synchronization.
- Conflict resolution.
- Large-file resumable transfers.
- Duplicate detection.
- Integrity checks.
- Cross-device availability.
- Audit history.

## F. LOCAT BACKUP AND SYNC

Implement a reliable backup and synchronization platform.

- Windows folder backup.
- Android photo and document backup.
- Scheduled backups.
- Incremental backups.
- Versioned snapshots.
- Encrypted backups.
- Restore workflows.
- Backup verification.
- Backup health monitoring.
- Storage retention policies.
- Recovery drills.
- Settings synchronization.
- Device synchronization.
- Cross-device conflict handling.
- Recovery after device loss.
- Selective restore.
- Backup scheduling and notifications.

Avoid promising access to Android data restricted by operating-system permissions.

## G. LOCAT CINEMA

Complete the media player and server.

- Local video playback.
- Server media libraries.
- Secure streaming.
- Direct playback.
- FFprobe inspection.
- FFmpeg remuxing and transcoding.
- HLS/adaptive streaming.
- Subtitle selection.
- Multiple audio tracks.
- Playback speed.
- Resume playback.
- Watch history.
- Playlists.
- Sequential playback.
- Thumbnails.
- Metadata extraction.
- Series and movie organization.
- Media search.
- Hardware acceleration where supported.
- Quality selection.
- Fullscreen and picture-in-picture.
- Cross-device watch progress.
- Media casting.
- Robust codec error handling.
- 4K playback testing where hardware supports it.

## H. LOCAT MUSIC

Complete the audio ecosystem.

- Local and server audio libraries.
- Background playback.
- Queue management.
- Shuffle and repeat.
- Playlists.
- Playlist editing.
- Cross-device playlist synchronization.
- Track metadata.
- Album artwork.
- Artist and album browsing.
- Favorites.
- Listening history.
- Graphic equalizers.
- Custom EQ presets.
- Gapless playback where supported.
- ReplayGain or suitable loudness management.
- Output device selection.
- Offline music.
- Search.
- Native media controls.
- Lock-screen controls.
- Media casting.

Preserve existing original Locat EQ algorithms where suitable.

## I. LOCAT PHOTOS

Build a private photo ecosystem.

- Photo imports.
- Automatic photo backup.
- Albums.
- Favorites.
- Tags.
- Metadata extraction.
- Search.
- Thumbnail generation.
- Image previews.
- Zoom.
- Rotation and flipping.
- Cropping.
- Color adjustments.
- Text annotations.
- Freehand drawing.
- Undo/redo.
- Non-destructive editing.
- Edited-copy export.
- Duplicate detection.
- Timeline organization.
- Optional local AI classification.
- Cross-device synchronization.
- Shared albums.
- Permission-controlled sharing.

## J. LOCAT CAST

Add media casting.

- Discover compatible TVs and receivers.
- Cast photos, music, and video.
- Playback controls.
- Queue control.
- Subtitle handling where supported.
- Device compatibility detection.
- Session management.
- Secure access to private media.
- Clear fallback behavior for unsupported devices.

## K. LOCAT IDENTITY

Create a dedicated encrypted critical-document manager.

Document categories must include:

- Aadhaar.
- PAN card.
- Passport.
- Voter ID.
- Driving licence.
- Vehicle registration certificate.
- Vehicle insurance.
- PUC certificate.
- Educational certificates.
- Marksheets and degrees.
- Employment documents.
- Medical documents.
- Financial records.
- Tax records.
- Property documents.
- Legal agreements.
- Custom document categories.

Features:

- Encrypted document storage.
- PDF and image previews.
- Secure document scanning.
- OCR where available.
- Document classification.
- Tags and folders.
- Custom fields.
- Expiry reminders.
- Version history.
- Masked sensitive identifiers.
- Biometric reauthentication.
- Offline encrypted access.
- Temporary secure sharing.
- Watermarked exports.
- Access history.
- Recovery and backup.

Investigate official DigiLocker integration only through authorized, supported interfaces.

Never imply that locally uploaded documents are government-verified.

Do not use real Aadhaar/PAN data in tests.

## L. LOCAT WALLET

Build a private digital wallet for records and passes.

### Payment-card records

- Bank and card nickname.
- Cardholder details.
- Last-four-digit display.
- Expiry reminders.
- Encrypted optional card-number storage only after appropriate security assessment.
- Reauthentication before sensitive disclosure.
- Secure copy controls.
- Card organization.
- Lost-card contact information.

**Never store CVV/CVC, payment PINs, or banking authentication secrets in ordinary wallet records.**

Do not implement payment processing or NFC card emulation without a separate compliance and platform review.

### Tickets and passes

- Movie tickets.
- Metro tickets.
- Train tickets.
- Flight boarding passes.
- Bus tickets.
- Event tickets.
- Parking passes.
- Membership cards.
- Loyalty cards.
- Hotel reservations.
- Booking references.
- QR codes and barcodes.
- Imported PDF/image tickets.
- Compatible digital pass formats.
- Offline access.
- Upcoming ticket reminders.
- Expired-pass archiving.

Do not fabricate valid transport credentials or modify signed tickets.

## M. LOCAT VAULT AND SECRETS

Expand the existing experimental private-storage foundation.

- Encrypted file vault.
- Secure notes.
- Credential records.
- Password generation.
- Password strength analysis.
- Password reuse detection.
- TOTP authentication.
- Passkey integration where supported.
- Browser autofill extension.
- Android Autofill integration.
- Encrypted backup.
- Secure recovery.
- Auto-lock.
- Manual lock.
- Biometric reauthentication.
- Device-specific access.
- Security alerts.
- Sensitive-data masking.
- Credential organization.
- Encrypted import/export.
- Clipboard timeout.
- Optional authorized breach checking.
- Independent security review.

Do not market experimental cryptography as independently audited.

## N. LOCAT EMERGENCY KIT

Implement:

- Encrypted emergency recovery packages.
- Recovery-code storage.
- Account recovery guidance.
- Device-loss recovery.
- Optional trusted-contact emergency access.
- Explicit waiting periods and revocation.
- Secure backup instructions.
- Recovery verification.

Avoid recovery mechanisms that silently undermine end-to-end encryption.

## O. LOCAT SENTINEL

Expand the security center.

- Authentication audit logs.
- Device events.
- Security incidents.
- Severity escalation.
- Incident acknowledgement.
- Incident history.
- Webhook ingestion.
- nScout integration.
- PipelineGuard integration.
- Additional authorized security integrations.
- Alert rules.
- Notifications.
- Incident timelines.
- Source health monitoring.
- Retention policies.
- Redaction.
- Integration-token management.
- Administrative audit logs.
- Secure export.
- Optional external notifications.
- Device-security dashboards.

## P. LOCAT CONTROL CENTER

Create a personal infrastructure dashboard.

- Windows system monitoring.
- Raspberry Pi monitoring.
- Linux host monitoring.
- CPU and memory usage.
- Temperatures.
- Storage health.
- Network traffic.
- Docker container status.
- Service health.
- Process visibility where authorized.
- Uptime.
- Resource alerts.
- Wake-on-LAN.
- Approved restart/shutdown controls.
- Remote service management.
- Backup health.
- System notifications.
- Historical metrics.
- Explicit permission boundaries.

## Q. LOCAT TERMINAL

Implement authorized administration tools.

- SSH connection management.
- SSH key support.
- Secure credential references.
- Terminal sessions.
- SFTP file browsing.
- Remote file transfers.
- Connection history.
- Host-key verification.
- Command audit logs.
- Session expiry.
- Permission-controlled access.
- Raspberry Pi and Linux compatibility.
- Windows OpenSSH compatibility.

Never disable host-key verification by default.

## R. LOCAT DOWNLOADS

Build a download manager.

- HTTP/HTTPS downloads.
- Resumable downloads.
- Download queues.
- Scheduling.
- Parallel downloads with safe limits.
- Checksums.
- Retry.
- Bandwidth controls.
- Download history.
- Server-side download destinations.
- Storage quota enforcement.
- Failure reporting.
- Integration with Drive and media libraries.

Prevent SSRF, internal-network abuse, and unauthorized server file access.

## S. LOCAT WORKSPACE

Build a complete productivity suite.

- Notes.
- Rich-text editing.
- Markdown support.
- To-do lists.
- Kanban boards.
- Project organization.
- Attachments.
- Shared workspaces.
- Permissions.
- Activity history.
- Search.
- Templates.
- Offline editing.
- Cross-device synchronization.
- Collaboration where supported.

## T. LOCAT CALENDAR

Implement:

- Calendar events.
- Multiple calendars.
- Reminders.
- Recurring events.
- Task integration.
- Shared calendars.
- Import/export.
- Time-zone handling.
- Event attachments.
- Notifications.
- Optional calendar-provider synchronization.

## U. LOCAT AUTOMATE

Build a permission-controlled automation engine.

- Trigger/action workflows.
- Visual workflow builder.
- Scheduled jobs.
- Webhooks.
- Device triggers.
- File triggers.
- Security triggers.
- Notification actions.
- Backup workflows.
- Approval gates for sensitive operations.
- Execution history.
- Retry handling.
- Failure alerts.
- Secrets isolation.
- Rate limiting.
- Loop prevention.
- Auditing.

Automations must not bypass module permissions.

## V. LOCAT AI AND LOCAT BRAIN

Build an optional privacy-conscious intelligence layer.

- Local AI model integration.
- Configurable model providers.
- AI-assisted search.
- Document summarization.
- OCR assistance.
- Audio transcription.
- Media organization.
- Note summarization.
- Project knowledge graph.
- Source-linked answers.
- Semantic search.
- Explicit per-module data permissions.
- Opt-in indexing.
- Clear local/cloud processing disclosure.
- Model resource monitoring.
- Ability to disable AI entirely.

Sensitive Vault, Wallet, Identity, and Secrets content must never be automatically exposed to AI providers.

No mandatory paid AI subscription.

## W. LOCAT UNIVERSAL SEARCH

Create a unified search service.

- Search authorized documents.
- Search media.
- Search notes.
- Search contacts.
- Search tickets.
- Search tasks.
- Search permitted records.
- Local search indexes.
- Optional semantic search.
- Search filters.
- Privacy-aware indexing.
- Offline search where feasible.
- Module-specific access enforcement.

Encrypted private content must not be indexed as plaintext on the server without an explicit security design and informed opt-in.

## X. LOCAT FINANCE

Create a personal finance manager.

- Expense tracking.
- Income tracking.
- Budgets.
- Categories.
- Subscription tracking.
- Bills.
- EMI schedules.
- Loan tracking.
- Savings goals.
- Financial dashboards.
- CSV import/export.
- Recurring transactions.
- Payment reminders.
- Manual reconciliation.
- Financial reports.
- Optional authorized banking integrations.

Do not assume access to banking APIs or store banking credentials insecurely.

## Y. LOCAT INVENTORY

Implement:

- Electronics inventory.
- Appliance inventory.
- Valuable items.
- Purchase dates.
- Receipts.
- Serial numbers.
- Warranty records.
- Maintenance history.
- Repair tracking.
- Replacement reminders.
- Insurance documentation.
- Custom categories.
- Links to Identity, Wallet, and Drive.

## Z. LOCAT TRAVEL

Implement:

- Trip itineraries.
- Flight and train bookings.
- Hotel reservations.
- Travel documents.
- Packing lists.
- Travel budgets.
- Offline itineraries.
- Booking reminders.
- Calendar integration.
- Wallet ticket integration.
- Travel history.
- Shared trip planning.

## AA. LOCAT HEALTH

Build an optional, strongly isolated personal health-record module.

- Medical documents.
- Prescriptions.
- Appointment tracking.
- Medication reminders.
- Vaccination records.
- Health insurance records.
- Emergency medical information.
- Explicit data import/export.
- Fine-grained access permissions.
- Encryption and privacy controls.
- Optional supported health-platform integrations.

Health data must not be used for unrelated analytics, AI, advertising, or sharing without explicit authorization.

Do not provide unsupported medical conclusions.

## AB. LOCAT GARAGE

Implement:

- Vehicle profiles.
- Registration documents.
- Driving licence references.
- Insurance policies.
- PUC records.
- Service schedules.
- Maintenance history.
- Fuel logs.
- Mileage tracking.
- Repair expenses.
- Renewal reminders.
- Challan references.
- Vehicle-specific document folders.

## AC. LOCAT MAIL

Build a unified email client for supported providers.

- Multiple accounts.
- OAuth where available.
- IMAP/SMTP where appropriate.
- Inbox and folders.
- Compose and reply.
- Attachments.
- Search.
- Filters.
- Notifications.
- Offline cache.
- Secure token storage.
- Account isolation.
- Provider compatibility handling.

Do not bypass provider authentication policies.

## AD. LOCAT LIBRARY

Create a personal knowledge and reading library.

- Bookmarks.
- Saved articles.
- PDFs.
- Ebooks.
- Reading lists.
- Highlights.
- Annotations.
- Tags.
- Offline reading.
- Search.
- Import/export.
- Optional reading progress synchronization.

Respect copyright and source-site restrictions.

## AE. LOCAT CONTACTS

Build a full contact-management system.

- Contact profiles.
- Phone numbers.
- Email addresses.
- Birthdays.
- Anniversaries.
- Groups.
- Custom fields.
- Avatars.
- vCard import/export.
- Contact deduplication.
- Optional device contact sync.
- Integration with Messages and Calls.
- Permission-controlled sharing.

## AF. LOCAT SCANNER

Implement:

- Document camera scanning.
- Edge detection.
- Perspective correction.
- Image enhancement.
- Searchable PDF export.
- QR scanning.
- Barcode scanning.
- Receipt scanning.
- Business-card scanning.
- Local OCR where supported.
- Structured-field extraction.
- Saving to Identity, Wallet, Inventory, or Drive.

## AG. LOCAT LOCK AND PRIVACY CENTER

Implement:

- Application lock.
- Biometric reauthentication.
- Session timeout.
- Sensitive-screen privacy mode.
- Device access management.
- Integration permissions.
- Shared-link visibility.
- Permission revocation.
- Privacy audit history.
- Data export.
- Data deletion workflows.
- Explicit consent management.
- Security settings dashboard.

## AH. LOCAT GUARDIAN

Create a device-loss and security-response system.

- Lost-device marking.
- Session revocation.
- Credential rotation guidance.
- Device access suspension.
- Remote Locat-managed data wipe where platform permissions support it.
- Recovery workflows.
- Device security notifications.
- Audit history.
- Protection against accidental destructive actions.

Never imply that offline devices have been wiped before acknowledgement.

## AI. LOCAT TIMELINE

Implement a searchable history of authorized user activity.

- File transfers.
- Document additions.
- Device pairings.
- Security incidents.
- Backup operations.
- Reminder completion.
- Account changes.
- Important automation events.
- Search and filtering.
- Configurable retention.
- Sensitive-data redaction.
- Per-module visibility controls.

## AJ. LOCAT PLACES

Build an explicitly opt-in location module.

- Saved places.
- Parking locations.
- Trip logs.
- Location-based reminders.
- Optional location history.
- Local-only storage choices.
- Geofencing where supported.
- Data export and deletion.
- Clear permission controls.

No covert tracking or default-on location collection.

## AK. LOCAT HOUSEHOLD AND FAMILY

Implement:

- Household profiles.
- Shared shopping lists.
- Chores.
- Shared calendars.
- Shared expenses.
- Family document folders.
- Shared media libraries.
- Permission-controlled access.
- Storage quotas.
- Household inventory.
- Shared reminders.
- Member invitation and removal.
- Data ownership and recovery policies.

## AL. LOCAT HOME

Provide optional smart-home integration.

- Home Assistant integration.
- Device status.
- Approved device controls.
- Automation triggers.
- Sensor dashboards.
- Scenes.
- Notifications.
- Local-network operation.
- Permission management.
- No mandatory cloud account.

## AM. LOCAT STUDIO AND EXTENSIONS

Create a secure extension ecosystem.

- Documented extension SDK.
- Scoped plugin permissions.
- Extension lifecycle.
- Extension settings.
- API connectors.
- Automation templates.
- Development tools.
- Extension diagnostics.
- Installation and update controls.
- Revocation.
- Signature and provenance verification where appropriate.
- Sandboxing or isolation suitable for the extension type.
- Security review requirements.

No unrestricted execution of untrusted plugin code.

---

# 5. NATIVE PLATFORM REQUIREMENTS

## Windows

Create a proper desktop application with:

- Native installer.
- Start-menu integration.
- System tray.
- Startup options.
- Notifications.
- File associations where appropriate.
- Windows Hello integration where feasible.
- Secure credential storage.
- Background services only when needed and explicitly enabled.
- Native filesystem integration.
- Media controls.
- Remote desktop permissions.
- Clean startup and shutdown.
- Automatic backend lifecycle management.
- No unnecessary visible command prompt.
- Signed releases when signing infrastructure is available.

## Android

Create a native-quality Android application with:

- Installable APK.
- Adaptive UI.
- Notification integration.
- Background transfer support.
- Android share-sheet integration.
- Secure local storage.
- Biometric unlock.
- Media permissions.
- File picker.
- Camera and document scanning.
- Android Autofill where feasible.
- Proper foreground-service handling.
- Battery-aware synchronization.
- App lifecycle management.
- Secure device pairing.
- Offline functionality.

Respect current Android permission, background execution, and storage restrictions.

## Linux and Raspberry Pi 5

Support:

- Self-hosted server operation.
- ARM64 compatibility.
- Docker deployment where feasible.
- Native service management.
- Local-network discovery.
- Storage configuration.
- Backup and recovery.
- Health monitoring.
- TLS onboarding.
- Secure access from Windows and Android clients.

My intended hardware includes a Windows PC and Raspberry Pi 5.

**Core requirement:** devices on the same LAN should be able to use Locat without mandatory Tailscale or an external cloud service.

Off-network access may use optional secure relay or VPN-compatible configurations.

---

# 6. SECURITY REQUIREMENTS

Security is foundational, not a finishing step.

Implement and test:

- Threat models for sensitive modules.
- Authenticated and authorized APIs.
- Strong session handling.
- Secure password hashing.
- Authentication rate limiting.
- CSRF and Origin protections.
- Safe input validation.
- Strict account isolation.
- Encrypted transport.
- Appropriate client-side encryption.
- Key rotation and revocation.
- Secure key storage.
- Replay protection.
- Secure file handling.
- Upload size limits.
- Quotas.
- Safe archive extraction.
- Path traversal defenses.
- SSRF protection.
- Secure media processing.
- Audit logging.
- Sensitive-data redaction.
- Dependency and supply-chain scanning.
- Backup integrity.
- Recovery testing.
- Safe defaults.
- Consent and permission controls.

Use established cryptographic libraries and protocols.

Distinguish carefully between:

1. Transport encryption.
2. Server-side encryption.
3. Client-side encryption.
4. Independently reviewed end-to-end encryption.

Do not describe these as interchangeable.

Do not put real Aadhaar numbers, PAN numbers, payment-card data, passwords, medical records, or other sensitive personal information into fixtures, logs, screenshots, telemetry, or tests.

Use synthetic data.

Sensitive modules must not be considered production-ready solely because automated tests pass.

---

# 7. DATA AND STORAGE ARCHITECTURE

Design shared platform services for:

- Accounts.
- Devices.
- Sessions.
- Module permissions.
- Encrypted objects.
- Files.
- Search.
- Synchronization.
- Notifications.
- Scheduled jobs.
- Audit events.
- Backup manifests.
- Feature configuration.

Keep encryption boundaries explicit.

Use additive schema migrations.

Preserve existing data.

Provide rollback and recovery strategies where practical.

Avoid breaking original Locat compatibility silently.

If migration from the original repository is required, document supported and unsupported formats.

Do not invent migration compatibility.

---

# 8. IMPLEMENTATION ORDER

Implement the entire scope through coordinated engineering phases.

## Phase 0 — Repository audit and stabilization

- Inspect current HEAD.
- Fix broken builds.
- Validate existing tests.
- Identify regressions.
- Audit current implementations.
- Establish master feature inventory.
- Record security and architecture risks.

## Phase 1 — Platform foundation

- Authentication hardening.
- Authorization framework.
- Shared storage.
- Notifications.
- Search foundations.
- Background jobs.
- Synchronization architecture.
- Configuration.
- Observability.
- Backup infrastructure.

## Phase 2 — Communication

- Complete reviewed E2EE.
- Full messaging lifecycle.
- Multi-device messaging.
- Attachments.
- Groups.
- Calls.

## Phase 3 — Devices

- Native hosts.
- LAN discovery.
- Link enhancements.
- Remote control.
- Device sync.
- Guardian.

## Phase 4 — Personal cloud and security

- Drive.
- Backup.
- Identity.
- Wallet.
- Vault and Secrets.
- Emergency Kit.
- Privacy Center.

## Phase 5 — Media

- Cinema completion.
- Music completion.
- Photos completion.
- Cast.
- Cross-device media sync.

## Phase 6 — Productivity and personal life

- Workspace.
- Calendar.
- Automate.
- Finance.
- Inventory.
- Travel.
- Health.
- Garage.
- Household.

## Phase 7 — Advanced ecosystem

- Mail.
- Terminal.
- Downloads.
- Library.
- Contacts.
- Scanner.
- Places.
- Timeline.
- Control Center.
- Home.
- AI and Brain.
- Universal Search.
- Studio and Extensions.

## Phase 8 — Platform completion and hardening

- Windows packaging.
- Android packaging.
- Raspberry Pi/ARM64 deployment.
- Accessibility.
- Performance.
- Reliability.
- Security review.
- Recovery drills.
- Cross-platform testing.
- Release readiness assessment.

**These phases are a dependency-based guide, not an excuse to postpone independent work.**

Implement safe, independent modules in parallel where appropriate.

Never claim a phase is complete while mandatory functionality remains unimplemented or unverified.

---

# 9. QUALITY AND TESTING

For every substantial implementation:

1. Add or update tests.
2. Run TypeScript checks.
3. Run lint.
4. Run unit tests.
5. Run integration tests.
6. Run backend API tests.
7. Run production builds.
8. Run security-relevant negative tests.
9. Verify database migration behavior.
10. Document remaining limitations.

Where supported, add:

- Browser E2E testing.
- Android emulator testing.
- Windows desktop smoke tests.
- Linux testing.
- ARM64 build testing.
- Docker runtime testing.
- Media codec tests.
- Multi-device integration tests.
- Performance tests.
- Backup/restore drills.
- Accessibility checks.

Do not claim physical-device validation unless it actually occurred.

If a toolchain or device is unavailable, complete all independently testable work and mark the specific acceptance step blocked.

Do not mark the entire project blocked.

---

# 10. DEVELOPMENT AND GITHUB RULES

I authorize ordinary development operations on the approved development branch.

You may:

- Inspect source code.
- Create and edit files.
- Refactor code.
- Add dependencies when justified.
- Add migrations.
- Add tests.
- Update CI.
- Create feature branches when appropriate.
- Commit changes.
- Push development commits.
- Open development pull requests.
- Update engineering documentation.

You must not without separate approval:

- Merge into `main`.
- Delete important branches or history.
- Publish production releases.
- Deploy publicly.
- Incur paid service charges.
- Purchase domains or certificates.
- Expose credentials.
- Disable security protections.
- Destroy user data.
- Replace working modules with untested rewrites.
- Make irreversible infrastructure changes.

Do not commit generated secrets, private keys, tokens, or production credentials.

Use meaningful commit messages.

Keep changes reviewable and traceable.

---

# 11. REQUIRED ENGINEERING DOCUMENTATION

Maintain or create:

- `docs/MASTER_ROADMAP.md`
- `docs/FEATURE_MATRIX.md`
- `docs/ENGINEERING_HISTORY.md`
- `docs/ARCHITECTURE.md`
- `docs/SECURITY_MODEL.md`
- `docs/TESTING_STATUS.md`
- `docs/NATIVE_PLATFORM_STATUS.md`
- `docs/SELF_HOSTING.md`
- `docs/KNOWN_LIMITATIONS.md`
- `docs/SESSION_HANDOFF.md`

The feature matrix must distinguish:

- Planned.
- In progress.
- Implemented.
- Tested.
- Platform verified.
- Security reviewed.
- Blocked.

These are separate states.

A feature must not be called production-ready simply because its source code exists.

For each session, record:

- Starting commit.
- Ending commit.
- Files changed.
- Features implemented.
- Tests executed.
- Actual test results.
- Remaining issues.
- Next dependencies.
- Exact commands to resume.

Keep documentation synchronized with actual code.

---

# 12. AUTONOMOUS CONTINUATION POLICY

This project is expected to take substantial time.

Do not stop after creating a roadmap.

Do not stop after one feature.

Do not stop after a successful build.

Do not stop merely because one module is blocked.

Continue implementing the next independent, valuable feature whenever the current work is safely complete.

Avoid repeatedly asking for routine approval.

Make reasonable engineering decisions, explain them in documentation, and proceed.

If an external authorization, paid service, unavailable hardware, or destructive operation is required, isolate that dependency and continue other work.

Respect session and tool limits. Do not claim to work while no session or scheduled execution is running.

At the end of each session, leave a complete handoff so the next Work session can resume immediately.

---

# 13. SUCCESS CRITERIA

The final goal is a cohesive Locat ecosystem in which:

- Users can securely communicate.
- Devices can connect and share.
- Personal files can synchronize.
- Media can be played and managed.
- Important documents can be stored securely.
- Tickets and passes can be accessed.
- Passwords and secrets can be protected.
- Personal finances and records can be organized.
- Productivity tools can synchronize.
- Infrastructure can be monitored.
- Authorized remote access works.
- Automations can coordinate modules.
- Optional AI can help without undermining privacy.
- Windows and Android applications work reliably.
- A Raspberry Pi or Linux server can host the ecosystem.
- LAN operation does not require an external cloud.
- Every sensitive feature has appropriate security controls.
- Every completed feature has evidence of implementation and validation.

The final result should feel like **one polished product**, not a collection of unrelated demos.

Prioritize reliability, security, performance, maintainability, and exceptional user experience.

---

# 14. START EXECUTION NOW

Begin immediately.

Your first response should briefly identify the verified repository checkpoint, the most important existing implementation gaps, and the first engineering batch.

Then proceed to actual code changes.

Do not respond with only a plan.

Do not ask me to select features.

Do not ask me to reconfirm the complete roadmap.

You have my authorization for routine development commits and pushes to the approved development branch.

**Build the complete Locat ecosystem. Preserve the UI 3.0 design. Implement every feature in this directive over successive verified engineering checkpoints. Keep going as far as your tools and session allow.**

**LOCAT IS THE PRODUCT. THIS IS THE MASTER DEVELOPMENT DIRECTIVE.**


Implementation evidence: see FEATURE_MATRIX.md, CONNECT_IMPLEMENTATION_TRACKER.md and ENGINEERING_HISTORY.md. This directive describes authorized scope, not completed behavior.

## Critical execution priority — 2026-10-16

The global-connectivity/E2EE directive changes implementation order only. Prioritize actual UI encrypted conversations, reliability and browser acceptance before global hosting, federation, WebRTC/TURN and native validation; preserve every section and original requirement above. First server dependency implemented: authorized private Matrix v12 rooms and registered-room ciphertext transport, additive schema 15. Full protected key distribution, scoped sync and user-facing Send/Receive are unfinished; no milestone or public-beta completion claim. See MATRIX_CONVERSATIONS.md and SESSION_HANDOFF.md for exact evidence and next task.

Protected messaging dependency update: authorized encrypted Olm key delivery and opt-in registered-room sync are now implemented and validated with actual SDK clients and a production HTTPS server, including protected offline restart/tamper/revocation checks. The next priority remains account-scoped browser crypto ownership/controller and existing conversation UI integration, with verified-device/membership/rotation guards and full Chromium acceptance before enabling Send. No ecosystem section or original requirement is removed; no cross-network/native/federation milestone is claimed.

Account-owned browser integration (local source 16a9452): explicit handle adoption/stop, guarded controller, bounded original-event retries and real Contacts-to-conversation UI are implemented with 261 frontend/111 backend tests and production HTTPS controller acceptance. Send remains hard-gated pending new built-browser room/ownership acceptance and actual Send/Receive/reliability/security coverage. No milestone completion claim.

Full browser acceptance candidate: prerequisites passed at bf24e71 / workflow 38866823701, all four jobs; browser 116861467492 passed seven scenarios (53.6s) plus three repetitions (12.0s), including native owner retention and real encrypted-room sync with Send disabled. Local 261 frontend/111 backend and real HTTPS controller/lost-ack tests pass. New source ecd9a9e exercises actual Send, unverified-device block, offline homeserver restart, reload/rebind, tamper/cross-account/revocation and plaintext scans in the isolated CI acceptance build only. Default Send remains disabled until this candidate is observed passing; no messaging milestone completion claim yet.

Full candidate accepted at 2d0e2ad / run 38868622567 / browser 116867181610: seven scenarios in 1.3m, three repetitions in 10.3s, all four jobs succeeded. Actual built UI Send/Receive, unverified-device blocking, offline/homeserver restart, reload/key/trust/history retention, tamper/cross-account/revocation and ciphertext persistence checks passed. Default Send is now enabled and the acceptance-only build flag removed; fresh SDK key query precedes guards. Local 262 frontend/111 backend + type/lint/build/real HTTPS/Synapse pass; normal-build CI still pending. Broader reliability/recovery, native/physical/global/federation/TURN and ecosystem scope remain open.

Normal-build acceptance observed: 443963655f3084f8526f44504b6ea3e2ecb7641b / workflow 38870437274 / browser 116872990381 passed seven scenarios (56.4s) and three repetitions (11.7s). The complete text messaging/security flow runs with default Send enabled and no test-only build setting. Ubuntu/macOS source checks succeeded; Windows job 116872990651 succeeded; all four jobs passed. This demonstrates the two-user same-homeserver UI objective in isolated Chromium; broader reliability/recovery/public/global/native/federation/calls remain open. Next priority is durable uncertain-send/history/multiple-room reliability, preserving the full roadmap.

2026-10-16 room-lifecycle reliability follow-on: each explicit conversation open requests a generation-scoped full-state sync, preserving incremental sync after success and rejecting stale acknowledgements across room changes. Local 263 frontend/111 backend plus type/lint/build/real Synapse/HTTPS pass. The Chromium scenario now adds a second private room with a third account while the original owner remains active, checks history isolation/unverified-device denial and returns to the original room. New browser CI pending; prior normal messaging acceptance remains 4439636 / 38870437274. Durable outbox/full paging/recovery and all global/native/federation/calls scope stay open.

Bounded history follow-on: shared UI3 history control invokes reviewed SDK scrollback through existing protected history access, at most 50/page, three pages/open and 200 timeline events. Contact/device/room guards and serialized operations apply; actual HTTPS/Synapse paging passes, new browser control acceptance pending. First room-refresh browser run 38878644477 failed awaiting the second-room sync request after 15 seconds; subsequent acceptance is required. Durable outbox/full recovery/global/native scope remains open.

Retry safety follow-on: uncertain original-event replay is limited to five minutes as well as three attempts, with backward-clock refusal. Actual HTTPS/Synapse confirms same-device/new-token identical ciphertext/transaction returns the original event, and a third private room can sync on the running SDK client. No durable sender outbox is enabled. Shared UI3 setup retry is available after failure; existing pending room reservations cannot be replayed. Expanded Chromium run 38879316491 failed before room refresh with a setup alert; the next scenario waits for completed creator setup and explicitly tests one injected pending failure followed by real retry. New browser acceptance pending; local 266 frontend/111 backend and full checks pass.

Process-restart acceptance candidate: eighth Chromium scenario uses a private temporary persistent profile and two separate browser processes to verify unchanged bound keys after graceful shutdown/reopen. Syntax/lint/discovery pass; actual execution pending. Real HTTPS negative checks after token reissue use the new current grant and verify queued deletion invalidates both upstream tokens. This is not crash recovery, new-device identity recovery, native-platform or full roadmap completion.

Expanded reliability remains blocked: 38880030337 / browser 116904259186 passed second-room/retry/isolation/unverified-device stages, then failed offline recipient delivery after homeserver restart (60 seconds). Added bounded credential-free browser diagnostics and actual HTTPS multi-room/offline/restart reproduction. New execution pending; no complete reliability milestone claim.

Browser online catch-up candidate: 38880790709 / browser 116906763002 passed seven scenarios including actual persistent-profile Chromium process restart, but multi-room offline delivery still failed with restored SYNCING/HTTP 200 and no decryption failures. Node HTTPS/Synapse multi-room/full-sync/offline/restart reproduction passes. New account-owned online listener requests a generation-scoped authorized recent full-state window, then resumes incremental sync without replacing keys. New Chromium acceptance pending; no complete reliability/public/native milestone claimed.

Decryption lifecycle follow-on: projection now observes the SDK existing decryption promise once per event rather than repeatedly queuing retries every 300 ms. Shutdown still awaits that original promise. New regression and full local checks pass (267 frontend/111 backend); actual enhanced Synapse/HTTPS multi-room/offline/history/token-reissue checks pass. Actual Chromium for the latest combined source remains pending; prior offline failure is not declared resolved.

Sender acknowledgement acceptance is now scoped to the real Messages log and requires cleared draft/no sender alert before offline assertions. Generic text lookup could match retained composer content. 38881533947 and 38881913336 still failed offline delivery; no resolution is claimed. Real HTTPS receiving-controller projection after multi-room/full-sync/offline/restart passes. New strengthened Chromium run pending.
