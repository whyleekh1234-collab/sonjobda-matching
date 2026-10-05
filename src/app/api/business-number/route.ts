import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasAdminKey } from "@/lib/supabase/admin";

// 국세청 사업자등록번호 조회.
//
// 공공데이터포털의 "국세청 사업자등록정보 진위확인 및 상태조회" 중
// 상태조회(status)를 쓴다. 진위확인(validate)은 개업일자와 대표자명까지
// 요구하는데 회원가입 폼에 없는 정보다. 상태조회는 번호만으로 그 번호가
// 실제로 존재하는지, 폐업/휴업은 아닌지 알려준다. 가입 시점에 걸러야 할
// 것은 그 정도다.
//
// 키가 없으면 검증을 건너뛴다. 가입 자체를 막지는 않는다 — 국세청 API가
// 잠시 죽었다고 신규 가입이 막히면 그게 더 큰 문제다.

const ENDPOINT = "https://api.odcloud.kr/api/nts-businessman/v1/status";

interface NtsRow {
  b_no: string;
  b_stt: string;       // 계속사업자 / 휴업자 / 폐업자
  b_stt_cd: string;    // 01 / 02 / 03
  tax_type: string;
}

/** 앞 두 글자만 남긴다. 동료는 알아보고, 모르는 사람에게는 쓸모가 없다. */
function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"*".repeat(Math.max(local.length - visible.length, 1))}@${domain}`;
}

export async function POST(request: NextRequest) {
  let body: { businessNumber?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "잘못된 요청입니다." }, { status: 400 });
  }

  const digits = (body.businessNumber ?? "").replace(/[^0-9]/g, "");
  if (digits.length !== 10) {
    return NextResponse.json(
      { valid: false, message: "사업자등록번호 10자리를 입력해주세요." },
      { status: 400 }
    );
  }

  // trim이 필요하다. 환경변수를 대시보드에 붙여넣을 때 줄바꿈이나 공백이
  // 섞이기 쉬운데, 그대로 URL 인코딩하면 %0A가 붙어 다른 키가 된다.
  // 국세청은 그걸 "등록되지 않은 인증키"로 돌려줘, 키가 틀린 것처럼 보인다.
  const serviceKey = process.env.NTS_SERVICE_KEY?.trim();
  if (!serviceKey) {
    return NextResponse.json({
      skipped: true,
      message: "국세청 검증이 설정되지 않아 건너뜁니다.",
    });
  }

  let row: NtsRow | undefined;
  try {
    const res = await fetch(`${ENDPOINT}?serviceKey=${encodeURIComponent(serviceKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ b_no: [digits] }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const json = (await res.json()) as { data?: NtsRow[] };
    row = json.data?.[0];
  } catch (e) {
    // 국세청 쪽 장애로 가입이 막히지 않게 한다.
    //
    // 실패 사유를 함께 돌려준다. 묻어두면 "키가 없는 것"과 "호출이
    // 실패한 것"을 구분할 수 없어, 운영에서 왜 검증이 안 도는지 알 길이
    // 없다. 키 자체는 서버에만 있고 사유 문구에는 들어가지 않는다.
    return NextResponse.json({
      skipped: true,
      message: "국세청 조회에 실패했습니다. 검증 없이 진행합니다.",
      reason: e instanceof Error ? e.message : String(e),
      keyLength: serviceKey.length,   // 값은 드러내지 않고 길이만. 잘렸는지 알 수 있다.
    });
  }

  // 등록되지 않은 번호는 b_stt가 비어서 온다.
  if (!row || !row.b_stt) {
    return NextResponse.json({
      valid: false,
      message: "국세청에 등록되지 않은 사업자등록번호입니다.",
    });
  }

  if (row.b_stt_cd !== "01") {
    return NextResponse.json({
      valid: false,
      status: row.b_stt,
      message: `${row.b_stt} 상태인 사업자등록번호입니다.`,
    });
  }

  // 로그인한 회원이 자기 회사 번호를 확인한 경우에는 통과 시각을 남긴다.
  // 화면이 "검증됨"이라고 주장하는 걸 믿지 않고, 국세청에 실제로 물어본
  // 이 서버만 기록한다.
  if (hasAdminKey()) {
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("company_id, companies(business_number)")
          .eq("id", user.id)
          .single();

        const mine = profile as unknown as {
          company_id: string;
          companies: { business_number: string } | null;
        } | null;

        if (mine?.companies?.business_number.replace(/[^0-9]/g, "") === digits) {
          await createAdminClient()
            .from("companies")
            .update({ verified_at: new Date().toISOString() })
            .eq("id", mine.company_id);
        }
      }
    } catch {
      // 기록에 실패해도 조회 결과는 돌려준다.
    }
  }

  // 이미 등록된 회사인지도 함께 알려준다.
  //
  // 가입 트리거가 "초대 없이 남의 사업자번호로 가입"을 막기는 하지만,
  // 그건 제출 버튼을 누른 뒤의 일이다. 폼을 다 채우고 나서야 "초대를
  // 받아오라"는 말을 들으면 늦다.
  let registered: string | null = null;
  // 이미 등록된 회사라면 누구에게 초대를 요청해야 하는지 함께 알려준다.
  // 이름만으로는 같은 회사에 사람이 여럿일 때 누구인지 가릴 수 없다.
  //
  // 메일 주소는 가려서 준다. 사업자등록번호는 세금계산서·홈페이지에 적혀
  // 있어 사실상 공개 정보다. 번호를 넣으면 그 회사 담당자의 메일이 그대로
  // 나오면, 번호를 아는 누구나 주소를 긁어갈 수 있다. 동료라면 가려진
  // 주소로도 누구인지 알아본다.
  let registeredAdmin: { name: string; email: string } | null = null;
  if (hasAdminKey()) {
    try {
      const admin = createAdminClient();
      const { data: company } = await admin
        .from("companies")
        .select("id, name")
        .eq("business_number", `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`)
        .maybeSingle();
      registered = company?.name ?? null;

      if (company?.id) {
        // 담당 관리자가 초대를 발급한다. 없으면(탈퇴 등) 아무나 알려줘도
        // 소용없으므로 비워 둔다 — 그때는 고객센터로 안내한다.
        const { data: owner } = await admin
          .from("profiles")
          .select("id, name")
          .eq("company_id", company.id)
          .eq("is_company_admin", true)
          .maybeSingle();
        if (owner?.id) {
          const { data: authUser } = await admin.auth.admin.getUserById(owner.id);
          const mail = authUser?.user?.email;
          if (mail) registeredAdmin = { name: owner.name, email: maskEmail(mail) };
        }
      }
    } catch {
      // 못 알아내도 조회 결과는 돌려준다.
    }
  }

  return NextResponse.json({
    valid: true,
    status: row.b_stt,
    taxType: row.tax_type,
    registered,
    registeredAdmin,
  });
}
