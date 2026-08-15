// ============================================================
// mission.js — "หนีให้พ้นก่อนฟ้าสาง" co-op objective loop
// Phase 1: collect 9 ghost tickets hidden in the buildings
// Phase 2: feed them into the ticket booth by the gate (2 s each)
// Phase 3: the gate opens for 60 s — everyone still free must escape
// Phase 4: win · Phase 5: lose. Caged friends are rescued by standing
// beside them for 4 s. The elected multiplayer host arbitrates state.
// ============================================================
"use strict";

function createMission(scene, player, audio) {
  const C3 = (r, g, b) => new BABYLON.Color3(r, g, b);
  const REQUIRED = 9;
  const DEPOSIT_POS = { x: -8, z: -96.5, r: 3 };
  const ESCAPE_Z = -113;   // past the gate = out
  const ESCAPE_TIME = 60;
  const REVIVE_TIME = 4;
  const DEPOSIT_TIME = 2;

  // 12 candidate hiding spots, host picks 9 per round
  const SPOTS = [
    { p: [-40.5, 1.9, 21], label: "เวทีโรงละคร" },
    { p: [-64, 1.9, -41.5], label: "โลงศพบ้านผีสิง" },
    { p: [0, 1.8, 90.3], label: "บัลลังก์ปราสาท" },
    { p: [33, 1.2, 18], label: "โรงเกม" },
    { p: [60, 1.2, 19], label: "โรงหนังสี่มิติ" },
    { p: [-78, 1.2, 19.2], label: "บ้านกระจก" },
    { p: [59, 1.2, -40.5], label: "โรงรถบั๊มพ์" },
    { p: [-46, 1.6, -82.8], label: "ศูนย์อาหาร" },
    { p: [-17, 1.3, -68], label: "ร้านน้ำแข็งไส" },
    { p: [98, 1.4, 92.3], label: "หน้าสุสานหิน" },
    { p: [82, 1.2, 19], label: "ใต้ชิงช้าสวรรค์" },
    { p: [72, 1.4, -71.5], label: "ขอบสระสไลเดอร์" },
  ];

  // ---------- state ----------
  let started = false;
  let phase = 1;               // 1 collect, 2 deposit, 3 escape, 4 win, 5 lose
  let spotIdx = null;          // indices of the 9 active spots
  const taken = new Set();     // spot indices already collected
  let deposited = 0;
  let escapeLeft = ESCAPE_TIME;
  const escaped = new Set();   // player ids that made it out
  let myEscaped = false;
  let net = null;
  let myId = "offline";
  let stateTimer = 0;
  let depositProgress = 0;
  let reviveProgress = 0;
  let reviveTargetId = null;
  let endShown = false;
  const hudEl = document.getElementById("mission-hud");
  const endEl = document.getElementById("endgame");
  const endTitle = document.getElementById("endgame-title");
  const endSub = document.getElementById("endgame-sub");

  // ---------- ticket visuals ----------
  const ticketMat = new BABYLON.StandardMaterial("mticketM", scene);
  ticketMat.emissiveColor = C3(1.0, 0.78, 0.25);
  ticketMat.diffuseColor = C3(0.25, 0.18, 0.04);
  ticketMat.disableLighting = true;
  const haloMat = new BABYLON.StandardMaterial("mticketHaloM", scene);
  haloMat.emissiveColor = C3(0.9, 0.65, 0.15);
  haloMat.alpha = 0.22;
  haloMat.disableLighting = true;
  const ticketMeshes = new Map(); // spot index -> node

  function buildTicket(i) {
    const s = SPOTS[i];
    const node = new BABYLON.TransformNode("mticket" + i, scene);
    node.position.set(s.p[0], s.p[1], s.p[2]);
    const card = BABYLON.MeshBuilder.CreateBox("mticketCard" + i, { width: 0.42, height: 0.6, depth: 0.03 }, scene);
    card.material = ticketMat;
    card.parent = node;
    card.isPickable = false;
    const halo = BABYLON.MeshBuilder.CreateDisc("mticketHalo" + i, { radius: 0.55, tessellation: 20 }, scene);
    halo.material = haloMat;
    halo.parent = node;
    halo.isPickable = false;
    halo.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
    const seed = i * 1.7;
    PARK.updaters.push((dt, t) => {
      if (!node.isEnabled()) return;
      node.rotation.y = t * 1.4 + seed;
      node.position.y = s.p[1] + Math.sin(t * 2 + seed) * 0.12;
    });
    ticketMeshes.set(i, node);
    return node;
  }

  function applySpots(indices) {
    if (spotIdx) return;
    spotIdx = indices;
    for (const i of spotIdx) buildTicket(i);
    for (const i of taken) hideTicket(i);
  }

  function hideTicket(i) {
    const m = ticketMeshes.get(i);
    if (m) m.setEnabled(false);
  }

  // ---------- gate bars (down until phase 3) ----------
  const gateNode = new BABYLON.TransformNode("missionGate", scene);
  const gateBarM = new BABYLON.StandardMaterial("gateBarM2", scene);
  gateBarM.diffuseColor = C3(0.16, 0.16, 0.2);
  gateBarM.specularColor = C3(0.3, 0.3, 0.35);
  for (let i = 0; i <= 11; i++) {
    const bar = BABYLON.MeshBuilder.CreateCylinder("mgBar", { height: 5.2, diameter: 0.16, tessellation: 8 }, scene);
    bar.position.set(-11 + i * 2, 2.6, -108.6);
    bar.material = gateBarM;
    bar.parent = gateNode;
    bar.isPickable = false;
  }
  const gateRail = BABYLON.MeshBuilder.CreateBox("mgRail", { width: 22.4, height: 0.22, depth: 0.22 }, scene);
  gateRail.position.set(0, 4.9, -108.6);
  gateRail.material = gateBarM;
  gateRail.parent = gateNode;
  const gateCollider = BABYLON.MeshBuilder.CreateBox("mgCollider", { width: 22.4, height: 5.4, depth: 0.5 }, scene);
  gateCollider.position.set(0, 2.7, -108.6);
  gateCollider.isVisible = false;
  gateCollider.checkCollisions = true;
  let gateOpen = false;
  PARK.updaters.push((dt) => {
    if (gateOpen && gateNode.position.y < 6.2) {
      gateNode.position.y += dt * 2.4; // bars rise out of the way
      if (gateNode.position.y >= 6.2) gateNode.setEnabled(false);
    }
  });

  function openGate() {
    if (gateOpen) return;
    gateOpen = true;
    gateCollider.checkCollisions = false;
    gateCollider.setEnabled(false);
  }

  // glowing drop zone at the ticket booth (phase 2)
  const dropRing = BABYLON.MeshBuilder.CreateTorus("dropRing", { diameter: DEPOSIT_POS.r * 2, thickness: 0.14, tessellation: 32 }, scene);
  dropRing.position.set(DEPOSIT_POS.x, 0.25, DEPOSIT_POS.z);
  const dropRingM = new BABYLON.StandardMaterial("dropRingM", scene);
  dropRingM.emissiveColor = C3(1, 0.7, 0.2);
  dropRingM.disableLighting = true;
  dropRing.material = dropRingM;
  dropRing.isPickable = false;
  dropRing.setEnabled(false);

  // ---------- messaging ----------
  function send(payload) {
    if (net) net.sendMission(payload);
  }

  function handleMsg(msg) {
    if (msg.t === "take") {
      taken.add(msg.i);
      hideTicket(msg.i);
    } else if (msg.t === "dep") {
      // host counts deposits; followers learn via state
      if (isHost()) deposited = Math.min(REQUIRED, deposited + 1);
    } else if (msg.t === "esc") {
      escaped.add(msg.id);
    } else if (msg.t === "rev") {
      if (msg.id === myId) player.revive();
    } else if (msg.t === "state") {
      if (isHost()) return;
      applyHostState(msg);
    }
  }

  function applyHostState(s) {
    if (s.spots) applySpots(s.spots);
    for (const i of s.taken || []) { taken.add(i); hideTicket(i); }
    deposited = s.dep != null ? s.dep : deposited;
    if (s.esc) for (const id of s.esc) escaped.add(id);
    if (s.phase !== phase) enterPhase(s.phase);
    if (s.left != null) escapeLeft = s.left;
  }

  function isHost() {
    return !net || lastCtx == null || lastCtx.isAuthority;
  }

  // ---------- phase transitions (side effects run on every client) ----------
  function enterPhase(p) {
    if (p === phase) return;
    phase = p;
    if (phase === 2) {
      dropRing.setEnabled(true);
      if (audio && audio.playPickup) audio.playPickup();
    } else if (phase === 3) {
      dropRing.setEnabled(false);
      openGate();
      escapeLeft = Math.min(escapeLeft, ESCAPE_TIME);
      if (audio && audio.playAlarm) audio.playAlarm();
    } else if (phase === 4) {
      if (audio && audio.playWin) audio.playWin();
      showEnd(true);
    } else if (phase === 5) {
      if (audio && audio.playLose) audio.playLose();
      showEnd(false);
    }
  }

  function showEnd(win) {
    if (endShown || !endEl) return;
    endShown = true;
    endEl.classList.add("show");
    endEl.classList.toggle("win", win);
    if (endTitle) endTitle.textContent = win ? "🎉 หนีรอดสำเร็จ!" : "☠ ฟ้าสางแล้ว...";
    if (endSub) {
      endSub.textContent = win
        ? "พวกคุณรวบรวมตั๋วครบและหนีออกจากสวนสนุกเก้าแก้วได้ทัน"
        : "ไม่มีใครหนีออกไปได้ นายตรวจตั๋วได้ผู้ชมประจำสวนเพิ่มแล้ว";
    }
  }

  // ---------- HUD ----------
  function setHud(text, tone) {
    if (!hudEl) return;
    hudEl.textContent = text;
    hudEl.className = "show " + (tone || "");
  }

  function updateHud() {
    if (!hudEl) return;
    if (phase === 1) {
      setHud(`🎟 หาตั๋วผีตามอาคาร · ${taken.size}/${REQUIRED}`);
    } else if (phase === 2) {
      if (depositProgress > 0) {
        setHud(`🎟 กำลังหย่อนตั๋ว... ${Math.ceil((DEPOSIT_TIME - depositProgress) * 10) / 10} วิ · ${deposited}/${REQUIRED}`, "hot");
      } else {
        setHud(`🎟 เอาตั๋วไปหย่อนที่ตู้จำหน่ายบัตรหน้าประตู · ${deposited}/${REQUIRED}`);
      }
    } else if (phase === 3) {
      const s = Math.max(0, Math.ceil(escapeLeft));
      setHud(myEscaped ? `🚪 คุณออกมาแล้ว! รอเพื่อน... ${s} วิ` : `🚪 ประตูเปิดแล้ว วิ่ง!! เหลือ ${s} วิ`, "hot");
    } else {
      hudEl.className = "";
    }
    if (reviveTargetId && reviveProgress > 0 && phase < 4) {
      setHud(`🤝 กำลังช่วยเพื่อนออกจากกรง... ${Math.ceil((REVIVE_TIME - reviveProgress) * 10) / 10} วิ`, "hot");
    }
  }

  // ---------- per-frame ----------
  let lastCtx = null;

  function update(dt, ctx) {
    if (!started || !ctx) return;
    lastCtx = ctx;
    myId = ctx.myId || "offline";
    PARK.missionPhase = phase;

    // host: choose spots, arbitrate phases, broadcast state
    if (ctx.isAuthority) {
      if (!spotIdx) {
        const all = SPOTS.map((s, i) => i);
        for (let i = all.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [all[i], all[j]] = [all[j], all[i]];
        }
        applySpots(all.slice(0, REQUIRED).sort((a, b) => a - b));
      }
      if (phase === 1 && taken.size >= REQUIRED) enterPhase(2);
      if (phase === 2 && deposited >= REQUIRED) enterPhase(3);
      if (phase === 3) {
        escapeLeft -= dt;
        const free = ctx.players.filter(p => p.alive !== false && !p.dead);
        if (free.length > 0 && free.every(p => escaped.has(p.id))) enterPhase(4);
        else if (escapeLeft <= 0) enterPhase(5);
      }
      const activePlayers = ctx.players.filter(p => p.alive !== false);
      if (phase < 4 && activePlayers.length > 0 && activePlayers.every(p => p.dead)) enterPhase(5);
      stateTimer -= dt;
      if (stateTimer <= 0) {
        stateTimer = 1;
        send({
          t: "state", phase, spots: spotIdx, taken: [...taken],
          dep: deposited, left: +escapeLeft.toFixed(1), esc: [...escaped],
        });
      }
    } else if (phase === 3) {
      escapeLeft = Math.max(0, escapeLeft - dt);
    }

    const me = player.root.position;

    // pickup tickets
    if (phase === 1 && !player.state.dead && spotIdx) {
      for (const i of spotIdx) {
        if (taken.has(i)) continue;
        const s = SPOTS[i];
        if (Math.hypot(me.x - s.p[0], me.z - s.p[2]) < 1.8 && Math.abs(me.y - s.p[1]) < 3) {
          taken.add(i);
          hideTicket(i);
          send({ t: "take", i });
          if (audio && audio.playPickup) audio.playPickup();
        }
      }
    }

    // deposit at the booth
    if (phase === 2 && !player.state.dead && deposited < REQUIRED &&
        Math.hypot(me.x - DEPOSIT_POS.x, me.z - DEPOSIT_POS.z) < DEPOSIT_POS.r) {
      depositProgress += dt;
      if (depositProgress >= DEPOSIT_TIME) {
        depositProgress = 0;
        if (ctx.isAuthority) deposited = Math.min(REQUIRED, deposited + 1);
        else send({ t: "dep" });
        if (audio && audio.playPickup) audio.playPickup();
      }
    } else {
      depositProgress = 0;
    }

    // escape through the open gate
    if (phase === 3 && !player.state.dead && !myEscaped && me.z < ESCAPE_Z) {
      myEscaped = true;
      escaped.add(myId);
      send({ t: "esc", id: myId });
    }

    // rescue a caged friend: stand beside them for 4 s
    if (!player.state.dead && phase < 4) {
      let near = null;
      for (const p of ctx.players) {
        if (p.id === myId || !p.dead) continue;
        if (Math.hypot(me.x - p.x, me.z - p.z) < 2.6) { near = p.id; break; }
      }
      if (near) {
        if (reviveTargetId !== near) { reviveTargetId = near; reviveProgress = 0; }
        reviveProgress += dt;
        if (reviveProgress >= REVIVE_TIME) {
          send({ t: "rev", id: near });
          if (audio && audio.playPickup) audio.playPickup();
          reviveTargetId = null;
          reviveProgress = 0;
        }
      } else {
        reviveTargetId = null;
        reviveProgress = 0;
      }
    }

    updateHud();
  }

  function attachNet(n) {
    net = n;
    myId = n.myId || "offline";
    n.onMission(handleMsg);
    started = true;
  }

  const restartBtn = document.getElementById("endgame-btn");
  if (restartBtn) restartBtn.addEventListener("click", () => location.reload());

  return { update, attachNet };
}
