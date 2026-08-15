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

  const startupQuery = new URLSearchParams(location.search);
  const storedQuality = localStorage.getItem("kk_quality");
  const lowHardware = (navigator.deviceMemory && navigator.deviceMemory <= 4)
    || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
  const qualityOverride = startupQuery.get("quality");
  const lowQuality = isMobile && (
    qualityOverride === "low"
    || (qualityOverride !== "high" && storedQuality !== "high" && (storedQuality === "low" || lowHardware))
  );
  PARK.lowQuality = lowQuality;
  PARK.isMobile = isMobile;

  const engine = new BABYLON.Engine(canvas, !lowQuality, {
    adaptToDeviceRatio: false,
    powerPreference: "high-performance",
    stencil: true,
  });
  // Low mode renders at CSS-pixel resolution; high mobile is capped at 1.5x.
  const dprCap = lowQuality ? 1 : (isMobile ? 1.5 : 2);
  const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
  engine.setHardwareScalingLevel(1 / dpr);

  const scene = new BABYLON.Scene(engine);
  scene.collisionsEnabled = true;
  scene.gravity = new BABYLON.Vector3(0, -0.5, 0);
  scene.skipPointerMovePicking = true;
  scene.autoClear = true;
  scene.blockMaterialDirtyMechanism = true;
  if (lowQuality && BABYLON.ScenePerformancePriority) {
    scene.performancePriority = BABYLON.ScenePerformancePriority.Aggressive;
  }

  const qualityBtn = document.getElementById("btn-quality");
  if (qualityBtn) {
    qualityBtn.classList.toggle("high", !lowQuality);
    qualityBtn.querySelector(".quality-icon").textContent = lowQuality ? "⚡" : "✨";
    qualityBtn.querySelector(".quality-label").textContent = lowQuality ? "โหมดลื่น" : "ภาพสวย";
    qualityBtn.title = lowQuality ? "กำลังใช้โหมดลื่น — แตะเพื่อเพิ่มคุณภาพ" : "กำลังใช้ภาพสวย — แตะเพื่อเพิ่มความลื่น";
    qualityBtn.addEventListener("click", () => {
      localStorage.setItem("kk_quality", lowQuality ? "high" : "low");
      location.reload();
    });
  }

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
      if ("maxSimultaneousLights" in m) m.maxSimultaneousLights = lowQuality ? 6 : 10;
    }

    player = createPlayer(scene, canvas);
    const audio = createParkAudio(player);

    // Desktop-only moon shadows. Mobile uses the cheaper lighting path.
    if (!isMobile && PARK.moonLight && BABYLON.CascadedShadowGenerator) {
      const shadow = new BABYLON.CascadedShadowGenerator(1024, PARK.moonLight);
      shadow.usePercentageCloserFiltering = true;
      shadow.filteringQuality = BABYLON.ShadowGenerator.QUALITY_LOW;
      shadow.lambda = 0.72;
      shadow.stabilizeCascades = true;
      const casterNames = /gateTower|hbFront|hbBack|hbSide|hbRoof|caKeep|caTower|tentWall|tentRoof|mausoleum|fwLeg|fwCab|dtTower|swCol|deadSrc|bus|carBody/;
      for (const mesh of scene.meshes) {
        if (!mesh.material || !mesh.isVisible) continue;
        mesh.receiveShadows = !/sky|moon|Sign|Floor|groundFog|wisp/.test(mesh.name);
        if (casterNames.test(mesh.name)) shadow.addShadowCaster(mesh, false);
      }
      PARK.shadowGenerator = shadow;
    }
    const monster = createTicketKeeper(scene, player, audio);
    const mission = createMission(scene, player, audio);
    window.KK = { player, monster }; // debug/testing handle

    // debug: position via URL params (?px=0&pz=-200&yaw=3.14&pitch=0&view=3)
    const q = startupQuery;
    if (q.has("px")) {
      player.root.position.x = parseFloat(q.get("px")) || 0;
      player.root.position.z = parseFloat(q.get("pz")) || 0;
      if (q.has("py")) player.root.position.y = parseFloat(q.get("py"));
      player.state.yaw = parseFloat(q.get("yaw")) || 0;
      player.state.pitch = parseFloat(q.get("pitch")) || 0;
      if (q.get("view") === "3") player.state.view = 3;
      if (q.has("dist")) player.state.tpDist = parseFloat(q.get("dist")) || 5;
      loadingEl.style.display = "none";
    }

    // ---------- post processing ----------
    if (lowQuality) {
      scene.imageProcessingConfiguration.contrast = 1.08;
      scene.imageProcessingConfiguration.exposure = 1.22;
      scene.imageProcessingConfiguration.toneMappingEnabled = true;
    } else {
      const pipeline = new BABYLON.DefaultRenderingPipeline("pp", true, scene, [scene.activeCamera]);
      pipeline.fxaaEnabled = true;
      pipeline.bloomEnabled = true;
      pipeline.bloomThreshold = 0.48;
      pipeline.bloomWeight = 0.38;
      pipeline.bloomKernel = isMobile ? 24 : 40;
      pipeline.bloomScale = 0.5;
      pipeline.imageProcessingEnabled = true;
      pipeline.imageProcessing.contrast = 1.2;
      pipeline.imageProcessing.exposure = 1.35;
      pipeline.imageProcessing.toneMappingEnabled = true;
      pipeline.imageProcessing.vignetteEnabled = true;
      pipeline.imageProcessing.vignetteWeight = 1.25;
      pipeline.imageProcessing.vignetteColor = new BABYLON.Color4(0, 0, 0.02, 0);
      pipeline.imageProcessing.vignetteStretch = 0.45;
      if (!isMobile) {
        pipeline.chromaticAberrationEnabled = true;
        pipeline.chromaticAberration.aberrationAmount = 4;
        pipeline.grainEnabled = true;
        pipeline.grain.intensity = 6;
        pipeline.grain.animated = true;
      }
    }

    scene.blockMaterialDirtyMechanism = false;
    setProgress(100, "ยินดีต้อนรับ...");

    // ---------- online multiplayer (joins after the name dialog) ----------
    let net = { update() {}, getMonsterContext() { return null; } };
    function startNet(name) {
      try {
        net = initNet(scene, player, name);
      } catch (e) {
        console.warn("net disabled:", e);
      }
      mission.attachNet(net);
      monster.start();
    }
    const joinEl = document.getElementById("join");
    const joinName = document.getElementById("join-name");
    const joinBtn = document.getElementById("join-btn");
    if (q.has("px")) {
      // debug/screenshot mode: skip the dialog
      startNet("ทดสอบ" + Math.floor(Math.random() * 90 + 10));
    } else {
      joinName.value = localStorage.getItem("kk_name") || "";
      joinEl.style.display = "flex";
      setTimeout(() => joinName.focus(), 300);
      const submit = () => {
        const name = joinName.value.trim().slice(0, 12);
        if (name) localStorage.setItem("kk_name", name);
        joinEl.style.display = "none";
        audio.unlock();
        startNet(name);
      };
      joinBtn.addEventListener("click", submit);
      joinName.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
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
      audio.update();
      net.update(dt);
      const netCtx = net.getMonsterContext();
      mission.update(dt, netCtx);
      monster.update(dt, netCtx);
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
