import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

/*
============================================================
COURT CLASH
3D BASKETBALL V3
============================================================

Controls
WASD / Arrow Keys  - Move
SHIFT              - Sprint
SPACE              - Hold/release shot
Q                  - Crossover
E                  - Behind-the-back
R                  - Reset ball
ESC                - Pause

This file is designed to work with the HTML/CSS supplied
in the project.
============================================================
*/

// ============================================================
// DOM
// ============================================================

const $ = (id) => document.getElementById(id);

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

// ============================================================
// CONFIG
// ============================================================

const COURT_WIDTH = 18;
const COURT_LENGTH = 30;

const GAME_LENGTH = 120;
const SHOT_CLOCK_MAX = 24;

const PLAYER_SPEED = 5.3;
const SPRINT_SPEED = 8.0;

const PLAYER_RADIUS = 0.65;

const BALL_RADIUS = 0.24;

const HOOP_Y = 3.05;

const HOME_HOOP_Z = -COURT_LENGTH / 2 + 1.15;
const AWAY_HOOP_Z = COURT_LENGTH / 2 - 1.15;

// ============================================================
// STATE
// ============================================================

const state = {
  running: false,
  paused: false,
  ended: false,

  gameTime: GAME_LENGTH,
  shotClock: SHOT_CLOCK_MAX,

  homeScore: 0,
  awayScore: 0,

  possession: "home",

  ballOwner: "player",

  shooting: false,
  shotCharge: 0,

  ballState: "held",

  shotTime: 0,
  shotDuration: 0,

  scoreMarginHistory: 0,

  crowdIntensity: 0.2,
  crowdTarget: 0.2,

  crowdStanding: 0,
  crowdTargetStanding: 0,

  chantCooldown: 0,

  messageTime: 0,

  lastMove: "",

  moveCooldown: 0,

  audioStarted: false,

  lastTime: performance.now()
};

// ============================================================
// THREE.JS
// ============================================================

const scene = new THREE.Scene();

scene.background = new THREE.Color(0x090e16);

scene.fog = new THREE.Fog(
  0x090e16,
  35,
  85
);

const camera = new THREE.PerspectiveCamera(
  62,
  window.innerWidth / window.innerHeight,
  0.1,
  150
);

const renderer = new THREE.WebGLRenderer({
  antialias: true
});

renderer.setSize(
  window.innerWidth,
  window.innerHeight
);

renderer.setPixelRatio(
  Math.min(window.devicePixelRatio, 2)
);

renderer.shadowMap.enabled = true;
renderer.shadowMap.type =
  THREE.PCFSoftShadowMap;

renderer.outputColorSpace =
  THREE.SRGBColorSpace;

document.body.appendChild(renderer.domElement);

// ============================================================
// LIGHTING
// ============================================================

scene.add(
  new THREE.HemisphereLight(
    0xbfd7ff,
    0x161616,
    2.2
  )
);

const keyLight =
  new THREE.DirectionalLight(
    0xffffff,
    3
  );

keyLight.position.set(
  12,
  20,
  8
);

keyLight.castShadow = true;

keyLight.shadow.mapSize.set(
  2048,
  2048
);

scene.add(keyLight);

// Arena lights

for (const x of [-10, 0, 10]) {
  for (const z of [-16, 16]) {
    const light =
      new THREE.PointLight(
        0xffffff,
        12,
        35
      );

    light.position.set(
      x,
      10,
      z
    );

    scene.add(light);
  }
}

// ============================================================
// MATERIALS
// ============================================================

const courtMaterial =
  new THREE.MeshStandardMaterial({
    color: 0xb86d3e,
    roughness: 0.72
  });

const lineMaterial =
  new THREE.MeshBasicMaterial({
    color: 0xffffff
  });

const darkMaterial =
  new THREE.MeshStandardMaterial({
    color: 0x151a22,
    roughness: 0.8
  });

// ============================================================
// ARENA
// ============================================================

const arenaFloor =
  new THREE.Mesh(
    new THREE.BoxGeometry(
      62,
      0.4,
      68
    ),
    darkMaterial
  );

arenaFloor.position.y = -0.45;

arenaFloor.receiveShadow = true;

scene.add(arenaFloor);

// ============================================================
// COURT
// ============================================================

const court =
  new THREE.Mesh(
    new THREE.BoxGeometry(
      COURT_WIDTH,
      0.28,
      COURT_LENGTH
    ),
    courtMaterial
  );

court.position.y = -0.14;

court.receiveShadow = true;

scene.add(court);

function addCourtLine(
  width,
  depth,
  x,
  z
) {
  const line =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        width,
        0.035,
        depth
      ),
      lineMaterial
    );

  line.position.set(
    x,
    0.025,
    z
  );

  scene.add(line);
}

// Sidelines

addCourtLine(
  0.08,
  COURT_LENGTH,
  -COURT_WIDTH / 2,
  0
);

addCourtLine(
  0.08,
  COURT_LENGTH,
  COURT_WIDTH / 2,
  0
);

// Baselines

addCourtLine(
  COURT_WIDTH,
  0.08,
  0,
  -COURT_LENGTH / 2
);

addCourtLine(
  COURT_WIDTH,
  0.08,
  0,
  COURT_LENGTH / 2
);

// Half court

addCourtLine(
  COURT_WIDTH,
  0.08,
  0,
  0
);

// Center circle

const centerCircle =
  new THREE.Mesh(
    new THREE.RingGeometry(
      2,
      2.06,
      64
    ),
    lineMaterial
  );

centerCircle.rotation.x =
  -Math.PI / 2;

centerCircle.position.y =
  0.04;

scene.add(centerCircle);

// ============================================================
// PAINT
// ============================================================

function createPaint(z) {
  const paint =
    new THREE.Mesh(
      new THREE.PlaneGeometry(
        5.2,
        5.8
      ),
      new THREE.MeshBasicMaterial({
        color: 0x9d392d,
        transparent: true,
        opacity: 0.52,
        side: THREE.DoubleSide
      })
    );

  paint.rotation.x =
    -Math.PI / 2;

  paint.position.set(
    0,
    0.035,
    z
  );

  scene.add(paint);

  addCourtLine(
    5.2,
    0.07,
    0,
    z - 2.9
  );

  addCourtLine(
    5.2,
    0.07,
    0,
    z + 2.9
  );

  addCourtLine(
    0.07,
    5.8,
    -2.6,
    z
  );

  addCourtLine(
    0.07,
    5.8,
    2.6,
    z
  );
}

createPaint(
  HOME_HOOP_Z + 2.9
);

createPaint(
  AWAY_HOOP_Z - 2.9
);

// ============================================================
// THREE-POINT ARC
// ============================================================

