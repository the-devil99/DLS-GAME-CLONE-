(() => {
const $ = id => document.getElementById(id);
const cv = $('c'), g = cv.getContext('2d');
const W = 1050, H = 680, PX = 50, PY = 40, GW = 150, CY = H / 2, Z = 1.4;
const AIK = [.82, .95, 1.08], SAVE = [.35, .55, .72];
const FORM = [[.05, .5], [.24, .3], [.24, .7], [.45, .35], [.45, .65]];
const KITS = [['Falcons', '#ffd23f', '#161616'], ['Harbor', '#2f6bff', '#ffffff'], ['Embers', '#e5383b', '#ffffff'],
  ['Jade', '#1db97a', '#0d1711'], ['Violets', '#8b5cf6', '#ffffff'], ['Frost', '#e8eef2', '#1d4ed8']].map(k => ({ n: k[0], c1: k[1], c2: k[2] }));
const SKIN = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac'];
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

let keys = {}, stick = { x: 0, y: 0 }, tb = {};
let paused = 0, VS = 1, VX = 0, VY = 0;
let diff = 1, state = 'menu', tm = 0, time = 120, t0 = 120, fr = 0, cc = 0, stam = 1, muted = 0;
let score = [0, 0], P = [], ball, ctrl = null, charge = 0, pp = 0, pl = 0, K = [KITS[0], KITS[1]], cam = { x: 0, y: 0 };

/* ---------- sound (generated, no files) ---------- */
let ac;
function snd(f, d, type = 'square', v = .05) {
  if (muted) return;
  try {
    ac = ac || new AudioContext();
    const o = ac.createOscillator(), gn = ac.createGain(), t = ac.currentTime;
    o.type = type; o.frequency.value = f;
    gn.gain.setValueAtTime(v, t); gn.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(gn); gn.connect(ac.destination); o.start(); o.stop(t + d);
  } catch (e) {}
}
const whistle = () => { snd(2300, .35, 'sine', .07); setTimeout(() => snd(2500, .3, 'sine', .07), 120); };

/* ---------- input ---------- */
addEventListener('keydown', e => { keys[e.code] = 1; if (e.code === 'KeyM') muted ^= 1; if (e.code === 'KeyP' || e.code === 'Escape') togglePause(); if (e.code === 'Space') e.preventDefault(); });
addEventListener('keyup', e => { keys[e.code] = 0; });
let touch = matchMedia('(pointer:coarse)').matches;
const setTouch = () => { touch = true; document.body.classList.add('touch'); };
if (touch) setTouch();
addEventListener('touchstart', () => { if (!touch) setTouch(); }, { passive: true });
addEventListener('contextmenu', e => e.preventDefault());
const zone = $('zone'), st = $('stick'), kn = $('knob'), R = 55; let sid = null, so = { x: 0, y: 0 };
zone.onpointerdown = e => {
  if (sid !== null) return; sid = e.pointerId; zone.setPointerCapture(sid);
  so = { x: e.clientX, y: e.clientY }; st.style.left = so.x + 'px'; st.style.top = so.y + 'px'; st.classList.add('on');
};
zone.onpointermove = e => {
  if (e.pointerId !== sid) return;
  let dx = (e.clientX - so.x) / R, dy = (e.clientY - so.y) / R; const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
  stick = { x: dx, y: dy }; kn.style.transform = `translate(${dx * 38}px,${dy * 38}px)`;
};
zone.onpointerup = zone.onpointercancel = e => {
  if (e.pointerId !== sid) return; sid = null; stick = { x: 0, y: 0 }; kn.style.transform = ''; st.classList.remove('on'); st.style.left = st.style.top = '';
};
[['bShoot', 'shoot'], ['bPass', 'pass'], ['bLob', 'lob'], ['bRun', 'run']].forEach(([id, k]) => {
  const b = $(id);
  b.onpointerdown = e => { b.setPointerCapture(e.pointerId); tb[k] = 1; b.classList.add('down'); };
  b.onpointerup = b.onpointercancel = () => { tb[k] = 0; b.classList.remove('down'); };
});

/* ---------- pitch (pre-rendered once: crowd, boards, grass, lines, nets) ---------- */
const pc = document.createElement('canvas'); pc.width = W * 2; pc.height = H * 2;
function mkPitch() {
  const c = pc.getContext('2d'); c.scale(2, 2); let s = 7; const r = () => (s = s * 16807 % 2147483647) / 2147483647;
  c.fillStyle = '#0b120e'; c.fillRect(0, 0, W, H);
  const cols = ['#e5383b', '#ffd23f', '#2f6bff', '#f3f1e8', '#1db97a', '#8b5cf6'];
  for (let i = 0; i < 3200; i++) {
    const x = r() * W, y = r() * H;
    if (x > PX - 12 && x < W - PX + 12 && y > PY - 12 && y < H - PY + 12) continue;
    c.globalAlpha = .6; c.fillStyle = cols[r() * 6 | 0]; c.fillRect(x, y, 3, 4);
  }
  c.globalAlpha = 1; c.fillStyle = '#d9d4c4'; c.fillRect(PX - 10, PY - 10, W - 2 * PX + 20, H - 2 * PY + 20);
  const sw = (W - 2 * PX) / 12;
  for (let i = 0; i < 12; i++) { c.fillStyle = i % 2 ? '#1d5a34' : '#22693c'; c.fillRect(PX + i * sw, PY, sw, H - 2 * PY); }
  for (let i = 0; i < 900; i++) { c.fillStyle = r() > .5 ? 'rgba(255,255,255,.035)' : 'rgba(0,0,0,.05)'; c.fillRect(PX + r() * (W - 2 * PX), PY + r() * (H - 2 * PY), 2, 6); }
  c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 3; c.fillStyle = 'rgba(255,255,255,.8)';
  c.strokeRect(PX, PY, W - 2 * PX, H - 2 * PY);
  c.beginPath(); c.moveTo(W / 2, PY); c.lineTo(W / 2, H - PY); c.stroke();
  c.beginPath(); c.arc(W / 2, CY, 70, 0, 7); c.stroke();
  c.beginPath(); c.arc(W / 2, CY, 4, 0, 7); c.fill();
  [[PX, 1], [W - PX, -1]].forEach(([x, d]) => {
    c.strokeRect(d > 0 ? x : x - 150, CY - 170, 150, 340); c.strokeRect(d > 0 ? x : x - 55, CY - 85, 55, 170);
    c.beginPath(); c.arc(x + d * 105, CY, 3, 0, 7); c.fill();
    c.beginPath(); c.arc(x + d * 105, CY, 70, d > 0 ? -.93 : Math.PI - .93, d > 0 ? .93 : Math.PI + .93); c.stroke();
    const gx = d > 0 ? x - 34 : x; c.fillStyle = 'rgba(255,255,255,.16)'; c.fillRect(gx, CY - GW / 2, 34, GW);
    c.lineWidth = 1; for (let i = 0; i <= 34; i += 6) { c.beginPath(); c.moveTo(gx + i, CY - GW / 2); c.lineTo(gx + i, CY + GW / 2); c.stroke(); }
    for (let i = 0; i <= GW; i += 10) { c.beginPath(); c.moveTo(gx, CY - GW / 2 + i); c.lineTo(gx + 34, CY - GW / 2 + i); c.stroke(); }
    c.lineWidth = 3; c.fillStyle = 'rgba(255,255,255,.8)'; c.strokeRect(gx, CY - GW / 2, 34, GW);
  });
  [[PX, PY, 0], [W - PX, PY, 1], [PX, H - PY, 3], [W - PX, H - PY, 2]].forEach(([x, y, q]) => {
    c.beginPath(); c.arc(x, y, 12, q * Math.PI / 2, (q + 1) * Math.PI / 2); c.stroke();
  });
}

/* ---------- setup ---------- */
function build() {
  P = [];
  for (let t = 0; t < 2; t++) FORM.forEach((f, i) => {
    const x = PX + (t ? 1 - f[0] : f[0]) * (W - 2 * PX), y = PY + f[1] * (H - 2 * PY);
    P.push({ t, gk: i === 0, n: i, hx: x, hy: y, x, y, vx: 0, vy: 0, dir: t ? Math.PI : 0, cd: 0, hold: 0, ph: 0, sk: SKIN[(i * 3 + t) % 5] });
  });
}
function place(p) { p.x = p.hx; p.y = p.hy; p.vx = p.vy = 0; p.cd = 0; p.hold = 0; p.dir = p.t ? Math.PI : 0; }
function kickoff(t) {
  P.forEach(place);
  const k = P.filter(p => p.t === t && !p.gk)[3];
  k.x = W / 2 + (t ? 10 : -10); k.y = CY;
  ball = { x: W / 2, y: CY, vx: 0, vy: 0, z: 0, vz: 0, rot: 0, lt: t, o: k };
  ctrl = t === 0 ? k : null; state = 'kick'; tm = 70; msg('Kick off'); whistle();
}
function restart(t, x, y, label, gk) {
  const k = P.filter(p => p.t === t && (gk ? p.gk : !p.gk)).sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))[0];
  k.x = x; k.y = y; k.dir = Math.atan2(CY - y, W / 2 - x); k.hold = 0; k.cd = 0; k.vx = k.vy = 0;
  Object.assign(ball, { vx: 0, vy: 0, z: 0, vz: 0, o: k, lt: t });
  if (t === 0) ctrl = k;
  state = 'kick'; tm = 45; msg(label); snd(1800, .12, 'sine', .05);
}
function throwIn() { restart(1 - ball.lt, clamp(ball.x, PX + 25, W - PX - 25), ball.y < CY ? PY + 3 : H - PY - 3, 'Throw-in'); }
function endOut(L) {
  const d = L ? 0 : 1;
  if (ball.lt === d) restart(1 - d, L ? PX + 6 : W - PX - 6, ball.y < CY ? PY + 6 : H - PY - 6, 'Corner');
  else restart(d, L ? PX + 45 : W - PX - 45, CY, 'Goal kick', 1);
}
function hud() {
  $('s0').textContent = score[0]; $('s1').textContent = score[1];
  const s = Math.max(0, time); $('clock').textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}
