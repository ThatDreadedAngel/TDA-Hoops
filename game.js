import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

// ============================================================
// 3D BASKETBALL GAME V1
// ============================================================

// ---------- DOM ----------
const loading = document.getElementById("loading");
const homeScoreEl = document.getElementById("homeScore");
const awayScoreEl = document.getElementById("awayScore");
const gameClockEl = document.getElementById("gameClock");
const statusEl = document.getElementById("status");
const shotMeter = document.getElementById("shotMeter");
const meterFill = document.getElementById("meterFill");
const message = document.getElementById("message");
const gameOver = document.getElementById("gameOver");
const finalTitle = document.getElementById("finalTitle");
const finalScore = document.getElementById("finalScore");
const restartButton = document.getElementById("restart");

// ---------- Scene ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101820);
scene.fog = new THREE.Fog(0x101820, 35, 75);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  150
);

const renderer = new THREE.WebGLRenderer({
  antialias: true
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// ---------- Lighting ----------
const hemi = new THREE.HemisphereLight(0xffffff, 0x263238, 2.0);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xffffff, 2.5);
sun.position.set(10, 18, 8);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -30;
sun.shadow.camera.right = 30;
sun.shadow.camera.top = 30;
sun.shadow.camera.bottom = -30;
scene.add(sun);

// ============================================================
// COURT
// ============================================================

const COURT_W = 18;
const COURT_L = 30;

const courtGroup = new THREE.Group();
scene.add(courtGroup);

// Floor
const floorMat = new THREE.MeshStandardMaterial({
  color: 0xc98245,
  roughness: 0.75
});

const floor = new THREE.Mesh(
  new THREE.BoxGeometry(COURT_W, 0.3, COURT_L),
  floorMat
);

floor.position.y = -0.15;
floor.receiveShadow = true;
courtGroup.add(floor);

// Court lines
const lineMat = new THREE.MeshBasicMaterial({
  color: 0xffffff
});

function courtLine(width, height, x, y, z) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, z),
    lineMat
  );

  mesh.position.set(x, y, 0);
  courtGroup.add(mesh);
  return mesh;
}

// Sidelines
for (const x of [-COURT_W / 2, COURT_W / 2]) {
  const line = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.025, COURT_L),
    lineMat
  );
  line.position.set(x, 0.02, 0);
  courtGroup.add(line);
}

// Baselines
for (const z of [-COURT_L / 2, COURT_L / 2]) {
  const line = new THREE.Mesh(
    new THREE.BoxGeometry(COURT_W, 0.025, 0.08),
    lineMat
  );
  line.position.set(0, 0.02, z);
  courtGroup.add(line);
}

// Half court
const halfLine = new THREE.Mesh(
  new THREE.BoxGeometry(COURT_W, 0.025, 0.08),
  lineMat
);
halfLine.position.set(0, 0.025, 0);
courtGroup.add(halfLine);

// Center circle
const centerRing = new THREE.Mesh(
  new THREE.RingGeometry(2.0, 2.07, 64),
  lineMat
);
centerRing.rotation.x = -Math.PI / 2;
centerRing.position.y = 0.03;
courtGroup.add(centerRing);

// Three-point arcs
function makeArc(radius, z, rotation = 0) {
  const points = [];

  for (let i = 0; i <= 50; i++) {
    const t = i / 50;
    const angle = Math.PI * t;

    const x = Math.cos(angle) * radius;
    const zz = Math.sin(angle) * radius;

    points.push(new THREE.Vector3(x, 0.04, zz + z));
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);

  const line = new THREE.Line(
    geometry,
    new THREE.LineBasicMaterial({
      color: 0xffffff
    })
  );

  line.rotation.y = rotation;
  courtGroup.add(line);
}

makeArc(6.7, -COURT_L / 2 + 5.25);
makeArc(6.7, COURT_L / 2 - 5.25, Math.PI);

// Paint areas
function makePaint(z) {
  const paint = new THREE.Mesh(
    new THREE.PlaneGeometry(5.2, 5.8),
    new THREE.MeshBasicMaterial({
      color: 0xb44a35,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide
    })
  );

  paint.rotation.x = -Math.PI / 2;
  paint.position.set(0, 0.035, z);
  courtGroup.add(paint);

  const box = new THREE.Mesh(
    new THREE.BoxGeometry(5.2, 0.025, 5.8),
    lineMat
  );

  box.position.set(0, 0.06, z);
  courtGroup.add(box);
}

makePaint(-COURT_L / 2 + 2.9);
makePaint(COURT_L / 2 - 2.9);

