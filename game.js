(() => {
'use strict';
/* MONO SLUG - 흰 배경 + 검정 2색 런앤건. 조작: 방향키 + 스페이스 */
const W = 320, H = 180, GROUND = 150, MAXSTAGE = 255;
const cv = document.getElementById('c');
const ctx = cv.getContext('2d', { alpha: false });
ctx.imageSmoothingEnabled = false;
let FG = '#000', BG = '#fff', pat = null;

function resize() {
  const s = Math.max(1, Math.floor(Math.min(innerWidth / W, innerHeight / H)));
  cv.style.width = W * s + 'px';
  cv.style.height = H * s + 'px';
}
addEventListener('resize', resize); resize();

/* ---------- 도우미 ---------- */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ov = (ax, ay, aw, ah, bx, by, bw, bh) => ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
function R(x, y, w, h, c) {
  ctx.fillStyle = c;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}
function pixCircle(cx, cy, r, c) {
  ctx.fillStyle = c;
  for (let dy = -r; dy <= r; dy++) {
    const hw = Math.floor(Math.sqrt(r * r - dy * dy) + 0.5);
    ctx.fillRect(Math.round(cx) - hw, Math.round(cy) + dy, hw * 2 + 1, 1);
  }
}
function mulberry(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function hs(i, s) {
  let h = Math.imul(i * 374761393 + s * 668265263, 1274126177);
  h ^= h >>> 13; h = Math.imul(h, 1274126177); h ^= h >>> 16;
  return (h >>> 0) % 1000 / 1000;
}
function makePat() {
  const o = document.createElement('canvas'); o.width = o.height = 2;
  const c = o.getContext('2d');
  c.fillStyle = BG; c.fillRect(0, 0, 2, 2);
  c.fillStyle = FG; c.fillRect(0, 0, 1, 1); c.fillRect(1, 1, 1, 1);
  pat = ctx.createPattern(o, 'repeat');
}
function setPal() {
  FG = '#000'; BG = '#fff'; // 배경 흰색, 그 외 모든 구성 검정
  makePat();
}

/* ---------- 3x5 비트맵 폰트 ---------- */
const G = {
  A:'010101111101101',B:'110101110101110',C:'011100100100011',D:'110101101101110',E:'111100110100111',
  F:'111100110100100',G:'011100101101011',H:'101101111101101',I:'111010010010111',J:'001001001101010',
  K:'101101110101101',L:'100100100100111',M:'101111111101101',N:'110101101101101',O:'010101101101010',
  P:'110101110100100',Q:'010101101111011',R:'110101110101101',S:'011100010001110',T:'111010010010010',
  U:'101101101101111',V:'101101101101010',W:'101101111111101',X:'101101010101101',Y:'101101010010010',
  Z:'111001010100111',
  0:'111101101101111',1:'010110010010111',2:'110001010100111',3:'110001010001110',4:'101101111001001',
  5:'111100110001110',6:'011100111101111',7:'111001010010010',8:'111101111101111',9:'111101111001110',
  '/':'001001010100100','-':'000000111000000','!':'010010010000010','.':'000000000000010',
  ':':'000010000010000','<':'001010100010001','>':'100010001010100','+':'000010111010000'
};
function T(s, x, y, sc, c) {
  sc = sc || 1; c = c || FG; ctx.fillStyle = c; s = String(s).toUpperCase();
  x = Math.round(x); y = Math.round(y);
  for (let i = 0; i < s.length; i++) {
    const g = G[s[i]]; if (!g) continue;
    for (let k = 0; k < 15; k++) if (g[k] === '1') ctx.fillRect(x + i * 4 * sc + (k % 3) * sc, y + Math.floor(k / 3) * sc, sc, sc);
  }
}
const TW = (s, sc) => String(s).length * 4 * sc - sc;
function TC(s, y, sc, c) { T(s, (W - TW(s, sc)) / 2, y, sc, c); }
function panel(x, y, w, h) { R(x, y, w, h, FG); R(x + 1, y + 1, w - 2, h - 2, BG); }
const pad = (n, l) => String(n).padStart(l, '0');

/* ---------- 효과음 (WebAudio) ---------- */
let ac = null;
function beep(f, d, type, v) {
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'square'; o.frequency.value = f; g.gain.value = v || 0.03;
    o.connect(g); g.connect(ac.destination); o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + d);
    o.stop(ac.currentTime + d);
  } catch (e) {}
}

/* ---------- 입력: 방향키 + 스페이스 ---------- */
const keys = { l: 0, r: 0, u: 0, d: 0, s: 0 }, hit = { l: 0, r: 0, u: 0, d: 0, s: 0 };
const KMAP = { ArrowLeft: 'l', ArrowRight: 'r', ArrowUp: 'u', ArrowDown: 'd', Space: 's' };
addEventListener('keydown', e => {
  const k = KMAP[e.code]; if (!k) return;
  e.preventDefault(); if (!keys[k]) hit[k] = 1; keys[k] = 1;
});
addEventListener('keyup', e => {
  const k = KMAP[e.code]; if (!k) return;
  e.preventDefault(); keys[k] = 0;
});
let paused = false;
function lostFocus() { for (const k in keys) keys[k] = 0; if (mode === 'play') paused = true; }
addEventListener('blur', lostFocus);
document.addEventListener('visibilitychange', () => { if (document.hidden) lostFocus(); });
const clearHit = () => { for (const k in hit) hit[k] = 0; };

/* ---------- 상태 ---------- */
let mode = 'title', stage = 1, selStage = 1, best = 1, score = 0, frame = 0;
let cam = 0, p = null, ens = [], bul = [], bombs = [], fx = [], items = [], plats = [];
let spawns = [], spIdx = 0, stageLen = 1500, boss = null, bossSpawned = false;
let clearT = 0, introT = 0, shake = 0, warn = 0, overT = 0, camX = 0;
try { best = clamp(parseInt(localStorage.getItem('monoslug_best'), 10) || 1, 1, MAXSTAGE); } catch (e) {}
selStage = best;
function saveBest() { try { localStorage.setItem('monoslug_best', String(best)); } catch (e) {} }

/* ---------- 스테이지 생성 ---------- */
function genStage(n) {
  const r = mulberry((n * 2654435761 >>> 0) ^ 0x9e3779b9);
  const len = 1500 + Math.min(n, 100) * 10;
  const gap = Math.max(42, 115 - n * 0.4);
  const sp = []; let x = 300;
  while (x < len - 260) {
    x += gap * (0.6 + r() * 0.8);
    let t;
    if (r() < 0.07) t = 'pow';
    else {
      const w = { soldier: 6, runner: n >= 2 ? 2 + n / 50 : 0, turret: n >= 4 ? 1 + n / 60 : 0, drone: n >= 3 ? 1 + n / 40 : 0 };
      let sum = 0; for (const k in w) sum += w[k];
      let v = r() * sum; t = 'soldier';
      for (const k in w) { if (w[k] <= 0) continue; v -= w[k]; if (v <= 0) { t = k; break; } }
    }
    sp.push({ x: Math.floor(x), t, y: r(), side: r() });
    if (t !== 'pow' && t !== 'turret' && n > 20 && r() < Math.min(0.5, n / 300)) sp.push({ x: Math.floor(x) + 22, t, y: r(), side: 1 });
  }
  const pl = []; let px = 200;
  while (px < len - W - 40) {
    px += 120 + r() * 160;
    const h = [12, 16, 24, 32][Math.floor(r() * 4)];
    pl.push({ x: Math.floor(px), y: GROUND - h, w: 24 + Math.floor(r() * 28), h });
  }
  return { len, spawns: sp, plats: pl };
}

function newGame(n) {
  score = 0;
  p = { x: 16, y: GROUND - 14, w: 8, h: 14, vy: 0, on: true, f: 1, crouch: false, cd: 0, inv: 90, dead: 0, lives: 3, wp: 'P', ammo: 0, step: 0 };
  mode = 'play'; paused = false;
  startStage(n);
}
function startStage(n) {
  stage = n;
  const g = genStage(n);
  stageLen = g.len; spawns = g.spawns; plats = g.plats; spIdx = 0;
  cam = 0; ens = []; bul = []; bombs = []; fx = []; items = [];
  boss = null; bossSpawned = false; clearT = 0; introT = 110; warn = 0; shake = 0;
  setPal(n);
  p.x = 16; p.crouch = false; p.h = 14; p.y = GROUND - 14; p.vy = 0; p.on = true; p.inv = 90; p.dead = 0;
  if (n > best) { best = n; saveBest(); }
}
function respawn() {
  p.x = cam + 24; p.y = -16; p.vy = 0; p.h = 14; p.crouch = false; p.on = false;
  p.inv = 150; p.dead = 0; p.wp = 'P'; p.ammo = 0;
  bul = bul.filter(b => !b.e); bombs = [];
}

/* ---------- 적 생성 ---------- */
function mkEnemy(t, x, yr, side) {
  const n = stage, dif = Math.min(n, MAXSTAGE) / MAXSTAGE;
  const e = { t, x, y: GROUND - 14, w: 8, h: 14, vx: 0, vy: 0, hp: 1, f: -1, flash: 0, age: 0, cd: 40 + Math.floor(Math.random() * 60), cd0: 100, sp: 0.4, dir: -1 };
  if (t === 'soldier') { e.hp = 1 + Math.floor(n / 40); e.cd0 = Math.max(55, 130 - n * 0.5); e.sp = 0.35 + dif * 0.5; }
  else if (t === 'runner') {
    e.hp = 1 + Math.floor(n / 60); e.sp = 1.0 + dif * 0.9;
    if (side < 0.15) { e.x = cam - 10; e.dir = 1; } else e.dir = -1;
    e.f = e.dir;
  }
  else if (t === 'turret') { e.w = 14; e.h = 12; e.y = GROUND - 12; e.hp = 3 + Math.floor(n / 25); e.cd0 = Math.max(45, 110 - n * 0.4); e.aim = Math.PI; }
  else if (t === 'drone') { e.w = 12; e.h = 6; e.baseY = 82 + yr * 28; e.y = e.baseY; e.hp = 1 + Math.floor(n / 50); e.sp = 0.6 + dif * 0.6; e.cd = 0; }
  return e;
}
function spawnBoss() {
  bossSpawned = true;
  const n = stage, k = (n - 1) % 3, max = 12 + Math.floor(n * 0.7);
  const b = { t: 'boss', boss: 1, k, hp: max, max, x: cam + W + 10, y: 0, w: 44, h: 24, flash: 0, age: 0, cd: 90, vx: 0, vy: 0, phase: 0, dir: -1, burst: 0, on: true };
  if (k === 0) { b.w = 44; b.h = 24; b.y = GROUND - 24; }
  if (k === 1) { b.w = 36; b.h = 16; b.y = 98; }
  if (k === 2) { b.w = 24; b.h = 36; b.y = GROUND - 36; b.cd = 60; }
  b.tx = cam + W - b.w - 20;
  ens.push(b); boss = b; warn = 120;
}

/* ---------- 투사체 ---------- */
function ebA(x, y, a, sp) { bul.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, e: 1 }); }
function eAim(x, y, tx, ty, sp, spread) { ebA(x, y, Math.atan2(ty - y, tx - x) + (spread || 0), sp); }
function boom(x, y, big, delay) { fx.push({ x, y, t: 0, big: !!big, s: Math.random() * 6, d: delay || 0 }); }
const pcx = () => p.x + p.w / 2, pcy = () => p.y + p.h / 2;