let mt;
function msg(s) { const m = $('msg'); m.textContent = s; m.classList.add('show'); clearTimeout(mt); mt = setTimeout(() => m.classList.remove('show'), 1200); }
function goal(t) {
  score[t]++; hud(); state = 'goal'; tm = 130; cc = 1 - t; ball.vx = ball.vy = 0; msg(t === 0 ? 'GOAL!' : 'Conceded');
  [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => snd(f, .25, 'triangle', .08), i * 110));
}
function end() {
  state = 'end'; whistle();
  $('title').textContent = score[0] > score[1] ? 'You win' : score[0] < score[1] ? 'You lose' : 'Draw';
  $('sub').textContent = `Full time: ${score[0]} - ${score[1]}`; $('start').textContent = 'Play again'; $('menu').hidden = false;
}
KITS.forEach((k, i) => $('kit').add(new Option(k.n, i)));
$('start').onclick = () => {
  const si = +$('kit').value; K = [KITS[si], KITS[(si + 1) % KITS.length]];
  [['ta', 0], ['tb2', 1]].forEach(([id, i]) => { $(id).style.background = K[i].c1; $(id).style.color = K[i].c2; });
  $('na').textContent = K[0].n; $('nb').textContent = K[1].n;
  score = [0, 0]; t0 = time = +$('len').value; fr = 0; stam = 1; build(); hud(); $('menu').hidden = true; paused = 0; $('pause').textContent = 'Pause'; if (touch) goFull(); kickoff(0);
};
document.querySelectorAll('#diff button').forEach(b => b.onclick = () => {
  diff = +b.dataset.d; document.querySelectorAll('#diff button').forEach(x => x.classList.toggle('on', x === b));
});