// ============================================================
// BASKET
// ============================================================

const hoopHeight = 3.05;

function createHoop(z, facing) {
  const group = new THREE.Group();
  group.position.set(0, 0, z);
  scene.add(group);

  // Pole
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.22, 4.0, 16),
    new THREE.MeshStandardMaterial({ color: 0x333333 })
  );

  pole.position.set(0, 2, facing * 2.0);
  pole.castShadow = true;
  group.add(pole);

  // Backboard
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(5.2, 3.0, 0.18),
    new THREE.MeshStandardMaterial({
      color: 0xe8e8e8,
      roughness: 0.4
    })
  );

  board.position.set(0, 4.25, facing * 0.8);
  board.castShadow = true;
  group.add(board);

  // Backboard target
  const target = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 1.1, 0.05),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );

  target.position.set(0, 4.05, facing * 0.68);
  group.add(target);

  // Rim
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.75, 0.075, 12, 32),
    new THREE.MeshStandardMaterial({
      color: 0xff5a1f,
      metalness: 0.2,
      roughness: 0.5
    })
  );

  rim.rotation.x = Math.PI / 2;
  rim.position.set(0, hoopHeight, facing * 1.15);
  rim.castShadow = true;
  group.add(rim);

  // Net
  const netMat = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.6
  });

  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;

    const x = Math.cos(angle) * 0.72;
    const y = hoopHeight - 0.75;
    const zz = Math.sin(angle) * 0.72;

    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x, hoopHeight, facing * 1.15 + zz),
      new THREE.Vector3(x * 0.6, y, facing * 1.15 + zz * 0.6)
    ]);

    group.add(new THREE.Line(geo, netMat));
  }

  return {
    group,
    rimPosition: new THREE.Vector3(0, hoopHeight, z + facing * 1.15)
  };
}

const homeHoop = createHoop(-COURT_L / 2, 1);
const awayHoop = createHoop(COURT_L / 2, -1);

// ============================================================
// PLAYER
// ============================================================

function createPlayer(color) {
  const group = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.48, 1.25, 6, 12),
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.7
    })
  );

  body.position.y = 1.25;
  body.castShadow = true;
  group.add(body);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.36, 20, 20),
    new THREE.MeshStandardMaterial({
      color: 0xc68662
    })
  );

  head.position.y = 2.25;
  head.castShadow = true;
  group.add(head);

  // Number
  const number = new THREE.Mesh(
    new THREE.PlaneGeometry(0.45, 0.6),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide
    })
  );

  number.position.set(0, 1.4, -0.5);
  group.add(number);

  scene.add(group);

  return group;
}

const player = createPlayer(0x1976d2);
player.position.set(0, 0, 7);

// CPU
const cpu = createPlayer(0xd32f2f);
cpu.scale.setScalar(0.98);
cpu.position.set(0, 0, 1.5);

// ============================================================
// BALL
// ============================================================

const ballRadius = 0.24;

const ball = new THREE.Mesh(
  new THREE.SphereGeometry(ballRadius, 24, 24),
  new THREE.MeshStandardMaterial({
    color: 0xd86f28,
    roughness: 0.65
  })
);

ball.castShadow = true;
scene.add(ball);

// Ball state
let ballHeld = true;
let ballFlying = false;
let shotStart = new THREE.Vector3();
let shotVelocity = new THREE.Vector3();
let shotTarget = new THREE.Vector3();
let shotTime = 0;
let shotDuration = 0;

// ============================================================
// GAME STATE
// ============================================================

let homeScore = 0;
let awayScore = 0;

let gameTime = 120;
let gameRunning = false;
let gameEnded = false;

let shooting = false;
let shotCharge = 0;
let shotChargeDirection = 1;

const keys = {};

let lastTime = performance.now();
let messageTimer = 0;

// ============================================================
// INPUT
// ============================================================

window.addEventListener("keydown", (e) => {
  keys[e.code] = true;

  if (
    ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
      e.code
    )
  ) {
    e.preventDefault();
  }

  if (e.code === "Space" && !e.repeat) {
    beginShot();
  }

  if (e.code === "KeyR") {
    resetBall();
  }

  if (e.code === "Enter" && gameEnded) {
    restartGame();
  }
});

window.addEventListener("keyup", (e) => {
  keys[e.code] = false;

  if (e.code === "Space") {
    releaseShot();
  }
});

// Restart button
restartButton.addEventListener("click", restartGame);

// ============================================================
// MAIN MENU
// ============================================================

