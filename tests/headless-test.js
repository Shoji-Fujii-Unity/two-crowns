/* index.html のゲームロジックを DOM スタブでヘッドレス検証するテスト。
   使い方: node tests/headless-test.js [試合数] */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const m = html.match(/<script>([\s\S]*?)<\/script>/);
if (!m) throw new Error('script block not found');
const code = m[1];

/* ---------- DOM スタブ ---------- */
function makeEl(tag) {
  const cls = new Set();
  const el = {
    tagName: tag,
    className: '',
    _html: '',
    dataset: {},
    style: {
      _p: {},
      setProperty(k, v) { this._p[k] = String(v); },
      removeProperty(k) { delete this._p[k]; },
      getPropertyValue(k) { return this._p[k] === undefined ? '' : this._p[k]; },
    },
    children: [],
    clientWidth: 400,
    clientHeight: 400,
    value: '',
    options: [],
    disabled: false,
    title: '',
    _attrs: {},
    _qs: [],
    _scrolled: 0,
    handlers: {},
    getAttribute(n) { return this._attrs[n] === undefined ? null : this._attrs[n]; },
    setAttribute(n, v) { this._attrs[n] = String(v); },
    addEventListener(type, fn) { (this.handlers[type] = this.handlers[type] || []).push(fn); },
    appendChild(c) { this.children.push(c); return c; },
    scrollIntoView() { this._scrolled++; },
    querySelectorAll(sel) {
      const out = [];
      const h = this._html || '';
      if (sel === 'button') {                    // innerHTML 後の子 button を再現する
        for (const p of h.split(/<button\b/).slice(1)) {
          const openTag = p.split('>')[0];
          const dm = openTag.match(/data-k="([\w-]+)"/);
          if (!dm) continue;
          const b = makeEl('button');
          b.dataset = { k: dm[1] };
          b.disabled = /\bdisabled\b/.test(openTag);
          out.push(b);
        }
      } else if (sel === '[data-i18n]') {
        const re = /data-i18n="(\w+)"/g;
        let q;
        while ((q = re.exec(h))) {
          const b = makeEl('span');
          b._attrs = { 'data-i18n': q[1] };
          out.push(b);
        }
      }
      this._qs = out;
      return out;
    },
    classList: {
      add(...c) { c.forEach(x => cls.add(x)); },
      remove(...c) { c.forEach(x => cls.delete(x)); },
      toggle(c, f) { if (f === undefined) { cls.has(c) ? cls.delete(c) : cls.add(c); } else { f ? cls.add(c) : cls.delete(c); } return cls.has(c); },
      contains(c) { return cls.has(c); },
    },
    getBoundingClientRect() { return { width: 400, height: 400 }; },
    click() { if (this.disabled) return; (this.handlers.click || []).forEach(f => f.call(this, { preventDefault() {} })); },
  };
  Object.defineProperty(el, 'innerHTML', {
    get() { return this._html; },
    set(v) {
      this._html = String(v);
      if (/NaN|undefined|\[object/.test(this._html)) {
        throw new Error('描画結果に不正な値: ' + this._html.slice(0, 160));
      }
    },
  });
  Object.defineProperty(el, 'textContent', {
    get() { return this._text || ''; },
    set(v) {
      this._text = String(v);
      if (/NaN|undefined|\[object/.test(this._text)) {
        throw new Error('描画結果に不正な値: ' + this._text);
      }
    },
  });
  return el;
}
const els = new Map();
function getEl(id) { if (!els.has(id)) els.set(id, makeEl('div')); return els.get(id); }

/* ---------- localStorage スタブ（端末内保存の再現） ---------- */
function makeStorage() {
  const m = new Map();
  return {
    getItem(k) { return m.has(k) ? m.get(k) : null; },
    setItem(k, v) { m.set(k, String(v)); },
    removeItem(k) { m.delete(k); },
    clear() { m.clear(); },
    _map: m,
  };
}
const storage = makeStorage();
const markup = html.slice(0, html.indexOf('<script>'));

const sandbox = {
  console,
  setTimeout: (fn) => { queueMicrotask(fn); return 1; },
  clearTimeout: () => {},
  queueMicrotask,
  navigator: { language: 'ja-JP' },
  localStorage: storage,
  document: {
    getElementById: getEl,
    createElement: makeEl,
    documentElement: makeEl('html'),
    body: makeEl('body'),
    addEventListener() {},
    querySelectorAll(sel) {                    // [data-i18n] を静的マークアップから拾う
      if (sel !== '[data-i18n]') return [];
      const out = [], re = /data-i18n="(\w+)"/g;
      let q;
      while ((q = re.exec(markup))) {
        const b = makeEl('span');
        b._attrs = { 'data-i18n': q[1] };
        out.push(b);
      }
      return out;
    },
  },
  window: (() => {
    const h = {};
    return { addEventListener(t, f) { (h[t] = h[t] || []).push(f); }, _h: h };
  })(),
};
sandbox.globalThis = sandbox;
const ctx = vm.createContext(sandbox);
vm.runInContext(code, ctx, { filename: 'game.js' });

const g = (n) => ctx[n];
const S = () => ctx.S;
const P = 'p', E = 'e';

/* ---------- 不変条件チェック ---------- */
function checkInvariants(tag) {
  const st = S();
  const seen = new Set();
  for (const u of st.units) {
    const T = g('TYPES')[u.type];
    if (!T) throw new Error(tag + ': 不明な兵種 ' + u.type);
    if (!Number.isFinite(u.hp) || u.hp <= 0) throw new Error(tag + ': HP異常 ' + u.type + '=' + u.hp);
    if (u.hp > T.hp) throw new Error(tag + ': HP上限超過 ' + u.type + ' ' + u.hp + '/' + T.hp);
    if (!Number.isInteger(u.x) || !Number.isInteger(u.y)) throw new Error(tag + ': 座標が整数でない');
    if (u.x < 0 || u.y < 0 || u.x >= 9 || u.y >= 9) throw new Error(tag + ': 盤外 ' + u.x + ',' + u.y);
    const tile = st.tiles[u.y][u.x];
    if (tile.t === 'water') throw new Error(tag + ': 河の上にUnits');
    if (tile.t === 'mountain' && T.noMountain) throw new Error(tag + ': 騎兵が山にいる');
    if (tile.t === 'base' && tile.owner !== u.side) throw new Error(tag + ': 敵本営に乗っている');
    const k = u.x + ',' + u.y;
    if (seen.has(k)) throw new Error(tag + ': 同一マスにUnitsが重なっている ' + k);
    seen.add(k);
    if (u.side !== P && u.side !== E) throw new Error(tag + ': 不明な陣営');
  }
  for (const s of [P, E]) {
    if (!Number.isFinite(st.coins[s]) || st.coins[s] < 0) throw new Error(tag + ': 資金異常 ' + st.coins[s]);
    if (!Number.isFinite(st.baseHp[s])) throw new Error(tag + ': 本営HP異常');
    if (st.baseHp[s] > g('BASE_HP')) throw new Error(tag + ': 本営HPが初期値超え');
  }
  if (st.units.length > 2 * g('UNIT_CAP')) throw new Error(tag + ': 兵数が上限超え');
}

/* ---------- 位置サンプリング ---------- */
const POS = { n: 0, deepE: 0, deepP: 0, adjE: 0, adjP: 0, nE: 0, nP: 0 };
function samplePositions() {
  const bp = g('BASE_POS'), es = g('unitsOf')(E), ps = g('unitsOf')(P);
  const man = (u, b) => Math.abs(u.x - b.x) + Math.abs(u.y - b.y);
  POS.n++; POS.nE += es.length; POS.nP += ps.length;
  POS.deepE += es.filter(u => u.y >= 5).length;
  POS.deepP += ps.filter(u => u.y <= 3).length;
  POS.adjE += es.filter(u => man(u, bp.p) === 1).length;
  POS.adjP += ps.filter(u => man(u, bp.e) === 1).length;
}

/* ---------- 自軍(プレイヤー側)の簡易ポリシー ---------- */
function actUnit(u) {
  const st = S();
  const reach = g('reachable')(u);
  let best = null;
  for (const key in reach) {
    const k = +key, x = k % 9, y = Math.floor(k / 9);
    for (const t of g('targetsFrom')(u, x, y)) {
      const sc = g('scoreAttack')(u, x, y, t);
      if (!best || sc > best.sc) best = { sc, x, y, t };
    }
  }
  if (best && best.sc > -1) {
    g('moveTo')(u, best.x, best.y);
    if (!S().over) g('doAttack')(u, best.t);
    return;
  }
  const pts = g('aiChooseTargetPoints')(u.side);
  if (!pts.length) { u.acted = true; return; }
  let mv = null;
  for (const key in reach) {
    const k = +key, x = k % 9, y = Math.floor(k / 9);
    const sc = g('advanceScore')(u, x, y, pts);
    if (!mv || sc > mv.sc) mv = { sc, x, y };
  }
  if (mv && !(mv.x === u.x && mv.y === u.y)) g('moveTo')(u, mv.x, mv.y);
  else u.moved = true;
  u.acted = true;
  const tgs = g('targetsFrom')(u, u.x, u.y);
  if (tgs.length && !S().over) {
    let pick = null;
    for (const t of tgs) {
      const sc = g('scoreAttack')(u, u.x, u.y, t);
      if (!pick || sc > pick.sc) pick = { sc, t };
    }
    if (pick && pick.sc > 0) g('doAttack')(u, pick.t);
  }
}
function pickType(side) {
  // 敵の編成を見て兵科を選ぶ（人間らしい-proxy）
  const foes = g('unitsOf')(g('other')(side));
  const cnt = { ho: 0, yu: 0, ki: 0, ya: 0 };
  for (const f of foes) cnt[f.type]++;
  if (cnt.ki >= 2) return 'ya';
  if (cnt.yu >= 2) return 'ki';
  const rot = ['ho', 'yu', 'ya', 'ki'];
  return rot[Math.floor(Math.random() * rot.length)];
}
function summonFor(side) {
  const st = S();
  for (let n = 0; n < 3; n++) {
    if (g('unitsOf')(side).length >= g('UNIT_CAP')) return false;
    const affordable = ['ki', 'ya', 'yu', 'ho'].filter(k => g('TYPES')[k].cost <= st.coins[side]);
    if (!affordable.length) return false;
    let type = pickType(side);
    if (!affordable.includes(type)) type = affordable[affordable.length - 1];
    const tiles = g('legalSummon')(side, type);
    if (!tiles.length) continue;
    const spot = tiles[Math.floor(Math.random() * tiles.length)];
    st.coins[side] -= g('TYPES')[type].cost;
    g('addUnit')(side, type, spot.x, spot.y).acted = true;
  }
  return true;
}
const flush = () => new Promise(r => queueMicrotask(r));
/* AIの手番（setTimeout連鎖）が済むまで待つ */
async function waitIdle(max) {
  const n = max || 800;
  for (let i = 0; i < n && !S().over && (S().busy || S().phase === E); i++) await flush();
  await flush();
  if (!S().over && (S().busy || S().phase === E)) throw new Error('AI手番が完了しない（busy/敵フェーズのまま）');
}

/* ---------- 状態ダンプ（未決着のとき中身を見る） ---------- */
function dumpState(tag) {
  const L = [tag + ' turn=' + S().turn + ' stage=' + S().stage +
    ' 本営 p/e=' + S().baseHp.p + '/' + S().baseHp.e + ' 資金 p/e=' + S().coins.p + '/' + S().coins.e];
  const ch = { plain: '.', forest: '#', mountain: '^', water: '~', village: 'v', base: 'B' };
  for (let y = 0; y < g('ROWS'); y++) {
    let s = '  ';
    for (let x = 0; x < g('COLS'); x++) {
      const u = g('unitAt')(x, y), tl = S().tiles[y][x];
      s += u ? (u.side === P ? u.type[0].toUpperCase() : u.type[0]) : ch[tl.t];
    }
    L.push(s);
  }
  L.push('  兵: ' + S().units.map(u => (u.side === P ? 'p' : 'r') + ':' + u.type + '@' + u.x + ',' + u.y + ' hp' + u.hp).join(' '));
  L.push('  直近: ' + S().log.slice(-9).map(o => typeof o === 'string' ? o : ctx.t(o.k, o.p)).join(' | '));
  console.log(L.join('\n'));
}

/* ---------- 1試合 ---------- */
async function playOne(diff, maxTurns, stage) {
  g('newGame')(diff, stage);
  checkInvariants('start');
  const st = stage || 'skirmish';
  const want = g('SPAWN').p.length + g('SPAWN').e.length;
  if (S().units.length !== want) throw new Error(st + ': 初期兵数が配置表と違う ' + S().units.length + '<>' + want);
  if (S().stage !== st) throw new Error('ステージが切り替わっていない: ' + S().stage);
  if (g('unitsOf')(P).length > g('UNIT_CAP')) throw new Error(st + ': 初期兵数が兵数上限超え');
  // 村の配置が上下対称か
  for (let y = 0; y < 4; y++) for (let x = 0; x < 9; x++) {
    if (S().tiles[y][x].t !== S().tiles[8 - y][x].t) throw new Error(st + ': 地形が上下対称でない');
  }
  while (!S().over && S().turn <= maxTurns) {
    // 自軍ターン
    summonFor(P);
    for (const u of g('unitsOf')(P).slice()) {
      if (S().over) break;
      if (S().units.indexOf(u) < 0) continue;
      actUnit(u);
      checkInvariants('P act');
    }
    if (S().over) break;
    // 敵ターン
    S().sel = null; S().summon = null; S().phase = E;
    g('applyIncome')(E);
    await g('aiTurn')();
    await waitIdle();
    checkInvariants('after AI');
    if (process.env.DIAG) samplePositions();
  }
  const snap = () => ({
    hpP: S().baseHp.p, hpE: S().baseHp.e,
    uP: g('unitsOf')(P).length, uE: g('unitsOf')(E).length,
    vP: g('countVillages')(P), vE: g('countVillages')(E)
  });
  if (!S().over) return Object.assign({ over: false, diff, stage: st, turns: S().turn }, snap());
  return Object.assign({ over: true, winner: S().over.winner, turns: S().turn,
    reason: ctx.t(S().over.k, S().over.p), diff, stage: st }, snap());
}

/* ---------- 損耗計算の妥当性 ---------- */
function checkDamageModel() {
  const T = g('TYPES'), dmgOf = g('dmgOf');
  // 長期化による消耗加速（膠着防止）が単調で上限付きか
  const t0 = S().turn;
  if (g('rampMul')() !== 1) throw new Error('序盤の rampMul が1ではない');
  S().turn = 25;
  if (Math.abs(g('rampMul')() - 1) > 1e-9) throw new Error('25ターン目の rampMul が1ではない');
  S().turn = 40; const ra = g('rampMul')();
  S().turn = 60; const rb = g('rampMul')();
  S().turn = 999; const rc = g('rampMul')();
  S().turn = t0;
  if (!(ra > 1 && rb > ra && Math.abs(rc - g('RAMP_MAX')) < 1e-9)) {
    throw new Error('rampMul の増加が不正: ' + ra + ' -> ' + rb + ' -> ' + rc);
  }
  const mk = (type, side, x, y) => ({ side, type, hp: T[type].hp, x, y });
  // 平野で同種同士 → 固定値のはず（counter なし, ratio=1）
  for (const a of ['ho', 'yu', 'ki', 'ya']) {
    for (const d of ['ho', 'yu', 'ki', 'ya']) {
      const attacker = mk(a, P, 4, 4);
      const tile = S().tiles[4][5];
      const saved = tile.t;
      tile.t = 'plain';
      const plain = dmgOf(attacker, { kind: 'unit', u: mk(d, E, 5, 4) }, false);
      tile.t = saved;
      if (!Number.isFinite(plain) || plain < 1) throw new Error('ダメージが不正: ' + a + '→' + d + ' = ' + plain);
      if (plain > 30) throw new Error('ダメージ過大: ' + a + '→' + d + ' = ' + plain);
    }
  }
  const baseDmg = dmgOf(mk('ki', P, 4, 4), { kind: 'base', side: E }, false);
  if (!(baseDmg >= 5 && baseDmg <= 9)) throw new Error('本営ダメージが想定外: ' + baseDmg);
  const counter = dmgOf(mk('ho', P, 4, 4), { kind: 'unit', u: mk('ho', E, 5, 4) }, true);
  const normal = dmgOf(mk('ho', P, 4, 4), { kind: 'unit', u: mk('ho', E, 5, 4) }, false);
  if (!(counter <= normal)) throw new Error('反撃が通常攻撃より強い');
  const weak = dmgOf(mk('ho', P, 4, 4), { kind: 'unit', u: mk('ho', E, 5, 4) }, false);
  const hurt = Object.assign(mk('ho', P, 4, 4), { hp: 2 });
  if (!(dmgOf(hurt, { kind: 'unit', u: mk('ho', E, 5, 4) }, false) < weak)) {
    throw new Error('消耗した兵のダメージが減らない');
  }
}

/* ---------- 射程・移動 range の健全性 ---------- */
function checkReach() {
  g('newGame')('normal');
  for (const u of g('unitsOf')(P)) {
    const r = g('reachable')(u);
    let n = 0;
    for (const key in r) {
      const k = +key, x = k % 9, y = Math.floor(k / 9);
      if (x === u.x && y === u.y) continue; // 開始マスは本人が占有しているので passable しない
      if (r[key] > g('TYPES')[u.type].move) throw new Error('移動コストが移動力超過');
      if (!g('passable')(u, x, y)) throw new Error('到達マスが通行不可');
      n++;
    }
    if (n === 0) throw new Error('移動可能なマスが0つ: ' + u.type + ' @' + u.x + ',' + u.y);
  }
  // 射程: 弓兵は距離2まで、隣接距離3は届かない
  const st = S();
  const yu = { side: P, type: 'yu', hp: 16, x: 4, y: 4, moved: false, acted: false };
  const near = { side: E, type: 'ho', hp: 20, x: 4, y: 2, moved: false, acted: false };
  const far = { side: E, type: 'ho', hp: 20, x: 4, y: 1, moved: false, acted: false };
  st.units.push(yu, near, far);
  const t = g('targetsFrom')(yu, 4, 4);
  if (!t.some(tg => tg.kind === 'unit' && tg.u === near)) throw new Error('射程2の敵が射程内に入らない');
  if (t.some(tg => tg.kind === 'unit' && tg.u === far)) throw new Error('射程3の敵が射程内になってしまう');
  const ho = { side: P, type: 'ho', hp: 20, x: 4, y: 4, moved: false, acted: false };
  st.units.push(ho);
  const t2 = g('targetsFrom')(ho, 4, 4);
  if (t2.some(tg => tg.kind === 'unit' && tg.u === near)) throw new Error('歩兵が距離2の敵に届いてしまう');
  st.units = st.units.filter(u => u !== yu && u !== near && u !== far && u !== ho);
}

/* ---------- ステージ定義の健全性 ---------- */
function checkStages() {
  const stages = g('STAGES');
  for (const st of stages) {
    g('newGame')('normal', st.key);
    const tiles = S().tiles, bp = g('BASE_POS');
    for (const s of [P, E]) {
      const b = bp[s];
      if (!b) throw new Error(st.key + ': 本営座標が無い');
      if (tiles[b.y][b.x].t !== 'base' || tiles[b.y][b.x].owner !== s) {
        throw new Error(st.key + ': 本営マスが不正 ' + s + ' ' + b.x + ',' + b.y);
      }
    }
    // 上下対称
    for (let y = 0; y < 4; y++) for (let x = 0; x < 9; x++) {
      if (tiles[y][x].t !== tiles[8 - y][x].t) throw new Error(st.key + ': 地形が上下対称でない');
    }
    // 初期配置マス
    const sp = g('SPAWN');
    if (!sp.p.length || sp.p.length !== sp.e.length) throw new Error(st.key + ': 初期配置が不対称');
    for (const s of [P, E]) {
      for (const q of sp[s]) {
        const tile = tiles[q.y][q.x], T = g('TYPES')[q.t];
        if (!T) throw new Error(st.key + ': 初期配置の兵科が不明 ' + q.t);
        if (tile.t === 'water') throw new Error(st.key + ': 初期配置が河の上');
        if (tile.t === 'base') throw new Error(st.key + ': 初期配置が本営マス');
        if (tile.t === 'mountain' && T.noMountain) throw new Error(st.key + ': 騎兵の初期配置が山');
        if (q.y < 4 && s === E && tiles[8 - q.y][q.x].t === 'water') throw new Error(st.key + ': 初期配置が鏡像側で河');
      }
      if (sp[s].length > g('UNIT_CAP')) throw new Error(st.key + ': 初期兵数が上限超え');
    }
    // 本営同士が陸続きか（歩兵の移動規則で洪水充填）
    const seen = new Set([bp.e.x + ',' + bp.e.y]);
    const q2 = [[bp.e.x, bp.e.y]];
    let hitBaseP = false;
    while (q2.length) {
      const [x, y] = q2.pop();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, k = nx + ',' + ny;
        if (nx < 0 || ny < 0 || nx > 8 || ny > 8 || seen.has(k)) continue;
        const tt = tiles[ny][nx].t;
        if (tt === 'water') continue;
        seen.add(k);
        if (nx === bp.p.x && ny === bp.p.y) hitBaseP = true;
        if (tt !== 'base') q2.push([nx, ny]);
      }
    }
    if (!hitBaseP) throw new Error(st.key + ': 本営同士が陸続きでない（行ける兵が居なくなる）');
    // 徴兵場所が最低1つあること
    if (!g('legalSummon')(P, 'ho').length || !g('legalSummon')(E, 'ho').length) {
      throw new Error(st.key + ': 徴兵可能なマスが無い');
    }
  }
}

/* ---------- セーブ／読み出しの往復 ---------- */
function checkSaveLoad() {
  g('newGame')('hard', 'bridge');
  for (let i = 0; i < 3; i++) g('applyIncome')(P, false);
  const u0 = g('unitsOf')(P)[0];
  if (g('passable')(u0, u0.x, u0.y - 1)) g('moveTo')(u0, u0.x, u0.y - 1);
  g('saveGame')(true);
  const raw = storage.getItem('tactics9.game.v1');
  if (!raw) throw new Error('saveGame がlocalStorageに書いていない');
  const snap = { turn: S().turn, stage: S().stage, coins: JSON.stringify(S().coins),
    hp: JSON.stringify(S().baseHp), n: S().units.length, ids: S().units.map(u => u.id).join(',') };
  const d = g('loadSave')();
  if (!d) throw new Error('loadSave が読めない');
  g('newGame')('easy', 'skirmish');                  // 一旦别の盘面に溃す
  if (!g('resumeSave')(d)) throw new Error('resumeSave 失败');
  const now = { turn: S().turn, stage: S().stage, coins: JSON.stringify(S().coins),
    hp: JSON.stringify(S().baseHp), n: S().units.length, ids: S().units.map(u => u.id).join(',') };
  if (JSON.stringify(snap) !== JSON.stringify(now)) {
    throw new Error('セーブ往復で状態が一致しない ' + JSON.stringify(snap) + ' -> ' + JSON.stringify(now));
  }
  if (g('BASE_HP') !== 48) throw new Error('bridge の本営HPが不正: ' + g('BASE_HP'));
  for (const u of S().units) if (u.moved || u.acted) throw new Error('読み出し後に兵が行動済みになっている');
  checkInvariants('after resume');
  // 決着 then: save は消え、profile に記録が残る
  S().baseHp.e = 0;
  g('checkEnd')();
  if (storage.getItem('tactics9.game.v1') !== null) throw new Error('決着後もセーブが残っている');
  const prof = JSON.parse(storage.getItem('tactics9.profile.v1'));
  if (!prof.cleared.bridge) throw new Error('profile にステージクリアが記録されていない');
  if (!prof.best.bridge) throw new Error('profile に最短ターンが記録されていない');  if (g('stageUnlocked')(2) !== true) throw new Error('bridge クリア後の次ステージが解禁されていない');
  if (g('stageUnlocked')(4) !== false) throw new Error('勝っていないステージが解禁されている');
}

/* ---------- 多言語の網羅 ---------- */
function checkI18n() {
  const langs = ['ja', 'en', 'zh'];
  const keys = Object.keys(g('I18N').ja);
  for (const L of langs) {
    if (!g('I18N')[L]) throw new Error('言語テーブルが無い: ' + L);
    for (const k of keys) {
      if (g('I18N')[L][k] === undefined) throw new Error(L + ' にキーが無い: ' + k);
    }
  }
  for (const L of langs) {
    ctx.LANG = L;
    for (const k of keys) {
      if (k === 'help_html') continue;      // 兵科表は helpHtml() で展開して別検証
      const s = ctx.t(k, { n: 3, inc: 5, coins: 12, side: P, a: P, au: 'ho', d: E, du: 'ki', dmg: 7, s: E, u: 'yu', foe: P, left: 21, reason: 'x', l: E, w: P, stage: 'bridge', turn: 9, cost: 4 });
      if (/\{|\}|undefined|NaN/.test(s)) throw new Error(L + '/' + k + ' が未展開: ' + s.slice(0, 80));
    }
    // 兵側・兵科コードが表示時に解決されていること
    const hit = ctx.t('log_hit', { a: P, au: 'ho', d: E, du: 'ki', dmg: 9 });
    if (/(^|[^A-Za-z])(ho|ki)([^A-Za-z]|$)/.test(hit)) throw new Error(L + ': 兵科コードが残っている ' + hit);
    if (!ctx.uname('ho') || !ctx.uglyph('ho') || !ctx.tglyph('forest')) throw new Error(L + ': 名称が空');
    if (/<table/.test(ctx.t('help_html'))) throw new Error(L + ': help_html に {units} が残った');
    const help = ctx.helpHtml();
    if (!/<table/.test(help) || /undefined/.test(help)) throw new Error(L + ': ヘルプの兵科表が作れない');
  }
  ctx.LANG = 'ja';
  // 言語切替でログ表示が置き換わるか（保存済みのログも追随する）
  ctx.newGame('normal', 'bridge');
  ctx.logLine('log_start');
  ctx.logLine('log_income', { side: P, inc: 7, coins: 15 });
  ctx.render();
  const jaHtml = getEl('log').innerHTML;
  if (!/戦闘開始/.test(jaHtml)) throw new Error('ja のログが表示されない: ' + jaHtml.slice(0, 80));
  ctx.setLang('en');
  const enHtml = getEl('log').innerHTML;
  if (jaHtml === enHtml || /戦闘開始|収入/.test(enHtml)) throw new Error('言語切替でログが書き換わらない: ' + enHtml.slice(0, 80));
  if (!/Battle begins/.test(enHtml)) throw new Error('en のログが不正: ' + enHtml.slice(0, 80));
  ctx.setLang('zh');
  if (!/战斗开始/.test(getEl('log').innerHTML)) throw new Error('zh のログが不正: ' + getEl('log').innerHTML.slice(0, 80));
  const pf = JSON.parse(storage.getItem('tactics9.profile.v1') || '{}');
  if (pf.lang !== 'zh') throw new Error('言語設定が profile に保存されていない');
  ctx.setLang('ja');
  if (JSON.parse(storage.getItem('tactics9.profile.v1')).lang !== 'ja') throw new Error('言語設定の更新が反映されない');
}

/* ---------- マークアップと言語テーブルの突合（DOMスタブでは誤字が消えない） ---------- */
function checkMarkup() {
  const ids = new Set();
  let mm;
  const rid = /id="([\w-]+)"/g;
  while ((mm = rid.exec(html))) ids.add(mm[1]);
  const rid2 = /id='([\w-]+)'/g;
  while ((mm = rid2.exec(html))) ids.add(mm[1]);
  const used = new Set();
  const rgid = /getElementById\('([\w-]+)'\)/g;
  while ((mm = rgid.exec(code))) used.add(mm[1]);
  for (const id of used) if (!ids.has(id)) throw new Error('HTMLに無いIDを参照している: #' + id);
  const langs = ['ja', 'en', 'zh'];
  const hasKey = (L, k) => Object.prototype.hasOwnProperty.call(ctx.I18N[L], k);
  const rlist = code.match(/var I18N_IDS=\[([\s\S]*?)\];/);
  if (!rlist) throw new Error('I18N_IDS が見つからない');
  const rp = /\['([\w-]+)','(\w+)'\]/g;
  let nPair = 0;
  while ((mm = rp.exec(rlist[1]))) {
    nPair++;
    if (!ids.has(mm[1])) throw new Error('I18N_IDS に無いID: #' + mm[1]);
    for (const L of langs) if (!hasKey(L, mm[2])) throw new Error('I18N_IDS のキーが言語テーブルに無い: ' + mm[2] + ' (' + L + ')');
  }
  if (nPair < 8) throw new Error('I18N_IDS の要素が少なすぎる: ' + nPair);
  const rattr = /data-i18n="([\w]+)"/g;
  let nAttr = 0;
  while ((mm = rattr.exec(html))) {
    nAttr++;
    for (const L of langs) if (!hasKey(L, mm[1])) throw new Error('data-i18n キーが言語テーブルに無い: ' + mm[1] + ' (' + L + ')');
  }
  if (nAttr < 6) throw new Error('data-i18n が少なすぎる: ' + nAttr);
  const rt = /\bt\('(\w*_?)'/g;
  let nT = 0;
  while ((mm = rt.exec(code))) {
    nT++;
    const k = mm[1];
    for (const L of langs) {
      if (hasKey(L, k)) continue;
      if (k.endsWith('_') &&
          Object.keys(ctx.I18N[L]).some(x => x.indexOf(k) === 0)) continue;   // 動的キー（u_*, tg_* など）
      throw new Error("t('" + k + "') が言語テーブルに無い (" + L + ')');
    }
  }
  if (nT < 30) throw new Error('t() 呼び出しが少なすぎる: ' + nT);
  // 静的マークアップに直書きされた英語IDの取りこぼし（HUD見出しなど）は言語キー網羅で吸収する
  console.log('  markup: ids=' + ids.size + ' used=' + used.size + ' data-i18n=' + nAttr + ' t()=' + nT);
}

/* ---------- 画面レイアウト（盤面がはみ出すときはスクロールで回避） ---------- */
function checkLayout() {
  const must = (c, m) => { if (!c) throw new Error(m); };
  const wrap = els.get('wrap');
  if (!wrap) throw new Error('#wrap が無い');
  const body = sandbox.document.body;
  const hint = els.get('scrollHint');
  const at = (x, y) => ctx.UI.cells[y * 9 + x];
  const cellPx = () => parseInt(ctx.document.documentElement.style.getPropertyValue('--cell'), 10);

  //十分な空間がある端末：中央配置でスクロールは不要
  wrap.clientWidth = 900; wrap.clientHeight = 900;
  g('fit')();
  must(cellPx() === g('MAX_CELL'), '広い画面でセルが最大サイズにならない: ' + cellPx());
  must(wrap.classList.contains('fit'), '広い画面で中央配置（fit）になっていない');
  must(!body.classList.contains('scrolling'), '広い画面なのにスクロール扱いになっている');

  //縦に足りないスマホ：最小サイズを確保し、重ならないようスクロールさせる
  wrap.clientWidth = 360; wrap.clientHeight = 300;
  g('fit')();
  must(cellPx() >= g('MIN_CELL'), 'セルが最小サイズより小さい: ' + cellPx());
  must(!wrap.classList.contains('fit'), '盤面がはみ出すのに fit のまま（＝上下UIと重なる）');
  must(body.classList.contains('scrolling'), '盤面がはみ出すのにスクロール案内が出ていない');

  //横持ち（極端に低い画面）でも最小セルは守る
  wrap.clientWidth = 700; wrap.clientHeight = 150;
  g('fit')();
  must(cellPx() === g('MIN_CELL'), '低い画面でセルが縮みすぎている: ' + cellPx());
  must(body.classList.contains('scrolling'), '低い画面でスクロール案内が出ない');

  //寸法が読めない環境でも落ちない
  wrap.clientWidth = 0; wrap.clientHeight = 0;
  g('fit')();
  must(cellPx() >= g('MIN_CELL'), '寸法不明時にセルサイズが不正: ' + cellPx());

  //盤面がはみ出すとき、選択中の兵はスクロールで視界に入れる
  wrap.clientWidth = 360; wrap.clientHeight = 300;
  g('fit')();
  const mine = g('unitsOf')(P);
  if (!mine.length) throw new Error('自軍の兵が無い（レイアウト確認用）');
  const u0 = mine[0], e0 = at(u0.x, u0.y), b0 = e0._scrolled;
  S().sel = u0.id;
  g('render')();
  must(e0._scrolled > b0, '盤面がはみ出す状態で選択中の兵をスクロールしていない');
  S().sel = null;

  //収まるサイズではスクロール操作をしない
  wrap.clientWidth = 900; wrap.clientHeight = 900;
  g('fit')();
  const b1 = e0._scrolled;
  S().sel = u0.id;
  g('render')();
  S().sel = null;
  must(e0._scrolled === b1, '盤面が収まっているのにスクロールしている');

  //スクロール案内の文言も多言語
  if (!hint) throw new Error('#scrollHint が無い');
  must(hint.textContent === ctx.t('scroll_hint'), 'スクロール案内がローカライズされていない: ' + hint.textContent);
}

/* ---------- サウンド（合成効果音と ON/OFF 保存） ---------- */
function makeAudioStub() {
  const rec = { osc: 0, gain: 0, src: 0 };
  const param = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {} });
  const node = (o) => Object.assign({ connect() {}, start() {}, stop() {} }, o);
  function Ctor() {
    this.currentTime = 0; this.sampleRate = 8000; this.state = 'suspended';
    this.destination = node({});
    this.resume = () => { this.state = 'running'; return Promise.resolve(); };
    this.createOscillator = () => { rec.osc++; return node({ type: '', frequency: param() }); };
    this.createGain = () => { rec.gain++; return node({ gain: param() }); };
    this.createBiquadFilter = () => node({ type: '', frequency: param() });
    this.createBufferSource = () => { rec.src++; return node({ buffer: null }); };
    this.createBuffer = (ch, n) => ({ length: n, getChannelData: () => new Float32Array(n) });
  }
  return { Ctor, rec };
}
function checkSound() {
  const must = (c, m) => { if (!c) throw new Error(m); };
  const btn = els.get('soundBtn');
  if (!btn) throw new Error('#soundBtn が無い');
  const prof = () => JSON.parse(storage.getItem('tactics9.profile.v1') || '{}');
  const CUES = ['ui', 'sel', 'unsel', 'move', 'summon', 'atk', 'hit', 'counter', 'kill', 'base', 'turn', 'turnE', 'err', 'win', 'lose'];

  //音源の無い環境では何もしない（例外を出さない）
  const savedProf = JSON.stringify(ctx.PROF);
  ctx.AC = null;
  must(ctx.SND.on === true, '初期状態が OFF になっている');
  must(g('audioCtx')() === null, 'AudioContext が無い環境で音源を生成しようとした');
  CUES.forEach(k => g('sfx')(k));
  must(/🔊/.test(btn.textContent), 'ON のときにラベルが 🔊 でない: ' + btn.textContent);
  must(btn.title === ctx.t('snd_on'), 'title が ON 文言でない: ' + btn.title);

  //音源のある環境を再現する
  const A = makeAudioStub();
  sandbox.window.AudioContext = A.Ctor;
  ctx.AC = null;
  g('unlockAudio')();
  must(ctx.AC && ctx.AC.state === 'running', '最初の操作で AudioContext が再開しない');
  const o0 = A.rec.osc;
  g('sfx')('win');
  must(A.rec.osc - o0 >= 4, '勝利音が4音以上にならない: ' + (A.rec.osc - o0));
  const s0 = A.rec.src;
  g('sfx')('hit');
  must(A.rec.src > s0, '打撃音のノイズが生成されない');
  g('sfx')('no-such-cue');                       // 未知のキューは無視される
  CUES.forEach(k => g('sfx')(k));                // 全キューが安全に鳴る

  //OFF：音は出ず、設定はローカルに保存される
  btn.click();
  must(ctx.SND.on === false, 'トグルで OFF にならない');
  must(/🔇/.test(btn.textContent), 'OFF のときにラベルが 🔇 でない: ' + btn.textContent);
  must(btn.title === ctx.t('snd_off'), 'title が OFF 文言でない: ' + btn.title);
  must(prof().sound === false, 'OFF がプロファイルに保存されていない');
  const o1 = A.rec.osc, s1 = A.rec.src;
  CUES.forEach(k => g('sfx')(k));
  must(A.rec.osc === o1 && A.rec.src === s1, 'OFF の状態で音が鳴っている');
  must(g('audioCtx')() === null, 'OFF の状態で音源を生成した');

  //ON に戻せる
  btn.click();
  must(ctx.SND.on === true && prof().sound === true, 'ON に戻せない');
  must(A.rec.osc > o1, 'ON 復活後に音が鳴らない');

  //再起動を再現：設定が復元される／旧プロファイル（sound 無し）は ON
  storage.setItem('tactics9.profile.v1', JSON.stringify(Object.assign({}, ctx.PROF, { v: 1, sound: false })));
  ctx.PROF.sound = true;
  ctx.loadProfile();
  must(ctx.PROF.sound === false, 'OFF 設定が再起動後に復元されない');
  storage.setItem('tactics9.profile.v1', JSON.stringify({ v: 1, cleared: {}, best: {} }));
  ctx.loadProfile();
  must(ctx.PROF.sound === true, 'sound の無い旧プロファイルが OFF になる');
  storage.setItem('tactics9.profile.v1', savedProf);
  ctx.loadProfile();
  ctx.setSound(true);
  must(ctx.SND.on === true && btn.textContent.indexOf('🔊') === 0, 'サウンドを元の状態に戻せない');
  delete sandbox.window.AudioContext;
  ctx.AC = null;
}

