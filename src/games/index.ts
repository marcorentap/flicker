import type { Container } from 'pixi.js';
import type { GameType } from '../types';
import { createDinoGame } from './DinoGame';
import { createGuitarHeroGame } from './GuitarHeroGame';

export interface GameInstance {
  container: Container;
  update(dt: number, W: number, H: number): void;
  triggerAction(): void;
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
};

export const GAME_FACTORIES: Record<GameType, GameFactory> = {
  dino: createDinoGame,
  'guitar-hero': createGuitarHeroGame,
};
