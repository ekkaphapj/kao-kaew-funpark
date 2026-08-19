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
    // Hall floor is built as slabs so the stairwell can open through it.
    const OPEN = { x1: -13.8, x2: -10.2, z1: -3.2, z2: 6.8 }; // stair shaft (local)
    const hallFloorM = mat(scene, "caHallFloorM", C3(0.45, 0.44, 0.5), { tex: TEX.pavement(scene) });
    hallFloorM.diffuseTexture.uScale = 8; hallFloorM.diffuseTexture.vScale = 4;
    // [x1, x2, z1, z2] rectangles that tile the hall around the shaft
    const FLOOR_RECTS = [
      [-14.7, OPEN.x1, -7.7, 7.7],
      [OPEN.x2, 14.7, -7.7, 7.7],
      [OPEN.x1, OPEN.x2, -7.7, OPEN.z1],
      [OPEN.x1, OPEN.x2, OPEN.z2, 7.7],
    ];
    FLOOR_RECTS.forEach((r, i) => {
      const slab = BABYLON.MeshBuilder.CreateBox("caHallFloor" + i, {
        width: r[1] - r[0], height: 0.5, depth: r[3] - r[2],
      }, scene);
      slab.position.set(cx + (r[0] + r[1]) / 2, -0.16, cz + (r[2] + r[3]) / 2);
      slab.material = hallFloorM;
      slab.checkCollisions = true;
      slab.freezeWorldMatrix();
      castleMeshes.push(slab);
    });
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

    // =========================================================
    // CELLAR — the stairwell in the west end of the hall drops
    // into four rooms off a central corridor. Lit only by its
    // own lamps, so the way down is genuinely dark.
    // =========================================================
    {
      const FL = -5.0, CH2 = 3.8, WT = 0.4;   // floor, room height, wall thickness
      const CEIL = FL + CH2;                  // -1.2 = ceiling underside
      const cellar = [];                      // meshes lit only by cellar lamps

      // let the player descend anywhere under the castle footprint
      PARK.lowZones.push({ x: cx, z: cz, w: 29.4, d: 15.4, minY: FL + 0.95 });

      const wallM = mat(scene, "clWallM", C3(0.31, 0.29, 0.34), { tex: TEX.brick(scene, "dark") });
      wallM.diffuseTexture.uScale = 6; wallM.diffuseTexture.vScale = 2;
      const floorM = mat(scene, "clFloorM", C3(0.36, 0.35, 0.37), { tex: TEX.pavement(scene) });
      floorM.diffuseTexture.uScale = 14; floorM.diffuseTexture.vScale = 7;
      const woodM = mat(scene, "clWoodM", C3(0.36, 0.27, 0.17), { tex: TEX.planks(scene) });
      const stairM = mat(scene, "clStairM", C3(0.48, 0.38, 0.24), { tex: TEX.planks(scene) });
      stairM.diffuseTexture.uScale = 2.4; stairM.diffuseTexture.vScale = 1.2;
      stairM.emissiveColor = C3(0.07, 0.045, 0.018);
      const ironM = mat(scene, "clIronM", C3(0.17, 0.17, 0.2));
      const brassM = mat(scene, "clBrassM", C3(0.44, 0.33, 0.13));
      const trimM = mat(scene, "clTrimM", C3(0.4, 0.37, 0.43), { tex: TEX.brick(scene, "dark") });
      const paperM = mat(scene, "clPaperM", C3(0.56, 0.48, 0.31));
      const boneM = mat(scene, "clBoneM", C3(0.72, 0.7, 0.62));

      // Meshes are frozen in one pass at the end, so callers can still rotate
      // them (and animated props opt out via metadata.animated).
      function cbox(name, w, h, d, x, y, z, m, solid) {
        const b = BABYLON.MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, scene);
        b.position.set(cx + x, y, cz + z);
        b.material = m || wallM;
        b.isPickable = false;
        if (solid !== false) { b.checkCollisions = true; }
        cellar.push(b);
        return b;
      }
      function ccyl(name, h, dia, x, y, z, m, solid) {
        const c = BABYLON.MeshBuilder.CreateCylinder(name, { height: h, diameter: dia, tessellation: 10 }, scene);
        c.position.set(cx + x, y, cz + z);
        c.material = m || ironM;
        c.isPickable = false;
        if (solid) c.checkCollisions = true;
        cellar.push(c);
        return c;
      }
      // wall along one axis, with any number of door gaps (each gets a lintel)
      function cwall2(name, axis, fixed, from, to, gaps) {
        const list = (gaps || []).slice().sort((a, b) => a[0] - b[0]);
        const segs = [];
        let cursor = from;
        for (const g of list) {
          if (g[0] > cursor) segs.push([cursor, g[0]]);
          cursor = Math.max(cursor, g[1]);
        }
        if (to > cursor) segs.push([cursor, to]);
        for (const [a, b] of segs) {
          if (b - a < 0.05) continue;
          const len = b - a, mid = (a + b) / 2;
          if (axis === "x") cbox(name, WT, CH2, len, fixed, FL + CH2 / 2, mid, wallM);
          else cbox(name, len, CH2, WT, mid, FL + CH2 / 2, fixed, wallM);
        }
        for (const g of list) { // doorways are 2.5 m tall, wall above them
          const len = g[1] - g[0], mid = (g[0] + g[1]) / 2, h = CH2 - 2.5;
          if (axis === "x") cbox(name + "Lin", WT, h, len, fixed, FL + 2.5 + h / 2, mid, wallM);
          else cbox(name + "Lin", len, h, WT, mid, FL + 2.5 + h / 2, fixed, wallM);
        }
      }

      // ---- floor, ceiling (holed for the shaft), outer walls ----
      cbox("clFloor", 28.8, 0.4, 14.8, 0, FL - 0.2, 0, floorM);
      FLOOR_RECTS.forEach((r, i) => {
        cbox("clCeil" + i, r[1] - r[0], WT, r[3] - r[2],
          (r[0] + r[1]) / 2, CEIL + WT / 2, (r[2] + r[3]) / 2, wallM);
      });
      cwall2("clOuterW", "x", -14.2, -7.4, 7.4);
      cwall2("clOuterE", "x", 14.2, -7.4, 7.4);
      cwall2("clOuterS", "z", -7.2, -14.4, 14.4);
      cwall2("clOuterN", "z", 7.2, -14.4, 14.4);
      // The corridor hugs the south wall so it meets the foot of the stairs —
      // anywhere further north would sit under the ramp with no headroom.
      // Four rooms open off it to the north.
      cwall2("clDivW", "x", -10, -7.2, 7.2, [[-6.4, -4.2]]);
      cwall2("clCorrN", "z", -4, -10, 14.2,
        [[-8.4, -6], [-2.7, -0.3], [3.3, 5.7], [9.5, 11.9]]);
      for (const dx of [-4.5, 1.5, 7.5]) cwall2("clRoomDiv", "x", dx, -4, 7.2);

      // Heavy stone ribs and doorway surrounds break up the long, boxy shell.
      // They also make every room readable from the corridor at a glance.
      for (const bx of [-9.7, -4.5, 1.5, 7.5, 13.8]) {
        cbox("clCeilRib", 0.28, 0.28, 3.0, bx, CEIL - 0.14, -5.55, trimM, false);
        cbox("clRibFoot", 0.34, CH2 - 0.28, 0.34, bx, FL + (CH2 - 0.28) / 2, -6.88, trimM, false);
        cbox("clRibFoot", 0.34, CH2 - 0.28, 0.34, bx, FL + (CH2 - 0.28) / 2, -4.18, trimM, false);
      }
      const roomDoors = [[-8.4, -6], [-2.7, -0.3], [3.3, 5.7], [9.5, 11.9]];
      for (const [x1, x2] of roomDoors) {
        cbox("clDoorTrim", 0.22, 2.55, 0.56, x1, FL + 1.275, -4, trimM, false);
        cbox("clDoorTrim", 0.22, 2.55, 0.56, x2, FL + 1.275, -4, trimM, false);
        cbox("clDoorLintel", x2 - x1 + 0.22, 0.24, 0.58, (x1 + x2) / 2, FL + 2.52, -4, trimM, false);
      }

      // ---- shaft walls between hall floor and cellar ceiling ----
      const shaftH = 0.09 - CEIL + 0.4;
      const shaftY = CEIL + shaftH / 2 - 0.2;
      cbox("clShaftW", WT, shaftH, OPEN.z2 - OPEN.z1, OPEN.x1 - 0.1, shaftY, (OPEN.z1 + OPEN.z2) / 2, wallM);
      cbox("clShaftE", WT, shaftH, OPEN.z2 - OPEN.z1, OPEN.x2 + 0.1, shaftY, (OPEN.z1 + OPEN.z2) / 2, wallM);
      cbox("clShaftS", OPEN.x2 - OPEN.x1, shaftH, WT, (OPEN.x1 + OPEN.x2) / 2, shaftY, OPEN.z1 - 0.1, wallM);

      // ---- the staircase: a smooth collision ramp + full visible steps ----
      const RUN = OPEN.z2 - OPEN.z1;            // 10 m horizontal
      const DROP = 0.09 - FL;                   // 5.09 m vertical
      const ang = Math.atan2(DROP, RUN);
      const shaftX = (OPEN.x1 + OPEN.x2) / 2;
      const ramp = BABYLON.MeshBuilder.CreateBox("clRamp", {
        width: 3.4, height: 0.4, depth: Math.hypot(RUN, DROP),
      }, scene);
      ramp.position.set(cx + shaftX, (0.09 + FL) / 2 - 0.2 / Math.cos(ang), cz + (OPEN.z1 + OPEN.z2) / 2);
      ramp.rotation.x = -ang;                   // +Z end sits high
      ramp.material = wallM;
      ramp.checkCollisions = true;
      ramp.isVisible = false;                   // collision only; never cover the real steps
      ramp.isPickable = false;
      ramp.freezeWorldMatrix();
      cellar.push(ramp);
      const STEPS = 17, run = RUN / STEPS, rise = DROP / STEPS;
      for (let i = 0; i < STEPS; i++) {
        // Solid masonry blocks hide the collision ramp and give the staircase
        // a clear stepped silhouette from every camera angle.
        const topY = 0.09 - i * rise;
        const blockH = topY - FL;
        cbox("clStepBlock" + i, 3.28, blockH, run, shaftX,
          FL + blockH / 2, OPEN.z2 - (i + 0.5) * run, wallM, false);
        cbox("clStepTread" + i, 3.14, 0.07, run * 0.9, shaftX,
          topY + 0.035, OPEN.z2 - (i + 0.5) * run, stairM, false);
        // Thin brass nosing catches the lantern light and makes every step legible.
        if (!PARK.lowQuality) {
          cbox("clStepEdge" + i, 3.18, 0.075, 0.065, shaftX,
            topY + 0.04, OPEN.z2 - (i + 1) * run + 0.035, brassM, false);
        }
      }
      // Railing follows the descent. Previously every post sat at hall height,
      // leaving most of the stairwell with no visible rail at all.
      for (let i = 0; i <= 8; i++) {
        const f = i / 8;
        const rz = OPEN.z2 - f * RUN;
        const floorY = 0.09 - f * DROP;
        ccyl("clRailPost", 1.0, 0.075, OPEN.x2 + 0.05, floorY + 0.5, rz, ironM);
      }
      const rail = BABYLON.MeshBuilder.CreateTube("clRail", {
        path: [
          new BABYLON.Vector3(cx + OPEN.x2 + 0.05, 1.1, cz + OPEN.z2),
          new BABYLON.Vector3(cx + OPEN.x2 + 0.05, FL + 1.03, cz + OPEN.z1),
        ],
        radius: 0.045, tessellation: 7,
      }, scene);
      rail.material = ironM;
      rail.isPickable = false;
      cellar.push(rail);

      // A proper landing and stone portal announce the stairs from the hall.
      cbox("clLanding", 3.4, 0.12, 1.05, shaftX, 0.055, OPEN.z2 + 0.48, stairM, false);
      cbox("clPortalL", 0.34, 2.75, 0.5, OPEN.x1 - 0.05, 1.38, OPEN.z2 + 0.18, trimM, false);
      cbox("clPortalR", 0.34, 2.75, 0.5, OPEN.x2 + 0.05, 1.38, OPEN.z2 + 0.18, trimM, false);
      cbox("clPortalTop", OPEN.x2 - OPEN.x1 + 0.45, 0.36, 0.52, shaftX, 2.72, OPEN.z2 + 0.18, trimM, false);

      // ---- entrance sign + lantern at the top of the stairs ----
      const signTex = TEX.sign(scene, "ห้องใต้ดิน · ห้ามลง", {
        w: 768, h: 128, bg: "#0d0a14", fg: "#c99aff", glowColor: "#7020c0", fontSize: 62,
      });
      const signM = new BABYLON.StandardMaterial("clSignM", scene);
      signM.diffuseTexture = signTex;
      signM.emissiveTexture = signTex;
      signM.emissiveColor = C3(1, 1, 1);
      signM.disableLighting = true;
      registerFlicker(signM, C3(1, 1, 1), "dying");
      const sign = BABYLON.MeshBuilder.CreatePlane("clSign", { width: 3.4, height: 0.6 }, scene);
      sign.position.set(cx + shaftX, 2.4, cz + OPEN.z2 - 0.13);
      sign.rotation.y = Math.PI;
      sign.material = signM;
      sign.isPickable = false;
      sign.freezeWorldMatrix();

      const lampM = new BABYLON.StandardMaterial("clLampM", scene);
      lampM.emissiveColor = C3(1, 0.62, 0.22);
      lampM.diffuseColor = C3(0.16, 0.09, 0.02);
      lampM.disableLighting = true;
      registerFlicker(lampM, C3(1, 0.62, 0.22), "buzz");
      function lantern(x, y, z) {
        const l = BABYLON.MeshBuilder.CreateSphere("clLantern", { diameter: 0.34, segments: 6 }, scene);
        l.position.set(cx + x, y, cz + z);
        l.material = lampM;
        l.isPickable = false;
        l.freezeWorldMatrix();
        return l;
      }
      // lanterns hug the shaft wall above head height, never the walking line
      lantern(OPEN.x1 + 0.3, 2.9, OPEN.z2 - 0.4);
      lantern(OPEN.x1 + 0.3, -0.55, 1.6);
      lantern(-11, FL + 2.9, -5.4);

      // Wall sconces give the corridor a deliberate rhythm instead of a flat wash.
      for (const [lx, lz] of [[-5.4, -4.22], [0.3, -4.22], [6.5, -4.22], [12.8, -4.22]]) {
        cbox("clSconceArm", 0.08, 0.08, 0.5, lx, FL + 2.45, lz, ironM, false);
        lantern(lx, FL + 2.5, lz - 0.28);
      }

      // Uneven stepping stones and a drain add age without blocking movement.
      for (let i = 0; i < 11; i++) {
        const slab = cbox("clPathSlab", 1.35 + (i % 3) * 0.12, 0.06, 1.0,
          -7.2 + i * 1.85, FL + 0.035, -5.48 + Math.sin(i * 2.1) * 0.12, trimM, false);
        slab.rotation.y = (i % 2 ? 1 : -1) * 0.035;
      }
      const drain = ccyl("clDrain", 0.04, 0.9, 7.3, FL + 0.055, -6.25, ironM);
      for (let i = 0; i < 4; i++) {
        cbox("clDrainSlot", 0.58, 0.025, 0.055, 7.3, FL + 0.085, -6.48 + i * 0.16, brassM, false);
      }

      // Small aged plaques turn the four similar openings into distinct rooms.
      const roomNames = [
        [-7.2, "ห้องเก็บตั๋ว", "#c8a76a"],
        [-1.5, "ห้องเครื่อง", "#e28a45"],
        [4.5, "ห้องคุมขัง", "#79a9d8"],
        [10.7, "ห้องพิธี", "#d65a55"],
      ];
      for (const [sx, label, fg] of roomNames) {
        const plaqueTex = TEX.sign(scene, label, {
          w: 512, h: 96, bg: "#100d12", fg, glowColor: fg, fontSize: 52,
        });
        const plaqueM = new BABYLON.StandardMaterial("clPlaqueM", scene);
        plaqueM.diffuseTexture = plaqueTex;
        plaqueM.emissiveTexture = plaqueTex;
        plaqueM.emissiveColor = C3(0.45, 0.45, 0.45);
        plaqueM.disableLighting = true;
        const plaque = BABYLON.MeshBuilder.CreatePlane("clPlaque", { width: 1.9, height: 0.42 }, scene);
        plaque.position.set(cx + sx, FL + 3.12, cz - 4.23);
        plaque.material = plaqueM;
        plaque.isPickable = false;
        plaque.freezeWorldMatrix();
      }

      // ---- STAIR HALL (west): barrels and crates by the landing ----
      for (const [bx, bz] of [[-13.2, -6.4], [-12.1, -6.6], [-13.4, -5.1]]) {
        ccyl("clBarrel", 1.1, 0.85, bx, FL + 0.55, bz, woodM, true);
        cbox("clBarrelTop", 0.9, 0.06, 0.9, bx, FL + 1.12, bz, ironM, false);
      }
      cbox("clCrate", 1.1, 1.1, 1.1, -13.1, FL + 0.55, -3.9, woodM);

      // ---- CORRIDOR (south): pipes overhead, a puddle underfoot ----
      for (const pz of [-6.4, -4.6]) {
        const pipe = ccyl("clPipe", 23, 0.22, 2, CEIL - 0.45, pz, brassM);
        pipe.rotation.z = Math.PI / 2;
      }
      for (const px of [-6, 2, 9]) {
        ccyl("clPipeDrop", 0.7, 0.16, px, CEIL - 0.9, -5.5, brassM);
      }
      const puddle = BABYLON.MeshBuilder.CreateDisc("clPuddle", { radius: 1.5, tessellation: 20 }, scene);
      puddle.rotation.x = Math.PI / 2;
      puddle.position.set(cx + 4.5, FL + 0.03, cz - 5.5);
      const puddleM = new BABYLON.StandardMaterial("clPuddleM", scene);
      puddleM.diffuseColor = C3(0.05, 0.07, 0.08);
      puddleM.specularColor = C3(0.6, 0.7, 0.75);
      puddleM.specularPower = 128;
      puddle.material = puddleM;
      puddle.isPickable = false;
      cellar.push(puddle);

      // ---- ROOM 1: old ticket store (shelves of dead tickets) ----
      for (const sz of [6.4, 4.2]) {
        cbox("clShelfBack", 4.6, 0.12, 0.5, -7.2, FL + 1.15, sz, woodM, false);
        cbox("clShelfTop", 4.6, 0.12, 0.5, -7.2, FL + 2.0, sz, woodM, false);
        for (let i = 0; i < 5; i++) {
          const bx = -9.1 + i * 0.95;
          cbox("clTicketStack", 0.5, 0.34, 0.36, bx, FL + 1.38, sz, paperM, false);
          if (i % 3 !== 1) cbox("clTicketStack2", 0.5, 0.3, 0.36, bx, FL + 2.21, sz, paperM, false);
        }
      }
      cbox("clDesk", 2.2, 0.12, 1.1, -8.3, FL + 0.95, 0.6, woodM);
      for (const [lx, lz] of [[-9.2, 0.2], [-7.4, 0.2], [-9.2, 1.0], [-7.4, 1.0]]) {
        ccyl("clDeskLeg", 0.95, 0.1, lx, FL + 0.47, lz, woodM);
      }
      cbox("clLedger", 0.5, 0.08, 0.36, -8.5, FL + 1.05, 0.6, paperM, false);
      for (let i = 0; i < 14; i++) { // spilled tickets on the floor
        const t = cbox("clSpill", 0.24, 0.02, 0.16,
          -9.6 + Math.random() * 4.6, FL + 0.02, -3 + Math.random() * 9, paperM, false);
        t.rotation.y = Math.random() * Math.PI;
      }

      // ---- ROOM 3: spirit cells (barred cages + a trapped ghost) ----
      for (const cell of [[1.9, 4.4], [4.6, 7.1]]) {
        const [x1, x2] = cell;
        const bars = Math.round((x2 - x1) / 0.42);
        for (let i = 0; i <= bars; i++) {
          ccyl("clCellBar", CH2 - 0.2, 0.09, x1 + (i / bars) * (x2 - x1), FL + (CH2 - 0.2) / 2, 4.2, ironM, true);
        }
        cbox("clCellTop", x2 - x1, 0.14, 0.14, (x1 + x2) / 2, FL + CH2 - 0.2, 4.2, ironM, false);
        cwall2("clCellSide", "x", x1, 4.2, 7.2);
        cwall2("clCellSide", "x", x2, 4.2, 7.2);
      }
      for (const [hx, hz] of [[2.6, 5.6], [6.2, 6.1], [5.0, 1.4]]) { // hanging chains
        ccyl("clChain", 1.7, 0.06, hx, CEIL - 0.85, hz, ironM);
        ccyl("clShackle", 0.18, 0.3, hx, CEIL - 1.75, hz, ironM);
      }
      // the prisoner
      const cellGhost = BABYLON.MeshBuilder.CreateCylinder("clCellGhost", {
        height: 1.9, diameterTop: 0.22, diameterBottom: 1.15, tessellation: 10,
      }, scene);
      const cellGhostM = new BABYLON.StandardMaterial("clCellGhostM", scene);
      cellGhostM.diffuseColor = C3(0.8, 0.86, 0.95);
      cellGhostM.emissiveColor = C3(0.28, 0.36, 0.48);
      cellGhostM.alpha = 0.66;
      cellGhostM.disableLighting = true;
      cellGhost.material = cellGhostM;
      cellGhost.isPickable = false;
      for (const ex of [-0.15, 0.15]) {
        const e = BABYLON.MeshBuilder.CreateSphere("clGhostEye", { diameter: 0.1, segments: 5 }, scene);
        e.position.set(ex, 0.5, -0.4);
        e.material = mat(scene, "clGhostEyeM", C3(0.01, 0.01, 0.01));
        e.parent = cellGhost;
        e.isPickable = false;
      }
      PARK.updaters.push((dt, t) => {
        cellGhost.position.set(cx + 3.15, FL + 1.2 + Math.sin(t * 1.3) * 0.18, cz + 5.8 + Math.sin(t * 0.4) * 0.6);
        cellGhost.rotation.y = Math.sin(t * 0.3) * 0.5; // faces the bars
      });

      // ---- ROOM 2: machine room (boiler, gears, pipes) ----
      const boiler = ccyl("clBoiler", 2.9, 2.2, -3.4, FL + 1.45, 5.2, ironM, true);
      const fireM = new BABYLON.StandardMaterial("clFireM", scene);
      fireM.emissiveColor = C3(1, 0.4, 0.06);
      fireM.diffuseColor = C3(0.2, 0.06, 0.01);
      fireM.disableLighting = true;
      registerFlicker(fireM, C3(1, 0.4, 0.06), "buzz");
      const hatch = BABYLON.MeshBuilder.CreatePlane("clHatch", { width: 0.9, height: 0.7 }, scene);
      hatch.position.set(cx - 3.4, FL + 1.1, cz + 4.06);
      hatch.material = fireM;
      hatch.isPickable = false;
      hatch.freezeWorldMatrix();
      for (const [gx, gz, gd] of [[0.3, 6.2, 1.8], [-1.1, 4.9, 1.1], [0.9, 3.9, 0.9]]) {
        const gear = BABYLON.MeshBuilder.CreateTorus("clGear", { diameter: gd, thickness: 0.16, tessellation: 12 }, scene);
        gear.position.set(cx + gx, FL + 1.5, cz + gz);
        gear.material = brassM;
        gear.isPickable = false;
        gear.metadata = { animated: true };
        cellar.push(gear);
        const seed = gx;
        PARK.updaters.push((dt, t) => { gear.rotation.z = t * (0.4 + Math.abs(seed) * 0.05); });
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          const tooth = cbox("clTooth", 0.16, 0.16, 0.16, 0, 0, 0, brassM, false);
          tooth.parent = gear;
          tooth.position.set(Math.cos(a) * gd / 2, Math.sin(a) * gd / 2, 0);
          tooth.rotation.z = a;
          tooth.metadata = { animated: true };
        }
      }
      for (const pz2 of [2.6, 0.4]) {
        ccyl("clPipe2", 5, 0.22, -1.5, CEIL - 0.45, pz2, brassM).rotation.z = Math.PI / 2;
      }
      ccyl("clValve", 0.12, 0.9, -4.2, FL + 2.2, 1.2, ironM).rotation.x = Math.PI / 2;

      // ---- ROOM 4: the ritual altar (a ghost ticket always rests here) ----
      cbox("clAltarBase", 2.6, 0.4, 1.8, 10.7, FL + 0.2, 4.5, wallM);
      cbox("clAltarMid", 2.0, 0.4, 1.4, 10.7, FL + 0.6, 4.5, wallM);
      cbox("clAltarTop", 2.4, 0.3, 1.6, 10.7, FL + 0.95, 4.5, boneM);
      const circle = BABYLON.MeshBuilder.CreateDisc("clCircle", { radius: 2.6, tessellation: 40 }, scene);
      circle.rotation.x = Math.PI / 2;
      circle.position.set(cx + 10.7, FL + 0.03, cz + 4.5);
      const circleM = new BABYLON.StandardMaterial("clCircleM", scene);
      circleM.emissiveColor = C3(0.55, 0.05, 0.04);
      circleM.alpha = 0.5;
      circleM.disableLighting = true;
      registerFlicker(circleM, C3(0.55, 0.05, 0.04), "pulse");
      circle.material = circleM;
      circle.isPickable = false;
      circle.freezeWorldMatrix();
      const ringOuter = BABYLON.MeshBuilder.CreateTorus("clCircleRing", { diameter: 5.2, thickness: 0.09, tessellation: 40 }, scene);
      ringOuter.position.set(cx + 10.7, FL + 0.06, cz + 4.5);
      ringOuter.material = circleM;
      ringOuter.isPickable = false;
      ringOuter.freezeWorldMatrix();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const candleX = 10.7 + Math.cos(a) * 2.3, candleZ = 4.5 + Math.sin(a) * 2.3;
        ccyl("clCandle", 0.5, 0.16, candleX, FL + 0.25, candleZ, boneM);
        lantern(candleX, FL + 0.62, candleZ);
      }
      for (const [sx2, sz2] of [[9.2, 2.4], [12.3, 2.7], [13.1, 5.6]]) {
        const skull = BABYLON.MeshBuilder.CreateSphere("clSkull", { diameter: 0.34, segments: 8 }, scene);
        skull.position.set(cx + sx2, FL + 0.18, cz + sz2);
        skull.scaling.set(0.85, 1, 1.1);
        skull.material = boneM;
        skull.isPickable = false;
        skull.freezeWorldMatrix();
        cellar.push(skull);
      }

      for (const m of cellar) {
        if (!m.metadata || !m.metadata.animated) m.freezeWorldMatrix();
      }

      // ---- cellar lighting: only these lamps reach down here ----
      function cellarLight(name, x, y, z, color, intensity, range, anim) {
        const l = new BABYLON.PointLight(name, new BABYLON.Vector3(cx + x, y, cz + z), scene);
        l.diffuse = color;
        l.intensity = intensity;
        l.range = range;
        l.includedOnlyMeshes = cellar;
        if (anim) PARK.updaters.push((dt, t) => { l.intensity = anim(t); });
        return l;
      }
      // the stairs need their own light at every level, or the descent is a
      // black hole from the hall (the cellar is cut off from moon and sky)
      cellarLight("clLightStairTop", OPEN.x1 + 0.5, 2.6, OPEN.z2 - 0.6, C3(1, 0.62, 0.25), 1.7, 15);
      cellarLight("clLightStairMid", OPEN.x1 + 0.5, -0.6, 1.6, C3(1, 0.58, 0.22), 1.5, 14);
      cellarLight("clLightStair", -12, FL + 2.8, -5.2, C3(1, 0.6, 0.25), 1.6, 16);
      cellarLight("clLightCorrW", -4, FL + 3.2, -5.5, C3(0.5, 0.85, 0.6), 1.2, 20,
        () => (Math.random() < 0.03 ? 0.15 : 1.2));
      cellarLight("clLightCorrE", 9, FL + 3.2, -5.5, C3(0.5, 0.85, 0.6), 1.1, 20);
      cellarLight("clLightStore", -7.2, FL + 3, 1.5, C3(0.95, 0.72, 0.35), 1.1, 16);
      cellarLight("clLightCells", 4.5, FL + 3, 4, C3(0.35, 0.6, 1.0), 1.4, 16);
      cellarLight("clLightAltar", 10.7, FL + 2.2, 4.5, C3(1, 0.16, 0.1), 1.7, 16,
        (t) => 1.2 + 0.6 * Math.sin(t * 1.7));
      cellarLight("clLightBoiler", -3.4, FL + 1.3, 4.3, C3(1, 0.45, 0.1), 1.2, 12,
        (t) => 0.9 + 0.5 * Math.abs(Math.sin(t * 5.3)));

      // keep sun/sky out of the cellar so it stays pitch dark
      if (PARK.hemiLight) PARK.hemiLight.excludedMeshes.push(...cellar);
      if (PARK.moonLight) PARK.moonLight.excludedMeshes.push(...cellar);
    }

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
      // The towers overlap the hall corners, so a cylinder collider would wall
      // off the inside (it used to block the cellar stairs). Collision lives on
      // invisible slabs over the parts that stick out past the hall shell.
      tw.checkCollisions = false;
      const sx2 = Math.sign(tx2), sz2 = Math.sign(tz2);
      const outX = BABYLON.MeshBuilder.CreateBox("caTowerHitX", { width: 2.4, height: 19, depth: 6.5 }, scene);
      outX.position.set(cx + tx2 + sx2 * 2.05, 9.5, cz + tz2);
      const outZ = BABYLON.MeshBuilder.CreateBox("caTowerHitZ", { width: 6.5, height: 19, depth: 2.4 }, scene);
      outZ.position.set(cx + tx2, 9.5, cz + tz2 + sz2 * 2.05);
      for (const hit of [outX, outZ]) {
        hit.isVisible = false;
        hit.isPickable = false;
        hit.checkCollisions = true;
        hit.freezeWorldMatrix();
      }
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
