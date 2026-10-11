# รายงาน: .ai Integrity & GitHub Source-of-Truth Hardening

วันที่: 2026-10-11
ประเภท: documentation integrity audit (เอกสารล้วน — ไม่มีการแก้ application code)

## หลักฐาน Git (STEP 1 — ตรวจด้วยคำสั่งจริง)

| รายการ | ค่า | คำสั่งที่ใช้ |
|---|---|---|
| Remote | `https://github.com/MnsEn2001/DropWay-V1.git` | `git remote -v` |
| Default branch | `main` | `git ls-remote --symref origin HEAD` |
| GitHub `origin/main` (full SHA) | `6f36c1b1c72f8abf9e290ae1dabcce02122b1b97` | `git ls-remote origin refs/heads/main` |
| Local HEAD (full SHA) | `6f36c1b1c72f8abf9e290ae1dabcce02122b1b97` | `git rev-parse HEAD` |
| Divergence | 0 ahead / 0 behind | `git rev-list --left-right --count HEAD...origin/main` |
| Working tree ระหว่าง audit | `.ai/*.md` ถูกแก้ (งานนี้) + `bun.lock` untracked | `git status` |

## ผลการตรวจ (STEP 8)

| สิ่งที่ตรวจ | ผล |
|---|---|
| ทุก path ที่เอกสารอ้างถึง | ผ่าน — รายการที่ขึ้น CHECK เป็นตัวอย่าง/template (`ADR-XXX-<slug>.md`, `TASK-XXX-<slug>.md`, `path/to/file.tsx`), historical (`components/layout/Navbar.tsx` ที่ถูกลบโดยเจตนาใน Phase 1), negative statement (`src/app/api/` ที่ระบุว่า "ไม่มี API routes"), หรือ conditional (`tasks/archive/` ที่ยังไม่ถูกสร้าง) — ไม่มีลิงก์เสียจริง |
| SHA ที่อ้างว่าเป็น "latest" | ตรงกับ GitHub ที่ตรวจได้ (`6f36c1b1…`) — เดิมเอกสารค้างที่ `ede06af` (short, ไม่มีวันที่) |
| GitHub SHA ปนกับ local SHA | แยกชัดใน `CURRENT_STATE.md` / `AI_HANDOFF.md` แล้ว |
| Secrets/token/password | ไม่พบ (grep: `eyJ…`, `sk-…`, `service_role`, `PRIVATE KEY`) |
| `.ai/` ถูก ignore? | ไม่ถูก ignore (`git check-ignore .ai` → ไม่ match) |
| Application code เปลี่ยน | **ไม่มี** — `git diff --stat` = `.ai/` docs เท่านั้น (8 ไฟล์, +182/−112; ยังมีไฟล์ใหม่ untracked 1 ไฟล์ = รายงานนี้) |
| Uncommitted user work | ไม่มีอะไรถูกลบ — `bun.lock` untracked อยู่ตามเดิม |
| README links | ไฟล์ที่ README อ้าง (`.ai/AI_HANDOFF.md`, `.ai/AI_RULES.md`, `.ai/CURRENT_STATE.md`) มีจริง |
| คำสั่ง lint/build | ตรงกับ `scripts` ใน `package.json` (dev/build/start/lint) |

## Static checks (รันจริงหลังแก้เอกสาร)

- `bun run lint` → **PASS** (exit 0)
- `bun run build` → **PASS** (exit 0) — ทุก route เป็น dynamic (`ƒ`)

Runtime/preview: **NOT VERIFIED / BLOCKED** — workspace ไม่มี Supabase env keys (ดู `.ai/CURRENT_STATE.md`)

## Inconsistencies ที่พบและแก้

1. `CURRENT_STATE.md` / `AI_HANDOFF.md` สรุป commit เป็น `ede06af` (short, ไม่มีวันที่, ไม่แยก GitHub/local) — ของจริงคือ `6f36c1b1…`
2. `reports/2026-10-11-phase-1-verification.md` ยังเขียน "ยังไม่ commit" ทั้งที่ push แล้ว → แก้เป็น `ab627da5…`
3. `PROJECT_CONTEXT.md` อ้างว่ามี `bun.lock` ในเรโป → แก้เป็น "repo ไม่ track lockfile"
4. `ARCHITECTURE.md` ขาด `QuickAction` ในรายการ ui components → เพิ่ม
5. `ARCHITECTURE.md` ถ้อยคำ `.gitignore` สับสน ("ยัง ignore .ai/ ไม่ได้") → แก้ให้ชัดว่าไม่ ignore โดยเจตนา
6. `AI_RULES.md` ไม่มีกฎ GitHub source-of-truth + ไม่มีตารางหน้าที่เอกสาร → เพิ่ม
7. `WORKFLOW.md` ไม่มีขั้นตรวจ GitHub/divergence ใน PHASE 2 → เพิ่ม (และ PHASE 7 บังคับ full SHA + วันที่)

## ข้อจำกัด

- Runtime/preview ยัง BLOCKED (Supabase env keys ยังไม่มีใน workspace) — รอบนี้เป็นงานเอกสารล้วน ไม่ได้ทดสอบแอป
- Divergence ถูกตรวจ ณ เวลาเดียว (2026-10-11) — AI ตัวถัดไปต้องตรวจซ้ำก่อนเริ่มงาน
