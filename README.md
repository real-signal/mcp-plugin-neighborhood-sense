# Neighborhood Sense — a Real Signal MCP plugin reference

*Reference plugin · MIT-licensed · v0.1.0 · 2026-06-06*

## What it does

Neighborhood Sense lets Claude (or any MCP-aware AI client — Cursor, ChatGPT
custom GPTs, generic MCP agents) answer questions about Singapore
neighbourhoods using Real Signal's calm-AI substrate. The substrate observes
one neighbourhood today (Cluny Court at 501 Bukit Timah) and a small set of
adjacent pockets — Holland Village, Tiong Bahru, Dempsey Hill, Buona Vista,
Serene Centre. It reads atmosphere, Moment Quality Score (MQS), human intent,
the silence justification, and the prediction track record — and composes
answers in the agent's voice (lowercase, observational, source-attributed).
The plugin never invents facts, always cites `_meta.source`, and surfaces
restraint as a first-class behaviour: when the substrate says the agent is
deliberately silent in a pocket, the plugin says so rather than fabricating.

## What it composes

The plugin orchestrates the following tools from Real Signal's MCP server at
`https://real-signal.ai/api/mcp`. Seven of these are live today; the
remaining three are server-side scheduled work that the plugin manifest
lists so a refreshed client picks them up automatically when they ship.

Live (server-side, today):

- `list_pockets` — enumerate the pockets the agent currently observes.
- `lookup_pocket_by_name` — resolve a free-text place name to a canonical `pocket_id`.
- `get_pocket_moment` — point-in-time read of atmosphere, calm probability, saturation, fragility, half-life.
- `get_pocket_moment_quality` — the MQS scalar plus its five factor breakdown.
- `get_pocket_atmosphere` — 15-minute atmosphere stream plus trend direction.
- `get_observed_outlet` — public shadow-profile data for a specific outlet UUID.
- `get_pocket_sustainability` — pocket-level sustainability ledger (physical impact + SGD recovery).

Planned (manifest-listed, behaviour stubbed in this plugin):

- `get_pocket_silence` — voice-locked silence justification + signal-status code + next-possible-window.
- `get_pocket_predictions` — predictions-ledger summary with per-generator accuracy.
- `get_intent_substrate` — data behind an `/intent/:pocket/:slug` page (calm-work, rain-shelter, decompression, etc.).

