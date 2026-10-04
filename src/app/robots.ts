import type { MetadataRoute } from "next";
import { siteLockCode } from "@/lib/siteLock";

// 검색 색인 여부는 잠금 상태를 그대로 따른다.
//
// 실 도메인에 올려도 접속 코드가 걸려 있는 동안에는 색인되면 안 된다.
// 크롤러가 받는 건 접속 코드 화면뿐이지만, 그 화면이 "손잡다매칭"으로
// 검색 결과에 걸리면 공개 오픈 전에 주소가 알려진다. 잠금과 한 변수를
// 보게 묶어 뒀으므로, 환경변수를 지우고 재배포하면 이 파일도 함께 허용으로
// 돌아선다 — 오픈할 때 따로 기억해야 할 일을 만들지 않는다. (빌드 시점에
// 한 번 정해지는 값이다. 환경변수만 바꾸고 재배포를 안 하면 안 바뀐다.)
export default function robots(): MetadataRoute.Robots {
  if (siteLockCode()) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/dashboard", "/mypage"] },
    // 크롤러가 제일 먼저 읽는 파일에서 사이트맵 위치를 알려 준다.
    // 검색엔진에 따로 제출하지 않아도 이 줄만으로 찾아간다.
    sitemap: "https://www.sonjobdamd.com/sitemap.xml",
    host: "https://www.sonjobdamd.com",
  };
}
