(() => {
  'use strict';

  const nav = document.querySelector('.nav');
  const existingToggle = document.getElementById('mochiChatToggle');
  if (!nav || document.getElementById('mochiChatPanel')) return;

  const STORE_NAME = 'mochi-explorer-name-v1';
  const STORE_VISITS = 'mochi-workshop-return-visits-v1';
  const STORE_CHAT = 'mochi-chat-history-v1';
  const MAX_MESSAGES = 48;
  const MAX_INPUT = 240;
  const safeRead = key => {
    try { return localStorage.getItem(key) || ''; } catch (_) { return ''; }
  };
  const safeWrite = (key, value) => {
    try { localStorage.setItem(key, value); return true; } catch (_) { return false; }
  };
  let visitorName = safeRead(STORE_NAME).trim().slice(0, 24);
  let visits = Number(safeRead(STORE_VISITS)) || 0;
  const returning = visits > 0;
  safeWrite(STORE_VISITS, String(Math.min(visits + 1, 1000000)));

  const style = document.createElement('style');
  style.textContent = `
    .mochi-chat-toggle{position:fixed;z-index:1002;left:var(--mochi-chat-left,calc(50% + 230px));top:var(--mochi-chat-top,calc(100vh - 52px));border:1px solid #d88aa0;border-radius:999px;background:linear-gradient(135deg,#fff0d4,#f8dce4 58%,#efc8d4);color:#815264;padding:9px 13px;font:700 12px/1.2 'DM Sans',sans-serif;white-space:nowrap;box-shadow:0 5px 15px #9a5d7430;transition:transform .18s,box-shadow .18s}
    .mochi-chat-toggle:hover,.mochi-chat-toggle:focus-visible{transform:translateY(-2px);box-shadow:0 8px 20px #9a5d7440;outline:2px solid #d88aa0;outline-offset:2px}
    .mochi-chat-panel{position:fixed;z-index:1001;right:var(--mochi-chat-panel-right,24px);bottom:var(--mochi-chat-panel-bottom,24px);width:min(390px,calc(100vw - 32px));height:min(570px,calc(100dvh - 110px));min-height:360px;display:grid;grid-template-rows:auto auto minmax(80px,1fr) auto auto auto auto;background:var(--paper);color:var(--ink);border:1px solid #dfa6b7;border-radius:24px;box-shadow:0 22px 70px #9a5d7440;overflow:hidden;opacity:0;visibility:hidden;transform:translateY(12px) scale(.985);transform-origin:bottom right;transition:opacity .18s,transform .18s,visibility .18s}
    .mochi-chat-panel.is-open{opacity:1;visibility:visible;transform:translateY(0) scale(1)}
    .mochi-chat-head{display:flex;align-items:center;gap:10px;padding:15px 16px;background:linear-gradient(120deg,#fff0d4,#f7e3e9 60%,var(--paper));border-bottom:1px solid #e9c4d0}
    .mochi-chat-avatar{width:38px;height:38px;display:grid;place-items:center;flex:0 0 auto;border-radius:50%;background:linear-gradient(145deg,#ffe6b7,#f2c6a1);font-size:21px}
    .mochi-chat-heading{min-width:0;flex:1}.mochi-chat-heading strong{display:block;font:600 16px/1.15 Fraunces,serif;color:#895168}.mochi-chat-heading span{display:block;margin-top:3px;font-size:11px;color:var(--muted)}
    .mochi-chat-close,.mochi-chat-name-toggle{border:1px solid color-mix(in srgb,var(--berry) 18%,transparent);border-radius:999px;background:var(--paper);color:var(--ink);padding:8px 10px;font:600 11px 'DM Sans',sans-serif}
    .mochi-chat-memory{display:none;gap:7px;padding:10px 14px;border-bottom:1px solid color-mix(in srgb,var(--berry) 12%,transparent)}.mochi-chat-memory.is-open{display:flex}.mochi-chat-memory input{min-width:0;flex:1;border:1px solid color-mix(in srgb,var(--berry) 24%,transparent);border-radius:12px;padding:9px 10px;background:var(--paper);color:var(--ink);font:13px 'DM Sans',sans-serif}.mochi-chat-memory button{border:0;border-radius:12px;background:var(--berry);color:white;padding:8px 11px;font:600 12px 'DM Sans',sans-serif}
    .mochi-chat-log{min-height:0;overflow:auto;overscroll-behavior:contain;padding:14px;display:flex;flex-direction:column;gap:10px;scrollbar-color:color-mix(in srgb,var(--berry) 35%,transparent) transparent}
    .mochi-chat-message{max-width:88%;padding:10px 12px;border-radius:16px;font-size:13px;line-height:1.5;overflow-wrap:anywhere;white-space:pre-wrap}.mochi-chat-message.bot{align-self:flex-start;background:linear-gradient(135deg,#fff4df,#f9e7ec);border:1px solid #efd0d6;border-bottom-left-radius:5px}.mochi-chat-message.user{align-self:flex-end;background:linear-gradient(135deg,#d887a1,#be718c);color:white;border-bottom-right-radius:5px}
    .mochi-chat-suggestions{display:flex;gap:7px;overflow-x:auto;padding:0 13px 10px;scrollbar-width:thin}.mochi-chat-suggestions button{flex:0 0 auto;border:1px solid color-mix(in srgb,var(--berry) 24%,transparent);border-radius:999px;background:var(--paper);color:var(--berry-dark);padding:7px 10px;font:500 11px 'DM Sans',sans-serif}
    .mochi-chat-emoji-picker{display:flex;justify-content:flex-start;gap:6px;padding:0 13px 8px}.mochi-chat-emoji-picker button{width:31px;height:30px;border:1px solid #ecd0d8;border-radius:11px;background:linear-gradient(145deg,#fff7e6,#fceaf0);font-size:16px;line-height:1}.mochi-chat-emoji-picker button:hover,.mochi-chat-emoji-picker button:focus-visible{outline:2px solid #d88aa0;outline-offset:1px}
    .mochi-chat-form{display:flex;gap:8px;padding:11px 12px;border-top:1px solid #efd0d6;padding-bottom:max(11px,env(safe-area-inset-bottom))}.mochi-chat-form input{min-width:0;flex:1;border:1px solid #e6bdc9;border-radius:14px;background:var(--paper);color:var(--ink);padding:11px 12px;font:13px 'DM Sans',sans-serif}.mochi-chat-form button{border:0;border-radius:14px;background:linear-gradient(135deg,#d887a1,#bc6987);color:white;padding:0 15px;font:700 12px 'DM Sans',sans-serif}.mochi-chat-note{padding:0 14px 9px;font-size:10px;color:var(--muted)}
    @media(max-width:760px){.mochi-chat-toggle{left:auto;top:auto;right:max(14px,env(safe-area-inset-right));bottom:calc(var(--mochi-chat-launch-bottom,110px) + env(safe-area-inset-bottom));z-index:1002;padding:13px 17px;font-size:13px;box-shadow:0 7px 24px #9a5d7440}.mochi-chat-panel{left:auto;right:10px;bottom:calc(var(--mochi-chat-panel-bottom,166px) + env(safe-area-inset-bottom));width:calc(100vw - 20px);height:min(520px,calc(100dvh - var(--mochi-chat-panel-bottom,166px) - 18px - env(safe-area-inset-bottom)));min-height:min(280px,calc(100dvh - var(--mochi-chat-panel-bottom,166px) - 18px - env(safe-area-inset-bottom)));border-radius:21px}.mochi-chat-panel.is-open{transform:translateY(0) scale(1)}}
    @media(max-width:380px){.mochi-chat-heading strong{font-size:15px}.mochi-chat-close{padding:7px 8px}.mochi-chat-form{gap:6px;padding-left:9px;padding-right:9px}.mochi-chat-form button{padding:0 11px}}
    @media(prefers-reduced-motion:reduce){.mochi-chat-panel,.mochi-chat-toggle{transition:none}}
  `;
  document.head.append(style);

  const toggle = existingToggle || document.createElement('button');
  toggle.type = 'button';
  toggle.id = 'mochiChatToggle';
  toggle.className = 'mochi-chat-toggle';
  toggle.setAttribute('aria-controls', 'mochiChatPanel');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.textContent = '🐹 Chat with Mochi ✨';
  if (!existingToggle) document.body.append(toggle);

  const panel = document.createElement('section');
  panel.id = 'mochiChatPanel';
  panel.className = 'mochi-chat-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Chat with Mochi');
  panel.setAttribute('aria-hidden', 'true');
  panel.innerHTML = `
    <header class="mochi-chat-head"><span class="mochi-chat-avatar" aria-hidden="true">🐹</span><div class="mochi-chat-heading"><strong>Chat with Mochi</strong><span>Here for a cozy little chat ✦</span></div><button class="mochi-chat-name-toggle" type="button" aria-expanded="false">Your name</button><button class="mochi-chat-close" type="button" aria-label="Close chat">×</button></header>
    <form class="mochi-chat-memory" aria-label="Remember my name"><input maxlength="24" autocomplete="nickname" aria-label="Name Mochi should remember" placeholder="What should I call you?"><button type="submit">Remember</button></form>
    <div class="mochi-chat-log" role="log" aria-live="polite" aria-relevant="additions text" tabindex="0"></div>
    <div class="mochi-chat-suggestions" aria-label="Try asking Mochi"><button type="button">🌸 How are you?</button><button type="button">🎒 What’s in your satchel?</button><button type="button">🌳 Tell me your story</button><button type="button">🧭 How does the compass work?</button></div>
    <div class="mochi-chat-emoji-picker" aria-label="Add an emoji"><button type="button" aria-label="Add sparkle">✨</button><button type="button" aria-label="Add hamster">🐹</button><button type="button" aria-label="Add heart">💛</button><button type="button" aria-label="Add star">🌟</button><button type="button" aria-label="Add compass">🧭</button><button type="button" aria-label="Add flower">🌸</button></div>
    <div class="mochi-chat-note">Recent chat is saved on this device · Mochi remembers the conversation</div>
    <form class="mochi-chat-form"><input maxlength="240" autocomplete="off" aria-label="Message for Mochi" placeholder="Ask about Mochi’s story or tools…" required><button type="submit">Send</button></form>`;
  document.body.append(panel);

  const log = panel.querySelector('.mochi-chat-log');
  const chatForm = panel.querySelector('.mochi-chat-form');
  const messageInput = chatForm.querySelector('input');
  const nameForm = panel.querySelector('.mochi-chat-memory');
  const nameInput = nameForm.querySelector('input');
  const nameToggle = panel.querySelector('.mochi-chat-name-toggle');
  const closeButton = panel.querySelector('.mochi-chat-close');
  const controlRail = document.querySelector('.delight-controls');
  const syncChatDock = () => {
    if (!controlRail) return;
    const railRect = controlRail.getBoundingClientRect();
    const toggleRect = toggle.getBoundingClientRect();
    const root = document.documentElement;
    if (window.innerWidth > 760) {
      const sideLeft = Math.ceil(railRect.right + 12);
      const fitsBesideRail = sideLeft + toggleRect.width <= window.innerWidth - 12;
      const left = fitsBesideRail ? sideLeft : Math.max(12, Math.round((window.innerWidth - toggleRect.width) / 2));
      const top = fitsBesideRail
        ? Math.round(railRect.top + (railRect.height - toggleRect.height) / 2)
        : Math.max(12, Math.round(railRect.top - toggleRect.height - 12));
      root.style.setProperty('--mochi-chat-left', left + 'px');
      root.style.setProperty('--mochi-chat-top', top + 'px');
      root.style.setProperty('--mochi-chat-panel-right', Math.max(10, Math.round(window.innerWidth - left - toggleRect.width)) + 'px');
      root.style.setProperty('--mochi-chat-panel-bottom', Math.max(16, Math.round(window.innerHeight - top + 12)) + 'px');
      return;
    }
    const launchBottom = Math.max(12, Math.ceil(window.innerHeight - railRect.top + 10));
    const panelBottom = launchBottom + Math.ceil(toggleRect.height) + 12;
    root.style.setProperty('--mochi-chat-launch-bottom', launchBottom + 'px');
    root.style.setProperty('--mochi-chat-panel-bottom', panelBottom + 'px');
  };
  syncChatDock();
  window.addEventListener('resize', syncChatDock, { passive: true });
  if (window.visualViewport) window.visualViewport.addEventListener('resize', syncChatDock, { passive: true });
  if (controlRail && 'ResizeObserver' in window) new ResizeObserver(syncChatDock).observe(controlRail);
  const saveName = name => {
    visitorName = name.trim().replace(/[<>\u0000-\u001f]/g, '').slice(0, 24);
    if (!visitorName) return false;
    safeWrite(STORE_NAME, visitorName);
    return true;
  };
  const renderMessage = (text, who) => {
    const bubble = document.createElement('div');
    bubble.className = `mochi-chat-message ${who}`;
    bubble.textContent = text;
    log.append(bubble);
    while (log.children.length > MAX_MESSAGES) log.firstElementChild.remove();
    log.scrollTop = log.scrollHeight;
  };
  const storedConversation = (() => {
    try {
      const parsed = JSON.parse(safeRead(STORE_CHAT) || '[]');
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(item => item && (item.who === 'user' || item.who === 'bot') && typeof item.text === 'string')
        .map(item => ({ who: item.who, text: item.text.slice(0, 700) })).slice(-MAX_MESSAGES);
    } catch (_) { return []; }
  })();
  let conversation = storedConversation;
  const addMessage = (text, who) => {
    renderMessage(text, who);
    conversation.push({ who, text: String(text).slice(0, 700) });
    conversation = conversation.slice(-MAX_MESSAGES);
    safeWrite(STORE_CHAT, JSON.stringify(conversation));
  };
  conversation.forEach(item => renderMessage(item.text, item.who));
  const greet = () => {
    if (returning) {
      return visitorName
        ? `Squeak, welcome back, ${visitorName}! I saved you a sunny spot in the workshop. What shall we dream up today? ✨`
        : 'Squeak, welcome back, Explorer! The workshop saved you a sunny spot. What shall we dream up today? ✨';
    }
    return visitorName
      ? `Hello, ${visitorName}! I’m Mochi, your pocket artificer. Ask me about my tools, the old oak workshop, or our travels. ✨`
      : 'Squeak! Hello, Explorer! I’m Mochi, your pocket artificer. Ask me about my satchel, the old oak workshop, or our travels. ✨';
  };
  const emojiNoteFor = raw => {
    if (!/[\p{Extended_Pictographic}\p{Regional_Indicator}]/u.test(raw)) return '';
    if (/🐹/.test(raw)) return 'Aww, a tiny hamster buddy! That’s the cutest little squeak. 🐹';
    if (/[✨🌟⭐]/u.test(raw)) return 'Ooh, a little stardust sparkle! I’m tucking that bit of magic into my satchel. ✨';
    if (/[💛❤️💕💖💗]/u.test(raw)) return 'Aww, a warm little heart! Mochi is sending one cozy hug right back. 💛';
    if (/[🌸🌷🌼🌻]/u.test(raw)) return 'What a lovely little flower! It would brighten my oak-tree workshop. 🌸';
    if (/[🧭🗺️]/u.test(raw)) return 'A compass for our next adventure! I’ll bring the tools while you lead the way. 🧭';
    if (/[🎒👜]/u.test(raw)) return 'A satchel! Mine is packed with tiny tools, stardust, and one emergency oat biscuit. 🎒';
    if (/[😂🤣😄😆😊🙂😉]/u.test(raw)) return 'That smile made my whiskers wiggle! The workshop feels brighter already. 😊';
    if (/[🥺😢😭😔😞]/u.test(raw)) return 'Aww, Explorer, that looks like a tender moment. Mochi is here with a little lantern and a cozy listening ear. 🏮';
    if (/🐾/.test(raw)) return 'Tiny pawprints! I’ll follow them carefully—perhaps they lead to a new adventure. 🐾';
    return 'Aww, what a cute little emoji! I’m keeping its cheerful feeling in my workshop. ✨';
  };
  let emojiReactionCount = 0;
  const occasionalFollowUp = (raw, reply, emojiNote) => {
    const text = raw.toLowerCase().replace(/[’']/g, '').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
    if (reply && reply.includes('?')) return '';
    if (emojiNote) {
      emojiReactionCount += 1;
      return emojiReactionCount % 3 === 0 ? 'Anything you’re curious about in my little workshop?' : '';
    }
    if (/^(hi|hello|hey|hiya|good morning|good evening|squeak)$/.test(text))
      return 'What shall we dream up together today?';
    if (/\b(who are you|your name|what are you)\b/.test(text))
      return 'Would you like to hear about one of my tiny inventions?';
    if (/\b(story|backstory|where.*live|oak|workshop|home)\b/.test(text))
      return 'Want to hear how one of those little finds became a useful tool?';
    if (/\b(help|question|ask)\b/.test(text))
      return 'Which little mystery shall we explore?';
    return '';
  };
  const topicFromText = text => {
    if (/\b(satchel|bag)\b|\bwhat do you carry\b|\bwhat is in your (bag|satchel)\b/.test(text)) return 'satchel';
    if (/\b(compass|wayfinder|direction|find your way)\b/.test(text)) return 'compass';
    if (/\b(lantern|starlight jar|jar lantern|stardust)\b/.test(text)) return 'lantern';
    if (/\b(echo pebble|pebble|soundscape|rain sounds)\b/.test(text)) return 'pebbles';
    if (/\b(story|backstory|workshop|oak tree|where do you live|where are you from|where did you grow up)\b/.test(text)) return 'story';
    if (/\b(great explorer|chief cartographer|our journey|our adventure|adventure together|map)\b/.test(text)) return 'journey';
    if (/\b(pip|red panda)\b/.test(text)) return 'pip';
    if (/\b(snack|biscuit|oat|food|eat)\b/.test(text)) return 'snack';
    if (/\b(who are you|your name|what are you|about yourself|about you)\b/.test(text)) return 'identity';
    if (/\b(what do you do|your job|your work|what do you make|what can you do)\b/.test(text)) return 'craft';
    return '';
  };
  let lastTopic = [...conversation].reverse().filter(item => item.who === 'user').map(item => {
    const normalized = item.text.toLowerCase().replace(/[’']/g, '').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
    return topicFromText(normalized);
  }).find(Boolean) || '';
  const topicFollowUp = {
    satchel: 'Of course! The Compass of Comfort helps find a safe place, the tiny telescope spots distant trails, and the star lanterns make a gentle light. I keep the little tools snug between the river glass and brass gears. 🎒',
    compass: 'It listens for what would make a place feel safe: shelter, a familiar voice, or a kind face. It does not point to north; it points toward a little more comfort. 🧭',
    lantern: 'I make the glow from a pinch of gathered stardust and a careful brass wick. It shines just brightly enough to guide one step while letting the forest stay peaceful. ✨',
    pebbles: 'Each one holds a small, soothing sound—like rain on leaves or a crackling fireside. A gentle squeeze plays it, then the sound fades away. 🔊',
    story: 'I started making them after travelers came through the oak feeling tired and lost. A warm light or a small useful tool can make the next step feel possible. 🌳',
    journey: 'You explore and bring back curious materials; I turn them into useful little comforts. Then we use them to keep going and discover what lies beyond the next bend. 🗺️',
    pip: 'Pip is brave, curious, and very good at finding interesting trails. We trade stories when our adventures cross, usually with a few oat-biscuit crumbs nearby. 🐾',
    snack: 'Oat biscuits are my favorite, especially when they are still a little warm. I keep one in my satchel for long walks—and one spare for emergencies. 🍪',
    identity: 'I’m a hamster, inventor, and friend to any explorer who needs a hand. My workshop is inside an old oak, and my satchel is nearly always too full. 🐹',
    craft: 'I look for a small problem on the journey, then make a simple tool to help: a steady light, a comforting compass, or a pebble that carries a calming sound. ✨'
  };
  const replyTo = raw => {
    const text = raw.toLowerCase().replace(/[’']/g, '').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
    if (!text) return null;
    if (/^(tell me more|more|why|how so|what else|can you explain|explain more|go on|and then|what happened next|continue)\b/.test(text) && lastTopic && topicFollowUp[lastTopic])
      return topicFollowUp[lastTopic];
    const nameMatch = raw.match(/^\s*(?:my name is|call me)\s+([\p{L}][\p{L}' -]{0,22})/iu);
    if (nameMatch) {
      const candidate = nameMatch[1].trim().split(/\s+(?:and|but|i|my|please)\b/i)[0].trim();
      if (saveName(candidate)) return `I’ll remember you as ${visitorName} when you visit this workshop on this browser. I’m glad you told me! ✨`;
    }
    if (/^(hi|hello|hey|hiya|good morning|good evening|squeak)$/.test(text) || /\b(how are you|how are things)\b/.test(text))
      return `I’m cozy and cheerful, ${visitorName || 'Explorer'}! I’ve been polishing a tiny compass and saving a little stardust for our next trip. How are you? 🌟`;
    if (/\b(thank|thanks|thank you)\b/.test(text))
      return 'You’re very welcome, Explorer. That made my whiskers wiggle! ✨';
    const asksAQuestion = /^(what|whats|who|whos|where|wheres|when|whens|why|whys|how|hows|can|could|do|does|did|is|are|will|would|tell me|show me|explain|describe|talk about|what about|more about)\b/.test(text) || /\?\s*$/.test(raw);
    if (!asksAQuestion) return 'Squeak! I’m best at questions about my workshop, tools, Pip, or our adventures. Ask me one of those and I’ll do my best to help. 🐹';
    const answerOnTopic = (topic, answer) => { lastTopic = topic; return answer; };
    if (/\b(who are you|your name|what are you|about yourself|about you|are you a (hamster|mouse|human))\b/.test(text))
      return answerOnTopic('identity', 'I’m Mochi, a round little hamster and pocket artificer. I make tiny comforts for our journeys through the unknown—and I keep a biscuit tucked away for emergencies. 🐹');
    if (/\b(what do you do|your job|your work|what do you make|what can you do|what is your craft)\b/.test(text))
      return answerOnTopic('craft', 'I turn river glass, fallen stardust, and curious little finds into pocket-sized tools. A warm light, a helpful compass—small things to make a long journey feel kinder. ✨');
    if (/\b(how are you|how do you feel|are you okay)\b/.test(text))
      return answerOnTopic('wellbeing', 'I feel snug as a button in my oak-tree workshop, thank you for asking! My cheeks are warm and my tool satchel is ready. 💛');
    if (/\b(satchel|bag)\b|\b(what|which).{0,35}\b(tools|instruments)\b|\bwhat do you carry\b|\bwhat is inside (your|the) (bag|satchel)\b/.test(text))
      return answerOnTopic('satchel', 'My satchel has the Compass of Comfort, a tiny telescope, smooth river-glass pieces, brass gears, star lanterns, and a few spring-loaded helpers. Everything has a cozy purpose! 🎒');
    if (/\b(compass|wayfinder|direction|find your way)\b/.test(text))
      return answerOnTopic('compass', 'The Compass of Comfort points toward a safe place, a warm shelter, or a friendly face. It helps when the map can’t tell you where you’ll feel at home. 🧭');
    if (/\b(lantern|starlight jar|jar lantern|stardust)\b/.test(text))
      return answerOnTopic('lantern', 'My Starlight Jar-Lanterns hold a gentle, steady glow. They light the next step without startling the sleeping forest. ✨');
    if (/\b(echo pebble|pebble|soundscape|rain sounds)\b/.test(text))
      return answerOnTopic('pebbles', 'Echo Pebbles are smooth porcelain keepsakes with calming rain or fireside sounds inside. Give one a gentle squeeze when the road feels long. 🔊');
    if (/\b(story|backstory|workshop|oak tree|where do you live|where are you from|where did you grow up)\b/.test(text))
      return answerOnTopic('story', 'I grew up in a sunlit workshop tucked into an ancient oak. Travelers sometimes felt weary or lost, so I began making small, warm things to help them find their way home. 🌳');
    if (/\b(great explorer|chief cartographer|our journey|our adventure|adventure together|map)\b/.test(text))
      return answerOnTopic('journey', 'You’re the Great Explorer and Chief Cartographer: you discover new places and gather special materials. I turn your finds into little tools for the next leg of our journey. 🗺️');
    if (/\b(pip|red panda)\b/.test(text))
      return answerOnTopic('pip', 'Pip the Red Panda is a dear friend and fellow adventurer. I’m always happy when our paths meet beneath the stars. 🐾');
    if (/\b(snack|biscuit|oat|food|eat)\b|\b(favorite|favourite) (thing to eat|food|snack)\b/.test(text))
      return answerOnTopic('snack', 'I like nibbling a little oat biscuit after a long day at the workbench. Crumbs are excellent fuel for tiny inventions! 🍪');
    if (/\b(help|question|ask)\b/.test(text))
      return answerOnTopic('help', 'You can ask who I am, what I make, what’s in my satchel, how the Wayfinder works, or how our journey began. I’m a little workshop storyteller, not an all-knowing oracle. 💫');
    return 'Squeak! I may not know that one yet. Try asking about my workshop, tools, Pip, or our adventures, and I’ll do my best to help. 🐹';
  };

  if (!conversation.length) addMessage(greet(), 'bot');
  if (visitorName) { nameInput.value = visitorName; nameToggle.textContent = 'Hi, ' + visitorName; }
  if (returning) { nameForm.classList.add('is-open'); nameToggle.setAttribute('aria-expanded', 'true'); }

  const openChat = () => {
    panel.classList.add('is-open');
    panel.setAttribute('aria-hidden', 'false');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.textContent = '🐹 Mochi is here ✨';
    syncChatDock();
    messageInput.focus({ preventScroll: true });
  };
  const closeChat = () => {
    panel.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.textContent = '🐹 Chat with Mochi ✨';
    syncChatDock();
    toggle.focus({ preventScroll: true });
  };
  toggle.addEventListener('click', () => panel.classList.contains('is-open') ? closeChat() : openChat());
  closeButton.addEventListener('click', closeChat);
  nameToggle.addEventListener('click', () => {
    const open = nameForm.classList.toggle('is-open');
    nameToggle.setAttribute('aria-expanded', String(open));
    if (open) nameInput.focus();
  });
  nameForm.addEventListener('submit', event => {
    event.preventDefault();
    if (!saveName(nameInput.value)) { nameInput.focus(); return; }
    nameInput.value = visitorName;
    nameToggle.textContent = 'Hi, ' + visitorName;
    addMessage(`I’ll remember your name, ${visitorName}, on this browser. Next time, I can welcome you back! 💛`, 'bot');
  });
  chatForm.addEventListener('submit', event => {
    event.preventDefault();
    const text = messageInput.value.trim().slice(0, MAX_INPUT);
    if (!text) return;
    addMessage(text, 'user');
    messageInput.value = '';
    window.setTimeout(() => {
      const reply = replyTo(text);
      const emojiNote = emojiNoteFor(text);
      if (!reply && !emojiNote) return;
      const parts = [];
      if (emojiNote) parts.push(emojiNote);
      if (reply) parts.push(reply);
      const followUp = occasionalFollowUp(text, reply, emojiNote);
      if (followUp) parts.push(followUp);
      addMessage(parts.join(' '), 'bot');
    }, 220);
  });
  panel.querySelectorAll('.mochi-chat-suggestions button').forEach(button => {
    button.addEventListener('click', () => {
      messageInput.value = button.textContent;
      chatForm.requestSubmit();
    });
  });
  panel.querySelectorAll('.mochi-chat-emoji-picker button').forEach(button => {
    button.addEventListener('click', () => {
      const emoji = button.textContent;
      const start = messageInput.selectionStart ?? messageInput.value.length;
      const end = messageInput.selectionEnd ?? start;
      messageInput.value = messageInput.value.slice(0, start) + emoji + messageInput.value.slice(end);
      const cursor = start + emoji.length;
      messageInput.setSelectionRange(cursor, cursor);
      messageInput.focus();
    });
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && panel.classList.contains('is-open')) closeChat();
  });
})();
