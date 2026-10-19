(() => {
  const muteButton = document.getElementById('soundMute');
  const chaosButton = document.getElementById('chaosMode');
  if (!muteButton || !chaosButton) return;

  // Start quiet. One visible master mute controls every synthesized sound.
  window.soundMuted = true;
  window.sfxEnabled = false;
  window.clickToneContext = null;
  muteButton.setAttribute('aria-pressed', 'true');

  function updateMuteButton() {
    const muted = window.soundMuted;
    muteButton.setAttribute('aria-pressed', String(muted));
    muteButton.setAttribute('aria-label', muted ? 'Unmute click sounds and trail tune' : 'Mute all sounds');
    muteButton.textContent = muted ? '🔇 Muted' : '🔔 Sound on';
  }

  muteButton.addEventListener('click', () => {
    window.soundMuted = !window.soundMuted;
    window.sfxEnabled = !window.soundMuted;
    const clickContext = window.clickToneContext;
    if (window.soundMuted) {
      if (clickContext && clickContext.state === 'running') clickContext.suspend();
      if (typeof window.stopTrailTune === 'function') window.stopTrailTune();
    }
    updateMuteButton();
    if (typeof window.syncTrailButton === 'function') window.syncTrailButton();
  });

  chaosButton.addEventListener('click', () => {
    const active = document.body.classList.toggle('chaos-mode');
    chaosButton.setAttribute('aria-pressed', String(active));
    chaosButton.setAttribute('aria-label', active ? 'Turn responsive chaos mode off' : 'Turn responsive chaos mode on');
    chaosButton.textContent = active ? '✦ Chaos mode on!' : '✦ Chaos mode off';
  });

  window.playClickTone = () => {
    if (window.soundMuted) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const audio = window.clickToneContext || (window.clickToneContext = new AudioContextClass());
    if (audio.state === 'suspended') audio.resume();
    const now = audio.currentTime;
    const notes = [659.25, 783.99, 987.77];
    const first = notes[Math.floor(Math.random() * notes.length)];
    [first, first * 1.25].forEach((frequency, index) => {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, now + index * .055);
      gain.gain.setValueAtTime(.0001, now + index * .055);
      gain.gain.exponentialRampToValueAtTime(.018, now + index * .055 + .012);
      gain.gain.exponentialRampToValueAtTime(.0001, now + index * .055 + .22);
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.start(now + index * .055);
      oscillator.stop(now + index * .055 + .24);
    });
  };

  // A light sprinkle follows a mouse or pen. Touch and reduced-motion users get a calm page.
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  let lastSpark = 0;
  let sparkIndex = 0;
  if (!reduceMotion && !coarsePointer) {
    window.addEventListener('pointermove', event => {
      if (event.pointerType === 'touch' || performance.now() - lastSpark < 38) return;
      lastSpark = performance.now();
      const particle = document.createElement('span');
      const isBubble = sparkIndex % 4 === 3;
      particle.className = `cursor-spark${isBubble ? ' bubble' : ''}`;
      if (!isBubble) particle.textContent = ['✦', '✧', '·'][sparkIndex % 3];
      particle.style.left = `${event.clientX}px`;
      particle.style.top = `${event.clientY}px`;
      particle.style.setProperty('--drift-x', `${(Math.random() - .5) * 28}px`);
      document.body.appendChild(particle);
      window.setTimeout(() => particle.remove(), 760);
      sparkIndex++;
    }, { passive: true });
  }

  // Soft, short chimes give buttons and links a little tactile feedback.
  document.addEventListener('click', event => {
    const control = event.target.closest('a, button');
    if (!control || control.closest('.delight-controls') || control.id === 'sound') return;
    window.playClickTone();
  });
})();