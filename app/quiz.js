/* Quiz: ten questions, every right answer is a "visit": the faster, the higher
   (180 within 4 s, 140, 100, 60). A wrong answer or no answer is a bust (0). */
(function(D){
  const N = 10, TIME = 15;
  const T = D.T;
  const TIERS = [["mix", ["Mix", "Mix"]], ["easy", ["Easy", "Makkelijk"]], ["medium", ["Medium", "Gemiddeld"]], ["hard", ["Hard", "Moeilijk"]]];
  const visit = s => s < 4 ? 180 : s < 7 ? 140 : s < 11 ? 100 : 60;
  let pref = { deck: "alles", tier: "mix" };

  D.quiz = function(el){
    let timer = null, alive = true;
    const stop = () => { clearInterval(timer); timer = null; };

    function setup(){
      el.innerHTML = '<div class="g-top"><a class="back" href="#spelen">‹ Menu</a><b>Quiz</b><span></span></div>' +
        '<div class="g-body"><p class="loading">' + T("Grabbing the darts…", "Pijlen pakken…") + '</p></div>';
      D.qs.load().then(() => alive && draw()).catch(() => { if(alive) el.querySelector(".g-body").innerHTML = '<p class="loading">' + T("The questions won’t load. Try again in a moment.", "De vragen laden niet. Probeer het zo nog eens.") + "</p>"; });
      function draw(){
        const decks = ["alles"].concat(D.qs.decks);
        el.querySelector(".g-body").innerHTML =
          '<h1 class="g-h">Quiz</h1><p class="lead">' + T("Ten questions, " + TIME + " seconds each. Right within 4 seconds is <b>180</b>.", "Tien vragen, " + TIME + " seconden per vraag. Binnen 4 seconden goed is <b>180</b>.") + "</p>" +
          '<div class="facts"><div><b>10</b><span>' + T("questions", "vragen") + "</span></div><div><b>" + TIME + "s</b><span>" + T("per question", "per vraag") + "</span></div><div><b>180</b><span>" + T("right within 4 s", "goed binnen 4 s") + "</span></div></div>" +
          '<h2 class="sub-h">' + T("Topic", "Onderwerp") + '</h2><div class="chips" id="decks">' + decks.map(d => '<button data-v="' + d + '"' + (d === pref.deck ? ' class="on"' : "") + ">" + (d === "alles" ? T("Everything", "Alles") : D.esc(D.qs.name(d))) + "</button>").join("") + "</div>" +
          '<h2 class="sub-h">' + T("Level", "Niveau") + '</h2><div class="chips" id="tiers">' + TIERS.map(([v, l]) => '<button data-v="' + v + '"' + (v === pref.tier ? ' class="on"' : "") + ">" + T(l[0], l[1]) + "</button>").join("") + "</div>" +
          '<p class="count" id="cnt"></p><button class="go" id="go">Game on</button>';
        const upd = () => {
          const c = D.qs.count(pref.deck, pref.tier);
          el.querySelector("#cnt").textContent = T(c + " questions in this set", c + " vragen in deze bak");
          el.querySelector("#go").disabled = c < 4;
        };
        [["#decks", "deck"], ["#tiers", "tier"]].forEach(([id, k]) => el.querySelectorAll(id + " button").forEach(b => b.onclick = () => {
          pref[k] = b.dataset.v; el.querySelectorAll(id + " button").forEach(x => x.classList.toggle("on", x === b)); upd();
        }));
        el.querySelector("#go").onclick = () => play(D.qs.pick(pref.deck, pref.tier, N));
        upd();
        D.fx.stagger(el.querySelector(".g-body"), null, 0);
      }
    }

    function play(list){
      let i = 0, total = 0, log = [];
      el.innerHTML = '<div class="g-top"><a class="back" href="#spelen">‹ Stop</a><b id="qn"></b><span class="chalk sm" id="tot">0</span></div>' +
        '<div class="g-body quiz"><div class="pips" id="pips">' + list.map(() => "<i></i>").join("") + '</div><div class="tbar"><div class="clock" id="clk"><i id="bar"></i></div><span class="secs" id="secs"></span></div>' +
        '<div class="qcard" id="qc"><p class="lbl" id="qd"></p><p class="q" id="q"></p></div><div class="answers" id="ans"></div>' +
        '<div class="after" id="after" hidden><p id="sub"></p><button class="go" id="nx"></button></div></div><div class="visit" id="vis"></div>';
      const $ = s => el.querySelector(s);
      function ask(){
        const q = list[i], t0 = performance.now(); let done = false;
        $("#qn").textContent = T("Question ", "Vraag ") + (i + 1) + " / " + list.length;
        $("#q").textContent = q.q;
        $("#qd").textContent = D.qs.name(q.deck);
        D.fx.bump($("#qc"), "qin");
        el.querySelectorAll("#pips i").forEach((p, j) => p.classList.toggle("cur", j === i));
        $("#after").hidden = true;
        $("#ans").innerHTML = q.opts.map((o, k) => '<button data-k="' + k + '"><i>' + "ABCD"[k] + "</i><span>" + D.esc(o) + "</span></button>").join("");
        D.fx.stagger($("#ans"), null, 1);
        const clk = $("#clk"), secs = $("#secs"); clk.classList.remove("low"); secs.className = "secs"; secs.textContent = TIME;
        const bar = $("#bar"); bar.style.transition = "none"; bar.style.transform = "scaleX(1)";
        requestAnimationFrame(() => requestAnimationFrame(() => { bar.style.transition = "transform " + TIME + "s linear"; bar.style.transform = "scaleX(0)"; }));
        const answer = k => {
          if(done) return; done = true; stop();
          const secs = (performance.now() - t0) / 1000, right = k >= 0 && q.opts[k] === q.a, pts = right ? visit(secs) : 0;
          total += pts; log.push({ q, pick: k >= 0 ? q.opts[k] : null, pts });
          bar.style.transition = "none"; bar.style.transform = getComputedStyle(bar).transform;
          el.querySelectorAll("#ans button").forEach((b, j) => { b.disabled = true; if(q.opts[j] === q.a) b.classList.add("right"); else if(j === k) b.classList.add("wrong"); });
          clk.classList.remove("low");
          const pip = el.querySelectorAll("#pips i")[i]; pip.className = pts === 180 ? "max" : pts ? "ok" : "no";
          if(pts){ D.fx.count($("#tot"), total, { from: total - pts, dur: 500 }); D.fx.bump($("#tot")); D.fx.buzz(10); } else D.fx.buzz([30, 40, 30]);
          const v = $("#vis"); v.className = "visit show" + (pts === 180 ? " max" : pts ? "" : " bust");
          v.innerHTML = pts ? "<b>" + pts + "</b>" + (pts === 180 ? "<span>One hundred and eighty!</span>" : "") : "<b>Bust</b>" + (k < 0 ? "<span>" + T("Too late", "Te laat") + "</span>" : "");
          if(pts) D.sfx.thud(); else D.sfx.bad();
          if(pts === 180){ setTimeout(() => D.sfx.call("One hundred and eighty!"), 120); D.fx.sparks(v); }
          setTimeout(() => { v.className = "visit"; }, 1300);
          $("#sub").innerHTML = (right ? "" : T("Right answer: <b>", "Goed antwoord: <b>") + D.esc(q.a) + "</b>. ") + D.esc(q.sub || "");
          $("#after").hidden = false;
          $("#nx").textContent = i + 1 < list.length ? T("Next", "Volgende") : T("Result", "Uitslag");
          $("#nx").onclick = () => { i++; i < list.length ? ask() : end(); };
        };
        el.querySelectorAll("#ans button").forEach(b => b.onclick = () => answer(+b.dataset.k));
        let left = TIME;
        timer = setInterval(() => {
          left--; secs.textContent = Math.max(0, left);
          if(left <= 4){ clk.classList.add("low"); secs.className = "secs"; void secs.offsetWidth; secs.className = "secs low"; }
          if(left <= 3 && left > 0) D.sfx.tick();
          if(left <= 0) answer(-1);
        }, 1000);
      }
      function end(){
        const nb = D.store.result("quiz", total);
        D.store.result("quiz:" + pref.deck, total);
        const max = log.filter(l => l.pts === 180).length, right = log.filter(l => l.pts).length;
        const verdict = total >= 1440 ? T("World champion stuff.", "Wereldkampioen-niveau.") : total >= 1000 ? T("That’s Premier League.", "Dat is Premier League.") : total >= 600 ? T("Nice pub darts.", "Lekker gegooid in het café.") : T("Still warming up.", "Even inwerpen nog.");
        el.innerHTML = '<div class="g-top"><a class="back" href="#spelen">‹ Menu</a><b>' + T("Result", "Uitslag") + '</b><span></span></div>' +
          '<div class="g-body end"><p class="lbl">' + D.esc(D.store.name) + " · " + (pref.deck === "alles" ? T("Everything", "Alles") : D.esc(D.qs.name(pref.deck))) + '</p><div class="score-hero"><p class="chalk huge" id="big">' + total + '</p><small>' + T("points out of 1800", "punten van de 1800") + "</small></div>" +
          (nb ? '<p class="nb">' + T("New record!", "Nieuw record!") + "</p>" : "") + '<p class="verdict">' + verdict + "</p>" +
          '<div class="stats"><div><b><em data-count="' + right + '">' + right + "</em>/" + log.length + "</b><span>" + T("right", "goed") + '</span></div><div><b data-count="' + max + '">' + max + "</b><span>" + T("times 180", "keer 180") + '</span></div><div><b data-count="' + ((D.store.rec(D.store.me, "quiz") || {}).best || 0) + '">' + ((D.store.rec(D.store.me, "quiz") || {}).best || 0) + "</b><span>record</span></div></div>" +
          '<div class="review">' + log.map(l => '<div class="' + (l.pts === 180 ? "mx" : l.pts ? "ok" : "no") + '"><span>' + D.esc(l.q.q) + "</span><b>" + D.esc(l.q.a) + "</b><i>" + (l.pts || "–") + "</i></div>").join("") + "</div>" +
          '<div class="row"><button class="go" id="again">' + T("Again", "Nog een keer") + '</button><a class="go ghost" href="#spelen">Menu</a></div></div>';
        el.querySelector("#again").onclick = () => play(D.qs.pick(pref.deck, pref.tier, N));
        const g = el.querySelector(".g-body");
        D.fx.count(el.querySelector("#big"), total, { dur: 1300 });
        D.fx.counts(el.querySelector(".stats"), { delay: 500 });
        D.fx.stagger(g, ".verdict, .stats, .review > div, .row", 2);
        if(nb){ D.sfx.good(); setTimeout(() => alive && D.fx.party(), 700); }
        else if(total >= 1000) setTimeout(() => alive && D.fx.sparks(el.querySelector("#big")), 1200);
      }
      ask();
    }

    setup();
    return () => { alive = false; stop(); };
  };
})(window.DART);
