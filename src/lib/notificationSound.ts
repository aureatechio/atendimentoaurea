// Web Audio API notification sound - no external file needed
let audioContext: AudioContext | null = null;

const getAudioContext = () => {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
};

export const playNotificationSound = () => {
  try {
    const ctx = getAudioContext();
    
    // Resume context if suspended (required by browsers)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    // WhatsApp-like notification sound
    oscillator.frequency.setValueAtTime(880, ctx.currentTime); // A5
    oscillator.frequency.setValueAtTime(988, ctx.currentTime + 0.1); // B5
    oscillator.frequency.setValueAtTime(1047, ctx.currentTime + 0.2); // C6
    
    oscillator.type = 'sine';
    
    // Quick fade in and out
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
    gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.15);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.3);
    
    console.log('🔔 Notification sound played');
  } catch (error) {
    console.error('Error playing notification sound:', error);
  }
};

// Initialize audio context on first user interaction
export const initAudioContext = () => {
  getAudioContext();
};
