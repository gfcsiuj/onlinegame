export enum GameState {
  LOBBY = 'LOBBY',
  CONNECTING = 'CONNECTING',
  RACING = 'RACING',
  GAME_OVER = 'GAME_OVER'
}

export interface Player {
  id: string;
  name: string;
  color: string;
  position: [number, number, number];
  rotation: number;
  isLocal: boolean;
  score: number;
}

export interface CarControls {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  brake: boolean;
  boost: boolean;
}