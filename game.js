import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

/*
===========================================================
COURT CLASH — 3D BASKETBALL 5V5
===========================================================

CONTROLS
WASD / ARROWS = Move
SHIFT         = Sprint
SPACE         = Hold / Release Shot
F             = Pass
Q             = Crossover
E             = Behind The Back
R             = Reset Possession
ESC           = Pause

===========================================================
*/

// ---------------------------------------------------------
// DOM
// ---------------------------------------------------------

const $ = id => document.getElementById(id);

const loading = $("loading");
const homeScoreEl = $("homeScore");
const awayScoreEl = $("awayScore");
const gameClockEl = $("gameClock");
const statusEl = $("status");
const shotMeter = $("shotMeter");
const meterFill = $("meterFill");
const messageEl = $("message");
const gameOver = $("gameOver");
const finalTitle = $("finalTitle");
const finalScore = $("finalScore");
const restartButton = $("restart");

// ---------------------------------------------------------
// CONFIG
// ---------------------------------------------------------

const COURT_W = 18;
const COURT_L = 30;

const GAME_LENGTH = 120;
const SHOT_CLOCK = 24;

const PLAYER_SPEED = 5.2;
const SPRINT_SPEED = 7.8;

const BALL_R = .24;
const HOOP_Y = 3.05;

const HOME_HOOP_Z = -14.0;
const AWAY_HOOP_Z = 14.0;

const HOME_COLOR = 0x1976d2;
const AWAY_COLOR = 0xd32f2f;

const clock = new THREE.Clock();

// ---------------------------------------------------------
// STATE
// ---------------------------------------------------------

const state = {
  running: false,
  paused: false,
  ended: false,

  gameTime: GAME_LENGTH,
  shotClock: SHOT_CLOCK,

  home: 0,
  away: 0,

  possession: "home",

  ballOwner: null,
  ballState: "held",

  shooter: null,

  shot: null,

  crowd: .25,
  crowdTarget: .25,

  standing: 0,
  standingTarget: 0,

  messageTimer: 0,
  chantTimer: 0,

  lastMargin: 0,

  audioStarted: false
};

// ---------------------------------------------------------
// THREE
// ---------------------------------------------------------

const scene = new THREE.Scene();

scene.background = new THREE.Color(0x080c14);

scene.fog = new THREE.Fog(
  0x080c14,
  38,
  85
);

const camera = new THREE.PerspectiveCamera(
  60,
  innerWidth / innerHeight,
  .1,
  150
);

const renderer = new THREE.WebGLRenderer({
  antialias: true
});

renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

renderer.outputColorSpace = THREE.SRGBColorSpace;

document.body.appendChild(renderer.domElement);

// ---------------------------------------------------------
// LIGHTING
// ---------------------------------------------------------

scene.add(
  new THREE.HemisphereLight(
    0xd8e7ff,
    0x141414,
    2
  )
);

const sun = new THREE.DirectionalLight(
  0xffffff,
  3.2
);

sun.position.set(10, 20, 10);
sun.castShadow = true;

sun.shadow.mapSize.width = 2048;
sun.shadow.mapSize.height = 2048;

scene.add(sun);

for (const x of [-11, 0, 11]) {
  for (const z of [-18, 0, 18]) {
    const light = new THREE.PointLight(
      0xffffff,
      8,
      32
    );

    light.position.set(x, 11, z);
    scene.add(light);
  }
}

// ---------------------------------------------------------
// MATERIAL HELPERS
// ---------------------------------------------------------

function mat(color, roughness = .7) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness
  });
}

const courtMat = mat(0xb96d3e);
const floorMat = mat(0x111720);
const whiteMat = new THREE.MeshBasicMaterial({
  color: 0xffffff
});

// ---------------------------------------------------------
// ARENA FLOOR
// ---------------------------------------------------------

const arena = new THREE.Mesh(
  new THREE.BoxGeometry(64, .4, 70),
  floorMat
);

arena.position.y = -.45;
arena.receiveShadow = true;

scene.add(arena);

// ---------------------------------------------------------
// COURT
// ---------------------------------------------------------

const court = new THREE.Mesh(
  new THREE.BoxGeometry(
    COURT_W,
    .28,
    COURT_L
  ),
  courtMat
);

court.position.y = -.14;
court.receiveShadow = true;

scene.add(court);

function line(w, d, x, z) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, .035, d),
    whiteMat
  );

  mesh.position.set(x, .025, z);
  scene.add(mesh);

  return mesh;
}

line(.08, COURT_L, -COURT_W / 2, 0);
line(.08, COURT_L, COURT_W / 2, 0);

line(COURT_W, .08, 0, -COURT_L / 2);
line(COURT_W, .08, 0, COURT_L / 2);

line(COURT_W, .06, 0, 0);

// Center circle
const centerCircle = new THREE.Mesh(
  new THREE.RingGeometry(2, 2.06, 64),
  whiteMat
);

centerCircle.rotation.x = -Math.PI / 2;
centerCircle.position.y = .045;

scene.add(centerCircle);

// ---------------------------------------------------------
// PAINT
// ---------------------------------------------------------

function paint(z) {
  const p = new THREE.Mesh(
    new THREE.PlaneGeometry(5.2, 5.8),
    new THREE.MeshBasicMaterial({
      color: 0x9b3d30,
      transparent: true,
      opacity: .55
    })
  );

  p.rotation.x = -Math.PI / 2;
  p.position.set(0, .04, z);

  scene.add(p);

  line(5.2, .07, 0, z - 2.9);
  line(5.2, .07, 0, z + 2.9);

  line(.07, 5.8, -2.6, z);
  line(.07, 5.8, 2.6, z);
}

paint(-11.1);
paint(11.1);

// ---------------------------------------------------------
// THREE POINT LINES
// ---------------------------------------------------------

function threeLine(centerZ, direction) {
  const points = [];

  const r = 6.75;

  for (let i = 0; i <= 64; i++) {
    const t = i / 64;
    const angle = Math.PI * t;

    points.push(
      new THREE.Vector3(
        Math.cos(angle) * r,
        .05,
        centerZ +
          direction *
          Math.sin(angle) *
          r
      )
    );
  }

  const geometry =
    new THREE.BufferGeometry()
      .setFromPoints(points);

  scene.add(
    new THREE.Line(
      geometry,
      whiteMat
    )
  );
}

threeLine(-13.7, 1);
threeLine(13.7, -1);

// ---------------------------------------------------------
// HOOPS
// ---------------------------------------------------------

