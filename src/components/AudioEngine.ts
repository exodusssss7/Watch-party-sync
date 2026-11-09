let audioCtx: AudioContext | null = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playMaterialSound(
  materialType: 'concrete' | 'aluminum' | 'clay' | 'stone' | 'wood',
  customFreq?: number
) {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    if (materialType === 'aluminum') {
      const baseFreq = customFreq || 680;
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(baseFreq, now);

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(baseFreq * 1.54, now);

      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.08, now + 0.003);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(baseFreq, now);
      filter.Q.setValueAtTime(14, now);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.3);
      osc2.stop(now + 1.3);
    } else if (materialType === 'concrete') {
      const baseFreq = customFreq || 95;
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(baseFreq, now);
      osc1.frequency.exponentialRampToValueAtTime(baseFreq * 0.5, now + 0.12);

      // Add structural granular noise
      const bufferSize = ctx.sampleRate * 0.25;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'lowpass';
      noiseFilter.frequency.setValueAtTime(45, now);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.06, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(ctx.destination);

      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.18, now + 0.004);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(150, now);

      osc1.start(now);
      noise.start(now);
      osc1.stop(now + 0.35);
      noise.stop(now + 0.35);
    } else if (materialType === 'clay') {
      const baseFreq = customFreq || 185;
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(baseFreq, now);
      osc1.frequency.exponentialRampToValueAtTime(baseFreq * 0.55, now + 0.08);

      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.12, now + 0.002);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(baseFreq, now);
      filter.Q.setValueAtTime(3.8, now);

      osc1.start(now);
      osc1.stop(now + 0.2);
    } else if (materialType === 'stone') {
      const baseFreq = customFreq || 290;
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(baseFreq, now);

      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(baseFreq * 2.22, now);

      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.12, now + 0.003);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, now);

      const clickOsc = ctx.createOscillator();
      const clickGain = ctx.createGain();
      clickOsc.type = 'triangle';
      clickOsc.frequency.setValueAtTime(2500, now);
      clickOsc.frequency.exponentialRampToValueAtTime(450, now + 0.01);
      clickGain.gain.setValueAtTime(0.2, now);
      clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.012);

      clickOsc.connect(clickGain);
      clickGain.connect(ctx.destination);
      clickOsc.start(now);
      clickOsc.stop(now + 0.02);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.45);
      osc2.stop(now + 0.45);
    } else {
      // Wood
      const baseFreq = customFreq || 135;
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(baseFreq, now);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(baseFreq * 1.95, now);

      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.15, now + 0.004);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.48);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(baseFreq * 1.4, now);
      filter.Q.setValueAtTime(4.5, now);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.52);
      osc2.stop(now + 0.52);
    }
  } catch (e) {
    // Fail silently in case browser policy fully blocks AudioContext on startup
    console.debug('Acoustic system suspended or unavailable.', e);
  }
}
