import { useState, useEffect, useRef, useCallback } from "react";
import { Application } from "pixi.js";
import type { SessionConfig, ContextResult } from "../types";
import { getContextColor, colorAlpha } from "../colors";
import { GAME_NAMES, GAME_FACTORIES, type GameInstance } from "../games";

interface Props {
    config: SessionConfig;
    onSessionEnd: (results: ContextResult[]) => void;
}

export function FlickerSession({ config, onSessionEnd }: Props) {
    const gameAreaRef = useRef<HTMLDivElement>(null);
    const [activeIdx, setActiveIdx] = useState(0);
    const [deadIds, setDeadIds] = useState<Set<number>>(new Set());
    const [displayScores, setDisplayScores] = useState<Record<number, number>>({});
    const [frequencyHz, setFrequencyHz] = useState(config.settings.frequencyHz);

    // Kept as refs — updated synchronously in the interval, no React cycle in the hot path
    const activeIdxRef = useRef(0);
    const deadRef = useRef<Set<number>>(new Set());
    const endedRef = useRef(false);
    const gamesRef = useRef<Map<number, GameInstance>>(new Map());
    const selectedCtxRef = useRef<number | null>(null);

    const endSession = useCallback(() => {
        if (endedRef.current) return;
        endedRef.current = true;
        const results: ContextResult[] = config.contexts.map((c) => ({
            contextId: c.id,
            game: c.game,
            score: gamesRef.current.get(c.id)?.score ?? 0,
            alive: !deadRef.current.has(c.id),
        }));
        onSessionEnd(results);
    }, [config.contexts, onSessionEnd]);

    // PIXI app + game instances (mount only)
    useEffect(() => {
        const gameArea = gameAreaRef.current;
        if (!gameArea) return;

        let app: Application | null = null;
        let appReady = false;
        let resizeObs: ResizeObserver | null = null;
        let unmounted = false;

        (async () => {
            app = new Application();
            await app.init({
                background: 0x08080f,
                antialias: true,
                autoDensity: true,
                resolution: window.devicePixelRatio || 1,
                width: gameArea.clientWidth || 800,
                height: gameArea.clientHeight || 600,
            });

            if (unmounted) { app.destroy(true); return; }
            appReady = true;

            app.canvas.style.cssText = "width:100%;height:100%;display:block;";
            gameArea.appendChild(app.canvas);

            // Create game instances
            gamesRef.current.clear();
            config.contexts.forEach((ctxCfg) => {
                const ctxId = ctxCfg.id;
                const game = GAME_FACTORIES[ctxCfg.game](
                    String(ctxId),
                    getContextColor(ctxId),
                    () => {
                        deadRef.current = new Set([...deadRef.current, ctxId]);
                        setDeadIds(new Set(deadRef.current));
                    },
                );
                app!.stage.addChild(game.container);
                game.container.visible = false;
                gamesRef.current.set(ctxId, game);
            });

            // Show first context and silently pre-select it (no onContextEnter — avoids triggering actions on start)
            const first = config.contexts[activeIdxRef.current];
            if (first) {
                gamesRef.current.get(first.id)!.container.visible = true;
                selectedCtxRef.current = first.id;
            }

            // Single ticker: update all games, render handled by PIXI automatically
            app.ticker.add((ticker) => {
                const dt = ticker.deltaMS / 1000;
                const W = app!.screen.width;
                const H = app!.screen.height;
                for (const [, game] of gamesRef.current) {
                    game.update(dt, W, H);
                }
            });

            resizeObs = new ResizeObserver(() => {
                if (app) app.renderer.resize(gameArea.clientWidth, gameArea.clientHeight);
            });
            resizeObs.observe(gameArea);
        })();

        return () => {
            unmounted = true;
            resizeObs?.disconnect();
            if (app && appReady) { app.destroy(true); app = null; }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Key handler — synchronous ref reads, no stale closures
    useEffect(() => {
        const ctxKeys = new Set(config.contexts.map((c) => String(c.id)));

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") { endSession(); return; }

            const isCtxKey = ctxKeys.has(e.key);

            if (isCtxKey) {
                const ctx = config.contexts.find((c) => e.key === String(c.id));
                if (!ctx) return;
                const curId = selectedCtxRef.current;

                if (curId === ctx.id) {
                    // Own key while already entered — forward to the game
                    const game = gamesRef.current.get(ctx.id);
                    if (game && !game.dead) game.onKey?.(e.key);
                } else {
                    // Switch context: exit old, enter new
                    if (curId !== null) {
                        gamesRef.current.get(curId)?.onContextExit?.();
                    }
                    selectedCtxRef.current = ctx.id;
                    const game = gamesRef.current.get(ctx.id);
                    if (game && !game.dead) game.onContextEnter?.();
                }
                return;
            }

            // Non-context key → forward to selected game
            const selId = selectedCtxRef.current;
            if (selId === null) return;
            const selGame = gamesRef.current.get(selId);
            if (!selGame || selGame.dead) {
                selectedCtxRef.current = null;
                return;
            }
            e.preventDefault();
            selGame.onKey?.(e.key);
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [endSession, config.contexts]);

    // Context switching — updates ref + React state + PIXI visibility in one shot
    useEffect(() => {
        const ms = 1000 / frequencyHz;
        const interval = setInterval(() => {
            const alive = config.contexts
                .map((c, i) => ({ c, i }))
                .filter(({ c }) => !deadRef.current.has(c.id));

            if (alive.length === 0) { endSession(); return; }

            let nextIdx: number;
            if (config.settings.mode === "cycle") {
                const cur = alive.findIndex(({ i }) => i === activeIdxRef.current);
                nextIdx = alive[(cur === -1 ? 0 : cur + 1) % alive.length].i;
            } else {
                nextIdx = alive[Math.floor(Math.random() * alive.length)].i;
            }

            // Update everything synchronously before the next PIXI frame
            activeIdxRef.current = nextIdx;
            setActiveIdx(nextIdx);
            for (const [id, game] of gamesRef.current) {
                game.container.visible = (id === config.contexts[nextIdx]?.id);
            }
        }, ms);
        return () => clearInterval(interval);
    }, [frequencyHz, config.settings.mode, config.contexts, endSession]);

    // Score display poll (UI only, not in hot path)
    useEffect(() => {
        const interval = setInterval(() => {
            const s: Record<number, number> = {};
            for (const [id, game] of gamesRef.current) s[id] = game.score;
            setDisplayScores(s);
        }, 150);
        return () => clearInterval(interval);
    }, []);

    const activeCtx = config.contexts[activeIdx];
    const activeColor = activeCtx ? getContextColor(activeCtx.id) : "#fff";

    return (
        <div style={{
            width: "100vw", height: "100vh", display: "flex", flexDirection: "column",
            background: "#08080f", overflow: "hidden", fontFamily: "monospace",
        }}>
            <div style={{
                height: 58, display: "flex", alignItems: "center", gap: 10,
                padding: "0 18px", background: "#0c0c18", flexShrink: 0,
                borderBottom: `1px solid ${colorAlpha(activeColor, 0.25)}`,
            }}>
                <span style={{ color: "#888", fontSize: 11, letterSpacing: 3, fontWeight: "bold", marginRight: 4 }}>CTX</span>

                {config.contexts.map((ctx, i) => {
                    const color = getContextColor(ctx.id);
                    const isActive = i === activeIdx;
                    const isDead = deadIds.has(ctx.id);
                    const score = displayScores[ctx.id] ?? 0;
                    return (
                        <div key={ctx.id} style={{
                            display: "flex", alignItems: "center", gap: 7,
                            padding: "5px 10px 5px 6px", borderRadius: 6,
                            background: !isDead && isActive ? colorAlpha(color, 0.15) : "transparent",
                            border: `1.5px solid ${isDead ? "#1e1e28" : isActive ? color : colorAlpha(color, 0.35)}`,
                            opacity: isDead ? 0.25 : 1,
                            transition: "all 0.08s",
                        }}>
                            <div style={{
                                width: 26, height: 26, borderRadius: 4,
                                background: isActive && !isDead ? color : colorAlpha(color, 0.25),
                                display: "flex", alignItems: "center", justifyContent: "center",
                                color: isActive && !isDead ? "#000" : color,
                                fontWeight: "bold", fontSize: 13, flexShrink: 0,
                            }}>
                                {ctx.id}
                            </div>
                            <div>
                                <div style={{ color: "#888", fontSize: 10, letterSpacing: 2, fontWeight: "bold" }}>
                                    {GAME_NAMES[ctx.game].toUpperCase()}
                                </div>
                                <div style={{
                                    color: isDead ? "#3a3a4a" : isActive ? color : "#888",
                                    fontSize: 14, fontWeight: "bold", lineHeight: 1.1,
                                }}>
                                    {score}
                                </div>
                            </div>
                        </div>
                    );
                })}

                <div style={{ flex: 1 }} />
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                        type="range" min={1} max={60} step={1}
                        value={frequencyHz}
                        onChange={(e) => setFrequencyHz(Number(e.target.value))}
                        style={{ width: 120, accentColor: "#888", cursor: "pointer" }}
                    />
                    <span style={{ color: "#aaa", fontSize: 11, letterSpacing: 2, fontWeight: "bold", minWidth: 38 }}>
                        {frequencyHz}Hz
                    </span>
                    <span style={{ color: "#555", fontSize: 11, letterSpacing: 1 }}>
                        {config.settings.mode}
                    </span>
                </div>
                <button
                    onClick={endSession}
                    style={{
                        background: "transparent", border: "1px solid #555", color: "#888",
                        padding: "6px 14px", cursor: "pointer", fontFamily: "monospace",
                        fontSize: 11, fontWeight: "bold", borderRadius: 4, letterSpacing: 2,
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#888"; (e.currentTarget as HTMLElement).style.color = "#aaa"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#444"; (e.currentTarget as HTMLElement).style.color = "#666"; }}
                >
                    END [ESC]
                </button>
            </div>

            <div style={{ position: "absolute", top: 58, left: 0, right: 0, height: 3, background: activeColor, zIndex: 10 }} />

            {/* PIXI injects its canvas here */}
            <div ref={gameAreaRef} style={{ flex: 1, position: "relative", overflow: "hidden" }} />
        </div>
    );
}