function makeHoop(z, facing) {
  const group = new THREE.Group();

  group.position.z = z;

  scene.add(group);

  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(
      .18,
      .25,
      4.2,
      16
    ),
    mat(0x333941)
  );

  pole.position.set(
    0,
    2,
    facing * 2
  );

  pole.castShadow = true;

  group.add(pole);

  const board = new THREE.Mesh(
    new THREE.BoxGeometry(
      5.1,
      3,
      .18
    ),
    mat(0xf3f3f3)
  );

  board.position.set(
    0,
    4.25,
    facing * .8
  );

  board.castShadow = true;

  group.add(board);

  const target = new THREE.Mesh(
    new THREE.BoxGeometry(
      1.8,
      1.1,
      .04
    ),
    whiteMat
  );

  target.position.set(
    0,
    4.05,
    facing * .69
  );

  group.add(target);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(
      .75,
      .075,
      12,
      32
    ),
    mat(0xff5a1f)
  );

  rim.rotation.x = Math.PI / 2;

  rim.position.set(
    0,
    HOOP_Y,
    facing * 1.15
  );

  group.add(rim);

  // Net
  const netMat = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: .55
  });

  for (let i = 0; i < 14; i++) {
    const a =
      i / 14 *
      Math.PI *
      2;

    const x = Math.cos(a) * .72;
    const zz = Math.sin(a) * .72;

    const g =
      new THREE.BufferGeometry()
        .setFromPoints([
          new THREE.Vector3(
            x,
            HOOP_Y,
            facing * 1.15 + zz
          ),
          new THREE.Vector3(
            x * .55,
            HOOP_Y - .75,
            facing * 1.15 + zz * .55
          )
        ]);

    group.add(
      new THREE.Line(
        g,
        netMat
      )
    );
  }

  return new THREE.Vector3(
    0,
    HOOP_Y,
    z + facing * 1.15
  );
}

const homeHoop = makeHoop(
  HOME_HOOP_Z,
  1
);

const awayHoop = makeHoop(
  AWAY_HOOP_Z,
  -1
);

// ---------------------------------------------------------
// CROWD
// ---------------------------------------------------------

const fans = [];

const fanColors = [
  0x1976d2,
  0xd32f2f,
  0xffca28,
  0xffffff,
  0x43a047,
  0x8e24aa,
  0xff7043,
  0x26a69a
];

function createFan(x, y, z, scale = 1) {
  const group = new THREE.Group();

  const shirt =
    fanColors[
      Math.floor(
        Math.random() *
        fanColors.length
      )
    ];

  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(
      .14 * scale,
      .35 * scale,
      5,
      8
    ),
    mat(shirt)
  );

  body.position.y =
    .35 * scale;

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(
      .14 * scale,
      8,
      8
    ),
    mat(0xb9795d)
  );

  head.position.y =
    .75 * scale;

  group.add(body);
  group.add(head);

  group.position.set(
    x,
    y,
    z
  );

  scene.add(group);

  fans.push({
    group,
    body,
    baseY: y,
    phase: Math.random() * Math.PI * 2,
    speed: .7 + Math.random() * 1.7
  });
}

// Back stands
for (let row = 0; row < 6; row++) {
  for (let i = 0; i < 36; i++) {
    const x = -22 + i * 1.25;

    createFan(
      x,
      row * .55,
      -19 - row * 1.15
    );

    createFan(
      x,
      row * .55,
      19 + row * 1.15
    );
  }
}

// Side stands
for (let row = 0; row < 4; row++) {
  for (let i = 0; i < 25; i++) {
    const z = -14 + i * 1.16;

    createFan(
      -12 - row * 1.25,
      row * .55,
      z,
      .9
    );

    createFan(
      12 + row * 1.25,
      row * .55,
      z,
      .9
    );
  }
}

// ---------------------------------------------------------
// PLAYERS
// ---------------------------------------------------------

const players = [];

function makePlayer(team, number, role) {
  const group = new THREE.Group();

  const color =
    team === "home"
      ? HOME_COLOR
      : AWAY_COLOR;

  const accent =
    team === "home"
      ? 0xffffff
      : 0xffffff;

  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(
      .43,
      1.12,
      6,
      12
    ),
    mat(color)
  );

  body.position.y = 1.2;
  body.castShadow = true;

  group.add(body);

  const shorts = new THREE.Mesh(
    new THREE.BoxGeometry(
      .82,
      .45,
      .5
    ),
    mat(color)
  );

  shorts.position.y = .65;

  group.add(shorts);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(
      .34,
      16,
      16
    ),
    mat(0xb97858)
  );

  head.position.y = 2.18;
  head.castShadow = true;

  group.add(head);

  const headband = new THREE.Mesh(
    new THREE.TorusGeometry(
      .345,
      .035,
      8,
      20
    ),
    mat(accent)
  );

  headband.rotation.x =
    Math.PI / 2;

  headband.position.y =
    2.19;

  group.add(headband);

  scene.add(group);

  const p = {
    mesh: group,

    team,
    number,
    role,

    velocity:
      new THREE.Vector3(),

    target:
      new THREE.Vector3(),

    stamina: 1,

    dribbleTime:
      Math.random() * 10,

    action: "idle",

    actionTime: 0,

    cooldown: 0,

    hasBall: false,

    homeSpot:
      new THREE.Vector3(),

    aiTimer:
      Math.random() * 2
  };

  players.push(p);

  return p;
}

// Home
const homePG = makePlayer(
  "home",
  1,
  "PG"
);

const homeSG = makePlayer(
  "home",
  2,
  "SG"
);

const homeSF = makePlayer(
  "home",
  3,
  "SF"
);

const homePF = makePlayer(
  "home",
  4,
  "PF"
);

const homeC = makePlayer(
  "home",
  5,
  "C"
);

// Away
const awayPG = makePlayer(
  "away",
  1,
  "PG"
);

const awaySG = makePlayer(
  "away",
  2,
  "SG"
);

const awaySF = makePlayer(
  "away",
  3,
  "SF"
);

const awayPF = makePlayer(
  "away",
  4,
  "PF"
);

const awayC = makePlayer(
  "away",
  5,
  "C"
);

const homeTeam = [
  homePG,
  homeSG,
  homeSF,
  homePF,
  homeC
];

const awayTeam = [
  awayPG,
  awaySG,
  awaySF,
  awayPF,
  awayC
];

