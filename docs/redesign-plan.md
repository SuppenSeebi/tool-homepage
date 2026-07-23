# Tools Page Redesign — Design Doc

Status: **planning, nothing built yet**. This is the actual project plan for reworking
`tool.sschw.dev` — `landing-homepage`'s `docs/roadmap.md` (item #2) just points here once work
starts, same as it does for the punch-card content system. Scoped to the redesign only — the AI
tool-authoring pipeline (roadmap item #3) is deliberately separate and deferred; see Section F for
why, and for what's already been thought through for when that starts.

---

## A. Goal

Replace today's minimal, unstyled tools directory with: a sophisticated dark-HUD design
(thematically related to `landing-homepage`, not a reskin of it), tag-based grouping, and a
registry-driven backend where adding a tool means dropping in one file — no second file to edit,
no hardcoded per-tool wiring anywhere. Every tool visibly shows its own language, an automated
summary of its runtime setup, and its actual source — transparency as a feature, not an
afterthought.

---

## B. Current state (as of 2026-07-23, before this rework)

- **Frontend**: React 19 + Vite, plain inline-style JSX, no design system. `App.jsx` hardcodes a
  `tools` array (path/name/description/component) that has to be hand-edited per tool, alongside
  React Router routes built from that same array.
- **Backend**: FastAPI, one Python module per tool under `backend/app/tools/`, each exporting an
  `APIRouter`; `main.py` hand-imports and `include_router()`s each one. CORS wide open
  (`allow_origins=["*"]`).
- **Tools**: `CharCounter` (works, calls the backend), `PdfMerger` (frontend stub only, "coming
  soon," no backend endpoint).
- **Deploy**: `docker-compose` (2 services, frontend `:22332`→80, backend `:22333`→8000),
  `deploy.sh` does `docker-compose down && git pull && docker-compose up --build -d`. Runs
  alongside Vaultwarden and Wiki.js on one shared Debian VM under Proxmox.
- **No tags/grouping, no shared registry, no visible language/setup/source info.**

**None of this is being preserved as content** — Sebastian: "no need to keep the old ones." This
doc treats the tool *set* as a clean slate; only the deploy shape (docker-compose, Proxmox) is a
real constraint.

---

## C. Decisions made

- **Infra**: `tool-homepage` moves to its own Proxmox CT, separate from the Vaultwarden/Wiki.js
  VM — isolates the one workload that will eventually run AI-generated code from everything else,
  particularly the password vault. Sebastian provisions this himself (no SSH/Proxmox access from
  this session); doesn't block any of the app-level work below, since the code doesn't know or
  care which host runs it.
- **Visual direction**: dark HUD/terminal — same palette language as `landing-homepage`'s
  `compile-trace.html` embed (dark panels, gold/blue accents, monospace), not a punch-card
  reskin. Thematically related to the main site without literally being it — a tools directory
  has different UI needs (forms, file upload, results panels) than an 80-column fixed-format
  card.
- **Backend tool registration**: auto-discovery, not manual wiring. A tool is "registered" by
  existing in the right place with the right shape — no `main.py`/`App.jsx` edit per tool. This
  is what makes tagging/grouping and the language/setup/source views (Section D) possible to
  build cleanly, and it's also the property roadmap item #3 eventually needs (an AI drops one
  file and it's live) — earned on its own merits now, not built speculatively for #3.
- **Polyglot approach: contract-first, not infrastructure-first.** See Section D.1. Python tools
  run in-process for now (fast, simple, matches what already exists); the tool *contract* is
  designed so a tool in any other language is just a different implementation of the same
  contract (a proxied HTTP call instead of a local function call), added when an actual tool
  needs it — not multiple language runtimes stood up speculatively today.
- **Tool set**: not preserving `CharCounter`/`PdfMerger` — a genuinely new initial set, see
  Section E, deliberately spanning multiple languages from day one so the polyglot contract is
  real from the start, not retrofitted later.

---

## D. Architecture

### D.1 Gateway + tool contract

Every tool, regardless of implementation language, satisfies the same HTTP contract:
- `POST /run` — JSON in, JSON out. This is the only endpoint a tool *must* have.
- Metadata (name, description, tags, language, runtime, dependencies) — see D.2.

Today, every tool is Python and runs in-process inside the one FastAPI gateway (fast, no
per-request container overhead, matches current deploy shape). The gateway's internal registry
doesn't care whether a given tool's `/run` is a local function call or a proxied HTTP call to a
separate container — that's an implementation detail per tool, not a fact the contract, the
frontend, or the tagging/grouping system needs to know. When a tool in another language actually
gets built, it becomes a real separate container behind the same gateway; nothing about the
contract, the frontend, or existing tools changes.

### D.2 Tool metadata — powers tags *and* the language/setup/code views

One registry entry per tool, auto-discovered, is the single source of truth for all of:
tag-based grouping, the language badge, the setup summary, and the source view Sebastian asked
for. Shape (exact field names TBD at implementation time):

```json
{
  "id": "json-formatter",
  "name": "JSON Formatter",
  "description": "Formats and validates JSON text.",
  "tags": ["text", "json", "dev"],
  "language": "python",
  "runtime": "Python 3.12",
  "sandbox": "none (reviewed & committed)",
  "dependencies": ["orjson==3.10.7"],
  "sourcePath": "backend/app/tools/json_formatter.py"
}
```

`sandbox` is honest about today's reality (everything ships through review + commit, same trust
model as this session's own work) rather than claiming a sandbox that doesn't exist yet — it
becomes meaningful once Section F's runtime-isolation work actually happens.

**Design constraint this creates, on purpose**: since source is shown publicly (D.3), tool code
must never contain secrets or hardcoded credentials — anything a tool needs gets injected
externally, never written into the file. This isn't just a nice transparency feature, it's a
forcing function for the same "no secrets in tool code" principle Section F needs anyway for
AI-authored tools later.

### D.3 Frontend: language badge, setup view, code view

Requested directly: "always see the underlying language used for a tool, a small/brief automated
description view you can switch to of its setup (e.g. sandbox + python + dependency XYZ) and a
view you can switch to that shows the actual code of the tool." Per tool, on the dark-HUD card:
- A persistent language badge (always visible, not hidden behind a toggle).
- A switchable **setup view** — auto-rendered from the registry entry (`runtime`, `sandbox`,
  `dependencies`), not hand-written per tool, so it can never drift from reality the way a
  hand-maintained description could.
- A switchable **source view** — the tool's actual file content, read directly from
  `sourcePath`, syntax-highlighted. Read-only, no edit-in-browser.

All three read from the exact same registry entry as tag grouping — one source of truth, same
principle as everything else built this session.

---

## E. Initial tool set (proposed — Sebastian to confirm/adjust before implementation)

Picked to span languages meaningfully (proving the polyglot contract for real, not just in
theory) and to be genuinely useful utilities, not toy demos:

| Tool | Language | Tags | Why this language |
|---|---|---|---|
| JSON Formatter/Validator | Python | `text`, `json`, `dev` | Python's `json` stdlib, quick to write correctly |
| JWT Decoder | Node/TypeScript | `web`, `dev`, `security` | Node's JWT ecosystem is the natural fit for a web-dev-facing tool |
| QR Code Generator | Go | `image`, `generator` | Compiles to a small static binary — good fit once sandboxing/fast cold-start matters (Section F) |
| Hash Calculator (text/file → MD5/SHA1/SHA256/etc) | Rust | `crypto`, `text` | Same small-static-binary property as Go, plus Rust's safety story fits a crypto-adjacent tool |

---

## F. Security notes for #3 (AI tool-authoring pipeline) — forward-looking, nothing decided yet

Captured now so this thinking isn't lost, not because any of it is being built as part of the
redesign. Revisit when #3 actually starts.

**Governing principle**: a system prompt telling the AI "only generate safe, sandboxable tools"
is not a security boundary — it shapes generation probabilistically but doesn't stop an honest
mistake (SSRF, path traversal, a hung regex) or deliberate prompt injection. The sandbox has to
enforce the boundary regardless of what any prompt says.

- **Sandbox tech** (needs "starts fast" per Sebastian): plain hardened Docker (fastest, weakest
  isolation — still shares host kernel) vs. **gVisor** (near-native container speed,
  meaningfully stronger isolation, works with any language — current lean) vs. Firecracker
  microVMs (true VM isolation, ~125ms boot, heavier to operate) vs. WASM (fastest of all,
  capability-based, but constrains language choice — tension with the polyglot goal).
- **Build-time vs. run-time separation**: dependency installation (a real supply-chain attack
  surface on its own — typosquatting, compromised packages) happens in a sandboxed build step
  that may need network access; the resulting *runtime* sandbox gets **no network access by
  default**. Egress is an explicit, allowlisted exception per tool, not the default.
- **Resource limits** (CPU/memory/execution-time/process-count via cgroups/ulimits) — as much
  about reliability (catching a hung tool) as about malice.
- **Secrets never enter the sandbox by default** — no blanket environment inheritance; anything a
  tool needs is explicitly injected per-tool. Reinforced by D.2's "no secrets in source" design
  constraint, since source is publicly visible.
- **Network segmentation at the CT/firewall level too**, independent of the sandbox's own netns
  config — the tools CT shouldn't be able to reach the Vaultwarden/Wiki.js VM or Proxmox's
  management interface at all, enforced by the host firewall as defense-in-depth.
- **Automated static analysis as a gate** before execution — a linter/scanner (or an independent
  second AI review pass) flagging `eval`/`exec`/`shell=True`/`pickle.loads` and similar, not
  relying purely on a human skim of the diff.
- **Auth on the authoring pathway itself — not decided yet, Sebastian revisiting later.**
  Constraint stated clearly: no new explicit credentials to manage for this specifically. Leading
  option discussed: a private overlay network (Tailscale, or self-hosted WireGuard/Headscale) —
  the authoring endpoint bound to the tailnet only, genuinely unreachable from the public
  internet (no exposed listener to attack at all, vs. "hidden behind a login page" which is still
  reachable). Device identity via Tailscale's own SSO at enrollment, not a password Sebastian
  issues/rotates; "select few" access = adding their device to the tailnet via ACLs. Works from
  anywhere, unlike plain LAN-IP allowlisting. The public tools page and existing tools stay fully
  public either way — only the authoring endpoint would sit behind this.
- **Logging/audit trail** — what ran, with what input, what it cost; separately, what prompt
  produced what diff and who approved it.
- **Kill switch** — disable one tool's route individually and fast, without touching the rest of
  the site; easy rollback to a previous version.
- **Rate limiting / request-size limits at the gateway**, independent of code-safety — a safe
  tool can still be a DoS vector if hammered or fed huge input.

---

## G. Phased implementation plan

| # | Step | State |
|---|---|---|
| 0 | Write this doc | **Done** (2026-07-23) |
| 1 | Backend: gateway + auto-discovery registry (Python tools in-process, contract designed for future non-Python tools per D.1) | **Done** (2026-07-23) — `backend/app/registry.py` scans `app/tools/*.py` for `ROUTER`+`META`, mounts each at `/app/tools/{id}`, exposes `GET /app/tools` and `GET /app/tools/{id}/source`. Old `CharCounter.py` removed (Sebastian: no need to keep the old ones). Verified via `TestClient` (real HTTP requests, not just import checks) against a proper `win-amd64` venv — the first local venv attempt used an MSYS2/MinGW Python with no compatible wheels for `pydantic-core` and had to be redone against a standard python.org install. Also added a root `.gitignore` (didn't exist before — caught by `__pycache__` showing up untracked). |
| 1.5 | First tool proving the pattern: JSON Formatter (Python, in-process) | **Done** (2026-07-23) — `backend/app/tools/json_formatter.py`. Confirmed via `TestClient`: valid JSON formats correctly (key order preserved), invalid JSON returns a real 400 with a useful message. |
| 2 | Remaining initial tool set — JWT Decoder (Node), QR Code Generator (Go), Hash Calculator (Rust), per Section E | Not started — these are the first real test of the polyglot contract (separate containers behind the gateway, per D.1), not just Python in-process |
| 3a | Frontend: registry-driven functional scaffold — tag/language display, generic Run (JSON in/out, works for any tool via the shared contract) / Setup (auto-rendered from registry metadata) / Source (raw file content) tabs | **Done** (2026-07-23) — `App.jsx`, `ToolDetail.jsx`, `apiBase.js` (single configurable backend URL, replacing the literal that used to live inside `CharCounter.jsx`). Deliberately plain CSS — verified via `npm run build` + `npm run lint`, both clean. Old `CharCounter.jsx`/`PdfMerger.jsx` removed. |
| 3b | Frontend: actual dark-HUD visual design pass on top of 3a's working scaffold | Not started |
| 4 | Wire embed link from `landing-homepage`'s `CURRENT SYSTEM` header cell to the redesigned site | Not started |
| 5 | Deploy to new CT | **Done** (2026-07-23) — separate Proxmox CT (2 cores, 4GB RAM, 2GB swap, 20GB disk), unprivileged, `nesting`/`keyctl` features + `lxc.apparmor.profile: unconfined` (needed for Docker-in-LXC's `runc` sysctl write — a known issue on unprivileged CTs, not specific to this app). DHCP + FritzBox reservation for a stable IP. `deploy.sh` fixed (`docker-compose` → `docker compose`, the standalone binary isn't installed by Debian's official Docker steps anymore) and `docker-compose.yml`'s obsolete `version` key removed, both caught live during this deploy. Confirmed reachable through the real domain via Nginx Proxy Manager routing pointed at the new CT — old deployment on the shared Debian VM not yet removed (next step, now that the new one's confirmed live). |
| — | Roadmap item #3 (AI tool-authoring pipeline) | Deliberately deferred — Section F is the starting point when it begins |