function hitPlat(x, y, w, h) {
  for (const pl of plats) if (ov(x, y, w, h, pl.x, pl.y, pl.w, pl.h) && y + h > pl.y + 3) return true;
  return false;
}

function killPlayer() {
  if (p.dead > 0 || p.inv > 0) return;
  p.lives--; p.dead = 90; shake = 10;
  boom(pcx(), pcy(), true); beep(70, 0.4, 'sawtooth', 0.05);
}
function killEnemy(e) {
  const pts = { soldier: 100, runner: 150, turret: 300, drone: 200 };
  score += pts[e.t] || 100;
  boom(e.x + e.w / 2, e.y + e.h / 2, false); beep(120, 0.15, 'sawtooth', 0.04);
  if (e.t === 'soldier' && Math.random() < 0.08) items.push({ x: e.x, y: GROUND - 8, w: 10, h: 8 });
}

/* ---------- 플레이어 ---------- */
function updPlayer() {
  if (p.dead > 0) {
    p.dead--;
    if (p.dead === 0) { if (p.lives > 0) respawn(); else { mode = 'over'; overT = 0; } }
    return;
  }
  if (p.inv > 0) p.inv--;
  const wantCrouch = !!(keys.d && p.on);
  if (wantCrouch !== p.crouch) {
    const b = p.y + p.h; p.crouch = wantCrouch; p.h = wantCrouch ? 9 : 14; p.y = b - p.h;
  }
  let vx = 0;
  if (!p.crouch) {
    if (keys.l) { vx = -1.3; p.f = -1; } else if (keys.r) { vx = 1.3; p.f = 1; }
  } else { if (keys.l) p.f = -1; if (keys.r) p.f = 1; }
  const ox = p.x; p.x += vx;
  if (hitPlat(p.x, p.y, p.w, p.h)) p.x = ox;
  p.x = clamp(p.x, cam + 2, Math.min(stageLen + 20, cam + W - p.w - 2));
  if (vx) p.step += 0.25;
  if (keys.u && p.on && !p.crouch) { p.vy = -4.7; p.on = false; beep(500, 0.08, 'square', 0.02); }
  p.vy = Math.min(p.vy + 0.24, 6);
  const pb = p.y + p.h; p.y += p.vy; p.on = false;
  if (p.y + p.h >= GROUND) { p.y = GROUND - p.h; p.vy = 0; p.on = true; }
  else if (p.vy >= 0) {
    for (const pl of plats) {
      if (pb <= pl.y + 1 && p.y + p.h >= pl.y && p.x + p.w > pl.x && p.x < pl.x + pl.w) { p.y = pl.y - p.h; p.vy = 0; p.on = true; break; }
    }
  }
  if (p.cd > 0) p.cd--;
  if (keys.s && p.cd <= 0) {
    let vxb = p.f * 5, vyb = 0, bx = p.f > 0 ? p.x + p.w + 3 : p.x - 6, by = p.y + (p.crouch ? 4 : 6);
    if (keys.d && !p.on) { vxb = 0; vyb = 5; bx = p.x + 3; by = p.y + p.h + 1; }
    if (p.wp === 'H') {
      p.cd = 4; vyb += (Math.random() - 0.5) * 0.6;
      if (--p.ammo <= 0) p.wp = 'P';
      if (frame % 2 === 0) beep(1000, 0.03, 'square', 0.015);
    } else { p.cd = 13; beep(900, 0.05, 'square', 0.02); }
    bul.push({ x: bx, y: by, vx: vxb, vy: vyb, p: 1, w: vxb ? 4 : 2, h: vxb ? 2 : 4 });
  }
  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i];
    if (ov(p.x, p.y, p.w, p.h, it.x, it.y, it.w, it.h)) {
      p.wp = 'H'; p.ammo = Math.min(p.ammo + 60, 200); score += 50; items.splice(i, 1); beep(1400, 0.12, 'square', 0.03);
    }
  }
}

