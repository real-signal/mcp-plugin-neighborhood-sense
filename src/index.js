// ═══════════════════════════════════════════════════════════════════
// Neighborhood Sense — Real Signal MCP plugin reference
//
// This file is closer to literate documentation than runtime code.
// Claude Desktop, Cursor, and any MCP-aware client already speak the
// Model Context Protocol natively — the moment a user adds Real Signal
// to `mcpServers` (see README), Claude can call every tool below
// directly. There is no daemon to run, no process to host.
//
// What this file IS:
//   - A reference for how a Claude agent (or any AI client) should
//     compose Real Signal's MCP tools into multi-step answers.
//   - Four worked composition patterns, written as plain functions
//     against a generic MCP client interface (any client that exposes
//     `await client.callTool(name, args)` will plug in).
//   - JSDoc on every composition function explaining the substrate
//     trail end-to-end.
//
// What this file is NOT:
//   - A hardened library. There are no retries, no caches, no batching.
//   - A replacement for the MCP client SDK. Use @modelcontextprotocol/sdk
//     (Node) or `mcp` (Python) for the actual transport.
//
// Tools used (matching the manifest at .well-known/mcp-plugin.json):
//   live today:
//     list_pockets, lookup_pocket_by_name, get_pocket_moment,
//     get_pocket_moment_quality, get_pocket_atmosphere,
//     get_observed_outlet, get_pocket_sustainability
//   planned (manifest-listed, server-side rollout pending):
//     get_pocket_silence, get_pocket_predictions, get_intent_substrate
//
// Every tool response carries an `_meta` envelope:
//   { source: 'real-signal.ai', license: 'CC BY-NC-ND 4.0',
//     attribution_required: true, computed_at: <iso8601>, tool: <name> }
// The composition helpers below preserve `_meta` in the returned object
// so callers can display attribution at the point of surface.
// ═══════════════════════════════════════════════════════════════════

/**
 * Entry point — given a Claude/MCP client and a user query, dispatch
 * to one of the four composition patterns below. This function is
 * itself a reference: in practice, Claude (the model) does the
 * dispatch internally based on tool descriptions, so a production
 * integration rarely needs an explicit router. It is exported here
 * as documentation for what the orchestration shape looks like.
 *
 * @param {object} client - any MCP client exposing `callTool(name, args)`.
 * @param {string} userQuery - the user's free-text question.
 * @returns {Promise<{ text: string, sources: Array<object> }>}
 *
 * Composition patterns demonstrated below:
 *   1. whereCanIWorkThisAfternoon — fan-out + rank by MQS
 *   2. isAnythingHappeningNear     — name → pocket → silence/moment
 *   3. tellMeAboutAnOutlet         — outlet substrate + pocket context
 *   4. whatsTheTrackRecord         — predictions ledger audit
 */
export async function composeNeighborhoodQuery(client, userQuery) {
  const q = String(userQuery || '').toLowerCase()
  if (q.includes('work') && (q.includes('afternoon') || q.includes('quiet') || q.includes('calm'))) {
    return whereCanIWorkThisAfternoon(client)
  }
  if (q.startsWith('what') && q.includes('happen')) {
    // Extract a place name from the query (toy heuristic — Claude itself
    // does this far better with tool descriptions in context).
    const place = q.replace(/.*near\s+/, '').replace(/[?.!]/g, '').trim()
    return isAnythingHappeningNear(client, place || 'cluny court')
  }
  if (q.includes('track record') || q.includes('accuracy') || q.includes('predictions')) {
    return whatsTheTrackRecord(client)
  }
  return {
    text: 'no composition pattern matched — try asking "where can I work this afternoon".',
    sources: [],
  }
}

