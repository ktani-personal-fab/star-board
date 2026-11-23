// Star Board PWA. Shows astronomical / classical facts and traditional keywords; the reader interprets.
"use strict";
const BODY = ["太陽", "月", "水星", "金星", "火星", "木星", "土星", "天王星", "海王星", "冥王星", "ノード"];
const SIGN = ["牡羊座", "牡牛座", "双子座", "蟹座", "獅子座", "乙女座", "天秤座", "蠍座", "射手座", "山羊座", "水瓶座", "魚座"];
const ASPECT = ["合", "六分", "矩", "三分", "衝"], ANGLE = [0, 60, 90, 120, 180], ASPECT_KW = ["融合", "好機", "摩擦", "調和", "対立"];
const PHASE = ["新月", "三日月", "上弦", "十三夜", "満月", "寝待月", "下弦", "有明月"];
const PHASE_KW = ["始まり", "芽生え", "決断", "調整", "結実", "分配", "解放", "休息"];
const KW = ["意志・公", "感情・日常", "言葉・情報", "調和・好み", "行動・競争", "拡大・寛容", "制限・継続"];
const DIG = [[1, "本宮"], [2, "高揚"], [4, "三区分"], [8, "境界"], [16, "フェイス"], [32, "損傷"], [64, "失墜"], [128, "漂泊"]];
const SOLAR = ["", "カジミ", "燃焼", "光線下"];
const ELEMENT = ["火", "地", "風", "水"], MODE = ["活動", "不動", "柔軟"];
const HOUSE = ["自己・身体", "財・所有", "兄弟・近隣", "家・基盤", "楽しみ・子", "労働・健康", "相手・契約", "共有・死", "旅・学び", "仕事・公", "友・希望", "隠れたもの"];
const WEEK = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"], WEEKJ = "日月火水木金土";
const TABS = ["SKY", "PLANETS", "ASPECTS", "TIME", "GUIDE"];
const AX = ["ACTION", "DIALOGUE", "REFLECTION"], AXC = ["clay", "gold", "blue"];
const COMPASS = ["北", "北北東", "北東", "東北東", "東", "東南東", "南東", "南南東", "南", "南南西", "南西", "西南西", "西", "西北西", "北西", "北北西"];

const $ = id => document.getElementById(id);
const rev = x => ((x % 360) + 360) % 360;
const signOf = l => Math.floor(rev(l) / 30) % 12;
const two = n => String(n).padStart(2, "0");
const dms = l => { const m = Math.floor(rev(l) * 60) % 1800; return `${Math.floor(m / 60)}°${two(m % 60)}'`; };
const ang = (v, plus) => { const a = Math.round(Math.abs(v) * 60); return `${v < 0 && a ? "−" : plus ? "+" : ""}${Math.floor(a / 60)}°${two(a % 60)}'`; };
const bodyG = (b, cls = "") => G.svg(G.BODY[b], (b === 0 ? "gold " : "") + cls);
const signG = (s, cls = "") => G.svg(G.SIGN[s], cls);
const aspCls = k => k === 0 ? "" : (k === 1 || k === 3) ? "clay" : "blue";
const aspG = (k, cls = "") => G.svg(G.ASPECT[k], aspCls(k) + " " + cls);
const retroShown = b => b.id >= 2 && b.id <= 9 && b.speed < 0;

// ---- time -----------------------------------------------------------------------------------
let nowMs = () => Date.now();
const now = () => fixed ? fixed.t : nowMs() / 1000;
let fixed = null;                                 // chart of another date / place: { t, zone, name, pos }
const fmts = {};
function tzOff(t, zone = fixed && fixed.zone) {  // seconds east of UTC, with historical rules from the OS
  if (!zone) return -new Date(t * 1000).getTimezoneOffset() * 60;
  const f = fmts[zone] || (fmts[zone] = new Intl.DateTimeFormat("en-US", { timeZone: zone, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" }));
  const p = {}; for (const x of f.formatToParts(new Date(t * 1000))) p[x.type] = +x.value;
  return Date.UTC(p.year, p.month - 1, p.day, p.hour % 24, p.minute, p.second) / 1000 - Math.floor(t);
}
function toUtc(local, zone) {                     // wall-clock seconds -> UTC seconds
  let t = local - tzOff(local, zone);
  t = local - tzOff(t, zone);
  return t;
}
const D = t => {                                  // wall clock of the chart's place
  const d = new Date((t + tzOff(t)) * 1000);
  return { getFullYear: () => d.getUTCFullYear(), getMonth: () => d.getUTCMonth(), getDate: () => d.getUTCDate(), getDay: () => d.getUTCDay(), getHours: () => d.getUTCHours(), getMinutes: () => d.getUTCMinutes(), getSeconds: () => d.getUTCSeconds() };
};
const hm = t => { const d = D(Math.round(t / 60) * 60); return `${two(d.getHours())}:${two(d.getMinutes())}`; };
const dayNo = t => { const d = D(t); return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5); };
const mday = t => `${D(t).getMonth() + 1}/${D(t).getDate()}`;
function when(t, err = 0, n = now()) {           // precision follows the engine's uncertainty
  t = Math.round(t / 60) * 60;
  const k = dayNo(t) - dayNo(n), y = D(t).getFullYear() !== D(n).getFullYear() ? D(t).getFullYear() + "/" : "";
  const day = k === 0 ? "" : k === 1 ? (fixed ? "翌日 " : "明日 ") : y + mday(t) + " ";
  if (err > 10800) return k === 0 ? (fixed ? "当日頃" : "今日頃") : (k === 1 ? (fixed ? "翌日" : "明日") : y + mday(t)) + "頃";
  return day + hm(t) + (err > 180 ? "頃" : "");
}
const hhmm = t => t ? (dayNo(t) !== dayNo(now()) ? "翌" : "") + hm(t) : "—";
const isNight = () => { const h = D(now()).getHours(); return h >= 19 || h < 5; };

// ---- state ----------------------------------------------------------------------------------
let pos = null, S = null, F = null, sheetBody = -1, tab = 0, locState = "", exact = {}, lastFetch = 0;
const store = { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } } };
const validPos = p => p && Number.isFinite(p.lat) && Number.isFinite(p.lon) && Math.abs(p.lat) <= 89 && Math.abs(p.lon) <= 180;
const errOf = (a, b) => ((a === 1 ? .09 : .03) + (b === 1 ? .09 : .03)) / Math.max(1e-4, Math.abs(S.body[a].speed - S.body[b].speed)) * 86400;
const ingErr = b => b === 10 ? 0 : (b === 1 ? .09 : .03) / Math.max(1e-3, Math.abs(S.body[b].speed)) * 86400;

