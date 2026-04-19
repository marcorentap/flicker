import { useState } from "react";
import type {
    ContextConfig,
    FlickerSettings,
    SessionConfig,
    GameType,
} from "../types";
import { getContextColor, colorAlpha } from "../colors";
import { GAME_NAMES } from "../games";

interface Props {
    onStart: (config: SessionConfig) => void;
}

const DEFAULT_SETTINGS: FlickerSettings = { frequencyHz: 30, mode: "cycle" };

export function MainMenu({ onStart }: Props) {
    const [contexts, setContexts] = useState<ContextConfig[]>([
        { id: 1, game: "dino" },
        { id: 2, game: "dino" },
    ]);
    const [settings, setSettings] = useState<FlickerSettings>(DEFAULT_SETTINGS);

    const addContext = () => {
        if (contexts.length >= 8) return;
        const nextId = Math.max(0, ...contexts.map((c) => c.id)) + 1;
        setContexts([...contexts, { id: nextId, game: "dino" }]);
    };

    const removeContext = (id: number) => {
        if (contexts.length <= 1) return;
        setContexts(contexts.filter((c) => c.id !== id));
    };

    const updateGame = (id: number, game: GameType) => {
        setContexts(contexts.map((c) => (c.id === id ? { ...c, game } : c)));
    };

    return (
        <div
            style={{
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "32px 40px",
                background: "#08080f",
                fontFamily: "monospace",
                boxSizing: "border-box",
                overflow: "auto",
            }}
        >
            <div style={{ marginBottom: 44, textAlign: "center" }}>
                <div
                    style={{
                        fontSize: 56,
                        fontWeight: 900,
                        letterSpacing: 10,
                        color: "#fff",
                        lineHeight: 1,
                    }}
                >
                    FLICKER
                </div>
                <div
                    style={{
                        color: "#666",
                        fontSize: 11,
                        letterSpacing: 5,
                        marginTop: 8,
                    }}
                >
                    A CONCURRENT USER INTERFACE
                </div>
            </div>

            <div
                style={{
                    display: "flex",
                    gap: 36,
                    width: "100%",
                    maxWidth: 820,
                    alignItems: "flex-start",
                }}
            >
                {/* Contexts */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <Label>CONTEXTS</Label>
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 8,
                        }}
                    >
                        {contexts.map((ctx) => {
                            const color = getContextColor(ctx.id);
                            return (
                                <div
                                    key={ctx.id}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 12,
                                        background: colorAlpha(color, 0.06),
                                        border: `1px solid ${colorAlpha(color, 0.28)}`,
                                        borderRadius: 8,
                                        padding: "10px 14px",
                                    }}
                                >
                                    <div
                                        style={{
                                            width: 34,
                                            height: 34,
                                            borderRadius: 6,
                                            background: color,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontWeight: "bold",
                                            color: "#000",
                                            fontSize: 15,
                                            flexShrink: 0,
                                        }}
                                    >
                                        {ctx.id}
                                    </div>
                                    <select
                                        value={ctx.game}
                                        onChange={(e) =>
                                            updateGame(
                                                ctx.id,
                                                e.target.value as GameType,
                                            )
                                        }
                                        style={{
                                            flex: 1,
                                            background: "#13131e",
                                            border: `1px solid ${colorAlpha(color, 0.35)}`,
                                            color: "#e0e0e0",
                                            padding: "7px 10px",
                                            borderRadius: 4,
                                            fontFamily: "monospace",
                                            fontSize: 13,
                                            cursor: "pointer",
                                            outline: "none",
                                        }}
                                    >
                                        {(
                                            Object.entries(GAME_NAMES) as [
                                                GameType,
                                                string,
                                            ][]
                                        ).map(([key, name]) => (
                                            <option key={key} value={key}>
                                                {name}
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={() => removeContext(ctx.id)}
                                        disabled={contexts.length <= 1}
                                        style={{
                                            background: "transparent",
                                            border: "none",
                                            color:
                                                contexts.length > 1
                                                    ? "#555"
                                                    : "#222",
                                            cursor:
                                                contexts.length > 1
                                                    ? "pointer"
                                                    : "default",
                                            fontSize: 20,
                                            padding: "0 6px",
                                            lineHeight: 1,
                                            fontFamily: "monospace",
                                        }}
                                    >
                                        ×
                                    </button>
                                </div>
                            );
                        })}
                        {contexts.length < 8 && (
                            <button
                                onClick={addContext}
                                style={{
                                    background: "transparent",
                                    border: "1px dashed #2a2a38",
                                    color: "#555",
                                    padding: "11px 14px",
                                    cursor: "pointer",
                                    borderRadius: 8,
                                    fontFamily: "monospace",
                                    fontSize: 13,
                                    letterSpacing: 1,
                                    transition:
                                        "border-color 0.15s, color 0.15s",
                                }}
                                onMouseEnter={(e) => {
                                    (
                                        e.currentTarget as HTMLElement
                                    ).style.borderColor = "#444";
                                    (
                                        e.currentTarget as HTMLElement
                                    ).style.color = "#888";
                                }}
                                onMouseLeave={(e) => {
                                    (
                                        e.currentTarget as HTMLElement
                                    ).style.borderColor = "#2a2a38";
                                    (
                                        e.currentTarget as HTMLElement
                                    ).style.color = "#555";
                                }}
                            >
                                + ADD CONTEXT
                            </button>
                        )}
                    </div>
                </div>

                {/* Settings */}
                <div style={{ width: 250, flexShrink: 0 }}>
                    <Label>SETTINGS</Label>
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 22,
                        }}
                    >
                        <div>
                            <Label small>FLICKER FREQUENCY</Label>
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 12,
                                    marginTop: 8,
                                }}
                            >
                                <input
                                    type="range"
                                    min={1}
                                    max={60}
                                    step={1}
                                    value={settings.frequencyHz}
                                    onChange={(e) =>
                                        setSettings({
                                            ...settings,
                                            frequencyHz: Number(e.target.value),
                                        })
                                    }
                                    style={{
                                        flex: 1,
                                        accentColor: "#888",
                                        cursor: "pointer",
                                    }}
                                />
                                <span
                                    style={{
                                        color: "#e0e0e0",
                                        fontSize: 15,
                                        fontWeight: "bold",
                                        width: 56,
                                        textAlign: "right",
                                    }}
                                >
                                    {settings.frequencyHz} Hz
                                </span>
                            </div>
                            <div
                                style={{
                                    color: "#555",
                                    fontSize: 11,
                                    marginTop: 6,
                                }}
                            >
                                switch every{" "}
                                {(1000 / settings.frequencyHz).toFixed(0)} ms
                            </div>
                        </div>

                        <div>
                            <Label small>SWITCH MODE</Label>
                            <div
                                style={{
                                    display: "flex",
                                    gap: 8,
                                    marginTop: 8,
                                }}
                            >
                                {(["cycle", "uniform-random"] as const).map(
                                    (mode) => {
                                        const active = settings.mode === mode;
                                        return (
                                            <button
                                                key={mode}
                                                onClick={() =>
                                                    setSettings({
                                                        ...settings,
                                                        mode,
                                                    })
                                                }
                                                style={{
                                                    flex: 1,
                                                    background: active
                                                        ? "#e0e0e0"
                                                        : "transparent",
                                                    border: `1px solid ${active ? "#e0e0e0" : "#2a2a38"}`,
                                                    color: active
                                                        ? "#08080f"
                                                        : "#555",
                                                    padding: "9px 6px",
                                                    cursor: "pointer",
                                                    borderRadius: 4,
                                                    fontFamily: "monospace",
                                                    fontSize: 11,
                                                    letterSpacing: 1,
                                                    transition: "all 0.15s",
                                                }}
                                            >
                                                {mode === "cycle"
                                                    ? "CYCLE"
                                                    : "RANDOM"}
                                            </button>
                                        );
                                    },
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <button
                onClick={() => onStart({ contexts, settings })}
                style={{
                    marginTop: 44,
                    background: "#ffffff",
                    border: "none",
                    color: "#08080f",
                    padding: "16px 64px",
                    cursor: "pointer",
                    borderRadius: 6,
                    fontFamily: "monospace",
                    fontSize: 17,
                    fontWeight: "bold",
                    letterSpacing: 5,
                    transition: "opacity 0.15s",
                }}
                onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.opacity = "0.85";
                }}
                onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.opacity = "1";
                }}
            >
                START SESSION
            </button>

            <div style={{ marginTop: 16, color: "#555", fontSize: 11 }}>
                press key 1–{contexts.length} to control each context during
                session · ESC to end
            </div>
        </div>
    );
}

function Label({
    children,
    small,
}: {
    children: React.ReactNode;
    small?: boolean;
}) {
    return (
        <div
            style={{
                color: small ? "#666" : "#888",
                fontSize: 10,
                letterSpacing: 3,
                marginBottom: small ? 0 : 14,
                fontFamily: "monospace",
                textTransform: "uppercase",
            }}
        >
            {children}
        </div>
    );
}
