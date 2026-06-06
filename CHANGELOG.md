# Changelog

All notable changes to this plugin will be recorded here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); the plugin tracks
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 0.1.0 — 2026-06-06

Initial release. Reference plugin for Real Signal's MCP server.
Demonstrates 4 composition patterns over 10 MCP tools (7 live today on
`https://real-signal.ai/api/mcp`; 3 planned — `get_pocket_silence`,
`get_pocket_predictions`, `get_intent_substrate` — already listed in the
plugin manifest so a future Claude Desktop / Cursor session picks them up
automatically once they ship server-side).

- `composeNeighborhoodQuery` — entry function with 4 worked patterns.
- `whereCanIWorkThisAfternoon` — `list_pockets` → fan-out → MQS → atmosphere.
- `isAnythingHappeningNear` — `lookup_pocket_by_name` → silence + moment.
- `tellMeAboutAnOutlet` — `get_observed_outlet` + `get_pocket_moment`.
- `whatsTheTrackRecord` — `get_pocket_predictions` (track-record audit).