function setPos(lat, lon, src) {
  // ~1 km is plenty for the chart, and it is all that is kept
  pos = { lat: Math.round(lat * 100) / 100, lon: Math.round(lon * 100) / 100, src, at: Date.now() };
  store.set("pos", pos);
  if (!$("gate").hidden && !$("gate").classList.contains("when")) $("gate").hidden = true;
  if (fixed) return;                              // a chart of another date stays as it is
  F = null; refresh(true);
}
function locate() {
  if (!navigator.geolocation) { locFail("この端末では位置情報を使えません"); return; }
  if (locState === "busy") return;
  locState = "busy"; lastFetch = Date.now(); drawHead(); gateState();
  navigator.geolocation.getCurrentPosition(
    p => { locState = ""; setPos(p.coords.latitude, p.coords.longitude, "gps"); drawHead(); },
    e => locFail(e.code === 1 ? "位置情報が許可されていません" : "位置情報を取得できません"),
    { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 });
}
function locFail(msg) { locState = msg; drawHead(); if (!pos && !fixed) openGate(); gateState(); }

// ---- head and tabs --------------------------------------------------------------------------
function drawHead() {
  const d = D(now()), q = fixed ? fixed.pos : pos, f = d.getFullYear();
  const c = q ? `${two(Math.floor(Math.abs(q.lat)))}.--${q.lat < 0 ? "S" : "N"} ${Math.floor(Math.abs(q.lon))}.--${q.lon < 0 ? "W" : "E"}` : "—";
  const st = locState === "busy" ? "現在地を取得中" : locState ? (pos ? "前回の位置を使用" : locState) : pos ? (pos.src === "gps" ? `現在地 ${fixed ? "" : hm(pos.at / 1000)}` : "手入力の位置") : "位置を取得";
  const date = `${f}.${two(d.getMonth() + 1)}.${two(d.getDate())} ${WEEK[d.getDay()]}`;
  const clock = `${two(d.getHours())}:${two(d.getMinutes())}<small>${fixed ? "" : two(d.getSeconds())}</small>`;
  const btn = fixed ? `<button data-act="live" class="warn">${fixed.name} ／ 現在に戻る ×</button>` : `<button data-act="locate" class="${locState && locState !== "busy" ? "warn" : ""}" aria-label="現在地を更新">${st} ↻</button>`;
  const h = $("head"), key = c + btn;
  if (!h.firstChild || h.dataset.k !== key) {
    h.innerHTML = `<button data-act="when" aria-label="日時と場所を指定"><span id="clock"></span><span class="pick">日時を選ぶ ›</span></button><div class="where"><span id="hd"></span><br><span>${c}</span><br>${btn}</div>`;
    h.dataset.k = key; h.classList.toggle("fixed", !!fixed);
  }
  $("clock").innerHTML = clock; $("hd").textContent = date;
}
function drawTabs() {
  $("tabs").innerHTML = TABS.map((t, i) => `<button role="tab" data-tab="${i}" aria-selected="${i === tab}">${G.svg(G.UI[i], "", 1.4)}${t}</button>`).join("");
}

