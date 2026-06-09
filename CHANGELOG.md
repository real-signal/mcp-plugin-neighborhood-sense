# Changelog

All notable changes to this plugin will be recorded here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); the plugin tracks
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
