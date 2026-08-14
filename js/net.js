// ============================================================
// net.js — online multiplayer via Supabase Realtime
// Uses broadcast (positions ~10 Hz) + presence (join/leave).
// No database tables touched — everything is ephemeral realtime.
// ============================================================
"use strict";

function initNet(scene, player, playerName) {
  const badge = document.getElementById("online");
  const noNet = { update() {}, };

  if (typeof supabase === "undefined") {
    if (badge) badge.textContent = "⚪ ออฟไลน์";
    return noNet;
  }

  const SUPA_URL = "https://lxvmtjoppeshdladnbzb.supabase.co";
  const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4dm10am9wcGVzaGRsYWRuYnpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwNTkwMzMsImV4cCI6MjEwMDYzNTAzM30.3FMnjk9G7Y3m7lU92KGv5OjKO4M5qLsckK60ne6SpMs";

  let client;
  try {
    client = supabase.createClient(SUPA_URL, SUPA_KEY);
  } catch (e) {
    console.warn("supabase init failed", e);
    if (badge) badge.textContent = "⚪ ออฟไลน์";
    return noNet;
  }

  const myId = "p" + Math.random().toString(36).slice(2, 8);
  const myName = (playerName || "").trim().slice(0, 12) || ("ผู้เล่น " + myId.slice(1, 5).toUpperCase());
  // 8 distinct shirt colors — first pick by id hash, conflicts resolved on sync
  const SHIRTS = ["#b32620", "#2076b3", "#2fa04a", "#b38a20", "#7a3fa0", "#20a08a", "#c05a20", "#b04a72"];
  let hash = 0;
  for (const c of myId) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  let myColor = SHIRTS[hash % SHIRTS.length];
  player.rig.setShirtColor(myColor);

  const remotes = new Map(); // id -> {rig, tag, target, color, phase, lastX, lastZ}
  let connected = false;

  function setBadge(n) {
    if (!badge) return;
    badge.textContent = connected ? `🟢 ${myName} · ออนไลน์ ${n}/4` : "⚪ ออฟไลน์";
  }

  function makeNameTag(name, parent) {
    const tex = new BABYLON.DynamicTexture("tag_" + name, { width: 256, height: 64 }, scene, true);
    tex.hasAlpha = true;
    const ctx = tex.getContext();
    ctx.clearRect(0, 0, 256, 64);
    ctx.fillStyle = "rgba(6,8,20,0.65)";
    ctx.beginPath();
    ctx.roundRect(8, 8, 240, 48, 12);
    ctx.fill();
    ctx.font = "bold 30px Tahoma, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#e8ecff";
    ctx.fillText(name, 128, 34);
    tex.update();
    const plane = BABYLON.MeshBuilder.CreatePlane("tagP_" + name, { width: 1.3, height: 0.33 }, scene);
    const m = new BABYLON.StandardMaterial("tagM_" + name, scene);
    m.diffuseTexture = tex;
    m.emissiveColor = new BABYLON.Color3(1, 1, 1);
    m.opacityTexture = tex;
    m.disableLighting = true;
    m.backFaceCulling = false;
    plane.material = m;
    plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
    plane.parent = parent;
    plane.position.y = 2.05;
    plane.isPickable = false;
    return plane;
  }

  function addRemote(id, meta) {
    if (remotes.has(id) || id === myId) return;
    const sx = (meta && typeof meta.x === "number") ? meta.x : 0;
    const sz = (meta && typeof meta.z === "number") ? meta.z : -92;
    const color = (meta && meta.color) || SHIRTS[1];
    const rig = createCharacterRig(scene, color);
    rig.node.position.set(sx, 0, sz);
    const tag = makeNameTag((meta && meta.name) || id, rig.node);
    remotes.set(id, {
      rig, tag, color,
      target: { x: sx, z: sz, yaw: (meta && meta.yaw) || 0 },
      phase: 0, lastX: sx, lastZ: sz,
    });
    setBadge(remotes.size + 1);
  }

  function removeRemote(id) {
    const r = remotes.get(id);
    if (!r) return;
    r.tag.material.dispose();
    r.tag.dispose();
    r.rig.dispose();
    remotes.delete(id);
    setBadge(remotes.size + 1);
  }

  const channel = client.channel("funpark-v1", {
    config: {
      broadcast: { self: false },
      presence: { key: myId },
    },
  });

  function trackSelf() {
    const p = player.root.position;
    channel.track({
      name: myName, color: myColor,
      x: +p.x.toFixed(1), z: +p.z.toFixed(1), yaw: +player.state.yaw.toFixed(2),
    });
  }

  channel.on("presence", { event: "sync" }, () => {
    const st = channel.presenceState();
    const ids = new Set(Object.keys(st));
    for (const id of ids) {
      if (id !== myId && !remotes.has(id)) addRemote(id, st[id][0]);
    }
    for (const id of [...remotes.keys()]) {
      if (!ids.has(id)) removeRemote(id);
    }
    // ---- unique shirt colors ----
    // if an earlier player (smaller id) already wears my color, I yield and
    // switch to the first free color, then re-announce myself
    const usedByOthers = new Set();
    let mustYield = false;
    for (const id of ids) {
      if (id === myId) continue;
      const meta = st[id][0];
      if (meta && meta.color) {
        usedByOthers.add(meta.color);
        if (meta.color === myColor && id < myId) mustYield = true;
      }
    }
    if (mustYield) {
      const free = SHIRTS.find(c => !usedByOthers.has(c));
      if (free) {
        myColor = free;
        player.rig.setShirtColor(myColor);
        if (connected) trackSelf();
      }
    }
    // apply color changes other players announced
    for (const [id, r] of remotes) {
      const meta = st[id] && st[id][0];
      if (meta && meta.color && meta.color !== r.color) {
        r.color = meta.color;
        r.rig.setShirtColor(meta.color);
      }
    }
    setBadge(ids.size);
  });

  channel.on("broadcast", { event: "pos" }, ({ payload }) => {
    if (!payload || payload.id === myId) return;
    const r = remotes.get(payload.id);
    if (r) {
      r.target.x = payload.x; r.target.z = payload.z; r.target.yaw = payload.yaw;
    }
  });

  channel.subscribe((status) => {
    if (status === "SUBSCRIBED") {
      connected = true;
      trackSelf();
      setBadge(remotes.size + 1);
    } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
      connected = false;
      setBadge(0);
    }
  });

  window.addEventListener("beforeunload", () => {
    try { channel.unsubscribe(); } catch (e) {}
  });

  // ---------- per-frame ----------
  let sendTimer = 0;
  let idleTimer = 0;
  let lastSent = { x: 0, z: 0, yaw: 0 };

  function update(dt) {
    // send my position ~10 Hz when it changed; keepalive every 2 s so late joiners sync
    sendTimer -= dt;
    idleTimer += dt;
    if (connected && sendTimer <= 0) {
      sendTimer = 0.1;
      const p = player.root.position;
      const yaw = player.state.yaw;
      const changed = Math.abs(p.x - lastSent.x) > 0.02 || Math.abs(p.z - lastSent.z) > 0.02 ||
        Math.abs(yaw - lastSent.yaw) > 0.01;
      if (changed || idleTimer > 2) {
        idleTimer = 0;
        lastSent = { x: p.x, z: p.z, yaw };
        channel.send({
          type: "broadcast", event: "pos",
          payload: { id: myId, x: +p.x.toFixed(2), z: +p.z.toFixed(2), yaw: +yaw.toFixed(3) },
        });
      }
    }

    // interpolate remote players
    const k = 1 - Math.exp(-10 * dt);
    for (const r of remotes.values()) {
      const n = r.rig.node;
      n.position.x += (r.target.x - n.position.x) * k;
      n.position.z += (r.target.z - n.position.z) * k;
      // shortest-path yaw lerp; remote rigs face where that player walks
      let dy = r.target.yaw - n.rotation.y;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      n.rotation.y += dy * k;
      // walk animation from actual movement speed
      const sp = Math.hypot(n.position.x - r.lastX, n.position.z - r.lastZ) / Math.max(dt, 0.001);
      r.lastX = n.position.x; r.lastZ = n.position.z;
      if (sp > 0.4) {
        r.phase += dt * (sp > 5.5 ? 11 : 7);
        r.rig.swing(r.phase, sp > 5.5 ? 0.9 : 0.55);
      } else {
        r.rig.relax(dt);
      }
    }
  }

  setBadge(1);
  return { update };
}
