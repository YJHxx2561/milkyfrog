(function () {
  'use strict';

  var root = document.documentElement;
  var screen = document.getElementById('frogScreen');
  var video = document.getElementById('frogVideo');
  var poster = document.getElementById('frogPoster');
  var stopBtn = document.getElementById('stopBtn');
  var loopBtn = document.getElementById('loopBtn');
  var loopLabel = document.getElementById('loopLabel');
  var themeBtn = document.getElementById('themeBtn');
  var volumeBtn = document.getElementById('volumeBtn');
  var volumePopover = document.getElementById('volumePopover');
  var soundBtn = document.getElementById('soundBtn');
  var volumeSlider = document.getElementById('volumeSlider');
  var volumeValue = document.getElementById('volumeValue');
  var countBtn = document.getElementById('countBtn');
  var infoBtn = document.getElementById('infoBtn');
  var infoPanel = document.getElementById('infoPanel');
  var infoClose = document.getElementById('infoClose');
  var metaTheme = document.querySelector('meta[name="theme-color"]');
  var darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

  // 前 2 秒奶蛙还没笑，飘字从第 2 秒开始
  var HAHA_FROM = 2;

  var themeOrder = ['light', 'dark', 'system'];
  var themeNames = {
    light: '白天',
    dark: '黑夜',
    system: '跟随系统'
  };
  var themeIcons = {
    // 太阳
    light: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>',
    // 月亮
    dark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>',
    // 电脑（跟随系统）
    system: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></svg>'
  };

  var volumeIcons = {
    on: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5z" /><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /></svg>',
    off: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5z" /><path d="m16 9 5 6M21 9l-5 6" /></svg>'
  };

  var playing = false;
  var soundOn = true;
  var volume = Number(volumeSlider.value); // 默认 30，比满音量小
  var laughCount = 0;
  var showCountLabel = false;
  var loadTimer = null;
  var endTimer = null;

  // ---------- 显示模式：单按钮循环 ----------

  function applyTheme(mode, persist) {
    var dark = mode === 'dark' || (mode === 'system' && darkQuery.matches);
    root.setAttribute('data-theme-mode', mode);
    root.setAttribute('data-theme', dark ? 'dark' : 'light');

    themeBtn.innerHTML = themeIcons[mode];
    themeBtn.setAttribute('aria-label', '显示模式：' + themeNames[mode] + '，点击切换');
    themeBtn.setAttribute('title', '显示模式：' + themeNames[mode]);

    if (metaTheme) {
      metaTheme.setAttribute('content', dark ? '#17130f' : '#fffcf2');
    }

    if (persist) {
      try { localStorage.setItem('mf-theme-mode', mode); } catch (e) {}
    }
  }

  themeBtn.addEventListener('click', function () {
    var current = root.getAttribute('data-theme-mode') || 'system';
    var index = themeOrder.indexOf(current);
    var next = themeOrder[(index + 1) % themeOrder.length];
    applyTheme(next, true);
  });

  if (darkQuery.addEventListener) {
    darkQuery.addEventListener('change', function () {
      if (root.getAttribute('data-theme-mode') === 'system') {
        applyTheme('system', false);
      }
    });
  }

  applyTheme(root.getAttribute('data-theme-mode') || 'system', false);

  // ---------- 音量弹窗 ----------

  function setPopover(open) {
    volumePopover.hidden = !open;
    volumeBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  volumeBtn.addEventListener('click', function (event) {
    event.stopPropagation();
    setPopover(volumePopover.hidden);
  });

  volumePopover.addEventListener('click', function (event) {
    event.stopPropagation();
  });

  document.addEventListener('click', function (event) {
    if (!volumePopover.hidden && !volumeBtn.contains(event.target) && !volumePopover.contains(event.target)) {
      setPopover(false);
    }
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') setPopover(false);
  });

  function applyVolume() {
    video.volume = volume / 100;
    video.muted = !soundOn;
  }

  // ---------- 播放控制 ----------

  function render() {
    screen.classList.toggle('hahaing', playing && video.currentTime >= HAHA_FROM);
    stopBtn.hidden = !playing;

    loopBtn.classList.toggle('is-looping', video.loop);
    loopBtn.setAttribute('aria-pressed', video.loop ? 'true' : 'false');
    loopLabel.textContent = video.loop ? '循环已开' : '循环大笑';

    soundBtn.classList.toggle('is-off', !soundOn);
    soundBtn.textContent = soundOn ? '声音：开' : '声音：关';
    soundBtn.setAttribute('aria-pressed', soundOn ? 'true' : 'false');

    volumeValue.textContent = volume + '%';
    volumeBtn.innerHTML = soundOn ? volumeIcons.on : volumeIcons.off;
    volumeBtn.setAttribute('aria-label', '音量设置，当前' + (soundOn ? volume + '%' : '静音'));

    countBtn.textContent = showCountLabel ? '已笑 ' + laughCount + ' 次' : String(laughCount);
    countBtn.setAttribute('aria-label', '奶蛙已经大笑 ' + laughCount + ' 次，点击切换显示完整次数');
  }

  function setLoading(on) {
    clearTimeout(loadTimer);
    if (on) {
      // 已缓存时不闪转圈
      loadTimer = setTimeout(function () {
        screen.classList.add('is-loading');
      }, 200);
    } else {
      screen.classList.remove('is-loading');
    }
  }

  function play() {
    if (playing) return;

    clearTimeout(endTimer);
    screen.classList.remove('show-end-hint');

    playing = true;
    laughCount += 1;
    screen.classList.add('has-played');

    // 在点击事件里同步设置 src 并 play()，兼容 iOS
    if (!video.getAttribute('src')) {
      video.src = video.dataset.src;
    }

    setLoading(true);
    applyVolume();

    if (video.ended) {
      try { video.currentTime = 0; } catch (e) {}
    }

    var promise = video.play();
    if (promise && promise.catch) {
      promise.catch(function () {
        // 有声播放被拦时退回静音
        video.muted = true;
        soundOn = false;
        render();
        video.play().catch(function () {});
      });
    }

    render();
  }

  function reset() {
    clearTimeout(endTimer);
    screen.classList.remove('show-end-hint');

    playing = false;
    video.loop = false;
    video.pause();
    try { video.currentTime = 0; } catch (e) {}
    setLoading(false);
    poster.style.opacity = '1';
    applyVolume();
    render();
  }

  screen.addEventListener('click', play);
  screen.addEventListener('keydown', function (event) {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      play();
    }
  });

  loopBtn.addEventListener('click', function (event) {
    event.stopPropagation();
    video.loop = !video.loop;
    if (video.loop) play();
    render();
  });

  stopBtn.addEventListener('click', function (event) {
    event.stopPropagation();
    reset();
  });

  soundBtn.addEventListener('click', function (event) {
    event.stopPropagation();
    soundOn = !soundOn;
    applyVolume();
    render();
  });

  volumeSlider.addEventListener('input', function () {
    volume = Number(volumeSlider.value);
    // 拖到 0 自动静音；从 0 拖回来自动恢复声音
    if (volume === 0) soundOn = false;
    else if (!soundOn) soundOn = true;
    applyVolume();
    render();
  });

  countBtn.addEventListener('click', function (event) {
    event.stopPropagation();
    showCountLabel = !showCountLabel;
    render();
  });

  video.addEventListener('playing', function () {
    setLoading(false);
    poster.style.opacity = '0';
  });

  video.addEventListener('waiting', function () {
    if (playing) setLoading(true);
  });

  video.addEventListener('timeupdate', render);

  video.addEventListener('ended', function () {
    if (!video.loop) {
      playing = false;
      setLoading(false);
      // 先提示，再自动回到首帧初始状态
      screen.classList.add('show-end-hint');
      clearTimeout(endTimer);
      endTimer = setTimeout(reset, 1600);
    }
    render();
  });

  video.addEventListener('error', function () {
    if (!video.getAttribute('src')) return;
    playing = false;
    video.loop = false;
    setLoading(false);
    video.removeAttribute('src');
    video.load();
    render();
  });

  // ---------- 右下角更多信息 ----------

  function setInfoPanel(open) {
    infoPanel.hidden = !open;
    infoBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  infoBtn.addEventListener('click', function (event) {
    event.stopPropagation();
    setInfoPanel(infoPanel.hidden);
  });

  infoClose.addEventListener('click', function (event) {
    event.stopPropagation();
    setInfoPanel(false);
  });

  infoPanel.addEventListener('click', function (event) {
    event.stopPropagation();
  });

  document.addEventListener('click', function (event) {
    if (!infoPanel.hidden && !infoBtn.contains(event.target) && !infoPanel.contains(event.target)) {
      setInfoPanel(false);
    }
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') setInfoPanel(false);
  });

  // 运行时间：从项目起始时间实时计时（可按需修改 SITE_START_AT）
  (function () {
    var el = document.getElementById('site_uptime');
    if (!el) return;

    var startedAt = new Date(2026, 10, 20, 20, 45, 0); // 2026-11-20 20:45（本地时间）
    var pad = function (n) { return String(n).padStart(2, '0'); };

    function renderUptime() {
      var elapsed = Math.max(0, Date.now() - startedAt.getTime());
      var days = Math.floor(elapsed / 86400000);
      var hours = Math.floor(elapsed / 3600000) % 24;
      var minutes = Math.floor(elapsed / 60000) % 60;
      var seconds = Math.floor(elapsed / 1000) % 60;
      el.textContent = days + '天 ' + pad(hours) + ':' + pad(minutes) + ':' + pad(seconds);
    }

    renderUptime();
    setInterval(renderUptime, 1000);
  })();

  // 访问统计：静态页用本地存储记录，保留 ID 便于以后接入统计服务
  (function () {
    var pvEl = document.getElementById('page_pv');
    var uvEl = document.getElementById('page_uv');
    if (!pvEl || !uvEl) return;

    var pv = 1;
    try {
      pv = Number(localStorage.getItem('mf-pv') || 0) + 1;
      localStorage.setItem('mf-pv', String(pv));
      if (!localStorage.getItem('mf-uv')) {
        localStorage.setItem('mf-uv', String(Date.now()));
      }
    } catch (e) {}

    pvEl.textContent = String(pv);
    uvEl.textContent = '1';
  })();

  // PWA：注册 Service Worker，支持安装与离线打开
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js').catch(function () {});
    });
  }

  applyVolume();
  render();
})();