// ---- SKY ------------------------------------------------------------------------------------
function moonSvg(r, elong) {                        // lit part, waxing lights the right side
  const k = Math.cos(elong * Math.PI / 180), wax = elong < 180, rx = Math.abs(k) * r;
  const lit = `M0 ${-r}A${r} ${r} 0 0 ${wax ? 1 : 0} 0 ${r}A${rx} ${r} 0 0 ${(k > 0) === wax ? 0 : 1} 0 ${-r}`;
  return `<circle r="${r}" fill="var(--dark)" stroke="var(--ring)" stroke-width=".8"/><path d="${lit}" fill="var(--lit)"/>`;
}
function spread(gap) {                              // keep glyphs from colliding, order preserved
  const off = S.body.slice(0, 10).map(b => rev(b.lon - S.asc)), o = off.map((_, i) => i).sort((a, b) => off[a] - off[b]);
  for (let it = 0; it < 400; it++) {
    let moved = false;
    for (let i = 0; i < 10; i++) {
      const a = o[i], b = o[(i + 1) % 10], g = off[b] + (i === 9 ? 360 : 0) - off[a];  // signed, so crossed pairs separate too
      if (g < gap - .01) { const p = (gap - g) / 2; off[a] -= p; off[b] += p; moved = true; }
    }
    if (!moved) break;
  }
  return off;
}
function wheel() {
  const RO = 176, RB = 143, RP = 120, RT = 98, RD = 82, RI = 34, off = spread(14.5);
  const P = (lon, r) => { const a = (180 + lon - S.asc) * Math.PI / 180; return [r * Math.cos(a), -r * Math.sin(a)].map(v => +v.toFixed(2)); };
  const L = (l0, r0, l1, r1, c, w, dash) => { const a = P(l0, r0), b = P(l1, r1); return `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="var(--${c})" stroke-width="${w}"${dash ? ` stroke-dasharray="${dash}"` : ""}/>`; };
  const C = (r, c, w) => `<circle r="${r}" fill="none" stroke="var(--${c})" stroke-width="${w}"/>`;
  const glyph = (d, lon, r, size, c, w = 1.5) => { const p = P(lon, r), k = size / 24; return `<path d="${d}" transform="translate(${p[0] - size / 2} ${p[1] - size / 2}) scale(${k})" fill="none" stroke="var(--${c})" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`; };
  const txt = (s, lon, r, size, c) => { const p = P(lon, r); return `<text x="${p[0]}" y="${p[1] + size * .36}" font-size="${size}" text-anchor="middle" fill="var(--${c})">${s}</text>`; };
  let h = C(RO, "ring", 1) + C(RB, "ring", .8) + C(RI, "faint", 1);
  for (let k = 0; k < 360; k += 5) h += L(k, RB, k, RB - (k % 30 === 0 ? 0 : k % 10 === 0 ? 5 : 3), "ring", .6);
  for (let k = 0; k < 12; k++) {
    h += L(k * 30, RB, k * 30, RO, "ring", .8) + L(k * 30, RI, k * 30, RB, "faint", .9, "2 4");
    h += glyph(G.SIGN[k], k * 30 + 15, (RO + RB) / 2, 21, k === signOf(S.asc) ? "clay" : "sub");
    h += txt((k - signOf(S.asc) + 12) % 12 + 1, k * 30 + 15, RI + 9, 10, "sub");
  }
  h += L(S.asc, RO, S.asc + 180, RO, "sub", .9, "5 4") + L(S.mc, RB, S.mc + 180, RB, "ring", .9, "5 4");
  for (const a of S.aspects) if (a.type && a.b < 7) h += L(S.body[a.a].lon, RD, S.body[a.b].lon, RD, a.type === 1 || a.type === 3 ? "clay" : "blue", (1.6 - a.orb * .1).toFixed(2), a.applying ? "" : "6 3");
  for (const b of S.body.slice(0, 10)) {
    const p = P(b.lon, RD), l = off[b.id] + S.asc, main = b.id < 7;
    h += L(b.lon, RB, b.lon, RB - 8, "ink", 1.2) + L(b.lon, RB - 8, l, RP + 11, "ring", .6);
    h += `<circle cx="${p[0]}" cy="${p[1]}" r="${main ? 2.2 : 1.6}" fill="var(--${main ? "ink" : "sub"})"/>`;
    h += glyph(G.BODY[b.id], l, RP, 19, b.id === 0 ? "gold" : main ? "ink" : "sub", 1.6);
    h += txt(Math.floor(rev(b.lon) % 30) + "°" + (retroShown(b) ? "R" : ""), l, RT, 11, "sub");
    const q = P(l, (RP + RT) / 2);
    h += `<circle class="hit" data-body="${b.id}" cx="${q[0]}" cy="${q[1]}" r="17" role="button" aria-label="${BODY[b.id]}の詳細"/>`;
  }
  const a = P(S.asc, RO), q = P(S.asc + 3.2, RO + 9), r = P(S.asc - 3.2, RO + 9);
  h += `<path d="M${a}L${q}L${r}Z" fill="var(--clay)"/>` + txt("MC", S.mc, RO + 8, 10.5, "sub") + `<g>${moonSvg(17, S.elong)}</g>`;
  return `<svg class="wheel" viewBox="-188 -188 376 376" role="img" aria-label="現在の星図">${h}</svg>`;
}
// ---- views: every view fits one screen, no scrolling. Chips switch the view inside a tab. -----
const digs = b => DIG.filter(([f]) => b.flags & f).map(([, t]) => t).join("・");
const PH4 = ["新月", "上弦", "満月", "下弦"];
const SUBS = [["星図", "要点"], ["天体", "ハウス"], ["七天体", "外惑星", "一覧表"], ["惑星時間", "予定", "月"], ["図", "項目", "天体", "星座", "角度", "品位", "設定"]];
const sub = [0, 0, 0, 0, 0];
let pg = 0, dayPick = 0;
const wide = () => innerWidth > innerHeight && innerHeight < 521;
function page(k, body, cls = "") {
  $("p" + k).innerHTML = `<div class="seg">${SUBS[k].map((t, i) => `<button data-sub="${i}" data-k="${k}" aria-pressed="${sub[k] === i}">${t}</button>`).join("")}</div><div class="view ${cls}">${body}</div>`;
}
const rows = a => `<div class="list" style="--n:${a.length};--h:${Math.ceil(a.length / 2)}">${a.join("")}</div>`;
function paged(items, rowH, empty) {                 // only when a list is longer than the screen
  if (!items.length) return `<p class="empty">${empty}</p>`;
  const H = $("pages").clientHeight - 64, cap = Math.max(3, Math.floor((H - 30) / rowH)) * (wide() ? 2 : 1);
  if (items.length <= Math.floor(H / rowH) * (wide() ? 2 : 1)) return rows(items);
  const n = Math.ceil(items.length / cap); pg = Math.min(pg, n - 1);
  return rows(items.slice(pg * cap, pg * cap + cap)) + `<div class="pager"><button data-act="prev" aria-label="前へ">‹</button><span>${pg + 1} / ${n}</span><button data-act="next" aria-label="次へ">›</button></div>`;
}
const moonIcon = (e, r = 9) => `<svg class="g" viewBox="-11 -11 22 22" style="stroke:none" aria-hidden="true">${moonSvg(r, e || .01)}</svg>`;

