/* The hand in the 501 Match. Your answer sets the hand for the whole visit:
   0 right, 1 close (o[0]), 2 off (o[1]), 3 wrong (o[2]) or too late.
   The crosshair wobbles (mostly sideways, into the neighbouring numbers, like a real
   bad throw) and the release adds a little scatter. Sizes are millimetres on a
   regulation board: the treble bed is 8 mm deep, a segment ~33 mm wide at the treble.
   The computer throws without a question: its level is its scatter. */
(function(D){
  const HANDS = [
    { name: ["Steady hand", "Vaste hand"], say: ["Spot on. This is going in.", "Strak. Dit wordt hem."], side: 5, deep: 5.5, sd: 3, pull: 0, speed: 0.9 },
    { name: ["Slight tremble", "Licht trillend"], say: ["Nearly right, the hand trembles a bit.", "Bijna goed, de hand trilt een beetje."], side: 11, deep: 10, sd: 4.6, pull: 3, speed: 1.2 },
    { name: ["Shaky", "Trillend"], say: ["That was off. It drifts away.", "Dat zat er naast. Hij trekt weg."], side: 14, deep: 11, sd: 6, pull: 15, speed: 1.6 },
    { name: ["The yips", "Bibberend"], say: ["Wrong. It pulls into the neighbours\u2026", "Fout. Die trekt naar de buren\u2026"], side: 12, deep: 14, sd: 7, pull: 28, speed: 2.1 }
  ];
  const CPU = {
    easy: { name: ["Easy", "Makkelijk"], sd: 24 },
    medium: { name: ["Medium", "Gemiddeld"], sd: 14 },
    hard: { name: ["Hard", "Moeilijk"], sd: 8.5 },
    expert: { name: ["Expert", "Expert"], sd: 5.6 }
  };
  const gauss = () => { let u = 0, v = 0; while(!u) u = Math.random(); while(!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

  /* offset [x, y] that is "sideways" (tangential) by t and "deeper" (radial) by r at the aim point */
  function frame(aim, t, r){
    const len = Math.hypot(aim[0], aim[1]);
    if(len < 1) return [t, r];
    const ux = aim[0] / len, uy = aim[1] / len;
    return [ux * r - uy * t, uy * r + ux * t];
  }
  /* the wobble at time s (seconds) for a hand: smooth, never quite repeating. A shaky
     hand also pulls to one side; the side swings over every few seconds (so you can't
     simply aim the other way: free aiming would cancel a fixed pull). */
  function wobble(aim, s, grade, ph){
    const h = HANDS[grade], k = h.speed, p = ph || 0, pull = h.pull * Math.tanh(6 * Math.sin(s * 0.5 * k + p * 13.7));
    const t = pull + h.side * (0.62 * Math.sin(s * 2.1 * k + p) + 0.38 * Math.sin(s * 5.3 * k + p * 2.7));
    const r = h.deep * (0.6 * Math.sin(s * 2.9 * k + p * 1.3) + 0.4 * Math.sin(s * 6.7 * k + p * 0.7));
    return frame(aim, t, r);
  }
  /* where the dart actually goes when released at time s */
  function release(aim, s, grade, ph){
    const w = wobble(aim, s, grade, ph), h = HANDS[grade], e = frame(aim, gauss() * h.sd * 1.2, gauss() * h.sd * 0.8);
    return [aim[0] + w[0] + e[0], aim[1] + w[1] + e[1]];
  }
  /* a bad hand sometimes catches the wire and the dart drops out (no score) */
  const BOUNCE = [[0, 0], [0, 0], [0.5, 0.14], [0.7, 0.22]];
  function bounce(pt, grade){
    const [mm, p] = BOUNCE[grade] || BOUNCE[0];
    return mm > 0 && D.board.wire(pt[0], pt[1]) < mm && Math.random() < p;
  }
  function cpuThrow(aim, level){
    const sd = CPU[level].sd, e = frame(aim, gauss() * sd * 1.15, gauss() * sd * 0.85);
    return [aim[0] + e[0], aim[1] + e[1]];
  }

  /* what the computer aims at with `left` to go and `k` darts left in the visit */
  function cpuAim(left, k){
    const co = D.co;
    const r = co.route(left);
    if(r && r.length <= k) return r[0];
    if(left > 100) return { m: 3, n: left - 60 >= 2 && co.possible(left - 60) || left > 170 ? 20 : 19 };
    /* set up a finish for the next dart or visit: the single that leaves the nicest double */
    let best = { m: 3, n: 20 }, score = -1;
    for(const d of co.ALL){
      const rest = left - co.val(d);
      if(rest < 2) continue;
      const one = (rest <= 40 && rest % 2 === 0) || rest === 50, rr = co.route(rest);
      const v = (one ? 100 - [40, 32, 16, 36, 24, 20, 8, 28, 12, 4].indexOf(rest) * (rest <= 40 ? 1 : 0) : rr && rr.length <= 2 ? 50 : rr ? 20 : 0) - (d.m === 1 ? 0 : d.m === 3 ? 6 : 12) - (d.n === 25 ? 10 : 0);
      if(v > score){ score = v; best = d; }
    }
    return best;
  }

  D.hand = { HANDS, CPU, wobble, release, bounce, cpuThrow, cpuAim };
})(window.DART);
