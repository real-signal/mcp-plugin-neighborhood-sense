# Founder Handoff — extracting Neighborhood Sense to a standalone repo and submitting it to the Anthropic Connectors Directory

*Composed 2026-06-08. Manifest is at v0.2.0 (this commit). Production MCP
server is at 21 tools; this plugin exposes 20 read-only ones (writes carved
out — see § Decisions).*

The plugin scaffold inside the monorepo is the source-of-truth definition.
To submit it to the directory it has to live at its own public GitHub repo
(per `https://claude.com/docs/connectors/building/review-criteria.md`:
"Plugins require public GitHub repos (closed-source rejected)"). The steps
below are the actions only you can take — npm scope creation, repo
creation, directory submission. Everything inside the scaffold is already
caught up.

---

## 1. Decisions baked into this commit

**Carve-out: `submit_benchmark_predictions`.** Production MCP server has
21 tools; this plugin manifest lists 20. The 21st — the benchmark
submission tool — is a write operation. The plugin's positioning is
read-only calm-AI substrate, and `https://claude.com/docs/connectors/building/review-criteria.md`
calls out: "A single tool that accepts both safe HTTP methods (GET, HEAD,
OPTIONS) and unsafe methods (POST, PUT, PATCH, DELETE) is rejected." The
plugin doesn't mix them — it just doesn't expose the write tool.
Documented in the manifest's `tools_excluded` block.

If you disagree and want the benchmark submission tool in the plugin,
remove the carve-out from `.well-known/mcp-plugin.json` and replace this
section of the handoff. The downstream impact: the plugin no longer fits
the "read-only ambient query" framing and will need a different listing
description for the directory.

**Listing positioning: read-only data source.** Per
`https://claude.com/docs/connectors/building/what-to-build.md`, read-only
connectors are a first-class category. The listing description should
lead with the four worked composition patterns from `src/index.js`, not
the full 20-tool inventory.

---

## 2. Server-side `title` field — DONE (same commit as the manifest bump)

Per `https://claude.com/docs/connectors/building/review-criteria.md`:
"Every tool needs a `title` field plus either `readOnlyHint: true` or
`destructiveHint: true` to control permission prompts in Claude."

Pre-fix audit (`POST /api/mcp tools/list`, 2026-06-08): all 21 tools had
correct `annotations.readOnlyHint` but **none had a `title` field**.

Fix shipped: added a short human-readable `title` to every entry in the
`TOOLS` registry in `api/_lib/mcp-tools.js`, extended the I1 invariant to
require `title` and enforce the ≤100-char directory cap at module load
(fail-fast in CI), and updated `listTools()` to include `title` in the
MCP wire output. The `mcp-tools.test.js` `listTools` assertion now
verifies every tool has a non-empty title under the cap. All 78 tests
still pass.

After your next deploy lands, verify with:

```bash
curl -sS -X POST https://real-signal.ai/api/mcp \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' \
  | jq '.result.tools[] | {name, title}'
```

Every row should have a non-null title.

---

## 3. Extraction — get the scaffold to its own public GitHub repo

The plugin lives at `external/mcp-plugin-neighborhood-sense/` inside the
monorepo. To extract it cleanly while preserving git history:

```bash
# From the cluny-market repo root.
git subtree split --prefix=external/mcp-plugin-neighborhood-sense \
  -b mcp-plugin-extract

# Create the empty public repo first at:
#   https://github.com/new
# Owner: real-signal
# Name: mcp-plugin-neighborhood-sense
# Visibility: Public
# Don't initialise with anything — README/LICENSE come from the subtree.

# Then push the extracted branch:
git push git@github.com:real-signal/mcp-plugin-neighborhood-sense.git \
  mcp-plugin-extract:main

# Clean up the local extraction branch.
git branch -D mcp-plugin-extract
```

Alternative if subtree feels heavy or if history matters less than speed:

```bash
# Copy current state without history.
cp -r external/mcp-plugin-neighborhood-sense /tmp/np-sense
cd /tmp/np-sense
git init -b main
git add -A
git commit -m "initial commit — extracted from cluny-market@$(cd - >/dev/null && git rev-parse --short HEAD)"
git remote add origin git@github.com:real-signal/mcp-plugin-neighborhood-sense.git
git push -u origin main
```

After extraction the monorepo copy at `external/mcp-plugin-neighborhood-sense/`
becomes a soft mirror — keep it for ergonomic editing inside the main
codebase, periodically sync to the public repo, OR delete it and point
the canonical at the public repo. Recommended: keep the monorepo copy as
the dev surface for at least the first few iterations, then decide.

---

## 4. npm scope — publish `@real-signal/mcp-plugin-neighborhood-sense`

Per `package.json`, the package name is `@real-signal/mcp-plugin-neighborhood-sense`,
which requires the `@real-signal` scope to exist on npm.

```bash
# Create the npm organisation (free for public packages).
# Web: https://www.npmjs.com/org/create
# Name: real-signal
# Tier: Free (public packages only — paid only if you go private)

# Verify login locally.
npm whoami
# If not logged in: npm login

# Publish (from inside the extracted repo).
cd /path/to/mcp-plugin-neighborhood-sense
npm publish --access public
```

Drift note that's worth fixing before publish: `package.json` lists
`vitest` in `scripts.test` but not in `devDependencies` — `npm test` will
fail for cloners. Either add `vitest` to `devDependencies` or change
`scripts.test` to a no-op like `echo "no tests yet"`.

