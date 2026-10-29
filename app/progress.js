/* Progress: the match log, XP, levels and titles, achievements, personal bests and the stats
   page. Owned by the caller/progress work. match.js calls at the end of a match:
     const res = D.progress.record(match)   match = { mode: "501", start, best, opponent: {id, name} | null,
                                             when, players: [{ idx (store player index, -1 = computer), name, cpu,
                                             won, legs, darts, scored, avg, n180, n140, hiCo, coHits, coDarts,
                                             qRight, qAll, pressRight, pressAll, perfect, hits: [[x, y, label], ...] }] }
       optional per player (unlock more; everything works without them):
         legDarts: [17, 24]          darts used in each leg this player WON (fewest darts, 9-darter, sub-15)
         checkouts: [[121, "D8"], …] each finish: the score and the last dart's label (Madhouse D1, Bull finish)
         robin, bounce, busts        counts in this match
       x, y in hits are board millimetres (D.board coordinates, centre 0,0), as the darts landed.
       opponent.id: "easy" | "medium" | "hard" | "expert" (or "cpu:medium"); friends come from players[].
     D.progress.render(el, res)             fills el (an element on the end screen) with XP gained,
                                             level-up, new achievements, personal bests
   Also used by app.js: D.progress.page(el, idx) (#stats), info(idx), h2h(a, b), badge(), ACH, TITLES.
   Saved under "dart.progress.v1" in localStorage; only human players (idx >= 0) are recorded. */
