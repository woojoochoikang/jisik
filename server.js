// 지식 — 웹 서버 (외부 패키지 없이 Node.js 18+ 만으로 동작)
// 실행: node server.js        포트 변경: set PORT=8080 && node server.js
//
// 선택 기능 (config.json 또는 환경변수로 키를 넣으면 켜짐)
//  - 네이버 쇼핑 검색 API  → 부족한 재료의 실제 최저가 목록   (NAVER_CLIENT_ID / NAVER_CLIENT_SECRET)
//  - Anthropic Claude API → 영수증·라벨 사진 인식 정확도 향상 (ANTHROPIC_API_KEY)
// 키가 없어도 앱은 그대로 동작합니다. (쇼핑몰 '낮은 가격순' 검색 링크 + 브라우저 무료 OCR 사용)
const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");

const PORT = Number(process.env.PORT) || 3000;
const ROOT = path.join(__dirname, "public");

// ---------- 설정 읽기 ----------
let fileCfg = {};
try { fileCfg = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json"), "utf8")); }
catch (e) { if (e.code !== "ENOENT") console.error("[경고] config.json 형식이 올바르지 않아요:", e.message); }
const cfg = {
  naverId: process.env.NAVER_CLIENT_ID || fileCfg.naverClientId || "",
  naverSecret: process.env.NAVER_CLIENT_SECRET || fileCfg.naverClientSecret || "",
  anthropicKey: process.env.ANTHROPIC_API_KEY || fileCfg.anthropicApiKey || "",
  anthropicModel: process.env.ANTHROPIC_MODEL || fileCfg.anthropicModel || "claude-haiku-4-5"
};
const features = { shop: !!(cfg.naverId && cfg.naverSecret), aiScan: !!cfg.anthropicKey };

const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
  ".ico": "image/x-icon", ".mp4": "video/mp4", ".webp": "image/webp"
};

function sendJSON(res, code, obj) {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(obj));
}
function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on("data", c => { size += c.length; if (size > limit) { reject(new Error("too large")); req.destroy(); } else chunks.push(c); });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

// ---------- 최저가 검색 (네이버 쇼핑) ----------
const shopCache = new Map(); // q -> { t, items }
const SHOP_TTL = 30 * 60 * 1000;
const stripTags = s => String(s).replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");

async function shopSearch(q) {
  const hit = shopCache.get(q);
  if (hit && Date.now() - hit.t < SHOP_TTL) return hit.items;
  // 관련도순으로 넉넉히 받은 뒤 '식품' 카테고리만 남기고 가격 오름차순 정렬
  // (처음부터 가격순으로 받으면 관련 없는 저가 상품이 섞이기 쉬움)
  const url = "https://openapi.naver.com/v1/search/shop.json?display=60&sort=sim&exclude=used:rental&query=" + encodeURIComponent(q);
  const r = await fetch(url, { headers: { "X-Naver-Client-Id": cfg.naverId, "X-Naver-Client-Secret": cfg.naverSecret } });
  if (!r.ok) throw new Error(`네이버 API 오류 ${r.status}`);
  const data = await r.json();
  const seen = new Set();
  const food = (data.items || [])
    .filter(it => !it.category1 || it.category1 === "식품")
    .map(it => ({
      title: stripTags(it.title), price: Number(it.lprice) || 0, mall: it.mallName || "", link: it.link,
      image: it.image, brand: it.brand || it.maker || "", category: [it.category2, it.category3].filter(Boolean).join(" > ")
    }))
    .filter(it => it.price > 0)
    .filter(it => { const k = it.title + it.price; if (seen.has(k)) return false; seen.add(k); return true; });
  const key = q.split(/\s+/)[0];
  const named = food.filter(it => it.title.replace(/\s/g, "").includes(key)); // 상품명에 재료명이 들어간 것 우선
  const items = (named.length ? named : food).sort((a, b) => a.price - b.price).slice(0, 8);
  shopCache.set(q, { t: Date.now(), items });
  return items;
}

