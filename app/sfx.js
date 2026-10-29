/* Small synthesised sounds (no files): the thud of a dart, right/wrong, and the caller.
   The caller uses the browser's speech voice (English, as on TV) when there is one. */
(function(D){
  let ac = null;
  const ctx = () => { if(!ac){ try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){} } if(ac && ac.state === "suspended") ac.resume(); return ac; };
  const on = () => D.store.sound;

  /* the dart going into sisal; v (0..1) is how hard (a miss into the surround is softer) */
  function thud(v){
    const a = on() && ctx(); if(!a) return;
    const k = v == null ? 1 : v, t = a.currentTime, len = 0.09, buf = a.createBuffer(1, a.sampleRate * len | 0, a.sampleRate), d = buf.getChannelData(0);
    for(let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
    const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    src.buffer = buf; f.type = "lowpass"; f.frequency.value = 1100 + Math.random() * 600; g.gain.value = 0.9 * k;
    src.connect(f).connect(g).connect(a.destination); src.start(t);
    const o = a.createOscillator(), og = a.createGain();
    o.frequency.setValueAtTime(180, t); o.frequency.exponentialRampToValueAtTime(70, t + 0.08);
    og.gain.setValueAtTime(0.5 * k, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    o.connect(og).connect(a.destination); o.start(t); o.stop(t + 0.11);
  }
  /* filtered noise: the dart through the air (a short rising swish) */
  function noise(dur, f0, f1, gain, type, q){
    const a = on() && ctx(); if(!a) return;
    const t = a.currentTime, buf = a.createBuffer(1, a.sampleRate * dur | 0, a.sampleRate), d = buf.getChannelData(0);
    for(let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * i / d.length);
    const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    src.buffer = buf; f.type = type || "bandpass"; f.Q.value = q || 1.2;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.value = gain; src.connect(f).connect(g).connect(a.destination); src.start(t);
  }
  const whoosh = () => noise(0.2, 700, 2600, 0.12);
  /* a dart hitting the wire: a metallic clink */
  function wire(){
    const a = on() && ctx(); if(!a) return;
    const t = a.currentTime;
    [2350, 3710, 5200].forEach((fq, i) => {
      const o = a.createOscillator(), g = a.createGain();
      o.type = "sine"; o.frequency.value = fq;
      g.gain.setValueAtTime(0.16 / (i + 1), t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      o.connect(g).connect(a.destination); o.start(t); o.stop(t + 0.27);
    });
    noise(0.05, 4000, 3000, 0.2, "highpass", 0.7);
  }
  function tone(freqs, dur, type){
    const a = on() && ctx(); if(!a) return;
    freqs.forEach((fq, i) => {
      const t = a.currentTime + i * dur * 0.8, o = a.createOscillator(), g = a.createGain();
      o.type = type || "triangle"; o.frequency.value = fq;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
    });
  }
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
    unlock: ctx, thud, whoosh, wire,
    good: () => tone([660, 990], 0.14),
    bad: () => tone([220, 165], 0.18, "sawtooth"),
    tick: () => tone([1200], 0.03, "square"),
    call
  };
})(window.DART);
