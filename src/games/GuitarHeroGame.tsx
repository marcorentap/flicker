import { Container, Graphics, Text } from "pixi.js";
import type { GameInstance } from "./index";

const NOTE_H = 26;
const NOTE_FALL_SPEED = 180;
const HIT_ZONE_H = 72;
const HIT_PAD = 24;

function hex(s: string): number {
    return parseInt(s.replace("#", ""), 16);
}

interface Note {
    id: number;
    y: number;
    hit: boolean;
    missed: boolean;
    hitY?: number;
    hitAge: number;
}

interface State {
    notes: Note[];
    score: number;
    combo: number;
    nextNoteIn: number;
    hitFlash: number;
    missFlash: number;
    noteIdCounter: number;
    timePlayed: number;
    lastH: number;
    dead: boolean;
}

export function createGuitarHeroGame(
    controlKey: string,
    baseColor: string,
    onGameOver: (score: number) => void,
): GameInstance {
    const colorNum = hex(baseColor);
    const container = new Container();

    const bg = new Graphics();
    const trackGfx = new Graphics(); // track bg + edges, redrawn on resize
    const hitZoneGfx = new Graphics(); // hit zone, redrawn on flash change
    const notesGfx = new Graphics(); // all active notes, redrawn each frame
    const hitParticles = new Container();

    const gameOverBg = new Graphics();
    const gameOverTitle = new Text({
        text: "GAME OVER",
        style: { fontFamily: "monospace", fontSize: 40, fill: colorNum, fontWeight: "bold" },
    });
    gameOverTitle.anchor.set(0.5);
    const gameOverScore = new Text({
        text: "",
        style: { fontFamily: "monospace", fontSize: 22, fill: 0xe0e0e0 },
    });
    gameOverScore.anchor.set(0.5);
    gameOverBg.visible = gameOverTitle.visible = gameOverScore.visible = false;

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

    const comboText = new Text({
        text: "",
        style: {
            fontFamily: "monospace",
            fontSize: 20,
            fill: colorNum,
            fontWeight: "bold",
        },
    });

    container.addChild(
        bg,
        trackGfx,
        hitZoneGfx,
        notesGfx,
        hitParticles,
        scoreText,
        comboText,
        gameOverBg,
        gameOverTitle,
        gameOverScore,
    );

    const s: State = {
        notes: [],
        score: 0,
        combo: 0,
        nextNoteIn: 1.4,
        hitFlash: 0,
        missFlash: 0,
        noteIdCounter: 0,
        timePlayed: 0,
        lastH: 600,
        dead: false,
    };
    let lastW = 0,
        lastH = 0;
    let lastHitFlash = -1;
    let gameOverFired = false;

    function trackDims(W: number, H: number) {
        const trackW = Math.min(180, W * 0.28);
        const trackX = (W - trackW) / 2;
        const hitZoneTop = H - HIT_ZONE_H - HIT_PAD;
        return { trackW, trackX, hitZoneTop, hitZoneBot: H - HIT_PAD };
    }

    function drawTrack(W: number, H: number) {
        const { trackW, trackX, hitZoneTop } = trackDims(W, H);
        trackGfx
            .clear()
            .rect(trackX, 0, trackW, H)
            .fill({ color: 0xffffff, alpha: 0.025 })
            .moveTo(trackX, 0)
            .lineTo(trackX, H)
            .stroke({ color: colorNum, width: 1, alpha: 0.16 })
            .moveTo(trackX + trackW, 0)
            .lineTo(trackX + trackW, H)
            .stroke({ color: colorNum, width: 1, alpha: 0.16 });
        void hitZoneTop;
    }

    function drawHitZone(W: number, H: number, active: boolean) {
        const { trackW, trackX, hitZoneTop } = trackDims(W, H);
        hitZoneGfx.clear();
        if (active) {
            hitZoneGfx
                .rect(
                    trackX - 20,
                    hitZoneTop - 10,
                    trackW + 40,
                    HIT_ZONE_H + 20,
                )
                .fill({ color: colorNum, alpha: 0.19 });
        }
        hitZoneGfx
            .rect(trackX, hitZoneTop, trackW, HIT_ZONE_H)
            .fill({ color: colorNum, alpha: active ? 0.31 : 0.1 });
        hitZoneGfx
            .rect(trackX, hitZoneTop, trackW, HIT_ZONE_H)
            .stroke({
                color: colorNum,
                width: active ? 3 : 1.5,
                alpha: active ? 1 : 0.44,
            });
    }

    function onResize(W: number, H: number) {
        lastW = W;
        lastH = H;
        bg.clear().rect(0, 0, W, H).fill(0x08080f);
        drawTrack(W, H);
        drawHitZone(W, H, s.hitFlash > 0);
        scoreText.position.set(W - 20, 16);
        if (gameOverTitle.visible) {
            gameOverBg.clear().rect(0, 0, W, H).fill({ color: 0x000000, alpha: 0.6 });
            gameOverTitle.position.set(W / 2, H / 2 - 20);
            gameOverScore.position.set(W / 2, H / 2 + 26);
        }
    }

    function spawnHitParticle(W: number, H: number) {
        const { trackW, trackX } = trackDims(W, H);
        const cx = trackX + trackW / 2;
        const cy = H - HIT_ZONE_H / 2 - HIT_PAD;
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const p = new Graphics().circle(0, 0, 4).fill(0xffffff);
            p.position.set(cx, cy);
            (p as Graphics & { vx: number; vy: number }).vx =
                Math.cos(angle) * 80;
            (p as Graphics & { vx: number; vy: number }).vy =
                Math.sin(angle) * 80;
            hitParticles.addChild(p);
        }
    }

    function hitNote() {
        const H = s.lastH;
        const W = lastW;
        const { hitZoneTop, hitZoneBot } = trackDims(W, H);
        const note = s.notes.find(
            (n) =>
                !n.hit &&
                !n.missed &&
                n.y + NOTE_H >= hitZoneTop &&
                n.y <= hitZoneBot,
        );
        if (note) {
            note.hit = true;
            note.hitY = note.y;
            note.hitAge = 0;
            s.combo++;
            s.score += 10 * Math.min(s.combo, 8);
            s.hitFlash = 14;
            spawnHitParticle(W, H);
        } else {
            s.combo = 0;
            s.missFlash = 10;
        }
    }

    return {
        container,
        get score() {
            return s.score;
        },
        get dead() {
            return s.dead;
        },

        onContextEnter() { hitNote(); },
        onKey(key: string) { if (key === controlKey) hitNote(); },

        update(dt, W, H) {
            if (W !== lastW || H !== lastH) onResize(W, H);
            s.lastH = H;

            if (s.dead) return;

            const speed = NOTE_FALL_SPEED + s.timePlayed * 2;
            const { trackW, trackX, hitZoneTop, hitZoneBot } = trackDims(W, H);

            s.timePlayed += dt;

            for (const n of s.notes) {
                if (!n.hit) n.y += speed * dt;
                else n.hitAge += dt;
            }
            for (const n of s.notes) {
                if (!n.hit && !n.missed && n.y > hitZoneBot + NOTE_H) {
                    n.missed = true;
                    s.dead = true;
                    if (!gameOverFired) {
                        gameOverFired = true;
                        onGameOver(s.score);
                    }
                    gameOverBg.clear().rect(0, 0, W, H).fill({ color: 0x000000, alpha: 0.6 });
                    gameOverBg.visible = true;
                    gameOverTitle.position.set(W / 2, H / 2 - 20);
                    gameOverTitle.visible = true;
                    gameOverScore.text = `SCORE  ${s.score}`;
                    gameOverScore.position.set(W / 2, H / 2 + 26);
                    gameOverScore.visible = true;
                }
            }
            s.notes = s.notes.filter((n) =>
                n.missed ? n.y < H + 60 : n.hit ? n.hitAge < 0.35 : true,
            );

            s.nextNoteIn -= dt;
            if (s.nextNoteIn <= 0) {
                s.notes.push({
                    id: s.noteIdCounter++,
                    y: -NOTE_H - 10,
                    hit: false,
                    missed: false,
                    hitAge: 0,
                });
                s.nextNoteIn =
                    Math.max(0.7, 1.8 - s.timePlayed / 40) *
                    (0.75 + Math.random() * 0.5);
            }

            if (s.hitFlash > 0) s.hitFlash--;
            if (s.missFlash > 0) s.missFlash--;

            // Redraw hit zone only when flash state changes
            if (s.hitFlash !== lastHitFlash) {
                lastHitFlash = s.hitFlash;
                drawHitZone(W, H, s.hitFlash > 0);
            }

            // Redraw all active notes in one batch
            notesGfx.clear();
            for (const n of s.notes) {
                if (n.hit) {
                    const p = n.hitAge / 0.35;
                    const ny = (n.hitY ?? n.y) - p * 30;
                    notesGfx
                        .rect(trackX + 4, ny, trackW - 8, NOTE_H)
                        .fill({ color: 0xffffff, alpha: 1 - p });
                } else if (n.missed) {
                    notesGfx
                        .rect(trackX + 4, n.y, trackW - 8, NOTE_H)
                        .fill({ color: 0x888888, alpha: 0.35 });
                } else {
                    const inZone =
                        n.y + NOTE_H >= hitZoneTop && n.y <= hitZoneBot;
                    notesGfx
                        .rect(trackX + 4, n.y, trackW - 8, NOTE_H)
                        .fill(inZone ? 0xffffff : colorNum);
                    notesGfx
                        .rect(trackX + 4, n.y, trackW - 8, NOTE_H)
                        .stroke({
                            color: inZone ? 0xffffff : colorNum,
                            width: 1,
                            alpha: inZone ? 0.5 : 0.53,
                        });
                }
            }

            // Miss flash overlay
            if (s.missFlash > 0) {
                notesGfx
                    .rect(0, 0, W, H)
                    .fill({
                        color: 0xff0000,
                        alpha: (s.missFlash / 10) * 0.22,
                    });
            }

            // Animate hit particles
            for (let i = hitParticles.children.length - 1; i >= 0; i--) {
                const p = hitParticles.children[i] as Graphics & {
                    vx: number;
                    vy: number;
                    age?: number;
                };
                p.age = (p.age ?? 0) + dt;
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.alpha = 1 - p.age / 0.4;
                if (p.age > 0.4) {
                    hitParticles.removeChildAt(i);
                    p.destroy();
                }
            }

            scoreText.text = String(s.score);
            if (s.combo > 1) {
                comboText.text = `×${s.combo}`;
                comboText.style.fontSize = Math.min(13 + s.combo, 28);
                comboText.position.set(20, 16);
                comboText.visible = true;
            } else {
                comboText.visible = false;
            }
        },
    };
}