function setFormation() {
  homePG.homeSpot.set(
    0,
    0,
    7
  );

  homeSG.homeSpot.set(
    -5.2,
    0,
    5
  );

  homeSF.homeSpot.set(
    5.2,
    0,
    5
  );

  homePF.homeSpot.set(
    -3.4,
    0,
    1.5
  );

  homeC.homeSpot.set(
    3.4,
    0,
    1.5
  );

  awayPG.homeSpot.set(
    0,
    0,
    2
  );

  awaySG.homeSpot.set(
    -5.2,
    0,
    -1
  );

  awaySF.homeSpot.set(
    5.2,
    0,
    -1
  );

  awayPF.homeSpot.set(
    -3.4,
    0,
    -4
  );

  awayC.homeSpot.set(
    3.4,
    0,
    -4
  );
}

setFormation();

// ---------------------------------------------------------
// BALL
// ---------------------------------------------------------

const ball = new THREE.Mesh(
  new THREE.SphereGeometry(
    BALL_R,
    24,
    24
  ),
  mat(0xd87528)
);

ball.castShadow = true;

scene.add(ball);

// ---------------------------------------------------------
// INPUT
// ---------------------------------------------------------

const keys = {};

window.addEventListener(
  "keydown",
  e => {
    if (
      [
        "Space",
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight"
      ].includes(e.code)
    ) {
      e.preventDefault();
    }

    keys[e.code] = true;

    startAudio();

    if (
      e.code === "Space" &&
      !e.repeat
    ) {
      beginShot();
    }

    if (
      e.code === "KeyF" &&
      !e.repeat
    ) {
      passBall();
    }

    if (
      e.code === "KeyQ" &&
      !e.repeat
    ) {
      crossover();
    }

    if (
      e.code === "KeyE" &&
      !e.repeat
    ) {
      behindBack();
    }

    if (e.code === "KeyR") {
      resetPossession();
    }

    if (e.code === "Escape") {
      togglePause();
    }
  }
);

window.addEventListener(
  "keyup",
  e => {
    keys[e.code] = false;

    if (e.code === "Space") {
      releaseShot();
    }
  }
);

// ---------------------------------------------------------
// AUDIO
// ---------------------------------------------------------

let audio = null;
let master = null;

function startAudio() {
  if (state.audioStarted) return;

  try {
    audio =
      new (
        window.AudioContext ||
        window.webkitAudioContext
      )();

    master =
      audio.createGain();

    master.gain.value = .07;

    master.connect(
      audio.destination
    );

    state.audioStarted = true;
  } catch {}
}

function sound(strength = .5) {
  if (!audio || !master) return;

  const duration =
    .15 + strength * .4;

  const buffer =
    audio.createBuffer(
      1,
      audio.sampleRate *
        duration,
      audio.sampleRate
    );

  const data =
    buffer.getChannelData(0);

  for (
    let i = 0;
    i < data.length;
    i++
  ) {
    data[i] =
      (Math.random() * 2 - 1) *
      (1 - i / data.length);
  }

  const source =
    audio.createBufferSource();

  const gain =
    audio.createGain();

  gain.gain.value =
    .15 * strength;

  source.buffer = buffer;

  source.connect(gain);
  gain.connect(master);

  source.start();
}

// ---------------------------------------------------------
// MENU
// ---------------------------------------------------------

const menu =
  document.createElement("div");

menu.id = "gameMenu";

menu.innerHTML = `
  <div class="menuCard">
    <div class="eyebrow">
      COURT CLASH
    </div>

    <h1>
      5V5<br>
      <span>BASKETBALL</span>
    </h1>

    <p>
      Full-court 3D basketball
    </p>

    <button id="startGameButton">
      START GAME
    </button>

    <div class="help">
      <span>WASD / ARROWS — MOVE</span>
      <span>SHIFT — SPRINT</span>
      <span>SPACE — SHOOT</span>
      <span>F — PASS</span>
      <span>Q — CROSSOVER</span>
      <span>E — BEHIND BACK</span>
      <span>R — RESET</span>
    </div>
  </div>
`;

document.body.appendChild(menu);

const menuStyle =
  document.createElement("style");

menuStyle.textContent = `
#gameMenu {
  position:fixed;
  inset:0;
  z-index:100;
  display:flex;
  align-items:center;
  justify-content:center;
  background:
    radial-gradient(
      circle,
      rgba(247,183,49,.15),
      transparent 40%
    ),
    linear-gradient(
      135deg,
      #05080d,
      #17110b
    );
  color:white;
}

.menuCard {
  width:min(600px,calc(100% - 30px));
  padding:45px 35px;
  text-align:center;
  border-radius:24px;
  background:rgba(7,10,15,.94);
  border:1px solid rgba(255,255,255,.15);
  box-shadow:0 30px 100px #000;
}

.eyebrow {
  color:#f7b731;
  font-size:11px;
  font-weight:900;
  letter-spacing:5px;
}

.menuCard h1 {
  font-size:clamp(48px,10vw,88px);
  line-height:.82;
  font-style:italic;
  margin:18px 0;
}

.menuCard h1 span {
  color:#f7b731;
}

.menuCard p {
  opacity:.55;
}

#startGameButton {
  margin:20px;
  padding:16px 42px;
  border:0;
  border-radius:12px;
  background:#f7b731;
  color:#111;
  font-size:17px;
  font-weight:1000;
  cursor:pointer;
}

.help {
  display:grid;
  gap:6px;
  font-size:10px;
  letter-spacing:1px;
  opacity:.5;
}
`;

document.head.appendChild(
  menuStyle
);

$("startGameButton")?.addEventListener(
  "click",
  () => {
    menu.style.display = "none";
    startGame();
  }
);

// ---------------------------------------------------------
// EXTRA HUD
// ---------------------------------------------------------

const extra = document.createElement("div");

extra.innerHTML = `
  <div id="extraHUD">

    <div id="shotClockBox">
      <small>SHOT CLOCK</small>
      <strong id="shotClock">24</strong>
    </div>

    <div id="possession">
      HOME BALL
    </div>

    <div id="crowdHUD">
      CROWD:
      <span id="crowdLevel">
        CALM
      </span>
    </div>

    <div id="pauseScreen">
      <div>
        <h1>PAUSED</h1>
        <p>Press ESC to resume</p>
      </div>
    </div>

  </div>
`;

document.body.appendChild(extra);

const extraCSS =
  document.createElement("style");

