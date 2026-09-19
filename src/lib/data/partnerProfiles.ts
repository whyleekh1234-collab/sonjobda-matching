import { createClient } from "@/lib/supabase/client";

// 파트너사 프로필(회사 역량). 회사 단위 하나.
//
// 항목 정의를 여기 한 곳에 둔다 — 편집 화면, 열람 카드, 나중에 AI 추천
// 프롬프트가 전부 같은 정의를 쓴다. 분야별로 물어볼 게 달라서 공통 항목과
// 분야별 항목(extra)을 나눈다.

export interface PartnerProfile {
  companyId: string;
  intro: string;
  therapeuticAreas: string[];
  phases: string[];
  regions: string[];
  employees: number | null;
  annualProjects: number | null;
  certifications: string[];
  trackRecord: string;
  extra: Record<string, string | string[]>;
  updatedAt?: string;
  verifiedAt?: string | null;
}

export const EMPTY_PROFILE: Omit<PartnerProfile, "companyId"> = {
  intro: "",
  therapeuticAreas: [],
  phases: [],
  regions: [],
  employees: null,
  annualProjects: null,
  certifications: [],
  trackRecord: "",
  extra: {},
};

// ── 선택지 ──────────────────────────────────────────────────

export const THERAPEUTIC_AREAS = [
  "종양", "심혈관", "대사/내분비", "중추신경계", "감염", "호흡기", "소화기",
  "근골격/류마티스", "피부", "안과", "비뇨/신장", "혈액", "희귀질환", "백신",
  "정신건강", "소아", "기타",
];

export const PHASES = ["Phase I", "Phase II", "Phase III", "Phase IV", "IIT", "PMS", "BE", "RWE", "의료기기 탐색/확증"];

export const REGIONS = ["국내", "일본", "중국", "아시아(기타)", "미국", "유럽", "글로벌"];

export const CERTIFICATIONS = ["KGCP", "ICH-GCP", "GMP", "KGMP", "ISO 9001", "ISO 13485", "ISO 27001", "CAP/CLIA", "기타"];

// 분야별 추가 항목. key는 extra에 저장되는 이름.
export type ExtraField = {
  key: string;
  label: string;
  type: "text" | "number" | "multi";
  options?: string[];
  placeholder?: string;
};

export const EXTRA_FIELDS: Record<string, ExtraField[]> = {
  "CRO": [
    { key: "cra_count", label: "보유 CRA 수", type: "number" },
    { key: "site_network", label: "협력 기관(병원) 수", type: "number" },
    { key: "services", label: "제공 서비스", type: "multi",
      options: ["프로토콜 개발", "IRB/규제 제출", "모니터링", "데이터 관리(DM)", "통계", "메디컬 라이팅", "약물감시(PV)", "임상 물류"] },
    { key: "edc", label: "사용 EDC", type: "text", placeholder: "예: Medidata Rave, Oracle, 자체 개발" },
  ],
  "CMO/CDMO": [
    { key: "dosage_forms", label: "생산 가능 제형", type: "multi",
      options: ["경구 고형", "주사제", "바이오의약품", "세포/유전자치료제", "외용제", "흡입제", "원료의약품(API)"] },
    { key: "capacity", label: "생산 규모", type: "text", placeholder: "예: 연 5억 정, 2,000L 바이오리액터" },
    { key: "gmp_scope", label: "GMP 인증 범위", type: "text", placeholder: "예: MFDS, FDA, EU-GMP" },
  ],
  "SMO": [
    { key: "crc_count", label: "보유 CRC 수", type: "number" },
    { key: "site_count", label: "관리 실시기관 수", type: "number" },
    { key: "site_regions", label: "실시기관 지역", type: "multi", options: ["수도권", "충청", "영남", "호남", "강원/제주"] },
  ],
  "RA/인허가": [
    { key: "products", label: "인허가 경험 품목", type: "multi",
      options: ["합성의약품", "바이오의약품", "제네릭", "의료기기 1·2등급", "의료기기 3·4등급", "체외진단", "화장품", "건강기능식품"] },
    { key: "agencies", label: "대응 규제기관", type: "multi", options: ["MFDS", "FDA", "EMA", "PMDA", "NMPA", "기타"] },
    { key: "approvals", label: "최근 3년 승인 건수", type: "number" },
  ],
  "소모품 공급": [
    { key: "items", label: "공급 품목", type: "multi",
      options: ["인쇄물(ICF/CRF)", "라벨/포장", "연구용 키트", "검체 용기", "의료 소모품", "냉장/냉동 물류"] },
    { key: "lead_time", label: "평균 납기", type: "text", placeholder: "예: 발주 후 5영업일" },
  ],
  "마케팅 대행": [
    { key: "mkt_types", label: "수행 가능 유형", type: "multi",
      options: ["심포지엄/세미나", "웨비나", "학회 부스", "CSO(영업대행)", "환자유치 프로그램", "데이터 구독", "디지털 마케팅"] },
    { key: "annual_events", label: "연간 행사 수행 건수", type: "number" },
  ],
  "임상시험 보험": [],
};

