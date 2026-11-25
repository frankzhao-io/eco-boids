(() => {
  const { EcoSimulation } = window.EcoSim;
  const { renderSimulation } = window.EcoRenderer;

  const I18N = {
    en: {
      subtitle: 'Interactive Boids ecosystem & O(N²) vs Spatial Hash O(N) benchmark',
      themeLight: 'Theme: Light',
      themeDark: 'Theme: Dark',
      tabSim: 'Simulation',
      tabGuide: 'Purpose & Algorithm',
      pause: 'Pause',
      play: 'Play',
      reset: 'Reset',
      lblSkin: 'Style',
      skins: {
        fish: 'Fish School',
        drone: 'Drone Swarm',
        crowd: 'Crowd Flow',
        heatmap: 'Velocity Heatmap'
      },
      trails: 'Trails',
      showGrid: 'Spatial Grid',
      showPerc: 'Perception',
      algoSpatial: 'Spatial Hash O(N)',
      algoBrute: 'Brute-Force O(N²)',
      legBoid: 'Boid (Flock)',
      legPred: 'Predator',
      legFood: 'Food',
      legObs: 'Obstacle',
      rulesTitle: 'FLOCK PARAMETERS',
      lblCount: 'Count (N)',
      lblSep: 'Separation',
      lblAli: 'Alignment',
      lblCoh: 'Cohesion',
      lblSpeed: 'Max Speed',
      brushTitle: 'INTERACTIVE BRUSH',
      brushPred: 'Predator',
      brushFood: 'Food',
      brushObs: 'Obstacle',
      brushErase: 'Erase',
      clearObjs: 'Clear',
      brushHint: 'Click/drag on canvas to place items; right-click to erase.',
      presetTitle: 'ECOSYSTEM PRESETS',
      presetSchool: 'Fish School',
      presetCorridor: 'Drone Corridor',
      presetHunt: 'Predator Hunt',
      presetBait: 'Tight Baitball',
      presetDual: 'Dual Flocks',
      presetBench: '2500 Stress Test',
      metricsTitle: 'PERFORMANCE & METRICS',
      mFps: 'FPS',
      mStep: 'Step (ms)',
      mChecks: 'Checks/Frame',
      mEntities: 'Pred / Food',
      abBenchBtn: 'Run O(N²) vs O(N) Benchmark'
    },
    zh: {
      subtitle: '互動式 Boids 群聚生態與 O(N²) vs 空間雜湊 O(N) 效能實測',
      themeLight: '主題：淺色',
      themeDark: '主題：深色',
      tabSim: '模擬生態',
      tabGuide: '原理與用途',
      pause: '暫停',
      play: '繼續',
      reset: '重置',
      lblSkin: '呈現風格',
      skins: {
        fish: '魚群生態',
        drone: '無人機蜂群',
        crowd: '人流疏散',
        heatmap: '速度熱力圖'
      },
      trails: '軌跡拖尾',
      showGrid: '空間網格',
      showPerc: '感知半徑',
      algoSpatial: '空間雜湊 O(N)',
      algoBrute: '暴力比對 O(N²)',
      legBoid: '魚群個體',
      legPred: '掠食者',
      legFood: '食物',
      legObs: '障礙物',
      rulesTitle: '群聚參數設定',
      lblCount: '個體數量 (N)',
      lblSep: '分離 (Separation)',
      lblAli: '對齊 (Alignment)',
      lblCoh: '凝聚 (Cohesion)',
      lblSpeed: '最高速度',
      brushTitle: '互動筆刷',
      brushPred: '放掠食者',
      brushFood: '放食物',
      brushObs: '放障礙物',
      brushErase: '橡皮擦',
      clearObjs: '清空物件',
      brushHint: '點擊／拖曳畫布放置物件；右鍵可快速擦除。',
      presetTitle: '預設生態情境',
      presetSchool: '自然魚群',
      presetCorridor: '無人機穿廊',
      presetHunt: '掠食者追捕',
      presetBait: '緊密防禦球',
      presetDual: '雙群對流',
      presetBench: '2500 隻壓測',
      metricsTitle: '效能與狀態數據',
      mFps: '幀率 (FPS)',
      mStep: '計算耗時 (ms)',
      mChecks: '每幀比對次數',
      mEntities: '掠食者 / 食物',
      abBenchBtn: '一鍵實測 O(N²) vs O(N) 加速比'
    }
  };

  const sim = new EcoSimulation(900, 560);
  sim.initBoids(240, 'school');

  let lang = 'en';
  let isDark = false;
  let running = true;
  let brush = 'predator';
  let currentPreset = 'school';
  let forceClearNext = false;
  let hoverPos = null;
  let isPointerDown = false;
  let lastPaintPos = null;
  let lastBenchResults = null;

  let lastFrameTs = performance.now();
  let fpsSmooth = 60;
  let metricTick = 0;

  // DOM
  const canvas = document.getElementById('simCanvas');
  const langEnBtn = document.getElementById('langEnBtn');
  const langZhBtn = document.getElementById('langZhBtn');
  const themeBtn = document.getElementById('themeBtn');
  const tabSimBtn = document.getElementById('tabSimBtn');
  const tabGuideBtn = document.getElementById('tabGuideBtn');
  const simPage = document.getElementById('simPage');
  const guidePage = document.getElementById('guidePage');

  const playBtn = document.getElementById('playBtn');
  const resetBtn = document.getElementById('resetBtn');
  const skinSelect = document.getElementById('skinSelect');
  const trailsCheck = document.getElementById('trailsCheck');
  const gridCheck = document.getElementById('gridCheck');
  const percCheck = document.getElementById('percCheck');
  const algoSpatialBtn = document.getElementById('algoSpatialBtn');
  const algoBruteBtn = document.getElementById('algoBruteBtn');

  const countSlider = document.getElementById('countSlider');
  const sepSlider = document.getElementById('sepSlider');
  const aliSlider = document.getElementById('aliSlider');
  const cohSlider = document.getElementById('cohSlider');
  const speedSlider = document.getElementById('speedSlider');

  const valCount = document.getElementById('valCount');
  const valSep = document.getElementById('valSep');
  const valAli = document.getElementById('valAli');
  const valCoh = document.getElementById('valCoh');
  const valSpeed = document.getElementById('valSpeed');

  const mFpsVal = document.getElementById('mFpsVal');
  const mStepVal = document.getElementById('mStepVal');
  const mChecksVal = document.getElementById('mChecksVal');
  const mEntitiesVal = document.getElementById('mEntitiesVal');
  const mEntitiesLbl = document.getElementById('mEntitiesLbl');
  const legendBar = document.getElementById('legendBar');
  const brushPredBtn = document.getElementById('brushPredBtn');
  const brushFoodBtn = document.getElementById('brushFoodBtn');
  const brushObsBtn = document.getElementById('brushObsBtn');
  const brushHintEl = document.getElementById('brushHintEl');
  const clearObjsBtn = document.getElementById('clearObjsBtn');
  const abBenchBtn = document.getElementById('abBenchBtn');
  const abResult = document.getElementById('abResult');
  const metricsHelpBtn = document.getElementById('metricsHelpBtn');
  const metricsExplain = document.getElementById('metricsExplain');

  function t() {
    return I18N[lang];
  }

  function renderGuidePage() {
    const isZh = lang === 'zh';
    guidePage.innerHTML = isZh
      ? `
        <div class="card">
          <h3>這個專案的目的是什麼？（實務應用）</h3>
          <p><strong>Boids 群聚演算法</strong>與<strong>空間雜湊（Spatial Hashing）</strong>不只是視覺動畫，而是即時模擬系統的兩大基石：</p>
          <ul>
            <li><strong>遊戲 AI 與人群模擬</strong>：魚群、鳥群、RTS 部隊編隊、喪屍潮都靠這 3 條局部規則達成「無中央指揮卻有秩序的移動」。</li>
            <li><strong>無人機蜂群（Swarm Robotics）</strong>：每台無人機只感測周圍鄰居就能避撞並維持編隊，不需要高延遲的中央伺服器。</li>
            <li><strong>物理引擎加速（O(N²) → O(N)）</strong>：當粒子數拉到 2,500 隻，直接兩兩比對每幀要做 <strong>625 萬次</strong>距離計算；用空間網格只查周圍 9 宮格，計算量瞬間降為幾十分之一。</li>
          </ul>
        </div>
        <div class="card">
          <h3>演算法與效能對比說明</h3>
          <ul>
            <li><strong>分離（Separation）</strong>：避免個體重疊碰撞（短距離排斥力）。</li>
            <li><strong>對齊（Alignment）</strong>：讓鄰近個體速度方向趨於一致，形成集體流向。</li>
            <li><strong>凝聚（Cohesion）</strong>：朝鄰居群體質心靠攏，防止隊伍散開。</li>
            <li><strong>怎麼體驗差異？</strong>：切回「模擬生態」按右側的 <strong>「2500 隻壓測」</strong>，再點 <strong>「一鍵實測 O(N²) vs O(N) 加速比」</strong>，就能親眼看到跨規模的效能落差。</li>
          </ul>
        </div>
      `
      : `
        <div class="card">
          <h3>Why Boids &amp; Spatial Hashing? (Real-World Purpose)</h3>
          <p><strong>Boids</strong> and <strong>Spatial Hashing</strong> are core building blocks behind real-time simulation systems:</p>
          <ul>
            <li><strong>Game AI &amp; Crowd Simulation</strong>: Fish schools, bird flocks, and RTS unit formations emerge from 3 local rules without a central controller.</li>
            <li><strong>Drone Swarms (Swarm Robotics)</strong>: Autonomous drones avoid collisions and hold formation using only local neighbor sensing.</li>
            <li><strong>O(N²) → O(N) Engine Optimization</strong>: At N = 2,500 boids, brute-force checks ~6.25M pairs per frame. Spatial Hashing checks only nearby grid cells, keeping FPS smooth.</li>
          </ul>
        </div>
        <div class="card">
          <h3>How to Benchmark</h3>
          <ul>
            <li><strong>Separation</strong>: Steers away from overly close neighbors to prevent crowding.</li>
            <li><strong>Alignment</strong>: Matches velocity heading with nearby flockmates.</li>
            <li><strong>Cohesion</strong>: Steers toward the local center of mass.</li>
            <li><strong>Try the Stress Test</strong>: In Simulation, click <strong>2500 Stress Test</strong>, then click <strong>Run O(N²) vs O(N) Benchmark</strong> to see multi-scale speedup bars.</li>
          </ul>
        </div>
      `;
  }

  function updateMetricsExplain() {
    const isZh = lang === 'zh';
    const n = sim.boids.length;
    const bruteChecks = n * (n - 1);
    const saved = bruteChecks > 0 ? Math.max(0, Math.round((1 - sim.lastChecks / bruteChecks) * 100)) : 0;
    metricsExplain.innerHTML = isZh
      ? sim.useSpatialHash
        ? `目前使用 <strong>Spatial Hash O(N)</strong>：每幀僅檢查 <code>${sim.lastChecks.toLocaleString()}</code> 次鄰居（比暴力法 <code>${bruteChecks.toLocaleString()}</code> 次省下 <strong>${saved}%</strong>）。`
        : `目前使用 <strong>Brute-Force O(N²)</strong>：每幀必須兩兩檢查 <code>${sim.lastChecks.toLocaleString()}</code> 次。切回 Spatial Hash 可大幅降低耗時！`
      : sim.useSpatialHash
        ? `Using <strong>Spatial Hash O(N)</strong>: <code>${sim.lastChecks.toLocaleString()}</code> checks/frame (<strong>${saved}% fewer</strong> than brute-force <code>${bruteChecks.toLocaleString()}</code>).`
        : `Using <strong>Brute-Force O(N²)</strong>: checking <code>${sim.lastChecks.toLocaleString()}</code> pairs/frame. Switch to Spatial Hash to see the speedup!`;
  }

  function updateScenarioLabels() {
    const isZh = lang === 'zh';
    const mode = skinSelect.value;
    const cfg = {
      fish: {
        legend: isZh
          ? [['boidA', '魚群個體'], ['predator', '掠食者'], ['food', '食物'], ['obstacle', '礁石障礙']]
          : [['boidA', 'Boid (Flock)'], ['predator', 'Predator'], ['food', 'Food'], ['obstacle', 'Obstacle']],
        predBtn: isZh ? '放掠食者' : 'Predator',
        foodBtn: isZh ? '放食物' : 'Food',
        obsBtn: isZh ? '放障礙物' : 'Obstacle',
        hint: isZh ? '直接點擊畫布放置掠食者、食物或礁石障礙。' : 'Click on the canvas to spawn predators, food, or obstacles.',
        metricLbl: isZh ? '掠食者 / 食物' : 'Pred / Food'
      },
      drone: {
        legend: isZh
          ? [['boidA', '無人機 (Mesh)'], ['predator', '攔截機'], ['food', '巡航目標點 (WP)'], ['obstacle', '柱狀障礙']]
          : [['boidA', 'Drone (Mesh)'], ['predator', 'Interceptor'], ['food', 'Waypoint (WP)'], ['obstacle', 'Pillar']],
        predBtn: isZh ? '放攔截機' : 'Interceptor',
        foodBtn: isZh ? '放信標點' : 'Beacon',
        obsBtn: isZh ? '放障礙柱' : 'Pillar',
        hint: isZh ? '機群會自動沿 WP 1→4 巡航；點擊畫布可加放攔截機或障礙柱。' : 'Drones patrol WP 1–4 automatically; click canvas to add interceptors or pillars.',
        metricLbl: isZh ? '攔截機 / 信標' : 'Interc / WP'
      },
      crowd: {
        legend: isZh
          ? [['crowdOk', '順暢通行'], ['crowdJam', '瓶頸塞車'], ['obstacle', '房間牆壁 / 柱子']]
          : [['crowdOk', 'Free-Flowing'], ['crowdJam', 'Congested'], ['obstacle', 'Wall / Pillar']],
        predBtn: isZh ? '放干擾源' : 'Hazard',
        foodBtn: isZh ? '放引導點' : 'Guide Point',
        obsBtn: isZh ? '放柱子' : 'Pillar',
        hint: isZh ? '人群會往右側 EXIT 出口撤離；門口壅塞會轉橘紅，加放柱子可測分流。' : 'Agents evacuate toward EXIT →; bottlenecks turn orange/red.',
        metricLbl: isZh ? '疏散速率' : 'Evac Rate'
      },
      heatmap: {
        legend: isZh
          ? [['boidA', '低速巡航'], ['predator', '高速閃避 / 掠食者'], ['food', '誘餌點'], ['obstacle', '障礙物']]
          : [['boidA', 'Calm Cruise'], ['predator', 'High-Speed / Predator'], ['food', 'Lure'], ['obstacle', 'Obstacle']],
        predBtn: isZh ? '放掠食者' : 'Predator',
        foodBtn: isZh ? '放誘餌' : 'Lure',
        obsBtn: isZh ? '放障礙物' : 'Obstacle',
        hint: isZh ? '觀察掠食者俯衝時，魚群瞬間加速轉彎的橘紅色衝擊波。' : 'Watch orange/red velocity shockwaves ripple as predators dive.',
        metricLbl: isZh ? '掠食者 / 誘餌' : 'Pred / Lure'
      }
    }[mode];

    legendBar.innerHTML = cfg.legend
      .map(([cls, text]) => `<span class="legend-item"><i class="swatch ${cls}"></i><span>${text}</span></span>`)
      .join('');
    brushPredBtn.textContent = cfg.predBtn;
    brushFoodBtn.textContent = cfg.foodBtn;
    brushObsBtn.textContent = cfg.obsBtn;
    brushHintEl.textContent = cfg.hint;
    mEntitiesLbl.textContent = cfg.metricLbl;
  }

  function renderBenchResult() {
    if (!lastBenchResults) return;
    const isZh = lang === 'zh';
    const maxMs = Math.max(...lastBenchResults.map((r) => Math.max(r.brute.avgMs, r.spatial.avgMs)), 0.1);
    const top = lastBenchResults[lastBenchResults.length - 1];

    const barsHtml = lastBenchResults
      .map((r) => {
        const wSpatial = Math.max(3, Math.round((r.spatial.avgMs / maxMs) * 100));
        const wBrute = Math.max(3, Math.round((r.brute.avgMs / maxMs) * 100));
        return `<div class="bench-item">
          <div class="bench-head">
            <strong>N = ${r.n}</strong>
            <span>O(N) <code>${r.spatial.avgMs.toFixed(2)}ms</code> vs O(N²) <code>${r.brute.avgMs.toFixed(2)}ms</code> (${r.speedup.toFixed(1)}x)</span>
          </div>
          <div class="bench-bar-track"><div class="bench-bar-spatial" style="width:${wSpatial}%"></div></div>
          <div class="bench-bar-track"><div class="bench-bar-brute" style="width:${wBrute}%"></div></div>
        </div>`;
      })
      .join('');

    abResult.classList.remove('hidden');
    abResult.innerHTML = isZh
      ? `<strong>跨規模實測：N = ${top.n} 時 Spatial Hash 快 ${top.speedup.toFixed(1)}x</strong>（省下 <strong>${top.checkReduction.toFixed(1)}%</strong> 比對）` +
        `<div class="bench-list">${barsHtml}</div>`
      : `<strong>Scaling Result: At N = ${top.n}, Spatial Hash is ${top.speedup.toFixed(1)}x faster</strong> (<strong>${top.checkReduction.toFixed(1)}%</strong> fewer checks)` +
        `<div class="bench-list">${barsHtml}</div>`;
  }

  function applyI18n() {
    const dict = t();
    document.documentElement.lang = lang === 'zh' ? 'zh-Hant' : 'en';
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const k = el.getAttribute('data-i18n');
      if (dict[k]) el.textContent = dict[k];
    });
    playBtn.textContent = running ? dict.pause : dict.play;
    themeBtn.textContent = isDark ? dict.themeDark : dict.themeLight;
    Array.from(skinSelect.options).forEach((opt) => {
      if (dict.skins[opt.value]) opt.textContent = dict.skins[opt.value];
    });
    renderGuidePage();
    updateScenarioLabels();
    updateMetricsExplain();
    renderBenchResult();
  }

  function applyPreset(name) {
    currentPreset = name;
    forceClearNext = true;
    if (skinSelect.value !== 'fish') {
      skinSelect.value = 'fish';
      updateScenarioLabels();
    }
    if (name !== 'baitball' && sim.weights.cohesion !== 1.0) {
      sim.weights.cohesion = 1.0;
      cohSlider.value = '1.0';
      valCoh.textContent = '1.0';
    }
    if (name === 'bench2500') {
      countSlider.value = '2500';
      valCount.textContent = '2500';
      sim.initBoids(2500, 'school');
    } else if (name === 'corridor') {
      countSlider.value = '260';
      valCount.textContent = '260';
      sim.initBoids(260, 'corridor');
    } else if (name === 'baitball') {
      countSlider.value = '320';
      valCount.textContent = '320';
      sim.weights.cohesion = 1.8;
      cohSlider.value = '1.8';
      valCoh.textContent = '1.8';
      sim.initBoids(320, 'baitball');
    } else {
      if (parseInt(countSlider.value, 10) >= 2000) {
        countSlider.value = '240';
        valCount.textContent = '240';
      }
      const n = parseInt(countSlider.value, 10);
      sim.initBoids(n, name);
    }
  }

  function loop(ts) {
    const dt = ts - lastFrameTs;
    lastFrameTs = ts;
    if (dt > 0 && dt < 500) {
      fpsSmooth = fpsSmooth * 0.88 + (1000 / dt) * 0.12;
    }

    if (running) {
      sim.step();
    }
    renderSimulation(canvas, sim, {
      trails: trailsCheck.checked,
      showGrid: gridCheck.checked,
      showPerception: percCheck.checked,
      skin: skinSelect.value,
      forceClear: forceClearNext,
      hoverPos,
      brush
    });
    forceClearNext = false;

    if (++metricTick % 8 === 0) {
      mFpsVal.textContent = Math.round(fpsSmooth);
      mStepVal.textContent = sim.lastStepMs.toFixed(2);
      mChecksVal.textContent = sim.lastChecks.toLocaleString();
      if (sim.scenario === 'crowd') {
        mEntitiesVal.textContent = `${sim.getEvacThroughput().toFixed(1)}/s`;
      } else if (sim.scenario === 'drone') {
        mEntitiesVal.textContent = `${sim.predators.length} / ${sim.waypoints.length}`;
      } else {
        mEntitiesVal.textContent = `${sim.predators.length} / ${sim.foods.length}`;
      }
      if (!metricsExplain.classList.contains('hidden')) {
        updateMetricsExplain();
      }
    }

    requestAnimationFrame(loop);
  }

  // Events
  langEnBtn.addEventListener('click', () => {
    lang = 'en';
    langEnBtn.classList.add('active');
    langZhBtn.classList.remove('active');
    applyI18n();
  });

  langZhBtn.addEventListener('click', () => {
    lang = 'zh';
    langZhBtn.classList.add('active');
    langEnBtn.classList.remove('active');
    applyI18n();
  });

  themeBtn.addEventListener('click', () => {
    isDark = !isDark;
    document.body.classList.toggle('dark', isDark);
    themeBtn.textContent = isDark ? t().themeDark : t().themeLight;
  });

  tabSimBtn.addEventListener('click', () => {
    tabSimBtn.classList.add('active');
    tabGuideBtn.classList.remove('active');
    tabSimBtn.setAttribute('aria-selected', 'true');
    tabGuideBtn.setAttribute('aria-selected', 'false');
    simPage.classList.remove('hidden');
    guidePage.classList.add('hidden');
  });

  tabGuideBtn.addEventListener('click', () => {
    tabGuideBtn.classList.add('active');
    tabSimBtn.classList.remove('active');
    tabGuideBtn.setAttribute('aria-selected', 'true');
    tabSimBtn.setAttribute('aria-selected', 'false');
    guidePage.classList.remove('hidden');
    simPage.classList.add('hidden');
  });

  playBtn.addEventListener('click', () => {
    running = !running;
    playBtn.textContent = running ? t().pause : t().play;
  });

  resetBtn.addEventListener('click', () => {
    forceClearNext = true;
    if (skinSelect.value === 'drone' || skinSelect.value === 'crowd' || skinSelect.value === 'heatmap') {
      sim.configureScenario(skinSelect.value, parseInt(countSlider.value, 10));
    } else {
      applyPreset(currentPreset);
    }
  });

  skinSelect.addEventListener('change', () => {
    forceClearNext = true;
    const mode = skinSelect.value;
    const n = parseInt(countSlider.value, 10);
    document.querySelectorAll('.preset-btn').forEach((b) => {
      b.classList.toggle('active', mode === 'fish' && b.getAttribute('data-preset') === currentPreset);
    });
    sim.configureScenario(mode, n);
    updateScenarioLabels();
  });

  algoSpatialBtn.addEventListener('click', () => {
    sim.useSpatialHash = true;
    algoSpatialBtn.classList.add('active');
    algoBruteBtn.classList.remove('active');
    updateMetricsExplain();
  });

  algoBruteBtn.addEventListener('click', () => {
    sim.useSpatialHash = false;
    algoBruteBtn.classList.add('active');
    algoSpatialBtn.classList.remove('active');
    updateMetricsExplain();
  });

  countSlider.addEventListener('input', () => {
    const n = parseInt(countSlider.value, 10);
    valCount.textContent = n;
    sim.setCount(n);
  });

  sepSlider.addEventListener('input', () => {
    sim.weights.separation = parseFloat(sepSlider.value);
    valSep.textContent = sim.weights.separation.toFixed(1);
  });

  aliSlider.addEventListener('input', () => {
    sim.weights.alignment = parseFloat(aliSlider.value);
    valAli.textContent = sim.weights.alignment.toFixed(1);
  });

  cohSlider.addEventListener('input', () => {
    sim.weights.cohesion = parseFloat(cohSlider.value);
    valCoh.textContent = sim.weights.cohesion.toFixed(1);
  });

  speedSlider.addEventListener('input', () => {
    sim.maxSpeed = parseFloat(speedSlider.value);
    valSpeed.textContent = sim.maxSpeed.toFixed(1);
  });

  document.querySelectorAll('.brush-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.brush-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      brush = btn.getAttribute('data-brush');
    });
  });

  document.querySelectorAll('.preset-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.preset-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      applyPreset(btn.getAttribute('data-preset'));
    });
  });

  clearObjsBtn.addEventListener('click', () => {
    sim.predators = [];
    sim.foods = [];
    sim.obstacles = [];
  });

  function canvasCoords(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * sim.width,
      y: ((e.clientY - rect.top) / rect.height) * sim.height
    };
  }

  function applyCanvasBrush(x, y, activeBrush) {
    if (activeBrush === 'predator') sim.addPredator(x, y);
    else if (activeBrush === 'food') sim.addFood(x, y);
    else if (activeBrush === 'obstacle') sim.addObstacle(x, y, 24);
    else if (activeBrush === 'erase') sim.eraseAt(x, y);
  }

  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const { x, y } = canvasCoords(e);
    sim.eraseAt(x, y);
  });

  canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    isPointerDown = true;
    const pos = canvasCoords(e);
    hoverPos = pos;
    lastPaintPos = pos;
    applyCanvasBrush(pos.x, pos.y, brush);
  });

  canvas.addEventListener('pointermove', (e) => {
    const pos = canvasCoords(e);
    hoverPos = pos;
    if (!isPointerDown) return;
    if (brush === 'obstacle' || brush === 'food' || brush === 'erase') {
      if (!lastPaintPos || Math.hypot(pos.x - lastPaintPos.x, pos.y - lastPaintPos.y) >= 28) {
        lastPaintPos = pos;
        applyCanvasBrush(pos.x, pos.y, brush);
      }
    }
  });

  const stopPaint = () => {
    isPointerDown = false;
    lastPaintPos = null;
  };
  canvas.addEventListener('pointerup', stopPaint);
  canvas.addEventListener('pointercancel', stopPaint);
  canvas.addEventListener('pointerleave', () => {
    hoverPos = null;
    stopPaint();
  });

  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'BUTTON') return;
    if (e.code === 'Space') {
      e.preventDefault();
      running = !running;
      playBtn.textContent = running ? t().pause : t().play;
    }
  });

  abBenchBtn.addEventListener('click', () => {
    lastBenchResults = sim.runScalingBenchmark([300, 1000, 2500], 6);
    renderBenchResult();
  });

  metricsHelpBtn.addEventListener('click', () => {
    const show = metricsExplain.classList.contains('hidden');
    metricsExplain.classList.toggle('hidden', !show);
    metricsHelpBtn.classList.toggle('active', show);
    if (show) updateMetricsExplain();
  });

  applyI18n();
  requestAnimationFrame(loop);
})();
