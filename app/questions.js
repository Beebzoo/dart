/* The question bank: every deck listed in _bank/questions/decks.json, rows with
   status "ok" only. Loaded once, the first time a game asks for it. */
(function(D){
  const BASE = "_bank/questions/";
  const NAMES = { spelregels: ["Rules", "Spelregels"], legendes: ["Legends", "Legendes"], modern: ["Today", "Nu"], toernooien: ["Tournaments", "Toernooien"], bijnamen: ["Nicknames", "Bijnamen"], nederland: ["Dutch darts", "Oranje"] };
  const name = d => NAMES[d] ? D.T(NAMES[d][0], NAMES[d][1]) : d;
  let all = null, loading = null;

  function load(){
    if(all) return Promise.resolve(all);
    return loading = loading || fetch(BASE + "decks.json", { cache: "no-cache" }).then(r => r.json()).then(j => {
      const decks = Array.isArray(j) ? j : j.decks;
      return Promise.all(decks.map(d => fetch(BASE + d + ".jsonl", { cache: "no-cache" }).then(r => r.ok ? r.text() : "").then(t =>
        t.split("\n").map(l => { try { return l.trim() ? JSON.parse(l) : null; } catch(e){ return null; } })
          .filter(q => q && q.status === "ok" && q.q && q.a && Array.isArray(q.o) && q.o.length >= 3)
          .map(q => Object.assign(q, { deck: d })))));
    }).then(lists => (all = [].concat(...lists))).catch(e => { loading = null; throw e; });
  }
  const shuffle = a => { a = a.slice(); for(let i = a.length - 1; i > 0; i--){ const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };

  /* recently asked ids are kept so the next rounds don't repeat them */
  const SEEN = "dart.seen";
  const seen = () => { try { return JSON.parse(localStorage.getItem(SEEN) || "[]"); } catch(e){ return []; } };
  function pick(deck, tier, n){
    let pool = all.filter(q => (deck === "alles" || q.deck === deck) && (tier === "mix" || q.tier === tier));
    const old = new Set(seen()), fresh = pool.filter(q => !old.has(q.id));
    const out = shuffle(fresh).slice(0, n);
    if(out.length < n) out.push(...shuffle(pool.filter(q => old.has(q.id))).slice(0, n - out.length));
    try { localStorage.setItem(SEEN, JSON.stringify(seen().concat(out.map(q => q.id)).slice(-Math.max(40, Math.floor(all.length * 0.7))))); } catch(e){}
    /* in English, the row's "en" block (same option order) replaces the Dutch text */
    return out.map(q => {
      const L = D.store.lang === "en" && q.en && q.en.q ? Object.assign({}, q, { q: q.en.q, a: q.en.a, o: q.en.o, sub: q.en.sub || "" }) : Object.assign({}, q);
      L.opts = shuffle([L.a].concat(L.o.slice(0, 3)));
      return L;
    });
  }
  const count = (deck, tier) => all ? all.filter(q => (deck === "alles" || q.deck === deck) && (tier === "mix" || q.tier === tier)).length : 0;

  D.qs = { load, pick, count, name, shuffle, get decks(){ return all ? [...new Set(all.map(q => q.deck))] : []; } };
})(window.DART);