/* ---------- actions ---------- */
function shoot(p, pw, a) {
  if (ball.o !== p) return;
  if (p === ctrl) {
    const gx = W - PX, ga = Math.atan2(CY - p.y, gx - p.x), df = Math.atan2(Math.sin(a - ga), Math.cos(a - ga));
    if (Math.abs(df) < .7 && gx - p.x < 380) a = ga + df * .35;
  }
  ball.o = null; p.cd = 25; ball.lt = p.t;
  const s = 6 + pw * 9; ball.vx = Math.cos(a) * s; ball.vy = Math.sin(a) * s; ball.vz = Math.max(0, (pw - .55) * 15); ball.z = 0;
  snd(140, .1, 'sine', .25);
}
function pass(p, a, lob) {
  if (ball.o !== p) return;
  let b = null, bs = -9;
  P.forEach(q => {
    if (q.t !== p.t || q === p || (q.gk && !p.gk)) return;
    const d = dist(p, q), c = Math.cos(Math.atan2(q.y - p.y, q.x - p.x) - a);
    if (d > 60 && d < (lob ? 650 : 500) && c > .55 && c - d / 1000 > bs) { bs = c - d / 1000; b = q; }
  });
  ball.o = null; p.cd = 20; ball.lt = p.t; ball.z = 0;
  let tx, ty;
  if (b) { tx = b.x + b.vx * (lob ? 30 : 14); ty = b.y + b.vy * (lob ? 30 : 14); } else { tx = p.x + Math.cos(a) * 250; ty = p.y + Math.sin(a) * 250; }
  const d = Math.hypot(tx - p.x, ty - p.y) || 1, s = lob ? Math.min(13, d / 28) : b ? Math.min(10, 4 + d * .025) : 7;
  ball.vx = (tx - p.x) / d * s; ball.vy = (ty - p.y) / d * s; ball.vz = lob ? 5.5 : 0;
  snd(180, .07, 'sine', .18);
}