function drawSky() {
  const m = S.body[1], lord = S.body[S.lord], K = S.nextPlanet;
  const nextIc = S.voc ? `${bodyG(1)} ボイド ${when(S.ingress, 700)}まで` : `${bodyG(1)} ${aspG(S.nextAspect)} ${bodyG(K)} ${when(S.nextTime, 700)}`;
  if (sub[0] === 0) {
    const quad = [["ASC", S.asc], ["MC", S.mc], ["DSC", S.asc + 180], ["IC", S.mc + 180]].map(([k, l]) => `<div><span class="en">${k}</span><b>${signG(signOf(l), "s")} ${dms(l)}</b></div>`).join("");
    return page(0, `<div class="wheelbox">${wheel()}</div><div class="strip"><div class="quad">${quad}</div>
      <div class="ln"><span class="en">NEXT</span><span>${nextIc}</span><span class="sub">${S.voc ? "" : ASPECT[S.nextAspect]}</span></div>
      <div class="ln"><span class="en">HOUR</span><span>${S.hValid ? `${bodyG(S.hourRuler)} ${BODY[S.hourRuler]}` : "—"}</span><span class="sub">${S.hValid ? `${hm(S.hourStart)}–${hm(S.hourEnd)}` : ""}</span></div>
      <div class="ln"><span class="en">MOON</span><span>${moonIcon(S.elong)} ${PHASE[S.phase]}</span><span class="sub">${SIGN[signOf(m.lon)]} ${Math.round(S.illum * 100)}%</span></div></div>`, "sky");
  }
  const r = (t, a, b) => `<div class="row"><span class="en">${t}</span><div>${a}<p>${b}</p></div></div>`;
  const next = S.voc ? `月が${SIGN[signOf(m.lon)]}を出るまで主要な角度なし`
    : `月 ${ASPECT[S.nextAspect]} ${BODY[K]}（${ANGLE[S.nextAspect]}°） ${KW[1]} × ${KW[K]} ／ ${ASPECT_KW[S.nextAspect]}<br>月は${when(S.ingress, 700)}に${SIGN[(signOf(m.lon) + 1) % 12]}へ`;
  const ph = phases()[0];
  page(0, r("NEXT", `<b class="big">${nextIc}</b>`, next)
    + r("LORD", `<b>${bodyG(S.lord)} ${BODY[S.lord]}</b> <span class="sub">${SIGN[signOf(lord.lon)]} ${dms(lord.lon)}${retroShown(lord) ? " 逆行" : ""}</span>`, `${KW[S.lord]} ／ 第${lord.house}ハウス ／ ${digs(lord)}${lord.solar ? "・" + SOLAR[lord.solar] : ""}`)
    + r("HOUR", S.hValid ? `<b>${bodyG(S.hourRuler)} ${BODY[S.hourRuler]}</b> <span class="sub">${hm(S.hourStart)}–${hm(S.hourEnd)}</span>` : "<b>—</b>", S.hValid ? `${KW[S.hourRuler]} ／ ${S.hourIndex < 12 ? "昼" : "夜"}の第${S.hourIndex % 12 + 1}時 ／ 日の主 ${BODY[S.dayRuler]}` : "日の出・日の入りがないため算出できません")
    + r("MOON", `<b>${moonIcon(S.elong)} ${PHASE[S.phase]}</b> <span class="sub">${SIGN[signOf(m.lon)]} ${dms(m.lon)}</span>`, `${PHASE_KW[S.phase]} ／ 輝面 ${Math.round(S.illum * 100)}%${ph ? ` ／ ${PH4[ph[1]]} ${when(ph[0], 600)}` : ""}`)
    + r("SECT", `<b>${S.day ? "昼のチャート" : "夜のチャート"}</b> <span class="sub">太陽高度 ${ang(S.sunAlt, true)}</span>`, `フォルトゥナ ${SIGN[signOf(S.fortune)]} ${dms(S.fortune)} ／ スピリット ${SIGN[signOf(S.spirit)]} ${dms(S.spirit)}`)
    + (S.hValid ? `<div class="axes">${AX.map((t, i) => `<section><div><span class="en">${t}</span>${S["ax" + i]}</div><div class="bar"><i style="width:${S["ax" + i]}%;background:var(--${AXC[i]})"></i></div></section>`).join("")}</div>` : ""), "facts");
}
const phases = () => F ? F.phase.map((t, k) => [t, k]).filter(x => x[0]).sort((a, b) => a[0] - b[0]) : [];