extraCSS.textContent = `
#shotClockBox {
  position:fixed;
  top:20px;
  right:20px;
  z-index:10;
  color:white;
  background:rgba(0,0,0,.8);
  border:1px solid #ffffff25;
  padding:8px 15px;
  border-radius:12px;
  text-align:center;
}

#shotClockBox small {
  display:block;
  font-size:8px;
  letter-spacing:2px;
  opacity:.6;
}

#shotClock {
  display:block;
  font-size:30px;
}

#possession {
  position:fixed;
  top:112px;
  left:50%;
  transform:translateX(-50%);
  z-index:10;
  background:#000b;
  color:white;
  border-radius:999px;
  padding:6px 14px;
  font-size:9px;
  font-weight:900;
  letter-spacing:1px;
}

#crowdHUD {
  position:fixed;
  top:20px;
  left:20px;
  z-index:10;
  color:white;
  background:#000b;
  padding:8px 12px;
  border-radius:8px;
  font-size:9px;
  letter-spacing:1px;
}

#crowdLevel {
  color:#f7b731;
  font-weight:900;
}

#pauseScreen {
  position:fixed;
  inset:0;
  z-index:50;
  display:none;
  place-items:center;
  background:#000b;
  color:white;
  text-align:center;
}

#pauseScreen.active {
  display:grid;
}

#pauseScreen h1 {
  font-size:60px;
  margin:0;
}

#pauseScreen p {
  opacity:.6;
}
`;

document.head.appendChild(
  extraCSS
);

const shotClockEl =
  document.getElementById(
    "shotClock"
  );

const possessionEl =
  document.getElementById(
    "possession"
  );

const crowdLevelEl =
  document.getElementById(
    "crowdLevel"
  );

const pauseScreen =
  document.getElementById(
    "pauseScreen"
  );

// ---------------------------------------------------------
// START
// ---------------------------------------------------------

function startGame() {
  startAudio();

  state.running = true;
  state.paused = false;
  state.ended = false;

  state.gameTime =
    GAME_LENGTH;

  state.shotClock =
    SHOT_CLOCK;

  state.home = 0;
  state.away = 0;

  state.possession =
    "home";

  state.crowd = .25;
  state.crowdTarget = .25;

  state.standing = 0;
  state.standingTarget = 0;

  gameOver.classList.add("hidden");

  placeTeams();

  resetPossession();

  updateScore();

  showMessage(
    "CHECK BALL"
  );

  setTimeout(() => {
    if (state.running) {
      statusEl.textContent =
        "HOME BALL";
    }
  }, 1000);
}

function placeTeams() {
  setFormation();

  homeTeam.forEach((p, i) => {
    p.mesh.position.copy(
      p.homeSpot
    );

    p.mesh.position.x +=
      (Math.random() - .5) *
      .4;

    p.mesh.position.z +=
      (Math.random() - .5) *
      .4;

    p.velocity.set(0, 0, 0);
  });

  awayTeam.forEach((p, i) => {
    p.mesh.position.set(
      p.homeSpot.x,
      0,
      p.homeSpot.z
    );

    p.velocity.set(0, 0, 0);
  });
}

// ---------------------------------------------------------
// PLAYER MOVEMENT
// ---------------------------------------------------------

function getControlledPlayer() {
  return homePG;
}

function updateControlledPlayer(dt) {
  if (
    !state.running ||
    state.paused ||
    state.ended
  ) return;

  const p =
    getControlledPlayer();

  if (
    !p.hasBall &&
    state.ballOwner !== p
  ) {
    // Still allow movement.
  }

  const dir =
    new THREE.Vector3();

  if (
    keys.KeyW ||
    keys.ArrowUp
  ) dir.z -= 1;

  if (
    keys.KeyS ||
    keys.ArrowDown
  ) dir.z += 1;

  if (
    keys.KeyA ||
    keys.ArrowLeft
  ) dir.x -= 1;

  if (
    keys.KeyD ||
    keys.ArrowRight
  ) dir.x += 1;

  const moving =
    dir.lengthSq() > 0;

  const sprint =
    keys.ShiftLeft ||
    keys.ShiftRight;

  const speed =
    sprint &&
    p.stamina > .05
      ? SPRINT_SPEED
      : PLAYER_SPEED;

  if (moving) {
    dir.normalize();

    p.velocity.lerp(
      new THREE.Vector3(
        dir.x * speed,
        0,
        dir.z * speed
      ),
      .18
    );

    p.mesh.rotation.y =
      Math.atan2(
        dir.x,
        dir.z
      );

    if (sprint) {
      p.stamina =
        Math.max(
          0,
          p.stamina -
          dt * .35
        );
    }
  } else {
    p.velocity.multiplyScalar(.8);

    p.stamina =
      Math.min(
        1,
        p.stamina +
        dt * .25
      );
  }

  p.mesh.position.addScaledVector(
    p.velocity,
    dt
  );

  clampPlayer(p);

  p.dribbleTime +=
    dt * (
      moving ? 10 : 5
    );
}

function clampPlayer(p) {
  p.mesh.position.x =
    THREE.MathUtils.clamp(
      p.mesh.position.x,
      -COURT_W / 2 + .5,
      COURT_W / 2 - .5
    );

  p.mesh.position.z =
    THREE.MathUtils.clamp(
      p.mesh.position.z,
      -COURT_L / 2 + .5,
      COURT_L / 2 - .5
    );
}

// ---------------------------------------------------------
// AI TEAMMATES
// ---------------------------------------------------------

function updateHomeAI(dt) {
  for (const p of homeTeam) {
    if (p === homePG) continue;

    const target =
      p.homeSpot.clone();

    const ballPlayer =
      getBallPlayer();

    if (
      state.possession === "home" &&
      ballPlayer
    ) {
      const side =
        p.number % 2 === 0
          ? -1
          : 1;

      target.x =
        side *
        (3.2 +
        p.number * .35);

      target.z =
        3.5 +
        p.number * .6;

      // Center stays closer to paint.
      if (p.role === "C") {
        target.x *= .5;
        target.z = 1;
      }

      // Occasionally cut.
      if (
        Math.random() < dt * .18
      ) {
        target.x *= .5;
        target.z =
          THREE.MathUtils.lerp(
            target.z,
            -2,
            .35
          );
      }
    }

    moveAIPlayer(
      p,
      target,
      dt,
      3.2
    );
  }
}

// ---------------------------------------------------------
// AWAY AI
// ---------------------------------------------------------

