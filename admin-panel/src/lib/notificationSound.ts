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

const playTone = (
  context: AudioContext,
  frequency: number,
  startTime: number,
  duration: number,
  peakGain: number,
) => {
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(frequency, startTime);

  gainNode.gain.setValueAtTime(0.0001, startTime);
  gainNode.gain.exponentialRampToValueAtTime(peakGain, startTime + 0.015);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);

  oscillator.start(startTime);
  oscillator.stop(startTime + duration + 0.02);
};

export const playRealtimeNotificationSound = async () => {
  const context = getAudioContext();
  if (!context) return;

  try {
    if (context.state === 'suspended') {
      await context.resume();
    }

    const now = context.currentTime;
    // Two-tone "ding-dong" chime — a descending major third (E6 -> C6),
    // the classic doorbell/notification interval. The second tone starts
    // while the first is still decaying for a smooth, natural transition.
    playTone(context, 1318.51, now, 0.22, 0.035);
    playTone(context, 1046.5, now + 0.16, 0.28, 0.035);
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