/* ---------- UI配線（実際にクリック・変更イベントを発生させる） ---------- */
async function checkUi() {
  const el = id => { const e = els.get(id); if (!e) throw new Error('UI要素が無い: ' + id); return e; };
  const fire = (id, type, ev) => {
    const e = el(id), hs = e.handlers[type];
    if (!hs || !hs.length) throw new Error(id + ' に ' + type + ' が配線されていない');
    hs.forEach(f => f.call(e, ev || { preventDefault() {} }));
  };
  const byId = id => S().units.filter(v => v.id === id)[0];
  const cell = (x, y) => ctx.UI.cells[y * 9 + x];
  if (ctx.UI.cells.length !== 81) throw new Error('盤面セルが ' + ctx.UI.cells.length + ' 個しかない');

  // 難易度セレクト → 再開始ボタン
  el('diffSel').value = 'normal';
  fire('newBtn', 'click');
  if (S().diff !== 'normal' || S().turn !== 1 || S().phase !== P) throw new Error('再開始ボタンで対局が始まらない');

  // 兵をタップ → 隣接マスへタップ（移動）
  const u0 = g('unitsOf')(P)[0], p0 = { x: u0.x, y: u0.y };
  cell(u0.x, u0.y).click();
  if (S().sel !== u0.id) throw new Error('兵をタップしても選択されない');
  const reach = g('reachable')(u0);
  let dest = null;
  for (const key in reach) {
    const k = +key, x = k % 9, y = (k - (k % 9)) / 9;
    if (x === u0.x && y === u0.y) continue;
    if (!dest || reach[key] < dest.c) dest = { x, y, c: reach[key] };
  }
  if (!dest) throw new Error('初期位置から動けるマスが無い');
  cell(dest.x, dest.y).click();
  if (u0.x !== dest.x || u0.y !== dest.y) throw new Error('タップで移動できない');
  if (!S().undo.length) throw new Error('移動が undo に残っていない');

  // 戻すボタン
  fire('undoBtn', 'click');
  const back = byId(u0.id);
  if (!back || back.x !== p0.x || back.y !== p0.y) throw new Error('戻すボタンで位置が戻らない');

  // 採用ボタン → 徴兵マスへタップ
  const rec = el('recruits')._qs.filter(b => !b.disabled)[0];
  if (!rec) throw new Error('採用ボタンが配線されていない（徴兵できない？）');
  const coins0 = S().coins.p, n0 = S().units.length;
  rec.click();
  if (S().summon !== rec.dataset.k) throw new Error('採用ボタンで徴兵モードにならない');
  const spot = g('legalSummon')(P, rec.dataset.k)[0];
  cell(spot.x, spot.y).click();
  if (S().units.length !== n0 + 1) throw new Error('徴兵マスをタップしても兵が増えない');
  if (S().coins.p !== coins0 - g('TYPES')[rec.dataset.k].cost) throw new Error('徴兵の資金計算が違う');
  if (S().summon) throw new Error('徴兵後に徴兵モードが解除されない');

  // オーバーレイ開閉
  fire('helpBtn', 'click');
  if (el('helpOv').classList.contains('hidden')) throw new Error('ルールが開かない');
  if (!/<table/.test(el('helpBody').innerHTML)) throw new Error('ルール本文の兵科表が空');
  fire('closeHelp', 'click');
  if (!el('helpOv').classList.contains('hidden')) throw new Error('ルールが閉じない');
  fire('stageBtn', 'click');
  if (el('stageOv').classList.contains('hidden')) throw new Error('ステージ一覧が開かない');
  if (el('stList')._qs.length !== g('STAGES').length) throw new Error('ステージカード数が違う: ' + el('stList')._qs.length);
  if (!el('saveNote').textContent) throw new Error('セーブ説明が空');
  const card = el('stList')._qs.filter(b => !b.disabled).slice(-1)[0];
  card.click();
  if (S().stage !== card.dataset.k) throw new Error('ステージカードで対局が切り替わらない: ' + card.dataset.k + ' -> ' + S().stage);
  if (!el('stageOv').classList.contains('hidden')) throw new Error('ステージ選択後も一覧が開いたまま');

  // 言語セレクト
  el('langSel').value = 'zh';
  fire('langSel', 'change');
  if (ctx.LANG !== 'zh') throw new Error('言語セレクトで言語が変わらない');
  if (el('endBtn').textContent !== ctx.I18N.zh.btn_end) throw new Error('ボタンラベルが追随しない: ' + el('endBtn').textContent);
  el('langSel').value = 'en';
  fire('langSel', 'change');
  if (el('endBtn').textContent !== ctx.I18N.en.btn_end) throw new Error('英語ラベルに切り替わらない');
  if (ctx.t('turn_n', { n: 4 }) !== 'Turn 4') throw new Error('en の数値展開が不正: ' + ctx.t('turn_n', { n: 4 }));
  el('langSel').value = 'ja';
  fire('langSel', 'change');
  if (el('endBtn').textContent !== 'ターン終了') throw new Error('日本語に戻らない');

  // ターン終了 → AI → 自軍手番へ戻る
  const t0 = S().turn;
  fire('endBtn', 'click');
  await waitIdle();
  if (S().phase !== P || S().turn !== t0 + 1) throw new Error('ターン終了で手番が戻らない: ' + S().turn);
  if (el('endBtn').disabled) throw new Error('自軍手番なのにターン終了ボタンが無効');
  checkInvariants('after UI turn');

  // ローカル保存と退避イベント
  ctx.saveGame();
  if (!el('saveTag').textContent) throw new Error('保存タグに何も出ない');
  const blob = JSON.parse(storage.getItem('tactics9.game.v1'));
  if (blob.turn !== S().turn || blob.stage !== S().stage) throw new Error('保存内容が現在の盤面と違う');
  const ph = sandbox.window._h.pagehide;
  if (!ph || !ph.length) throw new Error('pagehide が配線されていない');
  const turnWrote = S().turn + 1;
  S().turn = turnWrote;
  ph.forEach(f => f({}));
  if (JSON.parse(storage.getItem('tactics9.game.v1')).turn !== turnWrote) throw new Error('pagehide で保存されない');
  S().turn = turnWrote - 1;

  // セーブ消去ボタン
  fire('wipeBtn', 'click');
  if (storage.getItem('tactics9.game.v1') !== null) throw new Error('消去ボタンでセーブが消えない');
  if (JSON.parse(storage.getItem('tactics9.profile.v1')).cleared.bridge !== undefined) {
    throw new Error('消去ボタンでクリア記録が消えていない');
  }
}

