// ============================================================
// landmarks.js — walk-in castle great hall, circus tent,
// mini graveyard with ghost pond, secret tunnel, parking lot,
// pennant flags, ground fog & wisps
// ============================================================
"use strict";

function buildLandmarks(scene) {
  const C3 = (r, g, b) => new BABYLON.Color3(r, g, b);

  // ---------- shared fog / wisp helpers ----------
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

  function groundFog(name, x, z, w, d) {
    if (PARK.lowQuality && /graveFog2|tunnelFog|plazaFog/.test(name)) return null;
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

  let wispCount = 0;
  function wisp(x, z, radius, hue) {
    wispCount++;
    if (PARK.lowQuality && wispCount % 2 === 0) return;
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
  // HAUNTED CASTLE (0,85) — walk into the great hall
  // =========================================================
  {
    const cx = 0, cz = 85;
    PARK.indoorZones.push({ x: cx, z: cz, w: 29, d: 15, rotY: 0 });
    const stoneMat = mat(scene, "castleStone", C3(0.34, 0.3, 0.42), { tex: TEX.brick(scene, "dark") });
    stoneMat.diffuseTexture.uScale = 8; stoneMat.diffuseTexture.vScale = 4;
    const inStone = mat(scene, "castleInStone", C3(0.3, 0.26, 0.38), { tex: TEX.brick(scene, "dark") });
    inStone.diffuseTexture.uScale = 6; inStone.diffuseTexture.vScale = 3;
    const roofMat = mat(scene, "castleRoof", C3(0.16, 0.08, 0.22));
    const castleMeshes = [];

    function cwall(name, w, h, d, x, y, z, m) {
      const b = BABYLON.MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, scene);
      b.position.set(cx + x, y, cz + z);
      b.material = m || stoneMat;
      b.checkCollisions = true;
      PARK.colliders.push(b);
      b.freezeWorldMatrix();
      castleMeshes.push(b);
      return b;
    }
    // great hall shell 30x13x16, door gap on the south face
    const W = 30, H = 13, D = 16, TH = 0.6, dw = 4.2, dh = 4.6;
    const hallFloor = BABYLON.MeshBuilder.CreateGround("caHallFloor", { width: W - 0.4, height: D - 0.4 }, scene);
    hallFloor.position.set(cx, 0.09, cz);
    const hallFloorM = mat(scene, "caHallFloorM", C3(0.45, 0.44, 0.5), { tex: TEX.pavement(scene) });
    hallFloorM.diffuseTexture.uScale = 8; hallFloorM.diffuseTexture.vScale = 4;
    hallFloor.material = hallFloorM;
    hallFloor.freezeWorldMatrix();
    castleMeshes.push(hallFloor);
    cwall("caCeil", W, TH, D, 0, H + TH / 2, 0);
    cwall("caBack", W, H, TH, 0, H / 2, D / 2 - TH / 2);
    cwall("caSideW", TH, H, D, -W / 2 + TH / 2, H / 2, 0);
    cwall("caSideE", TH, H, D, W / 2 - TH / 2, H / 2, 0);
    const segW = (W - dw) / 2;
    cwall("caFrontL", segW, H, TH, -(dw / 2 + segW / 2), H / 2, -D / 2 + TH / 2);
    cwall("caFrontR", segW, H, TH, dw / 2 + segW / 2, H / 2, -D / 2 + TH / 2);
    cwall("caLintel", dw, H - dh, TH, 0, dh + (H - dh) / 2, -D / 2 + TH / 2);

    // interior: carpet, pillars, throne, chandeliers, ghost portrait
    const carpetM = mat(scene, "caCarpetM", C3(0.42, 0.1, 0.12));
    const carpet = BABYLON.MeshBuilder.CreateGround("caCarpet", { width: 3, height: D - 2 }, scene);
    carpet.position.set(cx, 0.12, cz);
    carpet.material = carpetM;
    carpet.freezeWorldMatrix();
    castleMeshes.push(carpet);
    for (const px of [-9, 9]) {
      for (const pz of [-4, 4]) {
        const pil = BABYLON.MeshBuilder.CreateCylinder("caPillar", { height: H, diameter: 1.3, tessellation: 10 }, scene);
        pil.position.set(cx + px, H / 2, cz + pz);
        pil.material = inStone;
        pil.checkCollisions = true;
        pil.freezeWorldMatrix();
        castleMeshes.push(pil);
      }
    }
    const throneM = mat(scene, "throneM", C3(0.5, 0.4, 0.15));
    const throne = BABYLON.MeshBuilder.CreateBox("caThrone", { width: 1.6, height: 1.1, depth: 1.2 }, scene);
    throne.position.set(cx, 0.65, cz + D / 2 - 2.2);
    throne.material = throneM;
    throne.checkCollisions = true;
    throne.freezeWorldMatrix();
    castleMeshes.push(throne);
    const throneBack = BABYLON.MeshBuilder.CreateBox("caThroneB", { width: 1.6, height: 2.6, depth: 0.25 }, scene);
    throneBack.position.set(cx, 1.9, cz + D / 2 - 1.7);
    throneBack.material = throneM;
    throneBack.freezeWorldMatrix();
    castleMeshes.push(throneBack);
    // ghost portrait above the throne
    const portrait = BABYLON.MeshBuilder.CreatePlane("caPortrait", { width: 4, height: 5 }, scene);
    portrait.position.set(cx, 7.5, cz + D / 2 - TH - 0.05);
    const pTex = TEX.ghostFace(scene, true); // solid variant — it's a painting
    const pM = new BABYLON.StandardMaterial("caPortraitM", scene);
    pM.diffuseTexture = pTex;
    pM.emissiveTexture = pTex;
    pM.emissiveColor = C3(0.5, 0.5, 0.5);
    pM.disableLighting = true;
    registerFlicker(pM, C3(0.55, 0.55, 0.55), "pulse");
    portrait.material = pM;
    portrait.freezeWorldMatrix();
    castleMeshes.push(portrait);
    // chandeliers
    const candleM = new BABYLON.StandardMaterial("candleM", scene);
    candleM.emissiveColor = C3(1, 0.62, 0.25);
    candleM.diffuseColor = C3(0.15, 0.09, 0.03);
    registerFlicker(candleM, C3(1, 0.62, 0.25), "buzz");
    for (const chz of [-3.5, 3.5]) {
      // hung high near the ceiling so the glow doesn't block the portrait
      const ring = BABYLON.MeshBuilder.CreateTorus("caChand", { diameter: 2.4, thickness: 0.14, tessellation: 14 }, scene);
      ring.position.set(cx, H - 1.9, cz + chz);
      ring.material = mat(scene, "chandM", C3(0.2, 0.16, 0.1));
      ring.freezeWorldMatrix();
      castleMeshes.push(ring);
      for (let ci = 0; ci < 6; ci++) {
        const a = (ci / 6) * Math.PI * 2;
        const c = BABYLON.MeshBuilder.CreateSphere("caCandle", { diameter: 0.22, segments: 5 }, scene);
        c.position.set(cx + Math.cos(a) * 1.2, H - 1.6, cz + chz + Math.sin(a) * 1.2);
        c.material = candleM;
        c.freezeWorldMatrix();
        castleMeshes.push(c);
      }
      const chain = BABYLON.MeshBuilder.CreateCylinder("caChandChain", { height: 1.6, diameter: 0.08 }, scene);
      chain.position.set(cx, H - 0.8, cz + chz);
      chain.material = inStone;
      chain.freezeWorldMatrix();
    }
    // interior purple light (scoped)
    const hallLight = new BABYLON.PointLight("caHallLight", new BABYLON.Vector3(cx, 8, cz), scene);
    hallLight.diffuse = C3(0.65, 0.35, 1);
    hallLight.intensity = 1.5;
    hallLight.range = 30;
    hallLight.includedOnlyMeshes = castleMeshes;
    PARK.updaters.push((dt, t) => { hallLight.intensity = 1.2 + 0.4 * Math.sin(t * 1.1); });

    // keep tower on the roof + corner towers + battlements
    const keep = BABYLON.MeshBuilder.CreateBox("caKeep", { width: 11, height: 12, depth: 11 }, scene);
    keep.position.set(cx, H + 6.3, cz);
    keep.material = stoneMat;
    keep.freezeWorldMatrix();
    const spire = BABYLON.MeshBuilder.CreateCylinder("caSpire", { height: 8, diameterBottom: 9, diameterTop: 0.2, tessellation: 8 }, scene);
    spire.position.set(cx, H + 16.3, cz);
    spire.material = roofMat;
    spire.freezeWorldMatrix();
    for (const [tx2, tz2] of [[-14, -7], [14, -7], [-14, 7], [14, 7]]) {
      const tw = BABYLON.MeshBuilder.CreateCylinder("caTower", { height: 19, diameter: 6.5, tessellation: 10 }, scene);
      tw.position.set(cx + tx2, 9.5, cz + tz2);
      tw.material = stoneMat;
      tw.checkCollisions = true;
      PARK.colliders.push(tw);
      tw.freezeWorldMatrix();
      castleMeshes.push(tw);
      const cone = BABYLON.MeshBuilder.CreateCylinder("caTowerCone", { height: 6.5, diameterBottom: 7.8, diameterTop: 0.15, tessellation: 10 }, scene);
      cone.position.set(cx + tx2, 22.2, cz + tz2);
      cone.material = roofMat;
      cone.freezeWorldMatrix();
    }
    const crenSrc = BABYLON.MeshBuilder.CreateBox("caCren", { width: 1.2, height: 1.1, depth: 0.8 }, scene);
    crenSrc.material = stoneMat;
    crenSrc.position.set(0, -70, 0);
    for (let i = -6; i <= 6; i++) {
      const c = crenSrc.createInstance("cren");
      c.position.set(cx + i * 2.3, H + 0.9, cz - D / 2 + 0.4);
      c.freezeWorldMatrix();
    }
    // glowing windows (front face)
    const winMatA = new BABYLON.StandardMaterial("caWinA", scene);
    winMatA.emissiveColor = C3(0.62, 0.3, 0.95);
    winMatA.diffuseColor = C3(0.06, 0.02, 0.1);
    registerFlicker(winMatA, C3(0.62, 0.3, 0.95), "pulse");
    const winMatB = winMatA.clone("caWinB");
    registerFlicker(winMatB, C3(0.5, 0.22, 0.85), "dying");
    const winSrcA = BABYLON.MeshBuilder.CreatePlane("caWinSrcA", { width: 0.9, height: 1.7 }, scene);
    winSrcA.material = winMatA;
    winSrcA.position.set(0, -70, 0);
    const winSrcB = winSrcA.clone("caWinSrcB");
    winSrcB.material = winMatB;
    const winSpots = [];
    for (const wx of [-12, -8, 8, 12]) winSpots.push([wx, 6, -D / 2 - 0.06], [wx, 10, -D / 2 - 0.06]);
    for (const wx of [-3, 3]) winSpots.push([wx, H + 5, -5.56], [wx, H + 9, -5.56]);
    winSpots.push([-14, 9, -D / 2 - 3.31], [14, 9, -D / 2 - 3.31]);
    winSpots.forEach((s, i) => {
      const src = i % 3 === 0 ? winSrcB : winSrcA;
      const w = src.createInstance("caWin" + i);
      w.position.set(cx + s[0], s[1], cz + s[2]);
      w.freezeWorldMatrix();
    });
    // arch + lanterns + steps + sign at the door
    const arch = BABYLON.MeshBuilder.CreateTorus("caArch", { diameter: 5.4, thickness: 0.7, tessellation: 20 }, scene);
    arch.position.set(cx, dh + 0.2, cz - D / 2 - 0.1);
    arch.rotation.x = Math.PI / 2;
    arch.material = stoneMat;
    arch.freezeWorldMatrix();
    const lantMat = new BABYLON.StandardMaterial("caLant", scene);
    lantMat.emissiveColor = C3(1, 0.6, 0.25);
    lantMat.diffuseColor = C3(0.15, 0.08, 0.02);
    registerFlicker(lantMat, C3(1, 0.6, 0.25), "buzz");
    for (const lx of [-3.4, 3.4]) {
      const lant = BABYLON.MeshBuilder.CreateSphere("caLantS", { diameter: 0.5, segments: 6 }, scene);
      lant.position.set(cx + lx, 4.2, cz - D / 2 - 0.35);
      lant.material = lantMat;
      lant.freezeWorldMatrix();
    }
    for (let s = 0; s < 3; s++) {
      const step = BABYLON.MeshBuilder.CreateBox("caStep" + s, { width: 6 - s, height: 0.25, depth: 1.1 }, scene);
      step.position.set(cx, 0.13 + s * 0.25, cz - D / 2 - 1.6 + s * 0.55);
      step.material = stoneMat;
      step.freezeWorldMatrix();
      castleMeshes.push(step);
    }
    const caSign = BABYLON.MeshBuilder.CreatePlane("caSignP", { width: 9, height: 1.5 }, scene);
    caSign.position.set(cx, 8.9, cz - D / 2 - 0.15);
    const caTex = TEX.sign(scene, "ปราสาทเก้าแก้ว", { w: 1024, h: 170, bg: "#0d0714", fg: "#c99aff", glowColor: "#8020d0", fontSize: 100 });
    const caSM = new BABYLON.StandardMaterial("caSignM2", scene);
    caSM.diffuseTexture = caTex; caSM.emissiveTexture = caTex;
    caSM.emissiveColor = C3(1, 1, 1);
    registerFlicker(caSM, C3(1, 1, 1), "dying");
    caSign.material = caSM;
    caSign.freezeWorldMatrix();
    // forecourt + scoped exterior floodlight + fog
    const fore = BABYLON.MeshBuilder.CreateDisc("caFore", { radius: 13, tessellation: 32 }, scene);
    fore.rotation.x = Math.PI / 2;
    fore.position.set(cx, 0.07, cz - 21);
    const foreM = mat(scene, "caForeM", C3(0.65, 0.65, 0.72), { tex: TEX.pavement(scene) });
    foreM.diffuseTexture.uScale = 6; foreM.diffuseTexture.vScale = 6;
    fore.material = foreM;
    fore.freezeWorldMatrix();
    castleMeshes.push(fore);
    const caLight = new BABYLON.PointLight("plCastle", new BABYLON.Vector3(cx, 9, cz - 16), scene);
    caLight.diffuse = C3(0.6, 0.3, 1);
    caLight.intensity = 2.4;
    caLight.range = 45;
    caLight.includedOnlyMeshes = castleMeshes;
    groundFog("caFog", cx, cz - 16, 36, 20);
    const flag = BABYLON.MeshBuilder.CreatePlane("caFlag", { width: 2.2, height: 1.2 }, scene);
    flag.position.set(cx + 1.1, H + 21.4, cz);
    const flagM = new BABYLON.StandardMaterial("caFlagM", scene);
    flagM.diffuseColor = C3(0.35, 0.08, 0.1);
    flagM.emissiveColor = C3(0.1, 0.02, 0.03);
    flagM.backFaceCulling = false;
    flag.material = flagM;
    const pole = BABYLON.MeshBuilder.CreateCylinder("caPole2", { height: 3, diameter: 0.1 }, scene);
    pole.position.set(cx, H + 21.3, cz);
    pole.material = stoneMat;
    pole.freezeWorldMatrix();
    PARK.updaters.push((dt, t) => { flag.rotation.y = Math.sin(t * 2.2) * 0.28; });
  }

  // =========================================================
  // CREEPY CIRCUS TENT (-35,-34) — entrance faces the street
  // =========================================================
  {
    const tx = -35, tz = -34, R = 10;
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
    const roof = BABYLON.MeshBuilder.CreateCylinder("tentRoof", { height: 8, diameterBottom: R * 2 + 3, diameterTop: 0.4, tessellation: 24 }, scene);
    roof.position.set(tx, 8.5, tz);
    roof.material = roofM;
    roof.freezeWorldMatrix();
    const tpole = BABYLON.MeshBuilder.CreateCylinder("tentPole", { height: 3.2, diameter: 0.12 }, scene);
    tpole.position.set(tx, 14, tz);
    tpole.material = mat(scene, "tentPoleM", C3(0.2, 0.2, 0.22));
    tpole.freezeWorldMatrix();
    const pen = BABYLON.MeshBuilder.CreatePlane("tentPen", { width: 1.6, height: 0.75 }, scene);
    pen.position.set(tx + 0.8, 15.1, tz);
    const penM = new BABYLON.StandardMaterial("tentPenM", scene);
    penM.diffuseColor = C3(0.55, 0.12, 0.15);
    penM.emissiveColor = C3(0.16, 0.03, 0.04);
    penM.backFaceCulling = false;
    pen.material = penM;
    PARK.updaters.push((dt, t) => { pen.rotation.y = Math.sin(t * 2.6) * 0.35; });
    // entrance flap + sign face NORTH toward the west street
    const flap = BABYLON.MeshBuilder.CreatePlane("tentFlap", { width: 3, height: 3.8 }, scene);
    flap.position.set(tx, 1.9, tz + R + 0.06);
    flap.rotation.y = Math.PI;
    const flapM = new BABYLON.StandardMaterial("tentFlapM", scene);
    flapM.diffuseColor = C3(0.01, 0.01, 0.015);
    flapM.emissiveColor = C3(0.02, 0.01, 0.02);
    flapM.backFaceCulling = false;
    flap.material = flapM;
    flap.freezeWorldMatrix();
    const tSign = BABYLON.MeshBuilder.CreatePlane("tentSign", { width: 8, height: 1.3 }, scene);
    // Keep the sign clearly in front of the wide roof edge so its lower half is not occluded.
    tSign.position.set(tx, 6.25, tz + R + 1.65);
    tSign.rotation.y = Math.PI;
    const tTex = TEX.sign(scene, "ละครสัตว์มรณะ", { w: 1024, h: 160, bg: "#170808", fg: "#ff8a6a", glowColor: "#c03010", fontSize: 96 });
    const tSM = new BABYLON.StandardMaterial("tentSignM", scene);
    tSM.diffuseTexture = tTex; tSM.emissiveTexture = tTex;
    tSM.emissiveColor = C3(1, 1, 1);
    tSM.backFaceCulling = false;
    registerFlicker(tSM, C3(1, 1, 1), "buzz");
    tSign.material = tSM;
    tSign.freezeWorldMatrix();
    const signPostM = mat(scene, "tentSignPostM", C3(0.18, 0.11, 0.08));
    for (const sx of [-3.35, 3.35]) {
      const post = BABYLON.MeshBuilder.CreateCylinder("tentSignPost", { height: 2.3, diameter: 0.13, tessellation: 6 }, scene);
      post.position.set(tx + sx, 5.2, tz + R + 1.72);
      post.material = signPostM;
      post.freezeWorldMatrix();
    }
    const tbMat = new BABYLON.StandardMaterial("tentBulbM", scene);
    tbMat.emissiveColor = C3(1, 0.7, 0.3);
    tbMat.diffuseColor = C3(0.15, 0.1, 0.03);
    registerFlicker(tbMat, C3(1, 0.7, 0.3), "dying");
    const tbSrc = BABYLON.MeshBuilder.CreateSphere("tentBulbSrc", { diameter: 0.3, segments: 5 }, scene);
    tbSrc.material = tbMat;
    tbSrc.position.set(0, -70, 0);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const b = tbSrc.createInstance("tentBulb");
      b.position.set(tx + Math.cos(a) * (R + 1.2), 4.6, tz + Math.sin(a) * (R + 1.2));
      b.freezeWorldMatrix();
    }
  }

  // =========================================================
  // MINI GRAVEYARD (x 68..104, z 62..102) + ghost pond
  // =========================================================
  {
    const stoneM = mat(scene, "graveStone", C3(0.38, 0.4, 0.42));
    // dark soil bed replaces pavement inside the fence
    const soil = BABYLON.MeshBuilder.CreateGround("graveSoil", { width: 36, height: 40 }, scene);
    soil.position.set(86, 0.055, 82);
    soil.material = mat(scene, "graveSoilM", C3(0.14, 0.12, 0.1));
    soil.freezeWorldMatrix();

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
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 7; col++) {
        if (Math.random() < 0.2) continue;
        const px = 71 + col * 4.6, pz = 66 + row * 6.2;
        if (px > 66 && px < 84 && pz > 84) continue; // leave room for the pond
        const t = srcs[Math.floor(Math.random() * 3)].createInstance("tomb");
        t.position.set(px + (Math.random() - 0.5) * 1.4, 0.55, pz + (Math.random() - 0.5) * 1.6);
        t.rotation.set((Math.random() - 0.5) * 0.22, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.24);
        t.freezeWorldMatrix();
      }
    }
    // ghost pond
    const pond = BABYLON.MeshBuilder.CreateDisc("gravePond", { radius: 7, tessellation: 28 }, scene);
    pond.rotation.x = Math.PI / 2;
    pond.scaling.z = 0.75;
    pond.position.set(75, 0.1, 93);
    const pondM = new BABYLON.StandardMaterial("gravePondM", scene);
    pondM.diffuseTexture = TEX.waterNoise(scene);
    pondM.diffuseColor = C3(0.22, 0.36, 0.3);
    pondM.emissiveColor = C3(0.015, 0.05, 0.035);
    pondM.alpha = 0.9;
    pond.material = pondM;
    pond.freezeWorldMatrix();
    PARK.updaters.push((dt, t) => { pondM.diffuseTexture.uOffset = t * 0.005; });
    // mausoleum
    const mau = BABYLON.MeshBuilder.CreateBox("mausoleum", { width: 5.5, height: 3.6, depth: 4.2 }, scene);
    mau.position.set(98, 1.8, 96);
    const mauM = mat(scene, "mauM", C3(0.45, 0.47, 0.52), { tex: TEX.brick(scene, "dark") });
    mau.material = mauM;
    mau.checkCollisions = true;
    PARK.colliders.push(mau);
    mau.freezeWorldMatrix();
    const mauRoof = BABYLON.MeshBuilder.CreateCylinder("mauRoof", { height: 6, diameter: 5, tessellation: 3 }, scene);
    mauRoof.rotation.z = Math.PI / 2;
    mauRoof.rotation.y = Math.PI / 2;
    mauRoof.scaling.y = 0.45;
    mauRoof.position.set(98, 4.2, 96);
    mauRoof.material = stoneM;
    mauRoof.freezeWorldMatrix();
    const mauDoor = BABYLON.MeshBuilder.CreatePlane("mauDoor", { width: 1.4, height: 2.2 }, scene);
    mauDoor.position.set(98, 1.15, 93.85);
    const mauDoorM = new BABYLON.StandardMaterial("mauDoorM", scene);
    mauDoorM.diffuseColor = C3(0.01, 0.012, 0.01);
    mauDoorM.emissiveColor = C3(0.015, 0.04, 0.02);
    registerFlicker(mauDoorM, C3(0.02, 0.06, 0.03), "pulse");
    mauDoor.material = mauDoorM;
    mauDoor.freezeWorldMatrix();
    // iron fence + south gate
    const gfM = mat(scene, "graveFenceM", C3(0.12, 0.12, 0.14));
    const gpSrc = BABYLON.MeshBuilder.CreateBox("gravePost", { width: 0.12, height: 1.6, depth: 0.12 }, scene);
    gpSrc.material = gfM;
    gpSrc.position.set(0, -70, 0);
    const per = [];
    for (let x = 68; x <= 104; x += 4) { per.push([x, 62]); per.push([x, 102]); }
    for (let z = 62; z <= 102; z += 4) { per.push([68, z]); per.push([104, z]); }
    for (const p of per) {
      if (p[1] === 62 && p[0] > 70 && p[0] < 78) continue; // gate gap
      const g = gpSrc.createInstance("gp");
      g.position.set(p[0], 0.8, p[1]);
      g.freezeWorldMatrix();
    }
    for (const seg of [[86, 102, 36, 0], [68, 82, 40, Math.PI / 2], [104, 82, 40, Math.PI / 2], [65 + 4.5, 62, 9, 0], [91, 62, 26, 0]]) {
      const rail = BABYLON.MeshBuilder.CreateBox("graveRail", { width: seg[2], height: 0.07, depth: 0.07 }, scene);
      rail.position.set(seg[0], 1.45, seg[1]);
      rail.rotation.y = seg[3];
      rail.material = gfM;
      rail.checkCollisions = true;
      rail.freezeWorldMatrix();
    }
    for (const dx of [-3.5, 3.5]) {
      const gp = BABYLON.MeshBuilder.CreateBox("graveGateP", { width: 0.5, height: 3.2, depth: 0.5 }, scene);
      gp.position.set(74.5 + dx, 1.6, 62);
      gp.material = stoneM;
      gp.checkCollisions = true;
      gp.freezeWorldMatrix();
    }
    const gArch = BABYLON.MeshBuilder.CreateBox("graveGateArch", { width: 7.5, height: 0.7, depth: 0.4 }, scene);
    gArch.position.set(74.5, 3.4, 62);
    gArch.material = stoneM;
    gArch.freezeWorldMatrix();
    const gSign = BABYLON.MeshBuilder.CreatePlane("graveSign", { width: 6, height: 1 }, scene);
    gSign.position.set(74.5, 3.35, 61.7);
    const gTex = TEX.sign(scene, "สุสานเก้าแก้ว", { w: 768, h: 128, bg: "#0c1008", fg: "#9ab86a", glowColor: "#3a6010", fontSize: 76 });
    const gSM = new BABYLON.StandardMaterial("graveSignM", scene);
    gSM.diffuseTexture = gTex; gSM.emissiveTexture = gTex;
    gSM.emissiveColor = C3(0.9, 0.9, 0.9);
    gSM.backFaceCulling = false;
    registerFlicker(gSM, C3(0.9, 0.9, 0.9), "dying");
    gSign.material = gSM;
    gSign.freezeWorldMatrix();
    // dead trees, fog, wisps
    const deadSrc = scene.getMeshByName("deadSrc");
    if (deadSrc) {
      for (const p of [[72, 68], [100, 74], [90, 99]]) {
        const d = deadSrc.createInstance("graveDead");
        const s = 0.6 + Math.random() * 0.4;
        d.position.set(p[0], 3.25 * s, p[1]);
        d.scaling.setAll(s);
        d.rotation.y = Math.random() * 6;
        d.freezeWorldMatrix();
      }
    }
    groundFog("graveFog1", 84, 80, 38, 42);
    groundFog("graveFog2", 76, 92, 26, 22);
    wisp(85, 80, 10, C3(0.5, 0.95, 0.6));
    wisp(75, 92, 6, C3(0.45, 0.9, 0.75));
    wisp(96, 70, 7, C3(0.55, 0.9, 0.65));
  }

  // =========================================================
  // SECRET TUNNEL (SE corner)
  // =========================================================
  {
    const sx = 96, sz = -96;
    const mound = BABYLON.MeshBuilder.CreateSphere("tunnelMound", { diameter: 13, segments: 10 }, scene);
    mound.scaling.y = 0.5;
    mound.position.set(sx, 1.6, sz);
    mound.material = mat(scene, "tunnelMoundM", C3(0.22, 0.22, 0.18));
    mound.checkCollisions = true;
    PARK.colliders.push(mound);
    mound.freezeWorldMatrix();
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
    groundFog("tunnelFog", sx - 4, sz + 4, 20, 16);
  }

  // =========================================================
  // PARKING LOT + ROAD (outside the south gate)
  // =========================================================
  {
    const aTex = TEX.asphalt(scene);
    aTex.uScale = 10; aTex.vScale = 3;
    const lotM = mat(scene, "lotM", C3(0.6, 0.6, 0.65), { tex: aTex });
    const lot = BABYLON.MeshBuilder.CreateGround("parkingLot", { width: 110, height: 20 }, scene);
    lot.position.set(0, 0.05, -122);
    lot.material = lotM;
    lot.freezeWorldMatrix();
    const road = BABYLON.MeshBuilder.CreateGround("road", { width: 150, height: 7 }, scene);
    road.position.set(0, 0.05, -136);
    road.material = lotM;
    road.freezeWorldMatrix();
    const lineM = mat(scene, "lineM", C3(0.5, 0.5, 0.48));
    lineM.emissiveColor = C3(0.08, 0.08, 0.07);
    const lineSrc = BABYLON.MeshBuilder.CreateBox("lineSrc", { width: 0.16, height: 0.02, depth: 8 }, scene);
    lineSrc.material = lineM;
    lineSrc.position.set(0, -70, 0);
    for (let x = -50; x <= 50; x += 6) {
      const l = lineSrc.createInstance("pline");
      l.position.set(x, 0.08, -118);
      l.freezeWorldMatrix();
    }
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
    oldCar(-38, -117.5, 0.06, "#5a3f30");
    oldCar(-14, -118, -0.04, "#33424e");
    oldCar(10, -117.4, 0.1, "#4e3346");
    oldCar(30, -117.8, 0.02, "#54503a");
    const busM = mat(scene, "busM", C3(0.45, 0.3, 0.2), { tex: TEX.metal(scene) });
    const bus = BABYLON.MeshBuilder.CreateBox("bus", { width: 2.4, height: 2.6, depth: 9 }, scene);
    bus.position.set(46, 1.35, -121);
    bus.rotation.y = 0.16;
    bus.material = busM;
    bus.checkCollisions = true;
    bus.freezeWorldMatrix();
    const lampBase = scene.getMeshByName("lampBase");
    const bulbOn2 = scene.getMeshByName("bulbOn2");
    if (lampBase && bulbOn2) {
      const li = lampBase.createInstance("lotLamp");
      li.position.set(-22, 2.75, -125);
      li.freezeWorldMatrix();
      const bi = bulbOn2.createInstance("lotLampBulb");
      bi.position.set(-22, 5.15, -123.9);
      bi.freezeWorldMatrix();
    }
  }

  // =========================================================
  // FADED PENNANT FLAGS across the avenue and both streets
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
    const spots = [
      { x: 0, z: -38, ry: 0 }, { x: 0, z: -60, ry: 0 }, { x: 0, z: -82, ry: 0 },
      { x: -36, z: -10, ry: Math.PI / 2 }, { x: 36, z: -10, ry: Math.PI / 2 },
      { x: 0, z: 30, ry: 0 },
    ];
    spots.forEach((s, i) => {
      const fl = BABYLON.MeshBuilder.CreatePlane("flagLine" + i, { width: 15, height: 1.3 }, scene);
      fl.position.set(s.x, 5.1, s.z);
      fl.rotation.y = s.ry;
      fl.material = flagM;
      fl.isPickable = false;
      flagLines.push({ fl, seed: i * 2.1, ry: s.ry });
    });
    PARK.updaters.push((dt, t) => {
      for (const f of flagLines) f.fl.rotation.x = Math.sin(t * 1.6 + f.seed) * 0.09;
    });
    groundFog("plazaFog", 0, -10, 34, 26);
  }
}