---

## 5. Directory submission — Connectors Directory (the canonical path)

There are two directories you could submit to. Per the docs:

**Plugins Directory** (`https://claude.com/docs/plugins/submit.md`):
- "the Claude plugin directory, which surfaces in Claude Code as the
  `claude-plugins-official` marketplace."
- Submission URLs:
  - Claude.ai (requires Team/Enterprise org): `https://claude.ai/settings/plugins/submit`
  - Console (individual authors): `https://platform.claude.com/plugins/submit`
- Reach: Claude Code users.

**Connectors Directory** (`https://claude.com/docs/connectors/building/submission.md`):
- Surfaces in the consumer Claude.ai chat experience under the connector
  picker.
- Submission URLs:
  - Claude.ai admin (requires Team/Enterprise org): `https://claude.ai/admin-settings/directory/submissions/new`
  - Fallback (no Team org required): `https://clau.de/mcp-directory-submission`
- Reach: Claude.ai users.

**Recommendation: submit to the Connectors Directory first** via the
fallback URL — it doesn't require a Team org (so the Pte Ltd timing is
not a blocker) and the audience is the larger one (Claude.ai users vs
Claude Code users). Submit to the Plugins Directory afterwards.

### Required fields for the Connectors Directory submission

From `https://claude.com/docs/connectors/building/submission.md`:

| Field | Constraint | Value to use |
|---|---|---|
| Server URL | HTTPS only | `https://real-signal.ai/api/mcp` |
| Transport | HTTP/SSE | HTTP |
| Name | ≤100 chars | `Neighborhood Sense` |
| Tagline | ≤55 chars | `Calm AI substrate for Singapore neighbourhoods.` |
| Description | ≤2000 chars | First 2 paragraphs of `README.md` "What it does" |
| Categories | — | Local information / Singapore / Data sources |
| Documentation URL | — | `https://github.com/real-signal/mcp-plugin-neighborhood-sense` |
| Privacy policy URL | HTTPS | `https://real-signal.ai/privacy` |
| Support contact | — | `hello@real-signal.ai` |
| Icon | — | needs creating — see § Screenshots & icon |
| URL slug | — | `neighborhood-sense` |
| Authentication | OAuth / custom / none | **none** (anon-readable) |
| API ownership | — | Real Signal Research (you) |
| Health / sponsored flags | — | both false |
| Test access | — | "No auth required. POST `{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/list\"}` to the server URL above." |
| Compliance acknowledgments | 7 of them | accept each |

The submission portal pre-fills contact name and email from your account,
so the address that lands in the listing is whichever Claude.ai login you
use. Use `hello@real-signal.ai` if it's the account you submit from.

### Screenshots & icon

Per the spec: 3–5 PNG images, 1000px+ wide, "app response only, paired
prompts provided separately." The cleanest set:

1. Claude composing an answer to "where can I work this afternoon in
   Singapore?" — showing the MQS-driven recommendation.
2. Claude composing an answer to "what's happening near Holland Village?"
   — showing the silence justification.
3. Claude composing an answer to "how accurate are Real Signal's
   predictions?" — showing the predictions ledger summary.
4. (optional) The `_meta` attribution envelope rendered visibly at the
   end of one of the answers.

Icon: 512×512 PNG. Suggested aesthetic: lowercase serif "rs" mark on the
cream/gold palette consistent with `/present` and `/observed/*`. Doctrine
applies — no gradient backgrounds, no marketing energy.

---

## 6. Order of operations

1. Extract the scaffold to `github.com/real-signal/mcp-plugin-neighborhood-sense`
   via subtree split (§ 3).
2. Create the `@real-signal` npm scope and publish v0.2.0 (§ 4). The npm
   listing is not strictly required for directory acceptance but it's
   useful for the developer-hub story and for fork-and-modify users.
3. Generate the icon + 3 screenshots (§ 5 screenshots).
4. Submit to the Connectors Directory via `https://clau.de/mcp-directory-submission`
   (§ 5 fallback URL). Track status at
   `https://claude.ai/admin-settings/directory/submissions` if you have
   admin access, otherwise wait on email confirmation.
5. (Optional, later) Submit to the Plugins Directory via Console at
   `https://platform.claude.com/plugins/submit`.

The whole flow is roughly 90 minutes of founder time, assuming the icon
and screenshots take the longest. Everything else is mechanical.

---

## 7. What's already done in this commit (so you don't redo it)

- Manifest bumped 0.1.0 → 0.2.0 (`.well-known/mcp-plugin.json`).
- All 20 read-only production tools listed in the manifest (was 10).
- `submit_benchmark_predictions` carve-out documented in
  `tools_excluded` with reason.
- `privacy_policies` array added per manifest v0.2+ spec.
- `read-only` tag added.
- Description rewritten to name the 11 new tools.
- CHANGELOG updated with 0.2.0 entry naming every added tool.

What's NOT done in this commit (your call):

- README.md update — the "Planned (manifest-listed, behaviour stubbed)"
  section is now stale; all 20 tools are live. Holding off in case you
  want to keep that section as a teaching device or rewrite it your way.
- `package.json` devDeps fix for vitest (drift caught while auditing).
- Generating the icon + screenshots.
- The actual extraction + push to the public repo.
- The directory submission itself.

Cite this handoff (or update it) when those steps land.
