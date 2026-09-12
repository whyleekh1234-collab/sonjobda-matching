export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-white pt-24 pb-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-foreground">손잡다매칭 정보보호정책</h1>
        <p className="mt-2 text-sm text-foreground/50">회원사 기밀정보 보호에 관한 정책 · 최종 수정일: 2026년 6월 20일</p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-foreground/70">
          <p>
            주식회사 손잡다메디칼(이하 “회사”라 함)은 ‘손잡다매칭’ 서비스(이하 “서비스”라 함)를 이용하는 회원사가 플랫폼에
            제공·게시·보관하는 사업상 기밀정보를 소중히 보호하며, 회원사가 안심하고 서비스를 이용할 수 있도록 다음과 같은
            정보보호정책을 수립하여 시행한다. 본 정책은 손잡다매칭 서비스 이용약관 제5조(운영정책)에 따라 약관의 일부를
            구성하며, 본 정책에서 정하지 아니한 사항은 약관 및 회사의 개인정보처리방침에 따른다.
          </p>

          <section>
            <h2 className="text-lg font-semibold text-foreground">제1조 (목적)</h2>
            <p className="mt-2">
              본 정책은 회원사가 서비스를 이용하는 과정에서 회사에 제공하거나 플랫폼에 게시·보관하는 기밀정보의 보호에 관하여
              회사가 준수하여야 할 사항을 정함을 목적으로 한다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">제2조 (기밀정보의 정의)</h2>
            <p className="mt-2">
              ① 본 정책에서 “기밀정보”란 회원사가 서비스를 통하여 회사에 제공하거나 플랫폼에 입력·게시·전송·보관하는 일체의
              정보로서, 공개되지 아니한 다음 각 호의 정보를 말한다.
            </p>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>임상시험 계획·프로토콜·증례기록서(CRF) 등 임상 관련 정보</li>
              <li>제품, 파이프라인, 연구개발 및 인허가 전략에 관한 정보</li>
              <li>견적, 단가, 계약조건 등 거래에 관한 정보</li>
              <li>회원사의 기술상·경영상 정보로서 「부정경쟁방지 및 영업비밀보호에 관한 법률」상 영업비밀에 해당하는 정보</li>
              <li>그 밖에 회원사가 비밀로 표시하거나 그 성질상 비밀로 유지함이 합리적으로 기대되는 정보</li>
            </ol>
            <p className="mt-2">
              ② 회원사의 개인정보에 해당하는 정보의 처리에 관하여는 본 정책에 우선하여 회사의 개인정보처리방침이 적용된다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">제3조 (기밀정보의 이용 제한)</h2>
            <p className="mt-2">① 회사는 기밀정보를 서비스의 제공, 매칭의 지원 및 회원사가 동의한 목적의 범위 내에서만 이용한다.</p>
            <p className="mt-2">② 회사는 회원사의 사전 동의 없이 기밀정보를 제3자에게 제공·공개하거나 위 목적 외의 용도로 이용하지 아니한다.</p>
            <p className="mt-2">
              ③ 회사는 의뢰사가 게시한 기밀정보를 해당 매칭의 상대방 후보로 적합한 파트너사에 한하여, 매칭에 필요한 범위 내에서
              열람할 수 있도록 한다. 회원사는 서비스 이용 과정에서 자신이 공개 범위를 직접 설정할 수 있다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">제4조 (제3자 제공 및 위탁의 예외)</h2>
            <p className="mt-2">
              ① 회사는 다음 각 호의 어느 하나에 해당하는 경우에 한하여 회원사의 동의 없이 기밀정보를 제공·공개할 수 있다.
            </p>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>법령에 특별한 규정이 있거나 법령상 의무를 준수하기 위하여 부득이한 경우</li>
              <li>수사기관, 법원 등 권한 있는 기관이 법령에 정해진 절차와 방법에 따라 요청하는 경우</li>
              <li>회원사 또는 회사의 생명·신체·재산에 대한 급박한 위험을 막기 위하여 필요한 경우</li>
            </ol>
            <p className="mt-2">
              ② 회사가 서비스 제공을 위하여 기밀정보의 처리를 외부 업체에 위탁하는 경우, 회사는 해당 수탁업체에 대하여 본 정책에
              상응하는 기밀유지 의무를 부과하고 이를 관리·감독한다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">제5조 (기밀정보의 보호 조치)</h2>
            <p className="mt-2">
              ① 회사는 기밀정보가 분실·도난·유출·위조·변조 또는 훼손되지 아니하도록 다음 각 호를 포함한 합리적인 기술적·관리적
              보호조치를 취한다.
            </p>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>기밀정보에 대한 접근권한의 차등 부여 및 접근통제</li>
              <li>기밀정보의 전송 및 저장 시 암호화 등 보안조치</li>
              <li>침입차단·침입탐지 등 보안시스템의 운영</li>
              <li>기밀정보 처리 담당자의 최소화 및 정기적 보안교육</li>
              <li>접속기록의 보관 및 위·변조 방지</li>
            </ol>
            <p className="mt-2">
              ② 회사는 기밀정보를 처리하는 임직원에게 본 정책에 따른 기밀유지 의무를 부과하며, 그 의무는 해당 임직원의 퇴직 후에도
              존속한다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">제6조 (보유기간 및 파기)</h2>
            <p className="mt-2">
              ① 회사는 기밀정보의 이용 목적이 달성되거나 회원사가 이용계약을 해지한 경우, 관계 법령에 따른 보관 의무가 있는 경우를
              제외하고는 지체 없이 해당 기밀정보를 파기한다.
            </p>
            <p className="mt-2">
              ② 회사는 전자적 형태의 기밀정보는 복구할 수 없는 기술적 방법으로 삭제하고, 출력물 등은 분쇄 또는 소각하여 파기한다.
            </p>
            <p className="mt-2">
              ③ 회원사는 이용계약 해지 전 자신이 게시한 자료를 직접 삭제할 수 있으며, 서비스의 정상적 운영을 위하여 일부 자료가
              즉시 삭제되지 아니할 수 있는 경우 회사는 그 범위와 사유를 회원사에 안내한다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">제7조 (기밀유지 의무의 예외)</h2>
            <p className="mt-2">다음 각 호의 어느 하나에 해당하는 정보는 본 정책에 따른 기밀정보로 보지 아니한다.</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>회사의 귀책사유 없이 공지의 사실이 되었거나 이미 공개된 정보</li>
              <li>회사가 정당한 권원에 의하여 제3자로부터 적법하게 취득한 정보</li>
              <li>회원사가 공개에 동의하였거나 스스로 공개한 정보</li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">제8조 (책임 및 통지)</h2>
            <p className="mt-2">
              ① 회사는 본 정책을 위반하여 회원사에 손해를 발생시킨 경우 관계 법령이 정하는 범위 내에서 그 손해를 배상한다. 다만,
              회원사 본인의 부주의 또는 회사의 고의·중대한 과실이 없는 통신상의 사고로 인하여 발생한 손해에 대하여는 책임을
              부담하지 아니한다.
            </p>
            <p className="mt-2">
              ② 회사는 기밀정보의 유출 등 침해사고를 인지한 경우, 관계 법령에 따라 필요한 조치를 취하고 해당 회원사에 지체 없이 그
              사실을 통지한다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">제9조 (정책의 변경)</h2>
            <p className="mt-2">① 회사는 법령의 개정 또는 서비스 정책의 변경 등에 따라 본 정책을 개정할 수 있다.</p>
            <p className="mt-2">
              ② 회사가 본 정책을 개정하는 경우, 개정 내용과 시행일을 명시하여 시행일 7일 전(회원사에 불리하거나 중대한 변경의
              경우 30일 전)부터 서비스 내 공지란을 통하여 공지한다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">부칙</h2>
            <p className="mt-2">이 정책은 2026년 6월 20일부터 시행한다.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
