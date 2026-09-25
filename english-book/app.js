/* Word Garden — a CET-4 English study book. No build step, no dependencies. */
(() => {
  'use strict';

  const BOOK = window.BOOK;
  const view = document.getElementById('view');
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const shuffle = arr => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pad = n => String(n).padStart(2, '0');
  const fmtDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = () => fmtDate(new Date());
  // Whole local days since epoch; used for spaced-repetition due dates.
  const dayNum = (d = new Date()) => Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000);
  const norm = s => String(s || '').toLowerCase().replace(/[’‘`]/g, "'").replace(/\s+/g, ' ').trim();

  /* ---------------- Icons ---------------- */
  const I = {
    home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
    review: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a9 9 0 1 1-2.64-6.36L21 8"/><path d="M21 3v5h-5"/></svg>',
    mistakes: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z"/><path d="M10 8l4 4M14 8l-4 4"/></svg>',
    words: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19.5V4.5A1.5 1.5 0 0 1 5.5 3H20v15H5.5A1.5 1.5 0 0 0 4 19.5 1.5 1.5 0 0 0 5.5 21H20v-3"/><path d="M12 7v6M9 10h6"/></svg>',
    settings: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/></svg>',
    speaker: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5L6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>',
    moon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
    sun: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>'
  };

  /* ---------------- State ---------------- */
  const STORE = 'wordgarden.v1';
  const defaults = () => ({
    progress: {},   // wordKey -> { box, due, right, wrong, last }
    mistakes: [],   // { id, type, key, q, a, given, t, n }
    custom: [],     // user words { w, zh, ph, pos, ex, exZh, added }
    log: {},        // 'YYYY-MM-DD' -> actions that day
    done: {},       // 'u1:cloze' -> best score (0..1)
    settings: { goal: 20, rate: 0.9, theme: 'auto', accent: 'en-US', autoplay: true, dictMode: 'listen', transDir: 'zh2en' }
  });
  let S = load();

  function load() {
    try {
      const raw = localStorage.getItem(STORE);
      if (raw) {
        const d = JSON.parse(raw);
        const base = defaults();
        return Object.assign(base, d, { settings: Object.assign(base.settings, d.settings || {}) });
      }
    } catch (e) { /* storage unavailable: start fresh */ }
    return defaults();
  }
  function save() { try { localStorage.setItem(STORE, JSON.stringify(S)); } catch (e) { /* ignore */ } }

  /* ---------------- Words ---------------- */
  const MY = { id: 'my', title: 'My Words', titleZh: '我的词库', emoji: '📒' };
  const getUnit = id => id === 'my' ? Object.assign({}, MY, { words: S.custom }) : BOOK.units.find(u => u.id === id);
  const allUnits = () => S.custom.length ? [...BOOK.units, getUnit('my')] : BOOK.units;
  const wkey = (uid, w) => uid + ':' + w.w.toLowerCase();
  const withKey = (u, w) => Object.assign({}, w, { uid: u.id, key: wkey(u.id, w) });
  const unitWords = u => u.words.map(w => withKey(u, w));
  const allWords = () => allUnits().flatMap(unitWords);
  const wordByKey = key => allWords().find(w => w.key === key);

  // Regex source matching a word plus common inflections (s/ed/ing, dropped e, y->i, doubled consonant).
  function formPattern(word) {
    const w = word.toLowerCase().trim();
    const alts = [escRe(w) + '(?:s|es|ed|d|ing|ly)?'];
    if (/e$/.test(w)) alts.push(escRe(w.slice(0, -1)) + '(?:ing|ed|er|ers|ion|ions)');
    if (/y$/.test(w)) alts.push(escRe(w.slice(0, -1)) + 'i(?:es|ed|er)');
    if (/[^aeiou][aeiou][bdgmnprt]$/.test(w)) alts.push(escRe(w) + w.slice(-1) + '(?:ed|ing|er)');
    return alts.join('|');
  }
  function findForm(sentence, word) {
    const m = new RegExp('(^|[^A-Za-z])(' + formPattern(word) + ')(?![A-Za-z])', 'i').exec(sentence || '');
    return m ? { form: m[2], index: m.index + m[1].length } : null;
  }
  function markWord(sentence, word) {
    const f = findForm(sentence, word);
    if (!f) return esc(sentence);
    return esc(sentence.slice(0, f.index)) + '<mark>' + esc(f.form) + '</mark>' + esc(sentence.slice(f.index + f.form.length));
  }

  /* ---------------- Spaced repetition (Leitner boxes) ---------------- */
  const INTERVALS = [0, 1, 2, 4, 7, 15, 30];
  function grade(key, g) { // 0 = forgot, 1 = fuzzy, 2 = knew it
    const p = S.progress[key] || { box: 0, due: 0, right: 0, wrong: 0 };
    if (g === 0) { p.box = 1; p.due = dayNum(); p.wrong++; }
    else if (g === 1) { p.box = Math.max(1, p.box); p.due = dayNum() + 1; p.right++; }
    else { p.box = p.box === 0 ? 2 : Math.min(6, p.box + 1); p.due = dayNum() + INTERVALS[p.box]; p.right++; }
    p.last = Date.now();
    S.progress[key] = p;
    bump();
  }
  function bump(n = 1) { const t = today(); S.log[t] = (S.log[t] || 0) + n; save(); }
  const dueWords = () => allWords().filter(w => S.progress[w.key] && S.progress[w.key].due <= dayNum());
  function streak() {
    const d = new Date(); let n = 0;
    if (!S.log[fmtDate(d)]) d.setDate(d.getDate() - 1);
    while (S.log[fmtDate(d)]) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  function unitStats(u) {
    let learned = 0, mastered = 0;
    for (const w of u.words) {
      const p = S.progress[wkey(u.id, w)];
      if (p && p.box >= 2) learned++;
      if (p && p.box >= 5) mastered++;
    }
    return { total: u.words.length, learned, mastered, pct: u.words.length ? learned / u.words.length : 0 };
  }
  function addMistake(m) {
    const found = S.mistakes.find(x => x.type === m.type && x.q === m.q);
    if (found) { found.given = m.given; found.t = Date.now(); found.n = (found.n || 1) + 1; }
    else S.mistakes.unshift(Object.assign({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), t: Date.now(), n: 1 }, m));
    save();
  }
  function setBest(k, score) { S.done[k] = Math.max(S.done[k] || 0, score); save(); }

  /* ---------------- Speech ---------------- */
  const TTS = 'speechSynthesis' in window;
  let voice = null, speakingText = '';
  function pickVoice() {
    if (!TTS) return;
    const lang = S.settings.accent, vs = speechSynthesis.getVoices();
    const same = v => v.lang.replace('_', '-').toLowerCase() === lang.toLowerCase();
    voice = vs.find(v => same(v) && /Google|Samantha|Daniel|Microsoft|Natural/i.test(v.name)) || vs.find(same) || vs.find(v => /^en/i.test(v.lang)) || null;
  }
  if (TTS) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
  function speak(text, rate) {
    if (!TTS) { toast('当前浏览器不支持语音朗读'); return; }
    if (speechSynthesis.speaking && speakingText === text) { speechSynthesis.cancel(); speakingText = ''; return; }
    speechSynthesis.cancel();
    speakingText = text;
    // Long passages are queued sentence by sentence (Chrome cuts off long utterances).
    const chunks = text.length > 160 ? (text.match(/[^.!?]+[.!?]+["”']?\s*/g) || [text]) : [text];
    chunks.forEach((c, i) => {
      const u = new SpeechSynthesisUtterance(c.trim());
      u.lang = S.settings.accent; if (voice) u.voice = voice;
      u.rate = rate || S.settings.rate;
      if (i === chunks.length - 1) u.onend = () => { speakingText = ''; };
      speechSynthesis.speak(u);
    });
  }
  const speakBtn = (text, cls = '', rate) => `<button type="button" class="speak ${cls}" data-say="${esc(text)}"${rate ? ` data-rate="${rate}"` : ''} aria-label="朗读 ${esc(text.slice(0, 40))}" title="朗读">${I.speaker}</button>`;

  /* ---------------- UI helpers ---------------- */
  let toastTimer;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
  }
  function ring(pct, label) {
    const r = 23, c = 2 * Math.PI * r;
    return `<div class="ring" aria-label="${Math.round(pct * 100)}%"><svg viewBox="0 0 56 56"><circle class="track" cx="28" cy="28" r="${r}"/><circle class="val" cx="28" cy="28" r="${r}" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct)}"/></svg><span class="serif">${Math.round(pct * 100)}</span>${label ? `<small>${label}</small>` : ''}</div>`;
  }
  const exampleHTML = w => w.ex ? `<div class="example"><div class="row" style="flex-wrap:nowrap;align-items:flex-start"><div class="grow"><div class="en">${markWord(w.ex, w.w)}</div>${w.exZh ? `<div class="cn">${esc(w.exZh)}</div>` : ''}</div>${speakBtn(w.ex)}</div></div>` : '';
  const pct = x => Math.round(x * 100) + '%';

  // One keyboard handler at a time, owned by the active exercise.
  let keyFn = null;
  const typing = e => /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);

  /* ---------------- Theme ---------------- */
  function applyTheme() {
    const t = S.settings.theme;
    if (t === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', t);
    const dark = t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
    $('#themeBtn').innerHTML = dark ? I.sun : I.moon;
    const meta = $('meta[name="theme-color"]'); if (meta) meta.content = dark ? '#171614' : '#f6f1e7';
  }
  $('#themeBtn').addEventListener('click', () => {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark' || (!document.documentElement.getAttribute('data-theme') && matchMedia('(prefers-color-scheme: dark)').matches);
    S.settings.theme = dark ? 'light' : 'dark'; save(); applyTheme();
  });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

  /* ---------------- Navigation ---------------- */
  const NAV = [['', '首页', 'home'], ['review', '复习', 'review'], ['mistakes', '错题本', 'mistakes'], ['mywords', '我的词库', 'words'], ['settings', '设置', 'settings']];
  function renderNav(route, uid) {
    const due = dueWords().length, mis = S.mistakes.length;
    const badge = r => r === 'review' && due ? `<span class="count">${due}</span>` : r === 'mistakes' && mis ? `<span class="count">${mis > 99 ? '99+' : mis}</span>` : '';
    $('#sideNav').innerHTML = NAV.map(([r, label, ic]) => `<a class="side-link ${route === r ? 'active' : ''}" href="#/${r}">${I[ic]}<span>${label}</span>${badge(r)}</a>`).join('');
    $('#sideUnits').innerHTML = allUnits().map((u, i) => {
      const st = unitStats(u);
      return `<a class="side-link ${uid === u.id ? 'active' : ''}" href="#/unit/${u.id}"><span class="emo">${u.emoji}</span><span>${u.id === 'my' ? '我的词库' : `${i + 1}. ${esc(u.titleZh)}`}</span><span class="mini">${st.learned}/${st.total}</span></a>`;
    }).join('');
    $('#tabbar').innerHTML = NAV.map(([r, label, ic]) => `<a class="tab-link ${route === r ? 'active' : ''}" href="#/${r}">${I[ic]}<span>${label.replace('我的', '')}</span>${badge(r)}</a>`).join('');
  }

  /* ---------------- Router ---------------- */
  function router() {
    const parts = location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
    const route = parts[0] || '';
    keyFn = null;
    hidePopover();
    if (TTS) speechSynthesis.cancel();
    const pages = { '': homePage, review: reviewPage, mistakes: mistakesPage, mywords: myWordsPage, settings: settingsPage, unit: unitPage };
    (pages[route] || homePage)(...parts.slice(1));
    renderNav(route in pages ? route : '', route === 'unit' ? parts[1] : null);
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', router);
  document.addEventListener('keydown', e => { if (keyFn) keyFn(e); });
  document.addEventListener('click', e => {
    const s = e.target.closest('[data-say]');
    if (s) { e.preventDefault(); speak(s.dataset.say, s.dataset.rate ? +s.dataset.rate : undefined); }
    const pop = $('#popover');
    if (!pop.hidden && !e.target.closest('#popover') && !e.target.closest('.hl')) hidePopover();
  });

  /* ================= Pages ================= */

  function homePage() {
    const h = new Date().getHours();
    const hello = h < 5 ? '夜深了' : h < 12 ? '早上好' : h < 18 ? '下午好' : '晚上好';
    const done = S.log[today()] || 0, goal = S.settings.goal;
    const due = dueWords().length;
    const words = allWords();
    const learned = words.filter(w => S.progress[w.key] && S.progress[w.key].box >= 2).length;
    const mastered = words.filter(w => S.progress[w.key] && S.progress[w.key].box >= 5).length;
    const days = [...Array(14)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - 13 + i); return S.log[fmtDate(d)] || 0; });
    const max = Math.max(goal, ...days);
    const next = BOOK.units.find(u => unitStats(u).pct < 1) || BOOK.units[0];
    const dateStr = new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' });

    view.innerHTML = `<div class="page">
      <section class="hero">
        <div class="stack" style="gap:6px;position:relative;z-index:1">
          <p class="eyebrow">${esc(dateStr)}</p>
          <h1>${hello}，今天也来种几个单词吧</h1>
          <p>每天一点点，词汇自然长成一片花园。</p>
        </div>
        <div class="goal" style="position:relative;z-index:1">
          <div class="row between small"><span>今日目标</span><span>${done} / ${goal}</span></div>
          <div class="bar"><i style="width:${Math.min(100, done / goal * 100)}%"></i></div>
        </div>
        <div class="hero-actions">
          ${due ? `<a class="btn primary" href="#/review">开始复习 · ${due} 词</a>` : `<a class="btn primary" href="#/unit/${next.id}">学习新词 · Unit ${BOOK.units.indexOf(next) + 1}</a>`}
          <a class="btn glass" href="#/unit/${next.id}/dictation">去听写</a>
        </div>
      </section>

      <section class="stats">
        <div class="stat"><b>${streak()}</b><span>连续打卡（天）</span></div>
        <div class="stat"><b>${learned}</b><span>已学会单词</span></div>
        <div class="stat"><b>${mastered}</b><span>牢固掌握</span></div>
        <div class="stat"><b>${due}</b><span>今日待复习</span></div>
      </section>

      <section class="card flat">
        <div class="row between" style="margin-bottom:14px"><h3>近 14 天</h3><span class="muted small">每天练习次数</span></div>
        <div class="week">${days.map(v => `<i class="${v ? '' : 'zero'}" style="height:${v ? Math.max(8, v / max * 100) : 6}%" title="${v}"></i>`).join('')}</div>
        <div class="week-labels"><span>两周前</span><span>今天</span></div>
      </section>

      <section class="stack">
        <div class="row between"><h2>目录 <span class="muted" style="font-size:1rem">Contents</span></h2><a class="btn ghost small" href="#/mywords">＋ 添加我的单词</a></div>
        <div class="chapters">${allUnits().map((u, i) => chapterCard(u, i)).join('')}</div>
      </section>
    </div>`;
  }

  function chapterCard(u, i) {
    const st = unitStats(u);
    const d = k => S.done[u.id + ':' + k];
    const dots = u.id === 'my' ? '' : [['dict', '听写'], ['cloze', '完形'], ['reading', '阅读'], ['trans', '翻译']]
      .map(([k, l]) => `<span class="tag ${d(k) != null ? (d(k) >= .8 ? 'good' : 'warn') : ''}">${d(k) != null ? '✓ ' : ''}${l}</span>`).join('');
    return `<a class="chapter" href="#/unit/${u.id}">
      ${ring(st.pct)}
      <div style="min-width:0">
        <div class="num">${u.id === 'my' ? 'Custom' : 'Unit ' + (i + 1)} · ${st.total} words</div>
        <h3>${u.emoji} ${esc(u.title)}</h3>
        <div class="zh">${esc(u.titleZh)} · 已学 ${st.learned}/${st.total}</div>
        <div class="done-dots">${dots}</div>
      </div></a>`;
  }

  /* ---------- Unit ---------- */
  function unitPage(uid, tab) {
    const u = getUnit(uid);
    if (!u) { location.hash = '#/'; return; }
    const isMy = uid === 'my';
    const tabs = isMy
      ? [['words', '单词', 'Words'], ['dictation', '听写', 'Dictation'], ['cloze', '填空', 'Cloze']]
      : [['words', '单词', 'Words'], ['dictation', '听写', 'Dictation'], ['cloze', '完形', 'Cloze'], ['reading', '阅读', 'Reading'], ['translation', '翻译', 'Translation']];
    if (!tabs.some(t => t[0] === tab)) tab = 'words';
    const st = unitStats(u);
    const idx = BOOK.units.indexOf(BOOK.units.find(x => x.id === uid));

    view.innerHTML = `<div class="page">
      <div class="unit-head">
        <div class="stack" style="gap:4px">
          <a class="crumb" href="#/">← 目录</a>
          <p class="eyebrow">${isMy ? 'Custom chapter' : 'Unit ' + (idx + 1)}</p>
          <h1>${u.emoji} ${esc(u.title)}</h1>
          <p class="muted">${esc(u.titleZh)} · ${st.total} 个单词 · 已学 ${st.learned} · 掌握 ${st.mastered}</p>
        </div>
        ${ring(st.pct, '已学')}
      </div>
      <nav class="tabs">${tabs.map(([k, zh, en]) => `<a href="#/unit/${uid}/${k}" class="${k === tab ? 'on' : ''}">${zh}<span class="en">${en}</span></a>`).join('')}</nav>
      <div id="pane" class="stack" style="gap:18px"></div>
    </div>`;
    const pane = $('#pane');
    if (!u.words.length) {
      pane.innerHTML = `<div class="card empty"><span class="big-emoji">📒</span>你的词库还是空的。<br><br><a class="btn primary" href="#/mywords">去添加单词</a></div>`;
      return;
    }
    const words = unitWords(u);
    if (tab === 'words') wordsPane(pane, u, words);
    else if (tab === 'dictation') dictation(pane, shuffle(words), { doneKey: uid + ':dict' });
    else if (tab === 'cloze') clozePane(pane, u, words);
    else if (tab === 'reading') readingPane(pane, u, words);
    else if (tab === 'translation') translationPane(pane, u);
  }

  function wordsPane(pane, u, words) {
    let mode = 'cards';
    pane.innerHTML = `<div class="toolbar"><div class="seg" id="wmode"><button data-m="cards" class="on">卡片记忆</button><button data-m="list">单词列表</button></div><span class="muted small">认识的词会按遗忘曲线安排复习</span></div><div id="wbody" class="stack" style="gap:18px"></div>`;
    const body = $('#wbody', pane);
    const show = () => {
      $$('#wmode button', pane).forEach(b => b.classList.toggle('on', b.dataset.m === mode));
      if (mode === 'cards') flashcards(body, words, { next: `#/unit/${u.id}/dictation`, nextLabel: '去听写这一课' });
      else { keyFn = null; wordList(body, words); }
    };
    $('#wmode', pane).addEventListener('click', e => { const b = e.target.closest('button'); if (b) { mode = b.dataset.m; show(); } });
    show();
  }

  function wordList(el, words) {
    el.innerHTML = `<div class="card"><div class="word-list">${words.map(w => {
      const p = S.progress[w.key];
      return `<div class="word-item">
        <span class="dot ${p ? 'b' + p.box : ''}" title="${p ? '熟练度 ' + p.box + '/6' : '未学'}"></span>
        <div class="meta"><div class="row" style="gap:8px"><span class="w">${esc(w.w)}</span><span class="muted small">${esc(w.ph || '')}</span></div>
        <div class="zh"><i class="muted serif">${esc(w.pos || '')}</i> ${esc(w.zh)}</div></div>
        ${speakBtn(w.w)}</div>`;
    }).join('')}</div></div>
    <p class="muted small" style="text-align:center">圆点颜色表示熟练度：<span style="color:var(--bad)">●</span> 生疏 → <span style="color:var(--good)">●</span> 熟练 → <span style="color:var(--accent)">●</span> 牢固</p>`;
  }

  /* ---------- Flashcards ---------- */
  function flashcards(el, words, opts = {}) {
    const list = [...words], requeued = new Set();
    const counts = [0, 0, 0];
    let i = 0, flipped = false;

    function render() {
      if (i >= list.length) return finish();
      const w = list[i]; flipped = false;
      el.innerHTML = `
        <div class="progress-line"><span>${i + 1} / ${list.length}</span><div class="bar"><i style="width:${i / list.length * 100}%"></i></div></div>
        <div class="fc-wrap"><div class="flash" id="flash" tabindex="0" role="button" aria-label="翻转卡片">
          <div class="face front">
            ${w.pos ? `<span class="tag accent">${esc(w.pos)}</span>` : ''}
            <div class="word">${esc(w.w)}</div>
            <div class="ph">${esc(w.ph || '')}</div>
            ${speakBtn(w.w)}
            <div class="hint">点击卡片看释义 · 空格键翻转</div>
          </div>
          <div class="face back">
            <div class="row" style="justify-content:center"><span class="word" style="font-size:1.9rem">${esc(w.w)}</span>${speakBtn(w.w)}</div>
            <div class="zh"><span class="pos">${esc(w.pos || '')}</span>${esc(w.zh)}</div>
            ${exampleHTML(w)}
          </div>
        </div></div>
        <div class="grade-row" id="grades" style="visibility:hidden">
          <button class="btn bad" data-g="0">不认识<small>按 1</small></button>
          <button class="btn warn" data-g="1">模糊<small>按 2</small></button>
          <button class="btn good" data-g="2">认识<small>按 3</small></button>
        </div>`;
      const flash = $('#flash', el);
      flash.addEventListener('click', e => { if (!e.target.closest('[data-say]')) flip(); });
      $('#grades', el).addEventListener('click', e => { const b = e.target.closest('[data-g]'); if (b) rate(+b.dataset.g); });
      if (S.settings.autoplay) speak(w.w);
    }
    function flip() {
      flipped = !flipped;
      $('#flash', el).classList.toggle('flipped', flipped);
      if (flipped) $('#grades', el).style.visibility = 'visible';
    }
    function rate(g) {
      const w = list[i];
      grade(w.key, g); counts[g]++;
      if (g === 0 && opts.requeue !== false && !requeued.has(w.key)) { requeued.add(w.key); list.push(w); }
      i++; render(); renderNavLite();
    }
    function finish() {
      keyFn = null;
      el.innerHTML = `<div class="card summary">
        <span style="font-size:2.6rem">🌱</span>
        <h2>这一轮完成了！</h2>
        <div class="chips"><span class="tag good">认识 ${counts[2]}</span><span class="tag warn">模糊 ${counts[1]}</span><span class="tag bad">不认识 ${counts[0]}</span></div>
        <p class="muted">不认识的单词已经加入今天的复习。</p>
        <div class="row" style="justify-content:center">
          <button class="btn" id="again">再来一遍</button>
          ${opts.next ? `<a class="btn primary" href="${opts.next}">${opts.nextLabel || '继续'}</a>` : `<a class="btn primary" href="#/">回到首页</a>`}
        </div></div>`;
      $('#again', el).addEventListener('click', () => { i = 0; counts.fill(0); list.length = 0; list.push(...shuffle(words)); requeued.clear(); render(); bindKeys(); });
      if (opts.onFinish) opts.onFinish();
    }
    function bindKeys() {
      keyFn = e => {
        if (typing(e)) return;
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip(); }
        else if (flipped && ['1', '2', '3'].includes(e.key)) rate(+e.key - 1);
      };
    }
    bindKeys(); render();
  }

  /* ---------- Dictation ---------- */
  function hintLetters(word, level) {
    return [...word].map((c, k) => c === ' ' ? '  ' : (level >= 1 && k === 0) || (level >= 2 && k === word.length - 1) || !/[a-z]/i.test(c) ? esc(c) : '_').join('');
  }
  function diffHTML(given, target) {
    const a = [...given], b = [...target], n = a.length, m = b.length;
    const same = (x, y) => x.toLowerCase() === y.toLowerCase();
    const d = Array.from({ length: n + 1 }, (_, x) => Array.from({ length: m + 1 }, (_, y) => x === 0 ? y : y === 0 ? x : 0));
    for (let x = 1; x <= n; x++) for (let y = 1; y <= m; y++)
      d[x][y] = Math.min(d[x - 1][y] + 1, d[x][y - 1] + 1, d[x - 1][y - 1] + (same(a[x - 1], b[y - 1]) ? 0 : 1));
    const ops = [];
    let x = n, y = m;
    while (x > 0 || y > 0) {
      if (x > 0 && y > 0 && d[x][y] === d[x - 1][y - 1] + (same(a[x - 1], b[y - 1]) ? 0 : 1)) { ops.push([same(a[x - 1], b[y - 1]) ? 'ok' : 'sub', a[x - 1]]); x--; y--; }
      else if (x > 0 && d[x][y] === d[x - 1][y] + 1) { ops.push(['extra', a[x - 1]]); x--; }
      else { ops.push(['miss', '_']); y--; }
    }
    return ops.reverse().map(([t, c]) => `<span class="${t}">${c === ' ' ? '&nbsp;' : esc(c)}</span>`).join('');
  }

  function dictation(el, words, opts = {}) {
    let mode = S.settings.dictMode;
    let list = [...words], i = 0, checked = false, level = 0;
    const results = [], requeued = new Set();

    function render() {
      if (i >= list.length) return finish();
      const w = list[i]; checked = false; level = 0;
      el.innerHTML = `
        <div class="toolbar">
          <div class="seg" id="dmode"><button data-m="listen" class="${mode === 'listen' ? 'on' : ''}">听音拼写</button><button data-m="zh" class="${mode === 'zh' ? 'on' : ''}">看中文拼写</button></div>
          <div class="progress-line" style="flex:1;min-width:140px;max-width:320px"><span>${i + 1} / ${list.length}</span><div class="bar"><i style="width:${i / list.length * 100}%"></i></div></div>
        </div>
        <div class="card drill">
          ${mode === 'listen'
            ? `${speakBtn(w.w, 'big')}<p class="muted small">听发音，拼写单词 · <a href="#" data-say="${esc(w.w)}" data-rate="0.55">慢速</a>${w.ex ? ` · <a href="#" data-say="${esc(w.ex)}">听例句</a>` : ''}</p>`
            : `<p class="eyebrow">写出这个单词</p><div class="prompt-zh"><span class="pos">${esc(w.pos || '')}</span>${esc(w.zh)}</div>`}
          <div class="letters" id="letters">${hintLetters(w.w, 0)}</div>
          <input class="input answer-input" id="ans" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="输入拼写…" aria-label="拼写答案">
          <div id="fb" class="stack" style="align-items:center"></div>
          <div class="row" style="justify-content:center" id="acts">
            <button class="btn ghost" id="hintBtn" type="button">提示</button>
            <button class="btn ghost" id="skip" type="button">不会</button>
            <button class="btn primary" id="check" type="button">检查 <kbd>Enter</kbd></button>
          </div>
        </div>`;
      $('#dmode', el).addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b || b.dataset.m === mode) return;
        mode = S.settings.dictMode = b.dataset.m; save(); render();
      });
      $('#hintBtn', el).addEventListener('click', () => { level = Math.min(2, level + 1); $('#letters', el).innerHTML = hintLetters(w.w, level); $('#ans', el).focus(); });
      $('#skip', el).addEventListener('click', () => check(true));
      $('#check', el).addEventListener('click', () => check(false));
      $('#ans', el).focus({ preventScroll: true });
      if (mode === 'listen') setTimeout(() => speak(w.w), 250);
    }

    function check(gaveUp) {
      if (checked) return next();
      const w = list[i], input = $('#ans', el), given = input.value.trim();
      if (!given && !gaveUp) { input.focus(); toast('先写下你的答案，或点“不会”'); return; }
      checked = true;
      const ok = !gaveUp && norm(given) === norm(w.w);
      input.readOnly = true; input.classList.add(ok ? 'ok' : 'no');
      if (ok) {
        grade(w.key, level ? 1 : 2);
        if (opts.clearMistakes) { S.mistakes = S.mistakes.filter(m => !(m.key === w.key && m.type === 'dictation')); save(); }
      } else {
        grade(w.key, 0);
        addMistake({ type: 'dictation', key: w.key, q: `${w.zh}`, a: w.w, given: given || '（不会）' });
        if (opts.requeue && !requeued.has(w.key)) { requeued.add(w.key); list.push(w); }
      }
      results.push({ w, ok, given });
      $('#letters', el).innerHTML = hintLetters(w.w, 99);
      $('#fb', el).innerHTML = `
        <span class="verdict ${ok ? 'ok' : 'no'}">${ok ? '✓ 正确' + (level ? '（用了提示）' : '') : '✗ 再记一下'}</span>
        ${!ok && given ? `<div class="stack" style="gap:2px;align-items:center"><span class="muted small">你的拼写</span><div class="diff">${diffHTML(given, w.w)}</div></div>` : ''}
        <div class="reveal"><div class="row" style="justify-content:center"><span class="w">${esc(w.w)}</span>${speakBtn(w.w)}</div>
        <span class="muted">${esc(w.ph || '')} <i class="serif">${esc(w.pos || '')}</i> ${esc(w.zh)}</span></div>
        ${exampleHTML(w)}`;
      $('#acts', el).innerHTML = `<button class="btn primary" id="nextBtn" type="button">下一个 <kbd>Enter</kbd></button>`;
      $('#nextBtn', el).addEventListener('click', next);
      speak(w.w);
      renderNavLite();
    }
    function next() { i++; render(); }

    function finish() {
      keyFn = null;
      const right = results.filter(r => r.ok).length, total = results.length;
      const wrong = [...new Map(results.filter(r => !r.ok).map(r => [r.w.key, r.w])).values()];
      if (opts.doneKey && total) setBest(opts.doneKey, right / total);
      el.innerHTML = `<div class="card summary">
        <p class="eyebrow">听写结果</p>
        <div class="score">${right}<span class="muted" style="font-size:1.6rem"> / ${total}</span></div>
        <p class="muted">${right === total ? '全对，太棒了！🎉' : '错的单词已收进错题本，明天会再出现。'}</p>
        ${wrong.length ? `<div class="chips">${wrong.map(w => `<span class="chip static">${esc(w.w)} <span class="muted small">${esc(w.zh)}</span></span>`).join('')}</div>` : ''}
        <div class="row" style="justify-content:center">
          ${wrong.length ? `<button class="btn primary" id="redo">重练错词（${wrong.length}）</button>` : ''}
          <button class="btn" id="again">再听写一遍</button>
        </div></div>`;
      if (wrong.length) $('#redo', el).addEventListener('click', () => dictation(el, shuffle(wrong), Object.assign({}, opts, { doneKey: null })));
      $('#again', el).addEventListener('click', () => dictation(el, shuffle(words), opts));
    }

    keyFn = e => {
      if (e.key === 'Enter') { e.preventDefault(); check(false); }
      else if (e.key === 'Escape' && mode === 'listen') speak(list[i] && list[i].w);
    };
    render();
  }

  /* ---------- Cloze ---------- */
  function clozePane(pane, u, words) {
    const hasBank = !!u.cloze;
    let mode = hasBank ? 'bank' : 'example';
    pane.innerHTML = `${hasBank ? `<div class="toolbar"><div class="seg" id="cmode"><button data-m="bank" class="on">选词填空</button><button data-m="example">例句填空</button></div><span class="muted small">${'四级 Section A 题型'}</span></div>` : ''}<div id="cbody" class="stack" style="gap:18px"></div>`;
    const body = $('#cbody', pane);
    const show = () => {
      $$('#cmode button', pane).forEach(b => b.classList.toggle('on', b.dataset.m === mode));
      keyFn = null;
      if (mode === 'bank') bankedCloze(body, u); else exampleCloze(body, words, u.id);
    };
    if (hasBank) $('#cmode', pane).addEventListener('click', e => { const b = e.target.closest('button'); if (b) { mode = b.dataset.m; show(); } });
    show();
  }

  function bankedCloze(el, u) {
    const parts = u.cloze.text.split(/\[([^\]]+)\]/);
    const answers = parts.filter((_, k) => k % 2);
    const bank = shuffle([...answers, ...u.cloze.distractors]);
    const fills = new Array(answers.length).fill(null);
    let sel = 0, submitted = false;

    function render() {
      let html = '';
      parts.forEach((p, k) => {
        if (k % 2 === 0) { html += esc(p); return; }
        const b = (k - 1) / 2, f = fills[b];
        const state = submitted ? (f != null && norm(bank[f]) === norm(answers[b]) ? 'ok' : 'no') : (b === sel ? 'sel' : '');
        html += `<button type="button" class="blank ${state}" data-b="${b}"><span class="n">${b + 1}</span>${f != null ? esc(bank[f]) : '&nbsp;'}${submitted && state === 'no' ? ` <span class="fix">→ ${esc(answers[b])}</span>` : ''}</button>`;
      });
      const right = fills.filter((f, b) => f != null && norm(bank[f]) === norm(answers[b])).length;
      el.innerHTML = `
        <div class="card"><p class="eyebrow" style="margin-bottom:8px">从下面的词库中选词填空，每个词最多用一次</p><div class="passage">${html}</div></div>
        <div class="card flat"><p class="eyebrow" style="margin-bottom:10px">Word Bank</p><div class="chips">${bank.map((w, k) => `<button type="button" class="chip ${fills.includes(k) ? 'used' : ''}" data-k="${k}" ${submitted ? 'disabled' : ''}>${esc(w)}</button>`).join('')}</div></div>
        ${submitted ? `<div class="card summary" style="padding:20px"><div class="score" style="font-size:2.4rem">${right} / ${answers.length}</div><div class="row" style="justify-content:center"><button class="btn" id="redo">重做</button>${speakBtn(u.cloze.text.replace(/[[\]]/g, ''))}</div></div>`
          : `<div class="row" style="justify-content:flex-end"><button class="btn ghost" id="clear">清空</button><button class="btn primary" id="submit">提交答案</button></div>`}`;
      $$('.blank', el).forEach(b => b.addEventListener('click', () => {
        if (submitted) return;
        const k = +b.dataset.b;
        if (fills[k] != null) fills[k] = null;
        sel = k; render();
      }));
      $$('.chip[data-k]', el).forEach(c => c.addEventListener('click', () => {
        if (submitted) return;
        fills[sel] = +c.dataset.k;
        const nextEmpty = fills.findIndex(f => f == null);
        sel = nextEmpty === -1 ? sel : nextEmpty;
        render();
      }));
      if (submitted) $('#redo', el).addEventListener('click', () => bankedCloze(el, u));
      else {
        $('#clear', el).addEventListener('click', () => { fills.fill(null); sel = 0; render(); });
        $('#submit', el).addEventListener('click', submit);
      }
    }
    function submit() {
      const empty = fills.filter(f => f == null).length;
      if (empty && !confirm(`还有 ${empty} 个空没填，确定提交吗？`)) return;
      submitted = true;
      let right = 0;
      answers.forEach((a, b) => {
        const f = fills[b];
        if (f != null && norm(bank[f]) === norm(a)) { right++; return; }
        const before = parts[b * 2].slice(-40), after = parts[b * 2 + 2].slice(0, 40);
        const w = u.words.find(x => findForm(a, x.w));
        addMistake({ type: 'cloze', key: w ? wkey(u.id, w) : null, q: `…${before}____${after}…`, a, given: f != null ? bank[f] : '（未填）' });
        if (w) grade(wkey(u.id, w), 0);
      });
      setBest(u.id + ':cloze', right / answers.length);
      bump();
      render(); renderNavLite();
    }
    render();
  }

  function exampleCloze(el, words, uid) {
    const items = shuffle(words.map(w => ({ w, f: findForm(w.ex, w.w) })).filter(x => x.f));
    let i = 0, checked = false, right = 0;
    if (!items.length) { el.innerHTML = `<div class="card empty">这些单词还没有例句。给单词添加例句后就能练习填空啦。</div>`; return; }

    function render() {
      if (i >= items.length) return finish();
      const { w, f } = items[i]; checked = false;
      const before = w.ex.slice(0, f.index), after = w.ex.slice(f.index + f.form.length);
      el.innerHTML = `
        <div class="progress-line"><span>${i + 1} / ${items.length}</span><div class="bar"><i style="width:${i / items.length * 100}%"></i></div></div>
        <div class="card drill">
          <p class="eyebrow">根据中文提示补全句子（注意词形变化）</p>
          <div class="sentence">${esc(before)}<input class="inline-input" id="ans" style="width:${Math.max(6, f.form.length + 2)}ch" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="填空">${esc(after)}</div>
          <p class="muted">${esc(w.exZh || '')}</p>
          <p class="small"><span class="tag accent">${esc(w.zh)}</span> <span class="muted">首字母 ${esc(f.form[0])} · ${f.form.length} 个字母</span></p>
          <div id="fb" class="stack" style="align-items:center"></div>
          <div class="row" style="justify-content:center" id="acts"><button class="btn ghost" id="skip">不会</button><button class="btn primary" id="check">检查 <kbd>Enter</kbd></button></div>
        </div>`;
      $('#ans', el).focus({ preventScroll: true });
      $('#check', el).addEventListener('click', () => check(false));
      $('#skip', el).addEventListener('click', () => check(true));
    }
    function check(gaveUp) {
      if (checked) { i++; return render(); }
      const { w, f } = items[i], input = $('#ans', el), given = input.value.trim();
      if (!given && !gaveUp) { input.focus(); return; }
      checked = true;
      const ok = !gaveUp && norm(given) === norm(f.form);
      input.readOnly = true; input.classList.add(ok ? 'ok' : 'no');
      if (!ok) { input.value = f.form; }
      if (ok) { right++; bump(); }
      else {
        grade(w.key, 0);
        addMistake({ type: 'cloze', key: w.key, q: w.ex.slice(0, f.index) + '____' + w.ex.slice(f.index + f.form.length), a: f.form, given: given || '（不会）' });
      }
      $('#fb', el).innerHTML = `<span class="verdict ${ok ? 'ok' : 'no'}">${ok ? '✓ 正确' : `✗ 正确答案：${esc(f.form)}`}</span>${!ok && given ? `<div class="diff" style="font-size:1.2rem">${diffHTML(given, f.form)}</div>` : ''}`;
      $('#acts', el).innerHTML = `${speakBtn(w.ex)}<button class="btn primary" id="nextBtn">下一题 <kbd>Enter</kbd></button>`;
      $('#nextBtn', el).addEventListener('click', () => check(false));
      renderNavLite();
    }
    function finish() {
      keyFn = null;
      if (uid) setBest(uid + ':excloze', right / items.length);
      el.innerHTML = `<div class="card summary"><p class="eyebrow">例句填空</p><div class="score">${right}<span class="muted" style="font-size:1.6rem"> / ${items.length}</span></div><button class="btn primary" id="again">再练一遍</button></div>`;
      $('#again', el).addEventListener('click', () => exampleCloze(el, words, uid));
    }
    keyFn = e => { if (e.key === 'Enter') { e.preventDefault(); check(false); } };
    render();
  }

  /* ---------- Reading ---------- */
  function highlightText(text, words) {
    if (!words.length) return esc(text);
    const pats = words.map(w => ({ w, re: new RegExp('^(?:' + formPattern(w.w) + ')$', 'i') }));
    const big = new RegExp('(^|[^A-Za-z])(' + words.map(w => formPattern(w.w)).join('|') + ')(?![A-Za-z])', 'gi');
    let out = '', last = 0;
    text.replace(big, (m, pre, tok, off) => {
      const start = off + pre.length, hit = pats.find(p => p.re.test(tok));
      out += esc(text.slice(last, start));
      out += hit ? `<button type="button" class="hl" data-key="${esc(hit.w.key)}">${esc(tok)}</button>` : esc(tok);
      last = start + tok.length;
      return m;
    });
    return out + esc(text.slice(last));
  }

  function readingPane(pane, u, words) {
    const r = u.reading, picks = new Array(r.questions.length).fill(null);
    let submitted = false;
    const L = 'ABCD';
    function render() {
      const right = picks.filter((p, k) => p === r.questions[k].answer).length;
      pane.innerHTML = `<div class="reading">
        <article class="card article">
          <div class="row between" style="align-items:flex-start;flex-wrap:nowrap"><div><p class="eyebrow">Passage · 约 ${r.text.split(/\s+/).length} 词</p><h2>${esc(r.title)}</h2></div>${speakBtn(r.text)}</div>
          ${r.text.split('\n').map(p => `<p class="para">${highlightText(p, words)}</p>`).join('')}
          <p class="muted small" style="margin-top:14px;text-indent:0">💡 点击带虚线的单词查看释义，可加入复习。</p>
        </article>
        <section class="card qs">
          <div class="row between" style="margin-bottom:14px"><h3>Questions</h3>${submitted ? `<span class="tag ${right === r.questions.length ? 'good' : 'warn'}">得分 ${right} / ${r.questions.length}</span>` : `<span class="muted small">${picks.filter(p => p != null).length} / ${r.questions.length} 已作答</span>`}</div>
          ${r.questions.map((q, k) => `<div class="q">
            <div class="qt">${k + 1}. ${esc(q.q)}</div>
            ${q.options.map((o, j) => {
              let cls = '';
              if (submitted) cls = j === q.answer ? 'right' : j === picks[k] ? 'wrong' : '';
              else if (picks[k] === j) cls = 'sel';
              return `<button type="button" class="opt ${cls}" data-q="${k}" data-o="${j}" ${submitted ? 'disabled' : ''}><span class="L">${L[j]}</span><span>${esc(o)}</span></button>`;
            }).join('')}
            ${submitted ? `<div class="explain">${picks[k] === q.answer ? '✓ ' : '✗ 正确答案 ' + L[q.answer] + '。'}${esc(q.explain)}</div>` : ''}
          </div>`).join('')}
          <div class="row" style="justify-content:flex-end;margin-top:18px">
            ${submitted ? `<button class="btn" id="redo">重做</button><a class="btn primary" href="#/unit/${u.id}/translation">下一步：翻译</a>` : `<button class="btn primary" id="submit">提交答案</button>`}
          </div>
        </section></div>`;
      $$('.opt', pane).forEach(b => b.addEventListener('click', () => { picks[+b.dataset.q] = +b.dataset.o; render(); }));
      $$('.hl', pane).forEach(b => b.addEventListener('click', e => { e.stopPropagation(); showPopover(b, wordByKey(b.dataset.key)); }));
      if (submitted) $('#redo', pane).addEventListener('click', () => { picks.fill(null); submitted = false; render(); });
      else $('#submit', pane).addEventListener('click', submit);
    }
    function submit() {
      const left = picks.filter(p => p == null).length;
      if (left) { toast(`还有 ${left} 题没有作答`); return; }
      submitted = true;
      let right = 0;
      r.questions.forEach((q, k) => {
        if (picks[k] === q.answer) right++;
        else addMistake({ type: 'reading', key: null, q: `[${r.title}] ${q.q}`, a: q.options[q.answer], given: q.options[picks[k]] });
      });
      setBest(u.id + ':reading', right / r.questions.length);
      bump();
      render(); renderNavLite();
      toast(`得分 ${right} / ${r.questions.length}`);
    }
    render();
  }

  function showPopover(anchor, w) {
    if (!w) return;
    const pop = $('#popover');
    const known = !!S.progress[w.key];
    pop.innerHTML = `<div class="row between" style="flex-wrap:nowrap"><div><div class="w">${esc(w.w)}</div><div class="muted small">${esc(w.ph || '')}</div></div>${speakBtn(w.w)}</div>
      <div><i class="serif muted">${esc(w.pos || '')}</i> ${esc(w.zh)}</div>
      <button type="button" class="btn small ${known ? 'ghost' : 'primary'}" id="addRev" ${known ? 'disabled' : ''}>${known ? '已在复习计划中' : '＋ 加入复习'}</button>`;
    pop.hidden = false;
    const r = anchor.getBoundingClientRect();
    const left = Math.min(Math.max(8, r.left + window.scrollX), window.scrollX + document.documentElement.clientWidth - pop.offsetWidth - 8);
    pop.style.left = left + 'px';
    pop.style.top = (r.bottom + window.scrollY + 8) + 'px';
    speak(w.w);
    const add = $('#addRev', pop);
    if (!known) add.addEventListener('click', () => {
      S.progress[w.key] = { box: 1, due: dayNum(), right: 0, wrong: 0, last: Date.now() }; save();
      toast(`已把 ${w.w} 加入今天的复习`); hidePopover(); renderNavLite();
    });
  }
  function hidePopover() { const p = $('#popover'); if (p) p.hidden = true; }

  /* ---------- Translation ---------- */
  const enTokens = s => (s.toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) || []).map(t => t.length > 3 ? t.replace(/'s$/, '').replace(/(?:es|s)$/, '') : t);
  const zhGrams = s => { const c = [...s.replace(/[\s\p{P}]/gu, '')]; return c.length < 2 ? c : c.slice(1).map((x, k) => c[k] + x); };
  function dice(a, b) {
    if (!a.length || !b.length) return 0;
    const bag = new Map(); b.forEach(t => bag.set(t, (bag.get(t) || 0) + 1));
    let hit = 0; a.forEach(t => { if (bag.get(t)) { hit++; bag.set(t, bag.get(t) - 1); } });
    return 2 * hit / (a.length + b.length);
  }

  function translationPane(pane, u) {
    let dir = S.settings.transDir, i = 0, checked = false;
    const items = u.translation, scores = [];

    function render() {
      if (i >= items.length) return finish();
      const it = items[i], zh2en = dir === 'zh2en';
      const src = zh2en ? it.zh : it.en;
      checked = false;
      pane.innerHTML = `
        <div class="toolbar">
          <div class="seg" id="tdir"><button data-d="zh2en" class="${zh2en ? 'on' : ''}">中译英</button><button data-d="en2zh" class="${!zh2en ? 'on' : ''}">英译中</button></div>
          <div class="progress-line" style="flex:1;min-width:140px;max-width:320px"><span>${i + 1} / ${items.length}</span><div class="bar"><i style="width:${i / items.length * 100}%"></i></div></div>
        </div>
        <div class="card stack" style="gap:16px">
          <p class="eyebrow">${zh2en ? '把下面的句子翻译成英文' : '把下面的句子翻译成中文'}</p>
          <div class="row" style="flex-wrap:nowrap;align-items:flex-start"><div class="src grow ${zh2en ? '' : 'en'}">${esc(src)}</div>${zh2en ? '' : speakBtn(src)}</div>
          <textarea class="textarea" id="ans" placeholder="${zh2en ? 'Type your English translation…' : '输入你的中文翻译…'}" ${zh2en ? 'spellcheck="false" autocapitalize="sentences"' : ''} aria-label="你的翻译"></textarea>
          <div id="fb" class="stack"></div>
          <div class="row" style="justify-content:flex-end" id="acts">
            <button class="btn ghost" id="skip">直接看答案</button>
            <button class="btn primary" id="check">对照答案 <kbd>Enter</kbd></button>
          </div>
        </div>`;
      $('#tdir', pane).addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b || b.dataset.d === dir) return;
        dir = S.settings.transDir = b.dataset.d; save(); i = 0; scores.length = 0; render();
      });
      $('#check', pane).addEventListener('click', () => check(false));
      $('#skip', pane).addEventListener('click', () => check(true));
      $('#ans', pane).focus({ preventScroll: true });
    }
    function check(skip) {
      if (checked) return;
      const it = items[i], zh2en = dir === 'zh2en', input = $('#ans', pane), given = input.value.trim();
      if (!given && !skip) { input.focus(); toast('先写下你的翻译'); return; }
      checked = true; input.readOnly = true;
      const ref = zh2en ? it.en : it.zh;
      let sim = 0, refHTML;
      if (zh2en) {
        const mine = new Set(enTokens(given));
        sim = dice(enTokens(given), enTokens(ref));
        refHTML = ref.replace(/[A-Za-z]+(?:'[A-Za-z]+)?|[^A-Za-z]+/g, t => /[A-Za-z]/.test(t) && mine.has(enTokens(t)[0]) ? `<span class="hit">${esc(t)}</span>` : esc(t));
      } else {
        const mine = new Set([...given]);
        sim = dice(zhGrams(given), zhGrams(ref));
        refHTML = [...ref].map(c => mine.has(c) && !/[\s\p{P}]/u.test(c) ? `<span class="hit">${esc(c)}</span>` : esc(c)).join('');
      }
      const lvl = sim >= .7 ? 'good' : sim >= .4 ? '' : 'bad';
      $('#fb', pane).innerHTML = `
        <div class="ref"><div class="row between"><span class="lbl">参考译文</span>${zh2en ? speakBtn(ref) : ''}</div><div class="txt">${refHTML}</div></div>
        ${given ? `<div class="meter"><span>与参考译文相似度</span><div class="bar ${lvl === 'good' ? 'good' : ''}"><i style="width:${Math.round(sim * 100)}%"></i></div><b>${pct(sim)}</b></div>` : ''}
        <p class="muted small">翻译没有唯一答案。对照参考，给自己打个分：</p>`;
      $('#acts', pane).innerHTML = `
        <button class="btn bad" data-s="0">✗ 不对 <kbd>1</kbd></button>
        <button class="btn warn" data-s="0.5">△ 部分对 <kbd>2</kbd></button>
        <button class="btn good" data-s="1">✓ 对了 <kbd>3</kbd></button>`;
      $$('#acts [data-s]', pane).forEach(b => b.addEventListener('click', () => rate(+b.dataset.s)));
      if (zh2en) speak(ref);
    }
    function rate(s) {
      const it = items[i], zh2en = dir === 'zh2en';
      scores.push(s); bump();
      if (s < 1) addMistake({ type: 'translation', key: null, q: zh2en ? it.zh : it.en, a: zh2en ? it.en : it.zh, given: $('#ans', pane).value.trim() || '（未作答）' });
      i++; render(); renderNavLite();
    }
    function finish() {
      keyFn = null;
      const total = scores.reduce((a, b) => a + b, 0);
      setBest(u.id + ':trans', total / items.length);
      pane.innerHTML = `<div class="card summary"><p class="eyebrow">翻译练习完成</p><div class="score">${total}<span class="muted" style="font-size:1.6rem"> / ${items.length}</span></div>
        <p class="muted">没有完全译对的句子已放进错题本。</p>
        <div class="row" style="justify-content:center"><button class="btn" id="again">再练一遍</button><button class="btn primary" id="flip">换个方向：${dir === 'zh2en' ? '英译中' : '中译英'}</button></div></div>`;
      $('#again', pane).addEventListener('click', () => { i = 0; scores.length = 0; bindKeys(); render(); });
      $('#flip', pane).addEventListener('click', () => { dir = S.settings.transDir = dir === 'zh2en' ? 'en2zh' : 'zh2en'; save(); i = 0; scores.length = 0; bindKeys(); render(); });
    }
    function bindKeys() {
      keyFn = e => {
        if (!checked && e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); check(false); }
        else if (checked && ['1', '2', '3'].includes(e.key)) { e.preventDefault(); rate([0, .5, 1][+e.key - 1]); }
      };
    }
    bindKeys(); render();
  }

  /* ---------- Review ---------- */
  function reviewPage(modeArg) {
    const due = dueWords();
    const mode = modeArg === 'spell' ? 'spell' : 'cards';
    const tomorrow = allWords().filter(w => S.progress[w.key] && S.progress[w.key].due === dayNum() + 1).length;
    const learned = allWords().filter(w => S.progress[w.key]);
    view.innerHTML = `<div class="page">
      <div class="stack" style="gap:6px"><p class="eyebrow">Spaced review</p><h1>今日复习</h1>
      <p class="muted">${due.length ? `有 <b style="color:var(--ink)">${due.length}</b> 个单词到了该复习的时候。按遗忘曲线复习，记得更牢。` : '按遗忘曲线（1、2、4、7、15、30 天）安排复习。'}</p></div>
      ${due.length ? `<div class="toolbar"><div class="seg"><a class="${mode === 'cards' ? 'on' : ''}" href="#/review/cards">卡片回忆</a><a class="${mode === 'spell' ? 'on' : ''}" href="#/review/spell">拼写复习</a></div></div>` : ''}
      <div id="rbody" class="stack" style="gap:18px"></div>
    </div>`;
    const body = $('#rbody');
    if (!due.length) {
      const next = BOOK.units.find(u => unitStats(u).pct < 1);
      body.innerHTML = `<div class="card empty"><span class="big-emoji">🌿</span><h2 style="color:var(--ink)">今天的复习都完成了</h2>
        <p style="margin:8px 0 20px">明天有 ${tomorrow} 个单词等你复习。</p>
        <div class="row" style="justify-content:center">
          ${next ? `<a class="btn primary" href="#/unit/${next.id}">学习新词：${esc(next.titleZh)}</a>` : ''}
          ${learned.length ? `<button class="btn" id="extra">随机练 ${Math.min(20, learned.length)} 个学过的词</button>` : ''}
        </div></div>`;
      if (learned.length) $('#extra').addEventListener('click', () => flashcards(body, shuffle(learned).slice(0, 20), { next: '#/', nextLabel: '回到首页' }));
      return;
    }
    const done = () => renderNavLite();
    if (mode === 'spell') dictation(body, shuffle(due), { requeue: true, onFinish: done });
    else flashcards(body, shuffle(due), { requeue: true, next: '#/review/spell', nextLabel: '再拼写一遍', onFinish: done });
  }

  /* ---------- Mistakes ---------- */
  const TYPES = { dictation: ['听写', 'accent'], cloze: ['填空', 'warn'], reading: ['阅读', 'good'], translation: ['翻译', 'bad'] };
  function mistakesPage(filter) {
    filter = TYPES[filter] ? filter : 'all';
    const list = S.mistakes.filter(m => filter === 'all' || m.type === filter);
    const wordKeys = [...new Set(S.mistakes.filter(m => m.key).map(m => m.key))];
    const drillWords = wordKeys.map(wordByKey).filter(Boolean);
    view.innerHTML = `<div class="page">
      <div class="row between" style="align-items:flex-end">
        <div class="stack" style="gap:6px"><p class="eyebrow">Mistake book</p><h1>错题本</h1><p class="muted">做错的题会自动收集在这里，反复练到会为止。</p></div>
        ${drillWords.length ? `<button class="btn primary" id="drill">重练错词（${drillWords.length}）</button>` : ''}
      </div>
      <div class="seg" style="align-self:flex-start">
        ${[['all', '全部'], ...Object.entries(TYPES).map(([k, v]) => [k, v[0]])].map(([k, l]) => `<a class="${filter === k ? 'on' : ''}" href="#/mistakes/${k}">${l} ${k === 'all' ? S.mistakes.length : S.mistakes.filter(m => m.type === k).length}</a>`).join('')}
      </div>
      <div id="mbody">${list.length ? `<div class="card">${list.map(m => `
        <div class="m-item">
          <span class="tag ${TYPES[m.type][1]}">${TYPES[m.type][0]}</span>
          <div class="body">
            <div class="qq">${esc(m.q)}</div>
            <div class="ans">你的答案：<span class="yours">${esc(m.given)}</span></div>
            <div class="ans">正确答案：<span class="right">${esc(m.a)}</span></div>
            <div class="muted small">${new Date(m.t).toLocaleDateString('zh-CN')}${m.n > 1 ? ` · 错了 ${m.n} 次` : ''}</div>
          </div>
          ${/^[A-Za-z]/.test(m.a) ? speakBtn(m.a) : ''}
          <button class="x-btn" data-del="${m.id}" aria-label="移除" title="我已经会了，移除">×</button>
        </div>`).join('')}</div>
        <div class="row" style="justify-content:center"><button class="btn ghost small" id="clearAll">清空${filter === 'all' ? '全部' : '此类'}错题</button></div>`
        : `<div class="card empty"><span class="big-emoji">✨</span>这里还没有错题。</div>`}</div>
    </div>`;
    $$('[data-del]').forEach(b => b.addEventListener('click', () => { S.mistakes = S.mistakes.filter(m => m.id !== b.dataset.del); save(); router(); }));
    const clr = $('#clearAll');
    if (clr) clr.addEventListener('click', () => { if (confirm('确定清空这些错题吗？')) { S.mistakes = S.mistakes.filter(m => filter !== 'all' && m.type !== filter); save(); router(); } });
    const dr = $('#drill');
    if (dr) dr.addEventListener('click', () => {
      $('#mbody').innerHTML = '<div id="dbody" class="stack" style="gap:18px"></div>';
      dictation($('#dbody'), shuffle(drillWords), { clearMistakes: true, requeue: true });
    });
  }

  /* ---------- My words ---------- */
  function parseBulk(text) {
    const ok = [], bad = [];
    for (let line of text.split(/\r?\n/)) {
      line = line.trim(); if (!line) continue;
      let w, zh, ex = '', exZh = '';
      const sep = line.includes('\t') ? '\t' : line.includes('|') ? '|' : null;
      if (sep) {
        [w, zh, ex = '', exZh = ''] = line.split(sep).map(s => s.trim());
      } else {
        let m = line.match(/^([A-Za-z][A-Za-z'’\- ]*?)\s*[,，:：]\s*(.+)$/) || line.match(/^([A-Za-z][A-Za-z'’\-]*(?: [A-Za-z'’\-]+)*)\s+([^A-Za-z].*)$/);
        if (m) {
          w = m[1]; zh = m[2];
          const e = zh.match(/^(.*?)[,，]\s*([A-Z"“].*)$/);
          if (e) { zh = e[1]; ex = e[2]; }
        }
      }
      if (w && zh && /^[A-Za-z]/.test(w)) ok.push({ w: w.trim(), zh: zh.trim(), ex: ex.trim(), exZh: exZh.trim(), ph: '', pos: '' });
      else bad.push(line);
    }
    return { ok, bad };
  }
  function upsertWords(list) {
    let added = 0, updated = 0;
    for (const nw of list) {
      const old = S.custom.find(x => x.w.toLowerCase() === nw.w.toLowerCase());
      if (old) { Object.keys(nw).forEach(k => { if (nw[k]) old[k] = nw[k]; }); updated++; }
      else { S.custom.push(Object.assign({ added: Date.now() }, nw)); added++; }
    }
    save();
    return { added, updated };
  }

  function myWordsPage() {
    view.innerHTML = `<div class="page">
      <div class="row between" style="align-items:flex-end">
        <div class="stack" style="gap:6px"><p class="eyebrow">My words</p><h1>我的词库</h1><p class="muted">把课本、真题或生活中遇到的生词放进来，一样可以卡片记忆、听写和复习。</p></div>
        ${S.custom.length ? `<a class="btn primary" href="#/unit/my">开始学习（${S.custom.length}）</a>` : ''}
      </div>

      <section class="card stack">
        <h3>添加一个单词</h3>
        <form id="addForm" class="form-grid">
          <label class="field">英文单词 *<input class="input" name="w" required autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="abandon"></label>
          <label class="field">中文释义 *<input class="input" name="zh" required autocomplete="off" placeholder="放弃；抛弃"></label>
          <label class="field">音标<input class="input" name="ph" autocomplete="off" placeholder="/əˈbændən/"></label>
          <label class="field">词性<input class="input" name="pos" autocomplete="off" placeholder="v."></label>
          <label class="field span2">例句（可选，用于例句填空）<input class="input" name="ex" autocomplete="off" placeholder="They had to abandon the car in the snow."></label>
          <label class="field span2">例句翻译<input class="input" name="exZh" autocomplete="off" placeholder="他们不得不把车丢弃在雪地里。"></label>
          <div class="span2 row" style="justify-content:flex-end"><button class="btn primary" type="submit">添加</button></div>
        </form>
      </section>

      <section class="card stack">
        <h3>批量导入</h3>
        <p class="muted small">每行一个单词。格式：<b>单词, 中文释义, 例句</b>（例句可省略）。也支持用 Tab 或 | 分隔：单词 | 释义 | 例句 | 例句翻译</p>
        <div class="code">abandon, 放弃；抛弃, They had to abandon the car.
brilliant, 杰出的；明亮的
curiosity | 好奇心 | Curiosity is the key to learning. | 好奇心是学习的关键。</div>
        <textarea class="textarea" id="bulk" placeholder="在这里粘贴你的单词表…" spellcheck="false"></textarea>
        <div class="row" style="justify-content:flex-end"><button class="btn primary" id="importBtn">导入</button></div>
      </section>

      <section class="card stack">
        <div class="row between"><h3>全部单词 <span class="muted" style="font-size:.9rem">${S.custom.length}</span></h3>
        ${S.custom.length ? `<input class="input" id="filter" placeholder="搜索…" style="max-width:220px;min-height:38px;padding:6px 12px">` : ''}</div>
        <div id="mylist" class="word-list"></div>
      </section>
    </div>`;

    const listEl = $('#mylist');
    const drawList = (q = '') => {
      q = q.toLowerCase();
      const items = S.custom.filter(w => !q || w.w.toLowerCase().includes(q) || w.zh.includes(q));
      listEl.innerHTML = items.length ? items.slice().reverse().map(w => {
        const p = S.progress[wkey('my', w)];
        return `<div class="word-item"><span class="dot ${p ? 'b' + p.box : ''}"></span>
          <div class="meta"><div class="row" style="gap:8px"><span class="w">${esc(w.w)}</span><span class="muted small">${esc(w.ph || '')}</span></div>
          <div class="zh"><i class="muted serif">${esc(w.pos || '')}</i> ${esc(w.zh)}</div>${w.ex ? `<div class="muted small serif">${markWord(w.ex, w.w)}</div>` : ''}</div>
          ${speakBtn(w.w)}<button class="x-btn" data-del="${esc(w.w)}" aria-label="删除 ${esc(w.w)}" title="删除">×</button></div>`;
      }).join('') : `<div class="empty">${S.custom.length ? '没有匹配的单词' : '还没有添加单词'}</div>`;
      $$('[data-del]', listEl).forEach(b => b.addEventListener('click', () => {
        if (!confirm(`删除 “${b.dataset.del}” ？`)) return;
        S.custom = S.custom.filter(x => x.w !== b.dataset.del);
        delete S.progress['my:' + b.dataset.del.toLowerCase()];
        save(); router();
      }));
    };
    drawList();
    const f = $('#filter'); if (f) f.addEventListener('input', () => drawList(f.value));

    $('#addForm').addEventListener('submit', e => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(e.target));
      Object.keys(d).forEach(k => d[k] = d[k].trim());
      if (!/^[A-Za-z]/.test(d.w)) { toast('请输入英文单词'); return; }
      const r = upsertWords([d]);
      toast(r.added ? `已添加 ${d.w}` : `已更新 ${d.w}`);
      router();
    });
    $('#importBtn').addEventListener('click', () => {
      const { ok, bad } = parseBulk($('#bulk').value);
      if (!ok.length) { toast('没有识别到单词，请检查格式'); return; }
      const r = upsertWords(ok);
      toast(`导入 ${r.added} 个新词${r.updated ? `，更新 ${r.updated} 个` : ''}${bad.length ? `，${bad.length} 行无法识别` : ''}`);
      router();
    });
  }

  /* ---------- Settings ---------- */
  function settingsPage() {
    const st = S.settings;
    const seg = (name, opts) => `<div class="seg" data-set="${name}">${opts.map(([v, l]) => `<button type="button" data-v="${v}" class="${String(st[name]) === String(v) ? 'on' : ''}">${l}</button>`).join('')}</div>`;
    view.innerHTML = `<div class="page">
      <div class="stack" style="gap:6px"><p class="eyebrow">Settings</p><h1>设置</h1></div>
      <section class="card">
        <div class="settings-row"><div class="lbl"><b>每日目标</b><span>每天完成的练习次数</span></div>${seg('goal', [[10, '10'], [20, '20'], [30, '30'], [50, '50']])}</div>
        <div class="settings-row"><div class="lbl"><b>外观</b><span>纸张浅色或夜读深色</span></div>${seg('theme', [['auto', '跟随系统'], ['light', '浅色'], ['dark', '深色']])}</div>
        <div class="settings-row"><div class="lbl"><b>发音</b><span>${TTS ? '使用浏览器自带的语音朗读' : '当前浏览器不支持语音朗读'}</span></div>${seg('accent', [['en-US', '美式'], ['en-GB', '英式']])}</div>
        <div class="settings-row"><div class="lbl"><b>语速</b><span id="rateVal">${st.rate.toFixed(2)}×</span></div><div class="row"><input type="range" id="rate" min="0.5" max="1.3" step="0.05" value="${st.rate}" aria-label="语速">${speakBtn('Practice makes perfect.')}</div></div>
        <div class="settings-row"><div class="lbl"><b>自动发音</b><span>翻到新卡片时自动朗读单词</span></div>${seg('autoplay', [[true, '开'], [false, '关']])}</div>
      </section>
      <section class="card">
        <div class="settings-row"><div class="lbl"><b>备份学习记录</b><span>进度只保存在这台设备的浏览器里，换设备前请先导出</span></div><button class="btn" id="exp">导出备份</button></div>
        <div class="settings-row"><div class="lbl"><b>恢复备份</b><span>从导出的 .json 文件恢复</span></div><label class="btn">导入备份<input type="file" id="imp" accept=".json,application/json" hidden></label></div>
        <div class="settings-row"><div class="lbl"><b>重置</b><span>清除所有进度、错题和自定义单词</span></div><button class="btn bad" id="reset">重置全部</button></div>
      </section>
      <p class="muted small" style="text-align:center">Word Garden · 内置 ${BOOK.units.length} 个单元 ${BOOK.units.reduce((a, u) => a + u.words.length, 0)} 个四级核心词</p>
    </div>`;
    $$('[data-set]').forEach(g => g.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      const name = g.dataset.set, raw = b.dataset.v;
      st[name] = name === 'goal' ? +raw : name === 'autoplay' ? raw === 'true' : raw;
      save();
      if (name === 'theme') applyTheme();
      if (name === 'accent') pickVoice();
      $$('button', g).forEach(x => x.classList.toggle('on', x === b));
    }));
    $('#rate').addEventListener('input', e => { st.rate = +e.target.value; $('#rateVal').textContent = st.rate.toFixed(2) + '×'; save(); });
    $('#exp').addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = `wordgarden-backup-${today()}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });
    $('#imp').addEventListener('change', e => {
      const file = e.target.files[0]; if (!file) return;
      const rd = new FileReader();
      rd.onload = () => {
        try {
          const d = JSON.parse(rd.result);
          if (!d || typeof d.progress !== 'object') throw new Error('bad');
          if (!confirm('用备份覆盖当前的学习记录吗？')) return;
          const base = defaults();
          S = Object.assign(base, d, { settings: Object.assign(base.settings, d.settings || {}) });
          save(); applyTheme(); pickVoice(); toast('已恢复备份'); router();
        } catch (err) { toast('无法读取这个文件'); }
      };
      rd.readAsText(file);
    });
    $('#reset').addEventListener('click', () => {
      if (!confirm('确定清除所有学习记录、错题和自定义单词吗？此操作无法撤销。')) return;
      S = defaults(); save(); applyTheme(); toast('已重置'); location.hash = '#/';
    });
  }

  // Refresh nav badges without re-rendering the current page.
  function renderNavLite() {
    const parts = location.hash.replace(/^#\/?/, '').split('/');
    renderNav(parts[0] || '', parts[0] === 'unit' ? parts[1] : null);
  }

  applyTheme();
  router();
})();
