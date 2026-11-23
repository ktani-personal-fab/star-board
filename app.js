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
const now = () => nowMs() / 1000;
const D = t => new Date(t * 1000);
const hm = t => { const d = D(Math.round(t / 60) * 60); return `${two(d.getHours())}:${two(d.getMinutes())}`; };
const dayNo = t => { const d = D(t); return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5); };
const mday = t => `${D(t).getMonth() + 1}/${D(t).getDate()}`;
function when(t, err = 0, n = now()) {           // precision follows the engine's uncertainty
  t = Math.round(t / 60) * 60;
  const k = dayNo(t) - dayNo(n), y = D(t).getFullYear() !== D(n).getFullYear() ? D(t).getFullYear() + "/" : "";
  const day = k === 0 ? "" : k === 1 ? "明日 " : y + mday(t) + " ";
  if (err > 10800) return k === 0 ? "今日頃" : (k === 1 ? "明日" : y + mday(t)) + "頃";
  return day + hm(t) + (err > 180 ? "頃" : "");
}
const hhmm = t => t ? (dayNo(t) !== dayNo(now()) ? "翌" : "") + hm(t) : "—";
const isNight = () => { const h = D(now()).getHours(); return h >= 19 || h < 5; };

// ---- state ----------------------------------------------------------------------------------
let pos = null, S = null, F = null, sheetBody = -1, tab = 0, filter = "all", locState = "", exact = {}, lastFetch = 0;
const store = { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } } };
const validPos = p => p && Number.isFinite(p.lat) && Number.isFinite(p.lon) && Math.abs(p.lat) <= 89 && Math.abs(p.lon) <= 180;
const errOf = (a, b) => ((a === 1 ? .09 : .03) + (b === 1 ? .09 : .03)) / Math.max(1e-4, Math.abs(S.body[a].speed - S.body[b].speed)) * 86400;
const ingErr = b => b === 10 ? 0 : (b === 1 ? .09 : .03) / Math.max(1e-3, Math.abs(S.body[b].speed)) * 86400;

