// Beep, vibration and keeping the screen on.

let audio = null;
let alarmTimer = null;
let wakeLock = null;

// Browsers only allow sound after the user has tapped something, so this is
// called on every tap.
export function unlockAudio() {
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
  } catch {}
}

function beep() {
  if (!audio) return;
  const start = audio.currentTime;
  [880, 880, 1175].forEach((freq, i) => {
    const t = start + i * 0.25;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = 'square';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    osc.connect(gain).connect(audio.destination);
    osc.start(t);
    osc.stop(t + 0.22);
  });
}

// Beep and vibrate now and every 5 seconds until stopAlarm().
export function startAlarm() {
  stopAlarm();
  const ring = () => {
    beep();
    navigator.vibrate?.([300, 100, 300]);
  };
  ring();
  alarmTimer = setInterval(ring, 5000);
}

export function stopAlarm() {
  clearInterval(alarmTimer);
  alarmTimer = null;
  navigator.vibrate?.(0);
}

// The browser drops the lock when the page is hidden, so this is called
// again whenever the page becomes visible.
export async function keepScreenOn() {
  if (wakeLock || !('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => (wakeLock = null));
  } catch {
    wakeLock = null;
  }
}

export async function releaseScreen() {
  try {
    await wakeLock?.release();
  } catch {}
  wakeLock = null;
}
