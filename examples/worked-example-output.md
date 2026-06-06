# Worked example — "Where can I work this afternoon in Singapore?"

This file walks through a single composed query end-to-end. The user
types a question into Claude Desktop; Claude inspects the available
Real Signal MCP tools, decides on a tool sequence, calls each tool over
JSON-RPC 2.0, and composes the final answer using the structured
responses and the `_meta` source envelope.

The transcript below is illustrative — actual MQS readings, atmosphere
values, and pocket sets vary per fifteen-minute window. The shape of the
composition does not.

---

## Turn 1 — user prompt

> **User:** "Where can I work this afternoon in Singapore?"

## Turn 2 — Claude inspects available tools

Claude sees the Real Signal MCP server registered under `mcpServers` in
`claude_desktop_config.json`. Tool descriptions from the registry tell
Claude that:

- `list_pockets` enumerates the active set of neighbourhoods.
- `get_pocket_moment_quality` returns the central "is this moment worth
  breaking silence?" scalar, banded into silent / weak / forming /
  high_resonance / peak / decaying.
- `get_pocket_atmosphere` returns the trajectory across a recent window.

Claude reasons that a "where" + "this afternoon" question maps onto:
fan-out across pockets, score each by MQS, then deepen on the leader
with a trajectory read. This is composition pattern 1 from `src/index.js`.

## Turn 3 — Claude calls `list_pockets()`

```jsonc
// request
{ "jsonrpc": "2.0", "id": 1, "method": "tools/call",
  "params": { "name": "list_pockets", "arguments": {} } }
```

```jsonc
// response (abbreviated)
{ "jsonrpc": "2.0", "id": 1, "result": {
    "content": [{ "type": "text",
      "text": "observed pockets: buonavista, chipbee, cluny, dempsey, frankel, hajilane, holland, joochiat, keongsakik, lorkilat, rochester, serene, siglap, sunset, tanglinhalt, tanjongkatong, tiongbahru, upperthomson." }],
    "structuredContent": { "pockets": [
      "buonavista","chipbee","cluny","dempsey","frankel","hajilane",
      "holland","joochiat","keongsakik","lorkilat","rochester","serene",
      "siglap","sunset","tanglinhalt","tanjongkatong","tiongbahru","upperthomson"
    ]},
    "_meta": {
      "source": "real-signal.ai",
      "license": "CC BY-NC-ND 4.0",
      "attribution_required": true,
      "tool": "list_pockets",
      "computed_at": "2026-06-06T06:23:11.000Z"
    }
  }
}
```

18 pockets returned.

## Turn 4 — Claude fans out `get_pocket_moment_quality()`

Claude calls `get_pocket_moment_quality` once per pocket. The MCP
server's rate limit (30/min/IP, shared with narration) is well under
the burst here; Claude pipelines the calls when the client supports it.

Sample response for `cluny`:

```jsonc
{ "jsonrpc": "2.0", "id": 4, "result": {
    "content": [{ "type": "text",
      "text": "pocket cluny · mqs 0.71 (high_resonance) · calmness 0.86 leading at 14:23 SGT" }],
    "structuredContent": {
      "pocket_id": "cluny",
      "computed_at": "2026-06-06T06:20:00.000Z",
      "mqs": 0.71,
      "band": "high_resonance",
      "factors": {
        "usefulness": 0.78, "urgency": 0.52, "calmness": 0.86,
        "merchant_fit": 0.74, "user_need": 0.62
      },
      "previous_mqs": 0.64,
      "reasons": [
        { "factor": "calmness", "weight": 0.86, "note": "atmosphere holding" }
      ],
      "source": "cache"
    },
    "_meta": {
      "source": "real-signal.ai", "license": "CC BY-NC-ND 4.0",
      "attribution_required": true, "tool": "get_pocket_moment_quality",
      "computed_at": "2026-06-06T06:23:14.000Z"
    }
  }
}
```

After all 18 responses arrive, Claude sorts by `mqs` descending. The top
three this window:

| rank | pocket_id    | mqs  | band            |
|------|--------------|------|-----------------|
| 1    | cluny        | 0.71 | high_resonance  |
| 2    | tiongbahru   | 0.42 | forming         |
| 3    | holland      | 0.18 | decaying        |

## Turn 5 — trajectory read on the leader

Claude calls `get_pocket_atmosphere({ pocket_id: "cluny", hours: 4 })`:

```jsonc
{ "jsonrpc": "2.0", "id": 23, "result": {
    "content": [{ "type": "text",
      "text": "pocket cluny · atmosphere calm 0.78 productive 0.65 · trend rising_calm over 4h · 16 readings" }],
    "structuredContent": {
      "pocket_id": "cluny",
      "window_hours": 4,
      "latest": {
        "stress": 0.18, "calm": 0.78, "social_energy": 0.42,
        "productive": 0.65, "primary_state": "calm-productive",
        "anomaly_flag": false,
        "captured_at": "2026-06-06T06:15:00.000Z"
      },
      "trend": { "direction": "rising_calm", "magnitude": 0.17 },
      "reading_count": 16
    },
    "_meta": {
      "source": "real-signal.ai", "license": "CC BY-NC-ND 4.0",
      "attribution_required": true, "tool": "get_pocket_atmosphere",
      "computed_at": "2026-06-06T06:23:18.000Z"
    }
  }
}
```

## Turn 6 — Claude composes the answer

Claude has three substrate facts in hand:

1. `cluny` is the leader at MQS 0.71, band `high_resonance`.
2. The atmosphere trend at `cluny` is `rising_calm` over the last four
   hours; latest reading is `calm-productive`.
3. The next two pockets are `tiongbahru` (forming, 0.42) and `holland`
   (decaying, 0.18). Holland's decaying state means the agent is
   currently silent there — that surfaces as a fact, not a fallback.

Composed answer (Claude's voice, with attribution):

> Cluny Court is your strongest option this afternoon. Real Signal's
> Moment Quality Score there is 0.71, band high_resonance, and the
> atmosphere is rising_calm over the last four hours (calm 0.78,
> productive 0.65). Tiong Bahru is forming at 0.42 — possible by
> mid-afternoon. Holland Village is in a decaying window, so Real
> Signal's agent is currently silent there.
>
> (Source: real-signal.ai · Moment Quality Score + atmosphere stream ·
> observed 14:23 SGT · CC BY-NC-ND 4.0.)

The `_meta` envelopes were carried through every tool call. Claude
includes the source attribution and the timestamp at the end of the
composed answer — both because the licence requires it and because the
specific timestamp is a stronger trust signal than an unqualified
"current" claim.

---

## What this demonstrates

Three things this transcript proves out:

1. **The composition is the value.** Single-tool lookups on any of the
   18 pockets would return a number; only the fan-out + ranking + leader
   trajectory produces an answer to the actual user question. Claude
   does this composition without the plugin author hand-coding it —
   the tool descriptions in the registry are enough.
2. **Silence surfaces as a fact.** Holland Village's decaying state
   means the agent is silent there. The plugin propagates that to the
   user verbatim — "currently silent there" — rather than papering
   over the absence with fabricated content.
3. **Attribution travels.** Every `_meta` envelope is preserved and
   surfaced at the point of display. A user reading the answer in
   Claude Desktop sees the source, the licence, and the moment the
   data was retrieved.

The other three composition patterns in `src/index.js` follow the same
shape — substrate trail → composed answer → attribution preserved.