function updateAwayAI(dt) {
  const ballPlayer =
    getBallPlayer();

  for (const p of awayTeam) {
    let target =
      p.homeSpot.clone();

    if (
      state.possession === "home" &&
      ballPlayer
    ) {
      // Defensive assignment.
      const assignment =
        closestHomePlayer(
          p
        );

      if (assignment) {
        target =
          assignment.mesh.position
            .clone();

        const dx =
          target.x -
          p.mesh.position.x;

        const dz =
          target.z -
          p.mesh.position.z;

        const len =
          Math.hypot(dx, dz);

        if (len > 0) {
          target.x -=
            dx / len * 1.1;

          target.z -=
            dz / len * 1.1;
        }
      }
    }

    if (
      state.possession === "away"
    ) {
      const owner =
        getBallPlayer();

      if (
        owner &&
        owner.team === "away" &&
        p !== owner
      ) {
        target =
          p.homeSpot.clone();

        // Give spacing.
        target.x +=
          Math.sin(
            performance.now() * .001 +
            p.number
          ) * .7;
      }
    }

    moveAIPlayer(
      p,
      target,
      dt,
      3.3
    );

    // CPU steals.
    if (
      state.possession === "home" &&
      ballPlayer &&
      p.mesh.position.distanceTo(
        ballPlayer.mesh.position
      ) < .9 &&
      Math.random() < dt * .025
    ) {
      stealFromHome(p);
    }
  }
}

function moveAIPlayer(
  p,
  target,
  dt,
  speed
) {
  const dx =
    target.x -
    p.mesh.position.x;

  const dz =
    target.z -
    p.mesh.position.z;

  const distance =
    Math.hypot(dx, dz);

  if (distance > .25) {
    const dir =
      new THREE.Vector3(
        dx / distance,
        0,
        dz / distance
      );

    p.velocity.lerp(
      dir.multiplyScalar(speed),
      .1
    );

    p.mesh.rotation.y =
      Math.atan2(
        p.velocity.x,
        p.velocity.z
      );
  } else {
    p.velocity.multiplyScalar(.8);
  }

  p.mesh.position.addScaledVector(
    p.velocity,
    dt
  );

  clampPlayer(p);
}

// ---------------------------------------------------------
// ASSIGNMENTS
// ---------------------------------------------------------

function closestHomePlayer(defender) {
  let best = null;
  let bestDistance = Infinity;

  for (const p of homeTeam) {
    const d =
      p.mesh.position.distanceTo(
        defender.mesh.position
      );

    if (d < bestDistance) {
      bestDistance = d;
      best = p;
    }
  }

  return best;
}

// ---------------------------------------------------------
// BALL
// ---------------------------------------------------------

function getBallPlayer() {
  return players.find(
    p => p.hasBall
  );
}

function giveBall(p) {
  players.forEach(
    x => x.hasBall = false
  );

  p.hasBall = true;

  state.ballOwner = p;
  state.ballState = "held";
  state.possession = p.team;

  updatePossession();
}

function updateBall(dt) {
  if (
    state.ballState === "flying"
  ) {
    updateBallFlight(dt);
    return;
  }

  if (
    state.ballState === "loose"
  ) {
    updateLooseBall(dt);
    return;
  }

  const owner =
    getBallPlayer();

  if (!owner) return;

  const moving =
    owner.velocity.length() > .4;

  owner.dribbleTime +=
    dt *
    (moving ? 10 : 5);

  const bounce =
    Math.abs(
      Math.sin(
        owner.dribbleTime
      )
    );

  const side =
    owner === homePG
      ? .6
      : .45;

  ball.position.set(
    owner.mesh.position.x +
      Math.sin(
        owner.mesh.rotation.y
      ) * side,

    .65 +
      bounce * .35,

    owner.mesh.position.z -
      Math.cos(
        owner.mesh.rotation.y
      ) * .48
  );

  ball.rotation.x +=
    dt * 10;

  ball.rotation.z +=
    dt * 7;
}

// ---------------------------------------------------------
// PASSING
// ---------------------------------------------------------

function passBall() {
  if (
    !state.running ||
    state.paused ||
    state.ended
  ) return;

  const owner =
    getBallPlayer();

  if (
    !owner ||
    owner.team !== "home"
  ) return;

  const teammates =
    homeTeam.filter(
      p =>
        p !== owner
    );

  teammates.sort(
    (a, b) =>
      a.mesh.position.distanceTo(
        owner.mesh.position
      ) -
      b.mesh.position.distanceTo(
        owner.mesh.position
      )
  );

  const target =
    teammates.find(
      p =>
        p.mesh.position.distanceTo(
          closestOpponent(p)
        ) > 2
    ) ||
    teammates[0];

  if (!target) return;

  owner.hasBall = false;

  state.ballOwner = null;
  state.ballState = "flying";

  const start =
    ball.position.clone();

  const end =
    target.mesh.position.clone();

  end.y = 1.15;

  const distance =
    start.distanceTo(end);

  const duration =
    THREE.MathUtils.clamp(
      .3 + distance * .04,
      .3,
      .7
    );

  state.shot = {
    type: "pass",
    time: 0,
    duration,
    start,
    target: end,
    receiver: target
  };

  sound(.25);
}

function closestOpponent(p) {
  const team =
    p.team === "home"
      ? awayTeam
      : homeTeam;

  let best =
    team[0];

  let dist = Infinity;

  for (const opponent of team) {
    const d =
      opponent.mesh.position.distanceTo(
        p.mesh.position
      );

    if (d < dist) {
      dist = d;
      best = opponent;
    }
  }

  return best;
}

// ---------------------------------------------------------
// SHOOTING
// ---------------------------------------------------------

let charge = 0;
let shooting = false;

function beginShot() {
  if (
    !state.running ||
    state.paused ||
    state.ended
  ) return;

  const owner =
    getBallPlayer();

  if (
    owner !== homePG ||
    state.possession !== "home"
  ) return;

  shooting = true;
  charge = 0;

  shotMeter.classList.remove(
    "hidden"
  );

  statusEl.textContent =
    "CHARGE";
}

function updateCharge(dt) {
  if (!shooting) return;

  charge += dt * 1.05;

  if (charge > 1)
    charge = 0;

  meterFill.style.width =
    `${charge * 100}%`;

  if (
    charge >= .74 &&
    charge <= .86
  ) {
    meterFill.style.background =
      "#2ecc71";
  } else {
    meterFill.style.background =
      "#f7b731";
  }
}

