const assert = require('node:assert/strict');
const { SpatialHashGrid } = require('../js/spatial-hash.js');
const { EcoSimulation } = require('../js/simulation.js');

// 1. SpatialHashGrid returns all neighbors within radius
{
  const grid = new SpatialHashGrid(400, 300, 50);
  const pts = [
    { x: 100, y: 100 },
    { x: 120, y: 110 },
    { x: 350, y: 250 }
  ];
  pts.forEach((p, i) => grid.insert(i, p.x, p.y));
  const found = grid.queryNeighborhood(100, 100, 50, []);
  assert.ok(found.includes(0));
  assert.ok(found.includes(1));
  assert.ok(!found.includes(2));
}

// 2. Spatial Hash vs Brute-Force produces dramatically fewer checks at N=600
{
  const simSpatial = new EcoSimulation(900, 560);
  simSpatial.initBoids(600, 'school');
  simSpatial.useSpatialHash = true;
  simSpatial.step();

  const simBrute = new EcoSimulation(900, 560);
  simBrute.initBoids(600, 'school');
  simBrute.useSpatialHash = false;
  simBrute.step();

  assert.equal(simBrute.lastChecks, 600 * 599);
  assert.ok(
    simSpatial.lastChecks < simBrute.lastChecks * 0.25,
    `Expected spatial checks (${simSpatial.lastChecks}) << brute checks (${simBrute.lastChecks})`
  );
}

// 3. Interactive entities: predators, food, obstacles, erase
{
  const sim = new EcoSimulation(900, 560);
  sim.initBoids(50, 'school');
  const obsBefore = sim.obstacles.length;
  sim.addPredator(200, 200);
  sim.addFood(300, 300);
  sim.addObstacle(400, 400, 24);
  assert.equal(sim.predators.length, 1);
  assert.equal(sim.foods.length, 1);
  assert.equal(sim.obstacles.length, obsBefore + 1);
  sim.eraseAt(200, 200);
  assert.equal(sim.predators.length, 0);
}

// 4. Drone Corridor preset and A/B benchmark
{
  const sim = new EcoSimulation(900, 560);
  sim.initBoids(400, 'corridor');
  assert.equal(sim.boids.length, 400);
  assert.equal(sim.obstacles.length, 3);
  assert.equal(sim.foods.length, 1);
  const bench = sim.runABBenchmark(4);
  assert.equal(bench.n, 400);
  assert.ok(bench.checkReduction > 50, `Expected >50% check reduction, got ${bench.checkReduction}`);
}

// 5. Scenario switching configures walls (crowd) and waypoints (drone)
{
  const sim = new EcoSimulation(900, 560);
  sim.configureScenario('drone', 120);
  assert.equal(sim.waypoints.length, 4);
  assert.equal(sim.obstacles.length, 4);
  sim.step();

  sim.configureScenario('crowd', 120);
  assert.equal(sim.walls.length, 2);
  sim.step();

  // Multi-scale benchmark preserves live scenario & waypointIdx and keeps grid valid after downscale
  sim.configureScenario('drone', 80);
  const scaling = sim.runScalingBenchmark([100, 300], 3);
  assert.equal(scaling.length, 2);
  assert.equal(sim.boids.length, 80);
  assert.equal(sim.scenario, 'drone');
  const postCands = sim.grid.queryNeighborhood(sim.boids[0].x, sim.boids[0].y, sim.perception, []);
  assert.ok(postCands.every((idx) => idx < sim.boids.length), 'Grid indices must stay within boids.length');

  sim.setCount(250);
  sim.setCount(40);
  const shrunkCands = sim.grid.queryNeighborhood(sim.boids[0].x, sim.boids[0].y, sim.perception, []);
  assert.ok(shrunkCands.every((idx) => idx < 40), 'Grid indices must stay within shrunk boids.length');
}

console.log('All eco-boids tests passed!');
