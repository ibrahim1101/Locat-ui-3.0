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

Confirmed reconnect race: strengthened run 38882443056 / browser 116912144817 found an unsent retained draft with "Messaging is reconnecting", correcting earlier apparent acknowledged-message-loss reports. Room setup now awaits the SDK processed sync event for the current successful refresh before enabling composition; stale/cached/failed state cannot unlock it. A 30-second wait cancels cleanly on close; failed setup clears readiness and supports safe retry. Targeted tests pass; full new browser acceptance pending.

Processed-sync fix accepted for exercised stages in 38882934374: true acknowledged send, room switching, offline homeserver restart delivery, reload and bounded history passed. Messaging then failed an interceptor routeError flag after observing ciphertext rejection; final revocation/storage assertions were not reached. New interceptor uses a 70-second long-poll budget, recognizes explicit client aborts and requires successful changed-response fulfillment plus a newly appearing decryption-failure row. Complete new browser acceptance pending.

Initial-room fixture precondition: 38883584339 failed before messaging because cached transport state did not prove creator bootstrap complete. Each opener now requires resolved peer/room publication before the second starts; both rooms still must synchronize and enable composition before Send. Explicit pending-failure/retry and every security assertion remain. Complete new Chromium acceptance pending.

History acceptance correction: 38884136009 / browser 116917673373 passed the first real history page but incorrectly expected cursor exhaustion after one page. The new fixture requires successful bounded pages until end or three-action budget, unique existing messages, no error and a disabled control after end/budget. Production code unchanged; complete new Chromium acceptance pending.


### Accepted expanded messaging checkpoint — 2026-10-16

Source/fixture **3f2d8b646cddcda0cbda78ee6c168120b4105818**, workflow **38884847787**: Ubuntu **116919984756**, Windows **116919985148**, macOS **116919985161**, Chromium **116919985241** all successful. Actual logs confirm 267 frontend / 111 backend tests, enhanced real HTTPS/Synapse acceptance, eight browser scenarios (1.2m) and three repetitions (10.0s). The built UI passed acknowledged encrypted sends, multi-room isolation and setup retry, offline Synapse restart delivery, reload/reply, real bounded history, fulfilled tampered-ciphertext rejection, cross-account denial, live device revocation and plaintext scans. Separate graceful Chromium process restart preserves native keys. This is isolated browser/source CI, not physical native or international-network acceptance. Full recovery, durable outbox, Locat gateway-process restart, federation and TURN remain open. No deployment, key reset, migration or theme change.


### Gateway proof recovery acceptance — 2026-10-16

Started published **287140d** after the accepted 3f2d8b6 checkpoint. Ending runtime/fixture source local **4156e66c1736fd91ee17685499b36a9c95214397**, published **4d7203839735686cbf3d3575c62bdef649c28eed** adds typed HTTP status to Link failures, single fresh private-key proof setup shared by concurrent denied reads, and one read retry. An old rejected token cannot invalidate an already renewed token. Matrix GET transport can similarly renew proof once. POST/PUT and other mutations are never replayed by this recovery layer; persistent denial or revoked-key proof failure remains terminal. Account/session/device guards, keys and ciphertext are unchanged.

Actual gateway restart is added to the built Chromium conversation scenario using the same isolated SQLite database, TLS origin and Synapse. It requires old proof denial, fresh successful sync on both still-open clients, retained history and another acknowledged encrypted UI message, followed by existing tamper/revocation/plaintext checks. **Gateway restart passed actual Chromium in workflow 38886169276: browser 116924320074, eight scenarios (1.2m), three repetitions (10.3s). Ubuntu 116924320383 and macOS 116924320272 succeeded. Windows 116924320356 also succeeded: all four jobs are green.** The old proof was denied; both live clients resumed with fresh proofs and exchanged another encrypted message without page reload, followed by tamper/account/revocation/plaintext acceptance. Local check/lint/build and 271 frontend / 111 backend tests passed (17 focused proof/transport tests). Commands: `npm run check`, `npm run lint`, `npm run test:all`, `npm run build`, targeted Link/Matrix Vitest tests, `node --check tools/browser-fixture.mjs`, `node --check browser-tests/matrix.spec.mjs`, and `LOCAT_TEST_SYNAPSE_PYTHON=/workspace/scratch/8b3ebd8f9a46/synapse-test-env/bin/python npm run test:matrix` (passed: real HTTPS/Synapse harness). No dependency, migration, deployment or UI theme change. The isolated HTTPS gateway fixture restart/readiness was also exercised locally and passed. Next: implement durable encrypted outbox/reconciliation after this accepted checkpoint. SDK inspection confirms MatrixEvent.toJSON includes decrypted content and must never be used for ciphertext persistence; SDK default sync/pending storage is not adopted. Persist only explicitly validated wire ciphertext, original transaction and bounded account/device/room metadata, with fresh authorization before any replay and a finite replay horizon. No durable outbox is implemented by this batch.


