import { type ContextResult } from "../types";
import { getContextColor, colorAlpha } from "../colors";
import { GAME_NAMES } from "../games";

interface Props {
    results: ContextResult[];
    onBack: () => void;
}

export function SessionResults({ results, onBack }: Props) {
    const sorted = [...results].sort((a, b) => b.score - a.score);
    const medals = ["◆", "◇", "·"];

    return (
        <div
            style={{
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background: "#08080f",
                fontFamily: "monospace",
                padding: 40,
                boxSizing: "border-box",
            }}
        >
            <div
                style={{
                    fontSize: 11,
                    letterSpacing: 5,
                    color: "#3a3a4a",
                    marginBottom: 12,
                }}
            >
                SESSION COMPLETE
            </div>
            <div
                style={{
                    fontSize: 36,
                    fontWeight: 900,
                    letterSpacing: 6,
                    color: "#fff",
                    marginBottom: 48,
                }}
            >
                RESULTS
            </div>

            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    minWidth: 420,
                    maxWidth: 520,
                    width: "100%",
                }}
            >
                {sorted.map((r, rank) => {
                    const color = getContextColor(r.contextId);
                    return (
                        <div
                            key={r.contextId}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 14,
                                background: colorAlpha(color, 0.06),
                                border: `1px solid ${colorAlpha(color, rank === 0 ? 0.5 : 0.2)}`,
                                borderRadius: 8,
                                padding: "14px 18px",
                            }}
                        >
                            <div
                                style={{
                                    color: "#2a2a3a",
                                    fontSize: 18,
                                    fontWeight: "bold",
                                    width: 20,
                                    textAlign: "center",
                                }}
                            >
                                {medals[rank] ?? "·"}
                            </div>
                            <div
                                style={{
                                    width: 38,
                                    height: 38,
                                    borderRadius: 7,
                                    background: color,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontWeight: "bold",
                                    color: "#000",
                                    fontSize: 17,
                                    flexShrink: 0,
                                }}
                            >
                                {r.contextId}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div
                                    style={{
                                        color: "#4a4a5a",
                                        fontSize: 10,
                                        letterSpacing: 2,
                                        marginBottom: 3,
                                    }}
                                >
                                    {GAME_NAMES[r.game].toUpperCase()}
                                </div>
                                {!r.alive && (
                                    <div
                                        style={{
                                            color: "#ff4757",
                                            fontSize: 9,
                                            letterSpacing: 2,
                                        }}
                                    >
                                        GAME OVER
                                    </div>
                                )}
                            </div>
                            <div
                                style={{
                                    color: color,
                                    fontSize: 30,
                                    fontWeight: "bold",
                                    letterSpacing: -1,
                                }}
                            >
                                {r.score}
                            </div>
                        </div>
                    );
                })}
            </div>

            <button
                onClick={onBack}
                style={{
                    marginTop: 48,
                    background: "transparent",
                    border: "1px solid #1e1e28",
                    color: "#4a4a5a",
                    padding: "13px 44px",
                    cursor: "pointer",
                    borderRadius: 6,
                    fontFamily: "monospace",
                    fontSize: 13,
                    letterSpacing: 3,
                    transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor =
                        "#3a3a4a";
                    (e.currentTarget as HTMLElement).style.color = "#888";
                }}
                onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor =
                        "#1e1e28";
                    (e.currentTarget as HTMLElement).style.color = "#4a4a5a";
                }}
            >
                BACK TO MENU
            </button>
        </div>
    );
}
