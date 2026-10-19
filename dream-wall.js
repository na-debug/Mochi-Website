(() => {
  const form = document.getElementById('guestForm');
  const wall = document.getElementById('dreamWall');
  const counter = document.getElementById('dreamCounter');
  if (!form || !wall || !counter) return;

  const COUNTER_KEY = 'mochi-workshop-visits-v2';
  const WISHES_KEY = 'mochi-dream-wall-v1';
  const wishInput = document.getElementById('dreamWish');
  const nameInput = document.getElementById('guestName');
  const typeInput = document.getElementById('wishType');
  const wishCount = document.getElementById('wishCount');
  const wishTotal = document.getElementById('wishTotal');
  const status = document.getElementById('guestStatus');
  const modeBadge = document.getElementById('guestbookMode');
  const config = window.MOCHI_GUESTBOOK_CONFIG || {};
  const backendUrl = typeof config.url === 'string' ? config.url.trim().replace(/\/+$/, '') : '';
  const anonKey = typeof config.anonKey === 'string' ? config.anonKey.trim() : '';
  const sharedMode = Boolean(backendUrl && anonKey);
  let storageAvailable = true;
  let wishes = [];
  let sharedPollBusy = false;

  function read(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : JSON.parse(value);
    } catch (_) {
      storageAvailable = false;
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (_) {
      storageAvailable = false;
      return false;
    }
  }

  function buildOdometer(value) {
    const formatted = Math.max(0, Math.floor(value)).toLocaleString('en-US');
    counter.replaceChildren();
    const accessible = document.createElement('span');
    accessible.className = 'sr-only';
    accessible.textContent = formatted + ' visits to Mochi’s workshop on this browser';
    const visual = document.createElement('span');
    visual.className = 'odometer-visual';
    visual.setAttribute('aria-hidden', 'true');
    formatted.split('').forEach(char => {
      if (!/\d/.test(char)) {
        const punctuation = document.createElement('span');
        punctuation.className = 'odometer-comma';
        punctuation.textContent = char;
        visual.appendChild(punctuation);
        return;
      }
      const digitWindow = document.createElement('span');
      digitWindow.className = 'odometer-digit';
      const roll = document.createElement('span');
      roll.className = 'odometer-roll';
      for (let digit = 0; digit <= 9; digit++) {
        const cell = document.createElement('span');
        cell.textContent = String(digit);
        roll.appendChild(cell);
      }
      roll.style.transform = 'translateY(-' + Number(char) * 1.12 + 'em)';
      digitWindow.appendChild(roll);
      visual.appendChild(digitWindow);
    });
    counter.append(accessible, visual);
  }

  const storedCount = read(COUNTER_KEY, 0);
  const previousCount = Number.isFinite(Number(storedCount)) ? Math.max(0, Number(storedCount)) : 0;
  buildOdometer(previousCount);
  requestAnimationFrame(() => buildOdometer(previousCount + 1));
  write(COUNTER_KEY, previousCount + 1);

  function sanitize(entries) {
    if (!Array.isArray(entries)) return [];
    return entries.slice(0, 40).filter(entry => entry && typeof entry.message === 'string')
      .map(entry => ({
        name: typeof entry.name === 'string' ? entry.name.slice(0, 24) : 'A kind explorer',
        message: entry.message.trim().slice(0, 180),
        type: typeof entry.wish_type === 'string' ? entry.wish_type.slice(0, 32)
          : typeof entry.type === 'string' ? entry.type.slice(0, 32) : 'Falling Star Wish',
        date: (() => {
          const stamp = entry.created_at || entry.date;
          const parsed = typeof stamp === 'number' ? stamp : Date.parse(stamp);
          return Number.isFinite(parsed) ? parsed : Date.now();
        })()
      }));
  }

  function localWishes() { return sanitize(read(WISHES_KEY, [])); }

  function renderWishes() {
    wall.replaceChildren();
    wishTotal.textContent = wishes.length + ' ' + (wishes.length === 1 ? 'wish' : 'wishes');
    if (!wishes.length) {
      const empty = document.createElement('p');
      empty.className = 'empty-wishes';
      empty.textContent = 'The dream jar is waiting for its first little wish ✨';
      wall.appendChild(empty);
      return;
    }
    wishes.slice(0, 15).forEach(wish => {
      const note = document.createElement('article');
      note.className = 'wish-note';
      const kind = document.createElement('span');
      kind.className = 'wish-kind';
      kind.textContent = wish.type || 'Falling Star Wish';
      const message = document.createElement('p');
      message.textContent = wish.message;
      const footer = document.createElement('footer');
      const name = document.createElement('span');
      name.textContent = '— ' + (wish.name || 'A kind explorer');
      const time = document.createElement('time');
      const date = new Date(wish.date);
      time.dateTime = date.toISOString();
      time.textContent = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      footer.append(name, time);
      note.append(kind, message, footer);
      wall.appendChild(note);
    });
  }

  async function sharedRequest(method, body) {
    const fields = 'name,message,wish_type,created_at';
    const endpoint = backendUrl + '/rest/v1/mochi_wishes?select=' + fields
      + (method === 'POST' ? '' : '&order=created_at.desc&limit=40');
    const headers = {
      apikey: anonKey,
      'Content-Type': 'application/json',
      ...(method === 'POST' ? { Prefer: 'return=representation' } : {})
    };
    if (anonKey.startsWith('eyJ')) headers.Authorization = 'Bearer ' + anonKey;
    const response = await fetch(endpoint, {
      method,
      headers,
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    if (!response.ok) throw new Error('Guestbook request failed (' + response.status + ')');
    return response.status === 204 ? [] : response.json();
  }

  async function loadSharedWishes(isRefresh = false) {
    if (sharedPollBusy || document.visibilityState === 'hidden') return;
    sharedPollBusy = true;
    try {
      wishes = sanitize(await sharedRequest('GET'));
      renderWishes();
      if (modeBadge) modeBadge.textContent = '✨ Shared · checks every 15 sec';
      if (!isRefresh) status.textContent = 'Shared dream jar connected. New wishes appear here for everyone.';
    } catch (error) {
      console.warn('The shared wish wall could not load.', error);
      if (modeBadge) modeBadge.textContent = '⚠ Shared wall offline';
      status.textContent = 'Could not reach the shared dream jar. Check its connection and try again.';
    } finally {
      sharedPollBusy = false;
    }
  }

  if (sharedMode) {
    if (modeBadge) modeBadge.textContent = '✨ Connecting to shared jar…';
    status.textContent = 'Connecting to the shared dream jar…';
    loadSharedWishes();
    window.setInterval(() => loadSharedWishes(true), 15000);
  } else {
    wishes = localWishes();
    if (modeBadge) modeBadge.textContent = '💗 This device only';
    status.textContent = 'Saved on this device only. Connect the shared backend to let everyone see wishes.';
  }
  renderWishes();

  wishInput.addEventListener('input', () => { wishCount.textContent = String(wishInput.value.length); });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const message = wishInput.value.trim();
    if (!message) {
      wishInput.focus();
      status.textContent = 'Add a little wish before dropping it in the jar.';
      return;
    }
    const name = nameInput.value.trim().slice(0, 24) || 'A kind explorer';
    const type = typeInput ? typeInput.value : 'Falling Star Wish';
    const entry = { name, message: message.slice(0, 180), type, date: Date.now() };
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    try {
      if (sharedMode) {
        const saved = await sharedRequest('POST', { name: entry.name, message: entry.message, wish_type: entry.type });
        wishes = sanitize(saved).concat(wishes.filter(wish => wish.message !== entry.message || wish.name !== entry.name)).slice(0, 40);
        status.textContent = 'Your wish is in the shared dream jar for every explorer ✨';
      } else {
        wishes.unshift(entry);
        wishes = wishes.slice(0, 40);
        const saved = write(WISHES_KEY, wishes);
        status.textContent = saved
          ? 'Your wish is tucked into this device’s dream jar ✨'
          : 'Your wish is here for now, but browser storage is unavailable.';
      }
      renderWishes();
      form.reset();
      wishCount.textContent = '0';
    } catch (error) {
      console.warn('The wish could not be saved.', error);
      status.textContent = sharedMode
        ? 'Could not publish your wish. Please check the connection and try again.'
        : 'Your wish could not be saved in this browser.';
    } finally {
      submit.disabled = false;
    }
  });

  window.addEventListener('storage', event => {
    if (!sharedMode && event.key === WISHES_KEY) {
      wishes = localWishes();
      renderWishes();
    }
  });

  if (!storageAvailable && !sharedMode) {
    status.textContent = 'Browser storage is unavailable; wishes last only until this page closes.';
  }
})();
