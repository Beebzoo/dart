/* 501 Match: a real leg on the board. Each visit starts with one question; the answer
   sets your hand for all three darts (see hand.js). Touch the board where you want to
   throw (any bed); a loupe above the finger shows the spot zoomed in, sliding fine-tunes
   it (finger at 0.4 speed, mouse 1:1), let go to throw. Or tap an Aim chip, then hold
   anywhere and let go. The dart flies in, the bed lights up, the score pops.
   Against the computer (Makkelijk..Expert) or a friend on the same phone.
   The arena (app/arena.js) gets mount/unmount and events; every call is guarded. */
(function(D){
  const QTIME = 15;
  const T = D.T, L = a => T(a[0], a[1]);
  const arena = (fn, ...a) => { try { if(D.arena && typeof D.arena[fn] === "function") D.arena[fn](...a); } catch(e){ console.warn("arena", fn, e); } };
  let pref = { vs: "cpu", level: "medium", friend: -1, best: 3, start: 501 };

  D.match = function(el){
    let alive = true, raf = 0;
    const timers = new Set();
    const later = (f, ms) => { const t = setTimeout(() => { timers.delete(t); if(alive) f(); }, ms); timers.add(t); return t; };
    const stopAll = () => { timers.forEach(clearTimeout); timers.clear(); cancelAnimationFrame(raf); };

    /* ---------- setup ---------- */
    function setup(){
      const P = D.store.players, me = D.store.me;
      if(pref.friend < 0 || pref.friend === me) pref.friend = P.findIndex((p, i) => i !== me);
      el.innerHTML = '<div class="g-top"><a class="back" href="#spelen">‹ Menu</a><b>501 Match</b><span></span></div>' +
        '<div class="g-body"><h1 class="g-h">501 Match</h1><p class="lead">' + T("Every visit starts with a question. Right answer = <b>steady hand</b>, wrong = the dart pulls into the 1 and the 5. Touch the board where you want the dart, let go to throw.", "Elke beurt begint met een vraag. Goed antwoord = <b>vaste hand</b>, fout = de pijl trekt naar de 1 en de 5. Raak het bord aan waar je de pijl wilt, laat los om te gooien.") + "</p>" +
        '<h2 class="sub-h">' + T("Against", "Tegen") + '</h2><div class="chips" id="vs"><button data-v="cpu">' + T("The computer", "De computer") + '</button><button data-v="friend">' + T("A friend<small>pass the phone</small>", "Een vriend<small>telefoon doorgeven</small>") + "</button></div>" +
        '<div id="vsx"></div>' +
        '<h2 class="sub-h">' + T("Length", "Lengte") + '</h2><div class="chips" id="best">' + [1, 3, 5].map(b => '<button data-v="' + b + '">' + (b === 1 ? T("One leg", "Eén leg") : "Best of " + b) + "<small>" + (b === 1 ? T("quick", "snel") : T("first to ", "eerst naar ") + Math.ceil(b / 2)) + "</small></button>").join("") + "</div>" +
        '<h2 class="sub-h">Start</h2><div class="chips" id="start"><button data-v="501">501</button><button data-v="301">301<small>' + T("short", "kort") + '</small></button></div>' +
        '<button class="go" id="go">Game on</button><p class="count" id="ld"></p></div>';
      const mark = () => {
        el.querySelectorAll("#vs button").forEach(b => b.classList.toggle("on", b.dataset.v === pref.vs));
        el.querySelectorAll("#best button").forEach(b => b.classList.toggle("on", +b.dataset.v === pref.best));
        el.querySelectorAll("#start button").forEach(b => b.classList.toggle("on", +b.dataset.v === pref.start));
        const x = el.querySelector("#vsx");
        if(pref.vs === "cpu"){
          const AV = { easy: "~35", medium: "~55", hard: "~85", expert: "~115" };
          x.innerHTML = '<h2 class="sub-h">' + T("Computer level", "Niveau computer") + '</h2><div class="chips" id="lvl">' + Object.entries(D.hand.CPU).map(([k, c]) => '<button data-v="' + k + '"' + (k === pref.level ? ' class="on"' : "") + ">" + L(c.name) + "<small>" + T("average ", "gemiddelde ") + AV[k] + "</small></button>").join("") + "</div>";
          x.querySelectorAll("#lvl button").forEach(b => b.onclick = () => { pref.level = b.dataset.v; mark(); });
        } else {
          x.innerHTML = '<h2 class="sub-h">' + T("Who?", "Wie?") + "</h2>" + '<div class="chips" id="fr">' + P.map((p, i) => i === me ? "" : '<button data-v="' + i + '"' + (i === pref.friend ? ' class="on"' : "") + ">" + D.esc(p) + "</button>").join("") + "</div>";
          x.querySelectorAll("#fr button").forEach(b => b.onclick = () => { pref.friend = +b.dataset.v; mark(); });
        }
      };
      el.querySelectorAll("#vs button").forEach(b => b.onclick = () => { pref.vs = b.dataset.v; mark(); });
      el.querySelectorAll("#best button").forEach(b => b.onclick = () => { pref.best = +b.dataset.v; mark(); });
      el.querySelectorAll("#start button").forEach(b => b.onclick = () => { pref.start = +b.dataset.v; mark(); });
      mark();
      const go = el.querySelector("#go");
      go.onclick = () => {
        go.disabled = true; el.querySelector("#ld").textContent = T("Loading questions…", "Vragen laden…");
        D.qs.load().then(() => alive && start()).catch(() => { go.disabled = false; el.querySelector("#ld").textContent = T("The questions won\u2019t load. Try again in a moment.", "De vragen laden niet. Probeer het zo nog eens."); });
      };
    }

    /* ---------- the match ---------- */
    function start(){
      const me = D.store.me, P = D.store.players;
      const mk = (name, idx, cpu) => ({ name, idx, cpu, left: pref.start, legs: 0, darts: 0, legDarts: 0, scored: 0, n180: 0, n140: 0, hiCo: 0, atD: 0, bo: 0, qRight: 0, qAll: 0, pq: 0, pqRight: 0, last: null });
      const pl = [mk(P[me], me, false), pref.vs === "cpu" ? mk("Computer", -1, true) : mk(P[pref.friend], pref.friend, false)];
      const need = Math.ceil(pref.best / 2);
      let leg = 1, starter = 0, turn = 0, phase = "idle", grade = 0, ph = 0, visit = [], visitStart = 0, aim = D.board.target({ m: 3, n: 20 }), hold = null, locked = null, t0 = performance.now();

      arena("unmount");
      el.innerHTML = '<div class="g-top"><a class="back" href="#spelen">‹ Stop</a><b id="legx"></b><span></span></div>' +
        '<div class="g-body m">' +
        '<div class="sb" id="sb">' + pl.map((p, i) => '<div class="sbp" data-i="' + i + '"><i class="dot"></i><b class="nm">' + D.esc(p.name) + (p.cpu ? "<small>" + L(D.hand.CPU[pref.level].name) + "</small>" : "") + '</b><span class="lg"></span><span class="chalk lf"></span><span class="sbx"></span></div>').join("") + "</div>" +
        '<div class="m-board" id="mb">' + D.board.svg({ cls: "big" }) + '<div class="handtag" id="ht"></div>' +
        '<div class="loupe" id="lp" hidden>' + D.board.svg({ cls: "lp" }) + '<span class="lp-l" id="lpl"></span></div></div>' +
        '<div class="m-info"><div class="m-fin" id="fin"></div><div class="slots" id="slots"></div><div class="aimchips" id="ac"></div><p class="m-hint" id="hint"></p></div>' +
        '<div class="sheet" id="sheet" hidden></div><div class="banner" id="ban" hidden></div></div><div class="visit" id="vis"></div>';
      const $ = s => el.querySelector(s), svg = el.querySelector(".m-board .board"), NS = "http://www.w3.org/2000/svg";
      const lp = $("#lp"), lsvg = lp.querySelector(".board"), lpl = $("#lpl");
      arena("mount", el.querySelector(".g-body.m"));
      const mkAim = (r, w) => { const g = document.createElementNS(NS, "g"); g.setAttribute("class", "aim"); g.style.display = "none";
        g.innerHTML = '<circle class="anchor" r="' + w * 1.6 + '"/><g class="cross"><circle r="' + r + '" stroke-width="' + w + '"/><circle r="' + w + '" class="c0"/>' +
          ["-1.7,-0.5", "0.5,1.7"].map(v => { const [a, b] = v.split(",").map(Number); return '<line x1="' + a * r + '" x2="' + b * r + '" stroke-width="' + w + '"/><line y1="' + a * r + '" y2="' + b * r + '" stroke-width="' + w + '"/>'; }).join("") + "</g>";
        return g; };
      const aimG = mkAim(10, 1.6), aimL = mkAim(3.4, 0.45);
      svg.appendChild(aimG); lsvg.appendChild(aimL);
      const cross = aimG.querySelector(".cross"), anchor = aimG.querySelector(".anchor"), crossL = aimL.querySelector(".cross"), anchorL = aimL.querySelector(".anchor");

      const avg = p => p.darts ? (p.scored / p.darts * 3) : 0;
      const onFinish = left => left <= 170 && D.co.possible(left);
      const atDouble = left => (left <= 40 && left % 2 === 0) || left === 50;
      const lab = d => d.bo ? T("Bounce-out", "Eruit") : D.co.label(d);
      function board(){
        $("#legx").textContent = "Leg " + leg + (pref.best > 1 ? " · best of " + pref.best : "");
        pl.forEach((p, i) => {
          const row = el.querySelector('.sbp[data-i="' + i + '"]');
          row.classList.toggle("on", i === turn);
          row.querySelector(".lg").textContent = pref.best > 1 ? p.legs : "";
          row.querySelector(".lf").textContent = p.left;
          const r = p.left <= 170 && D.co.route(p.left);
          row.querySelector(".sbx").innerHTML = (r ? '<em>' + r.map(D.co.label).join(" ") + "</em>" : "") + "<span>" + T("avg ", "gem ") + avg(p).toFixed(1) + (p.last != null ? T(" · last ", " · vorige ") + p.last : "") + (p.legDarts ? " · " + p.legDarts + (p.legDarts === 1 ? T(" dart", " pijl") : T(" darts", " pijlen")) : "") + "</span>";
        });
        $("#slots").innerHTML = [0, 1, 2].map(i => '<span class="' + (visit[i] ? "used" + (visit[i].bo ? " bo" : "") : "") + '">' + (visit[i] ? lab(visit[i]) : "") + "</span>").join("");
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
        $("#hint").textContent = locked ? T("Aiming at " + D.co.label(locked) + ": hold anywhere on the board, let go to throw. Tap it again to aim freely.", "Je mikt op " + D.co.label(locked) + ": houd je vinger op het bord, loslaten is gooien. Tik nog eens om vrij te mikken.")
          : T("Touch where you want to throw. Slide to fine-tune (watch the loupe), let go to throw.", "Raak aan waar je wilt gooien. Schuif om bij te stellen (kijk in de loep), loslaten is gooien.");
      }

      /* the crosshair: where you aim plus the wobble of your hand; the loupe zooms in on it */
      const LW = 62;
      function loop(){
        raf = requestAnimationFrame(loop);
        if(phase !== "throw"){ aimG.style.display = "none"; if(!lp.hidden) lp.hidden = true; return; }
        aimG.style.display = "";
        const s = (performance.now() - t0) / 1000, w = D.hand.wobble(aim, s, grade, ph);
        const at = "translate(" + aim[0].toFixed(2) + " " + aim[1].toFixed(2) + ")", ct = "translate(" + (aim[0] + w[0]).toFixed(2) + " " + (aim[1] + w[1]).toFixed(2) + ")";
        anchor.setAttribute("transform", at); cross.setAttribute("transform", ct);
        if(hold){
          aimL.style.display = "";
          anchorL.setAttribute("transform", at); crossL.setAttribute("transform", ct);
          lsvg.setAttribute("viewBox", (aim[0] - LW / 2).toFixed(2) + " " + (aim[1] - LW / 2).toFixed(2) + " " + LW + " " + LW);
          const d = D.board.hit(aim[0], aim[1]);
          lpl.textContent = d.n === 0 ? T("Off the board", "Naast het bord") : D.co.label(d);
        }
      }
      const mb = $("#mb"), unit = () => 480 / svg.getBoundingClientRect().width;
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
        const mouse = e.pointerType === "mouse";
        if(!locked) aim = clampAim(D.board.toMM(svg, e.clientX, e.clientY));
        hold = { x: e.clientX, y: e.clientY, a: aim.slice(), id: e.pointerId, gain: mouse ? (locked ? 0.5 : 1) : 0.4, hist: [] };
        hold.hist.push([performance.now(), e.clientX, e.clientY, aim[0], aim[1]]);
        aimG.classList.add("hold");
        lsvg.querySelector(".darts").innerHTML = svg.querySelector(".darts").innerHTML;
        lp.hidden = false; placeLoupe(e.clientX, e.clientY);
      });
      mb.addEventListener("pointermove", e => {
        if(!hold || e.pointerId !== hold.id) return;
        const u = unit() * hold.gain;
        aim = clampAim([hold.a[0] + (e.clientX - hold.x) * u, hold.a[1] + (e.clientY - hold.y) * u]);
        const now = performance.now();
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
        const up = base[2] - e.clientY, flick = up > 30 && Math.abs(e.clientX - base[1]) < up && now - base[0] < 450;
        if(flick) aim = [base[3], base[4]];
        hold = null; aimG.classList.remove("hold"); lp.hidden = true;
        if(phase === "throw") human(flick);
      };
      mb.addEventListener("pointerup", up);
      mb.addEventListener("pointercancel", () => { hold = null; aimG.classList.remove("hold"); lp.hidden = true; });

      /* ---------- one dart ---------- */
      function shake(){ svg.classList.remove("shake"); void svg.getBoundingClientRect(); svg.classList.add("shake"); later(() => svg.classList.remove("shake"), 260); }
      function pop(pt, d){
        const e = document.createElement("div"), v = D.co.val(d);
        e.className = "m-pop" + (d.bo ? " bo" : d.n === 0 ? " miss" : d.m === 3 || (d.n === 25 && d.m === 2) ? " big" : "");
        e.style.left = Math.max(12, Math.min(88, (pt[0] + 240) / 480 * 100)) + "%"; e.style.top = ((pt[1] + 240) / 480 * 100) + "%";
        e.innerHTML = d.bo ? "<b>" + T("Bounce-out!", "Eruit gestuiterd!") + "</b>" : d.n === 0 ? "<b>" + D.co.label(d) + "</b>" : "<b>" + D.co.label(d) + "</b>" + (d.m > 1 || d.n === 25 ? "<span>" + v + "</span>" : "");
        mb.appendChild(e);
        setTimeout(() => e.remove(), 1000);
      }
      /* throw: the dart flies in, then lands; next() gets null (more darts) or the visit's end */
      function throwDart(p, pt, bo, ms, next){
        if(atDouble(p.left)) p.atD++;
        svg.querySelectorAll(".bed.tgt").forEach(x => x.remove());
        D.sfx.whoosh();
        D.board.throwAt(svg, pt[0], pt[1], visit.length + 1, { ms, bounce: bo }, () => { if(alive) next(land(p, pt, bo)); });
      }
      function land(p, pt, bo){
        const d = bo ? { m: 1, n: 0, bo: true } : D.board.hit(pt[0], pt[1]);
        visit.push(d); p.darts++; p.legDarts++; if(bo) p.bo++;
        if(bo) D.sfx.wire(); else { D.sfx.thud(d.n === 0 ? 0.5 : 1); shake(); D.board.light(svg, d, "flash", 750); }
        pop(pt, d);
        arena("event", "dart", { label: lab(d), score: D.co.val(d) });
        const st = D.co.play(visitStart, visit);
        if(st.state !== "bust") p.left = st.state === "out" ? 0 : st.left;
        board();
        if(st.state === "out") return endVisit(p, "out");
        if(st.state === "bust") return endVisit(p, "bust");
        if(visit.length === 3) return endVisit(p, "done");
        return null;
      }
      function human(flick){
        const p = pl[turn], s = (performance.now() - t0) / 1000;
        phase = "flying"; locked = null; $("#ac").querySelectorAll("button").forEach(b => b.disabled = true);
        const pt = D.hand.release(aim, s, grade, ph);
        throwDart(p, pt, D.hand.bounce(pt, grade), flick ? 170 : 230, res => {
          if(res === null) later(() => { phase = "throw"; chips(); hint(); finish(); }, 380);
        });
      }

      /* ---------- visits ---------- */
      function beginVisit(){
        const p = pl[turn];
        visit = []; visitStart = p.left; locked = null; D.board.clear(svg); board();
        $("#ac").innerHTML = ""; $("#ht").className = "handtag"; $("#fin").innerHTML = ""; $("#fin").className = "m-fin";
        arena("event", "turn", { name: p.name, cpu: p.cpu });
        if(p.cpu){
          phase = "cpu"; $("#hint").textContent = T("The computer is throwing…", "De computer gooit…");
          finish();
          const one = () => {
            const k = 3 - visit.length, t = D.hand.cpuAim(p.left, k);
            throwDart(p, D.hand.cpuThrow(D.board.target(t), pref.level), false, 260, res => { if(res === null) later(one, 700); });
          };
          later(one, 800);
          return;
        }
        const other = pl[1 - turn];
        if(!other.cpu && pl.some(x => x.darts > 0)) handover(p, ask); else ask();
      }
      function handover(p, next){
        phase = "pass";
        const sh = $("#sheet");
        sh.hidden = false; sh.className = "sheet pass";
        sh.innerHTML = '<p class="lbl">' + T("Pass the phone", "Telefoon doorgeven") + '</p><p class="pass-n">' + D.esc(p.name) + '</p><p class="lead">' + T("to the oche, needs <b>", "aan de oche, nog <b>") + p.left + '</b></p><button class="go" id="ok">' + T("I’m ready", "Ik sta klaar") + "</button>";
        $("#ok").onclick = () => { sh.hidden = true; next(); };
      }
      function ask(){
        const p = pl[turn], q = D.qs.pick("alles", "mix", 1)[0], pressure = onFinish(p.left), r = pressure && D.co.route(p.left);
        phase = "question";
        $("#hint").textContent = "";
        if(pressure) p.pq++;
        const sh = $("#sheet");
        sh.hidden = false; sh.className = "sheet" + (pressure ? " pressure" : "");
        sh.innerHTML = '<div class="clock"><i id="qbar"></i></div>' +
          (pressure ? '<div class="pq"><span>' + T("Pressure question", "Drukvraag") + "</span><b>" + p.left + "</b><em>" + r.map(D.co.label).join(" › ") + "</em></div>" : "") +
          '<p class="lbl">' + D.esc(p.name) + (pressure ? T(", on a finish: a right answer steadies the hand", ", op een finish: goed antwoord geeft een vaste hand") : T(", your question · needs ", ", jouw vraag · nog ") + p.left) + '</p><p class="q">' + D.esc(q.q) + '</p><div class="answers">' +
          q.opts.map((o, k) => '<button data-k="' + k + '"><i>' + "ABCD"[k] + "</i><span>" + D.esc(o) + "</span></button>").join("") + '</div><div class="verdict-h" id="vh"></div>';
        const bar = $("#qbar");
        requestAnimationFrame(() => requestAnimationFrame(() => { bar.style.transition = "transform " + QTIME + "s linear"; bar.style.transform = "scaleX(0)"; }));
        let done = false;
        const tm = later(() => answer(-1), QTIME * 1000);
        const answer = k => {
          if(done) return; done = true; clearTimeout(tm); timers.delete(tm);
          const pick = k >= 0 ? q.opts[k] : null;
          grade = pick === q.a ? 0 : pick == null ? 3 : 1 + Math.max(0, q.o.indexOf(pick));
          p.qAll++; if(grade === 0){ p.qRight++; if(pressure) p.pqRight++; }
          bar.style.transition = "none"; bar.style.transform = getComputedStyle(bar).transform;
          sh.querySelectorAll(".answers button").forEach((b, j) => { b.disabled = true; if(q.opts[j] === q.a) b.classList.add("right"); else if(j === k) b.classList.add("wrong", "g" + grade); });
          const H = D.hand.HANDS[grade];
          $("#vh").innerHTML = '<b class="h' + grade + '">' + L(H.name) + "</b><span>" + (pick == null ? T("Too late. ", "Te laat. ") : "") + L(H.say) + (grade ? T(" It was: ", " Goed was: ") + D.esc(q.a) + "." : "") + "</span>";
          grade === 0 ? D.sfx.good() : D.sfx.bad();
          later(() => throwPhase(), grade === 0 ? 1100 : 1900);
        };
        sh.querySelectorAll(".answers button").forEach(b => b.onclick = () => answer(+b.dataset.k));
      }
      function throwPhase(){
        $("#sheet").hidden = true;
        ph = Math.random() * 6.28; t0 = performance.now();
        const ht = $("#ht"); ht.textContent = L(D.hand.HANDS[grade].name); ht.className = "handtag show h" + grade;
        phase = "throw"; chips(); hint(); finish();
      }
      function endVisit(p, how){
        phase = "after"; $("#ac").innerHTML = ""; finish();
        const total = how === "bust" ? 0 : visitStart - p.left;
        if(how === "bust") p.left = visitStart;
        p.scored += total; p.last = how === "bust" ? 0 : total;
        if(total === 180) p.n180++; else if(total >= 140) p.n140++;
        board();
        arena("event", "visit", { total, name: p.name });
        const v = $("#vis"); v.className = "visit show" + (total === 180 ? " max" : how === "bust" ? " bust" : "");
        v.innerHTML = how === "bust" ? "<b>Bust</b>" : "<b>" + total + "</b>" + (total === 180 ? "<span>One hundred and eighty!</span>" : how === "out" ? "<span>Game shot!</span>" : "");
        later(() => { v.className = "visit"; }, 1300);
        if(total === 180){ D.sfx.call("One hundred and eighty!"); arena("event", "180", { name: p.name }); }
        else if(how === "out") D.sfx.call(p.legs + 1 >= need ? "Game shot, and the match!" : "Game shot, and the leg!");
        else if(how === "bust"){ D.sfx.call("No score"); arena("event", "bust", { name: p.name }); }
        else if(total >= 100 && !p.cpu) D.sfx.call(total === 100 ? "Ton" : String(total));
        if(how === "out"){
          p.hiCo = Math.max(p.hiCo, visitStart); p.legs++;
          arena("event", "checkout", { score: visitStart, name: p.name });
          arena("event", "leg", { name: p.name, legs: [pl[0].legs, pl[1].legs] });
          return later(() => legOver(p), 1500);
        }
        later(() => { turn = 1 - turn; beginVisit(); }, p.cpu ? 1500 : 1700);
      }
      function legOver(w){
        if(w.legs >= need) return end(w);
        const ban = $("#ban"); ban.hidden = false;
        ban.innerHTML = '<p class="lbl">Leg ' + leg + '</p><p class="pass-n">' + D.esc(w.name) + '</p><p class="lead">' + T("checks out. Legs <b>", "gooit hem uit. Stand <b>") + pl[0].legs + "–" + pl[1].legs + '</b></p><button class="go" id="nl">' + T("Next leg", "Volgende leg") + "</button>";
        $("#nl").onclick = () => {
          ban.hidden = true; leg++; starter = 1 - starter; turn = starter;
          pl.forEach(p => { p.left = pref.start; p.last = null; p.legDarts = 0; });
          beginVisit();
        };
      }
      function end(w){
        stopAll(); phase = "over";
        arena("event", "match", { name: w.name }); arena("unmount");
        const human = pl.filter(p => !p.cpu);
        human.forEach(p => { if(p.darts >= 9) D.store.result("m501", Math.round(avg(p) * 10) / 10, p.idx); });
        const won = !w.cpu && w.idx === D.store.me;
        const row = (l, f) => "<tr><th>" + l + "</th>" + pl.map(p => "<td>" + f(p) + "</td>").join("") + "</tr>";
        el.innerHTML = '<div class="g-top"><a class="back" href="#spelen">‹ Menu</a><b>' + T("Result", "Uitslag") + '</b><span></span></div>' +
          '<div class="g-body end"><p class="lbl">' + (pref.best > 1 ? "Best of " + pref.best : T("One leg", "Eén leg")) + " · " + pref.start + '</p>' +
          '<p class="verdict">' + D.esc(w.name) + (w.cpu ? T(" wins. Rematch?", " wint. Revanche?") : T(" wins!", " wint!")) + '</p><p class="chalk huge">' + pl[0].legs + "–" + pl[1].legs + "</p>" +
          '<div class="chalkboard"><table class="st"><thead><tr><th></th>' + pl.map(p => "<th>" + D.esc(p.name) + "</th>").join("") + "</tr></thead><tbody>" +
          row(T("Average", "Gemiddelde"), p => avg(p).toFixed(1)) + row(T("Darts", "Pijlen"), p => p.darts) + row("180s", p => p.n180) + row("140+", p => p.n140) + row(T("Highest checkout", "Hoogste finish"), p => p.hiCo || "–") +
          row(T("Checkout %<small>legs / darts at a double</small>", "Finish %<small>legs / pijlen op een dubbel</small>"), p => p.atD ? Math.round(p.legs / p.atD * 100) + "%<small> " + p.legs + "/" + p.atD + "</small>" : "–") +
          row(T("Questions right", "Vragen goed"), p => p.cpu ? "–" : p.qRight + "/" + p.qAll) +
          (human.some(p => p.pq) ? row(T("Pressure questions", "Drukvragen"), p => p.cpu ? "–" : p.pqRight + "/" + p.pq) : "") +
          (pl.some(p => p.bo) ? row(T("Bounce-outs", "Uitstuiteraars"), p => p.bo) : "") +
          "</tbody></table></div>" +
          '<div class="row"><button class="go" id="again">' + T("Rematch", "Revanche") + '</button><a class="go ghost" href="#spelen">Menu</a></div></div>';
        el.querySelector("#again").onclick = start;
        if(won) D.sfx.good();
      }

      /* walk-on, then the first visit */
      const ban = $("#ban"); ban.hidden = false; ban.className = "banner walk";
      ban.innerHTML = '<p class="lbl">' + (pref.best > 1 ? "Best of " + pref.best + " legs" : T("One leg", "Eén leg")) + " · " + pref.start + '</p><p class="pass-n">' + D.esc(pl[0].name) + '</p><p class="vs">vs</p><p class="pass-n">' + D.esc(pl[1].name) + '</p><button class="go" id="gl">Game on</button>';
      arena("event", "walkon", { a: pl[0].name, b: pl[1].name });
      board(); cancelAnimationFrame(raf); loop();
      $("#gl").onclick = () => { ban.hidden = true; ban.className = "banner"; D.sfx.call("Game on!"); beginVisit(); };
    }

    setup();
    return () => { alive = false; stopAll(); arena("unmount"); };
  };
})(window.DART);
