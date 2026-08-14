// ============================================================
// player.js — character, FP/TP cameras, PC + mobile controls
// ============================================================
"use strict";

// Build a simple humanoid rig. Returns node + limb pivots for walk animation.
// Used for the local player and for remote online players.
function createCharacterRig(scene, shirtHex) {
  const C3 = (r, g, b) => new BABYLON.Color3(r, g, b);
  const root = new BABYLON.TransformNode("charRig", scene);

  const skinMat = new BABYLON.StandardMaterial("skinMat" + shirtHex, scene);
  skinMat.diffuseColor = C3(0.85, 0.65, 0.5);
  skinMat.specularColor = C3(0.05, 0.05, 0.05);
  const shirtMat = new BABYLON.StandardMaterial("shirtMat" + shirtHex, scene);
  shirtMat.diffuseColor = BABYLON.Color3.FromHexString(shirtHex);
  shirtMat.specularColor = C3(0.05, 0.05, 0.05);
  const pantsMat = new BABYLON.StandardMaterial("pantsMat" + shirtHex, scene);
  pantsMat.diffuseColor = C3(0.16, 0.18, 0.28);
  pantsMat.specularColor = C3(0.05, 0.05, 0.05);
  const hairMat = new BABYLON.StandardMaterial("hairMat" + shirtHex, scene);
  hairMat.diffuseColor = C3(0.08, 0.06, 0.05);

  const torso = BABYLON.MeshBuilder.CreateCapsule("cTorso", { height: 0.62, radius: 0.19 }, scene);
  torso.position.y = 1.15;
  torso.material = shirtMat;
  torso.parent = root;
  const hips = BABYLON.MeshBuilder.CreateCapsule("cHips", { height: 0.24, radius: 0.17 }, scene);
  hips.position.y = 0.86;
  hips.material = pantsMat;
  hips.parent = root;
  const head = BABYLON.MeshBuilder.CreateSphere("cHead", { diameter: 0.30, segments: 10 }, scene);
  head.position.y = 1.62;
  head.material = skinMat;
  head.parent = root;
  const hair = BABYLON.MeshBuilder.CreateSphere("cHair", { diameter: 0.32, segments: 10 }, scene);
  hair.position.set(0, 1.66, -0.02);
  hair.scaling.set(1, 0.72, 1);
  hair.material = hairMat;
  hair.parent = root;

  function limb(name, len, rad, matl, px, hingeY) {
    const pivot = new BABYLON.TransformNode(name + "_piv", scene);
    pivot.parent = root;
    pivot.position.set(px, hingeY, 0);
    const m = BABYLON.MeshBuilder.CreateCapsule(name, { height: len, radius: rad }, scene);
    m.position.y = -len / 2;
    m.material = matl;
    m.parent = pivot;
    return pivot;
  }
  const armL = limb("cArmL", 0.58, 0.07, shirtMat, -0.29, 1.40);
  const armR = limb("cArmR", 0.58, 0.07, shirtMat, 0.29, 1.40);
  const legL = limb("cLegL", 0.78, 0.085, pantsMat, -0.15, 0.78);
  const legR = limb("cLegR", 0.78, 0.085, pantsMat, 0.15, 0.78);
  const parts = [torso, hips, head, hair, armL, armR, legL, legR];

  return {
    node: root,
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
  };

  // ---------- collider (capsule) ----------
  const root = BABYLON.MeshBuilder.CreateCapsule("playerRoot", { height: 1.8, radius: 0.35 }, scene);
  root.position.set(0, 0.95, -228);   // just inside the gate
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
  const camera = new BABYLON.UniversalCamera("cam", new BABYLON.Vector3(0, 2, -232), scene);
  camera.minZ = 0.15;
  camera.maxZ = 1600;
  camera.fov = 1.05;
  camera.inputs.clear(); // we drive it manually
  scene.activeCamera = camera;

  // ---------- keyboard ----------
  const keys = {};
  window.addEventListener("keydown", (e) => {
    keys[e.code] = true;
    if (e.code === "KeyV") toggleView();
  });
  window.addEventListener("keyup", (e) => { keys[e.code] = false; });

  function toggleView() {
    state.view = state.view === 1 ? 3 : 1;
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
    // turning: arrow keys on PC, right stick on mobile
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
    const ilen = Math.hypot(ix, iz);
    if (ilen > 1) { ix /= ilen; iz /= ilen; }
    state.running = keys["ShiftLeft"] || keys["ShiftRight"] || state.runLatch;
    const speed = state.running ? 8.2 : 3.6;

    // move relative to yaw
    const sin = Math.sin(state.yaw), cos = Math.cos(state.yaw);
    const vx = (ix * cos + iz * sin) * speed;
    const vz = (iz * cos - ix * sin) * speed;
    const disp = new BABYLON.Vector3(vx * dt, -9.8 * dt * dt * 6 - 0.02, vz * dt);
    root.moveWithCollisions(disp);
    if (root.position.y < 0.95) root.position.y = 0.95;

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
      if (camPos.y < 0.4) camPos.y = 0.4;
      camera.position.copyFrom(camPos);
      camera.setTarget(camTarget);
    }
  }

  return { update, state, root };
}
