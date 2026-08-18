// ============================================================
// player.js — character, FP/TP cameras, PC + mobile controls
// ============================================================
"use strict";

// Golden ticket cage the Keeper locks caught players inside.
// Shared by the local player (player.js) and remote avatars (net.js).
function buildCageMesh(scene) {
  const node = new BABYLON.TransformNode("ticketCage", scene);
  const barMat = new BABYLON.StandardMaterial("cageBarM", scene);
  barMat.diffuseColor = new BABYLON.Color3(0.55, 0.42, 0.12);
  barMat.emissiveColor = new BABYLON.Color3(0.45, 0.28, 0.04);
  barMat.specularColor = new BABYLON.Color3(0.6, 0.5, 0.2);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const bar = BABYLON.MeshBuilder.CreateCylinder("cageBar", { height: 2.5, diameter: 0.07, tessellation: 6 }, scene);
    bar.position.set(Math.cos(a) * 0.75, 1.25, Math.sin(a) * 0.75);
    bar.material = barMat;
    bar.parent = node;
    bar.isPickable = false;
  }
  for (const y of [0.15, 2.45]) {
    const ring = BABYLON.MeshBuilder.CreateTorus("cageRing", { diameter: 1.5, thickness: 0.09, tessellation: 16 }, scene);
    ring.position.y = y;
    ring.material = barMat;
    ring.parent = node;
    ring.isPickable = false;
  }
  const top = BABYLON.MeshBuilder.CreateCylinder("cageTop", { height: 0.5, diameterBottom: 1.6, diameterTop: 0.1, tessellation: 10 }, scene);
  top.position.y = 2.7;
  top.material = barMat;
  top.parent = node;
  top.isPickable = false;
  return node;
}

