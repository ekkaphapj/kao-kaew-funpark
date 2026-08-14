// ============================================================
// rides.js — ferris wheel, carousel, coaster, drop tower, swings
// ============================================================
"use strict";

function buildRides(scene) {
  const C3 = (r, g, b) => new BABYLON.Color3(r, g, b);
  const metalTex = TEX.metal(scene);

  function solidBox(x, z, w, d, h) {
    const b = BABYLON.MeshBuilder.CreateBox("collider", { width: w, height: h || 3, depth: d }, scene);
    b.position.set(x, (h || 3) / 2, z);
    b.isVisible = false;
    b.checkCollisions = true;
    b.freezeWorldMatrix();
  }

  // =========================================================
  // FERRIS WHEEL  (x=-120, z=60)  radius 20
  // =========================================================
  {
    const cx = -120, cz = 60, hubY = 24, R = 20;
    const steelMat = mat(scene, "fwSteel", C3(0.35, 0.36, 0.42), { tex: metalTex });
    const neonMat = new BABYLON.StandardMaterial("fwNeon", scene);
    neonMat.emissiveColor = C3(0.8, 0.3, 1.0);
    neonMat.diffuseColor = C3(0.1, 0.02, 0.12);
    registerFlicker(neonMat, C3(0.8, 0.3, 1.0), "buzz");
    const neonMat2 = new BABYLON.StandardMaterial("fwNeon2", scene);
    neonMat2.emissiveColor = C3(0.2, 0.9, 0.9);
    neonMat2.diffuseColor = C3(0.02, 0.1, 0.1);
    registerFlicker(neonMat2, C3(0.2, 0.9, 0.9), "dying");

    // A-frame supports (both sides)
    for (const sz of [-1, 1]) {
      for (const sx of [-1, 1]) {
        const leg = BABYLON.MeshBuilder.CreateCylinder("fwLeg", { height: 27.5, diameter: 1.0, tessellation: 8 }, scene);
        leg.position.set(cx + sx * 5.5, hubY / 2 - 1, cz + sz * 2.6);
        leg.rotation.z = sx * 0.42;
        leg.material = steelMat;
        leg.freezeWorldMatrix();
      }
    }
    const axle = BABYLON.MeshBuilder.CreateCylinder("fwAxle", { height: 7, diameter: 1.6, tessellation: 10 }, scene);
    axle.rotation.x = Math.PI / 2;
    axle.position.set(cx, hubY, cz);
    axle.material = steelMat;
    axle.freezeWorldMatrix();
    solidBox(cx, cz, 14, 8, 4);

    // wheel root (rotates around Z... actually around axle = around world Z? axle along Z, wheel in XY plane)
    const wheel = new BABYLON.TransformNode("fwWheel", scene);
    wheel.position.set(cx, hubY, cz);

    // rim: two tori
    for (const off of [-1.4, 1.4]) {
      const rim = BABYLON.MeshBuilder.CreateTorus("fwRim", { diameter: R * 2, thickness: 0.45, tessellation: 48 }, scene);
      rim.rotation.x = Math.PI / 2; // torus lies in XZ by default -> rotate to XY
      rim.position.z = off;
      rim.material = steelMat;
      rim.parent = wheel;
    }
    // neon rings
    const neonRim = BABYLON.MeshBuilder.CreateTorus("fwNeonRim", { diameter: R * 2 + 1.2, thickness: 0.16, tessellation: 48 }, scene);
    neonRim.rotation.x = Math.PI / 2;
    neonRim.material = neonMat;
    neonRim.parent = wheel;
    const neonRimIn = BABYLON.MeshBuilder.CreateTorus("fwNeonRim2", { diameter: R * 1.1, thickness: 0.13, tessellation: 40 }, scene);
    neonRimIn.rotation.x = Math.PI / 2;
    neonRimIn.material = neonMat2;
    neonRimIn.parent = wheel;

    // spokes
    const NCAB = 12;
    for (let i = 0; i < NCAB; i++) {
      const a = (i / NCAB) * Math.PI * 2;
      for (const off of [-1.4, 1.4]) {
        const spoke = BABYLON.MeshBuilder.CreateCylinder("fwSpoke", { height: R, diameter: 0.22, tessellation: 6 }, scene);
        spoke.position.set(Math.cos(a) * R / 2, Math.sin(a) * R / 2, off);
        spoke.rotation.z = a + Math.PI / 2;
        spoke.material = steelMat;
        spoke.parent = wheel;
      }
    }

    // cabins (kept upright by counter-rotation)
    const cabinColors = [C3(0.65, 0.15, 0.2), C3(0.15, 0.4, 0.6), C3(0.7, 0.55, 0.1), C3(0.25, 0.5, 0.25)];
    const cabinHolders = [];
    for (let i = 0; i < NCAB; i++) {
      const a = (i / NCAB) * Math.PI * 2;
      const holder = new BABYLON.TransformNode("fwCabH" + i, scene);
      holder.parent = wheel;
      holder.position.set(Math.cos(a) * R, Math.sin(a) * R, 0);
      cabinHolders.push(holder);
      const cab = BABYLON.MeshBuilder.CreateBox("fwCab" + i, { width: 1.9, height: 1.9, depth: 1.7 }, scene);
      cab.position.y = -1.6;
      cab.parent = holder;
      const cm = new BABYLON.StandardMaterial("fwCabM" + i, scene);
      cm.diffuseColor = cabinColors[i % cabinColors.length];
      cm.specularColor = C3(0.2, 0.2, 0.25);
      cab.material = cm;
      const cabRoof = BABYLON.MeshBuilder.CreateCylinder("fwCabR" + i, { height: 0.8, diameterBottom: 2.5, diameterTop: 0.3, tessellation: 8 }, scene);
      cabRoof.position.y = -0.35;
      cabRoof.parent = holder;
      cabRoof.material = cm;
      const hangBar = BABYLON.MeshBuilder.CreateCylinder("fwBar" + i, { height: 1.1, diameter: 0.12 }, scene);
      hangBar.position.y = -0.5;
      hangBar.parent = holder;
      hangBar.material = steelMat;
    }

    // slow haunted rotation with occasional groaning speed change
    let wSpeed = 0.06;
    PARK.updaters.push((dt, t) => {
      wSpeed = 0.055 + 0.02 * Math.sin(t * 0.11);
      wheel.rotation.z += wSpeed * dt;
      for (const h of cabinHolders) h.rotation.z = -wheel.rotation.z;
    });

    // sign at base
    const fwSign = BABYLON.MeshBuilder.CreatePlane("fwSign", { width: 10, height: 1.6 }, scene);
    fwSign.position.set(cx, 3.2, cz - 6.5); // readable from the south path
    const fwTex = TEX.sign(scene, "ชิงช้าสวรรค์เก้าแก้ว", { w: 1024, h: 160, bg: "#140a18", fg: "#e8a0ff", glowColor: "#a030d0", fontSize: 88 });
    const fwSignMat = new BABYLON.StandardMaterial("fwSignMat", scene);
    fwSignMat.diffuseTexture = fwTex; fwSignMat.emissiveTexture = fwTex;
    fwSignMat.emissiveColor = C3(1, 1, 1);
    fwSignMat.backFaceCulling = false;
    fwSign.material = fwSignMat;
    fwSign.freezeWorldMatrix();
  }

  // =========================================================
  // CAROUSEL  (x=-70, z=-40)
  // =========================================================
  {
    const cx = -70, cz = -40, R = 6.5;
    const baseMat = mat(scene, "caBase", C3(0.5, 0.35, 0.2), { tex: TEX.planks(scene) });
    const roofMat = new BABYLON.StandardMaterial("caRoof", scene);
    roofMat.diffuseTexture = TEX.stripes(scene, "#7a1f2b", "#cfc4a0", "carousel");
    roofMat.specularColor = C3(0.1, 0.1, 0.1);
    const goldMat = new BABYLON.StandardMaterial("caGold", scene);
    goldMat.diffuseColor = C3(0.6, 0.45, 0.15);
    goldMat.emissiveColor = C3(0.25, 0.16, 0.03);
    goldMat.specularColor = C3(0.8, 0.7, 0.3);
    goldMat.specularPower = 64;

    // static base + roof
    const platBase = BABYLON.MeshBuilder.CreateCylinder("caPlatBase", { height: 0.5, diameter: R * 2 + 3, tessellation: 24 }, scene);
    platBase.position.set(cx, 0.25, cz);
    platBase.material = baseMat;
    platBase.checkCollisions = true;
    platBase.freezeWorldMatrix();
    const roof = BABYLON.MeshBuilder.CreateCylinder("caRoofC", { height: 3.2, diameterBottom: R * 2 + 4, diameterTop: 0.6, tessellation: 16 }, scene);
    roof.position.set(cx, 7.6, cz);
    roof.material = roofMat;
    roof.freezeWorldMatrix();
    const finial = BABYLON.MeshBuilder.CreateSphere("caFin", { diameter: 1.1, segments: 8 }, scene);
    finial.position.set(cx, 9.6, cz);
    finial.material = goldMat;
    finial.freezeWorldMatrix();

    // rotating group
    const rot = new BABYLON.TransformNode("caRot", scene);
    rot.position.set(cx, 0, cz);
    const deck = BABYLON.MeshBuilder.CreateCylinder("caDeck", { height: 0.3, diameter: R * 2 + 1.6, tessellation: 24 }, scene);
    deck.position.y = 0.62;
    deck.material = goldMat;
    deck.parent = rot;
    const column = BABYLON.MeshBuilder.CreateCylinder("caCol", { height: 6.0, diameter: 1.0, tessellation: 12 }, scene);
    column.position.y = 3.5;
    column.material = goldMat;
    column.parent = rot;

    // build one horse from primitives, then clone
    function makeHorse(color) {
      const root = new BABYLON.TransformNode("horseRoot", scene);
      const hm = new BABYLON.StandardMaterial("horseMat", scene);
      hm.diffuseColor = color;
      hm.specularColor = C3(0.25, 0.25, 0.3);
      hm.specularPower = 48;
      const body = BABYLON.MeshBuilder.CreateSphere("hBody", { diameterX: 0.55, diameterY: 0.65, diameterZ: 1.5, segments: 8 }, scene);
      body.position.y = 1.05;
      body.material = hm; body.parent = root;
      const neck = BABYLON.MeshBuilder.CreateCylinder("hNeck", { height: 0.65, diameterBottom: 0.34, diameterTop: 0.2, tessellation: 8 }, scene);
      neck.position.set(0, 1.5, 0.6);
      neck.rotation.x = -0.5;
      neck.material = hm; neck.parent = root;
      const head = BABYLON.MeshBuilder.CreateSphere("hHead", { diameterX: 0.28, diameterY: 0.34, diameterZ: 0.72, segments: 8 }, scene);
      head.position.set(0, 1.78, 0.85);
      head.rotation.x = 0.5;
      head.material = hm; head.parent = root;
      // ears
      const ear = BABYLON.MeshBuilder.CreateCylinder("hEar", { height: 0.16, diameterBottom: 0.08, diameterTop: 0.01 }, scene);
      ear.position.set(0.07, 1.98, 0.72); ear.material = hm; ear.parent = root;
      const ear2 = ear.clone("hEar2"); ear2.position.x = -0.07; ear2.parent = root;
      // legs (posed mid-gallop)
      const legPos = [[0.16, 0.5], [-0.16, 0.5], [0.16, -0.5], [-0.16, -0.5]];
      legPos.forEach((lp, li) => {
        const leg = BABYLON.MeshBuilder.CreateCylinder("hLeg" + li, { height: 0.72, diameterTop: 0.14, diameterBottom: 0.07, tessellation: 6 }, scene);
        leg.position.set(lp[0], 0.62, lp[1]);
        leg.rotation.x = (li < 2 ? 0.5 : -0.5);
        leg.material = hm; leg.parent = root;
      });
      // tail
      const tail = BABYLON.MeshBuilder.CreateCylinder("hTail", { height: 0.5, diameterBottom: 0.16, diameterTop: 0.03, tessellation: 6 }, scene);
      tail.position.set(0, 1.1, -0.85);
      tail.rotation.x = 2.4;
      tail.material = hm; tail.parent = root;
      return root;
    }

    const horseColors = [C3(0.85, 0.82, 0.78), C3(0.45, 0.25, 0.2), C3(0.2, 0.22, 0.3), C3(0.6, 0.5, 0.35)];
    const NH = 10;
    const horses = [];
    for (let i = 0; i < NH; i++) {
      const a = (i / NH) * Math.PI * 2;
      const pole = BABYLON.MeshBuilder.CreateCylinder("caPole" + i, { height: 5.4, diameter: 0.09, tessellation: 6 }, scene);
      pole.position.set(Math.cos(a) * R * 0.8, 3.4, Math.sin(a) * R * 0.8);
      pole.material = goldMat;
      pole.parent = rot;
      const horse = makeHorse(horseColors[i % horseColors.length]);
      horse.parent = rot;
      horse.position.set(Math.cos(a) * R * 0.8, 0.8, Math.sin(a) * R * 0.8);
      horse.rotation.y = -a - Math.PI / 2 + Math.PI;
      horses.push({ node: horse, phase: i * 1.7, baseY: 0.8 });
    }
    // one horse missing from its pole — lying tipped on the ground nearby (creepy)
    const fallen = makeHorse(C3(0.8, 0.78, 0.72));
    fallen.position.set(cx + R + 4, 0.35, cz + 3);
    fallen.rotation.z = Math.PI / 2 - 0.15;
    fallen.rotation.y = 0.7;

    // haunted behaviour: usually slow, occasionally spins up briefly
    let caSpeed = 0.12, caTarget = 0.12, caTimer = 8;
    PARK.updaters.push((dt, t) => {
      caTimer -= dt;
      if (caTimer <= 0) {
        caTarget = Math.random() < 0.25 ? 1.6 : 0.10 + Math.random() * 0.15;
        caTimer = caTarget > 1 ? 4 + Math.random() * 3 : 9 + Math.random() * 14;
      }
      caSpeed += (caTarget - caSpeed) * Math.min(1, dt * 0.8);
      rot.rotation.y += caSpeed * dt;
      for (const h of horses) {
        h.node.position.y = h.baseY + Math.sin(rot.rotation.y * 2.4 + h.phase) * 0.34;
      }
    });

    // carousel sign
    const caSign = BABYLON.MeshBuilder.CreatePlane("caSign", { width: 7, height: 1.2 }, scene);
    caSign.position.set(cx, 5.4, cz - R - 1.6); // readable from the south
    const caTex = TEX.sign(scene, "ม้าหมุนมรณะ", { w: 1024, h: 170, bg: "#180d08", fg: "#ffcf6a", glowColor: "#c07010", fontSize: 100 });
    const caSignMat = new BABYLON.StandardMaterial("caSignMat", scene);
    caSignMat.diffuseTexture = caTex; caSignMat.emissiveTexture = caTex;
    caSignMat.emissiveColor = C3(0.9, 0.9, 0.9);
    caSignMat.backFaceCulling = false;
    registerFlicker(caSignMat, C3(0.95, 0.95, 0.95), "buzz");
    caSign.material = caSignMat;
    caSign.freezeWorldMatrix();
  }

  // =========================================================
  // ROLLER COASTER  (north zone, loop around z=170)
  // =========================================================
  {
    const ctr = { x: 0, z: 175 };
    const raw = [
      [-95, 2.5, 130], [-115, 3, 175], [-90, 10, 215], [-45, 16, 230],
      [0, 22, 235], [45, 15, 228], [88, 8, 210], [110, 4, 170],
      [92, 12, 132], [55, 20, 120], [15, 26, 128], [-20, 18, 122],
      [-55, 6, 118], [-80, 2.5, 120],
    ].map(p => new BABYLON.Vector3(p[0], p[1] + 1.5, p[2]));
    const curve = BABYLON.Curve3.CreateCatmullRomSpline(raw, 14, true);
    const pts = curve.getPoints();

    // arc-length table
    const dists = [0];
    for (let i = 1; i < pts.length; i++) {
      dists.push(dists[i - 1] + BABYLON.Vector3.Distance(pts[i], pts[i - 1]));
    }
    const totalLen = dists[dists.length - 1];
    function sample(s) {
      s = ((s % totalLen) + totalLen) % totalLen;
      let lo = 0, hi = dists.length - 1;
      while (lo < hi - 1) {
        const mid = (lo + hi) >> 1;
        if (dists[mid] <= s) lo = mid; else hi = mid;
      }
      const f = (s - dists[lo]) / Math.max(0.0001, dists[hi] - dists[lo]);
      const p = BABYLON.Vector3.Lerp(pts[lo], pts[hi % pts.length], f);
      const tan = pts[hi % pts.length].subtract(pts[lo]).normalize();
      return { p, tan };
    }

    // rails: offset left/right horizontally
    const up = new BABYLON.Vector3(0, 1, 0);
    const railL = [], railR = [];
    for (let i = 0; i < pts.length; i++) {
      const iNext = (i + 1) % pts.length;
      const tan = pts[iNext].subtract(pts[i]);
      tan.normalize();
      const side = BABYLON.Vector3.Cross(up, tan).normalize();
      railL.push(pts[i].add(side.scale(0.65)));
      railR.push(pts[i].subtract(side.scale(0.65)));
    }
    railL.push(railL[0].clone());
    railR.push(railR[0].clone());
    const railMat = new BABYLON.StandardMaterial("rcRail", scene);
    railMat.diffuseColor = C3(0.55, 0.12, 0.1);
    railMat.specularColor = C3(0.4, 0.3, 0.3);
    railMat.specularPower = 48;
    for (const rp of [railL, railR]) {
      const tube = BABYLON.MeshBuilder.CreateTube("rcTube", { path: rp, radius: 0.16, tessellation: 7 }, scene);
      tube.material = railMat;
      tube.freezeWorldMatrix();
    }
    // crossties
    const tieMat = mat(scene, "rcTie", C3(0.2, 0.2, 0.24), { tex: metalTex });
    const tieSrc = BABYLON.MeshBuilder.CreateBox("rcTieSrc", { width: 1.7, height: 0.12, depth: 0.3 }, scene);
    tieSrc.material = tieMat;
    tieSrc.position.set(0, -60, 0);
    for (let i = 0; i < pts.length; i += 3) {
      const iNext = (i + 1) % pts.length;
      const tie = tieSrc.createInstance("tie" + i);
      tie.position.copyFrom(pts[i]);
      tie.position.y -= 0.25;
      const tan = pts[iNext].subtract(pts[i]);
      tie.rotation.y = Math.atan2(tan.x, tan.z);
      tie.rotation.x = -Math.asin(tan.normalize().y);
      tie.freezeWorldMatrix();
    }
    // support columns
    const colSrc = BABYLON.MeshBuilder.CreateCylinder("rcColSrc", { height: 1, diameter: 0.55, tessellation: 8 }, scene);
    colSrc.material = tieMat;
    colSrc.position.set(0, -60, 0);
    for (let i = 0; i < pts.length; i += 9) {
      const h = pts[i].y - 0.4;
      if (h < 1.2) continue;
      const col = colSrc.createInstance("rcCol" + i);
      col.position.set(pts[i].x, h / 2, pts[i].z);
      col.scaling.y = h;
      col.freezeWorldMatrix();
    }

    // station platform
    const station = BABYLON.MeshBuilder.CreateBox("rcStation", { width: 16, height: 2.4, depth: 7 }, scene);
    station.position.set(-95, 1.2, 124);
    const stMat = mat(scene, "rcStMat", C3(0.4, 0.3, 0.28), { tex: TEX.planks(scene) });
    station.material = stMat;
    station.checkCollisions = true;
    PARK.colliders.push(station);
    station.freezeWorldMatrix();
    const stRoof = BABYLON.MeshBuilder.CreateBox("rcStRoof", { width: 17, height: 0.3, depth: 8 }, scene);
    stRoof.position.set(-95, 6.4, 124);
    stRoof.material = stMat;
    stRoof.freezeWorldMatrix();
    for (const c of [[-102, 121], [-88, 121], [-102, 127], [-88, 127]]) {
      const pil = BABYLON.MeshBuilder.CreateCylinder("rcStPil", { height: 4, diameter: 0.3 }, scene);
      pil.position.set(c[0], 4.4, c[1]);
      pil.material = tieMat;
      pil.freezeWorldMatrix();
    }
    const rcSign = BABYLON.MeshBuilder.CreatePlane("rcSign", { width: 12, height: 1.8 }, scene);
    rcSign.position.set(-95, 8, 124);
    const rcTex = TEX.sign(scene, "รถไฟเหาะนรกแตก", { w: 1024, h: 160, bg: "#1a0505", fg: "#ff6a4a", glowColor: "#d02000", fontSize: 96 });
    const rcSignMat = new BABYLON.StandardMaterial("rcSignMat", scene);
    rcSignMat.diffuseTexture = rcTex; rcSignMat.emissiveTexture = rcTex;
    rcSignMat.emissiveColor = C3(1, 1, 1);
    rcSignMat.backFaceCulling = false;
    registerFlicker(rcSignMat, C3(1, 1, 1), "buzz");
    rcSign.material = rcSignMat;
    rcSign.freezeWorldMatrix();

    // ghost train — runs by itself, empty
    const NCARS = 4, CARLEN = 3.2;
    const cars = [];
    const carMat = new BABYLON.StandardMaterial("rcCarMat", scene);
    carMat.diffuseColor = C3(0.55, 0.1, 0.12);
    carMat.specularColor = C3(0.3, 0.25, 0.25);
    carMat.specularPower = 32;
    const carFrontMat = carMat.clone("rcCarFront");
    carFrontMat.emissiveColor = C3(0.25, 0.03, 0.03);
    for (let i = 0; i < NCARS; i++) {
      const car = BABYLON.MeshBuilder.CreateBox("rcCar" + i, { width: 1.7, height: 0.9, depth: 2.6 }, scene);
      car.material = i === 0 ? carFrontMat : carMat;
      // seat back
      const sb = BABYLON.MeshBuilder.CreateBox("rcSeat" + i, { width: 1.6, height: 0.5, depth: 0.15 }, scene);
      sb.position.set(0, 0.65, -0.9);
      sb.material = carMat;
      sb.parent = car;
      cars.push(car);
    }
    let trainS = 0, trainV = 6;
    PARK.updaters.push((dt, t) => {
      // physics-ish: gravity affects speed along track
      const cur = sample(trainS);
      const slope = cur.tan.y;
      trainV += (-slope * 9.8 - 0.35 - trainV * 0.012) * dt * 2.2;
      if (trainV < 4) trainV = 4;
      if (trainV > 26) trainV = 26;
      trainS += trainV * dt;
      for (let i = 0; i < NCARS; i++) {
        const s = trainS - i * CARLEN;
        const smp = sample(s);
        const ahead = sample(s + 1.2);
        cars[i].position.copyFrom(smp.p);
        cars[i].position.y += 0.55;
        cars[i].lookAt(new BABYLON.Vector3(ahead.p.x, ahead.p.y + 0.55, ahead.p.z));
      }
    });
  }

  // =========================================================
  // DROP TOWER  "หอสูงสยอง"  (x=-150, z=-60)
  // =========================================================
  {
    const tx = -150, tz = -60, H = 42;
    const steelMat = mat(scene, "dtSteel", C3(0.45, 0.46, 0.52), { tex: metalTex });
    const tower = BABYLON.MeshBuilder.CreateCylinder("dtTower", { height: H, diameter: 2.4, tessellation: 12 }, scene);
    tower.position.set(tx, H / 2, tz);
    tower.material = steelMat;
    tower.checkCollisions = true;
    PARK.colliders.push(tower);
    tower.freezeWorldMatrix();
    // lattice rings on the tower
    for (let y = 4; y < H; y += 6) {
      const ring = BABYLON.MeshBuilder.CreateTorus("dtRing", { diameter: 3.2, thickness: 0.18, tessellation: 12 }, scene);
      ring.position.set(tx, y, tz);
      ring.material = steelMat;
      ring.freezeWorldMatrix();
    }
    // top beacon (red, pulsing)
    const beaconMat = new BABYLON.StandardMaterial("dtBeacon", scene);
    beaconMat.emissiveColor = C3(1, 0.1, 0.08);
    beaconMat.diffuseColor = C3(0.2, 0.02, 0.02);
    registerFlicker(beaconMat, C3(1, 0.12, 0.08), "pulse");
    const beacon = BABYLON.MeshBuilder.CreateSphere("dtBeaconS", { diameter: 1.2, segments: 8 }, scene);
    beacon.position.set(tx, H + 1, tz);
    beacon.material = beaconMat;
    beacon.freezeWorldMatrix();
    const topCap = BABYLON.MeshBuilder.CreateCylinder("dtCap", { height: 1.6, diameterBottom: 4, diameterTop: 1.2, tessellation: 10 }, scene);
    topCap.position.set(tx, H - 0.4, tz);
    topCap.material = steelMat;
    topCap.freezeWorldMatrix();

    // seat carriage ring
    const carriage = new BABYLON.TransformNode("dtCarriage", scene);
    carriage.position.set(tx, 3, tz);
    const cRing = BABYLON.MeshBuilder.CreateTorus("dtCRing", { diameter: 5.6, thickness: 0.5, tessellation: 16 }, scene);
    cRing.material = steelMat;
    cRing.parent = carriage;
    const seatMat = new BABYLON.StandardMaterial("dtSeat", scene);
    seatMat.diffuseColor = C3(0.6, 0.5, 0.1);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const seat = BABYLON.MeshBuilder.CreateBox("dtSeatB" + i, { width: 0.8, height: 1.1, depth: 0.7 }, scene);
      seat.position.set(Math.cos(a) * 2.8, -0.6, Math.sin(a) * 2.8);
      seat.rotation.y = -a + Math.PI / 2;
      seat.material = seatMat;
      seat.parent = carriage;
    }
    // state machine: rise → hold → DROP → rest
    let phase = 0, timer = 3, y = 3, v = 0;
    PARK.updaters.push((dt, t) => {
      timer -= dt;
      if (phase === 0) {          // rising
        y += 2.2 * dt;
        if (y >= H - 6) { y = H - 6; phase = 1; timer = 2.5 + Math.random() * 3; }
      } else if (phase === 1) {   // ominous hold at top
        if (timer <= 0) { phase = 2; v = 0; }
      } else if (phase === 2) {   // free fall
        v += 22 * dt;
        y -= v * dt;
        if (y <= 3) { y = 3; phase = 3; timer = 3 + Math.random() * 4; }
      } else {                    // rest at bottom
        if (timer <= 0) { phase = 0; }
      }
      carriage.position.y = y;
    });

    const dtSign = BABYLON.MeshBuilder.CreatePlane("dtSignP", { width: 8, height: 1.4 }, scene);
    dtSign.position.set(tx, 2.4, tz + 5); // between tower and the west path, readable from the north
    dtSign.rotation.y = Math.PI;
    const dtTex = TEX.sign(scene, "หอสูงสยองขวัญ", { w: 1024, h: 170, bg: "#120606", fg: "#ff9a9a", glowColor: "#c02020", fontSize: 96 });
    const dtSignMat = new BABYLON.StandardMaterial("dtSignMat", scene);
    dtSignMat.diffuseTexture = dtTex; dtSignMat.emissiveTexture = dtTex;
    dtSignMat.emissiveColor = C3(0.9, 0.9, 0.9);
    dtSignMat.backFaceCulling = false;
    dtSign.material = dtSignMat;
    dtSign.freezeWorldMatrix();
  }

  // =========================================================
  // SWING RIDE (chair-o-planes)  (x=-40, z=55)
  // =========================================================
  {
    const sx = -40, sz = 55;
    const steelMat = mat(scene, "swSteel", C3(0.4, 0.38, 0.3), { tex: metalTex });
    const colMain = BABYLON.MeshBuilder.CreateCylinder("swCol", { height: 13, diameterBottom: 1.6, diameterTop: 1.0, tessellation: 10 }, scene);
    colMain.position.set(sx, 6.5, sz);
    colMain.material = steelMat;
    colMain.checkCollisions = true;
    PARK.colliders.push(colMain);
    colMain.freezeWorldMatrix();

    const capMat = new BABYLON.StandardMaterial("swCap", scene);
    capMat.diffuseTexture = TEX.stripes(scene, "#6a5a1f", "#2b2317", "swing");
    const topRot = new BABYLON.TransformNode("swTop", scene);
    topRot.position.set(sx, 12.2, sz);
    const cap = BABYLON.MeshBuilder.CreateCylinder("swCapC", { height: 1.8, diameterBottom: 9.5, diameterTop: 2, tessellation: 14 }, scene);
    cap.material = capMat;
    cap.parent = topRot;

    const chairMat = new BABYLON.StandardMaterial("swChair", scene);
    chairMat.diffuseColor = C3(0.55, 0.15, 0.15);
    const chainMat = mat(scene, "swChain", C3(0.3, 0.3, 0.33));
    const NCH = 10;
    for (let i = 0; i < NCH; i++) {
      const a = (i / NCH) * Math.PI * 2;
      const pivot = new BABYLON.TransformNode("swPiv" + i, scene);
      pivot.parent = topRot;
      pivot.position.set(Math.cos(a) * 4.4, -0.8, Math.sin(a) * 4.4);
      // fixed outward tilt (as if ride is running)
      pivot.rotation.set(Math.sin(a) * 0.55, 0, -Math.cos(a) * 0.55);
      const chain = BABYLON.MeshBuilder.CreateCylinder("swChainC" + i, { height: 4.6, diameter: 0.06, tessellation: 5 }, scene);
      chain.position.y = -2.3;
      chain.material = chainMat;
      chain.parent = pivot;
      if (i === 3) continue; // one chair missing — chain hangs empty
      const chair = BABYLON.MeshBuilder.CreateBox("swChairB" + i, { width: 0.65, height: 0.5, depth: 0.6 }, scene);
      chair.position.y = -4.75;
      chair.material = chairMat;
      chair.parent = pivot;
      const chairBack = BABYLON.MeshBuilder.CreateBox("swChairBk" + i, { width: 0.65, height: 0.6, depth: 0.1 }, scene);
      chairBack.position.set(0, -4.25, -0.26);
      chairBack.material = chairMat;
      chairBack.parent = pivot;
    }
    PARK.updaters.push((dt, t) => {
      topRot.rotation.y += 0.85 * dt;
    });
  }

  // =========================================================
  // BUMPER CAR HALL (x=45, z=60) — dead, dark, one light inside
  // =========================================================
  {
    const bx = 45, bz = 60;
    const hall = BABYLON.MeshBuilder.CreateBox("bcHall", { width: 24, height: 6, depth: 16 }, scene);
    hall.position.set(bx, 3, bz);
    const hallMat = mat(scene, "bcMat", C3(0.35, 0.4, 0.5), { tex: TEX.metal(scene) });
    hallMat.diffuseTexture.uScale = 6;
    hall.material = hallMat;
    hall.checkCollisions = true;
    PARK.colliders.push(hall);
    hall.freezeWorldMatrix();
    const bcRoof = BABYLON.MeshBuilder.CreateCylinder("bcRoof", { height: 3, diameter: 19, tessellation: 3 }, scene);
    bcRoof.scaling.x = 1.6;
    bcRoof.rotation.y = Math.PI / 2;
    bcRoof.rotation.x = 0;
    bcRoof.position.set(bx, 7.2, bz);
    bcRoof.material = hallMat;
    bcRoof.freezeWorldMatrix();
    // dark doorway with faint green glow inside
    const door = BABYLON.MeshBuilder.CreatePlane("bcDoor", { width: 6, height: 4.4 }, scene);
    door.position.set(bx, 2.2, bz - 8.05); // visible from the south approach
    const doorMat = new BABYLON.StandardMaterial("bcDoorMat", scene);
    doorMat.diffuseColor = C3(0.01, 0.02, 0.01);
    doorMat.emissiveColor = C3(0.02, 0.09, 0.03);
    registerFlicker(doorMat, C3(0.03, 0.12, 0.04), "dying");
    door.material = doorMat;
    door.freezeWorldMatrix();
    const bcSign = BABYLON.MeshBuilder.CreatePlane("bcSign", { width: 9, height: 1.5 }, scene);
    bcSign.position.set(bx, 5.4, bz - 8.1); // visible from the south approach
    bcSign.rotation.z = -0.06;
    const bcTex = TEX.sign(scene, "รถบั๊มพ์", { w: 768, h: 160, bg: "#0a1408", fg: "#7ae87a", glowColor: "#20a020", fontSize: 104 });
    const bcSignMat = new BABYLON.StandardMaterial("bcSignMat", scene);
    bcSignMat.diffuseTexture = bcTex; bcSignMat.emissiveTexture = bcTex;
    bcSignMat.emissiveColor = C3(0.8, 0.8, 0.8);
    bcSignMat.backFaceCulling = false;
    registerFlicker(bcSignMat, C3(0.85, 0.85, 0.85), "dying");
    bcSign.material = bcSignMat;
    bcSign.freezeWorldMatrix();
    // abandoned bumper cars outside
    const carCols = [C3(0.6, 0.15, 0.15), C3(0.15, 0.35, 0.6), C3(0.6, 0.5, 0.1)];
    for (let i = 0; i < 3; i++) {
      const bc = BABYLON.MeshBuilder.CreateSphere("bcCar" + i, { diameterX: 1.6, diameterY: 0.8, diameterZ: 2.0, segments: 8 }, scene);
      bc.position.set(bx - 8 + i * 4.5, 0.4, bz - 12 + (i % 2) * 2);
      bc.rotation.y = i * 1.9;
      const bcm = new BABYLON.StandardMaterial("bcCarM" + i, scene);
      bcm.diffuseColor = carCols[i];
      bcm.specularColor = C3(0.3, 0.3, 0.35);
      bcm.specularPower = 64;
      bc.material = bcm;
      const pole = BABYLON.MeshBuilder.CreateCylinder("bcPole" + i, { height: 1.8, diameter: 0.06 }, scene);
      pole.position.set(bx - 8 + i * 4.5, 1.4, bz - 12.4 + (i % 2) * 2);
      pole.rotation.x = 0.3;
      pole.material = mat(scene, "bcPoleM", C3(0.2, 0.2, 0.22));
      bc.freezeWorldMatrix(); pole.freezeWorldMatrix();
    }
  }
}