function createArc(
  centerZ,
  facing
) {
  const points = [];

  const radius = 6.75;

  for (
    let i = 0;
    i <= 60;
    i++
  ) {
    const t = i / 60;

    const angle =
      Math.PI * t;

    points.push(
      new THREE.Vector3(
        Math.cos(angle) *
          radius,
        0.045,
        centerZ +
          facing *
            Math.sin(angle) *
            radius
      )
    );
  }

  const geometry =
    new THREE.BufferGeometry()
      .setFromPoints(points);

  const line =
    new THREE.Line(
      geometry,
      lineMaterial
    );

  scene.add(line);
}

createArc(
  HOME_HOOP_Z + 0.25,
  1
);

createArc(
  AWAY_HOOP_Z - 0.25,
  -1
);

// ============================================================
// ARENA SEATING
// ============================================================

const crowd = [];

const crowdColors = [
  0xe53935,
  0x1976d2,
  0xffca28,
  0x8e24aa,
  0x43a047,
  0xffffff,
  0xff7043,
  0x26a69a,
  0x37474f
];

function createFan(
  x,
  y,
  z,
  scale = 1
) {
  const group =
    new THREE.Group();

  const shirt =
    crowdColors[
      Math.floor(
        Math.random() *
          crowdColors.length
      )
    ];

  const body =
    new THREE.Mesh(
      new THREE.CapsuleGeometry(
        0.14 * scale,
        0.34 * scale,
        5,
        8
      ),
      new THREE.MeshStandardMaterial({
        color: shirt
      })
    );

  body.position.y =
    0.34 * scale;

  const head =
    new THREE.Mesh(
      new THREE.SphereGeometry(
        0.13 * scale,
        8,
        8
      ),
      new THREE.MeshStandardMaterial({
        color:
          0xb87355
      })
    );

  head.position.y =
    0.72 * scale;

  group.add(body);
  group.add(head);

  group.position.set(
    x,
    y,
    z
  );

  scene.add(group);

  crowd.push({
    group,
    body,

    baseY: y,

    phase:
      Math.random() *
      Math.PI *
      2,

    speed:
      0.8 +
      Math.random() *
        1.5,

    energy: 0,

    standing: false
  });
}

// Back stands

for (
  let row = 0;
  row < 5;
  row++
) {
  for (
    let i = 0;
    i < 34;
    i++
  ) {
    createFan(
      -21 +
        i * 1.27,
      row * 0.55,
      -19 -
        row * 1.2,
      1
    );

    createFan(
      -21 +
        i * 1.27,
      row * 0.55,
      19 +
        row * 1.2,
      1
    );
  }
}

// Side stands

for (
  let row = 0;
  row < 4;
  row++
) {
  for (
    let i = 0;
    i < 24;
    i++
  ) {
    createFan(
      -12 -
        row * 1.25,
      row * 0.55,
      -14 +
        i * 1.22,
      0.9
    );

    createFan(
      12 +
        row * 1.25,
      row * 0.55,
      -14 +
        i * 1.22,
      0.9
    );
  }
}

// ============================================================
// SCOREBOARD / ARENA UI
// ============================================================

const arenaUI =
  document.createElement(
    "div"
  );

arenaUI.id =
  "arenaExtraUI";

arenaUI.innerHTML = `
  <div id="shotClockBox">
    <small>SHOT CLOCK</small>
    <strong id="shotClock">24</strong>
  </div>

  <div id="possessionIndicator">
    HOME BALL
  </div>

  <div id="crowdStatus">
    CROWD <span id="crowdLevel">QUIET</span>
  </div>

  <div id="pauseOverlay">
    <div>
      <h1>PAUSED</h1>
      <p>Press ESC to continue</p>
    </div>
  </div>
`;

document.body.appendChild(
  arenaUI
);

const shotClockEl =
  document.getElementById(
    "shotClock"
  );

const possessionEl =
  document.getElementById(
    "possessionIndicator"
  );

const crowdLevelEl =
  document.getElementById(
    "crowdLevel"
  );

const pauseOverlay =
  document.getElementById(
    "pauseOverlay"
  );

const extraStyle =
  document.createElement(
    "style"
  );

extraStyle.textContent = `
#arenaExtraUI {
  pointer-events:none;
  user-select:none;
}

#shotClockBox {
  position:fixed;
  right:24px;
  top:22px;
  z-index:6;
  color:#fff;
  background:rgba(8,8,10,.86);
  border:1px solid rgba(255,255,255,.2);
  border-radius:12px;
  padding:8px 16px;
  text-align:center;
  min-width:92px;
}

#shotClockBox small {
  display:block;
  font-size:8px;
  letter-spacing:2px;
  opacity:.7;
}

#shotClockBox strong {
  display:block;
  font-size:32px;
  line-height:1;
  margin-top:3px;
  font-variant-numeric:tabular-nums;
}

#possessionIndicator {
  position:fixed;
  left:50%;
  top:112px;
  transform:translateX(-50%);
  z-index:6;
  color:#fff;
  background:rgba(8,8,10,.72);
  border-radius:999px;
  padding:6px 14px;
  font-size:9px;
  font-weight:900;
  letter-spacing:1.5px;
}

#crowdStatus {
  position:fixed;
  left:20px;
  top:20px;
  z-index:6;
  color:#fff;
  background:rgba(8,8,10,.72);
  border-radius:9px;
  padding:8px 12px;
  font-size:9px;
  letter-spacing:1px;
}

#crowdStatus span {
  color:#f7b731;
  font-weight:900;
}

#pauseOverlay {
  position:fixed;
  inset:0;
  z-index:40;
  display:none;
  place-items:center;
  background:rgba(0,0,0,.72);
  color:white;
  text-align:center;
}

#pauseOverlay.active {
  display:grid;
}

#pauseOverlay h1 {
  font-size:56px;
  margin:0;
}

#pauseOverlay p {
  opacity:.7;
}

@media(max-width:700px) {
  #shotClockBox {
    right:10px;
    top:70px;
  }

  #crowdStatus {
    display:none;
  }

  #possessionIndicator {
    top:112px;
  }
}
`;

document.head.appendChild(
  extraStyle
);

// ============================================================
// BASKETBALL
// ============================================================

const ball =
  new THREE.Mesh(
    new THREE.SphereGeometry(
      BALL_RADIUS,
      24,
      24
    ),
    new THREE.MeshStandardMaterial({
      color:0xd86f28,
      roughness:.7
    })
  );

ball.castShadow = true;

scene.add(ball);

// ============================================================
// PLAYERS
// ============================================================

