# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Claude Code Configuration — ICRS SPARC Development Environment (Flow‑Free)

> **Purpose**: This is the single source of truth for how work is executed in this repo using **Claude Code**.  
> **Scope**: MCP servers are optional connectors only. **Claude Code's Task tool executes all work.**

## 🏭 Application Overview

**ICRS SPARC** is a Foreign Trade Zone Operations Management System built with:
- **Backend**: Node.js/Express API with Supabase integration
- **Frontend**: React 18 with Tailwind CSS and React Query
- **Database**: PostgreSQL via Supabase with Row Level Security (RLS)
- **Domain**: Foreign Trade Zone inventory management, customs compliance, warehouse operations

---

## 🚨 Critical: Concurrency & File Management

**Golden Rule — “1 message = all related operations.”**  
In one message, you must batch:
- **Task spawns** (all agents for the scope)
- **TodoWrite** (all todos together)
- **File ops** (read/write/edit)
- **Bash ops** (all shell commands)
- **Memory ops** (store/retrieve)

**Pragmatic exception — Chunked parallelism**  
If one blast would exceed token/tool limits, split into numbered chunks (e.g., **Chunk 1/3**). Each chunk must still batch *all* related operations within its scope.

**Never write to repo root.** Use only the approved directories below.

---

## 📁 Repository Layout (Approved Write Targets)

- `/src` — application code  
  - `/src/backend` — server code & services  
  - `/src/frontend` — client UI code  
  - `/src/db/migrations` — database migrations
- `/tests` — automated tests (backend, frontend, e2e)
- `/docs` — general docs (e.g., deployment, test strategy, security reports)
- `/project-documentation` — product & architecture docs (PM/Architect outputs)
- `/design-documentation` — UX design system, tokens, specs (UX outputs)
- `/config` — configuration files
- `/scripts` — utility scripts & CI helpers
- `/examples` — examples & sample code

**Blocked**: any write at repo root.

---

## 📝 Documentation Policy

**Default**: Do **not** proactively create Markdown/README files unless requested.

**Allowed without explicit request** only when these documentation‑focused agents are invoked:
- `product-manager-spec` → product specifications
- `system-architect` → architecture blueprints & API contracts
- `ux-ui-designer` → design system & UX specs
- `devops-deployment-engineer` → deployment/ops documentation

**Doc locations**
- PM/Architect → `/project-documentation/*.md`
- UX → `/design-documentation/**`
- DevOps → `/docs/deployment.md` (and CI/IaC notes under `/scripts` + `/config`)
- Security reports → `/docs/security/*.md`
- QA test plan → `/docs/test-strategy.md`

---

## 🔄 Execution Model

- **Claude Code’s Task tool is the execution layer.** All agents run via `Task()` in one message.  
- **MCP servers are optional connectors** (search, security scan, UI testing, memory). Use them when helpful, but they do not replace the Task tool.  
- **No Flow hooks** are assumed or required.

### Orchestration Template (single message)
```text
// (Optional) MCP warmups / status checks
Bash "mkdir -p src/{backend,frontend} src/db/migrations tests/{backend,frontend,e2e} docs/security project-documentation design-documentation config scripts"

// Parallel execution — all agents in one message
Task("PM Spec", "Create product spec → project-documentation/product-manager-output.md; flag assumptions.", "product-manager-spec")
Task("Architecture", "Create architecture-output.md (API contracts, schema) based on PM spec.", "system-architect")
Task("Frontend", "Implement UI → src/frontend; tests → tests/frontend.", "senior-frontend-engineer")
Task("Backend", "Implement services/endpoints → src/backend; migrations → src/db/migrations; tests → tests/backend.", "senior-backend-engineer")
Task("QA", "Write test plan → docs/test-strategy.md; suites under tests/{backend,frontend,e2e}.", "qa-test-automation-engineer")
Task("Security", "Quick scan on new code; report → docs/security/scan-<feature>.md.", "security-analyst")
Task("DevOps", "Local dev compose + env templates; docs → docs/deployment.md.", "devops-deployment-engineer")
Task("UX", "Design system + UX specs → design-documentation/ (include tokens/).", "ux-ui-designer")

// Batch todos at the end (one call)
TodoWrite { todos: [ ... ] }
```

---

## 🧭 SPARC Crosswalk (5 phases → agents)

