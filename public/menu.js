(function () {
  const tg = window.Telegram?.WebApp;
  if (tg) tg.expand();

  function send(payload) {
    if (!tg || typeof tg.sendData !== 'function') {
      alert('This menu only works inside Telegram.');
      return;
    }
    tg.sendData(JSON.stringify(payload));
    // Telegram closes the TMA automatically after sendData.
  }

  function openMap() {
    const url = '/app/map' + (location.search || '');
    if (tg && typeof tg.openLink === 'function') tg.openLink(window.location.origin + url, { try_instant_view: false });
    else window.location.href = url;
  }

  document.querySelectorAll('.tile').forEach((el) => {
    el.addEventListener('click', () => {
      const cmd = el.dataset.cmd;
      if (cmd === 'cuisine') {
        document.getElementById('cuisine-modal').classList.add('show');
        return;
      }
      if (cmd === 'map') {
        openMap();
        return;
      }
      send({ cmd });
    });
  });

  document.querySelectorAll('#cuisine-modal .types button').forEach((btn) => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.type;
      send({ cmd: 'cuisine', type });
    });
  });

  document.getElementById('cuisine-cancel').addEventListener('click', () => {
    document.getElementById('cuisine-modal').classList.remove('show');
  });
})();
