export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white pt-24 pb-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-foreground">개인정보처리방침</h1>
        <p className="mt-2 text-sm text-foreground/50">최종 수정일: 2026년 3월 15일</p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-foreground/70">
          <section>
            <h2 className="text-lg font-semibold text-foreground">1. 개인정보의 수집 및 이용 목적</h2>
            <p className="mt-2">
              (주)손잡다메디칼(이하 "회사")은 다음 목적을 위해 개인정보를 수집 및 이용합니다.
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>회원 가입 및 관리: 회원 식별, 가입 의사 확인, 본인 확인</li>
              <li>서비스 제공: 의뢰사-파트너사 매칭, 상담 접수, 프로젝트 관리</li>
              <li>마케팅 및 서비스 개선: 서비스 이용 분석, 신규 서비스 안내</li>
              <li>법적 의무 이행: 관계 법령에 따른 의무 준수</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">2. 수집하는 개인정보 항목</h2>
            <table className="mt-2 w-full border-collapse border border-border text-sm">
              <thead>
                <tr className="bg-muted">
                  <th className="border border-border px-4 py-2 text-left font-medium">구분</th>
                  <th className="border border-border px-4 py-2 text-left font-medium">수집 항목</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-border px-4 py-2">필수</td>
                  <td className="border border-border px-4 py-2">이메일, 비밀번호, 이름, 회사명, 연락처, 회원유형(의뢰사/파트너사)</td>
                </tr>
                <tr>
                  <td className="border border-border px-4 py-2">선택</td>
                  <td className="border border-border px-4 py-2">직책, 부서, 회사 홈페이지</td>
                </tr>
                <tr>
                  <td className="border border-border px-4 py-2">자동 수집</td>
                  <td className="border border-border px-4 py-2">접속 IP, 접속 일시, 서비스 이용 기록</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">3. 개인정보의 보유 및 이용 기간</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>회원 탈퇴 시까지 (탈퇴 후 즉시 파기)</li>
              <li>단, 관계 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관</li>
              <li>전자상거래법에 따른 계약/청약철회 기록: 5년</li>
              <li>통신비밀보호법에 따른 접속 기록: 3개월</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">4. 개인정보의 제3자 제공</h2>
            <p className="mt-2">
              회사는 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다. 다만, 매칭 서비스 특성상
              의뢰사와 파트너사 간 연결 시 상호 동의 하에 필요 최소한의 정보(회사명, 담당자명, 연락처)가
              공유될 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">5. 개인정보의 파기</h2>
            <p className="mt-2">
              개인정보 보유 기간이 경과하거나 처리 목적이 달성된 경우, 해당 개인정보를 지체 없이 파기합니다.
              전자적 파일 형태의 정보는 복구 불가능한 방법으로, 종이 문서는 분쇄기로 파기합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">6. 이용자의 권리</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>개인정보 열람, 수정, 삭제를 요청할 수 있습니다.</li>
              <li>개인정보 수집·이용 동의를 철회할 수 있습니다.</li>
              <li>개인정보 처리 정지를 요청할 수 있습니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">7. 개인정보 보호책임자</h2>
            <ul className="mt-2 space-y-1">
              <li>회사명: (주)손잡다메디칼</li>
              <li>웹사이트: sonjobdamd.com</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