function releaseShot() {
  if (!shooting) return;

  shooting = false;

  shotMeter.classList.add(
    "hidden"
  );

  const owner =
    getBallPlayer();

  if (
    owner !== homePG
  ) return;

  const target =
    awayHoop;

  const start =
    ball.position.clone();

  const distance =
    Math.hypot(
      start.x - target.x,
      start.z - target.z
    );

  const isThree =
    distance >= 6.75;

  const perfect =
    charge >= .74 &&
    charge <= .86;

  const defender =
    closestOpponent(owner);

  const contestDistance =
    defender
      ? defender.mesh.position.distanceTo(
          owner.mesh.position
        )
      : 99;

  let chance =
    .48 +
    charge * .35;

  if (perfect)
    chance += .2;

  if (contestDistance < 1.5)
    chance -= .15;

  if (contestDistance < .85)
    chance -= .2;

  if (isThree)
    chance -= .07;

  chance =
    THREE.MathUtils.clamp(
      chance,
      .08,
      .96
    );

  const made =
    Math.random() < chance;

  let targetPoint =
    target.clone();

  if (!made) {
    targetPoint.x +=
      (Math.random() - .5) *
      (perfect ? .25 : .8);

    targetPoint.z +=
      (Math.random() - .5) *
      (perfect ? .25 : .8);
  }

  const duration =
    THREE.MathUtils.clamp(
      .75 +
      distance * .05,
      .75,
      1.35
    );

  owner.hasBall = false;

  state.ballOwner = null;
  state.ballState = "flying";

  state.shot = {
    type: "shot",
    time: 0,
    duration,
    start,
    target: targetPoint,
    made,
    three: isThree,
    perfect
  };

  statusEl.textContent =
    "SHOT";

  sound(.3);
}

// ---------------------------------------------------------
// BALL FLIGHT
// ---------------------------------------------------------

function updateBallFlight(dt) {
  if (!state.shot) return;

  const s = state.shot;

  s.time += dt;

  if (s.type === "pass") {
    const t =
      Math.min(
        1,
        s.time / s.duration
      );

    ball.position.lerpVectors(
      s.start,
      s.target,
      t
    );

    ball.position.y +=
      Math.sin(
        t * Math.PI
      ) * 1.1;

    ball.rotation.x +=
      dt * 10;

    if (t >= 1) {
      giveBall(s.receiver);
      state.shot = null;
      statusEl.textContent =
        "HOME BALL";
    }

    return;
  }

  const gravity = 13;

  const t =
    Math.min(
      1,
      s.time / s.duration
    );

  const horizontal =
    new THREE.Vector3(
      s.target.x -
        s.start.x,
      0,
      s.target.z -
        s.start.z
    );

  const x =
    s.start.x +
    horizontal.x * t;

  const z =
    s.start.z +
    horizontal.z * t;

  const y =
    THREE.MathUtils.lerp(
      s.start.y,
      s.target.y,
      t
    ) +
    Math.sin(
      t * Math.PI
    ) *
    Math.max(
      2,
      horizontal.length() * .22
    );

  ball.position.set(
    x,
    y,
    z
  );

  ball.rotation.x +=
    dt * 9;

  ball.rotation.z +=
    dt * 6;

  if (t >= 1) {
    finishShot();
  }
}

// ---------------------------------------------------------
// SHOT RESULT
// ---------------------------------------------------------

function finishShot() {
  const s = state.shot;

  state.shot = null;

  if (!s) return;

  if (s.made) {
    const points =
      s.three ? 3 : 2;

    state.home += points;

    updateScore();

    state.crowdTarget =
      Math.min(
        1,
        state.crowdTarget +
        (s.three ? .55 : .3)
      );

    if (s.three) {
      showMessage(
        s.perfect
          ? "PERFECT THREE!"
          : "THREE!!!"
      );
      sound(1);
    } else {
      showMessage(
        s.perfect
          ? "PERFECT!"
          : "BUCKET!"
      );
      sound(.7);
    }

    state.ballState = "loose";

    setTimeout(() => {
      if (state.running)
        cpuCheckInbound();
    }, 700);
  } else {
    showMessage(
      "MISS!"
    );

    state.crowdTarget =
      Math.max(
        .05,
        state.crowdTarget -
        .08
      );

    sound(.15);

    state.ballState = "loose";

    setTimeout(
      rebound,
      500
    );
  }
}

// ---------------------------------------------------------
// REBOUND
// ---------------------------------------------------------

function updateLooseBall(dt) {
  ball.position.y -=
    8 * dt;

  if (ball.position.y < .3) {
    ball.position.y = .3;
  }

  ball.rotation.x +=
    dt * 8;
}

function rebound() {
  if (
    !state.running ||
    state.ended
  ) return;

  let closest = null;
  let best = Infinity;

  for (const p of players) {
    const d =
      p.mesh.position.distanceTo(
        ball.position
      );

    if (d < best) {
      best = d;
      closest = p;
    }
  }

  if (closest) {
    giveBall(closest);

    resetShotClock();

    if (
      closest.team === "home"
    ) {
      showMessage(
        "REBOUND!"
      );

      statusEl.textContent =
        "HOME BALL";
    } else {
      showMessage(
        "AWAY REBOUND"
      );

      statusEl.textContent =
        "AWAY BALL";

      setTimeout(
        cpuPossession,
        650
      );
    }
  }
}

// ---------------------------------------------------------
// CPU OFFENSE
// ---------------------------------------------------------

function cpuCheckInbound() {
  const cpu =
    awayPG;

  giveBall(cpu);

  cpu.mesh.position.set(
    0,
    0,
    7
  );

  statusEl.textContent =
    "AWAY BALL";

  setTimeout(
    cpuPossession,
    600
  );
}

function cpuPossession() {
  if (
    !state.running ||
    state.ended ||
    state.possession !== "away"
  ) return;

  const owner =
    getBallPlayer();

  if (!owner) {
    giveBall(awayPG);
    return;
  }

  if (
    owner.team !== "away"
  ) return;

  // Move toward attack.
  owner.target.set(
    0,
    0,
    -7
  );

  moveAIPlayer(
    owner,
    owner.target,
    .35,
    3.8
  );

  const distance =
    owner.mesh.position.distanceTo(
      homeHoop
    );

  if (
    distance < 10 ||
    Math.random() < .03
  ) {
    cpuShoot(owner);
  } else {
    setTimeout(
      cpuPossession,
      300
    );
  }
}

function cpuShoot(owner) {
  if (
    !owner ||
    owner.team !== "away"
  ) return;

  const target =
    homeHoop.clone();

  const start =
    ball.position.clone();

  const distance =
    start.distanceTo(
      target
    );

  const three =
    distance > 6.75;

  let chance =
    .42;

  if (!three)
    chance += .1;

  if (
    Math.random() < .08
  ) {
    chance += .15;
  }

  const made =
    Math.random() < chance;

  if (!made) {
    target.x +=
      (Math.random() - .5) *
      .9;

    target.z +=
      (Math.random() - .5) *
      .9;
  }

  owner.hasBall = false;

  state.ballOwner = null;
  state.ballState = "flying";

  state.shot = {
    type: "cpuShot",
    time: 0,
    duration:
      THREE.MathUtils.clamp(
        .8 +
        distance * .04,
        .8,
        1.3
      ),
    start,
    target,
    made,
    three
  };

  statusEl.textContent =
    "AWAY SHOT";
}

