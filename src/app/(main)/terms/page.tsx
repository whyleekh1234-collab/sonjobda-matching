export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white pt-24 pb-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-foreground">이용약관</h1>
        <p className="mt-2 text-sm text-foreground/50">최종 수정일: 2026년 3월 15일</p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-foreground/70">
          <section>
            <h2 className="text-lg font-semibold text-foreground">제1조 (목적)</h2>
            <p className="mt-2">
              본 약관은 (주)손잡다메디칼(이하 "회사")이 운영하는 손잡다매칭 플랫폼(이하 "서비스")의
              이용 조건 및 절차, 회사와 이용자의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">제2조 (정의)</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>"서비스"란 회사가 제공하는 임상시험 및 바이오 업무 매칭 플랫폼을 의미합니다.</li>
              <li>"의뢰사"란 파트너를 찾기 위해 서비스를 이용하는 기업 회원을 의미합니다.</li>
              <li>"파트너사"란 의뢰사에게 서비스를 제공하기 위해 등록한 기업 회원을 의미합니다.</li>
              <li>"회원"이란 서비스에 가입하여 이용계약을 체결한 의뢰사 및 파트너사를 의미합니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">제3조 (약관의 효력 및 변경)</h2>
            <p className="mt-2">
              본 약관은 서비스 화면에 게시하거나 기타의 방법으로 회원에게 공지함으로써 효력이 발생합니다.
              회사는 관련 법령을 위배하지 않는 범위에서 약관을 개정할 수 있으며, 변경된 약관은
              서비스 내 공지사항을 통해 공지합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">제4조 (회원가입)</h2>
            <p className="mt-2">
              회원가입은 이용자가 약관에 동의하고 회원정보를 기입한 후 회사가 이를 승인함으로써 체결됩니다.
              회사는 다음 각 호에 해당하는 경우 가입을 거절할 수 있습니다.
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>허위 정보를 기재한 경우</li>
              <li>타인의 명의를 도용한 경우</li>
              <li>기타 회사가 정한 가입 요건을 충족하지 못한 경우</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">제5조 (서비스의 제공)</h2>
            <p className="mt-2">
              회사는 의뢰사와 파트너사 간의 매칭 서비스를 제공하며, 매칭 결과에 대한 최종 결정은
              당사자 간에 이루어집니다. 회사는 매칭 품질 향상을 위해 지속적으로 서비스를 개선합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">제6조 (회원의 의무)</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>회원은 정확한 기업 정보를 등록하고 변경 시 즉시 업데이트해야 합니다.</li>
              <li>회원은 서비스를 통해 알게 된 타 회원의 정보를 무단으로 사용할 수 없습니다.</li>
              <li>회원은 서비스의 건전한 이용 환경을 저해하는 행위를 해서는 안 됩니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">제7조 (면책)</h2>
            <p className="mt-2">
              회사는 의뢰사와 파트너사 간 계약 체결, 서비스 품질, 대금 지급 등에 대해 직접적인 책임을 지지 않습니다.
              매칭 이후 발생하는 분쟁은 당사자 간 해결을 원칙으로 합니다.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
