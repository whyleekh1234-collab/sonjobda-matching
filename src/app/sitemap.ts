import type { MetadataRoute } from "next";
import { siteLockCode } from "@/lib/siteLock";

// 검색엔진에 "이 주소들을 봐 달라"고 건네는 목록.
//
// 로그인해야 쓸 수 있는 곳(대시보드·마이페이지·관리자)과 인증 절차 중간
// 화면(비밀번호 재설정 등)은 넣지 않는다. 색인돼 봐야 검색한 사람에게
// 쓸모가 없고, 얇은 페이지가 많으면 사이트 전체 평가에 해가 된다.
//
// priority는 서로 간의 상대적 중요도일 뿐 순위를 올려주지 않는다.
// 메인을 1.0으로 두고 나머지를 낮춰 "무엇이 중심인지"만 밝힌다.

const SITE = "https://www.sonjobdamd.com";

export default function sitemap(): MetadataRoute.Sitemap {
  // 비공개 운영 중에는 빈 목록을 준다. robots가 전부 막고 있는데
  // 주소 목록만 내주면 앞뒤가 맞지 않는다.
  if (siteLockCode()) return [];

  const now = new Date();
  return [
    { url: SITE, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/signup`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE}/inquiry`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/faq`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE}/policy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE}/security`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