// Modify CPU shot result by intercepting finishShot logic.
const originalFinishShot =
  finishShot;

// ---------------------------------------------------------
// CPU STEAL
// ---------------------------------------------------------

function stealFromHome(defender) {
  const owner =
    getBallPlayer();

  if (
    !owner ||
    owner.team !== "home"
  ) return;

  owner.hasBall = false;

  defender.hasBall = true;

  state.ballOwner =
    defender;

  state.ballState =
    "held";

  state.possession =
    "away";

  resetShotClock();

  state.crowdTarget =
    Math.min(
      1,
      state.crowdTarget +
      .2
    );

  showMessage(
    "STEAL!"
  );

  sound(.55);

  setTimeout(
    cpuPossession,
    450
  );
}

// ---------------------------------------------------------
// DRIBBLE MOVES
// ---------------------------------------------------------

function crossover() {
  if (
    getBallPlayer() !== homePG
  ) return;

  homePG.mesh.rotation.y +=
    Math.PI * .7;

  homePG.velocity.multiplyScalar(
    .4
  );

  showMessage(
    "CROSSOVER!"
  );

  state.crowdTarget =
    Math.min(
      1,
      state.crowdTarget +
      .08
    );

  sound(.25);
}

function behindBack() {
  if (
    getBallPlayer() !== homePG
  ) return;

  homePG.mesh.rotation.y +=
    Math.PI * .95;

  homePG.velocity.multiplyScalar(
    .45
  );

  showMessage(
    "BEHIND THE BACK!"
  );

  state.crowdTarget =
    Math.min(
      1,
      state.crowdTarget +
      .1
    );

  sound(.3);
}

// ---------------------------------------------------------
// RESET
// ---------------------------------------------------------

function resetPossession() {
  players.forEach(
    p => p.hasBall = false
  );

  homePG.mesh.position.set(
    0,
    0,
    7
  );

  giveBall(homePG);

  state.shotClock =
    SHOT_CLOCK;

  state.ballState =
    "held";

  state.shot = null;

  updatePossession();

  statusEl.textContent =
    "HOME BALL";
}

function updatePossession() {
  possessionEl.textContent =
    state.possession === "home"
      ? "HOME BALL"
      : "AWAY BALL";
}

// ---------------------------------------------------------
// CLOCK
// ---------------------------------------------------------

