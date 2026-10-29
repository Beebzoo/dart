/* Small synthesised sounds (no files): the thud of a dart (a different one per bed),
   right/wrong, the clean-release pings, the heartbeat of a 180 chase, the crowd's "awww",
   and the old one-line caller (Quiz and Checkout; the 501 Match uses app/caller.js).
   The caller uses the browser's speech voice (English, as on TV) when there is one. */
(function(D){
  let ac = null;
  const ctx = () => { if(!ac){ try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){} } if(ac && ac.state === "suspended") ac.resume(); return ac; };
  const on = () => D.store.sound;

  /* the dart going into sisal. v: a number 0..1 (how hard; a miss is softer) or a bed:
     "treble" (higher, tighter tock), "double" (thud + a light wire tink), "bull" (deep thunk),
     "single", "miss" (a dull puff into the surround) */
  const KIND = {
    treble: { k: 1, lp: 2200, o0: 230, o1: 95, click: true },
    double: { k: 0.95, lp: 1500, o0: 180, o1: 70, tink: true },
    bull: { k: 1.05, lp: 1100, o0: 120, o1: 55 },
    single: { k: 0.9, lp: 1300, o0: 180, o1: 70 },
    miss: { k: 0.45, lp: 500, o0: 0 }
  };
  function thud(v){
    const a = on() && ctx(); if(!a) return;
    const K = typeof v === "string" ? (KIND[v] || KIND.single) : { k: v == null ? 1 : v, lp: 1100 + Math.random() * 600, o0: 180, o1: 70 };
    const k = K.k, t = a.currentTime, len = 0.09, buf = a.createBuffer(1, a.sampleRate * len | 0, a.sampleRate), d = buf.getChannelData(0);
    for(let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
    const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    src.buffer = buf; f.type = "lowpass"; f.frequency.value = K.lp; g.gain.value = 0.9 * k;
    src.connect(f).connect(g).connect(a.destination); src.start(t);
    if(K.o0){
      const o = a.createOscillator(), og = a.createGain();
      o.frequency.setValueAtTime(K.o0, t); o.frequency.exponentialRampToValueAtTime(K.o1, t + 0.08);
      og.gain.setValueAtTime(0.5 * k, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      o.connect(og).connect(a.destination); o.start(t); o.stop(t + 0.11);
    }
    if(K.click) noise(0.006, 5000, 4000, 0.35, "highpass", 0.7);
    if(K.tink) tink(0.35);
  }
  /* filtered noise: the dart through the air (a short rising swish) */
  function noise(dur, f0, f1, gain, type, q){
    const a = on() && ctx(); if(!a) return;
    const t = a.currentTime, buf = a.createBuffer(1, Math.max(1, a.sampleRate * dur | 0), a.sampleRate), d = buf.getChannelData(0);
    for(let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * i / d.length);
    const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    src.buffer = buf; f.type = type || "bandpass"; f.Q.value = q || 1.2;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.value = gain; src.connect(f).connect(g).connect(a.destination); src.start(t);
  }
  const whoosh = slow => slow ? noise(0.7, 400, 2200, 0.13) : noise(0.2, 700, 2600, 0.12);
  /* metal on metal: the wire (k 1) or a light tink (a dart glancing off another, a double) */
  function tink(k){
    const a = on() && ctx(); if(!a) return;
    const t = a.currentTime, g0 = k == null ? 1 : k;
    [2350, 3710, 5200].forEach((fq, i) => {
      const o = a.createOscillator(), g = a.createGain();
      o.type = "sine"; o.frequency.value = fq * (g0 < 1 ? 1.25 : 1);
      g.gain.setValueAtTime(0.16 * g0 / (i + 1), t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      o.connect(g).connect(a.destination); o.start(t); o.stop(t + 0.27);
    });
    noise(0.05, 4000, 3000, 0.2 * g0, "highpass", 0.7);
  }
  const wire = () => tink(1);
  function tone(freqs, dur, type, gain, gap){
    const a = on() && ctx(); if(!a) return;
    freqs.forEach((fq, i) => {
      const t = a.currentTime + i * (gap == null ? dur * 0.8 : gap), o = a.createOscillator(), g = a.createGain();
      o.type = type || "triangle"; o.frequency.value = fq;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain || 0.25, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
    });
  }
  /* a clean release: GOOD a soft ping, PERFECT a bright double ping */
  const clean = lvl => lvl === 2 ? tone([1320, 1980], 0.12, "sine", 0.16, 0.06) : tone([1046], 0.1, "sine", 0.1);
  /* the heartbeat of a 180 chase: two low pulses */
  function heart(){
    const a = on() && ctx(); if(!a) return;
    [0, 0.2].forEach((dt, i) => {
      const t = a.currentTime + dt, o = a.createOscillator(), g = a.createGain();
      o.type = "sine"; o.frequency.setValueAtTime(i ? 52 : 62, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.16);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(i ? 0.45 : 0.6, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      o.connect(g).connect(a.destination); o.start(t); o.stop(t + 0.22);
    });
  }
  /* the crowd: "awww" (noise with the band sliding down) */
  const aww = () => { noise(0.9, 900, 300, 0.22, "bandpass", 2.2); noise(0.8, 700, 260, 0.14, "bandpass", 3); };
  function call(text){
    if(!on() || !window.speechSynthesis) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text), v = speechSynthesis.getVoices();
      u.voice = v.find(x => /en-GB/i.test(x.lang)) || v.find(x => /^en/i.test(x.lang)) || null;
      u.lang = "en-GB"; u.rate = 0.82; u.pitch = 0.9; speechSynthesis.speak(u);
    } catch(e){}
  }
  D.sfx = {
    unlock: ctx, ctx, thud, whoosh, wire, tink, clean, heart, aww,
    good: () => tone([660, 990], 0.14),
    bad: () => tone([220, 165], 0.18, "sawtooth"),
    tick: () => tone([1200], 0.03, "square"),
    call
  };
})(window.DART);