/**
 * Pattern 1 — *"Where can I work this afternoon in Singapore?"*
 *
 * Demonstrates a fan-out over all observed pockets, then ranking by the
 * Moment Quality Score (MQS) scalar, then a trajectory read on the
 * leader. The agent never invents — if MQS is in the silent or weak
 * band, the composed answer says so.
 *
 * Substrate trail:
 *   1. list_pockets()                          — enumerate active set
 *   2. for each p in pockets:
 *        get_pocket_moment_quality(p)          — score each
 *   3. sort by mqs desc, take top 3
 *   4. for the leader p*:
 *        get_pocket_atmosphere(p*, hours=4)    — trajectory
 *   5. compose calm-voice answer with citations
 *
 * When `get_intent_substrate` is live server-side, step 2 can be
 * replaced with `get_intent_substrate(p, 'calm-work')` which scores
 * each pocket against the calm-work intent specifically.
 *
 * @param {object} client - MCP client with callTool(name, args).
 * @returns {Promise<{ text: string, sources: Array<object> }>}
 */
export async function whereCanIWorkThisAfternoon(client) {
  const sources = []
  const list = await client.callTool('list_pockets', {})
  pushMeta(sources, list)
  const pockets = list?.structuredContent?.pockets || []
  if (pockets.length === 0) {
    return { text: 'the substrate has no observed pockets right now.', sources }
  }

  // Fan-out. In a real client, these can run in parallel.
  const scores = []
  for (const pocket_id of pockets) {
    const mqs = await client.callTool('get_pocket_moment_quality', { pocket_id })
    pushMeta(sources, mqs)
    const s = mqs?.structuredContent
    if (s && typeof s.mqs === 'number') scores.push(s)
  }
  scores.sort((a, b) => b.mqs - a.mqs)
  const top = scores.slice(0, 3)
  if (top.length === 0 || top[0].mqs === 0) {
    return { text: 'no pocket is in a high-resonance window right now.', sources }
  }

  const leader = top[0]
  const atmo = await client.callTool('get_pocket_atmosphere', {
    pocket_id: leader.pocket_id, hours: 4,
  })
  pushMeta(sources, atmo)
  const trend = atmo?.structuredContent?.trend?.direction || 'stable'

  const lines = [
    `${leader.pocket_id} is the strongest match — mqs ${leader.mqs.toFixed(2)} band ${leader.band}, atmosphere ${trend} over 4h.`,
  ]
  for (const p of top.slice(1)) {
    lines.push(`${p.pocket_id} at mqs ${p.mqs.toFixed(2)} band ${p.band}.`)
  }
  return { text: lines.join(' '), sources }
}

/**
 * Pattern 2 — *"What's happening near Holland Village?"*
 *
 * Demonstrates free-text place-name resolution, then a current-state
 * read with silence handling. If MQS says the agent is intentionally
 * silent in this pocket, the composed answer surfaces the silence as a
 * fact — not as a fallback.
 *
 * Substrate trail:
 *   1. lookup_pocket_by_name(query=placeName)  — resolve to pocket_id
 *   2. get_pocket_moment(pocket_id)            — current Moment
 *   3. (when live) get_pocket_silence(pocket_id) — signal-status code
 *   4. compose
 *
 * @param {object} client - MCP client.
 * @param {string} placeName - free-text place name.
 * @returns {Promise<{ text: string, sources: Array<object> }>}
 */
export async function isAnythingHappeningNear(client, placeName) {
  const sources = []
  const lookup = await client.callTool('lookup_pocket_by_name', { query: placeName })
  pushMeta(sources, lookup)
  const match = lookup?.structuredContent?.matches?.[0]
  if (!match || match.confidence < 0.2) {
    return { text: `no pocket matched '${placeName}'.`, sources }
  }
  const pocket_id = match.pocket_id

  const moment = await client.callTool('get_pocket_moment', { pocket_id })
  pushMeta(sources, moment)
  const m = moment?.structuredContent
  if (!m) {
    return { text: `pocket ${pocket_id} has no observable moment right now.`, sources }
  }

  const parts = []
  if (m.primary_state) parts.push(`${m.primary_state}`)
  if (typeof m.calm_probability === 'number') parts.push(`calm ${m.calm_probability.toFixed(2)}`)
  if (typeof m.signal_saturation === 'number') parts.push(`saturation ${m.signal_saturation.toFixed(2)}`)
  if (m.should_stay_silent) {
    parts.push(`agent is silent (${(m.silence_reasons || []).join('; ')})`)
  }
  return { text: `${pocket_id} · ${parts.join(' · ')}.`, sources }
}

