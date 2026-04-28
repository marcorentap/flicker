import type { Container } from "pixi.js";
import type { GameType } from "../types";
import { createDinoGame } from "./DinoGame";
import { createGuitarHeroGame } from "./GuitarHeroGame";
import { createSnakeGame } from "./SnakeGame";
import { createTypingGame } from "./TypingGame";

export interface GameInstance {
  container: Container;
  update(dt: number, W: number, H: number): void;
  onContextEnter?(): void;
  onContextExit?(): void;
  onKey?(key: string): void;
  readonly score: number;
  readonly dead: boolean;
}

export type GameFactory = (
  controlKey: string,
  baseColor: string,
  onGameOver: (score: number) => void,
) => GameInstance;

export const GAME_NAMES: Record<GameType, string> = {
  dino: "Dino Runner",
  "guitar-hero": "Guitar Hero",
  snake: "Snake",
  typing: "Z-Type",
};

export const GAME_FACTORIES: Record<GameType, GameFactory> = {
  dino: createDinoGame,
  "guitar-hero": createGuitarHeroGame,
  snake: createSnakeGame,
  typing: createTypingGame,
};
