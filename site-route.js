(() => {
  const route = document.querySelector('.site-route');
  if (!route) return;

  const track = route.querySelector('.site-route-track');
  const stops = [...route.querySelectorAll('.site-route-stop')];
  const courier = route.querySelector('.site-route-courier');
  const currentLabel = route.querySelector('.site-route-current');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const sections = stops.map((stop) => {
    const id = stop.getAttribute('href')?.slice(1);
    return id === 'home' ? document.querySelector('#home .hero') : document.getElementById(id);
  });
  let activeIndex = 0;
  let pointerGuided = false;
  let scrollQueued = false;

  function getGeometry() {
    const horizontal = window.matchMedia('(max-width: 760px)').matches;
    const svg = track.querySelector(horizontal ? '.site-route-svg-horizontal' : '.site-route-svg-vertical');
    const path = svg.querySelector('.site-route-completed');
    const rect = svg.getBoundingClientRect();
    const viewBox = svg.viewBox.baseVal;
    const total = path.getTotalLength();
    return {
      horizontal,
      path,
      point(progress) {
        const p = path.getPointAtLength(total * Math.max(0, Math.min(1, progress)));
        return { x: p.x / viewBox.width * rect.width, y: p.y / viewBox.height * rect.height };
      },
    };
  }

  function placeStops(geometry = getGeometry()) {
    const trackHeight = track.clientHeight;
    stops.forEach((stop, index) => {
      const p = geometry.point(index / Math.max(1, stops.length - 1));
      stop.style.setProperty('--stop-x', `${geometry.horizontal ? p.x : p.x - 7}px`);
      stop.style.setProperty('--stop-y', `${p.y}px`);
      stop.classList.toggle('label-above', geometry.horizontal && p.y > trackHeight * 0.67);
      stop.classList.toggle('horizontal-stop', geometry.horizontal);
    });
  }

  function moveCourier(progress, geometry = getGeometry()) {
    const p = geometry.point(progress);
    route.style.setProperty('--route-progress-x', `${p.x}px`);
    route.style.setProperty('--route-progress-y', `${p.y}px`);
    route.style.setProperty('--route-completion', String(Math.max(0, Math.min(1, progress))));
  }

  function setActive(index) {
    activeIndex = Math.max(0, Math.min(stops.length - 1, index));
    const geometry = getGeometry();
    placeStops(geometry);
    moveCourier(activeIndex / Math.max(1, stops.length - 1), geometry);
    stops.forEach((stop, i) => {
      stop.classList.toggle('is-active', i === activeIndex);
      if (i === activeIndex) stop.setAttribute('aria-current', 'location');
      else stop.removeAttribute('aria-current');
    });
    if (currentLabel) currentLabel.textContent = stops[activeIndex].dataset.label || stops[activeIndex].textContent.trim();
  }

  function updateFromScroll() {
    scrollQueued = false;
    if (pointerGuided) return;
    const threshold = Math.min(window.innerHeight * 0.44, 320);
    let index = 0;
    sections.forEach((section, i) => {
      if (section && section.getBoundingClientRect().top <= threshold) index = i;
    });
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 8) index = stops.length - 1;
    if (index !== activeIndex) setActive(index);
  }

  function queueScrollUpdate() {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(updateFromScroll);
  }

  stops.forEach((stop, index) => {
    stop.addEventListener('click', (event) => {
      const section = sections[index];
      if (!section) return;
      event.preventDefault();
      pointerGuided = false;
      section.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' });
      setActive(index);
      history.replaceState(null, '', stop.getAttribute('href'));
    });
  });

  track.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'touch') return;
    const geometry = getGeometry();
    const svg = track.querySelector(geometry.horizontal ? '.site-route-svg-horizontal' : '.site-route-svg-vertical');
    const rect = svg.getBoundingClientRect();
    const ratio = geometry.horizontal
      ? (event.clientX - rect.left) / rect.width
      : (event.clientY - rect.top) / rect.height;
    pointerGuided = true;
    route.classList.add('is-pointer-guided');
    moveCourier(Math.max(0, Math.min(1, ratio)));
  });
  track.addEventListener('pointerleave', () => {
    pointerGuided = false;
    route.classList.remove('is-pointer-guided');
    setActive(activeIndex);
  });

  window.addEventListener('scroll', queueScrollUpdate, { passive: true });
  window.addEventListener('resize', () => { setActive(activeIndex); queueScrollUpdate(); }, { passive: true });
  setActive(0);
  queueScrollUpdate();
})();