function createPlayer(
  color,
  accent
) {
  const group =
    new THREE.Group();

  const body =
    new THREE.Mesh(
      new THREE.CapsuleGeometry(
        0.46,
        1.15,
        6,
        12
      ),
      new THREE.MeshStandardMaterial({
        color,
        roughness:.65
      })
    );

  body.position.y =
    1.18;

  body.castShadow = true;

  group.add(body);

  const head =
    new THREE.Mesh(
      new THREE.SphereGeometry(
        0.35,
        20,
        20
      ),
      new THREE.MeshStandardMaterial({
        color:0xb97858
      })
    );

  head.position.y =
    2.2;

  head.castShadow = true;

  group.add(head);

  // Headband

  const band =
    new THREE.Mesh(
      new THREE.TorusGeometry(
        .35,
        .035,
        8,
        20
      ),
      new THREE.MeshStandardMaterial({
        color:accent
      })
    );

  band.rotation.x =
    Math.PI / 2;

  band.position.y =
    2.22;

  group.add(band);

  scene.add(group);

  return {
    mesh:group,

    velocity:
      new THREE.Vector3(),

    targetVelocity:
      new THREE.Vector3(),

    moveSpeed:PLAYER_SPEED,

    stamina:1,

    dribbleTime:0,

    moveCooldown:0,

    defenseCooldown:0,

    stealCooldown:0
  };
}

const player =
  createPlayer(
    0x1976d2,
    0xffffff
  );

const defender =
  createPlayer(
    0xd32f2f,
    0xffffff
  );

player.mesh.position.set(
  0,
  0,
  7
);

defender.mesh.position.set(
  0,
  0,
  2
);

// ============================================================
// HOOPS
// ============================================================

function createHoop(
  z,
  facing
) {
  const group =
    new THREE.Group();

  group.position.z = z;

  scene.add(group);

  const pole =
    new THREE.Mesh(
      new THREE.CylinderGeometry(
        .18,
        .24,
        4.2,
        16
      ),
      new THREE.MeshStandardMaterial({
        color:0x30343a,
        metalness:.3
      })
    );

  pole.position.set(
    0,
    2,
    facing * 2
  );

  pole.castShadow = true;

  group.add(pole);

  const board =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        5.2,
        3,
        .18
      ),
      new THREE.MeshStandardMaterial({
        color:0xf2f2f2,
        roughness:.35
      })
    );

  board.position.set(
    0,
    4.2,
    facing * .8
  );

  board.castShadow = true;

  group.add(board);

  const square =
    new THREE.Mesh(
      new THREE.BoxGeometry(
        1.8,
        1.1,
        .04
      ),
      new THREE.MeshBasicMaterial({
        color:0xffffff
      })
    );

  square.position.set(
    0,
    4.05,
    facing * .68
  );

  group.add(square);

  const rim =
    new THREE.Mesh(
      new THREE.TorusGeometry(
        .75,
        .075,
        12,
        32
      ),
      new THREE.MeshStandardMaterial({
        color:0xff5a1f,
        metalness:.25
      })
    );

  rim.rotation.x =
    Math.PI / 2;

  rim.position.set(
    0,
    HOOP_Y,
    facing * 1.15
  );

  group.add(rim);

  // Net

  const netMaterial =
    new THREE.LineBasicMaterial({
      color:0xffffff,
      transparent:true,
      opacity:.55
    });

  for (
    let i = 0;
    i < 12;
    i++
  ) {
    const a =
      (i / 12) *
      Math.PI *
      2;

    const x =
      Math.cos(a) *
      .72;

    const zz =
      Math.sin(a) *
      .72;

    const geometry =
      new THREE.BufferGeometry()
        .setFromPoints([
          new THREE.Vector3(
            x,
            HOOP_Y,
            facing * 1.15 +
              zz
          ),

          new THREE.Vector3(
            x * .55,
            HOOP_Y - .75,
            facing * 1.15 +
              zz * .55
          )
        ]);

    group.add(
      new THREE.Line(
        geometry,
        netMaterial
      )
    );
  }

  return {
    position:
      new THREE.Vector3(
        0,
        HOOP_Y,
        z +
          facing * 1.15
      )
  };
}

const homeHoop =
  createHoop(
    -COURT_LENGTH / 2,
    1
  );

const awayHoop =
  createHoop(
    COURT_LENGTH / 2,
    -1
  );

// ============================================================
// INPUT
// ============================================================

const keys = {};

window.addEventListener(
  "keydown",
  (event) => {
    if (
      [
        "Space",
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight"
      ].includes(
        event.code
      )
    ) {
      event.preventDefault();
    }

    keys[event.code] = true;

    startAudio();

    if (
      event.code === "Space" &&
      !event.repeat
    ) {
      beginShot();
    }

    if (
      event.code === "KeyQ" &&
      !event.repeat
    ) {
      performDribble(
        "CROSSOVER"
      );
    }

    if (
      event.code === "KeyE" &&
      !event.repeat
    ) {
      performDribble(
        "BEHIND THE BACK"
      );
    }

    if (
      event.code === "KeyR"
    ) {
      resetPossession();
    }

    if (
      event.code === "Escape"
    ) {
      togglePause();
    }
  }
);

window.addEventListener(
  "keyup",
  (event) => {
    keys[event.code] =
      false;

    if (
      event.code === "Space"
    ) {
      releaseShot();
    }
  }
);

// ============================================================
// AUDIO
// ============================================================

let audioContext = null;
let masterGain = null;

function startAudio() {
  if (state.audioStarted) {
    return;
  }

  try {
    audioContext =
      new (
        window.AudioContext ||
        window.webkitAudioContext
      )();

    masterGain =
      audioContext.createGain();

    masterGain.gain.value =
      0.08;

    masterGain.connect(
      audioContext.destination
    );

    state.audioStarted =
      true;
  } catch {
    // Audio is optional.
  }
}

function crowdSound(
  intensity = .5
) {
  if (
    !audioContext ||
    !masterGain
  ) {
    return;
  }

  const duration =
    .18 +
    intensity * .45;

  const buffer =
    audioContext.createBuffer(
      1,
      audioContext.sampleRate *
        duration,
      audioContext.sampleRate
    );

  const data =
    buffer.getChannelData(0);

  for (
    let i = 0;
    i < data.length;
    i++
  ) {
    const envelope =
      1 -
      i / data.length;

    data[i] =
      (
        Math.random() * 2 -
        1
      ) *
      envelope;
  }

  const source =
    audioContext.createBufferSource();

  const gain =
    audioContext.createGain();

  gain.gain.value =
    .12 *
    intensity;

  source.buffer =
    buffer;

  source.connect(gain);

  gain.connect(
    masterGain
  );

  source.start();
}

// ============================================================
// GAME START
// ============================================================

