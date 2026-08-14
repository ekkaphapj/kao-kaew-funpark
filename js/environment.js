// ============================================================
// environment.js — sky, ground, paths, fences, trees, lamps
// ============================================================
"use strict";

// Global shared state between builder files
const PARK = {
  flickers: [],   // { mat, base(Color3), speed, mode }
  updaters: [],   // fn(dt, t)
  colliders: [],  // meshes that block the third-person camera
  mats: {},
  bounds: 250,    // half size of park (500x500 m)
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
      // mostly on, tiny high-freq shimmer + rare dropouts
      k = 0.88 + 0.12 * Math.sin(t * 31 + f.seed * 7);
      if (Math.random() < 0.006) k *= 0.15;
    } else if (f.mode === "dying") {
      // fluorescent tube about to die
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
  if (opts.uv) { m.diffuseTexture.uScale = opts.uv[0]; m.diffuseTexture.vScale = opts.uv[1]; }
  return m;
}

function buildEnvironment(scene) {
  const C3 = (r, g, b) => new BABYLON.Color3(r, g, b);

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
  scene.fogDensity = 0.0032;
  scene.fogColor = C3(0.045, 0.055, 0.11);
  scene.ambientColor = C3(0.12, 0.13, 0.2);

  const sky = BABYLON.MeshBuilder.CreateSphere("sky", { diameter: 1500, sideOrientation: BABYLON.Mesh.BACKSIDE, segments: 16 }, scene);
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

  const moonPlane = BABYLON.MeshBuilder.CreatePlane("moon", { size: 80 }, scene);
  moonPlane.position = new BABYLON.Vector3(330, 380, 420);
  moonPlane.lookAt(BABYLON.Vector3.Zero());
  const moonMat = new BABYLON.StandardMaterial("moonMat", scene);
  moonMat.emissiveTexture = TEX.moon(scene);
  moonMat.opacityTexture = moonMat.emissiveTexture;
  moonMat.disableLighting = true;
  moonMat.fogEnabled = false;
  moonPlane.material = moonMat;
  moonPlane.isPickable = false;

  // ---------- Ground ----------
  const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 560, height: 560, subdivisions: 4 }, scene);
  const gTex = TEX.grass(scene);
  gTex.uScale = 70; gTex.vScale = 70;
  const gMat = mat(scene, "groundMat", C3(0.55, 0.6, 0.5), { tex: gTex });
  gMat.maxSimultaneousLights = 8;
  ground.material = gMat;
  ground.checkCollisions = true;
  ground.freezeWorldMatrix();

  // ---------- Paths ----------
  const aTex = TEX.asphalt(scene);
  const pathMat = mat(scene, "pathMat", C3(0.72, 0.72, 0.78), { tex: aTex });
  pathMat.maxSimultaneousLights = 8;
  const paveTex = TEX.pavement(scene);
  const paveMat = mat(scene, "paveMat", C3(0.75, 0.75, 0.8), { tex: paveTex });
  paveMat.maxSimultaneousLights = 8;

  function path(name, w, l, x, z, rotY) {
    const p = BABYLON.MeshBuilder.CreateGround(name, { width: w, height: l }, scene);
    p.position.set(x, 0.06, z);
    if (rotY) p.rotation.y = rotY;
    p.material = pathMat;
    const t = pathMat.diffuseTexture;
    p.freezeWorldMatrix();
    return p;
  }
  pathMat.diffuseTexture.uScale = 3; pathMat.diffuseTexture.vScale = 40;

  // main avenue: entrance (south) -> plaza
  path("pMain", 12, 190, 0, -145);
  // plaza disc
  const plaza = BABYLON.MeshBuilder.CreateDisc("plaza", { radius: 32, tessellation: 48 }, scene);
  plaza.rotation.x = Math.PI / 2;
  plaza.position.y = 0.07;
  paveTex.uScale = 10; paveTex.vScale = 10;
  plaza.material = paveMat;
  plaza.freezeWorldMatrix();
  // west spoke (rides), east spoke (waterpark), north spoke (coaster)
  path("pWest", 10, 130, -80, 0, Math.PI / 2);
  path("pEast", 10, 130, 80, 0, Math.PI / 2);
  path("pNorth", 10, 120, 0, 85);
  // shop street cross path
  path("pShops", 8, 150, 0, -90, Math.PI / 2);

  // ---------- Perimeter fence ----------
  const fencePostSrc = BABYLON.MeshBuilder.CreateBox("fencePost", { width: 0.18, height: 2.4, depth: 0.18 }, scene);
  const fenceMat = mat(scene, "fenceMat", C3(0.16, 0.17, 0.2), { spec: new BABYLON.Color3(0.15, 0.15, 0.2) });
  fencePostSrc.material = fenceMat;
  fencePostSrc.position.set(0, -50, 0); // hide source
  const B = PARK.bounds;
  const step = 5;
  for (let i = -B; i <= B; i += step) {
    for (const [x, z] of [[i, -B], [i, B], [-B, i], [B, i]]) {
      const inst = fencePostSrc.createInstance("fp");
      inst.position.set(x, 1.2, z);
      inst.freezeWorldMatrix();
    }
  }
  // rails
  for (const side of [[0, -B, 0], [0, B, 0], [-B, 0, Math.PI / 2], [B, 0, Math.PI / 2]]) {
    for (const h of [0.7, 1.5, 2.25]) {
      const rail = BABYLON.MeshBuilder.CreateBox("rail", { width: 2 * B + 0.4, height: 0.08, depth: 0.06 }, scene);
      rail.material = fenceMat;
      rail.position.set(side[0], h, side[1]);
      rail.rotation.y = side[2];
      rail.checkCollisions = true;
      rail.freezeWorldMatrix();
    }
  }
  // invisible walls to keep player inside
  for (const side of [[0, -B, 0], [0, B, 0], [-B, 0, Math.PI / 2], [B, 0, Math.PI / 2]]) {
    const wall = BABYLON.MeshBuilder.CreateBox("bwall", { width: 2 * B, height: 6, depth: 0.5 }, scene);
    wall.position.set(side[0], 3, side[1]);
    wall.rotation.y = side[2];
    wall.isVisible = false;
    wall.checkCollisions = true;
    wall.freezeWorldMatrix();
  }

  // ---------- Trees ----------
  const trunkMat = mat(scene, "trunkMat", C3(0.23, 0.18, 0.13));
  const leafMat = mat(scene, "leafMat", C3(0.10, 0.14, 0.09));
  const deadMat = mat(scene, "deadMat", C3(0.16, 0.13, 0.11));

  // leafy tree source
  const trunk = BABYLON.MeshBuilder.CreateCylinder("t_trunk", { height: 5, diameterTop: 0.35, diameterBottom: 0.6, tessellation: 7 }, scene);
  trunk.material = trunkMat;
  const fol1 = BABYLON.MeshBuilder.CreateSphere("t_f1", { diameter: 5.5, segments: 6 }, scene);
  fol1.position.y = 4.4; fol1.scaling.y = 0.85; fol1.material = leafMat;
  const fol2 = BABYLON.MeshBuilder.CreateSphere("t_f2", { diameter: 3.6, segments: 6 }, scene);
  fol2.position.set(1.4, 5.6, 0.6); fol2.material = leafMat;
  const fol3 = BABYLON.MeshBuilder.CreateSphere("t_f3", { diameter: 3.2, segments: 6 }, scene);
  fol3.position.set(-1.3, 5.4, -0.5); fol3.material = leafMat;
  const treeSrc = BABYLON.Mesh.MergeMeshes([trunk, fol1, fol2, fol3], true, true, undefined, false, true);
  treeSrc.name = "treeSrc";
  treeSrc.position.set(0, -60, 0);

  // dead tree source
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
  deadSrc.position.set(0, -60, 0);

  // scatter — avoid center paths / ride zones
  const zonesToAvoid = [
    // main avenue corridor: plaza down to the entrance gate
    { x: 0, z: -60, r: 18 }, { x: 0, z: -110, r: 18 }, { x: 0, z: -145, r: 20 },
    { x: 0, z: -180, r: 20 }, { x: 0, z: -215, r: 24 }, { x: 0, z: -245, r: 30 },
    { x: 0, z: 0, r: 40 }, { x: -80, z: 0, r: 20 }, { x: 80, z: 0, r: 20 },
    { x: 0, z: 85, r: 16 }, { x: 0, z: -90, r: 90 },
    { x: -120, z: 60, r: 45 },   // ferris
    { x: -70, z: -40, r: 25 },   // carousel
    { x: -150, z: -60, r: 30 },  // drop tower + swings
    { x: 120, z: 30, r: 80 },    // waterpark
    { x: 0, z: 170, r: 90 },     // coaster
    { x: 60, z: -160, r: 40 },   // haunted house
    { x: -185, z: -5, r: 26 },   // theater
    { x: -80, z: 100, r: 16 },   // mirror house
    { x: 80, z: 100, r: 17 },    // arcade
    { x: 115, z: -150, r: 18 },  // 4D cinema
    { x: 30, z: 34, r: 10 },     // restrooms
    { x: -200, z: -160, r: 24 }, // maintenance depot
    { x: 130, z: -70, r: 20 },   // food court
    { x: -72, z: -145, r: 32 },  // game booths
    { x: 45, z: 0, r: 14 }, { x: 95, z: 0, r: 12 }, { x: 8, z: 55, r: 8 }, // kiosks
  ];
  function isClear(x, z) {
    for (const zn of zonesToAvoid) {
      const dx = x - zn.x, dz = z - zn.z;
      if (dx * dx + dz * dz < zn.r * zn.r) return false;
    }
    return true;
  }
  let placed = 0, guard = 0;
  while (placed < 110 && guard < 2500) {
    guard++;
    const x = (Math.random() * 2 - 1) * (B - 14);
    const z = (Math.random() * 2 - 1) * (B - 14);
    if (!isClear(x, z)) continue;
    const src = Math.random() < 0.3 ? deadSrc : treeSrc;
    const inst = src.createInstance("tree" + placed);
    const s = 0.7 + Math.random() * 0.9;
    inst.position.set(x, 60 + (src === deadSrc ? 3.25 : 2.5) * s - 60, z); // y offset since source is buried
    inst.position.y = (src === deadSrc ? 3.25 : 2.5) * s;
    inst.scaling.setAll(s);
    inst.rotation.y = Math.random() * Math.PI * 2;
    inst.freezeWorldMatrix();
    placed++;
  }

  // ---------- Lamp posts along paths ----------
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
  lampBase.position.set(0, -60, 0);

  const bulbSrcOn = BABYLON.MeshBuilder.CreateSphere("bulbOn", { diameter: 0.42, segments: 6 }, scene);
  bulbSrcOn.material = lampOnMat;
  bulbSrcOn.position.set(0, -60, 0);
  const bulbSrcOn2 = bulbSrcOn.clone("bulbOn2");
  bulbSrcOn2.material = lampOnMat2;
  const bulbSrcDead = bulbSrcOn.clone("bulbDead");
  bulbSrcDead.material = lampDeadMat;

  const lampSpots = [];
  for (let z = -230; z <= -70; z += 40) { lampSpots.push([7, z]); lampSpots.push([-7, z]); }
  for (let x = -140; x <= -30; x += 36) { lampSpots.push([x, 6]); lampSpots.push([x, -6]); }
  for (let x = 30; x <= 140; x += 36) { lampSpots.push([x, 6]); lampSpots.push([x, -6]); }
  for (let z = 40; z <= 140; z += 40) { lampSpots.push([6, z]); lampSpots.push([-6, z]); }
  // plaza ring
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    lampSpots.push([Math.cos(a) * 30, Math.sin(a) * 30]);
  }
  lampSpots.forEach((s, i) => {
    const li = lampBase.createInstance("lamp" + i);
    li.position.set(s[0], 2.75, s[1]);
    const towardCenter = Math.atan2(-s[0], -s[1]);
    li.rotation.y = towardCenter;
    li.freezeWorldMatrix();
    const roll = Math.random();
    const bsrc = roll < 0.15 ? bulbSrcDead : (roll < 0.35 ? bulbSrcOn2 : bulbSrcOn);
    const bi = bsrc.createInstance("bulb" + i);
    bi.position.set(s[0] + Math.sin(towardCenter) * 1.1, 5.15, s[1] + Math.cos(towardCenter) * 1.1);
    bi.freezeWorldMatrix();
  });

  // ---------- Key point lights (few, scoped by range) ----------
  function pointLight(name, pos, color, intensity, range) {
    const l = new BABYLON.PointLight(name, pos, scene);
    l.diffuse = color;
    l.intensity = intensity;
    l.range = range;
    l.specular = color.scale(0.4);
    return l;
  }
  pointLight("plEntrance", new BABYLON.Vector3(0, 9, -238), C3(1, 0.6, 0.25), 2.0, 70);
  pointLight("plPlaza", new BABYLON.Vector3(0, 8, 0), C3(0.5, 0.6, 1.0), 1.6, 80);
  pointLight("plFerris", new BABYLON.Vector3(-120, 20, 60), C3(0.85, 0.4, 1.0), 1.9, 120);
  pointLight("plShops", new BABYLON.Vector3(0, 6, -90), C3(1, 0.55, 0.2), 1.7, 90);
  pointLight("plWater", new BABYLON.Vector3(120, 8, 30), C3(0.2, 0.8, 0.9), 1.7, 100);
  const redL = pointLight("plTower", new BABYLON.Vector3(-150, 30, -60), C3(1, 0.15, 0.1), 1.4, 80);
  PARK.updaters.push((dt, t) => { redL.intensity = 0.7 + 0.5 * Math.sin(t * 2.2); });

  // ---------- Benches & bins & debris ----------
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
  benchSrc.position.set(0, -60, 0);

  const binMat = mat(scene, "binMat", C3(0.25, 0.3, 0.25), { tex: TEX.metal(scene) });
  const binSrc = BABYLON.MeshBuilder.CreateCylinder("binSrc", { height: 0.9, diameter: 0.55, tessellation: 10 }, scene);
  binSrc.material = binMat;
  binSrc.position.set(0, -60, 0);

  const benchSpots = [
    [10, -50, 0], [-10, -60, Math.PI], [10, -120, 0], [-10, -170, Math.PI],
    [26, 12, -1.2], [-26, 14, 1.2], [12, 26, -2.4], [-40, -8, Math.PI / 2],
    [40, 8, -Math.PI / 2], [8, 60, Math.PI], [-8, 100, 0],
  ];
  benchSpots.forEach((s, i) => {
    const b = benchSrc.createInstance("bench" + i);
    b.position.set(s[0], 0, s[1]);
    b.rotation.y = s[2];
    b.freezeWorldMatrix();
    if (i % 2 === 0) {
      const bin = binSrc.createInstance("bin" + i);
      bin.position.set(s[0] + 1.6, 0.45, s[1]);
      if (i % 4 === 0) { // tipped over bin
        bin.rotation.z = Math.PI / 2 - 0.1;
        bin.position.y = 0.3;
      }
      bin.freezeWorldMatrix();
    }
  });

  // a lone red balloon drifting near the plaza (creepy touch)
  const balloon = BABYLON.MeshBuilder.CreateSphere("balloon", { diameter: 0.5, segments: 10 }, scene);
  const balloonMat = new BABYLON.StandardMaterial("balloonMat", scene);
  balloonMat.diffuseColor = C3(0.7, 0.05, 0.05);
  balloonMat.emissiveColor = C3(0.25, 0.02, 0.02);
  balloonMat.specularColor = C3(0.9, 0.9, 0.9);
  balloonMat.specularPower = 128;
  balloon.material = balloonMat;
  const bstring = BABYLON.MeshBuilder.CreateCylinder("bstring", { height: 1.6, diameter: 0.012 }, scene);
  bstring.material = fenceMat;
  bstring.parent = balloon;
  bstring.position.y = -1.0;
  PARK.updaters.push((dt, t) => {
    balloon.position.set(
      14 + Math.sin(t * 0.21) * 6,
      2.2 + Math.sin(t * 0.6) * 0.5,
      -18 + Math.cos(t * 0.17) * 7
    );
    balloon.rotation.z = Math.sin(t * 0.8) * 0.1;
  });

  return { ground };
}