function drawPlanets() {
  if (sub[1] === 0) return page(1, rows(S.body.map(b => {
    const tag = [b.id < 7 ? digs(b) : "", b.solar ? SOLAR[b.solar] : "", retroShown(b) ? "逆行" : ""].filter(Boolean).join("・") || (b.id === 10 ? "昇交点（平均）" : "順行");
    return `<button class="item planet" data-body="${b.id}">${bodyG(b.id)}<span class="nm">${BODY[b.id]}<small>${tag}</small></span>
      <span class="deg">${signG(signOf(b.lon), "s")} ${dms(b.lon)}<small>${SIGN[signOf(b.lon)]} 第${b.house}</small></span>
      <span class="alt">${b.id === 10 ? "" : `${b.alt > 0 ? "↑" : "↓"}${Math.round(Math.abs(b.alt))}°<small>${COMPASS[Math.round(b.az / 22.5) % 16]}</small>`}</span></button>`;
  })));
  const el = [0, 0, 0, 0], mo = [0, 0, 0], a0 = signOf(S.asc);
  S.body.slice(0, 7).forEach(b => { el[signOf(b.lon) % 4]++; mo[signOf(b.lon) % 3]++; });
  page(1, rows(HOUSE.map((k, i) => {
    const s = (a0 + i) % 12, r = [4, 3, 2, 1, 0, 2, 3, 4, 5, 6, 6, 5][s];
    return `<div class="item house"><span class="no">${i + 1}</span>${signG(s)}<span>${SIGN[s]}<small>${k}・主 ${BODY[r]}</small></span><span class="occ">${S.body.slice(0, 10).filter(b => b.house === i + 1).map(b => bodyG(b.id, "s")).join("")}</span></div>`;
  })) + `<p class="foot">七天体　${ELEMENT.map((t, i) => t + el[i]).join(" ")}　／　${MODE.map((t, i) => t + mo[i]).join(" ")}</p>`);
}
function drawSheet() {
  const b = S.body[sheetBody], f = F && F.body[sheetBody], s = signOf(b.lon), kv = [];
  const add = (k, v, w) => kv.push(`<div${w ? ' class="w"' : ""}><dt>${k}</dt><dd>${v}</dd></div>`);
  add("黄経", `${SIGN[s]} ${dms(b.lon)}`);
  add("速度 /日", `${b.speed < 0 ? "−" : "+"}${ang(Math.abs(b.speed))}${retroShown(b) ? " 逆行" : ""}`);
  add("ハウス", `第${b.house} ${HOUSE[b.house - 1]}`);
  if (b.id !== 10) {
    add("黄緯", ang(b.lat, true));
    add("赤経・赤緯", `${Math.floor(b.ra / 15)}h${two(Math.floor(b.ra * 4) % 60)}m ${ang(b.dec, true)}`);
    add("高度・方位", `${ang(b.alt, true)} ${COMPASS[Math.round(b.az / 22.5) % 16]}`);
    add("距離", b.id === 1 ? `${(Math.round(S.moonKm / 1000) * 1000).toLocaleString("ja-JP")} km` : `${b.dist.toFixed(2)} au`);
  }
  if (b.id < 7) add("キーワード", KW[b.id]);
  if (f && f.ingT) add("次の星座", `${SIGN[f.ingSign]} ${when(f.ingT, ingErr(b.id))}`);
  if (f && f.stT) add(f.stDir < 0 ? "逆行開始" : "順行に戻る", when(f.stT, 43200));
  if (b.id < 7) {
    add("品位", digs(b) + (b.solar ? "・" + SOLAR[b.solar] : ""));
    add("点数", `本質 ${b.ess >= 0 ? "+" : ""}${b.ess}　偶有 ${b.acc >= 0 ? "+" : ""}${b.acc}`);
  }
  if (f && b.id !== 10) add("出・南中・没", `${hhmm(f.rise)}　${hhmm(f.transit)}　${hhmm(f.set)}`, 1);
  add("支配", `星座 ${BODY[b.rDom]}　三区分 ${BODY[b.rTrip]}　境界 ${BODY[b.rTerm]}　フェイス ${BODY[b.rFace]}`, 1);
  const as = S.aspects.filter(a => a.a === b.id || a.b === b.id).map(a => `<span class="nb">${aspG(a.type, "s")}${bodyG(a.a === b.id ? a.b : a.a, "s")} ${ang(a.orb)}</span>`);
  if (as.length) add("角度", as.join("　"), 1);
  $("sheet").innerHTML = `<header>${bodyG(b.id, "l")}<div><b>${BODY[b.id]}</b><p>${SIGN[s]} ${ELEMENT[s % 4]}・${MODE[s % 3]}</p></div><button class="x" data-act="close" aria-label="閉じる">×</button></header><dl class="kv">${kv.join("")}</dl>`;
}
function openSheet(b) { sheetBody = b; drawSheet(); $("shade").hidden = $("sheet").hidden = false; }
function closeSheet() { sheetBody = -1; $("shade").hidden = $("sheet").hidden = true; }

function exactOf(a) {
  const key = `${a.a}.${a.b}.${a.type}`, n = now();
  const e = exact[key];
  if (!e || n - e.at > 600 || (e.t && e.t < n)) exact[key] = { at: n, t: Engine.perfects(n, a.a, a.b, a.type) };
  return exact[key].t;
}
function drawAspects() {
  if (sub[2] < 2) {
    const list = S.aspects.filter(a => (a.b < 7) === (sub[2] === 0)).sort((x, y) => x.orb - y.orb).map(a => {
      const t = a.applying ? exactOf(a) : 0;
      return `<div class="item asp"><span class="tri">${bodyG(a.a)}${aspG(a.type)}${bodyG(a.b)}</span><span class="nm">${BODY[a.a]} ${ASPECT[a.type]} ${BODY[a.b]}<small>${ASPECT_KW[a.type]}${t ? ` ／ 成立 ${when(t, errOf(a.a, a.b))}` : ""}</small></span><span class="orb">${ang(a.orb)}<small>${a.applying ? "接近" : "分離"}</small></span></div>`;
    });
    return page(2, paged(list, 42, "許容度内の角度なし"));
  }
  let g = "";
  for (let i = 0; i < 10; i++) {
    g += "<tr>";
    for (let j = 0; j < 10; j++) {
      const a = j < i && S.aspects.find(a => a.a === j && a.b === i);
      g += j === i ? `<td class="h">${bodyG(i, "s")}</td>` : j > i ? '<td class="n"></td>' : `<td>${a ? `${aspG(a.type, "s")}<small>${a.orb.toFixed(1)}</small>` : ""}</td>`;
    }
    g += "</tr>";
  }
  page(2, `<table class="grid">${g}</table><p class="foot">数字は正確な角度からのずれ（度）</p>`);
}