function startGame() {
  startAudio();

  state.running = true;
  state.paused = false;
  state.ended = false;

  state.gameTime =
    GAME_LENGTH;

  state.shotClock =
    SHOT_CLOCK_MAX;

  state.homeScore = 0;
  state.awayScore = 0;

  state.possession =
    "home";

  state.ballOwner =
    "player";

  state.ballState =
    "held";

  state.shooting =
    false;

  state.shotCharge =
    0;

  state.crowdIntensity =
    .22;

  state.crowdTarget =
    .22;

  state.crowdStanding =
    0;

  state.crowdTargetStanding =
    0;

  player.mesh.position.set(
    0,
    0,
    7
  );

  defender.mesh.position.set(
    0,
    0,
    1.5
  );

  updateScoreboard();

  resetPossession();

  showMessage(
    "CHECK BALL"
  );

  setTimeout(
    () => {
      if (state.running) {
        statusEl.textContent =
          "PLAY";
      }
    },
    1200
  );
}

// ============================================================
// MAIN MENU
// ============================================================

const menu =
  document.createElement(
    "div"
  );

menu.id =
  "gameMenu";

menu.innerHTML = `
  <div class="menuCard">
    <div class="menuEyebrow">
      COURT CLASH
    </div>

    <h1>PLAY<br><span>BASKETBALL</span></h1>

    <p>
      Arcade 3D Basketball
    </p>

    <button id="startGameButton">
      START GAME
    </button>

    <div class="menuHelp">
      <div>WASD / ARROWS — MOVE</div>
      <div>SHIFT — SPRINT</div>
      <div>SPACE — SHOOT</div>
      <div>Q / E — DRIBBLE MOVES</div>
      <div>R — RESET POSSESSION</div>
      <div>ESC — PAUSE</div>
    </div>
  </div>
`;

document.body.appendChild(
  menu
);

const menuCSS =
  document.createElement(
    "style"
  );

menuCSS.textContent = `
#gameMenu {
  position:fixed;
  inset:0;
  z-index:100;
  display:flex;
  align-items:center;
  justify-content:center;
  background:
    radial-gradient(
      circle at center,
      rgba(247,183,49,.12),
      transparent 38%
    ),
    linear-gradient(
      135deg,
      #060a10,
      #17120d
    );
  color:white;
}

.menuCard {
  width:min(560px,calc(100% - 32px));
  padding:48px 38px;
  text-align:center;
  border-radius:24px;
  border:1px solid rgba(255,255,255,.15);
  background:rgba(7,10,15,.92);
  box-shadow:
    0 30px 100px rgba(0,0,0,.65);
}

.menuEyebrow {
  color:#f7b731;
  font-size:11px;
  font-weight:900;
  letter-spacing:5px;
}

.menuCard h1 {
  margin:15px 0;
  font-size:clamp(48px,10vw,84px);
  line-height:.82;
  font-weight:1000;
  font-style:italic;
}

.menuCard h1 span {
  color:#f7b731;
}

.menuCard p {
  opacity:.6;
  margin:20px;
}

#startGameButton {
  padding:16px 42px;
  border:0;
  border-radius:12px;
  background:#f7b731;
  color:#111;
  font-size:17px;
  font-weight:1000;
  cursor:pointer;
}

.menuHelp {
  margin-top:26px;
  display:grid;
  gap:7px;
  font-size:10px;
  letter-spacing:1px;
  opacity:.55;
}
`;

document.head.appendChild(
  menuCSS
);

document
  .getElementById(
    "startGameButton"
  )
  .addEventListener(
    "click",
    () => {
      menu.style.display =
        "none";

      startGame();
    }
  );

// ============================================================
// MOVEMENT
// ============================================================

function updatePlayer(
  dt
) {
  if (
    !state.running ||
    state.paused ||
    state.ended
  ) {
    return;
  }

  if (
    state.ballOwner !==
    "player"
  ) {
    return;
  }

  const direction =
    new THREE.Vector3();

  if (
    keys.KeyW ||
    keys.ArrowUp
  ) {
    direction.z -= 1;
  }

  if (
    keys.KeyS ||
    keys.ArrowDown
  ) {
    direction.z += 1;
  }

  if (
    keys.KeyA ||
    keys.ArrowLeft
  ) {
    direction.x -= 1;
  }

  if (
    keys.KeyD ||
    keys.ArrowRight
  ) {
    direction.x += 1;
  }

  const moving =
    direction.lengthSq() >
    0;

  const sprinting =
    keys.ShiftLeft ||
    keys.ShiftRight;

  const speed =
    sprinting &&
    player.stamina > .05
      ? SPRINT_SPEED
      : PLAYER_SPEED;

  if (moving) {
    direction.normalize();

    player.targetVelocity
      .copy(direction)
      .multiplyScalar(
        speed
      );

    player.mesh.rotation.y =
      Math.atan2(
        direction.x,
        direction.z
      );

    if (sprinting) {
      player.stamina =
        Math.max(
          0,
          player.stamina -
            dt * .35
        );
    }
  } else {
    player.targetVelocity
      .set(0, 0, 0);

    player.stamina =
      Math.min(
        1,
        player.stamina +
          dt * .22
      );
  }

  player.velocity.lerp(
    player.targetVelocity,
    1 -
      Math.pow(
        .0001,
        dt
      )
  );

  player.mesh.position.addScaledVector(
    player.velocity,
    dt
  );

  player.mesh.position.x =
    THREE.MathUtils.clamp(
      player.mesh.position.x,
      -COURT_WIDTH / 2 +
        PLAYER_RADIUS,
      COURT_WIDTH / 2 -
        PLAYER_RADIUS
    );

  player.mesh.position.z =
    THREE.MathUtils.clamp(
      player.mesh.position.z,
      -COURT_LENGTH / 2 +
        PLAYER_RADIUS,
      COURT_LENGTH / 2 -
        PLAYER_RADIUS
    );

  player.dribbleTime +=
    dt *
    (moving ? 9 : 5);
}

// ============================================================
// DEFENDER AI
// ============================================================