### Durable ciphertext retry candidate — 2026-10-16

Starting remote **246ca69866b0c894f63da2f52fdaceb74f90b50f**; runtime/fixture source local **9bbafbbfa7c1d342e356db585acd6f7f7e1f4cfe**. Added `matrixOutbox.ts` with a single strictly validated, account/origin/Matrix-device-scoped IndexedDB retry record. Metadata is committed before encryption starts; wire Megolm ciphertext is committed with strict transaction durability before every network transmission. No drafts, SDK event serialization, access tokens, proofs or keys enter the record. The exact original room/transaction/ciphertext is immutable; actual wire attempts are limited to three within five minutes, with backward-clock refusal. Storage failure blocks transmission. Native owner locks serialize access; existing pin/account checks remain mandatory.

The controller can restore an encrypted SDK MatrixEvent, add it as a pending local event and invoke the reviewed SDK resend API after fresh contact/verified-device/exact-room checks. No new cryptography or automatic replay is introduced. Shared UI3 controls offer retry, navigation to the original pending contact and explicit confirmation to forget the local retry record; the composer stays blocked while a retry is unresolved. Forgetting does not recall server-accepted content. Incomplete metadata without ciphertext is safe to clear because no network transmission can precede the ciphertext commit.

Local **279 frontend / 111 backend tests** passed, plus type/lint/build, 26 focused journal/controller/transport tests and real HTTPS/Synapse acceptance. The first targeted run failed because an old factory test used `indexedDB={}`; replaced with a real fake-indexeddb factory and reran successfully. Commands: `npm run check`, `npm run lint`, `npm run test:all`, `npm run build`, targeted Vitest for matrixOutbox/matrixOutboxRecovery/matrixConversationSession/matrixCryptoSession, `node --check browser-tests/matrix.spec.mjs`, `git diff --check`, and `LOCAT_TEST_SYNAPSE_PYTHON=/workspace/scratch/8b3ebd8f9a46/synapse-test-env/bin/python npm run test:matrix`. Existing bundle-size warning remains. Node acceptance does not by itself certify the new journal.

The expanded built Chromium conversation test injects a lost acknowledgement after a real accepted encrypted send, blocks its sender sync echo, checks the native ciphertext-only journal, reloads/rebinds the same sender, withholds the original historical echo, and requires the exact original ciphertext/path to be retried, one recipient message and normal subsequent tamper/revocation/plaintext checks. **This candidate requires CI/browser acceptance; accepted runtime evidence remains 4d72038 / 38886169276.** No deployment, migration, new dependency or public/native claim. Next: observe the candidate CI, fix failures without weakening assertions; add accepted-event reconciliation and broader interrupted/revoked-device journal acceptance before closing Milestone B.


Windows CI follow-up: historical docs-only runs **38886807986 / Windows 116926428808** and **38886951937 / Windows 116926897002** failed media processing with `spawn ffmpeg ENOENT`; their browser/Ubuntu/macOS jobs succeeded. Actual Windows logs show Chocolatey HTTP 503 for FFmpeg/OpenSSL, zero packages installed, yet the install step exited successfully. Local source **6e8613fd4b4d8e2ad68c6c96896007e1b60b8c2b** adds three bounded install attempts, refreshed tool paths and explicit executable startup checks. It does not skip media tests or fetch unverified alternative binaries. Candidate **acbaa9e5d676717beb4a26a1a7e925532ddece68 / 38890117507** is running the new ciphertext-recovery browser scenario; Windows workflow correction requires its own observed CI. No new Windows/native compatibility claim.


### Ciphertext retry accepted; shutdown/tool follow-up — 2026-10-16

Runtime **acbaa9e5d676717beb4a26a1a7e925532ddece68**, workflow **38890117507**, all four jobs successful: browser **116937282890** (eight scenarios **1.5m**, three repetitions **12.0s**), Ubuntu **116937283132**, macOS **116937283117**, Windows **116937283231**. Actual logs confirm **279 frontend / 111 backend tests** and real HTTPS/Synapse acceptance. Built Chromium proved native ciphertext-only journal persistence, sender reload/same-device token reissue, identical original ciphertext and transaction retransmission after a real lost acknowledgement, one recipient message, continued history and all existing tamper/cross-account/revocation/plaintext assertions. This supersedes the pending-browser status of the candidate above; broader recovery/long-term outbox and Milestones B–G remain open.

Follow-up runtime **d16f95325d187bb0ae2aedb7840e059cc2309eb7** makes repeated conversation shutdown calls share one completion promise so pending guards/journal work settle before ownership release. A new regression verifies a second close cannot finish early. Local **280 frontend / 111 backend**, type/lint/build passed; 14 targeted shutdown/recovery tests passed. Windows workflow now retries transient feed/install failure at most three times, validates actual tool startup, and persists resolved tool directories. Workflow YAML parsed with all OS checks retained. These follow-up changes require the next observed CI; the accepted ciphertext retry evidence remains acbaa9e / 38890117507. No public deployment, data/key reset or new dependency. Next: observe follow-up CI; implement acknowledged-event reconciliation without retransmission, and expand actual-browser expired/revoked/cross-account journal cases.


