import { useEffect, useRef, useCallback } from 'react';

export const useMobaSounds = () => {
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const resumeContext = useCallback(async () => {
    if (audioContextRef.current?.state === 'suspended') {
      await audioContextRef.current.resume();
    }
  }, []);

  // Epic game start fanfare
  const playGameStart = useCallback(async () => {
    await resumeContext();
    if (!audioContextRef.current) return;
    
    const ctx = audioContextRef.current;
    const now = ctx.currentTime;
    
    // Dramatic orchestral-style fanfare
    const notes = [
      { freq: 261.63, time: 0, duration: 0.2 },     // C4
      { freq: 329.63, time: 0.15, duration: 0.2 },  // E4
      { freq: 392.00, time: 0.3, duration: 0.2 },   // G4
      { freq: 523.25, time: 0.45, duration: 0.4 },  // C5
      { freq: 659.25, time: 0.6, duration: 0.3 },   // E5
      { freq: 783.99, time: 0.75, duration: 0.5 },  // G5
    ];

    notes.forEach(({ freq, time, duration }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.frequency.setValueAtTime(freq, now + time);
      osc.type = 'triangle';
      
      gain.gain.setValueAtTime(0, now + time);
      gain.gain.linearRampToValueAtTime(0.3, now + time + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, now + time + duration);
      
      osc.start(now + time);
      osc.stop(now + time + duration);
    });
  }, [resumeContext]);

  // Game over dramatic sound
  const playGameOver = useCallback(async () => {
    await resumeContext();
    if (!audioContextRef.current) return;
    
    const ctx = audioContextRef.current;
    const now = ctx.currentTime;
    
    // Descending doom sound
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, now);
    filter.frequency.exponentialRampToValueAtTime(100, now + 1.5);
    
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 1.5);
    osc.type = 'sawtooth';
    
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 1.5);
    
    osc.start(now);
    osc.stop(now + 1.5);

    // Add a second layer for drama
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    
    osc2.frequency.setValueAtTime(220, now);
    osc2.frequency.exponentialRampToValueAtTime(27.5, now + 1.5);
    osc2.type = 'sine';
    
    gain2.gain.setValueAtTime(0.3, now);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 1.5);
    
    osc2.start(now);
    osc2.stop(now + 1.5);
  }, [resumeContext]);

  // Victory fanfare with laugh
  const playVictory = useCallback(async () => {
    await resumeContext();
    if (!audioContextRef.current) return;
    
    const ctx = audioContextRef.current;
    const now = ctx.currentTime;
    
    // Triumphant melody
    const melody = [
      { freq: 523.25, time: 0, duration: 0.15 },
      { freq: 659.25, time: 0.15, duration: 0.15 },
      { freq: 783.99, time: 0.3, duration: 0.15 },
      { freq: 1046.50, time: 0.45, duration: 0.4 },
      { freq: 783.99, time: 0.7, duration: 0.15 },
      { freq: 1046.50, time: 0.85, duration: 0.6 },
    ];

    melody.forEach(({ freq, time, duration }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.frequency.setValueAtTime(freq, now + time);
      osc.type = 'triangle';
      
      gain.gain.setValueAtTime(0, now + time);
      gain.gain.linearRampToValueAtTime(0.25, now + time + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.01, now + time + duration);
      
      osc.start(now + time);
      osc.stop(now + time + duration);
    });
  }, [resumeContext]);

  // Evil laugh when defeating enemy
  const playEvilLaugh = useCallback(async () => {
    await resumeContext();
    if (!audioContextRef.current) return;
    
    const ctx = audioContextRef.current;
    const now = ctx.currentTime;
    
    // Ha-ha-ha pattern with descending pitch
    const laughParts = [
      { baseFreq: 300, time: 0 },
      { baseFreq: 280, time: 0.12 },
      { baseFreq: 250, time: 0.24 },
      { baseFreq: 220, time: 0.36 },
    ];

    laughParts.forEach(({ baseFreq, time }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      // Vibrato for more natural laugh
      osc.frequency.setValueAtTime(baseFreq, now + time);
      osc.frequency.setValueAtTime(baseFreq * 1.1, now + time + 0.03);
      osc.frequency.setValueAtTime(baseFreq * 0.9, now + time + 0.06);
      osc.type = 'sawtooth';
      
      gain.gain.setValueAtTime(0, now + time);
      gain.gain.linearRampToValueAtTime(0.2, now + time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, now + time + 0.1);
      
      osc.start(now + time);
      osc.stop(now + time + 0.1);
    });
  }, [resumeContext]);

  // Enemy scream when hit
  const playEnemyScream = useCallback(async () => {
    await resumeContext();
    if (!audioContextRef.current) return;
    
    const ctx = audioContextRef.current;
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1000, now);
    filter.Q.setValueAtTime(5, now);
    
    // Rising then falling pitch for scream
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.linearRampToValueAtTime(800, now + 0.1);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.4);
    osc.type = 'sawtooth';
    
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
    
    osc.start(now);
    osc.stop(now + 0.4);
  }, [resumeContext]);

  // Enemy death explosion
  const playEnemyDeath = useCallback(async () => {
    await resumeContext();
    if (!audioContextRef.current) return;
    
    const ctx = audioContextRef.current;
    const now = ctx.currentTime;
    
    // Noise-based explosion
    const bufferSize = ctx.sampleRate * 0.5;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.1));
    }
    
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, now);
    filter.frequency.exponentialRampToValueAtTime(100, now + 0.3);
    
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    
    noise.start(now);
  }, [resumeContext]);

  // Player hit sound
  const playPlayerHit = useCallback(async () => {
    await resumeContext();
    if (!audioContextRef.current) return;
    
    const ctx = audioContextRef.current;
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.2);
    osc.type = 'sine';
    
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    
    osc.start(now);
    osc.stop(now + 0.2);
  }, [resumeContext]);

  // Skill/attack sound
  const playAttack = useCallback(async () => {
    await resumeContext();
    if (!audioContextRef.current) return;
    
    const ctx = audioContextRef.current;
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);
    osc.type = 'square';
    
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    
    osc.start(now);
    osc.stop(now + 0.1);
  }, [resumeContext]);

  // Level up celebration
  const playLevelUp = useCallback(async () => {
    await resumeContext();
    if (!audioContextRef.current) return;
    
    const ctx = audioContextRef.current;
    const now = ctx.currentTime;
    
    const arpeggio = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98];
    
    arpeggio.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      const time = i * 0.08;
      osc.frequency.setValueAtTime(freq, now + time);
      osc.type = 'sine';
      
      gain.gain.setValueAtTime(0, now + time);
      gain.gain.linearRampToValueAtTime(0.2, now + time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, now + time + 0.3);
      
      osc.start(now + time);
      osc.stop(now + time + 0.3);
    });
  }, [resumeContext]);

  // Boss appear dramatic sound
  const playBossAppear = useCallback(async () => {
    await resumeContext();
    if (!audioContextRef.current) return;
    
    const ctx = audioContextRef.current;
    const now = ctx.currentTime;
    
    // Deep rumble
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.frequency.setValueAtTime(40, now);
    osc.frequency.linearRampToValueAtTime(80, now + 0.5);
    osc.frequency.linearRampToValueAtTime(40, now + 1);
    osc.type = 'sine';
    
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.5, now + 0.3);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.7);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 1);
    
    osc.start(now);
    osc.stop(now + 1);
    
    // Dramatic chord
    [82.41, 103.83, 123.47].forEach(freq => {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      
      osc2.frequency.setValueAtTime(freq, now + 0.3);
      osc2.type = 'sawtooth';
      
      gain2.gain.setValueAtTime(0, now + 0.3);
      gain2.gain.linearRampToValueAtTime(0.15, now + 0.4);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 1);
      
      osc2.start(now + 0.3);
      osc2.stop(now + 1);
    });
  }, [resumeContext]);

  return {
    playGameStart,
    playGameOver,
    playVictory,
    playEvilLaugh,
    playEnemyScream,
    playEnemyDeath,
    playPlayerHit,
    playAttack,
    playLevelUp,
    playBossAppear,
  };
};