const menu = document.createElement("div");

menu.id = "mainMenu";

menu.innerHTML = `
  <div class="menuCard">
    <div class="menuKicker">ARCADE BASKETBALL</div>
    <h1>COURT<br><span>CLASH</span></h1>
    <p>3D Basketball • V1</p>
    <button id="playButton">PLAY GAME</button>
    <div class="menuControls">
      <span>WASD / ARROWS</span>
      <span>SHIFT — SPRINT</span>
      <span>SPACE — SHOOT</span>
    </div>
  </div>
`;

document.body.appendChild(menu);

const menuStyle = document.createElement("style");

menuStyle.textContent = `
  #mainMenu {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: center;
    background:
      radial-gradient(circle at 50% 30%, rgba(247,183,47,.16), transparent 35%),
      linear-gradient(135deg, #081018, #16110c);
    color: white;
  }

  .menuCard {
    width: min(520px, calc(100% - 40px));
    padding: 48px 36px;
    text-align: center;
    border: 1px solid rgba(255,255,255,.15);
    border-radius: 24px;
    background: rgba(8,10,14,.86);
    box-shadow: 0 25px 80px rgba(0,0,0,.55);
  }

  .menuKicker {
    color: #f7b731;
    font-size: 12px;
    font-weight: 900;
    letter-spacing: 5px;
    margin-bottom: 15px;
  }

  .menuCard h1 {
    margin: 0;
    font-size: clamp(48px, 10vw, 82px);
    line-height: .85;
    font-weight: 1000;
    font-style: italic;
  }

  .menuCard h1 span {
    color: #f7b731;
  }

  .menuCard p {
    opacity: .65;
    margin: 20px 0 28px;
  }

  #playButton {
    font-size: 18px;
    padding: 16px 42px;
    border-radius: 12px;
    background: #f7b731;
    border: 0;
    font-weight: 1000;
    cursor: pointer;
  }

  #playButton:hover {
    background: #ffc84d;
    transform: translateY(-2px);
  }

  .menuControls {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 28px;
  }

  .menuControls span {
    font-size: 10px;
    padding: 7px 9px;
    border-radius: 6px;
    background: rgba(255,255,255,.08);
    color: rgba(255,255,255,.7);
  }
`;

document.head.appendChild(menuStyle);

document.getElementById("playButton").addEventListener("click", startGame);

// ============================================================
// GAME START
// ============================================================

function startGame() {
  menu.style.display = "none";
  gameOver.classList.add("hidden");

  homeScore = 0;
  awayScore = 0;
  gameTime = 120;
  gameEnded = false;
  gameRunning = true;

  homeScoreEl.textContent = "0";
  awayScoreEl.textContent = "0";

  resetBall();

  player.position.set(0, 0, 7);
  cpu.position.set(0, 0, 1.5);

  statusEl.textContent = "CHECK BALL";

  showMessage("CHECK BALL");

  setTimeout(() => {
    if (gameRunning) {
      statusEl.textContent = "PLAY";
    }
  }, 1200);
}

function restartGame() {
  gameOver.classList.add("hidden");
  startGame();
}

// ============================================================
// PLAYER MOVEMENT
// ============================================================

function updatePlayer(dt) {
  if (!gameRunning || gameEnded) return;

  const direction = new THREE.Vector3();

  if (keys.KeyW || keys.ArrowUp) direction.z -= 1;
  if (keys.KeyS || keys.ArrowDown) direction.z += 1;
  if (keys.KeyA || keys.ArrowLeft) direction.x -= 1;
  if (keys.KeyD || keys.ArrowRight) direction.x += 1;

  if (direction.lengthSq() > 0) {
    direction.normalize();

    const sprint = keys.ShiftLeft || keys.ShiftRight;
    const speed = sprint ? 8.5 : 5.0;

    player.position.addScaledVector(direction, speed * dt);

    player.rotation.y = Math.atan2(direction.x, direction.z);
  }

  // Court bounds
  player.position.x = THREE.MathUtils.clamp(
    player.position.x,
    -COURT_W / 2 + 0.7,
    COURT_W / 2 - 0.7
  );

  player.position.z = THREE.MathUtils.clamp(
    player.position.z,
    -COURT_L / 2 + 0.8,
    COURT_L / 2 - 0.8
  );
}

// ============================================================
// CPU
// ============================================================

