/* Everything DART remembers lives on this device, under "dart.*" in localStorage.
   Three players share a phone (pass-the-phone); each has their own records. */
window.DART = window.DART || {};
(function(D){
  const KEY = "dart.v1";
  const blank = () => ({ players: ["Martijn", "Felix", "Ale"], me: 0, sound: true, lang: "en", rec: {} });
  let s;
  try { s = Object.assign(blank(), JSON.parse(localStorage.getItem(KEY) || "{}")); } catch(e){ s = blank(); }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch(e){} };

  D.store = {
    get players(){ return s.players.slice(); },
    get me(){ return s.me; },
    get name(){ return s.players[s.me] || "Speler"; },
    get sound(){ return s.sound; },
    setMe(i){ s.me = i; save(); },
    rename(i, n){ s.players[i] = String(n).trim().slice(0, 14) || s.players[i]; save(); },
    setSound(on){ s.sound = !!on; save(); },
    get lang(){ return s.lang === "nl" ? "nl" : "en"; },
    setLang(l){ s.lang = l === "nl" ? "nl" : "en"; save(); },
    /* records per player: rec[player][key] = { best, plays, last } */
    rec(p, key){ return ((s.rec[p] || {})[key]) || null; },
    /* returns true when this is a new best (p: the player, default whoever is at the oche) */
    result(key, score, p){
      if(p == null) p = s.me;
      const r = (s.rec[p] = s.rec[p] || {}), cur = r[key] || { best: 0, plays: 0 };
      const best = score > cur.best;
      r[key] = { best: Math.max(cur.best, score), plays: cur.plays + 1, last: score, when: Date.now() };
      save(); return best && cur.plays > 0;
    },
    all(){ return s.rec; }
  };
  /* T("English", "Nederlands"): the text in the chosen language */
  D.T = (en, nl) => D.store.lang === "nl" ? nl : en;
})(window.DART);