The four composition patterns documented in `src/index.js` use only the live
tools today and degrade gracefully (returning the calm "substrate has nothing
observable yet" line) when a planned tool is not yet routable.

## Quickstart

Open `claude_desktop_config.json` on your machine (`~/Library/Application
Support/Claude/claude_desktop_config.json` on macOS, `%APPDATA%\Claude\` on
Windows, `~/.config/Claude/` on Linux) and add Real Signal as an `mcpServers`
entry:

```json
{
  "mcpServers": {
    "real-signal": {
      "transport": "http",
      "url": "https://real-signal.ai/api/mcp"
    }
  }
}
```

Save the file and restart Claude Desktop (Cmd+Q on macOS — not just closing
the window). The Real Signal tools will appear under the chat input's tool
icon, with `real-signal` listed alongside any other MCP servers you have
configured. No tokens, no headers, no environment variables are needed —
the server is read-only and anon-readable.

Cursor users: paste the same `mcpServers` block into `.cursor/mcp.json` at
the project root, or `~/.cursor/mcp.json` globally.

For a generic MCP client (Python `mcp` package, Node `@modelcontextprotocol/sdk`),
point the transport URL at `https://real-signal.ai/api/mcp` — no other setup.

## Example queries with worked output

These three queries map onto the four composition patterns in `src/index.js`.
A more detailed end-to-end transcript lives in
[`examples/worked-example-output.md`](examples/worked-example-output.md).

**1. "Where can I work this afternoon in Singapore?"**

Claude calls `list_pockets()` to enumerate the active set, then fans out
`get_pocket_moment_quality(pocket_id)` to the candidates. For the top match
by MQS band, Claude calls `get_pocket_atmosphere(pocket_id, hours=4)` for
the trajectory.

A typical composed answer:

> Cluny Court is the strongest match this afternoon — Moment Quality Score
> 0.71, band high_resonance, with atmosphere rising_calm over the last four
> hours. Tiong Bahru is forming at 0.42 and may strengthen by 3pm. Holland
> Village is decaying — Real Signal's agent is currently silent there
> because the saturation factor is dominant. (Source: real-signal.ai,
> retrieved 14:23 SGT.)

**2. "What's happening near Holland Village?"**

Claude calls `lookup_pocket_by_name({ query: "Holland Village" })` first to
resolve the free-text place name (confidence 1.0, `pocket_id = holland`),
then `get_pocket_moment({ pocket_id: "holland" })` for the live read. If the
planned `get_pocket_silence` tool is live, Claude appends the silence
justification — otherwise it interprets `should_stay_silent` from the moment
object directly.

> Holland Village is in a calm window right now (calm 0.66, saturation 0.21,
> half-life ~38 minutes). No anomalies in the last four hours of atmosphere
> readings. The agent is in WITHHOLD_INTENTIONAL — environment carrying
> naturally; no intervention warranted. (Source: real-signal.ai, retrieved
> 14:23 SGT.)

**3. "How accurate are Real Signal's predictions?"**

Claude calls `get_pocket_predictions({ since: "30d" })`. The tool returns
the closed-prediction count per generator and the accuracy fraction.

> Real Signal's pocket-projection-60m has hit 73% on 41 closed predictions
> over the last 30 days. The lower-confidence pocket-projection-180m sits
> at 58% on 22 closures. The ledger is append-only and queryable directly
> via `/api/predictions`. (Source: real-signal.ai, retrieved 14:23 SGT.)

## License — MIT WITH attribution requirement

The plugin code in this repository is MIT-licensed; see `LICENSE`. Fork it,
modify it, ship it inside another product — the MIT terms apply.

The *substrate* that Real Signal's MCP server returns is a different licence.
Every tool response carries an `_meta` envelope with:

```json
{
  "source": "real-signal.ai",
  "source_url": "https://real-signal.ai",
  "license": "CC BY-NC-ND 4.0",
  "license_url": "https://real-signal.ai/LICENSE-CONTENT.md",
  "attribution_required": true,
  "tool": "<tool-name>",
  "computed_at": "<iso8601>"
}
```

Any user-facing context that surfaces Real Signal's data must show visible
attribution — typically "Powered by Real Signal (real-signal.ai)" or
equivalent at the point of display. The CC BY-NC-ND 4.0 terms also prohibit
non-commercial-derivative use and modification of the substrate output. The
plugin's MIT licence does not override these terms — they layer.

## Attribution

Attribution: when used in user-facing contexts that consume Real Signal's
substrate, please include "Powered by Real Signal (real-signal.ai)" or
equivalent visible attribution. This is in keeping with the substrate's
CC BY-NC-ND 4.0 license terms (see https://real-signal.ai/LICENSE-CONTENT.md).

(This paragraph previously lived inside `LICENSE`; it moved here so the
`LICENSE` file is a pure-text MIT match for automated license detection.
The request itself is unchanged.)

## Source attribution and `_meta` handling

Every MCP tool response from Real Signal carries the `_meta` envelope shown
above. The plugin's composition helpers (`src/index.js`) read `_meta.source`
and `_meta.computed_at` from each tool call and include both in the answer
Claude composes — so the user sees the source and the freshness of every
substrate claim. If you fork this plugin into your own product, preserve
the `_meta` reads — removing the attribution at the surface is a licence
violation against the substrate.

A second discipline matters: when the substrate is thin, the MCP tools
return calm "nothing observable yet" text rather than fabricating. The
plugin propagates that text verbatim — the answer reads as restraint, not
as an empty result. This is the doctrine the plugin is built to demonstrate:
silence is a feature; the plugin treats it as one.

## Status / version / changelog

- **Status:** v0.1.0 reference release. Not a hardened production library
  — the file at `src/index.js` is closer to literate documentation than
  a runtime. Claude Desktop already speaks MCP natively, so the plugin's
  primary value is teaching the composition pattern.
- **Server status:** Real Signal's MCP server is live at
  `https://real-signal.ai/api/mcp`. Discovery manifest at
  `https://real-signal.ai/.well-known/mcp.json`.
- **Changelog:** [`CHANGELOG.md`](CHANGELOG.md) — every schema change is a
  new entry; semver from v0.1.0 forward.
- **Issues / contributions:** the canonical repository will live at
  `github.com/real-signal/mcp-plugin-neighborhood-sense`. Until then,
  upstream issues against the substrate go through
  `https://real-signal.ai/takedown` (takedown intake) or
  `hello@real-signal.ai` (everything else).