// Build a humanoid rig with a real face (eyes, brows, mouth), neck, hands
// and shoes. Faces +Z. Used for the local player and remote online players.
function createCharacterRig(scene, shirtHex) {
  const C3 = (r, g, b) => new BABYLON.Color3(r, g, b);
  const root = new BABYLON.TransformNode("charRig", scene);

  const skinMat = new BABYLON.StandardMaterial("skinMat" + shirtHex, scene);
  skinMat.diffuseColor = C3(0.87, 0.68, 0.53);
  skinMat.specularColor = C3(0.04, 0.04, 0.04);
  const shirtMat = new BABYLON.StandardMaterial("shirtMat" + shirtHex, scene);
  shirtMat.diffuseColor = BABYLON.Color3.FromHexString(shirtHex);
  shirtMat.specularColor = C3(0.05, 0.05, 0.05);
  const pantsMat = new BABYLON.StandardMaterial("pantsMat" + shirtHex, scene);
  pantsMat.diffuseColor = C3(0.16, 0.18, 0.28);
  pantsMat.specularColor = C3(0.05, 0.05, 0.05);
  const hairMat = new BABYLON.StandardMaterial("hairMat" + shirtHex, scene);
  hairMat.diffuseColor = C3(0.09, 0.07, 0.05);
  hairMat.specularColor = C3(0.12, 0.1, 0.08);
  const shoeMat = new BABYLON.StandardMaterial("shoeMat" + shirtHex, scene);
  shoeMat.diffuseColor = C3(0.12, 0.1, 0.09);
  const eyeWhiteMat = new BABYLON.StandardMaterial("eyeWhiteM" + shirtHex, scene);
  eyeWhiteMat.diffuseColor = C3(0.95, 0.94, 0.9);
  eyeWhiteMat.emissiveColor = C3(0.22, 0.22, 0.2); // readable in the dark
  eyeWhiteMat.specularColor = C3(0.3, 0.3, 0.3);
  const pupilMat = new BABYLON.StandardMaterial("pupilM" + shirtHex, scene);
  pupilMat.diffuseColor = C3(0.04, 0.03, 0.02);
  const mouthMat = new BABYLON.StandardMaterial("mouthM" + shirtHex, scene);
  mouthMat.diffuseColor = C3(0.45, 0.2, 0.18);

  const parts = [];
  function P(m) { parts.push(m); return m; }

  // body
  const hips = P(BABYLON.MeshBuilder.CreateCapsule("cHips", { height: 0.26, radius: 0.16 }, scene));
  hips.position.y = 0.92;
  hips.material = pantsMat;
  hips.parent = root;
  const torso = P(BABYLON.MeshBuilder.CreateCapsule("cTorso", { height: 0.6, radius: 0.175 }, scene));
  torso.position.y = 1.22;
  torso.scaling.z = 0.78; // flatter chest, less barrel-like
  torso.material = shirtMat;
  torso.parent = root;
  // shoulders that visually connect the arms to the torso
  for (const sx of [-1, 1]) {
    const sh = P(BABYLON.MeshBuilder.CreateSphere("cShoulder", { diameter: 0.16, segments: 8 }, scene));
    sh.position.set(sx * 0.21, 1.44, 0);
    sh.material = shirtMat;
    sh.parent = root;
  }
  // neck + head
  const neck = P(BABYLON.MeshBuilder.CreateCylinder("cNeck", { height: 0.12, diameter: 0.11, tessellation: 8 }, scene));
  neck.position.y = 1.56;
  neck.material = skinMat;
  neck.parent = root;
  const head = P(BABYLON.MeshBuilder.CreateSphere("cHead", { diameter: 0.30, segments: 12 }, scene));
  head.position.y = 1.71;
  head.scaling.set(0.92, 1.06, 0.94);
  head.material = skinMat;
  head.parent = root;
  // hair: a cap over the top plus a patch at the back — face stays open
  const hair = P(BABYLON.MeshBuilder.CreateSphere("cHair", { diameter: 0.32, segments: 12 }, scene));
  hair.position.set(0, 1.782, -0.045);
  hair.scaling.set(0.98, 0.62, 0.82);
  hair.material = hairMat;
  hair.parent = root;
  const hairBack = P(BABYLON.MeshBuilder.CreateSphere("cHairB", { diameter: 0.27, segments: 10 }, scene));
  hairBack.position.set(0, 1.7, -0.085);
  hairBack.scaling.set(0.9, 0.95, 0.55);
  hairBack.material = hairMat;
  hairBack.parent = root;
  // face: eyes, pupils, brows, nose, mouth (front = +Z)
  for (const ex of [-1, 1]) {
    const eye = P(BABYLON.MeshBuilder.CreateSphere("cEye", { diameter: 0.072, segments: 8 }, scene));
    eye.position.set(ex * 0.058, 1.725, 0.108);
    eye.scaling.set(1, 0.85, 0.55);
    eye.material = eyeWhiteMat;
    eye.parent = root;
    const pupil = P(BABYLON.MeshBuilder.CreateSphere("cPupil", { diameter: 0.032, segments: 6 }, scene));
    pupil.position.set(ex * 0.058, 1.723, 0.128);
    pupil.material = pupilMat;
    pupil.parent = root;
    const brow = P(BABYLON.MeshBuilder.CreateBox("cBrow", { width: 0.07, height: 0.014, depth: 0.02 }, scene));
    brow.position.set(ex * 0.058, 1.772, 0.118);
    brow.rotation.z = ex * -0.12;
    brow.material = hairMat;
    brow.parent = root;
  }
  const nose = P(BABYLON.MeshBuilder.CreateSphere("cNose", { diameter: 0.045, segments: 6 }, scene));
  nose.position.set(0, 1.693, 0.132);
  nose.scaling.set(0.8, 0.9, 0.9);
  nose.material = skinMat;
  nose.parent = root;
  const mouth = P(BABYLON.MeshBuilder.CreateBox("cMouth", { width: 0.075, height: 0.016, depth: 0.012 }, scene));
  mouth.position.set(0, 1.638, 0.128);
  mouth.material = mouthMat;
  mouth.parent = root;
  // ears
  for (const ex of [-1, 1]) {
    const ear = P(BABYLON.MeshBuilder.CreateSphere("cEar", { diameter: 0.055, segments: 6 }, scene));
    ear.position.set(ex * 0.135, 1.7, 0);
    ear.scaling.set(0.5, 1, 0.8);
    ear.material = skinMat;
    ear.parent = root;
  }

  // limbs with hands / shoes attached so they swing together
  function limb(name, len, rad, matl, px, hingeY, tip) {
    const pivot = new BABYLON.TransformNode(name + "_piv", scene);
    pivot.parent = root;
    pivot.position.set(px, hingeY, 0);
    const m = P(BABYLON.MeshBuilder.CreateCapsule(name, { height: len, radius: rad }, scene));
    m.position.y = -len / 2;
    m.material = matl;
    m.parent = pivot;
    if (tip === "hand") {
      const hand = P(BABYLON.MeshBuilder.CreateSphere(name + "_hand", { diameter: rad * 2.3, segments: 6 }, scene));
      hand.position.y = -len - 0.01;
      hand.material = skinMat;
      hand.parent = pivot;
    } else if (tip === "shoe") {
      const shoe = P(BABYLON.MeshBuilder.CreateBox(name + "_shoe", { width: rad * 2.4, height: 0.09, depth: 0.27 }, scene));
      shoe.position.set(0, -len - 0.02, 0.05);
      shoe.material = shoeMat;
      shoe.parent = pivot;
    }
    return pivot;
  }
  const armL = limb("cArmL", 0.52, 0.058, shirtMat, -0.245, 1.42, "hand");
  const armR = limb("cArmR", 0.52, 0.058, shirtMat, 0.245, 1.42, "hand");
  const legL = limb("cLegL", 0.78, 0.082, pantsMat, -0.1, 0.84, "shoe");
  const legR = limb("cLegR", 0.78, 0.082, pantsMat, 0.1, 0.84, "shoe");
  // slight natural outward arm rest
  armL.rotation.z = 0.07;
  armR.rotation.z = -0.07;

  return {
    node: root,
    setShirtColor(hex) { shirtMat.diffuseColor = BABYLON.Color3.FromHexString(hex); },
    setEnabled(v) { for (const p of parts) p.setEnabled(v); },
    // phase-driven limb swing; amp 0 = standing
    swing(phase, amp) {
      const sw = Math.sin(phase) * amp;
      armL.rotation.x = sw; armR.rotation.x = -sw;
      legL.rotation.x = -sw; legR.rotation.x = sw;
    },
    relax(dt) {
      const decay = Math.min(1, dt * 8);
      armL.rotation.x *= 1 - decay; armR.rotation.x *= 1 - decay;
      legL.rotation.x *= 1 - decay; legR.rotation.x *= 1 - decay;
    },
    dispose() {
      for (const p of parts) p.dispose ? p.dispose() : 0;
      root.dispose();
    },
  };
}

