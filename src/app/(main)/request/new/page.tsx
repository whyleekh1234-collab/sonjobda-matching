"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { breakAfterSlash } from "@/lib/text";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { createRequest, updateRequest, getRequest, getCompanyPartnerCategories } from "@/lib/data/requests";

const serviceTypes = [
  { id: "cro", label: "CRO", desc: "임상시험 수탁기관 매칭", icon: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" },
  { id: "cmo-cdmo", label: "CMO/CDMO", desc: "위탁생산/위탁개발생산 매칭", icon: "M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" },
  { id: "smo", label: "SMO", desc: "임상시험 실시기관 관리 매칭", icon: "M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" },
  { id: "ra", label: "RA/인허가", desc: "규제기관 승인 수탁업체 매칭", icon: "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" },
  { id: "insurance", label: "임상시험 보험", desc: "임상시험 보험 가입 및 견적", icon: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  { id: "supply", label: "소모품 공급", desc: "인쇄물/연구용 키트 등 소모품 공급업체 매칭", icon: "M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" },
  { id: "marketing", label: "마케팅 대행", desc: "심포지엄/웨비나/CSO/환자유치 프로그램 등", icon: "M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" },
];

const categoryOptions = [
  { value: "pharmaceutical", label: "의약품" },
  { value: "medical-device", label: "의료기기" },
  { value: "cosmetics", label: "화장품" },
  { value: "health-food", label: "건강기능식품" },
  { value: "ivd", label: "체외진단" },
  { value: "other", label: "기타" },
];

// 구분별 임상시험 단계 옵션
const getTrialPhaseOptions = (category: string) => {
  switch (category) {
    case "pharmaceutical":
      return [
        { value: "Phase I", label: "Phase I" },
        { value: "Phase II", label: "Phase II" },
        { value: "Phase III", label: "Phase III" },
        { value: "Phase IV", label: "Phase IV" },
        { value: "IIT", label: "IIT" },
        { value: "PMS", label: "PMS" },
        { value: "BE", label: "BE(생동성)" },
      ];
    case "medical-device":
      return [
        { value: "탐색", label: "탐색" },
        { value: "확증", label: "확증" },
        { value: "시판후", label: "시판후" },
        { value: "기타", label: "기타" },
      ];
    case "cosmetics":
    case "health-food":
      return [
        { value: "인체적용시험", label: "인체적용시험" },
        { value: "안전성 시험", label: "안전성 시험" },
        { value: "유효성 시험", label: "유효성 시험" },
        { value: "기타", label: "기타" },
      ];
    case "ivd":
      return [
        { value: "성능 시험", label: "성능 시험" },
        { value: "임상적 성능 시험", label: "임상적 성능 시험" },
        { value: "기타", label: "기타" },
      ];
    default:
      return [
        { value: "Phase I", label: "Phase I" },
        { value: "Phase II", label: "Phase II" },
        { value: "Phase III", label: "Phase III" },
        { value: "Phase IV", label: "Phase IV" },
        { value: "기타", label: "기타" },
      ];
  }
};

// CRO 서비스 선택 시 위탁업무 체크박스
const croTaskOptions = [
  "Regulatory Affairs",
  "MW",
  "모니터링",
  "IRB",
  "EDC 구축/운영",
  "DM(데이터관리)",
  "STAT(통계분석)",
  "Quality Management",
  "Safety/PV(약물감시)",
];

// CMO/CDMO 구분
const cmoCategoryOptions = [
  { value: "bio", label: "바이오의약품" },
  { value: "synthetic", label: "합성의약품" },
  { value: "cgt", label: "세포·유전자치료제" },
  { value: "api", label: "원료의약품(API)" },
  { value: "other", label: "기타" },
];

// CMO/CDMO 생산 단계
const cmoPhaseOptions = [
  { value: "process-dev", label: "공정개발" },
  { value: "scaleup", label: "스케일업" },
  { value: "clinical-sample", label: "임상용 시료생산" },
  { value: "commercial", label: "상업생산" },
  { value: "tech-transfer", label: "기술이전" },
];

// CMO/CDMO 제형
const formulationOptions = [
  { value: "injection-liquid", label: "주사제(액상)" },
  { value: "injection-lyo", label: "주사제(동결건조)" },
  { value: "oral-tablet", label: "경구제(정제)" },
  { value: "oral-capsule", label: "경구제(캡슐)" },
  { value: "topical", label: "크림·연고" },
  { value: "other", label: "기타" },
];

// CMO/CDMO GMP 인증
const gmpOptions = ["KGMP", "cGMP(FDA)", "EU GMP", "기타"];

// CMO/CDMO 위탁업무
const cmoTaskOptions = [
  "공정개발",
  "분석법개발",
  "안정성시험",
  "Batch 생산",
  "품질관리(QC)",
  "품질보증(QA)",
  "밸리데이션",
  "허가서류 지원",
  "원자재 조달",
];

// CMO/CDMO 위탁업무 세부항목
const cmoTaskDetailOptions: Record<string, string[]> = {
  "공정개발": ["세포주 개발", "배양공정 개발", "정제공정 개발", "제형 개발", "공정 최적화"],
  "분석법개발": ["역가시험", "순도시험", "불순물 분석", "특성분석", "분석법 밸리데이션"],
  "안정성시험": ["가속시험", "장기보존시험", "가혹시험", "광안정성시험"],
  "Batch 생산": ["Lab scale", "Pilot scale", "Commercial scale"],
  "품질관리(QC)": ["원료시험", "반제품시험", "완제품시험", "환경모니터링"],
  "밸리데이션": ["공정 밸리데이션", "세척 밸리데이션", "무균공정 밸리데이션", "분석법 밸리데이션"],
};

// SMO 기관 유형
const siteTypeOptions = [
  { value: "tertiary", label: "상급종합" },
  { value: "general", label: "종합병원" },
  { value: "hospital", label: "병원" },
  { value: "clinic", label: "의원" },
];

// SMO 위탁업무
const smoTaskOptions = [
  "CRC 배치/관리",
  "피험자 모집·스크리닝",
  "IRB 서류 관리",
  "데이터 입력(EDC)",
  "검체 관리",
  "임상시험용 제품(IP/ID 등) 관리",
  "모니터링 대응",
  "정도관리(QC)",
];

// SMO 위탁업무 세부항목
const smoTaskDetailOptions: Record<string, string[]> = {
  "CRC 배치/관리": ["CRC 채용/교육", "CRC 상주 배치", "CRC 순회 배치", "백업 CRC 운영"],
  "피험자 모집·스크리닝": ["모집 공고", "사전 스크리닝", "동의서 취득 지원", "스크리닝 검사 지원"],
  "IRB 서류 관리": ["초기 심의 준비", "변경 심의", "연차/종료 보고", "SAE 보고"],
  "데이터 입력(EDC)": ["CRF 데이터 입력", "Query 대응", "SDV 준비"],
  "검체 관리": ["검체 채취 지원", "검체 보관/운송", "중앙검사실 연계"],
  "임상시험용 제품(IP/ID 등) 관리": ["IP 수불 관리", "IP 보관/온도 관리", "IP 반납/폐기"],
  "모니터링 대응": ["모니터링 방문 대응", "원시자료 준비", "필수문서 관리"],
  "정도관리(QC)": ["자체 QC", "Audit 대응"],
};

// 임상시험 보험 대상자 유형
const subjectTypeOptions = [
  { value: "healthy", label: "건강인" },
  { value: "patient", label: "환자" },
];

// 임상시험 보험 선호 보험사 (최대 2개)
const insurerOptions = ["KB손해보험", "라이나", "메리츠화재", "삼성화재", "현대해상"];

// 임상시험 보험 위탁업무
const insuranceTaskOptions = [
  "보험 가입",
  "보험 설계·컨설팅",
  "보험금 청구 대행",
  "보험 갱신",
  "피험자 보상 관리",
];

// 파트너 분야명 → 서비스 유형 id
const CATEGORY_TO_TYPE: Record<string, string> = {
  "CRO": "cro", "CMO/CDMO": "cmo-cdmo", "SMO": "smo", "RA/인허가": "ra",
  "임상시험 보험": "insurance", "소모품 공급": "supply", "마케팅 대행": "marketing",
};

// 마케팅 대행 유형
const marketingTypeOptions = [
  { value: "symposium", label: "심포지엄/세미나" },
  { value: "webinar", label: "웨비나" },
  { value: "booth", label: "학회 부스 운영" },
  { value: "cso", label: "CSO(영업대행)" },
  { value: "patient", label: "환자유치 프로그램" },
  { value: "digital", label: "디지털 마케팅" },
  { value: "other", label: "기타" },
];

// 마케팅 대행 위탁업무 (심포지엄/세미나, 학회 부스, 디지털, 기타)
const marketingTaskOptions = [
  "기획/운영 (Planning & Management)",
  "디자인 (시안/아트워크)",
  "제작물 (배너/X-banner/현수막 등)",
  "인쇄물 (초청장/자료집/명찰 등)",
  "장비 대여 (프린터/노트북/모니터/촬영장비)",
  "TM/SMS (참석자 모집·안내)",
  "인력 파견 (PM/진행요원)",
  "행사장 섭외 (대관/F&B/숙박)",
  "기념품",
  "택배/물류",
];

// CSO(영업대행) 위탁업무
const csoTaskOptions = [
  "거래처 개발/관리",
  "처방 분석/리포팅",
  "설명회/심포지엄 지원",
];

// 웨비나 위탁업무. 오프라인 행사와 달리 장소·장비 대신 플랫폼·송출이 핵심이다.
const webinarTaskOptions = [
  "기획/운영 (연자 섭외·프로그램 구성)",
  "플랫폼 세팅 (Zoom/Webex/자체 플랫폼)",
  "송출/기술 지원 (스튜디오·촬영·음향)",
  "디자인 (초청장/슬라이드 템플릿)",
  "TM/SMS/이메일 (참석자 모집·안내)",
  "사전등록 페이지 제작",
  "녹화/편집 (다시보기 제공)",
  "Q&A·설문 운영",
  "참석 데이터 리포팅",
];

// 환자유치 프로그램 위탁업무. 병의원 대상으로 환자 모집·관리를 대행하는 일.
const patientTaskOptions = [
  "프로그램 기획 (대상 질환·목표 설정)",
  "온라인 광고 운영 (검색/SNS/디스플레이)",
  "콘텐츠 제작 (블로그/영상/카드뉴스)",
  "랜딩페이지/예약 시스템 제작",
  "콜센터/상담 운영",
  "환자 DB 관리 (리마인드·재방문)",
  "제휴 채널 개발 (커뮤니티/기업/보험)",
  "성과 분석/리포팅 (유입·전환)",
];

// 마케팅 유형에 따라 위탁업무 목록이 달라진다.
function marketingTasksFor(mktType: string) {
  if (mktType === "cso") return csoTaskOptions;
  if (mktType === "webinar") return webinarTaskOptions;
  if (mktType === "patient") return patientTaskOptions;
  return marketingTaskOptions;
}

// 소모품 공급 유형
const supplyTypeOptions = [
  { value: "print", label: "인쇄물 제작 (ICF/CRF/라벨 등)" },
  { value: "kit", label: "연구용 키트 (채혈/검체 등)" },
  { value: "device", label: "의료기기/소모품" },
  { value: "other", label: "기타" },
];

// 소모품 공급 납품 방식
const supplyDeliveryOptions = [
  { value: "direct", label: "실시기관 직접배송" },
  { value: "bulk", label: "의뢰사 일괄납품" },
];

// 인쇄물 제작 품목
const printItemOptions = [
  "ISF 바인더/탭인덱스",
  "증례기록서(CRF)",
  "증례상황표",
  "동의서(ICF)",
  "라벨/스티커",
  "자료집/프로토콜",
  "기타",
];

// 소모품 공급 위탁업무
const supplyTaskOptions = [
  "인쇄물 제작 (ICF/CRF/라벨/스티커 등)",
  "연구용 키트 제작·조립",
  "검체 운송 키트",
  "보관·물류 (창고보관/온도관리)",
  "배송 (실시기관 직접배송)",
  "맞춤 제작·시제품",
  "기타",
];

// RA/인허가 - 의약품 위탁업무
const raPharmTaskOptions = [
  "국내 인허가 (MFDS)",
  "해외 인허가 (FDA/EMA/PMDA 등)",
  "품목허가 서류 작성",
  "CTD/eCTD 작성",
  "GMP 실사 대응",
  "변경허가/변경신고",
  "인허가 컨설팅",
  "기타",
];

// RA/인허가 - 의료기기/화장품/건강기능식품/체외진단/기타 위탁업무
const raDeviceTaskOptions = [
  "국내 인허가 (MFDS)",
  "해외 인허가",
  "기술문서 작성",
  "임상시험 지원",
  "GMP 실사 대응",
  "인증 지원",
  "인허가 컨설팅",
  "기타",
];

// RA/인허가 - 의약품 세부 항목
const raPharmTaskDetailOptions: Record<string, string[]> = {
  "국내 인허가 (MFDS)": ["품목허가", "품목신고", "임상시험계획 승인(IND)", "CTD/eCTD", "허가 변경", "허가 갱신", "기타"],
  "해외 인허가 (FDA/EMA/PMDA 등)": ["FDA NDA/ANDA", "EMA MAA/Variation", "PMDA 신청", "기타 국가 허가"],
  "품목허가 서류 작성": ["품질(CMC) 자료", "비임상 자료", "임상 자료", "제조 및 품질관리 자료", "기타"],
  "CTD/eCTD 작성": ["Module 1", "Module 2 (QOS/비임상·임상 요약)", "Module 3 (품질)", "Module 4 (비임상)", "Module 5 (임상)", "기타"],
  "GMP 실사 대응": ["국내 GMP 실사", "해외 GMP 실사 (FDA/EMA)", "GMP 문서 정비", "기타"],
  "변경허가/변경신고": ["제조소 변경", "원료약 변경", "규격 변경", "효능효과 변경", "포장/표시 변경", "기타"],
  "인허가 컨설팅": ["인허가 전략 수립", "규제 동향 분석", "사전상담(Pre-submission)", "대면자문", "기타"],
};

// RA/인허가 - 의료기기 등 세부 항목
const raDeviceTaskDetailOptions: Record<string, string[]> = {
  "국내 인허가 (MFDS)": ["제조허가/인증/신고", "기술문서 심사", "허가 변경", "허가 갱신", "수입품목 허가", "기타"],
  "해외 인허가": ["FDA 510(k)/PMA/De Novo", "PMDA 신청", "기타 국가 허가", "기타"],
  "기술문서 작성": ["안전성·성능 시험자료", "생물학적 안전성 자료", "전기·기계적 안전성 자료", "소프트웨어 검증자료", "기타"],
  "임상시험 지원": ["임상시험계획서 작성", "임상시험 승인(IDE/IND)", "임상시험 결과보고서", "기타"],
  "GMP 실사 대응": ["국내 GMP 실사", "해외 GMP 실사", "KGMP 문서 정비", "기타"],
  "인증 지원": ["ISO 13485", "IEC 62304", "IEC 60601", "ISO 14971", "MDR", "MDSAP", "기타"],
  "인허가 컨설팅": ["등급 분류 자문", "인허가 전략 수립", "규제 동향 분석", "사전상담", "기타"],
};

// 기타 서비스 유형별 업무 체크박스
const generalTaskOptions = [
  "국내인허가", "해외인허가", "ICC", "GMP", "CE", "ISO", "MDSAP", "기타", "개발문서 준비",
];

const phaseOptions = [
  { value: "initial", label: "최초" },
  { value: "change", label: "변경" },
  { value: "extension", label: "연장" },
  { value: "renewal", label: "갱신" },
];

// RA 구분별 단계 옵션
const getRaPhaseOptions = (category: string) => {
  if (category === "pharmaceutical" || category === "cosmetics" || category === "health-food") {
    return [
      { value: "initial", label: "최초" },
      { value: "change", label: "변경" },
      { value: "renewal", label: "갱신" },
    ];
  }
  return phaseOptions; // 의료기기 등 기본: 최초/변경/연장/갱신
};

// RA 의약품 유형
const raDrugTypeOptions = [
  { value: "new-drug", label: "신약" },
  { value: "generic", label: "제네릭" },
  { value: "improved", label: "개량신약" },
];

// 위탁업무별 세부 항목
const taskDetailOptions: Record<string, string[]> = {
  "IRB": ["초기 IRB 제출", "IRB 변경보고", "IRB 연차보고", "IRB 종료보고", "IRB Reporting"],
  "모니터링": ["Site Feasibility", "Pre-study Visit", "SIV(Site Initiation Visit)", "정기 모니터링", "COV(Close-out Visit)", "Remote Monitoring"],
  "DM(데이터관리)": ["DMP", "Data Entry", "Query Management", "DB Lock", "Coding(MedDRA/WHODrug)"],
  "STAT(통계분석)": ["SAP 작성", "중간분석", "최종 통계분석", "DSMB 지원"],
  "MW": ["Protocol 작성", "ICF 작성", "CRF 작성", "CSR 작성", "IB 작성"],
  "EDC 구축/운영": ["EDC 시스템 선정", "EDC 구축", "EDC 운영/유지보수", "IWRS/RTSM"],
  "Regulatory Affairs": ["IND 신청", "IND 변경 신청", "IND 보완 대응", "NDA 신청", "NDA 보완 대응", "FDA 대응"],
  "Safety/PV(약물감시)": ["SAE Reporting", "SUSAR 보고", "DSUR 작성", "Safety DB 관리"],
  "Quality Management": ["Audit 지원(Auditee)", "Audit 수행(Auditor)", "QC", "Inspection 대응"],
};

const budgetOptions = [
  "1천만원 미만", "1천만원 ~ 5천만원", "5천만원 ~ 1억원", "1억원 ~ 5억원", "5억원 ~ 10억원", "10억원 이상", "협의 필요",
];

const priorityOptions = [
  { value: "low", label: "낮음" },
  { value: "normal", label: "보통" },
  { value: "high", label: "높음" },
  { value: "urgent", label: "긴급" },
];

export default function NewRequestPage() {
  return (
    <Suspense>
      <NewRequestForm />
    </Suspense>
  );
}

function NewRequestForm() {
  const { user } = useAuth();

  // 이해상충: 우리 회사가 파트너사로 등록한 분야의 의뢰는 못 올린다.
  // 회사 기준(멤버 전체 합집합)이라 서버에 묻는다. 서버 트리거가 최종
  // 문지기고, 여기서는 애초에 못 고르게 해서 헛수고를 막는다.
  const [blockedTypes, setBlockedTypes] = useState<string[]>([]);
  useEffect(() => {
    if (!user?.companyId) return;
    getCompanyPartnerCategories(user.companyId)
      .then((cats) => setBlockedTypes(cats.map((c) => CATEGORY_TO_TYPE[c]).filter(Boolean)))
      .catch(() => setBlockedTypes([]));
  }, [user?.companyId]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);

  // Step 1
  const [serviceType, setServiceType] = useState("");
  // Step 2
  const [projectName, setProjectName] = useState("");
  const [productCategory, setProductCategory] = useState("");
  const [tasks, setTasks] = useState<string[]>([]);
  const [phase, setPhase] = useState("");
  // CRO 추가 정보
  const [indication, setIndication] = useState("");
  const [trialPhase, setTrialPhase] = useState("");
  const [subjectCount, setSubjectCount] = useState("");
  const [siteCount, setSiteCount] = useState({ capital: "", local: "" });
  const [enrollmentPeriod, setEnrollmentPeriod] = useState("");
  const [treatmentPeriod, setTreatmentPeriod] = useState("");
  const [trialPurpose, setTrialPurpose] = useState("");
  const [crfType, setCrfType] = useState("eCRF");
  const [crfPages, setCrfPages] = useState("");
  // CMO/CDMO 추가 정보
  const [cmoCategory, setCmoCategory] = useState("");
  const [cmoPhase, setCmoPhase] = useState("");
  const [formulation, setFormulation] = useState("");
  const [batchCount, setBatchCount] = useState("");
  const [productionVolume, setProductionVolume] = useState("");
  const [gmpRequirements, setGmpRequirements] = useState<string[]>([]);
  // SMO 추가 정보
  const [smoIndication, setSmoIndication] = useState("");
  const [smoTrialPhase, setSmoTrialPhase] = useState("");
  const [smoSiteCount, setSmoSiteCount] = useState({ capital: "", local: "" });
  const [siteTypes, setSiteTypes] = useState<string[]>([]);
  const [smoSubjectCount, setSmoSubjectCount] = useState("");
  const [smoEnrollmentPeriod, setSmoEnrollmentPeriod] = useState("");
  const [crcCount, setCrcCount] = useState("");
  // 임상시험 보험 추가 정보
  const [insIndication, setInsIndication] = useState("");
  const [insTrialPhase, setInsTrialPhase] = useState("");
  const [insSubjectCount, setInsSubjectCount] = useState("");
  const [insSiteNames, setInsSiteNames] = useState("");
  const [insurancePeriod, setInsurancePeriod] = useState("");
  const [subjectType, setSubjectType] = useState("");
  const [compensationPerPerson, setCompensationPerPerson] = useState("");
  const [compensationTotal, setCompensationTotal] = useState("");
  const [preferredInsurers, setPreferredInsurers] = useState<string[]>([]);
  const [insContractorType, setInsContractorType] = useState("");
  const [insContractorId, setInsContractorId] = useState("");
  // RA 추가 정보
  const [raProductInfo, setRaProductInfo] = useState("");
  const [raDeviceGrade, setRaDeviceGrade] = useState("");
  const [raDrugType, setRaDrugType] = useState("");
  // 소모품 공급 추가 정보
  const [supplyType, setSupplyType] = useState("");
  const [supplyQty, setSupplyQty] = useState("");
  const [supplyDeliveryDate, setSupplyDeliveryDate] = useState("");
  const [supplyDeliveryMethod, setSupplyDeliveryMethod] = useState("");
  const [printClinicalCode, setPrintClinicalCode] = useState("");
  const [printSites, setPrintSites] = useState("");
  const [printItems, setPrintItems] = useState<string[]>([]);
  const [printDeliveryAddress, setPrintDeliveryAddress] = useState("");

  // 배송 장소 주소 검색 (카카오/다음 우편번호 서비스)
  const openAddressSearch = () => {
    type DaumPostcode = {
      Postcode: new (opts: {
        oncomplete: (data: { roadAddress: string; jibunAddress: string; address: string }) => void;
      }) => { open: () => void };
    };
    const w = window as unknown as { daum?: DaumPostcode };
    const run = () => {
      if (!w.daum) return;
      new w.daum.Postcode({
        oncomplete: (data) => {
          setPrintDeliveryAddress(data.roadAddress || data.address || data.jibunAddress);
        },
      }).open();
    };
    if (w.daum?.Postcode) { run(); return; }
    const script = document.createElement("script");
    script.src = "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    script.onload = run;
    document.body.appendChild(script);
  };

  // 소모품 위탁업무: 인쇄물 제작 유형이 아니면 "인쇄물 제작" 항목 제외
  const supplyTasks =
    supplyType === "print"
      ? supplyTaskOptions
      : supplyTaskOptions.filter((t) => t !== "인쇄물 제작 (ICF/CRF/라벨/스티커 등)");

  // 마케팅 대행 추가 정보
  const [mktType, setMktType] = useState("");
  const [mktIngredientName, setMktProductName] = useState("");
  const [mktEventName, setMktEventName] = useState("");
  const [mktEventDate, setMktEventDate] = useState("");
  const [mktAttendees, setMktAttendees] = useState("");
  const [mktVenue, setMktVenue] = useState("");
  const [mktNeedStay, setMktNeedStay] = useState("");
  const [mktNeedFnb, setMktNeedFnb] = useState("");
  // Step 3
  const [budget, setBudget] = useState("");
  const [priority, setPriority] = useState("normal");
  const [startDate, setStartDate] = useState("");
  const [attachment, setAttachment] = useState<{ name: string; data: string } | null>(null);
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [monitoringCount, setMonitoringCount] = useState("");
  const [taskDetails, setTaskDetails] = useState<Record<string, string[]>>({});
  const [editRequestId, setEditRequestId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<string | null>(null);

  const DRAFT_KEY = "sonjobda_request_draft";

  // 임시저장 데이터 구조
  const getDraftData = useCallback(() => ({
    step, serviceType, projectName, productCategory, tasks, phase, trialPurpose,
    indication, trialPhase, subjectCount, siteCount, enrollmentPeriod, treatmentPeriod, crfType, crfPages,
    cmoCategory, cmoPhase, formulation, batchCount, productionVolume, gmpRequirements,
    smoIndication, smoTrialPhase, smoSiteCount, siteTypes, smoSubjectCount, smoEnrollmentPeriod, crcCount,
    insIndication, insTrialPhase, insSubjectCount, insSiteNames, insurancePeriod, subjectType, compensationPerPerson, compensationTotal, preferredInsurers, insContractorType, insContractorId,
    raProductInfo, raDeviceGrade, raDrugType,
    supplyType, supplyQty, supplyDeliveryDate, supplyDeliveryMethod, printClinicalCode, printSites, printItems, printDeliveryAddress,
    mktType, mktIngredientName, mktEventName, mktEventDate, mktAttendees, mktVenue, mktNeedStay, mktNeedFnb,
    monitoringCount, budget, priority, startDate, additionalNotes, taskDetails,
  }), [step, serviceType, projectName, productCategory, tasks, phase, trialPurpose, raProductInfo, raDeviceGrade, monitoringCount,
    indication, trialPhase, subjectCount, siteCount, enrollmentPeriod, treatmentPeriod, crfType, crfPages,
    cmoCategory, cmoPhase, formulation, batchCount, productionVolume, gmpRequirements,
    smoIndication, smoTrialPhase, smoSiteCount, siteTypes, smoSubjectCount, smoEnrollmentPeriod, crcCount,
    insIndication, insTrialPhase, insSubjectCount, insSiteNames, insurancePeriod, subjectType, compensationPerPerson, compensationTotal, preferredInsurers, insContractorType, insContractorId,
    supplyType, supplyQty, supplyDeliveryDate, supplyDeliveryMethod, printClinicalCode, printSites, printItems, printDeliveryAddress,
    mktType, mktIngredientName, mktEventName, mktEventDate, mktAttendees, mktVenue, mktNeedStay, mktNeedFnb,
    budget, priority, startDate, additionalNotes, taskDetails]);

  const saveDraft = () => {
    if (!projectName.trim()) {
      alert("프로젝트명을 입력해야 임시저장할 수 있습니다.");
      return;
    }
    localStorage.setItem(DRAFT_KEY, JSON.stringify(getDraftData()));
    alert("임시저장되었습니다.");
  };

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
  };

  // 폼 데이터 일괄 세팅 헬퍼
  const applyFormData = (data: Record<string, unknown>) => {
    if (data.step) setStep(data.step as number);
    setServiceType((data.serviceType as string) || "");
    setProjectName((data.projectName as string) || "");
    setProductCategory((data.productCategory as string) || "");
    setTasks((data.tasks as string[]) || []);
    setPhase((data.phase as string) || "");
    setTrialPurpose((data.trialPurpose as string) || "");
    // CRO
    setIndication((data.indication as string) || "");
    setTrialPhase((data.trialPhase as string) || "");
    setSubjectCount((data.subjectCount as string) || "");
    setSiteCount((data.siteCount as { capital: string; local: string }) || { capital: "", local: "" });
    setEnrollmentPeriod((data.enrollmentPeriod as string) || "");
    setTreatmentPeriod((data.treatmentPeriod as string) || "");
    setCrfType((data.crfType as string) || "eCRF");
    setCrfPages((data.crfPages as string) || "");
    // CMO/CDMO
    setCmoCategory((data.cmoCategory as string) || "");
    setCmoPhase((data.cmoPhase as string) || "");
    setFormulation((data.formulation as string) || "");
    setBatchCount((data.batchCount as string) || "");
    setProductionVolume((data.productionVolume as string) || "");
    setGmpRequirements((data.gmpRequirements as string[]) || []);
    // SMO
    setSmoIndication((data.smoIndication as string) || "");
    setSmoTrialPhase((data.smoTrialPhase as string) || "");
    setSmoSiteCount((data.smoSiteCount as { capital: string; local: string }) || { capital: "", local: "" });
    setSiteTypes((data.siteTypes as string[]) || []);
    setSmoSubjectCount((data.smoSubjectCount as string) || "");
    setSmoEnrollmentPeriod((data.smoEnrollmentPeriod as string) || "");
    setCrcCount((data.crcCount as string) || "");
    // 보험
    setInsIndication((data.insIndication as string) || "");
    setInsTrialPhase((data.insTrialPhase as string) || "");
    setInsSubjectCount((data.insSubjectCount as string) || "");
    setInsSiteNames((data.insSiteNames as string) || "");
    setInsurancePeriod((data.insurancePeriod as string) || "");
    setSubjectType((data.subjectType as string) || "");
    setCompensationPerPerson((data.compensationPerPerson as string) || "");
    setCompensationTotal((data.compensationTotal as string) || "");
    setPreferredInsurers((data.preferredInsurers as string[]) || []);
    setInsContractorType((data.insContractorType as string) || "");
    setInsContractorId((data.insContractorId as string) || "");
    // Step 3
    setBudget((data.budget as string) || "");
    setPriority((data.priority as string) || "normal");
    setStartDate((data.startDate as string) || "");
    setRaProductInfo((data.raProductInfo as string) || "");
    setRaDeviceGrade((data.raDeviceGrade as string) || "");
    setRaDrugType((data.raDrugType as string) || "");
    // 소모품
    setSupplyType((data.supplyType as string) || "");
    setSupplyQty((data.supplyQty as string) || "");
    setSupplyDeliveryDate((data.supplyDeliveryDate as string) || "");
    setSupplyDeliveryMethod((data.supplyDeliveryMethod as string) || "");
    setPrintClinicalCode((data.printClinicalCode as string) || "");
    setPrintSites((data.printSites as string) || "");
    setPrintItems((data.printItems as string[]) || []);
    setPrintDeliveryAddress((data.printDeliveryAddress as string) || "");
    // 마케팅
    setMktType((data.mktType as string) || "");
    setMktProductName((data.mktIngredientName as string) || "");
    setMktEventName((data.mktEventName as string) || "");
    setMktEventDate((data.mktEventDate as string) || "");
    setMktAttendees((data.mktAttendees as string) || "");
    setMktVenue((data.mktVenue as string) || "");
    setMktNeedStay((data.mktNeedStay as string) || "");
    setMktNeedFnb((data.mktNeedFnb as string) || "");
    setMonitoringCount((data.monitoringCount as string) || "");
    setAdditionalNotes((data.additionalNotes as string) || "");
    setTaskDetails((data.taskDetails as Record<string, string[]>) || {});
  };

  // 페이지 진입 시 수정 모드 또는 임시저장 데이터 불러오기.
  // 수정할 의뢰는 /request/new?edit=<id> 로 넘어온다.
  useEffect(() => {
    const editId = searchParams.get("edit");

    if (!editId) {
      const stored = localStorage.getItem(DRAFT_KEY);
      if (stored) {
        setPendingDraft(stored);
        setShowDraftModal(true);
      }
      return;
    }

    let alive = true;
    getRequest(editId).then((req) => {
      if (!alive || !req) return;
      setEditRequestId(editId);
      if (req.formData) {
        // 저장된 폼 데이터로 모든 필드 복원
        applyFormData(req.formData);
      } else {
        // 폼 데이터가 없는 경우 description에서 파싱 (하위 호환)
        const categoryMap: Record<string, string> = {
          "CRO": "cro", "CMO/CDMO": "cmo-cdmo", "SMO": "smo", "RA/인허가": "ra", "임상시험 보험": "insurance", "소모품 공급": "supply", "마케팅 대행": "marketing",
        };
        setServiceType(categoryMap[req.category] || "");
        setProjectName(req.title || "");
        setBudget(req.budget || "");
        setStartDate(req.deadline || "");
      }
      setStep(2); // 2단계부터 수정
    });
    return () => { alive = false; };
  }, [searchParams]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { alert("파일 크기는 10MB 이하만 가능합니다."); return; }
    const reader = new FileReader();
    reader.onload = () => setAttachment({ name: file.name, data: reader.result as string });
    reader.readAsDataURL(file);
  };

  const toggleTask = (task: string) => {
    setTasks((prev) => prev.includes(task) ? prev.filter((t) => t !== task) : [...prev, task]);
  };

  const toggleDetail = (taskKey: string, detail: string) => {
    setTaskDetails((prev) => {
      const current = prev[taskKey] || [];
      return { ...prev, [taskKey]: current.includes(detail) ? current.filter((d) => d !== detail) : [...current, detail] };
    });
  };

  const toggleAllDetails = (taskKey: string) => {
    const options = ({ ...taskDetailOptions, ...cmoTaskDetailOptions, ...smoTaskDetailOptions, ...(productCategory === "pharmaceutical" ? raPharmTaskDetailOptions : raDeviceTaskDetailOptions) })[taskKey] || [];
    const current = taskDetails[taskKey] || [];
    const allSelected = options.length > 0 && options.every((o) => current.includes(o));
    setTaskDetails((prev) => ({ ...prev, [taskKey]: allSelected ? [] : [...options] }));
  };

  const getValidationError = (): string | null => {
    if (step === 1) {
      if (!serviceType) return "서비스 유형을 선택해주세요.";
    }
    if (step === 2) {
      if (projectName.trim().length < 5) return "프로젝트명을 5자 이상 입력해주세요.";
      if (["cro", "smo"].includes(serviceType) && !trialPurpose.trim()) return "임상시험 목적을 입력해주세요.";
      if (serviceType === "cmo-cdmo" && !trialPurpose.trim()) return "의뢰 목적을 입력해주세요.";
      if (serviceType === "cro") {
        if (!productCategory) return "구분을 선택해주세요.";
        if (!indication.trim()) return "적응증 *을 입력해주세요.";
        if (!trialPhase) return "임상시험 단계를 선택해주세요.";
        if (!subjectCount.trim()) return "시험 대상자 수를 입력해주세요.";
        if (!siteCount.capital.trim() && !siteCount.local.trim()) return "실시기관 수를 입력해주세요. (수도권 또는 지방)";
        if (!enrollmentPeriod.trim()) return "대상자 등록 기간을 입력해주세요.";
        if (!treatmentPeriod.trim()) return "치료 및 추적관찰 기간을 입력해주세요.";
      } else if (serviceType === "cmo-cdmo") {
        if (!cmoCategory) return "구분을 선택해주세요.";
        if (!cmoPhase) return "생산 단계를 선택해주세요.";
        if (!formulation) return "제형을 선택해주세요.";
      } else if (serviceType === "smo") {
        if (!productCategory) return "구분을 선택해주세요.";
        if (!smoIndication.trim()) return "적응증을 입력해주세요.";
        if (!smoTrialPhase) return "임상시험 단계를 선택해주세요.";
        if (!smoSiteCount.capital.trim() && !smoSiteCount.local.trim()) return "실시기관 수를 입력해주세요.";
        if (!smoSubjectCount.trim()) return "목표 대상자 수를 입력해주세요.";
        if (!smoEnrollmentPeriod.trim()) return "예상 등록 기간을 입력해주세요.";
      } else if (serviceType === "insurance") {
        if (!productCategory) return "구분을 선택해주세요.";
        if (!insTrialPhase) return "임상시험 단계를 선택해주세요.";
        if (!insIndication.trim()) return "적응증을 입력해주세요.";
        if (!insSubjectCount.trim()) return "시험 대상자 수를 입력해주세요.";
        if (!insSiteNames.trim()) return "실시기관명을 입력해주세요.";
        if (!insurancePeriod.trim()) return "예상 보험 기간을 입력해주세요.";
        if (!subjectType) return "대상자 유형을 선택해주세요.";
        if (!insContractorType) return "계약자 유형을 선택해주세요.";
        if (!insContractorId.trim()) return insContractorType === "individual" ? "주민등록번호를 입력해주세요." : "사업자등록번호를 입력해주세요.";
      } else if (serviceType === "ra") {
        if (!productCategory) return "구분을 선택해주세요.";
        if (productCategory === "medical-device" && !raDeviceGrade) return "등급을 선택해주세요.";
        if (productCategory === "pharmaceutical" && !raDrugType) return "의약품 유형을 선택해주세요.";
        if (!phase) return "단계를 선택해주세요.";
        if (!raProductInfo.trim()) return "제품 정보를 입력해주세요.";
      } else if (serviceType === "supply") {
        if (!supplyType) return "공급 유형을 선택해주세요.";
        if (!supplyQty.trim()) return "납품 수량을 입력해주세요.";
      } else if (serviceType === "marketing") {
        if (!mktType) return "마케팅 유형을 선택해주세요.";
        if (!mktIngredientName.trim()) return "성분명을 입력해주세요.";
        if ((mktType === "symposium" || mktType === "booth") && !mktEventName.trim()) return "행사명을 입력해주세요.";
        if ((mktType === "symposium" || mktType === "booth") && !mktAttendees.trim()) return "예상 참석자 수를 입력해주세요.";
      } else {
        if (!productCategory) return "구분을 선택해주세요.";
        if (!phase) return "단계를 선택해주세요.";
      }
      if (serviceType !== "insurance" && tasks.length === 0) return "위탁업무를 하나 이상 선택해주세요.";
    }
    if (step === 3) {
      if (serviceType !== "insurance" && !budget) return "예산 범위를 선택해주세요.";
      if (!priority) return "우선순위를 선택해주세요.";
      if (!startDate) return "희망 업무 시작일을 선택해주세요.";
      if (serviceType === "insurance" && !attachment) return "임상시험 보험은 임상시험계획서 및 동의서 첨부가 필수입니다.";
    }
    return null;
  };

  const handleNext = () => {
    const error = getValidationError();
    if (error) {
      alert(error);
      return;
    }
    setStep(step + 1);
  };

  const handleSubmit = async () => {
    if (!user || isSubmitting) return;
    const categoryMap: Record<string, string> = {
      cro: "CRO", "cmo-cdmo": "CMO/CDMO", smo: "SMO", ra: "RA/인허가", insurance: "임상시험 보험", supply: "소모품 공급", marketing: "마케팅 대행",
    };
    // 의뢰 고유번호(RQ-)는 DB 시퀀스가 붙인다. 예전처럼 기존 최대값+1로
    // 만들면 두 회사가 동시에 제출할 때 같은 번호가 나온다.
    const payload = {
      title: projectName,
      category: categoryMap[serviceType] || serviceType,
      description: [
        serviceType === "cmo-cdmo"
          ? `구분: ${cmoCategoryOptions.find((c) => c.value === cmoCategory)?.label || "-"}`
          : serviceType === "marketing"
          ? `마케팅 유형: ${marketingTypeOptions.find((o) => o.value === mktType)?.label || "-"}`
          : serviceType === "supply"
          ? `공급 유형: ${supplyTypeOptions.find((o) => o.value === supplyType)?.label || "-"}`
          : `구분: ${categoryOptions.find((c) => c.value === productCategory)?.label || "-"}`,
        trialPurpose ? `${serviceType === "cmo-cdmo" ? "의뢰 목적" : "임상시험 목적"}: ${trialPurpose}` : "",
        tasks.length > 0 ? `위탁업무: ${tasks.join(", ")}` : "",
        ...tasks.filter((t) => (taskDetails[t] || []).length > 0).map((t) => `  - ${t} 세부: ${taskDetails[t].join(", ")}`),
        ...(serviceType === "cro" ? [
          phase ? `단계: ${phaseOptions.find((p) => p.value === phase)?.label}` : "",
          indication ? `적응증: ${indication}` : "",
          trialPhase ? `임상단계: ${trialPhase}` : "",
          subjectCount ? `대상자 수: ${subjectCount}명` : "",
          (siteCount.capital || siteCount.local) ? `실시기관: 수도권 ${siteCount.capital || 0} / 지방 ${siteCount.local || 0}` : "",
          enrollmentPeriod ? `등록기간: ${enrollmentPeriod}개월` : "",
          treatmentPeriod ? `치료/추적관찰: ${treatmentPeriod}개월` : "",
          `CRF: ${crfType} / ${crfPages || "-"}페이지`,
        ] : serviceType === "cmo-cdmo" ? [
          cmoPhase ? `생산단계: ${cmoPhaseOptions.find((p) => p.value === cmoPhase)?.label}` : "",
          formulation ? `제형: ${formulationOptions.find((f) => f.value === formulation)?.label}` : "",
          batchCount ? `Batch 수: ${batchCount}회` : "",
          productionVolume ? `생산 규모: ${productionVolume}` : "",
          gmpRequirements.length > 0 ? `GMP: ${gmpRequirements.join(", ")}` : "",
        ] : serviceType === "insurance" ? [
          insTrialPhase ? `임상단계: ${insTrialPhase}` : "",
          insIndication ? `적응증: ${insIndication}` : "",
          insSubjectCount ? `대상자 수: ${insSubjectCount}명` : "",
          subjectType ? `대상자 유형: ${subjectTypeOptions.find((o) => o.value === subjectType)?.label}` : "",
          insSiteNames ? `실시기관명: ${insSiteNames}` : "",
          insurancePeriod ? `예상 보험 기간: ${insurancePeriod}개월` : "",
          compensationPerPerson ? `보상한도(1인당): ${compensationPerPerson}` : "",
          compensationTotal ? `보상한도(총): ${compensationTotal}` : "",
          insContractorType ? `계약자: ${insContractorType === "individual" ? "개인" : "법인"}` : "",
          insContractorId ? `${insContractorType === "individual" ? "주민등록번호" : "사업자등록번호"}: ${insContractorId}` : "",
          preferredInsurers.length > 0 ? `선호 보험사: ${preferredInsurers.join(", ")}` : "",
        ] : serviceType === "smo" ? [
          smoIndication ? `적응증: ${smoIndication}` : "",
          smoTrialPhase ? `임상단계: ${smoTrialPhase}` : "",
          (smoSiteCount.capital || smoSiteCount.local) ? `실시기관: 수도권 ${smoSiteCount.capital || 0} / 지방 ${smoSiteCount.local || 0}` : "",
          siteTypes.length > 0 ? `기관유형: ${siteTypes.map((v) => siteTypeOptions.find((o) => o.value === v)?.label).join(", ")}` : "",
          smoSubjectCount ? `목표 대상자: ${smoSubjectCount}명` : "",
          smoEnrollmentPeriod ? `등록기간: ${smoEnrollmentPeriod}개월` : "",
          crcCount ? `CRC 인원: ${crcCount}명` : "",
        ] : serviceType === "ra" ? [
          raDeviceGrade ? `의료기기 등급: ${raDeviceGrade}` : "",
          raDrugType ? `의약품 유형: ${raDrugTypeOptions.find((o) => o.value === raDrugType)?.label}` : "",
          phase ? `단계: ${phaseOptions.find((p) => p.value === phase)?.label}` : "",
          raProductInfo ? `제품 정보: ${raProductInfo}` : "",
        ] : serviceType === "supply" ? [
          supplyType ? `공급 유형: ${supplyTypeOptions.find((o) => o.value === supplyType)?.label}` : "",
          supplyQty ? `납품 수량: ${supplyQty}` : "",
          supplyDeliveryDate ? `납품 희망일: ${supplyDeliveryDate}` : "",
          supplyDeliveryMethod ? `납품 방식: ${supplyDeliveryOptions.find((o) => o.value === supplyDeliveryMethod)?.label}` : "",
          printClinicalCode ? `임상코드번호: ${printClinicalCode}` : "",
          printSites ? `해당 기관: ${printSites}` : "",
          printItems.length > 0 ? `인쇄 품목: ${printItems.join(", ")}` : "",
          printDeliveryAddress ? `배송 장소: ${printDeliveryAddress}` : "",
        ] : serviceType === "marketing" ? [
          mktType ? `마케팅 유형: ${marketingTypeOptions.find((o) => o.value === mktType)?.label}` : "",
          mktIngredientName ? `성분명: ${mktIngredientName}` : "",
          mktEventName ? `행사명: ${mktEventName}` : "",
          mktEventDate ? `행사 희망 일정: ${mktEventDate}` : "",
          mktAttendees ? `예상 참석자: ${mktAttendees}명` : "",
          mktVenue ? `희망 장소: ${mktVenue}` : "",
          mktNeedStay ? `숙박: ${mktNeedStay === "yes" ? "필요" : "불필요"}` : "",
          mktNeedFnb ? `F&B: ${mktNeedFnb === "yes" ? "필요" : "불필요"}` : "",
        ] : [
          phase ? `단계: ${phaseOptions.find((p) => p.value === phase)?.label}` : "",
        ]),
        `예산: ${budget}`,
        `우선순위: ${priorityOptions.find((p) => p.value === priority)?.label}`,
        `희망 업무 시작일: ${startDate}`,
        monitoringCount ? `기관당 예측 모니터링 횟수: ${monitoringCount}회` : "",
        additionalNotes ? `추가 요구사항: ${additionalNotes}` : "",
      ].filter(Boolean).join("\n"),
      budget,
      deadline: startDate,
      formData: getDraftData(),
    };

    const confirmMessage = editRequestId
      ? "수정된 견적 요청을 제출하시겠습니까?"
      : "최종 견적을 제출하시겠습니까?\n파트너사가 견적을 확인한 이후에는 회수 및 수정이 불가능합니다.";
    if (!confirm(confirmMessage)) return;

    setIsSubmitting(true);
    try {
      if (editRequestId) {
        await updateRequest(editRequestId, payload);
      } else {
        await createRequest(payload, user.companyId, user.id);
      }
      clearDraft();
      alert(editRequestId ? "견적 요청이 수정되었습니다." : "견적요청이 제출되었습니다.");
      router.push("/dashboard/client");
    } catch (err) {
      alert(err instanceof Error ? err.message : "제출하지 못했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepLabels = [
    { num: 1, title: "서비스 유형", sub: "서비스 종류 선택" },
    { num: 2, title: "프로젝트 정보", sub: "프로젝트 상세 정보" },
    { num: 3, title: "요구사항", sub: "세부 요구사항" },
    { num: 4, title: "검토", sub: "최종 확인" },
  ];

  return (
    <div className="min-h-screen bg-muted py-8">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <button onClick={() => { if (editRequestId && step <= 2) { router.push("/dashboard/client"); } else if (step > 1) { setStep(step - 1); } else { router.push("/dashboard/client"); } }}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-900">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            {step === 1 || (editRequestId && step <= 2) ? "대시보드로" : "이전 단계"}
          </button>
          <div />
        </div>

        {/* 스텝 인디케이터 */}
        <div className="mt-8 flex justify-between">
          {stepLabels.map((s, i) => (
            <div key={s.num} className="relative flex flex-1 flex-col items-center px-1">
              {/* 연결선: 원의 세로 중심(top-5)에 맞춰 다음 스텝 중심까지. absolute라 원/라벨 정렬에 영향 없음 */}
              {i < stepLabels.length - 1 && (
                <div className={`absolute left-1/2 top-5 h-0.5 w-full ${step > s.num ? "bg-primary" : "bg-border"}`} />
              )}
              {/* 원 (연결선 위에 표시) */}
              <div className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${
                step >= s.num ? "bg-primary text-white" : "bg-muted text-foreground/30 border border-border"
              }`}>
                {step > s.num ? (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                ) : s.num}
              </div>
              {/* 라벨: 원과 같은 컨테이너(items-center)라 원 정중앙 아래에 중앙 정렬 */}
              <p className={`mt-2 text-center text-xs font-medium ${step >= s.num ? "text-primary" : "text-foreground/30"}`}>{s.title}</p>
              <p className="text-center text-[10px] text-foreground/30">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* 폼 영역 */}
        <div className="mt-8 rounded-2xl border border-border bg-white p-6 sm:p-8">

          {/* Step 1: 서비스 유형 */}
          {step === 1 && (
            <div>
              <h2 className="text-lg font-bold text-foreground">서비스 유형 선택</h2>
              <p className="mt-1 text-sm text-foreground/50">필요한 서비스 유형을 선택해주세요</p>
              {blockedTypes.length > 0 && (
                <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-700">
                  귀사가 파트너사로 등록한 분야({blockedTypes.map((t) => serviceTypes.find((s) => s.id === t)?.label).join(", ")})의
                  의뢰는 이해상충 방지를 위해 등록할 수 없습니다. (서비스운영정책 제3조)
                </p>
              )}
              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {serviceTypes.map((type) => {
                  const blocked = blockedTypes.includes(type.id);
                  return (
                  <button key={type.id} aria-disabled={blocked}
                    onClick={() => {
                      if (blocked) {
                        alert(`서비스운영정책 제3조 ⑤에 따라 등록할 수 없습니다.

귀사는 "${type.label}" 분야의 파트너사로 등록되어 있습니다. 파트너사가 같은 분야의 의뢰를 등록하면 경쟁 파트너사의 견적 내용을 열람할 수 있어 이해상충이 발생하므로, 이 분야의 의뢰 등록은 제한됩니다.

다른 분야의 의뢰는 등록하실 수 있습니다.`);
                        return;
                      }
                      setServiceType(type.id);
                    }}
                    className={`group flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all duration-150 ${
                      blocked ? "cursor-not-allowed border-border bg-muted/40 opacity-60"
                      : serviceType === type.id ? "border-primary bg-primary/5 shadow-md"
                      : "border-border hover:-translate-y-0.5 hover:border-primary hover:bg-primary/5 hover:shadow-lg"
                    }`}>
                    <div className={`mt-0.5 rounded-lg p-2 transition-colors ${serviceType === type.id ? "bg-primary/10 text-primary" : "bg-muted text-foreground/40"} ${blocked ? "" : "group-hover:bg-primary/10 group-hover:text-primary"}`}>
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={type.icon} /></svg>
                    </div>
                    <div>
                      <p className={`text-sm font-semibold text-foreground ${blocked ? "" : "group-hover:text-primary"}`}>{type.label}{blocked && <span className="ml-2 text-xs font-normal text-amber-600">등록 불가</span>}</p>
                      <p className="mt-0.5 break-keep text-xs text-foreground/50">{breakAfterSlash(type.desc)}</p>
                    </div>
                  </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: 프로젝트 정보 */}
          {step === 2 && (
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-foreground">프로젝트 기본 정보</h2>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">{serviceTypes.find((s) => s.id === serviceType)?.label}</span>
              </div>
              <p className="mt-1 text-sm text-foreground/50">프로젝트의 기본 정보를 입력해주세요</p>
              <p className="mt-1 text-xs text-red-400">* 표시는 필수 입력 항목입니다</p>
              {serviceType === "insurance" && (
                <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
                  <p className="text-sm text-primary">임상시험 보험가입 업무는 국내최초 GA보험사 <a href="https://www.kfg.co.kr" target="_blank" rel="noopener noreferrer" className="font-semibold underline hover:text-primary-dark">KFG</a>가 전담합니다. (보험대리점 등록번호 : 2001088108호)</p>
                </div>
              )}
              <div className="mt-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-foreground">프로젝트명(가칭도 무관) *</label>
                  <input type="text" value={projectName} onChange={(e) => setProjectName(e.target.value)}
                    placeholder={serviceType === "cro" ? "예: Phase II 고혈압 치료제 임상시험" : serviceType === "cmo-cdmo" ? "예: 바이오시밀러 위탁생산" : serviceType === "smo" ? "예: 의료기기 확증 임상시험 SMO" : serviceType === "ra" ? "예: 의료기기 3등급 인허가" : serviceType === "insurance" ? "예: Phase I 건강인 대상 임상시험 보험" : serviceType === "supply" ? "예: 임상시험용 소모품 공급" : serviceType === "marketing" ? "예: 심포지엄 대행" : "프로젝트명을 입력하세요"} maxLength={100}
                    className="mt-1 w-full rounded-lg border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                  <p className="mt-1 text-xs text-primary/60">숫자/문자(한영)/기호 제한 없음 / 최소 5자 이상</p>
                </div>
                {/* 임상시험 목적 - CRO/SMO/CMO-CDMO/RA */}
                {["cro", "smo", "cmo-cdmo"].includes(serviceType) && (
                  <div>
                    <label className="block text-sm font-medium text-foreground">{serviceType === "cmo-cdmo" ? "의뢰 목적" : "임상시험 목적"} *</label>
                    <input type="text" value={trialPurpose} onChange={(e) => setTrialPurpose(e.target.value)}
                      placeholder=""
                      className="mt-1 w-full rounded-lg border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                  </div>
                )}
                {/* 구분 - 서비스 유형별 분기 */}
                {serviceType === "cmo-cdmo" ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-foreground">구분 *</label>
                      <select value={cmoCategory} onChange={(e) => setCmoCategory(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-border px-4 py-2.5 text-sm outline-none focus:border-primary">
                        <option value="">구분 선택</option>
                        {cmoCategoryOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground">생산 단계 *</label>
                      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {cmoPhaseOptions.map((opt) => (
                          <button key={opt.value} onClick={() => setCmoPhase(opt.value)}
                            className={`rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                              cmoPhase === opt.value ? "border-primary bg-primary/5 text-primary" : "border-border text-foreground/60 hover:border-foreground/30"
                            }`}>{opt.label}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground">제형 *</label>
                      <select value={formulation} onChange={(e) => setFormulation(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-border px-4 py-2.5 text-sm outline-none focus:border-primary">
                        <option value="">제형 선택</option>
                        {formulationOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-foreground">예상 Batch 수</label>
                        <input type="text" inputMode="numeric" value={batchCount} onChange={(e) => setBatchCount(e.target.value.replace(/\D/g, ""))}
                          placeholder="예: 3" className="mt-1 w-full rounded-lg border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground">예상 생산 규모</label>
                        <input type="text" value={productionVolume} onChange={(e) => setProductionVolume(e.target.value)}
                          placeholder="예: 10,000 vials" className="mt-1 w-full rounded-lg border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground">GMP 인증 요구사항</label>
                      <div className="mt-2 flex flex-wrap gap-3">
                        {gmpOptions.map((gmp) => (
                          <label key={gmp} className="flex cursor-pointer items-center gap-2">
                            <input type="checkbox" checked={gmpRequirements.includes(gmp)}
                              onChange={() => setGmpRequirements((prev) => prev.includes(gmp) ? prev.filter((g) => g !== gmp) : [...prev, gmp])}
                              className="h-4 w-4 rounded border-border accent-primary" />
                            <span className="text-sm text-foreground/70">{gmp}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </>
                ) : serviceType === "smo" ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-foreground">구분 *</label>
                      <select value={productCategory} onChange={(e) => { setProductCategory(e.target.value); setSmoTrialPhase(""); }}
                        className="mt-1 w-full rounded-lg border border-border px-4 py-2.5 text-sm outline-none focus:border-primary">
                        <option value="">구분 선택</option>
                        {categoryOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-foreground">적응증 *</label>
                        <input type="text" value={smoIndication} onChange={(e) => setSmoIndication(e.target.value)}
                          placeholder="예: 고혈압, 당뇨" className="mt-1 w-full rounded-lg border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground">임상시험 단계 *</label>
                        <select value={smoTrialPhase} onChange={(e) => setSmoTrialPhase(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-border px-4 py-2.5 text-sm outline-none focus:border-primary">
                          <option value="">선택</option>
                          {getTrialPhaseOptions(productCategory).map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground">실시기관 수 *</label>
                      <div className="mt-1 grid grid-cols-2 gap-2">
                        <input type="text" inputMode="numeric" value={smoSiteCount.capital} onChange={(e) => setSmoSiteCount({ ...smoSiteCount, capital: e.target.value.replace(/\D/g, "") })}
                          placeholder="수도권" className="w-full rounded-lg border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                        <input type="text" inputMode="numeric" value={smoSiteCount.local} onChange={(e) => setSmoSiteCount({ ...smoSiteCount, local: e.target.value.replace(/\D/g, "") })}
                          placeholder="지방" className="w-full rounded-lg border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground">기관 유형</label>
                      <div className="mt-2 flex flex-wrap gap-3">
                        {siteTypeOptions.map((opt) => (
                          <label key={opt.value} className="flex cursor-pointer items-center gap-2">
                            <input type="checkbox" checked={siteTypes.includes(opt.value)}
                              onChange={() => setSiteTypes((prev) => prev.includes(opt.value) ? prev.filter((v) => v !== opt.value) : [...prev, opt.value])}
                              className="h-4 w-4 rounded border-border accent-primary" />
                            <span className="text-sm text-foreground/70">{opt.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-foreground">목표 대상자 수 *</label>
                        <input type="text" inputMode="numeric" value={smoSubjectCount} onChange={(e) => setSmoSubjectCount(e.target.value.replace(/\D/g, ""))}
                          placeholder="예: 200" className="mt-1 w-full rounded-lg border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground">예상 등록 기간 (개월) *</label>
                        <input type="text" inputMode="numeric" value={smoEnrollmentPeriod} onChange={(e) => setSmoEnrollmentPeriod(e.target.value.replace(/\D/g, ""))}
                          placeholder="예: 12" className="mt-1 w-full rounded-lg border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground">예상 CRC 투입 인원</label>
                      <input type="text" inputMode="numeric" value={crcCount} onChange={(e) => setCrcCount(e.target.value.replace(/\D/g, ""))}
                        placeholder="예: 5" className="mt-1 w-full max-w-xs rounded-lg border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                    </div>
                  </>
                ) : serviceType === "insurance" ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-foreground">구분 *</label>
                      <select value={productCategory} onChange={(e) => { setProductCategory(e.target.value); setInsTrialPhase(""); }}
                        className="mt-1 w-full rounded-lg border border-border px-4 py-2.5 text-sm outline-none focus:border-primary">
                        <option value="">구분 선택</option>
                        {categoryOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-foreground">임상시험 단계 *</label>
                        <select value={insTrialPhase} onChange={(e) => setInsTrialPhase(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-border px-4 py-2.5 text-sm outline-none focus:border-primary">
                          <option value="">선택</option>
                          {getTrialPhaseOptions(productCategory).map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground">적응증 *</label>
                        <input type="text" value={insIndication} onChange={(e) => setInsIndication(e.target.value)}
                          placeholder="예: 고혈압" className="mt-1 w-full rounded-lg border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-foreground">시험 대상자 수 *</label>
                        <input type="text" inputMode="numeric" value={insSubjectCount} onChange={(e) => setInsSubjectCount(e.target.value.replace(/\D/g, ""))}
                          placeholder="예: 100" className="mt-1 w-full rounded-lg border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground">대상자 유형 *</label>
                        <div className="mt-2 flex gap-4">
                          {subjectTypeOptions.map((opt) => (
                            <label key={opt.value} className="flex cursor-pointer items-center gap-1.5">
                              <input type="radio" name="subjectType" checked={subjectType === opt.value} onChange={() => setSubjectType(opt.value)} className="h-4 w-4 accent-primary" />
                              <span className="text-sm text-foreground/70">{opt.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground">계약자 *</label>
                      <div className="mt-2 flex gap-4">
                        {[{ value: "individual", label: "개인" }, { value: "corporation", label: "법인" }].map((opt) => (
                          <label key={opt.value} className="flex cursor-pointer items-center gap-1.5">
                            <input type="radio" name="insContractorType" checked={insContractorType === opt.value} onChange={() => { setInsContractorType(opt.value); setInsContractorId(""); }} className="h-4 w-4 accent-primary" />
                            <span className="text-sm text-foreground/70">{opt.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    {insContractorType && (
                      <div>
                        <label className="block text-sm font-medium text-foreground">
                          {insContractorType === "individual" ? "주민등록번호" : "사업자등록번호"} *
                        </label>
                        <input type="text" inputMode="numeric" value={insContractorId}
                          onChange={(e) => {
                            const digits = e.target.value.replace(/\D/g, "");
                            if (insContractorType === "individual") {
                              const d = digits.slice(0, 13);
                              setInsContractorId(d.length <= 6 ? d : `${d.slice(0, 6)}-${d.slice(6)}`);
                            } else {
                              const d = digits.slice(0, 10);
                              if (d.length <= 3) setInsContractorId(d);
                              else if (d.length <= 5) setInsContractorId(`${d.slice(0, 3)}-${d.slice(3)}`);
                              else setInsContractorId(`${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`);
                            }
                          }}
                          placeholder={insContractorType === "individual" ? "000000-0000000" : "000-00-00000"}
                          maxLength={insContractorType === "individual" ? 14 : 12}
                          className="mt-1 w-full max-w-xs rounded-lg border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                        <p className="mt-1 text-xs text-amber-600">※ 보험사 견적 산출을 위한 필수 정보입니다.</p>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-foreground">실시기관명 *</label>
                      <input type="text" value={insSiteNames} onChange={(e) => setInsSiteNames(e.target.value)}
                        placeholder="예: 서울대학교병원, 연세대학교 세브란스병원" className="mt-1 w-full rounded-lg border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                      <p className="mt-1 text-xs text-foreground/40">여러 기관은 쉼표(,)로 구분해주세요</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground">예상 보험 기간 (개월) *</label>
                      <input type="text" inputMode="numeric" value={insurancePeriod} onChange={(e) => setInsurancePeriod(e.target.value.replace(/\D/g, ""))}
                        placeholder="예: 24" className="mt-1 w-full max-w-xs rounded-lg border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-foreground">보상 한도 (1인당)</label>
                        <input type="text" inputMode="numeric" value={compensationPerPerson} onChange={(e) => setCompensationPerPerson(e.target.value.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ","))}
                          placeholder="예: 100,000,000" className="mt-1 w-full rounded-lg border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground">보상 한도 (총)</label>
                        <input type="text" inputMode="numeric" value={compensationTotal} onChange={(e) => setCompensationTotal(e.target.value.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ","))}
                          placeholder="예: 1,000,000,000" className="mt-1 w-full rounded-lg border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground">선호 보험사 <span className="text-xs font-normal text-foreground/40">(최대 2개)</span></label>
                      <div className="mt-2 flex flex-wrap gap-3">
                        {insurerOptions.map((ins) => (
                          <label key={ins} className="flex cursor-pointer items-center gap-2">
                            <input type="checkbox" checked={preferredInsurers.includes(ins)}
                              disabled={!preferredInsurers.includes(ins) && preferredInsurers.length >= 2}
                              onChange={() => setPreferredInsurers((prev) => prev.includes(ins) ? prev.filter((i) => i !== ins) : [...prev, ins])}
                              className="h-4 w-4 rounded border-border accent-primary disabled:opacity-30" />
                            <span className={`text-sm ${!preferredInsurers.includes(ins) && preferredInsurers.length >= 2 ? "text-foreground/30" : "text-foreground/70"}`}>{ins}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </>
                ) : serviceType === "ra" ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-foreground">구분 *</label>
                      <select value={productCategory} onChange={(e) => { setProductCategory(e.target.value); setRaDeviceGrade(""); setPhase(""); setRaDrugType(""); setTasks([]); setTaskDetails({}); }}
                        className="mt-1 w-full rounded-lg border border-border px-4 py-2.5 text-sm outline-none focus:border-primary">
                        <option value="">구분 선택</option>
                        {categoryOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                    </div>
                    {productCategory === "medical-device" && (
                      <div>
                        <label className="block text-sm font-medium text-foreground">등급 *</label>
                        <select value={raDeviceGrade} onChange={(e) => setRaDeviceGrade(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-border px-4 py-2.5 text-sm outline-none focus:border-primary">
                          <option value="">등급 선택</option>
                          <option value="1등급">1등급</option>
                          <option value="2등급">2등급</option>
                          <option value="3등급">3등급</option>
                          <option value="4등급">4등급</option>
                        </select>
                      </div>
                    )}
                    {productCategory === "pharmaceutical" && (
                      <div>
                        <label className="block text-sm font-medium text-foreground">의약품 유형 *</label>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {raDrugTypeOptions.map((opt) => (
                            <button key={opt.value} type="button" onClick={() => setRaDrugType(opt.value)}
                              className={`rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                                raDrugType === opt.value ? "border-primary bg-primary/5 text-primary" : "border-border text-foreground/60 hover:border-foreground/30"
                              }`}>
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-foreground">단계 *</label>
                      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {getRaPhaseOptions(productCategory).map((opt) => (
                          <button key={opt.value} type="button" onClick={() => setPhase(opt.value)}
                            className={`rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                              phase === opt.value ? "border-primary bg-primary/5 text-primary" : "border-border text-foreground/60 hover:border-foreground/30"
                            }`}>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground">제품 정보 *</label>
                      <textarea value={raProductInfo} onChange={(e) => setRaProductInfo(e.target.value)}
                        rows={3} placeholder="제품명, 품목분류, 제품 특성 등을 입력해주세요"
                        className="mt-1 w-full resize-none rounded-lg border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                    </div>
                  </>
                ) : serviceType === "supply" ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-foreground">공급 유형 *</label>
                      <select value={supplyType} onChange={(e) => { setSupplyType(e.target.value); if (e.target.value !== "print") setTasks((prev) => prev.filter((t) => t !== "인쇄물 제작 (ICF/CRF/라벨/스티커 등)")); }}
                        className="mt-1 w-full rounded-lg border border-border px-4 py-2.5 text-sm outline-none focus:border-primary">
                        <option value="">유형 선택</option>
                        {supplyTypeOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-foreground">납품 수량 *</label>
                        <input type="text" value={supplyQty} onChange={(e) => setSupplyQty(e.target.value)}
                          placeholder="예: 500세트" className="mt-1 w-full rounded-lg border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground">납품 희망일</label>
                        <div className="relative mt-1">
                          <button type="button" className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-primary"
                            onClick={() => { const el = document.getElementById("supplyDeliveryDateInput") as HTMLInputElement; el?.showPicker?.(); el?.focus(); }}>
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" /></svg>
                          </button>
                          <input type="date" id="supplyDeliveryDateInput" value={supplyDeliveryDate} onChange={(e) => setSupplyDeliveryDate(e.target.value)}
                            min={new Date().toISOString().split("T")[0]}
                            className="w-full cursor-pointer rounded-lg border border-border py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                            onClick={(e) => { (e.target as HTMLInputElement).showPicker?.(); }} />
                          {supplyDeliveryDate && (
                            <p className="mt-1 text-xs text-foreground/50">선택된 날짜: {new Date(supplyDeliveryDate + "T00:00:00").toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" })}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground">납품 방식</label>
                      <div className="mt-2 flex gap-4">
                        {supplyDeliveryOptions.map((opt) => (
                          <label key={opt.value} className="flex cursor-pointer items-center gap-1.5">
                            <input type="radio" name="supplyDelivery" checked={supplyDeliveryMethod === opt.value} onChange={() => setSupplyDeliveryMethod(opt.value)} className="h-4 w-4 accent-primary" />
                            <span className="text-sm text-foreground/70">{opt.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    {supplyType === "print" && (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-foreground">임상코드번호</label>
                            <input type="text" value={printClinicalCode} onChange={(e) => setPrintClinicalCode(e.target.value)}
                              placeholder="예: 1706CLG013" className="mt-1 w-full rounded-lg border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-foreground">해당 기관</label>
                            <input type="text" value={printSites} onChange={(e) => setPrintSites(e.target.value)}
                              placeholder="예: 서울대병원, 세브란스병원" className="mt-1 w-full rounded-lg border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground">인쇄 품목 <span className="text-xs font-normal text-foreground/40">(복수 선택 가능)</span></label>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {printItemOptions.map((item) => (
                              <button key={item} type="button"
                                onClick={() => setPrintItems((prev) => prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item])}
                                className={`rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                                  printItems.includes(item) ? "border-primary bg-primary/5 text-primary" : "border-border text-foreground/60 hover:border-foreground/30"
                                }`}>
                                {item}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                    {supplyType && (
                      <div>
                        <label className="block text-sm font-medium text-foreground">배송 장소</label>
                        <div className="mt-1 flex gap-2">
                          <input type="text" value={printDeliveryAddress} onChange={(e) => setPrintDeliveryAddress(e.target.value)}
                            placeholder="주소 검색을 눌러 주소를 입력하세요" className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                          <button type="button" onClick={openAddressSearch}
                            className="flex-shrink-0 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground/70 transition-colors hover:bg-muted">
                            주소 검색
                          </button>
                        </div>
                        <p className="mt-1 text-xs text-foreground/40">주소 검색 후 건물명·층·호수 등 상세주소를 이어서 입력할 수 있습니다.</p>
                      </div>
                    )}
                  </>
                ) : serviceType === "marketing" ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-foreground">마케팅 유형 *</label>
                      <select value={mktType} onChange={(e) => { setMktType(e.target.value); setTasks([]); }}
                        className="mt-1 w-full rounded-lg border border-border px-4 py-2.5 text-sm outline-none focus:border-primary">
                        <option value="">유형 선택</option>
                        {marketingTypeOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground">성분명 *</label>
                      <input type="text" value={mktIngredientName} onChange={(e) => setMktProductName(e.target.value)}
                        placeholder="예: Amlodipine" className="mt-1 w-full rounded-lg border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                    </div>
                    {(mktType === "symposium" || mktType === "booth") && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-foreground">행사명 *</label>
                          <input type="text" value={mktEventName} onChange={(e) => setMktEventName(e.target.value)}
                            placeholder="예: 2026 MachKhan Symposium" className="mt-1 w-full rounded-lg border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-foreground">행사 희망 일정</label>
                            <input type="text" value={mktEventDate} onChange={(e) => setMktEventDate(e.target.value)}
                              placeholder="예: 2026년 5월 중" className="mt-1 w-full rounded-lg border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-foreground">예상 참석자 수 *</label>
                            <input type="text" inputMode="numeric" value={mktAttendees} onChange={(e) => setMktAttendees(e.target.value.replace(/\D/g, ""))}
                              placeholder="예: 50" className="mt-1 w-full rounded-lg border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground">희망 장소/지역</label>
                          <input type="text" value={mktVenue} onChange={(e) => setMktVenue(e.target.value)}
                            placeholder="예: 서울 강남권 호텔" className="mt-1 w-full rounded-lg border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-foreground">숙박 필요 여부</label>
                            <div className="mt-2 flex gap-4">
                              {[{ value: "yes", label: "필요" }, { value: "no", label: "불필요" }].map((opt) => (
                                <label key={opt.value} className="flex cursor-pointer items-center gap-1.5">
                                  <input type="radio" name="mktNeedStay" checked={mktNeedStay === opt.value} onChange={() => setMktNeedStay(opt.value)} className="h-4 w-4 accent-primary" />
                                  <span className="text-sm text-foreground/70">{opt.label}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-foreground">F&B 필요 여부</label>
                            <div className="mt-2 flex gap-4">
                              {[{ value: "yes", label: "필요" }, { value: "no", label: "불필요" }].map((opt) => (
                                <label key={opt.value} className="flex cursor-pointer items-center gap-1.5">
                                  <input type="radio" name="mktNeedFnb" checked={mktNeedFnb === opt.value} onChange={() => setMktNeedFnb(opt.value)} className="h-4 w-4 accent-primary" />
                                  <span className="text-sm text-foreground/70">{opt.label}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-foreground">구분 *</label>
                    <select value={productCategory} onChange={(e) => { setProductCategory(e.target.value); setTrialPhase(""); }}
                      className="mt-1 w-full rounded-lg border border-border px-4 py-2.5 text-sm outline-none focus:border-primary">
                      <option value="">구분 선택</option>
                      {categoryOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  </div>
                )}

                {serviceType !== "cro" && serviceType !== "cmo-cdmo" && serviceType !== "smo" && serviceType !== "insurance" && serviceType !== "ra" && serviceType !== "supply" && serviceType !== "marketing" && (
                  <div>
                    <label className="block text-sm font-medium text-foreground">단계 *</label>
                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {phaseOptions.map((opt) => (
                        <button key={opt.value} onClick={() => setPhase(opt.value)}
                          className={`rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                            phase === opt.value ? "border-primary bg-primary/5 text-primary" : "border-border text-foreground/60 hover:border-foreground/30"
                          }`}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* CRO 선택 시 임상시험 필드 */}
                {serviceType === "cro" && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-foreground">적응증 *</label>
                        <input type="text" value={indication} onChange={(e) => setIndication(e.target.value)}
                          placeholder="예: 고혈압, 불면증" className="mt-1 w-full rounded-lg border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground">임상시험 단계 *</label>
                        <select value={trialPhase} onChange={(e) => setTrialPhase(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-border px-4 py-2.5 text-sm outline-none focus:border-primary">
                          <option value="">선택</option>
                          {getTrialPhaseOptions(productCategory).map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-foreground">시험 대상자 수 *</label>
                        <input type="text" inputMode="numeric" value={subjectCount} onChange={(e) => setSubjectCount(e.target.value.replace(/\D/g, ""))}
                          placeholder="예: 100" className="mt-1 w-full rounded-lg border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground">실시기관 수 *</label>
                        <div className="mt-1 grid grid-cols-2 gap-2">
                          <input type="text" inputMode="numeric" value={siteCount.capital} onChange={(e) => setSiteCount({ ...siteCount, capital: e.target.value.replace(/\D/g, "") })}
                            placeholder="수도권" className="w-full rounded-lg border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                          <input type="text" inputMode="numeric" value={siteCount.local} onChange={(e) => setSiteCount({ ...siteCount, local: e.target.value.replace(/\D/g, "") })}
                            placeholder="지방" className="w-full rounded-lg border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-foreground">대상자 등록 기간 (개월) *</label>
                        <input type="text" inputMode="numeric" value={enrollmentPeriod} onChange={(e) => setEnrollmentPeriod(e.target.value.replace(/\D/g, ""))}
                          placeholder="예: 18" className="mt-1 w-full rounded-lg border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground">치료 및 추적관찰 기간 (개월) *</label>
                        <input type="text" inputMode="numeric" value={treatmentPeriod} onChange={(e) => setTreatmentPeriod(e.target.value.replace(/\D/g, ""))}
                          placeholder="예: 6" className="mt-1 w-full rounded-lg border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-foreground">CRF 유형</label>
                        <div className="mt-2 flex gap-4">
                          {["eCRF", "pCRF", "N/A"].map((t) => (
                            <label key={t} className="flex cursor-pointer items-center gap-1.5">
                              <input type="radio" name="crfType" checked={crfType === t} onChange={() => setCrfType(t)} className="h-4 w-4 accent-primary" />
                              <span className="text-sm text-foreground/70">{t}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground">CRF 페이지 수</label>
                        <input type="text" inputMode="numeric" value={crfPages} onChange={(e) => setCrfPages(e.target.value.replace(/\D/g, ""))}
                          placeholder="예: 35" className="mt-1 w-full rounded-lg border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                      </div>
                    </div>
                  </>
                )}

                {/* 위탁업무 - 제일 하단 (보험 제외) */}
                {serviceType !== "insurance" && <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-foreground">위탁업무 *</label>
                    <label className="flex cursor-pointer items-center gap-1.5">
                      <input type="checkbox"
                        checked={(() => { const opts = serviceType === "cro" ? croTaskOptions : serviceType === "cmo-cdmo" ? cmoTaskOptions : serviceType === "smo" ? smoTaskOptions : serviceType === "insurance" ? insuranceTaskOptions : serviceType === "ra" ? (productCategory === "pharmaceutical" ? raPharmTaskOptions : raDeviceTaskOptions) : serviceType === "supply" ? supplyTasks : serviceType === "marketing" ? marketingTasksFor(mktType) : generalTaskOptions; return opts.length > 0 && opts.every((t) => tasks.includes(t)); })()}
                        onChange={() => { const opts = serviceType === "cro" ? croTaskOptions : serviceType === "cmo-cdmo" ? cmoTaskOptions : serviceType === "smo" ? smoTaskOptions : serviceType === "insurance" ? insuranceTaskOptions : serviceType === "ra" ? (productCategory === "pharmaceutical" ? raPharmTaskOptions : raDeviceTaskOptions) : serviceType === "supply" ? supplyTasks : serviceType === "marketing" ? marketingTasksFor(mktType) : generalTaskOptions; const allSelected = opts.every((t) => tasks.includes(t)); setTasks(allSelected ? tasks.filter((t) => !opts.includes(t)) : [...new Set([...tasks, ...opts])]); }}
                        className="h-4 w-4 rounded border-border accent-primary" />
                      <span className="text-xs font-medium text-primary">전체 선택</span>
                    </label>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {(serviceType === "cro" ? croTaskOptions : serviceType === "cmo-cdmo" ? cmoTaskOptions : serviceType === "smo" ? smoTaskOptions : serviceType === "insurance" ? insuranceTaskOptions : serviceType === "ra" ? (productCategory === "pharmaceutical" ? raPharmTaskOptions : raDeviceTaskOptions) : serviceType === "supply" ? supplyTasks : serviceType === "marketing" ? marketingTasksFor(mktType) : generalTaskOptions).map((task) => (
                      <label key={task} className="flex cursor-pointer items-center gap-2">
                        <input type="checkbox" checked={tasks.includes(task)} onChange={() => toggleTask(task)}
                          className="h-4 w-4 rounded border-border accent-primary" />
                        <span className="text-sm text-foreground/70">{task}</span>
                      </label>
                    ))}
                  </div>
                </div>}
              </div>
            </div>
          )}

          {/* Step 3: 요구사항 */}
          {step === 3 && (
            <div>
              <h2 className="text-lg font-bold text-foreground">세부 요구사항</h2>
              <p className="mt-1 text-sm text-foreground/50">프로젝트의 세부 요구사항을 입력해주세요</p>
              <p className="mt-1 text-xs text-red-400">* 표시는 필수 입력 항목입니다</p>
              <div className="mt-6 space-y-5">
                {/* 위탁업무 세부 항목 */}
                {tasks.filter((t) => ({ ...taskDetailOptions, ...cmoTaskDetailOptions, ...smoTaskDetailOptions, ...(productCategory === "pharmaceutical" ? raPharmTaskDetailOptions : raDeviceTaskDetailOptions) })[t]).length > 0 && (
                  <div>
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block text-sm font-medium text-foreground">위탁업무 세부 선택</label>
                        <p className="mt-0.5 text-xs text-foreground/40">선택한 위탁업무의 세부 항목을 체크해주세요</p>
                      </div>
                      <label className="flex cursor-pointer items-center gap-1.5">
                        <input type="checkbox"
                          checked={(() => {
                            const allOpts = { ...taskDetailOptions, ...cmoTaskDetailOptions, ...smoTaskDetailOptions, ...(productCategory === "pharmaceutical" ? raPharmTaskDetailOptions : raDeviceTaskDetailOptions) };
                            const relevantTasks = tasks.filter((t) => allOpts[t]);
                            return relevantTasks.length > 0 && relevantTasks.every((t) => { const opts = allOpts[t] || []; return opts.every((o) => (taskDetails[t] || []).includes(o)); });
                          })()}
                          onChange={() => {
                            const allOpts = { ...taskDetailOptions, ...cmoTaskDetailOptions, ...smoTaskDetailOptions, ...(productCategory === "pharmaceutical" ? raPharmTaskDetailOptions : raDeviceTaskDetailOptions) };
                            const relevantTasks = tasks.filter((t) => allOpts[t]);
                            const allSelected = relevantTasks.every((t) => { const opts = allOpts[t] || []; return opts.every((o) => (taskDetails[t] || []).includes(o)); });
                            const updated: Record<string, string[]> = { ...taskDetails };
                            relevantTasks.forEach((t) => { updated[t] = allSelected ? [] : [...(allOpts[t] || [])]; });
                            setTaskDetails(updated);
                          }}
                          className="h-4 w-4 rounded border-border accent-primary" />
                        <span className="text-xs font-medium text-primary">전체 선택</span>
                      </label>
                    </div>
                    <div className="mt-3 space-y-4">
                      {tasks.filter((t) => ({ ...taskDetailOptions, ...cmoTaskDetailOptions, ...smoTaskDetailOptions, ...(productCategory === "pharmaceutical" ? raPharmTaskDetailOptions : raDeviceTaskDetailOptions) })[t]).map((taskKey) => {
                        const options = ({ ...taskDetailOptions, ...cmoTaskDetailOptions, ...smoTaskDetailOptions, ...(productCategory === "pharmaceutical" ? raPharmTaskDetailOptions : raDeviceTaskDetailOptions) })[taskKey];
                        const selected = taskDetails[taskKey] || [];
                        const allSelected = options.length > 0 && options.every((o) => selected.includes(o));
                        return (
                          <div key={taskKey} className="rounded-xl border border-border p-4">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-semibold text-foreground">{taskKey}</h4>
                              <label className="flex cursor-pointer items-center gap-1.5">
                                <input type="checkbox" checked={allSelected} onChange={() => toggleAllDetails(taskKey)}
                                  className="h-4 w-4 rounded border-border accent-primary" />
                                <span className="text-xs font-medium text-primary">전체 선택</span>
                              </label>
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                              {options.map((detail) => (
                                <label key={detail} className="flex cursor-pointer items-center gap-2">
                                  <input type="checkbox" checked={selected.includes(detail)} onChange={() => toggleDetail(taskKey, detail)}
                                    className="h-4 w-4 rounded border-border accent-primary" />
                                  <span className="text-sm text-foreground/70">{detail}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {serviceType !== "insurance" && (
                  <div>
                    <label className="block text-sm font-medium text-foreground">예산 범위 *</label>
                    <select value={budget} onChange={(e) => setBudget(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-border px-4 py-2.5 text-sm outline-none focus:border-primary">
                      <option value="">예상 예산 범위 선택</option>
                      {budgetOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                )}
                {tasks.includes("모니터링") && (
                  <div>
                    <label className="block text-sm font-medium text-foreground">기관당 예측 모니터링 횟수</label>
                    <input type="text" inputMode="numeric" value={monitoringCount} onChange={(e) => setMonitoringCount(e.target.value.replace(/\D/g, ""))}
                      placeholder="예: 15" className="mt-1 w-full max-w-xs rounded-lg border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-foreground">우선순위 *</label>
                  <div className="mt-2 space-y-1">
                    {priorityOptions.map((opt) => (
                      <label key={opt.value} className="flex cursor-pointer items-center gap-2">
                        <input type="radio" name="priority" checked={priority === opt.value} onChange={() => setPriority(opt.value)}
                          className="h-4 w-4 accent-primary" />
                        <span className={`text-sm ${priority === opt.value ? "font-medium text-primary" : "text-foreground/60"}`}>{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground">희망 업무 시작일 *</label>
                  <div className="relative mt-1">
                    <button type="button" className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-primary"
                      onClick={() => { const el = document.getElementById("startDateInput") as HTMLInputElement; el?.showPicker?.(); el?.focus(); }}>
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" /></svg>
                    </button>
                    <input type="date" id="startDateInput" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      className="w-full cursor-pointer rounded-lg border border-border py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      onClick={(e) => { (e.target as HTMLInputElement).showPicker?.(); }} />
                    {startDate && (
                      <p className="mt-1 text-xs text-foreground/50">선택된 날짜: {new Date(startDate + "T00:00:00").toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" })}</p>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground">관련 파일 첨부{serviceType === "insurance" ? " *" : ""}</label>
                  {serviceType === "insurance" && (
                    <p className="mt-0.5 text-xs text-red-500">임상시험계획서 및 동의서 반드시 첨부 필요</p>
                  )}
                  <div className="mt-1">
                    {attachment ? (
                      <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <svg className="h-4 w-4 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" /></svg>
                          <span className="text-sm text-foreground/70">{attachment.name}</span>
                        </div>
                        <button onClick={() => setAttachment(null)} className="text-xs text-red-500 hover:underline">삭제</button>
                      </div>
                    ) : (
                      <label
                        className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border px-4 py-8 text-foreground/40 transition-colors hover:border-primary hover:text-primary"
                        onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-primary", "text-primary", "bg-primary/5"); }}
                        onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove("border-primary", "text-primary", "bg-primary/5"); }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.remove("border-primary", "text-primary", "bg-primary/5");
                          const file = e.dataTransfer.files?.[0];
                          if (!file) return;
                          if (file.size > 10 * 1024 * 1024) { alert("파일 크기는 10MB 이하만 가능합니다."); return; }
                          const reader = new FileReader();
                          reader.onload = () => setAttachment({ name: file.name, data: reader.result as string });
                          reader.readAsDataURL(file);
                        }}
                      >
                        <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
                        <span className="text-sm">파일을 드래그하거나 클릭하여 업로드</span>
                        <span className="text-xs">PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, JPG, PNG (최대 10MB)</span>
                        <input type="file" className="hidden" onChange={handleFileChange} accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.hwp" />
                      </label>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground">추가 요구사항</label>
                  <textarea value={additionalNotes} onChange={(e) => setAdditionalNotes(e.target.value)}
                    rows={3} placeholder="위에서 다루지 않은 특별한 요구사항이나 주의사항을 입력해주세요..."
                    className="mt-1 w-full resize-none rounded-lg border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: 검토 */}
          {step === 4 && (
            <div>
              <h2 className="text-lg font-bold text-foreground">견적 요청서 최종 검토</h2>
              <p className="mt-1 text-sm text-foreground/50">입력하신 정보를 확인하고 견적 요청을 제출하세요</p>
              <div className="mt-6 space-y-6">
                <div className="border-b border-border pb-4">
                  <h3 className="text-base font-bold text-foreground">서비스 유형</h3>
                  <p className="mt-1 text-sm text-foreground/70">{serviceTypes.find((s) => s.id === serviceType)?.label}</p>
                </div>
                <div className="border-b border-border pb-4">
                  <h3 className="text-base font-bold text-foreground">프로젝트 기본 정보</h3>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-foreground/40">프로젝트명</span><p className="font-medium text-foreground">{projectName}</p></div>
                    <div><span className="text-foreground/40">구분</span><p className="font-medium text-foreground">{serviceType === "cmo-cdmo" ? (cmoCategoryOptions.find((c) => c.value === cmoCategory)?.label || "-") : (categoryOptions.find((c) => c.value === productCategory)?.label || "-")}</p></div>
                    {["cro", "smo", "cmo-cdmo"].includes(serviceType) && trialPurpose && (
                      <div className="col-span-2"><span className="text-foreground/40">{serviceType === "cmo-cdmo" ? "의뢰 목적" : "임상시험 목적"}</span><p className="font-medium text-foreground">{trialPurpose}</p></div>
                    )}
                    {serviceType !== "cro" && serviceType !== "cmo-cdmo" && serviceType !== "smo" && serviceType !== "insurance" && (
                      <div><span className="text-foreground/40">단계</span><p className="font-medium text-foreground">{phaseOptions.find((p) => p.value === phase)?.label || "-"}</p></div>
                    )}
                    {serviceType !== "insurance" && tasks.length > 0 && (
                      <div className="col-span-2"><span className="text-foreground/40">위탁업무</span><p className="font-medium text-foreground">{tasks.join(", ")}</p>
                        {tasks.filter((t) => (taskDetails[t] || []).length > 0).length > 0 && (
                          <div className="mt-2 space-y-1">
                            {tasks.filter((t) => (taskDetails[t] || []).length > 0).map((t) => (
                              <p key={t} className="text-xs text-foreground/50">- {t}: {taskDetails[t].join(", ")}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {serviceType === "cro" && (
                    <div className="mt-4 rounded-lg bg-primary/5 p-4">
                      <h4 className="text-sm font-semibold text-foreground">임상시험 세부 정보</h4>
                      <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                        <div><span className="text-foreground/40">적응증</span><p className="font-medium text-foreground">{indication || "-"}</p></div>
                        <div><span className="text-foreground/40">임상시험 단계</span><p className="font-medium text-foreground">{trialPhase || "-"}</p></div>
                        <div><span className="text-foreground/40">대상자 수</span><p className="font-medium text-foreground">{subjectCount || "-"}명</p></div>
                        <div><span className="text-foreground/40">실시기관</span><p className="font-medium text-foreground">수도권 {siteCount.capital || 0} / 지방 {siteCount.local || 0}</p></div>
                        <div><span className="text-foreground/40">등록기간</span><p className="font-medium text-foreground">{enrollmentPeriod || "-"}개월</p></div>
                        <div><span className="text-foreground/40">치료/추적관찰</span><p className="font-medium text-foreground">{treatmentPeriod || "-"}개월</p></div>
                        <div><span className="text-foreground/40">CRF</span><p className="font-medium text-foreground">{crfType} / {crfPages || "-"}페이지</p></div>
                      </div>
                    </div>
                  )}
                  {serviceType === "smo" && (
                    <div className="mt-4 rounded-lg bg-primary/5 p-4">
                      <h4 className="text-sm font-semibold text-foreground">SMO 세부 정보</h4>
                      <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                        <div><span className="text-foreground/40">적응증</span><p className="font-medium text-foreground">{smoIndication || "-"}</p></div>
                        <div><span className="text-foreground/40">임상시험 단계</span><p className="font-medium text-foreground">{smoTrialPhase || "-"}</p></div>
                        <div><span className="text-foreground/40">실시기관</span><p className="font-medium text-foreground">수도권 {smoSiteCount.capital || 0} / 지방 {smoSiteCount.local || 0}</p></div>
                        <div><span className="text-foreground/40">기관 유형</span><p className="font-medium text-foreground">{siteTypes.map((v) => siteTypeOptions.find((o) => o.value === v)?.label).join(", ") || "-"}</p></div>
                        <div><span className="text-foreground/40">목표 대상자 수</span><p className="font-medium text-foreground">{smoSubjectCount || "-"}명</p></div>
                        <div><span className="text-foreground/40">예상 등록 기간</span><p className="font-medium text-foreground">{smoEnrollmentPeriod || "-"}개월</p></div>
                        {crcCount && <div><span className="text-foreground/40">CRC 투입 인원</span><p className="font-medium text-foreground">{crcCount}명</p></div>}
                      </div>
                    </div>
                  )}
                  {serviceType === "insurance" && (
                    <div className="mt-4 rounded-lg bg-primary/5 p-4">
                      <h4 className="text-sm font-semibold text-foreground">임상시험 보험 세부 정보</h4>
                      <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                        <div><span className="text-foreground/40">임상시험 단계</span><p className="font-medium text-foreground">{insTrialPhase || "-"}</p></div>
                        <div><span className="text-foreground/40">적응증</span><p className="font-medium text-foreground">{insIndication || "-"}</p></div>
                        <div><span className="text-foreground/40">대상자 수</span><p className="font-medium text-foreground">{insSubjectCount || "-"}명</p></div>
                        <div><span className="text-foreground/40">대상자 유형</span><p className="font-medium text-foreground">{subjectTypeOptions.find((o) => o.value === subjectType)?.label || "-"}</p></div>
                        <div className="col-span-2"><span className="text-foreground/40">실시기관명</span><p className="font-medium text-foreground">{insSiteNames || "-"}</p></div>
                        <div><span className="text-foreground/40">예상 보험 기간</span><p className="font-medium text-foreground">{insurancePeriod || "-"}개월</p></div>
                        {(compensationPerPerson || compensationTotal) && <div><span className="text-foreground/40">보상 한도</span><p className="font-medium text-foreground">1인당 {compensationPerPerson || "-"} / 총 {compensationTotal || "-"}</p></div>}
                        {insContractorType && <div><span className="text-foreground/40">계약자</span><p className="font-medium text-foreground">{insContractorType === "individual" ? "개인" : "법인"}</p></div>}
                        {insContractorId && <div><span className="text-foreground/40">{insContractorType === "individual" ? "주민등록번호" : "사업자등록번호"}</span><p className="font-medium text-foreground">{insContractorId}</p></div>}
                        {preferredInsurers.length > 0 && <div><span className="text-foreground/40">선호 보험사</span><p className="font-medium text-foreground">{preferredInsurers.join(", ")}</p></div>}
                      </div>
                    </div>
                  )}
                  {serviceType === "ra" && (
                    <div className="mt-4 rounded-lg bg-primary/5 p-4">
                      <h4 className="text-sm font-semibold text-foreground">RA/인허가 세부 정보</h4>
                      <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                        {raDeviceGrade && <div><span className="text-foreground/40">의료기기 등급</span><p className="font-medium text-foreground">{raDeviceGrade}</p></div>}
                        {raDrugType && <div><span className="text-foreground/40">의약품 유형</span><p className="font-medium text-foreground">{raDrugTypeOptions.find((o) => o.value === raDrugType)?.label || "-"}</p></div>}
                        {phase && <div><span className="text-foreground/40">단계</span><p className="font-medium text-foreground">{phaseOptions.find((p) => p.value === phase)?.label || "-"}</p></div>}
                        <div className="col-span-2"><span className="text-foreground/40">제품 정보</span><p className="font-medium text-foreground">{raProductInfo || "-"}</p></div>
                      </div>
                    </div>
                  )}
                  {serviceType === "supply" && (
                    <div className="mt-4 rounded-lg bg-primary/5 p-4">
                      <h4 className="text-sm font-semibold text-foreground">소모품 공급 세부 정보</h4>
                      <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                        <div><span className="text-foreground/40">공급 유형</span><p className="font-medium text-foreground">{supplyTypeOptions.find((o) => o.value === supplyType)?.label || "-"}</p></div>
                        <div><span className="text-foreground/40">납품 수량</span><p className="font-medium text-foreground">{supplyQty || "-"}</p></div>
                        {supplyDeliveryDate && <div><span className="text-foreground/40">납품 희망일</span><p className="font-medium text-foreground">{supplyDeliveryDate}</p></div>}
                        {supplyDeliveryMethod && <div><span className="text-foreground/40">납품 방식</span><p className="font-medium text-foreground">{supplyDeliveryOptions.find((o) => o.value === supplyDeliveryMethod)?.label || "-"}</p></div>}
                        {printClinicalCode && <div><span className="text-foreground/40">임상코드번호</span><p className="font-medium text-foreground">{printClinicalCode}</p></div>}
                        {printSites && <div><span className="text-foreground/40">해당 기관</span><p className="font-medium text-foreground">{printSites}</p></div>}
                        {printItems.length > 0 && <div className="col-span-2"><span className="text-foreground/40">인쇄 품목</span><p className="font-medium text-foreground">{printItems.join(", ")}</p></div>}
                        {printDeliveryAddress && <div className="col-span-2"><span className="text-foreground/40">배송 장소</span><p className="font-medium text-foreground">{printDeliveryAddress}</p></div>}
                      </div>
                    </div>
                  )}
                  {serviceType === "marketing" && (
                    <div className="mt-4 rounded-lg bg-primary/5 p-4">
                      <h4 className="text-sm font-semibold text-foreground">마케팅 대행 세부 정보</h4>
                      <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                        <div><span className="text-foreground/40">마케팅 유형</span><p className="font-medium text-foreground">{marketingTypeOptions.find((o) => o.value === mktType)?.label || "-"}</p></div>
                        <div><span className="text-foreground/40">성분명</span><p className="font-medium text-foreground">{mktIngredientName || "-"}</p></div>
                        {mktEventName && <div><span className="text-foreground/40">행사명</span><p className="font-medium text-foreground">{mktEventName}</p></div>}
                        {mktEventDate && <div><span className="text-foreground/40">행사 희망 일정</span><p className="font-medium text-foreground">{mktEventDate}</p></div>}
                        {mktAttendees && <div><span className="text-foreground/40">예상 참석자</span><p className="font-medium text-foreground">{mktAttendees}명</p></div>}
                        {mktVenue && <div><span className="text-foreground/40">희망 장소</span><p className="font-medium text-foreground">{mktVenue}</p></div>}
                        {mktNeedStay && <div><span className="text-foreground/40">숙박</span><p className="font-medium text-foreground">{mktNeedStay === "yes" ? "필요" : "불필요"}</p></div>}
                        {mktNeedFnb && <div><span className="text-foreground/40">F&B</span><p className="font-medium text-foreground">{mktNeedFnb === "yes" ? "필요" : "불필요"}</p></div>}
                      </div>
                    </div>
                  )}
                  {serviceType === "cmo-cdmo" && (
                    <div className="mt-4 rounded-lg bg-primary/5 p-4">
                      <h4 className="text-sm font-semibold text-foreground">CMO/CDMO 세부 정보</h4>
                      <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                        <div><span className="text-foreground/40">구분</span><p className="font-medium text-foreground">{cmoCategoryOptions.find((c) => c.value === cmoCategory)?.label || "-"}</p></div>
                        <div><span className="text-foreground/40">생산 단계</span><p className="font-medium text-foreground">{cmoPhaseOptions.find((p) => p.value === cmoPhase)?.label || "-"}</p></div>
                        <div><span className="text-foreground/40">제형</span><p className="font-medium text-foreground">{formulationOptions.find((f) => f.value === formulation)?.label || "-"}</p></div>
                        <div><span className="text-foreground/40">Batch 수 / 생산 규모</span><p className="font-medium text-foreground">{batchCount || "-"}회 / {productionVolume || "-"}</p></div>
                        {gmpRequirements.length > 0 && (
                          <div className="col-span-2"><span className="text-foreground/40">GMP 인증</span><p className="font-medium text-foreground">{gmpRequirements.join(", ")}</p></div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">세부 요구사항</h3>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-foreground/40">예산 범위</span><p className="font-medium text-foreground">{budget}</p></div>
                    <div><span className="text-foreground/40">우선순위</span><p className="font-medium text-foreground">{priorityOptions.find((p) => p.value === priority)?.label}</p></div>
                    <div><span className="text-foreground/40">희망 업무 시작일</span><p className="font-medium text-foreground">{new Date(startDate + "T00:00:00").toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}</p></div>
                  </div>
                  {attachment && (
                    <div className="mt-3 flex items-center gap-2 text-sm">
                      <svg className="h-4 w-4 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" /></svg>
                      <span className="text-foreground/70">{attachment.name}</span>
                    </div>
                  )}
                  {additionalNotes && (
                    <div className="mt-3"><span className="text-sm text-foreground/40">추가 요구사항</span><p className="mt-0.5 text-sm text-foreground/70">{additionalNotes}</p></div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="mt-6 flex items-center justify-between">
          <div className="flex gap-2">
            {step > 1 && !(editRequestId && step <= 2) && (
              <button onClick={() => setStep(step - 1)}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-900">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                이전 단계
              </button>
            )}
            {step > 1 && (
              <button onClick={saveDraft}
                className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-amber-600 transition-colors hover:bg-amber-50">
                임시저장
              </button>
            )}
          </div>

          {step < 4 ? (
            <button onClick={handleNext}
              className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark">
              다음 단계
            </button>
          ) : (
            <button onClick={handleSubmit}
              className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
              {editRequestId ? "수정 완료" : "견적 요청 제출"}
            </button>
          )}
        </div>
      </div>

      {/* 임시저장 불러오기 모달 */}
      {showDraftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-foreground">임시저장된 의뢰서</h3>
            <p className="mt-2 text-sm text-foreground/60">이전에 작성 중이던 견적 요청서가 있습니다.</p>
            {pendingDraft && (() => {
              try {
                const d = JSON.parse(pendingDraft);
                return (
                  <div className="mt-3 rounded-lg bg-muted p-3 text-sm">
                    {d.projectName && <p className="font-medium text-foreground">{d.projectName}</p>}
                    {d.serviceType && <p className="mt-1 text-xs text-foreground/50">서비스: {serviceTypes.find((s) => s.id === d.serviceType)?.label || d.serviceType}</p>}
                  </div>
                );
              } catch { return null; }
            })()}
            <div className="mt-5 flex flex-col gap-2">
              <button onClick={() => {
                if (pendingDraft) applyFormData(JSON.parse(pendingDraft));
                setShowDraftModal(false);
                setPendingDraft(null);
              }} className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark">
                이어서 작성하기
              </button>
              <button onClick={() => {
                clearDraft();
                setShowDraftModal(false);
                setPendingDraft(null);
              }} className="w-full rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground/60 transition-colors hover:bg-muted">
                새로 작성하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
