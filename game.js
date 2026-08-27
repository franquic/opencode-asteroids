'use strict';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = 800;
const H = 600;

// ── Input ─────────────────────────────────────────────────────────────────────
const keys = {};
const justPressed = {};

window.addEventListener('keydown', e => {
  justPressed[e.code] = !keys[e.code];
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code))
    e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function pressed(code) {
  const val = justPressed[code];
  justPressed[code] = false;
  return val;
}

// ── Utils ─────────────────────────────────────────────────────────────────────
const wrap  = (v, max) => ((v % max) + max) % max;
const dist  = (a, b)   => Math.hypot(a.x - b.x, a.y - b.y);
const rand  = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));

// ── Skins ─────────────────────────────────────────────────────────────────────
// Cada skin define su silueta (vértices en coordenadas locales de la nave),
// el color del trazo, el de la llama y la distancia de la nariz (origen de balas).
// Opcionalmente puede escalar su tamaño (scale) y multiplicar los puntos
// obtenidos mientras se pilota (scoreMult).
const SKINS = [
  {
    name: 'Clásica',
    stroke: '#fff',
    flame: 'rgba(255, 130, 0, 0.85)',
    nose: 20,
    verts: [[20, 0], [-12, -9], [-7, 0], [-12, 9]],
  },
  {
    name: 'Dardo',
    stroke: '#f55',
    flame: 'rgba(255, 220, 0, 0.85)',
    nose: 26,
    verts: [[26, 0], [-14, -6], [-9, 0], [-14, 6]],
  },
  {
    name: 'Colibrí',
    stroke: '#5f5',
    flame: 'rgba(160, 255, 0, 0.85)',
    nose: 16,
    verts: [[16, 0], [-8, -11], [-12, -4], [-5, 0], [-12, 4], [-8, 11]],
  },
  {
    name: 'Titán',
    stroke: '#fb0',
    flame: 'rgba(255, 80, 0, 0.85)',
    nose: 18,
    verts: [[18, 0], [-14, -13], [-8, -5], [-11, 0], [-8, 5], [-14, 13]],
  },
  {
    name: 'Gigante',
    stroke: '#a5f',
    flame: 'rgba(255, 100, 255, 0.85)',
    nose: 20,
    scale: 2,
    scoreMult: 2,
    verts: [[20, 0], [6, -9], [-8, -10], [-13, -4], [-8, 0], [-13, 4], [-8, 10], [6, 9]],
  },
];

const SKIN_KEY = 'asteroids.skin';

function loadSkin() {
  try {
    const i = parseInt(localStorage.getItem(SKIN_KEY), 10);
    return Number.isInteger(i) && i >= 0 && i < SKINS.length ? i : 0;
  } catch { return 0; }
}

function saveSkin(i) {
  try { localStorage.setItem(SKIN_KEY, String(i)); } catch {}
}

function cycleSkin(dir) {
  skinIndex = wrap(skinIndex + dir, SKINS.length);
}

let skinIndex = loadSkin();
let menuAngle = 0;  // rotación de la nave en el menú

// Traza el path de una silueta de nave a la escala indicada (sin stroke)
function traceShipPath(verts, scale = 1) {
  ctx.beginPath();
  ctx.moveTo(verts[0][0] * scale, verts[0][1] * scale);
  for (let i = 1; i < verts.length; i++)
    ctx.lineTo(verts[i][0] * scale, verts[i][1] * scale);
  ctx.closePath();
}

// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.ttl  = 1.1;
    this.radius = 2;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Asteroid ──────────────────────────────────────────────────────────────────
const RADII  = [0, 16, 30, 50];   // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32];   // velocidad base por tamaño
const POINTS = [0, 100, 50, 20];  // puntos por tamaño

