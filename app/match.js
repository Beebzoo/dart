/* 501 Match: a real leg on the board. Before each visit you pick a question (Easy / Medium /
   Hard); the answer sets your hand for all three darts (see hand.js). Touch the board where
   you want to throw; a loupe above the finger shows the spot, sliding fine-tunes it (finger
   at 0.4 speed, mouse 1:1). The hand breathes: a ring around the crosshair swells and
   settles, and tightens to gold at each still point. Let go then = PERFECT / GOOD release.
   Or tap an Aim chip, then hold anywhere and let go. Darts already in the bed block and
   deflect. Against a computer character (hand.js OPP) or a friend on the same phone.
   Hooks (all guarded): D.arena (mount/event/unmount), D.caller (walk-on, every visit,
   requires, moments, stop), D.progress (record + render on the end screen), D.fx (buzz). */
(function(D){
  const T = D.T, L = a => T(a[0], a[1]), esc = s => D.esc ? D.esc(s) : String(s);
  const call = (o, fn, a) => { try { const x = D[o]; if(x && typeof x[fn] === "function") return x[fn](...a); } catch(e){ console.warn(o, fn, e); } };
  const arena = (fn, ...a) => call("arena", fn, a);
  const caller = (fn, ...a) => call("caller", fn, a);
  const buzz = p => call("fx", "buzz", [p]);
  const calm = () => !!call("fx", "calm", []);
  const r1 = v => Math.round(v * 10) / 10;

  /* the setup is remembered on this device */
  const PKEY = "dart.matchPref";
  const pref = (() => {
    let p = {};
    try { p = JSON.parse(localStorage.getItem(PKEY) || "{}") || {}; } catch(e){}
    p = Object.assign({ vs: "cpu", opp: "molenaar", friend: -1, best: 3, start: 501, tier: "pick", clock: 15, last: {} }, p);
    if(!D.hand.OPP.some(o => o.id === p.opp)) p.opp = "molenaar";
    if(![1, 3, 5].includes(p.best)) p.best = 3;
    if(![301, 501].includes(p.start)) p.start = 501;
    if(!["pick", "easy", "medium", "hard"].includes(p.tier)) p.tier = "pick";
    if(![15, 8].includes(p.clock)) p.clock = 15;
    if(!p.last || typeof p.last !== "object") p.last = {};
    return p;
  })();
  const savePref = () => { try { localStorage.setItem(PKEY, JSON.stringify(pref)); } catch(e){} };
  const TIER = {
    easy: { n: ["Easy", "Makkelijk"], say: ["right = slight tremble", "goed = licht trillend"] },
    medium: { n: ["Medium", "Gemiddeld"], say: ["right = steady hand", "goed = vaste hand"] },
    hard: { n: ["Hard", "Moeilijk"], say: ["right = ice · wrong = yips", "goed = ijs · fout = bibberen"] }
  };

  D.match = function(el){
    let alive = true, raf = 0;
    const timers = new Set();
    const later = (f, ms) => { const t = setTimeout(() => { timers.delete(t); if(alive) f(); }, ms); timers.add(t); return t; };
    const stopAll = () => { timers.forEach(clearTimeout); timers.clear(); cancelAnimationFrame(raf); };
    let stopChase = () => {};

    /* ---------- setup ---------- */
    function setup(){
      const P = D.store.players, me = D.store.me, H = D.hand;
      if(pref.friend < 0 || pref.friend === me || !P[pref.friend]) pref.friend = P.findIndex((p, i) => i !== me);
      el.innerHTML = '<div class="g-top"><a class="back" href="#spelen">‹ Menu</a><b>501 Match</b><span></span></div>' +
        '<div class="g-body"><h1 class="g-h">501 Match</h1><p class="lead">' + T("Every visit starts with a question you pick: <b>Easy, Medium or Hard</b>. The answer sets your hand (a Hard one right = an ice-cold hand, wrong = the yips). Touch the board where you want the dart: the ring around the crosshair breathes. Let go when it tightens to gold for a <b>PERFECT</b> release.",
          "Elke beurt begint met een vraag die je kiest: <b>makkelijk, gemiddeld of moeilijk</b>. Het antwoord bepaalt je hand (een moeilijke goed = een ijskoude hand, fout = bibberen). Raak het bord aan waar je de pijl wilt: de ring rond het vizier ademt. Laat los als hij goud en klein wordt: <b>PERFECT</b>.") + "</p>" +
        '<h2 class="sub-h">' + T("Against", "Tegen") + '</h2><div class="chips" id="vs"><button data-v="cpu">' + T("A pro<small>12 characters</small>", "Een prof<small>12 tegenstanders</small>") + '</button><button data-v="friend">' + T("A friend<small>pass the phone</small>", "Een vriend<small>telefoon doorgeven</small>") + "</button></div>" +
        '<div id="vsx"></div>' +
        '<h2 class="sub-h">' + T("Length", "Lengte") + '</h2><div class="chips" id="best">' + [1, 3, 5].map(b => '<button data-v="' + b + '">' + (b === 1 ? T("One leg", "Eén leg") : "Best of " + b) + "<small>" + (b === 1 ? T("quick", "snel") : T("first to ", "eerst naar ") + Math.ceil(b / 2)) + "</small></button>").join("") + "</div>" +
        '<h2 class="sub-h">Start</h2><div class="chips" id="start"><button data-v="501">501</button><button data-v="301">301<small>' + T("short", "kort") + '</small></button></div>' +
        '<h2 class="sub-h">' + T("Questions", "Vragen") + '</h2><div class="chips" id="tier"><button data-v="pick">' + T("Pick each visit", "Kies per beurt") + "<small>" + T("Easy · Medium · Hard", "makkelijk · gemiddeld · moeilijk") + "</small></button>" +
          H.TIERS.map(t => '<button data-v="' + t + '">' + L(TIER[t].n) + "<small>" + L(TIER[t].say) + "</small></button>").join("") + "</div>" +
        '<h2 class="sub-h">' + T("Question clock", "Vraagklok") + '</h2><div class="chips" id="clock"><button data-v="15">15 s</button><button data-v="8">8 s<small>' + T("quick fire", "snelvuur") + "</small></button></div>" +
        '<button class="go" id="go">Game on</button><p class="count" id="ld"></p></div>';
      const mark = () => {
        [["vs", pref.vs], ["best", pref.best], ["start", pref.start], ["tier", pref.tier], ["clock", pref.clock]].forEach(([id, v]) =>
          el.querySelectorAll("#" + id + " button").forEach(b => b.classList.toggle("on", b.dataset.v === String(v))));
        const x = el.querySelector("#vsx");
        if(pref.vs === "cpu"){
          x.innerHTML = '<h2 class="sub-h">' + T("Opponent", "Tegenstander") + '</h2><div class="opps" id="opp">' + H.LEVELS.map((lv, i) =>
            '<p class="opp-lv">' + L(lv) + '</p><div class="opp-g">' + H.OPP.filter(o => o.lvl === i).map(o =>
              '<button data-v="' + o.id + '" class="opp' + (o.id === pref.opp ? " on" : "") + '"><span class="o-n"><b>' + esc(L(o.nick)) + "</b><i>" + o.flag + "</i></span>" +
              "<small>" + esc(o.name) + " · " + T("avg ~", "gem ~") + o.avg + "</small><em>" + esc(L(o.tell)) + "</em></button>").join("") + "</div>").join("") + "</div>";
          x.querySelectorAll("#opp button").forEach(b => b.onclick = () => { pref.opp = b.dataset.v; D.sfx.tick(); mark(); });
        } else {
          x.innerHTML = '<h2 class="sub-h">' + T("Who?", "Wie?") + "</h2>" + '<div class="chips" id="fr">' + P.map((p, i) => i === me ? "" : '<button data-v="' + i + '"' + (i === pref.friend ? ' class="on"' : "") + ">" + esc(p) + "</button>").join("") + "</div>";
          x.querySelectorAll("#fr button").forEach(b => b.onclick = () => { pref.friend = +b.dataset.v; mark(); });
        }
      };
      el.querySelectorAll("#vs button").forEach(b => b.onclick = () => { pref.vs = b.dataset.v; mark(); });
      el.querySelectorAll("#best button").forEach(b => b.onclick = () => { pref.best = +b.dataset.v; mark(); });
      el.querySelectorAll("#start button").forEach(b => b.onclick = () => { pref.start = +b.dataset.v; mark(); });
      el.querySelectorAll("#tier button").forEach(b => b.onclick = () => { pref.tier = b.dataset.v; mark(); });
      el.querySelectorAll("#clock button").forEach(b => b.onclick = () => { pref.clock = +b.dataset.v; mark(); });
      mark();
      const go = el.querySelector("#go");
      go.onclick = () => {
        savePref();
        go.disabled = true; el.querySelector("#ld").textContent = T("Loading questions…", "Vragen laden…");
        D.qs.load().then(() => alive && start()).catch(() => { go.disabled = false; el.querySelector("#ld").textContent = T("The questions won’t load. Try again in a moment.", "De vragen laden niet. Probeer het zo nog eens."); });
      };
    }

    /* ---------- the match ---------- */
    function start(){
      stopAll(); stopChase();
      const H = D.hand, me = D.store.me, PL = D.store.players, OP = pref.vs === "cpu" ? H.opp(pref.opp) : null, QTIME = pref.clock;
      const mk = (name, idx, cpu) => ({ name, idx, cpu, left: pref.start, legs: 0, darts: 0, legDarts: 0, scored: 0, n180: 0, n140: 0, hiCo: 0, atD: 0, bo: 0,
        qRight: 0, qAll: 0, pq: 0, pqRight: 0, last: null, mom: 0, missD: 0, perfect: 0, good: 0, robin: 0, offDart: 0, hits: [], legWon: [], checkouts: [], busts: 0, pv: 0, dDone: 0, tier: pref.last[idx] || "medium", form: null, nine: false, right: false });
      const pl = [mk(PL[me], me, false), OP ? mk(OP.name, -1, true) : mk(PL[pref.friend], pref.friend, false)];
      const need = Math.ceil(pref.best / 2);
      let leg = 1, starter = 0, turn = 0, phase = "idle", grade = 0, ph = 0, visit = [], visitStart = 0, visitPts = [], visitClean = 0, visitPerf = 0,
        aim = D.board.target({ m: 3, n: 20 }), hold = null, locked = null, t0 = performance.now(), chase = null;

      arena("unmount");
      el.innerHTML = '<div class="g-top"><a class="back" href="#spelen">‹ Stop</a><b id="legx"></b><span></span></div>' +
        '<div class="g-body m">' +
        '<div class="sb" id="sb">' + pl.map((p, i) => '<div class="sbp" data-i="' + i + '"><i class="dot"></i><b class="nm">' + esc(p.name) + (p.cpu ? "<small>" + OP.flag + "</small>" : "") + '</b><span class="lg"></span><span class="chalk lf"></span><span class="sbx"></span></div>').join("") + "</div>" +
        '<div class="m-board" id="mb">' + D.board.svg({ cls: "big" }) + '<div class="handtag" id="ht"></div><div class="m-chy" id="chy"></div>' +
        '<div class="loupe" id="lp" hidden>' + D.board.svg({ cls: "lp" }) + '<span class="lp-l" id="lpl"></span></div></div>' +
        '<div class="m-info"><div class="m-fin" id="fin"></div><div class="slots" id="slots"></div><div class="aimchips" id="ac"></div><p class="m-hint" id="hint"></p></div>' +
        '<div class="sheet" id="sheet" hidden></div><div class="banner" id="ban" hidden></div></div><div class="visit" id="vis"></div>';
      const $ = s => el.querySelector(s), svg = el.querySelector(".m-board .board"), NS = "http://www.w3.org/2000/svg";
      const lp = $("#lp"), lsvg = lp.querySelector(".board"), lpl = $("#lpl"), mb = $("#mb");
      arena("mount", el.querySelector(".g-body.m"));
      /* the crosshair: anchor (where you aim), cross (aim + wobble) and the breathing ring */
      const mkAim = (r, w) => { const g = document.createElementNS(NS, "g"); g.setAttribute("class", "aim"); g.style.display = "none";
        g.innerHTML = '<circle class="anchor" r="' + w * 1.6 + '"/><g class="cross"><circle r="' + r + '" stroke-width="' + w + '"/><circle r="' + w + '" class="c0"/>' +
          ["-1.7,-0.5", "0.5,1.7"].map(v => { const [a, b] = v.split(",").map(Number); return '<line x1="' + a * r + '" x2="' + b * r + '" stroke-width="' + w + '"/><line y1="' + a * r + '" y2="' + b * r + '" stroke-width="' + w + '"/>'; }).join("") +
          '<circle class="breath" r="' + r * 2 + '" stroke-width="' + w * 0.9 + '"/></g>';
        g._r = r;
        return g; };
      const aimG = mkAim(10, 1.6), aimL = mkAim(3.4, 0.45);
      svg.appendChild(aimG); lsvg.appendChild(aimL);
      const parts = g => ({ g, cross: g.querySelector(".cross"), anchor: g.querySelector(".anchor"), ring: g.querySelector(".breath"), r: g._r });
      const AG = parts(aimG), AL = parts(aimL);

      const avg = p => p.darts ? (p.scored / p.darts * 3) : 0;
      const onFinish = left => left <= 170 && D.co.possible(left);
      const atDouble = left => (left <= 40 && left % 2 === 0) || left === 50;
      const lab = d => d.bo ? T("Bounce-out", "Eruit") : d.robin ? "Robin Hood" : D.co.label(d);
      /* momentum and nerves for the hand right now */
      const stOf = p => ({ mom: p.mom, nerves: atDouble(p.left) ? Math.min(3, p.missD) : 0 });
      function board(){
        $("#legx").textContent = "Leg " + leg + (pref.best > 1 ? " · best of " + pref.best : "");
        pl.forEach((p, i) => {
          const row = el.querySelector('.sbp[data-i="' + i + '"]');
          row.classList.toggle("on", i === turn);
          row.classList.toggle("fire", p.mom >= 3);
          row.querySelector(".lg").textContent = pref.best > 1 ? p.legs : "";
          row.querySelector(".lf").textContent = p.left;
          const r = p.left <= 170 && D.co.route(p.left);
          row.querySelector(".sbx").innerHTML = (r ? "<em>" + r.map(D.co.label).join(" ") + "</em>" : "") +
            (p.mom ? '<i class="mpips" title="' + T("In the zone", "In de zone") + '">' + "<b></b>".repeat(p.mom) + "</i>" : "") +
            '<span class="ag">' + T("avg ", "gem ") + (p.dDone ? (p.scored / p.dDone * 3).toFixed(1) : "–") + "</span>" +
            (p.last != null ? '<b class="last">' + T("last ", "vorige ") + p.last + "</b>" : "");
        });
        $("#slots").innerHTML = [0, 1, 2].map(i => '<span class="' + (visit[i] ? "used" + (visit[i].bo || visit[i].robin ? " bo" : "") : "") + '">' + (visit[i] ? lab(visit[i]) : "") + "</span>").join("");
      }
      /* "on a finish": the route big above the slots, the next dart's bed glowing on the board */
      function finish(){
        const p = pl[turn], k = 3 - visit.length, r = onFinish(p.left) && D.co.route(p.left), fin = $("#fin");
        svg.querySelectorAll(".bed.tgt").forEach(x => x.remove());
        if(!r || r.length > k || phase === "after"){ fin.innerHTML = ""; fin.className = "m-fin"; return; }
        fin.className = "m-fin show";
        fin.innerHTML = '<span class="lbl">' + T("On a finish · ", "Op een finish · ") + p.left + "</span><div>" + r.map((d, i) => '<b class="' + (i === 0 ? "now" : "") + '">' + D.co.label(d) + "</b>").join("<i>›</i>") + "</div>";
        if(!p.cpu) D.board.light(svg, r[0], "tgt", 0);
      }
      function chips(){
        const p = pl[turn], k = 3 - visit.length, r = D.co.route(p.left), opts = [];
        if(r && r.length <= k) opts.push(r[0]);
        [{ m: 3, n: 20 }, { m: 3, n: 19 }, { m: 2, n: 25 }].forEach(d => { if(!opts.some(o => o.m === d.m && o.n === d.n)) opts.push(d); });
        const same = (a, b) => a && b && a.m === b.m && a.n === b.n;
        $("#ac").innerHTML = "<span>" + T("Aim", "Mik op") + "</span>" + opts.slice(0, 4).map((d, i) => '<button data-i="' + i + '" class="' + (i === 0 && r && r.length <= k ? "fin" : "") + (same(locked, d) ? " on" : "") + '">' + D.co.label(d) + "</button>").join("");
        $("#ac").querySelectorAll("button").forEach(b => b.onclick = () => {
          const d = opts[+b.dataset.i];
          locked = same(locked, d) ? null : d;
          if(locked) aim = D.board.target(locked).slice();
          D.sfx.tick(); chips(); hint();
        });
      }
      function hint(){
        $("#hint").textContent = locked ? T("Aiming at " + D.co.label(locked) + ": hold anywhere, let go when the ring tightens to gold. Tap it again to aim freely.", "Je mikt op " + D.co.label(locked) + ": houd je vinger op het bord, laat los als de ring goud wordt. Tik nog eens om vrij te mikken.")
          : T("Touch where you want to throw, slide to fine-tune. Let go when the ring tightens to gold.", "Raak aan waar je wilt gooien, schuif om bij te stellen. Laat los als de ring goud wordt.");
      }
      /* the hand tag above the board: the hand, plus nerves or on fire */
      function tag(){
        const p = pl[turn], st = stOf(p), ht = $("#ht");
        if(p.cpu){ ht.className = "handtag"; return; }
        ht.innerHTML = esc(L(H.HANDS[grade].name)) + (st.nerves ? ' <span class="nv">' + T("Nerves ×", "Zenuwen ×") + st.nerves + "</span>" : "") + (p.mom >= 3 ? ' <span class="fi">' + T("On fire", "Lekker bezig") + "</span>" : "");
        ht.className = "handtag show h" + grade;
      }

      /* ---------- the crosshair: aim + the wobble of your hand + the breathing ring ---------- */
      const LW = 62, CALM = calm();
      let lastWin = 0;
      function loop(){
        raf = requestAnimationFrame(loop);
        if(phase !== "throw"){ aimG.style.display = "none"; if(!lp.hidden) lp.hidden = true; return; }
        aimG.style.display = "";
        const now = performance.now(), s = (now - t0) / 1000, p = pl[turn], st = stOf(p);
        let hs = null;
        if(hold){
          if(now - hold.moved > 120) hold.rest += Math.min(0.1, (now - hold.tick) / 1000);
          hold.tick = now;
          hs = { b: (now - hold.t0) / 1000, rest: hold.rest };
        }
        const br = H.breath(hs, grade, st), w = H.wobble(aim, s, grade, ph, hs, st), blk = H.blocked(aim, visitPts);
        const at = "translate(" + aim[0].toFixed(2) + " " + aim[1].toFixed(2) + ")", ct = "translate(" + (aim[0] + w[0]).toFixed(2) + " " + (aim[1] + w[1]).toFixed(2) + ")";
        const h = H.mods(grade, st), ringK = !hs ? 0 : CALM ? 1.6 : (1.05 + 2 * (br.base - h.minE) / (1 - h.minE)) * br.tired;
        const cls = "aim" + (hold ? " hold" : "") + (hs ? " breathe" : "") + (br.win === 2 ? " win2" : br.win ? " win1" : "") + (br.tired > 1.04 ? " tired" : "") + (blk ? " blocked" : "") + (st.nerves ? " nerves" : "") + (p.mom >= 3 ? " fire" : "");
        [AG, AL].forEach((A, i) => {
          if(i === 1 && !hold){ A.g.style.display = "none"; return; }
          A.g.style.display = "";
          A.anchor.setAttribute("transform", at); A.cross.setAttribute("transform", ct);
          if(A.g.getAttribute("class") !== cls) A.g.setAttribute("class", cls);
          if(hs) A.ring.setAttribute("r", (A.r * ringK).toFixed(2));
        });
        if(hold){
          lsvg.setAttribute("viewBox", (aim[0] - LW / 2).toFixed(2) + " " + (aim[1] - LW / 2).toFixed(2) + " " + LW + " " + LW);
          const d = D.board.hit(aim[0], aim[1]);
          lpl.textContent = (d.n === 0 ? T("Off the board", "Naast het bord") : D.co.label(d)) + (blk ? T(" · blocked", " · bezet") : "");
          lpl.classList.toggle("blk", blk);
          if(br.win && !lastWin) buzz(6);
        }
        lastWin = hold ? br.win : 0;
      }
      const unit = () => 480 / svg.getBoundingClientRect().width;
      const clampAim = a => { const r = Math.hypot(a[0], a[1]); return r > 226 ? [a[0] * 226 / r, a[1] * 226 / r] : a; };
      /* the loupe sits above the finger, or beside it near the top of the screen */
      function placeLoupe(cx, cy){
        const box = mb.getBoundingClientRect(), S = lp.offsetWidth || 136, gap = 112, vw = document.documentElement.clientWidth;
        let x = cx, y = cy - gap;
        if(y - S / 2 < 6){ y = Math.max(cy, 6 + S / 2); x = cx + (cx < vw / 2 ? gap : -gap); }
        x = Math.max(S / 2 + 4, Math.min(vw - S / 2 - 4, x));
        lp.style.left = (x - box.left - S / 2) + "px"; lp.style.top = (y - box.top - S / 2) + "px";
      }
      mb.addEventListener("contextmenu", e => e.preventDefault());
      mb.addEventListener("pointerdown", e => {
        if(phase !== "throw" || hold) return;
        e.preventDefault(); try { mb.setPointerCapture(e.pointerId); } catch(x){}
        const mouse = e.pointerType === "mouse", now = performance.now();
        if(!locked) aim = clampAim(D.board.toMM(svg, e.clientX, e.clientY));
        hold = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, a: aim.slice(), id: e.pointerId, gain: mouse ? (locked ? 0.5 : 1) : 0.4, hist: [], t0: now, moved: now, tick: now, rest: 0 };
        hold.hist.push([now, e.clientX, e.clientY, aim[0], aim[1]]);
        lsvg.querySelector(".darts").innerHTML = svg.querySelector(".darts").innerHTML;
        lp.hidden = false; placeLoupe(e.clientX, e.clientY);
      });
      mb.addEventListener("pointermove", e => {
        if(!hold || e.pointerId !== hold.id) return;
        const u = unit() * hold.gain;
        aim = clampAim([hold.a[0] + (e.clientX - hold.x) * u, hold.a[1] + (e.clientY - hold.y) * u]);
        const now = performance.now();
        /* sliding (fine-tuning in the loupe) doesn't tire the arm */
        if(Math.hypot(e.clientX - hold.lx, e.clientY - hold.ly) > 1.5){ hold.moved = now; hold.lx = e.clientX; hold.ly = e.clientY; }
        hold.hist.push([now, e.clientX, e.clientY, aim[0], aim[1]]);
        while(hold.hist.length > 2 && hold.hist[1][0] < now - 400) hold.hist.shift();
        placeLoupe(e.clientX, e.clientY);
      });
      const up = e => {
        if(!hold || e.pointerId !== hold.id) return;
        /* a quick flick up at the end throws a bit harder, but never moves the aim */
        const now = performance.now(), h = hold.hist;
        let base = h[0];
        for(const x of h){ if(x[0] <= now - 150) base = x; }
        const rise = base[2] - e.clientY, flick = rise > 30 && Math.abs(e.clientX - base[1]) < rise && now - base[0] < 450;
        if(flick) aim = [base[3], base[4]];
        const hs = { b: (now - hold.t0) / 1000, rest: hold.rest };
        hold = null; lp.hidden = true;
        if(phase === "throw") human(flick, hs);
      };
      mb.addEventListener("pointerup", up);
      mb.addEventListener("pointercancel", () => { hold = null; lp.hidden = true; });

      /* ---------- the big moments: the 180 chase and the match dart ---------- */
      const chy = $("#chy");
      let heart = 0;
      stopChase = () => { if(heart){ clearInterval(heart); heart = 0; } if(pl[turn].nine && phase !== "after"){ chy.textContent = T("Nine-dart watch", "Negendarter in zicht"); chy.className = "m-chy show nine"; } else chy.className = "m-chy"; mb.classList.remove("zoom"); chase = null; };
      function startChase(kind, n){
        if(chase) return;
        const p = pl[turn];
        chase = { kind, n, name: p.name };
        chy.textContent = kind === "max" ? T("For the maximum", "Voor de 180") : T("Match dart", "Matchpijl");
        chy.className = "m-chy show " + kind;
        arena("event", kind === "max" ? "chase" : "matchdart", { name: p.name });
        if(kind === "match") caller("moment", "matchdart", { name: p.name, cpu: p.cpu, left: p.left });
        D.sfx.heart(); heart = setInterval(() => { if(alive) D.sfx.heart(); }, 750);
      }
      /* before a dart: is this the third dart after two in the same treble, or a match dart? */
      function chaseCheck(){
        const p = pl[turn];
        if(chase) return;
        if(visit.length === 2 && visit.every(d => d.m === 3 && d.n === visit[0].n) && (visit[0].n === 20 || visit[0].n === 19)) startChase("max", visit[0].n);
        else if(atDouble(p.left) && p.legs + 1 >= need && D.co.route(p.left).length === 1) startChase("match");
      }
      /* the slow-motion zoom on the bed, only after the release */
      function zoomTo(n){
        if(calm()) return;
        const [x, y] = D.board.target({ m: 3, n });
        svg.style.transformOrigin = ((x + 240) / 480 * 100).toFixed(1) + "% " + ((y + 240) / 480 * 100).toFixed(1) + "%";
        mb.classList.remove("unzoom"); mb.classList.add("zoom");
      }
      function unzoom(ms){ later(() => { mb.classList.add("unzoom"); mb.classList.remove("zoom"); later(() => mb.classList.remove("unzoom"), 400); }, ms); }

      /* ---------- one dart ---------- */
      function shake(){ svg.classList.remove("shake"); void svg.getBoundingClientRect(); svg.classList.add("shake"); later(() => svg.classList.remove("shake"), 260); }
      function pop(pt, d, clean, c){
        const e = document.createElement("div"), v = D.co.val(d), off = c && c.host != null;
        e.className = "m-pop" + (d.robin ? " robin" : d.bo ? " bo" : d.n === 0 ? " miss" : d.m === 3 || (d.n === 25 && d.m === 2) ? " big" : "");
        e.style.left = Math.max(12, Math.min(88, (pt[0] + 240) / 480 * 100)) + "%"; e.style.top = ((pt[1] + 240) / 480 * 100) + "%";
        e.innerHTML = (d.robin ? "<b>Robin Hood!</b><span>" + T("in the back of the dart", "in de achterkant van de pijl") + "</span>"
          : d.bo ? "<b>" + (off ? T("Off a dart!", "Op een pijl!") : T("Bounce-out!", "Eruit gestuiterd!")) + "</b>"
          : "<b>" + D.co.label(d) + "</b>" + (d.m > 1 || d.n === 25 ? "<span>" + v + "</span>" : "") + (off ? '<span class="dfl">' + T("off a dart", "via een pijl") + "</span>" : "")) +
          (clean ? '<i class="tag t' + clean + '">' + (clean === 2 ? "PERFECT" : "GOOD") + "</i>" : "");
        mb.appendChild(e);
        setTimeout(() => e.remove(), 1100);
      }
      /* throw: the dart flies in (raw = where it went, c = after any dart in the bed), then lands */
      function throwDart(p, raw, c, ms, x, next){
        const dbl = atDouble(p.left);
        if(dbl) p.atD++;
        svg.querySelectorAll(".bed.tgt").forEach(e => e.remove());
        D.sfx.whoosh(x.slow);
        const host = c.robin ? visitPts[c.host] : null;
        const fin = c.bo || c.robin ? { m: 1, n: 0 } : D.board.hit(c.pt[0], c.pt[1]);
        const stop = !c.bo && !c.robin && (fin.m === 3 || fin.n === 25) && !calm() ? 70 : 0;
        const opts = { ms, slow: x.slow, bounce: c.bo, deflect: !c.bo && !c.robin && c.defl ? c.pt : null, robin: host && host.el && host.el._pos, stop };
        if(x.slow && chase && chase.kind === "max") zoomTo(chase.n);
        const at = opts.deflect || c.bo ? raw : c.pt;
        let dartEl = null;
        dartEl = D.board.throwAt(svg, at[0], at[1], visit.length + 1, opts, () => { if(alive) next(land(p, c, fin, x, dbl, dartEl, stop)); });
      }
      function land(p, c, fin, x, dbl, dartEl, stop){
        const d = c.bo ? { m: 1, n: 0, bo: true } : c.robin ? { m: 1, n: 0, robin: true } : fin;
        visit.push(d); p.darts++; p.legDarts++;
        if(c.bo) p.bo++;
        if(c.host != null && !c.robin) p.offDart++;
        if(c.robin) p.robin++;
        if(!c.bo) visitPts.push({ pt: c.pt, robin: !!c.robin, el: dartEl });
        p.hits.push([r1(c.pt[0]), r1(c.pt[1]), c.bo ? "BO" : c.robin ? "RH" : D.co.label(d)]);
        const kind = d.n === 0 ? "miss" : d.n === 25 ? "bull" : d.m === 3 ? "treble" : d.m === 2 ? "double" : "single";
        if(c.bo){ D.sfx.tink(c.host != null ? 0.7 : 1); buzz([10, 30, 10, 30, 10]); caller("moment", "bounce", { name: p.name, cpu: p.cpu }); }
        else if(c.robin){ D.sfx.tink(0.8); D.sfx.thud("single"); buzz([20, 40, 20]); caller("moment", "robin", { name: p.name, cpu: p.cpu }); arena("event", "robin", { name: p.name }); }
        else {
          D.sfx.thud(kind);
          if(kind !== "double" && kind !== "miss" && D.board.wire(c.pt[0], c.pt[1]) < 1.2) D.sfx.tink(0.2);
          buzz(kind === "treble" || kind === "bull" ? 18 : kind === "double" ? [12, 40, 12] : kind === "single" ? 8 : 0);
          D.board.light(svg, d, "flash", 750);
        }
        const show = () => { if(!alive) return; if(!c.bo && !c.robin && !(chase && x.slow)) shake(); pop(c.pt, d, x.clean, c); };
        if(stop) later(show, stop); else show();
        arena("event", "dart", { label: lab(d), score: D.co.val(d) });
        const st = D.co.play(visitStart, visit);
        if(st.state !== "bust") p.left = st.state === "out" ? 0 : st.left;
        /* nerves: every dart at a double that doesn't win the leg */
        if(!p.cpu && dbl && st.state !== "out") p.missD = Math.min(3, p.missD + 1);
        board();
        if(st.state === "out") return endVisit(p, "out");
        if(st.state === "bust") return endVisit(p, "bust");
        if(visit.length === 3) return endVisit(p, "done");
        if(chase && x.slow){ stopChase(); }
        return null;
      }
      function human(flick, hs){
        const p = pl[turn], s = (performance.now() - t0) / 1000, st = stOf(p);
        phase = "flying"; locked = null; $("#ac").querySelectorAll("button").forEach(b => b.disabled = true);
        const r = H.release(aim, s, grade, ph, hs, st);
        if(r.clean === 2){ p.perfect++; D.sfx.clean(2); buzz([8, 30, 8]); } else if(r.clean === 1){ p.good++; D.sfx.clean(1); buzz(8); }
        if(r.clean) visitClean++; if(r.clean === 2) visitPerf++;
        const bo = H.bounce(r.pt, grade), c = bo ? { pt: r.pt, bo: true } : H.collide(r.pt, visitPts);
        const slow = !!chase, ms = chase ? (chase.kind === "max" ? (calm() ? 300 : 650) : 400) : flick ? 170 : 230;
        if(heart){ clearInterval(heart); heart = 0; }
        throwDart(p, r.pt, c, ms, { clean: r.clean, slow }, res => {
          if(res === null) later(() => { phase = "throw"; chips(); hint(); finish(); tag(); chaseCheck(); }, 380);
        });
      }

      /* ---------- visits ---------- */
      function beginVisit(){
        const p = pl[turn];
        visit = []; visitStart = p.left; visitPts = []; visitClean = 0; visitPerf = 0; locked = null; stopChase(); D.board.clear(svg); board();
        $("#ac").innerHTML = ""; $("#ht").className = "handtag"; $("#fin").innerHTML = ""; $("#fin").className = "m-fin";
        arena("event", "turn", { name: p.name, cpu: p.cpu });
        if(onFinish(p.left)) caller("require", p.name, p.left);
        /* after two 180s: the nine-dart watch for the whole third visit */
        if(p.nine){ chy.textContent = T("Nine-dart watch", "Negendarter in zicht"); chy.className = "m-chy show nine"; arena("event", "nine", { name: p.name }); }
        if(p.cpu){
          phase = "cpu"; $("#hint").textContent = T(L(OP.nick) + " is throwing…", L(OP.nick) + " gooit…");
          if(!p.form) p.form = H.oppLeg(OP);
          const form = H.oppVisit(OP, p.form);
          finish();
          const one = () => {
            const k = 3 - visit.length, t = H.cpuAim(p.left, k, OP), other = pl[1 - turn];
            const pressure = onFinish(other.left) || (atDouble(p.left) && p.legs + 1 >= need);
            const go = () => {
              const r = H.cpuThrow(t, OP, { form, inBoard: visitPts, pressure }), slow = !!chase;
              if(heart){ clearInterval(heart); heart = 0; }
              throwDart(p, r.raw, r, slow ? (chase.kind === "max" && !calm() ? 650 : 400) : 260, { slow }, res => { if(res === null) later(one, OP.tempo); });
            };
            chaseCheck();
            if(chase) later(go, 1100); else go();
          };
          later(one, 800);
          return;
        }
        const other = pl[1 - turn];
        choose(p, !other.cpu && pl.some(x => x.darts > 0));
      }
      /* pick the question tier (one tap), with the pass-the-phone sheet in a friend match */
      function choose(p, pass){
        if(pref.tier !== "pick" && !pass) return ask(pref.tier);
        phase = pass ? "pass" : "choose";
        $("#hint").textContent = "";
        const sh = $("#sheet"), pressure = onFinish(p.left), r = pressure && D.co.route(p.left);
        sh.hidden = false; sh.className = "sheet choose" + (pass ? " pass" : "") + (pressure ? " pressure" : "");
        sh.innerHTML = (pass ? '<p class="lbl">' + T("Pass the phone", "Telefoon doorgeven") + '</p><p class="pass-n">' + esc(p.name) + '</p><p class="lead">' + T("to the oche, needs <b>", "aan de oche, nog <b>") + p.left + "</b></p>"
            : '<p class="lbl">' + esc(p.name) + T(", pick your question · needs ", ", kies je vraag · nog ") + p.left + "</p>") +
          (pressure ? '<div class="pq"><span>' + T("On a finish", "Op een finish") + "</span><b>" + p.left + "</b><em>" + r.map(D.co.label).join(" › ") + "</em></div>" : "") +
          (pref.tier === "pick" ? (pass ? '<p class="lbl tq">' + T("Pick your question", "Kies je vraag") + "</p>" : "") + '<div class="tiers">' + H.TIERS.map(t => '<button data-t="' + t + '" class="tier t-' + t + (t === p.tier ? " last" : "") + '"><b>' + L(TIER[t].n) + "</b><small>" + L(TIER[t].say) + "</small></button>").join("") + "</div>"
            : '<button class="go" id="ok">' + T("I’m ready", "Ik sta klaar") + "</button>");
        sh.querySelectorAll(".tiers button").forEach(b => b.onclick = () => {
          const t = b.dataset.t; p.tier = t; pref.last[p.idx] = t; savePref(); D.sfx.tick(); ask(t);
        });
        const ok = sh.querySelector("#ok"); if(ok) ok.onclick = () => ask(pref.tier);
      }
      function ask(tier){
        const p = pl[turn], pressure = onFinish(p.left), r = pressure && D.co.route(p.left);
        let q = D.qs.pick("alles", tier, 1)[0];
        if(!q) q = D.qs.pick("alles", "mix", 1)[0];
        phase = "question";
        $("#hint").textContent = "";
        if(pressure) p.pq++;
        const sh = $("#sheet");
        sh.hidden = false; sh.className = "sheet" + (pressure ? " pressure" : "");
        sh.innerHTML = '<div class="clock"><i id="qbar"></i></div>' +
          (pressure ? '<div class="pq"><span>' + T("Pressure question", "Drukvraag") + "</span><b>" + p.left + "</b><em>" + r.map(D.co.label).join(" › ") + "</em></div>" : "") +
          '<p class="lbl"><i class="tb t-' + tier + '">' + L(TIER[tier].n) + "</i>" + esc(p.name) + (pressure ? T(", on a finish", ", op een finish") + (p.missD ? T(": a right answer calms the nerves", ": goed antwoord kalmeert de zenuwen") : "") : T(" · needs ", " · nog ") + p.left) + '</p><p class="q">' + esc(q.q) + '</p><div class="answers">' +
          q.opts.map((o, k) => '<button data-k="' + k + '"><i>' + "ABCD"[k] + "</i><span>" + esc(o) + "</span></button>").join("") + '</div><div class="verdict-h" id="vh"></div>';
        const bar = $("#qbar");
        requestAnimationFrame(() => requestAnimationFrame(() => { if(!bar.dataset.done){ bar.style.transition = "transform " + QTIME + "s linear"; bar.style.transform = "scaleX(0)"; } }));
        let done = false;
        const tm = later(() => answer(-1), QTIME * 1000);
        const answer = k => {
          if(done) return; done = true; clearTimeout(tm); timers.delete(tm);
          /* freeze the clock where it is: read the running value before stopping the transition */
          const now = getComputedStyle(bar).transform;
          bar.dataset.done = "1"; bar.style.transition = "none"; bar.style.transform = now;
          const pick = k >= 0 ? q.opts[k] : null;
          const ans = pick === q.a ? 0 : pick == null ? 3 : Math.min(3, 1 + Math.max(0, q.o.indexOf(pick)));
          grade = H.gradeFor(tier, ans);
          bar.parentNode.classList.add(ans === 0 ? "ok" : "no");
          p.qAll++; p.right = ans === 0;
          const calmed = pressure && ans === 0 && p.missD > 0;
          if(ans === 0){ p.qRight++; if(pressure){ p.pqRight++; p.missD = 0; } }
          /* momentum: a close or off answer costs a pip, a wrong or late one wipes it */
          if(ans === 3) p.mom = 0; else if(ans > 0) p.mom = Math.max(0, p.mom - 1);
          sh.querySelectorAll(".answers button").forEach((b, j) => { b.disabled = true; if(q.opts[j] === q.a) b.classList.add("right"); else if(j === k) b.classList.add("wrong", "g" + Math.min(3, ans)); });
          const Hd = H.HANDS[grade];
          const say = tier === "hard" && ans > 0 ? T("A hard one missed: the yips.", "Een moeilijke gemist: bibberen.") : tier === "easy" && ans === 0 ? T("Right, but an easy one: a slight tremble.", "Goed, maar een makkelijke: licht trillend.") : L(Hd.say);
          $("#vh").innerHTML = '<b class="h' + grade + '">' + L(Hd.name) + "</b><span>" + (pick == null ? T("Too late. ", "Te laat. ") : "") + say + (calmed ? T(" The nerves are gone.", " De zenuwen zijn weg.") : "") + (ans ? T(" It was: ", " Goed was: ") + esc(q.a) + "." : "") + "</span>";
          if(ans === 0){ D.sfx.good(); buzz(10); } else { D.sfx.bad(); buzz([30, 40, 30]); }
          later(() => throwPhase(), ans === 0 ? 1100 : 1700);
        };
        sh.querySelectorAll(".answers button").forEach(b => b.onclick = () => answer(+b.dataset.k));
      }
      function throwPhase(){
        $("#sheet").hidden = true;
        ph = Math.random() * 6.28; t0 = performance.now();
        phase = "throw"; tag(); chips(); hint(); finish(); chaseCheck();
      }
      function endVisit(p, how){
        phase = "after"; $("#ac").innerHTML = ""; finish();
        /* no stale texts under the stings */
        $("#hint").textContent = ""; $("#ht").className = "handtag";
        const wasChase = chase && chase.kind === "max";
        if(heart){ clearInterval(heart); heart = 0; }
        chy.className = "m-chy";
        const total = how === "bust" ? 0 : visitStart - p.left;
        if(how === "bust") p.left = visitStart;
        p.scored += total; p.dDone += visit.length; p.last = how === "bust" ? 0 : total;
        if(total === 180) p.n180++; else if(total >= 140) p.n140++;
        /* momentum: a right answer plus two clean releases is a pip; three = on fire */
        if(!p.cpu && p.right && visit.length && visitPerf === visit.length) p.pv++;
        if(!p.cpu && p.right && visitClean >= 2){
          const was = p.mom; p.mom = Math.min(3, p.mom + 1);
          if(p.mom === 3 && was < 3) arena("event", "fire", { name: p.name });
        }
        board();
        arena("event", "visit", { total, name: p.name });
        caller("visit", p.name, total, { cpu: p.cpu, bust: how === "bust", left: p.left });
        /* the visit total, over the lower part of the board (not over the treble you threw at) */
        const v = $("#vis"), br = svg.getBoundingClientRect();
        if(br.height) v.style.top = Math.round(br.top + br.height * 0.74) + "px";
        v.className = "visit show" + (total === 180 ? " max" : how === "bust" ? " bust" : "");
        v.innerHTML = how === "bust" ? "<b>Bust</b>" : "<b>" + total + "</b>" + (total === 180 ? "<span>One hundred and eighty!</span>" : how === "out" ? "<span>Game shot!</span>" : "");
        later(() => { v.className = "visit"; }, 1300);
        if(wasChase){ if(total === 180) unzoom(900); else { D.sfx.aww(); arena("event", "aww", { name: p.name }); unzoom(150); } }
        chase = null;
        if(total === 180){ caller("moment", "180", { name: p.name, cpu: p.cpu }); arena("event", "180", { name: p.name }); buzz([30, 60, 30, 60, 120]); }
        else if(how === "bust"){ p.busts++; caller("moment", "bust", { name: p.name, cpu: p.cpu }); arena("event", "bust", { name: p.name }); buzz(80); }
        /* two 180s to open a 501 leg: the nine-dart watch */
        if(pref.start === 501 && how === "done" && p.legDarts === 6 && p.left === 141){ p.nine = true; caller("moment", "nine", { name: p.name, cpu: p.cpu }); }
        else if(p.legDarts > 6) p.nine = false;
        if(how === "out"){
          const match = p.legs + 1 >= need;
          p.hiCo = Math.max(p.hiCo, visitStart); p.legs++;
          p.legWon.push(p.legDarts); p.checkouts.push([visitStart, D.co.label(visit[visit.length - 1])]);
          caller("moment", "gameshot", { name: p.name, score: visitStart, leg, match });
          if(pref.start === 501 && p.legDarts === 9) caller("moment", "ninedarter", { name: p.name, cpu: p.cpu });
          buzz([20, 40, 20, 40, 200]);
          arena("event", "checkout", { score: visitStart, name: p.name });
          arena("event", "leg", { name: p.name, legs: [pl[0].legs, pl[1].legs] });
          return later(() => legOver(p), 1500);
        }
        later(() => { turn = 1 - turn; beginVisit(); }, p.cpu ? 1500 : 1700);
      }
      function legOver(w){
        if(w.legs >= need) return end(w);
        const ban = $("#ban"); ban.hidden = false;
        ban.innerHTML = '<p class="lbl">Leg ' + leg + '</p><p class="pass-n">' + esc(w.name) + '</p><p class="lead">' + T("checks out. Legs <b>", "gooit hem uit. Stand <b>") + pl[0].legs + "–" + pl[1].legs + '</b></p><button class="go" id="nl">' + T("Next leg", "Volgende leg") + "</button>";
        $("#nl").onclick = () => {
          ban.hidden = true; leg++; starter = 1 - starter; turn = starter;
          pl.forEach(p => { p.left = pref.start; p.last = null; p.legDarts = 0; p.missD = 0; p.mom = 0; p.form = null; p.nine = false; });
          beginVisit();
        };
      }
      function end(w){
        stopAll(); stopChase(); phase = "over";
        arena("event", "match", { name: w.name }); arena("unmount");
        const human = pl.filter(p => !p.cpu), pbs = [];
        human.forEach(p => {
          if(p.darts < 9) return;
          const old = D.store.rec(p.idx, "m501"), v = r1(avg(p));
          if(D.store.result("m501", v, p.idx)) pbs.push({ name: p.name, old: old && old.best, v });
        });
        const res = call("progress", "record", [{ mode: "501", start: pref.start, best: pref.best, opponent: OP ? { id: OP.id, name: OP.name, nick: OP.nick[0], level: ["easy", "medium", "hard", "expert", "expert"][OP.lvl] } : null, when: Date.now(),
          players: pl.map(p => ({ idx: p.idx, name: p.name, cpu: p.cpu, won: p === w, legs: p.legs, darts: p.darts, scored: p.scored, avg: r1(avg(p)), n180: p.n180, n140: p.n140, hiCo: p.hiCo,
            coHits: p.legs, coDarts: p.atD, qRight: p.qRight, qAll: p.qAll, pressRight: p.pqRight, pressAll: p.pq, perfect: p.pv, perfectReleases: p.perfect, good: p.good, hits: p.hits,
            legDarts: p.legWon, checkouts: p.checkouts, robin: p.robin, busts: p.busts, bounce: p.bo, offDart: p.offDart })) }]);
        const won = !w.cpu && w.idx === D.store.me;
        const row = (l, f) => "<tr><th>" + l + "</th>" + pl.map(p => "<td>" + f(p) + "</td>").join("") + "</tr>";
        el.innerHTML = '<div class="g-top"><a class="back" href="#spelen">‹ Menu</a><b>' + T("Result", "Uitslag") + '</b><span></span></div>' +
          '<div class="g-body end"><p class="lbl">' + (pref.best > 1 ? "Best of " + pref.best : T("One leg", "Eén leg")) + " · " + pref.start + (OP ? " · " + esc(L(OP.nick)) : "") + '</p>' +
          '<p class="verdict">' + esc(w.name) + (w.cpu ? T(" wins. Rematch?", " wint. Revanche?") : T(" wins!", " wint!")) + '</p><p class="chalk huge">' + pl[0].legs + "–" + pl[1].legs + "</p>" +
          pbs.map(b => '<div class="m-pb"><span>' + T("New personal best", "Nieuw persoonlijk record") + "</span><b>" + esc(b.name) + "</b><em>" + (b.old ? b.old.toFixed(1) + " → " : "") + b.v.toFixed(1) + "</em></div>").join("") +
          '<div class="chalkboard"><table class="st"><thead><tr><th></th>' + pl.map(p => "<th>" + esc(p.name) + "</th>").join("") + "</tr></thead><tbody>" +
          row(T("Average", "Gemiddelde"), p => p.darts ? avg(p).toFixed(1) : "–") + row(T("Darts", "Pijlen"), p => p.darts) + row("180s", p => p.n180) + row("140+", p => p.n140) + row(T("Highest checkout", "Hoogste finish"), p => p.hiCo || "–") +
          row(T("Checkout %<small>legs / darts at a double</small>", "Finish %<small>legs / pijlen op een dubbel</small>"), p => p.atD ? Math.round(p.legs / p.atD * 100) + "%<small> " + p.legs + "/" + p.atD + "</small>" : "–") +
          row(T("Questions right", "Vragen goed"), p => p.cpu ? "–" : p.qRight + "/" + p.qAll) +
          (human.some(p => p.pq) ? row(T("Pressure questions", "Drukvragen"), p => p.cpu ? "–" : p.pqRight + "/" + p.pq) : "") +
          row(T("Clean releases<small>PERFECT / GOOD</small>", "Schone worpen<small>PERFECT / GOOD</small>"), p => p.cpu ? "–" : p.perfect + "<small> / " + p.good + "</small>") +
          (pl.some(p => p.offDart) ? row(T("Off a dart", "Via een pijl"), p => p.offDart) : "") +
          (pl.some(p => p.robin) ? row("Robin Hoods", p => p.robin) : "") +
          (pl.some(p => p.bo) ? row(T("Bounce-outs", "Uitstuiteraars"), p => p.bo) : "") +
          "</tbody></table></div>" +
          '<div class="prog-slot"></div>' +
          '<div class="row"><button class="go" id="again">' + T("Rematch", "Revanche") + '</button><a class="go ghost" href="#spelen">Menu</a></div></div>';
        call("progress", "render", [el.querySelector(".prog-slot"), res]);
        el.querySelector("#again").onclick = start;
        if(pbs.length){ D.sfx.good(); setTimeout(() => alive && call("fx", "party", []), 600); }
        else if(won) D.sfx.good();
      }

      /* for tests and tuning: a read-only peek at the throw */
      D.matchDbg = { get phase(){ return phase; }, get grade(){ return grade; }, get hold(){ return hold && { t0: hold.t0, id: hold.id }; },
        get hand(){ return H.mods(grade, stOf(pl[turn])); }, get st(){ return stOf(pl[turn]); }, get chase(){ return chase && chase.kind; },
        get players(){ return pl.map(p => ({ name: p.name, left: p.left, mom: p.mom, missD: p.missD, perfect: p.perfect, good: p.good, tier: p.tier })); },
        get visitPts(){ return visitPts.map(v => v.pt); }, get aim(){ return aim.slice(); } };

      /* walk-on, then the first visit */
      const ban = $("#ban"); ban.hidden = false; ban.className = "banner walk";
      ban.innerHTML = '<p class="lbl">' + (pref.best > 1 ? "Best of " + pref.best + " legs" : T("One leg", "Eén leg")) + " · " + pref.start + '</p><p class="pass-n">' + esc(pl[0].name) + '</p><p class="vs">vs</p><p class="pass-n">' + esc(pl[1].name) + "</p>" +
        (OP ? '<p class="w-nick">“' + esc(L(OP.nick)) + "” · " + OP.flag + " · " + T("avg ~", "gem ~") + OP.avg + '</p><p class="w-tell">' + esc(L(OP.tell)) + "</p>" : "") +
        '<button class="go" id="gl">Game on</button>';
      arena("event", "walkon", { a: pl[0].name, b: pl[1].name, nick: OP ? L(OP.nick) : "" });
      caller("walkon", pl[0].name, { best: pref.best, start: pref.start, opp: OP ? OP.nick[0] : pl[1].name });
      board(); cancelAnimationFrame(raf); loop();
      $("#gl").onclick = () => { ban.hidden = true; ban.className = "banner"; beginVisit(); };
    }

    setup();
    return () => { alive = false; stopAll(); stopChase(); caller("stop"); arena("unmount"); };
  };
})(window.DART);
