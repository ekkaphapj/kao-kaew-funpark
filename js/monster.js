// ============================================================
// monster.js — THREE haunted pursuers, host-simulated & synced:
//  1. นายตรวจตั๋ว (Ticket Keeper) — balanced walker
//  2. วิญญาณคนขายตั๋ว (Ticket Wraith) — floating ghost, sharpest ears
//  3. ม้าหมุนมรณะ (Carousel Horse) — fastest charge, poor turning
// One elected multiplayer host simulates AI; others interpolate.
// ============================================================
"use strict";

function createTicketKeeper(scene, player, audio) {
  const C3 = (r, g, b) => new BABYLON.Color3(r, g, b);

  function material(name, color, emissive, alpha) {
    const m = new BABYLON.StandardMaterial(name, scene);
    m.diffuseColor = color;
    m.specularColor = C3(0.08, 0.07, 0.06);
    if (emissive) m.emissiveColor = emissive;
    if (alpha !== undefined) m.alpha = alpha;
    return m;
  }

  // =========================================================
  // RIG BUILDERS — each returns { rig, animate(dt, chasing) }
  // rig is parented to an invisible collider root (y -2.1)
  // =========================================================

  function buildKeeperRig(root) {
    const rig = new BABYLON.TransformNode("ticketKeeper", scene);
    rig.parent = root;
    rig.position.y = -2.1;
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
    const torso = part(BABYLON.MeshBuilder.CreateBox("kpTorso", { width: 1.05, height: 1.5, depth: 0.58 }, scene), rig, burgundy);
    torso.position.y = 2.65;
    torso.rotation.x = 0.24;
    const shirt = part(BABYLON.MeshBuilder.CreateBox("kpShirt", { width: 0.58, height: 1.28, depth: 0.61 }, scene), rig, ivory);
    shirt.position.set(0, 2.64, -0.01);
    shirt.rotation.x = 0.24;
    const chestLamp = part(BABYLON.MeshBuilder.CreateCylinder("kpChestGlow", { height: 0.16, diameter: 0.31, tessellation: 8 }, scene), rig, glow);
    chestLamp.position.set(0, 2.55, 0.34);
    chestLamp.rotation.x = Math.PI / 2;
    const neck = part(BABYLON.MeshBuilder.CreateCylinder("kpNeck", { height: 0.4, diameter: 0.28, tessellation: 7 }, scene), rig, brass);
    neck.position.set(0, 3.47, 0.12);
    neck.rotation.x = 0.22;
    const head = part(BABYLON.MeshBuilder.CreateSphere("kpMask", { diameter: 1, segments: 10 }, scene), rig, ivory);
    head.position.set(0, 3.92, 0.23);
    head.scaling.set(0.72, 0.84, 0.48);
    head.rotation.x = 0.12;
    for (const ex of [-0.25, 0.25]) {
      const socket = part(BABYLON.MeshBuilder.CreateSphere("kpSocket", { diameter: 0.27, segments: 7 }, scene), rig, dark);
      socket.position.set(ex, 4.02, 0.66);
      socket.scaling.z = 0.35;
      const eye = part(BABYLON.MeshBuilder.CreateSphere("kpEye", { diameter: 0.075, segments: 6 }, scene), rig, glow);
      eye.position.set(ex, 4.02, 0.78);
    }
    const mouth = part(BABYLON.MeshBuilder.CreateBox("kpSmile", { width: 0.48, height: 0.08, depth: 0.06 }, scene), rig, dark);
    mouth.position.set(0, 3.72, 0.7);
    const cap = part(BABYLON.MeshBuilder.CreateCylinder("kpCap", { height: 0.36, diameter: 0.88, tessellation: 10 }, scene), rig, burgundy);
    cap.position.set(0, 4.66, 0.18);
    const capBand = part(BABYLON.MeshBuilder.CreateTorus("kpCapBand", { diameter: 0.82, thickness: 0.09, tessellation: 10 }, scene), rig, brass);
    capBand.position.set(0, 4.5, 0.18);
    const backPole = part(BABYLON.MeshBuilder.CreateCylinder("kpPole", { height: 3.0, diameter: 0.16, tessellation: 7 }, scene), rig, brass);
    backPole.position.set(0, 4.05, -0.42);
    backPole.rotation.z = -0.13;

    const armPivots = [], legPivots = [];
    for (const side of [-1, 1]) {
      const armPivot = new BABYLON.TransformNode("kpArmPivot", scene);
      armPivot.parent = rig;
      armPivot.position.set(side * 0.66, 3.22, 0);
      armPivots.push(armPivot);
      const upper = part(BABYLON.MeshBuilder.CreateCylinder("kpArm", { height: 1.42, diameter: 0.22, tessellation: 7 }, scene), armPivot, burgundy);
      upper.position.y = -0.67;
      const fore = part(BABYLON.MeshBuilder.CreateCylinder("kpFore", { height: 1.3, diameter: 0.16, tessellation: 7 }, scene), armPivot, dark);
      fore.position.y = -1.95;
      const hand = side < 0
        ? BABYLON.MeshBuilder.CreateBox("kpPuncher", { width: 0.48, height: 0.72, depth: 0.32 }, scene)
        : BABYLON.MeshBuilder.CreateSphere("kpHand", { diameter: 0.3, segments: 7 }, scene);
      part(hand, armPivot, side < 0 ? brass : dark);
      hand.position.y = -2.7;
      const legPivot = new BABYLON.TransformNode("kpLegPivot", scene);
      legPivot.parent = rig;
      legPivot.position.set(side * 0.3, 1.9, 0);
      legPivots.push(legPivot);
      const leg = part(BABYLON.MeshBuilder.CreateCylinder("kpLeg", { height: 1.72, diameter: 0.18, tessellation: 7 }, scene), legPivot, dark);
      leg.position.y = -0.82;
      const shoe = part(BABYLON.MeshBuilder.CreateBox("kpShoe", { width: 0.42, height: 0.26, depth: 0.74 }, scene), legPivot, dark);
      shoe.position.set(0, -1.73, 0.2);
    }
    for (let i = 0; i < 8; i++) {
      const ticket = part(BABYLON.MeshBuilder.CreateBox("kpTicket", { width: 0.25, height: 0.72, depth: 0.025 }, scene), rig, paper);
      ticket.position.set(-0.63 + i * 0.18, 1.75 - (i % 2) * 0.14, 0.04 + Math.abs(i - 3.5) * -0.025);
      ticket.rotation.z = (i - 3.5) * 0.1;
    }
    if (PARK.shadowGenerator) for (const mesh of parts) PARK.shadowGenerator.addShadowCaster(mesh, false);

    let gait = 0;
    return {
      rig,
      animate(dt, chasing) {
        gait += dt * (chasing ? 10.5 : 5.2);
        const swing = Math.sin(gait) * (chasing ? 0.82 : 0.48);
        armPivots[0].rotation.x = swing;
        armPivots[1].rotation.x = -swing;
        legPivots[0].rotation.x = -swing * 0.72;
        legPivots[1].rotation.x = swing * 0.72;
        torso.rotation.z = Math.sin(gait * 0.5) * 0.035;
        glow.emissiveColor.set(1.0, 0.2 + Math.abs(Math.sin(gait * 0.4)) * 0.22, 0.01);
      },
    };
  }

  // --- the Ticket Wraith: floating tattered ghost from the concept sheet ---
  function buildWraithRig(root) {
    const rig = new BABYLON.TransformNode("ticketWraith", scene);
    rig.parent = root;
    rig.position.y = -2.1;
    rig.scaling.setAll(0.86); // hat top lands near the Keeper's height
    const ghost = material("wrGhost", C3(0.62, 0.78, 0.8), C3(0.05, 0.1, 0.11), 0.55);
    const ghostSolid = material("wrGhostSolid", C3(0.68, 0.82, 0.84), C3(0.06, 0.11, 0.12), 0.9);
    const coat = material("wrCoat", C3(0.3, 0.08, 0.1), null, 0.96);
    const ivory = material("wrIvory", C3(0.6, 0.57, 0.5));
    const dark = material("wrDark", C3(0.05, 0.045, 0.05));
    const gold = material("wrGold", C3(0.45, 0.33, 0.12), C3(0.12, 0.08, 0.02));
    const paper = material("wrPaper", C3(0.55, 0.45, 0.28));
    const bow = material("wrBow", C3(0.42, 0.08, 0.1));
    const eyeGlow = material("wrEyeGlow", C3(0.1, 0.3, 0.32), C3(0.35, 1.0, 1.0));
    const hairM = material("wrHair", C3(0.75, 0.8, 0.8), C3(0.08, 0.1, 0.1), 0.85);
    const parts = [];
    function part(mesh, parent, mat) {
      mesh.parent = parent || rig;
      mesh.material = mat;
      mesh.isPickable = false;
      parts.push(mesh);
      return mesh;
    }
    // wispy tapered lower body — no legs, just spectral trails
    const dress = part(BABYLON.MeshBuilder.CreateCylinder("wrDress", { height: 2.4, diameterTop: 1.2, diameterBottom: 0.08, tessellation: 9 }, scene), rig, ghost);
    dress.position.y = 1.35;
    const wispA = part(BABYLON.MeshBuilder.CreateCylinder("wrWispA", { height: 1.6, diameterTop: 0.35, diameterBottom: 0.03, tessellation: 6 }, scene), rig, ghost);
    wispA.position.set(0.38, 0.9, -0.1);
    wispA.rotation.z = 0.35;
    const wispB = part(BABYLON.MeshBuilder.CreateCylinder("wrWispB", { height: 1.4, diameterTop: 0.3, diameterBottom: 0.03, tessellation: 6 }, scene), rig, ghost);
    wispB.position.set(-0.34, 0.8, 0.08);
    wispB.rotation.z = -0.4;
    // burgundy coat torso with epaulettes and ragged tails
    const torso = part(BABYLON.MeshBuilder.CreateBox("wrTorso", { width: 1.0, height: 1.35, depth: 0.55 }, scene), rig, coat);
    torso.position.y = 3.05;
    const vest = part(BABYLON.MeshBuilder.CreateBox("wrVest", { width: 0.5, height: 1.1, depth: 0.58 }, scene), rig, ivory);
    vest.position.set(0, 3.0, -0.01);
    const bowTie = part(BABYLON.MeshBuilder.CreateBox("wrBowTie", { width: 0.34, height: 0.16, depth: 0.12 }, scene), rig, bow);
    bowTie.position.set(0, 3.62, 0.3);
    for (const sx of [-1, 1]) {
      const ep = part(BABYLON.MeshBuilder.CreateBox("wrEpaulette", { width: 0.36, height: 0.1, depth: 0.34 }, scene), rig, gold);
      ep.position.set(sx * 0.58, 3.7, 0);
      const tail = part(BABYLON.MeshBuilder.CreateBox("wrCoatTail", { width: 0.34, height: 1.5, depth: 0.06 }, scene), rig, coat);
      tail.position.set(sx * 0.42, 1.95, -0.28);
      tail.rotation.x = -0.25;
      tail.rotation.z = sx * 0.16;
    }
    // long ghostly arms reaching forward with claw fingers
    const armPivots = [];
    for (const sx of [-1, 1]) {
      const armPivot = new BABYLON.TransformNode("wrArmPivot", scene);
      armPivot.parent = rig;
      armPivot.position.set(sx * 0.62, 3.5, 0.1);
      armPivot.rotation.x = -0.85;
      armPivot.rotation.z = sx * -0.25;
      armPivots.push(armPivot);
      const arm = part(BABYLON.MeshBuilder.CreateCylinder("wrArm", { height: 1.7, diameterTop: 0.2, diameterBottom: 0.1, tessellation: 7 }, scene), armPivot, ghostSolid);
      arm.position.y = -0.85;
      const hand = part(BABYLON.MeshBuilder.CreateSphere("wrHand", { diameter: 0.24, segments: 6 }, scene), armPivot, ghostSolid);
      hand.position.y = -1.78;
      hand.scaling.set(0.9, 1.4, 0.7);
      for (let f = 0; f < 3; f++) {
        const claw = part(BABYLON.MeshBuilder.CreateCylinder("wrClaw", { height: 0.34, diameterBottom: 0.05, diameterTop: 0.004, tessellation: 5 }, scene), armPivot, ghostSolid);
        claw.position.set((f - 1) * 0.08, -2.05, 0.02);
        claw.rotation.x = 0.25 + f * 0.06;
      }
    }
    // gaunt screaming head
    const head = part(BABYLON.MeshBuilder.CreateSphere("wrHead", { diameter: 0.78, segments: 10 }, scene), rig, ghostSolid);
    head.position.set(0, 4.35, 0.1);
    head.scaling.set(0.78, 1.12, 0.82);
    const mouth = part(BABYLON.MeshBuilder.CreateSphere("wrMouth", { diameter: 0.3, segments: 8 }, scene), rig, dark);
    mouth.position.set(0, 4.12, 0.38);
    mouth.scaling.set(0.75, 1.5, 0.5);
    for (const sx of [-1, 1]) {
      const socket = part(BABYLON.MeshBuilder.CreateSphere("wrSocket", { diameter: 0.2, segments: 6 }, scene), rig, dark);
      socket.position.set(sx * 0.15, 4.5, 0.32);
      socket.scaling.z = 0.5;
      const eye = part(BABYLON.MeshBuilder.CreateSphere("wrEye", { diameter: 0.09, segments: 6 }, scene), rig, eyeGlow);
      eye.position.set(sx * 0.15, 4.5, 0.38);
    }
    // stringy white hair spilling from under the hat
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 1.6 + Math.PI * 0.7;
      const strand = part(BABYLON.MeshBuilder.CreateCylinder("wrHairS", { height: 1.1 + (i % 3) * 0.3, diameterTop: 0.09, diameterBottom: 0.015, tessellation: 5 }, scene), rig, hairM);
      strand.position.set(Math.cos(a) * 0.3, 4.15, 0.06 + Math.sin(a) * 0.26);
      strand.rotation.z = Math.cos(a) * 0.5;
      strand.rotation.x = -0.15 + Math.sin(a) * 0.3;
    }
    // battered top hat with a tucked ticket
    const hat = part(BABYLON.MeshBuilder.CreateCylinder("wrHat", { height: 0.6, diameterBottom: 0.6, diameterTop: 0.55, tessellation: 10 }, scene), rig, dark);
    hat.position.set(0, 5.05, 0.06);
    hat.rotation.z = 0.06;
    const brim = part(BABYLON.MeshBuilder.CreateCylinder("wrBrim", { height: 0.05, diameter: 0.95, tessellation: 12 }, scene), rig, dark);
    brim.position.set(0, 4.76, 0.06);
    brim.rotation.z = 0.06;
    const hatTicket = part(BABYLON.MeshBuilder.CreateBox("wrHatTicket", { width: 0.2, height: 0.28, depth: 0.03 }, scene), rig, paper);
    hatTicket.position.set(0.2, 4.98, 0.3);
    hatTicket.rotation.z = -0.2;
    // dangling tickets on strings
    for (const [tx, ty, tz] of [[-0.45, 2.5, 0.25], [0.5, 2.2, 0.15], [0.1, 1.8, 0.3]]) {
      const str = part(BABYLON.MeshBuilder.CreateCylinder("wrStr", { height: 0.5, diameter: 0.015 }, scene), rig, dark);
      str.position.set(tx, ty + 0.25, tz);
      const tk = part(BABYLON.MeshBuilder.CreateBox("wrTk", { width: 0.2, height: 0.3, depth: 0.02 }, scene), rig, paper);
      tk.position.set(tx, ty, tz);
      tk.rotation.z = tx;
    }
    if (PARK.shadowGenerator) for (const mesh of parts) PARK.shadowGenerator.addShadowCaster(mesh, false);

    let gait = 0;
    return {
      rig,
      animate(dt, chasing) {
        gait += dt * (chasing ? 3.4 : 1.7);
        // drift and bob — it floats, it never walks
        rig.position.y = -2.1 + 0.35 + Math.sin(gait) * 0.28;
        rig.rotation.z = Math.sin(gait * 0.7) * 0.06;
        rig.rotation.x = chasing ? 0.22 : Math.sin(gait * 0.5) * 0.05;
        armPivots[0].rotation.x = -0.85 + Math.sin(gait * 1.3) * 0.15;
        armPivots[1].rotation.x = -0.85 + Math.cos(gait * 1.2) * 0.15;
        mouth.scaling.y = 1.5 + Math.abs(Math.sin(gait * 0.9)) * (chasing ? 0.9 : 0.3);
        eyeGlow.emissiveColor.set(0.35, 1.0, 1.0);
        if (chasing) eyeGlow.emissiveColor.scaleInPlace(0.8 + Math.abs(Math.sin(gait * 3)) * 0.5);
      },
    };
  }

  // --- the Carousel Horse: a ride that broke loose, pole still through it ---
  function buildHorseRig(root) {
    const rig = new BABYLON.TransformNode("carouselHorse", scene);
    rig.parent = root;
    rig.position.y = -2.1;
    const bone = material("chBone", C3(0.72, 0.7, 0.62));
    const dark = material("chDark", C3(0.06, 0.05, 0.05));
    const mane = material("chMane", C3(0.12, 0.08, 0.14));
    const brass = material("chBrass", C3(0.5, 0.36, 0.12), C3(0.16, 0.1, 0.02));
    const saddle = material("chSaddle", C3(0.4, 0.08, 0.1));
    const eyeGlow = material("chEyeGlow", C3(0.3, 0.03, 0.02), C3(1.0, 0.12, 0.05));
    const parts = [];
    function part(mesh, parent, mat) {
      mesh.parent = parent || rig;
      mesh.material = mat;
      mesh.isPickable = false;
      parts.push(mesh);
      return mesh;
    }
    const body = part(BABYLON.MeshBuilder.CreateSphere("chBody", { diameterX: 1.0, diameterY: 1.15, diameterZ: 2.6, segments: 10 }, scene), rig, bone);
    body.position.y = 2.35;
    const neck = part(BABYLON.MeshBuilder.CreateCylinder("chNeck", { height: 1.3, diameterBottom: 0.62, diameterTop: 0.36, tessellation: 8 }, scene), rig, bone);
    neck.position.set(0, 3.2, 1.05);
    neck.rotation.x = -0.55;
    const head = part(BABYLON.MeshBuilder.CreateSphere("chHead", { diameterX: 0.5, diameterY: 0.62, diameterZ: 1.3 }, scene), rig, bone);
    head.position.set(0, 3.85, 1.55);
    head.rotation.x = 0.5;
    // open screaming muzzle with teeth
    const jaw = part(BABYLON.MeshBuilder.CreateSphere("chJaw", { diameterX: 0.34, diameterY: 0.5, diameterZ: 0.5 }, scene), rig, dark);
    jaw.position.set(0, 3.6, 2.0);
    for (const sx of [-0.08, 0.02, 0.12]) {
      const tooth = part(BABYLON.MeshBuilder.CreateCylinder("chTooth", { height: 0.12, diameterBottom: 0.05, diameterTop: 0.005, tessellation: 4 }, scene), rig, bone);
      tooth.position.set(sx, 3.72, 2.12);
      tooth.rotation.x = Math.PI;
    }
    for (const sx of [-1, 1]) {
      const socket = part(BABYLON.MeshBuilder.CreateSphere("chSocket", { diameter: 0.2, segments: 6 }, scene), rig, dark);
      socket.position.set(sx * 0.15, 3.98, 1.75);
      const eye = part(BABYLON.MeshBuilder.CreateSphere("chEye", { diameter: 0.1, segments: 6 }, scene), rig, eyeGlow);
      eye.position.set(sx * 0.16, 3.98, 1.82);
      const ear = part(BABYLON.MeshBuilder.CreateCylinder("chEar", { height: 0.3, diameterBottom: 0.14, diameterTop: 0.01, tessellation: 5 }, scene), rig, bone);
      ear.position.set(sx * 0.14, 4.3, 1.3);
      ear.rotation.x = -0.3;
    }
    // spiky dark mane down the neck
    for (let i = 0; i < 5; i++) {
      const spike = part(BABYLON.MeshBuilder.CreateCylinder("chManeS", { height: 0.5 - i * 0.05, diameterBottom: 0.16, diameterTop: 0.01, tessellation: 5 }, scene), rig, mane);
      spike.position.set(0, 4.15 - i * 0.24, 0.95 - i * 0.22);
      spike.rotation.x = -0.7;
    }
    // carousel pole straight through the body — brass, with a finial
    const pole = part(BABYLON.MeshBuilder.CreateCylinder("chPole", { height: 4.2, diameter: 0.13, tessellation: 8 }, scene), rig, brass);
    pole.position.set(0, 2.6, 0);
    const finial = part(BABYLON.MeshBuilder.CreateSphere("chFinial", { diameter: 0.3, segments: 8 }, scene), rig, brass);
    finial.position.set(0, 4.8, 0);
    const sad = part(BABYLON.MeshBuilder.CreateBox("chSaddleB", { width: 0.7, height: 0.18, depth: 0.9 }, scene), rig, saddle);
    sad.position.set(0, 2.98, -0.2);
    const tail = part(BABYLON.MeshBuilder.CreateCylinder("chTail", { height: 1.0, diameterBottom: 0.22, diameterTop: 0.02, tessellation: 6 }, scene), rig, mane);
    tail.position.set(0, 2.3, -1.45);
    tail.rotation.x = 2.6;
    // galloping legs
    const legPivots = [];
    for (const [sx, sz] of [[-0.32, 0.85], [0.32, 0.85], [-0.32, -0.85], [0.32, -0.85]]) {
      const piv = new BABYLON.TransformNode("chLegPivot", scene);
      piv.parent = rig;
      piv.position.set(sx, 2.0, sz);
      legPivots.push(piv);
      const leg = part(BABYLON.MeshBuilder.CreateCylinder("chLeg", { height: 1.6, diameterTop: 0.24, diameterBottom: 0.1, tessellation: 7 }, scene), piv, bone);
      leg.position.y = -0.8;
      const hoof = part(BABYLON.MeshBuilder.CreateCylinder("chHoof", { height: 0.18, diameter: 0.16, tessellation: 7 }, scene), piv, dark);
      hoof.position.y = -1.68;
    }
    if (PARK.shadowGenerator) for (const mesh of parts) PARK.shadowGenerator.addShadowCaster(mesh, false);

    let gait = 0;
    return {
      rig,
      animate(dt, chasing) {
        gait += dt * (chasing ? 12.5 : 6);
        const g = Math.sin(gait);
        // bounding carousel gallop: front pair and back pair alternate
        legPivots[0].rotation.x = g * 0.85;
        legPivots[1].rotation.x = g * 0.85;
        legPivots[2].rotation.x = -g * 0.85;
        legPivots[3].rotation.x = -g * 0.85;
        rig.position.y = -2.1 + Math.abs(Math.sin(gait)) * (chasing ? 0.4 : 0.18);
        rig.rotation.x = g * 0.1;
        eyeGlow.emissiveColor.set(1.0, 0.08 + Math.abs(Math.sin(gait * 0.8)) * 0.1, 0.04);
      },
    };
  }

  // =========================================================
  // FOUNTAIN SAFE ZONE (host-simulated, shared by all monsters)
  // =========================================================
  const FOUNTAIN = { x: 0, z: -10, r: 8 };
  let fountainOn = true;
  let fountainMeter = 15;
  let fountainOffLeft = 0;
  const fzRingMat = new BABYLON.StandardMaterial("fzRingM", scene);
  fzRingMat.emissiveColor = C3(0.25, 0.75, 1.0);
  fzRingMat.diffuseColor = C3(0.02, 0.08, 0.12);
  fzRingMat.disableLighting = true;
  const fzRing = BABYLON.MeshBuilder.CreateTorus("fzRing", { diameter: FOUNTAIN.r * 2, thickness: 0.16, tessellation: 40 }, scene);
  fzRing.position.set(FOUNTAIN.x, 0.25, FOUNTAIN.z);
  fzRing.material = fzRingMat;
  fzRing.isPickable = false;
  const fzGlow = BABYLON.MeshBuilder.CreateDisc("fzGlow", { radius: FOUNTAIN.r, tessellation: 40 }, scene);
  fzGlow.rotation.x = Math.PI / 2;
  fzGlow.position.set(FOUNTAIN.x, 0.12, FOUNTAIN.z);
  const fzGlowMat = new BABYLON.StandardMaterial("fzGlowM", scene);
  fzGlowMat.emissiveColor = C3(0.1, 0.35, 0.5);
  fzGlowMat.alpha = 0.1;
  fzGlowMat.disableLighting = true;
  fzGlow.material = fzGlowMat;
  fzGlow.isPickable = false;

  function inFountainZone(px, pz) {
    return Math.hypot(px - FOUNTAIN.x, pz - FOUNTAIN.z) < FOUNTAIN.r;
  }
  function updateFountainVisual(t) {
    const blink = fountainOn && fountainMeter < 5 ? (Math.sin(t * 14) > 0 ? 1 : 0.15) : 1;
    const on = fountainOn ? blink : 0.03;
    fzRingMat.emissiveColor.set(0.25 * on, 0.75 * on, 1.0 * on);
    fzGlowMat.alpha = fountainOn ? 0.1 * blink : 0.01;
  }

  // =========================================================
  // MONSTER DEFINITIONS & STATE
  // =========================================================
  const quick = location.search.includes("monster=1");
  const DEFS = [
    {
      key: "keeper", name: "นายตรวจตั๋ว", build: buildKeeperRig,
      wander: 2.45, chase: 10.4, detect: 58, hearRun: 40, hearWalk: 12,
      hunt: 180, rest: 120, first: quick ? 3 : 300, turnRate: 9, killDist: 1.35,
    },
    {
      key: "wraith", name: "วิญญาณคนขายตั๋ว", build: buildWraithRig,
      wander: 2.0, chase: 8.6, detect: 70, hearRun: 45, hearWalk: 25,
      hunt: 180, rest: 150, first: quick ? 9 : 420, turnRate: 7, killDist: 1.4,
    },
    {
      key: "horse", name: "ม้าหมุนมรณะ", build: buildHorseRig,
      wander: 4.2, chase: 13.2, detect: 45, hearRun: 35, hearWalk: 10,
      hunt: 150, rest: 180, first: quick ? 15 : 540, turnRate: 3.2, killDist: 1.7,
    },
  ];

  const spawnPoints = [[-98, 0], [98, 18], [72, 103], [-95, 72], [0, -105]];
  const monsters = DEFS.map((def) => {
    const root = BABYLON.MeshBuilder.CreateCapsule("mRoot_" + def.key, { height: 4.2, radius: 0.48, tessellation: 8 }, scene);
    root.position.set(0, 2.1, -125);
    root.isVisible = false;
    root.isPickable = false;
    root.checkCollisions = true;
    root.ellipsoid = new BABYLON.Vector3(0.48, 2.0, 0.48);
    const built = def.build(root);
    built.rig.setEnabled(false);
    return {
      def, root, rig: built.rig, animate: built.animate,
      active: false, remaining: 0, nextSpawn: def.first,
      targetPoint: new BABYLON.Vector3(0, 0, -60), targetId: null,
      scanTimer: 0, stuckTime: 0, killCooldowns: new Map(),
      remoteStamp: 0, remoteTarget: null,
    };
  });

  let started = false;
  let lastAuthority = false;
  let broadcastTimer = 0;
  let alertTimer = 0;
  const statusEl = document.getElementById("monster-status");
  const alertEl = document.getElementById("monster-alert");
  const alertText = alertEl ? alertEl.querySelector("span") : null;

  function showAlert(name) {
    alertTimer = 7;
    if (alertText) alertText.textContent = (name || "ผี") + "ออกล่าแล้ว — หลบเข้าอาคาร!";
    if (alertEl) alertEl.classList.add("show");
    if (audio && audio.playAlarm) audio.playAlarm();
  }

  function chooseOutdoorPoint(m) {
    for (let tries = 0; tries < 30; tries++) {
      const p = new BABYLON.Vector3(-100 + Math.random() * 200, 0, -102 + Math.random() * 204);
      if (!isInsideParkBuilding(p, -2.2) && !(fountainOn && inFountainZone(p.x, p.z))) {
        m.targetPoint.copyFrom(p);
        return;
      }
    }
    m.targetPoint.set(0, 0, -60);
  }

  function setMonsterVisible(m, value) {
    m.active = value;
    m.rig.setEnabled(value);
    if (!value) m.targetId = null;
  }

  function spawnMonster(m) {
    const sp = spawnPoints[Math.floor(Math.random() * spawnPoints.length)];
    m.root.position.set(sp[0], 2.1, sp[1]);
    m.root.rotation.y = Math.random() * Math.PI * 2;
    m.remaining = m.def.hunt;
    setMonsterVisible(m, true);
    chooseOutdoorPoint(m);
    showAlert(m.def.name);
  }

  function despawnMonster(m) {
    setMonsterVisible(m, false);
    m.nextSpawn = m.def.rest;
  }

  function formatTime(seconds) {
    const s = Math.max(0, Math.ceil(seconds));
    return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  }

  function updateHud() {
    if (!statusEl) return;
    const actives = monsters.filter(m => m.active);
    if (actives.length > 0) {
      const names = actives.map(m => m.def.name).join(" + ");
      const longest = Math.max(...actives.map(m => m.remaining));
      statusEl.textContent = `⚠ ${names} กำลังออกล่า · ${formatTime(longest)}`;
      statusEl.classList.add("active");
    } else {
      const soonest = Math.min(...monsters.map(m => m.nextSpawn));
      if (soonest <= 30 && started) {
        statusEl.textContent = "⚠ สัญญาณผิดปกติ · " + formatTime(soonest);
        statusEl.classList.add("active");
      } else {
        statusEl.classList.remove("active");
      }
    }
  }

  function canSee(m, candidate) {
    const from = new BABYLON.Vector3(m.root.position.x, 3.3, m.root.position.z);
    const to = new BABYLON.Vector3(candidate.x, 1.2, candidate.z);
    const delta = to.subtract(from);
    const distance = delta.length();
    if (distance > m.def.detect) return false;
    const ray = new BABYLON.Ray(from, delta.normalize(), distance);
    const hit = scene.pickWithRay(ray, (mesh) => mesh.checkCollisions && mesh !== m.root && mesh !== player.root && mesh.isVisible);
    return !hit || !hit.hit || hit.distance >= distance - 0.6;
  }

  function monsterAuthorityUpdate(m, dt, network, escaping, rage) {
    if (escaping && !m.active) spawnMonster(m);
    if (!m.active) {
      m.nextSpawn -= dt;
      if (m.nextSpawn <= 0) spawnMonster(m);
      return;
    }
    if (escaping) m.remaining = Math.max(m.remaining, 10);
    m.remaining -= dt;
    if (m.remaining <= 0) {
      despawnMonster(m);
      return;
    }
    for (const [id, left] of m.killCooldowns) {
      const value = left - dt;
      if (value <= 0) m.killCooldowns.delete(id); else m.killCooldowns.set(id, value);
    }
    m.scanTimer -= dt;
    const outdoor = network.players.filter(p =>
      !p.inside && !p.dead && !(fountainOn && inFountainZone(p.x, p.z)));
    let victim = outdoor.find(p => p.id === m.targetId);
    if (!victim || Math.hypot(victim.x - m.root.position.x, victim.z - m.root.position.z) > m.def.detect * 1.25) {
      m.targetId = null;
      victim = null;
      if (m.scanTimer <= 0) {
        m.scanTimer = 0.25;
        let best = Infinity;
        for (const p of outdoor) {
          const d = Math.hypot(p.x - m.root.position.x, p.z - m.root.position.z);
          const heard = d < (p.run ? m.def.hearRun : m.def.hearWalk);
          if (d < best && (heard || canSee(m, p))) { best = d; victim = p; }
        }
      }
      if (victim) m.targetId = victim.id;
    }
    if (victim && (victim.inside || (fountainOn && inFountainZone(victim.x, victim.z)))) {
      victim = null;
      m.targetId = null;
    }
    const destX = victim ? victim.x : m.targetPoint.x;
    const destZ = victim ? victim.z : m.targetPoint.z;
    const dx = destX - m.root.position.x, dz = destZ - m.root.position.z;
    const distance = Math.hypot(dx, dz);
    if (!victim && distance < 2.2) chooseOutdoorPoint(m);
    const speed = (victim ? m.def.chase : m.def.wander) * rage;
    const nx = distance > 0.001 ? dx / distance : 0;
    const nz = distance > 0.001 ? dz / distance : 0;
    const proposed = new BABYLON.Vector3(m.root.position.x + nx * speed * dt, 0, m.root.position.z + nz * speed * dt);
    const beforeX = m.root.position.x, beforeZ = m.root.position.z;
    if (!isInsideParkBuilding(proposed, -1.0) && !(fountainOn && inFountainZone(proposed.x, proposed.z))) {
      m.root.moveWithCollisions(new BABYLON.Vector3(nx * speed * dt, -0.08, nz * speed * dt));
    } else {
      m.targetId = null;
      chooseOutdoorPoint(m);
    }
    m.root.position.y = Math.max(2.1, m.root.position.y);
    const moved = Math.hypot(m.root.position.x - beforeX, m.root.position.z - beforeZ);
    m.stuckTime = moved < speed * dt * 0.18 ? m.stuckTime + dt : 0;
    if (m.stuckTime > 1.4) { m.stuckTime = 0; m.targetId = null; chooseOutdoorPoint(m); }
    const desiredYaw = Math.atan2(nx, nz);
    let turn = desiredYaw - m.root.rotation.y;
    while (turn > Math.PI) turn -= Math.PI * 2;
    while (turn < -Math.PI) turn += Math.PI * 2;
    m.root.rotation.y += turn * Math.min(1, dt * (victim ? m.def.turnRate : 4));
    m.animate(dt, !!victim);
    if (victim && distance < m.def.killDist && !m.killCooldowns.has(victim.id)) {
      m.killCooldowns.set(victim.id, 4);
      network.kill(victim.id);
      m.targetId = null;
    }
  }

  function monsterFollowerUpdate(m, dt, state) {
    if (state && state.stamp > m.remoteStamp) {
      m.remoteStamp = state.stamp;
      m.remoteTarget = state;
      if (state.active && !m.active) showAlert(m.def.name);
      setMonsterVisible(m, !!state.active);
      m.remaining = state.remaining || 0;
      m.nextSpawn = state.nextSpawn == null ? m.nextSpawn : state.nextSpawn;
      m.targetId = state.targetId || null;
    } else if (m.active) {
      m.remaining = Math.max(0, m.remaining - dt);
    } else {
      m.nextSpawn = Math.max(0, m.nextSpawn - dt);
    }
    if (!m.remoteTarget || !m.active) return;
    const target = m.remoteTarget;
    const k = 1 - Math.exp(-10 * dt);
    m.root.position.x += (target.x - m.root.position.x) * k;
    m.root.position.z += (target.z - m.root.position.z) * k;
    let dy = target.yaw - m.root.rotation.y;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    m.root.rotation.y += dy * k;
    m.animate(dt, !!target.chasing);
  }

  function snapshot(hostId) {
    return {
      hostId, stamp: Date.now(),
      fOn: fountainOn, fMeter: +fountainMeter.toFixed(1),
      monsters: monsters.map(m => ({
        active: m.active,
        x: +m.root.position.x.toFixed(2), z: +m.root.position.z.toFixed(2),
        yaw: +m.root.rotation.y.toFixed(3),
        remaining: +m.remaining.toFixed(1), nextSpawn: +m.nextSpawn.toFixed(1),
        targetId: m.targetId, chasing: !!m.targetId,
        stamp: Date.now(),
      })),
    };
  }

  // debug: ?lineup=1 pins all three monsters in a row for screenshots
  const lineup = location.search.includes("lineup=1");

  function update(dt, network) {
    if (!started || !network) return;
    if (lineup) {
      const spots = [[-5, -22], [0, -20], [5, -22]];
      monsters.forEach((m, i) => {
        if (!m.active) { setMonsterVisible(m, true); m.remaining = 999; }
        m.root.position.set(spots[i][0], 2.1, spots[i][1]);
        m.root.rotation.y = Math.PI;
        m.animate(dt, i === 2);
      });
      updateFountainVisual(performance.now() / 1000);
      return;
    }
    const authority = network.isAuthority;

    // just promoted: inherit the previous host's simulation
    if (authority && !lastAuthority && network.remoteState &&
        Date.now() - network.remoteState.stamp < 15000 && network.remoteState.monsters) {
      const s = network.remoteState;
      if (s.fOn !== undefined) { fountainOn = !!s.fOn; fountainMeter = s.fMeter || 0; }
      s.monsters.forEach((ms, i) => {
        const m = monsters[i];
        if (!m) return;
        m.root.position.x = ms.x;
        m.root.position.z = ms.z;
        m.root.rotation.y = ms.yaw;
        setMonsterVisible(m, !!ms.active);
        m.remaining = ms.remaining || 0;
        if (ms.nextSpawn != null) m.nextSpawn = ms.nextSpawn;
        m.targetId = null;
        if (ms.active) chooseOutdoorPoint(m);
      });
    }

    if (authority) {
      // fountain simulation
      const occupied = network.players.some(p => !p.dead && inFountainZone(p.x, p.z));
      if (fountainOn) {
        if (occupied) {
          fountainMeter -= dt;
          if (fountainMeter <= 0) { fountainOn = false; fountainOffLeft = 20; }
        } else {
          fountainMeter = Math.min(15, fountainMeter + dt * 0.6);
        }
      } else {
        fountainOffLeft -= dt;
        if (fountainOffLeft <= 0) { fountainOn = true; fountainMeter = 15; }
      }
      const escaping = PARK.missionPhase === 3;
      const rage = escaping ? 1.25 : 1;
      for (const m of monsters) monsterAuthorityUpdate(m, dt, network, escaping, rage);
      broadcastTimer -= dt;
      if (broadcastTimer <= 0) {
        broadcastTimer = monsters.some(m => m.active) ? 0.12 : 1;
        network.broadcast(snapshot(network.hostId));
      }
    } else {
      const s = network.remoteState;
      if (s && s.fOn !== undefined) { fountainOn = !!s.fOn; fountainMeter = s.fMeter || 0; }
      monsters.forEach((m, i) => {
        const ms = s && s.monsters ? s.monsters[i] : null;
        monsterFollowerUpdate(m, dt, ms ? { ...ms, stamp: s.stamp } : null);
      });
    }
    lastAuthority = authority;
    if (alertTimer > 0) {
      alertTimer -= dt;
      if (alertTimer <= 0 && alertEl) alertEl.classList.remove("show");
    }
    // heartbeat follows the nearest active monster
    if (audio && audio.setThreat) {
      let best = Infinity;
      for (const m of monsters) {
        if (!m.active) continue;
        const d = Math.hypot(m.root.position.x - player.root.position.x, m.root.position.z - player.root.position.z);
        if (d < best) best = d;
      }
      audio.setThreat(player.state.dead || best === Infinity ? 0 : (25 - best) / 20);
    }
    updateFountainVisual(performance.now() / 1000);
    updateHud();
  }

  function start() { started = true; }
  // debug helpers (used by automated tests)
  function _forceSpawnAll() {
    for (const m of monsters) if (!m.active) spawnMonster(m);
  }
  return { start, update, _forceSpawnAll, _monsters: monsters };
}