/* ---------- main ---------- */
(async function main() {
  const games = Number(process.argv[2] || 12);
  checkDamageModel();
  console.log('OK  ダメージモデル');
  checkReach();
  console.log('OK  移動・射程');
  checkMarkup();
  console.log('OK  マークアップ突合');
  checkStages();
  console.log('OK  ステージ定義 ' + g('STAGES').length + ' 種（対称・初期配置・本営接続）');
  checkI18n();
  console.log('OK  多言語 ja/en/zh');
  checkSaveLoad();
  console.log('OK  セーブ往復・進行解禁');
  await checkUi();
  console.log('OK  UI配線（タップ・ボタン・言語・セーブ）');
  checkLayout();
  console.log('OK  画面レイアウト（はみ出しはスクロール・最小セルサイズ）');
  checkSound();
  console.log('OK  サウンド（合成音・ON/OFF保存）');

  // 各ステージで1試合ずつ（クラッシュ・不変条件崩れの有無）
  for (const st of g('STAGES')) {
    const r = await playOne('hard', 90, st.key);
    console.log('  stage ' + st.key + ': ' + (r.over ? (r.winner === P ? '自軍勝' : '敵軍勝') : '未決着') +
      ' ' + r.turns + 'ターン  cap=' + g('UNIT_CAP') + ' hp=' + g('BASE_HP') + '  ' + (r.reason || ''));
    if (!r.over) {
      dumpState('未決着 ' + st.key);
      throw new Error(st.key + ': 90ターン以内に決着しない');
    }
  }
  console.log('OK  全ステージで決着');

  let stats = { p: 0, e: 0, unfinished: 0 }, maxTurns = 0, errs = [];
  const tally = { p: { unit: 0, base: 0, dmg: 0 }, e: { unit: 0, base: 0, dmg: 0 } };
  if (process.env.DIAG) {
    const orig = ctx.doAttack;
    ctx.doAttack = function (u, target) {
      const hpBefore = target.kind === 'base' ? S().baseHp[target.side] : target.u.hp;
      const r = orig(u, target);
      const hpAfter = target.kind === 'base' ? S().baseHp[target.side] : (target.u ? target.u.hp : 0);
      const rec = tally[u.side];
      if (target.kind === 'base') rec.base++; else rec.unit++;
      rec.dmg += Math.max(0, hpBefore - hpAfter);
      return r;
    };
  }
  const byDiff = {};
  for (let i = 0; i < games; i++) {
    const diff = process.env.DIFFONLY || ['easy', 'normal', 'hard'][i % 3];
    byDiff[diff] = byDiff[diff] || { p: 0, e: 0, none: 0, turns: [], dmgP: 0, dmgE: 0 };
    try {
      const r = await playOne(diff, 80, 'skirmish');
      byDiff[diff].dmgP += g('BASE_HP') - r.hpP;   // 自軍が敵本営に与えたダメージ
      byDiff[diff].dmgE += g('BASE_HP') - r.hpE;
      if (!r.over) { stats.unfinished++; byDiff[diff].none++; console.log(`  #${i + 1} ${diff}: 80ターン以内に決着せず`); }
      else {
        stats[r.winner]++;
        byDiff[diff][r.winner === P ? 'p' : 'e']++;
        byDiff[diff].turns.push(r.turns);
        maxTurns = Math.max(maxTurns, r.turns);
        console.log(`  #${i + 1} ${diff}: ${r.winner === P ? '自軍勝' : '敵軍勝'} ${r.turns}ターン ${r.reason}`);
      }
    } catch (e) {
      errs.push(`#${i + 1} ${diff}: ${e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e}`);
    }
  }
  console.log('---');
  for (const d of ['easy', 'normal', 'hard']) {
    const b = byDiff[d];
    if (!b) continue;
    const n = b.turns.length || (b.dmgP ? 1 : 0) || 1;
    const avg = b.turns.length ? (b.turns.reduce((a, c) => a + c, 0) / b.turns.length).toFixed(1) : '-';
    console.log(`  ${d}: 自軍 ${b.p} / 敵軍 ${b.e} / 未決着 ${b.none}  平均 ${avg} ターン` +
      `  本営攻防計 ${Math.round(b.dmgP)} vs ${Math.round(b.dmgE)}`);
  }
  console.log('試合数', games, '自軍勝', stats.p, '敵軍勝', stats.e, '未決着', stats.unfinished, '最長', maxTurns, 'ターン');
  if (process.env.DIAG) {
    console.log('攻撃内訳 自軍:', JSON.stringify(tally.p), ' 敵軍:', JSON.stringify(tally.e));
    const n = POS.n || 1;
    console.log(`毎ターンの平均  兵数 自${(POS.nP / n).toFixed(1)}/敵${(POS.nE / n).toFixed(1)}` +
      `  敵領内に自軍 ${(POS.deepP / n).toFixed(2)}  自軍領内に敵軍 ${(POS.deepE / n).toFixed(2)}` +
      `  本営隣接 自軍 ${(POS.adjP / n).toFixed(2)} / 敵軍 ${(POS.adjE / n).toFixed(2)}`);
  }
  if (errs.length) { console.log('エラー:'); errs.forEach(e => console.log('  ' + e)); }
  if (errs.length) process.exit(1);
  if (stats.unfinished > Math.ceil(games * 0.15)) { console.log('警告: 未決着が多すぎる'); process.exit(2); }
  console.log('OK  全試合が例外なく完走');
})();
