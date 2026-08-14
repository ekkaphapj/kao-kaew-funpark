// ============================================================
// buildings.js — compact park: every major building is HOLLOW
// and walkable inside through a real door gap.
// ============================================================
"use strict";

function buildBuildings(scene) {
  const C3 = (r, g, b) => new BABYLON.Color3(r, g, b);
  const plankTex = TEX.planks(scene);
  const metalTex = TEX.metal(scene);

  function solid(mesh) {
    mesh.checkCollisions = true;
    PARK.colliders.push(mesh);
    return mesh;
  }

  // =========================================================
  // HOLLOW BUILDING FACTORY
  // front = local +Z. rotY: 0 faces north, π south, ±π/2 east/west.
  // cfg.interior(ctx) builds props in LOCAL coordinates.
  // =========================================================
  function hollowBuilding(cfg) {
    const root = new BABYLON.TransformNode("hb_" + cfg.name, scene);
    root.position.set(cfg.x, 0, cfg.z);
    root.rotation.y = cfg.rotY || 0;
    const W = cfg.w, H = cfg.h, D = cfg.d, TH = 0.4;
    PARK.indoorZones.push({ x: cfg.x, z: cfg.z, w: W - TH * 2, d: D - TH * 2, rotY: cfg.rotY || 0 });
    const dw = cfg.doorW || 2.6, dh = cfg.doorH || 3;

    const bodyM = mat(scene, "hbM_" + cfg.name, cfg.tint || C3(0.55, 0.5, 0.52), {
      tex: cfg.texFn ? cfg.texFn() : TEX.brick(scene, "light"),
    });
    bodyM.diffuseTexture.uScale = Math.max(2, Math.round(W / 4));
    bodyM.diffuseTexture.vScale = Math.max(1, Math.round(H / 3));
    const inM = cfg.inMat || mat(scene, "hbInM_" + cfg.name, C3(0.3, 0.28, 0.3), { tex: TEX.brick(scene, "dark") });

    function wall(name, w, h, d, x, y, z, m) {
      const b = BABYLON.MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, scene);
      b.position.set(x, y, z);
      b.material = m || bodyM;
      b.parent = root;
      solid(b);
      return b;
    }
    // floor
    const floor = BABYLON.MeshBuilder.CreateGround("hbFloor_" + cfg.name, { width: W - 0.2, height: D - 0.2 }, scene);
    floor.position.y = 0.09;
    floor.material = cfg.floorMat || mat(scene, "hbFloorM_" + cfg.name, C3(0.42, 0.4, 0.38), { tex: TEX.planks(scene) });
    if (floor.material.diffuseTexture) { floor.material.diffuseTexture.uScale = W / 3; floor.material.diffuseTexture.vScale = D / 3; }
    floor.parent = root;
    // shell
    wall("hbCeil", W, TH, D, 0, H + TH / 2, 0);
    wall("hbBack", W, H, TH, 0, H / 2, -D / 2 + TH / 2);
    wall("hbSideL", TH, H, D, -W / 2 + TH / 2, H / 2, 0);
    wall("hbSideR", TH, H, D, W / 2 - TH / 2, H / 2, 0);
    const segW = (W - dw) / 2;
    wall("hbFrontL", segW, H, TH, -(dw / 2 + segW / 2), H / 2, D / 2 - TH / 2);
    wall("hbFrontR", segW, H, TH, dw / 2 + segW / 2, H / 2, D / 2 - TH / 2);
    wall("hbLintel", dw, H - dh, TH, 0, dh + (H - dh) / 2, D / 2 - TH / 2);

    // roof cap
    const roof = BABYLON.MeshBuilder.CreateBox("hbRoof", { width: W + 0.8, height: 0.3, depth: D + 0.8 }, scene);
    roof.position.y = H + 0.55;
    roof.material = cfg.roofMat || mat(scene, "hbRoofM_" + cfg.name, C3(0.2, 0.2, 0.24), { tex: TEX.metal(scene) });
    roof.parent = root;

    // front windows (glow planes)
    (cfg.wins || []).forEach((wn, wi) => {
      const wp = BABYLON.MeshBuilder.CreatePlane("hbWin" + wi, { width: wn[2], height: wn[3] }, scene);
      wp.position.set(wn[0], wn[1], D / 2 + 0.06);
      wp.rotation.y = Math.PI;
      wp.material = wn[4] || cfg.winMat;
      wp.parent = root;
    });

    // sign above the door
    if (cfg.sign) {
      const sp = BABYLON.MeshBuilder.CreatePlane("hbSign", { width: Math.min(W - 1, cfg.sign.length * 1.1 + 2), height: 1.35 }, scene);
      sp.position.set(0, H - 0.1, D / 2 + 0.1);
      sp.rotation.y = Math.PI;
      sp.rotation.z = (Math.random() - 0.5) * 0.06;
      const st = TEX.sign(scene, cfg.sign, {
        w: 1024, h: 160, bg: cfg.signBg || "#150d0a",
        fg: cfg.signFg || "#ffd98a", glowColor: cfg.signGlow, fontSize: 95,
      });
      const sm = new BABYLON.StandardMaterial("hbSignM_" + cfg.name, scene);
      sm.diffuseTexture = st; sm.emissiveTexture = st;
      sm.emissiveColor = C3(0.95, 0.95, 0.95);
      registerFlicker(sm, C3(1, 1, 1), cfg.flickerSign || "buzz");
      sp.material = sm;
      sp.parent = root;
    }

    // interior dressing (local coords; +Z is the door side)
    if (cfg.interior) cfg.interior({ root, W, H, D, inM });

    // scoped interior light so it never steals slots outside
    if (cfg.light) {
      const all = root.getChildMeshes();
      const l = new BABYLON.PointLight("hbL_" + cfg.name, BABYLON.Vector3.Zero(), scene);
      l.parent = root;
      l.position = new BABYLON.Vector3(cfg.light.pos[0], cfg.light.pos[1], cfg.light.pos[2]);
      l.diffuse = cfg.light.color;
      l.intensity = cfg.light.intensity || 1.2;
      l.range = cfg.light.range || Math.max(W, D) * 1.2;
      l.includedOnlyMeshes = all;
      if (cfg.light.anim) PARK.updaters.push((dt, t) => { l.intensity = cfg.light.anim(t); });
    }
    root.getChildMeshes().forEach(m => m.freezeWorldMatrix());
    return root;
  }

  // small helpers for interiors
  function box(parent, name, w, h, d, x, y, z, m, ry) {
    const b = BABYLON.MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, scene);
    b.position.set(x, y, z);
    if (ry) b.rotation.y = ry;
    b.material = m;
    b.parent = parent;
    return b;
  }

  const shelfM = mat(scene, "shelfM", C3(0.45, 0.36, 0.26), { tex: plankTex });
  const counterM = mat(scene, "counterM", C3(0.5, 0.42, 0.32), { tex: TEX.planks(scene) });
  const itemMs = [
    mat(scene, "itemM0", C3(0.6, 0.2, 0.2)), mat(scene, "itemM1", C3(0.2, 0.4, 0.6)),
    mat(scene, "itemM2", C3(0.6, 0.5, 0.2)), mat(scene, "itemM3", C3(0.35, 0.5, 0.3)),
  ];
  const ceilLampWarm = new BABYLON.StandardMaterial("ceilLampWarm", scene);
  ceilLampWarm.emissiveColor = C3(0.95, 0.65, 0.3);
  ceilLampWarm.diffuseColor = C3(0.1, 0.07, 0.03);
  registerFlicker(ceilLampWarm, C3(0.95, 0.65, 0.3), "dying");
  const ceilLampCold = ceilLampWarm.clone("ceilLampCold");
  registerFlicker(ceilLampCold, C3(0.5, 0.75, 0.85), "buzz");

  function ceilingLamp(parent, x, y, z, cold) {
    const p = BABYLON.MeshBuilder.CreatePlane("ceilLamp", { width: 1.6, height: 0.5 }, scene);
    p.position.set(x, y, z);
    p.rotation.x = -Math.PI / 2;
    p.material = cold ? ceilLampCold : ceilLampWarm;
    p.parent = parent;
  }

  // =========================================================
  // ENTRANCE GATE (z = -108)
  // =========================================================
  {
    const gz = -108;
    const towerMat = mat(scene, "towerMat", C3(0.7, 0.68, 0.72), { tex: TEX.brick(scene, "dark") });
    towerMat.diffuseTexture.uScale = 2; towerMat.diffuseTexture.vScale = 5;
    for (const sx of [-1, 1]) {
      const tower = BABYLON.MeshBuilder.CreateBox("gateTower", { width: 5, height: 13, depth: 5 }, scene);
      tower.position.set(sx * 12, 6.5, gz);
      tower.material = towerMat;
      solid(tower);
      tower.freezeWorldMatrix();
      const cap = BABYLON.MeshBuilder.CreateCylinder("gateCap", { height: 3.2, diameterBottom: 6.4, diameterTop: 0.3, tessellation: 8 }, scene);
      cap.position.set(sx * 12, 14.6, gz);
      cap.material = mat(scene, "capMat", C3(0.32, 0.12, 0.14), { tex: metalTex });
      cap.freezeWorldMatrix();
    }
    const beam = BABYLON.MeshBuilder.CreateBox("gateBeam", { width: 20, height: 4.4, depth: 1.6 }, scene);
    beam.position.set(0, 12, gz);
    beam.material = mat(scene, "gateBeamMat", C3(0.1, 0.07, 0.06));
    beam.freezeWorldMatrix();
    const signTex = TEX.sign(scene, "สวนสนุกเก้าแก้ว", {
      w: 1024, h: 220, bg: "#160d08", fg: "#ffd98a", glowColor: "#ff9030",
      fontSize: 130, borderColor: "#7a5c30"
    });
    const signMat = new BABYLON.StandardMaterial("gateSignMat", scene);
    signMat.diffuseTexture = signTex;
    signMat.emissiveTexture = signTex;
    signMat.emissiveColor = C3(1, 1, 1);
    signMat.specularColor = C3(0, 0, 0);
    registerFlicker(signMat, C3(1, 1, 1), "dying");
    for (const face of [-1, 1]) {
      const sp = BABYLON.MeshBuilder.CreatePlane("gateSign" + face, { width: 19.6, height: 4.1 }, scene);
      sp.position.set(0, 12, gz + face * 0.82);
      if (face === 1) sp.rotation.y = Math.PI;
      sp.material = signMat;
      sp.freezeWorldMatrix();
    }
    const bulbMat = new BABYLON.StandardMaterial("gateBulbMat", scene);
    bulbMat.emissiveColor = C3(1, 0.75, 0.35);
    bulbMat.diffuseColor = C3(0.2, 0.15, 0.05);
    registerFlicker(bulbMat, C3(1, 0.75, 0.35), "buzz");
    const gbulb = BABYLON.MeshBuilder.CreateSphere("gbulb", { diameter: 0.28, segments: 5 }, scene);
    gbulb.material = bulbMat;
    gbulb.position.set(0, -70, 0);
    for (let i = 0; i <= 12; i++) {
      for (const yy of [9.6, 14.4]) {
        const b = gbulb.createInstance("gb");
        b.position.set(-9 + i * 1.5, yy, gz - 0.9);
        b.freezeWorldMatrix();
      }
    }
    // ticket booth + info
    for (const def of [{ x: -8, name: "จำหน่ายบัตร" }, { x: 8, name: "ประชาสัมพันธ์" }]) {
      const booth = BABYLON.MeshBuilder.CreateBox("booth" + def.x, { width: 3, height: 3, depth: 2.6 }, scene);
      booth.position.set(def.x, 1.5, gz + 9);
      booth.material = mat(scene, "boothMat" + def.x, C3(0.5, 0.42, 0.5), { tex: TEX.planks(scene) });
      solid(booth); booth.freezeWorldMatrix();
      const roof = BABYLON.MeshBuilder.CreateCylinder("boothRoof" + def.x, { height: 1.4, diameterBottom: 4.4, diameterTop: 0.2, tessellation: 4 }, scene);
      roof.position.set(def.x, 3.7, gz + 9);
      roof.rotation.y = Math.PI / 4;
      roof.material = mat(scene, "boothRoofMat", C3(0.4, 0.1, 0.12));
      roof.freezeWorldMatrix();
      const bs = BABYLON.MeshBuilder.CreatePlane("boothSign" + def.x, { width: 2.6, height: 0.7 }, scene);
      bs.position.set(def.x, 2.6, gz + 10.32);
      bs.rotation.y = Math.PI;
      const bsTex = TEX.sign(scene, def.name, { w: 512, h: 128, bg: "#241610", fg: "#d8c090", fontSize: 66 });
      const bsMat = new BABYLON.StandardMaterial("boothSignMat" + def.x, scene);
      bsMat.diffuseTexture = bsTex; bsMat.emissiveTexture = bsTex;
      bsMat.emissiveColor = C3(0.55, 0.55, 0.55);
      bs.material = bsMat;
      bs.freezeWorldMatrix();
    }
  }

  // =========================================================
  // AVENUE SHOPS — six walk-in shops flanking the main avenue
  // =========================================================
  {
    const shopDefs = [
      { name: "ร้านของที่ระลึก", x: -17, z: -50, rotY: Math.PI / 2, c: C3(0.55, 0.35, 0.3) },
      { name: "น้ำแข็งไส ป้าแก้ว", x: -17, z: -68, rotY: Math.PI / 2, c: C3(0.3, 0.45, 0.55) },
      { name: "ของเล่นผีเฮี้ยน", x: -17, z: -86, rotY: Math.PI / 2, c: C3(0.4, 0.5, 0.35) },
      { name: "ไก่ย่างเก้าแก้ว", x: 17, z: -50, rotY: -Math.PI / 2, c: C3(0.55, 0.3, 0.3) },
      { name: "กาแฟโบราณ", x: 17, z: -68, rotY: -Math.PI / 2, c: C3(0.45, 0.38, 0.28) },
      { name: "ขนมสายไหม", x: 17, z: -86, rotY: -Math.PI / 2, c: C3(0.5, 0.35, 0.45) },
    ];
    shopDefs.forEach((def, i) => {
      hollowBuilding({
        name: "shop" + i, x: def.x, z: def.z, rotY: def.rotY,
        w: 10, h: 4.5, d: 8, tint: def.c, texFn: () => TEX.planks(scene),
        sign: def.name, signFg: "#e8cf9a", flickerSign: i % 2 ? "dying" : "buzz",
        doorW: 2.4, doorH: 2.8,
        interior: (ctx) => {
          box(ctx.root, "counter", 5, 1, 0.8, 0, 0.6, 1.4, counterM);
          box(ctx.root, "shelf1", 8, 0.15, 0.6, 0, 1.3, -3.2, shelfM);
          box(ctx.root, "shelf2", 8, 0.15, 0.6, 0, 2.1, -3.2, shelfM);
          for (let k = 0; k < 6; k++) {
            const it = box(ctx.root, "item", 0.4, 0.45, 0.35,
              -3 + k * 1.2, (k % 2 ? 1.3 : 2.1) + 0.31, -3.2,
              itemMs[(i + k) % itemMs.length], k * 0.8);
            if (k === 2) { it.rotation.z = Math.PI / 2 - 0.2; it.position.y -= 0.1; } // fallen item
          }
          ceilingLamp(ctx.root, 0, ctx.H - 0.05, 0, false);
        },
      });
    });
  }

  // =========================================================
  // ARCADE (35,14, faces south) — glowing cabinets inside
  // =========================================================
  {
    const cabM = mat(scene, "cabM", C3(0.18, 0.18, 0.26));
    const scrCyan = new BABYLON.StandardMaterial("scrCyan", scene);
    scrCyan.emissiveColor = C3(0.2, 0.85, 0.85);
    scrCyan.diffuseColor = C3(0.02, 0.08, 0.08);
    registerFlicker(scrCyan, C3(0.2, 0.85, 0.85), "buzz");
    const scrMag = scrCyan.clone("scrMag");
    registerFlicker(scrMag, C3(0.85, 0.25, 0.85), "pulse");
    const scrDead = mat(scene, "scrDead", C3(0.03, 0.03, 0.04));
    hollowBuilding({
      name: "arcade", x: 35, z: 14, rotY: Math.PI,
      w: 16, h: 6, d: 12, tint: C3(0.4, 0.4, 0.55),
      sign: "โรงเกมหยอดเหรียญ", signGlow: "#c020c0", signFg: "#ff9aff", flickerSign: "dying",
      wins: [[-5, 3.2, 3, 1.6], [5, 3.2, 3, 1.6]],
      winMat: scrCyan,
      light: { pos: [0, 4.5, 0], color: C3(0.3, 0.7, 0.8), intensity: 1.7 },
      interior: (ctx) => {
        for (let k = 0; k < 5; k++) {
          for (const sx of [-1, 1]) {
            const cx = sx * (ctx.W / 2 - 1.2), cz = -4 + k * 2.1;
            box(ctx.root, "cab", 0.95, 1.85, 0.75, cx, 0.95, cz, cabM, sx * Math.PI / 2);
            const scr = BABYLON.MeshBuilder.CreatePlane("cabScr", { width: 0.62, height: 0.5 }, scene);
            scr.position.set(cx - sx * 0.39, 1.35, cz);
            scr.rotation.y = sx > 0 ? Math.PI / 2 : -Math.PI / 2; // screens face the center aisle
            scr.rotation.x = -0.15;
            scr.material = k === 2 ? scrDead : (k % 2 ? scrMag : scrCyan);
            scr.parent = ctx.root;
          }
        }
        box(ctx.root, "airhockey", 2.2, 0.85, 1.2, 0, 0.45, 1.5, cabM);
        ceilingLamp(ctx.root, 0, ctx.H - 0.05, -2, true);
      },
    });
  }

  // =========================================================
  // 4D CINEMA (60,14, faces south) — static-noise screen + seats
  // =========================================================
  {
    const staticTex = TEX.waterNoise(scene);
    const scrM = new BABYLON.StandardMaterial("cinemaScr", scene);
    scrM.emissiveTexture = staticTex;
    scrM.emissiveColor = C3(0.55, 0.6, 0.62);
    scrM.diffuseColor = C3(0, 0, 0);
    scrM.disableLighting = true;
    PARK.updaters.push((dt, t) => {
      staticTex.uOffset = Math.random() * 0.5;
      staticTex.vOffset = Math.random() * 0.5;
      scrM.emissiveColor.copyFrom(new BABYLON.Color3(0.5, 0.55, 0.58).scale(Math.random() < 0.04 ? 0.1 : 0.5 + Math.random() * 0.3));
    });
    const seatM = mat(scene, "cinSeatM", C3(0.4, 0.12, 0.14));
    hollowBuilding({
      name: "cinema", x: 60, z: 14, rotY: Math.PI,
      w: 18, h: 7, d: 14, tint: C3(0.35, 0.3, 0.5),
      sign: "โรงหนังสี่มิติ", signGlow: "#8030d0", signFg: "#c8a0ff", flickerSign: "buzz",
      doorW: 3, doorH: 3,
      interior: (ctx) => {
        const scr = BABYLON.MeshBuilder.CreatePlane("cinScreen", { width: 11, height: 4.6 }, scene);
        scr.position.set(0, 2.9, -ctx.D / 2 + 0.35);
        scr.rotation.y = Math.PI;
        scr.material = scrM;
        scr.parent = ctx.root;
        for (let r = 0; r < 4; r++) {
          for (let c = 0; c < 6; c++) {
            if (Math.random() < 0.1) continue;
            const s = box(ctx.root, "cinSeat", 0.85, 0.95, 0.7,
              -4.5 + c * 1.7, 0.5, 0.2 + r * 1.5, seatM);
            if (r === 2 && c === 3) { s.rotation.x = -1.2; s.position.y = 0.35; } // broken seat
            const sb = box(ctx.root, "cinSeatB", 0.85, 0.75, 0.14,
              -4.5 + c * 1.7, 1.1, 0.55 + r * 1.5, seatM);
            if (r === 2 && c === 3) sb.setEnabled(false);
          }
        }
      },
    });
  }

  // =========================================================
  // THEATER (-40,16, faces south) — stage, curtain, seats
  // =========================================================
  {
    const curtainM = new BABYLON.StandardMaterial("curtainM", scene);
    curtainM.diffuseTexture = TEX.stripes(scene, "#571620", "#40101a", "curtain");
    curtainM.diffuseTexture.uScale = 6;
    curtainM.diffuseColor = C3(0.7, 0.55, 0.55);
    curtainM.specularColor = C3(0.05, 0.02, 0.02);
    const stageM = mat(scene, "stageM", C3(0.45, 0.38, 0.3), { tex: TEX.planks(scene) });
    const thSeatM = mat(scene, "thSeatM", C3(0.32, 0.2, 0.12));
    hollowBuilding({
      name: "theater", x: -40, z: 16, rotY: Math.PI,
      w: 22, h: 8.5, d: 16, tint: C3(0.55, 0.35, 0.35), texFn: () => TEX.brick(scene, "light"),
      sign: "โรงละครเก้าแก้ว", signGlow: "#d04010", signFg: "#ffb080", flickerSign: "dying",
      doorW: 3.4, doorH: 3.2,
      light: { pos: [0, 5, -4], color: C3(1, 0.6, 0.3), intensity: 1.0, anim: (t) => 0.6 + 0.5 * Math.abs(Math.sin(t * 0.7)) },
      interior: (ctx) => {
        box(ctx.root, "stage", ctx.W - 3, 1.1, 5, 0, 0.55, -ctx.D / 2 + 3, stageM);
        const cur = BABYLON.MeshBuilder.CreatePlane("curtain", { width: ctx.W - 3.5, height: ctx.H - 2.2 }, scene);
        cur.position.set(0, (ctx.H - 2.2) / 2 + 1.1, -ctx.D / 2 + 1.1);
        cur.rotation.y = Math.PI;
        cur.material = curtainM;
        cur.parent = ctx.root;
        // a single spotlit chair on stage (empty... for now)
        box(ctx.root, "stageChair", 0.6, 0.6, 0.6, 0.5, 1.4, -ctx.D / 2 + 3, thSeatM);
        box(ctx.root, "stageChairB", 0.6, 0.7, 0.1, 0.5, 2.0, -ctx.D / 2 + 3.25, thSeatM);
        for (let r = 0; r < 4; r++) {
          for (let c = 0; c < 8; c++) {
            if (Math.random() < 0.12) continue;
            const s = box(ctx.root, "thSeat", 0.8, 0.85, 0.65,
              -7 + c * 2, 0.45, 0.6 + r * 1.6, thSeatM);
            if (r === 1 && c === 5) { s.rotation.z = 0.9; s.position.y = 0.3; }
            box(ctx.root, "thSeatB", 0.8, 0.7, 0.12, -7 + c * 2, 1.0, 0.92 + r * 1.6, thSeatM);
          }
        }
        ceilingLamp(ctx.root, 0, ctx.H - 0.05, 2, false);
      },
    });
  }

  // =========================================================
  // MIRROR HOUSE (-75,16, faces south) — mirror maze inside
  // =========================================================
  {
    const mirrorM = new BABYLON.StandardMaterial("mirrorM", scene);
    mirrorM.diffuseColor = C3(0.25, 0.3, 0.42);
    mirrorM.specularColor = C3(1, 1, 1);
    mirrorM.specularPower = 220;
    mirrorM.emissiveColor = C3(0.07, 0.1, 0.16);
    mirrorM.backFaceCulling = false;
    hollowBuilding({
      name: "mirror", x: -75, z: 16, rotY: Math.PI,
      w: 14, h: 5.5, d: 10, texFn: () => TEX.metal(scene), tint: C3(0.5, 0.55, 0.65),
      sign: "บ้านกระจกพิศวง", signGlow: "#3080c0", signFg: "#a0d8ff", flickerSign: "buzz",
      floorMat: (() => { const m2 = mat(scene, "mirFloorM", C3(0.5, 0.52, 0.6), { tex: TEX.pavement(scene) }); return m2; })(),
      interior: (ctx) => {
        // mirror partitions forming a small S maze
        function mirrorWall(w, x, z, ry) {
          const p = BABYLON.MeshBuilder.CreatePlane("mirWall", { width: w, height: ctx.H - 1 }, scene);
          p.position.set(x, (ctx.H - 1) / 2 + 0.1, z);
          p.rotation.y = ry || 0;
          p.material = mirrorM;
          p.parent = ctx.root;
          p.checkCollisions = true;
        }
        mirrorWall(9, -2.3, 1.6);
        mirrorWall(9, 2.3, -1.4);
        mirrorWall(4, -4.8, -2.8, Math.PI / 2);
        ceilingLamp(ctx.root, 0, ctx.H - 0.05, 3, true);
        ceilingLamp(ctx.root, 3, ctx.H - 0.05, -3, true);
      },
    });
  }

  // =========================================================
  // BUMPER CAR HALL (59,-34, faces north) — walk among dead cars
  // =========================================================
  {
    const bcFloorM = mat(scene, "bcFloorM", C3(0.3, 0.32, 0.36), { tex: TEX.metal(scene) });
    const bcGlow = new BABYLON.StandardMaterial("bcGlowM", scene);
    bcGlow.emissiveColor = C3(0.1, 0.5, 0.15);
    bcGlow.diffuseColor = C3(0.01, 0.05, 0.02);
    registerFlicker(bcGlow, C3(0.12, 0.55, 0.18), "dying");
    const carCols = [C3(0.6, 0.15, 0.15), C3(0.15, 0.35, 0.6), C3(0.6, 0.5, 0.1), C3(0.4, 0.2, 0.5)];
    hollowBuilding({
      name: "bumper", x: 59, z: -34, rotY: 0,
      w: 24, h: 6, d: 16, texFn: () => TEX.metal(scene), tint: C3(0.35, 0.4, 0.5),
      sign: "รถบั๊มพ์", signGlow: "#20a020", signFg: "#7ae87a", flickerSign: "dying",
      doorW: 4, doorH: 3.2,
      floorMat: bcFloorM,
      interior: (ctx) => {
        const glow = BABYLON.MeshBuilder.CreatePlane("bcBackGlow", { width: ctx.W - 4, height: 1.2 }, scene);
        glow.position.set(0, 2.4, -ctx.D / 2 + 0.35);
        glow.rotation.y = Math.PI;
        glow.material = bcGlow;
        glow.parent = ctx.root;
        for (let k = 0; k < 5; k++) {
          const bx = -8 + k * 4 + (k % 2) * 1.2, bz = -3 + (k % 3) * 2.5;
          const bc = BABYLON.MeshBuilder.CreateSphere("bcCar" + k, { diameterX: 1.6, diameterY: 0.8, diameterZ: 2.0, segments: 8 }, scene);
          bc.position.set(bx, 0.5, bz);
          bc.rotation.y = k * 1.9;
          const bcm = new BABYLON.StandardMaterial("bcCarM" + k, scene);
          bcm.diffuseColor = carCols[k % carCols.length];
          bcm.specularColor = C3(0.3, 0.3, 0.35);
          bcm.specularPower = 64;
          bc.material = bcm;
          bc.parent = ctx.root;
          bc.checkCollisions = true;
          const pole = BABYLON.MeshBuilder.CreateCylinder("bcPole" + k, { height: 1.8, diameter: 0.06 }, scene);
          pole.position.set(bx, 1.6, bz - 0.4);
          pole.rotation.x = 0.3;
          pole.material = mat(scene, "bcPoleM", C3(0.2, 0.2, 0.22));
          pole.parent = ctx.root;
        }
      },
    });
  }

  // =========================================================
  // FOOD HALL (-40,-78, faces north) — stalls & tables inside
  // =========================================================
  {
    const stallNames = ["ก๋วยเตี๋ยวเรือ", "ข้าวมันไก่", "น้ำแข็งไสโบราณ"];
    const tableM = mat(scene, "fhTableM", C3(0.5, 0.42, 0.3), { tex: TEX.planks(scene) });
    hollowBuilding({
      name: "foodhall", x: -40, z: -78, rotY: 0,
      w: 22, h: 5.5, d: 14, tint: C3(0.5, 0.4, 0.3), texFn: () => TEX.planks(scene),
      sign: "ศูนย์อาหารเก้าแก้ว", signGlow: "#c07010", signFg: "#ffd98a", flickerSign: "buzz",
      doorW: 3.6, doorH: 3,
      light: { pos: [0, 4, -2], color: C3(1, 0.6, 0.25), intensity: 1.1 },
      interior: (ctx) => {
        stallNames.forEach((nm, k) => {
          const sx = -7 + k * 7;
          box(ctx.root, "fhCounter", 5.5, 1.05, 1.2, sx, 0.55, -ctx.D / 2 + 1.6, counterM);
          const sp = BABYLON.MeshBuilder.CreatePlane("fhStallSign", { width: 4.4, height: 0.8 }, scene);
          sp.position.set(sx, 3.4, -ctx.D / 2 + 0.5);
          sp.rotation.y = Math.PI;
          const st = TEX.sign(scene, nm, { w: 512, h: 100, bg: "#1c130c", fg: "#e8cf9a", fontSize: 54 });
          const sm = new BABYLON.StandardMaterial("fhStallSM" + k, scene);
          sm.diffuseTexture = st; sm.emissiveTexture = st;
          sm.emissiveColor = C3(0.6, 0.6, 0.6);
          if (k === 1) registerFlicker(sm, C3(0.7, 0.7, 0.7), "dying");
          sp.material = sm;
          sp.parent = ctx.root;
        });
        for (let k = 0; k < 4; k++) {
          const tx = -6 + (k % 2) * 12 - 1.5, tz = 0.5 + Math.floor(k / 2) * 3.6;
          const table = BABYLON.MeshBuilder.CreateCylinder("fhTable" + k, { height: 0.08, diameter: 1.6, tessellation: 12 }, scene);
          table.position.set(tx, 0.82, tz);
          table.material = tableM;
          table.parent = ctx.root;
          const leg = BABYLON.MeshBuilder.CreateCylinder("fhLeg" + k, { height: 0.8, diameter: 0.12 }, scene);
          leg.position.set(tx, 0.4, tz);
          leg.material = tableM;
          leg.parent = ctx.root;
          for (let si = 0; si < 3; si++) {
            const sa = (si / 3) * Math.PI * 2 + k;
            const stool = BABYLON.MeshBuilder.CreateCylinder("fhStool", { height: 0.48, diameter: 0.38, tessellation: 8 }, scene);
            if (k === 1 && si === 0) {
              stool.position.set(tx + Math.cos(sa) * 1.4, 0.2, tz + Math.sin(sa) * 1.4);
              stool.rotation.z = Math.PI / 2;
            } else {
              stool.position.set(tx + Math.cos(sa) * 1.2, 0.24, tz + Math.sin(sa) * 1.2);
            }
            stool.material = tableM;
            stool.parent = ctx.root;
          }
        }
      },
    });
  }

  // =========================================================
  // HAUNTED HOUSE (-72,-34) — the classic S-corridor walk-in
  // front (ghost mouth) faces north onto the west street
  // =========================================================
  {
    const hx = -72, hz = -34;
    PARK.indoorZones.push({ x: hx, z: hz, w: 25, d: 17, rotY: 0 });
    const hhMat = mat(scene, "hhMat", C3(0.42, 0.36, 0.5), { tex: TEX.brick(scene, "dark") });
    hhMat.diffuseTexture.uScale = 5; hhMat.diffuseTexture.vScale = 3;
    const inMat = mat(scene, "hhInMat", C3(0.2, 0.15, 0.26), { tex: TEX.brick(scene, "dark") });
    inMat.diffuseTexture.uScale = 4; inMat.diffuseTexture.vScale = 2;
    const interiorMeshes = [];

    function hhWall(name, w, h, d, x, y, z, m) {
      const wl = BABYLON.MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, scene);
      wl.position.set(x, y, z);
      wl.material = m || hhMat;
      solid(wl);
      wl.freezeWorldMatrix();
      interiorMeshes.push(wl);
      return wl;
    }
    const H = 9, TH = 0.5;
    const hhFloor = BABYLON.MeshBuilder.CreateGround("hhFloor", { width: 26, height: 18 }, scene);
    hhFloor.position.set(hx, 0.1, hz);
    const hhFloorMat = mat(scene, "hhFloorMat", C3(0.3, 0.28, 0.33), { tex: TEX.planks(scene) });
    hhFloorMat.diffuseTexture.uScale = 6; hhFloorMat.diffuseTexture.vScale = 4;
    hhFloor.material = hhFloorMat;
    hhFloor.freezeWorldMatrix();
    interiorMeshes.push(hhFloor);
    hhWall("hhCeil", 26, TH, 18, hx, H + 0.25, hz, hhMat);
    hhWall("hhWallS", 26, H, TH, hx, H / 2, hz - 9 + TH / 2);
    hhWall("hhWallW", TH, H, 18, hx - 13 + TH / 2, H / 2, hz);
    hhWall("hhWallE", TH, H, 18, hx + 13 - TH / 2, H / 2, hz);
    hhWall("hhWallN1", 11.3, H, TH, hx - 1.7 - 11.3 / 2, H / 2, hz + 9 - TH / 2);
    hhWall("hhWallN2", 11.3, H, TH, hx + 1.7 + 11.3 / 2, H / 2, hz + 9 - TH / 2);
    hhWall("hhLintel", 3.4, H - 3.8, TH, hx, 3.8 + (H - 3.8) / 2, hz + 9 - TH / 2);
    hhWall("hhPart1", 17, H, 0.35, hx - 13 + 8.5, H / 2, hz + 2.6, inMat);
    hhWall("hhPart2", 17, H, 0.35, hx + 13 - 8.5, H / 2, hz - 3.2, inMat);

    const coffin = BABYLON.MeshBuilder.CreateBox("hhCoffin", { width: 0.9, height: 2.2, depth: 0.45 }, scene);
    coffin.position.set(hx + 8, 1.25, hz - 8.2);
    coffin.rotation.x = -0.18;
    coffin.material = mat(scene, "hhCoffinMat", C3(0.3, 0.2, 0.12), { tex: TEX.planks(scene) });
    solid(coffin); coffin.freezeWorldMatrix();
    interiorMeshes.push(coffin);
    const eyeMat = new BABYLON.StandardMaterial("hhEyeMat", scene);
    eyeMat.emissiveColor = C3(0.9, 0.15, 0.1);
    eyeMat.disableLighting = true;
    registerFlicker(eyeMat, C3(0.9, 0.15, 0.1), "pulse");
    for (const spot of [[hx - 11, 1.6, hz - 7.5], [hx + 11, 2.2, hz + 6.5], [hx - 4, 1.4, hz - 1]]) {
      for (const ex of [-0.14, 0.14]) {
        const eye = BABYLON.MeshBuilder.CreateSphere("hhEye", { diameter: 0.12, segments: 5 }, scene);
        eye.position.set(spot[0] + ex, spot[1], spot[2]);
        eye.material = eyeMat;
        eye.freezeWorldMatrix();
      }
    }
    const ghost = BABYLON.MeshBuilder.CreateCylinder("hhGhost", { height: 2.1, diameterTop: 0.25, diameterBottom: 1.3, tessellation: 10 }, scene);
    const ghostMat = new BABYLON.StandardMaterial("hhGhostMat", scene);
    ghostMat.diffuseColor = C3(0.85, 0.88, 0.95);
    ghostMat.emissiveColor = C3(0.32, 0.35, 0.45);
    ghostMat.alpha = 0.72;
    ghost.material = ghostMat;
    for (const ex of [-0.16, 0.16]) {
      const gEye = BABYLON.MeshBuilder.CreateSphere("hhGhostEye", { diameter: 0.11, segments: 5 }, scene);
      gEye.position.set(ex, 0.55, -0.42);
      gEye.material = mat(scene, "hhGhostEyeM", C3(0.01, 0.01, 0.01));
      gEye.parent = ghost;
    }
    PARK.updaters.push((dt, t) => {
      const f = (Math.sin(t * 0.32) + 1) / 2;
      ghost.position.set(hx - 8 + f * 16, 1.5 + Math.sin(t * 1.7) * 0.25, hz - 6);
      ghost.rotation.y = Math.sin(t * 0.32) > 0 ? Math.PI / 2 : -Math.PI / 2;
    });
    const hhLightR = new BABYLON.PointLight("hhLightR", new BABYLON.Vector3(hx - 6, 4, hz + 5.5), scene);
    hhLightR.diffuse = C3(1, 0.2, 0.12);
    hhLightR.intensity = 1.3;
    hhLightR.range = 16;
    const hhLightG = new BABYLON.PointLight("hhLightG", new BABYLON.Vector3(hx + 5, 4, hz - 5.5), scene);
    hhLightG.diffuse = C3(0.25, 0.9, 0.3);
    hhLightG.intensity = 1.1;
    hhLightG.range = 15;
    hhLightR.includedOnlyMeshes = interiorMeshes.concat([ghost, coffin]);
    hhLightG.includedOnlyMeshes = interiorMeshes.concat([ghost, coffin]);
    PARK.updaters.push((dt, t) => {
      hhLightR.intensity = 0.9 + 0.5 * Math.sin(t * 6.1) * Math.sin(t * 1.3);
      hhLightG.intensity = Math.random() < 0.02 ? 0.1 : 1.0;
    });

    // pointed towers + screaming facade with the see-through mouth
    for (const sx of [-1, 1]) {
      const tw = BABYLON.MeshBuilder.CreateCylinder("hhTower", { height: 8, diameter: 5, tessellation: 8 }, scene);
      tw.position.set(hx + sx * 11, 11, hz);
      tw.material = hhMat;
      tw.freezeWorldMatrix();
      const cone = BABYLON.MeshBuilder.CreateCylinder("hhCone", { height: 5.5, diameterBottom: 5.6, diameterTop: 0.1, tessellation: 8 }, scene);
      cone.position.set(hx + sx * 11, 17.7, hz);
      cone.material = mat(scene, "hhConeMat", C3(0.18, 0.08, 0.2));
      cone.freezeWorldMatrix();
    }
    const facePlane = BABYLON.MeshBuilder.CreatePlane("hhFace", { width: 15, height: 13 }, scene);
    facePlane.position.set(hx, 6.5, hz + 9.06);
    facePlane.rotation.y = Math.PI;
    const faceTex = TEX.ghostFace(scene);
    const faceMat = new BABYLON.StandardMaterial("hhFaceMat", scene);
    faceMat.diffuseTexture = faceTex;
    faceMat.emissiveTexture = faceTex;
    faceMat.emissiveColor = C3(0.75, 0.75, 0.75);
    registerFlicker(faceMat, C3(0.8, 0.8, 0.8), "pulse");
    facePlane.material = faceMat;
    facePlane.freezeWorldMatrix();
    const hs = BABYLON.MeshBuilder.CreatePlane("hhSign", { width: 12, height: 2.2 }, scene);
    hs.position.set(hx, 14, hz + 9.1);
    hs.rotation.y = Math.PI;
    hs.rotation.z = 0.05;
    const hsTex = TEX.sign(scene, "บ้านผีสิง", { w: 1024, h: 190, bg: "#0d0612", fg: "#b32ce8", glowColor: "#7a00b0", fontSize: 120 });
    const hsMat = new BABYLON.StandardMaterial("hhSignMat", scene);
    hsMat.diffuseTexture = hsTex; hsMat.emissiveTexture = hsTex;
    hsMat.emissiveColor = C3(1, 1, 1);
    registerFlicker(hsMat, C3(1, 1, 1), "dying");
    hs.material = hsMat;
    hs.freezeWorldMatrix();
    const cart = BABYLON.MeshBuilder.CreateBox("hhCart", { width: 1.6, height: 0.9, depth: 2.4 }, scene);
    cart.position.set(hx - 8, 0.55, hz + 11.5);
    cart.rotation.y = 0.4;
    cart.material = mat(scene, "hhCartMat", C3(0.5, 0.08, 0.1));
    solid(cart); cart.freezeWorldMatrix();
  }

  // =========================================================
  // WATER PARK (SE block) — pools, slides, lazy river
  // =========================================================
  {
    const waterTex = TEX.waterNoise(scene);
    const waterMat = new BABYLON.StandardMaterial("waterMat", scene);
    waterMat.diffuseTexture = waterTex;
    waterMat.diffuseColor = C3(0.25, 0.5, 0.55);
    waterMat.emissiveColor = C3(0.02, 0.10, 0.12);
    waterMat.specularColor = C3(0.6, 0.75, 0.8);
    waterMat.specularPower = 128;
    waterMat.alpha = 0.85;
    PARK.updaters.push((dt, t) => {
      waterTex.uOffset = Math.sin(t * 0.12) * 0.3 + t * 0.008;
      waterTex.vOffset = t * 0.012;
    });
    const poolEdgeMat = mat(scene, "poolEdge", C3(0.65, 0.66, 0.7), { tex: TEX.pavement(scene) });
    const poolInnerMat = mat(scene, "poolInner", C3(0.35, 0.55, 0.6));

    function pool(name, x, z, w, d) {
      const rim = BABYLON.MeshBuilder.CreateBox(name + "_rim", { width: w + 2.4, height: 0.9, depth: d + 2.4 }, scene);
      rim.position.set(x, 0.45, z);
      rim.material = poolEdgeMat;
      solid(rim);
      const inner = BABYLON.MeshBuilder.CreateBox(name + "_inner", { width: w, height: 0.5, depth: d }, scene);
      inner.position.set(x, 0.68, z);
      inner.material = poolInnerMat;
      const ws = BABYLON.MeshBuilder.CreateGround(name + "_water", { width: w - 0.4, height: d - 0.4 }, scene);
      ws.position.set(x, 0.96, z);
      ws.material = waterMat;
      rim.freezeWorldMatrix(); inner.freezeWorldMatrix(); ws.freezeWorldMatrix();
    }
    pool("wavePool", 42, -72, 24, 16);
    pool("kidPool", 64, -56, 12, 9);
    pool("splash", 72, -76, 10, 8);

    const slTowerMat = mat(scene, "slTowerMat", C3(0.5, 0.55, 0.6), { tex: metalTex });
    const slTower = BABYLON.MeshBuilder.CreateBox("slideTower", { width: 5, height: 13, depth: 5 }, scene);
    slTower.position.set(82, 6.5, -87);
    slTower.material = slTowerMat;
    solid(slTower); slTower.freezeWorldMatrix();
    const slPlat = BABYLON.MeshBuilder.CreateBox("slidePlat", { width: 7.5, height: 0.4, depth: 7.5 }, scene);
    slPlat.position.set(82, 13.2, -87);
    slPlat.material = slTowerMat;
    slPlat.freezeWorldMatrix();
    const slideColors = [
      { c: C3(0.75, 0.2, 0.16), e: C3(0.12, 0.02, 0.02) },
      { c: C3(0.16, 0.45, 0.7), e: C3(0.02, 0.06, 0.12) },
      { c: C3(0.8, 0.65, 0.15), e: C3(0.12, 0.09, 0.02) },
    ];
    slideColors.forEach((col, si) => {
      const pts = [];
      const turns = 2.0, steps = 54;
      const baseA = si * (Math.PI * 2 / 3);
      const rr = 5.5 + si * 1.8;
      for (let s = 0; s <= steps; s++) {
        const f = s / steps;
        const a = baseA + f * turns * Math.PI * 2;
        pts.push(new BABYLON.Vector3(
          82 + Math.cos(a) * rr * (0.55 + f * 0.45),
          12.6 - f * 11.4,
          -87 + Math.sin(a) * rr * (0.55 + f * 0.45)
        ));
      }
      const last = pts[pts.length - 1];
      pts.push(new BABYLON.Vector3(last.x - 2.5, 1.1, last.z + 1));
      const tube = BABYLON.MeshBuilder.CreateTube("slide" + si, { path: pts, radius: 0.7, tessellation: 10, cap: BABYLON.Mesh.CAP_ALL }, scene);
      const tm = new BABYLON.StandardMaterial("slideMat" + si, scene);
      tm.diffuseColor = col.c;
      tm.emissiveColor = col.e;
      tm.specularColor = C3(0.3, 0.3, 0.3);
      tm.specularPower = 64;
      tube.material = tm;
      tube.freezeWorldMatrix();
    });

    // lazy river ring around the slide tower
    const lr = BABYLON.MeshBuilder.CreateTorus("lazyRiver", { diameter: 30, thickness: 4.2, tessellation: 40 }, scene);
    lr.position.set(82, 0.32, -87);
    lr.scaling.y = 0.07;
    const lrM = new BABYLON.StandardMaterial("lazyRiverM", scene);
    lrM.diffuseTexture = TEX.waterNoise(scene);
    lrM.diffuseColor = C3(0.3, 0.55, 0.6);
    lrM.emissiveColor = C3(0.02, 0.09, 0.1);
    lrM.alpha = 0.85;
    lrM.specularColor = C3(0.5, 0.6, 0.65);
    lrM.specularPower = 96;
    lr.material = lrM;
    lr.freezeWorldMatrix();
    PARK.updaters.push((dt, t) => { lrM.diffuseTexture.uOffset = t * 0.02; });
    const tube2 = BABYLON.MeshBuilder.CreateTorus("innerTube", { diameter: 1.1, thickness: 0.3, tessellation: 14 }, scene);
    const tubeM2 = new BABYLON.StandardMaterial("innerTubeM", scene);
    tubeM2.diffuseColor = C3(0.7, 0.6, 0.1);
    tube2.material = tubeM2;
    PARK.updaters.push((dt, t) => {
      const a = t * 0.13;
      tube2.position.set(82 + Math.cos(a) * 15, 0.45, -87 + Math.sin(a) * 15);
    });

    // gate sign on the east spur
    const wpPost1 = BABYLON.MeshBuilder.CreateCylinder("wpP1", { height: 6.5, diameter: 0.45 }, scene);
    wpPost1.position.set(26, 3.25, -55);
    wpPost1.material = slTowerMat;
    const wpPost2 = wpPost1.clone("wpP2"); wpPost2.position.z = -65;
    solid(wpPost1); solid(wpPost2);
    wpPost1.freezeWorldMatrix(); wpPost2.freezeWorldMatrix();
    const wpSign = BABYLON.MeshBuilder.CreatePlane("wpSign", { width: 11, height: 1.8 }, scene);
    wpSign.position.set(26, 5.9, -60);
    wpSign.rotation.y = Math.PI / 2;
    const wpTex = TEX.sign(scene, "สวนน้ำเก้าแก้ว", { w: 1024, h: 170, bg: "#06181c", fg: "#5ce8e8", glowColor: "#00b0c0", fontSize: 100 });
    const wpMat2 = new BABYLON.StandardMaterial("wpSignMat", scene);
    wpMat2.diffuseTexture = wpTex; wpMat2.emissiveTexture = wpTex;
    wpMat2.emissiveColor = C3(1, 1, 1);
    wpMat2.backFaceCulling = false;
    registerFlicker(wpMat2, C3(1, 1, 1), "buzz");
    wpSign.material = wpMat2;
    wpSign.freezeWorldMatrix();
  }

  // =========================================================
  // GAME BOOTHS on the west spur + KIOSKS on the north avenue
  // =========================================================
  {
    const booths = [
      { name: "ปาเป้าลูกโป่ง", x: -58, z: -68, c: "#7a2f2f" },
      { name: "สอยดาวนำโชค", x: -74, z: -68, c: "#2f5a7a" },
      { name: "ตักปลาทองผี", x: -90, z: -68, c: "#5a7a2f" },
    ];
    booths.forEach((b, bi) => {
      const back = BABYLON.MeshBuilder.CreateBox("gbBack" + bi, { width: 8, height: 3.4, depth: 0.3 }, scene);
      back.position.set(b.x, 1.7, b.z - 2.5);
      const gbMat = mat(scene, "gbM" + bi, BABYLON.Color3.FromHexString(b.c), { tex: plankTex });
      back.material = gbMat;
      solid(back); back.freezeWorldMatrix();
      for (const sx of [-1, 1]) {
        const side = BABYLON.MeshBuilder.CreateBox("gbSide" + bi + sx, { width: 0.3, height: 3.4, depth: 5 }, scene);
        side.position.set(b.x + sx * 3.85, 1.7, b.z);
        side.material = gbMat;
        solid(side); side.freezeWorldMatrix();
      }
      const counter = BABYLON.MeshBuilder.CreateBox("gbCount" + bi, { width: 8, height: 1.0, depth: 0.5 }, scene);
      counter.position.set(b.x, 0.5, b.z + 2.4);
      counter.material = gbMat;
      solid(counter); counter.freezeWorldMatrix();
      const gbRoof = BABYLON.MeshBuilder.CreateBox("gbRoof" + bi, { width: 8.6, height: 0.12, depth: 6 }, scene);
      gbRoof.position.set(b.x, 3.6, b.z);
      gbRoof.rotation.x = 0.12;
      const gbRoofM = new BABYLON.StandardMaterial("gbRoofM" + bi, scene);
      gbRoofM.diffuseTexture = TEX.stripes(scene, b.c, "#d8cfc0", "gb" + bi);
      gbRoofM.diffuseColor = C3(0.55, 0.52, 0.5);
      gbRoofM.backFaceCulling = false;
      gbRoof.material = gbRoofM;
      gbRoof.freezeWorldMatrix();
      for (let pi = 0; pi < 5; pi++) {
        const prize = BABYLON.MeshBuilder.CreateBox("gbPrize", { size: 0.45 }, scene);
        prize.position.set(b.x - 2.4 + pi * 1.2, 2.4, b.z - 2.2);
        prize.rotation.y = pi * 0.9;
        prize.material = itemMs[pi % itemMs.length];
        prize.freezeWorldMatrix();
      }
      const gbSign = BABYLON.MeshBuilder.CreatePlane("gbSign" + bi, { width: 6.5, height: 1.05 }, scene);
      gbSign.position.set(b.x, 3.1, b.z + 3.06);
      gbSign.rotation.y = Math.PI;
      const gbTex = TEX.sign(scene, b.name, { w: 1024, h: 170, bg: "#191008", fg: "#e8cf9a", fontSize: 92 });
      const gbSM = new BABYLON.StandardMaterial("gbSignM" + bi, scene);
      gbSM.diffuseTexture = gbTex; gbSM.emissiveTexture = gbTex;
      gbSM.emissiveColor = C3(0.55, 0.55, 0.55);
      gbSign.material = gbSM;
      gbSign.freezeWorldMatrix();
    });

    const kiosks = [
      { x: -8, z: 22, rot: Math.PI / 2, name: "น้ำอัดลม" },
      { x: 8, z: 30, rot: -Math.PI / 2, name: "ไอศกรีมโบราณ" },
      { x: -8, z: 44, rot: Math.PI / 2, name: "ข้าวโพดคั่ว" },
      { x: 8, z: 52, rot: -Math.PI / 2, name: "น้ำปั่นเฮี้ยน" },
    ];
    kiosks.forEach((k, ki) => {
      const kr = new BABYLON.TransformNode("kiosk" + ki, scene);
      kr.position.set(k.x, 0, k.z);
      kr.rotation.y = k.rot;
      const kb = BABYLON.MeshBuilder.CreateBox("kioskB" + ki, { width: 2.6, height: 2.3, depth: 2 }, scene);
      kb.position.y = 1.15;
      kb.material = mat(scene, "kioskM" + ki, C3(0.5, 0.45, 0.42), { tex: plankTex });
      kb.parent = kr;
      solid(kb);
      const kroof = BABYLON.MeshBuilder.CreateCylinder("kioskR" + ki, { height: 1.1, diameterBottom: 3.6, diameterTop: 0.15, tessellation: 8 }, scene);
      kroof.position.y = 2.95;
      const krm = new BABYLON.StandardMaterial("kioskRM" + ki, scene);
      krm.diffuseTexture = TEX.stripes(scene, ["#8a2f2f", "#2f6a8a", "#8a6f2f", "#5c2f8a"][ki], "#d8cfc0", "kiosk" + ki);
      krm.diffuseColor = C3(0.55, 0.52, 0.5);
      kroof.material = krm;
      kroof.parent = kr;
      const ks = BABYLON.MeshBuilder.CreatePlane("kioskS" + ki, { width: 2.3, height: 0.55 }, scene);
      ks.position.set(0, 1.85, 1.06);
      ks.rotation.y = Math.PI;
      const kst = TEX.sign(scene, k.name, { w: 512, h: 128, bg: "#1c130c", fg: "#e0c890", fontSize: 68 });
      const ksm = new BABYLON.StandardMaterial("kioskSM" + ki, scene);
      ksm.diffuseTexture = kst; ksm.emissiveTexture = kst;
      ksm.emissiveColor = C3(0.5, 0.5, 0.5);
      ks.material = ksm;
      ks.parent = kr;
      kr.getChildMeshes().forEach(m => m.freezeWorldMatrix());
    });
  }

  // =========================================================
  // PLAZA FOUNTAIN (murky water) + map board + toilets + depot
  // =========================================================
  {
    const fBase = BABYLON.MeshBuilder.CreateCylinder("fountBase", { height: 0.9, diameter: 9, tessellation: 24 }, scene);
    fBase.position.set(0, 0.45, -10);
    const fMat = mat(scene, "fountMat", C3(0.55, 0.56, 0.6), { tex: TEX.pavement(scene) });
    fBase.material = fMat;
    solid(fBase); fBase.freezeWorldMatrix();
    const fWater = BABYLON.MeshBuilder.CreateDisc("fountWater", { radius: 4.1, tessellation: 24 }, scene);
    fWater.rotation.x = Math.PI / 2;
    fWater.position.set(0, 0.92, -10);
    const fwM = new BABYLON.StandardMaterial("fountWaterM", scene);
    fwM.diffuseTexture = TEX.waterNoise(scene);
    fwM.diffuseColor = C3(0.2, 0.35, 0.28);
    fwM.emissiveColor = C3(0.01, 0.04, 0.03);
    fwM.alpha = 0.9;
    fWater.material = fwM;
    fWater.freezeWorldMatrix();
    PARK.updaters.push((dt, t) => { fwM.diffuseTexture.uOffset = t * 0.006; });
    const fMid = BABYLON.MeshBuilder.CreateCylinder("fountMid", { height: 1.6, diameterBottom: 2.6, diameterTop: 2.0, tessellation: 16 }, scene);
    fMid.position.set(0, 1.7, -10);
    fMid.material = fMat;
    fMid.freezeWorldMatrix();
    const statueMat = mat(scene, "statueMat", C3(0.35, 0.37, 0.4));
    const sBody = BABYLON.MeshBuilder.CreateSphere("stB", { diameterX: 1.0, diameterY: 1.2, diameterZ: 2.2, segments: 8 }, scene);
    sBody.position.set(0, 3.4, -10); sBody.rotation.x = -0.5;
    sBody.material = statueMat;
    const sHead = BABYLON.MeshBuilder.CreateSphere("stH", { diameterX: 0.5, diameterY: 0.6, diameterZ: 1.0, segments: 8 }, scene);
    sHead.position.set(0, 4.5, -9.1); sHead.rotation.x = 0.5;
    sHead.material = statueMat;
    sBody.freezeWorldMatrix(); sHead.freezeWorldMatrix();

    const mapBoard = BABYLON.MeshBuilder.CreatePlane("mapBoard", { width: 3.4, height: 2.2 }, scene);
    mapBoard.position.set(12, 1.8, -30);
    mapBoard.rotation.y = Math.PI;
    const mapTex = TEX.sign(scene, "แผนที่สวนสนุก", { w: 512, h: 340, bg: "#12240f", fg: "#cfe0b0", fontSize: 60, dy: -100 });
    const mm = new BABYLON.StandardMaterial("mapMat", scene);
    mm.diffuseTexture = mapTex; mm.emissiveTexture = mapTex;
    mm.emissiveColor = C3(0.4, 0.4, 0.4);
    mapBoard.material = mm;
    const mapLegs = BABYLON.MeshBuilder.CreateBox("mapLegs", { width: 3.6, height: 0.15, depth: 0.15 }, scene);
    mapLegs.position.set(12, 0.4, -30);
    mapLegs.material = mat(scene, "mapLegMat", C3(0.2, 0.2, 0.22));
    mapBoard.freezeWorldMatrix(); mapLegs.freezeWorldMatrix();

    // toilets (small, solid) + maintenance depot (solid, ominous)
    const wcM = mat(scene, "wcM", C3(0.6, 0.65, 0.6), { tex: TEX.brick(scene, "light") });
    const wc = BABYLON.MeshBuilder.CreateBox("wc", { width: 7, height: 3.4, depth: 5 }, scene);
    wc.position.set(-16, 1.7, -92);
    wc.material = wcM;
    solid(wc); wc.freezeWorldMatrix();
    const wcSign = BABYLON.MeshBuilder.CreatePlane("wcSign", { width: 3, height: 0.8 }, scene);
    wcSign.position.set(-16, 3, -89.4);
    wcSign.rotation.y = Math.PI;
    const wcTex = TEX.sign(scene, "ห้องน้ำ", { w: 512, h: 128, bg: "#101810", fg: "#c8e0c8", fontSize: 70 });
    const wcSM = new BABYLON.StandardMaterial("wcSignM", scene);
    wcSM.diffuseTexture = wcTex; wcSM.emissiveTexture = wcTex;
    wcSM.emissiveColor = C3(0.6, 0.6, 0.6);
    wcSign.material = wcSM;
    wcSign.freezeWorldMatrix();

    const depotM = mat(scene, "depotM", C3(0.35, 0.36, 0.32), { tex: TEX.metal(scene) });
    depotM.diffuseTexture.uScale = 5;
    const depot = BABYLON.MeshBuilder.CreateBox("depot", { width: 14, height: 6, depth: 10 }, scene);
    depot.position.set(-90, 3, -94);
    depot.material = depotM;
    solid(depot); depot.freezeWorldMatrix();
    const depSign = BABYLON.MeshBuilder.CreatePlane("depSign", { width: 6, height: 1 }, scene);
    depSign.position.set(-90, 5, -88.9);
    depSign.rotation.y = Math.PI;
    depSign.rotation.z = -0.05;
    const depTex = TEX.sign(scene, "โรงซ่อมบำรุง", { w: 768, h: 128, bg: "#141410", fg: "#9aa88a", fontSize: 72 });
    const depSM = new BABYLON.StandardMaterial("depSignM", scene);
    depSM.diffuseTexture = depTex; depSM.emissiveTexture = depTex;
    depSM.emissiveColor = C3(0.7, 0.7, 0.7);
    registerFlicker(depSM, C3(0.7, 0.7, 0.7), "dying");
    depSign.material = depSM;
    depSign.freezeWorldMatrix();
  }
}
