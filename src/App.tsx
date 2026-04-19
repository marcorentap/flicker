import { useState } from "react";
import type { AppView, SessionConfig, ContextResult } from "./types";
import { MainMenu } from "./components/MainMenu";
import { FlickerSession } from "./components/FlickerSession";
import { SessionResults } from "./components/SessionResults";

export function App() {
    const [view, setView] = useState<AppView>("menu");
    const [sessionConfig, setSessionConfig] = useState<SessionConfig | null>(
        null,
    );
    const [results, setResults] = useState<ContextResult[]>([]);

    const handleStart = (config: SessionConfig) => {
        setSessionConfig(config);
        setView("session");
    };

    const handleSessionEnd = (r: ContextResult[]) => {
        setResults(r);
        setView("results");
    };

    return (
        <div style={{ width: "100vw", height: "100vh", overflow: "hidden" }}>
            {view === "menu" && <MainMenu onStart={handleStart} />}
            {view === "session" && sessionConfig && (
                <FlickerSession
                    config={sessionConfig}
                    onSessionEnd={handleSessionEnd}
                />
            )}
            {view === "results" && (
                <SessionResults
                    results={results}
                    onBack={() => setView("menu")}
                />
            )}
        </div>
    );
}

export default App;