### Exact acknowledgement reconciliation candidate — 2026-10-16

Starting remote **940ace076ff6b005ac542c3b1c8efc76c318609c**; new runtime/fixture source local **4ef10d440e20955f5dfef3f0c28b34b6206f3ec4**. Explicit pending-message recovery now checks bounded current-room SDK history for an exact own encrypted event, original transaction (SDK txn or unsigned transaction echo), matching room and every wire-ciphertext field before retransmission. Matching acknowledges the existing event and removes the local retry record without a network send, even if its replay deadline/attempt count has expired. Actual retransmission still requires the five-minute/three-attempt guard, unchanged devices, current verification/contact/private-room state and immutable journal body. Foreign sender, wrong room/transaction or changed ciphertext cannot reconcile the record. No cipher-only or plaintext fallback is used.

Local **282 frontend / 111 backend**, type/lint/build and real HTTPS/Synapse acceptance passed. Sixteen targeted controller/recovery tests passed, including exact acknowledgement with exhausted attempts/expiry and mismatched history refusal. Enhanced real HTTPS harness confirms same-device history retains the original transaction echo after managed token reissue. Commands: `npm run check`, `npm run lint`, `npm run test:all`, `npm run build`, focused Vitest, browser fixture syntax checks, `git diff --check`, pinned `npm run test:matrix`. The built Chromium scenario adds a second real lost acknowledgement, reload with complete authorized history, and requires local reconciliation with zero encrypted retransmissions and one recipient message. New browser acceptance is pending.

Prior follow-up **940ace0 / 38890730660** browser **116939322496** passed eight scenarios (1.4m) and three repetitions (12.4s); Ubuntu **116939323304** and macOS **116939322908** succeeded. Windows **116939322798** also succeeded, with actual FFmpeg/FFprobe/OpenSSL startup checks and 280 frontend / 111 backend tests. All four jobs at **940ace0 / 38890730660** are accepted. No public/native/federation/TURN claim. Next: observe exact-reconciliation candidate CI; extend real browser expired/forget and changed/revoked-device journal refusal tests, then broader recovery/history work.


### Exact reconciliation accepted; refusal acceptance expansion — 2026-10-16

Runtime **db644f7739aabfce9ad90e4c1dd50ab5fde11f7a**, workflow **38891333678**, all four jobs successful: browser **116941293554**, eight scenarios **1.5m**, three repetitions **12.4s**; Ubuntu **116941293572**, macOS **116941293478**, Windows **116941293268**. Actual logs confirm **282 frontend / 111 backend tests**, real HTTPS/Synapse acceptance and same-device history transaction echo after token reissue. Built Chromium proved a second real lost acknowledgement followed by sender reload, authorized history reconciliation, zero encrypted retransmissions and one recipient message, alongside the previous durable exact retry/gateway restart/history/tamper/cross-account/revocation/plaintext assertions.

Starting source **db644f7**; fixture-only local **3ea832c25f704c98f56501fb65eecc425919035a** adds a third real lost acknowledgement, another actual unverified recipient browser/device, native journal timestamp ageing by 300001 ms in the isolated fixture, sender reload, zero-write verification refusal, recipient extra-device revocation, zero-write expiry refusal and explicit shared Sheet confirmation to forget the retry. The recipient's already-delivered message must remain once. This simulates elapsed retry age by editing only the synthetic journal timestamp; it does not claim a physical five-minute wait. Production runtime is unchanged. `node --check browser-tests/matrix.spec.mjs`, `npm run test:browser -- --list` (eight discovered), `git diff --check` passed. Expanded browser acceptance remains pending CI. Next: observe this scenario, fix actual failures without weakening assertions, then proceed through remaining Milestone B history/session/recovery dependencies.


Refusal acceptance diagnostic follow-up: workflow **38914894050** at **0b8e0909bf8d94163d77f87014b45b1fd8799863**, browser **117019729250**, failed awaiting the sender's fourth managed-device rebind before the new refusal assertions; seven other scenarios passed. The log did not include the dialog error, so no cause is claimed yet. Local fixture **623b318afa25ef3da97e552d458cdfec55753051** now reports bounded credential-free setup alerts and provision/bind/cleanup HTTP status plus Retry-After. It permits one explicit test UI retry only after an observed HTTP 429, an integer Retry-After of 1–60 seconds, and confirmed cleanup when provisioning already succeeded. Unknown outcomes, timeouts, cleanup uncertainty and all other errors fail immediately. Production mutation retry, rate budgets and security assertions are unchanged. Syntax and diff checks passed; new actual Chromium acceptance is required. Accepted runtime remains db644f7 / 38891333678.


