import { useCallback } from "react";

// Premium Web Audio API sound effects for casino
const audioCtxRef = { current: null as AudioContext | null };

const getAudioCtx = () => {
  if (!audioCtxRef.current) {
    audioCtxRef.current = new AudioContext();
  }
  if (audioCtxRef.current.state === "suspended") {
    audioCtxRef.current.resume();
  }
  return audioCtxRef.current;
};

const playTone = (frequency: number, duration: number, type: OscillatorType = "sine", volume = 0.15) => {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {}
};

// White noise burst for card/chip sounds
const playNoiseBurst = (duration: number, volume = 0.06) => {
  try {
    const ctx = getAudioCtx();
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize); // fade out
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 2000;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start();
  } catch {}
};

export const useCasinoSfx = () => {
  const playWin = useCallback(() => {
    // Ascending arpeggio - victory fanfare
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      setTimeout(() => playTone(freq, 0.35, "sine", 0.1), i * 100);
    });
    // Sparkle overtones
    setTimeout(() => playTone(1568, 0.15, "sine", 0.06), 450);
    setTimeout(() => playTone(2093, 0.2, "sine", 0.05), 550);
    // Chip scatter
    setTimeout(() => playNoiseBurst(0.08, 0.04), 200);
    setTimeout(() => playNoiseBurst(0.06, 0.03), 350);
  }, []);

  const playLose = useCallback(() => {
    // Descending minor tones
    playTone(400, 0.3, "triangle", 0.08);
    setTimeout(() => playTone(300, 0.4, "triangle", 0.06), 200);
    setTimeout(() => playTone(220, 0.5, "triangle", 0.04), 400);
  }, []);

  const playBlackjack = useCallback(() => {
    // Epic blackjack fanfare
    const fanfare = [659, 784, 1047, 1319, 1568]; // E5, G5, C6, E6, G6
    fanfare.forEach((freq, i) => {
      setTimeout(() => playTone(freq, 0.4, "sine", 0.09), i * 80);
    });
    // Shimmer
    setTimeout(() => {
      for (let i = 0; i < 5; i++) {
        setTimeout(() => playTone(2000 + Math.random() * 2000, 0.1, "sine", 0.03), i * 60);
      }
    }, 500);
  }, []);

  const playSpin = useCallback(() => {
    playTone(800, 0.05, "square", 0.04);
  }, []);

  const playClick = useCallback(() => {
    playTone(600, 0.08, "sine", 0.06);
  }, []);

  const playDeal = useCallback(() => {
    // Card slide swoosh
    playNoiseBurst(0.12, 0.05);
    playTone(200, 0.08, "sawtooth", 0.03);
    setTimeout(() => playTone(350, 0.06, "sawtooth", 0.02), 40);
  }, []);

  const playCardSlide = useCallback(() => {
    // Single card sliding on felt
    playNoiseBurst(0.08, 0.04);
    playTone(180, 0.06, "sawtooth", 0.02);
  }, []);

  const playCardFlip = useCallback(() => {
    // Card flip sound
    playNoiseBurst(0.05, 0.05);
    playTone(400, 0.04, "sine", 0.03);
  }, []);

  const playChipPlace = useCallback(() => {
    // Chip clinking on table
    playTone(1200, 0.05, "sine", 0.06);
    setTimeout(() => playTone(800, 0.04, "sine", 0.04), 30);
    playNoiseBurst(0.04, 0.03);
  }, []);

  const playChipCollect = useCallback(() => {
    // Multiple chips being collected
    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        playTone(900 + i * 100, 0.04, "sine", 0.04);
        playNoiseBurst(0.03, 0.02);
      }, i * 50);
    }
  }, []);

  const playReveal = useCallback(() => {
    playTone(500, 0.12, "sine", 0.08);
  }, []);

  const playBust = useCallback(() => {
    // Deep thud + descending
    playTone(100, 0.3, "sine", 0.12);
    playTone(80, 0.4, "sine", 0.08);
    setTimeout(() => playTone(200, 0.2, "triangle", 0.06), 100);
  }, []);

  return { 
    playWin, playLose, playBlackjack, playSpin, playClick, 
    playDeal, playCardSlide, playCardFlip, playChipPlace, 
    playChipCollect, playReveal, playBust 
  };
};