(function(D){
  const KEY = "dart.progress.v1", KEEP = 200, KEEP_HITS = 60, CAP_HITS = 120;
  const T = (en, nl) => D.T(en, nl);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const fx = () => D.fx || null;
  const calm = () => { const f = fx(); return f ? f.calm() : !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches); };
  const r1 = v => Math.round(v * 10) / 10;

  let S;
  function load(){
    try { S = JSON.parse(localStorage.getItem(KEY) || "null"); } catch(e){ S = null; }
    if(!S || typeof S !== "object" || !S.p) S = { v: 1, p: {} };
  }
  load();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch(e){} };
  const blankP = () => ({ xp: 0, ach: {}, best: {}, tot: { n: 0, w: 0, t180: 0, t140: 0, legs: 0, darts: 0, sc: 0, qr: 0, qa: 0, pr: 0, pa: 0, ch: 0, cd: 0, rb: 0, pf: 0 }, beat: {}, log: [] });
  const P = i => (S.p[i] = S.p[i] || blankP());
  const peek = i => S.p[i] || blankP();

  /* ---------- levels and titles ---------- */
  const TITLES = [
    ["Pub Thrower", "Kroeggooier"], ["Pub Regular", "Vaste klant"], ["League Night", "Competitieavond"], ["Club Player", "Clubspeler"],
    ["Team Captain", "Teamcaptain"], ["County B", "Regio B"], ["County A", "Regio A"], ["Challenge Tour", "Challenge Tour"],
    ["Q-School", "Q-School"], ["Tour Card", "Tourkaart"], ["Euro Tour", "Euro Tour"], ["Pro Tour", "Pro Tour"],
    ["TV Player", "Tv-speler"], ["Premier League", "Premier League"], ["Major Finalist", "Finalist major"], ["Major Winner", "Winnaar major"],
    ["World Top 16", "Wereldtop 16"], ["World Top 4", "Wereldtop 4"], ["World Champion", "Wereldkampioen"], ["Legend", "Legende"]
  ];
  const MAXLV = TITLES.length;
  /* total XP needed to reach level n */
  const need = n => n <= 1 ? 0 : Math.round(150 * Math.pow(n - 1, 1.8) / 10) * 10;
  function lvOf(xp){ let n = 1; while(n < MAXLV && xp >= need(n + 1)) n++; return n; }
  const title = n => { const t = TITLES[Math.max(1, Math.min(MAXLV, n)) - 1]; return T(t[0], t[1]); };
  const frac = xp => { const n = lvOf(xp); if(n >= MAXLV) return 1; return (xp - need(n)) / (need(n + 1) - need(n)); };
  function info(i){
    const p = peek(i), lv = lvOf(p.xp);
    return { xp: p.xp, lv, title: title(lv), frac: frac(p.xp), next: lv >= MAXLV ? null : need(lv + 1), from: need(lv), matches: p.tot.n };
  }

  /* ---------- computer levels and strength ---------- */
  const CPU_RANK = { easy: 1, medium: 2, hard: 3, expert: 4 };
  const cpuId = o => String((o && (o.id || o.level)) || "cpu").replace(/^cpu:/, "").toLowerCase();
  const cpuName = id => { const c = D.hand && D.hand.CPU && D.hand.CPU[id]; return c ? T(c.name[0], c.name[1]) : id === "cpu" ? T("Computer", "Computer") : id.charAt(0).toUpperCase() + id.slice(1); };
  function rankOf(id, avg){
    if(CPU_RANK[id]) return CPU_RANK[id];
    const a = +avg || 0; return a < 45 ? 1 : a < 70 ? 2 : a < 100 ? 3 : 4;
  }

  /* ---------- achievements ---------- */
  /* g: the badge glyph (short text, or an icon key), tier: b(ronze) s(ilver) g(old) l(egend) */
  const ACH = [
    { id: "debut", g: "dart", tier: "b", n: ["Oche Debut", "Debuut"], d: ["Play your first 501 Match", "Speel je eerste 501 Match"], t: (e, s) => s.tot.n >= 1 },
    { id: "firstwin", g: "trophy", tier: "b", n: ["First Win", "Eerste zege"], d: ["Win a match", "Win een match"], t: e => e.w },
    { id: "first180", g: "180", tier: "g", n: ["Maximum!", "Maximum!"], d: ["Throw your first 180", "Gooi je eerste 180"], t: e => e.n180 > 0 },
    { id: "hat180", g: "3×", tier: "l", n: ["Hat-trick", "Hattrick"], d: ["Three 180s in one match", "Drie keer 180 in één match"], t: e => e.n180 >= 3 },
    { id: "ton40", g: "140", tier: "s", n: ["Ton-forty Club", "Ton-forty Club"], d: ["Five visits of 140+ in one match", "Vijf beurten van 140+ in één match"], t: e => e.n140 + e.n180 >= 5 },
    { id: "tonco", g: "100+", tier: "g", n: ["Ton-plus Finish", "Ton-plus finish"], d: ["Check out 100 or more", "Gooi 100 of meer uit"], t: e => e.co >= 100 },
    { id: "bigfish", g: "fish", tier: "l", n: ["Big Fish", "Big Fish"], d: ["The 170 checkout", "De 170 uitgooien"], t: e => e.co === 170 },
    { id: "madhouse", g: "D1", tier: "s", n: ["Madhouse", "Madhouse"], d: ["Finish on double 1", "Uitgooien op dubbel 1"], t: e => (e.cos || []).some(c => /^D1$/i.test(c[1])) },
    { id: "bullfin", g: "bull", tier: "g", n: ["Bullseye Finish", "Bull-finish"], d: ["Check out on the bull", "Uitgooien op de bull"], t: e => (e.cos || []).some(c => /bull|^50$|^D25$/i.test(c[1])) },
    { id: "robin", g: "arrow", tier: "g", n: ["Robin Hood", "Robin Hood"], d: ["Land a dart in another dart", "Een pijl in een andere pijl"], t: e => e.rb > 0 },
    { id: "nine", g: "9", tier: "l", n: ["Perfection", "Perfectie"], d: ["A nine-darter (501 in nine darts)", "Een negendarter (501 in negen pijlen)"], t: e => e.st === 501 && (e.ld || []).some(x => x <= 9) },
    { id: "sub15", g: "15", tier: "s", n: ["Sub-15", "Onder de 15"], d: ["Win a 501 leg in 15 darts or fewer", "Een 501-leg in 15 pijlen of minder"], t: e => e.st === 501 && (e.ld || []).some(x => x <= 15) },
    { id: "avg60", g: "60", tier: "b", n: ["Sixty Club", "Sixty Club"], d: ["Average 60+ in a match", "Een gemiddelde van 60+ in een match"], t: e => e.d >= 9 && e.a >= 60 },
    { id: "avg80", g: "80", tier: "s", n: ["Tour Average", "Tourgemiddelde"], d: ["Average 80+ in a match", "Een gemiddelde van 80+ in een match"], t: e => e.d >= 9 && e.a >= 80 },
    { id: "avg100", g: "100", tier: "g", n: ["Ton Average", "Ton-gemiddelde"], d: ["Average 100+ in a match", "Een gemiddelde van 100+ in een match"], t: e => e.d >= 9 && e.a >= 100 },
    { id: "perfv", g: "star", tier: "b", n: ["Perfect Visit", "Perfecte beurt"], d: ["A perfect-question visit", "Een beurt met een perfecte vraag"], t: e => e.pf > 0 },
    { id: "brain", g: "q", tier: "s", n: ["Know-it-all", "Weetal"], d: ["Every question right in a match (5+)", "Alle vragen goed in een match (5+)"], t: e => e.q[1] >= 5 && e.q[0] === e.q[1] },
    { id: "ice", g: "ice", tier: "g", n: ["Ice in the Veins", "IJskoud"], d: ["Three or more pressure questions, all right", "Drie of meer drukvragen, allemaal goed"], t: e => e.pq[1] >= 3 && e.pq[0] === e.pq[1] },
    { id: "whitewash", g: "W", tier: "s", n: ["Whitewash", "Whitewash"], d: ["Win a best of 3+ without dropping a leg", "Win een best of 3+ zonder een leg te verliezen"], t: e => e.w && e.bo >= 3 && e.l[1] === 0 },
    { id: "beat_easy", g: "1", tier: "b", n: ["Warm-up Done", "Warming-up klaar"], d: ["Beat the Easy computer", "Versla de Makkelijke computer"], t: (e, s) => s.beat["cpu:easy"] },
    { id: "beat_medium", g: "2", tier: "b", n: ["Club Night", "Clubavond"], d: ["Beat the Medium computer", "Versla de Gemiddelde computer"], t: (e, s) => s.beat["cpu:medium"] },
    { id: "beat_hard", g: "3", tier: "s", n: ["Giant Killer", "Reuzendoder"], d: ["Beat the Hard computer", "Versla de Moeilijke computer"], t: (e, s) => s.beat["cpu:hard"] },
    { id: "beat_expert", g: "crown", tier: "l", n: ["Ally Pally Ready", "Klaar voor Ally Pally"], d: ["Beat the Expert computer", "Versla de Expert-computer"], t: (e, s) => s.beat["cpu:expert"] },
    { id: "bragging", g: "fist", tier: "b", n: ["Bragging Rights", "Opscheppen mag"], d: ["Beat a friend", "Versla een vriend"], t: (e, s) => Object.keys(s.beat).some(k => /^p\d/.test(k)) },
    { id: "pubking", g: "crown", tier: "s", n: ["King of the Pub", "Koning van de kroeg"], d: ["Beat both friends", "Versla allebei je vrienden"], t: (e, s, i) => (D.store.players || []).every((x, j) => j === i || s.beat["p" + j]) },
    { id: "m10", g: "10", tier: "b", n: ["Regular", "Vaste gast"], d: ["Play 10 matches", "Speel 10 matches"], t: (e, s) => s.tot.n >= 10 },
    { id: "m50", g: "50", tier: "s", n: ["Season Ticket", "Seizoenkaart"], d: ["Play 50 matches", "Speel 50 matches"], t: (e, s) => s.tot.n >= 50 },
    { id: "m100", g: "100", tier: "g", n: ["Centurion", "Centurion"], d: ["Play 100 matches", "Speel 100 matches"], t: (e, s) => s.tot.n >= 100 },
    { id: "tons", g: "flame", tier: "g", n: ["Ton Machine", "Tonmachine"], d: ["50 visits of 140+ in total", "In totaal 50 beurten van 140+"], t: (e, s) => s.tot.t140 + s.tot.t180 >= 50 },
    { id: "bust3", g: "bust", tier: "b", n: ["Bust Master", "Bustkoning"], d: ["Bust three times in one match", "Drie keer bust in één match"], t: e => e.bu >= 3 },
    { id: "tourcard", g: "card", tier: "s", n: ["Tour Card", "Tourkaart"], d: ["Reach level 10", "Haal level 10"], t: (e, s) => lvOf(s.xp) >= 10, late: true },
    { id: "legend", g: "star", tier: "l", n: ["Legend", "Legende"], d: ["Reach the top level", "Haal het hoogste level"], t: (e, s) => lvOf(s.xp) >= MAXLV, late: true }
  ];
  const ACH_XP = { b: 20, s: 40, g: 75, l: 120 };
  const byId = id => ACH.find(a => a.id === id);

  /* the badge: a shield in the tier colour with a glyph (text or a small drawn icon) */
  const ICON = {
    dart: '<path d="M-7 7 4-4M4-4l1.5-5 4 4-5 1.5M2.5-6.5l4 4"/>',
    trophy: '<path d="M-5-8h10v4a5 5 0 0 1-10 0zM0 1v4M-4 8h8M-5-6h-3v1a3 3 0 0 0 3 3M5-6h3v1a3 3 0 0 1-3 3"/>',
    fish: '<path d="M-9 0c3-5 9-6 13-3l4-3v12l-4-3c-4 3-10 2-13-3z"/><circle cx="-3" cy="-1" r=".9" fill="currentColor"/>',
    bull: '<circle r="8"/><circle r="4"/><circle r="1.2" fill="currentColor"/>',
    arrow: '<path d="M-8 8 7-7M2-7h5v5M-8 8l1-4M-8 8l4-1M-4 4l-2-2M-2 2l-2-2"/>',
    star: '<path d="M0-9l2.6 5.6 6 .7-4.5 4.1 1.2 6L0 4.4l-5.3 3 1.2-6-4.5-4.1 6-.7z"/>',
    q: '<path d="M-3.5-3.5a3.6 3.6 0 1 1 5 3.3c-1 .5-1.5 1.2-1.5 2.2v.6"/><circle cx="0" cy="6.3" r=".9" fill="currentColor"/>',
    ice: '<path d="M0-9v18M-7.8-4.5l15.6 9M-7.8 4.5l15.6-9M-2.5-7.5 0-5l2.5-2.5M-2.5 7.5 0 5l2.5 2.5"/>',
    crown: '<path d="M-8 6-9-5l5 4 4-7 4 7 5-4-1 11z"/>',
    fist: '<path d="M-6-2v-3a1.6 1.6 0 0 1 3.2 0v-1a1.6 1.6 0 0 1 3.2 0v1a1.6 1.6 0 0 1 3.2 0v1a1.6 1.6 0 0 1 3.2 0V3a6 6 0 0 1-6 6h-1a6 6 0 0 1-5.8-4.5z"/>',
    flame: '<path d="M0-9c1 4 6 5 6 10a6 6 0 0 1-12 0c0-3 2-4 2.5-6.5C-2.5-3-1-2 .3-2-.5-4.5-1-6.5 0-9z"/>',
    bust: '<path d="M-6-6 6 6M6-6-6 6"/><circle r="8.5"/>',
    card: '<rect x="-8" y="-6" width="16" height="12" rx="2"/><path d="M-5-1h6M-5 2.5h4"/>'
  };
  function badge(a, locked){
    const g = a.g, glyph = ICON[g] ? '<g class="ic" transform="translate(24 25)">' + ICON[g] + "</g>" :
      '<text x="24" y="25" class="tx' + (g.length > 3 ? " t4" : g.length > 2 ? " t3" : "") + '">' + esc(g) + "</text>";
    return '<svg class="pg-badge t-' + a.tier + (locked ? " lock" : "") + '" viewBox="0 0 48 48" aria-hidden="true">' +
      '<path class="sh" d="M24 2.5 42 9v14c0 11-8 19.5-18 22.5C14 42.5 6 34 6 23V9z"/><path class="in" d="M24 7.5 37.5 12.3v10.9c0 8.6-6 15.4-13.5 18-7.5-2.6-13.5-9.4-13.5-18V12.3z"/>' +
      (locked ? '<g class="ic" transform="translate(24 25)"><rect x="-5" y="-1" width="10" height="8" rx="1.6"/><path d="M-3-1v-3a3 3 0 0 1 6 0v3"/></g>' : glyph) + "</svg>";
  }

  /* ---------- the log ---------- */
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  function cosOf(pl){
    const c = pl.checkouts || pl.cos;
    if(!Array.isArray(c)) return [];
    return c.map(x => Array.isArray(x) ? [+x[0] || 0, String(x[1] || "")] : typeof x === "number" ? [x, ""] : x && typeof x === "object" ? [+(x.score || x.s) || 0, String(x.label || x.bed || x.double || x.dbl || "")] : null).filter(Boolean).slice(0, 15);
  }
  function hitsOf(pl){
    const h = Array.isArray(pl.hits) ? pl.hits.filter(x => Array.isArray(x) && isFinite(x[0]) && isFinite(x[1])) : [];
    /* keep it small: at most CAP_HITS darts, spread evenly over the match */
    const step = h.length > CAP_HITS ? h.length / CAP_HITS : 1, out = [];
    for(let k = 0; k < h.length && out.length < CAP_HITS; k += step){ const x = h[Math.floor(k)]; out.push([Math.round(x[0]), Math.round(x[1])]); }
    return out;
  }
  function entryOf(m, pl, opp, oppKey){
    const darts = +pl.darts || 0, scored = +pl.scored || 0;
    const avg = pl.avg != null && isFinite(pl.avg) ? +pl.avg : darts ? scored / darts * 3 : 0;
    let ld = Array.isArray(pl.legDarts) ? pl.legDarts.map(Number).filter(x => x > 0) : [];
    /* without legDarts: a one-leg match won is one leg */
    if(!ld.length && pl.won && (+pl.legs || 0) === 1 && (!opp || !(+opp.legs)) && darts) ld = [darts];
    return {
      id: m._id, t: +m.when || Date.now(), st: +m.start || 501, bo: +m.best || 1, o: oppKey, on: opp ? String(opp.name || "") : "",
      w: pl.won ? 1 : 0, l: [+pl.legs || 0, opp ? +opp.legs || 0 : 0], d: darts, sc: scored, a: r1(avg),
      n180: +pl.n180 || 0, n140: +pl.n140 || 0, co: +pl.hiCo || 0, ch: +pl.coHits || 0, cd: +pl.coDarts || 0,
      q: [+pl.qRight || 0, +pl.qAll || 0], pq: [+pl.pressRight || 0, +pl.pressAll || 0], pf: +pl.perfect || 0,
      ld: ld.slice(0, 11), cos: cosOf(pl), rb: +pl.robin || 0, bu: +pl.busts || 0, h: hitsOf(pl)
    };
  }

  /* XP for one match: [[key, xp], ...] */
  const WHY = {
    played: ["Match played", "Match gespeeld"], legs: ["Legs won", "Legs gewonnen"], win: ["Match won", "Match gewonnen"],
    upset: ["Beat a stronger opponent", "Sterkere tegenstander verslagen"], avg: ["Average", "Gemiddelde"], q: ["Questions right", "Vragen goed"],
    pq: ["Pressure questions", "Drukvragen"], pf: ["Perfect visits", "Perfecte beurten"], t140: ["140+ visits", "Beurten van 140+"],
    t180: ["180s", "180's"], co: ["Checkouts", "Uitgooien"], bigco: ["Ton-plus checkout", "Ton-plus finish"], ach: ["Achievements", "Prestaties"]
  };
  function xpFor(e, strong, rank){
    const x = [];
    const add = (k, v) => { v = Math.round(v); if(v > 0) x.push([k, v]); };
    add("played", 15);
    add("legs", e.l[0] * 20);
    if(e.w) add("win", rank ? 25 + 15 * rank : 60);
    if(e.w && strong) add("upset", 40);
    if(e.d >= 9) add("avg", e.a / 2);
    add("q", e.q[0] * 3);
    add("pq", e.pq[0] * 5);
    add("pf", e.pf * 5);
    add("t140", e.n140 * 10);
    add("t180", e.n180 * 25);
    add("co", e.ch * 10);
    if(e.co >= 100) add("bigco", e.co / 2);
    return x;
  }

  function record(m){
    if(!m || !Array.isArray(m.players)) return null;
    m._id = uid();
    const out = [];
    m.players.forEach(pl => {
      const i = +pl.idx;
      if(!(i >= 0) || pl.cpu) return;
      const opp = m.players.find(x => x !== pl) || null;
      const oppHuman = opp && +opp.idx >= 0 && !opp.cpu;
      const cid = oppHuman ? "" : cpuId(m.opponent);
      const oppKey = !opp ? "solo" : oppHuman ? "p" + opp.idx : "cpu:" + cid;
      const e = entryOf(m, pl, opp, oppKey);
      const p = P(i), before = p.xp, lvB = lvOf(before);
      /* stronger: a computer above your stage (level 1-5 = stage 1 …), or a friend on a higher level */
      const rank = oppHuman || !opp ? 0 : rankOf(cid, opp.avg);
      const stage = Math.min(4, 1 + Math.floor((lvB - 1) / 5));
      const strong = oppHuman ? lvOf(peek(opp.idx).xp) > lvB : rank > stage;
      const why = xpFor(e, strong, rank);

      /* personal bests (a "new" best only when there was one before) */
      const bests = [];
      const bump = (k, v, lower) => {
        if(v == null || !(v > 0)) return;
        const old = p.best[k];
        if(old == null || (lower ? v < old : v > old)){
          if(old != null) bests.push({ k, old, val: v });
          p.best[k] = v;
        }
      };
      if(e.d >= 9) bump("avg", e.a);
      bump("co", e.co);
      bump("m180", e.n180);
      if(e.st === 501 && e.ld.length) bump("leg", Math.min(...e.ld), true);

      /* totals */
      const t = p.tot;
      t.n++; t.w += e.w; t.t180 += e.n180; t.t140 += e.n140; t.legs += e.l[0]; t.darts += e.d; t.sc += e.sc;
      t.qr += e.q[0]; t.qa += e.q[1]; t.pr += e.pq[0]; t.pa += e.pq[1]; t.ch += e.ch; t.cd += e.cd; t.rb += e.rb; t.pf += e.pf;
      if(e.w && opp) p.beat[oppKey] = (p.beat[oppKey] || 0) + 1;

      /* achievements, then XP, then the level ones */
      const got = [];
      const check = late => ACH.forEach(a => {
        if(!!a.late !== late || p.ach[a.id]) return;
        let ok = false; try { ok = !!a.t(e, p, i); } catch(err){}
        if(ok){ p.ach[a.id] = e.t; got.push(a.id); }
      });
      check(false);
      let gain = why.reduce((s, x) => s + x[1], 0);
      const achXp = got.reduce((s, id) => s + ACH_XP[byId(id).tier], 0);
      p.xp = before + gain + achXp;
      const n0 = got.length; check(true);
      const lateXp = got.slice(n0).reduce((s, id) => s + ACH_XP[byId(id).tier], 0);
      p.xp += lateXp;
      if(achXp + lateXp) why.push(["ach", achXp + lateXp]);
      gain = p.xp - before;

      e.xp = gain; e.ach = got;
      p.log.push(e);
      if(p.log.length > KEEP) p.log.splice(0, p.log.length - KEEP);
      p.log.forEach((x, k) => { if(k < p.log.length - KEEP_HITS && x.h) delete x.h; });
      out.push({ idx: i, name: pl.name || D.store.players[i], xp: gain, xpBefore: before, xpAfter: p.xp, lvBefore: lvB, lvAfter: lvOf(p.xp), why, ach: got, bests, won: !!e.w });
    });
    save();
    return out.length ? { id: m._id, players: out } : null;
  }

  /* ---------- the end-screen block ---------- */
  const BEST_L = {
    avg: [T.bind(null, "Best average", "Beste gemiddelde"), v => v.toFixed(1)], co: [T.bind(null, "Highest checkout", "Hoogste finish"), v => v],
    m180: [T.bind(null, "Most 180s in a match", "Meeste 180's in een match"), v => v], leg: [T.bind(null, "Fewest darts in a leg", "Minste pijlen in een leg"), v => v]
  };
  const lvBadge = n => '<span class="pg-lv"><small>LV</small><b>' + n + "</b></span>";
  function render(el, res){
    if(!el) return;
    if(!res || !res.players || !res.players.length){ el.innerHTML = ""; return; }
    const still = calm();
    el.classList.add("pg-end");
    el.innerHTML = res.players.map((r, k) => {
      const f0 = frac(r.xpBefore);
      return '<section class="pg-card" data-k="' + k + '" style="--d:' + k + '">' +
        '<header>' + lvBadge(r.lvBefore) + '<div class="pg-who"><b>' + esc(r.name) + '</b><small class="pg-ttl">' + esc(title(r.lvBefore)) + '</small></div>' +
        '<span class="pg-gain">+<b>' + (still ? r.xp : 0) + "</b> XP</span></header>" +
        '<div class="pg-bar"><i style="width:' + (f0 * 100).toFixed(1) + '%"></i></div>' +
        '<div class="pg-barl"><span class="pg-xpn">' + r.xpBefore + " XP</span><span>" + (r.lvBefore >= MAXLV ? T("Top level", "Hoogste level") : T("Next: ", "Volgende: ") + need(r.lvBefore + 1) + " XP") + "</span></div>" +
        '<div class="pg-up" hidden></div>' +
        '<div class="pg-why">' + r.why.map(w => "<span>" + T(WHY[w[0]][0], WHY[w[0]][1]) + " <b>+" + w[1] + "</b></span>").join("") + "</div>" +
        (r.bests.length ? '<div class="pg-bests">' + r.bests.map(b => '<div class="pg-best"><span>' + T("New personal best", "Nieuw persoonlijk record") + " · " + BEST_L[b.k][0]() + "</span><b>" + BEST_L[b.k][1](b.old) + ' <i>›</i> <em>' + BEST_L[b.k][1](b.val) + "</em></b></div>").join("") + "</div>" : "") +
        (r.ach.length ? '<div class="pg-new"><p class="lbl">' + T("Unlocked", "Ontgrendeld") + '</p><div class="pg-achs">' + r.ach.map((id, j) => { const a = byId(id); return '<div class="pg-ach t-' + a.tier + '" style="--j:' + j + '">' + badge(a) + "<div><b>" + esc(T(a.n[0], a.n[1])) + "</b><span>" + esc(T(a.d[0], a.d[1])) + "</span></div></div>"; }).join("") + "</div></div>" : "") +
        "</section>";
    }).join("");
    res.players.forEach((r, k) => animate(el.querySelector('.pg-card[data-k="' + k + '"]'), r, still, k));
  }
  function animate(card, r, still, k){
    if(!card) return;
    const bar = card.querySelector(".pg-bar i"), lv = card.querySelector(".pg-lv b"), ttl = card.querySelector(".pg-ttl"), up = card.querySelector(".pg-up");
    const xpn = card.querySelector(".pg-xpn"), nxt = card.querySelector(".pg-barl span:last-child");
    const setLv = n => {
      lv.textContent = n; ttl.textContent = title(n);
      nxt.textContent = n >= MAXLV ? T("Top level", "Hoogste level") : T("Next: ", "Volgende: ") + need(n + 1) + " XP";
    };
    const showUp = n => { up.hidden = false; up.innerHTML = "<span>" + T("Level up", "Level omhoog") + "</span><b>" + n + " · " + esc(title(n)) + "</b>"; };
    const achs = card.querySelectorAll(".pg-ach");
    if(still){
      bar.style.width = (frac(r.xpAfter) * 100).toFixed(1) + "%"; setLv(r.lvAfter); xpn.textContent = r.xpAfter + " XP";
      if(r.lvAfter > r.lvBefore){ showUp(r.lvAfter); card.classList.add("lvup"); }
      achs.forEach(a => a.classList.add("in"));
      return;
    }
    const at = (f, ms) => setTimeout(() => { if(card.isConnected) f(); }, ms);
    const t0 = 450 + k * 650;
    const gain = card.querySelector(".pg-gain b"), F = fx();
    at(() => { if(F) F.count(gain, r.xp, { dur: 1100 }); else gain.textContent = r.xp; if(F) F.count(xpn, r.xpAfter, { from: r.xpBefore, dur: 1100 }); }, t0);
    /* the bar: fill to the top of each level crossed, flash, start again from empty */
    let t = t0, lvNow = r.lvBefore;
    const SEG = 700;
    while(lvNow < r.lvAfter){
      const n = lvNow + 1;
      at(() => { bar.style.transition = "width " + SEG + "ms cubic-bezier(.3,.7,.3,1)"; bar.style.width = "100%"; }, t);
      t += SEG;
      at(() => {
        setLv(n); showUp(n); card.classList.remove("lvup"); void card.offsetWidth; card.classList.add("lvup");
        if(F){ F.bump(card.querySelector(".pg-lv")); F.sparks(card.querySelector(".pg-lv")); F.buzz([20, 40, 60]); }
        if(D.sfx && D.sfx.good) D.sfx.good();
        bar.style.transition = "none"; bar.style.width = "0%"; void bar.offsetWidth;
      }, t);
      t += 520; lvNow = n;
    }
    at(() => {
      bar.style.transition = "width " + SEG + "ms cubic-bezier(.3,.7,.3,1)"; bar.style.width = (frac(r.xpAfter) * 100).toFixed(1) + "%";
      xpn.textContent = r.xpAfter + " XP";
    }, t);
    t += SEG + 120;
    achs.forEach((a, j) => at(() => {
      a.classList.add("in");
      if(F && j === 0 && (a.classList.contains("t-g") || a.classList.contains("t-l"))) F.sparks(a.querySelector(".pg-badge"));
      if(D.sfx && D.sfx.tick) D.sfx.tick();
    }, t + j * 260));
    if(r.bests.length && F) at(() => F.party(), t + achs.length * 260 + 100);
  }

  /* ---------- reading the log ---------- */
  const logOf = i => peek(i).log;
  function h2h(a, b){
    /* the matches between friends a and b, from a's log: { w, l, legs:[a, b], list (newest last) } */
    const list = logOf(a).filter(e => e.o === "p" + b);
    const w = list.filter(e => e.w).length;
    return { w, l: list.length - w, legs: list.reduce((s, e) => [s[0] + e.l[0], s[1] + e.l[1]], [0, 0]), list };
  }
  function vsCpu(i){
    const out = {};
    logOf(i).forEach(e => {
      if(!/^cpu:/.test(e.o)) return;
      const k = e.o.slice(4), o = out[k] = out[k] || { w: 0, l: 0 };
      if(e.w) o.w++; else o.l++;
    });
    return out;
  }
  function favDouble(i){
    const n = {};
    let all = 0;
    logOf(i).forEach(e => (e.h || []).forEach(h => {
      const d = D.board.hit(h[0], h[1]);
      if(d.m === 2 && d.n){ const k = d.n === 25 ? "Bull" : "D" + d.n; n[k] = (n[k] || 0) + 1; all++; }
    }));
    (logOf(i)).forEach(e => (e.cos || []).forEach(c => { if(c[1]) n[c[1]] = (n[c[1]] || 0) + 0.5; }));
    const top = Object.entries(n).sort((x, y) => y[1] - x[1])[0];
    return top ? { k: top[0], n: Math.round(top[1]) } : null;
  }
  function ago(t){
    const d = Math.floor((Date.now() - t) / 864e5);
    if(d <= 0) return T("today", "vandaag");
    if(d === 1) return T("yesterday", "gisteren");
    if(d < 14) return T(d + " days ago", d + " dagen geleden");
    return new Date(t).toLocaleDateString(D.store.lang === "nl" ? "nl-NL" : "en-GB", { day: "numeric", month: "short" });
  }

  /* ---------- the stats page (#stats-i) ---------- */
  function spark(vals){
    const W = 300, H = 76, pad = 6;
    if(vals.length < 2) return '<p class="note">' + T("Play two matches to see your form line.", "Speel twee matches voor je vormlijn.") + "</p>";
    const lo = Math.min(...vals), hi = Math.max(...vals), span = Math.max(1, hi - lo);
    const X = k => pad + k * (W - pad * 2) / (vals.length - 1), Y = v => pad + 8 + (1 - (v - lo) / span) * (H - pad * 2 - 14);
    const pts = vals.map((v, k) => X(k).toFixed(1) + "," + Y(v).toFixed(1));
    const mean = vals.reduce((s, v) => s + v, 0) / vals.length, last = vals[vals.length - 1];
    return '<svg class="pg-spark" viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none" role="img" aria-label="' + T("Average per match", "Gemiddelde per match") + '">' +
      '<line class="mean" x1="' + pad + '" x2="' + (W - pad) + '" y1="' + Y(mean).toFixed(1) + '" y2="' + Y(mean).toFixed(1) + '"/>' +
      '<polygon class="area" points="' + X(0).toFixed(1) + "," + H + " " + pts.join(" ") + " " + X(vals.length - 1).toFixed(1) + "," + H + '"/>' +
      '<polyline class="ln" points="' + pts.join(" ") + '"/>' +
      '<circle class="dot" cx="' + X(vals.length - 1).toFixed(1) + '" cy="' + Y(last).toFixed(1) + '" r="4"/></svg>' +
      '<div class="pg-spark-l"><span>' + T("low ", "laagste ") + "<b>" + lo.toFixed(1) + "</b></span><span>" + T("mean ", "gemiddeld ") + "<b>" + mean.toFixed(1) + "</b></span><span>" + T("high ", "hoogste ") + "<b>" + hi.toFixed(1) + "</b></span></div>";
  }
  function heat(i){
    const hs = [];
    logOf(i).forEach(e => (e.h || []).forEach(h => hs.push(h)));
    if(!hs.length) return { html: D.board.svg({ cls: "pg-heatb" }), n: 0, m: 0 };
    const m = logOf(i).filter(e => e.h && e.h.length).length;
    /* the glow: blurred soft circles that add up; the darts: small dots */
    const glow = hs.map(h => '<circle cx="' + h[0] + '" cy="' + h[1] + '" r="11"/>').join("");
    const dots = hs.map(h => '<circle cx="' + h[0] + '" cy="' + h[1] + '" r="2.2"/>').join("");
    const ov = '<defs><filter id="pghb" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="7"/></filter></defs>' +
      '<g class="pg-glow" filter="url(#pghb)">' + glow + '</g><g class="pg-dots">' + dots + "</g>";
    return { html: D.board.svg({ cls: "pg-heatb" }).replace('<g class="lit"></g>', '<g class="lit">' + ov + "</g>"), n: hs.length, m };
  }
  function page(el, idx){
    const players = D.store.players;
    let i = +idx; if(!(i >= 0 && i < players.length)) i = D.store.me;
    const p = peek(i), inf = info(i), t = p.tot, log = p.log;
    const pct = (a, b) => b ? Math.round(a / b * 100) + "%" : "–";
    const last = log.slice(-20).filter(e => e.d >= 9).map(e => e.a);
    const avgAll = t.darts ? t.sc / t.darts * 3 : 0;
    const fav = favDouble(i), hm = heat(i);
    const tile = (lbl, val, sub, cls) => '<div class="pg-tile' + (cls ? " " + cls : "") + '"><span>' + lbl + "</span><b>" + val + "</b>" + (sub ? "<small>" + sub + "</small>" : "") + "</div>";
    const unlocked = ACH.filter(a => p.ach[a.id]).length;

    /* head to head */
    const friends = players.map((n, j) => j).filter(j => j !== i).map(j => {
      const h = h2h(i, j), lastE = h.list[h.list.length - 1];
      return '<div class="pg-h2h"><span class="pl">' + D.av(j) + "<span>" + T("vs ", "tegen ") + esc(players[j]) + "<small>" + (lastE ? (lastE.w ? T("Won ", "Gewonnen ") : T("Lost ", "Verloren ")) + lastE.l[0] + "–" + lastE.l[1] + " · " + ago(lastE.t) : T("Not played yet", "Nog niet gespeeld")) + "</small></span></span>" +
        '<span class="pg-wl' + (h.list.length ? "" : " none") + '"><b class="w">' + h.w + "</b><i>–</i><b class=\"l\">" + h.l + "</b></span></div>";
    }).join("");
    const vc = vsCpu(i), lvls = Object.keys(CPU_RANK).concat(Object.keys(vc).filter(k => !CPU_RANK[k]));
    const cpus = lvls.map(k => { const o = vc[k] || { w: 0, l: 0 }; return '<div class="pg-cpu' + (o.w ? " beat" : "") + '"><span>' + esc(cpuName(k)) + "</span><b>" + o.w + "<i>–</i>" + o.l + "</b></div>"; }).join("");

    el.innerHTML = D.top() +
      '<div class="pg-headrow"><a class="back" href="#stand">‹ ' + T("Table", "Stand") + '</a></div>' +
      '<h1 class="pt">' + T("Stats", "Statistieken") + "</h1>" +
      '<div class="chips pg-sw" role="tablist">' + players.map((n, j) => '<button data-i="' + j + '" role="tab" aria-selected="' + (j === i) + '"' + (j === i ? ' class="on"' : "") + ">" + D.av(j) + "<span>" + esc(n) + "</span></button>").join("") + "</div>" +
      '<section class="pg-me">' + lvBadge(inf.lv) + '<div class="pg-who"><b>' + esc(players[i]) + '</b><small>' + esc(inf.title) + '</small><div class="pg-bar"><i style="width:' + (inf.frac * 100).toFixed(1) + '%"></i></div>' +
        '<div class="pg-barl"><span>' + inf.xp + " XP</span><span>" + (inf.next ? T("Level ", "Level ") + (inf.lv + 1) + T(" at ", " bij ") + inf.next : T("Top level", "Hoogste level")) + "</span></div></div></section>" +
      (t.n ? "" : '<p class="lead pg-empty">' + T("No matches yet. Play a 501 Match to start the record: XP, trophies and a heatmap of your darts.", "Nog geen matches. Speel een 501 Match om te beginnen: XP, prijzen en een heatmap van je pijlen.") + "</p>") +
      '<h2 class="sub-h">' + T("Numbers", "Cijfers") + '</h2><div class="pg-tiles">' +
        tile(T("Matches", "Matches"), t.n, t.n ? t.w + T(" won", " gewonnen") : "") +
        tile(T("Average", "Gemiddelde"), avgAll ? avgAll.toFixed(1) : "–", T("all matches", "alle matches")) +
        tile(T("Best average", "Beste gemiddelde"), p.best.avg != null ? p.best.avg.toFixed(1) : "–", "", "gold") +
        tile(T("High checkout", "Hoogste finish"), p.best.co || "–", "", "gold") +
        tile(T("Best leg", "Beste leg"), p.best.leg ? p.best.leg : "–", p.best.leg ? T("darts", "pijlen") : "", "gold") +
        tile(T("180s", "180's"), t.t180, p.best.m180 ? T("best ", "record ") + p.best.m180 + T(" in a match", " in een match") : "") +
        tile(T("Checkout %", "Uitgooi-%"), pct(t.ch, t.cd), t.cd ? t.ch + "/" + t.cd + T(" at a double", " op een dubbel") : "") +
        tile(T("Favourite double", "Favoriete dubbel"), fav ? esc(fav.k) : "–", fav ? fav.n + T(" hits", " raak") : "") +
        tile(T("Questions", "Vragen"), pct(t.qr, t.qa), t.qa ? t.qr + "/" + t.qa + T(" right", " goed") : "") +
        tile(T("Pressure", "Druk"), pct(t.pr, t.pa), t.pa && t.qa && t.pr / t.pa > t.qr / t.qa ? T("clutch", "koelbloedig") : t.pa ? t.pr + "/" + t.pa : "") +
      "</div>" +
      '<h2 class="sub-h">' + T("Form · average, last ", "Vorm · gemiddelde, laatste ") + Math.max(last.length, 0) + '</h2><div class="pg-box">' + spark(last) + "</div>" +
      '<h2 class="sub-h">' + T("Where your darts land", "Waar je pijlen landen") + '</h2><div class="pg-box pg-heat">' + hm.html +
        '<p class="note">' + (hm.n ? T(hm.n + " darts from the last " + hm.m + (hm.m === 1 ? " match" : " matches") + ". The brighter, the more often.", hm.n + " pijlen uit de laatste " + hm.m + (hm.m === 1 ? " match" : " matches") + ". Hoe feller, hoe vaker.") : T("Your darts show up here after a match.", "Na een match zie je hier je pijlen.")) + "</p></div>" +
      '<h2 class="sub-h">' + T("Head to head", "Onderling") + '</h2><div class="pg-h2hs">' + friends + '</div><div class="pg-cpus">' + cpus + "</div>" +
      '<h2 class="sub-h">' + T("Trophies ", "Prijzen ") + unlocked + "/" + ACH.length + '</h2><div class="pg-grid">' +
        ACH.map(a => { const on = !!p.ach[a.id]; return '<div class="pg-tr' + (on ? " on t-" + a.tier : "") + '" title="' + esc(T(a.d[0], a.d[1])) + '">' + badge(a, !on) + "<b>" + esc(T(a.n[0], a.n[1])) + "</b><span>" + esc(on ? ago(p.ach[a.id]) : T(a.d[0], a.d[1])) + "</span></div>"; }).join("") +
      "</div>";
    const F = fx();
    if(F){ F.stagger(el, ".pg-me, .pg-tiles > div, .pg-box, .pg-h2h, .pg-cpus, .pg-grid", 1); }
    el.querySelectorAll(".pg-sw button").forEach(b => b.onclick = () => {
      const j = +b.dataset.i; if(j === i) return;
      if(D.sfx && D.sfx.tick) D.sfx.tick();
      history.replaceState(null, "", "#stats-" + j);
      page(el, j);
    });
  }

  D.progress = {
    record, render, page, info, h2h, vsCpu, badge, ACH, TITLES, need, lvOf, title, ago,
    data: i => peek(i),
    /* tests and a fresh start */
    _reset(){ S = { v: 1, p: {} }; save(); },
    _reload: load
  };
})(window.DART);