// ---------- 영수증·라벨 인식 (Claude 비전) ----------
async function aiScan(dataUrl, known) {
  const m = /^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/.exec(dataUrl || "");
  if (!m) throw new Error("이미지 형식이 올바르지 않아요");
  const prompt = `이 사진은 장보기 영수증이거나 식품 포장 라벨이에요. 사진에서 식재료(먹을 수 있는 재료)를 찾아 JSON으로만 답하세요.
규칙:
- name: 가능하면 다음 목록의 일반 재료명으로 바꿔 주세요: ${known.join(", ")}. 목록에 없으면 짧은 일반 명칭(예: "애호박", "닭다리살").
- product: 사진에 적힌 상품명 그대로.
- expiry: 라벨에 소비기한/유통기한이 적혀 있으면 "YYYY-MM-DD", 없으면 null. (영수증의 구매 날짜는 유통기한이 아니에요)
- 봉투, 할인, 포인트, 세제 같은 비식품은 제외.
형식: {"type":"receipt"|"label","items":[{"name":"","product":"","expiry":null}]}`;
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": cfg.anthropicKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: cfg.anthropicModel, max_tokens: 1500,
      messages: [{ role: "user", content: [
        { type: "image", source: { type: "base64", media_type: m[1], data: m[2] } },
        { type: "text", text: prompt }
      ] }]
    })
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data?.error?.message || `Claude API 오류 ${r.status}`);
  const text = (data.content || []).filter(c => c.type === "text").map(c => c.text).join("");
  const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  return JSON.parse(json);
}

// ---------- Claude 공통 호출 ----------
async function claude(messages, system, maxTokens = 1200) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": cfg.anthropicKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: cfg.anthropicModel, max_tokens: maxTokens, system, messages })
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data?.error?.message || `Claude API 오류 ${r.status}`);
  return (data.content || []).filter(c => c.type === "text").map(c => c.text).join("");
}

// ---------- AI 식단 상담 ----------
async function aiChat(history, context) {
  const system = `당신은 식단 관리 앱 '지식(지루하지 않은 식단)'의 AI 영양 상담사예요.
사용자의 식단 목표, 냉장고 재료(유통기한 포함), 오늘 먹은 음식, 앱의 레시피 목록이 아래 JSON에 있어요.
- 한국어로, 친근하고 짧게(5~8문장 이내) 답하세요. 목록은 '- '로 시작하는 짧은 줄로.
- 메뉴를 추천할 때는 가능하면 앱 레시피 목록의 이름을 그대로 쓰고, 유통기한 임박 재료를 먼저 쓰는 메뉴를 우선하세요.
- 당뇨·고혈압 등 질환 관련 조언은 일반 정보로만 말하고, 필요하면 의료진 상담을 권하세요.
앱 데이터: ${JSON.stringify(context).slice(0, 12000)}`;
  const messages = history.slice(-12).map(m => ({ role: m.role === "user" ? "user" : "assistant", content: String(m.text).slice(0, 2000) }));
  return claude(messages, system, 800);
}

// ---------- 음식 사진 분석 ----------
async function aiFood(dataUrl) {
  const m = /^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/.exec(dataUrl || "");
  if (!m) throw new Error("이미지 형식이 올바르지 않아요");
  const text = await claude([{ role: "user", content: [
    { type: "image", source: { type: "base64", media_type: m[1], data: m[2] } },
    { type: "text", text: `이 음식 사진을 보고 1인분 기준 영양성분을 추정해 JSON으로만 답하세요.
{"name":"대표 음식 이름(한국어)","emoji":"어울리는 이모지 1개","serving":"추정 양(예: 1공기, 1그릇 400g)","confidence":0~100,
 "kcal":숫자,"protein":g,"carbs":g,"fat":g,"sodium":mg,"items":["보이는 음식/반찬 목록"],"comment":"한 줄 영양 코멘트"}
음식이 아니면 name을 "음식 아님"으로 하세요.` }
  ] }], undefined, 600);
  return JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
}