function setPos(lat, lon, src) {
  // ~1 km is plenty for the chart, and it is all that is kept
  pos = { lat: Math.round(lat * 100) / 100, lon: Math.round(lon * 100) / 100, src, at: Date.now() };
  store.set("pos", pos);
  $("gate").hidden = true;
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
function locFail(msg) { locState = msg; drawHead(); if (!pos) openGate(); gateState(); }

// ---- head and tabs --------------------------------------------------------------------------
function drawHead() {
  const d = D(now());
  const c = pos ? `${two(Math.floor(Math.abs(pos.lat)))}.--${pos.lat < 0 ? "S" : "N"} ${Math.floor(Math.abs(pos.lon))}.--${pos.lon < 0 ? "W" : "E"}` : "—";
  const st = locState === "busy" ? "現在地を取得中" : locState ? (pos ? "前回の位置を使用" : locState) : pos ? (pos.src === "gps" ? `現在地 ${hm(pos.at / 1000)}` : "手入力の位置") : "";
  const html = `<div id="clock">${two(d.getHours())}:${two(d.getMinutes())}<small>${two(d.getSeconds())}</small></div>
    <div class="where"><span>${d.getFullYear()}.${two(d.getMonth() + 1)}.${two(d.getDate())} ${WEEK[d.getDay()]}</span><br><span>${c}</span><br>
    <button data-act="locate" class="${locState && locState !== "busy" ? "warn" : ""}" aria-label="現在地を更新">${st} ↻</button></div>`;
  const h = $("head");
  if (!h.firstChild || h.dataset.k !== c + st) { h.innerHTML = html; h.dataset.k = c + st; }
  else {
    $("clock").innerHTML = `${two(d.getHours())}:${two(d.getMinutes())}<small>${two(d.getSeconds())}</small>`;
    h.querySelector(".where span").textContent = `${d.getFullYear()}.${two(d.getMonth() + 1)}.${two(d.getDate())} ${WEEK[d.getDay()]}`;
  }
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
  for (let it = 0; it < 120; it++) {
    let moved = false;
    for (let i = 0; i < 10; i++) {
      const a = o[i], b = o[(i + 1) % 10], g = rev(off[b] - off[a]);
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
const digs = b => DIG.filter(([f]) => b.flags & f).map(([, t]) => t).join("・");
function drawSky() {
  const m = S.body[1], lord = S.body[S.lord], phaseN = ["新月", "上弦", "満月", "下弦"];
  const quad = [["ASC", S.asc], ["MC", S.mc], ["DSC", S.asc + 180], ["IC", S.mc + 180]].map(([k, l]) => `<div><span class="en">${k}</span><b>${signG(signOf(l), "s")} ${Math.floor(rev(l) % 30)}°${two(Math.floor(rev(l) * 60) % 60)}'</b></div>`).join("");
  let next;
  if (S.voc) next = `<div class="flow">${bodyG(1, "l")}<b>ボイド</b><span class="t">${when(S.ingress, 700)}</span><span class="sub">まで</span></div><p>月が${SIGN[signOf(m.lon)]}を出るまで主要な角度なし</p>`;
  else next = `<div class="flow">${bodyG(1, "l")}${aspG(S.nextAspect, "l")}${bodyG(S.nextPlanet, "l")}<span class="t">${when(S.nextTime, 700)}</span></div>
    <p>月 ${ASPECT[S.nextAspect]} ${BODY[S.nextPlanet]}（${ANGLE[S.nextAspect]}°）<br>${KW[1]} × ${KW[S.nextPlanet]} ／ ${ASPECT_KW[S.nextAspect]}<br>月は${when(S.ingress, 700)}に${SIGN[(signOf(m.lon) + 1) % 12]}へ</p>`;
  const hour = S.hValid ? `<b>${bodyG(S.hourRuler)} ${BODY[S.hourRuler]}</b> <span class="sub">${hm(S.hourStart)}–${hm(S.hourEnd)}</span><p>${KW[S.hourRuler]}<br>${S.hourIndex < 12 ? "昼" : "夜"}の第${S.hourIndex % 12 + 1}時 ／ 日の主 ${BODY[S.dayRuler]}</p>` : `<p>日の出・日の入りがないため算出できません</p>`;
  const up = F ? F.phase.map((t, k) => [t, k]).filter(x => x[0]).sort((a, b) => a[0] - b[0])[0] : null;
  $("p0").innerHTML = `<div>${wheel()}<div class="quad">${quad}</div></div><div>
    <div class="row"><span class="en">NEXT</span><div>${next}</div></div>
    <div class="row"><span class="en">LORD</span><div><b>${bodyG(S.lord)} ${BODY[S.lord]}</b> <span class="sub">${SIGN[signOf(lord.lon)]} ${dms(lord.lon)}${retroShown(lord) ? " 逆行" : ""}</span><p>${KW[S.lord]}<br>第${lord.house}ハウス ／ ${digs(lord)}${lord.solar ? "・" + SOLAR[lord.solar] : ""}</p></div></div>
    <div class="row"><span class="en">HOUR</span><div>${hour}</div></div>
    <div class="row"><span class="en">MOON</span><div><b><svg class="g" viewBox="-11 -11 22 22" style="stroke:none">${moonSvg(9, S.elong)}</svg> ${PHASE[S.phase]}</b> <span class="sub">${SIGN[signOf(m.lon)]} ${dms(m.lon)}</span>
      <p>${PHASE_KW[S.phase]}<br>輝面 ${Math.round(S.illum * 100)}% ／ 月齢 約${(S.elong / 360 * 29.53).toFixed(1)}${up ? `<br>${phaseN[up[1]]} ${when(up[0], 600)}` : ""}</p></div></div>
    <div class="row"><span class="en">SECT</span><div><b>${S.day ? "昼のチャート" : "夜のチャート"}</b> <span class="sub">太陽高度 ${ang(S.sunAlt, true)}</span><p>フォルトゥナ ${SIGN[signOf(S.fortune)]} ${dms(S.fortune)}<br>スピリット ${SIGN[signOf(S.spirit)]} ${dms(S.spirit)}</p></div></div>
    ${S.hValid ? `<div class="axes">${AX.map((t, i) => `<section><div><span class="en">${t}</span>${S["ax" + i]}</div><div class="bar"><i style="width:${S["ax" + i]}%;background:var(--${AXC[i]})"></i></div></section>`).join("")}</div>` : ""}</div>`;
}

// ---- PLANETS --------------------------------------------------------------------------------
function drawPlanets() {
  const rows = S.body.map(b => {
    const tag = [b.id < 7 ? digs(b) : "", b.solar ? SOLAR[b.solar] : "", retroShown(b) ? "逆行" : ""].filter(Boolean).join("・") || (b.id === 10 ? "昇交点（平均）" : "順行");
    return `<button class="item planet" data-body="${b.id}">${bodyG(b.id)}<span class="nm">${BODY[b.id]}<small>${tag}</small></span>
      <span class="deg">${signG(signOf(b.lon), "s")} ${dms(b.lon)}<small>${SIGN[signOf(b.lon)]} 第${b.house}</small></span>
      <span class="alt">${b.id === 10 ? "" : `${b.alt > 0 ? "↑" : "↓"}${Math.round(Math.abs(b.alt))}°<small>${COMPASS[Math.round(b.az / 22.5) % 16]}</small>`}</span></button>`;
  }).join("");
  const el = [0, 0, 0, 0], mo = [0, 0, 0];
  S.body.slice(0, 7).forEach(b => { el[signOf(b.lon) % 4]++; mo[signOf(b.lon) % 3]++; });
  const a0 = signOf(S.asc);
  const houses = HOUSE.map((k, i) => {
    const s = (a0 + i) % 12, r = [4, 3, 2, 1, 0, 2, 3, 4, 5, 6, 6, 5][s];
    return `<div class="item house"><span class="no">${i + 1}</span>${signG(s)}<span>${SIGN[s]}<small>${k} ／ 主 ${BODY[r]}</small></span><span class="occ">${S.body.slice(0, 10).filter(b => b.house === i + 1).map(b => bodyG(b.id, "s")).join("")}</span></div>`;
  }).join("");
  $("p1").innerHTML = `<h2>PLANETS<span>位置　　高度・方位</span></h2><div class="list">${rows}</div><p class="note">行をタップすると詳細。↑は地平線の上、↓は下。</p>
    <h2>BALANCE<span>七天体</span></h2><dl class="kv"><dt>元素</dt><dd>${ELEMENT.map((t, i) => `${t} ${el[i]}`).join("　")}</dd><dt>区分</dt><dd>${MODE.map((t, i) => `${t} ${mo[i]}`).join("　")}</dd></dl>
    <h2>HOUSES<span>ホールサイン</span></h2><div class="list">${houses}</div>`;
}
function drawSheet() {
  const b = S.body[sheetBody], f = F && F.body[sheetBody], s = signOf(b.lon), kv = [];
  const add = (k, v) => kv.push(`<dt>${k}</dt><dd>${v}</dd>`);
  add("黄経", `${SIGN[s]} ${dms(b.lon)}`);
  if (b.id !== 10) { add("黄緯", ang(b.lat, true)); add("赤経 / 赤緯", `${Math.floor(b.ra / 15)}h${two(Math.floor(b.ra * 4) % 60)}m / ${ang(b.dec, true)}`); }
  add("速度", `${b.speed < 0 ? "−" : "+"}${ang(Math.abs(b.speed))} /日${retroShown(b) ? "（逆行）" : ""}`);
  add("ハウス", `第${b.house} ${HOUSE[b.house - 1]}`);
  if (b.id !== 10) {
    add("高度 / 方位", `${ang(b.alt, true)} / ${COMPASS[Math.round(b.az / 22.5) % 16]} ${Math.round(b.az) % 360}°`);
    if (f) add("出 / 南中 / 没", `${hhmm(f.rise)} / ${hhmm(f.transit)} / ${hhmm(f.set)}`);
    add("距離", b.id === 1 ? `${(Math.round(S.moonKm / 1000) * 1000).toLocaleString("ja-JP")} km` : `${b.dist.toFixed(2)} au`);
  }
  if (f && f.ingT) add("次の星座", `${SIGN[f.ingSign]} ${when(f.ingT, ingErr(b.id))}`);
  if (f && f.stT) add(f.stDir < 0 ? "逆行開始" : "順行に戻る", when(f.stT, 43200));
  if (b.id < 7) {
    add("品位", digs(b)); if (b.solar) add("太陽との関係", SOLAR[b.solar]);
    add("点数", `本質 ${b.ess >= 0 ? "+" : ""}${b.ess} ／ 偶有 ${b.acc >= 0 ? "+" : ""}${b.acc}`);
    add("キーワード", KW[b.id]);
  }
  add("支配", `星座 ${BODY[b.rDom]} ／ 三区分 ${BODY[b.rTrip]}<br>境界 ${BODY[b.rTerm]} ／ フェイス ${BODY[b.rFace]}`);
  const as = S.aspects.filter(a => a.a === b.id || a.b === b.id).map(a => { const o = a.a === b.id ? a.b : a.a; return `${aspG(a.type, "s")} ${BODY[o]} ${ang(a.orb)}`; });
  if (as.length) add("角度", as.join("<br>"));
  $("sheet").innerHTML = `<header>${bodyG(b.id, "l")}<div><b>${BODY[b.id]}</b><p>${SIGN[s]} ${ELEMENT[s % 4]}・${MODE[s % 3]}</p></div><button class="x" data-act="close" aria-label="閉じる">×</button></header><dl class="kv">${kv.join("")}</dl>`;
}
function openSheet(b) { sheetBody = b; drawSheet(); $("shade").hidden = $("sheet").hidden = false; $("sheet").scrollTop = 0; }
function closeSheet() { sheetBody = -1; $("shade").hidden = $("sheet").hidden = true; }

// ---- ASPECTS --------------------------------------------------------------------------------
function exactOf(a) {
  const key = `${a.a}.${a.b}.${a.type}`, n = now();
  const e = exact[key];
  if (!e || n - e.at > 600 || (e.t && e.t < n)) exact[key] = { at: n, t: Engine.perfects(n, a.a, a.b, a.type) };
  return exact[key].t;
}
function drawAspects() {
  const list = S.aspects.slice().sort((x, y) => x.orb - y.orb);
  const row = a => {
    const t = a.applying ? exactOf(a) : 0;
    return `<div class="item asp"><span class="tri">${bodyG(a.a)}${aspG(a.type)}${bodyG(a.b)}</span><span>${BODY[a.a]} ${ASPECT[a.type]} ${BODY[a.b]}<small>${ASPECT_KW[a.type]}${t ? ` ／ 成立 ${when(t, errOf(a.a, a.b))}` : ""}</small></span><span class="orb">${ang(a.orb)}<small>${a.applying ? "接近" : "分離"}</small></span></div>`;
  };
  const C = list.filter(a => a.b < 7), O = list.filter(a => a.b >= 7);
  let g = "";
  for (let i = 1; i < 10; i++) {
    g += "<tr>";
    for (let j = 0; j < i; j++) { const a = S.aspects.find(a => a.a === j && a.b === i); g += `<td>${a ? aspG(a.type, "s") : ""}</td>`; }
    g += `<td class="h">${bodyG(i, "s")}</td>` + (i < 9 ? `<td colspan="${9 - i}" style="border:0"></td>` : "") + "</tr>";
  }
  g = `<tr><td class="h">${bodyG(0, "s")}</td><td colspan="9" style="border:0"></td></tr>` + g;
  $("p2").innerHTML = `<h2>ASPECTS<span>七天体 ${C.length}件</span></h2><div class="list">${C.map(row).join("") || '<p class="empty">許容度内の角度なし</p>'}</div>
    <h2>OUTER<span>天王星・海王星・冥王星 ${O.length}件</span></h2><div class="list">${O.map(row).join("") || '<p class="empty">許容度内の角度なし</p>'}</div>
    <h2>GRID</h2><table class="grid">${g}</table><p class="note">数値は正確な角度からのずれ（オーブ）。接近＝これから成立、分離＝成立後。成立の時刻は、天体の遅さに応じて「頃」や日付のみで表示。</p>`;
}

// ---- TIME -----------------------------------------------------------------------------------
function evRow(e) {
  let ic = "", tx = "", err = e.err;
  if (e.kind === 0) {
    ic = bodyG(e.a) + aspG(e.b) + bodyG(e.c); tx = `${BODY[e.a]} ${ASPECT[e.b]} ${BODY[e.c]}`;
  } else if (e.kind === 1) { ic = bodyG(e.a) + signG(e.b); tx = `${BODY[e.a]} ${SIGN[e.b]}へ`; }
  else if (e.kind === 2) { ic = bodyG(e.a); tx = `${BODY[e.a]} ${e.b ? "逆行開始" : "順行に戻る"}`; }
  else if (e.kind === 3) { ic = `<svg class="g" viewBox="-11 -11 22 22" style="stroke:none">${moonSvg(9, e.a * 90 || .01)}</svg>`; tx = ["新月", "上弦", "満月", "下弦"][e.a]; }
  else { ic = bodyG(0); tx = e.kind === 4 ? "日の出" : "日の入り"; }
  const tm = err > 10800 ? "<i>この日頃</i>" : `${hm(e.t)}${err > 180 ? "<i> 頃</i>" : ""}`;
  return `<div class="item ev"><span class="tm">${tm}</span><span class="ic">${ic}</span><span>${tx}</span></div>`;
}
function drawTime() {
  const n = now();
  let hours = `<p class="empty">日の出・日の入りがないため算出できません</p>`;
  if (S.hValid) {
    const CH = [6, 5, 4, 0, 3, 2, 1], st = CH.indexOf(S.dayRuler);
    const h = k => {
      const day = k < 12, a = day ? S.sunrise : S.sunset, len = (day ? S.sunset - S.sunrise : S.nextSunrise - S.sunset) / 12, t = a + (k % 12) * len, b = CH[(st + k) % 7];
      return `<div class="item hour${k === S.hourIndex ? " now" : ""}"><span class="no">${k % 12 + 1}</span>${bodyG(b, "s")}<span>${BODY[b]}</span><span class="tm">${hm(t)}</span></div>`;
    };
    const col = o => Array.from({ length: 12 }, (_, i) => h(o + i)).join("");
    hours = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:22px"><div><p class="sub" style="font-size:12px;padding:4px 0">昼 ${hm(S.sunrise)}–${hm(S.sunset)}</p><div class="list">${col(0)}</div></div><div><p class="sub" style="font-size:12px;padding:4px 0">夜 ${hm(S.sunset)}–${hm(S.nextSunrise)}</p><div class="list">${col(12)}</div></div></div>`;
  }
  let ev = "";
  if (F) {
    let day = -1;
    for (const e of F.events) {
      if (e.t < n - 30 || (e.kind === 0 && e.a === 0 && e.c === 1 && e.b % 2 === 0)) continue;  // Sun-Moon 0/90/180 = lunar phase
      if (filter === "moon" ? !((e.kind === 0 && e.c === 1) || (e.kind === 0 && e.a === 1) || (e.kind === 1 && e.a === 1) || e.kind === 3)
        : filter === "slow" ? e.kind === 4 || e.kind === 5 || e.a === 1 && e.kind < 3 || e.kind === 0 && e.c === 1 : false) continue;
      const t = Math.round(e.t / 60) * 60;
      if (dayNo(t) !== day) { day = dayNo(t); ev += `<h2>${mday(t)} ${WEEK[D(t).getDay()]}<span>${["今日", "明日"][day - dayNo(n)] || WEEKJ[D(t).getDay()] + "曜日"}</span></h2>`; }
      ev += evRow(e);
    }
  }
  const ph = F ? F.phase.map((t, k) => [t, k]).filter(x => x[0]).sort((a, b) => a[0] - b[0]) : [];
  $("p3").innerHTML = `<h2>LUNATION</h2><div class="quad">${ph.map(([t, k]) => `<div><svg viewBox="-13 -13 26 26" width="30" height="30" aria-hidden="true">${moonSvg(11, k * 90 || .01)}</svg><b style="display:block;font:400 13px var(--txt)">${["新月", "上弦", "満月", "下弦"][k]}</b><span style="font:400 12px var(--txt);white-space:nowrap">${mday(t)} ${hm(t)}頃</span></div>`).join("")}</div>
    <h2>PLANETARY HOURS<span>${S.hValid ? `日の主 ${BODY[S.dayRuler]}` : ""}</span></h2>${hours}
    <h2>COMING 7 DAYS</h2><div class="seg">${[["all", "すべて"], ["moon", "月"], ["slow", "月以外"]].map(([k, t]) => `<button data-filter="${k}" aria-pressed="${filter === k}">${t}</button>`).join("")}</div>
    <div class="evs">${ev || '<p class="empty">該当なし</p>'}</div><p class="note">角度は七天体どうし。月の時刻の誤差は最大10分ほど、新月などは最大10分ほど。</p>`;
}

// ---- GUIDE ----------------------------------------------------------------------------------
let wake = null;
function drawGuide() {
  const lg = (ic, a, b) => `<div class="lg"><span>${ic}</span><span>${a}</span><span>${b}</span></div>`;
  $("p4").innerHTML = `<div class="guide"><h2>ABOUT</h2><p>いまの場所・いまの時刻の空を、古典占星術の形式で表示します。示すのは事実と伝統的なキーワードだけで、解釈は読む人に委ねます。</p>
  <h2>SKY<span>星図の読み方</span></h2>
  ${lg('<span class="clay">▶</span>', "ASC", "東の地平線に昇る点（左端）")}${lg("- -", "横の破線", "地平線。上側がいま見える空")}${lg('<span class="sub">MC</span>', "もう一本の破線", "南中点と反対側のIC")}
  ${lg(signG(0), "外の環", "黄道12星座 各30°")}${lg('<span class="sub">1–12</span>', "内側の数字", "ハウス（昇る星座が第1）")}${lg('<span class="clay">—</span>', "暖色の線", "六分60°・三分120° 調和")}${lg('<span class="blue">—</span>', "青い線", "矩90°・衝180° 緊張")}
  ${lg("— -", "実線 / 破線", "接近中 / 分離中")}${lg('<span class="sub">R</span>', "度数の後のR", "逆行")}
  <p class="note">天体をタップすると詳細が開きます。左右のスワイプで画面を移動します。</p>
  <h2>TERMS<span>SKYの項目</span></h2>${[["NEXT", "月が次に作る角度", "星座を出る前に成立するもの"], ["ボイド", "月に次の角度なし", "星座を出るまで"], ["LORD", "昇る星座の支配星", "位置と品位"], ["HOUR", "惑星時間", "日の出・日の入りを12等分"], ["MOON", "月相", "輝いている割合"], ["SECT", "昼夜の別", "太陽が地平線の上か下か"], ["ACTION", "太陽と火星", "強さの目安"], ["DIALOGUE", "水星と金星", "強さの目安"], ["REFLECTION", "土星と月", "強さの目安"]].map(([a, b, c]) => `<div class="lg" style="grid-template-columns:92px 1fr"><span class="en">${a}</span><span style="color:inherit">${b}<small class="sub" style="display:block">${c}</small></span></div>`).join("")}
  <h2>BODIES</h2>${BODY.map((t, i) => lg(bodyG(i), t, KW[i] || (i === 10 ? "月の昇交点" : "近代の天体"))).join("")}
  <h2>SIGNS</h2>${SIGN.map((t, i) => lg(signG(i), t, `${ELEMENT[i % 4]}・${MODE[i % 3]}`)).join("")}
  <h2>ASPECTS</h2>${ASPECT.map((t, i) => lg(aspG(i), `${t} ${ANGLE[i]}°`, ASPECT_KW[i])).join("")}
  <h2>DIGNITIES</h2>${[["本宮", "自分の星座"], ["高揚", "力が高まる星座"], ["三区分", "元素を支配"], ["境界", "度数域を支配"], ["フェイス", "10°域を支配"], ["損傷", "本宮の反対"], ["失墜", "高揚の反対"], ["漂泊", "品位なし"], ["カジミ", "太陽と17'以内"], ["燃焼", "太陽と8°30'以内"], ["光線下", "太陽と17°以内"]].map(([a, b]) => `<div class="lg" style="grid-template-columns:92px 1fr"><span>${a}</span><span>${b}</span></div>`).join("")}
  <h2>SETTINGS</h2><p style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn line" data-act="wake" aria-pressed="${!!wake}">${wake ? "画面の常時点灯を止める" : "画面を消さない"}</button><button class="btn line" data-act="gate">位置を変更</button></p>
  <h2>METHOD</h2><p class="note">トロピカル黄道・ホールサイン。品位と点数はリリー、境界はエジプト式、三区分はドロテウス。天体の位置誤差は最大約4'（月）、ほかは約2'以内。出没は大気差を含む平地の値で、誤差は通常1分未満（地形は含みません）。</p>
  <p class="note">位置は約1km単位に丸めて、この端末の中にだけ保存します。計算もすべて端末内で行い、外部には送信しません。</p></div>`;
}
async function toggleWake() {
  try {
    if (wake) { const w = wake; wake = null; store.set("wake", false); await w.release(); }
    else { wake = await navigator.wakeLock.request("screen"); store.set("wake", true); wake.onrelease = () => { wake = null; drawGuide(); }; }
  } catch { wake = null; alert("この環境では画面の常時点灯を使えません"); }
  drawGuide();
}
async function rewake() {
  if (!store.get("wake") || wake || !navigator.wakeLock) return;
  try { wake = await navigator.wakeLock.request("screen"); wake.onrelease = () => { wake = null; drawGuide(); }; drawGuide(); } catch { }
}

// ---- first run / manual position ------------------------------------------------------------
function openGate() {
  const g = $("gate");
  g.hidden = false;
  g.innerHTML = `<svg width="120" height="120" viewBox="-60 -60 120 120" fill="none" stroke="var(--ring)" aria-hidden="true"><circle r="54"/><circle r="36"/><circle r="3" fill="var(--gold)" stroke="none"/><circle cx="36" r="4.5" fill="var(--ink)" stroke="none"/><path d="M-54 0H54" stroke-dasharray="4 4"/></svg>
    <h1>Star Board</h1><p>いまいる場所の空を計算します。位置はこの端末の中だけで使います。</p>
    <button class="btn" data-act="locate" id="gl">現在地を使う</button><p id="gm" role="status"></p>
    <form class="pos"><label>緯度（北緯＋）<input name="lat" inputmode="text" placeholder="35.68" autocomplete="off"></label><label>経度（東経＋）<input name="lon" inputmode="text" placeholder="139.77" autocomplete="off"></label><button class="btn line">この位置で表示</button></form>
    ${pos ? '<button class="btn line" data-act="ungate">戻る</button>' : ""}`;
  gateState();
}
function gateState() {
  if ($("gate").hidden || !$("gl")) return;
  $("gl").disabled = locState === "busy";
  $("gm").textContent = locState === "busy" ? "取得中…" : locState;
}
document.addEventListener("submit", e => {
  e.preventDefault();
  const n = v => parseFloat(v.normalize("NFKC").replace(/[−ー]/g, "-"));
  const lat = n(e.target.lat.value), lon = n(e.target.lon.value);
  if (!validPos({ lat, lon })) { $("gm").textContent = "緯度は±89、経度は±180の範囲で入力してください"; return; }
  locState = ""; setPos(lat, lon, "manual"); drawHead();
});

// ---- events and loop ------------------------------------------------------------------------
document.addEventListener("click", e => {
  const b = e.target.closest("[data-body],[data-tab],[data-filter],[data-act]");
  if (!b) { if (e.target === $("shade")) closeSheet(); return; }
  const d = b.dataset;
  if (d.body) openSheet(+d.body);
  else if (d.tab) { const p = $("pages"); p.scrollTo({ left: p.clientWidth * +d.tab, behavior: Math.abs(+d.tab - tab) > 1 || matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); }
  else if (d.filter) { filter = d.filter; drawTime(); }
  else if (d.act === "locate") locate();
  else if (d.act === "close") closeSheet();
  else if (d.act === "wake") toggleWake();
  else if (d.act === "gate") openGate();
  else if (d.act === "ungate") $("gate").hidden = true;
});
document.addEventListener("keydown", e => { if (e.key === "Escape") closeSheet(); });
$("pages").addEventListener("scroll", () => {
  const k = Math.round($("pages").scrollLeft / $("pages").clientWidth);
  if (k !== tab && k >= 0 && k < 5) { tab = k; drawTabs(); drawPage(); }
}, { passive: true });
addEventListener("resize", () => { $("pages").scrollLeft = $("pages").clientWidth * tab; });

function drawPage() { if (S) [drawSky, drawPlanets, drawAspects, drawTime, () => { if (!$("p4").firstChild) drawGuide(); }][tab](); }
function refresh(all) {
  if (!pos) return;
  const n = now();
  document.documentElement.dataset.theme = isNight() ? "night" : "paper";
  S = Engine.snap(n, pos.lat, pos.lon, -D(n).getTimezoneOffset() * 60);
  if (!F || n - F.t > 300 || n < F.t) { F = Engine.forecast(n, pos.lat, pos.lon, 7); exact = {}; }
  if (all) { drawSky(); drawPlanets(); drawAspects(); drawTime(); drawGuide(); } else drawPage();
  if (sheetBody >= 0) { const y = $("sheet").scrollTop; drawSheet(); $("sheet").scrollTop = y; }
}
let lastDraw = 0;
function tick() {
  drawHead();
  if (document.hidden) return;
  const n = Math.floor(now());
  if (Math.abs(n - lastDraw) >= 10 || n % 60 === 0) { lastDraw = n; refresh(false); }
  if (pos && pos.src === "gps" && locState !== "busy" && Date.now() - lastFetch > 600000) locate();
}
document.addEventListener("visibilitychange", () => {
  if (document.hidden) return;
  refresh(true); rewake();
  if (pos && pos.src === "gps" && Date.now() - lastFetch > 60000) locate();
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