function updateCPU(dt) {
  if (!gameRunning || gameEnded) return;

  const target = ballHeld ? player.position : ball.position;

  const dir = new THREE.Vector3()
    .subVectors(target, cpu.position)
    .setY(0);

  const distance = dir.length();

  if (distance > 2.3) {
    dir.normalize();

    cpu.position.addScaledVector(dir, Math.min(3.2 * dt, distance));

    cpu.rotation.y = Math.atan2(dir.x, dir.z);
  }

  cpu.position.x = THREE.MathUtils.clamp(
    cpu.position.x,
    -COURT_W / 2 + 0.7,
    COURT_W / 2 - 0.7
  );

  cpu.position.z = THREE.MathUtils.clamp(
    cpu.position.z,
    -COURT_L / 2 + 0.8,
    COURT_L / 2 - 0.8
  );
}

// ============================================================
// BALL POSSESSION
// ============================================================

function updateHeldBall() {
  if (!ballHeld || ballFlying) return;

  const hand = new THREE.Vector3(0.75, 1.35, -0.2);
  hand.applyQuaternion(player.quaternion);

  ball.position.copy(player.position).add(hand);
}

// ============================================================
// SHOOTING
// ============================================================

function beginShot() {
  if (!gameRunning || gameEnded) return;
  if (!ballHeld || ballFlying || shooting) return;

  shooting = true;
  shotCharge = 0;
  shotChargeDirection = 1;

  shotMeter.classList.remove("hidden");
  meterFill.style.width = "0%";

  statusEl.textContent = "CHARGE";
}

function updateShotCharge(dt) {
  if (!shooting) return;

  shotCharge += shotChargeDirection * dt * 1.25;

  if (shotCharge >= 1) {
    shotCharge = 1;
    shotChargeDirection = -1;
  }

  if (shotCharge <= 0) {
    shotCharge = 0;
    shotChargeDirection = 1;
  }

  meterFill.style.width = `${shotCharge * 100}%`;

  if (shotCharge >= 0.76 && shotCharge <= 0.86) {
    meterFill.style.background = "#2ecc71";
  } else {
    meterFill.style.background = "#f7b731";
  }
}

function releaseShot() {
  if (!shooting) return;

  shooting = false;
  shotMeter.classList.add("hidden");

  if (!ballHeld) return;

  ballHeld = false;
  ballFlying = true;

  statusEl.textContent = "SHOT";

  const targetHoop = player.position.z < 0
    ? homeHoop.rimPosition
    : homeHoop.rimPosition;

  // Always shoot toward the nearest hoop.
  const hoopZ =
    player.position.z < 0
      ? -COURT_L / 2 + 1.15
      : COURT_L / 2 - 1.15;

  shotTarget.set(0, hoopHeight, hoopZ);

  shotStart.copy(ball.position);

  const distance = shotStart.distanceTo(
    new THREE.Vector3(shotTarget.x, 0, shotTarget.z)
  );

  // Longer shots need more flight time.
  shotDuration = THREE.MathUtils.clamp(
    0.65 + distance * 0.055,
    0.75,
    1.35
  );

  shotTime = 0;

  const horizontal = new THREE.Vector3(
    shotTarget.x - shotStart.x,
    0,
    shotTarget.z - shotStart.z
  );

  horizontal.divideScalar(shotDuration);

  // Shot accuracy.
  const perfect = shotCharge >= 0.76 && shotCharge <= 0.86;

  const accuracy =
    perfect
      ? 0
      : (Math.random() - 0.5) * (0.9 - shotCharge * 0.45);

  shotTarget.x += accuracy;
  shotTarget.z += accuracy;

  shotVelocity.copy(horizontal);

  const gravity = 13;

  // Calculate vertical velocity needed to reach target.
  shotVelocity.y =
    (shotTarget.y - shotStart.y + 0.5 * gravity * shotDuration ** 2) /
    shotDuration;

  // Better charging gives stronger shots.
  shotVelocity.multiplyScalar(
    0.88 + shotCharge * 0.18
  );
}

function updateBall(dt) {
  if (!ballFlying) return;

  shotTime += dt;

  const gravity = 13;

  ball.position.addScaledVector(shotVelocity, dt);
  shotVelocity.y -= gravity * dt;

  // Spin
  ball.rotation.x += dt * 8;
  ball.rotation.z += dt * 5;

  if (shotTime >= shotDuration) {
    resolveShot();
  }

  // Ball hit ground
  if (ball.position.y < ballRadius) {
    ball.position.y = ballRadius;

    if (Math.abs(shotVelocity.y) > 1) {
      shotVelocity.y *= -0.45;
      shotVelocity.x *= 0.65;
      shotVelocity.z *= 0.65;
    } else {
      ballFlying = false;
      ballHeld = true;
    }
  }
}