### Confirmed cleanup starvation and bounded fix — 2026-10-16

Diagnostic workflow **38915865957** at **ff77e5d0d2e71219fc80f00f51d5422deabb86ab**, browser **117023037534**, failed before refusal acceptance with captured statuses: provision 200, bind 429 (Retry-After 53), cancel-provision 429 (Retry-After 49). Cleanup was honestly reported unconfirmed, so the test correctly refused to retry. Ubuntu **117023036978**, macOS **117023037451**, Windows **117023037331** succeeded. This confirms the outer Link ordinary-command budget could starve the inner reserved Matrix cleanup budget; it was not dismissed as a timing flake.

Starting remote ff77e5d; ending runtime local **7c4b666b07d23ba8aea1bc1968ec54613b7843aa**. A shared cleanup-action profile gives cancel-provision, disconnect, Matrix logout/device revocation and Link device revocation a separate bounded allowance of 30/minute at the existing authorization layers. Ordinary setup/command limits are unchanged, and no proof, ownership, session, Origin, body validation or upstream token checks are bypassed. Matrix actions also recheck authorization immediately after asynchronous body reading, before cleanup side effects. New regressions exhaust normal limits, prove cleanup/revocation still work, reject invalid proof and revoked sessions, exhaust cleanup's own budget and verify normal allowance stays exhausted.

Local **282 frontend / 114 backend tests**, type/lint/build, **12 targeted authorization/budget tests**, and final-source real HTTPS/Synapse acceptance passed. Commands: `node --test server/linkAuthorization.test.mjs server/matrixBinding.test.mjs`, `npm run check`, `npm run lint`, `npm run test:all`, `npm run build`, `git diff --check`, pinned `npm run test:matrix`. Actual built-browser refusal/cooldown acceptance remains pending CI for this source. The fixture permits one explicit UI retry only after actual 429/Retry-After and confirmed cleanup; it never retries uncertain setup or changes production retry policy. Next: require complete expanded browser security acceptance, then continue remaining Milestone B dependencies. Independent audit findings are recorded separately; no public/native completion claim.


### Preserve established devices during cancelled renewal — 2026-10-16

Starting remote **ce1d21646991647c8e968287da80a2d16911357e**; ending runtime local **901c80b7149eb59f8d216e41f44cc8f7293980df**, dependency patch **72c994c19ceee468ed957d88d83259b24f7476b8**. Source changes: managed Matrix provisioning/cancellation and binding outcome validation, UI3 settings notices, unit tests, actual HTTPS/Synapse harness and stricter browser sender acknowledgement assertions. No crypto protocol/key reset or public deployment.

Workflow **38917036932** at ce1d passed Ubuntu **117027042711**, macOS **117027042840**, Windows **117027042652**, but browser **117027042101** failed on Bob's reply after reload. New refusal/expiry/forget assertions had passed, including the actual 53-second Retry-After. Inspection of pinned Synapse logout.py confirmed token logout deletes the whole associated device and its published keys. Cancelling a failed renewal must therefore preserve existing devices. Cancellation now blocks only the matching unconfirmed Locat grant, preserves a distinct current grant, returns explicitly partial cleanup flags and audits a warning. Existing published keys also protect provisioning-error cleanup. Fresh unbound/keyless devices still receive full upstream logout. Explicit owned managed-device revocation remains destructive by design and removes all associated tokens.

Security limitation: retained unconfirmed upstream tokens are not individually revoked. They cannot access the protected Locat gateway without the current authenticated binding; the upstream must remain private. The UI truthfully reports that explicit device revocation is required for full upstream token cleanup. Real Synapse acceptance verifies retained signing keys, denied stale/unbound Locat grants, and subsequent actual upstream 401 after explicit revocation. This is not complete token/identity recovery.

Commands: git fetch/status/log/diff, npm run check, npm run lint, npm run test:all, npm run build, git diff --check; LOCAT_TEST_SYNAPSE_PYTHON=/workspace/scratch/8b3ebd8f9a46/synapse-test-env/bin/python npm run test:matrix. Final local validation: **283 frontend / 115 backend**, type/lint/build and real HTTPS/Synapse passed. Initial lint rejected an unsafe throw inside finally; replaced with explicit error state while preserving cleanup. Initial Matrix command omitted its required Python environment variable; rerun correctly. The harness's old cancellation-always-revokes assertion was updated to test local denial plus explicit full revocation rather than falsely claiming token logout. Existing build chunk-size warning remains.

Parser override pins postcss-selector-parser 7.1.6; generated theme CSS remains exactly 64,203 bytes, SHA256 8651603d111dde1b2f0d12ab4a0876f748dddaee5bafb6bc39bdcb5fbca01836. Previous audit after override: production zero known findings; full graph five high affected build nodes, zero moderate/critical. Unpatched braces graph remains documented in DEPENDENCY_REVIEW.md. Matrix SDK/Rust pins unchanged.