function updateDefense(
  dt
) {
  if (
    !state.running ||
    state.paused ||
    state.ended
  ) {
    return;
  }

  if (
    state.ballOwner !==
    "player"
  ) {
    return;
  }

  const target =
    player.mesh.position;

  const dx =
    target.x -
    defender.mesh.position.x;

  const dz =
    target.z -
    defender.mesh.position.z;

  const distance =
    Math.hypot(dx, dz);

  // Keep a realistic defensive gap.
  const desiredGap =
    1.25;

  let moveX = 0;
  let moveZ = 0;

  if (
    distance >
    desiredGap
  ) {
    moveX = dx;
    moveZ = dz;

    const length =
      Math.hypot(
        moveX,
        moveZ
      );

    if (length > 0) {
      moveX /= length;
      moveZ /= length;
    }
  }

  const defensiveSpeed =
    state.gameTime < 30
      ? 4.4
      : 3.7;

  defender.velocity.lerp(
    new THREE.Vector3(
      moveX *
        defensiveSpeed,
      0,
      moveZ *
        defensiveSpeed
    ),
    1 -
      Math.pow(
        .01,
        dt
      )
  );

  defender.mesh.position.addScaledVector(
    defender.velocity,
    dt
  );

  defender.mesh.position.x =
    THREE.MathUtils.clamp(
      defender.mesh.position.x,
      -COURT_WIDTH / 2 +
        .6,
      COURT_WIDTH / 2 -
        .6
    );

  defender.mesh.position.z =
    THREE.MathUtils.clamp(
      defender.mesh.position.z,
      -COURT_LENGTH / 2 +
        .6,
      COURT_LENGTH / 2 -
        .6
    );

  defender.mesh.rotation.y =
    Math.atan2(
      dx,
      dz
    );

  // Occasional steal attempt.
  if (
    distance < 1.05 &&
    !state.shooting &&
    defender.stealCooldown <= 0
  ) {
    defender.stealCooldown =
      1.8;

    const stealChance =
      .08;

    if (
      Math.random() <
      stealChance
    ) {
      triggerSteal();
    }
  }

  defender.stealCooldown =
    Math.max(
      0,
      defender.stealCooldown -
        dt
    );
}

// ============================================================
// DRIBBLE
// ============================================================

function updateDribble(
  dt
) {
  if (
    state.ballState !==
    "held" ||
    state.ballOwner !==
    "player"
  ) {
    return;
  }

  const moving =
    player.velocity.length() >
    .4;

  const bounce =
    Math.abs(
      Math.sin(
        player.dribbleTime
      )
    );

  ball.position.set(
    player.mesh.position.x +
      .58 *
        Math.sin(
          player.mesh.rotation.y
        ),

    .75 +
      bounce * .28,

    player.mesh.position.z -
      .45
  );

  ball.rotation.x +=
    dt * 10;

  ball.rotation.z +=
    dt * 7;

  // Make dribble slightly more active when sprinting.
  if (
    moving &&
    (
      keys.ShiftLeft ||
      keys.ShiftRight
    )
  ) {
    ball.position.y =
      .58 +
      bounce * .32;
  }
}

// ============================================================
// DRIBBLE MOVES
// ============================================================

function performDribble(
  move
) {
  if (
    !state.running ||
    state.paused ||
    state.ended ||
    state.ballOwner !==
      "player" ||
    state.ballState !==
      "held"
  ) {
    return;
  }

  if (
    player.moveCooldown >
    0
  ) {
    return;
  }

  player.moveCooldown =
    .55;

  state.lastMove =
    move;

  if (
    move ===
    "CROSSOVER"
  ) {
    player.mesh.rotation.y +=
      Math.PI * .65;
  }

  if (
    move ===
    "BEHIND THE BACK"
  ) {
    player.mesh.rotation.y +=
      Math.PI * .9;
  }

  // Chance of creating separation.
  const distance =
    player.mesh.position.distanceTo(
      defender.mesh.position
    );

  if (
    distance < 2.1 &&
    Math.random() < .42
  ) {
    defender.velocity.multiplyScalar(
      .15
    );

    crowdReact(
      "dribble",
      .24
    );

    showMessage(
      move ===
        "CROSSOVER"
        ? "ANKLE BREAKER!"
        : "NICE MOVE!"
    );

    crowdSound(.55);
  }
}

// ============================================================
// SHOOTING
// ============================================================

function beginShot() {
  if (
    !state.running ||
    state.paused ||
    state.ended
  ) {
    return;
  }

  if (
    state.ballOwner !==
      "player" ||
    state.ballState !==
      "held" ||
    state.shooting
  ) {
    return;
  }

  state.shooting =
    true;

  state.shotCharge =
    0;

  shotMeter.classList.remove(
    "hidden"
  );

  statusEl.textContent =
    "CHARGE";
}

function updateShotCharge(
  dt
) {
  if (
    !state.shooting
  ) {
    return;
  }

  state.shotCharge +=
    dt * 1.1;

  if (
    state.shotCharge >
    1
  ) {
    state.shotCharge = 0;
  }

  meterFill.style.width =
    `${state.shotCharge * 100}%`;

  if (
    state.shotCharge >=
      .74 &&
    state.shotCharge <=
      .86
  ) {
    meterFill.style.background =
      "#2ecc71";
  } else {
    meterFill.style.background =
      "#f7b731";
  }
}

function releaseShot() {
  if (
    !state.shooting
  ) {
    return;
  }

  state.shooting =
    false;

  shotMeter.classList.add(
    "hidden"
  );

  if (
    state.ballOwner !==
      "player" ||
    state.ballState !==
      "held"
  ) {
    return;
  }

  state.ballState =
    "flying";

  state.ballOwner =
    null;

  statusEl.textContent =
    "SHOT";

  const target =
    player.mesh.position.z >
      0
      ? homeHoop.position
      : awayHoop.position;

  const start =
    ball.position.clone();

  const distance =
    Math.hypot(
      start.x -
        target.x,
      start.z -
        target.z
    );

  // Shot distance determines 2/3.
  const three =
    distance >
    6.75;

  const perfect =
    state.shotCharge >=
      .74 &&
    state.shotCharge <=
      .86;

  // Defender contest.
  const defenderDistance =
    player.mesh.position.distanceTo(
      defender.mesh.position
    );

  let contestPenalty =
    0;

  if (
    defenderDistance <
    1.35
  ) {
    contestPenalty =
      .18;
  }

  if (
    defenderDistance <
    .85
  ) {
    contestPenalty =
      .3;
  }

  let makeChance =
    .47 +
    state.shotCharge *
      .4 -
    contestPenalty;

  // Deep shots are harder.
  if (
    distance > 9
  ) {
    makeChance -=
      .08;
  }

  if (
    distance > 12
  ) {
    makeChance -=
      .14;
  }

  if (perfect) {
    makeChance +=
      .18;
  }

  makeChance =
    THREE.MathUtils.clamp(
      makeChance,
      .08,
      .96
    );

  const made =
    Math.random() <
    makeChance;

  state.shotTime = 0;

  state.shotDuration =
    THREE.MathUtils.clamp(
      .72 +
        distance * .055,
      .72,
      1.4
    );

  const targetPoint =
    target.clone();

  // Add slight miss variance.
  if (!made) {
    const missAmount =
      perfect
        ? .18
        : .55 +
          Math.random() *
            .7;

    targetPoint.x +=
      (
        Math.random() -
        .5
      ) *
      missAmount;

    targetPoint.z +=
      (
        Math.random() -
        .5
      ) *
      missAmount;
  }

  const horizontal =
    new THREE.Vector3(
      targetPoint.x -
        start.x,
      0,
      targetPoint.z -
        start.z
    );

  horizontal.divideScalar(
    state.shotDuration
  );

  shotVelocity.copy(
    horizontal
  );

  const gravity =
    13;

  shotVelocity.y =
    (
      targetPoint.y -
      start.y +
      .5 *
        gravity *
        state.shotDuration *
        state.shotDuration
    ) /
    state.shotDuration;

  state._shotMade =
    made;

  state._shotThree =
    three;

  state._shotTarget =
    targetPoint;

  state._shotPerfect =
    perfect;

  state._shotContest =
    contestPenalty;
}