class Asteroid {
  constructor(x, y, size = 3) {
    this.x    = x;
    this.y    = y;
    this.size = size;
    this.radius = RADII[size];
    this.dead = false;

    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    // Polígono irregular
    const n = randInt(8, 13);
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt) {
    this.x   = wrap(this.x + this.vx * dt, W);
    this.y   = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split() {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Ship ──────────────────────────────────────────────────────────────────────
class Ship {
  constructor() { this.reset(); }

  reset() {
    this.x      = W / 2;
    this.y      = H / 2;
    this.angle  = -Math.PI / 2;
    this.vx     = 0;
    this.vy     = 0;
    this.radius = 12 * (SKINS[skinIndex].scale || 1);
    this.thrusting     = false;
    this.invincible    = 3;
    this.shootCooldown = 0;
    this.velocityTtl   = 0;  // tiempo restante del power-up Velocity
    this.tripleTtl     = 0;  // tiempo restante del power-up Triple
    this.shieldEnergy  = SHIELD_MAX;
    this.shieldLocked  = false;  // bloqueado hasta recuperar energía tras agotarse
    this.shieldActive  = false;
    this.shieldT       = 0;  // reloj para la animación de pulso
    this.dead          = false;
  }

  get velocityActive() { return this.velocityTtl > 0; }
  get tripleActive()   { return this.tripleTtl   > 0; }
  get shieldRadius()   { return SHIELD_RADIUS * (this.radius / 12); }

  update(dt) {
    if (this.dead) return;
    if (this.invincible    > 0) this.invincible    -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.velocityTtl   > 0) this.velocityTtl   -= dt;
    if (this.tripleTtl     > 0) this.tripleTtl     -= dt;

    // Escudo: mantener Shift lo activa mientras haya energía
    const shieldKey = keys['ShiftLeft'] || keys['ShiftRight'];
    if (this.shieldLocked && this.shieldEnergy >= SHIELD_MIN_ACTIVATE)
      this.shieldLocked = false;
    this.shieldActive = shieldKey && !this.shieldLocked && this.shieldEnergy > 0;
    if (this.shieldActive) {
      this.shieldEnergy -= SHIELD_DRAIN * dt;
      if (this.shieldEnergy <= 0) {
        this.shieldEnergy = 0;
        this.shieldLocked = true;
        this.shieldActive = false;
      }
    } else {
      this.shieldEnergy = Math.min(SHIELD_MAX, this.shieldEnergy + SHIELD_REGEN * dt);
    }
    this.shieldT += dt;

    const ROT    = 3.5;   // rad/s
    const THRUST = 260 * (this.velocityActive ? 2 : 1);  // px/s²
    const DRAG   = 0.987;

    if (keys['ArrowLeft'])  this.angle -= ROT * dt;
    if (keys['ArrowRight']) this.angle += ROT * dt;

    this.thrusting = !!keys['ArrowUp'];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * THRUST * dt;
      this.vy += Math.sin(this.angle) * THRUST * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  tryShoot() {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = SKINS[skinIndex].nose * (SKINS[skinIndex].scale || 1);
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;
    // Triple: tres balas en abanico (~20°)
    if (this.tripleActive) {
      const SPREAD = 0.18;
      return [
        new Bullet(ox, oy, this.angle - SPREAD),
        new Bullet(ox, oy, this.angle),
        new Bullet(ox, oy, this.angle + SPREAD),
      ];
    }
    return [new Bullet(ox, oy, this.angle)];
  }

  draw() {
    if (this.dead) return;
    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

    const skin = SKINS[skinIndex];
    const scale = skin.scale || 1;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.strokeStyle = skin.stroke;
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';

    // Silueta según el skin activo
    traceShipPath(skin.verts, scale);
    ctx.stroke();

    // Llama del propulsor
    if (this.thrusting && Math.random() > 0.35) {
      ctx.beginPath();
      ctx.moveTo(-8 * scale, -4 * scale);
      ctx.lineTo(-8 * scale - rand(6, 14) * scale, 0);
      ctx.lineTo(-8 * scale, 4 * scale);
      ctx.strokeStyle = skin.flame;
      ctx.stroke();
    }

    ctx.restore();

    // Anillo del escudo
    if (this.shieldActive) {
      const low = this.shieldEnergy < SHIELD_MAX * 0.25;
      const pulse = 1 + Math.sin(this.shieldT * 10) * 0.06;
      ctx.save();
      // Parpadeo cuando queda poca energía
      ctx.globalAlpha = low && Math.floor(this.shieldT * 8) % 2 === 0 ? 0.35 : 0.9;
      ctx.strokeStyle = SHIELD_COLOR;
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.shieldRadius * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
}

// ── Partículas (explosión) ────────────────────────────────────────────────────
class Particle {
  constructor(x, y, { color = '#fff', speed = [30, 130], life = [0.4, 1.1] } = {}) {
    this.x  = x;
    this.y  = y;
    const angle = rand(0, Math.PI * 2);
    const s     = rand(speed[0], speed[1]);
    this.vx   = Math.cos(angle) * s;
    this.vy   = Math.sin(angle) * s;
    this.life = rand(life[0], life[1]);
    this.ttl  = this.life;
    this.color = color;
    this.dead = false;
  }

  update(dt) {
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    ctx.globalAlpha = this.ttl / this.life;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

// ── Escudo ────────────────────────────────────────────────────────────────────
const SHIELD_MAX          = 3;     // segundos de energía total
const SHIELD_DRAIN        = 1.5;   // energía consumida por segundo activo
const SHIELD_REGEN        = 0.25;  // energía regenerada por segundo inactivo
const SHIELD_MIN_ACTIVATE = 1;     // energía mínima para reactivar tras agotarse
const SHIELD_RADIUS       = 26;    // radio del anillo
const SHIELD_COLOR        = '#0af';

// ── Power-ups ─────────────────────────────────────────────────────────────────
const VELOCITY_DURATION = 5;   // segundos de efecto
const TRIPLE_DURATION   = 5;   // segundos de efecto
const POWERUP_DELAY     = [15, 25];  // rango de segundos entre apariciones
const POWERUP_COLOR     = '#0ff';
const TRIPLE_COLOR      = '#f0f';

class PowerUp {
  constructor(x, y, type = 'velocity') {
    this.x = x;
    this.y = y;
    this.type = type;
    this.color = type === 'triple' ? TRIPLE_COLOR : POWERUP_COLOR;
    this.radius = 14;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(20, 40);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.t = 0;  // reloj para la animación de pulso
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.t += dt;
  }

  draw() {
    const pulse = 1 + Math.sin(this.t * 6) * 0.15;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(pulse, pulse);
    ctx.strokeStyle = this.color;
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';

    // Rombo contenedor
    ctx.beginPath();
    ctx.moveTo(  0, -14);
    ctx.lineTo( 14,   0);
    ctx.lineTo(  0,  14);
    ctx.lineTo(-14,   0);
    ctx.closePath();
    ctx.stroke();

    if (this.type === 'triple') {
      // Abanico de tres trazos (triple disparo)
      ctx.beginPath();
      ctx.moveTo(-5, 0); ctx.lineTo( 5, -6);
      ctx.moveTo(-5, 0); ctx.lineTo( 6,  0);
      ctx.moveTo(-5, 0); ctx.lineTo( 5,  6);
      ctx.stroke();
    } else {
      // Doble chevron hacia adelante (velocidad)
      ctx.beginPath();
      ctx.moveTo(-5, -5); ctx.lineTo( 0, 0); ctx.lineTo(-5, 5);
      ctx.moveTo( 1, -5); ctx.lineTo( 6, 0); ctx.lineTo( 1, 5);
      ctx.stroke();
    }
    ctx.restore();
  }
}

// ── Estrella fugaz ────────────────────────────────────────────────────────────
const STAR_DELAY  = [8, 14];   // rango de segundos entre apariciones
const STAR_SPEED  = [240, 320]; // px/s (mucho más rápida que los asteroides)
const STAR_TTL    = 5;         // segundos de vida antes de desaparecer
const STAR_POINTS = 300;
const STAR_COLOR  = '#ff0';

class ShootingStar {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(STAR_SPEED[0], STAR_SPEED[1]);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.radius = 10;
    this.ttl  = STAR_TTL;
    this.life = STAR_TTL;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    // Parpadeo cuando está por desaparecer
    if (this.ttl < 1 && Math.floor(this.ttl * 10) % 2 === 0) return;

    ctx.save();
    ctx.globalAlpha = Math.min(1, this.ttl / 0.5);
    ctx.strokeStyle = STAR_COLOR;
    ctx.fillStyle   = STAR_COLOR;
    ctx.lineWidth   = 1.5;
    ctx.lineCap     = 'round';

    // Estela apuntando en dirección contraria al movimiento
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.09, this.y - this.vy * 0.09);
    ctx.stroke();

    // Núcleo brillante
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

// ── Estado del juego ──────────────────────────────────────────────────────────
let ship, bullets, asteroids, particles, powerup, star;
let score, lives, level;
let state;      // 'menu' | 'playing' | 'dead' | 'gameover'
let deadTimer;
let powerupTimer;
let starTimer;

// Posición aleatoria a distancia segura de la nave
function randomSafePosition(safeDist) {
  let x, y;
  do {
    x = rand(0, W);
    y = rand(0, H);
  } while (Math.hypot(x - ship.x, y - ship.y) < safeDist);
  return [x, y];
}

function spawnAsteroids(count) {
  for (let i = 0; i < count; i++) {
    const [x, y] = randomSafePosition(130);
    asteroids.push(new Asteroid(x, y, 3));
  }
}

function initGame() {
  ship          = new Ship();
  bullets   = [];
  asteroids = [];
  particles = [];
  powerup   = null;
  powerupTimer = rand(POWERUP_DELAY[0], POWERUP_DELAY[1]);
  star      = null;
  starTimer = rand(STAR_DELAY[0], STAR_DELAY[1]);
  score  = 0;
  lives  = 3;
  level  = 1;
  state  = 'playing';
  spawnAsteroids(4);
}

function nextLevel() {
  level++;
  bullets   = [];
  particles = [];
  star      = null;
  starTimer = rand(STAR_DELAY[0], STAR_DELAY[1]);
  ship.reset();
  spawnAsteroids(3 + level);
}

function explode(x, y, count = 8, color = '#fff') {
  for (let i = 0; i < count; i++)
    particles.push(new Particle(x, y, { color }));
}

// Suma puntos aplicando el multiplicador de la nave activa (la Gigante puntúa doble)
function addScore(base) {
  score += base * (SKINS[skinIndex].scoreMult || 1);
}

function updatePowerUp(dt) {
  // Aparición periódica (solo un pickup a la vez en pantalla)
  powerupTimer -= dt;
  if (powerupTimer <= 0 && !powerup) {
    const [x, y] = randomSafePosition(100);
    powerup = new PowerUp(x, y, Math.random() < 0.5 ? 'triple' : 'velocity');
    powerupTimer = rand(POWERUP_DELAY[0], POWERUP_DELAY[1]);
  }

  if (!powerup) return;

  powerup.update(dt);

  // Recogida: activa el efecto según el tipo
  if (dist(ship, powerup) < ship.radius + powerup.radius) {
    if (powerup.type === 'triple') ship.tripleTtl     = TRIPLE_DURATION;
    else                           ship.velocityTtl = VELOCITY_DURATION;
    explode(powerup.x, powerup.y, 10, powerup.color);
    powerup = null;
  }
}

// Estela cian tras la nave mientras dura el efecto
function emitVelocityTrail() {
  const TAIL = 14;
  const x = ship.x - Math.cos(ship.angle) * TAIL;
  const y = ship.y - Math.sin(ship.angle) * TAIL;
  particles.push(new Particle(x, y, {
    color: POWERUP_COLOR, speed: [5, 30], life: [0.15, 0.4],
  }));
}

function updateStar(dt) {
  // Aparición periódica (solo una estrella a la vez en pantalla)
  starTimer -= dt;
  if (starTimer <= 0 && !star) {
    const [x, y] = randomSafePosition(100);
    star = new ShootingStar(x, y);
    starTimer = rand(STAR_DELAY[0], STAR_DELAY[1]);
  }

  if (!star) return;

  star.update(dt);

  // Estela de partículas
  particles.push(new Particle(star.x, star.y, {
    color: STAR_COLOR, speed: [5, 30], life: [0.15, 0.4],
  }));

  // Bala vs estrella fugaz: bonus de puntos
  for (const b of bullets) {
    if (!b.dead && dist(b, star) < star.radius) {
      b.dead = true;
      addScore(STAR_POINTS);
      explode(star.x, star.y, 12, STAR_COLOR);
      star = null;
      return;
    }
  }

  // Expiración natural
  if (star.dead) { star = null; return; }

  // Nave vs estrella fugaz: el escudo la destruye sin puntos
  const dStar = dist(ship, star);
  if (ship.shieldActive && dStar < ship.shieldRadius + star.radius) {
    explode(star.x, star.y, 12, SHIELD_COLOR);
    star = null;
  } else if (ship.invincible <= 0 && dStar < ship.radius + star.radius) {
    star = null;
    killShip();
  }
}

function killShip() {
  explode(ship.x, ship.y, 14);
  ship.dead = true;
  ship.velocityTtl = 0;  // el efecto se pierde al morir
  ship.tripleTtl   = 0;
  lives--;
  if (lives <= 0) {
    state = 'gameover';
  } else {
    state     = 'dead';
    deadTimer = 2;
  }
}

// ── Update ────────────────────────────────────────────────────────────────────
function update(dt) {
  if (state === 'menu') {
    menuAngle += dt * 0.8;
    if (pressed('ArrowLeft'))  cycleSkin(-1);
    if (pressed('ArrowRight')) cycleSkin(1);
    if (pressed('Space')) {
      saveSkin(skinIndex);
      initGame();
    }
    return;
  }

  if (state === 'gameover') {
    if (pressed('Space')) initGame();
    if (pressed('Escape')) state = 'menu';
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    return;
  }

  if (state === 'dead') {
    deadTimer -= dt;
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    asteroids.forEach(a => a.update(dt));
    if (star) star.update(dt);
    if (deadTimer <= 0) { state = 'playing'; ship.reset(); }
    return;
  }

  // Disparar
  if (pressed('Space')) {
    bullets.push(...ship.tryShoot());
  }

  ship.update(dt);
  bullets.forEach(b => b.update(dt));
  asteroids.forEach(a => a.update(dt));
  particles.forEach(p => p.update(dt));

  updatePowerUp(dt);
  if (ship.velocityActive) emitVelocityTrail();
  updateStar(dt);

  bullets   = bullets.filter(b => !b.dead);
  particles = particles.filter(p => !p.dead);

  // Bala vs asteroide
  const newAsteroids = [];
  for (const b of bullets) {
    for (const a of asteroids) {
      if (!a.dead && !b.dead && dist(b, a) < a.radius) {
        b.dead = true;
        a.dead = true;
        addScore(POINTS[a.size]);
        explode(a.x, a.y, a.size * 5);
        newAsteroids.push(...a.split());
      }
    }
  }
  asteroids = asteroids.filter(a => !a.dead).concat(newAsteroids);
  bullets   = bullets.filter(b => !b.dead);

  // Asteroide vs nave: el escudo lo destruye (sin puntos ni división)
  for (const a of asteroids) {
    if (a.dead) continue;
    const d = dist(ship, a);
    if (ship.shieldActive && d < ship.shieldRadius + a.radius * 0.82) {
      a.dead = true;
      explode(a.x, a.y, a.size * 5, SHIELD_COLOR);
    } else if (ship.invincible <= 0 && d < ship.radius + a.radius * 0.82) {
      killShip();
      break;
    }
  }

  // Nivel completado
  if (asteroids.length === 0) nextLevel();
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function drawLifeIcon(x, y) {
  const skin = SKINS[skinIndex];
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  ctx.strokeStyle = skin.stroke;
  ctx.lineWidth   = 1.2;
  ctx.lineJoin    = 'round';
  traceShipPath(skin.verts, 0.45);
  ctx.stroke();
  ctx.restore();
}

function drawHUD() {
  ctx.fillStyle = '#fff';
  ctx.font = '15px monospace';

  ctx.textAlign = 'left';
  const scoreText = `SCORE  ${score}`;
  ctx.fillText(scoreText, 14, 26);
  if ((SKINS[skinIndex].scoreMult || 1) > 1) {
    ctx.fillStyle = SKINS[skinIndex].stroke;
    ctx.fillText('x2', 20 + ctx.measureText(scoreText).width, 26);
    ctx.fillStyle = '#fff';
  }

  ctx.textAlign = 'center';
  ctx.fillText(`NIVEL ${level}`, W / 2, 26);

  let powerY = 46;
  if (ship.velocityActive) {
    ctx.fillStyle = POWERUP_COLOR;
    ctx.fillText(`VELOCITY ${ship.velocityTtl.toFixed(1)}s`, W / 2, powerY);
    powerY += 20;
  }
  if (ship.tripleActive) {
    ctx.fillStyle = TRIPLE_COLOR;
    ctx.fillText(`TRIPLE ${ship.tripleTtl.toFixed(1)}s`, W / 2, powerY);
  }

  for (let i = 0; i < lives; i++)
    drawLifeIcon(W - 16 - i * 22, 18);

  // Barra de energía del escudo
  const bw = 120, bh = 8;
  const bx = W / 2 - bw / 2, by = H - 22;
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth   = 1;
  ctx.strokeRect(bx, by, bw, bh);
  ctx.fillStyle = ship.shieldEnergy > 0 ? SHIELD_COLOR : 'rgba(255,255,255,0.25)';
  ctx.fillRect(bx + 1, by + 1, (bw - 2) * (ship.shieldEnergy / SHIELD_MAX), bh - 2);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font      = '11px monospace';
  ctx.fillText('ESCUDO', W / 2, by - 5);

}

function drawOverlay(title, sub) {
  ctx.textAlign   = 'center';
  ctx.fillStyle   = '#fff';
  ctx.font        = 'bold 46px monospace';
  ctx.fillText(title, W / 2, H / 2 - 18);
  ctx.font        = '18px monospace';
  ctx.fillStyle   = 'rgba(255,255,255,0.65)';
  ctx.fillText(sub, W / 2, H / 2 + 22);
}

function drawMenu() {
  const skin = SKINS[skinIndex];

  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 52px monospace';
  ctx.fillText('ASTEROIDS', W / 2, 150);

  ctx.font = '20px monospace';
  ctx.fillStyle = skin.stroke;
  ctx.fillText(skin.name.toUpperCase(), W / 2, 195);

  // Previsualización de la nave, rotando lentamente (a escala real del skin)
  ctx.save();
  ctx.translate(W / 2, H / 2 + 20);
  ctx.rotate(menuAngle);
  ctx.strokeStyle = skin.stroke;
  ctx.lineWidth   = 2;
  ctx.lineJoin    = 'round';
  traceShipPath(skin.verts, 3 * (skin.scale || 1));
  ctx.stroke();
  ctx.restore();

  // Ventaja de la nave Gigante
  if ((skin.scoreMult || 1) > 1) {
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.font = '15px monospace';
    ctx.fillText('DOBLE TAMAÑO — PUNTOS x2', W / 2, 470);
  }

  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.font = '17px monospace';
  ctx.fillText('◀ ▶ CAMBIAR NAVE — ESPACIO PARA JUGAR', W / 2, H - 60);
  ctx.fillText(`NAVE ${skinIndex + 1}/${SKINS.length}`, W / 2, H - 36);
}

function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  if (state === 'menu') {
    drawMenu();
    return;
  }

  particles.forEach(p => p.draw());
  asteroids.forEach(a => a.draw());
  if (star) star.draw();
  if (powerup) powerup.draw();
  bullets.forEach(b => b.draw());
  ship.draw();

  drawHUD();

  if (state === 'gameover')
    drawOverlay('GAME OVER', `PUNTAJE: ${score} — ESPACIO REINICIAR — ESC MENÚ`);
}

// ── Loop principal ────────────────────────────────────────────────────────────
let lastTime = null;

function loop(ts) {
  const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

initGame();
state = 'menu';  // se empieza en el menú de selección de nave
requestAnimationFrame(loop);
