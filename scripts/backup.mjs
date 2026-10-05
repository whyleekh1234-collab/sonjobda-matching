// 데이터 백업.
//
// Supabase 무료 요금제에는 자동 백업이 없다. 사람이 실수로 지우거나
// 마이그레이션이 잘못 돌면 되돌릴 방법이 없다는 뜻이다.
//
// 이 스크립트는 모든 표를 JSON으로 받아 날짜별 폴더에 쌓는다. 스키마와
// 함수·정책은 supabase/*.sql에 이미 git으로 남아 있으므로, 둘을 합치면
// 빈 프로젝트에서 다시 세울 수 있다.
//
// 못 가져오는 것이 하나 있다 — 회원 비밀번호다. Supabase가 해시만 들고
// 있고 꺼내 주지 않는다. 계정까지 되살리려면 Supabase 자체 백업(유료)이나
// 데이터베이스 직접 접속(pg_dump)이 필요하다. 그 경우에도 이 백업은
// 회원 정보·의뢰·견적을 그대로 복구하는 데 쓰인다.
//
// 받은 파일에는 이름·연락처·사업자번호가 들어 있다. 저장소에 넣지 않고
// .backup/ 아래에 둔다(.gitignore에 있다).
//
//   실행: node scripts/backup.mjs

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function readEnv() {
  const txt = fs.readFileSync(path.join(ROOT, ".env.local"), "utf8");
  const out = {};
  for (const line of txt.split(/\r?\n/)) {
    if (!line.includes("=") || line.trim().startsWith("#")) continue;
    const i = line.indexOf("=");
    out[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return out;
}

const env = readEnv();
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SECRET_KEY;
if (!URL_ || !KEY) {
  console.error("NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SECRET_KEY가 없습니다.");
  process.exit(1);
}
const H = { apikey: KEY, Authorization: "Bearer " + KEY };

// 받을 표. 새 표를 만들면 여기에 더한다.
const TABLES = [
  "companies", "profiles", "requests", "quotes", "partner_profiles",
  "inquiries", "notices", "notice_reads", "notifications",
  "company_invites", "company_change_requests", "sanctions",
];

const BUCKETS = ["company-logos", "business-licenses", "company-profiles", "quote-attachments"];

const stamp = new Date().toISOString().slice(0, 19).replaceAll(":", "").replace("T", "-");
const dir = path.join(ROOT, ".backup", stamp);
fs.mkdirSync(dir, { recursive: true });

async function dumpTable(t) {
  // 한 번에 다 가져오면 큰 표에서 잘린다. 1000행씩 끊어 받는다.
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const res = await fetch(`${URL_}/rest/v1/${t}?select=*`, {
      headers: { ...H, Range: `${from}-${from + 999}` },
    });
    if (!res.ok) return { table: t, error: `${res.status} ${(await res.text()).slice(0, 80)}` };
    const page = await res.json();
    rows.push(...page);
    if (page.length < 1000) break;
  }
  fs.writeFileSync(path.join(dir, `${t}.json`), JSON.stringify(rows, null, 2), "utf8");
  return { table: t, rows: rows.length };
}

// 파일 목록만 받는다. 파일 자체는 용량이 커질 수 있어 따로 받는다.
async function listBucket(b) {
  const out = [];
  const walk = async (prefix) => {
    const res = await fetch(`${URL_}/storage/v1/object/list/${b}`, {
      method: "POST",
      headers: { ...H, "Content-Type": "application/json" },
      body: JSON.stringify({ limit: 1000, prefix }),
    });
    if (!res.ok) return;
    for (const o of await res.json()) {
      if (o.id === null) await walk(prefix + o.name + "/");
      else out.push({ path: prefix + o.name, size: o.metadata?.size ?? 0, updated: o.updated_at });
    }
  };
  await walk("");
  return out;
}

const summary = { takenAt: new Date().toISOString(), tables: {}, files: {} };

for (const t of TABLES) {
  const r = await dumpTable(t);
  summary.tables[t] = r.error ? { error: r.error } : r.rows;
  console.log("  " + t.padEnd(24) + (r.error ? "실패 " + r.error : r.rows + "행"));
}

const files = {};
for (const b of BUCKETS) {
  const list = await listBucket(b);
  files[b] = list;
  summary.files[b] = { count: list.length, bytes: list.reduce((a, f) => a + f.size, 0) };
  console.log("  " + b.padEnd(24) + list.length + "개 파일");
}
fs.writeFileSync(path.join(dir, "_files.json"), JSON.stringify(files, null, 2), "utf8");
fs.writeFileSync(path.join(dir, "_summary.json"), JSON.stringify(summary, null, 2), "utf8");

console.log("\n저장 위치: " + dir);
console.log("주의: 이름·연락처·사업자번호가 들어 있습니다. 저장소에 올리지 마세요.");
