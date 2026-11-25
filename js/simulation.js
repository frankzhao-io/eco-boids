((root) => {
  const SpatialHash =
    typeof module !== 'undefined' && module.exports && !root.SpatialHash
      ? require('./spatial-hash.js')
      : root.SpatialHash;

  const { SpatialHashGrid } = SpatialHash;

  class EcoSimulation {
    constructor(width = 900, height = 560) {
      this.width = width;
      this.height = height;
      this.perception = 52;
      this.separationDist = 22;
      this.maxSpeed = 3.2;
      this.maxForce = 0.08;

      this.weights = {
        separation: 1.5,
        alignment: 1.0,
        cohesion: 1.0
      };

      this.useSpatialHash = true;
      this.grid = new SpatialHashGrid(width, height, this.perception);
      this.neighborScratch = [];

      this.boids = [];
      this.predators = [];
      this.foods = [];
      this.obstacles = [];
      this.walls = [];
      this.waypoints = [];
      this.waypointIdx = 0;
      this.scenario = 'fish';
      this.lastPreset = 'school';
      this.evacuatedTotal = 0;
      this.evacWindow = [];

      this.lastStepMs = 0;
      this.lastChecks = 0;
    }

    initBoids(count = 240, preset = 'school') {
      this.boids = [];
      this.predators = [];
      this.foods = [];
      this.obstacles = [];
      this.walls = [];
      this.waypoints = [];
      this.waypointIdx = 0;
      this.scenario = 'fish';
      this.lastPreset = preset;
      this.evacuatedTotal = 0;
      this.evacWindow = [];

      for (let i = 0; i < count; i++) {
        let x = Math.random() * this.width;
        let y = Math.random() * this.height;
        let angle = Math.random() * Math.PI * 2;

        if (preset === 'baitball') {
          const r = 30 + Math.random() * 110;
          const a = Math.random() * Math.PI * 2;
          x = this.width / 2 + Math.cos(a) * r;
          y = this.height / 2 + Math.sin(a) * r;
          angle = a + Math.PI / 2;
        }

        const speed = 1.6 + Math.random() * 1.2;
        this.boids.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          group: preset === 'dual' ? (i % 2) : 0
        });
      }

      if (preset === 'hunt' || preset === 'baitball') {
        this.addPredator(this.width * 0.2, this.height * 0.3);
        this.addPredator(this.width * 0.8, this.height * 0.7);
      }
      if (preset === 'school') {
        this.addObstacle(this.width * 0.38, this.height * 0.5, 28);
        this.addObstacle(this.width * 0.64, this.height * 0.45, 24);
      }
      if (preset === 'corridor') {
        // Swarm corridor: two pillar gates + target beacon
        for (let i = 0; i < this.boids.length; i++) {
          this.boids[i].x = 40 + Math.random() * 140;
          this.boids[i].y = 140 + Math.random() * (this.height - 280);
          this.boids[i].vx = 2.0 + Math.random() * 0.8;
          this.boids[i].vy = (Math.random() - 0.5) * 0.6;
        }
        this.addObstacle(this.width * 0.36, this.height * 0.28, 34);
        this.addObstacle(this.width * 0.36, this.height * 0.72, 34);
        this.addObstacle(this.width * 0.64, this.height * 0.50, 40);
        this.foods.push({ x: this.width * 0.88, y: this.height * 0.5, amount: 9999 });
      }
    }

    configureScenario(mode, count = this.boids.length) {
      if (mode === 'drone') {
        this.initBoids(count, 'school');
        this.scenario = 'drone';
        this.obstacles = [
          { x: 280, y: 170, radius: 28 },
          { x: 280, y: 390, radius: 28 },
          { x: 540, y: 280, radius: 34 },
          { x: 700, y: 140, radius: 22 }
        ];
        this.waypoints = [
          { x: 780, y: 150 },
          { x: 780, y: 420 },
          { x: 140, y: 410 },
          { x: 140, y: 140 }
        ];
        this.waypointIdx = 0;
        for (let i = 0; i < this.boids.length; i++) {
          this.boids[i].x = 80 + Math.random() * 120;
          this.boids[i].y = 200 + Math.random() * 160;
        }
      } else if (mode === 'crowd') {
        this.initBoids(count, 'school');
        this.scenario = 'crowd';
        this.obstacles = [{ x: 520, y: 280, radius: 24 }];
        // Room wall at x = 620 with narrow exit doorway (y = 235..325)
        this.walls = [
          { x: 615, y: 0, w: 18, h: 235 },
          { x: 615, y: 325, w: 18, h: this.height - 325 }
        ];
        for (let i = 0; i < this.boids.length; i++) {
          this.boids[i].x = 40 + Math.random() * 420;
          this.boids[i].y = 40 + Math.random() * (this.height - 80);
        }
      } else if (mode === 'heatmap') {
        this.initBoids(count, 'baitball');
        this.scenario = 'heatmap';
      } else {
        this.initBoids(count, 'school');
        this.scenario = 'fish';
      }
    }

    setCount(targetCount) {
      let idx = this.boids.length;
      while (this.boids.length < targetCount) {
        const angle = Math.random() * Math.PI * 2;
        let x = Math.random() * this.width;
        let y = Math.random() * this.height;
        if (this.scenario === 'crowd') {
          x = 30 + Math.random() * 520;
          y = 30 + Math.random() * (this.height - 60);
        } else if (this.scenario === 'drone') {
          x = 60 + Math.random() * 180;
          y = 140 + Math.random() * (this.height - 280);
        }
        this.boids.push({
          x,
          y,
          vx: Math.cos(angle) * 2.2,
          vy: Math.sin(angle) * 2.2,
          group: this.lastPreset === 'dual' ? (idx % 2) : 0
        });
        idx++;
      }
      if (this.boids.length > targetCount) {
        this.boids.length = targetCount;
      }
      this._rebuildGrid();
    }

    _rebuildGrid() {
      this.grid.clear();
      for (let i = 0; i < this.boids.length; i++) {
        this.grid.insert(i, this.boids[i].x, this.boids[i].y);
      }
    }

    addPredator(x, y) {
      const a = Math.random() * Math.PI * 2;
      this.predators.push({
        x,
        y,
        vx: Math.cos(a) * 2.4,
        vy: Math.sin(a) * 2.4
      });
    }

    addFood(x, y) {
      this.foods.push({ x, y, amount: 100 });
    }

    addObstacle(x, y, radius = 24) {
      // Keep Crowd EXIT doorway clear
      if (this.scenario === 'crowd' && x > 600 && x < 650 && y > 220 && y < 340) return;
      this.obstacles.push({ x, y, radius });
    }

    _resolveWallAABB(entity, pad = 4) {
      for (let wIdx = 0; wIdx < this.walls.length; wIdx++) {
        const w = this.walls[wIdx];
        const left = w.x - pad;
        const right = w.x + w.w + pad;
        const top = w.y - pad;
        const bottom = w.y + w.h + pad;
        if (entity.x > left && entity.x < right && entity.y > top && entity.y < bottom) {
          const dLeft = entity.x - left;
          const dRight = right - entity.x;
          const dTop = entity.y - top;
          const dBottom = bottom - entity.y;
          const minD = Math.min(dLeft, dRight, dTop, dBottom);
          if (minD === dLeft) {
            entity.x = left;
            entity.vx = -Math.abs(entity.vx) * 0.4;
          } else if (minD === dRight) {
            entity.x = right;
            entity.vx = Math.abs(entity.vx) * 0.4;
          } else if (minD === dTop) {
            entity.y = top;
            entity.vy = -Math.abs(entity.vy) * 0.4;
          } else {
            entity.y = bottom;
            entity.vy = Math.abs(entity.vy) * 0.4;
          }
        }
      }
    }

    _resolveCircleObstacles(entity, pad = 3) {
      for (let oIdx = 0; oIdx < this.obstacles.length; oIdx++) {
        const o = this.obstacles[oIdx];
        const dx = entity.x - o.x;
        const dy = entity.y - o.y;
        const d = Math.hypot(dx, dy);
        const minR = o.radius + pad;
        if (d < minR) {
          const nx = d > 0.001 ? dx / d : 1;
          const ny = d > 0.001 ? dy / d : 0;
          entity.x = o.x + nx * minR;
          entity.y = o.y + ny * minR;
        }
      }
    }

    _bounceBounds(entity, pad = 6) {
      if (entity.x < pad) {
        entity.x = pad;
        entity.vx = Math.abs(entity.vx);
      } else if (entity.x > this.width - pad) {
        entity.x = this.width - pad;
        entity.vx = -Math.abs(entity.vx);
      }
      if (entity.y < pad) {
        entity.y = pad;
        entity.vy = Math.abs(entity.vy);
      } else if (entity.y > this.height - pad) {
        entity.y = this.height - pad;
        entity.vy = -Math.abs(entity.vy);
      }
    }

    getEvacThroughput() {
      const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const cutoff = nowMs - 3000;
      while (this.evacWindow.length > 0 && this.evacWindow[0] < cutoff) {
        this.evacWindow.shift();
      }
      return this.evacWindow.length / 3.0;
    }

    eraseAt(x, y, radius = 32) {
      this.predators = this.predators.filter((p) => Math.hypot(p.x - x, p.y - y) > radius);
      this.foods = this.foods.filter((f) => Math.hypot(f.x - x, f.y - y) > radius);
      this.obstacles = this.obstacles.filter((o) => Math.hypot(o.x - x, o.y - y) > radius + o.radius * 0.5);
    }

    _limit(vx, vy, max) {
      const magSq = vx * vx + vy * vy;
      if (magSq > max * max && magSq > 0) {
        const s = max / Math.sqrt(magSq);
        return [vx * s, vy * s];
      }
      return [vx, vy];
    }

    _steerToward(vx, vy, tx, ty, speed, maxForce) {
      const mag = Math.hypot(tx, ty);
      if (mag === 0) return [0, 0];
      const dx = (tx / mag) * speed - vx;
      const dy = (ty / mag) * speed - vy;
      return this._limit(dx, dy, maxForce);
    }

    _wrap(entity) {
      if (entity.x < 0) entity.x += this.width;
      else if (entity.x >= this.width) entity.x -= this.width;
      if (entity.y < 0) entity.y += this.height;
      else if (entity.y >= this.height) entity.y -= this.height;
    }

    step() {
      const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
      const t0 = now();
      let checks = 0;

      const n = this.boids.length;
      const percSq = this.perception * this.perception;
      const sepSq = this.separationDist * this.separationDist;

      if (this.useSpatialHash) {
        this.grid.clear();
        for (let i = 0; i < n; i++) {
          this.grid.insert(i, this.boids[i].x, this.boids[i].y);
        }
      }

      const accX = new Float64Array(n);
      const accY = new Float64Array(n);

      for (let i = 0; i < n; i++) {
        const b = this.boids[i];
        let sepX = 0, sepY = 0, sepCount = 0;
        let aliX = 0, aliY = 0, aliCount = 0;
        let cohX = 0, cohY = 0, cohCount = 0;

        let candidates;
        let candLen;
        if (this.useSpatialHash) {
          candidates = this.grid.queryNeighborhood(b.x, b.y, this.perception, this.neighborScratch);
          candLen = candidates.length;
        } else {
          candLen = n;
        }

        for (let idx = 0; idx < candLen; idx++) {
          const j = this.useSpatialHash ? candidates[idx] : idx;
          if (i === j) continue;
          checks++;

          const other = this.boids[j];
          const dx = other.x - b.x;
          const dy = other.y - b.y;
          const dSq = dx * dx + dy * dy;

          if (dSq > 0 && dSq < percSq) {
            if (other.group === b.group) {
              aliX += other.vx;
              aliY += other.vy;
              aliCount++;

              cohX += other.x;
              cohY += other.y;
              cohCount++;
            }

            if (dSq < sepSq) {
              const inv = 1 / dSq;
              sepX -= dx * inv;
              sepY -= dy * inv;
              sepCount++;
            }
          }
        }

        let fx = 0;
        let fy = 0;

        if (sepCount > 0) {
          const [sx, sy] = this._steerToward(b.vx, b.vy, sepX, sepY, this.maxSpeed, this.maxForce);
          fx += sx * this.weights.separation;
          fy += sy * this.weights.separation;
        }
        if (aliCount > 0) {
          const [ax, ay] = this._steerToward(b.vx, b.vy, aliX / aliCount, aliY / aliCount, this.maxSpeed, this.maxForce);
          fx += ax * this.weights.alignment;
          fy += ay * this.weights.alignment;
        }
        if (cohCount > 0) {
          const [cx, cy] = this._steerToward(
            b.vx,
            b.vy,
            cohX / cohCount - b.x,
            cohY / cohCount - b.y,
            this.maxSpeed,
            this.maxForce
          );
          fx += cx * this.weights.cohesion;
          fy += cy * this.weights.cohesion;
        }

        // Flee predators
        for (let pIdx = 0; pIdx < this.predators.length; pIdx++) {
          const p = this.predators[pIdx];
          const dx = b.x - p.x;
          const dy = b.y - p.y;
          const d = Math.hypot(dx, dy);
          if (d > 0 && d < 110) {
            const [ex, ey] = this._steerToward(b.vx, b.vy, dx, dy, this.maxSpeed * 1.35, this.maxForce * 2.8);
            fx += ex;
            fy += ey;
          }
        }

        // Seek nearest food
        let bestFood = null;
        let bestFoodD = 130;
        for (let fIdx = 0; fIdx < this.foods.length; fIdx++) {
          const f = this.foods[fIdx];
          const d = Math.hypot(f.x - b.x, f.y - b.y);
          if (d < bestFoodD) {
            bestFoodD = d;
            bestFood = f;
          }
        }
        if (bestFood) {
          const [gx, gy] = this._steerToward(b.vx, b.vy, bestFood.x - b.x, bestFood.y - b.y, this.maxSpeed, this.maxForce * 1.4);
          fx += gx;
          fy += gy;
          if (this.scenario !== 'drone' && this.scenario !== 'crowd' && bestFoodD < 10) {
            bestFood.amount -= 1.5;
          }
        }

        // Seek active waypoint (Drone Swarm) or Exit doorway (Crowd Evacuation)
        if (this.scenario === 'drone' && this.waypoints.length > 0) {
          const wp = this.waypoints[this.waypointIdx];
          const [wx, wy] = this._steerToward(b.vx, b.vy, wp.x - b.x, wp.y - b.y, this.maxSpeed, this.maxForce * 1.15);
          fx += wx;
          fy += wy;
        } else if (this.scenario === 'crowd') {
          const targetX = b.x < 636 ? 645 : 890;
          const targetY = b.x < 636 ? 280 : b.y;
          const [ex, ey] = this._steerToward(b.vx, b.vy, targetX - b.x, targetY - b.y, this.maxSpeed, this.maxForce * 1.5);
          fx += ex;
          fy += ey;
        }

        // Avoid solid rectangular walls
        for (let wIdx = 0; wIdx < this.walls.length; wIdx++) {
          const w = this.walls[wIdx];
          const nearX = Math.max(w.x, Math.min(b.x, w.x + w.w));
          const nearY = Math.max(w.y, Math.min(b.y, w.y + w.h));
          const dx = b.x - nearX;
          const dy = b.y - nearY;
          const d = Math.hypot(dx, dy);
          if (d < 22) {
            const pushX = d > 0 ? dx : b.x < w.x + w.w / 2 ? -1 : 1;
            const pushY = d > 0 ? dy : 0;
            const [wx, wy] = this._steerToward(b.vx, b.vy, pushX, pushY, this.maxSpeed * 1.2, this.maxForce * 4.5);
            fx += wx;
            fy += wy;
          }
        }

        // Avoid obstacles
        for (let oIdx = 0; oIdx < this.obstacles.length; oIdx++) {
          const o = this.obstacles[oIdx];
          const dx = b.x - o.x;
          const dy = b.y - o.y;
          const d = Math.hypot(dx, dy);
          const safeR = o.radius + 26;
          if (d > 0 && d < safeR) {
            const [ox, oy] = this._steerToward(b.vx, b.vy, dx, dy, this.maxSpeed * 1.2, this.maxForce * 3.2);
            fx += ox;
            fy += oy;
          }
        }

        accX[i] = fx;
        accY[i] = fy;
      }

      // Remove depleted food
      this.foods = this.foods.filter((f) => f.amount > 0);

      // Integrate boids
      const nowMs = now();
      let atWaypoint = 0;
      const activeWp = this.scenario === 'drone' && this.waypoints.length > 0 ? this.waypoints[this.waypointIdx] : null;

      for (let i = 0; i < n; i++) {
        const b = this.boids[i];
        const prevX = b.x;
        b.vx += accX[i];
        b.vy += accY[i];
        [b.vx, b.vy] = this._limit(b.vx, b.vy, this.maxSpeed);
        b.x += b.vx;
        b.y += b.vy;

        this._resolveWallAABB(b, 4);
        this._resolveCircleObstacles(b, 3);

        if (this.scenario === 'crowd') {
          if (prevX < 624 && b.x >= 624) {
            this.evacuatedTotal++;
            this.evacWindow.push(nowMs);
          }
          if (b.x >= this.width - 12) {
            b.x = 20 + Math.random() * 60;
            b.y = 40 + Math.random() * (this.height - 80);
          } else {
            this._bounceBounds(b, 6);
          }
        } else {
          this._wrap(b);
        }

        if (activeWp && Math.hypot(b.x - activeWp.x, b.y - activeWp.y) < 85) {
          atWaypoint++;
        }
      }

      if (activeWp && n > 0 && atWaypoint >= Math.max(1, Math.floor(n * 0.4))) {
        this.waypointIdx = (this.waypointIdx + 1) % this.waypoints.length;
      }

      // Update predators (chase nearest boid)
      for (let pIdx = 0; pIdx < this.predators.length; pIdx++) {
        const p = this.predators[pIdx];
        let target = null;
        let minD = 260;
        for (let i = 0; i < n; i++) {
          const d = Math.hypot(this.boids[i].x - p.x, this.boids[i].y - p.y);
          if (d < minD) {
            minD = d;
            target = this.boids[i];
          }
        }
        if (target) {
          const [px, py] = this._steerToward(p.vx, p.vy, target.x - p.x, target.y - p.y, this.maxSpeed * 1.08, this.maxForce * 1.1);
          p.vx += px;
          p.vy += py;
        }
        for (let oIdx = 0; oIdx < this.obstacles.length; oIdx++) {
          const o = this.obstacles[oIdx];
          const dx = p.x - o.x;
          const dy = p.y - o.y;
          const d = Math.hypot(dx, dy);
          if (d > 0 && d < o.radius + 24) {
            const [ox, oy] = this._steerToward(p.vx, p.vy, dx, dy, this.maxSpeed * 1.1, this.maxForce * 3.0);
            p.vx += ox;
            p.vy += oy;
          }
        }
        [p.vx, p.vy] = this._limit(p.vx, p.vy, this.maxSpeed * 1.1);
        p.x += p.vx;
        p.y += p.vy;
        this._resolveWallAABB(p, 6);
        this._resolveCircleObstacles(p, 5);
        if (this.scenario === 'crowd') {
          this._bounceBounds(p, 8);
        } else {
          this._wrap(p);
        }
      }

      this.lastChecks = checks;
      this.lastStepMs = now() - t0;
    }

    /**
     * Runs a multi-scale (N = 300, 1000, 2500) A/B benchmark comparing Spatial Hash O(N)
     * vs Brute-Force O(N^2) without mutating live simulation state.
     */
    runScalingBenchmark(sizes = [300, 1000, 2500], frames = 6) {
      const saved = {
        mode: this.useSpatialHash,
        boids: this.boids.map((b) => ({ ...b })),
        preds: this.predators.map((p) => ({ ...p })),
        foods: this.foods.map((f) => ({ ...f })),
        waypointIdx: this.waypointIdx,
        lastStepMs: this.lastStepMs,
        lastChecks: this.lastChecks,
        evacuatedTotal: this.evacuatedTotal,
        evacWindow: this.evacWindow.slice()
      };

      const results = sizes.map((n) => {
        const baseBoids = Array.from({ length: n }, (_, i) => {
          const src = saved.boids[i % Math.max(1, saved.boids.length)];
          if (src) return { ...src };
          const a = Math.random() * Math.PI * 2;
          return { x: Math.random() * this.width, y: Math.random() * this.height, vx: Math.cos(a) * 2, vy: Math.sin(a) * 2, group: 0 };
        });

        const measure = (useSpatial) => {
          this.boids = baseBoids.map((b) => ({ ...b }));
          this.useSpatialHash = useSpatial;
          // 1 warmup frame
          this.step();
          let totalMs = 0;
          let checks = 0;
          for (let f = 0; f < frames; f++) {
            this.step();
            totalMs += this.lastStepMs;
            checks = this.lastChecks;
          }
          return { avgMs: totalMs / frames, checks };
        };

        const spatial = measure(true);
        const brute = measure(false);
        const speedup = spatial.avgMs > 0.01 ? brute.avgMs / spatial.avgMs : brute.checks / Math.max(1, spatial.checks);
        const checkReduction = brute.checks > 0 ? (1 - spatial.checks / brute.checks) * 100 : 0;
        return { n, spatial, brute, speedup, checkReduction };
      });

      this.boids = saved.boids;
      this.predators = saved.preds;
      this.foods = saved.foods;
      this.useSpatialHash = saved.mode;
      this.waypointIdx = saved.waypointIdx;
      this.lastStepMs = saved.lastStepMs;
      this.lastChecks = saved.lastChecks;
      this.evacuatedTotal = saved.evacuatedTotal;
      this.evacWindow = saved.evacWindow;
      this._rebuildGrid();

      return results;
    }

    runABBenchmark(frames = 12) {
      return this.runScalingBenchmark([this.boids.length], frames)[0];
    }
  }

  const EcoSim = { EcoSimulation };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = EcoSim;
  }
  root.EcoSim = EcoSim;
})(typeof window !== 'undefined' ? window : globalThis);