// ============================================================
// SHOT PHYSICS
// ============================================================

let shotVelocity =
  new THREE.Vector3();

function updateShot(
  dt
) {
  if (
    state.ballState !==
    "flying"
  ) {
    return;
  }

  state.shotTime +=
    dt;

  const gravity =
    13;

  ball.position.addScaledVector(
    shotVelocity,
    dt
  );

  shotVelocity.y -=
    gravity * dt;

  ball.rotation.x +=
    dt * 9;

  ball.rotation.z +=
    dt * 6;

  if (
    state.shotTime >=
    state.shotDuration
  ) {
    finishShot();
  }
}

// ============================================================
// SHOT RESULT
// ============================================================

function finishShot() {
  const made =
    state._shotMade;

  const three =
    state._shotThree;

  state.ballState =
    "loose";

  if (made) {
    const points =
      three ? 3 : 2;

    state.homeScore +=
      points;

    updateScoreboard();

    if (three) {
      crowdReact(
        "three",
        .5
      );

      crowdSound(
        .95
      );

      showMessage(
        "THREE!!!"
      );
    } else {
      crowdReact(
        "basket",
        .32
      );

      crowdSound(
        .65
      );

      showMessage(
        "BUCKET!"
      );
    }

    if (
      state.homeScore >
        state.awayScore
    ) {
      statusEl.textContent =
        "HOME LEAD";
    }

    checkComeback();

    setTimeout(
      () => {
        if (
          state.running &&
          !state.ended
        ) {
          resetPossession();
        }
      },
      900
    );
  } else {
    crowdReact(
      "miss",
      .12
    );

    crowdSound(
      .18
    );

    showMessage(
      state._shotContest >
        .1
        ? "CONTESTED!"
        : "MISS"
    );

    statusEl.textContent =
      "REBOUND";

    // Rebound after miss.
    setTimeout(
      () => {
        if (
          state.running &&
          !state.ended
        ) {
          resolveRebound();
        }
      },
      450
    );
  }
}

// ============================================================
// REBOUND
// ============================================================

function resolveRebound() {
  const defenderDistance =
    defender.mesh.position.distanceTo(
      ball.position
    );

  const playerDistance =
    player.mesh.position.distanceTo(
      ball.position
    );

  if (
    playerDistance <=
      defenderDistance +
        .8
  ) {
    state.ballOwner =
      "player";

    state.ballState =
      "held";

    state.possession =
      "home";

    resetShotClock();

    showMessage(
      "REBOUND!"
    );

    statusEl.textContent =
      "HOME BALL";
  } else {
    cpuGetsBall();
  }
}

// ============================================================
// CPU OFFENSE
// ============================================================

function cpuGetsBall() {
  state.ballOwner =
    "cpu";

  state.ballState =
    "held";

  state.possession =
    "away";

  resetShotClock();

  statusEl.textContent =
    "AWAY BALL";

  showMessage(
    "AWAY BALL"
  );

  setTimeout(
    () => {
      if (
        state.running &&
        state.ballOwner ===
          "cpu"
      ) {
        cpuShoot();
      }
    },
    900
  );
}

function cpuShoot() {
  if (
    state.ballOwner !==
    "cpu"
  ) {
    return;
  }

  const target =
    homeHoop.position;

  const start =
    ball.position.clone();

  const distance =
    start.distanceTo(
      target
    );

  const made =
    Math.random() <
    (
      .42 +
      Math.min(
        .25,
        distance *
          .01
      )
    );

  state.ballState =
    "flying";

  state.ballOwner =
    null;

  state._cpuMade =
    made;

  state._cpuThree =
    distance >
    6.75;

  state.shotTime = 0;

  state.shotDuration =
    THREE.MathUtils.clamp(
      .8 +
        distance * .045,
      .8,
      1.35
    );

  const targetPoint =
    target.clone();

  if (!made) {
    targetPoint.x +=
      (
        Math.random() -
        .5
      ) * .9;

    targetPoint.z +=
      (
        Math.random() -
        .5
      ) * .9;
  }

  const horizontal =
    new THREE.Vector3(
      targetPoint.x -
        start.x,
      0,
      targetPoint.z -
        start.z
    );

  horizontal.divideScalar(
    state.shotDuration
  );

  shotVelocity.copy(
    horizontal
  );

  const gravity =
    13;

  shotVelocity.y =
    (
      targetPoint.y -
      start.y +
      .5 *
        gravity *
        state.shotDuration *
        state.shotDuration
    ) /
    state.shotDuration;
}

// ============================================================
// POSSESSION RESET
// ============================================================

function resetPossession() {
  state.ballOwner =
    "player";

  state.ballState =
    "held";

  state.possession =
    "home";

  state.shotClock =
    SHOT_CLOCK_MAX;

  ball.position.set(
    player.mesh.position.x,
    1.3,
    player.mesh.position.z
  );

  updatePossessionUI();

  statusEl.textContent =
    "HOME BALL";
}

// ============================================================
// STEAL
// ============================================================

function triggerSteal() {
  state.ballOwner =
    "cpu";

  state.ballState =
    "held";

  state.possession =
    "away";

  resetShotClock();

  crowdReact(
    "steal",
    .22
  );

  crowdSound(
    .45
  );

  showMessage(
    "STOLEN!"
  );

  statusEl.textContent =
    "TURNOVER";

  setTimeout(
    () => {
      if (
        state.running &&
        state.ballOwner ===
          "cpu"
      ) {
        cpuShoot();
      }
    },
    700
  );
}

// ============================================================
// SHOT CLOCK
// ============================================================

function resetShotClock() {
  state.shotClock =
    SHOT_CLOCK_MAX;
}

