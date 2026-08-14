// ============================================================
// player.js — character, FP/TP cameras, PC + mobile controls
// ============================================================
"use strict";

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
    moveX: 0, moveZ: 0,  // input axes
  };

  // ---------- collider (capsule) ----------
  const root = BABYLON.MeshBuilder.CreateCapsule("playerRoot", { height: 1.8, radius: 0.35 }, scene);
  root.position.set(0, 0.95, -228);   // just inside the gate
  root.isVisible = false;
  root.checkCollisions = true;
  root.ellipsoid = new BABYLON.Vector3(0.35, 0.85, 0.35);
  root.ellipsoidOffset = new BABYLON.Vector3(0, 0, 0); // capsule center is already mid-body

  // ---------- visible character (third person) ----------
  const char = new BABYLON.TransformNode("charRoot", scene);
  char.parent = root;
  char.position.y = -0.95;

  const skinMat = new BABYLON.StandardMaterial("skinMat", scene);
  skinMat.diffuseColor = C3(0.85, 0.65, 0.5);
  skinMat.specularColor = C3(0.05, 0.05, 0.05);
  const shirtMat = new BABYLON.StandardMaterial("shirtMat", scene);
  shirtMat.diffuseColor = C3(0.7, 0.15, 0.12);
  shirtMat.specularColor = C3(0.05, 0.05, 0.05);
  const pantsMat = new BABYLON.StandardMaterial("pantsMat", scene);
  pantsMat.diffuseColor = C3(0.16, 0.18, 0.28);
  pantsMat.specularColor = C3(0.05, 0.05, 0.05);
  const hairMat = new BABYLON.StandardMaterial("hairMat", scene);
  hairMat.diffuseColor = C3(0.08, 0.06, 0.05);

  const torso = BABYLON.MeshBuilder.CreateCapsule("cTorso", { height: 0.62, radius: 0.19 }, scene);
  torso.position.y = 1.15;
  torso.material = shirtMat;
  torso.parent = char;
  const hips = BABYLON.MeshBuilder.CreateCapsule("cHips", { height: 0.24, radius: 0.17 }, scene);
  hips.position.y = 0.86;
  hips.material = pantsMat;
  hips.parent = char;
  const head = BABYLON.MeshBuilder.CreateSphere("cHead", { diameter: 0.30, segments: 10 }, scene);
  head.position.y = 1.62;
  head.material = skinMat;
  head.parent = char;
  const hair = BABYLON.MeshBuilder.CreateSphere("cHair", { diameter: 0.32, segments: 10 }, scene);
  hair.position.set(0, 1.66, -0.02);
  hair.scaling.set(1, 0.72, 1);
  hair.material = hairMat;
  hair.parent = char;

  function limb(name, len, rad, matl, px, py, hingeY) {
    const pivot = new BABYLON.TransformNode(name + "_piv", scene);
    pivot.parent = char;
    pivot.position.set(px, hingeY, 0);
    const m = BABYLON.MeshBuilder.CreateCapsule(name, { height: len, radius: rad }, scene);
    m.position.y = -len / 2;
    m.material = matl;
    m.parent = pivot;
    return pivot;
  }
  const armL = limb("cArmL", 0.58, 0.07, shirtMat, -0.29, 0, 1.40);
  const armR = limb("cArmR", 0.58, 0.07, shirtMat, 0.29, 0, 1.40);
  const legL = limb("cLegL", 0.78, 0.085, pantsMat, -0.15, 0, 0.78);
  const legR = limb("cLegR", 0.78, 0.085, pantsMat, 0.15, 0, 0.78);
  const charParts = [torso, hips, head, hair];
  char.getChildTransformNodes().forEach(() => {});

  function setCharVisible(v) {
    torso.setEnabled(v); hips.setEnabled(v); head.setEnabled(v); hair.setEnabled(v);
    armL.setEnabled(v); armR.setEnabled(v); legL.setEnabled(v); legR.setEnabled(v);
  }

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
      state.yaw -= e.movementX * SENS;
      state.pitch = Math.max(-1.35, Math.min(1.35, state.pitch + e.movementY * SENS));
    }
  });
  window.addEventListener("wheel", (e) => {
    if (state.view === 3) {
      state.tpDist = Math.max(2.2, Math.min(9, state.tpDist + Math.sign(e.deltaY) * 0.6));
    }
  });

  // ---------- mobile: joystick + look drag ----------
  const joyZone = document.getElementById("joystick-zone");
  const joyBase = document.getElementById("joystick-base");
  const joyKnob = document.getElementById("joystick-knob");
  let joyId = null, joyCX = 0, joyCY = 0;
  let lookId = null, lookLX = 0, lookLY = 0;

  if (isMobile) {
    joyZone.addEventListener("touchstart", (e) => {
      for (const t of e.changedTouches) {
        if (joyId === null) {
          joyId = t.identifier;
          joyCX = t.clientX; joyCY = t.clientY;
          joyBase.style.display = "block";
          joyBase.style.left = (joyCX - 60) + "px";
          joyBase.style.top = (joyCY - 60) + "px";
          joyBase.style.bottom = "auto";
        }
      }
      e.preventDefault();
    }, { passive: false });

    joyZone.addEventListener("touchmove", (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === joyId) {
          let dx = t.clientX - joyCX, dy = t.clientY - joyCY;
          const len = Math.hypot(dx, dy), max = 52;
          if (len > max) { dx = dx / len * max; dy = dy / len * max; }
          joyKnob.style.transform = `translate(${dx}px, ${dy}px)`;
          state.moveX = dx / max;
          state.moveZ = -dy / max;
        }
      }
      e.preventDefault();
    }, { passive: false });

    const joyEnd = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === joyId) {
          joyId = null;
          state.moveX = 0; state.moveZ = 0;
          joyKnob.style.transform = "translate(0,0)";
          joyBase.style.display = "none";
        }
      }
    };
    joyZone.addEventListener("touchend", joyEnd);
    joyZone.addEventListener("touchcancel", joyEnd);

    // right-half look
    canvas.addEventListener("touchstart", (e) => {
      for (const t of e.changedTouches) {
        if (lookId === null && t.clientX > window.innerWidth * 0.45) {
          lookId = t.identifier;
          lookLX = t.clientX; lookLY = t.clientY;
        }
      }
    }, { passive: true });
    canvas.addEventListener("touchmove", (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === lookId) {
          state.yaw -= (t.clientX - lookLX) * 0.005;
          state.pitch = Math.max(-1.35, Math.min(1.35, state.pitch + (t.clientY - lookLY) * 0.005));
          lookLX = t.clientX; lookLY = t.clientY;
        }
      }
      e.preventDefault();
    }, { passive: false });
    const lookEnd = (e) => {
      for (const t of e.changedTouches) if (t.identifier === lookId) lookId = null;
    };
    canvas.addEventListener("touchend", lookEnd);
    canvas.addEventListener("touchcancel", lookEnd);

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
    // gather input
    let ix = state.moveX, iz = state.moveZ;
    if (!isMobile || (ix === 0 && iz === 0)) {
      ix = (keys["KeyD"] || keys["ArrowRight"] ? 1 : 0) - (keys["KeyA"] || keys["ArrowLeft"] ? 1 : 0);
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
      const sw = Math.sin(walkPhase) * (state.running ? 0.9 : 0.55);
      armL.rotation.x = sw; armR.rotation.x = -sw;
      legL.rotation.x = -sw; legR.rotation.x = sw;
    } else {
      const decay = Math.min(1, dt * 8);
      armL.rotation.x *= 1 - decay; armR.rotation.x *= 1 - decay;
      legL.rotation.x *= 1 - decay; legR.rotation.x *= 1 - decay;
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
