// ============================================================
// audio.js — procedural haunted-carnival music, ambience & SFX
// A detuned music-box waltz in D minor, gusting wind, metal
// creaks, ghost whispers, a distant bell, machinery drones.
// ============================================================
"use strict";

function createParkAudio(player) {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const button = document.getElementById("btn-audio");
  let muted = localStorage.getItem("kk_muted") === "1";
  let ctx = null;
  let master = null;
  let musicBus = null;
  let effectsBus = null;
  let lastX = player.root.position.x;
  let lastZ = player.root.position.z;
  let stepDistance = 0;
  const rideLoops = [];

  const MASTER_VOL = 1.0;

  const ridePositions = [
    { x: 30, z: -34, frequency: 73, radius: 34 },   // carousel
    { x: 95, z: -10, frequency: 46, radius: 42 },   // drop tower
    { x: -20, z: 38, frequency: 61, radius: 36 },   // swings
  ];

  function updateButton() {
    if (!button) return;
    button.classList.toggle("muted", muted);
    button.setAttribute("aria-pressed", String(muted));
    button.setAttribute("aria-label", muted ? "เปิดเสียง" : "ปิดเสียง");
    button.title = (muted ? "เปิดเสียง" : "ปิดเสียง") + " (M)";
    button.querySelector(".audio-icon").textContent = muted ? "🔇" : "🔊";
    button.querySelector(".audio-label").textContent = muted ? "ปิดเสียง" : "เสียง";
  }

  function createNoiseBuffer(seconds, smoothing) {
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    const keep = smoothing === undefined ? 0.985 : smoothing;
    let smooth = 0;
    for (let i = 0; i < length; i++) {
      smooth = smooth * keep + (Math.random() * 2 - 1) * (1 - keep);
      data[i] = smooth;
    }
    return buffer;
  }

  function buildAudioGraph() {
    ctx = new AudioCtx();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : MASTER_VOL;
    // soft limiter so the louder mix never clips harshly
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -12;
    limiter.knee.value = 18;
    limiter.ratio.value = 8;
    limiter.attack.value = 0.004;
    limiter.release.value = 0.24;
    master.connect(limiter).connect(ctx.destination);

    musicBus = ctx.createGain();
    musicBus.gain.value = 0.62;
    musicBus.connect(master);
    effectsBus = ctx.createGain();
    effectsBus.gain.value = 0.9;
    effectsBus.connect(master);

    // ---- wind with slow gusts ----
    const wind = ctx.createBufferSource();
    wind.buffer = createNoiseBuffer(4);
    wind.loop = true;
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = "lowpass";
    windFilter.frequency.value = 480;
    windFilter.Q.value = 0.6;
    const windGain = ctx.createGain();
    windGain.gain.value = 0.34;
    const gustLfo = ctx.createOscillator();
    gustLfo.frequency.value = 0.07;
    const gustDepth = ctx.createGain();
    gustDepth.gain.value = 0.16;
    gustLfo.connect(gustDepth).connect(windGain.gain);
    wind.connect(windFilter).connect(windGain).connect(effectsBus);
    wind.start();
    gustLfo.start();

    // ---- machinery drones with a slow mechanical throb ----
    for (const ride of ridePositions) {
      const osc = ctx.createOscillator();
      const overtone = ctx.createOscillator();
      const gain = ctx.createGain();       // proximity (driven from update)
      const throb = ctx.createGain();      // tremolo
      osc.type = "sawtooth";
      overtone.type = "sine";
      osc.frequency.value = ride.frequency;
      overtone.frequency.value = ride.frequency * 2.01;
      gain.gain.value = 0;
      throb.gain.value = 0.75;
      const lfo = ctx.createOscillator();
      lfo.type = "sine";
      lfo.frequency.value = 1.6 + Math.random();
      const lfoDepth = ctx.createGain();
      lfoDepth.gain.value = 0.25;
      lfo.connect(lfoDepth).connect(throb.gain);
      osc.connect(gain);
      overtone.connect(gain);
      gain.connect(throb).connect(effectsBus);
      osc.start();
      overtone.start();
      lfo.start();
      rideLoops.push({ ...ride, gain });
    }
    nextNoteAt = ctx.currentTime + 0.2;
    barStartAt = nextNoteAt;
  }

  function unlock() {
    if (!AudioCtx || muted) return;
    if (!ctx) buildAudioGraph();
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
  }

  function setMuted(value) {
    muted = value;
    localStorage.setItem("kk_muted", muted ? "1" : "0");
    updateButton();
    if (!muted) unlock();
    if (ctx && master) {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(muted ? 0 : MASTER_VOL, ctx.currentTime, 0.035);
    }
  }

  function toggle() { setMuted(!muted); }

  function tone(freq, start, duration, volume, type, destination) {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || "sine";
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + Math.min(0.08, duration * 0.2));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain).connect(destination || musicBus);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  }

  // music-box voice: two slightly detuned partials + a soft octave shimmer
  function boxNote(freq, start, duration, volume) {
    tone(freq, start, duration, volume, "triangle", musicBus);
    tone(freq * 1.004, start, duration * 0.92, volume * 0.5, "sine", musicBus);
    tone(freq * 2.002, start, duration * 0.55, volume * 0.2, "sine", musicBus);
  }

  // =========================================================
  // HAUNTED CARNIVAL WALTZ (D minor, 3/4, wobbling music box)
  // =========================================================
  const N = {
    D3: 146.83, E3: 164.81, F3: 174.61, G3: 196, A3: 220, Bb3: 233.08, C4: 261.63,
    Cs4: 277.18, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392, A4: 440,
    Bb4: 466.16, Cs5: 554.37, D5: 587.33,
    G2: 98, A2: 110, D2: 73.42,
  };
  // 16 bars: [melody notes per bar as [freq, beats]..., bass root, chord pair]
  const WALTZ = [
    { m: [[N.D4, 2], [N.F4, 1]], b: N.D3, c: [N.F3, N.A3] },
    { m: [[N.A4, 2], [N.F4, 1]], b: N.D3, c: [N.F3, N.A3] },
    { m: [[N.D4, 2], [N.F4, 1]], b: N.D3, c: [N.F3, N.A3] },
    { m: [[N.E4, 3]], b: N.A2, c: [N.E3, N.A3] },
    { m: [[N.Cs4, 2], [N.E4, 1]], b: N.A2, c: [N.E3, N.A3] },
    { m: [[N.A4, 2], [N.E4, 1]], b: N.A2, c: [N.E3, N.A3] },
    { m: [[N.F4, 2], [N.E4, 1]], b: N.A2, c: [N.E3, N.A3] },
    { m: [[N.D4, 3]], b: N.D3, c: [N.F3, N.A3] },
    { m: [[N.Bb4, 2], [N.A4, 1]], b: N.G2, c: [N.Bb3, N.D4] },
    { m: [[N.G4, 2], [N.F4, 1]], b: N.G2, c: [N.Bb3, N.D4] },
    { m: [[N.E4, 2], [N.F4, 1]], b: N.A2, c: [N.E3, N.A3] },
    { m: [[N.G4, 3]], b: N.A2, c: [N.E3, N.A3] },
    { m: [[N.A4, 2], [N.F4, 1]], b: N.D3, c: [N.F3, N.A3] },
    { m: [[N.D5, 2], [N.Cs5, 1]], b: N.A2, c: [N.E3, N.A3] },
    { m: [[N.D5, 1], [N.A4, 1], [N.F4, 1]], b: N.A2, c: [N.E3, N.A3] },
    { m: [[N.D4, 3]], b: N.D2, c: [N.D3, N.A3] },
  ];
  const BEAT = 0.58;
  let nextNoteAt = 0;
  let barStartAt = 0;
  let barIndex = 0;

  function scheduleMusic() {
    if (!ctx || muted) return;
    while (barStartAt < ctx.currentTime + 1.6) {
      const bar = WALTZ[barIndex % WALTZ.length];
      // a dying music box: tempo wobbles, sometimes a bar drags eerily
      const drag = Math.random() < 0.06 ? 1.45 : 1 + (Math.random() - 0.5) * 0.05;
      const beat = BEAT * drag;
      // bass on beat 1, soft chord stabs on beats 2 and 3
      tone(bar.b, barStartAt, beat * 2.6, 0.11, "triangle", musicBus);
      for (const beatIdx of [1, 2]) {
        tone(bar.c[0], barStartAt + beat * beatIdx, beat * 0.8, 0.05, "triangle", musicBus);
        tone(bar.c[1], barStartAt + beat * beatIdx, beat * 0.8, 0.04, "sine", musicBus);
      }
      // melody, occasionally a sour off-pitch note
      let t = barStartAt;
      for (const [freq, beats] of bar.m) {
        const sour = Math.random() < 0.045 ? 0.97 : 1;
        boxNote(freq * sour, t, beat * beats * 1.1, 0.17);
        t += beat * beats;
      }
      barStartAt += beat * 3;
      barIndex++;
    }
  }

  // =========================================================
  // AMBIENT ONE-SHOTS
  // =========================================================
  let nextCreakAt = performance.now() / 1000 + 7 + Math.random() * 8;
  let nextWhisperAt = performance.now() / 1000 + 20 + Math.random() * 20;
  let nextBellAt = performance.now() / 1000 + 35 + Math.random() * 30;

  // rusty metal groan — a ride turning in the dark
  function playCreak() {
    if (!ctx || muted || ctx.state !== "running") return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(150 + Math.random() * 80, now);
    osc.frequency.exponentialRampToValueAtTime(45 + Math.random() * 25, now + 1.1 + Math.random() * 0.8);
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 220;
    filter.Q.value = 5;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.09, now + 0.25);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.9);
    osc.connect(filter).connect(gain).connect(effectsBus);
    osc.start(now);
    osc.stop(now + 2);
  }

  // breathy whisper drifting past
  function playWhisper() {
    if (!ctx || muted || ctx.state !== "running") return;
    const now = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = createNoiseBuffer(1.6, 0.92);
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.value = 9;
    filter.frequency.setValueAtTime(1400, now);
    filter.frequency.exponentialRampToValueAtTime(420, now + 1.4);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.055, now + 0.5);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
    src.connect(filter).connect(gain).connect(effectsBus);
    src.start(now);
  }

  // distant funeral bell
  function playBell() {
    if (!ctx || muted || ctx.state !== "running") return;
    const now = ctx.currentTime;
    const strikes = 1 + Math.floor(Math.random() * 2);
    for (let s = 0; s < strikes; s++) {
      const at = now + s * 2.6;
      tone(98, at, 4.5, 0.13, "sine", effectsBus);
      tone(98 * 2.01, at, 3.2, 0.05, "sine", effectsBus);
      tone(98 * 2.76, at, 1.8, 0.035, "sine", effectsBus);
    }
  }

  function playFootstep(running) {
    if (!ctx || muted || ctx.state !== "running") return;
    const now = ctx.currentTime;
    const source = ctx.createBufferSource();
    source.buffer = createNoiseBuffer(0.08, 0.9);
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = running ? 240 : 190;
    filter.Q.value = 1.1;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(running ? 0.26 : 0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
    source.connect(filter).connect(gain).connect(effectsBus);
    source.start(now);
  }

  // the Ticket Keeper's hunt siren — loud, rising, wrong
  function playAlarm() {
    unlock();
    if (!ctx || muted) return;
    const start = ctx.currentTime + 0.03;
    for (let i = 0; i < 14; i++) {
      const at = start + i * 0.42;
      tone(i % 2 ? 415 : 292, at, 0.36, 0.2, "sawtooth", effectsBus);
      tone(i % 2 ? 207 : 146, at, 0.4, 0.1, "square", effectsBus);
    }
    // deep dread swell underneath
    tone(55, start, 6, 0.16, "sine", effectsBus);
  }

  function update() {
    if (!ctx || muted || ctx.state !== "running") return;
    scheduleMusic();

    const x = player.root.position.x;
    const z = player.root.position.z;
    const moved = Math.hypot(x - lastX, z - lastZ);
    lastX = x;
    lastZ = z;
    stepDistance += moved;
    const stride = player.state.running ? 1.25 : 1.65;
    if (stepDistance >= stride) {
      stepDistance %= stride;
      playFootstep(player.state.running);
    }

    for (const ride of rideLoops) {
      const distance = Math.hypot(x - ride.x, z - ride.z);
      const proximity = Math.max(0, 1 - distance / ride.radius);
      ride.gain.gain.setTargetAtTime(proximity * proximity * 0.075, ctx.currentTime, 0.15);
    }

    const now = performance.now() / 1000;
    if (now >= nextCreakAt) {
      playCreak();
      nextCreakAt = now + 9 + Math.random() * 14;
    }
    if (now >= nextWhisperAt) {
      playWhisper();
      nextWhisperAt = now + 26 + Math.random() * 30;
    }
    if (now >= nextBellAt) {
      playBell();
      nextBellAt = now + 55 + Math.random() * 45;
    }
  }

  updateButton();
  if (!AudioCtx && button) {
    button.disabled = true;
    button.title = "เบราว์เซอร์นี้ไม่รองรับระบบเสียง";
  } else if (button) {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      toggle();
    });
    window.addEventListener("keydown", (event) => {
      const typing = event.target && /INPUT|TEXTAREA/.test(event.target.tagName);
      if (event.code === "KeyM" && !event.repeat && !typing) toggle();
    });
    window.addEventListener("pointerdown", unlock, { passive: true });
    window.addEventListener("keydown", unlock, { passive: true });
  }

  return { update, unlock, toggle, setMuted, playAlarm };
}
