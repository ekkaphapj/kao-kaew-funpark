// ============================================================
// landmarks.js — castle, circus, swamp lake, graveyard,
// secret tunnel, parking lot, perimeter wall, avenue flags
// ============================================================
"use strict";

function buildLandmarks(scene) {
  const C3 = (r, g, b) => new BABYLON.Color3(r, g, b);

  // shared soft ground-fog texture
  const fogTex = (() => {
    const size = 256;
    const dt = new BABYLON.DynamicTexture("texFog", { width: size, height: size }, scene, true);
    dt.hasAlpha = true;
    const ctx = dt.getContext();
    ctx.clearRect(0, 0, size, size);
    for (let i = 0; i < 26; i++) {
      const x = Math.random() * size, y = Math.random() * size, r = 22 + Math.random() * 46;
      const g = ctx.createRadialGradient(x, y, 2, x, y, r);
      g.addColorStop(0, "rgba(190,205,200,0.16)");
      g.addColorStop(1, "rgba(190,205,200,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    // fade the sheet out toward its edges so fog planes have no hard border
    const fade = ctx.createRadialGradient(size / 2, size / 2, size * 0.28, size / 2, size / 2, size * 0.5);
    fade.addColorStop(0, "rgba(0,0,0,0)");
    fade.addColorStop(1, "rgba(0,0,0,1)");
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = fade;
    ctx.fillRect(0, 0, size, size);
    ctx.globalCompositeOperation = "source-over";
    dt.update();
    dt.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
    dt.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
    return dt;
  })();

  function groundFog(name, x, z, w, d, speed) {
    const p = BABYLON.MeshBuilder.CreateGround(name, { width: w, height: d }, scene);
    p.position.set(x, 0.55 + Math.random() * 0.4, z);
    const m = new BABYLON.StandardMaterial(name + "M", scene);
    m.diffuseTexture = fogTex;
    m.opacityTexture = fogTex;
    m.emissiveColor = C3(0.5, 0.56, 0.55);
    m.disableLighting = true;
    m.alpha = 0.34;
    m.backFaceCulling = false;
    p.material = m;
    p.isPickable = false;
    PARK.updaters.push((dt, t) => {
      fogTex.uOffset = t * 0.004;
      p.position.y = 0.7 + Math.sin(t * 0.3 + x) * 0.15;
    });
    return p;
  }

  // wandering ghost wisp (pale glowing orb)
  function wisp(x, z, radius, hue) {
    const orb = BABYLON.MeshBuilder.CreateSphere("wisp", { diameter: 0.34, segments: 8 }, scene);
    const m = new BABYLON.StandardMaterial("wispM", scene);
    m.emissiveColor = hue || C3(0.5, 0.95, 0.6);
    m.disableLighting = true;
    m.alpha = 0.8;
    orb.material = m;
    orb.isPickable = false;
    const seed = Math.random() * 20;
    PARK.updaters.push((dt, t) => {
      orb.position.set(
        x + Math.sin(t * 0.23 + seed) * radius,
        1.1 + Math.sin(t * 0.9 + seed * 2) * 0.6,
        z + Math.cos(t * 0.31 + seed) * radius * 0.7
      );
      m.alpha = 0.45 + 0.35 * Math.sin(t * 1.3 + seed);
    });
  }

  // =========================================================
  // HAUNTED CASTLE — the main landmark (inside the coaster loop)
  // =========================================================
  {
    const cx = 0, cz = 184;
    const stoneMat = mat(scene, "castleStone", C3(0.34, 0.3, 0.42), { tex: TEX.brick(scene, "dark") });
    stoneMat.diffuseTexture.uScale = 8; stoneMat.diffuseTexture.vScale = 4;
    const roofMat = mat(scene, "castleRoof", C3(0.16, 0.08, 0.22));
    const castleMeshes = [];

    function cbox(name, w, h, d, x, y, z) {
      const b = BABYLON.MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, scene);
      b.position.set(x, y, z);
      b.material = stoneMat;
      b.checkCollisions = true;
      PARK.colliders.push(b);
      b.freezeWorldMatrix();
      castleMeshes.push(b);
      return b;
    }
    // main block + tall keep
    cbox("caMain", 30, 13, 16, cx, 6.5, cz);
    cbox("caKeep", 12, 22, 12, cx, 11, cz);
    const spire = BABYLON.MeshBuilder.CreateCylinder("caSpire", { height: 9, diameterBottom: 10, diameterTop: 0.2, tessellation: 8 }, scene);
    spire.position.set(cx, 26.5, cz);
    spire.material = roofMat;
    spire.freezeWorldMatrix();
    // corner towers
    for (const [tx, tz] of [[-16, -10], [16, -10], [-16, 10], [16, 10]]) {
      const tw = BABYLON.MeshBuilder.CreateCylinder("caTower", { height: 20, diameter: 7, tessellation: 10 }, scene);
      tw.position.set(cx + tx, 10, cz + tz);
      tw.material = stoneMat;
      tw.checkCollisions = true;
      PARK.colliders.push(tw);
      tw.freezeWorldMatrix();
      castleMeshes.push(tw);
      const cone = BABYLON.MeshBuilder.CreateCylinder("caTowerCone", { height: 7, diameterBottom: 8.4, diameterTop: 0.15, tessellation: 10 }, scene);
      cone.position.set(cx + tx, 23.5, cz + tz);
      cone.material = roofMat;
      cone.freezeWorldMatrix();
    }
    // battlements along the front & back rooflines
    const crenSrc = BABYLON.MeshBuilder.CreateBox("caCren", { width: 1.2, height: 1.1, depth: 0.8 }, scene);
    crenSrc.material = stoneMat;
    crenSrc.position.set(0, -70, 0);
    for (let i = -6; i <= 6; i++) {
      for (const fz of [-8.2, 8.2]) {
        const c = crenSrc.createInstance("cren");
        c.position.set(cx + i * 2.3, 13.6, cz + fz);
        c.freezeWorldMatrix();
      }
    }
    // glowing purple windows (two flicker groups)
    const winMatA = new BABYLON.StandardMaterial("caWinA", scene);
    winMatA.emissiveColor = C3(0.62, 0.3, 0.95);
    winMatA.diffuseColor = C3(0.06, 0.02, 0.1);
    registerFlicker(winMatA, C3(0.62, 0.3, 0.95), "pulse");
    const winMatB = winMatA.clone("caWinB");
    registerFlicker(winMatB, C3(0.5, 0.22, 0.85), "dying");
    const winSrcA = BABYLON.MeshBuilder.CreatePlane("caWinSrcA", { width: 0.9, height: 1.7 }, scene);
    winSrcA.material = winMatA;
    winSrcA.position.set(0, -70, 0);
    // default plane faces -Z: visible from the south, where visitors stand
    const winSrcB = winSrcA.clone("caWinSrcB");
    winSrcB.material = winMatB;
    const winSpots = [];
    for (const wx of [-12, -8, -4, 4, 8, 12]) winSpots.push([wx, 5, -8.06], [wx, 9.5, -8.06]);
    for (const wx of [-3, 3]) winSpots.push([wx, 15, -6.06], [wx, 19, -6.06]);
    winSpots.push([-16, 8, -13.56], [16, 8, -13.56], [-16, 14, -13.56], [16, 14, -13.56]);
    winSpots.forEach((s, i) => {
      const src = i % 3 === 0 ? winSrcB : winSrcA;
      const w = src.createInstance("caWin" + i);
      w.position.set(cx + s[0], s[1], cz + s[2]);
      w.freezeWorldMatrix();
    });
    // gate: black arch entrance + lanterns + steps
    const gateDark = BABYLON.MeshBuilder.CreatePlane("caGate", { width: 4.2, height: 5 }, scene);
    gateDark.position.set(cx, 2.55, cz - 8.06);
    const gdM = new BABYLON.StandardMaterial("caGateM", scene);
    gdM.diffuseColor = C3(0.01, 0.01, 0.02);
    gdM.emissiveColor = C3(0.03, 0.01, 0.05);
    gateDark.material = gdM;
    gateDark.freezeWorldMatrix();
    const arch = BABYLON.MeshBuilder.CreateTorus("caArch", { diameter: 5, thickness: 0.7, tessellation: 20 }, scene);
    arch.position.set(cx, 5, cz - 8.1);
    arch.rotation.x = Math.PI / 2;
    arch.material = stoneMat;
    arch.freezeWorldMatrix();
    const lantMat = new BABYLON.StandardMaterial("caLant", scene);
    lantMat.emissiveColor = C3(1, 0.6, 0.25);
    lantMat.diffuseColor = C3(0.15, 0.08, 0.02);
    registerFlicker(lantMat, C3(1, 0.6, 0.25), "buzz");
    for (const lx of [-3.2, 3.2]) {
      const lant = BABYLON.MeshBuilder.CreateSphere("caLantS", { diameter: 0.5, segments: 6 }, scene);
      lant.position.set(cx + lx, 4.2, cz - 8.35);
      lant.material = lantMat;
      lant.freezeWorldMatrix();
    }
    for (let s = 0; s < 3; s++) {
      const step = BABYLON.MeshBuilder.CreateBox("caStep" + s, { width: 6 - s, height: 0.25, depth: 1.1 }, scene);
      step.position.set(cx, 0.13 + s * 0.25, cz - 9.6 + s * 0.55);
      step.material = stoneMat;
      step.freezeWorldMatrix();
      castleMeshes.push(step);
    }
    // sign + scoped purple floodlight + forecourt
    const caSign = BABYLON.MeshBuilder.CreatePlane("caSignP", { width: 9, height: 1.5 }, scene);
    caSign.position.set(cx, 8.4, cz - 8.15);
    const caTex = TEX.sign(scene, "ปราสาทเก้าแก้ว", { w: 1024, h: 170, bg: "#0d0714", fg: "#c99aff", glowColor: "#8020d0", fontSize: 100 });
    const caSM = new BABYLON.StandardMaterial("caSignM2", scene);
    caSM.diffuseTexture = caTex; caSM.emissiveTexture = caTex;
    caSM.emissiveColor = C3(1, 1, 1);
    registerFlicker(caSM, C3(1, 1, 1), "dying");
    caSign.material = caSM;
    caSign.freezeWorldMatrix();

    const fore = BABYLON.MeshBuilder.CreateDisc("caFore", { radius: 12, tessellation: 32 }, scene);
    fore.rotation.x = Math.PI / 2;
    fore.position.set(cx, 0.07, cz - 20);
    const foreM = mat(scene, "caForeM", C3(0.65, 0.65, 0.72), { tex: TEX.pavement(scene) });
    foreM.diffuseTexture.uScale = 6; foreM.diffuseTexture.vScale = 6;
    fore.material = foreM;
    fore.freezeWorldMatrix();
    castleMeshes.push(fore);

    const caLight = new BABYLON.PointLight("plCastle", new BABYLON.Vector3(cx, 9, cz - 16), scene);
    caLight.diffuse = C3(0.6, 0.3, 1);
    caLight.intensity = 2.4;
    caLight.range = 55;
    caLight.includedOnlyMeshes = castleMeshes;
    groundFog("caFog", cx, cz - 18, 44, 26, 1);
    // tattered flag on the spire
    const flag = BABYLON.MeshBuilder.CreatePlane("caFlag", { width: 2.2, height: 1.2 }, scene);
    flag.position.set(cx + 1.1, 31.6, cz);
    const flagM = new BABYLON.StandardMaterial("caFlagM", scene);
    flagM.diffuseColor = C3(0.35, 0.08, 0.1);
    flagM.emissiveColor = C3(0.1, 0.02, 0.03);
    flagM.backFaceCulling = false;
    flag.material = flagM;
    const pole = BABYLON.MeshBuilder.CreateCylinder("caPole", { height: 3, diameter: 0.1 }, scene);
    pole.position.set(cx, 31.5, cz);
    pole.material = stoneMat;
    pole.freezeWorldMatrix();
    PARK.updaters.push((dt, t) => { flag.rotation.y = Math.sin(t * 2.2) * 0.28; });
  }

  // =========================================================
  // CREEPY CIRCUS TENT  (x=105, z=-112)
  // =========================================================
  {
    const tx = 105, tz = -112, R = 13;
    const tentWallM = new BABYLON.StandardMaterial("tentWallM", scene);
    tentWallM.diffuseTexture = TEX.stripes(scene, "#6e1d26", "#b8ab92", "tent");
    tentWallM.diffuseTexture.uScale = 8;
    tentWallM.diffuseColor = C3(0.62, 0.58, 0.55);
    tentWallM.specularColor = C3(0.03, 0.03, 0.03);
    const wall = BABYLON.MeshBuilder.CreateCylinder("tentWall", { height: 4.5, diameter: R * 2, tessellation: 24 }, scene);
    wall.position.set(tx, 2.25, tz);
    wall.material = tentWallM;
    wall.checkCollisions = true;
    PARK.colliders.push(wall);
    wall.freezeWorldMatrix();
    const roofM = new BABYLON.StandardMaterial("tentRoofM", scene);
    roofM.diffuseTexture = TEX.stripes(scene, "#5e1820", "#a89a82", "tentRoof");
    roofM.diffuseTexture.uScale = 10;
    roofM.diffuseColor = C3(0.6, 0.56, 0.52);
    roofM.specularColor = C3(0.03, 0.03, 0.03);
    const roof = BABYLON.MeshBuilder.CreateCylinder("tentRoof", { height: 9, diameterBottom: R * 2 + 3, diameterTop: 0.4, tessellation: 24 }, scene);
    roof.position.set(tx, 9, tz);
    roof.material = roofM;
    roof.freezeWorldMatrix();
    // top pole + waving pennant
    const tpole = BABYLON.MeshBuilder.CreateCylinder("tentPole", { height: 3.4, diameter: 0.12 }, scene);
    tpole.position.set(tx, 15, tz);
    tpole.material = mat(scene, "tentPoleM", C3(0.2, 0.2, 0.22));
    tpole.freezeWorldMatrix();
    const pen = BABYLON.MeshBuilder.CreatePlane("tentPen", { width: 1.6, height: 0.75 }, scene);
    pen.position.set(tx + 0.8, 16.2, tz);
    const penM = new BABYLON.StandardMaterial("tentPenM", scene);
    penM.diffuseColor = C3(0.55, 0.12, 0.15);
    penM.emissiveColor = C3(0.16, 0.03, 0.04);
    penM.backFaceCulling = false;
    pen.material = penM;
    PARK.updaters.push((dt, t) => { pen.rotation.y = Math.sin(t * 2.6) * 0.35; });
    // dark entrance flap facing the west aisle + sign + bulbs
    const flap = BABYLON.MeshBuilder.CreatePlane("tentFlap", { width: 3, height: 3.8 }, scene);
    flap.position.set(tx - R - 0.06, 1.9, tz);
    flap.rotation.y = Math.PI / 2; // visible from the west
    const flapM = new BABYLON.StandardMaterial("tentFlapM", scene);
    flapM.diffuseColor = C3(0.01, 0.01, 0.015);
    flapM.emissiveColor = C3(0.02, 0.01, 0.02);
    flapM.backFaceCulling = false;
    flap.material = flapM;
    flap.freezeWorldMatrix();
    const tSign = BABYLON.MeshBuilder.CreatePlane("tentSign", { width: 8, height: 1.3 }, scene);
    tSign.position.set(tx - R - 0.4, 5.2, tz);
    tSign.rotation.y = Math.PI / 2;
    const tTex = TEX.sign(scene, "ละครสัตว์มรณะ", { w: 1024, h: 160, bg: "#170808", fg: "#ff8a6a", glowColor: "#c03010", fontSize: 96 });
    const tSM = new BABYLON.StandardMaterial("tentSignM", scene);
    tSM.diffuseTexture = tTex; tSM.emissiveTexture = tTex;
    tSM.emissiveColor = C3(1, 1, 1);
    tSM.backFaceCulling = false;
    registerFlicker(tSM, C3(1, 1, 1), "buzz");
    tSign.material = tSM;
    tSign.freezeWorldMatrix();
    const tbMat = new BABYLON.StandardMaterial("tentBulbM", scene);
    tbMat.emissiveColor = C3(1, 0.7, 0.3);
    tbMat.diffuseColor = C3(0.15, 0.1, 0.03);
    registerFlicker(tbMat, C3(1, 0.7, 0.3), "dying");
    const tbSrc = BABYLON.MeshBuilder.CreateSphere("tentBulbSrc", { diameter: 0.3, segments: 5 }, scene);
    tbSrc.material = tbMat;
    tbSrc.position.set(0, -70, 0);
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      const b = tbSrc.createInstance("tentBulb");
      b.position.set(tx + Math.cos(a) * (R + 1.4), 4.6, tz + Math.sin(a) * (R + 1.4));
      b.freezeWorldMatrix();
    }
  }

  // =========================================================
  // SWAMP LAKE  (x=155, z=135) + lazy river in the water park
  // =========================================================
  {
    const lx = 155, lz = 135;
    const mud = BABYLON.MeshBuilder.CreateDisc("lakeMud", { radius: 38, tessellation: 40 }, scene);
    mud.rotation.x = Math.PI / 2;
    mud.scaling.z = 0.78;
    mud.position.set(lx, 0.05, lz);
    mud.material = mat(scene, "lakeMudM", C3(0.2, 0.17, 0.12));
    mud.freezeWorldMatrix();
    const water = BABYLON.MeshBuilder.CreateDisc("lakeWater", { radius: 35, tessellation: 40 }, scene);
    water.rotation.x = Math.PI / 2;
    water.scaling.z = 0.78;
    water.position.set(lx, 0.12, lz);
    const wM = new BABYLON.StandardMaterial("lakeWaterM", scene);
    wM.diffuseTexture = TEX.waterNoise(scene);
    wM.diffuseColor = C3(0.25, 0.4, 0.32);
    wM.emissiveColor = C3(0.015, 0.05, 0.035);
    wM.specularColor = C3(0.4, 0.5, 0.45);
    wM.specularPower = 96;
    wM.alpha = 0.88;
    water.material = wM;
    water.freezeWorldMatrix();
    PARK.updaters.push((dt, t) => {
      wM.diffuseTexture.uOffset = t * 0.005;
      wM.diffuseTexture.vOffset = Math.sin(t * 0.08) * 0.15;
    });
    // reeds around the shore
    const reedM = mat(scene, "reedM", C3(0.16, 0.2, 0.1));
    const reedSrc = BABYLON.MeshBuilder.CreateCylinder("reedSrc", { height: 1.7, diameterBottom: 0.05, diameterTop: 0.01, tessellation: 4 }, scene);
    reedSrc.material = reedM;
    reedSrc.position.set(0, -70, 0);
    for (let i = 0; i < 60; i++) {
      const a = Math.random() * Math.PI * 2;
      const rr = 33 + Math.random() * 5;
      const r = reedSrc.createInstance("reed");
      r.position.set(lx + Math.cos(a) * rr, 0.8, lz + Math.sin(a) * rr * 0.78);
      r.rotation.z = (Math.random() - 0.5) * 0.35;
      r.rotation.x = (Math.random() - 0.5) * 0.35;
      r.freezeWorldMatrix();
    }
    // rickety dock + half-sunken rowboat
    const dockM = mat(scene, "dockM", C3(0.5, 0.42, 0.32), { tex: TEX.planks(scene) });
    const dock = BABYLON.MeshBuilder.CreateBox("dock", { width: 2.2, height: 0.15, depth: 9 }, scene);
    dock.position.set(lx - 30, 0.55, lz - 6);
    dock.rotation.y = 0.5;
    dock.rotation.z = 0.04;
    dock.material = dockM;
    dock.checkCollisions = true;
    dock.freezeWorldMatrix();
    for (let i = 0; i < 4; i++) {
      const leg = BABYLON.MeshBuilder.CreateCylinder("dockLeg", { height: 1.1, diameter: 0.16 }, scene);
      leg.position.set(lx - 31.5 + (i % 2) * 1.8 + Math.floor(i / 2) * 2.6, 0.28, lz - 8.5 + Math.floor(i / 2) * 4);
      leg.material = dockM;
      leg.freezeWorldMatrix();
    }
    const boat = BABYLON.MeshBuilder.CreateBox("boat", { width: 1.4, height: 0.5, depth: 3.2 }, scene);
    boat.position.set(lx - 12, 0.12, lz + 8);
    boat.rotation.set(0.14, 0.8, -0.18);
    boat.material = dockM;
    boat.freezeWorldMatrix();
    // dead trees + fog + wisps
    const deadSrc = scene.getMeshByName("deadSrc");
    if (deadSrc) {
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 + 0.4;
        const d = deadSrc.createInstance("lakeDead" + i);
        const s = 0.8 + Math.random() * 0.6;
        d.position.set(lx + Math.cos(a) * 41, 3.25 * s, lz + Math.sin(a) * 33);
        d.scaling.setAll(s);
        d.rotation.y = Math.random() * 6;
        d.freezeWorldMatrix();
      }
    }
    groundFog("lakeFog1", lx - 10, lz - 5, 70, 45, 1);
    groundFog("lakeFog2", lx + 15, lz + 12, 55, 35, 1);
    wisp(lx - 8, lz - 14, 9, C3(0.45, 0.9, 0.75));
    wisp(lx + 14, lz + 6, 11, C3(0.5, 0.85, 0.95));
    // warning sign by the shore
    const wSign = BABYLON.MeshBuilder.CreatePlane("lakeSign", { width: 2.4, height: 0.8 }, scene);
    wSign.position.set(lx - 33, 1.5, lz - 14);
    wSign.rotation.y = Math.PI + 0.5;
    const wTex = TEX.sign(scene, "ห้ามลงเล่นน้ำ", { w: 512, h: 128, bg: "#1a1408", fg: "#e8b060", fontSize: 62 });
    const wSM = new BABYLON.StandardMaterial("lakeSignM", scene);
    wSM.diffuseTexture = wTex; wSM.emissiveTexture = wTex;
    wSM.emissiveColor = C3(0.5, 0.5, 0.5);
    wSign.material = wSM;
    const wPost = BABYLON.MeshBuilder.CreateCylinder("lakeSignPost", { height: 1.5, diameter: 0.1 }, scene);
    wPost.position.set(lx - 33, 0.75, lz - 14);
    wPost.material = dockM;
    wSign.freezeWorldMatrix(); wPost.freezeWorldMatrix();

    // lazy river ring around the water-slide tower
    const lr = BABYLON.MeshBuilder.CreateTorus("lazyRiver", { diameter: 42, thickness: 5, tessellation: 40 }, scene);
    lr.position.set(148, 0.32, 52);
    lr.scaling.y = 0.06;
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
    const lrEdge = BABYLON.MeshBuilder.CreateTorus("lazyEdge", { diameter: 47.5, thickness: 1.2, tessellation: 40 }, scene);
    lrEdge.position.set(148, 0.3, 52);
    lrEdge.scaling.y = 0.3;
    lrEdge.material = mat(scene, "lazyEdgeM", C3(0.55, 0.56, 0.6));
    lrEdge.freezeWorldMatrix();
    // drifting inner tube
    const tube = BABYLON.MeshBuilder.CreateTorus("innerTube", { diameter: 1.1, thickness: 0.3, tessellation: 14 }, scene);
    const tubeM = new BABYLON.StandardMaterial("innerTubeM", scene);
    tubeM.diffuseColor = C3(0.7, 0.6, 0.1);
    tube.material = tubeM;
    PARK.updaters.push((dt, t) => {
      const a = t * 0.13;
      tube.position.set(148 + Math.cos(a) * 21, 0.45, 52 + Math.sin(a) * 21);
    });
  }

  // =========================================================
  // GRAVEYARD (fog zone, x 205..245, z -120..-40)
  // =========================================================
  {
    const gx = 225, gz = -80;
    const stoneM = mat(scene, "graveStone", C3(0.42, 0.44, 0.46));
    // three tombstone shapes (buried sources)
    const slab = BABYLON.MeshBuilder.CreateBox("tsSlab", { width: 0.75, height: 1.05, depth: 0.16 }, scene);
    const slabTop = BABYLON.MeshBuilder.CreateCylinder("tsSlabTop", { height: 0.16, diameter: 0.75, tessellation: 12 }, scene);
    slabTop.rotation.x = Math.PI / 2;
    slabTop.position.y = 0.52;
    const srcA = BABYLON.Mesh.MergeMeshes([slab, slabTop], true, true, undefined, false, false);
    srcA.material = stoneM;
    srcA.name = "tombA";
    srcA.position.set(0, -70, 0);
    const cv = BABYLON.MeshBuilder.CreateBox("tsCrossV", { width: 0.18, height: 1.3, depth: 0.14 }, scene);
    const ch = BABYLON.MeshBuilder.CreateBox("tsCrossH", { width: 0.7, height: 0.16, depth: 0.14 }, scene);
    ch.position.y = 0.32;
    const srcB = BABYLON.Mesh.MergeMeshes([cv, ch], true, true, undefined, false, false);
    srcB.material = stoneM;
    srcB.name = "tombB";
    srcB.position.set(0, -70, 0);
    const srcC = BABYLON.MeshBuilder.CreateCylinder("tombC", { height: 1.5, diameterBottom: 0.5, diameterTop: 0.22, tessellation: 6 }, scene);
    srcC.material = stoneM;
    srcC.position.set(0, -70, 0);
    const srcs = [srcA, srcB, srcC];
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 7; col++) {
        if (Math.random() < 0.22) continue; // missing graves
        const t = srcs[Math.floor(Math.random() * 3)].createInstance("tomb");
        t.position.set(
          208 + col * 5 + (Math.random() - 0.5) * 1.6,
          0.55,
          -114 + row * 7.6 + (Math.random() - 0.5) * 2
        );
        t.rotation.set((Math.random() - 0.5) * 0.22, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.24);
        t.freezeWorldMatrix();
      }
    }
    // mausoleum
    const mau = BABYLON.MeshBuilder.CreateBox("mausoleum", { width: 5.5, height: 3.6, depth: 4.2 }, scene);
    mau.position.set(240, 1.8, -48);
    const mauM = mat(scene, "mauM", C3(0.4, 0.42, 0.46), { tex: TEX.brick(scene, "dark") });
    mauM.diffuseColor = C3(0.45, 0.47, 0.52);
    mau.material = mauM;
    mau.checkCollisions = true;
    PARK.colliders.push(mau);
    mau.freezeWorldMatrix();
    const mauRoof = BABYLON.MeshBuilder.CreateCylinder("mauRoof", { height: 6, diameter: 5, tessellation: 3 }, scene);
    mauRoof.rotation.z = Math.PI / 2;
    mauRoof.rotation.y = Math.PI / 2;
    mauRoof.scaling.y = 0.45;
    mauRoof.position.set(240, 4.2, -48);
    mauRoof.material = stoneM;
    mauRoof.freezeWorldMatrix();
    const mauDoor = BABYLON.MeshBuilder.CreatePlane("mauDoor", { width: 1.4, height: 2.2 }, scene);
    mauDoor.position.set(237.2, 1.15, -48);
    mauDoor.rotation.y = Math.PI / 2;
    const mauDoorM = new BABYLON.StandardMaterial("mauDoorM", scene);
    mauDoorM.diffuseColor = C3(0.01, 0.012, 0.01);
    mauDoorM.emissiveColor = C3(0.015, 0.04, 0.02);
    registerFlicker(mauDoorM, C3(0.02, 0.06, 0.03), "pulse");
    mauDoor.material = mauDoorM;
    mauDoor.freezeWorldMatrix();
    // iron fence + gate arch on the west side
    const gfM = mat(scene, "graveFenceM", C3(0.12, 0.12, 0.14));
    const gpSrc = BABYLON.MeshBuilder.CreateBox("gravePost", { width: 0.12, height: 1.6, depth: 0.12 }, scene);
    gpSrc.material = gfM;
    gpSrc.position.set(0, -70, 0);
    const per = [];
    for (let x = 205; x <= 245; x += 4) { per.push([x, -122]); per.push([x, -38]); }
    for (let z = -122; z <= -38; z += 4) { per.push([205, z]); per.push([245, z]); }
    for (const p of per) {
      if (p[0] === 205 && p[1] > -84 && p[1] < -76) continue; // gate gap
      const g = gpSrc.createInstance("gp");
      g.position.set(p[0], 0.8, p[1]);
      g.freezeWorldMatrix();
    }
    for (const seg of [[225, -122, 40, 0], [225, -38, 40, 0], [205, -103, 38, Math.PI / 2], [205, -57, 38, Math.PI / 2], [245, -80, 84, Math.PI / 2]]) {
      const rail = BABYLON.MeshBuilder.CreateBox("graveRail", { width: seg[2], height: 0.07, depth: 0.07 }, scene);
      rail.position.set(seg[0], 1.45, seg[1]);
      rail.rotation.y = seg[3];
      rail.material = gfM;
      rail.checkCollisions = true;
      rail.freezeWorldMatrix();
    }
    // gate arch + sign
    for (const dz of [-4, 4]) {
      const gp = BABYLON.MeshBuilder.CreateBox("graveGateP", { width: 0.5, height: 3.2, depth: 0.5 }, scene);
      gp.position.set(205, 1.6, -80 + dz);
      gp.material = stoneM;
      gp.checkCollisions = true;
      gp.freezeWorldMatrix();
    }
    const gArch = BABYLON.MeshBuilder.CreateBox("graveGateArch", { width: 0.4, height: 0.7, depth: 8.6 }, scene);
    gArch.position.set(205, 3.4, -80);
    gArch.material = stoneM;
    gArch.freezeWorldMatrix();
    const gSign = BABYLON.MeshBuilder.CreatePlane("graveSign", { width: 6, height: 1 }, scene);
    gSign.position.set(204.7, 3.35, -80);
    gSign.rotation.y = Math.PI / 2;
    const gTex = TEX.sign(scene, "สุสานเก้าแก้ว", { w: 768, h: 128, bg: "#0c1008", fg: "#9ab86a", glowColor: "#3a6010", fontSize: 76 });
    const gSM = new BABYLON.StandardMaterial("graveSignM", scene);
    gSM.diffuseTexture = gTex; gSM.emissiveTexture = gTex;
    gSM.emissiveColor = C3(0.9, 0.9, 0.9);
    gSM.backFaceCulling = false;
    registerFlicker(gSM, C3(0.9, 0.9, 0.9), "dying");
    gSign.material = gSM;
    gSign.freezeWorldMatrix();
    // dead trees, heavy fog, wisps
    const deadSrc = scene.getMeshByName("deadSrc");
    if (deadSrc) {
      for (const p of [[212, -50], [238, -110], [222, -100], [242, -66], [214, -116]]) {
        const d = deadSrc.createInstance("graveDead");
        const s = 0.7 + Math.random() * 0.5;
        d.position.set(p[0], 3.25 * s, p[1]);
        d.scaling.setAll(s);
        d.rotation.y = Math.random() * 6;
        d.freezeWorldMatrix();
      }
    }
    groundFog("graveFog1", 218, -95, 45, 55, 1);
    groundFog("graveFog2", 232, -60, 40, 45, 1);
    wisp(220, -95, 12, C3(0.5, 0.95, 0.6));
    wisp(235, -60, 9, C3(0.55, 0.9, 0.65));
    wisp(213, -55, 7, C3(0.45, 0.85, 0.55));
  }

  // =========================================================
  // SECRET TUNNEL (SE corner) — hidden area
  // =========================================================
  {
    const sx = 232, sz = -228;
    const mound = BABYLON.MeshBuilder.CreateSphere("tunnelMound", { diameter: 13, segments: 10 }, scene);
    mound.scaling.y = 0.5;
    mound.position.set(sx, 1.6, sz);
    const moundM = mat(scene, "tunnelMoundM", C3(0.2, 0.22, 0.16));
    mound.material = moundM;
    mound.checkCollisions = true;
    PARK.colliders.push(mound);
    mound.freezeWorldMatrix();
    // arch opening facing NW (toward the park)
    const dir = -Math.PI * 0.75;
    const archRoot = new BABYLON.TransformNode("tunnelArchRoot", scene);
    archRoot.position.set(sx + Math.sin(dir) * 5.4, 0, sz + Math.cos(dir) * 5.4);
    archRoot.rotation.y = dir;
    const tArch = BABYLON.MeshBuilder.CreateTorus("tunnelArch", { diameter: 3.4, thickness: 0.55, tessellation: 16 }, scene);
    tArch.rotation.x = Math.PI / 2;
    tArch.position.y = 1.2;
    tArch.material = mat(scene, "tunnelArchM", C3(0.36, 0.37, 0.4), { tex: TEX.brick(scene, "dark") });
    tArch.parent = archRoot;
    const hole = BABYLON.MeshBuilder.CreatePlane("tunnelHole", { width: 2.6, height: 2.6 }, scene);
    hole.position.set(0, 1.1, -0.35);
    const holeM = new BABYLON.StandardMaterial("tunnelHoleM", scene);
    holeM.diffuseColor = C3(0.005, 0.004, 0.01);
    holeM.emissiveColor = C3(0.05, 0.01, 0.09);
    registerFlicker(holeM, C3(0.07, 0.02, 0.12), "pulse");
    holeM.backFaceCulling = false;
    hole.material = holeM;
    hole.parent = archRoot;
    archRoot.getChildMeshes().forEach(m => m.freezeWorldMatrix());
    wisp(sx - 5, sz + 5, 4, C3(0.7, 0.4, 0.95));
    groundFog("tunnelFog", sx - 4, sz + 4, 24, 18, 1);
  }

  // =========================================================
  // PARKING LOT + ROAD (outside the south gate)
  // =========================================================
  {
    const aTex = TEX.asphalt(scene);
    aTex.uScale = 14; aTex.vScale = 4;
    const lotM = mat(scene, "lotM", C3(0.6, 0.6, 0.65), { tex: aTex });
    const lot = BABYLON.MeshBuilder.CreateGround("parkingLot", { width: 130, height: 22 }, scene);
    lot.position.set(0, 0.05, -263);
    lot.material = lotM;
    lot.freezeWorldMatrix();
    const road = BABYLON.MeshBuilder.CreateGround("road", { width: 180, height: 7 }, scene);
    road.position.set(0, 0.05, -277.5);
    road.material = lotM;
    road.freezeWorldMatrix();
    // faded parking lines
    const lineM = mat(scene, "lineM", C3(0.5, 0.5, 0.48));
    lineM.emissiveColor = C3(0.08, 0.08, 0.07);
    const lineSrc = BABYLON.MeshBuilder.CreateBox("lineSrc", { width: 0.16, height: 0.02, depth: 9 }, scene);
    lineSrc.material = lineM;
    lineSrc.position.set(0, -70, 0);
    for (let x = -60; x <= 60; x += 6) {
      const l = lineSrc.createInstance("pline");
      l.position.set(x, 0.08, -258.5);
      l.freezeWorldMatrix();
    }
    // abandoned vehicles
    const wheelM = mat(scene, "wheelM", C3(0.06, 0.06, 0.07));
    function oldCar(x, z, rot, hex) {
      const r = new BABYLON.TransformNode("car", scene);
      r.position.set(x, 0, z);
      r.rotation.y = rot;
      const bodyM = new BABYLON.StandardMaterial("carM" + hex, scene);
      bodyM.diffuseColor = BABYLON.Color3.FromHexString(hex);
      bodyM.specularColor = C3(0.15, 0.15, 0.18);
      bodyM.specularPower = 48;
      const body = BABYLON.MeshBuilder.CreateBox("carBody", { width: 1.9, height: 0.55, depth: 4.3 }, scene);
      body.position.y = 0.62;
      body.material = bodyM;
      body.parent = r;
      body.checkCollisions = true;
      const cab = BABYLON.MeshBuilder.CreateBox("carCab", { width: 1.75, height: 0.55, depth: 2.1 }, scene);
      cab.position.set(0, 1.15, -0.25);
      const cabM = new BABYLON.StandardMaterial("carCabM" + hex, scene);
      cabM.diffuseColor = BABYLON.Color3.FromHexString(hex).scale(0.75);
      cabM.specularColor = C3(0.25, 0.28, 0.35);
      cabM.specularPower = 96;
      cab.material = cabM;
      cab.parent = r;
      for (const [wx, wz] of [[-0.95, 1.35], [0.95, 1.35], [-0.95, -1.35], [0.95, -1.35]]) {
        const wh = BABYLON.MeshBuilder.CreateCylinder("carWheel", { height: 0.25, diameter: 0.62, tessellation: 12 }, scene);
        wh.rotation.z = Math.PI / 2;
        wh.position.set(wx, 0.31, wz);
        wh.material = wheelM;
        wh.parent = r;
      }
      r.getChildMeshes().forEach(m => m.freezeWorldMatrix());
    }
    oldCar(-42, -258, 0.06, "#5a3f30");
    oldCar(-18, -258.5, -0.04, "#33424e");
    oldCar(9, -257.8, 0.1, "#4e3346");
    oldCar(33, -258.2, 0.02, "#54503a");
    // rusty abandoned bus
    const busM = mat(scene, "busM", C3(0.45, 0.3, 0.2), { tex: TEX.metal(scene) });
    const bus = BABYLON.MeshBuilder.CreateBox("bus", { width: 2.4, height: 2.6, depth: 9 }, scene);
    bus.position.set(52, 1.35, -262);
    bus.rotation.y = 0.16;
    bus.material = busM;
    bus.checkCollisions = true;
    bus.freezeWorldMatrix();
    // one dying parking lamp
    const lampBase = scene.getMeshByName("lampBase");
    const bulbOn2 = scene.getMeshByName("bulbOn2");
    if (lampBase && bulbOn2) {
      const li = lampBase.createInstance("lotLamp");
      li.position.set(-25, 2.75, -266);
      li.freezeWorldMatrix();
      const bi = bulbOn2.createInstance("lotLampBulb");
      bi.position.set(-25, 5.15, -264.9);
      bi.freezeWorldMatrix();
    }
  }

  // =========================================================
  // PERIMETER STONE WALL (replaces the bare wire-fence look)
  // =========================================================
  {
    const wallM = mat(scene, "perimWallM", C3(0.3, 0.3, 0.34), { tex: TEX.brick(scene, "dark") });
    wallM.diffuseTexture.uScale = 60; wallM.diffuseTexture.vScale = 1.4;
    const B = PARK.bounds - 1.2;
    const segs = [
      // south wall leaves a gap for the entrance gate (x -12..12)
      { w: 236.8, x: -130.4, z: -B, rot: 0 }, { w: 236.8, x: 130.4, z: -B, rot: 0 },
      { w: 2 * B, x: 0, z: B, rot: 0 },
      { w: 2 * B, x: -B, z: 0, rot: Math.PI / 2 }, { w: 2 * B, x: B, z: 0, rot: Math.PI / 2 },
    ];
    for (const s of segs) {
      const wl = BABYLON.MeshBuilder.CreateBox("perimWall", { width: s.w, height: 2.5, depth: 0.7 }, scene);
      wl.position.set(s.x, 1.25, s.z);
      wl.rotation.y = s.rot;
      wl.material = wallM;
      wl.checkCollisions = true;
      wl.freezeWorldMatrix();
    }
    const pilSrc = BABYLON.MeshBuilder.CreateBox("perimPil", { width: 1.1, height: 3.1, depth: 1.1 }, scene);
    pilSrc.material = wallM;
    pilSrc.position.set(0, -70, 0);
    for (let i = -240; i <= 240; i += 24) {
      for (const [x, z] of [[i, -B], [i, B], [-B, i], [B, i]]) {
        if (z === -B && Math.abs(x) < 14) continue; // keep the entrance gap clear
        const p = pilSrc.createInstance("pp");
        p.position.set(x, 1.55, z);
        p.freezeWorldMatrix();
      }
    }
  }

  // =========================================================
  // FADED PENNANT FLAGS across the main avenue
  // =========================================================
  {
    const fTex = (() => {
      const w = 512, h = 96;
      const dt = new BABYLON.DynamicTexture("texFlags", { width: w, height: h }, scene, true);
      dt.hasAlpha = true;
      const ctx = dt.getContext();
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = "rgba(30,28,26,0.9)";
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, 6); ctx.lineTo(w, 6); ctx.stroke();
      const cols = ["#7a2f35", "#2f5a6a", "#8a7a3a", "#5a3a6a", "#3a6a4a"];
      for (let i = 0; i < 10; i++) {
        ctx.fillStyle = cols[i % cols.length];
        const x = i * (w / 10);
        ctx.beginPath();
        ctx.moveTo(x + 3, 8);
        ctx.lineTo(x + w / 10 - 3, 8);
        ctx.lineTo(x + w / 20, h - 6);
        ctx.closePath();
        ctx.fill();
      }
      // grime
      for (let i = 0; i < 90; i++) {
        ctx.fillStyle = `rgba(10,8,6,${0.1 + Math.random() * 0.25})`;
        ctx.beginPath();
        ctx.arc(Math.random() * w, Math.random() * h, 1 + Math.random() * 4, 0, Math.PI * 2);
        ctx.fill();
      }
      dt.update();
      return dt;
    })();
    const flagM = new BABYLON.StandardMaterial("flagLineM", scene);
    flagM.diffuseTexture = fTex;
    flagM.opacityTexture = fTex;
    flagM.emissiveColor = C3(0.22, 0.2, 0.2);
    flagM.backFaceCulling = false;
    flagM.specularColor = C3(0, 0, 0);
    const flagLines = [];
    [[-65], [-115], [-165], [-205]].forEach((zz, i) => {
      const fl = BABYLON.MeshBuilder.CreatePlane("flagLine" + i, { width: 15, height: 1.3 }, scene);
      fl.position.set(0, 5.1, zz[0]);
      fl.material = flagM;
      fl.isPickable = false;
      flagLines.push({ fl, seed: i * 2.1 });
    });
    PARK.updaters.push((dt, t) => {
      for (const f of flagLines) f.fl.rotation.x = Math.sin(t * 1.6 + f.seed) * 0.09;
    });
  }
}
