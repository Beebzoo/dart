/* DART shell: the router, the three tabs (Play, Table, Me) and shared helpers.
   Routes: #spelen  #quiz  #checkout  #match  #stand  #ik  #stats(-player index)
   Every text goes through T(english, dutch); the language is set on Me (default English). */
(function(D){
  const app = document.getElementById("app"), tabs = document.getElementById("tabs");
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  D.esc = esc;
  const T = D.T, fx = D.fx;
  D.go = h => { if(location.hash === h) route(); else location.hash = h; };

  /* a player's round badge: the first letter in their colour */
  D.av = i => '<i class="av p' + (i % 3) + '">' + esc((D.store.players[i] || "?").trim().charAt(0).toUpperCase() || "?") + "</i>";

  /* the top bar of a tab: wordmark and who is playing */
  D.top = () => '<header class="top"><a class="mark" href="#spelen"><b>DART</b><i></i></a>' +
    '<a class="who" href="#ik"><span><small>' + T("At the oche", "Aan de oche") + "</small><b>" + esc(D.store.name) + "</b></span>" + D.av(D.store.me) + "</a></header>";

  /* "Checkout of the day": the same number all day, for everyone */
  function daily(){
    const d = new Date(), seed = d.getFullYear() * 400 + d.getMonth() * 31 + d.getDate();
    const ok = []; for(let n = 61; n <= 170; n++) if(D.co.possible(n)) ok.push(n);
    return ok[(seed * 2654435761 >>> 0) % ok.length];
  }
  function greet(){
    const h = new Date().getHours();
    return h < 6 ? T("Still up", "Nog wakker") : h < 12 ? T("Good morning", "Goedemorgen") : h < 18 ? T("Good afternoon", "Goedemiddag") : T("Good evening", "Goedenavond");
  }

  const ICON = {
    quiz: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 7.5A3.5 3.5 0 0 1 9.5 4h13A3.5 3.5 0 0 1 26 7.5v10a3.5 3.5 0 0 1-3.5 3.5H15l-6 5v-5h0.5A3.5 3.5 0 0 1 6 17.5z"/><path d="M13.2 10.2a3 3 0 1 1 4.1 2.8c-.8.4-1.3 1-1.3 1.8v.4"/><circle cx="16" cy="18" r=".6" fill="currentColor"/></svg>',
    match: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="13" cy="19" r="9"/><circle cx="13" cy="19" r="4.5"/><circle cx="13" cy="19" r=".8" fill="currentColor"/><path d="M13 19 26 6"/><path d="M22 5.5 26 6l.5 4"/><path d="M23.5 4 28 3.5 27.5 8"/></svg>',
    co: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="4" width="22" height="24" rx="4"/><path d="M10 10h12"/><circle cx="11" cy="16" r=".9" fill="currentColor"/><circle cx="16" cy="16" r=".9" fill="currentColor"/><circle cx="21" cy="16" r=".9" fill="currentColor"/><circle cx="11" cy="21" r=".9" fill="currentColor"/><circle cx="16" cy="21" r=".9" fill="currentColor"/><path d="M19.5 21h3"/></svg>',
    play: '<svg viewBox="0 0 16 16"><path d="M4 2.5v11l9.5-5.5z"/></svg>',
    lock: '<svg viewBox="0 0 16 16"><rect x="3" y="7" width="10" height="7" rx="2"/><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2"/></svg>'
  };
  /* the best score on a mode card */
  function best(key){
    const r = D.store.rec(D.store.me, key);
    return r && r.plays ? '<small class="mr">' + T("Best ", "Record ") + r.best + (key === "m501" ? T(" avg", " gem.") : "") + "</small>" : '<small class="mr new">' + T("Not played yet", "Nog niet gespeeld") + "</small>";
  }

  function spelen(el){
    const n = daily(), r = D.co.route(n);
    const mode = (cls, href, icon, name, txt, rec) => '<a class="mode ' + cls + '" href="' + href + '"><span class="mi">' + icon + "</span><b>" + name + '</b><span class="md">' + txt + "</span>" + rec + "<i>" + ICON.play + "</i></a>";
    el.innerHTML = D.top() +
      '<section class="hero"><div class="hero-board">' + D.board.svg({ cls: "spin" }) + '</div>' +
      '<p class="hi">' + greet() + ", " + esc(D.store.name) + '</p><h1>Game on.</h1><p class="tag">' + T("Darts quiz for three. Pick a game.", "Dartsquiz voor drie. Kies een spel.") + "</p></section>" +
      '<div class="modes">' +
        mode("m-quiz", "#quiz", ICON.quiz, "Quiz", T("Ten questions, the faster you answer the more you score. Can you hit 180?", "Tien vragen, snel antwoorden is meer punten. Haal je de 180?"), best("quiz")) +
        mode("m-match", "#match", ICON.match, "501 Match", T("A real leg. A right answer gives a steady hand, a wrong one pulls into the 1.", "Een echte leg. Goed antwoord is een vaste hand, fout trekt naar de 1."), best("m501")) +
        mode("m-co", "#checkout", ICON.co, "Checkout", T("Check out the score on a double. Ten in a row or against the clock.", "Gooi de score uit, op een dubbel. Tien stuks of tegen de klok."), best("co10")) +
      "</div>" +
      '<button class="cod" id="cod"><span class="cod-board">' + D.board.svg() + '</span><span class="cod-txt"><span class="lbl">' + T("Checkout of the day", "Checkout van de dag") + "</span>" +
        '<span class="cod-r" hidden>' + r.map((d, i) => '<em style="--i:' + i + '">' + D.co.label(d) + "</em>").join("") + '</span><span class="cod-t">' + T("Tap to see how", "Tik om te zien hoe") + '</span></span><b class="chalk">' + n + "</b></button>" +
      '<h2 class="soon-h">' + T("Coming soon", "Binnenkort") + '</h2><div class="soon">' +
        "<div><i>" + ICON.lock + "</i><b>" + T("Who am I?", "Wie is het?") + "</b><span>" + T("Guess the player from nickname, walk-on and career", "Raad de speler uit bijnaam, walk-on en carrière") + "</span></div>" +
        "<div><i>" + ICON.lock + "</i><b>" + T("Worlds predictor", "WK-poule") + "</b><span>" + T("Fill in the Ally Pally bracket, the three of you", "Vul het schema van Ally Pally in, met z’n drieën") + "</span></div>" +
      "</div>";
    fx.stagger(el.querySelector(".modes"), null, 3);
    fx.stagger(el, ".cod, .soon-h, .soon > div", 6);
    const timers = [];
    const later = (f, ms) => timers.push(setTimeout(f, ms));
    /* the hero board settles, then one dart goes into the treble 20 */
    const hb = el.querySelector(".hero-board .board");
    later(() => D.board.mark(hb, { m: 3, n: 20 }, 1), fx.calm() ? 0 : 1250);
    /* tap: the darts of the route land one by one and the score counts down to zero */
    el.querySelector("#cod").onclick = e => {
      const b = e.currentTarget; if(b.classList.contains("open")) return;
      b.classList.add("open"); b.querySelector(".cod-r").hidden = false; b.querySelector(".cod-t").hidden = true;
      const sv = b.querySelector(".cod-board .board"), num = b.querySelector(".chalk");
      let left = n;
      r.forEach((d, i) => later(() => {
        D.board.mark(sv, d, i + 1); D.sfx.thud(); fx.buzz(8);
        const from = left; left -= D.co.val(d);
        fx.count(num, left, { from, dur: 300 }); fx.bump(num);
        if(i === r.length - 1) later(() => {
          num.textContent = n; num.classList.add("out"); fx.bump(num); fx.sparks(num); D.sfx.good();
          b.querySelector(".cod-txt").insertAdjacentHTML("beforeend", '<span class="cod-gs">' + T("Game shot!", "Game shot!") + "</span>");
        }, 520);
      }, fx.calm() ? 0 : i * 380 + 120));
    };
    return () => timers.forEach(clearTimeout);
  }

  /* head-to-head cards between the three friends (from the match log) */
  function rivals(){
    const P = D.store.players, out = [];
    for(let a = 0; a < P.length; a++) for(let b = a + 1; b < P.length; b++){
      const h = D.progress.h2h(a, b), last = h.list[h.list.length - 1], n = h.list.length;
      const side = (i, w, lead) => '<span class="pg-rv-p' + (lead ? " lead" : "") + '">' + D.av(i) + "<b>" + esc(P[i]) + '</b><small>' + T("LV ", "LV ") + D.progress.info(i).lv + '</small><em data-count="' + w + '">' + w + "</em></span>";
      let foot;
      if(!n) foot = T("No match yet. Pick “A friend” in the 501 Match.", "Nog geen match. Kies “Een vriend” in de 501 Match.");
      else {
        const lw = last.w ? a : b;
        let k = 0; for(let j = n - 1; j >= 0 && !!h.list[j].w === !!last.w; j--) k++;
        foot = esc(P[lw]) + T(" won the last one ", " won de laatste met ") + (last.w ? last.l[0] + "–" + last.l[1] : last.l[1] + "–" + last.l[0]) + " · " + D.progress.ago(last.t) +
          (k >= 2 ? "<br><b>" + esc(P[lw]) + T(" has won " + k + " in a row", " won er " + k + " op rij") + "</b>" : "");
      }
      const form = h.list.slice(-5).map(e => '<i class="p' + ((e.w ? a : b) % 3) + '" title="' + esc(P[e.w ? a : b]) + '"></i>').join("");
      out.push('<a class="pg-riv" href="#stats-' + a + '"><div class="pg-rv-top">' + side(a, h.w, h.w > h.l) + '<span class="pg-rv-vs">v</span>' + side(b, h.l, h.l > h.w) + "</div>" +
        (form ? '<div class="pg-form"><span>' + T("Form", "Vorm") + "</span>" + form + "</div>" : "") + '<p class="pg-rv-f">' + foot + "</p></a>");
    }
    return out.join("");
  }

  function stand(el){
    const P = D.store.players, cols = [["m501", T("501 avg", "501 gem.")], ["quiz", "Quiz"], ["co10", "Checkout"], ["coklok", T("Clock", "Klok")]];
    const best = k => Math.max(0, ...P.map((p, i) => (D.store.rec(i, k) || {}).best || 0));
    let rows = "";
    P.forEach((p, i) => {
      const plays = cols.reduce((a, [k]) => a + ((D.store.rec(i, k) || {}).plays || 0), 0);
      const lv = D.progress.info(i);
      rows += '<tr' + (i === D.store.me ? ' class="me"' : "") + '><th><a class="pl" href="#stats-' + i + '">' + D.av(i) + "<span>" + esc(p) + '<small class="pg-lvs"><em>' + T("LV ", "LV ") + lv.lv + "</em>" + esc(lv.title) + "</small></span></a></th>" +
        cols.map(([k]) => { const r = D.store.rec(i, k), v = r ? r.best : 0; return '<td' + (v && v === best(k) ? ' class="top1"' : "") + ">" + (r ? '<span data-count="' + v + '"' + (v % 1 ? ' data-dec="1"' : "") + ">" + v + "</span>" : "–") + "</td>"; }).join("") + "</tr>";
    });
    const me = D.store.me, decks = ["spelregels", "legendes", "modern", "toernooien", "bijnamen", "nederland"];
    const mine = decks.map(d => { const r = D.store.rec(me, "quiz:" + d); return '<div><span>' + D.qs.name(d) + "</span><b" + (r ? ' data-count="' + r.best + '">' + r.best : ">–") + '</b><i style="--p:' + (r ? Math.min(1, r.best / 1800).toFixed(3) : 0) + '"></i></div>'; }).join("");
    el.innerHTML = D.top() + '<h1 class="pt">' + T("Table", "Stand") + '</h1>' +
      '<p class="lead">' + T('Best scores on this phone. Pass the phone and pick who is throwing on <a href="#ik">Me</a>.', 'Beste scores op deze telefoon. Geef de telefoon door en kies op <a href="#ik">Ik</a> wie er gooit.') + '</p>' +
      '<div class="chalkboard"><table class="st"><thead><tr><th></th>' + cols.map(c => "<th>" + c[1] + "</th>").join("") + "</tr></thead><tbody>" + rows + "</tbody></table></div>" +
      '<p class="note">' + T("501 avg: your best three-dart average in a match (at least nine darts). Quiz: max 1800 (ten times 180). Checkout: ten scores, max 30. Clock: as many points as you get in 60 seconds.",
        "501 gem.: je beste driepijlsgemiddelde in een match (minstens negen pijlen). Quiz: max 1800 (tien keer 180). Checkout: tien stuks, max 30. Klok: zoveel punten als je haalt in 60 seconden.") + '</p>' +
      '<h2 class="sub-h">' + T("Rivals", "Rivalen") + '</h2><div class="pg-rivals">' + rivals() + "</div>" +
      '<a class="pg-statlink" href="#stats-' + D.store.me + '"><span>' + T("Stats, trophies and the heatmap", "Statistieken, prijzen en de heatmap") + "</span><i>›</i></a>" +
      '<h2 class="sub-h">' + esc(D.store.name) + T(", quiz by topic", ", quiz per onderwerp") + '</h2><div class="decks-best">' + mine + "</div>";
    fx.stagger(el, ".chalkboard, .note, .sub-h, .pg-riv, .pg-statlink", 1);
    fx.stagger(el.querySelector(".st tbody"), null, 2);
    fx.stagger(el.querySelector(".decks-best"), null, 6);
    fx.counts(el, { delay: 250 });
  }

  function ik(el){
    const P = D.store.players, lang = D.store.lang;
    const lv = D.progress.info(D.store.me);
    el.innerHTML = D.top() + '<h1 class="pt">' + T("Me", "Ik") + '</h1>' +
      '<a class="pg-mecard" href="#stats-' + D.store.me + '"><span class="pg-lv"><small>LV</small><b>' + lv.lv + '</b></span><span class="pg-who"><b>' + esc(lv.title) + '</b><span class="pg-bar"><i style="width:' + (lv.frac * 100).toFixed(1) + '%"></i></span><small>' + lv.xp + " XP · " + T("stats and trophies", "statistieken en prijzen") + '</small></span><i class="pg-go">›</i></a>' +
      '<h2 class="sub-h">' + T("Who’s throwing?", "Wie gooit er?") + '</h2><div class="players">' +
      P.map((p, i) => '<button data-i="' + i + '"' + (i === D.store.me ? ' class="on"' : "") + ">" + D.av(i) + "<b>" + esc(p) + "</b><span>" + (i === D.store.me ? T("at the oche", "aan de oche") : T("pick", "kies")) + "</span></button>").join("") +
      '</div><h2 class="sub-h">' + T("Language", "Taal") + '</h2><div class="chips seg' + (lang === "nl" ? " r" : "") + '" id="lang"><button data-v="en"' + (lang === "en" ? ' class="on"' : "") + '>English</button><button data-v="nl"' + (lang === "nl" ? ' class="on"' : "") + '>Nederlands</button></div>' +
      '<h2 class="sub-h">' + T("Names", "Namen") + '</h2><div class="names">' +
      P.map((p, i) => '<label>' + D.av(i) + '<input data-i="' + i + '" value="' + esc(p) + '" maxlength="14" aria-label="' + T("Name player ", "Naam speler ") + (i + 1) + '"></label>').join("") +
      '</div><h2 class="sub-h">' + T("Settings", "Instellingen") + '</h2><label class="toggle"><input type="checkbox" id="snd"' + (D.store.sound ? " checked" : "") + '><span>' + T("Sound and caller", "Geluid en caller") + '</span></label>' +
      '<button class="pg-test" id="ctest"><svg viewBox="0 0 16 16" aria-hidden="true"><rect x="5.5" y="1.5" width="5" height="8.5" rx="2.5"/><path d="M3 7.5a5 5 0 0 0 10 0M8 12.5V15"/></svg>' + T("Test the caller", "Test de caller") + '<small>' + T("English, like on TV", "Engels, zoals op tv") + "</small></button>" +
      '<p class="note">' + T("Coming soon: logging in, so you see each other’s Worlds bracket and scores on your own phone.", "Binnenkort: inloggen, zodat jullie elkaars WK-schema en scores op je eigen telefoon zien.") + '</p>' +
      '<p class="note dim">DART · ' + T("version 1 · for Martijn, Felix and Ale", "versie 1 · voor Martijn, Felix en Ale") + '</p>';
    fx.stagger(el, ".pg-mecard, .players > button, .sub-h, #lang, .names, .toggle, .pg-test", 1);
    el.querySelectorAll(".players button").forEach(b => b.onclick = () => { D.store.setMe(+b.dataset.i); D.sfx.thud(); fx.buzz(10); ik(el); el.querySelectorAll(".rise").forEach(x => x.classList.remove("rise")); });
    el.querySelectorAll("#lang button").forEach(b => b.onclick = () => {
      if(b.dataset.v === D.store.lang) return;
      D.store.setLang(b.dataset.v); D.sfx.tick(); el.querySelector("#lang").classList.toggle("r", b.dataset.v === "nl");
      setTimeout(() => { labels(); ik(el); el.querySelectorAll(".rise").forEach(x => x.classList.remove("rise")); }, fx.calm() ? 0 : 260);
    });
    el.querySelectorAll(".names input").forEach(inp => inp.onchange = () => { D.store.rename(+inp.dataset.i, inp.value); ik(el); el.querySelectorAll(".rise").forEach(x => x.classList.remove("rise")); });
    el.querySelector("#snd").onchange = e => { D.store.setSound(e.target.checked); if(e.target.checked){ D.sfx.good(); fx.buzz(10); } else D.caller.stop(); };
    el.querySelector("#ctest").onclick = () => {
      if(!D.store.sound){ D.store.setSound(true); el.querySelector("#snd").checked = true; }
      D.sfx.unlock(); D.caller.test(); fx.buzz(10);
    };
  }

  /* the tab bar's words and the page language */
  function labels(){
    const L = { spelen: T("Play", "Spelen"), stand: T("Table", "Stand"), ik: T("Me", "Ik") };
    tabs.querySelectorAll("a").forEach(a => a.querySelector("span").textContent = L[a.dataset.tab]);
    document.documentElement.lang = D.store.lang;
  }

  const SCREENS = { spelen, stand, ik, stats: el => D.progress.page(el, location.hash.split("-")[1]), quiz: el => D.quiz(el), checkout: el => D.checkout(el), match: el => D.match(el) };
  const DEPTH = { spelen: 0, stand: 1, ik: 2, stats: 2.5, quiz: 3, checkout: 3, match: 3 };
  let cleanup = null, last = null;
  function route(){
    const raw = location.hash.slice(1).split("-")[0] || "spelen", name = SCREENS[raw] ? raw : "spelen", fn = SCREENS[name];
    if(cleanup){ try { cleanup(); } catch(e){} cleanup = null; }
    const game = name === "quiz" || name === "checkout" || name === "match";
    document.body.classList.toggle("in-game", game);
    /* the stats page lives under the Table tab */
    const tab = name === "stats" ? "stand" : name;
    tabs.querySelectorAll("a").forEach(a => a.classList.toggle("on", a.dataset.tab === tab));
    const ti = { spelen: 0, stand: 1, ik: 2 }[tab];
    if(ti != null) tabs.style.setProperty("--t", ti);
    const dir = last == null || last === name ? "n" : DEPTH[name] > DEPTH[last] ? "f" : DEPTH[name] < DEPTH[last] ? "b" : "n";
    app.className = "screen s-" + name;
    app.innerHTML = "";
    void app.offsetWidth;
    app.classList.add("enter-" + dir);
    last = name;
    cleanup = fn(app) || null;
    window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", route);
  document.addEventListener("pointerdown", () => D.sfx.unlock(), { once: true });
  labels();
  route();
})(window.DART);