// ---------- 라우팅 ----------
const server = http.createServer(async (req, res) => {
  let u;
  try { u = new URL(req.url, "http://x"); } catch { res.writeHead(400); return res.end("Bad request"); }
  let urlPath;
  try { urlPath = decodeURIComponent(u.pathname); } catch { res.writeHead(400); return res.end("Bad request"); }
  console.log(`${new Date().toLocaleTimeString()}  ${req.socket.remoteAddress}  ${req.method} ${urlPath}`);

  if (urlPath === "/api/status") return sendJSON(res, 200, features);

  if (urlPath === "/api/shop") {
    const q = (u.searchParams.get("q") || "").trim().slice(0, 40);
    if (!q) return sendJSON(res, 400, { error: "검색어가 없어요" });
    if (!features.shop) return sendJSON(res, 501, { error: "네이버 쇼핑 API 키가 설정되지 않았어요" });
    try { return sendJSON(res, 200, { q, items: await shopSearch(q) }); }
    catch (e) { return sendJSON(res, 502, { error: e.message }); }
  }

  if (urlPath === "/api/scan" && req.method === "POST") {
    if (!features.aiScan) return sendJSON(res, 501, { error: "Claude API 키가 설정되지 않았어요" });
    try {
      const body = JSON.parse(await readBody(req, 8 * 1024 * 1024));
      return sendJSON(res, 200, await aiScan(body.image, (body.known || []).slice(0, 200)));
    } catch (e) { return sendJSON(res, 500, { error: e.message }); }
  }

  if ((urlPath === "/api/chat" || urlPath === "/api/food") && req.method === "POST") {
    if (!features.aiScan) return sendJSON(res, 501, { error: "Claude API 키가 설정되지 않았어요" });
    try {
      const body = JSON.parse(await readBody(req, urlPath === "/api/food" ? 8 * 1024 * 1024 : 512 * 1024));
      if (urlPath === "/api/chat") return sendJSON(res, 200, { text: await aiChat(body.messages || [], body.context || {}) });
      return sendJSON(res, 200, await aiFood(body.image));
    } catch (e) { return sendJSON(res, 500, { error: e.message }); }
  }

  if (urlPath === "/") urlPath = "/index.html";
  const file = path.normalize(path.join(ROOT, urlPath));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end("Forbidden"); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }); return res.end("페이지를 찾을 수 없어요 (404)"); }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-cache" });
    res.end(data);
  });
});

server.on("error", e => {
  if (e.code === "EADDRINUSE") console.error(`\n[오류] ${PORT}번 포트를 이미 다른 프로그램이 쓰고 있어요. 예) set PORT=8080 && node server.js`);
  else console.error(e);
  process.exit(1);
});

server.listen(PORT, "0.0.0.0", () => {
  const ips = Object.values(os.networkInterfaces()).flat()
    .filter(i => i && i.family === "IPv4" && !i.internal).map(i => i.address);
  console.log("\n  🥗 지식 — 지루하지 않은 식단 서버가 켜졌어요!\n");
  console.log(`  내 PC에서 보기      : http://localhost:${PORT}`);
  ips.forEach(ip => console.log(`  같은 와이파이/네트워크: http://${ip}:${PORT}`));
  console.log("");
  console.log(`  최저가 검색(네이버 쇼핑 API) : ${features.shop ? "켜짐 ✅" : "꺼짐 — 쇼핑몰 '낮은 가격순' 링크로 대체"}`);
  console.log(`  AI 기능(Claude API)        : ${features.aiScan ? `켜짐 ✅ (${cfg.anthropicModel}) — 영수증 인식·AI 상담·음식 사진 분석` : "꺼짐 — 데모 모드(무료 OCR·규칙 기반 상담·예시 음식 추정)"}`);
  console.log("\n  인터넷 어디서나 접속하려면 share.bat(Cloudflare 터널)을 함께 실행하세요.");
  console.log("  종료: 이 창에서 Ctrl + C\n");
});
