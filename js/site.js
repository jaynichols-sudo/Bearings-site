// Bearings site. The compass, Today's five, Ask and the federal map all run the real
// Bearings engine (js/engine.js) on its built-in sample network of made-up people.
(() => {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));

  /* ---------- engine ---------- */
  const call = (name, ...args) => {
    try {
      const r = JSON.parse(globalThis.Bearings.call(name, JSON.stringify(args)));
      if (r.error) throw new Error(r.error);
      return r.ok;
    } catch (e) { console.warn('engine', name, e); return null; }
  };
  let ready = false;
  try { ready = !!globalThis.Bearings && !JSON.parse(globalThis.Bearings.call('loadSample', '[]')).error; } catch (e) { console.warn(e); }
  const people = new Map((ready && call('people') || []).map(p => [p.k, p]));
  const P = k => people.get(k) || (ready ? call('person', k) : null);
  const initials = p => ((p.f || '')[0] || '') + ((p.l || '')[0] || '');
  const subtitle = p => [p.p, p.c].filter(Boolean).join(', ');
  const avatar = (p, cls = 'av') => `<span class="${cls}" style="background:${esc(p.color || '#7556E8')}" aria-hidden="true">${esc(initials(p))}</span>`;

  /* ---------- nav ---------- */
  const nav = $('#nav');
  const onScroll = () => nav.classList.toggle('solid', scrollY > 24);
  addEventListener('scroll', onScroll, {passive: true}); onScroll();

  /* ---------- the hero compass ---------- */
  function compass() {
    const cv = $('#compass'); if (!cv || !ready) return;
    const data = call('compass'); if (!data) return;
    $('#compassCount').textContent = `${data.total} people`;
    const ctx = cv.getContext('2d');
    const tip = $('#lensTip');
    const REASON = {w: 'is waiting on you', j: 'has a new role', n: 'new connection', s: 'starred'};
    const BAND = {strong: 'Close', warm: 'Warm', light: 'Light'};
    let W = 0, H = 0, dpr = 1, R = 0, cx = 0, cy = 0;
    const dots = data.dots.map(d => ({...d, p: people.get(d.k), flag: d.f && REASON[d.f] ? d.f : ''}));
    const flagged = dots.filter(d => d.flag);
    const stars = Array.from({length: 90}, (_, i) => ({x: Math.random(), y: Math.random(), r: Math.random() * (i % 11 ? .8 : 1.6) + .3, o: .15 + Math.random() * .45}));
    let pointer = null, pings = [], callouts = [], last = performance.now(), sweep = -Math.PI / 2, running = false, raf = 0;

    function size() {
      const b = cv.getBoundingClientRect();
      dpr = Math.min(devicePixelRatio || 1, 2);
      W = b.width; H = b.height;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      R = Math.min(W, H) * (W < 560 ? .32 : .38); cx = W / 2; cy = H / 2;
    }
    const pos = d => [cx + Math.cos(d.a) * d.r * R, cy + Math.sin(d.a) * d.r * R];
    const norm = a => ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

    function draw(now) {
      const dt = Math.min(.05, (now - last) / 1000); last = now;
      const prev = sweep;
      if (!reduce) sweep += dt * .55;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      // a few stars beyond the rim
      for (const s of stars) { ctx.fillStyle = `rgba(255,255,255,${s.o})`; ctx.beginPath(); ctx.arc(s.x * W, s.y * H, s.r, 0, 7); ctx.fill(); }

      // the disc
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.04);
      g.addColorStop(0, 'rgba(60,46,120,.55)'); g.addColorStop(1, 'rgba(23,19,42,.55)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 1.03, 0, 7); ctx.fill();

      // closeness rings
      ctx.lineWidth = 1;
      for (const ring of data.rings) {
        ctx.strokeStyle = ring.r === 1 ? 'rgba(255,255,255,.16)' : 'rgba(255,255,255,.09)';
        ctx.setLineDash(ring.r === 1 ? [] : [3, 5]);
        ctx.beginPath(); ctx.arc(cx, cy, ring.r * R, 0, 7); ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.font = `500 ${Math.max(9, R * .042)}px Geist, system-ui`; ctx.fillStyle = 'rgba(244,241,255,.42)'; ctx.textAlign = 'center';
      for (const ring of data.rings.slice(0, 3)) ctx.fillText(ring.label, cx, cy - ring.r * R + R * .055);

      // the sector rim
      const rimR = R * 1.075, rimW = Math.max(3, R * .022);
      ctx.lineCap = 'round';
      for (const w of data.wedges) {
        if (w.a1 - w.a0 < .012) continue;
        ctx.strokeStyle = w.color; ctx.lineWidth = rimW; ctx.globalAlpha = .9;
        ctx.beginPath(); ctx.arc(cx, cy, rimR, w.a0 + .012, w.a1 - .012); ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // sweep: a soft trailing wedge and a bright edge
      if (!reduce && ctx.createConicGradient) {
        const cg = ctx.createConicGradient(sweep - Math.PI * .5, cx, cy);
        cg.addColorStop(0, 'rgba(255,181,46,0)'); cg.addColorStop(.25, 'rgba(255,181,46,.16)'); cg.addColorStop(.2501, 'rgba(255,181,46,0)'); cg.addColorStop(1, 'rgba(255,181,46,0)');
        ctx.fillStyle = cg; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, sweep - Math.PI * .5, sweep); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(255,200,110,.75)'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(sweep) * R, cy + Math.sin(sweep) * R); ctx.stroke();
      }

      // pings when the sweep passes someone who needs you
      if (!reduce) {
        const a0 = norm(prev), a1 = norm(sweep);
        for (const d of flagged) {
          const a = norm(d.a);
          const crossed = a0 <= a1 ? (a > a0 && a <= a1) : (a > a0 || a <= a1);
          if (crossed) {
            pings.push({d, t: now});
            const [x, y] = pos(d);
            if (d.p && !callouts.some(c => { const [cx2, cy2] = pos(c.d); return c.d === d || Math.hypot(cx2 - x, cy2 - y) < R * .3; })) { callouts.push({d, t: now}); if (callouts.length > 2) callouts.shift(); }
          }
        }
      }

      // lens: magnify around the pointer
      const lensR = Math.max(54, R * .2);
      let near = [];
      for (const d of dots) {
        let [x, y] = pos(d);
        let s = d.flag ? 3.3 : 2.1, a = d.flag ? 1 : .72;
        if (pointer) {
          const dx = x - pointer.x, dy = y - pointer.y, dist = Math.hypot(dx, dy);
          if (dist < lensR) {
            const k = 1.9 - .9 * (dist / lensR);
            x = pointer.x + dx * k; y = pointer.y + dy * k; s *= 1.5; a = 1;
            near.push({d, dist, x, y});
          }
        }
        if (d.flag) {
          const halo = ctx.createRadialGradient(x, y, 0, x, y, s * 4);
          halo.addColorStop(0, 'rgba(255,181,46,.55)'); halo.addColorStop(1, 'rgba(255,181,46,0)');
          ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(x, y, s * 4, 0, 7); ctx.fill();
          ctx.fillStyle = '#FFC14D';
        } else {
          ctx.fillStyle = d.c; ctx.globalAlpha = a;
        }
        ctx.beginPath(); ctx.arc(x, y, s, 0, 7); ctx.fill();
        ctx.globalAlpha = 1;
      }

      // ripples
      pings = pings.filter(p => now - p.t < 1300);
      for (const p of pings) {
        const k = (now - p.t) / 1300, [x, y] = pos(p.d);
        ctx.strokeStyle = `rgba(255,190,80,${(1 - k) * .8})`; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(x, y, 4 + k * 20, 0, 7); ctx.stroke();
      }

      // callouts: a name pill beside people the sweep just found
      callouts = callouts.filter(c => now - c.t < 3200);
      if (!pointer) for (const c of callouts) {
        const k = (now - c.t) / 3200, alpha = k < .1 ? k / .1 : k > .8 ? (1 - k) / .2 : 1;
        const [x, y] = pos(c.d), label = `${c.d.p.f} ${c.d.p.l[0]}.`;
        ctx.font = `600 ${Math.max(11, R * .05)}px Geist, system-ui`;
        const tw = ctx.measureText(label).width, ph = Math.max(20, R * .085), pw = tw + ph * .8;
        const right = x < cx, px = right ? x + 10 : x - 10 - pw, py = y - ph / 2;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = 'rgba(23,19,42,.9)'; ctx.strokeStyle = 'rgba(255,181,46,.7)'; ctx.lineWidth = 1;
        roundRect(px, py, pw, ph, ph / 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#F4F1FF'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(label, px + ph * .4, y + .5);
        ctx.textBaseline = 'alphabetic'; ctx.globalAlpha = 1;
      }

      // you, at the center
      const yg = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * .2);
      yg.addColorStop(0, 'rgba(255,181,46,.35)'); yg.addColorStop(1, 'rgba(255,181,46,0)');
      ctx.fillStyle = yg; ctx.beginPath(); ctx.arc(cx, cy, R * .2, 0, 7); ctx.fill();
      ctx.fillStyle = '#221C3D'; ctx.strokeStyle = '#FFB52E'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, R * .075, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#F4F1FF'; ctx.font = `600 ${Math.max(10, R * .048)}px Geist, system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('You', cx, cy + .5); ctx.textBaseline = 'alphabetic';

      // sector labels for the big sectors
      ctx.font = `600 ${Math.max(10, R * .046)}px Geist, system-ui`;
      for (const w of data.wedges) {
        if (w.n < 30) continue;
        const m = (w.a0 + w.a1) / 2, lx = cx + Math.cos(m) * R * 1.2, ly = cy + Math.sin(m) * R * 1.2;
        ctx.fillStyle = 'rgba(244,241,255,.78)'; ctx.textAlign = Math.cos(m) > .25 ? 'left' : Math.cos(m) < -.25 ? 'right' : 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(w.short, lx, ly);
      }
      ctx.textBaseline = 'alphabetic';

      // the lens ring and its tooltip
      if (pointer) {
        ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(pointer.x, pointer.y, lensR, 0, 7); ctx.stroke();
        near.sort((a, b) => a.dist - b.dist);
        const hit = near.find(n => n.d.p);
        if (hit) {
          const p = hit.d.p;
          const why = hit.d.flag ? `<i>${esc(p.f)} ${REASON[hit.d.flag]}</i>` : `<span>${esc(BAND[p.band] || 'Not in touch')}</span>`;
          tip.innerHTML = `<b>${esc(p.name)}</b><span>${esc(subtitle(p))}</span>${why}`;
          tip.hidden = false;
          const left = Math.min(W - 200, Math.max(0, pointer.x + 18)), top = Math.max(0, pointer.y - lensR - 70);
          tip.style.left = left + 'px'; tip.style.top = top + 'px';
          ctx.strokeStyle = '#FFB52E'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(hit.x, hit.y, 7, 0, 7); ctx.stroke();
        } else tip.hidden = true;
      }

      if (running && !reduce) raf = requestAnimationFrame(draw);
    }
    function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

    const start = () => { if (running) return; running = true; last = performance.now(); raf = requestAnimationFrame(draw); };
    const stop = () => { running = false; cancelAnimationFrame(raf); };
    const redraw = () => { if (!running || reduce) requestAnimationFrame(draw); };

    const at = e => { const b = cv.getBoundingClientRect(); return {x: e.clientX - b.left, y: e.clientY - b.top}; };
    cv.addEventListener('pointermove', e => { pointer = at(e); redraw(); });
    cv.addEventListener('pointerdown', e => { pointer = at(e); if (e.pointerType !== 'mouse') cv.setPointerCapture(e.pointerId); redraw(); });
    const leave = () => { pointer = null; tip.hidden = true; redraw(); };
    cv.addEventListener('pointerleave', leave);
    cv.addEventListener('pointerup', e => { if (e.pointerType !== 'mouse') leave(); });
    cv.addEventListener('pointercancel', leave);
    // on touch, a drag across the compass looks closer instead of scrolling the page
    cv.addEventListener('touchmove', e => { if (pointer) e.preventDefault(); }, {passive: false});

    size();
    new ResizeObserver(() => { size(); redraw(); }).observe(cv);
    new IntersectionObserver(([e]) => { e.isIntersecting ? (reduce ? redraw() : start()) : stop(); }).observe(cv);
    document.addEventListener('visibilitychange', () => { document.hidden ? stop() : start(); });
    if (reduce) requestAnimationFrame(draw);
  }

  /* ---------- Today's five ---------- */
  function five() {
    const card = $('#fiveCard'); if (!card || !ready) return;
    const picks = (call('weekly') || []).slice(0, 5);
    const strip = $('#fiveStrip'), next = $('#fiveNext');
    const TAG = {reply: ['Waiting on you', '#C77700'], congrats: ['New role', '#11946F'], new: ['New connection', '#3E6FE8'], move: ['Likely to move', '#7556E8'], intro: ['Intro pending', '#E89A00']};
    const ACT = {reply: 'Reply', congrats: 'Congratulate', new: 'Say thanks', intro: 'Nudge'};
    const info = new Map(picks.map(w => {
      const mem = call('memory', w.k), msgs = call('messages', w.k) || [];
      return [w.k, {p: P(w.k), recall: (mem && mem.line) || w.why, draft: (msgs[0] && msgs[0].text) || ''}];
    }));
    let order = picks.map(w => w.k), done = new Set(), flash = '';
    strip.innerHTML = picks.map(() => '<i></i>').join('');

    function render(animate) {
      [...strip.children].forEach((el, i) => el.classList.toggle('on', i < done.size));
      const open = order.filter(k => !done.has(k));
      if (!open.length) {
        card.innerHTML = `<div class="five-done"><h3>This week’s five are done.</h3><p>Fresh picks arrive Monday morning.</p><div class="five-btns" style="justify-content:center"><button class="later" type="button" data-a="again">Start over</button></div></div>`;
        next.textContent = '';
      } else {
        const k = open[0], w = picks.find(x => x.k === k), {p, recall, draft} = info.get(k);
        const [tag, color] = TAG[w.kind] || ['Worth a note', '#7556E8'];
        card.innerHTML = `
          <div class="who">${avatar(p)}<div><div class="tag" style="color:${color}">${esc(tag)}</div><h3>${esc(p.name)}</h3><div class="sub">${esc(subtitle(p))}</div></div></div>
          <p class="recall">${esc(recall)}</p>
          ${draft ? `<p class="draft">“${esc(draft)}”</p>` : ''}
          <div class="five-btns"><button class="go" type="button" data-a="go">${esc(ACT[w.kind] || 'Write')}</button><button class="later" type="button" data-a="later" ${open.length < 2 ? 'disabled' : ''}>Later</button></div>
          ${flash ? `<p class="sent">${esc(flash)}</p>` : ''}`;
        const rest = open.slice(1).map(k => info.get(k).p.name);
        next.textContent = rest.length ? `Next: ${rest.slice(0, 2).join(', ')}${rest.length > 2 ? ` and ${rest.length - 2} more` : ''}` : 'Last one for this week.';
      }
      if (animate) { card.classList.remove('enter'); void card.offsetWidth; card.classList.add('enter'); }
    }
    card.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      const open = order.filter(k => !done.has(k));
      if (b.dataset.a === 'go') { const p = info.get(open[0]).p; done.add(open[0]); flash = `Sent to ${p.f}. Logged as a touch.`; }
      else if (b.dataset.a === 'later') { order = order.filter(k => k !== open[0]).concat(open[0]); flash = ''; }
      else if (b.dataset.a === 'again') { done.clear(); order = picks.map(w => w.k); flash = ''; }
      render(true);
      const first = card.querySelector('button'); if (first && e.detail === 0) first.focus();
    });
    render(false);
  }

  /* ---------- Ask ---------- */
  function ask() {
    const form = $('#askForm'); if (!form || !ready) return;
    const input = $('#askInput'), out = $('#askOut'), chips = $('#askChips');
    const t = (call('targets') || []).map(x => x.name);
    const examples = ['Who’s waiting on me?', 'Who changed jobs lately?', 'navy O-5 and up in cyber', `Who can get me into ${t.includes('DISA') ? 'DISA' : t[0] || 'DISA'}?`, 'Who’s likely to move soon?', 'contracting officers', 'Who do I know at NAVFAC?'];
    chips.innerHTML = examples.map(q => `<button type="button">${esc(q)}</button>`).join('');
    chips.addEventListener('click', e => { const b = e.target.closest('button'); if (b) { input.value = b.textContent; run(b.textContent); } });
    form.addEventListener('submit', e => { e.preventDefault(); run(input.value); });
    function run(q) {
      q = (q || '').trim(); if (!q) return;
      const r = call('ask', q);
      if (!r) { out.innerHTML = '<p class="ask-answer">Try asking it another way.</p>'; return; }
      const hits = (r.people || []).slice(0, 6);
      const more = (r.people || []).length - hits.length;
      out.innerHTML = `<p class="ask-answer">${esc(r.answer || (hits.length ? '' : 'No one matches that yet. Try a company, a title or a city.'))}</p>
        <ul class="hits">${hits.map(h => { const p = P(h.k); if (!p) return ''; return `<li class="hit">${avatar(p)}<div><b>${esc(p.name)}</b><span>${esc(subtitle(p))}</span>${h.why ? `<em>${esc(h.why)}</em>` : ''}</div></li>`; }).join('')}</ul>
        ${more > 0 ? `<p class="muted" style="margin-top:10px;font-size:.875rem">and ${more} more in the app</p>` : ''}`;
    }
    run(examples[0]); input.value = '';
  }

  /* ---------- the federal map ---------- */
  function federal() {
    const map = $('#fedMap'); if (!map || !ready) return;
    const cov = call('agencyCoverage'); if (!cov) return;
    const score = $('#fedScore'), detail = $('#fedDetail');
    const COL = {covered: 'var(--good)', thin: 'var(--thin)', none: '#C9C4D6'};
    const LABEL = {covered: 'Covered', thin: 'Thin', none: 'Not connected'};
    const T = cov.totals, known = T.agencies - T.none;
    score.innerHTML = `<div><span class="big">${known}</span> <span class="of">of ${T.agencies} agencies and commands where you know someone</span></div>
      <div class="bar" aria-hidden="true"><i style="width:${T.covered / T.agencies * 100}%;background:var(--good)"></i><i style="width:${T.thin / T.agencies * 100}%;background:var(--thin)"></i></div>
      <div class="keys"><span style="--c:var(--good)">${T.covered} covered</span><span style="--c:var(--thin)">${T.thin} thin</span><span style="--c:#C9C4D6">${T.none} not connected</span></div>`;
    const byDept = new Map(cov.depts.map(d => [d.name, []]));
    cov.rows.forEach(r => { if (!byDept.has(r.dept)) byDept.set(r.dept, []); byDept.get(r.dept).push(r); });
    const rank = {covered: 0, thin: 1, none: 2};
    map.innerHTML = [...byDept].map(([dept, rows]) => {
      rows.sort((a, b) => rank[a.status] - rank[b.status] || b.known - a.known);
      const k = rows.filter(r => r.status !== 'none').length;
      return `<div class="dept"><h3>${esc(dept)}<small>${k} of ${rows.length}</small></h3><div class="cells">${rows.map(r =>
        `<button type="button" class="cell ${r.status === 'none' ? '' : r.status}" data-id="${esc(r.id)}" aria-label="${esc(r.name)}: ${LABEL[r.status]}" title="${esc(r.name)}"></button>`).join('')}</div></div>`;
    }).join('');
    const rows = new Map(cov.rows.map(r => [r.id, r]));
    let filter = 'all', focus = 'all';
    function apply() {
      map.querySelectorAll('.cell').forEach(c => {
        const r = rows.get(c.dataset.id);
        const show = (filter === 'all' || r.status === filter) && (focus === 'all' || r.tags.includes(focus));
        c.classList.toggle('dim', !show);
      });
    }
    function show(r) {
      map.querySelectorAll('.cell.sel').forEach(c => c.classList.remove('sel'));
      const c = map.querySelector(`[data-id="${r.id}"]`); if (c) c.classList.add('sel');
      const best = r.best.map(P).filter(Boolean);
      const what = r.status === 'none' ? 'No one you know works here yet. In the app, tap Ways in to find the warmest path, or Watch to follow leadership changes.'
        : r.status === 'thin' ? `${r.gap || 'One side is missing'}. Add a warm or senior contact to cover it.`
        : 'You know someone senior and someone warm here.';
      detail.innerHTML = `${r.short && r.short !== r.name ? `<div class="short">${esc(r.short)}</div>` : ''}<h3>${esc(r.name)}</h3>
        <div class="status" style="--c:${COL[r.status]}">${LABEL[r.status]}${r.known ? `: ${r.known} you know${r.senior ? `, ${r.senior} senior` : ''}` : ''}</div>
        <p>${esc(what)}</p>
        ${best.length ? `<ul>${best.map(p => `<li>${avatar(p)}<div><b>${esc(p.name)}</b>${esc(p.p || '')}</div></li>`).join('')}</ul>` : ''}`;
    }
    map.addEventListener('click', e => { const c = e.target.closest('.cell'); if (c) show(rows.get(c.dataset.id)); });
    map.addEventListener('mouseover', e => { const c = e.target.closest('.cell'); if (c && matchMedia('(hover: hover)').matches) show(rows.get(c.dataset.id)); });
    $('#fedFilter').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      filter = b.dataset.f;
      $('#fedFilter').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      apply();
    });
    $('#fedFocus').addEventListener('change', e => { focus = e.target.value; apply(); });
    const first = cov.rows.find(r => r.status === 'thin') || cov.rows[0];
    if (first) show(first);
  }

  /* ---------- socials: one person, every app ---------- */
  function constellation() {
    const el = $('#constellation'); if (!el) return;
    const w0 = ready ? (call('weekly') || [])[0] : null;
    const p = w0 ? P(w0.k) : {f: 'Jason', l: 'Jacobs', name: 'Jason Jacobs'};
    const apps = ['LinkedIn', 'Facebook', 'Instagram', 'Snapchat', 'TikTok'];
    const px = 260, py = 196, R = 158;
    const nodes = apps.map((a, i) => { const ang = (196 + i * 37) * Math.PI / 180; return {a, x: px + Math.cos(ang) * R, y: py + Math.sin(ang) * R * .95}; });
    el.innerHTML = `<svg viewBox="0 0 520 250">
      ${nodes.map(n => `<line x1="${px}" y1="${py}" x2="${n.x.toFixed(1)}" y2="${n.y.toFixed(1)}"/>`).join('')}
      ${nodes.map(n => `<g class="app"><circle cx="${n.x.toFixed(1)}" cy="${n.y.toFixed(1)}" r="37"/><text x="${n.x.toFixed(1)}" y="${(n.y + 4).toFixed(1)}" text-anchor="middle">${n.a}</text></g>`).join('')}
      <circle class="person" cx="${px}" cy="${py}" r="25"/>
      <text x="${px}" y="${py + 5}" text-anchor="middle" style="fill:#0D0A17;font-size:14px">${esc(initials(p))}</text>
      <text x="${px}" y="${py + 46}" text-anchor="middle">${esc(p.name)}, on all five</text>
    </svg>`;
  }

  /* ---------- videos: play in view, with a pause button ---------- */
  function videos() {
    const PLAY = '<svg viewBox="0 0 14 14"><path d="M3 1.5v11l9-5.5z"/></svg>', PAUSE = '<svg viewBox="0 0 14 14"><path d="M3 1.5h3v11H3zM8 1.5h3v11H8z"/></svg>';
    const vids = [...document.querySelectorAll('.phone video')];
    const held = new WeakSet();
    vids.forEach(v => {
      const ph = v.closest('.phone');
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'play';
      const set = () => { const paused = v.paused; b.innerHTML = paused ? PLAY : PAUSE; b.setAttribute('aria-label', paused ? 'Play video' : 'Pause video'); ph.classList.toggle('paused', paused && held.has(v)); };
      b.addEventListener('click', () => { if (v.paused) { held.delete(v); v.play().catch(() => {}); } else { held.add(v); v.pause(); } set(); });
      v.addEventListener('play', set); v.addEventListener('pause', set);
      ph.appendChild(b); set();
      if (reduce) held.add(v);
    });
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(es => es.forEach(e => {
      const v = e.target;
      if (e.isIntersecting && e.intersectionRatio > .45) { if (!held.has(v)) { v.preload = 'auto'; v.play().catch(() => {}); } }
      else if (!v.paused) v.pause();
    }), {threshold: [0, .45, .8]});
    vids.forEach(v => io.observe(v));
  }

  /* ---------- the live demo ---------- */
  function demo() {
    const b = $('#liveStart'); if (!b) return;
    b.addEventListener('click', () => {
      const f = document.createElement('iframe');
      f.src = 'demo/?tab=home'; f.title = 'Bearings live demo on a sample network'; f.loading = 'eager';
      f.setAttribute('allow', 'clipboard-write');
      b.replaceWith(f);
      f.focus();
    });
  }

  compass(); five(); ask(); federal(); constellation(); videos(); demo();
})();
