// ── Movement figures: IK-rigged skeletal animation ─────────────────
// y-down coords in a 100×100 box, ground at y=90, lifter faces +x.
// Bones have fixed lengths; knees/elbows solve via 2-bone IK from
// ankle/hand targets, so joints track anatomically through the rep.
const GY = 90;
const BONE = { torso: 23, uarm: 11.5, farm: 10.5, thigh: 15.5, shin: 15, headR: 4.3, neck: 2.2 };
const rad = (a) => (a * Math.PI) / 180;
const dirv = (a) => [Math.cos(rad(a)), Math.sin(rad(a))];
const padd = (p, v, m) => [p[0] + v[0] * m, p[1] + v[1] * m];
const lp = (a, b, t) => a + (b - a) * t;
const lpp = (a, b, t) => [lp(a[0], b[0], t), lp(a[1], b[1], t)];
function ik(a, c, l1, l2, dir) {
  const dx = c[0] - a[0], dy = c[1] - a[1];
  let d = Math.hypot(dx, dy);
  d = Math.max(Math.abs(l1 - l2) + 0.05, Math.min(d, l1 + l2 - 0.05));
  const a1 = Math.acos((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d));
  const ang = Math.atan2(dy, dx) + dir * a1;
  return [a[0] + l1 * Math.cos(ang), a[1] + l1 * Math.sin(ang)];
}
function trunk(pelvis, ang, len = BONE.torso) {
  const shoulder = padd(pelvis, dirv(ang), len);
  const head = padd(shoulder, dirv(ang), BONE.neck + BONE.headR);
  return { shoulder, head, seg: [...pelvis, ...shoulder] };
}
function leg(pelvis, ankle, dir, foot = true) {
  const knee = ik(pelvis, ankle, BONE.thigh, BONE.shin, dir);
  const segs = [[...pelvis, ...knee], [...knee, ...ankle]];
  if (foot) segs.push([ankle[0], ankle[1], ankle[0] + 6.2, Math.min(ankle[1] + 2.2, GY)]);
  return segs;
}
function armIK(shoulder, hand, dir) {
  const el = ik(shoulder, hand, BONE.uarm, BONE.farm, dir);
  return [[...shoulder, ...el], [...el, ...hand]];
}
// scene: {props,floor,limbs,torso,head,equip}
const ARCHS = {
  squat(k) {
    const pelvis = lpp([47, 57.5], [40, 70.5], k);
    const t = trunk(pelvis, lp(-84, -62, k));
    const bar = padd(t.shoulder, [1.2, -1.9], 1);
    const elbow = padd(t.shoulder, [-4.2, 5.2], 1);
    return { floor: 1,
      limbs: [...leg(pelvis, [48.5, 87.3], -1), [...t.shoulder, ...elbow], [...elbow, ...bar]],
      torso: [t.seg], head: t.head,
      equip: [{ t: "disc", p: bar, r: 3.4 }] };
  },
  hinge(k) {
    const pelvis = lpp([37.5, 63], [46, 57.5], k);
    const t = trunk(pelvis, lp(-36, -86, k));
    const bar = lpp([54, 81.5], [50.5, 56.5], k);
    return { floor: 1,
      limbs: [...leg(pelvis, [47.5, 87.3], -1), ...armIK(t.shoulder, bar, 0.35)],
      torso: [t.seg], head: t.head,
      equip: [{ t: "plate", p: bar, r: 8 }] };
  },
  bench(k) {
    const pelvis = [51, 69.3];
    const t = trunk(pelvis, 181);
    const bar = [31, lp(44, 61.5, k)];
    return { props: [[16, 73, 78, 73], [24, 73, 24, 86], [70, 73, 70, 86]],
      limbs: [...leg(pelvis, [64, 87.3], -1), ...armIK(t.shoulder, bar, 1)],
      torso: [t.seg], head: t.head,
      equip: [{ t: "plate", p: bar, r: 5 }] };
  },
  incpress(k) {
    const pelvis = [50, 72];
    const t = trunk(pelvis, -118);
    const db = lpp([43.5, 29], [42.5, 47.5], k);
    return { floor: 1, props: [[33, 82, 51, 56]],
      limbs: [...leg(pelvis, [63, 87.3], -1), ...armIK(t.shoulder, db, 1)],
      torso: [t.seg], head: t.head,
      equip: [{ t: "db", p: db }] };
  },
  ohp(k) {
    const pelvis = [47, 58];
    const t = trunk(pelvis, -87);
    const bar = lpp([51.5, 32.5], [48.8, 10.8], k);
    return { floor: 1,
      limbs: [...leg(pelvis, [48.5, 87.3], -1), ...armIK(t.shoulder, bar, 1)],
      torso: [t.seg], head: t.head,
      equip: [{ t: "disc", p: bar, r: 3.2 }] };
  },
  row(k) {
    const pelvis = [39, 63];
    const t = trunk(pelvis, -38);
    const db = lpp([60, 72], [58, 53], k);
    return { floor: 1, props: [[33, 60, 60, 39], [46, 50, 46, 74]],
      limbs: [...leg(pelvis, [30, 87.3], -1), ...armIK(t.shoulder, db, -1)],
      torso: [t.seg], head: t.head,
      equip: [{ t: "db", p: db }] };
  },
  pulldown(k) {
    const pelvis = [45, 63];
    const t = trunk(pelvis, -80);
    const bar = lpp([54, 17.5], [51.5, 40.5], k);
    return { props: [[40, 66, 57, 66], [40, 66, 40, 87], [64, 4, 64, 26]],
      limbs: [...leg(pelvis, [58, 80], -1), ...armIK(t.shoulder, bar, -1)],
      torso: [t.seg], head: t.head,
      equip: [{ t: "cable", a: [64, 5], b: bar }, { t: "barline", p: bar }] };
  },
  curl(k) {
    const pelvis = [47, 58];
    const t = trunk(pelvis, -87);
    const elbow = padd(t.shoulder, [0.8, 11.3], 1);
    const hand = padd(elbow, dirv(lp(72, -58, k)), BONE.farm);
    return { floor: 1,
      limbs: [...leg(pelvis, [48.5, 87.3], -1), [...t.shoulder, ...elbow], [...elbow, ...hand]],
      torso: [t.seg], head: t.head,
      equip: [{ t: "db", p: hand }] };
  },
  pushdown(k) {
    const pelvis = [47, 58];
    const t = trunk(pelvis, -85);
    const elbow = padd(t.shoulder, [1.2, 11.2], 1);
    const hand = padd(elbow, dirv(lp(-46, 76, k)), BONE.farm);
    return { floor: 1, props: [[59, 4, 59, 14]],
      limbs: [...leg(pelvis, [48.5, 87.3], -1), [...t.shoulder, ...elbow], [...elbow, ...hand]],
      torso: [t.seg], head: t.head,
      equip: [{ t: "cable", a: [59, 5], b: hand }, { t: "db", p: hand }] };
  },
  ohtri(k) {
    const pelvis = [47, 58];
    const t = trunk(pelvis, -88);
    const elbow = padd(t.shoulder, dirv(-72), BONE.uarm);
    const hand = padd(elbow, dirv(lp(128, -80, k)), BONE.farm);
    return { floor: 1,
      limbs: [...leg(pelvis, [48.5, 87.3], -1), [...t.shoulder, ...elbow], [...elbow, ...hand]],
      torso: [t.seg], head: t.head,
      equip: [{ t: "db", p: hand }] };
  },
  lateral(k) {
    const pelvis = [47, 58];
    const t = trunk(pelvis, -88);
    const a = lp(93, 6, k);
    const elbow = padd(t.shoulder, dirv(a - 7), BONE.uarm);
    const hand = padd(elbow, dirv(a), BONE.farm - 0.5);
    return { floor: 1,
      limbs: [...leg(pelvis, [48.5, 87.3], -1), [...t.shoulder, ...elbow], [...elbow, ...hand]],
      torso: [t.seg], head: t.head,
      equip: [{ t: "db", p: hand }] };
  },
  rearfly(k) {
    const pelvis = [40, 60];
    const t = trunk(pelvis, -38);
    const a = lp(97, 38, k);
    const elbow = padd(t.shoulder, dirv(a - 8), BONE.uarm);
    const hand = padd(elbow, dirv(a), BONE.farm - 0.5);
    return { floor: 1,
      limbs: [...leg(pelvis, [35, 87.3], 1), [...t.shoulder, ...elbow], [...elbow, ...hand]],
      torso: [t.seg], head: t.head,
      equip: [{ t: "db", p: hand }] };
  },
  legpress(k) {
    const pelvis = [36, 67];
    const t = trunk(pelvis, -146);
    const ankle = lpp([53, 61], [64, 49], k);
    const u = [ankle[0] - pelvis[0], ankle[1] - pelvis[1]];
    const ul = Math.hypot(u[0], u[1]); u[0] /= ul; u[1] /= ul;
    const n = [-u[1], u[0]];
    const sledC = padd(ankle, u, 3);
    return { props: [[40, 71, 10, 51], [30, 76, 44, 72]],
      limbs: [...leg(pelvis, ankle, -1, false), [...t.shoulder, 26, 63], [26, 63, 32, 70]],
      torso: [t.seg], head: t.head,
      equip: [{ t: "seg", a: padd(sledC, n, 8.5), b: padd(sledC, n, -8.5) }, { t: "db", p: sledC }] };
  },
  legcurl(k) {
    const pelvis = [45, 61.5];
    const t = trunk(pelvis, 179);
    const knee = [58, 62.5];
    const ankle = padd(knee, dirv(lp(4, -104, k)), BONE.shin);
    const hand = [26, 71];
    return { props: [[16, 64, 64, 64], [22, 64, 22, 87], [58, 64, 58, 87]],
      limbs: [[...pelvis, ...knee], [...knee, ...ankle], ...armIK(t.shoulder, hand, -1)],
      torso: [t.seg], head: t.head,
      equip: [{ t: "db", p: ankle }] };
  },
  legext(k) {
    const pelvis = [43, 60];
    const t = trunk(pelvis, -95);
    const knee = [56.5, 61];
    const ankle = padd(knee, dirv(lp(80, 3, k)), BONE.shin);
    const hand = [50, 59];
    return { props: [[36, 63, 54, 63], [37, 42, 36, 63], [45, 63, 45, 87]],
      limbs: [[...pelvis, ...knee], [...knee, ...ankle], ...armIK(t.shoulder, hand, 1)],
      torso: [t.seg], head: t.head,
      equip: [{ t: "db", p: ankle }] };
  },
  calf(k) {
    const rise = 4.2 * k;
    const pelvis = [47, 58 - rise];
    const t = trunk(pelvis, -88);
    const ankle = [48, 86 - 3.4 * k];
    const hand = padd(t.shoulder, [1.5, 12], 1);
    return { floor: 1,
      limbs: [[...pelvis, ...ik(pelvis, ankle, BONE.thigh, BONE.shin, -1)], [...ik(pelvis, ankle, BONE.thigh, BONE.shin, -1), ...ankle], [ankle[0], ankle[1], 55.5, 89.3], [...t.shoulder, ...hand]],
      torso: [t.seg], head: t.head,
      equip: [{ t: "db", p: hand }] };
  },
  hlr(k) {
    const hands = [45.5, 8.6];
    const shoulder = [44.4, 28.5];
    const pelvis = lpp([45.2, 51.5], [43.8, 50], k);
    const head = [46.8, 21.5];
    const ankle = lpp([46.5, 79], [64, 46.5], k);
    return { props: [[33, 7, 58, 7]],
      limbs: [...leg(pelvis, ankle, -1, false), ...armIK(shoulder, hands, 0.3)],
      torso: [[...pelvis, ...shoulder]], head,
      equip: [] };
  },
  crunch(k) {
    const pelvis = [45, 73];
    const t = trunk(pelvis, lp(-76, -27, k), 19);
    const knee = [50, 86];
    const hand = padd(t.shoulder, [3.2, -0.5], 1);
    return { floor: 1, props: [[64, 4, 64, 16]],
      limbs: [[...pelvis, ...knee], [...knee, 60, 87.2], [...t.shoulder, ...hand]],
      torso: [t.seg], head: t.head,
      equip: [{ t: "cable", a: [64, 5], b: hand }] };
  },
  neckflex(k) {
    // supine on bench, head off the end, plate on forehead — chin curls up
    const head = [lp(20, 22.5, k), lp(71, 63.5, k)];
    const plate = [head[0] + 1.5, head[1] - 5];
    return { props: [[26, 72, 72, 72], [32, 72, 32, 86], [64, 72, 64, 86]],
      limbs: [[52, 69, 62, 78], [62, 78, 60, 90], [30, 69, lp(23, 25, k), lp(66, 59, k)]],
      torso: [[27, 69, 52, 69]], head,
      equip: [{ t: "db", p: plate }] };
  },
  neckext(k) {
    // prone on bench, face down, plate on back of head — head extends up
    const head = [lp(20, 18, k), lp(73, 64, k)];
    const plate = [head[0] + 1, head[1] - 4.5];
    return { props: [[26, 72, 72, 72], [32, 72, 32, 86], [64, 72, 64, 86]],
      limbs: [[52, 67, 63, 74], [63, 74, 62, 88], [30, 67, lp(23, 21, k), lp(70, 62, k)]],
      torso: [[27, 67, 52, 67]], head,
      equip: [{ t: "db", p: plate }] };
  },
  shrug(k) {
    const up = 3.2 * k; // pure scapular elevation: shoulders + head rise, arms stay long
    const pelvis = [47, 58];
    const shoulder = [48.2, 35.2 - up];
    const head = [48.8, 28.6 - up];
    const handL = [41.5, 57 - up], handR = [55, 57 - up];
    return { floor: 1,
      limbs: [...leg(pelvis, [48.5, 87.3], -1),
        [...shoulder, ...handL], [...shoulder, ...handR]],
      torso: [[...pelvis, ...shoulder]], head,
      equip: [{ t: "db", p: handL }, { t: "db", p: handR }] };
  },
  wrist(k) {
    const hand = padd([54, 58.5], dirv(lp(-52, 55, k)), 7);
    return { props: [[30, 63, 58, 63], [34, 63, 34, 87], [52, 63, 52, 87]],
      limbs: [[28, 49, 37, 58.5], [37, 58.5, 54, 58.5], [54, 58.5, ...hand]],
      torso: [], head: null,
      equip: [{ t: "db", p: hand, r: 3 }] };
  },
};
const CHALK = "#e9e7e1", FAR = "#525a68", STEEL = "#39404d", AMBER = "#ffb224";
function equipTrack(arch) {
  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const sc = ARCHS[arch](i / 24);
    const e = (sc.equip || []).find((x) => x.p);
    if (e) pts.push(e.p);
  }
  return pts.length > 12 ? pts : null;
}
function paintScene(cv, arch, k, opts = {}) {
  const A = ARCHS[arch]; if (!A) return;
  const sc = A(k);
  const ctx = cv.getContext("2d"); const s = cv.width / 100;
  ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  const seg = (x1, y1, x2, y2) => { ctx.beginPath(); ctx.moveTo(x1 * s, y1 * s); ctx.lineTo(x2 * s, y2 * s); ctx.stroke(); };
  if (!opts.mini) {
    if (sc.floor) { ctx.strokeStyle = STEEL; ctx.lineWidth = 1.5 * s; seg(12, GY, 88, GY); }
    ctx.strokeStyle = STEEL; ctx.lineWidth = 2 * s;
    (sc.props || []).forEach((p) => seg(...p));
  }
  (sc.equip || []).filter((e) => e.t === "plate").forEach((e) => {
    ctx.fillStyle = "#242932"; ctx.beginPath(); ctx.arc(e.p[0] * s, e.p[1] * s, e.r * s, 0, 7); ctx.fill();
    ctx.strokeStyle = "#4b5260"; ctx.lineWidth = 1.6 * s;
    ctx.beginPath(); ctx.arc(e.p[0] * s, e.p[1] * s, e.r * s, 0, 7); ctx.stroke();
  });
  if (opts.trail) {
    const tr = equipTrack(arch);
    if (tr) {
      ctx.strokeStyle = "rgba(255,178,36,.32)"; ctx.lineWidth = 1.3 * s;
      ctx.setLineDash([1.8 * s, 3 * s]);
      ctx.beginPath(); ctx.moveTo(tr[0][0] * s, tr[0][1] * s);
      tr.forEach((p) => ctx.lineTo(p[0] * s, p[1] * s));
      ctx.stroke(); ctx.setLineDash([]);
    }
  }
  ctx.strokeStyle = CHALK; ctx.lineWidth = (opts.mini ? 3.6 : 3.2) * s;
  sc.torso.forEach((p) => seg(...p));
  ctx.lineWidth = (opts.mini ? 3.4 : 2.9) * s;
  sc.limbs.forEach((p) => seg(...p));
  if (sc.head) { ctx.fillStyle = CHALK; ctx.beginPath(); ctx.arc(sc.head[0] * s, sc.head[1] * s, BONE.headR * s, 0, 7); ctx.fill(); }
  (sc.equip || []).forEach((e) => {
    if (e.t === "cable" && !opts.mini) { ctx.strokeStyle = "#8b919c"; ctx.lineWidth = 1 * s; seg(e.a[0], e.a[1], e.b[0], e.b[1]); }
    if (e.t === "seg") { ctx.strokeStyle = STEEL; ctx.lineWidth = 2.8 * s; seg(e.a[0], e.a[1], e.b[0], e.b[1]); }
    if (e.t === "plate") { ctx.fillStyle = AMBER; ctx.beginPath(); ctx.arc(e.p[0] * s, e.p[1] * s, 2.1 * s, 0, 7); ctx.fill(); }
    if (e.t === "disc") { ctx.fillStyle = AMBER; ctx.beginPath(); ctx.arc(e.p[0] * s, e.p[1] * s, (e.r || 3) * s, 0, 7); ctx.fill(); }
    if (e.t === "db") { ctx.fillStyle = AMBER; ctx.beginPath(); ctx.arc(e.p[0] * s, e.p[1] * s, (e.r || 2.7) * s, 0, 7); ctx.fill(); }
    if (e.t === "barline") { ctx.strokeStyle = AMBER; ctx.lineWidth = 2.2 * s; seg(e.p[0] - 5, e.p[1], e.p[0] + 5, e.p[1]); }
  });
}
// rep timing: down → hold → up → hold (a paused rep, like the program trains)
const ez = (t) => t * t * (3 - 2 * t);
function phase(u) {
  const T = [0.42, 0.14, 0.38, 0.06];
  if (u < T[0]) return ez(u / T[0]);
  u -= T[0]; if (u < T[1]) return 1;
  u -= T[1]; if (u < T[2]) return 1 - ez(u / T[2]);
  return 0;
}
if (typeof module !== "undefined") module.exports = { ARCHS, paintScene, phase, equipTrack };
