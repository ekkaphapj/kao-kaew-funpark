// ============================================================
// main.js — engine bootstrap, build order, render loop
// ============================================================
"use strict";

window.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("gameCanvas");
  const loadFill = document.getElementById("loadFill");
  const loadHint = document.getElementById("loadHint");
  const loadingEl = document.getElementById("loading");

  const isMobile = ("ontouchstart" in window) || navigator.maxTouchPoints > 0
    || location.search.includes("mobile=1");

  const engine = new BABYLON.Engine(canvas, true, {
    adaptToDeviceRatio: false,
    powerPreference: "high-performance",
    stencil: true,
  });
  // cap resolution on very dense mobile screens
  const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 2 : 2);
  engine.setHardwareScalingLevel(1 / dpr);

  const scene = new BABYLON.Scene(engine);
  scene.collisionsEnabled = true;
  scene.gravity = new BABYLON.Vector3(0, -0.5, 0);
  scene.skipPointerMovePicking = true;
  scene.autoClear = true;
  scene.blockMaterialDirtyMechanism = true;

  function setProgress(pct, text) {
    loadFill.style.width = pct + "%";
    if (text) loadHint.textContent = text;
  }

  // build in stages so the loading bar visibly advances
  const stages = [
    ["ปลุกดวงจันทร์...", () => buildEnvironment(scene)],
    ["เปิดไฟร้านค้า...", () => buildBuildings(scene)],
    ["สตาร์ทเครื่องเล่น...", () => buildRides(scene)],
    ["เสกปราสาทผีสิง...", () => buildLandmarks(scene)],
  ];

  let player = null;
  let stageIdx = 0;

  function runStage() {
    if (stageIdx < stages.length) {
      const [label, fn] = stages[stageIdx];
      setProgress(10 + stageIdx * 28, label);
      // yield to the browser so the bar paints
      setTimeout(() => {
        fn();
        stageIdx++;
        runStage();
      }, 30);
      return;
    }
    setProgress(95, "ปล่อยผี...");
    setTimeout(finishSetup, 30);
  }

  function finishSetup() {
    // let zone point lights reach their zones (default cap is 4 lights/material);
    // 10 so scoped lights (castle, haunted house) still get a slot after the
    // 6 park-wide points + hemi + moon
    for (const m of scene.materials) {
      if (m instanceof BABYLON.StandardMaterial) m.maxSimultaneousLights = 10;
    }

    player = createPlayer(scene, canvas);

    // debug: position via URL params (?px=0&pz=-200&yaw=3.14&pitch=0&view=3)
    const q = new URLSearchParams(location.search);
    if (q.has("px")) {
      player.root.position.x = parseFloat(q.get("px")) || 0;
      player.root.position.z = parseFloat(q.get("pz")) || 0;
      if (q.has("py")) player.root.position.y = parseFloat(q.get("py"));
      player.state.yaw = parseFloat(q.get("yaw")) || 0;
      player.state.pitch = parseFloat(q.get("pitch")) || 0;
      if (q.get("view") === "3") player.state.view = 3;
      loadingEl.style.display = "none";
    }

    // ---------- post processing ----------
    const pipeline = new BABYLON.DefaultRenderingPipeline("pp", true, scene, [scene.activeCamera]);
    pipeline.fxaaEnabled = true;
    pipeline.bloomEnabled = true;
    pipeline.bloomThreshold = 0.32;
    pipeline.bloomWeight = 0.55;
    pipeline.bloomKernel = 48;
    pipeline.bloomScale = 0.5;
    pipeline.imageProcessingEnabled = true;
    pipeline.imageProcessing.contrast = 1.15;
    pipeline.imageProcessing.exposure = 1.65;
    pipeline.imageProcessing.toneMappingEnabled = true;
    pipeline.imageProcessing.vignetteEnabled = true;
    pipeline.imageProcessing.vignetteWeight = 1.5;
    pipeline.imageProcessing.vignetteColor = new BABYLON.Color4(0, 0, 0.02, 0);
    pipeline.imageProcessing.vignetteStretch = 0.5;
    if (!isMobile) {
      pipeline.chromaticAberrationEnabled = true;
      pipeline.chromaticAberration.aberrationAmount = 6;
      pipeline.grainEnabled = true;
      pipeline.grain.intensity = 9;
      pipeline.grain.animated = true;
    }

    scene.blockMaterialDirtyMechanism = false;
    setProgress(100, "ยินดีต้อนรับ...");

    // ---------- online multiplayer ----------
    let net = { update() {} };
    try {
      net = initNet(scene, player);
    } catch (e) {
      console.warn("net disabled:", e);
    }

    // ---------- mobile fullscreen check ----------
    const fsBtn = document.getElementById("btn-fs");
    const fsSupported = !!document.documentElement.requestFullscreen;
    function fsCheck() {
      const active = !!document.fullscreenElement;
      fsBtn.style.display = (isMobile && fsSupported && !active) ? "block" : "none";
    }
    fsBtn.addEventListener("click", () => {
      document.documentElement.requestFullscreen({ navigationUI: "hide" })
        .then(() => {
          if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock("landscape").catch(() => {});
          }
        })
        .catch(() => {});
    });
    document.addEventListener("fullscreenchange", () => { fsCheck(); engine.resize(); });
    fsCheck();

    // ---------- per-frame logic (runs on every render, even manual ones) ----------
    let t = 0;
    let firstFrame = true;
    let lastTime = performance.now();
    scene.onBeforeRenderObservable.add(() => {
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      t += dt;
      player.update(dt);
      net.update(dt);
      updateFlickers(dt, t);
      for (const u of PARK.updaters) u(dt, t);
      if (firstFrame) {
        firstFrame = false;
        setTimeout(() => loadingEl.classList.add("done"), 400);
      }
    });
    engine.runRenderLoop(() => scene.render());
  }

  runStage();

  window.addEventListener("resize", () => engine.resize());
  window.addEventListener("orientationchange", () => setTimeout(() => engine.resize(), 300));
});