/* ---------- 적 업데이트 ---------- */
function updEnemy(e) {
  e.age++; if (e.flash > 0) e.flash--;
  const dx = pcx() - (e.x + e.w / 2);
  if (e.t === 'soldier') {
    e.f = dx > 0 ? 1 : -1;
    const dist = Math.abs(dx), ox = e.x;
    if (dist > 110) e.x += e.f * e.sp; else if (dist < 60) e.x -= e.f * e.sp * 0.8;
    if (hitPlat(e.x, e.y, e.w, e.h)) e.x = ox;
    if (--e.cd <= 0 && dist < 200) {
      ebA(e.f > 0 ? e.x + e.w + 6 : e.x - 6, e.y + 7, e.f > 0 ? 0 : Math.PI, 1.4 + Math.min(stage, MAXSTAGE) / MAXSTAGE * 1.2);
      e.cd = e.cd0 * (0.8 + Math.random() * 0.5);
    }
  } else if (e.t === 'runner') {
    const ox = e.x; e.x += e.dir * e.sp;
    if (hitPlat(e.x, e.y, e.w, e.h)) e.x = ox;
  } else if (e.t === 'turret') {
    e.aim = Math.atan2(pcy() - (e.y + 4), pcx() - (e.x + 7));
    if (--e.cd <= 0 && Math.abs(dx) < 220) {
      eAim(e.x + 7 + Math.cos(e.aim) * 8, e.y + 4 + Math.sin(e.aim) * 8, pcx(), pcy(), 1.3 + Math.min(stage, MAXSTAGE) / MAXSTAGE, 0);
      e.cd = e.cd0;
    }
  } else if (e.t === 'drone') {
    e.x -= e.sp + 0.3; e.y = e.baseY + Math.sin(e.age * 0.06) * 12;
    if (e.cd > 0) e.cd--;
    if (e.cd <= 0 && Math.abs(dx) < 10 && !p.dead) {
      bombs.push({ x: e.x + 6, y: e.y + 6, vy: 0.5 }); e.cd = Math.max(60, 150 - stage * 0.4);
    }
  } else if (e.boss) updBoss(e);
}
function updBoss(e) {
  const dif = Math.min(stage, MAXSTAGE) / MAXSTAGE, sp = 0.5 + dif * 0.8;
  const bs = 1.6 + dif * 1.0;
  if (e.phase === 0) { e.x -= 1; if (e.x <= e.tx) e.phase = 1; return; }
  const lo = cam + W * 0.4, hi = cam + W - e.w - 8;
  if (e.k === 0) { // 탱크
    e.x += e.dir * sp; if (e.x < lo) { e.x = lo; e.dir = 1; } if (e.x > hi) { e.x = hi; e.dir = -1; }
    if (--e.cd <= 0) {
      const n = 1 + Math.floor(stage / 70);
      for (let i = 0; i < n; i++) eAim(e.x, e.y + 6, pcx(), pcy(), bs, (i - (n - 1) / 2) * 0.22);
      e.cd = Math.max(50, 110 - stage * 0.3); e.burst++;
      if (stage >= 8 && e.burst % 3 === 0) { const m = mkEnemy('runner', cam + W + 4, 0, 1); ens.push(m); }
      beep(160, 0.1, 'sawtooth', 0.04);
    }
  } else if (e.k === 1) { // 헬기
    e.x = lo + (hi - lo) * (0.5 + 0.5 * Math.sin(e.age * 0.018 * (1 + dif)));
    e.y = 98 + Math.sin(e.age * 0.04) * 22;
    if (--e.cd <= 0) {
      const n = 2 + Math.floor(stage / 90);
      for (let i = 0; i < n; i++) eAim(e.x + e.w / 2, e.y + e.h, pcx(), pcy(), bs, (i - (n - 1) / 2) * 0.3);
      if (e.burst++ % 2 === 0) bombs.push({ x: e.x + e.w / 2, y: e.y + e.h, vy: 0.5 });
      e.cd = Math.max(55, 100 - stage * 0.25);
    }
  } else { // 워커
    if (e.on) {
      if (--e.cd <= 0) {
        e.vy = -6.5; e.vx = (pcx() < e.x + e.w / 2 ? -1 : 1) * (1.2 + dif); e.on = false;
        eAim(e.x + e.w / 2, e.y + 10, pcx(), pcy(), bs, 0);
      }
    } else {
      e.vy += 0.3; e.y += e.vy; e.x += e.vx;
      if (e.y + e.h >= GROUND) {
        e.y = GROUND - e.h; e.vy = 0; e.on = true; e.cd = Math.max(40, 80 - stage * 0.15); shake = 6;
        ebA(e.x + e.w / 2, GROUND - 3, 0, 1.8); ebA(e.x + e.w / 2, GROUND - 3, Math.PI, 1.8);
        beep(60, 0.3, 'sawtooth', 0.05);
      }
    }
    e.x = clamp(e.x, lo - 20, hi);
  }
}