Next: publish exact verified tree and observe all four CI jobs, especially complete eight-scenario Chromium messaging/refusal/recovery/security acceptance and three foundation repetitions. Latest fully accepted runtime remains db644f7739aabfce9ad90e4c1dd50ab5fde11f7a / workflow 38891333678 until this passes. Then continue remaining Milestone B acceptance (history over 50 events, interrupted room-creation reconciliation and recovery limits) before D–G; all original 49 requirements and full A–AM ecosystem remain intact. No physical-device, public/international, federation or TURN acceptance claimed.


### Accepted cancellation fix and larger history acceptance — 2026-10-16

Start **6d3cef814c00798794095786df672fa42cd1bae0**; end local **519c4c40b65dc30cde909493e21c563d82069377**, transport-fixture source **fafd957f0e5bc8bb0c181da4904d39fecc0085d1**. Production runtime is unchanged after 6d3cef8.

Workflow **38919870543** at 6d3cef8 passed all four jobs: Ubuntu **117036711461**, macOS **117036711750**, Windows **117036712120**, browser **117036712169**. Actual browser log: eight scenarios **2.3m**, three foundation repetitions **9.4s**; the real rate-limited renewal observed Retry-After 53 seconds and safely retried once. Expanded lost-ack/device-change/expiry/forget, subsequent same-device reply, tamper/revocation and plaintext scans all passed. Local **283 frontend / 115 backend**, type/lint/build and real HTTPS/Synapse also passed. This supersedes db644f7 as latest accepted runtime; broader Milestones B–G remain open.

New isolated HTTPS fixture sends 55 unique real SDK-encrypted messages through the protected gateway, requires exact recipient controller decryption, then requests actual bounded 50-event history pages after token renewal. It requires at least two pages, advancing cursors, all 55 event IDs exactly once, original transaction echo, no plaintext in history/wire or Locat/Synapse databases/WAL. The first run with default synthetic homeserver message throttling eventually rejected the later explicit original-transaction probe with 429. Final pinned-Synapse run passed after a bounded rc_message 100/s, burst 100 setting in this isolated Node fixture only; production and browser-fixture limits are unchanged. This is transport/controller acceptance, not large-history browser acceptance.

The next Chromium candidate sends 55 messages through actual composer/Send controls, checks acknowledgement and recipient plaintext for each, reloads/rebinds the recipient with persistent keys, requires oldest messages absent from the initial 50-event timeline, then uses the real bounded older-history button to recover every message exactly once. Sends are paced 5.2 seconds with unchanged production limits; scenario timeout is 11 minutes within the existing 15-minute browser job. No failure is automatically replayed. This candidate is pending actual Chromium execution.

Commands: npm run check, npm run lint, npm run test:all, npm run build; final pinned LOCAT_TEST_SYNAPSE_PYTHON=... npm run test:matrix; node --check for both Matrix harnesses and browser spec; npm run test:browser -- --list (eight tests); git diff --check; connected GitHub workflow/job/log inspection. Final local 283/115 and type/lint/build passed; final enhanced Synapse passed. No production UI/theme, crypto pins, authorization or rate-limit source changed in this test batch. Next: publish exact candidate tree, require all four CI jobs and complete 55-message built-browser acceptance; diagnose any failure without weakening security/paging/duplicate/plaintext assertions, then tackle interrupted room-creation reconciliation. No public/native/federation/TURN completion claim.


### Safe pending-room recovery and sustained peer guards — 2026-10-16

Start remote **1c04be32a3dcaad17fe5c7682010306deb43cf45**; end runtime local **81d603027ddafc63794ee237d656ce20318eb03b**. Changed Matrix conversation/binding source and tests plus real Synapse harness. No frontend/theme, crypto pin or database migration changed.

History workflow **38920967494** passed Ubuntu **117040465790**, Windows **117040466410**, macOS **117040466500**; browser **117040466231** failed after more than ten acknowledged/decrypted composer sends with a retained draft and "Messaging contact lookup rate limit exceeded". Multiple fresh SDK guards exhausted the verification-era 30/minute peer allowance. Bound devices with a live grant matching the current session now share a bounded **120 reads/minute per account**, across all devices; invalid/unbound-session attempts retain a separate 30/minute limit and are still denied. Setup, cleanup, Matrix transport and message limits remain unchanged. Tests exhaust both budgets and reject foreign/expired/revoked sessions. No authorization caching, failed-send replay or plaintext fallback was added. The paced 55-message UI test and its strict acknowledgement/decryption/history assertions are unchanged.