/* ---------- movement + AI ---------- */
function move(p, dx, dy, k) {
  const l = Math.hypot(dx, dy), sp = 3 * k * (p.gk ? .85 : 1); let tx = 0, ty = 0;
  if (l > .1) {
    if (l > 1) { dx /= l; dy /= l; }
    tx = dx * sp; ty = dy * sp;
    p.dir += Math.atan2(Math.sin(Math.atan2(dy, dx) - p.dir), Math.cos(Math.atan2(dy, dx) - p.dir)) * .3;
  }
  p.vx += (tx - p.vx) * .2; p.vy += (ty - p.vy) * .2;
}
function go(p, tx, ty, k) { const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy); move(p, d < 6 ? 0 : dx / d, d < 6 ? 0 : dy / d, k); }
function ai(p, chase) {
  const k = p.t ? AIK[diff] : .9, gx = p.t ? PX : W - PX, fw = p.t ? -1 : 1, o = ball.o;
  if (p.gk) {
    const ox = p.t ? W - PX - 26 : PX + 26; let tx = ox, ty = clamp(ball.y, CY - 55, CY + 55);
    if (!o && Math.abs(ball.x - ox) < 150 && Math.abs(ball.y - CY) < 110) { tx = ball.x; ty = ball.y; }
    return go(p, tx, ty, k);
  }
  if (o === p) {
    p.hold++;
    const gA = Math.atan2(CY - p.y, gx - p.x), d = Math.hypot(gx - p.x, CY - p.y);
    let near = null, nd = 1e9;
    P.forEach(q => { if (q.t !== p.t) { const e = dist(p, q); if (e < nd) { nd = e; near = q; } } });
    let ty = CY; if (nd < 90 && near) ty = p.y + (p.y > near.y ? 1 : -1) * 120;
    if (d < 300 && p.hold > 12 && Math.random() < .05 * k) return shoot(p, .5 + Math.random() * .35, gA + (Math.random() - .5) * .5 / k);
    if (nd < 40 && p.hold > 25 && Math.random() < .06) return pass(p, gA);
    return go(p, gx, ty, k * .95);
  }
  if (o && o.t === p.t) return go(p, clamp(p.hx + fw * 130 + (ball.x - W / 2) * .25, PX + 20, W - PX - 20), p.hy, k);
  if (chase || (!o && dist(p, ball) < 90)) return go(p, ball.x + ball.vx * 6, ball.y + ball.vy * 6, k);
  go(p, p.hx + (ball.x - W / 2) * .35, p.hy + (ball.y - CY) * .25, k * .9);
}

