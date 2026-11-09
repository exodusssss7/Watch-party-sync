export interface Viewer {
  id: string;
  name: string;
  isHost: boolean;
}

export interface Room {
  id: string;
  name: string;
  movieTitle: string;
  movieUrl: string;
  hostName: string;
  selectedPreset: 'concrete' | 'aluminum' | 'clay' | 'stone' | 'wood';
  createdAt: number;
  videoState: {
    playing: boolean;
    currentTime: number;
    lastUpdated: number;
  };
  viewers: Viewer[];
}

export interface ChatMessage {
  name: string;
  message: string;
  timestamp: number;
}

export interface AestheticPreset {
  id: 'concrete' | 'aluminum' | 'clay' | 'stone' | 'wood';
  name: string;
  colorHex: string;
  textureDescription: string;
  imageUrl: string;
  description: string;
  acousticProfile: {
    materialType: 'concrete' | 'aluminum' | 'clay' | 'stone' | 'wood';
    frequency: number;
    decay: number;
    metalness: number;
  };
}