function updateShotClock(
  dt
) {
  if (
    !state.running ||
    state.paused ||
    state.ended
  ) {
    return;
  }

  state.shotClock -=
    dt;

  if (
    state.shotClock <=
    0
  ) {
    state.shotClock = 0;

    if (
      state.possession ===
      "home"
    ) {
      showMessage(
        "SHOT CLOCK!"
      );

      crowdReact(
        "turnover",
        -.1
      );

      cpuGetsBall();
    } else {
      showMessage(
        "SHOT CLOCK!"
      );

      resetPossession();
    }
  }
}

// ============================================================
// GAME CLOCK
// ============================================================

function updateGameClock(
  dt
) {
  if (
    !state.running ||
    state.paused ||
    state.ended
  ) {
    return;
  }

  state.gameTime -=
    dt;

  if (
    state.gameTime <=
    60 &&
    state.gameTime >
      59
  ) {
    crowdReact(
      "clutch",
      .25
    );
  }

  if (
    state.gameTime <=
    30 &&
    state.gameTime >
      29
  ) {
    crowdReact(
      "clutch",
      .4
    );
  }

  if (
    state.gameTime <=
    10 &&
    state.gameTime >
      9
  ) {
    crowdReact(
      "clutch",
      .6
    );
  }

  if (
    state.gameTime <=
    0
  ) {
    state.gameTime = 0;

    endGame();

    return;
  }

  updateClockUI();
}

function updateClockUI() {
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

  const shot =
    Math.max(
      0,
      Math.ceil(
        state.shotClock
      )
    );

  shotClockEl.textContent =
    shot;

  if (
    shot <= 5
  ) {
    shotClockEl.style.color =
      "#ff453a";
  } else {
    shotClockEl.style.color =
      "#fff";
  }
}

// ============================================================
// SCOREBOARD
// ============================================================

function updateScoreboard() {
  homeScoreEl.textContent =
    state.homeScore;

  awayScoreEl.textContent =
    state.awayScore;

  updatePossessionUI();
}

function updatePossessionUI() {
  possessionEl.textContent =
    state.possession ===
    "home"
      ? "HOME BALL"
      : "AWAY BALL";
}

// ============================================================
// COMEBACK SYSTEM
// ============================================================

function checkComeback() {
  const margin =
    state.homeScore -
    state.awayScore;

  const previous =
    state.scoreMarginHistory;

  if (
    previous <=
      -20 &&
    margin >=
      -10
  ) {
    crowdReact(
      "comeback",
      .5
    );

    showMessage(
      "THE COMEBACK IS ON!"
    );
  } else if (
    previous <=
      -10 &&
    margin >=
      -5
  ) {
    crowdReact(
      "comeback",
      .3
    );
  } else if (
    previous <=
      -5 &&
    margin >=
      0
  ) {
    crowdReact(
      "comeback",
      .4
    );

    showMessage(
      "TIE GAME!"
    );
  }

  state.scoreMarginHistory =
    margin;
}

// ============================================================
// CROWD REACTION SYSTEM
// ============================================================

const normalDefenseChants = [
  "DEFENSE! DEFENSE!",
  "LET'S GO DEFENSE!",
  "LOCK HIM UP!",
  "CLAP! CLAP! CLAP-CLAP-CLAP!",
  "DE-FENSE! DE-FENSE!"
];

const clutchDefenseChants = [
  "WE WANT DEFENSE!",
  "STOP! STOP! STOP!",
  "DEFENSE! DEFENSE! DEFENSE!"
];

const reactionPool = [
  "CHEER!",
  "ROAR!",
  "LET'S GO!",
  "COME ON!",
  "OH!",
  "WOW!",
  "YEAHHH!",
  "CLAP!",
  "GET LOUD!",
  "MVP!",
  "THREE!",
  "BIG SHOT!",
  "WHAT A MOVE!",
  "OH MY!",
  "LET'S GOOOO!",
  "CLUTCH!",
  "ICE COLD!",
  "HE'S ON FIRE!",
  "COME BACK!",
  "WE BELIEVE!",
  "KEEP GOING!",
  "THAT'S IT!",
  "GO HOME TEAM!",
  "MAKE SOME NOISE!",
  "ONE MORE!",
  "COME ON NOW!",
  "NO WAY!",
  "UNBELIEVABLE!",
  "WHAT A PLAY!",
  "BIG TIME!"
];

function crowdReact(
  type,
  amount
) {
  let boost =
    amount ?? .2;

  state.crowdTarget =
    THREE.MathUtils.clamp(
      state.crowdTarget +
        boost,
      0,
      1
    );

  crowdSound(
    Math.min(
      1,
      Math.abs(boost) +
        .25
    )
  );

  if (
    type ===
    "clutch"
  ) {
    showMessage(
      "CLUTCH TIME!"
    );
  }

  if (
    type ===
    "steal"
  ) {
    showMessage(
      "STEAL!"
    );
  }

  if (
    type ===
    "three"
  ) {
    showMessage(
      "THREE!!!"
    );
  }

  if (
    type ===
    "comeback"
  ) {
    showMessage(
      "COMEBACK!"
    );
  }

  if (
    type ===
    "dribble"
  ) {
    showMessage(
      "OHHHH!"
    );
  }
}