/* ---------- 메인 업데이트 ---------- */
function updPlay() {
  if (introT > 0) introT--;
  if (warn > 0) warn--;
  if (shake > 0) shake--;
  updPlayer();
  // 카메라
  if (!p.dead) {
    const target = p.x - W * 0.4;
    if (target > cam) cam = Math.min(target, stageLen - W, cam + 2);
  }
  // 스폰
  if (!bossSpawned) {
    while (spIdx < spawns.length && spawns[spIdx].x < cam + W + 16) {
      const s = spawns[spIdx++];
      if (s.t === 'pow') items.push({ x: s.x, y: GROUND - 8, w: 10, h: 8 });
      else ens.push(mkEnemy(s.t, s.x, s.y, s.side));
    }
    if (cam >= stageLen - W - 0.5) spawnBoss();
  }
  // 적
  for (let i = ens.length - 1; i >= 0; i--) {
    const e = ens[i]; updEnemy(e);
    if (!e.boss && (e.x < cam - 50 || e.x > cam + W + 80)) { ens.splice(i, 1); continue; }
  }
  // 총알
  for (let i = bul.length - 1; i >= 0; i--) {
    const b = bul[i]; b.x += b.vx; b.y += b.vy;
    let rm = b.x < cam - 10 || b.x > cam + W + 10 || b.y < -10 || b.y > GROUND;
    if (!rm) for (const pl of plats) if (b.x > pl.x && b.x < pl.x + pl.w && b.y > pl.y && b.y < pl.y + pl.h) { rm = true; break; }
    if (!rm && b.p) {
      for (const e of ens) {
        if (e.boss && e.phase === 0) continue;
        if (ov(b.x, b.y, b.w, b.h, e.x, e.y, e.w, e.h)) {
          e.hp--; e.flash = 4; rm = true; beep(300, 0.03, 'square', 0.015);
          if (e.hp <= 0) {
            if (e.boss) bossDown(e); else killEnemy(e);
            ens.splice(ens.indexOf(e), 1);
          }
          break;
        }
      }
    } else if (!rm && b.e && !p.dead && p.inv <= 0) {
      if (ov(b.x - 1, b.y - 1, 3, 3, p.x + 1, p.y + 1, p.w - 2, p.h - 2)) { rm = true; killPlayer(); }
    }
    if (rm) bul.splice(i, 1);
  }
  // 폭탄
  for (let i = bombs.length - 1; i >= 0; i--) {
    const b = bombs[i]; b.vy = Math.min(b.vy + 0.1, 3); b.y += b.vy;
    let rm = false;
    if (!p.dead && p.inv <= 0 && ov(b.x - 2, b.y - 3, 4, 6, p.x + 1, p.y + 1, p.w - 2, p.h - 2)) { killPlayer(); rm = true; boom(b.x, b.y, false); }
    if (b.y >= GROUND - 2) {
      rm = true; boom(b.x, GROUND - 4, false); shake = Math.max(shake, 3); beep(90, 0.2, 'sawtooth', 0.04);
      if (!p.dead && p.inv <= 0 && Math.abs(pcx() - b.x) < 14 && p.y + p.h > GROUND - 16) killPlayer();
    }
    if (rm) bombs.splice(i, 1);
  }
  // 접촉 사망
  if (!p.dead && p.inv <= 0) {
    for (const e of ens) {
      if (e.boss && e.phase === 0) continue;
      if (ov(p.x + 1, p.y + 1, p.w - 2, p.h - 2, e.x + 1, e.y + 1, e.w - 2, e.h - 2)) { killPlayer(); break; }
    }
  }
  // 효과
  for (let i = fx.length - 1; i >= 0; i--) {
    const f = fx[i]; if (f.d > 0) { f.d--; continue; }
    if (++f.t > (f.big ? 30 : 16)) fx.splice(i, 1);
  }
  // 스테이지 클리어
  if (clearT > 0) {
    clearT++;
    p.inv = Math.max(p.inv, 5); bul = bul.filter(b => !b.e); bombs = [];
    if (clearT === 2) {
      score += 1000 + stage * 10;
      if (stage % 5 === 0) p.lives = Math.min(9, p.lives + 1);
    }
    if (clearT >= 260 || (clearT > 90 && hit.s)) {
      if (stage >= MAXSTAGE) { mode = 'win'; overT = 0; best = MAXSTAGE; saveBest(); }
      else startStage(stage + 1);
    }
  }
}
function bossDown(e) {
  score += 5000 + stage * 20; boss = null; clearT = 1; shake = 30;
  for (let i = 0; i < 12; i++) boom(e.x + Math.random() * e.w, e.y + Math.random() * e.h, true, i * 8);
  ens.forEach(o => { if (o !== e) boom(o.x + o.w / 2, o.y + o.h / 2, false, 4); });
  ens.length = 0; ens.push(e); // 남은 적 제거 (호출 측에서 e를 제거함)
  beep(50, 0.8, 'sawtooth', 0.06);
}