function createPlayer(scene, canvas) {
  const C3 = (r, g, b) => new BABYLON.Color3(r, g, b);
  const isMobile = ("ontouchstart" in window) || navigator.maxTouchPoints > 0
    || location.search.includes("mobile=1");
  if (isMobile) document.body.classList.add("is-mobile");

  // ---------- state ----------
  const state = {
    yaw: Math.PI,        // facing north (into the park) from the entrance
    pitch: 0.05,
    view: 1,             // 1 = first person, 3 = third person
    tpDist: 5,
    running: false,
    runLatch: false,     // mobile run toggle
    moveX: 0, moveZ: 0,  // input axes (left stick / WASD)
    turn: 0,             // yaw input (right stick / arrow keys)
    dead: false,
  };

  // ---------- collider (capsule) ----------
  const root = BABYLON.MeshBuilder.CreateCapsule("playerRoot", { height: 1.8, radius: 0.35 }, scene);
  root.position.set(0, 0.95, -92);    // just inside the gate
  root.isVisible = false;
  root.checkCollisions = true;
  root.ellipsoid = new BABYLON.Vector3(0.35, 0.85, 0.35);
  root.ellipsoidOffset = new BABYLON.Vector3(0, 0, 0); // capsule center is already mid-body

  // ---------- visible character (third person) ----------
  const rig = createCharacterRig(scene, "#b32620");
  const char = rig.node;
  char.parent = root;
  char.position.y = -0.95;

  function setCharVisible(v) { rig.setEnabled(v); }

  // ---------- camera ----------
  const camera = new BABYLON.UniversalCamera("cam", new BABYLON.Vector3(0, 2, -96), scene);
  camera.minZ = 0.15;
  camera.maxZ = 1000;
  camera.fov = 1.05;
  camera.inputs.clear(); // we drive it manually
  scene.activeCamera = camera;

  // ---------- keyboard ----------
  const keys = {};
  const typing = (e) => e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA");
  window.addEventListener("keydown", (e) => {
    if (typing(e)) return; // don't walk while typing a name
    keys[e.code] = true;
    if (e.code === "KeyV") toggleView();
  });
  window.addEventListener("keyup", (e) => {
    if (typing(e)) return;
    keys[e.code] = false;
  });

  function toggleView() {
    state.view = state.view === 1 ? 3 : 1;
  }

  // caught by the Ticket Keeper: locked in a ticket cage until a friend
  // stands close for a few seconds (mission.js handles the rescue timer)
  let cageMesh = null;
  function die() {
    if (state.dead) return;
    state.dead = true;
    state.moveX = 0; state.moveZ = 0; state.turn = 0;
    state.runLatch = false;
    const runBtn = document.getElementById("btn-run");
    if (runBtn) runBtn.classList.remove("active");
    if (state.view === 1) state.view = 3; // watch yourself in the cage
    if (!cageMesh) cageMesh = buildCageMesh(scene);
    cageMesh.position.set(root.position.x, 0, root.position.z);
    cageMesh.setEnabled(true);
    const cage = document.getElementById("cage-overlay");
    if (cage) cage.classList.add("show");
    const death = document.getElementById("death-screen");
    if (death) {
      death.classList.add("show");
      setTimeout(() => death.classList.remove("show"), 1600);
    }
  }

  function revive() {
    if (!state.dead) return;
    state.dead = false;
    if (cageMesh) cageMesh.setEnabled(false);
    const cage = document.getElementById("cage-overlay");
    if (cage) cage.classList.remove("show");
  }

  // ---------- mouse (pointer lock) ----------
  const SENS = 0.0022;
  canvas.addEventListener("click", () => {
    if (!isMobile && document.pointerLockElement !== canvas) {
      canvas.requestPointerLock();
    }
  });
  window.addEventListener("mousemove", (e) => {
    if (document.pointerLockElement === canvas) {
      state.yaw += e.movementX * SENS; // mouse right = look right
      state.pitch = Math.max(-1.35, Math.min(1.35, state.pitch + e.movementY * SENS));
    }
  });
  window.addEventListener("wheel", (e) => {
    if (state.view === 3) {
      state.tpDist = Math.max(2.2, Math.min(9, state.tpDist + Math.sign(e.deltaY) * 0.6));
    }
  });

  // ---------- mobile: dual joysticks ----------
  // left stick = WASD-style move, right stick = turn left/right only
  function makeStick(zoneId, baseId, knobId, onMove) {
    const zone = document.getElementById(zoneId);
    const base = document.getElementById(baseId);
    const knob = document.getElementById(knobId);
    let touchId = null, cx = 0, cy = 0;
    zone.addEventListener("touchstart", (e) => {
      for (const t of e.changedTouches) {
        if (touchId === null) {
          touchId = t.identifier;
          cx = t.clientX; cy = t.clientY;
          base.style.display = "block";
          base.style.left = (cx - 60) + "px";
          base.style.top = (cy - 60) + "px";
          base.style.right = "auto";
          base.style.bottom = "auto";
        }
      }
      e.preventDefault();
    }, { passive: false });
    zone.addEventListener("touchmove", (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === touchId) {
          let dx = t.clientX - cx, dy = t.clientY - cy;
          const len = Math.hypot(dx, dy), max = 52;
          if (len > max) { dx = dx / len * max; dy = dy / len * max; }
          knob.style.transform = `translate(${dx}px, ${dy}px)`;
          onMove(dx / max, dy / max);
        }
      }
      e.preventDefault();
    }, { passive: false });
    const end = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === touchId) {
          touchId = null;
          knob.style.transform = "translate(0,0)";
          base.style.display = "none";
          onMove(0, 0);
        }
      }
    };
    zone.addEventListener("touchend", end);
    zone.addEventListener("touchcancel", end);
  }

  if (isMobile) {
    makeStick("joystick-zone", "joystick-base", "joystick-knob", (nx, ny) => {
      state.moveX = nx;
      state.moveZ = -ny;
    });
    makeStick("joystick-zone-right", "joystick-base-r", "joystick-knob-r", (nx, ny) => {
      state.turn = nx; // yaw only — vertical axis intentionally ignored
    });

    document.getElementById("btn-view").addEventListener("click", toggleView);
    const runBtn = document.getElementById("btn-run");
    runBtn.addEventListener("click", () => {
      state.runLatch = !state.runLatch;
      runBtn.classList.toggle("active", state.runLatch);
    });
  }

  // ---------- per-frame update ----------
  const camTarget = new BABYLON.Vector3();
  const camPos = new BABYLON.Vector3();
  let walkPhase = 0;
  const rayOrigin = new BABYLON.Vector3();

  function update(dt) {
    // caged players can still turn and look around — they just can't move
    let turn = state.turn;
    if (Math.abs(turn) < 0.15) turn = 0; // stick deadzone
    turn += (keys["ArrowRight"] ? 1 : 0) - (keys["ArrowLeft"] ? 1 : 0);
    state.yaw += turn * 2.4 * dt; // yaw increases clockwise: + = turn right

    // gather move input: W/S forward-back, A/D strafe (left stick on mobile)
    let ix = state.moveX, iz = state.moveZ;
    if (!isMobile || (ix === 0 && iz === 0)) {
      ix = (keys["KeyD"] ? 1 : 0) - (keys["KeyA"] ? 1 : 0);
      iz = (keys["KeyW"] || keys["ArrowUp"] ? 1 : 0) - (keys["KeyS"] || keys["ArrowDown"] ? 1 : 0);
    }
    if (state.dead) { ix = 0; iz = 0; }
    const ilen = Math.hypot(ix, iz);
    if (ilen > 1) { ix /= ilen; iz /= ilen; }
    state.running = !state.dead && (keys["ShiftLeft"] || keys["ShiftRight"] || state.runLatch);
    const speed = state.running ? 8.2 : 3.6;

    // move relative to yaw
    const sin = Math.sin(state.yaw), cos = Math.cos(state.yaw);
    const vx = (ix * cos + iz * sin) * speed;
    const vz = (iz * cos - ix * sin) * speed;
    const disp = new BABYLON.Vector3(vx * dt, -9.8 * dt * dt * 6 - 0.02, vz * dt);
    root.moveWithCollisions(disp);
    // floor clamp: 0.95 above the park, lower inside a basement
    const floorLimit = groundLimitAt(root.position.x, root.position.z);
    if (root.position.y < floorLimit) root.position.y = floorLimit;

    // face character toward movement direction
    const moving = ilen > 0.05;
    if (moving) {
      const targetRot = Math.atan2(vx, vz);
      let dr = targetRot - char.rotation.y;
      while (dr > Math.PI) dr -= Math.PI * 2;
      while (dr < -Math.PI) dr += Math.PI * 2;
      char.rotation.y += dr * Math.min(1, dt * 12);
    }

    // limb swing
    if (moving) {
      walkPhase += dt * (state.running ? 11 : 7);
      rig.swing(walkPhase, state.running ? 0.9 : 0.55);
    } else {
      rig.relax(dt);
    }

    // ---------- camera ----------
    const headY = root.position.y + 0.62; // eye height ~1.57
    const fwd = new BABYLON.Vector3(
      Math.sin(state.yaw) * Math.cos(state.pitch),
      Math.sin(-state.pitch),
      Math.cos(state.yaw) * Math.cos(state.pitch)
    );

    if (state.view === 1) {
      setCharVisible(false);
      camPos.set(root.position.x, headY, root.position.z);
      camera.position.copyFrom(camPos);
      camTarget.copyFrom(camPos).addInPlace(fwd);
      camera.setTarget(camTarget);
      // subtle head bob
      if (moving) {
        camera.position.y += Math.sin(walkPhase * 2) * 0.035;
      }
    } else {
      setCharVisible(true);
      // orbit position behind player
      let dist = state.tpDist;
      camTarget.set(root.position.x, headY + 0.15, root.position.z);
      const back = fwd.scale(-1);
      camPos.copyFrom(camTarget).addInPlace(back.scale(dist));
      // camera collision: ray from target to camera
      rayOrigin.copyFrom(camTarget);
      const dir = camPos.subtract(camTarget);
      const dlen = dir.length();
      dir.normalize();
      const ray = new BABYLON.Ray(rayOrigin, dir, dlen);
      const hit = scene.pickWithRay(ray, (m) => m.checkCollisions && m !== root && m.isVisible);
      if (hit && hit.hit && hit.distance > 0.3) {
        dist = Math.min(dist, hit.distance - 0.25);
      }
      camPos.copyFrom(camTarget).addInPlace(fwd.scale(-dist));
      // keep the camera above whichever floor the player is standing on
      const camFloor = groundLimitAt(root.position.x, root.position.z) - 0.55;
      if (camPos.y < camFloor) camPos.y = camFloor;
      camera.position.copyFrom(camPos);
      camera.setTarget(camTarget);
    }
  }

  return { update, die, revive, state, root, rig };
}
