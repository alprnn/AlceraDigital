(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  $('#yr').textContent = new Date().getFullYear();

  /* WhatsApp: hazır mesajlar */
  const WA = '905300119472';
  const waLink = msg => `https://wa.me/${WA}?text=${encodeURIComponent(msg)}`;
  const WA_DEFAULT = 'Merhaba Alcera Digital 👋 Web sitenizden ulaşıyorum. Projem hakkında bilgi ve fiyat teklifi almak istiyorum.';
  $$('a[href^="https://wa.me/"]').forEach(a => a.href = waLink(a.dataset.msg || WA_DEFAULT));
  const svcMsg = row => `Merhaba Alcera Digital 👋 "${$('.svc-title', row).textContent.trim()}" hizmetiniz hakkında bilgi ve fiyat teklifi almak istiyorum.`;
  $$('.svc').forEach(row => {
    const a = document.createElement('a');
    a.className = 'svc-wa'; a.target = '_blank'; a.rel = 'noopener';
    a.href = waLink(svcMsg(row));
    a.innerHTML = '<svg><use href="#i-wa"/></svg>WhatsApp\'tan Teklif Al';
    a.addEventListener('click', e => e.stopPropagation());
    $('.svc-desc', row).appendChild(document.createElement('br'));
    $('.svc-desc', row).appendChild(a);
  });

  /* Split headings into words */
  $$('.split').forEach(el => {
    const walk = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span'); w.className = 'w';
            const i = document.createElement('span'); i.textContent = part;
            w.appendChild(i); frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
      });
    };
    walk(el);
    $$('.w > span', el).forEach((s, i) => s.style.transitionDelay = (i * 0.045) + 's');
  });

  /* Manifesto words */
  const man = $('#manifesto');
  if (man) man.innerHTML = man.textContent.trim().split(/\s+/).map(w => {
    const hl = /^\[.*\]$/.test(w);
    const t = w.replace(/[\[\]]/g, '');
    return `<span class="mw${hl ? ' hl' : ''}">${t}</span>`;
  }).join(' ');
  const mws = man ? $$('.mw', man) : [];

  /* Preloader: yalnızca siteye ilk girişte; sayfalar arası geçişte tekrar etmez */
  const loader = $('#loader'), num = $('#loaderNum'), bar = $('#loaderBar');
  const seen = (() => { try { return sessionStorage.getItem('alcera_seen') === '1'; } catch { return false; } })();
  try { sessionStorage.setItem('alcera_seen', '1'); } catch {}
  const finish = () => {
    if (loader) { loader.classList.add('done'); setTimeout(() => loader.remove(), 1200); }
    document.body.classList.remove('loading');
    document.body.classList.add('ready');
    // başka sayfadan /#surec gibi bir bölüme gelindiyse oraya kaydır
    const target = location.hash.length > 1 && document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (target) requestAnimationFrame(() => target.scrollIntoView());
  };
  if (!loader || seen || location.hash.length > 1) {
    if (loader) loader.style.display = 'none';
    finish();
  } else {
    const start = performance.now(), dur = reduce ? 200 : 1600;
    (function tick(now) {
      const p = Math.min(1, (now - start) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      num.textContent = Math.round(e * 100);
      bar.style.width = (e * 100) + '%';
      p < 1 ? requestAnimationFrame(tick) : setTimeout(finish, 250);
    })(start);
  }

  /* Reveal on scroll */
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      const el = en.target;
      const sibs = el.parentElement ? $$(':scope > .reveal', el.parentElement) : [];
      const idx = Math.max(0, sibs.indexOf(el));
      setTimeout(() => el.classList.add('in'), (idx % 5) * 90);
      if (el.classList.contains('count')) countUp(el);
      io.unobserve(el);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
  $$('.reveal, .split, #steps, #giant, .count').forEach(el => io.observe(el));

  function countUp(el) {
    const to = +el.dataset.to, d = reduce ? 1 : 1800, s = performance.now();
    (function f(n) {
      const p = Math.min(1, (n - s) / d);
      el.textContent = Math.round(to * (1 - Math.pow(1 - p, 4)));
      if (p < 1) requestAnimationFrame(f);
    })(s);
  }

  /* Scroll: progress, nav, manifesto, wa button */
  const nav = $('#nav'), prog = $('#progress'), wa = $('#waFloat');
  let lastY = 0, ticking = false;
  const onScroll = () => {
    const y = scrollY, h = document.documentElement.scrollHeight - innerHeight;
    prog.style.transform = `scaleX(${h > 0 ? y / h : 0})`;
    nav.classList.toggle('scrolled', y > 30);
    if (!document.body.classList.contains('menu-open')) nav.classList.toggle('hide', y > lastY && y > 400);
    wa.classList.toggle('show', y > innerHeight * 0.6);
    lastY = y;
    if (man) {
      const r = man.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (innerHeight * 0.85 - r.top) / (r.height + innerHeight * 0.35)));
      const lit = Math.floor(p * mws.length * 1.05);
      mws.forEach((w, i) => w.classList.toggle('on', i < lit));
    }
    ticking = false;
  };
  addEventListener('scroll', () => { if (!ticking) { requestAnimationFrame(onScroll); ticking = true; } }, { passive: true });
  onScroll();

  /* Mobile menu */
  const burger = $('#burger');
  burger.addEventListener('click', () => {
    const open = document.body.classList.toggle('menu-open');
    burger.setAttribute('aria-label', open ? 'Menüyü kapat' : 'Menüyü aç');
    document.body.style.overflow = open ? 'hidden' : '';
  });
  $$('#mmenu a').forEach(a => a.addEventListener('click', () => {
    document.body.classList.remove('menu-open');
    document.body.style.overflow = '';
  }));

  /* Service rows: tap to open on touch */
  $$('.svc').forEach(row => row.addEventListener('click', () => {
    if (fine) { window.open(waLink(svcMsg(row)), '_blank', 'noopener'); return; }
    const was = row.classList.contains('open');
    $$('.svc').forEach(r => r.classList.remove('open'));
    if (!was) row.classList.add('open');
  }));

  if (!fine || reduce) { initField(false); return; }

  /* Custom cursor */
  const cur = $('#cursor'), dot = $('#cursorDot');
  let mx = innerWidth / 2, my = innerHeight / 2, cx = mx, cy = my;
  addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; dot.style.transform = `translate(${mx}px,${my}px) translate(-50%,-50%)`; });
  (function loop() {
    cx += (mx - cx) * 0.16; cy += (my - cy) * 0.16;
    cur.style.transform = `translate(${cx}px,${cy}px) translate(-50%,-50%)`;
    requestAnimationFrame(loop);
  })();
  $$('a, button, .svc').forEach(el => {
    el.addEventListener('mouseenter', () => { cur.classList.add('hover'); cur.textContent = el.dataset.cursor || (el.classList.contains('svc') ? 'Teklif' : ''); });
    el.addEventListener('mouseleave', () => { cur.classList.remove('hover'); cur.textContent = ''; });
  });

  /* Magnetic buttons */
  $$('.magnetic').forEach(b => {
    b.addEventListener('mousemove', e => {
      const r = b.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
      b.style.transform = `translate(${x * 0.3}px,${y * 0.4}px)`;
    });
    b.addEventListener('mouseleave', () => {
      b.style.transition = 'transform .7s cubic-bezier(.16,1,.3,1), color .5s';
      b.style.transform = '';
      setTimeout(() => b.style.transition = '', 700);
    });
  });

  /* Service hover preview */
  const pv = $('#preview'), pvi = $('#previewInner'), svcWrap = $('#services');
  if (pv && svcWrap) {
    let px = 0, py = 0, tx = 0, ty = 0;
    svcWrap.addEventListener('mouseenter', () => pv.classList.add('show'));
    svcWrap.addEventListener('mouseleave', () => pv.classList.remove('show'));
    $$('.svc').forEach(r => r.addEventListener('mouseenter', () => { pvi.style.transform = `translateY(${-r.dataset.pv * 210}px)`; }));
    addEventListener('mousemove', e => { tx = e.clientX; ty = e.clientY; });
    (function pl() {
      px += (tx - px) * 0.12; py += (ty - py) * 0.12;
      const rot = Math.max(-12, Math.min(12, (tx - px) * 0.08));
      pv.style.left = px + 'px'; pv.style.top = py + 'px';
      pv.style.rotate = rot + 'deg';
      requestAnimationFrame(pl);
    })();
  }

  /* Tilt + glow on stat cards */
  $$('.tilt').forEach(c => {
    c.addEventListener('mousemove', e => {
      const r = c.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      c.style.transform = `perspective(900px) rotateX(${(0.5 - y) * 10}deg) rotateY(${(x - 0.5) * 12}deg)`;
      c.style.setProperty('--mx', x * 100 + '%'); c.style.setProperty('--my', y * 100 + '%');
    });
    c.addEventListener('mouseleave', () => c.style.transform = '');
  });

  /* Hero orbs parallax */
  const oa = $('#orbA'), ob = $('#orbB');
  if (oa && ob) addEventListener('mousemove', e => {
    const x = e.clientX / innerWidth - 0.5, y = e.clientY / innerHeight - 0.5;
    oa.style.translate = `${x * -60}px ${y * -60}px`;
    ob.style.translate = `${x * 50}px ${y * 50}px`;
  });

  initField(true);

  /* Interactive dot field */
  function initField(interactive) {
    const cv = $('#field');
    if (!cv) return;
    const ctx = cv.getContext('2d');
    let w, h, dpr, pts = [], mouse = { x: -999, y: -999 }, visible = true;
    const gap = 34;
    const build = () => {
      dpr = Math.min(devicePixelRatio || 1, 2);
      w = cv.clientWidth; h = cv.clientHeight;
      cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      pts = [];
      for (let y = gap / 2; y < h; y += gap) for (let x = gap / 2; x < w; x += gap) pts.push({ ox: x, oy: y, x, y });
    };
    build(); addEventListener('resize', build);
    if (interactive) {
      cv.parentElement.addEventListener('mousemove', e => { const r = cv.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
      cv.parentElement.addEventListener('mouseleave', () => { mouse.x = mouse.y = -999; });
    }
    new IntersectionObserver(([en]) => visible = en.isIntersecting).observe(cv);
    let t = 0;
    (function draw() {
      requestAnimationFrame(draw);
      if (!visible) return;
      t += reduce ? 0 : 0.012;
      ctx.clearRect(0, 0, w, h);
      for (const p of pts) {
        const dx = p.ox - mouse.x, dy = p.oy - mouse.y, d = Math.hypot(dx, dy), R = 160;
        let tx = p.ox, ty = p.oy + Math.sin(t + p.ox * 0.012) * 3, a = 0.13, s = 1.1;
        if (d < R) { const f = (1 - d / R); tx += dx / d * f * 26; ty += dy / d * f * 26; a += f * 0.75; s += f * 1.6; }
        p.x += (tx - p.x) * 0.12; p.y += (ty - p.y) * 0.12;
        ctx.fillStyle = d < R ? `rgba(212,255,58,${a})` : `rgba(255,255,255,${a})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, s, 0, 6.283); ctx.fill();
      }
    })();
  }
})();
