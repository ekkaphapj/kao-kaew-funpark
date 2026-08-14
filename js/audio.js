// ============================================================
// audio.js — procedural park music, ambience and sound effects
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
  let nextNoteAt = 0;
  let noteIndex = 0;
  let lastX = player.root.position.x;
  let lastZ = player.root.position.z;
  let stepDistance = 0;
  let nextStingerAt = performance.now() / 1000 + 18 + Math.random() * 15;
  const rideLoops = [];

  const ridePositions = [
    { x: 30, z: -34, frequency: 73, radius: 34 },
    { x: 95, z: -10, frequency: 46, radius: 42 },
    { x: -20, z: 38, frequency: 61, radius: 36 },
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

  function createNoiseBuffer(seconds) {
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let smooth = 0;
    for (let i = 0; i < length; i++) {
      smooth = smooth * 0.985 + (Math.random() * 2 - 1) * 0.015;
      data[i] = smooth;
    }
    return buffer;
  }

  function buildAudioGraph() {
    ctx = new AudioCtx();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.72;
    master.connect(ctx.destination);

    musicBus = ctx.createGain();
    musicBus.gain.value = 0.23;
    musicBus.connect(master);
    effectsBus = ctx.createGain();
    effectsBus.gain.value = 0.62;
    effectsBus.connect(master);

    const wind = ctx.createBufferSource();
    wind.buffer = createNoiseBuffer(4);
    wind.loop = true;
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = "lowpass";
    windFilter.frequency.value = 520;
    windFilter.Q.value = 0.5;
    const windGain = ctx.createGain();
    windGain.gain.value = 0.34;
    wind.connect(windFilter).connect(windGain).connect(musicBus);
    wind.start();

    // Machinery grows louder as the player approaches each attraction.
    for (const ride of ridePositions) {
      const osc = ctx.createOscillator();
      const overtone = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      overtone.type = "sine";
      osc.frequency.value = ride.frequency;
      overtone.frequency.value = ride.frequency * 2.01;
      gain.gain.value = 0;
      osc.connect(gain);
      overtone.connect(gain);
      gain.connect(effectsBus);
      osc.start();
      overtone.start();
      rideLoops.push({ ...ride, gain });
    }
    nextNoteAt = ctx.currentTime + 0.1;
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
      master.gain.setTargetAtTime(muted ? 0 : 0.72, ctx.currentTime, 0.035);
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

  function scheduleMusic() {
    if (!ctx || muted) return;
    const notes = [146.83, 174.61, 220, 164.81, 130.81, 174.61, 196, 146.83];
    while (nextNoteAt < ctx.currentTime + 1.2) {
      const f = notes[noteIndex % notes.length];
      tone(f, nextNoteAt, 1.9, 0.075, "triangle", musicBus);
      tone(f / 2, nextNoteAt, 2.6, 0.045, "sine", musicBus);
      if (noteIndex % 4 === 0) tone(f * 1.5, nextNoteAt + 0.36, 1.25, 0.025, "sine", musicBus);
      noteIndex++;
      nextNoteAt += 1.35;
    }
  }

  function playFootstep(running) {
    if (!ctx || muted || ctx.state !== "running") return;
    const now = ctx.currentTime;
    const source = ctx.createBufferSource();
    source.buffer = createNoiseBuffer(0.08);
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = running ? 155 : 125;
    filter.Q.value = 0.8;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(running ? 0.15 : 0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
    source.connect(filter).connect(gain).connect(effectsBus);
    source.start(now);
  }

  function playStinger() {
    if (!ctx || muted || ctx.state !== "running") return;
    const now = ctx.currentTime;
    const base = [92.5, 98, 110][Math.floor(Math.random() * 3)];
    tone(base, now, 3.4, 0.035, "sine", effectsBus);
    tone(base * 1.414, now + 0.12, 2.8, 0.022, "triangle", effectsBus);
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
      ride.gain.gain.setTargetAtTime(proximity * proximity * 0.045, ctx.currentTime, 0.15);
    }

    const now = performance.now() / 1000;
    if (now >= nextStingerAt) {
      playStinger();
      nextStingerAt = now + 22 + Math.random() * 28;
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

  return { update, unlock, toggle, setMuted };
}
