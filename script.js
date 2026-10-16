// Always open the page at the top, even after a reload or with #dates in the URL
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
if (location.hash) history.replaceState(null, '', location.pathname + location.search);
window.addEventListener('load', () => window.scrollTo(0, 0));

// In-page links (e.g. "Dates") scroll to their section without adding #hash to the URL
document.addEventListener('click', (event) => {
  const link = event.target.closest('a[href^="#"]');
  const id = link && link.getAttribute('href').slice(1);
  const target = id && document.getElementById(id);
  if (!target) return;
  event.preventDefault();
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
});

// Floating jump menu: appears once the top nav is out of view
(() => {
  const jump = document.querySelector('.jump');
  const toggle = jump && jump.querySelector('.jump__toggle');
  const menu = jump && jump.querySelector('.jump__menu');
  const topNav = document.querySelector('.nav');
  if (!jump || !toggle || !menu || !topNav) return;

  function setOpen(open) {
    toggle.setAttribute('aria-expanded', open);
    menu.hidden = !open;
  }

  toggle.addEventListener('click', () => setOpen(menu.hidden));
  menu.addEventListener('click', (event) => {
    if (event.target.closest('a')) setOpen(false);
  });
  document.addEventListener('click', (event) => {
    if (!jump.contains(event.target)) setOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !menu.hidden) {
      setOpen(false);
      toggle.focus();
    }
  });

  new IntersectionObserver(([entry]) => {
    jump.classList.toggle('is-visible', !entry.isIntersecting);
    if (entry.isIntersecting) setOpen(false);
  }).observe(topNav);
})();

