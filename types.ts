export interface Star {
  id: string;
  x: number;
  y: number;
  size: number;
  label: string;
}

export enum OrbState {
  IDLE = 'IDLE',
  LISTENING = 'LISTENING',
  SPEAKING = 'SPEAKING',
  THINKING = 'THINKING',
  CELEBRATING = 'CELEBRATING',
}

export interface AudioVisuals {
  volume: number;
}

export interface Checkpoint {
  id: string;
  title: string;
  description: string; // The specific goal text
  hint: string;        // The hint text
  status: 'pending' | 'current' | 'completed';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  isFinal?: boolean; // For real-time transcription updates
}