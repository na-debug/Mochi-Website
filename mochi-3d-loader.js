(() => {
  const canvas = document.getElementById('mochiCanvas');
  if (!canvas) return;

  const files = ['three.min.js', 'GLTFLoader.js', 'mochi-3d.js'];
  let index = 0;
  let started = false;

  const loadNext = () => {
    if (index >= files.length) return;
    const file = files[index++];
    const script = document.createElement('script');
    script.src = 'assets/' + file + '?v=20261019-perf-2';
    script.async = true;
    script.onload = loadNext;
    script.onerror = () => {
      const hint = document.querySelector('.model-hint');
      if (hint) hint.textContent = 'Mochi’s supplied 3D model could not start. Open the site with Live Server.';
      console.error('Could not load model viewer dependency:', file);
    };
    document.body.appendChild(script);
  };

  const startWhenIdle = () => {
    if (started) return;
    started = true;
    const schedule = () => window.setTimeout(() => {
      if ('requestIdleCallback' in window) window.requestIdleCallback(loadNext, { timeout: 2500 });
      else loadNext();
    }, 1000);
    if (document.readyState === 'complete') schedule();
    else window.addEventListener('load', schedule, { once: true });
  };

  const afterFirstPaint = () => requestAnimationFrame(() => requestAnimationFrame(startWhenIdle));
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      observer.disconnect();
      afterFirstPaint();
    }, { rootMargin: '120px' });
    observer.observe(canvas);
  } else {
    afterFirstPaint();
  }
})();