// ============================================================
// SHOT RESULT
// ============================================================

function resolveShot() {
  const distance = player.position.distanceTo(
    new THREE.Vector3(0, 0, shotTarget.z)
  );

  const threePoint =
    Math.abs(player.position.z) < 9
      ? false
      : true;

  const perfect =
    shotCharge >= 0.76 &&
    shotCharge <= 0.86;

  const distanceFromHoop = Math.abs(
    player.position.z - shotTarget.z
  );

  let chance;

  if (perfect) {
    chance = 0.95;
  } else {
    chance = 0.45 + shotCharge * 0.35;

    if (distanceFromHoop > 9) {
      chance -= 0.12;
    }

    if (distanceFromHoop > 13) {
      chance -= 0.18;
    }
  }

  const made = Math.random() < chance;

  ballFlying = false;

  if (made) {
    const points = distanceFromHoop >= 7.0 ? 3 : 2;

    homeScore += points;
    homeScoreEl.textContent = homeScore;

    showMessage(`+${points} POINT${points > 1 ? "S" : ""}!`);

    statusEl.textContent = "BUCKET";

    // Snap ball through hoop visually.
    ball.position.set(shotTarget.x, hoopHeight - 0.35, shotTarget.z);

    setTimeout(() => {
      if (gameRunning) resetBall();
    }, 700);
  } else {
    showMessage("MISS");

    statusEl.textContent = "REBOUND";

    // Drop ball toward court.
    ball.position.y = Math.max(ball.position.y, 1.0);

    setTimeout(() => {
      if (gameRunning) resetBall();
    }, 800);
  }
}

// ============================================================
// RESET BALL
// ============================================================

function resetBall() {
  shooting = false;
  ballFlying = false;
  ballHeld = true;

  shotMeter.classList.add("hidden");

  statusEl.textContent = gameRunning ? "PLAY" : "CHECK BALL";

  updateHeldBall();
}

// ============================================================
// MESSAGE
// ============================================================

function showMessage(text) {
  message.textContent = text;
  message.classList.remove("hidden");

  messageTimer = 1.0;
}

function updateMessage(dt) {
  if (messageTimer <= 0) return;

  messageTimer -= dt;

  if (messageTimer <= 0) {
    message.classList.add("hidden");
  }
}

// ============================================================
// CLOCK
// ============================================================

function updateClock(dt) {
  if (!gameRunning || gameEnded) return;

  gameTime -= dt;

  if (gameTime <= 0) {
    gameTime = 0;
    endGame();
  }

  const seconds = Math.ceil(gameTime);

  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;

  gameClockEl.textContent =
    `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

// ============================================================
// GAME OVER
// ============================================================

function endGame() {
  gameRunning = false;
  gameEnded = true;

  finalScore.textContent = `${homeScore} - ${awayScore}`;

  if (homeScore > awayScore) {
    finalTitle.textContent = "YOU WIN!";
  } else if (homeScore < awayScore) {
    finalTitle.textContent = "YOU LOSE";
  } else {
    finalTitle.textContent = "TIE GAME";
  }

  gameOver.classList.remove("hidden");
}

// ============================================================
// CAMERA
// ============================================================

function updateCamera(dt) {
  const target = new THREE.Vector3(
    player.position.x,
    0,
    player.position.z
  );

  const desired = new THREE.Vector3(
    player.position.x,
    10.5,
    player.position.z + 13
  );

  camera.position.lerp(desired, 1 - Math.pow(0.001, dt));

  camera.lookAt(
    target.x,
    0,
    target.z - 1
  );
}

// ============================================================
// RESIZE
// ============================================================

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ============================================================
// STARTUP
// ============================================================

function initialize() {
  loading.style.display = "none";

  gameClockEl.textContent = "02:00";
  homeScoreEl.textContent = "0";
  awayScoreEl.textContent = "0";

  player.position.set(0, 0, 7);
  cpu.position.set(0, 0, 1.5);

  resetBall();

  // Start with menu visible.
  menu.style.display = "flex";

  animate();
}

// ============================================================
// GAME LOOP
// ============================================================

function animate(now = performance.now()) {
  requestAnimationFrame(animate);

  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  updatePlayer(dt);
  updateCPU(dt);

  if (shooting) {
    updateShotCharge(dt);
  }

  updateHeldBall();
  updateBall(dt);

  updateClock(dt);
  updateMessage(dt);
  updateCamera(dt);

  renderer.render(scene, camera);
}

initialize();
