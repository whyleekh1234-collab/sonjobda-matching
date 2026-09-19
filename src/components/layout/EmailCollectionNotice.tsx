"use client";

import { useState } from "react";

// 이메일 무단수집거부 고지. 정보통신망법 제50조의2에 근거한 선언문으로,
// 매칭 성사 시 담당자 이메일이 공개되는 서비스라 봇 수집에 대한 거부
// 의사를 밝혀 둔다. 푸터가 서버 컴포넌트라 토글만 여기로 뺐다.
export default function EmailCollectionNotice() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-foreground/40 transition-colors hover:text-primary"
      >
        이메일 무단수집거부
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="email-notice-title"
            className="w-full max-w-md rounded-xl bg-background p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="email-notice-title" className="text-base font-semibold text-foreground">
              이메일 무단수집거부
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-foreground/70">
              본 웹사이트에 게시된 이메일 주소가 전자우편 수집 프로그램이나 그 밖의 기술적
              장치를 이용하여 무단으로 수집되는 것을 거부하며, 이를 위반 시 정보통신망 이용촉진
              및 정보보호 등에 관한 법률에 의해 형사처벌됨을 유념하시기 바랍니다.
            </p>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