/* ---------- 60 Hz step ---------- */
function step() {
  if (paused || (touch && innerHeight > innerWidth)) return;
  if (state === 'kick') { if (--tm <= 0) state = 'play'; return; }
  if (state === 'goal') { if (--tm <= 0) kickoff(cc); return; }
  if (state !== 'play') return;
  if (++fr % 60 === 0) {
    time--; hud();
    if (time <= 0) return end();
    if (time === t0 / 2) { msg('Half time'); return kickoff(1); }
  }
  P.forEach(p => { if (p.cd > 0) p.cd--; });

  if (ball.o && ball.o.t === 0) ctrl = ball.o;
  else {
    let b = null, bd = 1e9;
    P.forEach(p => { if (p.t || (p.gk && dist(p, ball) > 140)) return; const d = dist(p, ball); if (d < bd) { bd = d; b = p; } });
    if (b && (!ctrl || bd < dist(ctrl, ball) * .8)) ctrl = b;
  }

  const ix = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0) + stick.x;
  const iy = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0) + stick.y;
  const moving = Math.hypot(ix, iy) > .1, aim = moving ? Math.atan2(iy, ix) : ctrl.dir;
  const run = (keys.ShiftLeft || keys.ShiftRight || tb.run) && moving && stam > .03;
  stam = clamp(stam + (run ? -.007 : .003), 0, 1);
  move(ctrl, ix, iy, run ? 1.35 : 1);
  const sh = keys.Space || tb.shoot, ps = keys.KeyE || tb.pass, lb = keys.KeyQ || tb.lob;
  if (sh) charge = Math.min(1, charge + .025);
  else if (charge > 0) { if (ball.o === ctrl) shoot(ctrl, charge, aim); charge = 0; }
  if (ps && !pp) pass(ctrl, aim); pp = ps;
  if (lb && !pl) pass(ctrl, aim, 1); pl = lb;

  const rank = t => P.filter(p => p.t === t && !p.gk).sort((a, b) => dist(a, ball) - dist(b, ball)).slice(0, 2);
  const ch = [...rank(0), ...rank(1)];
  P.forEach(p => { if (p !== ctrl) ai(p, ch.includes(p)); });
  if (ball.o && ball.o.gk) { ball.o.hold++; if (ball.o.hold > (ball.o === ctrl ? 150 : 45)) pass(ball.o, ball.o.t ? Math.PI : 0, 1); }

  P.forEach(p => {
    const s = ball.o === p ? .92 : 1;
    p.x = clamp(p.x + p.vx * s, PX + 8, W - PX - 8); p.y = clamp(p.y + p.vy * s, PY + 8, H - PY - 8);
    p.ph += Math.hypot(p.vx, p.vy) * .3;
  });
  for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) {
    const a = P[i], b = P[j], d = dist(a, b);
    if (d < 20 && d > 0) { const f = (20 - d) / 2 / d; a.x += (a.x - b.x) * f; a.y += (a.y - b.y) * f; b.x -= (a.x - b.x) * f; b.y -= (a.y - b.y) * f; }
  }

  if (ball.o) {
    const o = ball.o;
    ball.x += (o.x + Math.cos(o.dir) * 17 - ball.x) * .4; ball.y += (o.y + Math.sin(o.dir) * 17 - ball.y) * .4; ball.z = 0;
    ball.rot += Math.hypot(o.vx, o.vy) * .15;
    P.forEach(q => {
      if (ball.o === o && q.t !== o.t && q.cd <= 0 && dist(q, o) < 19 && Math.random() < .035 * (q.t ? AIK[diff] : 1)) { ball.o = q; ball.lt = q.t; q.hold = 0; o.cd = 45; }
    });
  } else {
    ball.x += ball.vx; ball.y += ball.vy;
    if (ball.z > 0 || ball.vz > 0) { ball.vz -= .35; ball.z += ball.vz; if (ball.z <= 0) { ball.z = 0; ball.vz = ball.vz < -2 ? -ball.vz * .5 : 0; } }
    const f = ball.z > 0 ? .995 : .986; ball.vx *= f; ball.vy *= f; ball.rot += Math.hypot(ball.vx, ball.vy) * .15;
    if (ball.y < PY || ball.y > H - PY) return throwIn();
    if (ball.x < PX || ball.x > W - PX) {
      const L = ball.x < PX;
      if (Math.abs(ball.y - CY) < GW / 2 && ball.z < 40) return goal(L ? 1 : 0);
      return endOut(L);
    }
    const sp = Math.hypot(ball.vx, ball.vy); let b = null, bd = 19;
    P.forEach(p => {
      if (p.cd > 0) return;
      const d = dist(p, ball);
      if (p.gk && sp >= 7 && d < 28 && ball.z < 45) {
        p.cd = 30;
        if (Math.random() < (p.t ? SAVE[diff] : .5)) { b = p; bd = 0; } else { ball.vx *= -.5; ball.vy += (Math.random() - .5) * 6; }
        return;
      }
      if (sp < 11 && ball.z < 12 && d < bd) { b = p; bd = d; }
    });
    if (b) { ball.o = b; ball.lt = b.t; b.hold = 0; ball.vx = ball.vy = ball.vz = 0; }
  }
}