// Retro cassette-deck spectrum for the single's audio player
(() => {
  const canvas = document.querySelector('.tape-deck');
  const audio = document.querySelector('.feature__audio');
  if (!canvas || !audio) return;

  const ctx = canvas.getContext('2d');
  const COLORS = {
    panel: '#2c2724', window: '#1b1715', cream: '#e9d6b0', mustard: '#c9973f',
    tomato: '#b5523b', tape: '#5a4632', teal: '#7aa4ad', faint: 'rgba(233, 214, 176, 0.08)',
  };
  const BANDS = 12, SEGMENTS = 9;
  const levels = new Array(BANDS).fill(0);
  const peaks = new Array(BANDS).fill(0);
  let analyser, freq, audioCtx, angle = 0, last = performance.now(), running = false;

  function setupAudio() {
    if (audioCtx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    audioCtx = new AC();
    const source = audioCtx.createMediaElementSource(audio);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.78;
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
    freq = new Uint8Array(analyser.frequencyBinCount);
  }

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  function updateLevels(dt) {
    if (analyser && !audio.paused) {
      analyser.getByteFrequencyData(freq);
      const nyquist = audioCtx.sampleRate / 2;
      for (let b = 0; b < BANDS; b++) {
        // logarithmic bands from 40 Hz to 14 kHz
        const lo = 40 * Math.pow(14000 / 40, b / BANDS);
        const hi = 40 * Math.pow(14000 / 40, (b + 1) / BANDS);
        const i0 = Math.floor(lo / nyquist * freq.length);
        const i1 = Math.max(i0 + 1, Math.ceil(hi / nyquist * freq.length));
        let sum = 0;
        for (let i = i0; i < i1; i++) sum += freq[i];
        const v = Math.min(1, (sum / (i1 - i0)) / 255 * (1 + b * 0.06));
        levels[b] = Math.max(v, levels[b] - dt * 2.2);
      }
    } else {
      for (let b = 0; b < BANDS; b++) levels[b] = Math.max(0, levels[b] - dt * 1.5);
    }
    for (let b = 0; b < BANDS; b++) peaks[b] = Math.max(levels[b], peaks[b] - dt * 0.5);
  }

  function reel(cx, cy, R, packR, rot) {
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.window; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(233, 214, 176, 0.25)'; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, packR, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.tape; ctx.fill();
    const hubR = R * 0.34;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
    ctx.beginPath(); ctx.arc(0, 0, hubR, 0, Math.PI * 2); ctx.fillStyle = COLORS.cream; ctx.fill();
    ctx.fillStyle = COLORS.window;
    for (let k = 0; k < 6; k++) { // hub teeth
      ctx.save(); ctx.rotate(k * Math.PI / 3);
      ctx.fillRect(-hubR * 0.12, -hubR * 0.62, hubR * 0.24, hubR * 0.3);
      ctx.restore();
    }
    ctx.beginPath(); ctx.arc(0, 0, hubR * 0.28, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function draw() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    ctx.clearRect(0, 0, w, h);

    // panel
    ctx.fillStyle = COLORS.panel;
    ctx.beginPath(); ctx.roundRect(0, 0, w, h, 14); ctx.fill();
    ctx.fillStyle = COLORS.teal; ctx.fillRect(0, h * 0.17, w, 3);

    // label strip
    ctx.fillStyle = COLORS.cream;
    ctx.font = `700 ${Math.max(9, h * 0.075)}px "Roboto Condensed", sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left'; ctx.fillText('THE 5TO8S · INTO THE BLACKHOLE', w * 0.04, h * 0.09);
    ctx.textAlign = 'right'; ctx.fillText('STEREO · TYPE I', w * 0.96, h * 0.09);

    // reels: tape moves from left to right as the song plays
    const p = audio.duration ? audio.currentTime / audio.duration : 0;
    const R = h * 0.31, hub = R * 0.34, full = R * 0.94;
    const cy = h * 0.58;
    reel(w * 0.16, cy, R, hub + (full - hub) * (1 - p), angle);
    reel(w * 0.84, cy, R, hub + (full - hub) * p, angle * 1.15);

    // spectrum window
    const wx = w * 0.3, wy = h * 0.27, ww = w * 0.4, wh = h * 0.63;
    ctx.fillStyle = COLORS.window;
    ctx.beginPath(); ctx.roundRect(wx, wy, ww, wh, 6); ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(233, 214, 176, 0.25)'; ctx.stroke();

    const pad = ww * 0.05, gap = ww * 0.018;
    const bw = (ww - pad * 2 - gap * (BANDS - 1)) / BANDS;
    const sh = (wh - pad * 2) / SEGMENTS;
    for (let b = 0; b < BANDS; b++) {
      const x = wx + pad + b * (bw + gap);
      const lit = Math.round(levels[b] * SEGMENTS);
      const peak = Math.min(SEGMENTS - 1, Math.round(peaks[b] * SEGMENTS) - 1);
      for (let s = 0; s < SEGMENTS; s++) {
        const y = wy + wh - pad - (s + 1) * sh;
        const color = s >= SEGMENTS - 1 ? COLORS.tomato : s >= SEGMENTS - 3 ? COLORS.mustard : COLORS.cream;
        ctx.fillStyle = s < lit || (s === peak && peak > 0) ? color : COLORS.faint;
        ctx.fillRect(x, y + sh * 0.18, bw, sh * 0.64);
      }
    }
  }

  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (!audio.paused) angle += dt * 2.4;
    updateLevels(dt);
    draw();
    const settling = levels.some(v => v > 0.001) || peaks.some(v => v > 0.001);
    if (!audio.paused || settling) requestAnimationFrame(frame);
    else running = false;
  }

  function start() {
    if (running) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(frame);
  }

  audio.addEventListener('play', () => {
    try { setupAudio(); } catch (e) { /* spectrum stays idle, reels still spin */ }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    start();
  });
  audio.addEventListener('pause', start);
  audio.addEventListener('seeked', draw);
  audio.addEventListener('loadedmetadata', draw);

  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
  else window.addEventListener('resize', resize);
  document.fonts && document.fonts.ready.then(draw);
  resize();
})();

// Old Cooking Tapes clips: click the video to play/pause
(() => {
  document.querySelectorAll('.screen').forEach((screen) => {
    const video = screen.querySelector('.screen__video');
    const button = screen.querySelector('.screen__button');
    const label = button.getAttribute('aria-label').replace(/^Play /, '');

    function render() {
      screen.classList.toggle('is-playing', !video.paused);
      button.setAttribute('aria-label', `${video.paused ? 'Play' : 'Pause'} ${label}`);
    }

    button.addEventListener('click', () => (video.paused ? video.play() : video.pause()));
    video.addEventListener('play', render);
    video.addEventListener('pause', render);
    video.addEventListener('ended', () => { video.currentTime = 0; });
  });

  // Only one clip (or the single, or the promo) plays at a time
  document.addEventListener('play', (event) => {
    document.querySelectorAll('video, audio').forEach((media) => {
      if (media !== event.target) media.pause();
    });
  }, true);
})();

// Mailing list signup: submit in the background and confirm in place
(() => {
  const form = document.querySelector('.signup');
  const status = form && form.querySelector('.signup__status');
  const button = form && form.querySelector('.signup__button');
  if (!form || !status || !button) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    button.disabled = true;
    let ok = false;
    try {
      const response = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' },
      });
      ok = response.ok;
    } catch {
      ok = false;
    }
    button.disabled = false;
    status.hidden = false;
    if (ok) {
      form.reset();
      status.textContent = 'Thanks! You’re on the list. See you at the next show.';
    } else {
      status.textContent = 'Something went wrong. Please try again, or email booking@the5to8s.ongaku.band.';
    }
  });
})();