New rooms have a random operation alias and initial operation state marker. Reopening a pending reservation uses only authenticated fixed-upstream directory/state GETs, requiring the original operation, version 12/non-federation, exact two authorized members, standard Megolm, joined history, invite-only policy, creator-owned protected state and exact restrictive power overrides. Limits: 32 KiB response, 100 state events, ten seconds per request, no redirects; fresh session/device/contact checks precede completion. No create POST is replayed, unconfirmed room joined or client-facing alias/write route added. Existing ready rooms remain unchanged. Older pending reservations without aliases, unavailable state, weaker permissions or lost authorization remain blocked; normally the joined creator must reconcile. Random aliases add server-visible operation metadata, not message plaintext.

Actual Synapse accepted room creation before the fixture discarded its upstream acknowledgement; a reopened database connection confirmed the durable pending reservation, then read-only recovery returned the exact original room and normal SAS/E2EE/offline/security acceptance passed. Focused tests cover missing/mismatched/duplicate/oversized state, third members/additional creators, weaker event permissions, authorization/contact loss and absence of duplicate create requests. This is homeserver/controller acceptance, not browser process-kill acceptance.

Final restored-checkout commands: git fetch/status/diff; npm run check; npm run lint; npm run test:all; npm run build; LOCAT_TEST_SYNAPSE_PYTHON=/workspace/scratch/8b3ebd8f9a46/synapse-test-env/bin/python npm run test:matrix; earlier node --test server/matrixBinding.test.mjs server/matrixConversations.test.mjs (10 tests); git diff --check; CI job/log inspection. **283 frontend / 117 backend**, type/lint/build and real HTTPS/Synapse passed. The local runner stalled during the earlier checkpoint; after it recovered, the source survived as working changes, was fully revalidated and committed as 81d6030. Earlier unreturned checkpoint commands are not publication evidence. Existing build chunk-size warning remains. Current dependency audit previously executed against unchanged lock: production zero known findings; full graph five high build nodes, zero moderate/critical; unpatched braces remains documented.

Next: publish exact tree and require all four CI jobs, especially the complete paced 55-message actual composer/reload/older-history run. Latest fully accepted runtime remains **6d3cef814c00798794095786df672fa42cd1bae0**, workflow **38919870543**, until the new run passes. Then continue remaining recovery/security/global-readiness dependencies. Preserve all 49 requirements and full A–AM roadmap; no public/DNS/native/federation/TURN acceptance claim.


### Accepted sustained messaging and original-room recovery — 2026-10-16

Accepted production source **01ea66b25638d4afa2bda9c7174e9129ca767187** (local source **81d603027ddafc63794ee237d656ce20318eb03b**), starting remote **1c04be32a3dcaad17fe5c7682010306deb43cf45**. Workflow **38923870766**: Ubuntu **117050329041**, macOS **117050329209**, Windows **117050329494**, browser **117050329122**, all successful. Each OS log confirms **283 frontend / 117 backend** tests; Ubuntu also passed real HTTPS/Synapse. Actual Chromium: **8 scenarios in 8.0m**, **3 foundation repetitions in 12.1s**. Logs show the complete paced composer dataset and 52-second explicit setup Retry-After. All 55 messages were acknowledged/decrypted; after a real reload and same-key rebind, older messages absent from the initial limited timeline were restored through the actual bounded history control, every message exactly once. Remaining original tamper, wrong-account, revocation and plaintext scans passed. No physical/public-country/native claim.

The new active-session peer budget and read-only operation-alias room recovery are now accepted in the complete built-browser compatibility suite. Actual lost upstream room-create acknowledgement/durable reservation recovery remains specifically a real Synapse/Node harness result, not a browser process-kill claim. Full account/identity recovery, independent security review, public global deployment, federation, actual TURN media and native hardware acceptance remain open; the full 49-requirement/A–AM roadmap is preserved.

Follow-on documentation fixes: GLOBAL_CONNECTIVITY, CLOUDFLARE_DEPLOYMENT, MATRIX_SIDECAR, MATRIX_ACCOUNT_BINDING and MATRIX_INTEGRATION now distinguish current managed encrypted messaging from old gated checkpoints, explain device-preserving partial cancellation, and document the container-loopback boundary. The standalone Cloudflare Compose profile does not configure a private Matrix upstream/registration and cannot reach the host's Synapse using container loopback. No HTTP transport exception, direct Synapse ingress, DNS/public activation, credentials or unrelated service was changed. Docker is absent locally; Compose/cloudflared/ARM64/public routing still lack runtime acceptance.

Commands/evidence: final restored check/lint/test:all/build and pinned test:matrix already passed at this source; GitHub completed-job logs were inspected for all four jobs; git fetch/merge/status and git diff --check passed. This follow-on changes only documentation and archives the prior handoff byte-for-byte. Its commit deliberately uses [skip ci] to avoid rerunning an unchanged runtime's eight-minute browser scenario; source/config CI remains enabled and the accepted runtime SHA/run above remains the evidence.

