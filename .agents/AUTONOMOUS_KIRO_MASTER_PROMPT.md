# Autonomous Kiro Master Prompt — Quant Meta/Google Killer Plan

Paste the JSON block below into Autonomous Kiro (Amazon's autonomous agent) as the task brief. It is self-contained, phased, and acceptance-gated.

```json
{
  "$schema": "https://kiro.dev/autonomous-task.schema.json",
  "task_id": "task-quant-meta-google-killer",
  "version": "1.0.0",
  "owner": "Quant Ecosystem",
  "repository": "quantmailteamsupport-dev/Quant-Ecosystem",
  "default_branch": "main",
  "working_branch": "feat/meta-google-killer",

  "mission": "Transform the Quant Ecosystem (9 apps + 28 packages) from a high-quality reference monorepo into a launch-ready, planet-scale, AI-native, privacy-first social/communication super-app that structurally outcompetes Meta and Google by exploiting moats those companies cannot copy without destroying their own business model: (1) end-to-end encryption by default, (2) 90/10 creator revenue split, (3) cross-app universal AI agent with unified user context, (4) ActivityPub federation, (5) on-device personalization with zero behavioral tracking, (6) third-party client API openness, (7) anti-rage-engagement ranking, (8) one-click cross-app publishing.",

  "north_star_metrics": {
    "user": "First 1,000,000 monthly active users retained at week-4 retention >= 35% (vs Meta industry ~25%).",
    "creator": "Top 1% creators earn >= 2x of what they earn on YouTube/TikTok for equivalent reach.",
    "trust": "Spam/abuse rate per 1k posts <= 0.5 (vs Twitter ~3, Meta ~2).",
    "performance": "p95 cold-start TTI on a 4G phone <= 2.5s for every app shell.",
    "ai": ">=70% of active users use the universal AI agent weekly with cross-app actions.",
    "privacy": "0 third-party tracking pixels. 100% of PII encrypted at rest with per-user keys."
  },

  "guiding_principles": [
    "PRIVACY > GROWTH: never ship a feature that requires behavioral tracking.",
    "AI-NATIVE: every text input has AI assist; every media surface has neural enhancement; every list has personalized ranking.",
    "ONE USER, ONE CONTEXT: a single AI agent and a single identity span all 9 apps.",
    "OPEN BY DEFAULT: every app exposes a typed public API and an ActivityPub/Matrix bridge where applicable.",
    "DELETE LEGACY AGGRESSIVELY: any code path with `Map<>` in-memory storage, mock implementations, or `apps/*/api/` legacy controllers is deleted in this initiative.",
    "TESTING IS A FEATURE: every domain service ships with unit + integration + load tests. Coverage gate is enforced in CI.",
    "OBSERVABILITY IS A FEATURE: every public function emits OTel spans; every business event emits a typed metric.",
    "EDGE FIRST: ranking and personalization run on-device or at the edge, not in central data centers.",
    "FEDERATION IS A FEATURE: a Quant user can be followed from Mastodon; a Mastodon user can DM a Quant user."
  ],

  "non_negotiables": [
    "No new code may use Math.random for security-sensitive paths; only crypto.randomBytes / crypto.randomUUID.",
    "No new code may store PII in plain text. Use field-level encryption via @quant/security/field-encryption.",
    "No service may launch without an SLO definition committed in infra/slo/<service>.yaml.",
    "No package may merge without >=80% line coverage on critical paths and >=60% mutation score.",
    "No microservice may launch without a runbook in docs/runbooks/<service>.md and a Grafana dashboard.",
    "Every external dependency must be pinned, audited (pnpm audit), and license-checked (allowed: MIT, Apache-2.0, BSD, ISC, MPL-2.0).",
    "Every API endpoint must be documented in OpenAPI 3.1 generated from Zod schemas.",
    "Every user-facing feature must pass WCAG 2.2 AA accessibility automated checks (axe-core)."
  ],

  "uncopyable_moats": {
    "M1_e2e_default": {
      "what": "Signal-protocol E2E encryption for QuantChat, MLS for group chats, zero-knowledge encrypted email storage in QuantMail.",
      "why_meta_cant_copy": "Their ad revenue model requires server-side content access; turning on E2E breaks targeting and revenue."
    },
    "M2_creator_split_90_10": {
      "what": "Creators receive 90% of ad revenue and 95% of tip/subscription revenue; transparent ledger published per creator.",
      "why_youtube_cant_copy": "Their public market valuation depends on the existing 55/45 split; lowering it would crash their margin."
    },
    "M3_universal_ai_agent": {
      "what": "One AI agent with tool access to every app; long-term memory in per-user vector store; action graph spans email, chat, video, ads, photos.",
      "why_meta_cant_copy": "FB/IG/WhatsApp data is regulator-walled (DMA) and cannot be merged across surfaces; Quant has unified identity from day 1."
    },
    "M4_federation": {
      "what": "ActivityPub server in QuantSync, Matrix bridge in QuantChat. Quant users follow/are followed by Mastodon/Bluesky/Threads users.",
      "why_x_cant_copy": "Twitter/X actively removed third-party clients and federation; their lock-in strategy is the opposite."
    },
    "M5_on_device_ranking": {
      "what": "For-You ranking, friend suggestions, and content moderation run on-device via ONNX Runtime Web. Server only sends candidate set.",
      "why_meta_cant_copy": "Their entire ad infrastructure is centralized targeting; on-device ranking removes the funnel they monetize."
    },
    "M6_open_api": {
      "what": "Stable, documented, RFC-style public API. Third-party clients are allowed and encouraged. Webhooks + WebSub.",
      "why_x_cant_copy": "X charges $42k/mo for the API; community trust is destroyed."
    },
    "M7_anti_rage_ranking": {
      "what": "Default ranking optimizes for week-30 retention and reply-quality, not session-time. Outrage signals are penalized.",
      "why_meta_cant_copy": "Their quarterly DAU/engagement targets reward exactly the rage signal Quant penalizes."
    },
    "M8_one_click_crosspost": {
      "what": "Record once in QuantNeon -> AI auto-cuts platform-specific versions -> auto-publishes to QuantMax (vertical short), QuantTube (horizontal long), QuantSync (text + clip), QuantChat (broadcast).",
      "why_no_one_has_this": "No competitor owns all 4 surfaces simultaneously."
    }
  },

  "execution_strategy": {
    "mode": "phased_autonomous",
    "rules": [
      "Execute phases STRICTLY in order. Do not start phase N+1 until phase N's acceptance gate passes.",
      "Each phase = one feature branch off main, one PR, one merge. Branch name: feat/phase-NN-<slug>.",
      "Before starting a phase, run `pnpm install --frozen-lockfile` and `pnpm turbo typecheck` on main to confirm green baseline.",
      "Each phase MUST end with: typecheck pass, tests pass, lint pass, build pass, prisma validate pass.",
      "If a phase exceeds 6 hours of agent time, STOP, write a status note in .agents/tasks/task-quant-meta-google-killer/PHASE-NN-status.md, and return control to user.",
      "Always prefer extending existing packages over creating new ones. Only create a new package when functional boundary is genuinely orthogonal.",
      "When a file path conflicts with existing code, READ the existing file first, then refactor in place; never duplicate.",
      "Delete legacy code as you go: apps/*/api/ (legacy in-memory controllers) is removed in Phase 9.",
      "Every commit message follows Conventional Commits: feat(scope): ..., fix(scope): ..., refactor(scope): ...",
      "Every PR body includes: Phase N summary, files changed grouped by package, acceptance gate checklist, screenshots/curl examples, follow-ups."
    ],
    "completion_signal": "Mission is complete when all 13 phases below show status=done in .agents/tasks/task-quant-meta-google-killer/state.json AND the launch_readiness_gate passes."
  },

  "current_state_baseline": {
    "as_of": "2026-05-25",
    "files_ts_tsx": 1433,
    "loc_ts_tsx": 299478,
    "apps_count": 9,
    "packages_count": 28,
    "test_files": 42,
    "todo_markers": 402,
    "completed_phases": ["phase0_monorepo", "phase1_prisma", "phase2_auth_crypto", "phase3_fastify", "phase4_world_class_packages", "phase_ecosystem_v1"],
    "in_progress_phases": ["phase4_real_ai", "phase5_realtime_infra", "phase6_app_domain", "phase7_production_infra", "phase8_frontend"],
    "known_debt": [
      "apps/quantmail/api/* uses in-memory Map<> storage and must be deleted",
      "apps/quantmail/api-v2/* and apps/quantmail/backend/* are duplicate parallel implementations and must be unified",
      "services/* contains only Dockerfiles - no independent service code; must become real microservices in Phase 9",
      "packages/moderation uses regex with placeholder strings like 'profanity_severe_1' - must be replaced with ML classifier",
      "packages/search has no real index backend - must integrate OpenSearch in Phase 11",
      "packages/recommendations has only types - must implement two-tower model in Phase 12",
      "Test coverage is ~3% of files - must reach 80% on critical paths in Phase 19",
      "No SLO definitions, no chaos tests, no load tests - added in Phase 18 and 19"
    ]
  },

  "phases": [
    {
      "id": "phase09_unified_data_plane",
      "title": "Unified Data Plane: kill duplicates, add CDC + outbox + read replicas",
      "depends_on": [],
      "rationale": "Today three parallel implementations of QuantMail exist (api/, api-v2/, backend/) and direct Prisma calls everywhere. Meta uses TAO; Google uses Spanner. We cannot match their scale, but we can match their abstraction so all future packages get caching, replication, and CDC for free.",
      "deliverables": [
        "Delete apps/quantmail/api/ entirely (legacy in-memory).",
        "Merge apps/quantmail/api-v2/ into apps/quantmail/backend/ as the single canonical Fastify server.",
        "Apply same merge pattern to all 9 apps that have parallel implementations.",
        "New package: @quant/data-plane wrapping Prisma with: read-replica routing, transactional outbox, optimistic locking, soft-delete, audit log, field-level encryption hooks.",
        "Add Prisma read replica configuration (DATABASE_URL_REPLICA env var).",
        "Add transactional outbox table to schema.prisma (`OutboxEvent` model with `aggregate_id`, `event_type`, `payload`, `published_at`).",
        "Add Redpanda (Kafka-compatible) to docker-compose.dev.yml.",
        "New service: services/cdc-relay - Node worker that polls OutboxEvent and publishes to Redpanda topics.",
        "Migrate every existing repository in packages/database/src/repositories to extend BaseRepository from @quant/data-plane."
      ],
      "files_to_create": [
        "packages/data-plane/package.json",
        "packages/data-plane/src/index.ts",
        "packages/data-plane/src/base-repository.ts",
        "packages/data-plane/src/outbox.ts",
        "packages/data-plane/src/replica-router.ts",
        "packages/data-plane/src/audit-log.ts",
        "packages/data-plane/src/field-encryption.ts",
        "packages/data-plane/src/__tests__/outbox.test.ts",
        "packages/data-plane/src/__tests__/replica-router.test.ts",
        "services/cdc-relay/src/main.ts",
        "services/cdc-relay/src/poller.ts",
        "services/cdc-relay/src/publisher.ts",
        "services/cdc-relay/Dockerfile",
        "services/cdc-relay/package.json"
      ],
      "files_to_delete": [
        "apps/quantmail/api/**",
        "apps/quantmail/api-v2/**"
      ],
      "schema_changes": {
        "prisma_models_to_add": ["OutboxEvent", "AuditLog", "EncryptionKey"],
        "indexes_to_add": ["OutboxEvent(published_at, created_at)", "AuditLog(actor_id, created_at)"]
      },
      "acceptance": [
        "pnpm turbo typecheck passes on all packages and apps.",
        "pnpm turbo test passes with all repository tests migrated.",
        "Zero references to in-memory Map<> in apps/quantmail/* (grep check).",
        "Outbox publishes events to Redpanda within 5 seconds of commit (integration test).",
        "Read queries route to replica when DATABASE_URL_REPLICA is set (unit test verifies router decision)."
      ]
    },
    {
      "id": "phase10_search_platform",
      "title": "Real Search: hybrid BM25 + vector across all 9 apps",
      "depends_on": ["phase09_unified_data_plane"],
      "rationale": "packages/search currently has no backend. Real search is a moat: Meta search is awful; Google has Twitter/X locked out. A unified, fast, semantic search across email + chat + video + posts + photos is genuinely better than what any single competitor offers.",
      "deliverables": [
        "Add OpenSearch + a vector store (Qdrant) to docker-compose.dev.yml.",
        "Add Helm sub-charts for OpenSearch and Qdrant.",
        "Refactor packages/search to provide: SearchClient, IndexerWorker, RankingPipeline.",
        "Indexer subscribes to Redpanda outbox topics and indexes documents by aggregate type.",
        "Hybrid query: BM25 score + cosine similarity from sentence-transformers embeddings (call @quant/ai/embeddings).",
        "Per-app search facets and permission filters (e.g. only return emails the user can see).",
        "Universal search endpoint POST /api/search returning typed UnionSearchResult."
      ],
      "files_to_create": [
        "packages/search/src/client.ts",
        "packages/search/src/indexer.ts",
        "packages/search/src/ranker.ts",
        "packages/search/src/embeddings-client.ts",
        "packages/search/src/permission-filter.ts",
        "packages/search/src/__tests__/hybrid-ranking.test.ts",
        "services/search-indexer/src/main.ts",
        "services/search-indexer/Dockerfile",
        "infra/helm/quant-platform/templates/opensearch.yaml",
        "infra/helm/quant-platform/templates/qdrant.yaml"
      ],
      "acceptance": [
        "Indexer consumes outbox events and indexes documents in <2s p95.",
        "Hybrid search returns relevant emails AND chat messages AND video transcripts in a single query.",
        "Permission filter test proves users cannot see other users' private content.",
        "p95 search latency <150ms for 1M-document index in load test."
      ]
    },
    {
      "id": "phase11_ml_platform",
      "title": "Real ML Platform: feature store + online inference + recommendation models",
      "depends_on": ["phase10_search_platform"],
      "rationale": "packages/recommendations currently is types only. TikTok For You, YouTube candidate-gen, IG Reels are the deepest moats of Big Tech. We add a real ML platform with two-tower retrieval, a ranking model, MMoE for multi-objective optimization, and a feature store. We CAN beat them on freshness and personalization quality because we have unified cross-app signal.",
      "deliverables": [
        "New package @quant/ml-runtime: ONNX Runtime Web wrapper for browser inference, ONNX Runtime Node for server inference.",
        "Implement feature store: packages/ml-pipeline/src/feature-store.ts with online (Redis) and offline (Parquet on S3) layers.",
        "Implement two-tower retrieval (user tower + item tower) in packages/recommendations/src/retrieval/two-tower.ts. Provide TypeScript reference + python training script + ONNX export.",
        "Implement candidate generation pipeline: 200 candidates per request, mixed sources (collaborative, content-based, social-graph, trending).",
        "Implement ranking pipeline: MMoE-style multi-task model balancing engagement, retention, and well-being. ONNX served.",
        "Implement diversification (DPP-style) to prevent filter bubbles.",
        "Implement A/B framework: packages/ml-pipeline/src/experiments.ts with assignment, exposure logging, and significance test.",
        "Implement on-device ranking for QuantMax (TikTok-killer). Server sends 200 candidates, browser ranks top 20 with ONNX Runtime Web."
      ],
      "files_to_create": [
        "packages/ml-runtime/src/index.ts",
        "packages/ml-runtime/src/onnx-server.ts",
        "packages/ml-runtime/src/onnx-browser.ts",
        "packages/ml-pipeline/src/feature-store.ts",
        "packages/ml-pipeline/src/experiments.ts",
        "packages/ml-pipeline/src/__tests__/ab.test.ts",
        "packages/recommendations/src/retrieval/two-tower.ts",
        "packages/recommendations/src/ranking/mmoe.ts",
        "packages/recommendations/src/diversify/dpp.ts",
        "packages/recommendations/src/pipeline.ts",
        "scripts/ml/train_two_tower.py",
        "scripts/ml/export_onnx.py",
        "services/ml-inference/src/main.ts",
        "services/ml-inference/Dockerfile"
      ],
      "acceptance": [
        "Two-tower model trains on synthetic data and exports valid ONNX (CI test).",
        "ml-inference service returns top-200 candidates in <50ms p95.",
        "On-device ranking in QuantMax browser <80ms p95 on a Pixel-class device emulator.",
        "A/B framework correctly assigns user buckets and computes p-value (unit test)."
      ]
    },
    {
      "id": "phase12_trust_safety",
      "title": "Real Trust & Safety: ML moderation, hash-matching, anti-spam, abuse graphs",
      "depends_on": ["phase11_ml_platform"],
      "rationale": "Current moderation uses regex with literal placeholder strings. Replace with real classifiers, image/video hash matching, and graph-based abuse detection.",
      "deliverables": [
        "Replace packages/moderation with: text-classifier (ONNX, fine-tuned on TweetEval), image-classifier (NSFW + violence), perceptual-hash (pHash + SimHash), CSAM hash-matching (PhotoDNA-style with optional Google Hash Matching API plug-in point).",
        "Add behavioral abuse detection: packages/security/src/abuse-graph.ts that builds a graph of accounts and runs community-detection (Louvain) to find sybil/spam clusters.",
        "Reputation system: packages/security/src/reputation.ts giving each user a trust score from on-platform behavior.",
        "Anti-spam classifier (Bayesian + features) for QuantMail and QuantSync.",
        "Appeal workflow: every moderation action creates an Appeal record with human-review queue.",
        "Transparency report generator: monthly stats per category."
      ],
      "files_to_create": [
        "packages/moderation/src/text-classifier.ts",
        "packages/moderation/src/image-classifier.ts",
        "packages/moderation/src/perceptual-hash.ts",
        "packages/moderation/src/csam-matcher.ts",
        "packages/moderation/src/policy-engine.ts",
        "packages/moderation/src/appeal-workflow.ts",
        "packages/moderation/src/__tests__/policy-engine.test.ts",
        "packages/security/src/abuse-graph.ts",
        "packages/security/src/reputation.ts",
        "packages/security/src/anti-spam.ts",
        "scripts/ml/train_text_moderator.py",
        "services/moderation-worker/src/main.ts"
      ],
      "acceptance": [
        "Text classifier achieves F1 >= 0.85 on the held-out test set (CI gate).",
        "Perceptual hash detects re-uploaded image within 95% accuracy on the test corpus.",
        "Abuse graph detects synthetic sybil cluster of 20 accounts in integration test.",
        "Every moderation decision is auditable via AuditLog (Phase 9)."
      ]
    },
    {
      "id": "phase13_e2e_encryption",
      "title": "End-to-End Encryption by default (Signal Protocol + MLS + ZK email)",
      "depends_on": ["phase09_unified_data_plane"],
      "rationale": "MOAT M1. Meta cannot turn on E2E broadly without breaking ad targeting. We do it by default.",
      "deliverables": [
        "QuantChat: Signal Protocol (libsignal) for 1:1 chats. Use @signalapp/libsignal-client.",
        "QuantChat groups: MLS (Messaging Layer Security) via openmls or mls-rs WASM build.",
        "QuantMail: opt-in zero-knowledge mailbox using OpenPGP (per-user keypair, encrypted at rest with user-derived key, search index built client-side).",
        "Key management: per-device keys, per-user identity key, prekey bundles, sealed sender.",
        "Backup: encrypted cloud backup with user passphrase (Argon2id-derived KDF, no server access to keys).",
        "Cross-device sync: secure device-linking via QR code (out-of-band channel).",
        "UI surfaces: per-conversation E2E badge, key-fingerprint verification screen, breach alerts."
      ],
      "files_to_create": [
        "packages/auth/src/e2e/identity-key.ts",
        "packages/auth/src/e2e/signal-session.ts",
        "packages/auth/src/e2e/mls-group.ts",
        "packages/auth/src/e2e/sealed-sender.ts",
        "packages/auth/src/e2e/encrypted-backup.ts",
        "packages/auth/src/__tests__/e2e-roundtrip.test.ts",
        "apps/quantchat/src/components/E2EBadge.tsx",
        "apps/quantchat/src/components/SafetyNumber.tsx",
        "apps/quantmail/src/components/ZKMailboxOnboarding.tsx"
      ],
      "acceptance": [
        "1:1 message round-trip test: Alice -> Bob -> Alice with full Signal handshake passes.",
        "MLS group of 10 members: add/remove member, post-compromise security verified by tests.",
        "Server cannot decrypt any E2E payload (penetration test in CI).",
        "Encrypted backup restore works on a new device with passphrase only."
      ]
    },
    {
      "id": "phase14_universal_ai_agent",
      "title": "Universal AI Agent across all 9 apps with long-term memory",
      "depends_on": ["phase10_search_platform", "phase13_e2e_encryption"],
      "rationale": "MOAT M3. The single biggest user-facing differentiator. One agent that can: schedule a meeting in QuantMail, summarize a video in QuantTube, generate ad creative in QuantAds, edit a clip in QuantEdits, send a message in QuantChat - in one conversation.",
      "deliverables": [
        "Centralize the existing assistant in packages/ai/src/assistant into a runtime called QuantAgent.",
        "Tool registry across all 9 apps (already partly scaffolded in packages/ai/src/assistant/tools/*-tools.ts) - implement EVERY tool with a real backing service call.",
        "Long-term memory: per-user vector store (pgvector or Qdrant), event log of all agent interactions, fact extraction.",
        "Multimodal input: voice (Whisper), image (CLIP), screen-capture (planned).",
        "Action graph: agent decomposes user intent into a DAG of tool calls, presents preview, executes on confirmation.",
        "Permissions: per-tool consent, revocable, per-app scope, OAuth-style.",
        "Streaming UI: every app has a slide-over agent panel using the same React component @quant/shared-ui/AgentPanel.",
        "Voice mode (full-duplex): WebRTC + interrupt support."
      ],
      "files_to_create": [
        "packages/ai/src/agent/runtime.ts",
        "packages/ai/src/agent/memory.ts",
        "packages/ai/src/agent/action-graph.ts",
        "packages/ai/src/agent/permissions.ts",
        "packages/ai/src/agent/voice-duplex.ts",
        "packages/ai/src/agent/__tests__/cross-app.test.ts",
        "packages/shared-ui/src/agent/AgentPanel.tsx",
        "packages/shared-ui/src/agent/AgentVoiceButton.tsx",
        "apps/quantai/src/agent/index.ts"
      ],
      "acceptance": [
        "Cross-app integration test: 'Plan a launch event' triggers tool calls across QuantMail (invitations), QuantChat (group), QuantSync (post), QuantNeon (poster gen), QuantTube (teaser), QuantAds (campaign).",
        "Long-term memory recalls user preferences from 30 days ago in benchmark test.",
        "Voice round-trip latency <800ms p95.",
        "Permissions test: an app without QuantMail scope cannot trigger email send via agent."
      ]
    },
    {
      "id": "phase15_creator_economy",
      "title": "Creator Economy 90/10 split, wallet, subscriptions, tips",
      "depends_on": ["phase09_unified_data_plane"],
      "rationale": "MOAT M2. Public, transparent, creator-favorable economics that YouTube/TikTok cannot match without restructuring their P&L.",
      "deliverables": [
        "Wallet: packages/payments/src/wallet.ts with custodial + non-custodial modes. Stripe Connect for custodial; on-chain (Polygon zkEVM L2) for non-custodial.",
        "Subscription tiers: per-creator tiers, gating in QuantTube/QuantNeon/QuantSync.",
        "Tipping: native tip button in every creator surface.",
        "Revenue share: 90% creator / 10% platform on ads; 95/5 on tips and subs.",
        "Transparent ledger: every creator sees raw event log: each ad impression, each tip, each sub, exchange rate, fees.",
        "Cashout: Stripe payout, bank, crypto. Tax forms (1099, W-8BEN) auto-generated.",
        "Anti-fraud: integrate Stripe Radar + custom rules from Phase 12 abuse-graph."
      ],
      "files_to_create": [
        "packages/payments/src/wallet.ts",
        "packages/payments/src/stripe-connect.ts",
        "packages/payments/src/onchain-wallet.ts",
        "packages/payments/src/revshare.ts",
        "packages/payments/src/tax-forms.ts",
        "packages/payments/src/__tests__/revshare.test.ts",
        "apps/quantmax/src/creator/Dashboard.tsx",
        "apps/quantube/src/creator/Earnings.tsx",
        "apps/quantsync/src/creator/Tips.tsx"
      ],
      "schema_changes": {
        "prisma_models_to_add": ["Wallet", "WalletTransaction", "Subscription", "Tip", "AdImpression", "RevenueShare", "Payout"]
      },
      "acceptance": [
        "Revenue share unit test: $100 ad spend -> $90 to creator, $10 to platform, exact ledger entries.",
        "End-to-end payout test (Stripe test mode): user earns, requests payout, receives in connected account.",
        "Tax form generator produces valid 1099 PDF for synthetic data."
      ]
    },
    {
      "id": "phase16_federation",
      "title": "ActivityPub + Matrix federation",
      "depends_on": ["phase09_unified_data_plane"],
      "rationale": "MOAT M4. Network-effect bypass: even if a user isn't on Quant, they can follow Quant creators from Mastodon. X/Threads cannot copy without sacrificing their walled garden.",
      "deliverables": [
        "QuantSync: full ActivityPub server. WebFinger /.well-known/webfinger. NodeInfo /.well-known/nodeinfo. Inbox/Outbox per actor. HTTP signatures.",
        "Federation queue: outbound deliveries with retry, signed via per-actor private key.",
        "QuantChat: Matrix bridge via mautrix-go pattern (bridge bot in Quant-side).",
        "Federation moderation: instance blocklist, per-user remote-instance allowlist.",
        "Federated search: opt-in, only public posts."
      ],
      "files_to_create": [
        "packages/federation/package.json",
        "packages/federation/src/activitypub/server.ts",
        "packages/federation/src/activitypub/actor.ts",
        "packages/federation/src/activitypub/inbox.ts",
        "packages/federation/src/activitypub/outbox.ts",
        "packages/federation/src/activitypub/http-signatures.ts",
        "packages/federation/src/webfinger.ts",
        "packages/federation/src/nodeinfo.ts",
        "packages/federation/src/__tests__/interop-mastodon.test.ts",
        "services/matrix-bridge/src/main.ts",
        "services/matrix-bridge/Dockerfile"
      ],
      "acceptance": [
        "Mastodon integration test: a Mastodon instance can follow a Quant user, see posts, like, reply.",
        "WebFinger endpoint passes Mastodon's compatibility validator.",
        "Matrix bridge integration test: a Quant user DM is delivered to a Matrix room and replies route back."
      ]
    },
    {
      "id": "phase17_one_click_crosspost",
      "title": "One-Click Cross-App Publishing with AI auto-formatting",
      "depends_on": ["phase14_universal_ai_agent"],
      "rationale": "MOAT M8. Owning all 4 surfaces (text, short video, long video, broadcast chat) lets us auto-publish from one input.",
      "deliverables": [
        "Capture surface: QuantNeon record button. After capture, agent runs media-understanding pipeline.",
        "AI auto-format: long video -> shorts via scene-detection + caption transcription + auto-cut. Vertical/horizontal reframe via face-tracking. Auto title/description per platform.",
        "Cross-post manifest: a single PublishIntent record produces children PostRecord per app.",
        "Per-app preview UI: user sees auto-cut version per app before confirming.",
        "Scheduling + analytics: unified dashboard per intent."
      ],
      "files_to_create": [
        "packages/media/src/auto-cut.ts",
        "packages/media/src/face-tracking.ts",
        "packages/media/src/scene-detect.ts",
        "packages/ai/src/agent/cross-post.ts",
        "apps/quantneon/src/components/CrossPostModal.tsx",
        "packages/ecosystem-bridge/src/publish-intent.ts"
      ],
      "acceptance": [
        "60s landscape video -> 15s vertical short with auto-tracked subject and burned captions in <30s p95.",
        "Single PublishIntent fans out to 4 PostRecords with platform-specific metadata.",
        "Idempotent retries: a failed sub-publish does not create duplicates."
      ]
    },
    {
      "id": "phase18_observability_sre",
      "title": "Real Observability + SLOs + Chaos + Runbooks",
      "depends_on": ["phase09_unified_data_plane"],
      "rationale": "Most prior infra config is scaffolded. Now wire OpenTelemetry into every public function, define SLOs, add chaos tests, write runbooks.",
      "deliverables": [
        "@quant/observability ships an instrument() decorator/wrapper used by every domain service.",
        "Every Fastify route auto-traced via fastify-otel plugin; every Prisma query auto-traced via Prisma OTel extension.",
        "SLO definitions: infra/slo/<service>.yaml (availability, latency, error-rate budgets).",
        "Sloth-style SLO -> burn-rate Prometheus alerts.",
        "Chaos: infra/chaos/litmus-experiments/*.yaml: pod-kill, network-loss, cpu-stress for every service.",
        "Runbooks: docs/runbooks/<service>.md - one per service. Each links from corresponding alert.",
        "Synthetic monitoring: scripts/synthetics/*.ts run via cron, checking critical user journeys.",
        "On-call: PagerDuty/Opsgenie integration; rotation defined in infra/oncall.yaml."
      ],
      "files_to_create": [
        "packages/observability/src/instrument.ts",
        "packages/observability/src/slo-loader.ts",
        "infra/slo/identity.yaml",
        "infra/slo/chat-api.yaml",
        "infra/slo/ws-gateway.yaml",
        "infra/chaos/litmus-experiments/pod-delete-chat.yaml",
        "infra/chaos/litmus-experiments/network-loss-search.yaml",
        "docs/runbooks/identity.md",
        "docs/runbooks/chat-api.md",
        "docs/runbooks/ws-gateway.md",
        "docs/runbooks/cdc-relay.md",
        "scripts/synthetics/login.ts",
        "scripts/synthetics/send-message.ts",
        "scripts/synthetics/post-status.ts"
      ],
      "acceptance": [
        "100% of public service methods emit a span (CI grep gate).",
        "Burn-rate alerts fire within 2 minutes when synthetic SLO violation injected (chaos test).",
        "Every alert has a linked runbook (CI lint gate)."
      ]
    },
    {
      "id": "phase19_quality_gate",
      "title": "Test coverage 80%+, mutation 60%+, e2e, load, security",
      "depends_on": ["phase18_observability_sre"],
      "rationale": "Bring test files from 42 to ~1000+ to match the source size, plus mutation, e2e, load, and security testing.",
      "deliverables": [
        "Vitest coverage gate: 80% lines on critical paths, enforced in CI.",
        "Stryker mutation testing for security/auth/payments packages, gate at 60%.",
        "Playwright e2e: scripts/e2e/*.spec.ts covering top 25 user journeys across 9 apps.",
        "k6 load tests: scripts/load/*.js with realistic ramp-up; gate at p95 latency targets.",
        "OWASP ZAP automated scans in CI; gate on high-severity.",
        "Snyk + npm audit gates in security-scan workflow."
      ],
      "files_to_create": [
        "packages/testing/src/coverage-gate.ts",
        "scripts/e2e/sign-up.spec.ts",
        "scripts/e2e/send-message.spec.ts",
        "scripts/e2e/cross-post.spec.ts",
        "scripts/e2e/agent-action.spec.ts",
        "scripts/load/chat-fanout.js",
        "scripts/load/feed-rank.js",
        "scripts/load/search-mixed.js",
        "scripts/security/zap-baseline.sh",
        ".github/workflows/quality-gates.yml"
      ],
      "acceptance": [
        "CI fails when any package's coverage drops below 80% on critical paths.",
        "All 25 e2e scenarios pass on every PR to main.",
        "k6 load test sustains 10k RPS on chat fan-out for 10 minutes p95<200ms.",
        "ZAP baseline reports zero high-severity findings."
      ]
    },
    {
      "id": "phase20_mobile_native",
      "title": "Native mobile apps (Expo/React Native) for top 3 apps",
      "depends_on": ["phase19_quality_gate"],
      "rationale": "All 9 apps are web-first today. Mobile is 70%+ of social/messaging usage. Ship Expo apps for QuantChat, QuantMax, QuantNeon first; share business logic via @quant/* packages.",
      "deliverables": [
        "Expo monorepo integration: apps-mobile/quantchat, apps-mobile/quantmax, apps-mobile/quantneon.",
        "Reuse @quant/api-client, @quant/ai (agent), @quant/auth (E2E), @quant/shared-ui (split into web + native variants where needed).",
        "Push notifications: FCM (Android) + APNs (iOS) wired via packages/notifications.",
        "Background sync, biometrics, secure enclave for E2E keys.",
        "Mobile-specific UX: bottom nav, swipe gestures, haptics, camera-first capture.",
        "EAS Build pipeline + TestFlight + Play Internal."
      ],
      "files_to_create": [
        "apps-mobile/quantchat/app.config.ts",
        "apps-mobile/quantchat/App.tsx",
        "apps-mobile/quantmax/app.config.ts",
        "apps-mobile/quantmax/App.tsx",
        "apps-mobile/quantneon/app.config.ts",
        "apps-mobile/quantneon/App.tsx",
        "packages/shared-ui/src/native/index.ts",
        ".github/workflows/eas-build.yml"
      ],
      "acceptance": [
        "EAS Build produces working iOS + Android binaries for all 3 apps.",
        "Push notification end-to-end test on real test device.",
        "E2E key stored in secure enclave; cannot be exported (verified by test)."
      ]
    },
    {
      "id": "phase21_launch_readiness",
      "title": "Launch readiness: compliance, multi-region, DR, growth instrumentation",
      "depends_on": ["phase20_mobile_native"],
      "rationale": "Final gate. Ship.",
      "deliverables": [
        "Compliance: GDPR data export + delete API, COPPA age gate, CCPA opt-out, DMA dataset portability, EU DSA risk assessment doc.",
        "Multi-region deploy: us-east-1 + eu-west-1 EKS clusters, Cloudflare for global CDN + DDoS, geo-routing.",
        "DR: automated DB snapshot + cross-region replica, 30-day point-in-time recovery, runbook for region failover.",
        "Growth instrumentation: typed event taxonomy in packages/analytics, funnel definitions, week-N retention dashboards.",
        "Status page: status.quant.app driven by uptime checks.",
        "Launch checklist: docs/launch/CHECKLIST.md with 100+ items.",
        "Marketing site: apps/marketing with comparison tables vs Meta/Google."
      ],
      "files_to_create": [
        "packages/compliance/src/gdpr-export.ts",
        "packages/compliance/src/gdpr-delete.ts",
        "packages/compliance/src/age-gate.ts",
        "packages/compliance/src/dsa-risk.ts",
        "infra/terraform/modules/multi-region/main.tf",
        "infra/runbooks/region-failover.md",
        "docs/launch/CHECKLIST.md",
        "apps/marketing/app/page.tsx",
        "apps/marketing/app/compare/meta/page.tsx",
        "apps/marketing/app/compare/google/page.tsx"
      ],
      "acceptance": [
        "Synthetic GDPR export of test user produces a verifiable archive in <5 minutes.",
        "Region failover game-day: us-east-1 outage simulated, eu-west-1 picks up traffic in <10 minutes with no data loss.",
        "All launch checklist items signed off by code owners."
      ]
    }
  ],

  "launch_readiness_gate": {
    "must_pass": [
      "All 13 phases (09 through 21) marked done in state.json.",
      "CI green on main for 7 consecutive days.",
      "All SLO budgets unburned for 30 days in staging.",
      "Pen-test report (external) closed with zero high/critical.",
      "DPIA (Data Protection Impact Assessment) signed.",
      "Founders' personal accounts use the production system end-to-end for 14 days with no rollbacks.",
      "Marketing comparison pages reviewed by legal."
    ]
  },

  "agent_runtime_hints": {
    "tools_to_prefer": [
      "Use @quant/* internal packages over external SaaS where functionally equivalent.",
      "Use ONNX Runtime over server-side Python where latency matters.",
      "Use Prisma migrations (prisma migrate dev) for every schema change; never edit DB by hand.",
      "Use Zod for every validation boundary; never use ad-hoc type guards."
    ],
    "anti_patterns_to_avoid": [
      "Do NOT recreate apps/*/api/ legacy folder.",
      "Do NOT add a new package without justifying functional orthogonality in PR description.",
      "Do NOT add a third-party service that requires sending PII off-platform without DPA review.",
      "Do NOT introduce another parallel auth flow; extend @quant/auth.",
      "Do NOT use Math.random; use crypto.randomBytes.",
      "Do NOT bypass the outbox pattern for cross-aggregate events."
    ],
    "code_style": {
      "language": "TypeScript strict; no any; no // @ts-ignore without justification comment.",
      "imports": "Always use absolute imports @quant/<pkg> for cross-package; relative for same-package.",
      "naming": "kebab-case files, PascalCase types, camelCase functions, SCREAMING_SNAKE_CASE constants.",
      "error_handling": "Throw typed errors from @quant/common/errors; never throw strings.",
      "async": "Always async/await; never raw Promises with .then chains in business code.",
      "react": "Server Components by default; mark 'use client' only when needed; use Suspense + Error Boundaries."
    }
  },

  "outputs_per_phase": {
    "required_artifacts": [
      "feature branch pushed to origin",
      "pull request opened to main with conventional title",
      "PR body containing: phase summary, acceptance checklist with check marks, screenshots for UI, curl examples for API, follow-ups",
      "phase status file: .agents/tasks/task-quant-meta-google-killer/PHASE-NN-status.md",
      "state.json updated with phase status",
      "review.md if any code review feedback applied"
    ]
  },

  "definition_of_done_for_mission": "When pasted into Autonomous Kiro and executed end-to-end, every phase merges to main with all gates green, the launch_readiness_gate passes, and the system is publicly demoable as a credible Meta+Google challenger across all 9 surfaces with the 8 uncopyable moats verifiably enabled."
}
```
