import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";

// --- Web Audio API ---
class SoundFX {
  ctx: AudioContext | null = null;

  init() {
    if (!this.ctx) {
      this.ctx = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
  }

  playShoot(type: string) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    if (type === "gatling") {
      osc.type = "square";
      osc.frequency.setValueAtTime(800, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(
        100,
        this.ctx.currentTime + 0.1,
      );
      gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.1);
    } else if (type === "goo") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(200, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(150, this.ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.2);
    } else if (type === "missile") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(150, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(
        40,
        this.ctx.currentTime + 0.3,
      );
      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.3);
    } else {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(1000, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(
        200,
        this.ctx.currentTime + 0.15,
      );
      gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        this.ctx.currentTime + 0.15,
      );
      osc.start();
      osc.stop(this.ctx.currentTime + 0.15);
    }
  }

  playBuild() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(300, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(600, this.ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playDeath() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(100, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(10, this.ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  playBaseHit() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.type = "triangle";
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }
}

const sfx = new SoundFX();

// --- Types & Config ---
type Point = { x: number; y: number };

type Creep = {
  id: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  pathIndex: number;
  slowUntil: number;
  isBoss?: boolean;
  angle: number; // Added rotation angle for creeps
};

type TowerType = "gatling" | "goo" | "missile" | "tesla";

type TowerConfig = {
  cost: number;
  range: number;
  damage: number;
  cooldown: number;
  color: string;
  label: string;
  bulletSpeed: number;
};

const TOWER_DICTIONARY: Record<TowerType, TowerConfig> = {
  gatling: {
    cost: 50,
    range: 120,
    damage: 15,
    cooldown: 300,
    color: "#747d8c",
    label: "Gatling",
    bulletSpeed: 15,
  },
  goo: {
    cost: 100,
    range: 100,
    damage: 5,
    cooldown: 1000,
    color: "#2ed573",
    label: "Goo",
    bulletSpeed: 8,
  },
  missile: {
    cost: 200,
    range: 200,
    damage: 50,
    cooldown: 1500,
    color: "#ff4757",
    label: "Missile",
    bulletSpeed: 10,
  },
  tesla: {
    cost: 300,
    range: 150,
    damage: 35,
    cooldown: 800,
    color: "#1e90ff",
    label: "Tesla",
    bulletSpeed: 20,
  },
};

type Tower = {
  id: string;
  type: TowerType;
  x: number;
  y: number;
  lastFired: number;
  angle: number;
  level: number;
} & TowerConfig;

type Bullet = {
  id: string;
  x: number;
  y: number;
  targetId: string;
  targetLastX: number;
  targetLastY: number;
  speed: number;
  damage: number;
  type: TowerType;
};

type GameState = {
  creeps: Creep[];
  towers: Tower[];
  bullets: Bullet[];
  money: number;
  baseHp: number;
  wave: number;
  gameOver: boolean;
  gameWon: boolean;
  currentLevelId: number;
};

type LevelData = {
  path: Point[];
  slots: Point[];
};

const GAME_WIDTH = 960;
const GAME_HEIGHT = 540;
const SLOT_SIZE = 44;

const distToSegment = (p: Point, v: Point, w: Point) => {
  const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
  if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  const proj = { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) };
  return Math.hypot(p.x - proj.x, p.y - proj.y);
};

const generateLevels = (): LevelData[] => {
  const basePaths = [
    [
      { x: -50, y: 150 },
      { x: 250, y: 150 },
      { x: 250, y: 400 },
      { x: 750, y: 400 },
      { x: 750, y: 150 },
      { x: 1010, y: 150 },
    ],
    [
      { x: 150, y: -50 },
      { x: 150, y: 400 },
      { x: 800, y: 400 },
      { x: 800, y: 600 },
    ],
    [
      { x: 1010, y: 250 },
      { x: 600, y: 250 },
      { x: 600, y: 100 },
      { x: 300, y: 100 },
      { x: 300, y: 450 },
      { x: -50, y: 450 },
    ],
    [
      { x: 500, y: 600 },
      { x: 500, y: 350 },
      { x: 200, y: 350 },
      { x: 200, y: 100 },
      { x: 850, y: 100 },
      { x: 850, y: -50 },
    ],
  ];

  const levels: LevelData[] = [];

  for (let i = 0; i < 12; i++) {
    const basePath = basePaths[i % 4];
    const offset = Math.floor(i / 4) * 20;

    const path = basePath.map((p) => ({
      x: p.x <= 0 || p.x >= 960 ? p.x : p.x - offset,
      y: p.y <= 0 || p.y >= 540 ? p.y : p.y + offset,
    }));

    // Slots hugging the path perfectly
    const rawSlots: Point[] = [];
    const SLOT_DIST = 50;
    const SLOT_SPACING = 52;

    for (let j = 0; j < path.length - 1; j++) {
      const p1 = path[j];
      const p2 = path[j + 1];

      if (p1.y === p2.y) {
        const y1 = p1.y - SLOT_DIST;
        const y2 = p1.y + SLOT_DIST;
        const minX = Math.min(p1.x, p2.x);
        const maxX = Math.max(p1.x, p2.x);
        for (let x = minX + 26; x <= maxX - 26; x += SLOT_SPACING) {
          rawSlots.push({ x, y: y1 });
          rawSlots.push({ x, y: y2 });
        }
      } else if (p1.x === p2.x) {
        const x1 = p1.x - SLOT_DIST;
        const x2 = p1.x + SLOT_DIST;
        const minY = Math.min(p1.y, p2.y);
        const maxY = Math.max(p1.y, p2.y);
        for (let y = minY + 26; y <= maxY - 26; y += SLOT_SPACING) {
          rawSlots.push({ x: x1, y });
          rawSlots.push({ x: x2, y });
        }
      }
    }

    const finalSlots: Point[] = [];
    rawSlots.forEach((slot) => {
      if (
        slot.x < 22 ||
        slot.x > GAME_WIDTH - 22 ||
        slot.y < 22 ||
        slot.y > GAME_HEIGHT - 22
      )
        return;
      let minDist = Infinity;
      for (let j = 0; j < path.length - 1; j++) {
        const d = distToSegment(slot, path[j], path[j + 1]);
        if (d < minDist) minDist = d;
      }
      if (minDist < SLOT_DIST - 1) return;
      const hasOverlap = finalSlots.some(
        (s) => Math.hypot(s.x - slot.x, s.y - slot.y) < 44,
      );
      if (hasOverlap) return;
      finalSlots.push(slot);
    });

    levels.push({ path, slots: finalSlots });
  }
  return levels;
};

const LEVELS = generateLevels();

export default function TowerDefenseGame() {
  const [appView, setAppView] = useState<"menu" | "game">("menu");
  const [activeLevelId, setActiveLevelId] = useState<number>(0);
  const [selectedSlot, setSelectedSlot] = useState<Point | null>(null);
  const [currentTime, setCurrentTime] = useState(Date.now()); // Force re-render for animations

  const stateRef = useRef<GameState>({
    creeps: [],
    towers: [],
    bullets: [],
    money: 250,
    baseHp: 20,
    wave: 0,
    gameOver: false,
    gameWon: false,
    currentLevelId: 0,
  });

  const lastSpawnRef = useRef<number>(0);
  const creepsSpawnedRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(Date.now());

  const activeLevel = LEVELS[activeLevelId];
  const activePath = useMemo(() => activeLevel?.path || [], [activeLevel]);
  const activeSlots = activeLevel?.slots || [];

  const startGame = (levelIndex: number) => {
    setActiveLevelId(levelIndex);
    stateRef.current = {
      creeps: [],
      towers: [],
      bullets: [],
      money: 250,
      baseHp: 20,
      wave: 0,
      gameOver: false,
      gameWon: false,
      currentLevelId: levelIndex,
    };
    creepsSpawnedRef.current = 0;
    lastTimeRef.current = Date.now();
    setSelectedSlot(null);
    setAppView("game");
    sfx.init();
  };

  const handleRetreat = () => {
    setAppView("menu");
    stateRef.current = {
      creeps: [],
      towers: [],
      bullets: [],
      money: 250,
      baseHp: 20,
      wave: 0,
      gameOver: false,
      gameWon: false,
      currentLevelId: 0,
    };
    creepsSpawnedRef.current = 0;
    setSelectedSlot(null);
  };

  const updateGame = useCallback(() => {
    if (appView !== "game") return;

    const state = stateRef.current;
    if (state.gameOver || state.gameWon) return;

    const currentLevelData = LEVELS[state.currentLevelId];
    const currentPath = currentLevelData.path;

    const now = Date.now();
    const dt = Math.min((now - lastTimeRef.current) / 1000, 0.1);
    lastTimeRef.current = now;
    setCurrentTime(now);

    const maxWaves = 10;

    // 1. Spawning AI
    if (state.wave > 0 && state.wave <= maxWaves) {
      const creepsToSpawn = state.wave * 4;
      const hpMultiplier = 1 + state.currentLevelId * 0.2;
      const speedMultiplier = 1 + state.currentLevelId * 0.03;

      if (
        creepsSpawnedRef.current < creepsToSpawn &&
        now - lastSpawnRef.current > 1200 - state.wave * 50
      ) {
        const isBoss =
          (state.wave === 5 || state.wave === maxWaves) &&
          creepsSpawnedRef.current === creepsToSpawn - 1;
        const baseHp = (40 + state.wave * 30) * hpMultiplier;
        const baseSpeed = (1.2 + state.wave * 0.15) * speedMultiplier;

        // Calculate initial facing angle
        const dx = currentPath[1].x - currentPath[0].x;
        const dy = currentPath[1].y - currentPath[0].y;

        state.creeps.push({
          id: Math.random().toString(36).substr(2, 9),
          x: currentPath[0].x,
          y: currentPath[0].y,
          hp: Math.floor(isBoss ? baseHp * 15 : baseHp),
          maxHp: Math.floor(isBoss ? baseHp * 15 : baseHp),
          speed: isBoss ? baseSpeed * 0.5 : baseSpeed,
          pathIndex: 1,
          slowUntil: 0,
          isBoss,
          angle: Math.atan2(dy, dx) * (180 / Math.PI),
        });
        lastSpawnRef.current = now;
        creepsSpawnedRef.current++;
      }
    }

    if (
      state.wave === maxWaves &&
      creepsSpawnedRef.current === maxWaves * 4 &&
      state.creeps.length === 0
    ) {
      state.gameWon = true;
    }

    // 2. Creep Movement with Rotation
    for (let i = state.creeps.length - 1; i >= 0; i--) {
      const creep = state.creeps[i];
      let currentSpeed =
        (now < creep.slowUntil ? creep.speed * 0.5 : creep.speed) * (dt * 60);

      while (currentSpeed > 0 && creep.pathIndex < currentPath.length) {
        const target = currentPath[creep.pathIndex];
        const dx = target.x - creep.x;
        const dy = target.y - creep.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 0) {
          creep.angle = Math.atan2(dy, dx) * (180 / Math.PI); // Update rotation to face movement
        }

        if (dist <= currentSpeed) {
          creep.x = target.x;
          creep.y = target.y;
          creep.pathIndex++;
          currentSpeed -= dist;
        } else {
          creep.x += (dx / dist) * currentSpeed;
          creep.y += (dy / dist) * currentSpeed;
          currentSpeed = 0;
        }
      }

      if (creep.pathIndex >= currentPath.length) {
        state.baseHp -= creep.isBoss ? 10 : 1;
        state.creeps.splice(i, 1);
        sfx.playBaseHit();
        if (state.baseHp <= 0) state.gameOver = true;
      }
    }

    // 3. Tower AI
    state.towers.forEach((tower) => {
      const target = state.creeps.find(
        (c) => Math.hypot(c.x - tower.x, c.y - tower.y) <= tower.range,
      );

      if (target) {
        tower.angle =
          Math.atan2(target.y - tower.y, target.x - tower.x) * (180 / Math.PI);
        if (now - tower.lastFired >= tower.cooldown) {
          tower.lastFired = now;
          sfx.playShoot(tower.type);
          state.bullets.push({
            id: Math.random().toString(36).substr(2, 9),
            x: tower.x,
            y: tower.y,
            targetId: target.id,
            targetLastX: target.x,
            targetLastY: target.y,
            speed: tower.bulletSpeed,
            damage: tower.damage,
            type: tower.type,
          });
        }
      }
    });

    // 4. Bullet AI
    for (let i = state.bullets.length - 1; i >= 0; i--) {
      const bullet = state.bullets[i];
      const target = state.creeps.find((c) => c.id === bullet.targetId);
      const targetX = target ? target.x : bullet.targetLastX;
      const targetY = target ? target.y : bullet.targetLastY;

      const dx = targetX - bullet.x;
      const dy = targetY - bullet.y;
      const dist = Math.hypot(dx, dy);
      const currentBulletSpeed = bullet.speed * (dt * 60);

      if (dist <= currentBulletSpeed) {
        if (target) {
          target.hp -= bullet.damage;
          if (bullet.type === "goo") target.slowUntil = now + 2000;
        }
        state.bullets.splice(i, 1);
      } else {
        bullet.x += (dx / dist) * currentBulletSpeed;
        bullet.y += (dy / dist) * currentBulletSpeed;
        if (target) {
          bullet.targetLastX = target.x;
          bullet.targetLastY = target.y;
        }
      }
    }

    // 5. Cleanup & Economy
    for (let i = state.creeps.length - 1; i >= 0; i--) {
      if (state.creeps[i].hp <= 0) {
        const wasBoss = state.creeps[i].isBoss;
        state.creeps.splice(i, 1);
        state.money += wasBoss
          ? 500
          : 15 + Math.floor(state.currentLevelId * 1.5);
        sfx.playDeath();
      }
    }

    requestAnimationFrame(updateGame);
  }, [appView]);

  useEffect(() => {
    let animationId: number;
    if (appView === "game") {
      animationId = requestAnimationFrame(updateGame);
    }
    return () => cancelAnimationFrame(animationId);
  }, [updateGame, appView]);

  const handleSlotClick = (slot: Point) => {
    if (stateRef.current.gameOver || stateRef.current.gameWon) return;
    if (selectedSlot?.x === slot.x && selectedSlot?.y === slot.y)
      setSelectedSlot(null);
    else setSelectedSlot(slot);
    sfx.init();
  };

  const buildTower = (type: TowerType) => {
    if (!selectedSlot) return;
    const state = stateRef.current;
    const towerSpec = TOWER_DICTIONARY[type];

    if (state.money < towerSpec.cost) return;

    state.money -= towerSpec.cost;
    state.towers.push({
      id: Math.random().toString(36).substr(2, 9),
      type,
      x: selectedSlot.x,
      y: selectedSlot.y,
      lastFired: 0,
      angle: 0,
      level: 1,
      ...towerSpec,
    });
    sfx.playBuild();
    setSelectedSlot(null);
  };

  const upgradeTower = () => {
    if (!selectedSlot) return;
    const state = stateRef.current;
    const tower = state.towers.find(
      (t) => t.x === selectedSlot.x && t.y === selectedSlot.y,
    );
    if (!tower || tower.level >= 3) return;

    const upgradeCost = Math.floor(tower.cost * Math.pow(1.5, tower.level));
    if (state.money >= upgradeCost) {
      state.money -= upgradeCost;
      tower.level += 1;
      tower.damage = Math.floor(tower.damage * 1.5);
      tower.range = Math.floor(tower.range * 1.15);
      sfx.playBuild();
      setSelectedSlot(null);
    }
  };

  const sellTower = () => {
    if (!selectedSlot) return;
    const state = stateRef.current;
    const towerIdx = state.towers.findIndex(
      (t) => t.x === selectedSlot.x && t.y === selectedSlot.y,
    );
    if (towerIdx === -1) return;
    const tower = state.towers[towerIdx];

    let invested = tower.cost;
    for (let i = 1; i < tower.level; i++)
      invested += Math.floor(tower.cost * Math.pow(1.5, i));

    state.money += Math.floor(invested * 0.5);
    state.towers.splice(towerIdx, 1);
    sfx.playDeath();
    setSelectedSlot(null);
  };

  const startNextWave = () => {
    sfx.init();
    const state = stateRef.current;
    if (!state.gameOver && !state.gameWon && state.creeps.length === 0) {
      state.wave++;
      creepsSpawnedRef.current = 0;
    }
  };

  const activeSelectedTower = selectedSlot
    ? stateRef.current.towers.find(
        (t) => t.x === selectedSlot.x && t.y === selectedSlot.y,
      )
    : null;
  let currentUpgradeCost = 0;
  let currentSellValue = 0;

  if (activeSelectedTower) {
    currentUpgradeCost = Math.floor(
      activeSelectedTower.cost * Math.pow(1.5, activeSelectedTower.level),
    );
    let invested = activeSelectedTower.cost;
    for (let i = 1; i < activeSelectedTower.level; i++)
      invested += Math.floor(activeSelectedTower.cost * Math.pow(1.5, i));
    currentSellValue = Math.floor(invested * 0.5);
  }

  // --- Render Helpers (Realistic SVG) ---
  const renderTowerShape = (tower: Tower) => {
    const { x, y, type, angle, level, lastFired, cooldown } = tower;

    // Calculate recoil based on time since last fired
    const timeSinceFire = currentTime - lastFired;
    const isFiring = timeSinceFire < 150;
    const recoilAmount = isFiring ? Math.max(0, 150 - timeSinceFire) / 15 : 0;

    return (
      <g transform={`translate(${x}, ${y})`}>
        <circle
          cx="0"
          cy="5"
          r="22"
          fill="rgba(0,0,0,0.3)"
          filter="url(#blur)"
        />

        {/* Level indicators */}
        <g transform="translate(0, 22)">
          {Array.from({ length: level }).map((_, i) => (
            <circle
              key={i}
              cx={(i - (level - 1) / 2) * 10}
              cy="0"
              r="3.5"
              fill="url(#goldGrad)"
              stroke="#2f3542"
              strokeWidth="1"
            />
          ))}
        </g>

        {/* Tower Base (Realistic metal podium) */}
        <rect
          x="-20"
          y="-20"
          width="40"
          height="40"
          rx="6"
          fill="url(#metalBase)"
          stroke="#4b4b4b"
          strokeWidth="2"
        />
        <circle
          cx="0"
          cy="0"
          r="14"
          fill="#2d3436"
          stroke="#636e72"
          strokeWidth="2"
        />

        {/* Rotating Head */}
        <g transform={`rotate(${angle})`}>
          {type === "gatling" && (
            <g transform={`translate(${-recoilAmount}, 0)`}>
              {/* Dual Barrels */}
              <rect
                x="0"
                y="-8"
                width="28"
                height="4"
                fill="url(#gunmetal)"
                rx="1"
              />
              <rect
                x="0"
                y="4"
                width="28"
                height="4"
                fill="url(#gunmetal)"
                rx="1"
              />
              {/* Muzzle flashes if firing */}
              {isFiring && (
                <ellipse
                  cx="32"
                  cy="-6"
                  rx="6"
                  ry="3"
                  fill="#f1c40f"
                  filter="url(#glow-yellow)"
                />
              )}
              {isFiring && (
                <ellipse
                  cx="32"
                  cy="6"
                  rx="6"
                  ry="3"
                  fill="#f1c40f"
                  filter="url(#glow-yellow)"
                />
              )}
              {/* Body */}
              <path
                d="M -8 -12 L 8 -10 L 12 0 L 8 10 L -8 12 Z"
                fill="url(#metalBody)"
              />
              <circle cx="0" cy="0" r="6" fill="#2d3436" />
            </g>
          )}

          {type === "goo" && (
            <g>
              <rect
                x="0"
                y="-6"
                width="22"
                height="12"
                fill="#27ae60"
                rx="3"
                transform={`translate(${-recoilAmount}, 0)`}
              />
              {isFiring && (
                <circle
                  cx="26"
                  cy="0"
                  r="8"
                  fill="#2ed573"
                  filter="url(#glow-green)"
                  opacity="0.6"
                />
              )}
              {/* Bio Vat Base */}
              <circle cx="0" cy="0" r="15" fill="url(#gooGrad)" />
              {/* Bubbles */}
              <circle cx="-4" cy="-4" r="3" fill="#fff" opacity="0.4" />
              <circle cx="4" cy="6" r="2" fill="#fff" opacity="0.3" />
              {/* Glass Dome Overlay */}
              <circle cx="0" cy="0" r="15" fill="url(#glassFlare)" />
              <circle
                cx="0"
                cy="0"
                r="15"
                fill="none"
                stroke="#bdc3c7"
                strokeWidth="2"
              />
            </g>
          )}

          {type === "missile" && (
            <g transform={`translate(${-recoilAmount}, 0)`}>
              {/* Launcher Base */}
              <rect
                x="-12"
                y="-14"
                width="24"
                height="28"
                fill="url(#militaryGreen)"
                rx="2"
              />
              {/* Tubes */}
              <rect x="4" y="-10" width="16" height="6" fill="#2d3436" rx="1" />
              <rect x="4" y="4" width="16" height="6" fill="#2d3436" rx="1" />
              {/* Missiles loaded (disappear when firing) */}
              {timeSinceFire > cooldown * 0.5 && (
                <path d="M 12 -9 L 22 -7 L 12 -5 Z" fill="#e74c3c" />
              )}
              {timeSinceFire > cooldown * 0.5 && (
                <path d="M 12 5 L 22 7 L 12 9 Z" fill="#e74c3c" />
              )}
            </g>
          )}

          {type === "tesla" && (
            <g>
              {/* Prongs */}
              <path
                d="M 0 -10 L 20 -14 L 14 -4 Z"
                fill="#747d8c"
                transform={`translate(${-recoilAmount}, 0)`}
              />
              <path
                d="M 0 10 L 20 14 L 14 4 Z"
                fill="#747d8c"
                transform={`translate(${-recoilAmount}, 0)`}
              />
              {isFiring && (
                <path
                  d="M 15 -10 Q 30 0 15 10"
                  fill="none"
                  stroke="#70a1ff"
                  strokeWidth="3"
                  filter="url(#glow-blue)"
                />
              )}
              {/* Glowing Core */}
              <circle cx="0" cy="0" r="12" fill="#2f3542" />
              <circle
                cx="0"
                cy="0"
                r="8"
                fill="url(#plasmaGrad)"
                filter="url(#glow-blue)"
              />
            </g>
          )}
        </g>
      </g>
    );
  };

  const renderBullet = (bullet: Bullet) => {
    const { x, y, type, targetLastX, targetLastY } = bullet;
    const angle =
      Math.atan2(targetLastY - y, targetLastX - x) * (180 / Math.PI);

    return (
      <g transform={`translate(${x}, ${y}) rotate(${angle})`}>
        {type === "gatling" && (
          <rect
            x="-6"
            y="-1"
            width="12"
            height="2"
            fill="#f1c40f"
            filter="url(#glow-yellow)"
          />
        )}
        {type === "goo" && (
          <circle
            cx="0"
            cy="0"
            r="6"
            fill="#2ed573"
            filter="url(#glow-green)"
            opacity="0.9"
          />
        )}
        {type === "missile" && (
          <g filter="url(#drop-shadow)">
            <rect x="-8" y="-3" width="16" height="6" fill="#ecf0f1" rx="2" />
            <path d="M 6 -3 L 12 0 L 6 3 Z" fill="#e74c3c" />
            <polygon points="-8,-3 -12,-6 -10,0 -12,6 -8,3" fill="#7f8c8d" />
            {/* Engine Trail */}
            <circle
              cx="-14"
              cy="0"
              r="4"
              fill="#e67e22"
              filter="url(#glow-yellow)"
            />
          </g>
        )}
        {type === "tesla" && (
          <ellipse
            cx="0"
            cy="0"
            rx="8"
            ry="3"
            fill="#70a1ff"
            filter="url(#glow-blue)"
          />
        )}
      </g>
    );
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&family=Plus+Jakarta+Sans:wght@400;600;800&display=swap');
        body { background-color: #1e272e; margin: 0; padding: 0; font-family: 'Plus Jakarta Sans', sans-serif; overflow-x: hidden; }
        * { box-sizing: border-box; }
        .h-orbitron { font-family: 'Orbitron', sans-serif; }

        /* --- Responsive Menu Styles --- */
        .menu-container {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          height: 100vh; /* Force exact screen height */
          padding: 2vh 4vw;
          max-width: 1000px;
          margin: 0 auto;
          text-align: center;
          overflow: hidden; /* Prevent scrolling */
        }
        .menu-title {
          font-size: clamp(2.2rem, 8vw, 4rem);
          color: #00d2d3;
          margin: 0 0 1vh 0;
          text-shadow: 0 0 20px rgba(0, 210, 211, 0.4);
          line-height: 1.1;
        }
        .menu-subtitle {
          color: #808e9b;
          margin-bottom: clamp(16px, 4vh, 60px);
          font-size: clamp(0.9rem, 3vw, 1.2rem);
        }
        .menu-grid {
          display: grid;
          width: 100%;
          gap: clamp(8px, 2vh, 24px);
          /* 3 columns on mobile to ensure all 12 fit without scrolling */
          grid-template-columns: repeat(3, 1fr); 
        }
        @media (min-width: 600px) {
          .menu-grid { grid-template-columns: repeat(4, 1fr); }
        }
        .zone-btn {
          padding: clamp(12px, 3vh, 30px) 4px;
          font-size: clamp(0.8rem, 2.5vw, 1.2rem);
          font-weight: 800;
          background-color: #2d3436;
          color: #00d2d3;
          border: 2px solid #00d2d3;
          border-radius: clamp(8px, 2vw, 12px);
          cursor: pointer;
          transition: all 0.15s ease;
          box-shadow: 0 clamp(4px, 1vh, 6px) 0 #0abde3, 0 8px 15px rgba(0,0,0,0.4);
          font-family: inherit;
          text-transform: uppercase;
        }
        /* Mobile Touch / Click down state */
        .zone-btn:active {
          transform: translateY(clamp(4px, 1vh, 6px)) !important;
          box-shadow: 0 0px 0 #0abde3, 0 4px 8px rgba(0,0,0,0.4) !important;
        }
        /* Desktop Hover state */
        @media (hover: hover) {
          .zone-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 clamp(6px, 1.5vh, 8px) 0 #0abde3, 0 12px 20px rgba(0,0,0,0.5);
          }
        }
      `}</style>

      {appView === "menu" ? (
        <div className="menu-container">
          <h1 className="h-orbitron menu-title">SOFTY DEFENDERS</h1>
          <p className="menu-subtitle">Select a tactical insertion zone.</p>
          <div className="menu-grid">
            {LEVELS.map((_, i) => (
              <button key={i} className="zone-btn" onClick={() => startGame(i)}>
                Zone {i + 1}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div
          style={{
            width: "100vw",
            height: "100vh",
            display: "flex",
            flexDirection: "column",
            padding: "12px",
            maxWidth: "1200px",
            margin: "0 auto",
          }}
        >
          <div style={{ display: "flex", gap: "16px", marginBottom: "12px" }}>
            <div
              style={{
                display: "flex",
                flex: 1,
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor: "#2d3436",
                padding: "12px 20px",
                borderRadius: "12px",
                color: "#fff",
                fontWeight: "800",
                boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "24px" }}
              >
                <div
                  className="h-orbitron"
                  style={{ color: "#00d2d3", fontSize: "1.4rem" }}
                >
                  ZONE {activeLevelId + 1}
                </div>
                {/* --- SVG Heart Icon --- */}
                <div
                  style={{ display: "flex", gap: "8px", alignItems: "center" }}
                >
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="#ff4757"
                  >
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                  <span style={{ color: "#ff4757", fontSize: "1.2rem" }}>
                    {stateRef.current.baseHp}
                  </span>
                </div>

                {/* --- SVG Coin/Money Icon --- */}
                <div
                  style={{ display: "flex", gap: "8px", alignItems: "center" }}
                >
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="#f1c40f"
                  >
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h-1c-.55 0-1-.45-1-1v-3c0-.55.45-1 1-1h3v-1H9V7h2V5h2v2h1c.55 0 1 .45 1 1v3c0 .55-.45 1-1 1h-3v1h3c.55 0 1 .45 1 1v3z" />
                  </svg>
                  <span style={{ color: "#f1c40f", fontSize: "1.2rem" }}>
                    {stateRef.current.money}
                  </span>
                </div>
              </div>
              <div
                style={{ display: "flex", alignItems: "center", gap: "24px" }}
              >
                <div className="h-orbitron" style={{ color: "#b2bec3" }}>
                  WAVE {stateRef.current.wave}/10
                </div>
                <button
                  onClick={startNextWave}
                  disabled={
                    stateRef.current.creeps.length > 0 ||
                    stateRef.current.gameOver ||
                    stateRef.current.gameWon
                  }
                  style={{
                    padding: "10px 24px",
                    backgroundColor:
                      stateRef.current.creeps.length > 0 ||
                      stateRef.current.gameOver ||
                      stateRef.current.gameWon
                        ? "#636e72"
                        : "#00b894",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor:
                      stateRef.current.creeps.length > 0 ||
                      stateRef.current.gameOver ||
                      stateRef.current.gameWon
                        ? "not-allowed"
                        : "pointer",
                    fontWeight: "bold",
                    fontFamily: "inherit",
                    textTransform: "uppercase",
                    transition: "all 0.1s",
                  }}
                >
                  {stateRef.current.wave === 0 ? "INITIATE" : "NEXT WAVE"}
                </button>
              </div>
            </div>
            <button
              onClick={handleRetreat}
              style={{
                padding: "12px 20px",
                backgroundColor: "#d63031",
                color: "#fff",
                border: "none",
                borderRadius: "12px",
                cursor: "pointer",
                fontWeight: "bold",
                fontFamily: "inherit",
                textTransform: "uppercase",
                boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
              }}
            >
              RETREAT
            </button>
          </div>

          <div
            style={{
              position: "relative",
              flex: 1,
              borderRadius: "16px",
              backgroundColor: "#2d3436",
              overflow: "hidden",
              display: "flex",
              boxShadow:
                "inset 0 4px 30px rgba(0,0,0,0.5), 0 10px 30px rgba(0,0,0,0.5)",
            }}
          >
            {stateRef.current.gameOver && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundColor: "rgba(0,0,0, 0.85)",
                  color: "#ff4757",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 10,
                }}
              >
                <h1
                  className="h-orbitron"
                  style={{
                    margin: "0 0 10px 0",
                    fontSize: "5rem",
                    textShadow: "0 0 30px rgba(255, 71, 87, 0.6)",
                  }}
                >
                  CRITICAL FAILURE
                </h1>
                <p style={{ color: "#fff", fontSize: "1.5rem" }}>
                  Base structure compromised.
                </p>
              </div>
            )}
            {stateRef.current.gameWon && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundColor: "rgba(0,0,0, 0.85)",
                  color: "#00b894",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 10,
                }}
              >
                <h1
                  className="h-orbitron"
                  style={{
                    margin: "0 0 10px 0",
                    fontSize: "5rem",
                    textShadow: "0 0 30px rgba(0, 184, 148, 0.6)",
                  }}
                >
                  SECTOR SECURED
                </h1>
                <p style={{ color: "#fff", fontSize: "1.5rem" }}>
                  Hostiles eliminated.
                </p>
              </div>
            )}

            <svg
              viewBox={`0 0 ${GAME_WIDTH} ${GAME_HEIGHT}`}
              width="100%"
              height="100%"
              preserveAspectRatio="xMidYMid meet"
              style={{ display: "block" }}
            >
              <defs>
                <filter
                  id="drop-shadow"
                  x="-30%"
                  y="-30%"
                  width="160%"
                  height="160%"
                >
                  <feDropShadow
                    dx="0"
                    dy="6"
                    stdDeviation="4"
                    floodColor="#000"
                    floodOpacity="0.4"
                  />
                </filter>
                <filter id="blur">
                  <feGaussianBlur stdDeviation="3" />
                </filter>
                <filter
                  id="glow-yellow"
                  x="-50%"
                  y="-50%"
                  width="200%"
                  height="200%"
                >
                  <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter
                  id="glow-green"
                  x="-50%"
                  y="-50%"
                  width="200%"
                  height="200%"
                >
                  <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter
                  id="glow-blue"
                  x="-50%"
                  y="-50%"
                  width="200%"
                  height="200%"
                >
                  <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Gradients */}
                <linearGradient id="metalBase" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#7f8c8d" />
                  <stop offset="100%" stopColor="#2c3e50" />
                </linearGradient>
                <linearGradient id="metalBody" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#95a5a6" />
                  <stop offset="100%" stopColor="#34495e" />
                </linearGradient>
                <linearGradient id="gunmetal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#576574" />
                  <stop offset="100%" stopColor="#222f3e" />
                </linearGradient>
                <radialGradient id="gooGrad" cx="30%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#55efc4" />
                  <stop offset="80%" stopColor="#00b894" />
                  <stop offset="100%" stopColor="#019074" />
                </radialGradient>
                <radialGradient id="glassFlare" cx="30%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.8)" />
                  <stop offset="40%" stopColor="rgba(255,255,255,0.1)" />
                  <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                </radialGradient>
                <linearGradient id="militaryGreen" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#4A6040" />
                  <stop offset="100%" stopColor="#2D3A27" />
                </linearGradient>
                <radialGradient id="plasmaGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#fff" />
                  <stop offset="50%" stopColor="#00d2d3" />
                  <stop offset="100%" stopColor="#0984e3" />
                </radialGradient>
                <radialGradient id="goldGrad" cx="30%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#ffeaa7" />
                  <stop offset="100%" stopColor="#fdcb6e" />
                </radialGradient>

                <pattern
                  id="realisticGrass"
                  width="80"
                  height="80"
                  patternUnits="userSpaceOnUse"
                >
                  <rect width="80" height="80" fill="#203a27" />
                  <path
                    d="M 10 70 Q 20 40 30 70 M 50 20 Q 60 -10 70 20 M 60 60 Q 70 40 80 60"
                    fill="none"
                    stroke="#2c5137"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <circle cx="20" cy="20" r="1.5" fill="#182e1e" />
                  <circle cx="60" cy="70" r="1.5" fill="#182e1e" />
                  <circle cx="40" cy="40" r="2" fill="#182e1e" opacity="0.5" />
                </pattern>

                <pattern
                  id="dirtPath"
                  width="40"
                  height="40"
                  patternUnits="userSpaceOnUse"
                >
                  <rect width="40" height="40" fill="#4b3e31" />
                  <circle cx="10" cy="10" r="1" fill="#2d241c" opacity="0.6" />
                  <circle
                    cx="30"
                    cy="25"
                    r="1.5"
                    fill="#2d241c"
                    opacity="0.4"
                  />
                  <circle cx="15" cy="35" r="2" fill="#2d241c" opacity="0.5" />
                </pattern>
              </defs>

              <rect width="100%" height="100%" fill="url(#realisticGrass)" />

              {/* Realistic Path Rendering */}
              {/* Shadow Base */}
              <path
                d={activePath
                  .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
                  .join(" ")}
                fill="none"
                stroke="rgba(0,0,0,0.4)"
                strokeWidth="64"
                strokeLinecap="square"
                strokeLinejoin="miter"
                filter="url(#blur)"
                transform="translate(0, 4)"
              />
              {/* Outer Border */}
              <path
                d={activePath
                  .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
                  .join(" ")}
                fill="none"
                stroke="#2d241c"
                strokeWidth="60"
                strokeLinecap="square"
                strokeLinejoin="miter"
              />
              {/* Inner Dirt Texture */}
              <path
                d={activePath
                  .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
                  .join(" ")}
                fill="none"
                stroke="url(#dirtPath)"
                strokeWidth="54"
                strokeLinecap="square"
                strokeLinejoin="miter"
              />
              {/* Center Line Guides */}
              <path
                d={activePath
                  .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
                  .join(" ")}
                fill="none"
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="2"
                strokeLinecap="square"
                strokeLinejoin="miter"
                strokeDasharray="12, 12"
              />

              {/* Directional Arrows placed midway on each path segment */}
              {activePath.slice(0, -1).map((p1, i) => {
                const p2 = activePath[i + 1];
                const cx = (p1.x + p2.x) / 2;
                const cy = (p1.y + p2.y) / 2;
                const angle =
                  Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI);
                return (
                  <g
                    key={`arrow-${i}`}
                    transform={`translate(${cx}, ${cy}) rotate(${angle})`}
                  >
                    <path
                      d="M -12 -10 L 8 0 L -12 10 Z"
                      fill="#fff"
                      opacity="0.1"
                    />
                  </g>
                );
              })}

              {activeSelectedTower && (
                <circle
                  cx={activeSelectedTower.x}
                  cy={activeSelectedTower.y}
                  r={activeSelectedTower.range}
                  fill="rgba(0, 210, 211, 0.05)"
                  stroke="#00d2d3"
                  strokeWidth="2"
                  strokeDasharray="6,6"
                />
              )}

              {/* Build Slots Visuals */}
              {activeSlots.map((slot) => {
                const hasTower = stateRef.current.towers.some(
                  (t) =>
                    Math.abs(t.x - slot.x) < 5 && Math.abs(t.y - slot.y) < 5,
                );
                if (hasTower) return null;
                return (
                  <g key={`slot-${slot.x}-${slot.y}`}>
                    <rect
                      x={slot.x - SLOT_SIZE / 2}
                      y={slot.y - SLOT_SIZE / 2}
                      width={SLOT_SIZE}
                      height={SLOT_SIZE}
                      fill="rgba(0,0,0,0.3)"
                      rx="6"
                    />
                    <rect
                      x={slot.x - SLOT_SIZE / 2}
                      y={slot.y - SLOT_SIZE / 2}
                      width={SLOT_SIZE}
                      height={SLOT_SIZE}
                      fill="none"
                      stroke="#576574"
                      strokeWidth="2"
                      strokeDasharray="4, 4"
                      rx="6"
                    />
                    <path
                      d={`M ${slot.x - 8} ${slot.y} L ${slot.x + 8} ${slot.y} M ${slot.x} ${slot.y - 8} L ${slot.x} ${slot.y + 8}`}
                      stroke="#576574"
                      strokeWidth="2"
                      opacity="0.5"
                    />
                  </g>
                );
              })}

              {stateRef.current.towers.map((tower) => (
                <g key={tower.id} filter="url(#drop-shadow)">
                  {renderTowerShape(tower)}
                </g>
              ))}

              {stateRef.current.bullets.map((bullet) => (
                <g key={bullet.id}>{renderBullet(bullet)}</g>
              ))}

              {/* Creeps (Redesigned as mechs) */}
              {stateRef.current.creeps.map((creep) => {
                const hpPercentage = Math.max(0, creep.hp / creep.maxHp);
                const isSlowed = Date.now() < creep.slowUntil;
                const size = creep.isBoss ? 1.5 : 1;

                return (
                  <g
                    key={creep.id}
                    transform={`translate(${creep.x}, ${creep.y}) scale(${size})`}
                    filter="url(#drop-shadow)"
                  >
                    {/* Shadow underneath rotation */}
                    <ellipse
                      cx="-2"
                      cy="4"
                      rx="14"
                      ry="10"
                      fill="rgba(0,0,0,0.4)"
                      filter="url(#blur)"
                    />

                    <g transform={`rotate(${creep.angle})`}>
                      {/* Treads */}
                      <rect
                        x="-12"
                        y="-12"
                        width="24"
                        height="6"
                        fill="#2d3436"
                        rx="2"
                      />
                      <rect
                        x="-12"
                        y="6"
                        width="24"
                        height="6"
                        fill="#2d3436"
                        rx="2"
                      />

                      {/* Body */}
                      <path
                        d="M -10 -8 L 8 -8 L 14 0 L 8 8 L -10 8 Z"
                        fill={creep.isBoss ? "#6c5ce7" : "#d63031"}
                        stroke="#2d3436"
                        strokeWidth="1.5"
                      />

                      {/* Viewport / Eye */}
                      <polygon
                        points="4,-4 10,0 4,4"
                        fill={isSlowed ? "#00d2d3" : "#f1c40f"}
                        filter={
                          isSlowed ? "url(#glow-blue)" : "url(#glow-yellow)"
                        }
                      />

                      {/* Detail lines */}
                      <line
                        x1="-4"
                        y1="-8"
                        x2="-4"
                        y2="8"
                        stroke="#2d3436"
                        strokeWidth="1.5"
                      />
                    </g>

                    {/* Health Bar (Does not rotate with the mech) */}
                    <g transform={`translate(0, ${creep.isBoss ? -22 : -18})`}>
                      <rect
                        x="-14"
                        y="0"
                        width="28"
                        height="4"
                        fill="#2d3436"
                        rx="2"
                      />
                      <rect
                        x="-14"
                        y="0"
                        width={28 * hpPercentage}
                        height="4"
                        fill={creep.isBoss ? "#a29bfe" : "#ff7675"}
                        rx="2"
                      />
                    </g>
                  </g>
                );
              })}

              {activeSlots.map((slot) => {
                const isSelected =
                  selectedSlot?.x === slot.x && selectedSlot?.y === slot.y;
                return (
                  <rect
                    key={`overlay-${slot.x}-${slot.y}`}
                    x={slot.x - SLOT_SIZE / 2}
                    y={slot.y - SLOT_SIZE / 2}
                    width={SLOT_SIZE}
                    height={SLOT_SIZE}
                    fill={isSelected ? "rgba(0, 210, 211, 0.2)" : "transparent"}
                    stroke={isSelected ? "#00d2d3" : "transparent"}
                    strokeWidth="3"
                    rx="6"
                    onClick={() => handleSlotClick(slot)}
                    style={{ cursor: "pointer" }}
                  />
                );
              })}

              {selectedSlot && (
                <foreignObject
                  x={Math.max(
                    10,
                    Math.min(selectedSlot.x - 130, GAME_WIDTH - 270),
                  )}
                  y={Math.max(
                    10,
                    Math.min(selectedSlot.y - 150, GAME_HEIGHT - 310),
                  )}
                  width="260"
                  height="300"
                  style={{ zIndex: 30, overflow: "visible" }}
                >
                  {activeSelectedTower ? (
                    <div
                      style={{
                        backgroundColor: "#2d3436",
                        padding: "16px",
                        borderRadius: "12px",
                        boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
                        border: `2px solid ${activeSelectedTower.color}`,
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                        height: "100%",
                        color: "#fff",
                      }}
                    >
                      <div
                        className="h-orbitron"
                        style={{
                          textAlign: "center",
                          fontWeight: "800",
                          color: activeSelectedTower.color,
                          fontSize: "1.2rem",
                          letterSpacing: "1px",
                        }}
                      >
                        {activeSelectedTower.label.toUpperCase()}
                      </div>
                      {activeSelectedTower.level < 3 ? (
                        <button
                          onClick={upgradeTower}
                          disabled={stateRef.current.money < currentUpgradeCost}
                          style={{
                            padding: "12px",
                            borderRadius: "6px",
                            border: "none",
                            backgroundColor:
                              stateRef.current.money >= currentUpgradeCost
                                ? "#0984e3"
                                : "#636e72",
                            color:
                              stateRef.current.money >= currentUpgradeCost
                                ? "#fff"
                                : "#b2bec3",
                            fontWeight: "bold",
                            cursor:
                              stateRef.current.money >= currentUpgradeCost
                                ? "pointer"
                                : "not-allowed",
                            fontFamily: "inherit",
                          }}
                        >
                          Upgrade Lvl {activeSelectedTower.level + 1} ($
                          {currentUpgradeCost})
                        </button>
                      ) : (
                        <div
                          style={{
                            textAlign: "center",
                            padding: "12px",
                            color: "#fdcb6e",
                            fontWeight: "bold",
                            backgroundColor: "#353b48",
                            borderRadius: "6px",
                            border: "1px solid #fdcb6e",
                          }}
                        >
                          MAX LEVEL ACHIEVED
                        </div>
                      )}
                      <button
                        onClick={sellTower}
                        style={{
                          padding: "12px",
                          borderRadius: "6px",
                          border: "none",
                          backgroundColor: "#d63031",
                          color: "#fff",
                          fontWeight: "bold",
                          cursor: "pointer",
                          fontFamily: "inherit",
                        }}
                      >
                        Scrap Tower (${currentSellValue})
                      </button>
                      <button
                        style={{
                          padding: "8px",
                          marginTop: "auto",
                          backgroundColor: "transparent",
                          border: "none",
                          cursor: "pointer",
                          fontWeight: "bold",
                          color: "#b2bec3",
                          fontFamily: "inherit",
                        }}
                        onClick={() => setSelectedSlot(null)}
                      >
                        CLOSE
                      </button>
                    </div>
                  ) : (
                    <div
                      style={{
                        backgroundColor: "#2d3436",
                        padding: "16px",
                        borderRadius: "12px",
                        boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "10px",
                        border: "2px solid #00d2d3",
                        height: "100%",
                        color: "#fff",
                      }}
                    >
                      <div
                        className="h-orbitron"
                        style={{
                          gridColumn: "1 / -1",
                          textAlign: "center",
                          fontSize: "1.1rem",
                          fontWeight: "800",
                          color: "#00d2d3",
                          marginBottom: "4px",
                        }}
                      >
                        CONSTRUCT
                      </div>
                      {(
                        Object.entries(TOWER_DICTIONARY) as [
                          TowerType,
                          TowerConfig,
                        ][]
                      ).map(([type, config]) => {
                        const canAfford = stateRef.current.money >= config.cost;
                        return (
                          <button
                            key={type}
                            onClick={() => buildTower(type)}
                            disabled={!canAfford}
                            style={{
                              padding: "10px 6px",
                              backgroundColor: canAfford
                                ? "#353b48"
                                : "#2d3436",
                              border: `1px solid ${canAfford ? config.color : "#636e72"}`,
                              borderRadius: "8px",
                              cursor: canAfford ? "pointer" : "not-allowed",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              opacity: canAfford ? 1 : 0.4,
                              fontFamily: "inherit",
                              transition: "transform 0.1s",
                            }}
                            onMouseDown={(e) =>
                              canAfford &&
                              (e.currentTarget.style.transform = "scale(0.95)")
                            }
                            onMouseUp={(e) =>
                              canAfford &&
                              (e.currentTarget.style.transform = "scale(1)")
                            }
                            onMouseLeave={(e) =>
                              canAfford &&
                              (e.currentTarget.style.transform = "scale(1)")
                            }
                          >
                            <div
                              style={{
                                width: "20px",
                                height: "20px",
                                backgroundColor: config.color,
                                borderRadius: type === "goo" ? "50%" : "4px",
                                marginBottom: "8px",
                                boxShadow: `0 0 8px ${config.color}`,
                              }}
                            />
                            <span
                              style={{
                                fontSize: "0.8rem",
                                fontWeight: "800",
                                color: "#dfe6e9",
                                textTransform: "uppercase",
                              }}
                            >
                              {config.label}
                            </span>
                            <span
                              style={{
                                fontSize: "0.8rem",
                                fontWeight: "600",
                                color: canAfford ? "#fdcb6e" : "#ff7675",
                              }}
                            >
                              ${config.cost}
                            </span>
                          </button>
                        );
                      })}
                      <button
                        style={{
                          gridColumn: "1 / -1",
                          padding: "10px",
                          marginTop: "auto",
                          backgroundColor: "transparent",
                          border: "1px solid #d63031",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontWeight: "bold",
                          color: "#ff7675",
                          fontFamily: "inherit",
                          transition: "all 0.2s",
                        }}
                        onClick={() => setSelectedSlot(null)}
                      >
                        CANCEL
                      </button>
                    </div>
                  )}
                </foreignObject>
              )}
            </svg>
          </div>
        </div>
      )}
    </>
  );
}
