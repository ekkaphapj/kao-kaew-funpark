// ============================================================
// textures.js — procedural canvas textures (no external assets)
// ============================================================
"use strict";

const TEX = (() => {

  function makeDyn(scene, name, size) {
    const dt = new BABYLON.DynamicTexture(name, { width: size, height: size }, scene, true);
    dt.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
    dt.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
    return dt;
  }

  function rand(a, b) { return a + Math.random() * (b - a); }

  // --- generic noise fill ---
  function noisy(ctx, size, base, spots, spotAlpha) {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < spots; i++) {
      const r = rand(1, 4);
      ctx.fillStyle = `rgba(${Math.floor(rand(0, 255))},${Math.floor(rand(0, 255))},${Math.floor(rand(0, 255))},${spotAlpha})`;
      ctx.beginPath();
      ctx.arc(rand(0, size), rand(0, size), r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function grayNoise(ctx, size, base, delta, count) {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < count; i++) {
      const g = Math.floor(rand(-delta, delta));
      ctx.fillStyle = `rgba(${128 + g},${128 + g},${128 + g},0.10)`;
      ctx.beginPath();
      ctx.arc(rand(0, size), rand(0, size), rand(1, 5), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ---------- Grass (dark, patchy, dead) ----------
  function grass(scene) {
    const size = 512, dt = makeDyn(scene, "texGrass", size), ctx = dt.getContext();
    ctx.fillStyle = "#1c2417";
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 2600; i++) {
      const shades = ["#232d1b", "#182013", "#2a3220", "#20291a", "#33301c", "#1a2415"];
      ctx.fillStyle = shades[Math.floor(Math.random() * shades.length)];
      ctx.beginPath();
      ctx.arc(rand(0, size), rand(0, size), rand(1.5, 6), 0, Math.PI * 2);
      ctx.fill();
    }
    // dead patches
    for (let i = 0; i < 26; i++) {
      ctx.fillStyle = `rgba(72,64,40,${rand(0.10, 0.28)})`;
      ctx.beginPath();
      ctx.ellipse(rand(0, size), rand(0, size), rand(14, 46), rand(10, 30), rand(0, 3), 0, Math.PI * 2);
      ctx.fill();
    }
    // blades
    ctx.strokeStyle = "rgba(46,58,34,0.5)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 900; i++) {
      const x = rand(0, size), y = rand(0, size);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + rand(-3, 3), y - rand(2, 7));
      ctx.stroke();
    }
    dt.update();
    return dt;
  }

  // ---------- Asphalt with cracks ----------
  function asphalt(scene) {
    const size = 512, dt = makeDyn(scene, "texAsphalt", size), ctx = dt.getContext();
    grayNoise(ctx, size, "#23242a", 26, 2400);
    // cracks
    ctx.strokeStyle = "rgba(8,8,10,0.65)";
    for (let c = 0; c < 14; c++) {
      ctx.lineWidth = rand(0.6, 1.6);
      let x = rand(0, size), y = rand(0, size);
      ctx.beginPath(); ctx.moveTo(x, y);
      const seg = Math.floor(rand(4, 10));
      for (let s = 0; s < seg; s++) {
        x += rand(-34, 34); y += rand(-34, 34);
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // faded paint blotch + leaves
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `rgba(60,52,30,${rand(0.08, 0.2)})`;
      ctx.beginPath();
      ctx.ellipse(rand(0, size), rand(0, size), rand(2, 8), rand(1, 4), rand(0, 3), 0, Math.PI * 2);
      ctx.fill();
    }
    dt.update();
    return dt;
  }

  // ---------- Pavement tiles (plaza) ----------
  function pavement(scene) {
    const size = 512, dt = makeDyn(scene, "texPave", size), ctx = dt.getContext();
    grayNoise(ctx, size, "#2b2c31", 20, 1500);
    ctx.strokeStyle = "rgba(12,12,16,0.8)";
    ctx.lineWidth = 3;
    const step = size / 8;
    for (let i = 0; i <= 8; i++) {
      ctx.beginPath(); ctx.moveTo(i * step, 0); ctx.lineTo(i * step, size); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * step); ctx.lineTo(size, i * step); ctx.stroke();
    }
    // stains
    for (let i = 0; i < 18; i++) {
      ctx.fillStyle = `rgba(10,12,10,${rand(0.06, 0.22)})`;
      ctx.beginPath();
      ctx.ellipse(rand(0, size), rand(0, size), rand(10, 50), rand(8, 34), rand(0, 3), 0, Math.PI * 2);
      ctx.fill();
    }
    dt.update();
    return dt;
  }

  // ---------- Bricks (old, grimy) ----------
  function brick(scene, tone) {
    const size = 512, dt = makeDyn(scene, "texBrick" + tone, size), ctx = dt.getContext();
    const mortar = "#3a3632", bricks = tone === "dark"
      ? ["#4a3028", "#503530", "#452c26", "#553832", "#3f2a24"]
      : ["#6a4a38", "#725040", "#5f4232", "#7a5545", "#644636"];
    ctx.fillStyle = mortar;
    ctx.fillRect(0, 0, size, size);
    const bh = size / 12, bw = size / 5;
    for (let row = 0; row < 12; row++) {
      const off = (row % 2) * bw / 2;
      for (let col = -1; col < 6; col++) {
        ctx.fillStyle = bricks[Math.floor(Math.random() * bricks.length)];
        ctx.fillRect(off + col * bw + 2, row * bh + 2, bw - 4, bh - 4);
      }
    }
    // grime
    for (let i = 0; i < 500; i++) {
      ctx.fillStyle = `rgba(10,10,8,${rand(0.05, 0.30)})`;
      ctx.beginPath();
      ctx.arc(rand(0, size), rand(0, size), rand(1, 7), 0, Math.PI * 2);
      ctx.fill();
    }
    dt.update();
    return dt;
  }

  // ---------- Wood planks (weathered) ----------
  function planks(scene) {
    const size = 512, dt = makeDyn(scene, "texPlanks", size), ctx = dt.getContext();
    const cols = ["#4c3a26", "#544230", "#46331f", "#5c4936", "#3e2e1c"];
    const pw = size / 6;
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = cols[i % cols.length];
      ctx.fillRect(i * pw, 0, pw - 3, size);
      // grain
      ctx.strokeStyle = "rgba(20,14,6,0.4)";
      ctx.lineWidth = 1;
      for (let g = 0; g < 9; g++) {
        const x = i * pw + rand(4, pw - 8);
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.bezierCurveTo(x + rand(-6, 6), size * .33, x + rand(-6, 6), size * .66, x + rand(-8, 8), size);
        ctx.stroke();
      }
    }
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    for (let i = 0; i < 6; i++) ctx.fillRect(i * pw + pw - 3, 0, 3, size);
    dt.update();
    return dt;
  }

  // ---------- Corrugated metal (rusty) ----------
  function metal(scene) {
    const size = 256, dt = makeDyn(scene, "texMetal", size), ctx = dt.getContext();
    const g = ctx.createLinearGradient(0, 0, size, 0);
    for (let i = 0; i <= 16; i++) {
      g.addColorStop(i / 16, i % 2 ? "#5a5f66" : "#3c4046");
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    // rust streaks
    for (let i = 0; i < 34; i++) {
      ctx.fillStyle = `rgba(120,60,26,${rand(0.10, 0.4)})`;
      const x = rand(0, size), y = rand(0, size);
      ctx.fillRect(x, y, rand(2, 8), rand(10, 70));
    }
    dt.update();
    return dt;
  }

  // ---------- Awning stripes ----------
  function stripes(scene, colA, colB, name) {
    const size = 256, dt = makeDyn(scene, "texStripe" + name, size), ctx = dt.getContext();
    const w = size / 8;
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = i % 2 ? colA : colB;
      ctx.fillRect(i * w, 0, w, size);
    }
    // dirt
    for (let i = 0; i < 260; i++) {
      ctx.fillStyle = `rgba(20,18,12,${rand(0.06, 0.25)})`;
      ctx.beginPath();
      ctx.arc(rand(0, size), rand(0, size), rand(1, 6), 0, Math.PI * 2);
      ctx.fill();
    }
    dt.update();
    return dt;
  }

  // ---------- Text sign ----------
  function sign(scene, text, opts) {
    opts = opts || {};
    const w = opts.w || 1024, h = opts.h || 256;
    const dt = new BABYLON.DynamicTexture("texSign_" + text, { width: w, height: h }, scene, true);
    const ctx = dt.getContext();
    ctx.fillStyle = opts.bg || "#1a1210";
    ctx.fillRect(0, 0, w, h);
    if (opts.border !== false) {
      ctx.strokeStyle = opts.borderColor || "#67503a";
      ctx.lineWidth = 10;
      ctx.strokeRect(8, 8, w - 16, h - 16);
    }
    const fs = opts.fontSize || Math.floor(h * 0.5);
    ctx.font = `bold ${fs}px Tahoma, 'Leelawadee UI', sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (opts.glowColor) {
      ctx.shadowColor = opts.glowColor;
      ctx.shadowBlur = 26;
    }
    ctx.fillStyle = opts.fg || "#ffd98a";
    ctx.fillText(text, w / 2, h / 2 + (opts.dy || 6));
    if (opts.grime !== false) {
      ctx.shadowBlur = 0;
      for (let i = 0; i < 60; i++) {
        ctx.fillStyle = `rgba(8,6,4,${rand(0.08, 0.35)})`;
        ctx.beginPath();
        ctx.arc(rand(0, w), rand(0, h), rand(2, 12), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    dt.update();
    return dt;
  }

  // ---------- Starfield sky ----------
  function stars(scene) {
    const size = 1024, dt = makeDyn(scene, "texStars", size), ctx = dt.getContext();
    const g = ctx.createLinearGradient(0, 0, 0, size);
    g.addColorStop(0, "#03040d");
    g.addColorStop(0.55, "#080a1c");
    g.addColorStop(0.8, "#0d1026");
    g.addColorStop(1, "#131230");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 700; i++) {
      const y = Math.pow(Math.random(), 1.6) * size * 0.8;
      const b = rand(0.25, 1);
      ctx.fillStyle = `rgba(${200 + rand(0, 55)},${200 + rand(0, 55)},255,${b})`;
      const r = Math.random() < 0.06 ? rand(1.4, 2.4) : rand(0.4, 1.2);
      ctx.beginPath();
      ctx.arc(rand(0, size), y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // thin clouds
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = `rgba(60,66,110,${rand(0.03, 0.08)})`;
      ctx.beginPath();
      ctx.ellipse(rand(0, size), rand(size * .2, size * .7), rand(90, 260), rand(12, 36), 0, 0, Math.PI * 2);
      ctx.fill();
    }
    dt.update();
    return dt;
  }

  // ---------- Moon ----------
  function moon(scene) {
    const size = 256;
    const dt = new BABYLON.DynamicTexture("texMoon", { width: size, height: size }, scene, true);
    dt.hasAlpha = true;
    const ctx = dt.getContext();
    ctx.clearRect(0, 0, size, size);
    const cx = size / 2, cy = size / 2, r = size * 0.42;
    const g = ctx.createRadialGradient(cx - r * .25, cy - r * .25, r * .1, cx, cy, r);
    g.addColorStop(0, "#fdf8e8");
    g.addColorStop(0.75, "#d9d6bf");
    g.addColorStop(1, "#a9a790");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    // craters
    for (let i = 0; i < 16; i++) {
      const a = rand(0, Math.PI * 2), d = rand(0, r * .8);
      ctx.fillStyle = `rgba(140,138,116,${rand(0.2, 0.45)})`;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, rand(3, 14), 0, Math.PI * 2);
      ctx.fill();
    }
    dt.update();
    return dt;
  }

  // ---------- Water bump noise ----------
  function waterNoise(scene) {
    const size = 256, dt = makeDyn(scene, "texWater", size), ctx = dt.getContext();
    ctx.fillStyle = "#123540";
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 900; i++) {
      ctx.strokeStyle = `rgba(${rand(40, 110)},${rand(120, 190)},${rand(150, 210)},${rand(0.05, 0.22)})`;
      ctx.lineWidth = rand(0.6, 2);
      const x = rand(0, size), y = rand(0, size);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(x + rand(6, 26), y + rand(-4, 4), x + rand(20, 44), y + rand(-4, 4), x + rand(38, 66), y);
      ctx.stroke();
    }
    dt.update();
    return dt;
  }

  // ---------- Ghost face (for haunted house) ----------
  // The screaming mouth is a TRANSPARENT hole — the building's real door sits
  // behind it, so players walk in through the mouth.
  // solid=true keeps the mouth as opaque black (for portraits);
  // default punches it transparent so it works as a doorway.
  function ghostFace(scene, solid) {
    const size = 512;
    const dt = new BABYLON.DynamicTexture("texGhost" + (solid ? "S" : ""), { width: size, height: size }, scene, true);
    dt.hasAlpha = !solid;
    const ctx = dt.getContext();
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = "#120a18";
    ctx.fillRect(0, 0, size, size);
    // eyes
    for (const sx of [-1, 1]) {
      const ex = size / 2 + sx * size * 0.18, ey = size * 0.3;
      const eg = ctx.createRadialGradient(ex, ey, 4, ex, ey, 52);
      eg.addColorStop(0, "#ff4444");
      eg.addColorStop(0.5, "#7a1020");
      eg.addColorStop(1, "rgba(30,4,10,0)");
      ctx.fillStyle = eg;
      ctx.beginPath(); ctx.arc(ex, ey, 52, 0, Math.PI * 2); ctx.fill();
    }
    // mouth: transparent doorway, or opaque black for the solid variant
    if (solid) {
      ctx.fillStyle = "#050308";
    } else {
      ctx.globalCompositeOperation = "destination-out";
    }
    ctx.beginPath();
    ctx.ellipse(size / 2, size * 0.72, size * 0.22, size * 0.27, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    // mouth rim shadow + teeth overhanging the hole
    ctx.strokeStyle = "#241028";
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.ellipse(size / 2, size * 0.72, size * 0.22, size * 0.27, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#c9c2b8";
    for (let i = 0; i < 7; i++) {
      const x = size / 2 - size * 0.2 + i * (size * 0.4 / 6.4);
      ctx.beginPath();
      ctx.moveTo(x, size * 0.47);
      ctx.lineTo(x + 16, size * 0.47);
      ctx.lineTo(x + 8, size * 0.57);
      ctx.closePath();
      ctx.fill();
    }
    dt.update();
    return dt;
  }

  return { grass, asphalt, pavement, brick, planks, metal, stripes, sign, stars, moon, waterNoise, ghostFace };
})();
