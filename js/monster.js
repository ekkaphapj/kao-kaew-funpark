// ============================================================
// monster.js — shared Ticket Keeper hunt event and low-poly rig
// One elected multiplayer host simulates AI; other clients interpolate it.
// ============================================================
"use strict";

function createTicketKeeper(scene, player, audio) {
  const C3 = (r, g, b) => new BABYLON.Color3(r, g, b);
  const root = BABYLON.MeshBuilder.CreateCapsule("keeperCollider", { height: 4.2, radius: 0.48, tessellation: 8 }, scene);
  root.position.set(0, 2.1, -125);
  root.isVisible = false;
  root.isPickable = false;
  root.checkCollisions = true;
  root.ellipsoid = new BABYLON.Vector3(0.48, 2.0, 0.48);

  const rig = new BABYLON.TransformNode("ticketKeeper", scene);
  rig.parent = root;
  rig.position.y = -2.1;
  rig.setEnabled(false);

  function material(name, color, emissive) {
    const m = new BABYLON.StandardMaterial(name, scene);
    m.diffuseColor = color;
    m.specularColor = C3(0.08, 0.07, 0.06);
    if (emissive) m.emissiveColor = emissive;
    return m;
  }
  const ivory = material("keeperIvory", C3(0.58, 0.55, 0.47));
  const burgundy = material("keeperBurgundy", C3(0.28, 0.055, 0.07));
  const dark = material("keeperDark", C3(0.055, 0.045, 0.04));
  const brass = material("keeperBrass", C3(0.32, 0.23, 0.09));
  const paper = material("keeperTickets", C3(0.48, 0.39, 0.25));
  const glow = material("keeperGlow", C3(0.12, 0.055, 0.005), C3(1.0, 0.28, 0.015));
  const parts = [];
  function part(mesh, parent, mat) {
    mesh.parent = parent || rig;
    mesh.material = mat;
    mesh.isPickable = false;
    parts.push(mesh);
    return mesh;
  }

  const torso = part(BABYLON.MeshBuilder.CreateBox("keeperTorso", { width: 1.05, height: 1.5, depth: 0.58 }, scene), rig, burgundy);
  torso.position.y = 2.65;
  torso.rotation.x = 0.24;
  const shirt = part(BABYLON.MeshBuilder.CreateBox("keeperShirt", { width: 0.58, height: 1.28, depth: 0.61 }, scene), rig, ivory);
  shirt.position.set(0, 2.64, -0.01);
  shirt.rotation.x = 0.24;
  const chestLamp = part(BABYLON.MeshBuilder.CreateCylinder("keeperChestGlow", { height: 0.16, diameter: 0.31, tessellation: 8 }, scene), rig, glow);
  chestLamp.position.set(0, 2.55, 0.34);
  chestLamp.rotation.x = Math.PI / 2;

  const neck = part(BABYLON.MeshBuilder.CreateCylinder("keeperNeck", { height: 0.4, diameter: 0.28, tessellation: 7 }, scene), rig, brass);
  neck.position.set(0, 3.47, 0.12);
  neck.rotation.x = 0.22;
  const head = part(BABYLON.MeshBuilder.CreateSphere("keeperMask", { diameter: 1, segments: 10 }, scene), rig, ivory);
  head.position.set(0, 3.92, 0.23);
  head.scaling.set(0.72, 0.84, 0.48);
  head.rotation.x = 0.12;
  for (const ex of [-0.25, 0.25]) {
    const socket = part(BABYLON.MeshBuilder.CreateSphere("keeperSocket", { diameter: 0.27, segments: 7 }, scene), rig, dark);
    socket.position.set(ex, 4.02, 0.66);
    socket.scaling.z = 0.35;
    const eye = part(BABYLON.MeshBuilder.CreateSphere("keeperEye", { diameter: 0.075, segments: 6 }, scene), rig, glow);
    eye.position.set(ex, 4.02, 0.78);
  }
  const mouth = part(BABYLON.MeshBuilder.CreateBox("keeperSmile", { width: 0.48, height: 0.08, depth: 0.06 }, scene), rig, dark);
  mouth.position.set(0, 3.72, 0.7);
  const cap = part(BABYLON.MeshBuilder.CreateCylinder("keeperCap", { height: 0.36, diameter: 0.88, tessellation: 10 }, scene), rig, burgundy);
  cap.position.set(0, 4.66, 0.18);
  const capBand = part(BABYLON.MeshBuilder.CreateTorus("keeperCapBand", { diameter: 0.82, thickness: 0.09, tessellation: 10 }, scene), rig, brass);
  capBand.position.set(0, 4.5, 0.18);
  const backPole = part(BABYLON.MeshBuilder.CreateCylinder("keeperCarouselPole", { height: 3.0, diameter: 0.16, tessellation: 7 }, scene), rig, brass);
  backPole.position.set(0, 4.05, -0.42);
  backPole.rotation.z = -0.13;

  const armPivots = [], legPivots = [];
  for (const side of [-1, 1]) {
    const armPivot = new BABYLON.TransformNode("keeperArmPivot", scene);
    armPivot.parent = rig;
    armPivot.position.set(side * 0.66, 3.22, 0);
    armPivots.push(armPivot);
    const upper = part(BABYLON.MeshBuilder.CreateCylinder("keeperArm", { height: 1.42, diameter: 0.22, tessellation: 7 }, scene), armPivot, burgundy);
    upper.position.y = -0.67;
    const fore = part(BABYLON.MeshBuilder.CreateCylinder("keeperForearm", { height: 1.3, diameter: 0.16, tessellation: 7 }, scene), armPivot, dark);
    fore.position.y = -1.95;
    const hand = side < 0
      ? BABYLON.MeshBuilder.CreateBox("keeperPuncher", { width: 0.48, height: 0.72, depth: 0.32 }, scene)
      : BABYLON.MeshBuilder.CreateSphere("keeperHand", { diameter: 0.3, segments: 7 }, scene);
    part(hand, armPivot, side < 0 ? brass : dark);
    hand.position.y = -2.7;

    const legPivot = new BABYLON.TransformNode("keeperLegPivot", scene);
    legPivot.parent = rig;
    legPivot.position.set(side * 0.3, 1.9, 0);
    legPivots.push(legPivot);
    const leg = part(BABYLON.MeshBuilder.CreateCylinder("keeperLeg", { height: 1.72, diameter: 0.18, tessellation: 7 }, scene), legPivot, dark);
    leg.position.y = -0.82;
    const shoe = part(BABYLON.MeshBuilder.CreateBox("keeperShoe", { width: 0.42, height: 0.26, depth: 0.74 }, scene), legPivot, dark);
    shoe.position.set(0, -1.73, 0.2);
  }
  for (let i = 0; i < 8; i++) {
    const ticket = part(BABYLON.MeshBuilder.CreateBox("keeperTicket", { width: 0.25, height: 0.72, depth: 0.025 }, scene), rig, paper);
    ticket.position.set(-0.63 + i * 0.18, 1.75 - (i % 2) * 0.14, 0.04 + Math.abs(i - 3.5) * -0.025);
    ticket.rotation.z = (i - 3.5) * 0.1;
  }

  if (PARK.shadowGenerator) {
    for (const mesh of parts) PARK.shadowGenerator.addShadowCaster(mesh, false);
  }

  const SPAWN_INTERVAL = 300;
  const HUNT_DURATION = 180;
  const REST_DURATION = SPAWN_INTERVAL - HUNT_DURATION;
  const DETECT_RADIUS = 58;
  const WANDER_SPEED = 2.45;
  const CHASE_SPEED = 10.4;
  let started = false;
  let active = false;
  let activeRemaining = 0;
  let nextSpawn = location.search.includes("monster=1") ? 3 : SPAWN_INTERVAL;
  let targetPoint = new BABYLON.Vector3(0, 0, 0);
  let targetId = null;
  let scanTimer = 0;
  let gait = 0;
  let stuckTime = 0;
  let lastAuthority = false;
  let broadcastTimer = 0;
  let alertTimer = 0;
  let lastRemoteStamp = 0;
  let remoteTargetState = null;
  const killCooldowns = new Map();
  const statusEl = document.getElementById("monster-status");
  const alertEl = document.getElementById("monster-alert");
  const spawnPoints = [[-98, 0], [98, 18], [72, 103], [-95, 72], [0, -105]];

  function setVisible(value) {
    active = value;
    rig.setEnabled(value);
    if (!value) targetId = null;
  }

  function showAlert() {
    alertTimer = 7;
    if (alertEl) alertEl.classList.add("show");
    if (audio && audio.playAlarm) audio.playAlarm();
  }

  function chooseOutdoorPoint() {
    for (let tries = 0; tries < 30; tries++) {
      const p = new BABYLON.Vector3(-100 + Math.random() * 200, 0, -102 + Math.random() * 204);
      if (!isInsideParkBuilding(p, -2.2)) {
        targetPoint.copyFrom(p);
        return;
      }
    }
    targetPoint.set(0, 0, -10);
  }

  function spawn() {
    const sp = spawnPoints[Math.floor(Math.random() * spawnPoints.length)];
    root.position.set(sp[0], 2.1, sp[1]);
    root.rotation.y = Math.random() * Math.PI * 2;
    activeRemaining = HUNT_DURATION;
    setVisible(true);
    chooseOutdoorPoint();
    showAlert();
  }

  function despawn() {
    setVisible(false);
    // Five minutes from one appearance to the next: 3 minutes hunting + 2 minutes quiet.
    nextSpawn = REST_DURATION;
    if (statusEl) statusEl.classList.remove("active");
  }

  function formatTime(seconds) {
    const s = Math.max(0, Math.ceil(seconds));
    return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  }

  function updateHud() {
    if (!statusEl) return;
    if (active) {
      statusEl.textContent = "⚠ นายตรวจตั๋วกำลังออกล่า · " + formatTime(activeRemaining);
      statusEl.classList.add("active");
    } else if (nextSpawn <= 30 && started) {
      statusEl.textContent = "⚠ สัญญาณผิดปกติ · " + formatTime(nextSpawn);
      statusEl.classList.add("active");
    } else {
      statusEl.classList.remove("active");
    }
  }

  function canSee(candidate) {
    const from = new BABYLON.Vector3(root.position.x, 3.3, root.position.z);
    const to = new BABYLON.Vector3(candidate.x, 1.2, candidate.z);
    const delta = to.subtract(from);
    const distance = delta.length();
    if (distance > DETECT_RADIUS) return false;
    const ray = new BABYLON.Ray(from, delta.normalize(), distance);
    const hit = scene.pickWithRay(ray, (m) => m.checkCollisions && m !== root && m !== player.root && m.isVisible);
    return !hit || !hit.hit || hit.distance >= distance - 0.6;
  }

  function animate(speed, dt, chasing) {
    gait += dt * (chasing ? 10.5 : 5.2);
    const swing = Math.sin(gait) * (chasing ? 0.82 : 0.48);
    armPivots[0].rotation.x = swing;
    armPivots[1].rotation.x = -swing;
    legPivots[0].rotation.x = -swing * 0.72;
    legPivots[1].rotation.x = swing * 0.72;
    torso.rotation.z = Math.sin(gait * 0.5) * 0.035;
    glow.emissiveColor.set(1.0, 0.2 + Math.abs(Math.sin(gait * 0.4)) * 0.22, 0.01);
  }

  function authorityUpdate(dt, network) {
    if (!active) {
      nextSpawn -= dt;
      if (nextSpawn <= 0) spawn();
      return;
    }
    activeRemaining -= dt;
    if (activeRemaining <= 0) {
      despawn();
      return;
    }

    for (const [id, left] of killCooldowns) {
      const value = left - dt;
      if (value <= 0) killCooldowns.delete(id); else killCooldowns.set(id, value);
    }

    scanTimer -= dt;
    const outdoor = network.players.filter(p => !p.inside && !p.dead);
    let victim = outdoor.find(p => p.id === targetId);
    if (!victim || Math.hypot(victim.x - root.position.x, victim.z - root.position.z) > DETECT_RADIUS * 1.25) {
      targetId = null;
      victim = null;
      if (scanTimer <= 0) {
        scanTimer = 0.25;
        let best = Infinity;
        for (const p of outdoor) {
          const d = Math.hypot(p.x - root.position.x, p.z - root.position.z);
          if (d < best && canSee(p)) { best = d; victim = p; }
        }
      }
      if (victim) targetId = victim.id;
    }
    if (victim && victim.inside) { victim = null; targetId = null; }

    const destX = victim ? victim.x : targetPoint.x;
    const destZ = victim ? victim.z : targetPoint.z;
    const dx = destX - root.position.x, dz = destZ - root.position.z;
    const distance = Math.hypot(dx, dz);
    if (!victim && distance < 2.2) chooseOutdoorPoint();
    const speed = victim ? CHASE_SPEED : WANDER_SPEED;
    const nx = distance > 0.001 ? dx / distance : 0;
    const nz = distance > 0.001 ? dz / distance : 0;
    const proposed = new BABYLON.Vector3(root.position.x + nx * speed * dt, 0, root.position.z + nz * speed * dt);
    const beforeX = root.position.x, beforeZ = root.position.z;
    if (!isInsideParkBuilding(proposed, -1.0)) {
      root.moveWithCollisions(new BABYLON.Vector3(nx * speed * dt, -0.08, nz * speed * dt));
    } else {
      targetId = null;
      chooseOutdoorPoint();
    }
    root.position.y = Math.max(2.1, root.position.y);
    const moved = Math.hypot(root.position.x - beforeX, root.position.z - beforeZ);
    stuckTime = moved < speed * dt * 0.18 ? stuckTime + dt : 0;
    if (stuckTime > 1.4) { stuckTime = 0; targetId = null; chooseOutdoorPoint(); }
    const desiredYaw = Math.atan2(nx, nz);
    let turn = desiredYaw - root.rotation.y;
    while (turn > Math.PI) turn -= Math.PI * 2;
    while (turn < -Math.PI) turn += Math.PI * 2;
    root.rotation.y += turn * Math.min(1, dt * (victim ? 9 : 4));
    animate(speed, dt, !!victim);

    if (victim && distance < 1.35 && !killCooldowns.has(victim.id)) {
      killCooldowns.set(victim.id, 4);
      network.kill(victim.id);
      targetId = null;
    }
  }

  function followerUpdate(dt, state) {
    if (state && state.stamp > lastRemoteStamp) {
      lastRemoteStamp = state.stamp;
      remoteTargetState = state;
      if (state.active && !active) showAlert();
      setVisible(!!state.active);
      activeRemaining = state.remaining || 0;
      nextSpawn = state.nextSpawn == null ? nextSpawn : state.nextSpawn;
      targetId = state.targetId || null;
    } else if (active) {
      activeRemaining = Math.max(0, activeRemaining - dt);
    } else {
      nextSpawn = Math.max(0, nextSpawn - dt);
    }
    if (!remoteTargetState) return;
    if (!active) return;
    const target = remoteTargetState;
    const k = 1 - Math.exp(-10 * dt);
    root.position.x += (target.x - root.position.x) * k;
    root.position.z += (target.z - root.position.z) * k;
    let dy = target.yaw - root.rotation.y;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    root.rotation.y += dy * k;
    animate(target.chasing ? CHASE_SPEED : WANDER_SPEED, dt, !!target.chasing);
  }

  function snapshot(hostId) {
    return {
      hostId, stamp: Date.now(), active,
      x: +root.position.x.toFixed(2), z: +root.position.z.toFixed(2), yaw: +root.rotation.y.toFixed(3),
      remaining: +activeRemaining.toFixed(1), nextSpawn: +nextSpawn.toFixed(1),
      targetId, chasing: !!targetId,
    };
  }

  function update(dt, network) {
    if (!started || !network) return;
    const authority = network.isAuthority;
    // just promoted (previous host froze or left): inherit its last known
    // simulation so the keeper continues seamlessly instead of resetting
    if (authority && !lastAuthority && remoteTargetState &&
        Date.now() - remoteTargetState.stamp < 15000) {
      const s = remoteTargetState;
      root.position.x = s.x;
      root.position.z = s.z;
      root.rotation.y = s.yaw;
      setVisible(!!s.active);
      activeRemaining = s.remaining || 0;
      if (s.nextSpawn != null) nextSpawn = s.nextSpawn;
      targetId = null;
      if (s.active) chooseOutdoorPoint();
      remoteTargetState = null;
    }
    if (authority) {
      authorityUpdate(dt, network);
      broadcastTimer -= dt;
      if (broadcastTimer <= 0) {
        broadcastTimer = active ? 0.12 : 1;
        network.broadcast(snapshot(network.hostId));
      }
    } else {
      followerUpdate(dt, network.remoteState);
    }
    lastAuthority = authority;
    if (alertTimer > 0) {
      alertTimer -= dt;
      if (alertTimer <= 0 && alertEl) alertEl.classList.remove("show");
    }
    updateHud();
  }

  function start() { started = true; }
  return { start, update };
}