function updateCrowd(
  dt
) {
  if (
    !state.running ||
    state.paused
  ) {
    return;
  }

  const margin =
    state.homeScore -
    state.awayScore;

  let target =
    .18;

  // Home lead.

  if (
    margin > 0
  ) {
    target +=
      Math.min(
        .25,
        margin *
          .025
      );
  }

  // Close game.

  if (
    Math.abs(margin) <=
    5
  ) {
    target +=
      .18;
  }

  // Losing comeback.

  if (
    margin < 0
  ) {
    target +=
      Math.min(
        .2,
        Math.abs(margin) *
          .012
      );
  }

  // Late game.

  if (
    state.gameTime <=
    60
  ) {
    target +=
      .15;
  }

  if (
    state.gameTime <=
    30
  ) {
    target +=
      .2;
  }

  if (
    state.gameTime <=
    10
  ) {
    target +=
      .3;
  }

  state.crowdTarget =
    THREE.MathUtils.clamp(
      target,
      0,
      1
    );

  state.crowdIntensity =
    THREE.MathUtils.lerp(
      state.crowdIntensity,
      state.crowdTarget,
      dt * 1.4
    );

  // Standing.

  let standing =
    0;

  if (
    state.gameTime <=
    60
  ) {
    standing =
      (60 -
        state.gameTime) /
      50;
  }

  if (
    Math.abs(margin) <=
      3 &&
    state.gameTime <=
      60
  ) {
    standing +=
      .3;
  }

  if (
    state.gameTime <=
    10
  ) {
    standing = 1;
  }

  state.crowdTargetStanding =
    THREE.MathUtils.clamp(
      standing,
      0,
      1
    );

  state.crowdStanding =
    THREE.MathUtils.lerp(
      state.crowdStanding,
      state.crowdTargetStanding,
      dt * 2
    );

  const level =
    state.crowdIntensity;

  if (
    level < .25
  ) {
    crowdLevelEl.textContent =
      "CALM";
  } else if (
    level < .45
  ) {
    crowdLevelEl.textContent =
      "LOUD";
  } else if (
    level < .7
  ) {
    crowdLevelEl.textContent =
      "HYPED";
  } else if (
    level < .9
  ) {
    crowdLevelEl.textContent =
      "ROARING";
  } else {
    crowdLevelEl.textContent =
      "INSANE";
  }

  for (
    const fan of crowd
  ) {
    const bounce =
      Math.max(
        0,
        Math.sin(
          performance.now() *
            .003 *
            fan.speed +
            fan.phase
        )
      );

    const jump =
      bounce *
      state.crowdIntensity *
      .38;

    const standingHeight =
      state.crowdStanding *
      state.crowdIntensity *
      .7;

    fan.group.position.y =
      fan.baseY +
      jump +
      standingHeight;

    fan.body.rotation.z =
      Math.sin(
        performance.now() *
          .002 *
          fan.speed +
          fan.phase
      ) *
      state.crowdIntensity *
      .2;
  }

  if (
    state.chantCooldown >
    0
  ) {
    state.chantCooldown -=
      dt;
  }

  // Defense chants only when away team has the ball.

  if (
    state.possession ===
      "away" &&
    state.chantCooldown <=
      0 &&
    state.crowdIntensity >
      .45
  ) {
    const close =
      Math.abs(margin) <=
      5;

    const clutch =
      close &&
      state.gameTime <=
        60;

    const chance =
      clutch
        ? .055
        : .025;

    if (
      Math.random() <
      dt * chance
    ) {
      triggerDefenseChant(
        clutch
      );
    }
  }
}

// ============================================================
// DEFENSE CHANTS
// ============================================================

function triggerDefenseChant(
  clutch
) {
  const list =
    clutch
      ? clutchDefenseChants
      : normalDefenseChants;

  const chant =
    list[
      Math.floor(
        Math.random() *
          list.length
      )
    ];

  showMessage(
    chant
  );

  state.crowdTarget =
    Math.min(
      1,
      state.crowdTarget +
        .25
    );

  state.chantCooldown =
    clutch
      ? 5
      : 8;

  crowdSound(
    clutch
      ? .95
      : .55
  );
}

// ============================================================
// MESSAGE
// ============================================================

function showMessage(
  text
) {
  messageEl.textContent =
    text;

  messageEl.classList.remove(
    "hidden"
  );

  state.messageTime =
    1.25;
}

function updateMessage(
  dt
) {
  if (
    state.messageTime <=
    0
  ) {
    return;
  }

  state.messageTime -=
    dt;

  if (
    state.messageTime <=
    0
  ) {
    messageEl.classList.add(
      "hidden"
    );
  }
}

// ============================================================
// PAUSE
// ============================================================

function togglePause() {
  if (
    !state.running ||
    state.ended
  ) {
    return;
  }

  state.paused =
    !state.paused;

  pauseOverlay.classList.toggle(
    "active",
    state.paused
  );
}

// ============================================================
// GAME OVER
// ============================================================

function endGame() {
  state.running =
    false;

  state.ended =
    true;

  gameClockEl.textContent =
    "00:00";

  if (
    state.homeScore >
    state.awayScore
  ) {
    finalTitle.textContent =
      "YOU WIN!";

    showMessage(
      "HOME WINS!"
    );

    state.crowdTarget =
      1;

    crowdSound(
      1
    );
  } else if (
    state.homeScore <
    state.awayScore
  ) {
    finalTitle.textContent =
      "YOU LOSE";

  } else {
    finalTitle.textContent =
      "TIE GAME";
  }

  finalScore.textContent =
    `${state.homeScore} - ${state.awayScore}`;

  gameOver.classList.remove(
    "hidden"
  );
}

restartButton.addEventListener(
  "click",
  () => {
    gameOver.classList.add(
      "hidden"
    );

    startGame();
  }
);

// ============================================================
// CAMERA
// ============================================================

function updateCamera(
  dt
) {
  const desired =
    new THREE.Vector3(
      player.mesh.position.x,
      9.5,
      player.mesh.position.z +
        12
    );

  camera.position.lerp(
    desired,
    1 -
      Math.pow(
        .001,
        dt
      )
  );

  camera.lookAt(
    player.mesh.position.x,
    1,
    player.mesh.position.z -
      2
  );
}

// ============================================================
// BALL OWNER UPDATE
// ============================================================

function updateBallOwner() {
  if (
    state.ballState !==
    "held"
  ) {
    return;
  }

  if (
    state.ballOwner ===
    "player"
  ) {
    updateDribble(
      0
    );
  }

  if (
    state.ballOwner ===
    "cpu"
  ) {
    ball.position.set(
      defender.mesh.position.x,
      1.15,
      defender.mesh.position.z
    );
  }
}

// ============================================================
// PLAYER COOLDOWNS
// ============================================================

function updateCooldowns(
  dt
) {
  player.moveCooldown =
    Math.max(
      0,
      player.moveCooldown -
        dt
    );
}

// ============================================================
// RESIZE
// ============================================================

window.addEventListener(
  "resize",
  () => {
    camera.aspect =
      window.innerWidth /
      window.innerHeight;

    camera.updateProjectionMatrix();

    renderer.setSize(
      window.innerWidth,
      window.innerHeight
    );
  }
);

// ============================================================
// MAIN LOOP
// ============================================================

function animate(
  now = performance.now()
) {
  requestAnimationFrame(
    animate
  );

  const dt =
    Math.min(
      (now -
        state.lastTime) /
        1000,
      .05
    );

  state.lastTime =
    now;

  updatePlayer(dt);

  updateDefense(dt);

  updateCooldowns(dt);

  updateBallOwner();

  updateShotCharge(dt);

  updateShot(dt);

  updateShotClock(dt);

  updateGameClock(dt);

  updateCrowd(dt);

  updateMessage(dt);

  updateClockUI();

  updateCamera(dt);

  renderer.render(
    scene,
    camera
  );
}

// ============================================================
// INITIALIZATION
// ============================================================

function initialize() {
  loading.style.display =
    "none";

  gameOver.classList.add(
    "hidden"
  );

  shotMeter.classList.add(
    "hidden"
  );

  menu.style.display =
    "flex";

  updateClockUI();

  resetPossession();

  animate();
}

initialize();
