// ============================================================
// environment.js — compact fully-paved park: sky, ground,
// streets, perimeter, planters, lamps. NO grass anywhere.
// Park is 220x220 m (bounds ±110), everything packed tight.
// ============================================================
"use strict";

// Global shared state between builder files
const PARK = {
  flickers: [],   // { mat, base(Color3), speed, mode }
  updaters: [],   // fn(dt, t)
  colliders: [],  // meshes that block the third-person camera
  mats: {},
  bounds: 110,    // half size of the park (220x220 m)
};

function registerFlicker(mat, baseColor, mode) {
  PARK.flickers.push({
    mat, base: baseColor.clone(),
    seed: Math.random() * 100,
    mode: mode || "buzz", // buzz | dying | pulse
    state: 1,
    timer: 0,
  });
}

function updateFlickers(dt, t) {
  for (const f of PARK.flickers) {
    let k = 1;
    if (f.mode === "buzz") {
      k = 0.88 + 0.12 * Math.sin(t * 31 + f.seed * 7);
      if (Math.random() < 0.006) k *= 0.15;
    } else if (f.mode === "dying") {
      f.timer -= dt;
      if (f.timer <= 0) {
        f.state = f.state > 0.5 ? Math.random() * 0.25 : 0.7 + Math.random() * 0.3;
        f.timer = f.state > 0.5 ? 0.4 + Math.random() * 2.2 : 0.04 + Math.random() * 0.3;
      }
      k = f.state + 0.06 * Math.sin(t * 47 + f.seed);
    } else if (f.mode === "pulse") {
      k = 0.55 + 0.45 * Math.sin(t * 1.4 + f.seed);
    }
    f.mat.emissiveColor.copyFrom(f.base).scaleInPlace(Math.max(0.02, k));
  }
}

function mat(scene, name, diffuse, opts) {
  opts = opts || {};
  const m = new BABYLON.StandardMaterial(name, scene);
  m.diffuseColor = diffuse || new BABYLON.Color3(0.5, 0.5, 0.5);
  m.specularColor = opts.spec || new BABYLON.Color3(0.06, 0.06, 0.08);
  if (opts.emissive) m.emissiveColor = opts.emissive;
  if (opts.tex) { m.diffuseTexture = opts.tex; }
  return m;
}

