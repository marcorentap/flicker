import { Container, Graphics, Text } from "pixi.js";
import allWords from "an-array-of-english-words";
import type { GameInstance } from "./index";

const FONT_SIZE = 18;
const CHAR_W = FONT_SIZE * 0.601;

function hex(s: string): number {
  return parseInt(s.replace("#", ""), 16);
}

// Filter to plain lowercase words, split into tiers by length for difficulty ramp
const _all: string[] = (allWords as string[]).filter((w: string) =>
  /^[a-z]+$/.test(w),
);
const WORDS_SHORT = _all.filter((w) => w.length >= 4 && w.length <= 5);
const WORDS_MEDIUM = _all.filter((w) => w.length >= 4 && w.length <= 7);
const WORDS_LONG = _all.filter((w) => w.length >= 4 && w.length <= 10);

interface Word {
  id: number;
  word: string;
  x: number;
  y: number;
  speed: number;
  typedIdx: number;
  locked: boolean;
  typedText: Text;
  remainText: Text;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

// A shot beam: a brief bright line from bottom-center to the typed character
interface Beam {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  life: number;
}

export function createTypingGame(
  _controlKey: string,
  baseColor: string,
  onGameOver: (score: number) => void,
): GameInstance {
  const colorNum = hex(baseColor);
  const container = new Container();

  const bg = new Graphics();
  const beamGfx = new Graphics();
  const fxGfx = new Graphics();
  const wordsContainer = new Container();

  const scoreText = new Text({
    text: "0",
    style: {
      fontFamily: "monospace",
      fontSize: 22,
      fill: colorNum,
      fontWeight: "bold",
    },
  });
  scoreText.anchor.set(1, 0);

  const gameOverBg = new Graphics();
  const gameOverTitle = new Text({
    text: "GAME OVER",
    style: {
      fontFamily: "monospace",
      fontSize: 40,
      fill: colorNum,
      fontWeight: "bold",
    },
  });
  gameOverTitle.anchor.set(0.5);
  const gameOverScore = new Text({
    text: "",
    style: { fontFamily: "monospace", fontSize: 22, fill: 0xe0e0e0 },
  });
  gameOverScore.anchor.set(0.5);
  gameOverBg.visible = gameOverTitle.visible = gameOverScore.visible = false;

  // beamGfx below words, fxGfx above words
  container.addChild(
    bg,
    beamGfx,
    wordsContainer,
    fxGfx,
    scoreText,
    gameOverBg,
    gameOverTitle,
    gameOverScore,
  );

  let dead = false;
  let score = 0;
  let timePlayed = 0;
  let spawnTimer = 0;
  let nextId = 0;
  let gameOverFired = false;
  let lastW = 800,
    lastH = 600;

  const words: Word[] = [];
  const particles: Particle[] = [];
  const beams: Beam[] = [];
  let lockedWord: Word | null = null;

  function onResize(W: number, H: number) {
    lastW = W;
    lastH = H;
    bg.clear().rect(0, 0, W, H).fill(0x08080f);
    scoreText.position.set(W - 16, 12);
    if (gameOverTitle.visible) {
      gameOverBg.clear().rect(0, 0, W, H).fill({ color: 0x000000, alpha: 0.7 });
      gameOverTitle.position.set(W / 2, H / 2 - 24);
      gameOverScore.position.set(W / 2, H / 2 + 24);
    }
  }

  function spawnWord(W: number) {
    const difficulty = Math.min(timePlayed / 90, 1);
    const pool =
      difficulty < 0.3
        ? WORDS_SHORT
        : difficulty < 0.6
          ? WORDS_MEDIUM
          : WORDS_LONG;
    const word = pool[Math.floor(Math.random() * pool.length)];
    const speed = 18 + difficulty * 34 + Math.random() * 8;
    const wordPxW = word.length * CHAR_W;
    const x = 16 + Math.random() * Math.max(0, W - wordPxW - 32);

    // Two text objects: typed prefix (dim) and remaining suffix (colored)
    const typedText = new Text({
      text: "",
      style: {
        fontFamily: "monospace",
        fontSize: FONT_SIZE,
        fill: colorNum,
        fontWeight: "bold",
      },
    });
    const remainText = new Text({
      text: word,
      style: {
        fontFamily: "monospace",
        fontSize: FONT_SIZE,
        fill: colorNum,
        fontWeight: "bold",
      },
    });
    typedText.alpha = 0;
    remainText.alpha = 0.45;
    typedText.x = x;
    typedText.y = -(FONT_SIZE + 4);
    remainText.x = x;
    remainText.y = -(FONT_SIZE + 4);
    wordsContainer.addChild(typedText, remainText);

    words.push({
      id: nextId++,
      word,
      x,
      y: -(FONT_SIZE + 4),
      speed,
      typedIdx: 0,
      locked: false,
      typedText,
      remainText,
    });
  }

  function removeWord(w: Word) {
    wordsContainer.removeChild(w.typedText);
    wordsContainer.removeChild(w.remainText);
    w.typedText.destroy();
    w.remainText.destroy();
    const idx = words.indexOf(w);
    if (idx >= 0) words.splice(idx, 1);
    if (lockedWord === w) lockedWord = null;
  }

  function emitParticles(x: number, y: number, count: number) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const spd = 60 + Math.random() * 100;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        life: 0.3 + Math.random() * 0.2,
        maxLife: 0.5,
      });
    }
  }

  function fireBeam(W: number, H: number, charX: number, charY: number) {
    beams.push({ x1: W / 2, y1: H, x2: charX, y2: charY, life: 0.12 });
  }

  function syncWordTexts(w: Word) {
    const typed = w.word.slice(0, w.typedIdx);
    const remain = w.word.slice(w.typedIdx);
    if (w.typedText.text !== typed) w.typedText.text = typed;
    if (w.remainText.text !== remain) w.remainText.text = remain;
    w.typedText.x = w.x;
    w.remainText.x = w.x + (typed.length > 0 ? w.typedText.width : 0);
  }

  return {
    container,
    get score() {
      return score;
    },
    get dead() {
      return dead;
    },

    onKey(key: string) {
      if (dead || !/^[a-zA-Z]$/.test(key)) return;
      const k = key.toLowerCase();

      if (lockedWord) {
        const expected = lockedWord.word[lockedWord.typedIdx];
        if (k === expected) {
          // Shoot this character
          const charX =
            lockedWord.x + lockedWord.typedIdx * CHAR_W + CHAR_W * 0.5;
          const charY = lockedWord.y + FONT_SIZE * 0.5;
          fireBeam(lastW, lastH, charX, charY);
          emitParticles(charX, charY, 4);

          lockedWord.typedIdx++;
          syncWordTexts(lockedWord);

          if (lockedWord.typedIdx >= lockedWord.word.length) {
            score += lockedWord.word.length * 10;
            emitParticles(
              lockedWord.x + lockedWord.word.length * CHAR_W * 0.5,
              lockedWord.y,
              10,
            );
            removeWord(lockedWord);
          }
        } else {
          // Wrong char — unlock and reset progress
          lockedWord.typedIdx = 0;
          lockedWord.locked = false;
          syncWordTexts(lockedWord);
          lockedWord.remainText.alpha = 0.45;
          lockedWord.typedText.alpha = 0;
          lockedWord = null;
        }
      } else {
        // Lock onto word starting with this char (closest to bottom)
        let target: Word | null = null;
        for (const w of words) {
          if (w.word[0] === k && (!target || w.y > target.y)) target = w;
        }
        if (!target) return;

        lockedWord = target;
        lockedWord.locked = true;

        const charX = lockedWord.x + CHAR_W * 0.5;
        const charY = lockedWord.y + FONT_SIZE * 0.5;
        fireBeam(lastW, lastH, charX, charY);
        emitParticles(charX, charY, 4);

        lockedWord.typedIdx = 1;
        syncWordTexts(lockedWord);

        if (lockedWord.typedIdx >= lockedWord.word.length) {
          score += lockedWord.word.length * 10;
          emitParticles(
            lockedWord.x + lockedWord.word.length * CHAR_W * 0.5,
            lockedWord.y,
            10,
          );
          removeWord(lockedWord);
        }
      }
    },

    update(dt, W, H) {
      if (W !== lastW || H !== lastH) onResize(W, H);
      if (dead) return;

      timePlayed += dt;
      spawnTimer += dt;

      const difficulty = Math.min(timePlayed / 90, 1);
      const spawnInterval = Math.max(1.0, 2.8 - difficulty * 1.8);
      const maxWords = Math.floor(3 + difficulty * 4);

      if (spawnTimer >= spawnInterval && words.length < maxWords) {
        spawnTimer = 0;
        spawnWord(W);
      }

      bg.clear()
        .rect(0, 0, W, H)
        .fill(0x08080f)
        .moveTo(0, H - 48)
        .lineTo(W, H - 48)
        .stroke({ color: 0x2a0a0a, width: 1 });

      // Draw and age beams
      beamGfx.clear();
      for (let i = beams.length - 1; i >= 0; i--) {
        const b = beams[i];
        b.life -= dt;
        if (b.life <= 0) {
          beams.splice(i, 1);
          continue;
        }
        const a = b.life / 0.12;
        beamGfx
          .moveTo(b.x1, b.y1)
          .lineTo(b.x2, b.y2)
          .stroke({ color: colorNum, width: 2, alpha: a * 0.9 });
        beamGfx
          .moveTo(b.x1, b.y1)
          .lineTo(b.x2, b.y2)
          .stroke({ color: 0xffffff, width: 1, alpha: a * 0.5 });
      }

      // Draw particles
      fxGfx.clear();
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= dt;
        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 60 * dt;
        const a = p.life / p.maxLife;
        fxGfx.circle(p.x, p.y, 1.5 + a * 2).fill({ color: colorNum, alpha: a });
      }

      // Update words
      for (let i = words.length - 1; i >= 0; i--) {
        const w = words[i];
        w.y += w.speed * dt;
        w.typedText.y = w.y;
        w.remainText.y = w.y;

        const nearBottom = w.y > H - 80;

        if (w.locked) {
          w.remainText.style.fill = 0xffffff;
          w.remainText.alpha = 1.0;
          w.typedText.alpha = 0.3;
        } else if (nearBottom) {
          w.remainText.style.fill = 0xff5533;
          w.remainText.alpha = 1.0;
        } else {
          w.remainText.style.fill = colorNum;
          w.remainText.alpha = 0.45;
        }

        if (w.y > H + 10) {
          removeWord(w);
          if (!gameOverFired) {
            gameOverFired = true;
            dead = true;
            for (const rem of words) {
              rem.typedText.visible = false;
              rem.remainText.visible = false;
            }
            gameOverBg
              .clear()
              .rect(0, 0, W, H)
              .fill({ color: 0x000000, alpha: 0.7 });
            gameOverBg.visible = true;
            gameOverTitle.position.set(W / 2, H / 2 - 24);
            gameOverTitle.visible = true;
            gameOverScore.text = `SCORE  ${score}`;
            gameOverScore.position.set(W / 2, H / 2 + 24);
            gameOverScore.visible = true;
            onGameOver(score);
          }
          return;
        }
      }

      scoreText.text = String(score);
    },
  };
}
