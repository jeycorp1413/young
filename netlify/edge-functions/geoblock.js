// 대한민국(KR) 외 IP 접속 차단 — 사이트 전체(/*)에 적용
// Netlify Edge Function. context.geo 로 접속자의 국가를 판별한다.
// 국가 정보를 알 수 없으면(로컬/판별불가) 통과시켜 오작동으로 국내 사용자가 막히는 것을 방지(fail-open).

const BLOCK_PAGE = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>접근 제한 · Access restricted</title>
<style>
  html,body{height:100%;margin:0;}
  body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Malgun Gothic",system-ui,sans-serif;
    background:radial-gradient(1200px 600px at 50% -10%,#1b2140,#0d1020);color:#e8eaf5;
    display:flex;align-items:center;justify-content:center;text-align:center;padding:28px;}
  .box{max-width:420px;}
  .lock{font-size:52px;}
  h1{font-size:21px;margin:16px 0 10px;font-weight:800;}
  p{color:#9aa0bd;font-size:14px;line-height:1.7;margin:0;}
  .en{color:#6f7699;font-size:12.5px;margin-top:10px;}
</style></head>
<body><div class="box">
  <div class="lock">🔒</div>
  <h1>접근이 제한되었습니다</h1>
  <p>이 페이지는 대한민국 내에서만 접속할 수 있습니다.</p>
  <p class="en">Access is restricted to visitors located in South Korea.</p>
</div></body></html>`;

export default async (request, context) => {
  const code = context.geo && context.geo.country && context.geo.country.code;
  // 국가를 확실히 알 수 있고 그게 KR이 아니면 차단
  if (code && code !== "KR") {
    return new Response(BLOCK_PAGE, {
      status: 403,
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
    });
  }
  // 검증용: 엣지 함수가 살아있는지 + 감지된 국가를 헤더로 노출 (확인 후 제거 예정)
  const res = await context.next();
  try { res.headers.set("x-geo-guard", code || "unknown"); } catch (e) {}
  return res;
};
