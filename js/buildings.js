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
      const bm = mat(scene, "shopMat" + i, BABYLON.Color3.FromHexString(def.c), { tex: TEX.planks(scene) });
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
    // NOTE: never clone() a DynamicTexture — clones stay blank and never
    // become ready, which silently skips the whole mesh. Make fresh ones.
    const hhMat = mat(scene, "hhMat", C3(0.42, 0.36, 0.5), { tex: TEX.brick(scene, "dark") });
    hhMat.diffuseTexture.uScale = 5; hhMat.diffuseTexture.vScale = 3;

    // hollow shell: floor, walls with a door gap in front, ceiling — walk inside!
    const inMat = mat(scene, "hhInMat", C3(0.2, 0.15, 0.26), { tex: TEX.brick(scene, "dark") });
    inMat.diffuseTexture.uScale = 4; inMat.diffuseTexture.vScale = 2;
    const interiorMeshes = [];

    function hhWall(name, w, h, d, x, y, z, m) {
      const wall = BABYLON.MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, scene);
      wall.position.set(x, y, z);
      wall.material = m || hhMat;
      solid(wall);
      wall.freezeWorldMatrix();
      interiorMeshes.push(wall);
      return wall;
    }
    const H = 9, TH = 0.5;
    // floor + ceiling
    const hhFloor = BABYLON.MeshBuilder.CreateGround("hhFloor", { width: 26, height: 18 }, scene);
    hhFloor.position.set(hx, 0.1, hz);
    const hhFloorMat = mat(scene, "hhFloorMat", C3(0.3, 0.28, 0.33), { tex: TEX.planks(scene) });
    hhFloorMat.diffuseTexture.uScale = 6; hhFloorMat.diffuseTexture.vScale = 4;
    hhFloor.material = hhFloorMat;
    hhFloor.freezeWorldMatrix();
    interiorMeshes.push(hhFloor);
    const hhCeil = hhWall("hhCeil", 26, TH, 18, hx, H + 0.25, hz, hhMat);
    // back & side walls
    hhWall("hhWallS", 26, H, TH, hx, H / 2, hz - 9 + TH / 2);
    hhWall("hhWallW", TH, H, 18, hx - 13 + TH / 2, H / 2, hz);
    hhWall("hhWallE", TH, H, 18, hx + 13 - TH / 2, H / 2, hz);
    // front wall with central door gap (3.4 m wide, aligned to the mouth)
    hhWall("hhWallN1", 11.3, H, TH, hx - 1.7 - 11.3 / 2, H / 2, hz + 9 - TH / 2);
    hhWall("hhWallN2", 11.3, H, TH, hx + 1.7 + 11.3 / 2, H / 2, hz + 9 - TH / 2);
    hhWall("hhLintel", 3.4, H - 3.8, TH, hx, 3.8 + (H - 3.8) / 2, hz + 9 - TH / 2);
    // interior partitions — an S-shaped scare corridor
    hhWall("hhPart1", 17, H, 0.35, hx - 13 + 8.5, H / 2, hz + 2.6, inMat);
    hhWall("hhPart2", 17, H, 0.35, hx + 13 - 8.5, H / 2, hz - 3.2, inMat);

    // ---- interior dressing ----
    // coffin leaning on the back wall
    const coffin = BABYLON.MeshBuilder.CreateBox("hhCoffin", { width: 0.9, height: 2.2, depth: 0.45 }, scene);
    coffin.position.set(hx + 8, 1.25, hz - 8.2);
    coffin.rotation.x = -0.18;
    const coffinMat = mat(scene, "hhCoffinMat", C3(0.3, 0.2, 0.12), { tex: TEX.planks(scene) });
    coffin.material = coffinMat;
    solid(coffin); coffin.freezeWorldMatrix();
    interiorMeshes.push(coffin);
    // pairs of glowing eyes in dark corners
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
    // drifting ghost in the back room
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
      // slow patrol along the back corridor, bobbing, always creeping
      const f = (Math.sin(t * 0.32) + 1) / 2;
      ghost.position.set(hx - 8 + f * 16, 1.5 + Math.sin(t * 1.7) * 0.25, hz - 6);
      ghost.rotation.y = Math.sin(t * 0.32) > 0 ? Math.PI / 2 : -Math.PI / 2;
    });
    // interior-only lights (scoped so they don't steal light slots elsewhere)
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
    cart.position.set(hx - 8, 0.55, hz + 11.5); // beside the entrance, not blocking the mouth
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
  // EXTRA BUILDINGS — fill the park like a real one
  // =========================================================
  {
    const metalMat = mat(scene, "xbMetal", C3(0.45, 0.47, 0.5), { tex: metalTex });
    const doorDark = new BABYLON.StandardMaterial("xbDoorDark", scene);
    doorDark.diffuseColor = C3(0.02, 0.02, 0.03);
    doorDark.specularColor = C3(0.3, 0.32, 0.4);
    doorDark.specularPower = 96;

    // Generic solid building with roof, sign, door and windows on the front.
    // rotY: 0 = front faces north(+z); π = faces south; ±π/2 = east/west.
    function building(cfg) {
      const root = new BABYLON.TransformNode("bld_" + cfg.name, scene);
      root.position.set(cfg.x, 0, cfg.z);
      root.rotation.y = cfg.rotY || 0;

      const body = BABYLON.MeshBuilder.CreateBox("bldBody", { width: cfg.w, height: cfg.h, depth: cfg.d }, scene);
      body.position.y = cfg.h / 2;
      // fresh texture per building (cloning DynamicTextures breaks rendering)
      const bm = mat(scene, "bldMat_" + cfg.name, cfg.tint || C3(0.6, 0.6, 0.62), {
        tex: cfg.texFn ? cfg.texFn() : TEX.brick(scene, "light"),
      });
      bm.diffuseTexture.uScale = Math.max(2, Math.round(cfg.w / 4));
      bm.diffuseTexture.vScale = Math.max(1, Math.round(cfg.h / 3));
      body.material = bm;
      body.parent = root;
      solid(body);

      // roof
      if (cfg.roof === "gable") {
        const roof = BABYLON.MeshBuilder.CreateCylinder("bldRoof", { height: cfg.w + 1, diameter: cfg.d * 1.15, tessellation: 3 }, scene);
        roof.rotation.z = Math.PI / 2;
        roof.rotation.y = Math.PI / 2;
        roof.scaling.y = 0.5;
        roof.position.y = cfg.h + (cfg.d * 1.15) / 4 - 0.3;
        roof.material = cfg.roofMat || mat(scene, "gableM_" + cfg.name, C3(0.22, 0.11, 0.12));
        roof.parent = root;
      } else {
        const roof = BABYLON.MeshBuilder.CreateBox("bldRoof", { width: cfg.w + 1, height: 0.35, depth: cfg.d + 1 }, scene);
        roof.position.y = cfg.h + 0.17;
        roof.material = cfg.roofMat || metalMat;
        roof.parent = root;
      }

      const fz = cfg.d / 2 + 0.06;
      // door (dark opening look)
      const door = BABYLON.MeshBuilder.CreatePlane("bldDoor", { width: cfg.doorW || 2.2, height: cfg.doorH || 2.8 }, scene);
      door.position.set(cfg.doorX || 0, (cfg.doorH || 2.8) / 2 + 0.05, fz);
      door.rotation.y = Math.PI;
      door.material = cfg.doorMat || doorDark;
      door.parent = root;
      // windows
      const winMat = cfg.winLit ? cfg.winLitMat : doorDark;
      (cfg.wins || []).forEach((wn, wi) => {
        const wp = BABYLON.MeshBuilder.CreatePlane("bldWin" + wi, { width: wn[2], height: wn[3] }, scene);
        wp.position.set(wn[0], wn[1], fz);
        wp.rotation.y = Math.PI;
        wp.material = winMat;
        wp.parent = root;
      });
      // sign
      if (cfg.sign) {
        const sp = BABYLON.MeshBuilder.CreatePlane("bldSign", { width: Math.min(cfg.w - 1, cfg.sign.length * 1.15 + 2), height: 1.5 }, scene);
        sp.position.set(0, cfg.h - 0.2, fz + 0.05);
        sp.rotation.y = Math.PI;
        sp.rotation.z = (Math.random() - 0.5) * 0.06;
        const st = TEX.sign(scene, cfg.sign, {
          w: 1024, h: 160, bg: cfg.signBg || "#150d0a",
          fg: cfg.signFg || "#ffd98a", glowColor: cfg.signGlow, fontSize: 95,
        });
        const sm = new BABYLON.StandardMaterial("bldSignM_" + cfg.name, scene);
        sm.diffuseTexture = st; sm.emissiveTexture = st;
        sm.emissiveColor = C3(0.95, 0.95, 0.95);
        if (cfg.flickerSign) registerFlicker(sm, C3(1, 1, 1), cfg.flickerSign);
        sp.material = sm;
        sp.parent = root;
      }
      root.getChildMeshes().forEach(m => m.freezeWorldMatrix());
      return root;
    }

    const winWarm = new BABYLON.StandardMaterial("xbWinWarm", scene);
    winWarm.emissiveColor = C3(0.9, 0.55, 0.18);
    winWarm.diffuseColor = C3(0.1, 0.06, 0.02);
    registerFlicker(winWarm, C3(0.9, 0.55, 0.18), "dying");
    const winCold = new BABYLON.StandardMaterial("xbWinCold", scene);
    winCold.emissiveColor = C3(0.35, 0.75, 0.85);
    winCold.diffuseColor = C3(0.02, 0.08, 0.1);
    registerFlicker(winCold, C3(0.35, 0.75, 0.85), "buzz");

    // --- big show theater (west) ---
    building({
      name: "theater", x: -185, z: -5, rotY: Math.PI / 2, // front faces east, toward the drop-tower path
      w: 30, h: 11, d: 20, tint: C3(0.55, 0.35, 0.35), roof: "gable",
      sign: "โรงละครเก้าแก้ว", signGlow: "#d04010", signFg: "#ffb080", flickerSign: "dying",
      doorW: 5, doorH: 3.6,
      wins: [[-9, 5.5, 4, 3], [9, 5.5, 4, 3]],
      winLit: false,
    });
    // torn show posters by the theater door
    for (const px of [-6, 6]) {
      const poster = BABYLON.MeshBuilder.CreatePlane("poster" + px, { width: 1.6, height: 2.2 }, scene);
      poster.position.set(-174.9, 1.8, -5 + px);
      poster.rotation.y = -Math.PI / 2;
      poster.rotation.z = (Math.random() - 0.5) * 0.15;
      const pt = TEX.sign(scene, px < 0 ? "คณะละครสัตว์" : "มายากลผี", { w: 300, h: 420, bg: "#2a1f14", fg: "#c8b088", fontSize: 46 });
      const pm = new BABYLON.StandardMaterial("posterM" + px, scene);
      pm.diffuseTexture = pt; pm.emissiveTexture = pt;
      pm.emissiveColor = C3(0.35, 0.35, 0.35);
      poster.material = pm;
      poster.freezeWorldMatrix();
    }

    // --- mirror house (NW) ---
    const mirrorMat = new BABYLON.StandardMaterial("mirrorMat", scene);
    mirrorMat.diffuseColor = C3(0.2, 0.25, 0.35);
    mirrorMat.specularColor = C3(0.9, 0.95, 1);
    mirrorMat.specularPower = 160;
    mirrorMat.emissiveColor = C3(0.04, 0.06, 0.1);
    building({
      name: "mirror", x: -80, z: 100, rotY: Math.PI, // faces south toward the west path
      w: 14, h: 6, d: 10, texFn: () => TEX.metal(scene), tint: C3(0.5, 0.55, 0.65),
      sign: "บ้านกระจกพิศวง", signGlow: "#3080c0", signFg: "#a0d8ff", flickerSign: "buzz",
      wins: [[-4.5, 2.6, 2.4, 3.4], [4.5, 2.6, 2.4, 3.4]],
      winLit: true, winLitMat: mirrorMat,
    });

    // --- arcade hall (NE) ---
    building({
      name: "arcade", x: 80, z: 100, rotY: Math.PI, // faces south
      w: 16, h: 6.5, d: 12, tint: C3(0.4, 0.4, 0.55),
      sign: "โรงเกมหยอดเหรียญ", signGlow: "#c020c0", signFg: "#ff9aff", flickerSign: "dying",
      wins: [[-5, 2.4, 3.4, 2.2], [5, 2.4, 3.4, 2.2]],
      winLit: true, winLitMat: winCold,
    });

    // --- 4D cinema (SE, near haunted house) ---
    building({
      name: "cinema", x: 115, z: -150, rotY: 0, // faces north toward the shop street
      w: 18, h: 8, d: 14, tint: C3(0.35, 0.3, 0.5),
      sign: "โรงหนังสี่มิติ", signGlow: "#8030d0", signFg: "#c8a0ff", flickerSign: "buzz",
      doorW: 3.6, doorH: 3,
      wins: [[-6, 4.5, 3, 2], [6, 4.5, 3, 2]],
      winLit: false,
    });

    // --- restrooms near the plaza ---
    building({
      name: "wc", x: 30, z: 34, rotY: Math.PI, // faces south toward plaza
      w: 8, h: 3.6, d: 5, tint: C3(0.6, 0.65, 0.6),
      sign: "ห้องน้ำ", signFg: "#c8e0c8",
      wins: [[2.8, 2.6, 1.2, 0.7], [-2.8, 2.6, 1.2, 0.7]],
      winLit: true, winLitMat: winWarm,
    });

    // --- info office by the gate ---
    building({
      name: "info", x: 16, z: -232, rotY: 0, // faces north, toward incoming visitors
      w: 6, h: 3.4, d: 4, tint: C3(0.5, 0.45, 0.55),
      sign: "ประชาสัมพันธ์", signFg: "#d8c8a8",
      wins: [[0, 2.2, 3, 0.9]],
      winLit: true, winLitMat: winWarm,
    });

    // --- maintenance warehouse (far SW, ominous) ---
    building({
      name: "depot", x: -200, z: -160, rotY: Math.PI / 2, // faces east
      w: 24, h: 8, d: 16, texFn: () => TEX.metal(scene), tint: C3(0.35, 0.36, 0.32),
      sign: "โรงซ่อมบำรุง", signFg: "#9aa88a", flickerSign: "dying",
      doorW: 6, doorH: 4.5,
      wins: [[-8, 5.5, 3, 1.6], [8, 5.5, 3, 1.6]],
      winLit: false,
    });

    // --- food court pavilion (SE of plaza) ---
    {
      const fx = 130, fz = -70;
      const roof = BABYLON.MeshBuilder.CreateBox("fcRoof", { width: 22, height: 0.35, depth: 16 }, scene);
      roof.position.set(fx, 4.6, fz);
      roof.material = mat(scene, "fcRoofM", C3(0.5, 0.25, 0.22), { tex: metalTex });
      roof.freezeWorldMatrix();
      for (const cx of [-9, 0, 9]) {
        for (const cz of [-6.5, 6.5]) {
          const col = BABYLON.MeshBuilder.CreateCylinder("fcCol", { height: 4.6, diameter: 0.35, tessellation: 8 }, scene);
          col.position.set(fx + cx, 2.3, fz + cz);
          col.material = metalMat;
          col.checkCollisions = true;
          col.freezeWorldMatrix();
        }
      }
      // tables + stools (some knocked over)
      const tableMat = mat(scene, "fcTableM", C3(0.5, 0.42, 0.3), { tex: TEX.planks(scene) });
      for (let ti = 0; ti < 6; ti++) {
        const tx2 = fx - 7 + (ti % 3) * 7, tz2 = fz - 3.5 + Math.floor(ti / 3) * 7;
        const table = BABYLON.MeshBuilder.CreateCylinder("fcTable" + ti, { height: 0.08, diameter: 1.7, tessellation: 12 }, scene);
        table.position.set(tx2, 0.85, tz2);
        table.material = tableMat;
        const tleg = BABYLON.MeshBuilder.CreateCylinder("fcTLeg" + ti, { height: 0.85, diameter: 0.12 }, scene);
        tleg.position.set(tx2, 0.42, tz2);
        tleg.material = metalMat;
        table.freezeWorldMatrix(); tleg.freezeWorldMatrix();
        for (let si = 0; si < 3; si++) {
          const sa = (si / 3) * Math.PI * 2 + ti;
          const stool = BABYLON.MeshBuilder.CreateCylinder("fcStool", { height: 0.5, diameter: 0.4, tessellation: 8 }, scene);
          if (ti === 2 && si === 1) { // tipped stool
            stool.position.set(tx2 + Math.cos(sa) * 1.5, 0.2, tz2 + Math.sin(sa) * 1.5);
            stool.rotation.z = Math.PI / 2;
          } else {
            stool.position.set(tx2 + Math.cos(sa) * 1.3, 0.25, tz2 + Math.sin(sa) * 1.3);
          }
          stool.material = tableMat;
          stool.freezeWorldMatrix();
        }
      }
      const fcSign = BABYLON.MeshBuilder.CreatePlane("fcSign", { width: 9, height: 1.4 }, scene);
      fcSign.position.set(fx - 11.3, 3.6, fz);
      fcSign.rotation.y = Math.PI / 2; // readable from the west (plaza side)
      const fcTex = TEX.sign(scene, "ศูนย์อาหารเก้าแก้ว", { w: 1024, h: 160, bg: "#141008", fg: "#ffd98a", glowColor: "#c07010", fontSize: 92 });
      const fcSM = new BABYLON.StandardMaterial("fcSignM", scene);
      fcSM.diffuseTexture = fcTex; fcSM.emissiveTexture = fcTex;
      fcSM.emissiveColor = C3(1, 1, 1);
      fcSM.backFaceCulling = false;
      registerFlicker(fcSM, C3(1, 1, 1), "buzz");
      fcSign.material = fcSM;
      fcSign.freezeWorldMatrix();
    }

    // --- carnival game booths (SW lawn) ---
    {
      const booths = [
        { name: "ปาเป้าลูกโป่ง", x: -50, z: -145, c: "#7a2f2f" },
        { name: "สอยดาวนำโชค", x: -72, z: -145, c: "#2f5a7a" },
        { name: "ตักปลาทองผี", x: -94, z: -145, c: "#5a7a2f" },
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
        // prize shelf with little boxes
        for (let pi = 0; pi < 5; pi++) {
          const prize = BABYLON.MeshBuilder.CreateBox("gbPrize", { size: 0.45 }, scene);
          prize.position.set(b.x - 2.4 + pi * 1.2, 2.4, b.z - 2.2);
          prize.rotation.y = pi * 0.9;
          prize.material = mat(scene, "gbPrizeM" + (pi % 3), [C3(0.6, 0.2, 0.2), C3(0.2, 0.4, 0.6), C3(0.6, 0.5, 0.2)][pi % 3]);
          prize.freezeWorldMatrix();
        }
        const gbSign = BABYLON.MeshBuilder.CreatePlane("gbSign" + bi, { width: 6.5, height: 1.05 }, scene);
        gbSign.position.set(b.x, 3.1, b.z + 3.06);
        gbSign.rotation.y = Math.PI; // booths face north toward the shop street
        const gbTex = TEX.sign(scene, b.name, { w: 1024, h: 170, bg: "#191008", fg: "#e8cf9a", fontSize: 92 });
        const gbSM = new BABYLON.StandardMaterial("gbSignM" + bi, scene);
        gbSM.diffuseTexture = gbTex; gbSM.emissiveTexture = gbTex;
        gbSM.emissiveColor = C3(0.55, 0.55, 0.55);
        gbSign.material = gbSM;
        gbSign.freezeWorldMatrix();
      });
    }

    // --- snack kiosks along the spoke paths ---
    {
      const kiosks = [
        // north of a spoke path -> face south (rot π); south of it -> face north (rot 0)
        { x: 40, z: 9, rot: Math.PI, name: "น้ำอัดลม" },
        { x: 60, z: -9, rot: 0, name: "ไอศกรีมโบราณ" },
        { x: -45, z: 9, rot: Math.PI, name: "ข้าวโพดคั่ว" },
        { x: 8, z: 55, rot: -Math.PI / 2, name: "น้ำปั่นเฮี้ยน" }, // east of north path -> face west
        { x: 95, z: 9, rot: Math.PI, name: "ห่วงยางเช่า" },
      ];
      kiosks.forEach((k, ki) => {
        const kr = new BABYLON.TransformNode("kiosk" + ki, scene);
        kr.position.set(k.x, 0, k.z);
        kr.rotation.y = k.rot;
        const kb = BABYLON.MeshBuilder.CreateBox("kioskB" + ki, { width: 2.6, height: 2.3, depth: 2 }, scene);
        kb.position.y = 1.15;
        const km = mat(scene, "kioskM" + ki, C3(0.5, 0.45, 0.42), { tex: plankTex });
        kb.material = km;
        kb.parent = kr;
        solid(kb);
        const kroof = BABYLON.MeshBuilder.CreateCylinder("kioskR" + ki, { height: 1.1, diameterBottom: 3.6, diameterTop: 0.15, tessellation: 8 }, scene);
        kroof.position.y = 2.95;
        const krm = new BABYLON.StandardMaterial("kioskRM" + ki, scene);
        krm.diffuseTexture = TEX.stripes(scene, ["#8a2f2f", "#2f6a8a", "#8a6f2f", "#5c2f8a", "#2f8a5c"][ki], "#d8cfc0", "kiosk" + ki);
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
