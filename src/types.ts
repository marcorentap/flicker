export type GameType = 'dino' | 'guitar-hero';
export type FlickerMode = 'cycle' | 'uniform-random';
export type AppView = 'menu' | 'session' | 'results';

export interface ContextConfig {
  id: number;
  game: GameType;
}

export interface FlickerSettings {
  frequencyHz: number;
  mode: FlickerMode;
}

export interface SessionConfig {
  contexts: ContextConfig[];
  settings: FlickerSettings;
}

export interface ContextResult {
  contextId: number;
  game: GameType;
  score: number;
  alive: boolean;
}
