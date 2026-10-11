/* Shared helpers for the SAT Math learning pages: coordinate planes, answer checks, number formatting. */
const Lab = (() => {
  const NS = "http://www.w3.org/2000/svg";
  const C = { green: "#138A3E", red: "#D02B20", blue: "#1F4FD1", ink: "#000", gray: "#8A94A6" };
  let UID = 0;

  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function txt(parent, x, y, s, attrs = {}) {
    const t = el("text", Object.assign({ x, y, fill: C.ink, "font-size": 13 }, attrs), parent);
    t.textContent = s;
    return t;
  }
  const minus = s => String(s).replace(/-/g, "−");
  const round = (v, d = 4) => Math.round(v * 10 ** d) / 10 ** d;
  const num = (v, d = 3) => minus(round(v, d).toLocaleString("en-US", { maximumFractionDigits: d }));

  /* fraction formatting: 0.5 -> <frac 1/2>, 0.125 -> 1/8 */
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; }
  function toFrac(v, maxDen = 64) {
    for (let d = 1; d <= maxDen; d++) { const n = Math.round(v * d); if (Math.abs(n / d - v) < 1e-9) { const g = gcd(n, d); return [n / g, d / g]; } }
    return null;
  }
  function fracHTML(v) {
    const f = toFrac(v);
    if (!f) return num(v);
    const [n, d] = f;
    if (d === 1) return minus(n);
    return (n < 0 ? "−" : "") + `<span class="fr"><span>${Math.abs(n)}</span><span>${d}</span></span>`;
  }
  function fracText(v) { const f = toFrac(v); if (!f) return num(v); return f[1] === 1 ? minus(f[0]) : minus(f[0]) + "/" + f[1]; }

  function parseVal(s) {
    s = String(s).trim().replace(/[−–]/g, "-").replace(/\s+/g, "").replace(/%$/, "");
    if (/^[-+]?\d*\.?\d+\/[-+]?\d*\.?\d+$/.test(s)) { const [a, b] = s.split("/"); return parseFloat(a) / parseFloat(b); }
    return /^[-+]?\d*\.?\d+$/.test(s) ? parseFloat(s) : NaN;
  }

  /* coordinate plane with black axes and grid */
  function plane(host, o) {
    const W = o.w || 480, H = o.h || 440, P = o.pad || 36;
    const [x0, x1] = o.x, [y0, y1] = o.y;
    const xs = o.xstep || 1, ys = o.ystep || 1, xl = o.xlabel || xs * 2, yl = o.ylabel || ys * 2;
    const sx = (W - 2 * P) / (x1 - x0), sy = (H - 2 * P) / (y1 - y0);
    const X = x => P + (x - x0) * sx, Y = y => H - P - (y - y0) * sy;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "plot", role: "img", "aria-label": o.label || "coordinate plane" }, host);
    const id = "lab" + (UID++), defs = el("defs", {}, svg);
    el("rect", { x: P, y: P, width: W - 2 * P, height: H - 2 * P }, el("clipPath", { id: id + "c" }, defs));
    const mk = el("marker", { id: id + "a", viewBox: "0 0 10 10", refX: 8, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" }, defs);
    el("path", { d: "M0,0 L10,5 L0,10 z", fill: C.ink }, mk);
    el("rect", { x: 0, y: 0, width: W, height: H, fill: "#fff" }, svg);
    const eps = 1e-9;
    for (let x = Math.ceil(x0 / xs) * xs; x <= x1 + eps; x += xs) el("line", { x1: X(x), y1: Y(y0), x2: X(x), y2: Y(y1), stroke: C.ink, "stroke-opacity": .2 }, svg);
    for (let y = Math.ceil(y0 / ys) * ys; y <= y1 + eps; y += ys) el("line", { x1: X(x0), y1: Y(y), x2: X(x1), y2: Y(y), stroke: C.ink, "stroke-opacity": .2 }, svg);
    const ax = (y0 <= 0 && y1 >= 0) ? Y(0) : Y(y0), ay = (x0 <= 0 && x1 >= 0) ? X(0) : X(x0);
    el("line", { x1: X(x0) - 4, y1: ax, x2: X(x1) + 12, y2: ax, stroke: C.ink, "stroke-width": 2, "marker-end": `url(#${id}a)` }, svg);
    el("line", { x1: ay, y1: Y(y0) + 4, x2: ay, y2: Y(y1) - 12, stroke: C.ink, "stroke-width": 2, "marker-end": `url(#${id}a)` }, svg);
    txt(svg, X(x1) + 6, ax - 8, o.xname || "x", { "font-style": "italic", "font-size": 16 });
    txt(svg, ay + 8, Y(y1) - 6, o.yname || "y", { "font-style": "italic", "font-size": 16 });
    const near0 = v => Math.abs(v) < eps;
    const on = (v, st) => Math.abs(v / st - Math.round(v / st)) < 1e-6;
    for (let x = Math.ceil(x0 / xs) * xs; x <= x1 - xs / 2; x += xs) if (!near0(x) && on(x, xl) && x > x0 + eps) txt(svg, X(x), ax + 17, num(x), { "text-anchor": "middle" });
    for (let y = Math.ceil(y0 / ys) * ys; y <= y1 - ys / 2; y += ys) if (!near0(y) && on(y, yl) && y > y0 + eps) txt(svg, ay - 7, Y(y) + 4.5, num(y), { "text-anchor": "end" });
    txt(svg, ay - 6, ax + 16, "O", { "text-anchor": "end", "font-style": "italic" });
    const dyn = el("g", { "clip-path": `url(#${id}c)` }, svg), top = el("g", {}, svg);

    function path(f, from = x0, to = x1) {
      let d = "", pen = false; const n = 600;
      for (let i = 0; i <= n; i++) {
        const x = from + (to - from) * i / n, y = f(x);
        if (!isFinite(y) || y > y1 + (y1 - y0) || y < y0 - (y1 - y0)) { pen = false; continue; }
        d += (pen ? "L" : "M") + X(x).toFixed(1) + " " + Y(y).toFixed(1); pen = true;
      }
      return d;
    }
    function curve(f, opt = {}) {
      return el("path", { d: path(f, opt.from, opt.to), fill: "none", stroke: opt.color || C.green, "stroke-width": opt.width || 3, "stroke-linecap": "round", "stroke-dasharray": opt.dash || "none", opacity: opt.opacity ?? 1 }, opt.layer || dyn);
    }
    function setCurve(p, f, from, to) { p.setAttribute("d", path(f, from, to)); }
    function dot(x, y, color = C.ink, label, opt = {}) {
      const g = el("g", {}, opt.layer || top);
      el("circle", { cx: X(x), cy: Y(y), r: opt.r || 6, fill: color, stroke: "#fff", "stroke-width": 2 }, g);
      if (label) {
        const [dx, dy, anc] = opt.at || [10, -10, "start"];
        txt(g, X(x) + dx, Y(y) + dy, label, { "text-anchor": anc, "font-size": opt.size || 14, "font-weight": 700, fill: color, stroke: "#fff", "stroke-width": 4, "paint-order": "stroke" });
      }
      return g;
    }
    function seg(xa, ya, xb, yb, opt = {}) {
      return el("line", { x1: X(xa), y1: Y(ya), x2: X(xb), y2: Y(yb), stroke: opt.color || C.ink, "stroke-width": opt.width || 2, "stroke-dasharray": opt.dash || "none", "stroke-linecap": "round" }, opt.layer || dyn);
    }
    function label(x, y, s, color = C.ink, anc = "middle", size = 14) {
      return txt(top, X(x), Y(y), s, { "text-anchor": anc, "font-size": size, "font-weight": 700, fill: color, stroke: "#fff", "stroke-width": 4, "paint-order": "stroke" });
    }
    function clear() { dyn.innerHTML = ""; top.innerHTML = ""; }
    function at(evt) {
      const p = svg.createSVGPoint(); p.x = evt.clientX; p.y = evt.clientY;
      const q = p.matrixTransform(svg.getScreenCTM().inverse());
      return { x: x0 + (q.x - P) / sx, y: y0 + (H - P - q.y) / sy };
    }
    return { svg, X, Y, dyn, top, curve, setCurve, dot, seg, label, clear, at, x0, x1, y0, y1 };
  }

  /* "Try it" box: Lab.tryIt(host, {q, form:'2<sup>5</sup> = {a}', check:v=>..., explain}) */
  function tryIt(host, o) {
    const box = document.createElement("div"); box.className = "try";
    const keys = [];
    const form = o.form.replace(/\{(\w+)\}/g, (_, k) => { keys.push(k); return `<input class="in" data-k="${k}" inputmode="decimal" autocomplete="off" aria-label="${k}">`; });
    box.innerHTML = `<h2>${o.title || "Try it"}</h2><p class="q">${o.q}</p><div class="form">${form}<button class="btn">Check</button></div><div class="fb" aria-live="polite"></div>`;
    host.appendChild(box);
    const fb = box.querySelector(".fb");
    function check() {
      const v = {}; let bad = false;
      box.querySelectorAll("input").forEach(i => { const x = parseVal(i.value); if (isNaN(x)) bad = true; v[i.dataset.k] = x; });
      if (bad) { fb.className = "fb bad"; fb.textContent = "Type a number in every box (fractions like 1/2 are fine)."; return; }
      const ok = o.check(v);
      fb.className = "fb " + (ok ? "ok" : "bad");
      fb.innerHTML = ok ? "Correct! ✓ " + (o.explain ? `<span class="muted" style="font-weight:400">${o.explain}</span>` : "") : "Not quite. Try again." + (o.hint ? ` <span class="muted" style="font-weight:400">Hint: ${o.hint}</span>` : "");
    }
    box.querySelector(".btn").onclick = check;
    box.querySelectorAll("input").forEach(i => i.onkeydown = e => { if (e.key === "Enter") check(); });
    return {
      box, reset(q) { if (q) box.querySelector(".q").innerHTML = q; box.querySelectorAll("input").forEach(i => i.value = ""); fb.textContent = ""; fb.className = "fb"; },
      set(o2) { Object.assign(o, o2); }
    };
  }

  const near = (a, b, t = 1e-6) => Math.abs(a - b) < t;
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  return { C, el, txt, minus, num, round, fracHTML, fracText, toFrac, parseVal, plane, tryIt, near, reduced };
})();

/* opening a lesson marks it as seen on the learning path (this browser only) */
(function () {
  try {
    const m = decodeURIComponent(location.pathname).match(/(learning\/[^/]+\/[^/]+\.html)$/);
    if (!m) return;
    const KEY = "satMathLearningVisited.v1", seen = JSON.parse(localStorage.getItem(KEY) || "{}");
    seen[m[1]] = 1; localStorage.setItem(KEY, JSON.stringify(seen));
  } catch (e) {}
})();