// 프로필이 얼마나 채워졌는지. 파트너에게 동기를 주고, 나중에 추천 순위에도 쓴다.
export function profileCompleteness(p: Omit<PartnerProfile, "companyId">, categories: string[]): number {
  const checks: boolean[] = [
    p.intro.trim().length > 0,
    p.therapeuticAreas.length > 0,
    p.phases.length > 0,
    p.regions.length > 0,
    p.employees !== null,
    p.annualProjects !== null,
    p.certifications.length > 0,
    p.trackRecord.trim().length > 0,
  ];
  for (const cat of categories) {
    for (const f of EXTRA_FIELDS[cat] ?? []) {
      const v = p.extra[f.key];
      checks.push(Array.isArray(v) ? v.length > 0 : String(v ?? "").trim().length > 0);
    }
  }
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

// ── 조회/저장 ────────────────────────────────────────────────

type Row = {
  company_id: string; intro: string | null; therapeutic_areas: string[]; phases: string[];
  regions: string[]; employees: number | null; annual_projects: number | null;
  certifications: string[]; track_record: string | null; extra: Record<string, string | string[]> | null;
  updated_at: string; verified_at: string | null;
};

function toProfile(r: Row): PartnerProfile {
  return {
    companyId: r.company_id,
    intro: r.intro ?? "",
    therapeuticAreas: r.therapeutic_areas ?? [],
    phases: r.phases ?? [],
    regions: r.regions ?? [],
    employees: r.employees,
    annualProjects: r.annual_projects,
    certifications: r.certifications ?? [],
    trackRecord: r.track_record ?? "",
    extra: r.extra ?? {},
    updatedAt: r.updated_at,
    verifiedAt: r.verified_at,
  };
}

const SELECT = "company_id, intro, therapeutic_areas, phases, regions, employees, annual_projects, certifications, track_record, extra, updated_at, verified_at";

export async function getPartnerProfile(companyId: string): Promise<PartnerProfile | null> {
  const { data, error } = await createClient()
    .from("partner_profiles").select(SELECT).eq("company_id", companyId).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toProfile(data as Row) : null;
}

export async function listPartnerProfiles(companyIds: string[]): Promise<Record<string, PartnerProfile>> {
  if (companyIds.length === 0) return {};
  const { data, error } = await createClient()
    .from("partner_profiles").select(SELECT).in("company_id", companyIds);
  if (error) throw new Error(error.message);
  const out: Record<string, PartnerProfile> = {};
  for (const r of (data ?? []) as Row[]) out[r.company_id] = toProfile(r);
  return out;
}

export async function savePartnerProfile(companyId: string, p: Omit<PartnerProfile, "companyId">): Promise<void> {
  const { error } = await createClient().from("partner_profiles").upsert({
    company_id: companyId,
    intro: p.intro.trim() || null,
    therapeutic_areas: p.therapeuticAreas,
    phases: p.phases,
    regions: p.regions,
    employees: p.employees,
    annual_projects: p.annualProjects,
    certifications: p.certifications,
    track_record: p.trackRecord.trim() || null,
    extra: p.extra,
  });
  if (error) throw new Error(error.message);
}

export async function verifyPartnerProfile(companyId: string, verified: boolean): Promise<void> {
  const { error } = await createClient().rpc("admin_verify_partner_profile", {
    p_company_id: companyId, p_verified: verified,
  });
  if (error) throw new Error(error.message);
}