function updTitle() {
  if (hit.l) selStage = Math.max(1, selStage - 1);
  if (hit.r) selStage = Math.min(best, selStage + 1);
  if (hit.d) selStage = Math.max(1, selStage - 10);
  if (hit.u) selStage = Math.min(best, selStage + 10);
  if (hit.s) { beep(800, 0.1, 'square', 0.03); newGame(selStage); }
}
function update() {
  frame++;
  if (paused) { if (hit.s) paused = false; clearHit(); return; }
  if (mode === 'title') { cam += 0.5; updTitle(); }
  else if (mode === 'play') updPlay();
  else if (mode === 'over' || mode === 'win') {
    overT++;
    if (overT > 60 && hit.s) { selStage = Math.min(stage, best); mode = 'title'; setPal(selStage); }
  }
  clearHit();
}

/* ---------- 그리기 ---------- */
function drawBG() {
  R(0, 0, W, H, BG);
  for (let i = 0; i < 24; i++) R(hs(i, 1) * W, hs(i, 2) * 70, 1, 1, FG);
  pixCircle(250, 34, 16, FG);
  pixCircle(245, 30, 3, BG); pixCircle(256, 39, 2, BG); pixCircle(253, 26, 1, BG);
  // 먼 스카이라인
  const off = Math.round(camX * 0.25);
  for (let i = Math.floor(off / 46) - 1; i <= Math.floor((off + W) / 46) + 1; i++) {
    const bx = i * 46 + Math.floor(hs(i, stage) * 10), bw = 26 + Math.floor(hs(i, 7) * 16), bh = 28 + Math.floor(hs(i + 500, stage) * 50);
    ctx.save(); ctx.translate(bx - off, GROUND - bh);
    R(-1, -1, bw + 2, bh + 1, BG);
    ctx.fillStyle = pat; ctx.fillRect(0, 0, bw, bh);
    ctx.fillStyle = FG; ctx.fillRect(0, 0, bw, 1);
    ctx.fillStyle = BG;
    for (let wy = 6; wy < bh - 6; wy += 8) for (let wx = 4; wx < bw - 4; wx += 7) if (hs(i * 31 + wx + wy * 3, stage) > 0.45) ctx.fillRect(wx, wy, 3, 4);
    ctx.restore();
  }
  // 전신주
  const o2 = Math.round(camX * 0.6);
  for (let i = Math.floor(o2 / 90) - 1; i <= Math.floor((o2 + W) / 90) + 1; i++) {
    const x = i * 90 + 20 - o2;
    R(x, GROUND - 44, 2, 44, FG); R(x - 5, GROUND - 42, 12, 2, FG); R(x - 3, GROUND - 36, 8, 1, FG);
  }
  // 지면
  R(0, GROUND, W, H - GROUND, FG);
  const sh = ((camX % 16) + 16) % 16;
  for (let r = 0; r < 4; r++) {
    R(0, GROUND + 4 + r * 6, W, 1, BG);
    for (let x = -sh + (r % 2) * 8; x < W; x += 16) R(x, GROUND + 5 + r * 6, 1, 5, BG);
  }
}
function drawPlatforms() {
  for (const pl of plats) {
    const x = pl.x - camX; if (x > W || x + pl.w < 0) continue;
    R(x, pl.y, pl.w, pl.h, FG); R(x + 2, pl.y + 2, pl.w - 4, pl.h - 4, BG);
    R(x + 2, pl.y + Math.floor(pl.h / 2), pl.w - 4, 1, FG);
    R(x + Math.floor(pl.w / 2), pl.y + 2, 1, pl.h - 4, FG);
  }
}
function line(x0, y0, a, len, c) {
  for (let t = 0; t <= len; t += 2) R(x0 + Math.cos(a) * t, y0 + Math.sin(a) * t, 2, 2, c);
}
function drawEnemy(e) {
  const x = Math.round(e.x) - camX, y = Math.round(e.y);
  if (x > W + 60 || x + e.w < -60) return;
  const c1 = e.flash > 0 ? BG : FG, c2 = e.flash > 0 ? FG : BG;
  const st = Math.floor(e.age / 8) % 2;
  if (e.t === 'soldier' || e.t === 'runner') {
    R(x - 5, y - 1, e.w + 10, e.h + 2, c2);
    R(x + 2, y, 4, 4, c1); R(x + 3, y + 1, 2, 2, c2);
    R(x + 1, y + 4, 6, 6, c1); R(x + 1, y + 7, 6, 1, c2);
    if (e.t === 'soldier') {
      R(x + 1, y + 10, 2, st ? 4 : 3, c1); R(x + 5, y + 10, 2, st ? 3 : 4, c1);
      R(e.f > 0 ? x + 6 : x - 4, y + 6, 6, 2, c1);
    } else {
      const s2 = Math.floor(e.age / 4) % 2;
      R(x + (s2 ? 0 : 1), y + 10, 2, 4, c1); R(x + (s2 ? 6 : 5), y + 10, 2, 4, c1);
      R(e.f > 0 ? x + 6 : x - 3, y + 5, 3, 2, c1);
    }
  } else if (e.t === 'turret') {
    R(x - 1, y - 1, e.w + 2, e.h + 2, c2);
    line(x + 7, y + 4, e.aim, 10, c1);
    R(x, y + 6, 14, 6, c1); R(x + 1, y + 8, 12, 1, c2); R(x + 5, y + 3, 4, 3, c1);
  } else if (e.t === 'drone') {
    R(x - 1, y - 1, e.w + 2, e.h + 3, c2);
    R(x + 2, y + 2, 8, 4, c1); R(x + 5, y + 3, 2, 1, c2);
    if (Math.floor(e.age / 2) % 2) R(x, y, 12, 1, c1); else R(x + 3, y, 6, 1, c1);
    R(x + 5, y + 6, 2, 1, c1);
  } else if (e.boss) drawBoss(e, x, y, c1, c2);
}
function drawBoss(e, x, y, c1, c2) {
  R(x - 2, y - 2, e.w + 4, e.h + 4, c2);
  const ph = Math.floor(e.age / 4) % 2;
  const f = pcx() > e.x + e.w / 2 ? 1 : -1;
  if (e.k === 0) { // 탱크
    R(x, y + 12, 44, 12, c1);
    for (let i = 0; i < 5; i++) { pixCircle(x + 6 + i * 8, y + 19, 3, c2); R(x + 5 + i * 8, y + 18 + (ph && i % 2 ? 1 : 0), 2, 2, c1); }
    R(x + 8, y + 4, 26, 9, c1); R(x + 12, y + 7, 18, 1, c2);
    R(x - 12, y + 6, 20, 3, c1);
  } else if (e.k === 1) { // 헬기
    R(x + 6, y + 4, 24, 10, c1); R(x + 10, y + 7, 8, 4, c2);
    R(e.x < pcx() ? x - 12 : x + 36, y + 6, 12, 3, c1);
    if (ph) R(x - 6, y, 48, 1, c1); else R(x + 4, y, 28, 1, c1);
    R(x + 17, y + 1, 2, 3, c1);
    R(x + 8, y + 14, 20, 1, c1); R(x + 10, y + 12, 1, 3, c1); R(x + 26, y + 12, 1, 3, c1);
  } else { // 워커
    R(x + 2, y + 20, 6, 16, c1); R(x + 16, y + 20, 6, 16, c1); R(x, y + 34, 10, 2, c1); R(x + 14, y + 34, 10, 2, c1);
    R(x, y + 8, 24, 14, c1); R(x + 3, y + 12, 18, 2, c2);
    R(x + 6, y, 12, 8, c1); R(x + 8, y + 3, 8, 2, c2);
    R(f > 0 ? x + 22 : x - 12, y + 10, 14, 4, c1);
  }
}
function drawPlayer() {
  if (p.dead > 0) return;
  if (p.inv > 0 && ((p.inv >> 2) & 1)) return;
  const x = Math.round(p.x) - camX, y = Math.round(p.y), f = p.f, c1 = FG, c2 = BG;
  R(x - 5, y - 1, p.w + 10, p.h + 2, c2);
  R(x + 2, y, 4, 4, c1); R(x + (f > 0 ? 4 : 2), y + 1, 1, 1, c2);
  if (p.crouch) { R(x + 1, y + 4, 6, 5, c1); R(x + 1, y + 6, 6, 1, c2); }
  else {
    R(x + 1, y + 4, 6, 6, c1); R(x + 1, y + 7, 6, 1, c2);
    const sw = p.on && (keys.l || keys.r) ? Math.floor(p.step) % 2 : 0;
    if (!p.on) { R(x + 1, y + 10, 2, 3, c1); R(x + 5, y + 10, 2, 3, c1); }
    else { R(x + 1, y + 10, 2, sw ? 4 : 3, c1); R(x + 5, y + 10, 2, sw ? 3 : 4, c1); }
  }
  const gy = y + (p.crouch ? 4 : 6);
  if (keys.d && !p.on) R(x + 3, y + p.h, 2, 5, c1);
  else R(f > 0 ? x + 6 : x - 4, gy, 6, 2, c1);
}
function drawBullets() {
  for (const b of bul) {
    const x = Math.round(b.x) - camX, y = Math.round(b.y);
    if (b.p) { R(x - 1, y - 1, b.w + 2, b.h + 2, BG); R(x, y, b.w, b.h, FG); }
    else { R(x - 2, y - 2, 5, 5, BG); R(x - 1, y - 1, 3, 3, FG); R(x, y, 1, 1, BG); }
  }
  for (const b of bombs) {
    const x = Math.round(b.x) - camX, y = Math.round(b.y);
    R(x - 3, y - 4, 6, 8, BG); R(x - 1, y - 3, 3, 5, FG); R(x - 2, y - 4, 5, 1, FG);
  }
}
function drawItems() {
  for (const it of items) {
    const x = Math.round(it.x) - camX; if (x > W || x < -12) continue;
    R(x - 1, it.y - 1, 12, 10, BG); R(x, it.y, 10, 8, FG); T('H', x + 3, it.y + 1, 1, BG);
  }
}
function drawFx() {
  for (const f of fx) {
    if (f.d > 0) continue;
    const t = f.t, m = f.big ? 30 : 16, n = f.big ? 12 : 7, cx = f.x - camX;
    if (t < 6) pixCircle(cx, f.y, Math.max(1, (f.big ? 9 : 6) - t), FG);
    for (let i = 0; i < n; i++) {
      const a = i * 2.399 + f.s, d = t * (f.big ? 1.1 : 0.8) * (0.5 + (i % 3) * 0.3);
      const sz = Math.max(1, Math.round((1 - t / m) * (f.big ? 5 : 3)));
      const px = cx + Math.cos(a) * d - sz / 2, py = f.y + Math.sin(a) * d - sz / 2;
      R(px - 1, py - 1, sz + 2, sz + 2, BG); R(px, py, sz, sz, FG);
    }
  }
}
function drawHUD() {
  R(0, H - 12, W, 12, BG); R(0, H - 12, W, 1, FG);
  T('SCORE ' + pad(score, 6), 4, H - 8, 1, FG);
  T('STAGE ' + pad(stage, 3) + '/' + MAXSTAGE, 108, H - 8, 1, FG);
  T('LIFE ' + p.lives, 218, H - 8, 1, FG);
  T((p.wp === 'H' ? 'H' + pad(p.ammo, 3) : 'P'), 270, H - 8, 1, FG);
  if (boss && boss.phase > 0) {
    R(110, 5, 100, 6, FG); R(111, 6, 98, 4, BG); R(111, 6, Math.max(0, Math.floor(98 * boss.hp / boss.max)), 4, FG);
  }
}
function banner(l1, l2, y) {
  const w = Math.max(TW(l1, 3), l2 ? TW(l2, 1) : 0) + 20, h = l2 ? 44 : 32;
  panel((W - w) / 2, y, w, h); TC(l1, y + 6, 3, FG); if (l2) TC(l2, y + 30, 1, FG);
}
function drawPlay() {
  camX = Math.round(cam);
  ctx.save();
  if (shake > 0) ctx.translate((Math.floor(Math.random() * 3) - 1), (Math.floor(Math.random() * 3) - 1));
  drawBG(); drawPlatforms(); drawItems();
  for (const e of ens) drawEnemy(e);
  drawBullets(); drawPlayer(); drawFx();
  ctx.restore();
  drawHUD();
  if (introT > 0 && clearT === 0) banner('STAGE ' + stage, introT < 40 ? 'GO!' : 'GET READY', 50);
  if (warn > 0 && (warn >> 3) % 2 === 0) banner('WARNING', 'BOSS APPROACHING', 50);
  if (clearT > 20) banner('CLEAR!', 'BONUS ' + (1000 + stage * 10), 50);
  if (paused) banner('PAUSED', 'PRESS SPACE', 60);
}
function drawTitle() {
  camX = Math.round(cam); drawBG();
  panel(60, 14, 200, 62);
  TC('MONO SLUG', 22, 5, FG);
  TC('2 COLOR RUN AND GUN', 56, 1, FG);
  TC('255 STAGES', 64, 1, FG);
  panel(80, 84, 160, 34);
  TC('< STAGE ' + pad(selStage, 3) + ' >', 90, 2, FG);
  TC('BEST ' + pad(best, 3) + '   UP DOWN +10', 108, 1, FG);
  panel(30, 124, 260, 22);
  TC('LEFT RIGHT MOVE   UP JUMP   DOWN CROUCH', 128, 1, FG);
  TC('SPACE FIRE', 137, 1, FG);
  if ((frame >> 5) % 2 === 0) { panel(96, 155, 128, 20); TC('PRESS SPACE', 160, 2, FG); }
}
function drawEnd() {
  camX = Math.round(cam); drawBG();
  if (mode === 'over') {
    panel(50, 40, 220, 80); TC('GAME OVER', 48, 4, FG);
    TC('STAGE ' + pad(stage, 3) + '  SCORE ' + pad(score, 6), 82, 1, FG);
    TC('BEST STAGE ' + pad(best, 3), 94, 1, FG);
    if (overT > 60 && (frame >> 5) % 2 === 0) TC('PRESS SPACE', 106, 1, FG);
  } else {
    panel(30, 30, 260, 100); TC('ALL CLEAR!', 38, 4, FG);
    TC('ALL 255 STAGES COMPLETE', 72, 1, FG);
    TC('CONGRATULATIONS!', 84, 1, FG);
    TC('SCORE ' + pad(score, 6), 98, 2, FG);
    if (overT > 60 && (frame >> 5) % 2 === 0) TC('PRESS SPACE', 118, 1, FG);
  }
}
function draw() {
  if (mode === 'play') drawPlay();
  else if (mode === 'title') drawTitle();
  else drawEnd();
}

/* ---------- 메인 루프 (60fps 고정 스텝) ---------- */
setPal(selStage);
let last = 0, acc = 0;
function loop(t) {
  if (!last) last = t;
  acc += Math.min(100, t - last); last = t;
  while (acc >= 1000 / 60) { update(); acc -= 1000 / 60; }
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
})();
