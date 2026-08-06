type AudioContextConstructor = typeof AudioContext;

let audioContext: AudioContext | null = null;
let unlockAttempted = false;

const getAudioContext = () => {
  if (typeof window === 'undefined') return null;

  const AudioCtor = window.AudioContext || (window as Window & { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext;
  if (!AudioCtor) return null;

  if (!audioContext) {
    audioContext = new AudioCtor();
  }

  return audioContext;
};

export const unlockNotificationSound = async () => {
  if (unlockAttempted || typeof window === 'undefined') return;

  unlockAttempted = true;
  const context = getAudioContext();
  if (!context) return;

  try {
    if (context.state === 'suspended') {
      await context.resume();
    }
  } catch {
    // ignore autoplay restrictions
  }
};

export const playRealtimeNotificationSound = async () => {
  const context = getAudioContext();
  if (!context) return;

  try {
    if (context.state === 'suspended') {
      await context.resume();
    }

    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(1320, context.currentTime + 0.14);

    gainNode.gain.setValueAtTime(0.0001, context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.03, context.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.2);

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    oscillator.start();
    oscillator.stop(context.currentTime + 0.22);
  } catch {
    // ignore audio failures
  }
};

if (typeof window !== 'undefined') {
  const unlockOnInteraction = () => {
    void unlockNotificationSound();
  };

  window.addEventListener('pointerdown', unlockOnInteraction, { once: true });
  window.addEventListener('keydown', unlockOnInteraction, { once: true });
}
