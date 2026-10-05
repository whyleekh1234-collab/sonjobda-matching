"use client";

import { validateLicense, LICENSE_ACCEPT } from "@/lib/data/companyLicense";
import PasswordInput from "@/components/PasswordInput";
import { useState, useEffect, useRef, Suspense } from "react";
import { validateLogo } from "@/lib/data/companyLogo";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Building2, Handshake, Hospital } from "lucide-react";
import { getInviteByToken } from "@/lib/data/notices";
import type { PartnerCategory } from "@/types/auth";
import { toast } from "@/components/ui/Toast";

const partnerCategories: PartnerCategory[] = [
  "CRO",
  "CMO/CDMO",
  "SMO",
  "RA/인허가",
  "기업보험",
  "소모품 공급",
  "원료·첨가제 공급",
  "마케팅 대행",
];

export default function SignupPage() {
  return (
    <Suspense>
      <SignupContent />
    </Suspense>
  );
}

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signup } = useAuth();
  const [form, setForm] = useState({
    email: "",
    password: "",
    passwordConfirm: "",
    name: "",
    company: "",
    businessNumber: "",
    phone: "",
    address: "",
    roles: [] as ("client" | "partner")[],
    partnerCategories: [] as PartnerCategory[],
    // 기관 종류. 병원을 고르면 역할이 의뢰사 하나로 고정된다(phase30).
    orgType: "company" as "company" | "hospital",
    // 사업자 등록 형태. 국립대병원·재단·산학협력단은 고유번호를 쓰는데
    // 그 번호는 국세청 사업자등록 상태조회의 대상이 아니다(phase31).
    regDocType: "business" as "business" | "unique",
    agreeTerms: false,
    agreePrivacy: false,
    // 전자상거래법 제20조. 중개자라는 사실을 알리는 데 그치지 않고
    // 확인받은 기록을 남긴다.
    agreeBroker: false,
    agreeMarketing: false,
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteInfo, setInviteInfo] = useState<{ company: string; businessNumber: string; invitedBy: string; categories: string[]; needsLicense: boolean } | null>(null);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [logo, setLogo] = useState<File | null>(null);
  const [license, setLicense] = useState<File | null>(null);
  // 이메일 중복 확인. 주소를 고치면 다시 확인하게 null로 되돌린다 —
  // 확인해 둔 상태로 주소만 바꿔 제출하는 구멍을 막는다.
  const [emailOk, setEmailOk] = useState<boolean | null>(null);
  const [emailChecking, setEmailChecking] = useState(false);
  // 오류 문구는 폼 맨 위에 뜨는데 가입 버튼은 맨 아래에 있다. 눌러도
  // 화면 밖에서 뜨니 아무 반응이 없는 것처럼 보였다. 오류가 생기면
  // 그 자리로 데려간다.
  const errorRef = useRef<HTMLDivElement>(null);
  // 사업자등록번호 조회. 번호를 고치면 다시 조회하게 되돌린다.
  const [bizOk, setBizOk] = useState<boolean | null>(null);
  const [bizNote, setBizNote] = useState("");
  const [bizChecking, setBizChecking] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  // 마케팅 수신 안내는 접어 둔다. 늘 펼쳐 두면 가입 폼에서 가장 긴
  // 문단이 선택 항목 아래에 놓인다. 동의하기 전에 언제든 펼쳐 볼 수
  // 있으면 알려야 할 내용은 알린 것이다.
  const [showMarketingDetail, setShowMarketingDetail] = useState(false);

  // 쿼리 파라미터로 전달된 카테고리 미리 선택 / 초대 링크 처리
  useEffect(() => {
    const category = searchParams.get("category");
    if (category && partnerCategories.includes(category as PartnerCategory)) {
      setForm((prev) => ({
        ...prev,
        roles: prev.roles.includes("client") ? [...prev.roles, "partner"] : ["client", "partner"],
        partnerCategories: [category as PartnerCategory],
      }));
    }
    // 초대 링크에는 토큰이 들어 있다. 토큰으로만 회사 정보를 확인할 수
    // 있어서, 남의 이메일을 안다고 그 회사에 들어갈 수 없다.
    const token = searchParams.get("invite");
    if (token) {
      setInviteToken(token);
      getInviteByToken(token).then((invite) => {
        if (!invite) {
          setInviteToken(null);
          setError("초대 링크가 유효하지 않거나 만료되었습니다.");
          return;
        }
        setInviteInfo({
          company: invite.companyName,
          businessNumber: invite.businessNumber,
          invitedBy: invite.invitedByName,
          categories: invite.categories,
          needsLicense: invite.needsLicense,
        });
        // 운영자가 역할과 분야를 정해 보낸 초대라면 그대로 넣고 고르지
        // 못하게 한다. 닫아 둔 분야를 초대장으로만 여는 구조라, 여기서
        // 다시 고르게 하면 열어 둔 것과 다를 바 없다.
        const fixed = invite.roles.length > 0;
        setForm((prev) => ({
          ...prev,
          email: invite.email,
          company: invite.companyName,
          businessNumber: invite.businessNumber,
          ...(fixed && {
            roles: invite.roles.filter(
              (r): r is "client" | "partner" => r === "client" || r === "partner"
            ),
            partnerCategories: invite.categories as typeof prev.partnerCategories,
          }),
        }));
      });
    }
  }, [searchParams]);

  // 운영자가 역할과 분야를 정해 보낸 초대. 가입 화면에서 바꿀 수 없다.
  const fixedByInvite = !!inviteInfo && inviteInfo.categories.length > 0;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const target = e.target;
    const value = target instanceof HTMLInputElement && target.type === "checkbox"
      ? target.checked
      : target.value;
    setForm({ ...form, [target.name]: value });
    setError("");
  };

  // 기관 종류. 병원은 일을 맡기는 쪽으로만 들어오므로, 고르면 역할이
  // 의뢰사 하나로 고정되고 파트너 분야 칸이 닫힌다.
  const isHospital = form.orgType === "hospital";
  // 고유번호는 국세청에 조회할 수 없다. 조회 버튼을 띄우면 누를 때마다
  // "등록되지 않은 번호"가 나와 가입을 포기하게 된다.
  const usesUniqueNo = isHospital && form.regDocType === "unique";
  const regNoLabel = usesUniqueNo ? "고유번호" : "사업자등록번호";
  const regDocLabel = usesUniqueNo ? "고유번호증" : "사업자등록증";

  const toggleRole = (role: "client" | "partner") => {
    if (isHospital) return;
    setForm((prev) => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter((r) => r !== role)
        : [...prev.roles, role],
    }));
    setError("");
  };

  const pickHospital = () => {
    setForm((prev) =>
      prev.orgType === "hospital"
        ? { ...prev, orgType: "company", roles: [], regDocType: "business" }
        : { ...prev, orgType: "hospital", roles: ["client"], partnerCategories: [] }
    );
    setError("");
  };

  const formatBusinessNumber = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
  };

  const handleBusinessNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, businessNumber: formatBusinessNumber(e.target.value) });
    setError("");
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, phone: formatPhone(e.target.value) });
    setError("");
  };

  // 기업주소 검색 (카카오/다음 우편번호 서비스)
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
          setForm((prev) => ({ ...prev, address: data.roadAddress || data.address || data.jibunAddress }));
          setError("");
        },
      }).open();
    };
    if (w.daum?.Postcode) { run(); return; }
    const script = document.createElement("script");
    script.src = "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    script.onload = run;
    document.body.appendChild(script);
  };

  const validate = (): string | null => {
    if (form.roles.length === 0) return "회원 유형을 하나 이상 선택해주세요.";
    if (form.roles.includes("partner") && form.partnerCategories.length === 0) return "회사유형을 하나 이상 선택해주세요.";
    // 이메일
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) return "올바른 이메일 형식을 입력해주세요.";
    // 비밀번호: 8자 이상 + 영문/숫자/특수문자 중 2종 이상
    if (form.password.length < 8) return "비밀번호는 8자 이상이어야 합니다.";
    const types = [/[a-zA-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter((r) => r.test(form.password)).length;
    if (types < 2) return "비밀번호는 영문, 숫자, 특수문자 중 2종 이상 조합해주세요.";
    if (form.password !== form.passwordConfirm) return "비밀번호가 일치하지 않습니다.";
    // 담당자명: 2자 이상, 한글/영문만
    if (form.name.trim().length < 2) return "담당자명은 2자 이상 입력해주세요.";
    if (!/^[가-힣a-zA-Z\s]+$/.test(form.name.trim())) return "담당자명은 한글 또는 영문만 입력 가능합니다.";
    // 회사명: 2자 이상
    if (form.company.trim().length < 2) return "회사명은 2자 이상 입력해주세요.";
    // 사업자등록번호
    if (form.businessNumber.replace(/\D/g, "").length !== 10) return `${regNoLabel} 10자리를 입력해주세요.`;
    // 연락처
    const phoneDigits = form.phone.replace(/\D/g, "").length;
    if (phoneDigits < 10 || phoneDigits > 11) return "연락처를 정확히 입력해주세요.";
    if (!inviteInfo && emailOk !== true) return "이메일 중복확인을 해주세요.";
    if (!inviteInfo && bizOk === false) return `${regNoLabel}를 다시 확인해주세요.`;
    // 동료 초대라면 회사가 이미 냈다. 운영자가 만든 회사에는 아직 없으므로
    // 초대로 들어왔더라도 첫 사람이 올려야 한다.
    if ((!inviteInfo || inviteInfo.needsLicense) && !license) return `${regDocLabel}을 첨부해주세요.`;
    if (!form.agreeTerms) return "이용약관에 동의해주세요.";
    if (!form.agreePrivacy) return "개인정보처리방침에 동의해주세요.";
    if (!form.agreeBroker) return "통신판매중개자 고지를 확인해주세요.";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      setIsSubmitting(false);
      // setError 직후에는 아직 박스가 그려지지 않았을 수 있다. 다음 프레임에 옮긴다.
      requestAnimationFrame(() =>
        errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
      );
      return;
    }

    try {
      // 국세청에 등록된 번호인지, 폐업/휴업은 아닌지 확인한다.
      // 초대로 들어온 경우는 이미 등록된 회사라 다시 묻지 않는다.
      if (!inviteInfo) {
        const res = await fetch("/api/business-number", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ businessNumber: form.businessNumber }),
        });
        const check = await res.json();
        if (check.valid === false) {
          setError(check.message ?? "사업자등록번호를 확인해주세요.");
          setIsSubmitting(false);
          return;
        }
      }

      const { needsEmailConfirmation, licenseError } = await signup({
        email: form.email,
        password: form.password,
        name: form.name,
        company: form.company,
        businessNumber: form.businessNumber,
        phone: form.phone,
        address: form.address,
        roles: form.roles,
        orgType: form.orgType,
        regDocType: form.regDocType,
        ...(inviteToken && { inviteToken }),
        ...(form.partnerCategories.length > 0 && { partnerCategories: form.partnerCategories }),
        marketingConsent: form.agreeMarketing,
        logo,
        license,
      });
      if (licenseError) {
        // 계정은 이미 만들어졌으므로 가입을 되돌리지는 못한다. 운영자가
        // 승인 판단에 쓰는 서류라 없으면 심사가 막히니, 숨기지 않고 알린다.
        toast(`회원가입은 접수되었으나 사업자등록증을 올리지 못했습니다.

${licenseError}

고객센터로 서류를 보내주세요: contact@sonjobdamd.com`);
        router.push("/login");
        return;
      }
      // 초대로 들어왔더라도 승인을 거친다(phase29). 운영자가 초대를 보낼
      // 때 확인한 것은 사업자등록번호뿐이고, 사업자등록증은 지금 막 올라와
      // 아직 아무도 보지 않았다. 들어오는 문은 하나로 모은다.
      const waitsForApproval = true;
      toast(
        needsEmailConfirmation
          ? `회원가입이 접수되었습니다.\n\n1. 방금 보낸 메일의 링크를 눌러 이메일을 인증해주세요.\n2. ${waitsForApproval ? "관리자 승인 후 로그인할 수 있습니다." : "인증을 마치면 바로 로그인할 수 있습니다."}`
          : waitsForApproval
            ? "회원가입이 완료되었습니다. 관리자 승인 후 로그인할 수 있습니다."
            : "회원가입이 완료되었습니다. 바로 로그인하실 수 있습니다."
      );
      router.push("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "회원가입에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4 py-24">
      {/* 가입 양식은 입력칸이 많고 두 칸씩 나란히 놓는 줄도 있어 다른 인증
          화면보다 넓어야 읽힌다. 넓히는 것은 768px 이상에서만 적용한다 —
          그보다 좁은 화면에서는 화면 폭이 먼저 걸리므로 상한을 올려도
          달라지는 것이 없지만, 의도를 분명히 적어 둔다. */}
      <div className="w-full max-w-md md:max-w-xl">
        {/* 헤더 */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">회원가입</h1>
          <p className="mt-2 text-sm text-foreground/60">
            손잡다매칭에 가입하고 최적의 파트너를 만나보세요.
          </p>
        </div>

        {/* 회원가입 폼 */}
        <form
          onSubmit={handleSubmit}
          className="mt-8 rounded-2xl border border-border bg-background p-6 shadow-sm sm:p-8"
        >
          {error && (
            <div ref={errorRef} className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
              {error}
            </div>
          )}

          {/* 회원 유형 선택 (복수 선택 가능) */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground">
              회원 유형 * <span className="text-xs font-normal text-foreground/60">(복수 선택 가능)</span>
            </label>
            {fixedByInvite && (
              <p className="mt-2 rounded-lg bg-primary/5 px-3 py-2 text-xs text-primary">
                운영자가 정한 유형과 분야로 초대되었습니다. 이 가입에서는 바꿀 수 없습니다.
              </p>
            )}
            <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <button
                type="button"
                disabled={fixedByInvite || isHospital}
                onClick={() => !fixedByInvite && toggleRole("client")}
                className={`rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all ${
                  form.roles.includes("client")
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-foreground/60 hover:border-foreground/30"
                }`}
              >
                <Building2 className="mx-auto h-6 w-6" strokeWidth={1.75} />
                <span className="mt-1.5 block">의뢰사</span>
                <span className="mt-1 block text-xs font-normal text-foreground/60">파트너를 찾고 있어요</span>
              </button>
              <button
                type="button"
                disabled={fixedByInvite || isHospital}
                onClick={() => !fixedByInvite && toggleRole("partner")}
                className={`rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all ${
                  form.roles.includes("partner")
                    ? "border-secondary bg-secondary/5 text-secondary"
                    : "border-border text-foreground/60 hover:border-foreground/30"
                }`}
              >
                <Handshake className="mx-auto h-6 w-6" strokeWidth={1.75} />
                <span className="mt-1.5 block">파트너사</span>
                <span className="mt-1 block text-xs font-normal text-foreground/60">프로젝트를 수주하고 싶어요</span>
              </button>

              {/* 병원은 의뢰사의 한 종류다. 화면에서는 나란히 보이지만
                  고르면 역할은 의뢰사 하나로 정해진다 — 병원이 임상시험을
                  수탁하는 쪽으로 들어올 일은 없다. */}
              <button
                type="button"
                disabled={fixedByInvite}
                onClick={() => !fixedByInvite && pickHospital()}
                className={`rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all ${
                  isHospital
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-foreground/60 hover:border-foreground/30"
                }`}
              >
                <Hospital className="mx-auto h-6 w-6" strokeWidth={1.75} />
                <span className="mt-1.5 block">병원 · 기관</span>
                <span className="mt-1 block text-xs font-normal text-foreground/60">의뢰사로만 가입합니다</span>
              </button>
            </div>
            {isHospital && (
              <p className="mt-2 rounded-lg bg-primary/5 px-3 py-2 text-xs text-primary">
                병원·기관은 일을 맡기는 쪽으로만 가입합니다. 파트너사 분야는 고르지 않습니다.
              </p>
            )}
            {form.roles.includes("partner") && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-foreground">
                  회사유형 * <span className="text-xs font-normal text-foreground/60">(복수 선택 가능)</span>
                </label>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {partnerCategories.map((cat) => {
                    // 기업보험은 스스로 가입하지 못한다 — 운영자 초대로만 들어온다.
                    // 그 초대로 들어온 경우에는 이미 정해진 값이라 역시 못 바꾼다.
                    const isBlocked = cat === "기업보험" || fixedByInvite;
                    return (
                    <button
                      key={cat}
                      type="button"
                      disabled={isBlocked}
                      onClick={() => {
                        if (isBlocked) return;
                        setForm((prev) => ({
                          ...prev,
                          partnerCategories: prev.partnerCategories.includes(cat)
                            ? prev.partnerCategories.filter((c) => c !== cat)
                            : [...prev.partnerCategories, cat],
                        }));
                        setError("");
                      }}
                      // 고를 수 없더라도 이미 고른 것은 고른 것처럼 보여야
                      // 한다. 초대로 분야가 정해진 사람에게 회색으로 보이면
                      // 자기가 무슨 분야로 들어가는지 알 수 없다.
                      className={`rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                        form.partnerCategories.includes(cat)
                          ? "border-secondary bg-secondary/10 text-secondary"
                          : isBlocked
                          ? "border-border bg-foreground/5 text-foreground/50 cursor-not-allowed"
                          : "border-border text-foreground/60 hover:border-foreground/30"
                      }`}
                    >
                      {cat}
                    </button>
                    );
                  })}
                </div>
              </div>
            )}
            {form.roles.length === 2 && (
              <p className="mt-2 text-xs text-primary">
                의뢰사 + 파트너사 모두 선택되었습니다. 로그인 후 자유롭게 전환할 수 있어요.
              </p>
            )}
          </div>

          <div className="space-y-4">
            {/* 이메일 */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground">
                이메일 *
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  value={form.email}
                  onChange={(e) => { handleChange(e); setEmailOk(null); }}
                  readOnly={!!inviteInfo}
                  placeholder="example@company.com"
                  className={`w-full min-w-0 rounded-lg border border-border px-4 py-3 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary ${inviteInfo ? "bg-muted text-foreground/60" : "bg-background"}`}
                />
                {/* 초대로 들어온 경우 이메일이 고정이라 확인할 것이 없다. */}
                {!inviteInfo && (
                  <button
                    type="button"
                    disabled={emailChecking || !form.email.trim()}
                    onClick={async () => {
                      setEmailChecking(true);
                      setError("");
                      try {
                        const res = await fetch("/api/check-email", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ email: form.email }),
                        });
                        const data = await res.json().catch(() => ({}));
                        if (!res.ok) throw new Error(data.message ?? "확인하지 못했습니다.");
                        setEmailOk(data.available);
                        if (!data.available) setError("이미 가입된 이메일입니다. 이메일 찾기 또는 비밀번호 재설정을 이용해주세요.");
                      } catch (err) {
                        setEmailOk(null);
                        setError(err instanceof Error ? err.message : "확인하지 못했습니다.");
                      } finally {
                        setEmailChecking(false);
                      }
                    }}
                    className="shrink-0 whitespace-nowrap rounded-lg border border-border px-4 text-sm font-medium text-foreground/70 transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {emailChecking ? "확인 중..." : "중복확인"}
                  </button>
                )}
              </div>
              {emailOk === true && (
                <p className="mt-1 text-xs text-emerald-600">사용할 수 있는 이메일입니다.</p>
              )}
              {inviteInfo && (
                <p className="mt-1 text-xs text-primary">{inviteInfo.invitedBy}님이 {inviteInfo.company}으로 초대했습니다. 회사명과 사업자등록번호가 자동 입력되었습니다.</p>
              )}
            </div>

            {/* 비밀번호 */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground">
                비밀번호 *
              </label>
              <PasswordInput
                id="password"
                name="password"
                required
                value={form.password}
                onChange={handleChange}
                maxLength={12}
                placeholder="8~12자, 영문/숫자/특수문자 중 2종 이상"
                className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-foreground/60">영문, 숫자, 특수문자 중 2종 이상 조합</p>
            </div>

            {/* 비밀번호 확인 */}
            <div>
              <label htmlFor="passwordConfirm" className="block text-sm font-medium text-foreground">
                비밀번호 확인 *
              </label>
              <PasswordInput
                id="passwordConfirm"
                name="passwordConfirm"
                required
                value={form.passwordConfirm}
                onChange={handleChange}
                maxLength={12}
                placeholder="비밀번호를 다시 입력하세요"
                className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              />
              {form.passwordConfirm && form.password !== form.passwordConfirm && (
                <p className="mt-1 text-xs text-red-500">비밀번호가 일치하지 않습니다.</p>
              )}
            </div>

            {/* 이름 / 회사명 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-foreground">
                  담당자명 *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  value={form.name}
                  onChange={handleChange}
                  maxLength={6}
                  placeholder="홍길동"
                  className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label htmlFor="company" className="block text-sm font-medium text-foreground">
                  회사명 *
                </label>
                <input
                  type="text"
                  id="company"
                  name="company"
                  required
                  value={form.company}
                  onChange={handleChange}
                  readOnly={!!inviteInfo}
                  maxLength={20}
                  placeholder="(주) 회사명"
                  className={`mt-1 w-full rounded-lg border border-border px-4 py-3 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary ${inviteInfo ? "bg-muted text-foreground/60" : "bg-background"}`}
                />
              </div>
            </div>

            {/* 사업자 등록 형태. 병원·기관만 고른다 — 일반 기업은 사업자등록증
                뿐이라 물어볼 것이 없다. */}
            {isHospital && !inviteInfo && (
              <div>
                <label className="block text-sm font-medium text-foreground">
                  사업자 등록 형태 *
                </label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {([["business", "사업자등록증"], ["unique", "고유번호증"]] as const).map(([k, label]) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => {
                        setForm((prev) => ({ ...prev, regDocType: k, businessNumber: "" }));
                        setBizOk(null);
                        setBizNote("");
                        setError("");
                      }}
                      className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
                        form.regDocType === k
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border text-foreground/60 hover:border-foreground/30"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-xs text-foreground/60">
                  국립대병원·재단법인·산학협력단은 고유번호증을 쓰는 경우가 많습니다.
                </p>
              </div>
            )}

            {/* 사업자등록번호 또는 고유번호 */}
            <div>
              <label htmlFor="businessNumber" className="block text-sm font-medium text-foreground">
                {regNoLabel} *
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  type="text"
                  id="businessNumber"
                  name="businessNumber"
                  required
                  value={form.businessNumber}
                  onChange={(e) => { handleBusinessNumberChange(e); setBizOk(null); setBizNote(""); }}
                  readOnly={!!inviteInfo}
                  placeholder="000-00-00000"
                  maxLength={12}
                  className={`w-full min-w-0 rounded-lg border border-border px-4 py-3 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary ${inviteInfo ? "bg-muted text-foreground/60" : "bg-background"}`}
                />
                {/* 초대로 들어온 경우 회사가 이미 검증돼 있어 다시 묻지 않는다.
                    고유번호는 국세청 조회 대상이 아니라 버튼을 띄우지 않는다. */}
                {!inviteInfo && !usesUniqueNo && (
                  <button
                    type="button"
                    disabled={bizChecking || form.businessNumber.replace(/[^0-9]/g, "").length !== 10}
                    onClick={async () => {
                      setBizChecking(true);
                      setError("");
                      setBizNote("");
                      try {
                        const res = await fetch("/api/business-number", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ businessNumber: form.businessNumber }),
                        });
                        const d = await res.json();
                        if (d.valid === false) {
                          setBizOk(false);
                          setError(d.message ?? "국세청에 등록되지 않은 번호입니다.");
                          return;
                        }
                        if (d.skipped) {
                          // 키가 없으면 검증이 꺼진다. 통과한 것처럼 보이면 안 된다.
                          setBizOk(null);
                          setBizNote("국세청 조회가 설정되지 않아 확인할 수 없습니다. 관리자 승인 시 수동 확인됩니다.");
                          return;
                        }
                        if (d.registered) {
                          setBizOk(false);
                          setError(`이미 "${d.registered}"로 등록된 사업자등록번호입니다. 그 회사 담당 관리자의 초대 링크로 가입해주세요.`);
                          return;
                        }
                        setBizOk(true);
                        setBizNote(`${d.status}${d.taxType ? ` · ${d.taxType}` : ""}`);
                      } catch {
                        setBizOk(null);
                        setError("조회하지 못했습니다. 잠시 후 다시 시도해주세요.");
                      } finally {
                        setBizChecking(false);
                      }
                    }}
                    className="shrink-0 whitespace-nowrap rounded-lg border border-border px-4 text-sm font-medium text-foreground/70 transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {bizChecking ? "조회 중..." : "사업자 확인"}
                  </button>
                )}
              </div>
              {bizOk === true && bizNote && (
                <p className="mt-1 text-xs text-emerald-600">국세청 확인: {bizNote}</p>
              )}
              {bizOk === null && bizNote && (
                <p className="mt-1 text-xs text-amber-600">{bizNote}</p>
              )}
            </div>

            {/* 연락처 */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-foreground">
                연락처 *
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                required
                value={form.phone}
                onChange={handlePhoneChange}
                placeholder="010-0000-0000"
                maxLength={13}
                className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* 기업주소 (선택) */}
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-foreground">
                기업주소 <span className="text-xs font-normal text-foreground/60">(선택)</span>
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  placeholder="주소 검색을 눌러 주소를 입력하세요"
                  className="min-w-0 flex-1 rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={openAddressSearch}
                  className="shrink-0 whitespace-nowrap rounded-lg border border-border px-4 py-3 text-sm font-medium text-foreground/70 transition-colors hover:bg-muted"
                >
                  주소 검색
                </button>
              </div>
              <p className="mt-1 text-xs text-foreground/60">주소 검색 후 건물명·층·호수 등 상세주소를 이어서 입력할 수 있습니다.</p>
            </div>

            {/* 사업자등록증 (필수).
                사업자등록번호는 세금계산서·홈페이지에 적혀 있어 사실상 공개
                정보다. 번호만으로는 "그 회사 사람인지"를 가릴 수 없어 서류를
                함께 받는다. 동료 초대로 합류하는 멤버는 회사가 이미 냈으므로
                묻지 않는다 — 같은 서류를 사람 수만큼 쌓을 이유가 없다.

                다만 운영자가 만든 회사에는 아직 등록증이 없다. 그 초대로
                들어온 첫 사람에게는 받아야 한다. 묻기만 하고 올릴 칸을
                감추면 가입을 끝낼 길이 사라진다. */}
            {(!inviteInfo || inviteInfo.needsLicense) && (
              <div>
                <label className="block text-sm font-medium text-foreground">
                  {regDocLabel} <span className="text-xs font-normal text-primary">*</span>
                </label>
                <input type="file" accept={LICENSE_ACCEPT} id="license"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    if (!f) { setLicense(null); return; }
                    const err = validateLicense(f);
                    if (err) { setError(err); e.target.value = ""; setLicense(null); return; }
                    setLicense(f); setError("");
                  }}
                  className="mt-1 block w-full text-sm text-foreground/70 file:mr-3 file:rounded-lg file:border file:border-border file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground/70 hover:file:bg-muted" />
                {license && <p className="mt-1 text-xs text-emerald-600">{license.name}</p>}
                <p className="mt-1 text-xs text-foreground/50">
                  PDF·PNG·JPG, 5MB 이하. 사업자 확인 용도로만 쓰이며 운영자만 열람합니다.
                  회원 탈퇴 시 파기됩니다.
                </p>
              </div>
            )}

            {/* 회사 로고 (선택). 초대로 합류하는 멤버는 회사 로고가 이미 있으니 묻지 않는다. */}
            {!inviteInfo && (
              <div>
                <label className="block text-sm font-medium text-foreground">
                  회사 로고 <span className="text-xs font-normal text-foreground/60">(선택)</span>
                </label>
                <div className="mt-1 flex items-center gap-3">
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
                    {logoPreview
                      ? <img src={logoPreview} alt="로고 미리보기" className="h-full w-full object-contain" />
                      : <span className="text-lg font-bold text-foreground/50">{form.company.trim().charAt(0) || "로고"}</span>}
                  </div>
                  <div className="flex-1">
                    <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" id="logo"
                      onChange={(e) => {
                        const f = e.target.files?.[0] ?? null;
                        if (!f) { setLogo(null); setLogoPreview(null); return; }
                        const err = validateLogo(f);
                        if (err) { setError(err); e.target.value = ""; return; }
                        setLogo(f); setLogoPreview(URL.createObjectURL(f)); setError("");
                      }}
                      className="block w-full text-sm text-foreground/70 file:mr-3 file:rounded-lg file:border file:border-border file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground/70 hover:file:bg-muted" />
                    <p className="mt-1 text-xs text-foreground/60">PNG·JPG·WEBP·SVG, 2MB 이하. 견적 카드와 상단 바에 표시됩니다. 나중에 마이페이지에서도 올릴 수 있어요.</p>
                  </div>
                  {logo && (
                    <button type="button" onClick={() => { setLogo(null); setLogoPreview(null); }} className="text-xs text-foreground/50 hover:text-red-500">삭제</button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 약관 동의 */}
          <div className="mt-6 space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="agreeTerms"
                checked={form.agreeTerms}
                onChange={handleChange}
                className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
              />
              <span className="text-sm text-foreground/70">
                <a href="/terms" target="_blank" className="text-primary underline cursor-pointer hover:text-primary-dark">이용약관</a>에
                동의합니다. (필수)
              </span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="agreePrivacy"
                checked={form.agreePrivacy}
                onChange={handleChange}
                className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
              />
              <span className="text-sm text-foreground/70">
                <a href="/privacy" target="_blank" className="text-primary underline cursor-pointer hover:text-primary-dark">개인정보처리방침</a>에
                동의합니다. (필수)
              </span>
            </label>
            {/* 광고성 정보 수신 동의. 정보통신망법 제50조에 따라 선택이며,
                체크하지 않아도 가입은 그대로 진행된다. 승인 완료·견적 도착·
                매칭 성사 같은 안내 메일은 거래 이행에 필요한 것이라 이 동의와
                무관하게 발송된다 — 그 점을 아래에 밝혀둔다. */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="agreeMarketing"
                checked={form.agreeMarketing}
                onChange={handleChange}
                className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
              />
              <span className="text-sm text-foreground/70">
                마케팅 정보 수신에 동의합니다. <span className="text-foreground/60">(선택)</span>
              </span>
            </label>
            {/* 펼치기 단추는 label 바깥에 둔다. 안에 두면 누를 때 체크박스가
                함께 켜진다 — 안내를 읽으려다 동의하게 되는 셈이다. */}
            <button
              type="button"
              onClick={() => setShowMarketingDetail((v) => !v)}
              className="ml-7 w-fit text-xs text-foreground/60 underline underline-offset-2 transition-colors hover:text-primary"
            >
              {showMarketingDetail ? "안내 접기" : "무엇을 받게 되나요?"}
            </button>
            {showMarketingDetail && (
              <p className="ml-7 rounded-lg bg-muted px-3 py-2 text-xs leading-relaxed text-foreground/60">
                새로운 서비스와 이벤트 소식을 이메일로 보내드립니다. 동의하지 않아도
                가입할 수 있으며, 마이페이지에서 언제든 철회할 수 있습니다. 승인 완료,
                견적 도착, 매칭 성사 등 서비스 이용에 필요한 안내는 동의 여부와
                관계없이 발송됩니다.
              </p>
            )}
            <p className="ml-7 text-xs text-amber-600">
              ※ 매칭 성사 시 상대 업체에 회사명, 담당자명, 이메일, 연락처가 공개됩니다.
            </p>

            {/* 통신판매중개자 고지.
                전자상거래법 제20조 제1항은 중개자가 "자신이 거래의 당사자가
                아니라는 사실"을 미리 알리도록 한다. 푸터에도 적혀 있지만,
                계약이 성립하는 지점이 가입 시점이므로 여기서 한 번 더
                분명히 둔다. 거래 전에 알렸다는 사실이 중요하다. */}
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
              <input
                type="checkbox"
                name="agreeBroker"
                checked={form.agreeBroker}
                onChange={handleChange}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-primary"
              />
              <span className="text-xs leading-relaxed text-foreground/60">
                (주) 손잡다메디칼은 통신판매중개자로서 통신판매의 당사자가 아니며,
                위수탁사가 제공하는 서비스에 대한 이행, 계약사항 등과 관련한 의무와
                책임은 거래당사자에게 있습니다.
                <span className="ml-1 font-medium text-foreground/80">위 내용을 확인했습니다. (필수)</span>
              </span>
            </label>
          </div>

          {/* 버튼 바로 위에서 남은 할 일을 알린다. 맨 위 오류 박스까지
              올라가지 않아도 왜 안 되는지 알 수 있어야 한다. */}
          {(() => {
            // 초대로 들어오면 이메일은 이미 정해져 있어 중복확인이 없다.
            // 등록증은 회사에 아직 없을 때만 받는다.
            const needEmail = !inviteInfo && emailOk !== true;
            const needLicense = (!inviteInfo || inviteInfo.needsLicense) && !license;
            if (!needEmail && !needLicense) return null;
            return (
              <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                가입하려면 먼저{" "}
                {[needEmail && "이메일 중복확인", needLicense && `${regDocLabel} 첨부`]
                  .filter(Boolean)
                  .join(", ")}
                이(가) 필요합니다.
              </p>
            );
          })()}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-6 w-full rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "가입 처리 중..." : "회원가입"}
          </button>
        </form>

        {/* 로그인 링크 */}
        <p className="mt-6 text-center text-sm text-foreground/60">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