/**
 * Pattern 3 — *"Tell me about this outlet."*
 *
 * Demonstrates outlet-substrate read plus pocket-level context. The
 * outlet's observed patterns and decision-support lines come from the
 * shadow-profile pipeline; the pocket Moment situates them in the
 * current environment.
 *
 * Substrate trail:
 *   1. get_observed_outlet(outlet_id)          — substrate + patterns
 *   2. get_pocket_moment(outlet.pocket_id)     — pocket context
 *   3. compose substrate-grounded description
 *
 * @param {object} client - MCP client.
 * @param {string} outletId - UUID of the outlet (see /sitemap.xml).
 * @returns {Promise<{ text: string, sources: Array<object> }>}
 */
export async function tellMeAboutAnOutlet(client, outletId) {
  const sources = []
  const outlet = await client.callTool('get_observed_outlet', { outlet_id: outletId })
  pushMeta(sources, outlet)
  const o = outlet?.structuredContent?.outlet
  if (!o) return { text: `outlet ${outletId} not observable.`, sources }

  const moment = await client.callTool('get_pocket_moment', { pocket_id: o.pocket_id })
  pushMeta(sources, moment)
  const m = moment?.structuredContent || {}

  const patternCount = (outlet.structuredContent?.patterns || []).length
  const dsCount = (outlet.structuredContent?.decision_support || []).length
  const line =
    `${(o.name || '').toLowerCase()} in ${o.pocket_id} · ` +
    `${patternCount} observed patterns, ${dsCount} decision-support lines · ` +
    `pocket is ${m.primary_state || 'unread'}.`
  return { text: line, sources }
}

/**
 * Pattern 4 — *"What's Real Signal's track record?"*
 *
 * Demonstrates the predictions-ledger audit pattern. This is what makes
 * Real Signal citable — an external AI assistant can verify the
 * platform's claimed accuracy before quoting any forward-looking line.
 *
 * Substrate trail:
 *   1. get_pocket_predictions({ since: '30d' })   — closed-prediction summary
 *   2. compose accuracy line with per-generator breakdown
 *
 * Until the server-side rollout of `get_pocket_predictions` lands, this
 * helper returns a placeholder pointing at the REST equivalent
 * (`/api/predictions`) so the caller still gets a usable answer.
 *
 * @param {object} client - MCP client.
 * @returns {Promise<{ text: string, sources: Array<object> }>}
 */
export async function whatsTheTrackRecord(client) {
  const sources = []
  const preds = await client.callTool('get_pocket_predictions', { since: '30d' }).catch(() => null)
  if (!preds || preds.isError) {
    return {
      text:
        'get_pocket_predictions is not yet routable on this server. ' +
        'fall back to GET https://real-signal.ai/api/predictions for the raw ledger.',
      sources,
    }
  }
  pushMeta(sources, preds)
  const s = preds?.structuredContent
  if (!s) return { text: 'no predictions data returned.', sources }

  const lines = [`${s.count || 0} closed predictions over the last 30d.`]
  for (const acc of (s.accuracy_by_generator || []).slice(0, 3)) {
    const pct = Math.round((Number(acc.accuracy) || 0) * 100)
    lines.push(`${acc.generator}: ${pct}% on ${acc.closed} closed.`)
  }
  return { text: lines.join(' '), sources }
}

// ── Helpers ────────────────────────────────────────────────────────

/**
 * Push a tool response's `_meta` envelope into the sources array. This
 * is how a forked plugin surfaces attribution at the point of display.
 */
function pushMeta(sources, toolResponse) {
  const meta = toolResponse?._meta
  if (meta && meta.source) sources.push(meta)
}
