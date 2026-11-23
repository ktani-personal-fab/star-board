// Loads star.wasm and decodes its flat arrays (layout: engine/star.cpp).
"use strict";
const Engine = (() => {
  let x;
  async function load() {
    const buf = await (await fetch("star.wasm")).arrayBuffer();
    const { instance } = await WebAssembly.instantiate(buf, {});
    x = instance.exports;
    if (x._initialize) x._initialize();
  }
  const read = n => new Float64Array(x.memory.buffer, x.buffer(), n);
  const HEAD = 40, BW = 18, NB = 11;
  function snap(t, lat, lon, tz) {
    const n = x.snap(t, lat, lon, tz), v = Float64Array.from(read(n));
    const K = ["asc", "mc", "eps", "day", "sunAlt", "elong", "illum", "phase", "moonKm", "hValid", "sunrise", "sunset", "nextSunrise",
      "dayRuler", "hourRuler", "hourIndex", "hourStart", "hourEnd", "voc", "nextPlanet", "nextAspect", "nextTime", "ingress",
      "ax0", "ax1", "ax2", "lord", "fortune", "spirit", "ramc", "nAsp"];
    const s = { t, lat, lon, tz };
    K.forEach((k, i) => { s[k] = v[i]; });
    const B = ["lon", "lat", "speed", "dist", "ra", "dec", "alt", "az", "house", "flags", "ess", "acc", "solar",
      "rDom", "rTrip", "rTerm", "rFace", "retro"];
    s.body = [];
    for (let b = 0; b < NB; b++) { const o = { id: b }; B.forEach((k, i) => { o[k] = v[HEAD + b * BW + i]; }); s.body.push(o); }
    s.aspects = [];
    for (let k = 0, p = HEAD + NB * BW; k < s.nAsp; k++, p += 5) s.aspects.push({ a: v[p], b: v[p + 1], type: v[p + 2], orb: v[p + 3], applying: !!v[p + 4] });
    return s;
  }
  function forecast(t, lat, lon, days) {
    const n = x.forecast(t, lat, lon, days), v = Float64Array.from(read(n));
    const f = { t, lat, lon, body: [], phase: [], events: [] };
    let p = 1;
    for (let b = 0; b < NB; b++, p += 7) f.body.push({ rise: v[p], set: v[p + 1], transit: v[p + 2], ingT: v[p + 3], ingSign: v[p + 4], stT: v[p + 5], stDir: v[p + 6] });
    for (let k = 0; k < 4; k++) f.phase.push(v[p++]);
    for (let k = 0; k < v[0]; k++, p += 6) f.events.push({ t: v[p], kind: v[p + 1], a: v[p + 2], b: v[p + 3], c: v[p + 4], err: v[p + 5] });
    f.events.sort((a, b) => a.t - b.t);
    return f;
  }
  return { load, snap, forecast, perfects: (t, i, j, k) => x.perfects(t, i, j, k) };
})();