function evRow(e) {
  let ic = "", tx = "", err = e.err;
  if (e.kind === 0) { ic = bodyG(e.a) + aspG(e.b) + bodyG(e.c); tx = `${BODY[e.a]} ${ASPECT[e.b]} ${BODY[e.c]}`; }
  else if (e.kind === 1) { ic = bodyG(e.a) + signG(e.b); tx = `${BODY[e.a]} ${SIGN[e.b]}へ`; }
  else if (e.kind === 2) { ic = bodyG(e.a); tx = `${BODY[e.a]} ${e.b ? "逆行開始" : "順行に戻る"}`; }
  else if (e.kind === 3) { ic = moonIcon(e.a * 90); tx = PH4[e.a]; }
  else { ic = bodyG(0); tx = e.kind === 4 ? "日の出" : "日の入り"; }
  const tm = err > 10800 ? "<i>この日頃</i>" : `${hm(e.t)}${err > 180 ? "<i> 頃</i>" : ""}`;
  return `<div class="item ev"><span class="tm">${tm}</span><span class="ic">${ic}</span><span>${tx}</span></div>`;
}
function drawTime() {
  const n = now();
  if (sub[3] === 0) {
    if (!S.hValid) return page(3, '<p class="empty">日の出・日の入りがないため算出できません</p>');
    const CH = [6, 5, 4, 0, 3, 2, 1], st = CH.indexOf(S.dayRuler);
    const h = k => {
      const day = k < 12, a = day ? S.sunrise : S.sunset, len = (day ? S.sunset - S.sunrise : S.nextSunrise - S.sunset) / 12, b = CH[(st + k) % 7];
      return `<div class="item hour${k === S.hourIndex ? " now" : ""}"><span class="no">${k % 12 + 1}</span>${bodyG(b, "s")}<span>${BODY[b]}</span><span class="tm">${hm(a + (k % 12) * len)}</span></div>`;
    };
    const col = (o, t) => `<div class="col"><p class="sub">${t}</p>${rows(Array.from({ length: 12 }, (_, i) => h(o + i)))}</div>`;
    return page(3, `<div class="cols">${col(0, `昼 ${hm(S.sunrise)}–${hm(S.sunset)}`)}${col(12, `夜 ${hm(S.sunset)}–${hm(S.nextSunrise)}`)}</div><p class="foot">日の主 ${BODY[S.dayRuler]}　現在の時 ${BODY[S.hourRuler]}（${hm(S.hourEnd)}まで）</p>`);
  }
  if (sub[3] === 1) {
    const d0 = dayNo(n), by = Array.from({ length: 7 }, () => []);
    if (F) for (const e of F.events) {
      if (e.t < n - 30 || (e.kind === 0 && e.a === 0 && e.c === 1 && e.b % 2 === 0)) continue;  // Sun-Moon 0/90/180 = lunar phase
      const k = dayNo(Math.round(e.t / 60) * 60) - d0;
      if (k >= 0 && k < 7) by[k].push(e);
    }
    const days = by.map((_, k) => { const t = n + k * 86400; return `<button data-day="${k}" aria-pressed="${dayPick === k}"><small>${k === 0 ? (fixed ? "当日" : "今日") : WEEKJ[D(t).getDay()]}</small>${D(t).getDate()}</button>`; }).join("");
    return page(3, `<div class="days">${days}</div>` + paged(by[dayPick].map(evRow), 40, "この日の予定なし"));
  }
  const m = S.body[1], f = F && F.body[1], kv = [];
  const add = (k, v) => kv.push(`<div><dt>${k}</dt><dd>${v}</dd></div>`);
  add("位置", `${SIGN[signOf(m.lon)]} ${dms(m.lon)}`); add("輝面", `${Math.round(S.illum * 100)}%`);
  add("月齢", `約${(S.elong / 360 * 29.53).toFixed(1)}`); add("速度 /日", ang(m.speed, true));
  add("高度・方位", `${ang(m.alt, true)} ${COMPASS[Math.round(m.az / 22.5) % 16]}`); add("距離", `${(Math.round(S.moonKm / 1000) * 1000).toLocaleString("ja-JP")} km`);
  add("出・没", f ? `${hhmm(f.rise)}　${hhmm(f.set)}` : "—"); add("次の星座", `${SIGN[(signOf(m.lon) + 1) % 12]} ${when(S.ingress, 700)}`);
  page(3, `<div class="moonbox"><svg viewBox="-13 -13 26 26" role="img" aria-label="${PHASE[S.phase]}">${moonSvg(12, S.elong)}</svg><div><b>${PHASE[S.phase]}</b><span class="sub">${PHASE_KW[S.phase]}</span></div></div><dl class="kv">${kv.join("")}</dl>
    <div class="quad moons">${phases().map(([t, k]) => `<div><svg viewBox="-13 -13 26 26" width="26" height="26" aria-hidden="true">${moonSvg(11, k * 90 || .01)}</svg><span>${PH4[k]}</span><small>${mday(t)} ${hm(t)}頃</small></div>`).join("")}</div>`, "moonv");
}