/* ---------- drawing ---------- */
function drawP(p) {
  const kit = p.gk ? { c1: p.t ? '#14b8a6' : '#f97316', c2: '#111' } : K[p.t];
  g.save(); g.translate(p.x, p.y);
  g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(2, 8, 10, 5, 0, 0, 7); g.fill();
  g.rotate(p.dir);
  const sw = Math.sin(p.ph) * 5;
  g.fillStyle = '#1b1b1b'; g.beginPath(); g.ellipse(sw, -5, 4, 2.6, 0, 0, 7); g.ellipse(-sw, 5, 4, 2.6, 0, 0, 7); g.fill();
  g.fillStyle = kit.c1; g.beginPath(); g.ellipse(0, 0, 6.5, 11, 0, 0, 7); g.fill();
  g.strokeStyle = kit.c2; g.lineWidth = 2; g.stroke();
  g.fillStyle = p.sk; g.beginPath(); g.arc(1.5, 0, 5, 0, 7); g.fill();
  g.fillStyle = '#2a1c14'; g.beginPath(); g.arc(0, 0, 5, Math.PI * .5, Math.PI * 1.5); g.fill();
  g.restore();
}
function draw() {
  const tx = ball ? ball.x : W / 2, ty = ball ? ball.y : CY, VW = W / Z, VH = H / Z;
  cam.x += (clamp(tx - VW / 2, 0, W - VW) - cam.x) * .1; cam.y += (clamp(ty - VH / 2, 0, H - VH) - cam.y) * .1;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#000'; g.fillRect(0, 0, cv.width, cv.height);
  g.setTransform(VS, 0, 0, VS, VX, VY); g.beginPath(); g.rect(0, 0, W, H); g.clip();
  g.save(); g.scale(Z, Z); g.translate(-cam.x, -cam.y); g.drawImage(pc, 0, 0, W, H);
  if (ctrl && state !== 'menu' && state !== 'end') {
    g.strokeStyle = '#fff'; g.lineWidth = 2.5; g.beginPath(); g.arc(ctrl.x, ctrl.y, 17, 0, 7); g.stroke();
    g.fillStyle = '#fff'; g.beginPath(); g.moveTo(ctrl.x, ctrl.y - 24); g.lineTo(ctrl.x - 5, ctrl.y - 32); g.lineTo(ctrl.x + 5, ctrl.y - 32); g.fill();
  }
  if (ball) { g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(ball.x + 2, ball.y + 5, 6, 3, 0, 0, 7); g.fill(); }
  [...P].sort((a, b) => a.y - b.y).forEach(drawP);
  if (ctrl && charge > 0) {
    g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(ctrl.x - 20, ctrl.y + 22, 40, 6);
    g.fillStyle = charge > .85 ? '#ff5a5f' : '#ffd23f'; g.fillRect(ctrl.x - 20, ctrl.y + 22, 40 * charge, 6);
  }
  if (ball) {
    const by = ball.y - ball.z * .7;
    g.fillStyle = '#fff'; g.beginPath(); g.arc(ball.x, by, 6 + ball.z * .03, 0, 7); g.fill();
    g.strokeStyle = '#222'; g.lineWidth = 1.2; g.stroke();
    g.fillStyle = '#222'; g.beginPath(); g.arc(ball.x + Math.cos(ball.rot) * 2.5, by + Math.sin(ball.rot) * 2.5, 2, 0, 7); g.fill();
  }
  g.restore();
  // stamina + radar
  g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(14, 14, 120, 8);
  g.fillStyle = stam < .25 ? '#ff5a5f' : '#7cfc9a'; g.fillRect(14, 14, 120 * stam, 8);
  const rw = 150, rh = rw * H / W, rx = W - rw - 14, ry = 14;
  g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(rx, ry, rw, rh); g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 1; g.strokeRect(rx, ry, rw, rh);
  P.forEach(p => { g.fillStyle = K[p.t].c1; g.fillRect(rx + p.x * rw / W - 2, ry + p.y * rw / W - 2, 4, 4); });
  if (ball) { g.fillStyle = '#fff'; g.fillRect(rx + ball.x * rw / W - 1.5, ry + ball.y * rw / W - 1.5, 3, 3); }
  if (paused) { g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0, 0, W, H); g.fillStyle = '#fff'; g.font = 'bold 64px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Paused', W / 2, CY); }
  g.restore();
}

function resize() {
  const d = Math.min(2, devicePixelRatio || 1);
  cv.width = Math.round(innerWidth * d); cv.height = Math.round(innerHeight * d);
  VS = Math.min(cv.width / W, cv.height / H); VX = (cv.width - W * VS) / 2; VY = (cv.height - H * VS) / 2;
}
addEventListener('resize', resize); resize();
function togglePause() { if (state === 'menu' || state === 'end') return; paused ^= 1; $('pause').textContent = paused ? 'Resume' : 'Pause'; }
$('pause').onclick = togglePause;
document.addEventListener('visibilitychange', () => { if (document.hidden && !paused) togglePause(); });
function goFull() {
  try { const e = document.documentElement; (e.requestFullscreen || e.webkitRequestFullscreen)?.call(e); screen.orientation?.lock?.('landscape')?.catch(() => {}); } catch (x) {}
}
let last = performance.now(), acc = 0;
function loop(t) {
  acc += Math.min(50, t - last); last = t;
  while (acc >= 1000 / 60) { step(); acc -= 1000 / 60; }
  draw(); requestAnimationFrame(loop);
}
mkPitch(); build(); hud(); kickoff(0); state = 'menu'; ctrl = null;
requestAnimationFrame(loop);
})();