(function () {
  const tg = window.Telegram?.WebApp;
  if (tg) tg.expand();

  function send(payload) {
    if (!tg || typeof tg.sendData !== 'function') {
      alert('This menu only works inside Telegram.');
      return;
    }
    tg.sendData(JSON.stringify(payload));
  }

  function openInternal(path) {
    // Navigate inside the same WebApp container so the user stays inside
    // the TMA shell (used for /app/cuisine and /app/map).
    const url = path + (location.search || '');
    window.location.href = url;
  }

  document.querySelectorAll('.tile').forEach((el) => {
    el.addEventListener('click', () => {
      const cmd = el.dataset.cmd;
      if (cmd === 'cuisine') { openInternal('/app/cuisine'); return; }
      if (cmd === 'map')     { openInternal('/app/map');     return; }
      send({ cmd });
    });
  });
})();