1) **Specification & Pseudocode** → `product-manager-spec`, `ux-ui-designer`  
2) **Architecture** → `system-architect`  
3) **Refinement (TDD)** → `senior-frontend-engineer`, `senior-backend-engineer`, `qa-test-automation-engineer`  
4) **Completion/Integration** → `qa-test-automation-engineer`, `security-analyst`  
5) **Deployment** → `devops-deployment-engineer`

---

## 👥 Agent Registry & Output Contracts

> Use these canonical names in Task spawns. Aliases can be registered in your first coordination message if needed.

| Agent | Primary Outputs | Required Paths | Notes |
|---|---|---|---|
| `product-manager-spec` | Product spec | `/project-documentation/product-manager-output.md` | Flag assumptions explicitly. |
| `system-architect` | Architecture blueprint; API/database contracts | `/project-documentation/architecture-output.md` | Contracts must unblock FE/BE without back-and-forth. |
| `senior-frontend-engineer` | UI components, integration, tests | Code → `/src/frontend`; Tests → `/tests/frontend` | Consume design tokens from `/design-documentation/tokens/`. |
| `senior-backend-engineer` | Services/endpoints, migrations, tests | Code → `/src/backend`; Migrations → `/src/db/migrations`; Tests → `/tests/backend` | Generate rollback migrations with comments. |
| `qa-test-automation-engineer` | Test plan & suites | Plan → `/docs/test-strategy.md`; Suites → `/tests/{backend,frontend,e2e}` | Include perf targets where applicable. |
| `security-analyst` | Quick scan / Audit report | `/docs/security/{scan-<feature>|audit-<date>}.md` | Use available MCP scanners (e.g., Semgrep) when present. |
| `devops-deployment-engineer` | Local dev env, CI/CD notes | Docs → `/docs/deployment.md`; Scripts → `/scripts`; Config → `/config` | Prefer docs over README at repo root. |
| `ux-ui-designer` | Design system, UX specs, tokens | `/design-documentation/**` | Export tokens JSON under `/design-documentation/tokens/`. |

---

## 🔌 MCP Servers (optional connectors)

Register with: `claude mcp add <name> <command>`  
Examples you may see in this project: **exa**, **playwright**, **semgrep**, **pieces**, **ref**.

**Usage pattern**: MCP for coordination/inspection; Task tool to do the work.  
Examples:  
- Search docs/specs with **exa**/**ref** to reduce tokens.  
- Run **semgrep** for SAST during Security tasks.  
- Use **playwright** for E2E/UI checks during QA tasks.  
- Ask **pieces** for prior context/snippets before PM/Architect tasks.

**Coordination
mcp__ref__agent_spawn { type: "doc-analyzer" }
mcp__semgrep__agent_spawn { type: "security-scan" }
mcp__pieces__agent_spawn { type: "memory-coordinator" }
mcp__exasearch__agent_spawn { type: "searcher" }
mcp__playwright__agent_spawn { type: "ui-tester" }

**Execution
Task("Security Scan", "Run Semgrep across src/ with OWASP rules", "semgrep")
Task("Doc Reduction", "Summarize architecture.md for token minimization", "ref")
Task("UI Tests", "Run Playwright test suite on staging app", "playwright")

---

## 📊 Status Management (dynamic, not in this file)

- Current status lives in `/docs/STATUS.md`.  
- On each sprint kickoff, run a repo analyzer (any agent) to refresh `/docs/STATUS.md` with timestamp.  
- Agents must check timestamp before relying on content.

---

## 🛡️ Safety Rails

- No secrets in code or docs. Use environment variables and secret stores.  
- Any destructive Bash or data ops must be justified, previewed, and batched.  
- If size limits are hit, use **chunked parallelism** with clear boundaries and ids.

---

## ✅ Ready‑to‑Run Checklist (per sprint)

1. MCP (optional): confirm servers you need are registered.  
2. Create directories (if missing): `src/{backend,frontend}`, `src/db/migrations`, `tests/{backend,frontend,e2e}`, `docs/security`, `project-documentation`, `design-documentation`, `config`, `scripts`.  
3. Single message: spawn all 8 agents with explicit output paths (see template).  
4. Verify no root writes.  
5. Land docs only in approved roots.  
6. Batch **TodoWrite** once.  
7. Update `/docs/STATUS.md` (separate step) after integration tests pass.
