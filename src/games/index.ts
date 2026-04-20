import type { Container } from 'pixi.js';
import type { GameType } from '../types';
import { createDinoGame } from './DinoGame';
import { createGuitarHeroGame } from './GuitarHeroGame';
import { createSnakeGame } from './SnakeGame';

export interface GameInstance {
  container: Container;
  update(dt: number, W: number, H: number): void;
  triggerAction(): void;
  arrowKey?(key: string): void;
  readonly inputMode: 'action' | 'selection';
  readonly score: number;
  readonly dead: boolean;
}

export type GameFactory = (
  controlKey: string,
  baseColor: string,
  onGameOver: (score: number) => void,
) => GameInstance;

export const GAME_NAMES: Record<GameType, string> = {
  dino: 'Dino Runner',
  'guitar-hero': 'Guitar Hero',
  snake: 'Snake',
};

export const GAME_FACTORIES: Record<GameType, GameFactory> = {
  dino: createDinoGame,
  'guitar-hero': createGuitarHeroGame,
  snake: createSnakeGame,
};
