import { Container, Graphics, Text } from 'pixi.js';
import type { GameInstance } from './index';

const GRAVITY = 1800;
const JUMP_VY = 680;
const DINO_W = 36;
const DINO_H = 50;
const INITIAL_SPEED = 280;

function hex(s: string): number {
  return parseInt(s.replace('#', ''), 16);
}

interface Obstacle { gfx: Graphics; w: number; h: number; }

interface State {
  yOffset: number; vy: number; onGround: boolean;
  timePlayed: number; score: number; groundOffset: number;
  nextObstacleIn: number; dead: boolean; deathFlash: number;
}

export function createDinoGame(
  controlKey: string,
  baseColor: string,
  onGameOver: (score: number) => void,
): GameInstance {
  const colorNum = hex(baseColor);
  const container = new Container();

  const bg = new Graphics();
  const groundGfx = new Graphics();
  const obstaclesContainer = new Container();
  const dinoGfx = new Graphics();
  const eyeGfx = new Graphics();

  const scoreText = new Text({
    text: '00000',
    style: { fontFamily: 'monospace', fontSize: 22, fill: colorNum, fontWeight: 'bold' },
  });
  scoreText.anchor.set(1, 0);

  const hintText = new Text({
    text: `press [${controlKey}] jump`,
    style: { fontFamily: 'monospace', fontSize: 13, fill: colorNum },
  });
  hintText.alpha = 0.27;

  const gameOverBg = new Graphics();
  const gameOverTitle = new Text({
    text: 'GAME OVER',
    style: { fontFamily: 'monospace', fontSize: 40, fill: colorNum, fontWeight: 'bold' },
  });
  gameOverTitle.anchor.set(0.5);
  const gameOverScore = new Text({
    text: '',
    style: { fontFamily: 'monospace', fontSize: 22, fill: 0xe0e0e0 },
  });
  gameOverScore.anchor.set(0.5);
  gameOverBg.visible = gameOverTitle.visible = gameOverScore.visible = false;

  container.addChild(bg, groundGfx, obstaclesContainer, dinoGfx, eyeGfx,
    scoreText, hintText, gameOverBg, gameOverTitle, gameOverScore);

  const s: State = {
    yOffset: 0, vy: 0, onGround: true,
    timePlayed: 0, score: 0, groundOffset: 0,
    nextObstacleIn: 1.8, dead: false, deathFlash: 0,
  };
  const obstacles: Obstacle[] = [];
  let gameOverFired = false;
  let lastW = 0, lastH = 0;

  function drawDino(W: number, H: number, color: number) {
    const GY = H * 0.74, DX = W * 0.12;
    const topY = GY - s.yOffset - DINO_H;
    dinoGfx.clear().roundRect(DX - DINO_W / 2, topY, DINO_W, DINO_H, 6).fill(color);
    if (!s.dead) {
      eyeGfx.clear()
        .circle(DX + 8, topY + 12, 4).fill(0x08080f)
        .circle(DX + 9, topY + 11, 1.5).fill(0xffffff);
    } else {
      eyeGfx.clear();
    }
  }

  function onResize(W: number, H: number) {
    lastW = W; lastH = H;
    bg.clear().rect(0, 0, W, H).fill(0x08080f);
    scoreText.position.set(W - 20, 16);
    hintText.position.set(16, H - 30);
    const GY = H * 0.74;
    for (const obs of obstacles) obs.gfx.y = GY - obs.h;
    if (gameOverTitle.visible) {
      gameOverBg.clear().rect(0, 0, W, H).fill({ color: 0x000000, alpha: 0.6 });
      gameOverTitle.position.set(W / 2, H / 2 - 20);
      gameOverScore.position.set(W / 2, H / 2 + 26);
    }
  }

  return {
    container,
    get score() { return s.score; },
    get dead() { return s.dead; },

    onContextEnter() {
      if (s.onGround && !s.dead) { s.vy = JUMP_VY; s.onGround = false; }
    },

    onKey(key: string) {
      if (key === controlKey && s.onGround && !s.dead) { s.vy = JUMP_VY; s.onGround = false; }
    },

    update(dt, W, H) {
      if (W !== lastW || H !== lastH) onResize(W, H);

      const GY = H * 0.74, DX = W * 0.12;
      const speed = INITIAL_SPEED + Math.floor(s.timePlayed / 5) * 25;

      if (s.dead) {
        if (s.deathFlash > 0) {
          s.deathFlash--;
          drawDino(W, H, s.deathFlash % 4 < 2 ? 0xff0000 : colorNum);
        }
        return;
      }

      if (!s.onGround) {
        s.vy -= GRAVITY * dt;
        s.yOffset += s.vy * dt;
        if (s.yOffset <= 0) { s.yOffset = 0; s.vy = 0; s.onGround = true; }
      }

      s.timePlayed += dt;
      s.score = Math.floor(s.timePlayed * 10);
      s.groundOffset = (s.groundOffset + speed * dt) % 40;

      for (const obs of obstacles) obs.gfx.x -= speed * dt;
      for (let i = obstacles.length - 1; i >= 0; i--) {
        if (obstacles[i].gfx.x + obstacles[i].w < -20) {
          obstacles[i].gfx.destroy();
          obstacles.splice(i, 1);
        }
      }

      s.nextObstacleIn -= dt;
      if (s.nextObstacleIn <= 0) {
        const h = 28 + Math.random() * 44;
        const w = 18 + Math.random() * 22;
        const gfx = new Graphics()
          .rect(0, 0, w, h).fill({ color: colorNum, alpha: 0.6 })
          .rect(0, 0, w, 3).fill(colorNum);
        gfx.position.set(W + 20, GY - h);
        obstaclesContainer.addChild(gfx);
        obstacles.push({ gfx, w, h });
        s.nextObstacleIn = Math.max(0.5, 1.5 - s.timePlayed / 60) + Math.random() * 0.8;
      }

      // Ground line + scrolling dashes as one batch
      groundGfx.clear()
        .moveTo(0, GY).lineTo(W, GY).stroke({ color: colorNum, width: 2 });
      for (let x = -(s.groundOffset % 40); x < W; x += 40) {
        groundGfx.moveTo(x, GY + 6).lineTo(x + 20, GY + 6);
      }
      groundGfx.stroke({ color: colorNum, width: 1, alpha: 0.13 });

      drawDino(W, H, colorNum);
      scoreText.text = String(s.score).padStart(5, '0');

      // Collision
      const dL = DX - DINO_W / 2 + 5, dR = DX + DINO_W / 2 - 5;
      const dB = GY - s.yOffset - 3;
      for (const obs of obstacles) {
        if (dR > obs.gfx.x + 3 && dL < obs.gfx.x + obs.w - 3 && dB > GY - obs.h + 2) {
          s.dead = true;
          s.deathFlash = 18;
          if (!gameOverFired) { gameOverFired = true; onGameOver(s.score); }
          gameOverBg.clear().rect(0, 0, W, H).fill({ color: 0x000000, alpha: 0.6 });
          gameOverBg.visible = true;
          gameOverTitle.position.set(W / 2, H / 2 - 20);
          gameOverTitle.visible = true;
          gameOverScore.text = `SCORE  ${s.score}`;
          gameOverScore.position.set(W / 2, H / 2 + 26);
          gameOverScore.visible = true;
          break;
        }
      }
    },
  };
}