let wake = null;
function drawGuide() {
  const lg = (ic, a, b) => `<div class="item lg"><span>${ic}</span><span>${a}</span><span>${b}</span></div>`;
  const tx = (a, b) => `<div class="item lg t"><span>${a}</span><span>${b}</span></div>`;
  const V = [
    () => rows([lg('<span class="clay">▶</span>', "ASC", "東の地平線に昇る点（左端）"), lg("- -", "横の破線", "地平線。上側がいま見える空"), lg('<span class="sub">MC</span>', "もう一本の破線", "南中点と反対側のIC"),
      lg(signG(0), "外の環", "黄道12星座 各30°"), lg('<span class="sub">1–12</span>', "内側の数字", "ハウス（昇る星座が第1）"), lg('<span class="clay">—</span>', "暖色の線", "六分60°・三分120° 調和"),
      lg('<span class="blue">—</span>', "青い線", "矩90°・衝180° 緊張"), lg("— -", "実線 / 破線", "接近中 / 分離中"), lg('<span class="sub">R</span>', "度数の後のR", "逆行"), lg(bodyG(0), "天体をタップ", "詳細が開く")]),
    () => rows([["NEXT", "月が星座を出る前に作る次の角度"], ["ボイド", "月が星座を出るまで角度なし"], ["LORD", "昇る星座の支配星と、その位置・品位"], ["HOUR", "昼と夜を12等分した惑星時間"], ["MOON", "月相と輝いている割合"], ["SECT", "太陽が地平線の上か下か"], ["ACTION", "太陽と火星の強さの目安"], ["DIALOGUE", "水星と金星の強さの目安"], ["REFLECTION", "土星と月の強さの目安"]].map(([a, b]) => tx(`<span class="en">${a}</span>`, b))),
    () => rows(BODY.map((t, i) => lg(bodyG(i), t, KW[i] || (i === 10 ? "月の昇交点" : "近代の天体")))),
    () => rows(SIGN.map((t, i) => lg(signG(i), t, `${ELEMENT[i % 4]}・${MODE[i % 3]}`))),
    () => rows(ASPECT.map((t, i) => lg(aspG(i), `${t} ${ANGLE[i]}°`, ASPECT_KW[i])).concat([tx("接近", "これから成立"), tx("分離", "成立した後"), tx("頃", "天体の遅さに応じて時刻に幅がある")])),
    () => rows([["本宮", "自分の星座"], ["高揚", "力が高まる星座"], ["三区分", "元素を支配"], ["境界", "度数域を支配"], ["フェイス", "10°域を支配"], ["損傷", "本宮の反対"], ["失墜", "高揚の反対"], ["漂泊", "品位なし"], ["カジミ", "太陽と17'以内"], ["燃焼", "太陽と8°30'以内"], ["光線下", "太陽と17°以内"]].map(([a, b]) => tx(a, b))),
    () => `<div class="set"><p>いまの場所と時刻の空を、古典占星術の形式で示します。解釈は読む人に委ねます。</p><div class="btns"><button class="btn line" data-act="wake">${wake ? "常時点灯を止める" : "画面を消さない"}</button><button class="btn line" data-act="gate">位置を変更</button><button class="btn line" data-act="when">日時と場所を指定</button></div>
      <p class="note">トロピカル黄道・ホールサイン。品位と点数はリリー、境界はエジプト式、三区分はドロテウス。位置の誤差は月が最大約4'、ほかは約2'以内。出没は通常1分未満（地形は含まない）。</p><p class="note">位置は約1km単位に丸め、この端末の中だけに保存します。外部には送信しません。</p></div>`];
  page(4, V[sub[4]]());
}
async function toggleWake() {
  try {
    if (wake) { const w = wake; wake = null; store.set("wake", false); await w.release(); }
    else { wake = await navigator.wakeLock.request("screen"); store.set("wake", true); wake.onrelease = () => { wake = null; if (S) drawGuide(); }; }
  } catch { wake = null; alert("この環境では画面の常時点灯を使えません"); }
  drawGuide();
}
async function rewake() {
  if (!store.get("wake") || wake || !navigator.wakeLock) return;
  try { wake = await navigator.wakeLock.request("screen"); wake.onrelease = () => { wake = null; if (S) drawGuide(); }; if (S) drawGuide(); } catch { }
}

// ---- first run / manual position ------------------------------------------------------------
function openGate() {
  const g = $("gate");
  g.hidden = false; g.className = "";
  g.innerHTML = `<svg width="120" height="120" viewBox="-60 -60 120 120" fill="none" stroke="var(--ring)" aria-hidden="true"><circle r="54"/><circle r="36"/><circle r="3" fill="var(--gold)" stroke="none"/><circle cx="36" r="4.5" fill="var(--ink)" stroke="none"/><path d="M-54 0H54" stroke-dasharray="4 4"/></svg>
    <h1>Star Board</h1><p>いまいる場所の空を計算します。位置はこの端末の中だけで使います。</p>
    <button class="btn" data-act="locate" id="gl">現在地を使う</button><p id="gm" role="status"></p>
    <form class="pos"><label>緯度（北緯＋）<input name="lat" inputmode="text" autocomplete="off"></label><label>経度（東経＋）<input name="lon" inputmode="text" autocomplete="off"></label><button class="btn line">この位置で表示</button></form>
    ${pos ? '<button class="btn line" data-act="ungate">戻る</button>' : '<button class="btn line" data-act="when">日時と場所を指定</button>'}`;
  gateState();
}
function gateState() {
  if ($("gate").hidden || !$("gl")) return;
  $("gl").disabled = locState === "busy";
  $("gm").textContent = locState === "busy" ? "取得中…" : locState;
}
// ---- another date and place (kept in memory only, gone when the app closes) --------------------
let last = null;
function openWhen() {
  const g = $("gate"), z = [...new Set(PLACES.map(p => p.zone))], d = D(now()), v = last || { date: `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`, time: `${two(d.getHours())}:${two(d.getMinutes())}`, place: pos ? "here" : "", lat: "", lon: "", zone: "" };
  const opt = (val, t) => `<option value="${val}"${String(v.place) === String(val) ? " selected" : ""}>${t}</option>`;
  const my = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Tokyo";
  if (!z.includes(my)) z.unshift(my);
  g.hidden = false; g.className = "when";
  g.innerHTML = `<h1>Date &amp; Place</h1><p>その日時・場所の空を表示します。入力は保存されず、アプリを閉じると消えます。</p>
    <form class="pos" id="wf"><label>日付（1900–2100年）<input type="date" name="date" min="1900-01-01" max="2100-12-31" value="${v.date}" required></label><label>時刻（現地）<input type="time" name="time" value="${v.time}" required></label>
    <label class="w">場所<select name="place" required><option value="">選択してください</option>${pos ? opt("here", "現在地") : ""}${opt("custom", "緯度・経度を入力")}<optgroup label="日本">${PLACES.map((p, i) => p.zone === "Asia/Tokyo" ? opt(i, p.name) : "").join("")}</optgroup><optgroup label="海外">${PLACES.map((p, i) => p.zone !== "Asia/Tokyo" ? opt(i, p.name) : "").join("")}</optgroup></select></label>
    <div class="cu w" id="cu"><label>緯度（北緯＋）<input name="lat" autocomplete="off" value="${v.lat}"></label><label>経度（東経＋）<input name="lon" autocomplete="off" value="${v.lon}"></label><label class="w">タイムゾーン<select name="zone">${z.map(x => `<option${(v.zone || my) === x ? " selected" : ""}>${x}</option>`).join("")}</select></label></div>
    <p id="gm" class="w" role="status"></p><button class="btn">この日時を表示</button><button type="button" class="btn line" data-act="ungate">戻る</button></form>`;
  cuShow();
}
const cuShow = () => { const f = $("wf"); if (f) $("cu").hidden = f.place.value !== "custom"; };
document.addEventListener("change", e => { if (e.target.name === "place") cuShow(); });
function submitWhen(f) {
  const n = v => parseFloat(v.normalize("NFKC").replace(/[−ー]/g, "-")), say = t => { $("gm").textContent = t; };
  const m = /^(\d{4})-(\d\d)-(\d\d)$/.exec(f.date.value), h = /^(\d\d):(\d\d)/.exec(f.time.value), pv = f.place.value;
  if (!m || +m[1] < 1900 || +m[1] > 2100) return say("日付は1900〜2100年で入力してください");
  if (!h) return say("時刻を入力してください");
  if (!pv) return say("場所を選択してください");
  let p, zone, name;
  if (pv === "here") { p = pos; zone = null; name = "現在地"; }
  else if (pv === "custom") { p = { lat: n(f.lat.value), lon: n(f.lon.value) }; zone = f.zone.value; name = "指定の場所"; }
  else { const c = PLACES[+pv]; p = { lat: c.lat, lon: c.lon }; zone = c.zone; name = c.name; }
  if (!validPos(p)) return say("緯度は±89、経度は±180の範囲で入力してください");
  if (!zone) zone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Tokyo";
  const local = Date.UTC(+m[1], +m[2] - 1, +m[3], +h[1], +h[2]) / 1000;
  last = { date: f.date.value, time: f.time.value, place: pv, lat: f.lat.value, lon: f.lon.value, zone: f.zone.value };
  setFixed({ t: toUtc(local, zone), zone, name, pos: { lat: p.lat, lon: p.lon } });
}
function setFixed(v) {
  fixed = v; if (!v) last = null;
  F = null; exact = {}; pg = 0; dayPick = 0; closeSheet();
  $("gate").hidden = true;
  drawHead(); refresh(true);
  if (!v && !pos) openGate();
}
document.addEventListener("submit", e => {
  e.preventDefault();
  if (e.target.id === "wf") return submitWhen(e.target);
  const n = v => parseFloat(v.normalize("NFKC").replace(/[−ー]/g, "-"));
  const lat = n(e.target.lat.value), lon = n(e.target.lon.value);
  if (!validPos({ lat, lon })) { $("gm").textContent = "緯度は±89、経度は±180の範囲で入力してください"; return; }
  locState = ""; fixed = null; last = null; setPos(lat, lon, "manual"); drawHead();
});

