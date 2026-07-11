/* WORLD CUP widget — shows a "WORLD CUP" banner with a soccer ball at the top
   of the page. Tap the ball to see all World Cup matches for today & tomorrow
   (live scores update every 30s while the popup is open).
   Install: <script src="worldcup-widget.js"></script> before </body>. */
(function () {
  'use strict';

  var API = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard';

  var css = [
    '#wc-badge{position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:999999;',
    'display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer;',
    'user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;',
    'font-family:Arial,Helvetica,sans-serif;text-align:center}',
    '#wc-badge .wc-title{font-weight:900;font-size:18px;letter-spacing:3px;color:#ffd700;',
    'text-shadow:0 2px 4px rgba(0,0,0,.8),0 0 10px rgba(255,215,0,.5)}',
    '#wc-badge .wc-ball{font-size:44px;line-height:1;filter:drop-shadow(0 4px 6px rgba(0,0,0,.5));',
    'animation:wc-bounce 1.6s ease-in-out infinite;display:block}',
    '@keyframes wc-bounce{0%,100%{transform:translateY(0) rotate(0deg)}',
    '50%{transform:translateY(-8px) rotate(20deg)}}',
    '#wc-badge:active .wc-ball{transform:scale(.9)}',
    '#wc-overlay{position:fixed;inset:0;z-index:1000000;background:rgba(0,0,0,.75);',
    'display:none;align-items:flex-start;justify-content:center;overflow-y:auto;padding:20px 10px}',
    '#wc-overlay.wc-open{display:flex}',
    '#wc-panel{background:#0b1c33;color:#fff;border:2px solid #ffd700;border-radius:16px;',
    'max-width:440px;width:100%;padding:18px;font-family:Arial,Helvetica,sans-serif;',
    'box-shadow:0 10px 40px rgba(0,0,0,.6);margin:auto 0}',
    '#wc-panel h2{margin:0 0 4px;font-size:22px;letter-spacing:2px;color:#ffd700;text-align:center}',
    '#wc-panel .wc-sub{text-align:center;font-size:12px;opacity:.7;margin-bottom:12px}',
    '#wc-panel h3{margin:14px 0 6px;font-size:14px;text-transform:uppercase;letter-spacing:1px;',
    'color:#7fd0ff;border-bottom:1px solid rgba(255,255,255,.15);padding-bottom:4px}',
    '.wc-match{display:flex;align-items:center;justify-content:space-between;gap:8px;',
    'padding:8px 10px;margin:6px 0;background:rgba(255,255,255,.06);border-radius:10px;font-size:15px}',
    '.wc-match.wc-live{background:rgba(255,60,60,.18);border:1px solid rgba(255,80,80,.6)}',
    '.wc-teams{flex:1;font-weight:700}',
    '.wc-score{font-weight:900;font-size:17px;color:#ffd700;white-space:nowrap}',
    '.wc-status{font-size:11px;opacity:.8;white-space:nowrap;text-align:right;min-width:64px}',
    '.wc-live .wc-status{color:#ff6b6b;font-weight:700;opacity:1}',
    '.wc-empty,.wc-loading,.wc-error{text-align:center;padding:14px;opacity:.8;font-size:14px}',
    '.wc-error{color:#ff8a8a}',
    '#wc-close{display:block;margin:14px auto 0;background:#ffd700;color:#0b1c33;border:0;',
    'border-radius:999px;padding:10px 28px;font-size:15px;font-weight:900;cursor:pointer}'
  ].join('');

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  var badge = document.createElement('div');
  badge.id = 'wc-badge';
  badge.innerHTML = '<span class="wc-title">WORLD CUP</span><span class="wc-ball">⚽</span>';
  document.body.appendChild(badge);

  var overlay = document.createElement('div');
  overlay.id = 'wc-overlay';
  overlay.innerHTML =
    '<div id="wc-panel"><h2>⚽ WORLD CUP</h2>' +
    '<div class="wc-sub">Matches today &amp; tomorrow (your local time)</div>' +
    '<div id="wc-list"><div class="wc-loading">Loading matches…</div></div>' +
    '<button id="wc-close">Close</button></div>';
  document.body.appendChild(overlay);

  var list = overlay.querySelector('#wc-list');
  var refreshTimer = null;

  function ymd(d) {
    return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function renderMatch(ev) {
    var comp = ev.competitions && ev.competitions[0];
    if (!comp) return '';
    var home = null, away = null;
    (comp.competitors || []).forEach(function (c) {
      if (c.homeAway === 'home') home = c; else away = c;
    });
    if (!home || !away) return '';
    var state = ev.status && ev.status.type ? ev.status.type.state : 'pre'; // pre | in | post
    var live = state === 'in';
    var mid = '';
    if (state === 'pre') {
      mid = new Date(ev.date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } else {
      mid = (home.score || '0') + ' - ' + (away.score || '0');
    }
    var status = '';
    if (live) status = '🔴 LIVE ' + esc(ev.status.displayClock || '');
    else if (state === 'post') status = 'Final';
    else status = 'Kickoff';
    return '<div class="wc-match' + (live ? ' wc-live' : '') + '">' +
      '<span class="wc-teams">' + esc(home.team.displayName) + '<br>' + esc(away.team.displayName) + '</span>' +
      '<span class="wc-score">' + esc(mid) + '</span>' +
      '<span class="wc-status">' + status + '</span></div>';
  }

  function load() {
    var today = new Date();
    var tomorrow = new Date(today.getTime() + 86400000);
    // Ask for a day either side too, so timezone differences don't drop games.
    var from = ymd(new Date(today.getTime() - 86400000));
    var to = ymd(new Date(tomorrow.getTime() + 86400000));
    fetch(API + '?dates=' + from + '-' + to)
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (data) {
        var todayStr = today.toDateString();
        var tomorrowStr = tomorrow.toDateString();
        var groups = { today: [], tomorrow: [] };
        (data.events || []).forEach(function (ev) {
          var d = new Date(ev.date).toDateString();
          if (d === todayStr) groups.today.push(ev);
          else if (d === tomorrowStr) groups.tomorrow.push(ev);
        });
        var html = '<h3>Today</h3>';
        html += groups.today.length
          ? groups.today.map(renderMatch).join('')
          : '<div class="wc-empty">No matches today</div>';
        html += '<h3>Tomorrow</h3>';
        html += groups.tomorrow.length
          ? groups.tomorrow.map(renderMatch).join('')
          : '<div class="wc-empty">No matches tomorrow</div>';
        list.innerHTML = html;
      })
      .catch(function () {
        list.innerHTML = '<div class="wc-error">Couldn’t load matches — check your internet and try again.</div>';
      });
  }

  function open() {
    overlay.classList.add('wc-open');
    list.innerHTML = '<div class="wc-loading">Loading matches…</div>';
    load();
    refreshTimer = setInterval(load, 30000);
  }

  function close() {
    overlay.classList.remove('wc-open');
    clearInterval(refreshTimer);
    refreshTimer = null;
  }

  badge.addEventListener('click', open);
  overlay.querySelector('#wc-close').addEventListener('click', close);
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) close();
  });
})();
