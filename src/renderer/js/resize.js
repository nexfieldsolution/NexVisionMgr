function startPanelResize(e) {
  e.preventDefault();
  const panel  = document.getElementById('terminal-panel');
  const startY = e.clientY;
  const startH = panel.offsetHeight;

  function onMove(e) {
    const newH = Math.max(60, Math.min(600, startH + (startY - e.clientY)));
    panel.style.height = newH + 'px';
  }
  function onUp() {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    document.body.style.cursor = '';
  }
  document.body.style.cursor = 'ns-resize';
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

function startProjectPanelResize(e) {
  e.preventDefault();
  const panel  = document.getElementById('project-panel');
  const startX = e.clientX;
  const startW = panel.offsetWidth;

  function onMove(e) {
    const newW = Math.max(160, Math.min(600, startW + (e.clientX - startX)));
    panel.style.width = newW + 'px';
  }
  function onUp() {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    document.body.style.cursor = '';
  }
  document.body.style.cursor = 'ew-resize';
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

function startVisionPanelResize(e) {
  e.preventDefault();
  const panel  = document.getElementById('control-panel');
  const startX = e.clientX;
  const startW = panel.offsetWidth;

  function onMove(e) {
    const newW = Math.max(200, Math.min(700, startW + (startX - e.clientX)));
    panel.style.width = newW + 'px';
  }
  function onUp() {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    document.body.style.cursor = '';
  }
  document.body.style.cursor = 'ew-resize';
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}
