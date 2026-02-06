export type NotificationSound = "chime" | "bell" | "pulse" | "soft" | "none";

export const SOUND_OPTIONS: { value: NotificationSound; label: string }[] = [
  { value: "chime", label: "Chime" },
  { value: "bell", label: "Bell" },
  { value: "pulse", label: "Pulse" },
  { value: "soft", label: "Soft" },
  { value: "none", label: "None" },
];

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

function playChime(): void {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  // First tone: C5 (523 Hz)
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = "sine";
  osc1.frequency.value = 523;
  gain1.gain.setValueAtTime(0, now);
  gain1.gain.linearRampToValueAtTime(0.3, now + 0.01);
  gain1.gain.setValueAtTime(0.3, now + 0.1);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc1.start(now);
  osc1.stop(now + 0.18);

  // Second tone: E5 (659 Hz)
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = "sine";
  osc2.frequency.value = 659;
  gain2.gain.setValueAtTime(0, now + 0.15);
  gain2.gain.linearRampToValueAtTime(0.3, now + 0.16);
  gain2.gain.setValueAtTime(0.3, now + 0.25);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.start(now + 0.15);
  osc2.stop(now + 0.35);
}

function playBell(): void {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  // Fundamental: A5 (880 Hz)
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = "triangle";
  osc1.frequency.value = 880;
  gain1.gain.setValueAtTime(0, now);
  gain1.gain.linearRampToValueAtTime(0.35, now + 0.005);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc1.start(now);
  osc1.stop(now + 0.8);

  // Harmonic: 1760 Hz (2x)
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = "sine";
  osc2.frequency.value = 1760;
  gain2.gain.setValueAtTime(0, now);
  gain2.gain.linearRampToValueAtTime(0.1, now + 0.005);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.start(now);
  osc2.stop(now + 0.5);
}

function playPulse(): void {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  for (let i = 0; i < 2; i++) {
    const offset = i * 0.14;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = 800;
    gain.gain.setValueAtTime(0, now + offset);
    gain.gain.linearRampToValueAtTime(0.15, now + offset + 0.005);
    gain.gain.setValueAtTime(0.15, now + offset + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + offset);
    osc.stop(now + offset + 0.08);
  }
}

function playSoft(): void {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = 392; // G4
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.25, now + 0.1);
  gain.gain.setValueAtTime(0.25, now + 0.3);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.5);
}

const players: Record<string, () => void> = {
  chime: playChime,
  bell: playBell,
  pulse: playPulse,
  soft: playSoft,
};

export function playNotificationSound(sound: NotificationSound): void {
  if (sound === "none") return;
  players[sound]?.();
}
