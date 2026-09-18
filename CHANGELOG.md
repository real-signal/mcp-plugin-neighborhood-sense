# Changelog

All notable changes to this plugin will be recorded here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); the plugin tracks
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 0.4.0 — 2026-09-16

Brings the manifest to full read-only parity with the production MCP
server and makes the "what's happening now" pattern demonstrate useful
silence.

Added to the manifest tools list (all read-only, shipped since 0.3.0):

- `get_live_moment_story`, `get_available_experiences` — the Dual
  Discovery live layer. `get_available_experiences` returns
  merchant-confirmed live commitments, and — new this release — an
  honest structured `fallback` when none are live (why silent, presence
  status, the pocket's retrospective rhythm, and what would make it
  live) instead of a bare empty list.
- `find_calm_pocket_now`, `compare_pockets` — network-scope calm
  discovery.
- `get_merchant_readiness`, `get_pocket_equilibrium`,
  `get_pocket_packages` — remaining read substrate.

`submit_benchmark_predictions` stays excluded (the one write tool).

Changed:

- `isAnythingHappeningNear` now checks live experiences first and, when
  nothing is live, surfaces the response's structured fallback
  (retrospective rhythm + reason for silence) rather than a blank
  "nothing happening" line. The empty state is never blank and never
  fabricates presence — synthetic / confidence-gated readings are never
  reported as live.

## 0.3.0 — 2026-06-13

Adds the citizen sensing layer + makes the package npm-publish ready.

Added:

- `get_pocket_perception` in the manifest tools list. The MCP server's
  22nd tool — shipped 2026-06-11 — returns the aggregate citizen-sense
  distribution (calm / busy / social / focused / transitional) for a
  pocket plus the agent-vs-citizen agreement scalar when both readings
  exist. Aggregate-only with n≥5 floor honoured exactly as the public
  Pocket Pulse widget enforces it. Read-only, calm-AI shaped, naturally
  composes into Claude responses about "how does Cluny feel right now"
  questions.

Plugin packaging:

- `package.json` `files` field added — npm tarball now ships only
  `src/`, `.well-known/`, `examples/`, `README.md`, `LICENSE`,
  `CHANGELOG.md`. Internal docs (`FOUNDER_HANDOFF.md`) stay in the repo
  for the founder but never publish.
- `exports` field added so consumers can `import { compose... } from
  '@real-signal/mcp-plugin-neighborhood-sense'` and also reach the
  manifest via `.../manifest`.
- Isolated `vitest.config.js` so the package tests cleanly in
  standalone — same fix applied to `@real-signal/attention-ethics` on
  2026-06-12 when that package extracted from the monorepo.
- Smoke tests added under `src/index.test.js` — verifies the five
  composition functions are exported as expected, the manifest is
  parseable JSON with the required fields, and the manifest tool list
  matches the documented "live today" set (`get_pocket_perception`
  included now).

Manifest changes:

- `version` bumped 0.2.0 → 0.3.0.
- `description` rewritten to mention "citizen perception" alongside
  atmosphere / Moment Quality.
- `tools` array gains `get_pocket_perception` (now 21 read-only tools
  exposed; `submit_benchmark_predictions` remains the one write tool
  carved out per `tools_excluded`).

## 0.2.0 — 2026-06-08

Catches the manifest up to the live MCP server. Between 2026-06-06 (0.1.0)
and 2026-06-08 the production server added 11 tools (Phase II + Ambient
Dominance build wave). All 20 read-only tools are now live; the manifest
no longer carries any "planned / stubbed" entries.

Added (all live on `https://real-signal.ai/api/mcp` as of this release):

- `score_legitimacy` — 0–100 legitimacy score for a candidate action against a pocket.
- `get_pocket_futures` — anticipatory outlook with 60/120/180-min probabilistic projections.
- `get_accuracy_report` — high-confidence predictions accuracy summary (the public trust number).
- `get_pocket_counterfactuals` — per-silence "what could have been said" ledger with gate attribution.
- `get_state_of_pocket` — Monthly State of Pocket report (composed on the 1st of each month).
- `simulate_outlet_autopilot` — 30-day per-outlet backtest (what would have been surfaced vs withheld).
- `get_state_of_restraint` — Monthly State of Restraint network-level report.
- `get_legitimacy_index_today` — Daily Legitimacy Index reading per pocket (08:30 SGT).
- `get_weekly_report` — Weekly Cluny Intelligence Report (Monday 09:00 SGT).
- `get_benchmark_leaderboard` — current ranked Real Signal Benchmark leaderboard.

Excluded by design:

- `submit_benchmark_predictions` — present on the production server but a
  write tool. Carved out of this plugin's manifest because the plugin's
  positioning is read-only calm-AI substrate. Benchmark participants use
  the underlying MCP server directly via dedicated submission tooling, not
  ambient Claude queries.

Manifest changes:

- `version` bumped 0.1.0 → 0.2.0.
- `privacy_policies` array added per Anthropic Connectors Directory
  submission spec (manifest v0.2+ requirement).
- `tools_excluded` block added — documents the `submit_benchmark_predictions`
  carve-out so future-self / reviewers see the decision rather than wonder
  why the count differs from the discovery manifest.
- `description` rewritten to name the new substrate (legitimacy index,
  state-of-pocket, autopilot backtests).
- `read-only` added to `tags`.

## 0.1.0 — 2026-06-06

Initial release. Reference plugin for Real Signal's MCP server.
Demonstrated 4 composition patterns over 10 MCP tools (7 live at the time
on `https://real-signal.ai/api/mcp`; 3 listed in the manifest so a
refreshed Claude Desktop / Cursor session would pick them up automatically
once they shipped server-side).

- `composeNeighborhoodQuery` — entry function with 4 worked patterns.
- `whereCanIWorkThisAfternoon` — `list_pockets` → fan-out → MQS → atmosphere.
- `isAnythingHappeningNear` — `lookup_pocket_by_name` → silence + moment.
- `tellMeAboutAnOutlet` — `get_observed_outlet` + `get_pocket_moment`.
- `whatsTheTrackRecord` — `get_pocket_predictions` (track-record audit).