Exact next task: implement and validate an optional Linux host-connector profile for host Node + private loopback Synapse, or an explicitly trusted integrated-container route, without relaxing upstream HTTP/Host/Origin checks. Use isolated CI Docker acceptance where local Docker is unavailable; do not activate a tunnel/DNS/public endpoint. Keep pending-room and key/token recovery limitations explicit. Continue dependencies in the original milestone order.


### Cinema QA fixes candidate — 2026-10-16

Starting remote **90df53ba26e653a17c7cddf5047e72e8adea7587**, ending source local **7883cef38ea92baf5b4f98bbb8fdc2228bb1e125**. User Cinema QA directive temporarily takes implementation priority; the full messaging/master roadmap remains intact. No Matrix source, crypto pins, account migration, public deployment or unrelated infrastructure changed.

Implemented: 256 MiB per-file/batch browser-copy guards with optional quota estimates/reserve and atomic quota error normalization; session-only file-backed video opening that never writes the file/progress to IndexedDB; a real top Playback options button; independent Stream Details probing and missing-value/native-dimension fallbacks; mode-specific conversion errors, loading feedback, HEVC remux explanation and same-source reload/autoplay attempts. Player hotkeys skip interactive elements/dialogs so native Space activation works. Error presentation now lives in the controls layer rather than behind the center Play control. FFmpeg workers must produce output before HTTP 200, otherwise return a meaningful 503; after-output failures still terminate the stream and show conversion guidance. Existing authorization, open-handle containment, two slots, timeout and 1080p conversion limit remain.

Local evidence: **289 frontend / 119 backend** tests, typecheck/lint/build passed; final focused Cinema/storage/provider/library tests **19 passed**; real processor suite **4 passed**, including actual synthetic HEVC/AAC 3840x2160 conversion to H264/AAC 1920x1080 and a zero-output worker failure before success headers. Commands: git fetch/status/diff; npm run check/lint/test:all/build; npm run test:server; npx vitest run selected Cinema/storage/provider/library suites; node --test server/mediaProcessor.test.mjs; node --check spec/fixture; npm run test:browser -- --list (9 scenarios); git diff --check. Existing bundle-size warning remains. Initial new tests exposed jsdom StorageManager absence/DOMException realm handling, a test render-side-effect lint error and Testing Library role option typing; corrected without disabling rules/assertions. Local Playwright browser download failed, so no local browser success is claimed.

CI candidate adds actual Chromium Cinema plus a separate real Firefox Cinema pass on Linux, retaining the complete existing 55-message E2EE browser scenario and three storage repetitions. Synthetic fixture uses a sparse 13,191,223,154-byte file for the import guard only, and small generated H264 and real 4K HEVC/AAC files for playback. It never reads/uploads the user's movie or claims full-duration/Windows/Pi performance. Browser pointer/keyboard mode selection, actual media requests, decoded dimensions, temporary reload behaviour and injected 503 UI handling remain pending observed CI. See CINEMA_QA_TRACKER.md for all five IDs, exact reported file and limitations.

Cross-feature audit: full implemented source tests cover existing account/security/media/ecosystem logic; enabled no-op search results outside the player were in preview/explicitly planned screens, not live integration handlers. This is not a guarantee against future bugs or exhaustive hardware/UI acceptance. Next: publish exact candidate tree, inspect Chromium/Firefox and all OS jobs, fix any actual failure, update accepted evidence, then resume the secure host-connector/global-readiness roadmap dependency from the prior handoff.

Cinema follow-up: CI 38928716526 passed existing eight browser scenarios and three-OS checks but failed new remux acceptance. Probe-to-conversion descriptor ownership fixed; decoded browser acceptance remains open before resuming host-connector work. See CINEMA_QA_TRACKER.md; no messaging/security milestone or ecosystem scope removed.

Firefox functional checkpoint: Cinema passed (7.4s), plus storage/Link/Photos/Sentinel (4 tests, 21.1s) under isolated host sandbox diagnostics; standard CI pending in 38958989048. Photo test now uses observed native pointer IDs. No roadmap milestone is closed solely by scoped sandbox runs; see SESSION_HANDOFF.md.


## Accepted Cinema and resumed connector work — 2026-10-16

Starting remote dd8e3fac88ba972f2d6aa562de629fb233f015f3; ending local connector source **60dbbb69c0932fe59e9764b352492ca75735067d**. Production Cinema runtime **aa380e7fec7aff7f2c5c24da910678da12843d56** is accepted by workflow **38958989048**: Ubuntu **117168974678**, Windows **117168975004**, macOS **117168975447**, browser **117168975308**, all successful. Observed browser logs: **9 Chromium scenarios 8.1m**, **Firefox Cinema 7.9s**, **3 storage repetitions 12.4s**, valid remux/transcode HTTP 200 and injected 503 UI failure handling. Existing 55-message UI E2EE/history/revocation suite passed. No production browser sandbox override was added. Expanded Firefox feature CI on dd8e3fa is separately running as **38960012457**, with its three OS jobs green at this checkpoint.

