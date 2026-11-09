import { AestheticPreset } from './types';

export const aestheticPresets: AestheticPreset[] = [
  {
    id: 'concrete',
    name: 'Cast Concrete Hall',
    colorHex: '#4b5563',
    textureDescription: 'Severe concrete surfaces, damp acoustic profiles, industrial isolation.',
    imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
    description: 'Concrete displays high density and high internal friction, damping sound waves immediately for a deep, earthy thud with almost zero ringing.',
    acousticProfile: {
      materialType: 'concrete',
      frequency: 95,
      decay: 0.25,
      metalness: 0.1
    }
  },
  {
    id: 'aluminum',
    name: 'Anodized Billet Studio',
    colorHex: '#9ca3af',
    textureDescription: 'Aerospace satin aluminum plating, pristine soundwave reflection, high elasticity.',
    imageUrl: 'https://images.unsplash.com/photo-1554009975-d74653b849f1?auto=format&fit=crop&w=800&q=80',
    description: 'Aluminum has extremely low acoustic damping and exceptional elasticity, resulting in a pristine high-Q metal chime that rings with bright sideband frequencies.',
    acousticProfile: {
      materialType: 'aluminum',
      frequency: 680,
      decay: 0.45,
      metalness: 0.85
    }
  },
  {
    id: 'clay',
    name: 'Sintered Terracotta Dome',
    colorHex: '#ea580c',
    textureDescription: 'Porous high-iron terracotta clay brick, absorbs flutter echoes, flat woody texture.',
    imageUrl: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80',
    description: 'Clay possesses high internal absorption and mineral cohesion, producing a flat, dry, slightly woody acoustic snap on impact.',
    acousticProfile: {
      materialType: 'clay',
      frequency: 185,
      decay: 0.12,
      metalness: 0.05
    }
  },
  {
    id: 'stone',
    name: 'Thassos Marble Gallery',
    colorHex: '#e5e7eb',
    textureDescription: 'Polished white marble stone, immediate high-pressure reflections, crystal reverb.',
    imageUrl: 'https://images.unsplash.com/photo-1543248939-ff40856f65d4?auto=format&fit=crop&w=800&q=80',
    description: 'Crystalline stone creates an immediate high-pressure click followed by a dense, low-resonance rumble as the crystal lattice absorbs energy.',
    acousticProfile: {
      materialType: 'stone',
      frequency: 290,
      decay: 0.18,
      metalness: 0.3
    }
  },
  {
    id: 'wood',
    name: 'Carbonized Oak Salon',
    colorHex: '#1f2937',
    textureDescription: 'Charred Shou Sugi Ban timber, natural resonant cavities, organic warm diffusion.',
    imageUrl: 'https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=800&q=80',
    description: 'Wood contains natural internal resonant cavities, delivering an organic, hollow, and warm woody pluck that is highly pleasing and rounded.',
    acousticProfile: {
      materialType: 'wood',
      frequency: 135,
      decay: 0.35,
      metalness: 0.02
    }
  }
];
