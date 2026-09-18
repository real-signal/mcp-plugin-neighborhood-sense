import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

import * as Plugin from './index.js'

const here = dirname(fileURLToPath(import.meta.url))
const PACKAGE_ROOT = join(here, '..')
const MANIFEST_PATH = join(PACKAGE_ROOT, '.well-known', 'mcp-plugin.json')
const PACKAGE_JSON_PATH = join(PACKAGE_ROOT, 'package.json')

// Pure module — no MCP client involved here. These smoke tests pin
// what consumers of the package will rely on: the named composition
// functions exported, the manifest shape, and version-string sync
// between package.json + the discovery manifest.

describe('package exports', () => {
  it('exports the five composition functions documented in the README', () => {
    expect(typeof Plugin.composeNeighborhoodQuery).toBe('function')
    expect(typeof Plugin.whereCanIWorkThisAfternoon).toBe('function')
    expect(typeof Plugin.isAnythingHappeningNear).toBe('function')
    expect(typeof Plugin.tellMeAboutAnOutlet).toBe('function')
    expect(typeof Plugin.whatsTheTrackRecord).toBe('function')
  })

  it('does not export anything unexpected', () => {
    const expected = new Set([
      'composeNeighborhoodQuery',
      'whereCanIWorkThisAfternoon',
      'isAnythingHappeningNear',
      'tellMeAboutAnOutlet',
      'whatsTheTrackRecord',
    ])
    for (const k of Object.keys(Plugin)) {
      expect(expected.has(k), `unexpected export: ${k}`).toBe(true)
    }
  })
})

describe('manifest', () => {
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'))
  const pkg = JSON.parse(readFileSync(PACKAGE_JSON_PATH, 'utf8'))

  it('has the required Anthropic Connectors Directory fields', () => {
    expect(typeof manifest.name).toBe('string')
    expect(typeof manifest.displayName).toBe('string')
    expect(typeof manifest.version).toBe('string')
    expect(typeof manifest.description).toBe('string')
    expect(typeof manifest.author).toBe('string')
    expect(typeof manifest.license).toBe('string')
    expect(Array.isArray(manifest.privacy_policies)).toBe(true)
    expect(manifest.privacy_policies.length).toBeGreaterThan(0)
    expect(manifest.mcpServer).toBeDefined()
    expect(manifest.mcpServer.url).toBe('https://real-signal.ai/api/mcp')
    expect(manifest.mcpServer.transport).toBe('http')
  })

  it('lists every tool the plugin composes against', () => {
    const tools = manifest.tools
    expect(Array.isArray(tools)).toBe(true)
    // Tools the composition functions call directly — if the manifest
    // omits any of these, Claude Desktop refuses to grant access and
    // the worked patterns silently fail.
    const required = [
      'list_pockets',
      'lookup_pocket_by_name',
      'get_pocket_moment',
      'get_pocket_moment_quality',
      'get_pocket_atmosphere',
      'get_observed_outlet',
      'get_pocket_sustainability',
      'get_pocket_predictions',
    ]
    for (const t of required) {
      expect(tools.includes(t), `manifest missing tool ${t}`).toBe(true)
    }
  })

  it('includes the citizen sensing tool added 2026-06-11', () => {
    // get_pocket_perception is what makes the agent-vs-citizen
    // agreement available to Claude. Shipped with the Pocket Pulse
    // layer; manifest must declare it for grant flow to include it.
    expect(manifest.tools.includes('get_pocket_perception')).toBe(true)
  })

  it('does NOT include the write tool', () => {
    // submit_benchmark_predictions is the one non-read-only tool on
    // the production server. The plugin's read-only positioning
    // carves it out via tools_excluded. Including it would break
    // the calm-AI doctrine the plugin is named for.
    expect(manifest.tools.includes('submit_benchmark_predictions')).toBe(false)
    expect(manifest.tools_excluded.submit_benchmark_predictions).toBeDefined()
  })

  it('manifest version syncs with package.json version', () => {
    // Anthropic Connectors Directory uses the manifest version as
    // the published version. A drift between package.json and
    // manifest is the kind of thing that hides for a release cycle.
    expect(manifest.version).toBe(pkg.version)
  })

  it('declares MIT license consistently across manifest + package.json', () => {
    expect(manifest.license).toBe('MIT')
    expect(pkg.license).toBe('MIT')
  })
})

// ── Behavioral: useful silence (0.4.0) ─────────────────────────────
import { isAnythingHappeningNear } from './index.js'

// Minimal mock client: returns scripted tool responses by name.
function mockClient(byTool) {
  return { callTool: async (name) => byTool[name] || { structuredContent: null } }
}

describe('isAnythingHappeningNear — useful silence', () => {
  const lookup = {
    _meta: { source: 'real-signal.ai' },
    structuredContent: { matches: [{ pocket_id: 'cluny', confidence: 1 }] },
  }

  it('surfaces the structured fallback when nothing is live (no blank answer)', async () => {
    const client = mockClient({
      lookup_pocket_by_name: lookup,
      get_available_experiences: {
        _meta: { source: 'real-signal.ai' },
        structuredContent: {
          count: 0,
          experiences: [],
          fallback: {
            live_status: 'none',
            presence_status: 'unverified',
            narrative: 'No confirmed live experience is active near Cluny / Bukit Timah right now. Real-time presence is unverified, so Real Signal will not claim current busyness. Historically, this pocket\'s strongest calm window has centred around 2pm–5pm SGT. No merchant has fired a live moment yet.',
            retrospective_rhythm: { strongest_calm_window: '2pm–5pm' },
            what_would_make_it_live: 'a merchant firing a Moment Brief',
          },
        },
      },
    })
    const r = await isAnythingHappeningNear(client, 'Cluny')
    expect(r.live_status).toBe('none')
    expect(r.presence_status).toBe('unverified')
    expect(r.text).toContain('will not claim current busyness')
    expect(r.text).toContain('2pm–5pm')
    expect(r.retrospective_rhythm.strongest_calm_window).toBe('2pm–5pm')
    // never fabricates a live/busy claim
    expect(r.text).not.toMatch(/\bbusy right now\b/i)
  })

  it('reports live experiences when a merchant has confirmed one', async () => {
    const client = mockClient({
      lookup_pocket_by_name: lookup,
      get_available_experiences: {
        _meta: { source: 'real-signal.ai' },
        structuredContent: { count: 2, experiences: [{}, {}] },
      },
    })
    const r = await isAnythingHappeningNear(client, 'Cluny')
    expect(r.text).toContain('2 merchant-confirmed live experiences')
  })
})