function updateClocks(dt) {
  if (
    !state.running ||
    state.paused ||
    state.ended
  ) return;

  state.gameTime -= dt;

  state.shotClock -= dt;

  if (
    state.shotClock <= 0
  ) {
    state.shotClock = 0;

    showMessage(
      "SHOT CLOCK VIOLATION!"
    );

    if (
      state.possession === "home"
    ) {
      cpuCheckInbound();
    } else {
      resetPossession();
    }
  }

  if (
    state.gameTime <= 0
  ) {
    state.gameTime = 0;
    endGame();
  }

  const total =
    Math.ceil(
      state.gameTime
    );

  const minutes =
    Math.floor(
      total / 60
    );

  const seconds =
    total % 60;

  gameClockEl.textContent =
    `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  shotClockEl.textContent =
    Math.ceil(
      Math.max(
        0,
        state.shotClock
      )
    );

  shotClockEl.style.color =
    state.shotClock <= 5
      ? "#ff453a"
      : "#fff";

  // Clutch.
  if (
    state.gameTime <= 60
  ) {
    state.crowdTarget =
      Math.max(
        state.crowdTarget,
        .55
      );
  }

  if (
    state.gameTime <= 10
  ) {
    state.standingTarget = 1;
    state.crowdTarget = 1;
  }
}

// ---------------------------------------------------------
// SCORE
// ---------------------------------------------------------

function updateScore() {
  homeScoreEl.textContent =
    state.home;

  awayScoreEl.textContent =
    state.away;

  const margin =
    state.home -
    state.away;

  // Comeback from 20 down.
  if (
    state.lastMargin <= -20 &&
    margin >= -10
  ) {
    showMessage(
      "THE COMEBACK IS ON!"
    );

    state.crowdTarget = 1;
    sound(1);
  }

  if (
    state.lastMargin <= -10 &&
    margin >= -5
  ) {
    showMessage(
      "COMEBACK!"
    );

    state.crowdTarget =
      Math.min(
        1,
        state.crowdTarget + .3
      );
  }

  if (
    Math.abs(margin) <= 3 &&
    state.gameTime <= 60
  ) {
    state.crowdTarget = 1;
    state.standingTarget = 1;
  }

  state.lastMargin = margin;
}

// ---------------------------------------------------------
// CROWD
// ---------------------------------------------------------

const normalDefense = [
  "DEFENSE! DEFENSE!",
  "LET'S GO DEFENSE!",
  "LOCK HIM UP!",
  "DE-FENSE! DE-FENSE!",
  "CLAP! CLAP! CLAP!"
];

const clutchDefense = [
  "WE WANT DEFENSE!",
  "STOP! STOP! STOP!",
  "DEFENSE! DEFENSE! DEFENSE!"
];

const reactions = [
  "OH!",
  "WOW!",
  "YEAHHH!",
  "LET'S GO!",
  "COME ON!",
  "GET LOUD!",
  "BIG TIME!",
  "MVP!",
  "WHAT A MOVE!",
  "NO WAY!",
  "UNBELIEVABLE!",
  "CLUTCH!",
  "MAKE SOME NOISE!",
  "ONE MORE!",
  "COME BACK!",
  "WE BELIEVE!",
  "HE'S ON FIRE!",
  "THAT'S IT!",
  "WHAT A PLAY!"
];

function updateCrowd(dt) {
  if (
    !state.running ||
    state.paused
  ) return;

  const margin =
    state.home -
    state.away;

  let target = .18;

  if (
    Math.abs(margin) <= 5
  ) {
    target += .2;
  }

  if (
    state.gameTime <= 60
  ) {
    target += .18;
  }

  if (
    state.gameTime <= 30
  ) {
    target += .2;
  }

  if (
    state.gameTime <= 10
  ) {
    target += .35;
  }

  if (
    margin < 0
  ) {
    target += Math.min(
      .18,
      Math.abs(margin) * .012
    );
  }

  state.crowdTarget =
    THREE.MathUtils.clamp(
      Math.max(
        state.crowdTarget,
        target
      ),
      0,
      1
    );

  state.crowd +=
    (state.crowdTarget -
      state.crowd) *
    Math.min(
      1,
      dt * 1.7
    );

  if (
    state.gameTime <= 60 &&
    Math.abs(margin) <= 3
  ) {
    state.standingTarget = 1;
  } else if (
    state.gameTime <= 10
  ) {
    state.standingTarget = 1;
  } else {
    state.standingTarget =
      Math.max(
        0,
        (60 - state.gameTime) /
        50
      );
  }

  state.standing +=
    (state.standingTarget -
      state.standing) *
    dt * 2;

  if (
    state.crowd < .3
  ) {
    crowdLevelEl.textContent =
      "CALM";
  } else if (
    state.crowd < .5
  ) {
    crowdLevelEl.textContent =
      "LOUD";
  } else if (
    state.crowd < .72
  ) {
    crowdLevelEl.textContent =
      "HYPED";
  } else if (
    state.crowd < .9
  ) {
    crowdLevelEl.textContent =
      "ROARING";
  } else {
    crowdLevelEl.textContent =
      "INSANE";
  }

  const now =
    performance.now();

  for (const fan of fans) {
    const bounce =
      Math.max(
        0,
        Math.sin(
          now * .003 *
          fan.speed +
          fan.phase
        )
      );

    const jump =
      bounce *
      state.crowd *
      .4;

    const stand =
      state.standing *
      state.crowd *
      .65;

    fan.group.position.y =
      fan.baseY +
      jump +
      stand;

    fan.body.rotation.z =
      Math.sin(
        now * .002 *
        fan.speed +
        fan.phase
      ) *
      state.crowd *
      .2;
  }

  // Defense chants.
  state.chantTimer -= dt;

  if (
    state.possession === "away" &&
    state.chantTimer <= 0 &&
    state.crowd > .5
  ) {
    const clutch =
      state.gameTime <= 60 &&
      Math.abs(margin) <= 5;

    if (
      Math.random() <
      dt *
      (clutch ? .075 : .035)
    ) {
      defenseChant(clutch);
    }
  }
}

function defenseChant(clutch) {
  const list =
    clutch
      ? clutchDefense
      : normalDefense;

  const chant =
    list[
      Math.floor(
        Math.random() *
        list.length
      )
    ];

  showMessage(chant);

  state.crowdTarget =
    Math.min(
      1,
      state.crowdTarget + .25
    );

  state.chantTimer =
    clutch ? 5 : 8;

  sound(
    clutch ? .95 : .6
  );
}

// ---------------------------------------------------------
// RANDOM CROWD REACTION
// ---------------------------------------------------------

function randomCrowdReaction() {
  if (
    Math.random() > .3
  ) return;

  const text =
    reactions[
      Math.floor(
        Math.random() *
        reactions.length
      )
    ];

  showMessage(text);
}

// ---------------------------------------------------------
// MESSAGE
// ---------------------------------------------------------

function showMessage(text) {
  messageEl.textContent =
    text;

  messageEl.classList.remove(
    "hidden"
  );

  state.messageTimer =
    1.2;
}

function updateMessage(dt) {
  if (
    state.messageTimer <= 0
  ) return;

  state.messageTimer -= dt;

  if (
    state.messageTimer <= 0
  ) {
    messageEl.classList.add(
      "hidden"
    );
  }
}

// ---------------------------------------------------------
// PAUSE
// ---------------------------------------------------------

function togglePause() {
  if (
    !state.running ||
    state.ended
  ) return;

  state.paused =
    !state.paused;

  pauseScreen.classList.toggle(
    "active",
    state.paused
  );
}

// ---------------------------------------------------------
// GAME OVER
// ---------------------------------------------------------

function endGame() {
  state.running = false;
  state.ended = true;

  gameClockEl.textContent =
    "00:00";

  state.crowdTarget = 1;
  state.standingTarget = 1;

  if (
    state.home > state.away
  ) {
    finalTitle.textContent =
      "YOU WIN!";

    showMessage(
      "HOME WINS!"
    );
  } else if (
    state.home < state.away
  ) {
    finalTitle.textContent =
      "YOU LOSE";
  } else {
    finalTitle.textContent =
      "TIE GAME";
  }

  finalScore.textContent =
    `${state.home} - ${state.away}`;

  gameOver.classList.remove(
    "hidden"
  );

  sound(1);
}

restartButton?.addEventListener(
  "click",
  () => {
    gameOver.classList.add(
      "hidden"
    );

    startGame();
  }
);

// ---------------------------------------------------------
// CAMERA
// ---------------------------------------------------------

function updateCamera(dt) {
  const p =
    getControlledPlayer();

  const desired =
    new THREE.Vector3(
      p.mesh.position.x,
      9.2,
      p.mesh.position.z + 11.5
    );

  camera.position.lerp(
    desired,
    1 -
    Math.pow(.001, dt)
  );

  camera.lookAt(
    p.mesh.position.x,
    1.1,
    p.mesh.position.z - 2
  );
}

// ---------------------------------------------------------
// RESIZE
// ---------------------------------------------------------

window.addEventListener(
  "resize",
  () => {
    camera.aspect =
      innerWidth /
      innerHeight;

    camera.updateProjectionMatrix();

    renderer.setSize(
      innerWidth,
      innerHeight
    );
  }
);

// ---------------------------------------------------------
// MAIN LOOP
// ---------------------------------------------------------

function animate() {
  requestAnimationFrame(
    animate
  );

  const dt =
    Math.min(
      clock.getDelta(),
      .05
    );

  updateControlledPlayer(dt);

  updateHomeAI(dt);

  updateAwayAI(dt);

  updateBall(dt);

  updateCharge(dt);

  updateClocks(dt);

  updateCrowd(dt);

  updateMessage(dt);

  updateCamera(dt);

  renderer.render(
    scene,
    camera
  );
}

// ---------------------------------------------------------
// LOADING
// ---------------------------------------------------------

function initialize() {
  if (loading) {
    loading.style.display =
      "none";
  }

  gameOver?.classList.add(
    "hidden"
  );

  shotMeter?.classList.add(
    "hidden"
  );

  menu.style.display =
    "flex";

  homeScoreEl.textContent =
    "0";

  awayScoreEl.textContent =
    "0";

  gameClockEl.textContent =
    "02:00";

  animate();
}

initialize();
