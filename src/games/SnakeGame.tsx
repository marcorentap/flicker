import { Container, Graphics, Text } from "pixi.js";
import type { GameInstance } from "./index";

const COLS = 20;
const ROWS = 20;
const MOVE_INTERVAL = 0.5;

function hex(s: string): number {
    return parseInt(s.replace("#", ""), 16);
}

type Dir = "up" | "down" | "left" | "right";
interface Cell {
    x: number;
    y: number;
}

export function createSnakeGame(
    controlKey: string,
    baseColor: string,
    onGameOver: (score: number) => void,
): GameInstance {
    const colorNum = hex(baseColor);
    const container = new Container();

    const bg = new Graphics();
    const boardGfx = new Graphics();

    const scoreText = new Text({
        text: "00000",
        style: {
            fontFamily: "monospace",
            fontSize: 22,
            fill: colorNum,
            fontWeight: "bold",
        },
    });
    scoreText.anchor.set(1, 0);

    const hintText = new Text({
        text: `[${controlKey}] select · arrows steer`,
        style: { fontFamily: "monospace", fontSize: 13, fill: colorNum },
    });
    hintText.alpha = 0.27;

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

    container.addChild(
        bg,
        boardGfx,
        scoreText,
        hintText,
        gameOverBg,
        gameOverTitle,
        gameOverScore,
    );

    let snake: Cell[] = [
        { x: 10, y: 10 },
        { x: 9, y: 10 },
        { x: 8, y: 10 },
    ];
    let dir: Dir = "right";
    let nextDir: Dir = "right";
    let food: Cell = spawnFood();
    let score = 0;
    let dead = false;
    let timer = 0;
    let gameOverFired = false;
    let lastW = 0,
        lastH = 0;

    function spawnFood(): Cell {
        const candidates: Cell[] = [];
        for (let x = 0; x < COLS; x++)
            for (let y = 0; y < ROWS; y++)
                if (!snake.some((s) => s.x === x && s.y === y))
                    candidates.push({ x, y });
        return (
            candidates[Math.floor(Math.random() * candidates.length)] ?? {
                x: 0,
                y: 0,
            }
        );
    }

    const BORDER = 2;

    function boardRect(W: number, H: number) {
        const size = Math.min(W, H) * 0.85;
        const ox = (W - size) / 2;
        const oy = (H - size) / 2;
        const inner = size - BORDER * 2;
        const cell = inner / COLS;
        return { ox, oy, size, inner, cell };
    }

    function moveSnake(W: number, H: number) {
        dir = nextDir;
        const head = snake[0];
        const newHead: Cell = { x: head.x, y: head.y };
        if (dir === "up") newHead.y--;
        if (dir === "down") newHead.y++;
        if (dir === "left") newHead.x--;
        if (dir === "right") newHead.x++;

        const hitWall =
            newHead.x < 0 ||
            newHead.x >= COLS ||
            newHead.y < 0 ||
            newHead.y >= ROWS;
        const hitSelf = snake
            .slice(0, -1)
            .some((s) => s.x === newHead.x && s.y === newHead.y);

        if (hitWall || hitSelf) {
            dead = true;
            if (!gameOverFired) {
                gameOverFired = true;
                onGameOver(score);
                const { ox, oy, size } = boardRect(W, H);
                gameOverBg
                    .clear()
                    .rect(ox, oy, size, size)
                    .fill({ color: 0x000000, alpha: 0.75 });
                gameOverBg.visible = true;
                gameOverTitle.position.set(W / 2, H / 2 - 20);
                gameOverTitle.visible = true;
                gameOverScore.text = `SCORE  ${score}`;
                gameOverScore.position.set(W / 2, H / 2 + 26);
                gameOverScore.visible = true;
            }
            return;
        }

        snake.unshift(newHead);
        if (newHead.x === food.x && newHead.y === food.y) {
            score += 100;
            food = spawnFood();
        } else {
            snake.pop();
        }
    }

    function draw(W: number, H: number) {
        const { ox, oy, size, cell } = boardRect(W, H);

        if (W !== lastW || H !== lastH) {
            lastW = W;
            lastH = H;
            bg.clear().rect(0, 0, W, H).fill(0x08080f);
            scoreText.position.set(ox + size - 4, oy - 26);
            hintText.position.set(ox + 4, oy + size + 8);
            if (gameOverTitle.visible) {
                gameOverBg
                    .clear()
                    .rect(ox, oy, size, size)
                    .fill({ color: 0x000000, alpha: 0.75 });
                gameOverTitle.position.set(W / 2, H / 2 - 20);
                gameOverScore.position.set(W / 2, H / 2 + 26);
            }
        }

        boardGfx.clear();

        // Border + board background
        boardGfx
            .rect(ox, oy, size, size)
            .fill(0x08080f)
            .rect(ox, oy, size, size)
            .stroke({ color: colorNum, width: BORDER, alpha: 0.7 });

        const bx = ox + BORDER;
        const by = oy + BORDER;

        // Food
        boardGfx
            .rect(
                bx + food.x * cell + cell * 0.15,
                by + food.y * cell + cell * 0.15,
                cell * 0.7,
                cell * 0.7,
            )
            .fill({ color: colorNum, alpha: 0.4 });

        // Snake (tail → head for correct alpha layering)
        for (let i = snake.length - 1; i >= 0; i--) {
            const seg = snake[i];
            const alpha =
                i === 0 ? 1 : 0.35 + 0.45 * ((snake.length - i) / snake.length);
            boardGfx
                .rect(
                    bx + seg.x * cell + 1,
                    by + seg.y * cell + 1,
                    cell - 2,
                    cell - 2,
                )
                .fill({ color: colorNum, alpha });
        }

        scoreText.text = String(score).padStart(5, "0");
    }

    return {
        container,
        get score() {
            return score;
        },
        get dead() {
            return dead;
        },

        onContextEnter() { /* steering is always active; enter is just a selection signal */ },
        onContextExit() { /* nothing to clean up */ },

        onKey(key: string) {
            if (dead) return;
            if (key === "ArrowUp" && dir !== "down") nextDir = "up";
            if (key === "ArrowDown" && dir !== "up") nextDir = "down";
            if (key === "ArrowLeft" && dir !== "right") nextDir = "left";
            if (key === "ArrowRight" && dir !== "left") nextDir = "right";
        },

        update(dt, W, H) {
            if (!dead) {
                timer += dt;
                if (timer >= MOVE_INTERVAL) {
                    timer -= MOVE_INTERVAL;
                    moveSnake(W, H);
                }
            }
            draw(W, H);
        },
    };
}
