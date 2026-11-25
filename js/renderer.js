(() => {
  let cachedDark = null;
  let cachedColors = null;

  function getColors() {
    const isDark = document.body.classList.contains('dark');
    if (cachedColors && cachedDark === isDark) return cachedColors;
    const cs = getComputedStyle(document.body);
    cachedDark = isDark;
    cachedColors = {
      isDark,
      bg: cs.getPropertyValue('--canvas-bg').trim(),
      text: cs.getPropertyValue('--text').trim(),
      border: cs.getPropertyValue('--border').trim(),
      boidA: cs.getPropertyValue('--boid-a').trim(),
      boidB: cs.getPropertyValue('--boid-b').trim(),
      predator: cs.getPropertyValue('--predator').trim(),
      food: cs.getPropertyValue('--food').trim(),
      obstacle: cs.getPropertyValue('--obstacle').trim(),
      gridLine: cs.getPropertyValue('--grid-line').trim()
    };
    return cachedColors;
  }

  function ensureCanvasDPR(canvas, sim) {
    const dpr = window.devicePixelRatio || 1;
    const tw = Math.round(sim.width * dpr);
    const th = Math.round(sim.height * dpr);
    if (canvas.width !== tw || canvas.height !== th) {
      canvas.width = tw;
      canvas.height = th;
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  }

  function lerpColor(t) {
    const clamped = Math.max(0, Math.min(1, t));
    if (clamped < 0.5) {
      const u = clamped * 2;
      const r = Math.round(56 + (245 - 56) * u);
      const g = Math.round(189 + (158 - 189) * u);
      const b = Math.round(248 + (11 - 248) * u);
      return `rgb(${r},${g},${b})`;
    }
    const u = (clamped - 0.5) * 2;
    const r = Math.round(245 + (239 - 245) * u);
    const g = Math.round(158 + (68 - 158) * u);
    const b = Math.round(11 + (68 - 11) * u);
    return `rgb(${r},${g},${b})`;
  }

  function drawDroneMesh(ctx, sim, colors) {
    const n = sim.boids.length;
    const linkDistSq = (sim.perception * 0.9) ** 2;
    const scratch = [];

    ctx.save();
    ctx.strokeStyle = colors.boidA;
    ctx.globalAlpha = colors.isDark ? 0.22 : 0.30;
    ctx.lineWidth = 1;
    ctx.beginPath();

    if (sim.useSpatialHash) {
      const step = n > 800 ? Math.ceil(n / 600) : 1;
      for (let i = 0; i < n; i += step) {
        const a = sim.boids[i];
        const cands = sim.grid.queryNeighborhood(a.x, a.y, sim.perception, scratch);
        let links = 0;
        for (let k = 0; k < cands.length && links < 4; k++) {
          const j = cands[k];
          if (j <= i || j >= n) continue;
          const b = sim.boids[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          if (dx * dx + dy * dy < linkDistSq) {
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            links++;
          }
        }
      }
    } else {
      const step = n > 450 ? Math.ceil(n / 300) : 1;
      for (let i = 0; i < n; i += step) {
        const a = sim.boids[i];
        let links = 0;
        for (let j = i + step; j < n && links < 4; j += step) {
          const b = sim.boids[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          if (dx * dx + dy * dy < linkDistSq) {
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            links++;
          }
        }
      }
    }

    ctx.stroke();
    ctx.restore();
  }

  function drawBoid(ctx, b, sim, skin, colors, scale, detail) {
    const angle = Math.atan2(b.vy, b.vx);
    const speed = Math.hypot(b.vx, b.vy);
    const speedRatio = sim.maxSpeed > 0 ? speed / sim.maxSpeed : 0.5;

    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(angle);
    if (scale !== 1) ctx.scale(scale, scale);

    if (skin === 'drone') {
      const color = b.group === 1 ? colors.boidB : colors.boidA;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-4.5, -4.5);
      ctx.lineTo(4.5, 4.5);
      ctx.moveTo(-4.5, 4.5);
      ctx.lineTo(4.5, -4.5);
      if (detail) {
        for (let r = 0; r < 4; r++) {
          const rx = r < 2 ? -4.5 : 4.5;
          const ry = r % 2 === 0 ? -4.5 : 4.5;
          ctx.moveTo(rx + 2.2, ry);
          ctx.arc(rx, ry, 2.2, 0, Math.PI * 2);
        }
      }
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, 0, 2.1, 0, Math.PI * 2);
      ctx.fill();
      if (detail) {
        ctx.fillStyle = '#0ea5e9';
        ctx.beginPath();
        ctx.arc(3.4, 0, 1.3, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (skin === 'crowd') {
      const color = speedRatio < 0.65 ? '#f97316' : '#10b981';
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(0, 0, 2.8, 4.6, 0, 0, Math.PI * 2);
      ctx.fill();
      if (detail) {
        ctx.fillStyle = colors.isDark ? '#f8fafc' : '#0f172a';
        ctx.beginPath();
        ctx.arc(1.2, 0, 2.1, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (skin === 'fish') {
      const color = b.group === 1 ? colors.boidB : colors.boidA;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(6.5, 0);
      ctx.quadraticCurveTo(1.5, -4.2, -4, -1.2);
      ctx.lineTo(-7.5, -3.5);
      ctx.lineTo(-6, 0);
      ctx.lineTo(-7.5, 3.5);
      ctx.lineTo(-4, 1.2);
      ctx.quadraticCurveTo(1.5, 4.2, 6.5, 0);
      ctx.closePath();
      ctx.fill();
      if (detail) {
        ctx.fillStyle = colors.isDark ? '#0f172a' : '#ffffff';
        ctx.beginPath();
        ctx.arc(3.5, -1, 0.9, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = lerpColor((speedRatio - 0.35) / 0.65);
      ctx.beginPath();
      ctx.moveTo(7.5, 0);
      ctx.lineTo(-4.5, -3.4);
      ctx.lineTo(-2.2, 0);
      ctx.lineTo(-4.5, 3.4);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function renderSimulation(canvas, sim, options) {
    const { trails, showGrid, showPerception, skin = 'fish', forceClear = false, hoverPos = null, brush = 'predator' } = options;
    const ctx = ensureCanvasDPR(canvas, sim);
    const colors = getColors();

    if (trails && !forceClear) {
      ctx.save();
      ctx.fillStyle = colors.bg;
      ctx.globalAlpha = skin === 'heatmap' ? 0.20 : 0.34;
      ctx.fillRect(0, 0, sim.width, sim.height);
      ctx.restore();
    } else {
      ctx.fillStyle = colors.bg;
      ctx.fillRect(0, 0, sim.width, sim.height);
    }

    if (showGrid) {
      ctx.save();
      ctx.strokeStyle = colors.gridLine;
      ctx.lineWidth = 1;
      const cs = sim.perception;
      for (let x = cs; x < sim.width; x += cs) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, sim.height);
        ctx.stroke();
      }
      for (let y = cs; y < sim.height; y += cs) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(sim.width, y);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Obstacles
    for (let i = 0; i < sim.obstacles.length; i++) {
      const o = sim.obstacles[i];
      ctx.fillStyle = colors.obstacle;
      ctx.beginPath();
      ctx.arc(o.x, o.y, o.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Solid room walls (Crowd Evacuation)
    if (sim.walls && sim.walls.length > 0) {
      ctx.save();
      ctx.fillStyle = colors.obstacle;
      ctx.strokeStyle = colors.text;
      ctx.lineWidth = 1.5;
      for (let i = 0; i < sim.walls.length; i++) {
        const w = sim.walls[i];
        ctx.fillRect(w.x, w.y, w.w, w.h);
        ctx.strokeRect(w.x, w.y, w.w, w.h);
      }

      // Highlight EXIT doorway
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(624, 235);
      ctx.lineTo(624, 325);
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.fillStyle = '#2563eb';
      ctx.fillRect(638, 268, 54, 22);
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 11px sans-serif';
      ctx.fillText('EXIT →', 646, 283);
      ctx.restore();
    }

    // Active Drone Waypoint Beacon
    if (sim.scenario === 'drone' && sim.waypoints && sim.waypoints.length > 0) {
      const wp = sim.waypoints[sim.waypointIdx];
      ctx.save();
      ctx.strokeStyle = colors.food;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(wp.x, wp.y, 16, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = colors.food;
      ctx.beginPath();
      ctx.arc(wp.x, wp.y, 4.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = colors.bg;
      ctx.fillRect(wp.x + 18, wp.y - 10, 56, 20);
      ctx.fillStyle = colors.food;
      ctx.font = '700 11px ui-monospace, monospace';
      ctx.fillText(`WP ${sim.waypointIdx + 1}/${sim.waypoints.length}`, wp.x + 23, wp.y + 4);
      ctx.restore();
    }

    // Food / Target Beacons
    for (let i = 0; i < sim.foods.length; i++) {
      const f = sim.foods[i];
      const r = 3 + Math.min(1, f.amount / 100) * 4;
      if (skin === 'drone') {
        ctx.strokeStyle = colors.food;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(f.x, f.y, r + 4, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = colors.food;
      ctx.beginPath();
      ctx.arc(f.x, f.y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    if (skin === 'drone') {
      drawDroneMesh(ctx, sim, colors);
    }

    // Perception / Neighbor Search Visualization on boid[0]
    if (showPerception && sim.boids.length > 0) {
      const b0 = sim.boids[0];
      const cs = sim.perception;

      if (sim.useSpatialHash) {
        const cx = Math.floor(b0.x / cs);
        const cy = Math.floor(b0.y / cs);
        ctx.save();
        ctx.fillStyle = '#10b981';
        ctx.globalAlpha = 0.16;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const gx = cx + dx;
            const gy = cy + dy;
            if (gx >= 0 && gx < sim.grid.cols && gy >= 0 && gy < sim.grid.rows) {
              ctx.fillRect(gx * cs, gy * cs, cs, cs);
            }
          }
        }
        ctx.globalAlpha = 0.55;
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 1.5;
        const minX = Math.max(0, cx - 1) * cs;
        const minY = Math.max(0, cy - 1) * cs;
        const maxX = Math.min(sim.grid.cols, cx + 2) * cs;
        const maxY = Math.min(sim.grid.rows, cy + 2) * cs;
        ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
        ctx.restore();

        // Draw green links to neighbors inside 3x3 cells
        ctx.save();
        ctx.strokeStyle = '#10b981';
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 1.1;
        const percSq = cs * cs;
        ctx.beginPath();
        for (let i = 1; i < sim.boids.length; i++) {
          const other = sim.boids[i];
          const dSq = (other.x - b0.x) ** 2 + (other.y - b0.y) ** 2;
          if (dSq < percSq) {
            ctx.moveTo(b0.x, b0.y);
            ctx.lineTo(other.x, other.y);
          }
        }
        ctx.stroke();
        ctx.restore();
      } else {
        // Brute-Force O(N^2): draw red scan rays across the entire map to show global checking
        ctx.save();
        ctx.strokeStyle = '#ef4444';
        ctx.globalAlpha = 0.22;
        ctx.lineWidth = 0.9;
        ctx.setLineDash([3, 3]);
        const step = Math.max(1, Math.floor(sim.boids.length / 90));
        ctx.beginPath();
        for (let i = 1; i < sim.boids.length; i += step) {
          ctx.moveTo(b0.x, b0.y);
          ctx.lineTo(sim.boids[i].x, sim.boids[i].y);
        }
        ctx.stroke();
        ctx.restore();
      }

      // Highlight probe boid[0] & its perception circle
      ctx.save();
      ctx.strokeStyle = sim.useSpatialHash ? '#10b981' : '#ef4444';
      ctx.globalAlpha = 0.85;
      ctx.lineWidth = 1.6;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.arc(b0.x, b0.y, cs, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(b0.x, b0.y, 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Boids (density-aware icon scaling)
    const n = sim.boids.length;
    const scale = n > 1200 ? 0.68 : n > 700 ? 0.82 : 1;
    const detail = n <= 900;
    for (let i = 0; i < n; i++) {
      drawBoid(ctx, sim.boids[i], sim, skin, colors, scale, detail);
    }

    // Predators / Interceptors
    for (let i = 0; i < sim.predators.length; i++) {
      const p = sim.predators[i];
      const angle = Math.atan2(p.vy, p.vx);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(angle);
      ctx.fillStyle = colors.predator;
      ctx.beginPath();
      ctx.moveTo(11, 0);
      ctx.lineTo(-7, -5);
      ctx.lineTo(-4, 0);
      ctx.lineTo(-7, 5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Hover brush footprint preview
    if (hoverPos) {
      ctx.save();
      const radius = brush === 'erase' ? 32 : brush === 'obstacle' ? 24 : 10;
      ctx.strokeStyle = brush === 'erase' || brush === 'predator' ? colors.predator : brush === 'food' ? colors.food : colors.text;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 1.3;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.arc(hoverPos.x, hoverPos.y, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Crowd Throughput HUD (drawn on top with opaque backing)
    if (sim.walls && sim.walls.length > 0) {
      ctx.save();
      const rate = sim.getEvacThroughput();
      ctx.fillStyle = colors.bg;
      ctx.fillRect(644, 12, 244, 26);
      ctx.strokeStyle = colors.border;
      ctx.lineWidth = 1.2;
      ctx.strokeRect(644, 12, 244, 26);
      ctx.fillStyle = colors.text;
      ctx.font = '600 11px ui-monospace, monospace';
      ctx.fillText(`Throughput: ${rate.toFixed(1)}/s  Total: ${sim.evacuatedTotal}`, 654, 29);
      ctx.restore();
    }

    // Top-left Search Mode HUD Pill (fixed-width opaque backing avoids trail ghosting)
    ctx.save();
    const hudText = sim.useSpatialHash
      ? `Spatial Hash O(N) · ${sim.lastStepMs.toFixed(1)} ms · ${sim.lastChecks.toLocaleString()} checks`
      : `Brute-Force O(N²) · ${sim.lastStepMs.toFixed(1)} ms · ${sim.lastChecks.toLocaleString()} checks`;
    ctx.font = '700 11px ui-monospace, monospace';
    const tw = Math.max(330, ctx.measureText(hudText).width + 20);
    ctx.fillStyle = colors.bg;
    ctx.fillRect(10, 10, 390, 28);
    ctx.strokeStyle = sim.useSpatialHash ? '#10b981' : '#ef4444';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(12, 12, tw, 24);
    ctx.fillStyle = sim.useSpatialHash ? '#10b981' : '#ef4444';
    ctx.fillText(hudText, 22, 28);
    ctx.restore();
  }

  window.EcoRenderer = { renderSimulation };
})();
