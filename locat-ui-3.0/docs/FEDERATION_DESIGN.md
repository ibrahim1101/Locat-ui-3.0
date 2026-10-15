# Federation dependency and direction

Federation is planned, not enabled. Discovery explicitly reports federation=false. Local LC codes/account IDs remain unchanged. An eventual global identity must bind canonical server authority, immutable account identity and verified device keys; display-name or four-digit LC collisions are expected across servers. Instance UUID is not sufficient proof of remote authority.

Preferred feasibility direction: use a standards-based Matrix homeserver/client architecture for communication rather than implement an original federation/E2EE protocol. Before integrating, validate licensing, supported ARM64 stack, mapping Locat accounts to Matrix IDs without password sharing, device verification, multi-device recovery and server-qualified identifiers. Do not provision shadow accounts or reuse Locat password hashes silently.

Require authenticated transport, discovery validation, SSRF-safe egress, version negotiation, sender authorization, replay/idempotency controls, durable retry/expiry/backpressure, allow/block policy and audit redaction. Cross-server queues must route protocol-authenticated ciphertext. No server-to-server request currently fulfills these requirements. Tests D and H in CONNECT_TEST_PLAN.md remain pending.
