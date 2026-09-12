export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white pt-24 pb-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-foreground">개인정보처리방침</h1>
        <p className="mt-2 text-sm text-foreground/50">공지일자: 2026년 6월 20일 · 시행일자: 2026년 6월 20일</p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-foreground/70">
          {/* 제1장 */}
          <h2 className="text-xl font-bold text-foreground">제1장 총칙</h2>

          <section>
            <h3 className="text-lg font-semibold text-foreground">제1조 (목적)</h3>
            <p className="mt-2">
              주식회사 손잡다메디칼(이하 “회사”라 함)은 이용자의 개인정보를 소중하게 생각하고, 보호하기 위하여 항상 최선을
              다해 노력하고 있습니다. 회사는 「개인정보보호법」을 비롯한 모든 개인정보보호 관련 법률 규정을 준수하고 있으며,
              관련 법령에 의거한 개인정보처리방침을 정하여 이용자 권익 보호에 최선을 다하고 있습니다. 또한, 「개인정보처리방침」을
              제정하여 이를 준수하고 있으며, 이를 인터넷사이트에 공개하여 이용자가 언제나 용이하게 열람할 수 있도록 하고 있습니다.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-foreground">제2조 (정의)</h3>
            <p className="mt-2">이 방침에서 사용하는 용어의 정의는 다음과 같습니다.</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>이용자 : 손잡다매칭에 접속하여 손잡다매칭 서비스 이용약관에 따라 회사가 제공하는 서비스를 이용하는 자를 말하며, 회원과 비회원을 말합니다.</li>
              <li>서비스 : 구현되는 단말기(PC, 태블릿 PC 등의 각종 유무선 장치를 포함)와 상관없이 이용자가 이용할 수 있는 손잡다매칭 서비스를 의미합니다.</li>
              <li>회원 : 본 약관에 동의함으로써 회사와 이용계약을 체결한 만 19세 이상의 자로서, 회사가 제공하는 정보와 서비스를 지속적으로 이용할 수 있는 자를 말합니다.</li>
              <li>비회원 : 회원등록 없이 서비스를 이용하는 자로서, 회사가 제공하는 서비스 이용에 제한을 받을 수 있습니다.</li>
              <li>자료 : 회사가 제공한 각종 정보로써 서비스상에 게시된 부호, 문자, 음성, 음향, 화상, 동영상 등의 정보 형태의 글, 사진, 동영상 및 각종 파일, 링크, 다운로드, 광고 등을 포함하여 본 서비스에 게시물 형태로 포함되어 있거나, 본 서비스를 통해 배포, 전송되거나, 본 서비스로부터 접근되는 정보를 의미합니다.</li>
              <li>아이디(ID) : 회원의 식별과 서비스 이용을 위하여 회원이 설정하고 회사가 승인한 회원 본인의 등록 이메일 주소를 말합니다.</li>
              <li>비밀번호 : 회원의 동일성 확인과 회원정보의 보호를 위하여 회원이 설정하고 회사가 승인한 문자나 숫자의 조합을 말합니다.</li>
              <li>파트너 업체관리 규정 : 회사가 별도로 규정하여 공개한 업체정보의 준수사항 및 위반 시 제재 규정을 의미합니다.</li>
              <li>파트너 허위정보 규정 : “허위 정보”라 함은 “손잡다매칭 업체관리 규정”에 명시한 허위 정보 기준에 부합하는 정보를 의미합니다.</li>
              <li>유료 서비스 : 손잡다매칭 서비스를 통해 유료로 이용 가능한 회사가 제공하는 각종 온라인 디지털 콘텐츠 및 제반 서비스를 의미합니다. 정보 및 광고 게시 서비스 등이 포함됩니다.</li>
            </ol>
          </section>

          {/* 제2장 */}
          <h2 className="text-xl font-bold text-foreground">제2장 개인정보의 수집 및 이용</h2>

          <section>
            <h3 className="text-lg font-semibold text-foreground">제3조 (이용자 정보 수집 및 이용)</h3>
            <p className="mt-2">
              회사는 이용하는 서비스의 형태에 따라 다음과 같은 개인정보를 수집 및 이용·제공·파기하고 있습니다. 또한, 회사는
              이용자의 개인식별이 가능한 개인정보를 수집하는 때에는 반드시 이용자의 동의를 받습니다. 수집된 개인정보는 이용목적
              범위 외의 용도로 활용되지 않으며, 이용목적에 대한 내용이 변경될 경우 「개인정보보호법」에 따라 반드시 별도의 동의를
              받습니다.
            </p>
            <p className="mt-3 font-medium text-foreground">1. 이용자 정보는 다음과 같이 공통으로 사용합니다.</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>회원 가입의사 확인, 회원제 서비스 제공에 따른 본인 식별·인증, 회원자격 유지·관리, 서비스 부정이용 방지</li>
              <li>신규서비스 개발, 다양한 서비스 제공, 문의사항 또는 불만·분쟁 처리, 공지사항 전달</li>
              <li>이벤트 행사 시 정보 전달, 마케팅 및 광고 등에 활용</li>
              <li>서비스 이용 기록, 접속 빈도 및 서비스 이용에 대한 통계, 맞춤형 서비스 제공, 서비스 개선에 활용</li>
              <li>부정이용 행위를 포함하여 서비스의 원활한 운영에 지장을 주는 행위에 대한 방지 및 제재, 계정도용 및 부정거래 방지</li>
            </ol>
            <p className="mt-3 font-medium text-foreground">2. 회사가 이용자로부터 수집하는 개인정보는 다음과 같습니다.</p>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full border-collapse border border-border text-sm">
                <thead>
                  <tr className="bg-muted">
                    <th className="border border-border px-3 py-2 text-left font-medium">구분</th>
                    <th className="border border-border px-3 py-2 text-left font-medium">개인정보항목</th>
                    <th className="border border-border px-3 py-2 text-left font-medium">수집이용목적</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-border px-3 py-2 align-top">회원가입(공통)</td>
                    <td className="border border-border px-3 py-2 align-top">[필수] 기업유형, 국가, 기업명, 사업자등록번호, 아이디, 비밀번호, 이름, 이메일, 전화번호, 휴대폰번호<br />[선택] 기업주소, 기업로고, 부서명, 직함</td>
                    <td className="border border-border px-3 py-2 align-top">이용자 식별, 고지사항 전달</td>
                  </tr>
                  <tr>
                    <td className="border border-border px-3 py-2 align-top">사업분야 설정(의뢰사)</td>
                    <td className="border border-border px-3 py-2 align-top">[필수] 사업분야</td>
                    <td className="border border-border px-3 py-2 align-top">이용자 식별, 회원제 서비스(유료 서비스 등) 제공</td>
                  </tr>
                  <tr>
                    <td className="border border-border px-3 py-2 align-top">사업분야 설정(파트너사)</td>
                    <td className="border border-border px-3 py-2 align-top">[필수] 사업분야, 임상시험 관련 정보</td>
                    <td className="border border-border px-3 py-2 align-top">이용자 식별, 회원제 서비스(유료 서비스 등) 제공</td>
                  </tr>
                  <tr>
                    <td className="border border-border px-3 py-2 align-top">회원인증</td>
                    <td className="border border-border px-3 py-2 align-top">[필수] 암호화된 이용자 확인값(CI), 중복가입확인정보(DI)</td>
                    <td className="border border-border px-3 py-2 align-top">이용자 식별, 회원제 서비스(유료 서비스 등) 제공</td>
                  </tr>
                  <tr>
                    <td className="border border-border px-3 py-2 align-top">환불관리</td>
                    <td className="border border-border px-3 py-2 align-top">[필수] 대표자명, 법인명(회사명), 사업자등록번호, 통장사본(은행명, 계좌번호, 예금주명)<br />[선택] 이메일 주소, 주소</td>
                    <td className="border border-border px-3 py-2 align-top">환불을 위한 대금지급</td>
                  </tr>
                  <tr>
                    <td className="border border-border px-3 py-2 align-top">제휴문의</td>
                    <td className="border border-border px-3 py-2 align-top">[필수] 성명, 이메일, 내용<br />[선택] 전화번호</td>
                    <td className="border border-border px-3 py-2 align-top">제휴문의에 대한 처리</td>
                  </tr>
                  <tr>
                    <td className="border border-border px-3 py-2 align-top">전화문의</td>
                    <td className="border border-border px-3 py-2 align-top">[필수] 휴대전화번호 또는 전화번호<br />[선택] 이메일 주소, 주소</td>
                    <td className="border border-border px-3 py-2 align-top">전화 문의 및 고충 처리</td>
                  </tr>
                  <tr>
                    <td className="border border-border px-3 py-2 align-top">자동생성</td>
                    <td className="border border-border px-3 py-2 align-top">서비스 이용기록, 접속 로그, 쿠키, 접속 IP정보, 결제기록, OS 정보, 기기 고유번호(디바이스 아이디 또는 IMEI)</td>
                    <td className="border border-border px-3 py-2 align-top">기존 서비스 개선, 회원의 서비스 이용에 대한 통계 등</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3">
              ※ 이용자의 권리를 보장해 드리기 위하여 서비스 안내를 목적으로 이용자 정보를 이용하여 연락을 취할 수 있습니다.<br />
              ※ 위의 정보는 서비스 이용에 따른 통계∙분석에 이용될 수 있습니다.
            </p>
            <p className="mt-2">
              3. 회사는 기본적 인권침해의 우려가 있는 개인정보(인종 및 민족, 사상 및 신조, 출신지 및 본적지, 정치적 성향 및
              범죄기록, 건강상태 등)는 요구하지 않습니다.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-foreground">제4조 (회원가입 연령 제한)</h3>
            <p className="mt-2">
              회사는 만 19세 이상의 이용자에 한하여 회원가입을 허용하며, 만 19세 미만인 자의 회원가입은 제한됩니다.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-foreground">제5조 (개인정보의 수집방법)</h3>
            <p className="mt-2">
              웹 페이지, 서면 양식, 팩스, 고객센터를 통한 전화와 온라인 상담, 이벤트 응모 등으로 개인정보를 수집하고 있습니다.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-foreground">제6조 (쿠키 활용)</h3>
            <p className="mt-2">
              1. 인터넷 서비스 이용 과정에서 IP 주소, 쿠키, 서비스 이용 기록이 생성되어 수집될 수 있습니다. 서비스 이용 과정에서
              이용자에 관한 정보를 회사가 자동화된 방법으로 생성하여 이를 저장(수집)할 수 있습니다.
            </p>
            <p className="mt-2">
              2. 회사는 쿠키 정보를 수집하여 이용자들이 방문한 손잡다매칭 각 서비스 접속여부, 서비스 받고자 하는 자료 확인 여부,
              이용자 문의에 대한 확인 및 안내 등에 사용됩니다.
            </p>
            <p className="mt-2">
              3. 이용자는 쿠키 설치에 대한 선택권을 가지고 있습니다. 따라서 이용자는 웹브라우저에서 옵션을 설정함으로써 모든
              쿠키를 허용하거나, 쿠키가 저장될 때마다 확인을 거치거나, 아니면 모든 쿠키의 저장을 거부할 수도 있습니다. 다만,
              쿠키의 저장을 거부할 경우에는 로그인이 필요한 손잡다매칭 일부 서비스는 이용에 어려움이 있을 수 있습니다.
              (쿠키 설정방법 예 ― ① Internet Explorer : 도구 → 인터넷 옵션 → 개인정보 → 고급, ② Chrome : 설정 → 고급 설정
              표시 → 개인정보의 콘텐츠 설정 → 쿠키)
            </p>
          </section>

          {/* 제3장 */}
          <h2 className="text-xl font-bold text-foreground">제3장 개인정보의 이용목적 외 제3자 제공 및 개인정보 위탁처리</h2>

          <section>
            <h3 className="text-lg font-semibold text-foreground">제7조 (이용자 정보의 제3자 제공)</h3>
            <p className="mt-2">
              1. 회사는 이용자의 개인정보를 제3조(이용자 정보 수집 및 이용)에서 고지한 범위 내에서 사용하며, 이용자의 사전 동의
              없이 수집목적 범위를 초과하여 이용하거나 원칙적으로 제3자에게 제공하지 않습니다. 다만, 양질의 서비스 제공을 위해
              회원의 개인정보를 제휴사 또는 개인정보 수탁업체에 제공하는 경우에는 사전에 이용자에게 업체명, 제공되는 개인정보
              항목, 제공 목적, 보유기간 등에 대해서 고지하고 개별적으로 동의를 구하는 절차를 제공합니다. 동의가 없는 경우에는
              제공되지 않으며, 제휴사 및 개인정보 수탁업체가 변경된 경우에도 고지를 합니다.
            </p>
            <p className="mt-2">2. 다음의 경우에는 예외로 합니다.</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>통계작성, 학술연구 또는 시장조사를 위하여 필요한 경우로서 특정 개인을 식별할 수 없는 형태로 제공하는 경우</li>
              <li>도용 방지를 위하여 본인확인이 필요한 경우</li>
              <li>법률의 규정 또는 법률에 의하여 필요한 불가피한 사유가 있는 경우</li>
              <li>수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요청이 있는 경우</li>
              <li>이용자의 동의가 있는 경우, 서비스 제공 및 상담 등의 원활한 이행을 위하여 관련된 이용자의 개인정보를 필요한 범위 내에서 제3자에게 제공합니다.</li>
            </ol>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full border-collapse border border-border text-sm">
                <thead>
                  <tr className="bg-muted">
                    <th className="border border-border px-3 py-2 text-left font-medium">제공받는 자</th>
                    <th className="border border-border px-3 py-2 text-left font-medium">제공정보</th>
                    <th className="border border-border px-3 py-2 text-left font-medium">목적</th>
                    <th className="border border-border px-3 py-2 text-left font-medium">보유기간</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-border px-3 py-2 align-top">손잡다매칭 서비스 이용 의뢰사</td>
                    <td className="border border-border px-3 py-2 align-top">파트너사의 법인명(회사명), 전화번호, 휴대폰번호, 파트너사의 주소, 서비스 이용과정에서 이용자가 입력한 정보 및 작성한 저작물</td>
                    <td className="border border-border px-3 py-2 align-top">의뢰상담, 견적상담, 방문견적, 계약체결 등</td>
                    <td className="border border-border px-3 py-2 align-top">서비스 목적 달성 시. 단, 전자상거래 등에서의 소비자 보호에 관한 법률 및 관계 법령에 따른 보관 의무가 있을 경우 해당 기간 동안 보관</td>
                  </tr>
                  <tr>
                    <td className="border border-border px-3 py-2 align-top">손잡다매칭 서비스 이용 파트너사</td>
                    <td className="border border-border px-3 py-2 align-top">의뢰사의 법인명(회사명), 전화번호, 휴대폰번호, 의뢰사의 주소, 서비스 이용과정에서 이용자가 입력한 정보 및 작성한 저작물</td>
                    <td className="border border-border px-3 py-2 align-top">의뢰상담, 견적상담, 방문견적, 계약체결 등</td>
                    <td className="border border-border px-3 py-2 align-top">서비스 목적 달성 시. 단, 전자상거래 등에서의 소비자 보호에 관한 법률 및 관계 법령에 따른 보관 의무가 있을 경우 해당 기간 동안 보관</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3">
              3. 이용자의 동의가 없는 경우 제3자에게 제공하지 않습니다. 하지만 이 경우 서비스 이용이 제한될 수 있습니다. 양질의
              서비스 제공 및 원활한 서비스 이용을 위하여 필요한 부분임을 말씀드립니다.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-foreground">제8조 (개인정보의 위탁처리)</h3>
            <p className="mt-2">
              회사는 향상된 서비스를 제공하기 위해 개인정보 처리를 위탁하여 처리할 수 있습니다. 위탁업무를 하는 경우에는 다음의
              내용을 이용자에게 알리고 동의를 받으며, 어느 하나의 사항이 변경된 경우에도 동일합니다. 회사는 정보통신서비스의
              제공에 관한 계약을 이행하고 이용자의 편의증진 등을 위하여 필요한 경우에 한하여 본 항을 공개함으로써 이용자께 고지
              또는 동의 절차 없이 개인정보 수탁업체에게 처리를 위탁할 수 있습니다. 보다 나은 서비스 제공을 위해 국내에 위탁한
              개인정보 수탁업체는 다음과 같습니다.
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full border-collapse border border-border text-sm">
                <thead>
                  <tr className="bg-muted">
                    <th className="border border-border px-3 py-2 text-left font-medium">수탁업체</th>
                    <th className="border border-border px-3 py-2 text-left font-medium">위탁업무</th>
                    <th className="border border-border px-3 py-2 text-left font-medium">보유기간</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-border px-3 py-2 align-top">Cool SMS</td>
                    <td className="border border-border px-3 py-2 align-top">SMS, LMS, 알림톡 발송</td>
                    <td className="border border-border px-3 py-2 align-top">이용목적 달성 시까지</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* 제4장 */}
          <h2 className="text-xl font-bold text-foreground">제4장 개인정보의 보유기간 및 파기</h2>

          <section>
            <h3 className="text-lg font-semibold text-foreground">제9조 (이용자 정보 보유기간 및 파기 방법)</h3>
            <p className="mt-2">
              회사가 개인정보를 수집하는 경우 개인정보의 처리목적이 달성되거나 고객의 동의를 받은 기간까지 보유하며, 관계 법령에
              의한 정보보호 사유·의무가 있는 경우에는 일정기간 동안 보유한 뒤 파기합니다.
            </p>
            <p className="mt-2">
              1. 회사가 개인정보를 수집하는 경우 그 보유기간은 원칙적으로 회원탈퇴 즉시 파기하며, 제3자에게 제공된 개인정보에
              대해서도 지체 없이 파기하도록 조치합니다.
            </p>
            <p className="mt-2">
              2. 회사는 회원이 1년간 서비스 이용 기록이 없는 경우 「개인정보보호법」 제39조의6(개인정보의 파기에 대한 특례)에
              따라 회원에게 사전 통지하고 개인정보를 즉시 파기합니다.
            </p>
            <p className="mt-2">3. 회사는 다음과 같은 방법을 통하여 개인정보를 파기합니다.</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>종이에 출력된 개인정보는 분쇄기로 분쇄하거나 소각을 통하여 파기합니다.</li>
              <li>전자적 파일 형태로 저장된 개인정보는 기록을 재생할 수 없는 기술적 방법을 사용하여 삭제합니다.</li>
            </ol>
            <p className="mt-2">4. 법령 및 내부방침에 의한 보유 및 이용기간은 다음과 같습니다.</p>
            <ol className="mt-2 list-decimal space-y-2 pl-5">
              <li>
                회원 가입 및 관리 : 회원 탈퇴 시까지(단, 관계 법령 위반에 따른 수사/조사 등이 진행 중인 경우에는 해당 수사/조사
                종료 시까지)
              </li>
              <li>
                서비스 제공 : 서비스 공급 완료 및 요금결제 / 정산완료 시까지(단, 아래 사유에 해당되는 경우 해당 기간까지)
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  <li>계약 또는 청약철회 등에 관한 기록 : 5년</li>
                  <li>표시/광고에 관한 기록 : 광고 게재 종료 후 6개월</li>
                  <li>대금결제 및 재화 등의 공급에 관한 기록 : 5년</li>
                  <li>소비자의 불만 또는 분쟁 처리에 관한 기록 : 3년</li>
                  <li>전자금융거래에 관한 기록 : 5년</li>
                </ul>
              </li>
              <li>회사 내부방침 : 부정이용 등에 관한 기록 10년</li>
            </ol>
          </section>

          {/* 제5장 */}
          <h2 className="text-xl font-bold text-foreground">제5장 권리 행사 및 개인정보 보호 대책</h2>

          <section>
            <h3 className="text-lg font-semibold text-foreground">제10조 (이용자 권리와 그 행사방법)</h3>
            <p className="mt-2">
              1. 이용자는 언제든지 등록되어 있는 개인정보를 조회하거나 수정할 수 있으며, 회원의 경우 가입해지(탈퇴)를 요청할 수
              있습니다. 단, 회사는 다음과 같이 정당한 공익적 사유가 있는 경우에는 요청을 거부할 수 있으며, 거부하는 경우에는 10일
              이내에 구두 또는 서면으로 거부 사유 및 불복 방법을 정보주체에게 통지합니다.
            </p>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>법률에 따라 열람이 금지되거나 제한되는 경우</li>
              <li>다른 사람의 생명, 신체를 해할 우려가 있거나 다른 사람의 재산과 그 밖의 이익을 부당하게 침해할 우려가 있는 경우</li>
            </ol>
            <p className="mt-2">2. 회원의 정보는 서비스에서 로그인 후 ‘설정’ 메뉴를 통해 조회, 수정, 가입해지(탈퇴)가 가능합니다.</p>
            <p className="mt-2">
              3. 이용자가 개인정보의 오류에 대한 정정을 요청한 경우에는 정정을 완료하기 전까지 개인정보를 이용 또는 제공하지
              않습니다. 또한, 잘못된 개인정보를 제3자에게 이미 제공한 경우에는 정정 처리결과를 제3자에게 통지합니다.
            </p>
            <p className="mt-2">4. 회사는 이용자 요청에 의해 해지 또는 삭제된 개인정보를 그 외의 용도로 열람 또는 이용할 수 없도록 처리하고 있습니다.</p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-foreground">제11조 (개인정보의 기술적/관리적 보호 대책)</h3>
            <p className="mt-2">
              회사는 이용자의 개인정보를 처리함에 있어 개인정보가 분실, 도난, 유출, 변조 또는 훼손되지 않도록 안전성 확보를 위하여
              다음과 같은 기술적/관리적 대책을 강구하고 있습니다. 단, 이용자 본인의 부주의나 인터넷 또는 통신상의 문제로 아이디,
              비밀번호 등의 개인정보가 유출되어 발생한 문제에 대해 회사는 일체의 책임을 지지 않습니다.
            </p>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>비밀번호는 암호화되어 저장 및 관리되고 있어 본인만이 알고 있으며, 개인정보의 확인 및 변경도 비밀번호를 알고 있는 본인에 의해서만 가능합니다.</li>
              <li>회사는 해킹이나 컴퓨터 바이러스 등에 의해 개인정보가 유출·훼손되는 것을 막기 위해 자료를 수시로 백업하고, 최신 보안 업데이트 설치 및 침입차단시스템을 운영하는 등 기술적 조치를 하고 있습니다.</li>
              <li>회사는 개인정보처리 관련 담당자를 한정하고 별도의 비밀번호를 부여하여 정기적으로 갱신하며, 담당자에 대한 정기적 교육을 통하여 개인정보처리방침의 준수를 강조하고 있습니다.</li>
            </ol>
          </section>

          {/* 제6장 */}
          <h2 className="text-xl font-bold text-foreground">제6장 책임자 및 관리자 지정</h2>

          <section>
            <h3 className="text-lg font-semibold text-foreground">제12조 (개인정보 보호책임자 및 관리자 지정)</h3>
            <p className="mt-2">
              1. 개인정보 보호책임자는 이용자의 개인정보를 보호하고 유출을 방지하는 책임자로서, 개인정보를 보호하는 데 있어
              이용자에게 고지한 사항들에 반하여 사고가 발생할 시에는 이에 관한 책임을 집니다.
            </p>
            <p className="mt-2">
              2. 회사는 기술적인 보완조치를 취하였음에도 불구하고 예기치 못한 사고로 인한 정보의 훼손 및 멸실, 이용자가 회사에
              제공한 자료에 의한 각종 분쟁 등에 관해서는 책임이 없습니다.
            </p>
            <p className="mt-2">3. 회사는 「개인정보보호법」에서 규정한 보호책임자를 다음과 같이 지정합니다.</p>
            <div className="mt-2 rounded-lg border border-border bg-muted px-4 py-3">
              <p className="font-medium text-foreground">[ 개인정보 보호책임자 ]</p>
              <p className="mt-1">이름 : 이재진</p>
              <p>직책 : 상무</p>
              <p>E-mail : contact@sonjobdamd.com</p>
            </div>
            <p className="mt-3">4. 기타 개인정보침해에 대한 신고나 상담이 필요한 경우에는 아래 기관에 문의하시기 바랍니다.</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>개인정보침해신고센터 (privacy.kisa.or.kr / 국번없이 118)</li>
              <li>대검찰청 사이버수사과 (www.spo.go.kr / 국번없이 1301)</li>
              <li>경찰청 사이버안전지킴이 (www.police.go.kr / 국번없이 182)</li>
            </ol>
          </section>

          {/* 제7장 */}
          <h2 className="text-xl font-bold text-foreground">제7장 개인정보 처리방침 변경에 관한 사항</h2>

          <section>
            <h3 className="text-lg font-semibold text-foreground">제13조 (고지의 의무)</h3>
            <p className="mt-2">
              본 「개인정보 처리방침」은 2026년 6월 20일에 최초 제정되었으며, 정부 및 회사의 정책 또는 보안기술의 변경에 따라
              내용의 추가, 삭제 및 수정이 있을 경우에는 개정 최소 7일 전부터 서비스의 ‘공지사항’을 통해 고지하고, 본 정책은
              시행일자에 시행됩니다.
            </p>
            <p className="mt-2">공지일자 : 2026년 6월 20일<br />시행일자 : 2026년 6월 20일</p>
          </section>
        </div>
      </div>
    </div>
  );
}