function buildEnvironment(scene) {
  const C3 = (r, g, b) => new BABYLON.Color3(r, g, b);
  const B = PARK.bounds;

  // ---------- Lighting ----------
  const hemi = new BABYLON.HemisphericLight("hemi", new BABYLON.Vector3(0.2, 1, 0.1), scene);
  hemi.intensity = 0.62;
  hemi.diffuse = C3(0.42, 0.48, 0.72);
  hemi.groundColor = C3(0.05, 0.05, 0.10);

  const moonDir = new BABYLON.Vector3(-0.45, -0.6, -0.55).normalize();
  const moonLight = new BABYLON.DirectionalLight("moon", moonDir, scene);
  moonLight.intensity = 1.05;
  moonLight.diffuse = C3(0.55, 0.62, 0.85);
  moonLight.specular = C3(0.25, 0.3, 0.45);

  // ---------- Fog & sky ----------
  scene.clearColor = new BABYLON.Color4(0.012, 0.015, 0.045, 1);
  scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.0055;
  scene.fogColor = C3(0.045, 0.055, 0.11);
  scene.ambientColor = C3(0.12, 0.13, 0.2);

  const sky = BABYLON.MeshBuilder.CreateSphere("sky", { diameter: 900, sideOrientation: BABYLON.Mesh.BACKSIDE, segments: 16 }, scene);
  const skyMat = new BABYLON.StandardMaterial("skyMat", scene);
  skyMat.emissiveTexture = TEX.stars(scene);
  skyMat.diffuseColor = C3(0, 0, 0);
  skyMat.specularColor = C3(0, 0, 0);
  skyMat.backFaceCulling = false;
  skyMat.fogEnabled = false;
  skyMat.disableLighting = true;
  sky.material = skyMat;
  sky.isPickable = false;
  sky.applyFog = false;

  const moonPlane = BABYLON.MeshBuilder.CreatePlane("moon", { size: 60 }, scene);
  moonPlane.position = new BABYLON.Vector3(200, 240, 260);
  moonPlane.lookAt(BABYLON.Vector3.Zero());
  const moonMat = new BABYLON.StandardMaterial("moonMat", scene);
  moonMat.emissiveTexture = TEX.moon(scene);
  moonMat.opacityTexture = moonMat.emissiveTexture;
  moonMat.disableLighting = true;
  moonMat.fogEnabled = false;
  moonPlane.material = moonMat;
  moonPlane.isPickable = false;

  // ---------- Ground: ALL paved, no grass ----------
  const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 340, height: 340, subdivisions: 4 }, scene);
  const gTex = TEX.pavement(scene);
  gTex.uScale = 46; gTex.vScale = 46;
  const gMat = mat(scene, "groundMat", C3(0.52, 0.53, 0.58), { tex: gTex });
  ground.material = gMat;
  ground.checkCollisions = true;
  ground.freezeWorldMatrix();

  // ---------- Streets (darker asphalt strips) ----------
  const pathMat = mat(scene, "pathMat", C3(0.7, 0.7, 0.76), { tex: TEX.asphalt(scene) });
  pathMat.diffuseTexture.uScale = 3; pathMat.diffuseTexture.vScale = 26;

  function path(name, w, l, x, z, rotY) {
    const p = BABYLON.MeshBuilder.CreateGround(name, { width: w, height: l }, scene);
    p.position.set(x, 0.06, z);
    if (rotY) p.rotation.y = rotY;
    p.material = pathMat;
    p.freezeWorldMatrix();
    return p;
  }
  // main avenue: gate (south) -> plaza
  path("pMain", 12, 92, 0, -64);
  // east-west midway street
  path("pWest", 10, 86, -52, -10, Math.PI / 2);
  path("pEast", 10, 86, 52, -10, Math.PI / 2);
  // north avenue -> castle forecourt
  path("pNorth", 10, 70, 0, 24);
  // side spurs (west: food hall + game booths, east: water park)
  path("pSpurW", 6, 56, -34, -60, Math.PI / 2);
  path("pSpurE", 6, 56, 34, -60, Math.PI / 2);
  // graveyard connector behind the castle
  path("pGrave", 5, 64, 44, 58, Math.PI / 2);

  // plaza disc
  const paveMat = mat(scene, "paveMat", C3(0.72, 0.72, 0.78), { tex: TEX.pavement(scene) });
  paveMat.diffuseTexture.uScale = 9; paveMat.diffuseTexture.vScale = 9;
  const plaza = BABYLON.MeshBuilder.CreateDisc("plaza", { radius: 21, tessellation: 48 }, scene);
  plaza.rotation.x = Math.PI / 2;
  plaza.position.set(0, 0.07, -10);
  plaza.material = paveMat;
  plaza.freezeWorldMatrix();

  // ---------- Perimeter stone wall (with south gate gap) ----------
  const wallM = mat(scene, "perimWallM", C3(0.3, 0.3, 0.34), { tex: TEX.brick(scene, "dark") });
  wallM.diffuseTexture.uScale = 40; wallM.diffuseTexture.vScale = 1.4;
  const WB = B - 0.8;
  const wallSegs = [
    { w: WB - 11, x: -(WB + 11) / 2, z: -WB, rot: 0 }, { w: WB - 11, x: (WB + 11) / 2, z: -WB, rot: 0 },
    { w: 2 * WB, x: 0, z: WB, rot: 0 },
    { w: 2 * WB, x: -WB, z: 0, rot: Math.PI / 2 }, { w: 2 * WB, x: WB, z: 0, rot: Math.PI / 2 },
  ];
  for (const s of wallSegs) {
    const wl = BABYLON.MeshBuilder.CreateBox("perimWall", { width: s.w, height: 2.6, depth: 0.7 }, scene);
    wl.position.set(s.x, 1.3, s.z);
    wl.rotation.y = s.rot;
    wl.material = wallM;
    wl.checkCollisions = true;
    wl.freezeWorldMatrix();
  }
  const pilSrc = BABYLON.MeshBuilder.CreateBox("perimPil", { width: 1.1, height: 3.3, depth: 1.1 }, scene);
  pilSrc.material = wallM;
  pilSrc.position.set(0, -70, 0);
  for (let i = -108; i <= 108; i += 18) {
    for (const [x, z] of [[i, -WB], [i, WB], [-WB, i], [WB, i]]) {
      if (z === -WB && Math.abs(x) < 13) continue; // entrance gap
      const p = pilSrc.createInstance("pp");
      p.position.set(x, 1.65, z);
      p.freezeWorldMatrix();
    }
  }
  // invisible barriers: gate side split; far barrier past the parking lot
  const barriers = [
    { w: 2 * B, x: 0, z: B, rot: 0 },
    { w: 2 * B, x: -B, z: 0, rot: Math.PI / 2 }, { w: 2 * B, x: B, z: 0, rot: Math.PI / 2 },
    { w: B - 11, x: -(B + 11) / 2, z: -B, rot: 0 }, { w: B - 11, x: (B + 11) / 2, z: -B, rot: 0 },
    { w: 2 * B + 60, x: 0, z: -144, rot: 0 },
    { w: 40, x: -B - 20, z: -124, rot: Math.PI / 2 }, { w: 40, x: B + 20, z: -124, rot: Math.PI / 2 },
  ];
  for (const side of barriers) {
    const wall = BABYLON.MeshBuilder.CreateBox("bwall", { width: side.w, height: 6, depth: 0.5 }, scene);
    wall.position.set(side.x, 3, side.z);
    wall.rotation.y = side.rot;
    wall.isVisible = false;
    wall.checkCollisions = true;
    wall.freezeWorldMatrix();
  }

  // ---------- Dead trees in stone planters (no lawns to grow in) ----------
  const trunkMat = mat(scene, "trunkMat", C3(0.23, 0.18, 0.13));
  const deadMat = mat(scene, "deadMat", C3(0.16, 0.13, 0.11));
  const dtrunk = BABYLON.MeshBuilder.CreateCylinder("d_trunk", { height: 6.5, diameterTop: 0.15, diameterBottom: 0.55, tessellation: 6 }, scene);
  dtrunk.material = deadMat;
  const branches = [dtrunk];
  for (let i = 0; i < 5; i++) {
    const br = BABYLON.MeshBuilder.CreateCylinder("d_br", { height: 2.6, diameterTop: 0.04, diameterBottom: 0.14, tessellation: 5 }, scene);
    br.material = deadMat;
    const a = (i / 5) * Math.PI * 2;
    br.position.set(Math.cos(a) * 0.8, 3.4 + i * 0.5, Math.sin(a) * 0.8);
    br.rotation.set(Math.cos(a) * 1.0, 0, Math.sin(a) * 1.0 + 0.3);
    branches.push(br);
  }
  const deadSrc = BABYLON.Mesh.MergeMeshes(branches, true, true, undefined, false, true);
  deadSrc.name = "deadSrc";
  deadSrc.position.set(0, -70, 0);

  const planterM = mat(scene, "planterM", C3(0.4, 0.4, 0.44), { tex: TEX.brick(scene, "light") });
  const planterSrc = BABYLON.MeshBuilder.CreateBox("planterSrc", { width: 2.2, height: 0.8, depth: 2.2 }, scene);
  planterSrc.material = planterM;
  planterSrc.position.set(0, -70, 0);
  const dirtM = mat(scene, "dirtM", C3(0.16, 0.13, 0.1));
  const dirtSrc = BABYLON.MeshBuilder.CreateBox("dirtSrc", { width: 1.9, height: 0.1, depth: 1.9 }, scene);
  dirtSrc.material = dirtM;
  dirtSrc.position.set(0, -70, 0);

  const planterSpots = [
    [-8, -34], [8, -34], [-8, -96], [8, -96],
    [-24, -16], [24, -16], [-24, -4], [24, -4],
    [-70, -16], [-88, -4], [70, -16], [88, -4],
    [-8, 8], [8, 8], [-8, 52], [8, 52],
    [-58, -54], [58, -54], [16, -76], [-16, -44],
  ];
  planterSpots.forEach((s, i) => {
    const pl = planterSrc.createInstance("planter" + i);
    pl.position.set(s[0], 0.4, s[1]);
    pl.checkCollisions = true;
    pl.freezeWorldMatrix();
    const dr = dirtSrc.createInstance("dirt" + i);
    dr.position.set(s[0], 0.82, s[1]);
    dr.freezeWorldMatrix();
    if (i % 3 !== 2) { // most planters hold a dead tree
      const d = deadSrc.createInstance("ptree" + i);
      const sc = 0.45 + Math.random() * 0.3;
      d.position.set(s[0], 3.25 * sc + 0.8, s[1]);
      d.scaling.setAll(sc);
      d.rotation.y = Math.random() * Math.PI * 2;
      d.freezeWorldMatrix();
    }
  });

  // ---------- Lamp posts ----------
  const poleMat = mat(scene, "poleMat", C3(0.13, 0.14, 0.17));
  const lampOnMat = new BABYLON.StandardMaterial("lampOn", scene);
  lampOnMat.diffuseColor = C3(0.2, 0.15, 0.05);
  lampOnMat.emissiveColor = C3(1.0, 0.72, 0.3);
  const lampOnMat2 = lampOnMat.clone("lampOn2");
  const lampDeadMat = mat(scene, "lampDead", C3(0.1, 0.1, 0.12));
  registerFlicker(lampOnMat, C3(1.0, 0.72, 0.3), "buzz");
  registerFlicker(lampOnMat2, C3(1.0, 0.72, 0.3), "dying");

  const lpPole = BABYLON.MeshBuilder.CreateCylinder("lpPole", { height: 5.5, diameter: 0.16, tessellation: 8 }, scene);
  lpPole.material = poleMat;
  const lpArm = BABYLON.MeshBuilder.CreateCylinder("lpArm", { height: 1.2, diameter: 0.1, tessellation: 6 }, scene);
  lpArm.rotation.z = Math.PI / 2;
  lpArm.position.set(0.55, 2.62, 0);
  lpArm.material = poleMat;
  const lampBase = BABYLON.Mesh.MergeMeshes([lpPole, lpArm], true, true, undefined, false, false);
  lampBase.material = poleMat;
  lampBase.name = "lampBase";
  lampBase.position.set(0, -70, 0);

  const bulbSrcOn = BABYLON.MeshBuilder.CreateSphere("bulbOn", { diameter: 0.42, segments: 6 }, scene);
  bulbSrcOn.material = lampOnMat;
  bulbSrcOn.position.set(0, -70, 0);
  const bulbSrcOn2 = bulbSrcOn.clone("bulbOn2");
  bulbSrcOn2.material = lampOnMat2;
  const bulbSrcDead = bulbSrcOn.clone("bulbDead");
  bulbSrcDead.material = lampDeadMat;

  const lampSpots = [];
  for (let z = -100; z <= -30; z += 22) { lampSpots.push([7, z]); lampSpots.push([-7, z]); }
  for (let x = -90; x <= -20; x += 24) { lampSpots.push([x, -16]); lampSpots.push([x, -4]); }
  for (let x = 20; x <= 90; x += 24) { lampSpots.push([x, -16]); lampSpots.push([x, -4]); }
  for (let z = 14; z <= 52; z += 19) { lampSpots.push([6, z]); lampSpots.push([-6, z]); }
  for (let i = 1; i < 8; i += 2) { // diagonals only — keep the four street mouths clear
    const a = (i / 8) * Math.PI * 2;
    lampSpots.push([Math.cos(a) * 19, -10 + Math.sin(a) * 19]);
  }
  lampSpots.forEach((s, i) => {
    const li = lampBase.createInstance("lamp" + i);
    li.position.set(s[0], 2.75, s[1]);
    const towardCenter = Math.atan2(-s[0], -(s[1] + 10));
    li.rotation.y = towardCenter;
    li.freezeWorldMatrix();
    const roll = Math.random();
    const bsrc = roll < 0.15 ? bulbSrcDead : (roll < 0.35 ? bulbSrcOn2 : bulbSrcOn);
    const bi = bsrc.createInstance("bulb" + i);
    bi.position.set(s[0] + Math.sin(towardCenter) * 1.1, 5.15, s[1] + Math.cos(towardCenter) * 1.1);
    bi.freezeWorldMatrix();
  });

  // ---------- Zone point lights ----------
  function pointLight(name, pos, color, intensity, range) {
    const l = new BABYLON.PointLight(name, pos, scene);
    l.diffuse = color;
    l.intensity = intensity;
    l.range = range;
    l.specular = color.scale(0.4);
    return l;
  }
  pointLight("plEntrance", new BABYLON.Vector3(0, 9, -100), C3(1, 0.6, 0.25), 2.0, 55);
  pointLight("plPlaza", new BABYLON.Vector3(0, 8, -10), C3(0.5, 0.6, 1.0), 1.6, 55);
  pointLight("plWestSt", new BABYLON.Vector3(-52, 7, -10), C3(1, 0.55, 0.2), 1.6, 60);
  pointLight("plEastSt", new BABYLON.Vector3(52, 7, -10), C3(0.85, 0.4, 1.0), 1.6, 60);
  pointLight("plWater", new BABYLON.Vector3(65, 8, -75), C3(0.2, 0.8, 0.9), 1.7, 60);
  const redL = pointLight("plTower", new BABYLON.Vector3(95, 25, -10), C3(1, 0.15, 0.1), 1.2, 45);
  PARK.updaters.push((dt, t) => { redL.intensity = 0.8 + 0.5 * Math.sin(t * 2.2); });

  // ---------- Benches & bins ----------
  const woodMat = mat(scene, "benchWood", C3(0.75, 0.65, 0.55), { tex: TEX.planks(scene) });
  const seat = BABYLON.MeshBuilder.CreateBox("b_seat", { width: 1.8, height: 0.08, depth: 0.5 }, scene);
  seat.position.y = 0.45; seat.material = woodMat;
  const back = BABYLON.MeshBuilder.CreateBox("b_back", { width: 1.8, height: 0.5, depth: 0.07 }, scene);
  back.position.set(0, 0.75, -0.24); back.rotation.x = -0.12; back.material = woodMat;
  const legL = BABYLON.MeshBuilder.CreateBox("b_l1", { width: 0.08, height: 0.45, depth: 0.5 }, scene);
  legL.position.set(-0.8, 0.22, 0); legL.material = poleMat;
  const legR = legL.clone("b_l2"); legR.position.x = 0.8;
  const benchSrc = BABYLON.Mesh.MergeMeshes([seat, back, legL, legR], true, true, undefined, true, true);
  benchSrc.name = "benchSrc";
  benchSrc.position.set(0, -70, 0);

  const binMat = mat(scene, "binMat", C3(0.25, 0.3, 0.25), { tex: TEX.metal(scene) });
  const binSrc = BABYLON.MeshBuilder.CreateCylinder("binSrc", { height: 0.9, diameter: 0.55, tessellation: 10 }, scene);
  binSrc.material = binMat;
  binSrc.position.set(0, -70, 0);

  const benchSpots = [
    [16, -26, -0.8], [-16, -26, 0.8], [12, -50, 0], [-12, -72, Math.PI],
    [17, 4, -2.2], [-17, 4, 2.2], [12, 30, Math.PI / 2], [-12, 42, -Math.PI / 2],
    [-40, -20, 0], [40, -20, 0],
  ];
  benchSpots.forEach((s, i) => {
    const b = benchSrc.createInstance("bench" + i);
    b.position.set(s[0], 0, s[1]);
    b.rotation.y = s[2];
    b.freezeWorldMatrix();
    if (i % 2 === 0) {
      const bin = binSrc.createInstance("bin" + i);
      bin.position.set(s[0] + 1.6, 0.45, s[1]);
      if (i % 4 === 0) {
        bin.rotation.z = Math.PI / 2 - 0.1;
        bin.position.y = 0.3;
      }
      bin.freezeWorldMatrix();
    }
  });

  // lone red balloon drifting around the plaza
  const balloon = BABYLON.MeshBuilder.CreateSphere("balloon", { diameter: 0.5, segments: 10 }, scene);
  const balloonMat = new BABYLON.StandardMaterial("balloonMat", scene);
  balloonMat.diffuseColor = C3(0.7, 0.05, 0.05);
  balloonMat.emissiveColor = C3(0.25, 0.02, 0.02);
  balloonMat.specularColor = C3(0.9, 0.9, 0.9);
  balloonMat.specularPower = 128;
  balloon.material = balloonMat;
  const bstring = BABYLON.MeshBuilder.CreateCylinder("bstring", { height: 1.6, diameter: 0.012 }, scene);
  bstring.material = poleMat;
  bstring.parent = balloon;
  bstring.position.y = -1.0;
  PARK.updaters.push((dt, t) => {
    balloon.position.set(
      10 + Math.sin(t * 0.21) * 6,
      2.2 + Math.sin(t * 0.6) * 0.5,
      -16 + Math.cos(t * 0.17) * 7
    );
    balloon.rotation.z = Math.sin(t * 0.8) * 0.1;
  });

  return { ground };
}
