"use client";

import { useState } from "react";

// 눈 모양을 눌러 비밀번호를 볼 수 있는 입력칸.
//
// 비밀번호 규칙이 있는 화면(영문·숫자·특수문자 조합)에서 특히 필요하다.
// 가려진 채로는 오타를 찾을 수 없어 사용자가 같은 값을 몇 번씩 다시
// 친다. 모바일에서는 키보드가 글자를 잠깐 비춰주지도 않아 더 심하다.
//
// 나머지 속성은 그대로 input에 넘긴다. 화면마다 className과 maxLength가
// 달라서, 이 컴포넌트가 정하는 것은 오른쪽 여백(버튼 자리)뿐이다.

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  className?: string;
};

export default function PasswordInput({ className = "", ...props }: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? "text" : "password"}
        // 버튼과 글자가 겹치지 않게 오른쪽을 비운다. 넘겨받은 className에
        // 이미 pr-*이 있어도 뒤에 오는 쪽이 이긴다.
        className={`${className} pr-11`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        // 폼 안에서 탭을 눌렀을 때 입력칸 사이를 건너뛰지 않도록 뺀다.
        tabIndex={-1}
        aria-label={visible ? "비밀번호 숨기기" : "비밀번호 표시"}
        aria-pressed={visible}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-foreground/35 transition-colors hover:bg-muted hover:text-foreground/70"
      >
        {visible ? (
          // 보이는 중 — 눈에 사선을 그어 "누르면 가려진다"를 나타낸다.
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
          </svg>
        ) : (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        )}
      </button>
    </div>
  );
}