After Cinema acceptance, resumed the recorded Linux host-connector dependency. New compose.cloudflare-host.yml is an explicit preparation profile: connector only, host networking, no published ports, private read-only config/credential mounts, dropped capabilities. New prepare-host-connector.mjs writes only a validated exact-host loopback ingress/404/loopback metrics configuration in a new private directory outside the source tree. It never creates credentials, changes DNS or starts services. Node keeps its current database/Matrix instance/registration and private loopback homeserver; no upstream validation rule was weakened. HOST_CONNECTOR_PREPARATION.md documents the trusted host-network process boundary, file access, origin/key continuity and pending public/native acceptance.

New offline CI harness renders the actual profile, runs cloudflared 2026.10.1 ingress validation/matching with network disabled and no credentials, and exercises an isolated real Locat gateway from a nonroot Linux host-network container. It does not call tunnel run or Compose up. Local Docker is unavailable, so this part remains pending observed CI. Local-only harness actually passed exact Host and Origin denials, Secure/HttpOnly authenticated sessions, private WebSocket upgrade, unauthenticated/wrong-origin denial and post-logout denial. These are private-hop checks, not public WSS or Matrix-through-tunnel acceptance.

Commands: node --test server/hostConnector.test.mjs (2 passed); node tools/host-connector-acceptance.mjs --local-only (passed); node --check for all three tools; PyYAML Compose/workflow policy inspection; npm run check; npm run lint; npm run test:all (**289 frontend / 121 backend**); npm run build (all passed, existing bundle warning); git diff --check; completed CI job/log inspection and expected-head exact-tree branch publication. No dependency/pin, account schema, UI design or messaging runtime changed in the connector batch.

Next: publish/observe offline Docker/ingress and expanded Firefox CI, fix actual failures, record the accepted commit/run, then continue global-readiness prerequisites (trusted proxy attribution and layered abuse limits, backup/recovery and external acceptance). Public deployment/DNS, federation, actual TURN/media, independent security review and physical Windows/Android/Pi remain open. Every master module and all 49 requirements remain intact. No public service, unrelated infrastructure, real credentials or user movie was modified.

Global-readiness checkpoint 2026-10-16: dd8e3fa / 38960012457 all green (9 Chromium, 5 Firefox, 3 repetitions); 1c3367a connector job 117176862160 passed actual offline Docker ingress and host-network auth/WS/revocation. Local discovery fix 1ba25f3 passed 290/121, type/lint/build and real Synapse/HTTPS, but final source CI remains pending. No public/native/federation milestone closed; see SESSION_HANDOFF.md for exact evidence and next work.


### 2026-10-18 stabilization checkpoint

Cinema parallel-session seek/resume changes audited and corrected; Linux authorized-inode FFmpeg seeking, accurate decoded-scene regression, paused timeline replacement and worker cleanup implemented. Strict-CSP server-selection work reconciled. See SESSION_HANDOFF and CINEMA_QA_TRACKER 006–010 for exact evidence/open acceptance. Prior discovery CI38961804380 succeeded. Current candidate cross-platform/browser CI pending publication. Friend-scoped library ACLs, real long-media/device/network acceptance and guided server source setup remain open. Complete 49 requirements/A–AM ecosystem and E2EE/global/federation/TURN/native roadmap remain intact; no public exposure.


2026-10-18 next audit batch: REMOTE-001 bounded status streaming/cancellation implemented in956821dde98b828616a7d393def8abfaf0bc02e6; six focused tests and full296frontend/131backend/type/lint/build pass. Existing-feature Firefox storage/Link/Photos/Sentinel4pass20.9s. Runtime435f223 CI39130199832 partial success (connector/Ubuntu/macOS); Windows/browser pending. See final handoff and ENGINEERING_BUG_REGISTER. Per-library friend access and real platform/network acceptance remain open; no public deployment.


2026-10-18 acceptance follow-up: standard Chromium11passed7.8m on435f223; Firefox paused-seek test failed readyState4 versus3. Stronger decoded-scene/paused-intent/actual Play progression regression passes three local Firefox repetitions (6tests33.2s); standard CI remains required. Production runtime956821 unchanged. Real isolated Synapse/HTTPS passed; production dependency audit0, full audit5high dev nodes/unpatched braces (BUILD-001 open). See final handoff; all49/A–AM remain.


2026-10-18 next boundary: MEDIA-REFRESH-002 fixed in3ca4f01df3f575f6f91fd8e3c2274fbd7b153a50; authenticated forced scans bounded6/account/minute and30/process/minute withRetry-After. Actual HTTP regression/full296frontend131backend/type/lint/build pass. Candidate CI pending; corrected paused-scene05ca36b workflow39131180505 in progress. BUILD-001 and Cinema006/008/009/010 remaining acceptance/permissions tracked; all49/A–AM preserved.