// ---- events and loop ------------------------------------------------------------------------
document.addEventListener("click", e => {
  const b = e.target.closest("[data-body],[data-tab],[data-sub],[data-day],[data-act]");
  if (!b) { if (e.target === $("shade")) closeSheet(); return; }
  const d = b.dataset;
  if (d.body) openSheet(+d.body);
  else if (d.tab) { const p = $("pages"); p.scrollTo({ left: p.clientWidth * +d.tab, behavior: Math.abs(+d.tab - tab) > 1 || matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); }
  else if (d.sub) { sub[+d.k] = +d.sub; pg = 0; drawers[+d.k](); }
  else if (d.day) { dayPick = +d.day; pg = 0; drawTime(); }
  else if (d.act === "next" || d.act === "prev") { pg = Math.max(0, pg + (d.act === "next" ? 1 : -1)); drawPage(); }
  else if (d.act === "locate") locate();
  else if (d.act === "close") closeSheet();
  else if (d.act === "when") openWhen();
  else if (d.act === "live") setFixed(null);
  else if (d.act === "wake") toggleWake();
  else if (d.act === "gate") openGate();
  else if (d.act === "ungate") { if (pos || fixed) $("gate").hidden = true; else openGate(); }
});
document.addEventListener("keydown", e => { if (e.key === "Escape") closeSheet(); });
$("pages").addEventListener("scroll", () => {
  const k = Math.round($("pages").scrollLeft / $("pages").clientWidth);
  if (k !== tab && k >= 0 && k < 5) { tab = k; pg = 0; drawTabs(); drawPage(); }
}, { passive: true });
addEventListener("resize", () => { $("pages").scrollLeft = $("pages").clientWidth * tab; if (S) drawPage(); });

const drawers = [drawSky, drawPlanets, drawAspects, drawTime, drawGuide];
function drawPage() { if (S) drawers[tab](); }
function refresh(all) {
  const q = fixed ? fixed.pos : pos;
  if (!q) return;
  const n = now();
  document.documentElement.dataset.theme = isNight() ? "night" : "paper";
  S = Engine.snap(n, q.lat, q.lon, tzOff(n));
  if (!F || n - F.t > 300 || n < F.t) { F = Engine.forecast(n, q.lat, q.lon, 7); exact = {}; }
  if (all) { drawSky(); drawPlanets(); drawAspects(); drawTime(); drawGuide(); } else drawPage();
  if (sheetBody >= 0) drawSheet();
}
let lastDraw = 0;
function tick() {
  drawHead();
  if (document.hidden || fixed) return;
  const n = Math.floor(now());
  if (Math.abs(n - lastDraw) >= 10 || n % 60 === 0) { lastDraw = n; refresh(false); }
  if (pos && pos.src === "gps" && locState !== "busy" && Date.now() - lastFetch > 600000) locate();
}
document.addEventListener("visibilitychange", () => {
  if (document.hidden) return;
  refresh(true); rewake();
  if (!fixed && pos && pos.src === "gps" && Date.now() - lastFetch > 60000) locate();
});

(async () => {
  document.documentElement.dataset.theme = isNight() ? "night" : "paper";
  drawTabs(); drawHead();
  try { await Engine.load(); }
  catch (e) { $("p0").innerHTML = '<p class="empty">計算エンジンを読み込めませんでした。開き直してください。</p>'; console.error(e); return; }
  const saved = store.get("pos");
  if (validPos(saved)) { pos = saved; refresh(true); drawHead(); if (pos.src === "gps") locate(); } else openGate();
  setInterval(tick, 1000);
  rewake();
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(console.error);
})();
