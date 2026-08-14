// ============================================================
// buildings.js — entrance, shops, haunted house, water park
// ============================================================
"use strict";

function buildBuildings(scene) {
  const C3 = (r, g, b) => new BABYLON.Color3(r, g, b);
  const brickTex = TEX.brick(scene, "dark");
  const brickTexLight = TEX.brick(scene, "light");
  const plankTex = TEX.planks(scene);
  const metalTex = TEX.metal(scene);

  function solid(mesh) {
    mesh.checkCollisions = true;
    PARK.colliders.push(mesh);
    return mesh;
  }

  // =========================================================
  // ENTRANCE GATE  (south, z = -248)
  // =========================================================
  {
    const gz = -248;
    const towerMat = mat(scene, "towerMat", C3(0.7, 0.68, 0.72), { tex: brickTex });
    towerMat.diffuseTexture.uScale = 2; towerMat.diffuseTexture.vScale = 5;
    for (const sx of [-1, 1]) {
      const tower = BABYLON.MeshBuilder.CreateBox("gateTower", { width: 5, height: 13, depth: 5 }, scene);
      tower.position.set(sx * 13, 6.5, gz);
      tower.material = towerMat;
      solid(tower);
      tower.freezeWorldMatrix();
      const cap = BABYLON.MeshBuilder.CreateCylinder("gateCap", { height: 3.2, diameterBottom: 6.4, diameterTop: 0.3, tessellation: 8 }, scene);
      cap.position.set(sx * 13, 14.6, gz);
      const capMat = mat(scene, "capMat", C3(0.32, 0.12, 0.14), { tex: metalTex });
      cap.material = capMat;
      cap.freezeWorldMatrix();
    }
    // arch beam + sign (plane per side so the text is never mirrored)
    const beam = BABYLON.MeshBuilder.CreateBox("gateBeam", { width: 22, height: 4.4, depth: 1.6 }, scene);
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
      const sp = BABYLON.MeshBuilder.CreatePlane("gateSign" + face, { width: 21.6, height: 4.1 }, scene);
      sp.position.set(0, 12, gz + face * 0.82);
      if (face === 1) sp.rotation.y = Math.PI; // north side readable from inside the park
      sp.material = signMat;
      sp.freezeWorldMatrix();
    }

    // bulbs around the sign
    const bulbMat = new BABYLON.StandardMaterial("gateBulbMat", scene);
    bulbMat.emissiveColor = C3(1, 0.75, 0.35);
    bulbMat.diffuseColor = C3(0.2, 0.15, 0.05);
    registerFlicker(bulbMat, C3(1, 0.75, 0.35), "buzz");
    const gbulb = BABYLON.MeshBuilder.CreateSphere("gbulb", { diameter: 0.28, segments: 5 }, scene);
    gbulb.material = bulbMat;
    gbulb.position.set(0, -60, 0);
    for (let i = 0; i <= 14; i++) {
      for (const yy of [9.6, 14.4]) {
        const b = gbulb.createInstance("gb");
        b.position.set(-10.5 + i * 1.5, yy, gz - 0.9);
        b.freezeWorldMatrix();
      }
    }

    // ticket booth
    const booth = BABYLON.MeshBuilder.CreateBox("booth", { width: 3, height: 3, depth: 2.6 }, scene);
    booth.position.set(-7, 1.5, gz + 8);
    const boothMat = mat(scene, "boothMat", C3(0.5, 0.42, 0.5), { tex: plankTex });
    booth.material = boothMat;
    solid(booth); booth.freezeWorldMatrix();
    const boothRoof = BABYLON.MeshBuilder.CreateCylinder("boothRoof", { height: 1.4, diameterBottom: 4.4, diameterTop: 0.2, tessellation: 4 }, scene);
    boothRoof.position.set(-7, 3.7, gz + 8);
    boothRoof.rotation.y = Math.PI / 4;
    boothRoof.material = mat(scene, "boothRoofMat", C3(0.4, 0.1, 0.12));
    boothRoof.freezeWorldMatrix();
    const boothSign = BABYLON.MeshBuilder.CreatePlane("boothSign", { width: 2.6, height: 0.7 }, scene);
    boothSign.position.set(-7, 2.6, gz + 9.32);
    boothSign.rotation.y = Math.PI; // readable from inside the park (north side)
    const bsTex = TEX.sign(scene, "จำหน่ายบัตร", { w: 512, h: 128, bg: "#241610", fg: "#d8c090", fontSize: 76 });
    const bsMat = new BABYLON.StandardMaterial("boothSignMat", scene);
    bsMat.diffuseTexture = bsTex; bsMat.emissiveTexture = bsTex;
    bsMat.emissiveColor = C3(0.55, 0.55, 0.55);
    boothSign.material = bsMat;
    boothSign.freezeWorldMatrix();
  }

  // =========================================================
  // SHOP STREET (two rows flanking cross path at z=-90)
  // =========================================================
  {
    const shopDefs = [
      { name: "ร้านของที่ระลึก", x: -62, z: -104, c: "#7a4030", awn: ["#8a2f2f", "#d8cfc0"] },
      { name: "น้ำแข็งไส ป้าแก้ว", x: -38, z: -104, c: "#33566a", awn: ["#2f6a8a", "#d8cfc0"] },
      { name: "ปาโป่ง โหดจริง", x: -14, z: -104, c: "#6a5533", awn: ["#8a6f2f", "#d8cfc0"] },
      { name: "ยิงเป้า ล่ารางวัล", x: 14, z: -104, c: "#54336a", awn: ["#5c2f8a", "#d8cfc0"] },
      { name: "ไก่ย่างเก้าแก้ว", x: 38, z: -104, c: "#6a3333", awn: ["#8a2f2f", "#e8d8a0"] },
      { name: "กาแฟโบราณ", x: 62, z: -104, c: "#4a3a2a", awn: ["#6a4a2f", "#d8cfc0"] },
      { name: "ขนมสายไหม", x: -50, z: -76, c: "#6a4a5a", awn: ["#a05070", "#e8e0d0"], flip: true },
      { name: "ของเล่นเด็ก", x: -22, z: -76, c: "#3a5a4a", awn: ["#2f8a5c", "#d8cfc0"], flip: true },
      { name: "ลูกชิ้นปิ้ง", x: 22, z: -76, c: "#5a4a33", awn: ["#8a6f2f", "#e0d0c0"], flip: true },
      { name: "ถ่ายรูปที่ระลึก", x: 50, z: -76, c: "#33445a", awn: ["#2f4f8a", "#d8cfc0"], flip: true },
    ];
    const shopLightWarm = new BABYLON.StandardMaterial("shopWinWarm", scene);
    shopLightWarm.emissiveColor = C3(0.95, 0.6, 0.2);
    shopLightWarm.diffuseColor = C3(0.1, 0.06, 0.02);
    registerFlicker(shopLightWarm, C3(0.95, 0.6, 0.2), "dying");
    const shopWinDark = new BABYLON.StandardMaterial("shopWinDark", scene);
    shopWinDark.diffuseColor = C3(0.02, 0.025, 0.04);
    shopWinDark.specularColor = C3(0.4, 0.45, 0.6);
    shopWinDark.specularPower = 96;

    shopDefs.forEach((def, i) => {
      const face = def.flip ? -1 : 1; // faces toward the street (z=-90)
      const body = BABYLON.MeshBuilder.CreateBox("shop" + i, { width: 9, height: 4.2, depth: 6 }, scene);
      body.position.set(def.x, 2.1, def.z);
      const bm = mat(scene, "shopMat" + i, BABYLON.Color3.FromHexString(def.c), { tex: plankTex });
      bm.diffuseTexture = plankTex.clone();
      bm.diffuseTexture.uScale = 3; bm.diffuseTexture.vScale = 1.5;
      body.material = bm;
      solid(body); body.freezeWorldMatrix();

      // roof
      const roof = BABYLON.MeshBuilder.CreateBox("shopRoof" + i, { width: 9.8, height: 0.25, depth: 6.8 }, scene);
      roof.position.set(def.x, 4.35, def.z);
      roof.rotation.x = face * 0.06;
      roof.material = mat(scene, "shopRoofM" + i, C3(0.2, 0.2, 0.24), { tex: metalTex });
      roof.freezeWorldMatrix();

      // service window (dark or dimly lit)
      const win = BABYLON.MeshBuilder.CreatePlane("shopWin" + i, { width: 5.4, height: 1.7 }, scene);
      win.position.set(def.x, 2.2, def.z + face * 3.02);
      if (!def.flip) win.rotation.y = Math.PI; // face the street between the rows
      win.material = (i === 1 || i === 4) ? shopLightWarm : shopWinDark; // two shops eerily lit
      win.freezeWorldMatrix();

      // awning
      const awn = BABYLON.MeshBuilder.CreateBox("awn" + i, { width: 9.2, height: 0.1, depth: 2.4 }, scene);
      awn.position.set(def.x, 3.6, def.z + face * 4.1);
      awn.rotation.x = face * 0.35;
      const awnMat = new BABYLON.StandardMaterial("awnMat" + i, scene);
      awnMat.diffuseTexture = TEX.stripes(scene, def.awn[0], def.awn[1], "awn" + i);
      awnMat.diffuseColor = C3(0.5, 0.48, 0.45); // faded, dirty fabric
      awnMat.backFaceCulling = false;
      awnMat.specularColor = C3(0.02, 0.02, 0.02);
      awn.material = awnMat;
      awn.freezeWorldMatrix();
      // awning support poles
      for (const px of [-4, 4]) {
        const ap = BABYLON.MeshBuilder.CreateCylinder("awnPole" + i + px, { height: 3.4, diameter: 0.08, tessellation: 6 }, scene);
        ap.position.set(def.x + px, 1.7, def.z + face * 5.1);
        ap.material = mat(scene, "awnPoleM", C3(0.25, 0.25, 0.28));
        ap.freezeWorldMatrix();
      }

      // sign board
      const sp = BABYLON.MeshBuilder.CreatePlane("shopSign" + i, { width: 7, height: 1.15 }, scene);
      sp.position.set(def.x, 4.0, def.z + face * 3.15);
      if (!def.flip) sp.rotation.y = Math.PI; // face the street between the rows
      sp.rotation.z = (Math.random() - 0.5) * 0.09; // slightly crooked — abandoned
      const st = TEX.sign(scene, def.name, { w: 1024, h: 170, bg: "#1c130c", fg: "#e8cf9a", fontSize: 92 });
      const sm = new BABYLON.StandardMaterial("shopSignM" + i, scene);
      sm.diffuseTexture = st; sm.emissiveTexture = st;
      sm.emissiveColor = C3(0.5, 0.5, 0.5);
      if (i === 4) registerFlicker(sm, C3(0.85, 0.85, 0.85), "dying");
      sp.material = sm;
      sp.freezeWorldMatrix();
    });
  }

  // =========================================================
  // HAUNTED HOUSE  "บ้านผีสิง"  (x=60, z=-160)
  // =========================================================
  {
    const hx = 60, hz = -160;
    const body = BABYLON.MeshBuilder.CreateBox("hh", { width: 26, height: 13, depth: 18 }, scene);
    body.position.set(hx, 6.5, hz);
    const hhMat = mat(scene, "hhMat", C3(0.45, 0.4, 0.55), { tex: brickTex });
    hhMat.diffuseTexture = brickTex.clone();
    hhMat.diffuseTexture.uScale = 5; hhMat.diffuseTexture.vScale = 3;
    hhMat.diffuseColor = C3(0.42, 0.36, 0.5);
    body.material = hhMat;
    solid(body); body.freezeWorldMatrix();

    // two pointed towers
    for (const sx of [-1, 1]) {
      const tw = BABYLON.MeshBuilder.CreateCylinder("hhTower", { height: 8, diameter: 5, tessellation: 8 }, scene);
      tw.position.set(hx + sx * 11, 13, hz);
      tw.material = hhMat;
      tw.freezeWorldMatrix();
      const cone = BABYLON.MeshBuilder.CreateCylinder("hhCone", { height: 5.5, diameterBottom: 5.6, diameterTop: 0.1, tessellation: 8 }, scene);
      cone.position.set(hx + sx * 11, 19.7, hz);
      cone.material = mat(scene, "hhConeMat", C3(0.18, 0.08, 0.2));
      cone.freezeWorldMatrix();
    }

    // screaming face facade
    const facePlane = BABYLON.MeshBuilder.CreatePlane("hhFace", { width: 15, height: 13 }, scene);
    facePlane.position.set(hx, 6.5, hz + 9.06); // facade faces the park (north)
    facePlane.rotation.y = Math.PI;
    const faceTex = TEX.ghostFace(scene);
    const faceMat = new BABYLON.StandardMaterial("hhFaceMat", scene);
    faceMat.diffuseTexture = faceTex;
    faceMat.emissiveTexture = faceTex;
    faceMat.emissiveColor = C3(0.75, 0.75, 0.75);
    registerFlicker(faceMat, C3(0.8, 0.8, 0.8), "pulse");
    facePlane.material = faceMat;
    facePlane.freezeWorldMatrix();

    // sign
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

    // little track cart frozen at the entrance
    const cart = BABYLON.MeshBuilder.CreateBox("hhCart", { width: 1.6, height: 0.9, depth: 2.4 }, scene);
    cart.position.set(hx - 3, 0.55, hz + 11.5);
    cart.rotation.y = 0.4;
    const cartMat = mat(scene, "hhCartMat", C3(0.5, 0.08, 0.1));
    cart.material = cartMat;
    solid(cart); cart.freezeWorldMatrix();
  }

  // =========================================================
  // WATER PARK  "สวนน้ำเก้าแก้ว"  (east side, around x=120, z=30)
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
    let waterT = 0;
    PARK.updaters.push((dt, t) => {
      waterTex.uOffset = Math.sin(t * 0.12) * 0.3 + t * 0.008;
      waterTex.vOffset = t * 0.012;
    });

    const poolEdgeMat = mat(scene, "poolEdge", C3(0.65, 0.66, 0.7), { tex: TEX.pavement(scene) });
    const poolInnerMat = mat(scene, "poolInner", C3(0.35, 0.55, 0.6));

    // ---- wave pool ----
    function pool(name, x, z, w, d) {
      // rim
      const rim = BABYLON.MeshBuilder.CreateBox(name + "_rim", { width: w + 2.4, height: 0.9, depth: d + 2.4 }, scene);
      rim.position.set(x, 0.45, z);
      rim.material = poolEdgeMat;
      solid(rim);
      // carve illusion: inner dark box on top
      const inner = BABYLON.MeshBuilder.CreateBox(name + "_inner", { width: w, height: 0.5, depth: d }, scene);
      inner.position.set(x, 0.68, z);
      inner.material = poolInnerMat;
      // water surface
      const ws = BABYLON.MeshBuilder.CreateGround(name + "_water", { width: w - 0.4, height: d - 0.4 }, scene);
      ws.position.set(x, 0.96, z);
      ws.material = waterMat;
      rim.freezeWorldMatrix(); inner.freezeWorldMatrix(); ws.freezeWorldMatrix();
    }
    pool("wavePool", 120, 12, 46, 26);
    pool("kidPool", 96, 52, 18, 14);

    // ---- slide tower with 3 spiral slides ----
    const towerX = 148, towerZ = 52;
    const slTower = BABYLON.MeshBuilder.CreateBox("slideTower", { width: 6, height: 15, depth: 6 }, scene);
    slTower.position.set(towerX, 7.5, towerZ);
    const slTowerMat = mat(scene, "slTowerMat", C3(0.5, 0.55, 0.6), { tex: metalTex });
    slTower.material = slTowerMat;
    solid(slTower); slTower.freezeWorldMatrix();
    const slPlat = BABYLON.MeshBuilder.CreateBox("slidePlat", { width: 9, height: 0.4, depth: 9 }, scene);
    slPlat.position.set(towerX, 15.2, towerZ);
    slPlat.material = slTowerMat;
    slPlat.freezeWorldMatrix();

    const slideColors = [
      { c: C3(0.75, 0.2, 0.16), e: C3(0.12, 0.02, 0.02) },
      { c: C3(0.16, 0.45, 0.7), e: C3(0.02, 0.06, 0.12) },
      { c: C3(0.8, 0.65, 0.15), e: C3(0.12, 0.09, 0.02) },
    ];
    slideColors.forEach((col, si) => {
      const pts = [];
      const turns = 2.2, steps = 60;
      const baseA = si * (Math.PI * 2 / 3);
      const rr = 7 + si * 2.2;
      for (let s = 0; s <= steps; s++) {
        const f = s / steps;
        const a = baseA + f * turns * Math.PI * 2;
        const y = 14.5 - f * 13.2;
        pts.push(new BABYLON.Vector3(
          towerX + Math.cos(a) * rr * (0.55 + f * 0.45),
          y,
          towerZ + Math.sin(a) * rr * (0.55 + f * 0.45)
        ));
      }
      // run-out into splash pool
      const last = pts[pts.length - 1];
      pts.push(new BABYLON.Vector3(last.x - 3, 1.1, last.z + 1));
      const tube = BABYLON.MeshBuilder.CreateTube("slide" + si, { path: pts, radius: 0.75, tessellation: 10, cap: BABYLON.Mesh.CAP_ALL }, scene);
      const tm = new BABYLON.StandardMaterial("slideMat" + si, scene);
      tm.diffuseColor = col.c;
      tm.emissiveColor = col.e;
      tm.specularColor = C3(0.3, 0.3, 0.3);
      tm.specularPower = 64;
      tube.material = tm;
      tube.freezeWorldMatrix();
      // splash pool at bottom
      if (si === 0) pool("splash", towerX - 6, towerZ + 8, 16, 10);
    });

    // waterpark gate sign
    const wpPost1 = BABYLON.MeshBuilder.CreateCylinder("wpP1", { height: 7, diameter: 0.5 }, scene);
    wpPost1.position.set(76, 3.5, 6);
    wpPost1.material = slTowerMat;
    const wpPost2 = wpPost1.clone("wpP2"); wpPost2.position.z = -6;
    solid(wpPost1); solid(wpPost2);
    wpPost1.freezeWorldMatrix(); wpPost2.freezeWorldMatrix();
    const wpSign = BABYLON.MeshBuilder.CreatePlane("wpSign", { width: 13, height: 2 }, scene);
    wpSign.position.set(76, 6.4, 0);
    wpSign.rotation.y = Math.PI / 2; // readable when approaching from the plaza (west)
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
  // PLAZA FOUNTAIN (dry, cracked) + park map board
  // =========================================================
  {
    const fBase = BABYLON.MeshBuilder.CreateCylinder("fountBase", { height: 0.9, diameter: 10, tessellation: 24 }, scene);
    fBase.position.set(0, 0.45, 0);
    const fMat = mat(scene, "fountMat", C3(0.55, 0.56, 0.6), { tex: TEX.pavement(scene) });
    fBase.material = fMat;
    solid(fBase); fBase.freezeWorldMatrix();
    const fMid = BABYLON.MeshBuilder.CreateCylinder("fountMid", { height: 1.6, diameterBottom: 3, diameterTop: 2.2, tessellation: 16 }, scene);
    fMid.position.set(0, 1.7, 0);
    fMid.material = fMat;
    fMid.freezeWorldMatrix();
    // statue: weathered horse (carousel mascot) rearing on top
    const statueMat = mat(scene, "statueMat", C3(0.35, 0.37, 0.4));
    const sBody = BABYLON.MeshBuilder.CreateSphere("stB", { diameterX: 1.0, diameterY: 1.2, diameterZ: 2.2, segments: 8 }, scene);
    sBody.position.set(0, 3.4, 0); sBody.rotation.x = -0.5;
    sBody.material = statueMat;
    const sHead = BABYLON.MeshBuilder.CreateSphere("stH", { diameterX: 0.5, diameterY: 0.6, diameterZ: 1.0, segments: 8 }, scene);
    sHead.position.set(0, 4.5, 0.9); sHead.rotation.x = 0.5;
    sHead.material = statueMat;
    sBody.freezeWorldMatrix(); sHead.freezeWorldMatrix();

    // map board
    const mapBoard = BABYLON.MeshBuilder.CreatePlane("mapBoard", { width: 3.4, height: 2.2 }, scene);
    mapBoard.position.set(10, 1.8, -34);
    mapBoard.rotation.y = Math.PI;
    const mapTex = TEX.sign(scene, "แผนที่สวนสนุก", { w: 512, h: 340, bg: "#12240f", fg: "#cfe0b0", fontSize: 60, dy: -100 });
    const mm = new BABYLON.StandardMaterial("mapMat", scene);
    mm.diffuseTexture = mapTex; mm.emissiveTexture = mapTex;
    mm.emissiveColor = C3(0.4, 0.4, 0.4);
    mapBoard.material = mm;
    const mapLegs = BABYLON.MeshBuilder.CreateBox("mapLegs", { width: 3.6, height: 0.15, depth: 0.15 }, scene);
    mapLegs.position.set(10, 0.4, -34);
    mapLegs.material = mat(scene, "mapLegMat", C3(0.2, 0.2, 0.22));
    mapBoard.freezeWorldMatrix(); mapLegs.freezeWorldMatrix();
  }
}
