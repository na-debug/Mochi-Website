(() => {
  const canvas = document.getElementById('mochiCanvas');
  const frame = document.getElementById('character');
  const hint = frame && frame.querySelector('.model-hint');
  if (!canvas || !frame || !window.THREE || !window.THREE.GLTFLoader) {
    if (hint) hint.textContent = 'Mochi’s supplied 3D model could not start. Open the site with Live Server.';
    return;
  }

  const THREE = window.THREE;
  let renderer;
  try {
    const context = canvas.getContext('webgl2', { alpha: true, antialias: true, powerPreference: 'high-performance' })
      || canvas.getContext('webgl', { alpha: true, antialias: true, powerPreference: 'high-performance' });
    if (!context) throw new Error('WebGL is unavailable in this browser.');
    renderer = new THREE.WebGLRenderer({ canvas, context, alpha: true, antialias: true });
  } catch (error) {
    if (hint) hint.textContent = 'Mochi’s 3D model needs WebGL enabled in this browser.';
    console.error(error);
    return;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.45));
  renderer.setClearColor(0x000000, 0);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, .1, 40);
  camera.position.set(0, .18, 5.9);
  const hemi = new THREE.HemisphereLight(0xfff2df, 0x80543f, 1.3);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe1a2, 2.15);
  sun.position.set(-3.5, 5, 5);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xffb4a7, .75);
  fill.position.set(4, 1.7, 3);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffd26f, 1.2);
  rim.position.set(1, 3, -4);
  scene.add(rim);

  const character = new THREE.Group();
  scene.add(character);
  const sunnyModel = new THREE.Group();
  const twilightModel = new THREE.Group();
  twilightModel.visible = false;
  character.add(sunnyModel, twilightModel);
  let activeModel = sunnyModel;
  let twilightModelReady = false;
  let twilightModelLoading = false;
  const baseY = character.position.y;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let rotationX = -.04;
  let rotationY = -.02;
  let targetX = rotationX;
  let targetY = rotationY;
  let hoverX = rotationX;
  let hoverY = rotationY;
  let pointerFollowing = false;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let lastDrag = 0;
  let zoom = 5.9;
  canvas.style.touchAction = 'none';

  function syncVisibleModel(night) {
    const desiredModel = night && twilightModelReady ? twilightModel : sunnyModel;
    sunnyModel.visible = desiredModel === sunnyModel;
    twilightModel.visible = desiredModel === twilightModel;
    activeModel = desiredModel;
  }

  function resize() {
    const rect = frame.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(frame);
  resize();

  const loader = new THREE.GLTFLoader();
  loader.load('assets/mochi-supplied.glb', gltf => {
    const model = gltf.scene;
    model.traverse(node => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });

    const bounds = new THREE.Box3().setFromObject(model);
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    if (!Number.isFinite(size.y) || size.y <= 0) throw new Error('The supplied GLB has invalid dimensions.');
    const scale = 2.5 / size.y;
    model.scale.setScalar(scale);
    model.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
    sunnyModel.add(model);
    sunnyModel.visible = true;
    frame.classList.add('model-ready');
    if (hint) hint.textContent = 'Drag Mochi to turn · Scroll to zoom';
    syncMood();
  }, undefined, error => {
    if (hint) hint.textContent = 'Could not load your supplied GLB. Open the site with Live Server.';
    console.error('Could not load assets/mochi-supplied.glb', error);
  });

  const loadTwilightModel = () => {
    if (twilightModelReady || twilightModelLoading) return;
    twilightModelLoading = true;
    loader.load('assets/mochi-twilight.glb', gltf => {
      const model = gltf.scene;
      model.traverse(node => {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
        }
      });
      const bounds = new THREE.Box3().setFromObject(model);
      const center = bounds.getCenter(new THREE.Vector3());
      const size = bounds.getSize(new THREE.Vector3());
      const largestDimension = Math.max(size.x, size.y, size.z);
      if (!Number.isFinite(largestDimension) || largestDimension <= 0) {
        twilightModelLoading = false;
        console.error('The Twilight Mochi GLB has invalid dimensions.');
        return;
      }
      const scale = 2.5 / largestDimension;
      model.scale.setScalar(scale);
      model.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
      twilightModel.add(model);
      twilightModelReady = true;
      twilightModelLoading = false;
      syncMood();
    }, undefined, error => {
      twilightModelLoading = false;
      console.error('Could not load assets/mochi-twilight.glb', error);
      if (hint && document.body.classList.contains('night')) {
        hint.textContent = 'Twilight Mochi could not load; keeping the regular model visible.';
      }
    });
  };

  canvas.addEventListener('pointerenter', event => {
    if (event.pointerType === 'touch') return;
    hoverX = rotationX;
    hoverY = rotationY;
    pointerFollowing = true;
  });
  canvas.addEventListener('pointerleave', event => {
    if (event.pointerType !== 'touch') pointerFollowing = false;
  });
  canvas.addEventListener('pointerdown', event => {
    dragging = true;
    pointerFollowing = false;
    lastX = event.clientX;
    lastY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
    canvas.classList.add('is-dragging');
  });
  canvas.addEventListener('pointermove', event => {
    if (!dragging) {
      if (event.pointerType === 'touch') return;
      const rect = canvas.getBoundingClientRect();
      const x = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width - .5) * 2));
      const y = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height - .5) * 2));
      targetY = hoverY + x * .14;
      targetX = THREE.MathUtils.clamp(hoverX + y * .1, -.42, .42);
      return;
    }
    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    rotationY += dx * .009;
    rotationX = THREE.MathUtils.clamp(rotationX + dy * .006, -.48, .48);
    targetX = rotationX;
    targetY = rotationY;
    lastX = event.clientX;
    lastY = event.clientY;
    lastDrag = performance.now();
  });
  const stopDrag = () => { dragging = false; canvas.classList.remove('is-dragging'); };
  canvas.addEventListener('pointerup', stopDrag);
  canvas.addEventListener('click', event => {
    if (document.body.classList.contains('night')) event.stopPropagation();
  });
  canvas.addEventListener('pointercancel', stopDrag);
  canvas.addEventListener('wheel', event => {
    event.preventDefault();
    zoom = THREE.MathUtils.clamp(zoom + event.deltaY * .004, 4.4, 7.4);
    camera.position.z = zoom;
  }, { passive: false });
  canvas.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') rotationY -= .1;
    else if (event.key === 'ArrowRight') rotationY += .1;
    else if (event.key === 'ArrowUp') rotationX = THREE.MathUtils.clamp(rotationX - .1, -.48, .48);
    else if (event.key === 'ArrowDown') rotationX = THREE.MathUtils.clamp(rotationX + .1, -.48, .48);
    else return;
    event.preventDefault();
    targetX = hoverX = rotationX;
    targetY = hoverY = rotationY;
  });

  function syncMood() {
    const night = document.body.classList.contains('night');
    if (hint) hint.textContent = 'Drag Mochi to turn · Scroll to zoom';
    if (night) loadTwilightModel();
    syncVisibleModel(night);
    sun.color.set(night ? 0xffb6a8 : 0xffe1a2);
    sun.intensity = night ? 1.65 : 2.15;
    fill.color.set(night ? 0xe39aa1 : 0xffb4a7);
    fill.intensity = night ? .58 : .75;
    rim.color.set(night ? 0xffc96b : 0xffd26f);
    rim.intensity = night ? 1.05 : 1.2;
    character.rotation.z = night ? .06 : 0;
  }
  new MutationObserver(syncMood).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  syncMood();

  const clock = new THREE.Clock();
  let sceneInView = false;
  let animationFrame = null;
  let frameCount = 0;

  function syncAnimationState() {
    const shouldAnimate = sceneInView && document.visibilityState === 'visible';
    if (shouldAnimate && animationFrame === null) {
      animationFrame = requestAnimationFrame(animate);
    } else if (!shouldAnimate && animationFrame !== null) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }
  }

  const sceneObserver = new IntersectionObserver(entries => {
    sceneInView = entries.some(entry => entry.isIntersecting);
    syncAnimationState();
  }, { rootMargin: '80px' });
  sceneObserver.observe(frame);
  document.addEventListener('visibilitychange', syncAnimationState);

  function animate() {
    animationFrame = null;
    if (!sceneInView || document.visibilityState !== 'visible') return;
    const t = clock.getElapsedTime();
    if (!dragging) {
      if (pointerFollowing && !reducedMotion) {
        rotationX += (targetX - rotationX) * .085;
        rotationY += (targetY - rotationY) * .085;
      } else if (!pointerFollowing && performance.now() - lastDrag > 1400 && !reducedMotion) {
        rotationY += .0012;
      }
      character.rotation.x = rotationX;
      character.rotation.y = rotationY;
    }
    character.position.y = baseY + (reducedMotion ? 0 : Math.sin(t * 1.6) * .025);
    // Keep the idle hero animation gentle while cutting unnecessary GPU work.
    if ((frameCount++ & 1) === 0) renderer.render(scene, camera);
    animationFrame = requestAnimationFrame(animate);
  }
  syncAnimationState();
})();
