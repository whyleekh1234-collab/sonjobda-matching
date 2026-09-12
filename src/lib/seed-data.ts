// 초기 테스트 데이터 시드
// localStorage에 데이터가 없을 때 자동으로 생성

const seedUsers = [
  {
    id: "client-001",
    memberCode: "SJ-C-00000001",
    email: "client@test.com",
    password: "test1234!",
    name: "김의뢰",
    company: "한국제약",
    businessNumber: "123-45-67890",
    phone: "010-1234-5678",
    roles: ["client"],
    activeRole: "client",
    status: "approved",
    isCompanyAdmin: true,
    createdAt: "2025-01-15T09:00:00.000Z",
  },
  {
    id: "partner-001",
    memberCode: "SJ-P-00000002",
    email: "partner@test.com",
    password: "test1234!",
    name: "이파트너",
    company: "메디CRO",
    businessNumber: "234-56-78901",
    phone: "010-2345-6789",
    roles: ["partner"],
    activeRole: "partner",
    partnerCategories: ["CRO"],
    status: "approved",
    isCompanyAdmin: true,
    createdAt: "2025-01-16T09:00:00.000Z",
  },
  {
    id: "partner-002",
    memberCode: "SJ-P-00000003",
    email: "partner2@test.com",
    password: "test1234!",
    name: "박파트너",
    company: "바이오CMO",
    businessNumber: "345-67-89012",
    phone: "010-3456-7890",
    roles: ["partner"],
    activeRole: "partner",
    partnerCategories: ["CMO/CDMO"],
    status: "approved",
    isCompanyAdmin: true,
    createdAt: "2025-01-17T09:00:00.000Z",
  },
  {
    id: "both-001",
    memberCode: "SJ-CP-00000004",
    email: "both@test.com",
    password: "test1234!",
    name: "최겸업",
    company: "올인원바이오",
    businessNumber: "456-78-90123",
    phone: "010-4567-8901",
    roles: ["client", "partner"],
    activeRole: "client",
    partnerCategories: ["CRO", "SMO"],
    status: "approved",
    isCompanyAdmin: true,
    createdAt: "2025-01-18T09:00:00.000Z",
  },
];

export function initSeedData() {
  if (typeof window === "undefined") return;

  const existingUsers = localStorage.getItem("sonjobda_users");
  if (!existingUsers || JSON.parse(existingUsers).length === 0) {
    localStorage.setItem("sonjobda_users", JSON.stringify(seedUsers));
  }
}
