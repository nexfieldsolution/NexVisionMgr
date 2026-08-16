let activePanelName = 'console';
let terminalIdCounter = 0;
const terminals = [];

function initPanels() {
  window.electronAPI.onPtyData(({ id, data }) => {
    terminals.find(t => t.ptyId === id)?.xterm?.write(data);
  });
  window.electronAPI.onPtyExit(({ id }) => {
    const t = terminals.find(t => t.ptyId === id);
    if (t) t.xterm?.write('\r\n\x1b[90m[프로세스 종료]\x1b[0m\r\n');
  });

  // 콘솔 출력 영역 우클릭 (복사만)
  document.getElementById('terminal-output')?.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    showPanelContextMenu(e.clientX, e.clientY, {
      getCopy: () => window.getSelection()?.toString() || '',
      paste: null,
    });
  });
}

function showPanelContextMenu(x, y, { getCopy, paste }) {
  let menu = document.getElementById('panel-ctx-menu');
  if (!menu) {
    menu = document.createElement('div');
    menu.id = 'panel-ctx-menu';
    menu.className = 'panel-ctx-menu';
    document.body.appendChild(menu);
    document.addEventListener('click', () => { menu.style.display = 'none'; }, true);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') menu.style.display = 'none'; });
  }

  menu.innerHTML = '';

  const copyItem = document.createElement('div');
  copyItem.className = 'panel-ctx-item';
  copyItem.textContent = '복사하기';
  copyItem.onclick = async () => {
    const text = getCopy();
    if (text) await navigator.clipboard.writeText(text);
    menu.style.display = 'none';
  };
  menu.appendChild(copyItem);

  if (paste) {
    const pasteItem = document.createElement('div');
    pasteItem.className = 'panel-ctx-item';
    pasteItem.textContent = '붙여넣기';
    pasteItem.onclick = async () => {
      const text = await navigator.clipboard.readText();
      if (text) paste(text);
      menu.style.display = 'none';
    };
    menu.appendChild(pasteItem);
  }

  // 화면 밖으로 나가지 않게 위치 조정
  menu.style.display = 'block';
  const mw = menu.offsetWidth, mh = menu.offsetHeight;
  menu.style.left = (x + mw > window.innerWidth  ? x - mw : x) + 'px';
  menu.style.top  = (y + mh > window.innerHeight ? y - mh : y) + 'px';
}

async function addTerminalTab() {
  terminalIdCounter++;
  const id        = terminalIdCounter;
  const panelName = `terminal-${id}`;
  const label     = id === 1 ? '🖥️ 터미널' : `🖥️ 터미널 ${id}`;

  const tabEl = document.createElement('div');
  tabEl.id        = `tab-btn-${panelName}`;
  tabEl.className = 'panel-tab';
  tabEl.onclick = () => switchPanel(panelName);
  tabEl.innerHTML = `<span>${label}</span><span class="tab-close-btn" title="닫기">✕</span>`;
  tabEl.querySelector('.tab-close-btn').onclick = (e) => { e.stopPropagation(); closeTerminalTab(id); };
  document.getElementById('panel-tabs').appendChild(tabEl);

  const paneEl = document.createElement('div');
  paneEl.id = `bash-pane-${id}`;
  paneEl.style.cssText = 'flex:1; min-height:0; overflow:hidden; display:none;';
  document.getElementById('panels-content').appendChild(paneEl);

  terminals.push({ id, panelName, paneEl, tabEl, xterm: null, fitAddon: null, ptyId: null });

  switchPanel(panelName);

  // Two rAF cycles to ensure flex layout has been computed
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

  try {
    const xterm = new Terminal({
      fontFamily: "Consolas, 'Courier New', monospace",
      fontSize: 13,
      theme: { background: '#1e1e1e', foreground: '#cccccc', cursor: '#ffffff' },
      cursorBlink: true,
      convertEol: true,
    });
    const fitAddon = new FitAddon.FitAddon();
    xterm.loadAddon(fitAddon);
    xterm.open(paneEl);
    fitAddon.fit();

    const ptyId = await window.electronAPI.ptyCreate(currentProjectPath || null);
    xterm.onData((data) => window.electronAPI.ptyWrite(ptyId, data));
    window.electronAPI.ptyResize(ptyId, xterm.cols, xterm.rows);

    // xterm 우클릭 컨텍스트 메뉴 (복사 + 붙여넣기)
    xterm.element.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showPanelContextMenu(e.clientX, e.clientY, {
        getCopy: () => xterm.getSelection(),
        paste: (text) => window.electronAPI.ptyWrite(ptyId, text),
      });
    });

    const t = terminals.find(t => t.id === id);
    if (t) { t.xterm = xterm; t.fitAddon = fitAddon; t.ptyId = ptyId; }

    new ResizeObserver(() => {
      if (paneEl.style.display !== 'none') {
        fitAddon.fit();
        window.electronAPI.ptyResize(ptyId, xterm.cols, xterm.rows);
      }
    }).observe(paneEl);

    xterm.focus();
  } catch (e) {
    console.error('[bash] addTerminalTab 실패:', e);
  }
}

function switchPanel(name) {
  const consolePan    = document.getElementById('console-pane');
  const panelsContent = document.getElementById('panels-content');

  if (name === 'console') {
    if (consolePan)    consolePan.style.display    = 'flex';
    if (panelsContent) panelsContent.style.display = 'none';
    terminals.forEach(t => { t.paneEl.style.display = 'none'; });
  } else {
    if (consolePan)    consolePan.style.display    = 'none';
    if (panelsContent) panelsContent.style.display = 'flex';
    terminals.forEach(t => {
      const show = name === t.panelName;
      t.paneEl.style.display = show ? 'flex' : 'none';
      if (show && t.xterm) {
        requestAnimationFrame(() => {
          t.fitAddon?.fit();
          if (t.ptyId) window.electronAPI.ptyResize(t.ptyId, t.xterm.cols, t.xterm.rows);
          t.xterm.focus();
        });
      }
    });
  }

  document.querySelectorAll('.panel-tab').forEach(el => el.classList.remove('panel-tab-active'));
  document.getElementById(`tab-btn-${name}`)?.classList.add('panel-tab-active');
  activePanelName = name;
}

function clearActivePanel() {
  if (activePanelName === 'console') {
    clearTerminalOutput();
  } else {
    terminals.find(t => t.panelName === activePanelName)?.xterm?.clear();
  }
}

function closeConsoleTab() {
  const tabEl = document.getElementById('tab-btn-console');
  const consolePan = document.getElementById('console-pane');
  if (tabEl) tabEl.style.display = 'none';
  if (consolePan) consolePan.style.display = 'none';
  if (activePanelName === 'console') {
    if (terminals.length > 0) switchPanel(terminals[0].panelName);
  }
}

function closeTerminalTab(id) {
  const idx = terminals.findIndex(t => t.id === id);
  if (idx === -1) return;
  const t = terminals[idx];

  if (t.ptyId) window.electronAPI.ptyKill(t.ptyId);
  t.xterm?.dispose();
  t.paneEl.remove();
  t.tabEl.remove();
  terminals.splice(idx, 1);

  if (activePanelName === t.panelName) {
    if (terminals.length > 0) {
      switchPanel(terminals[Math.min(idx, terminals.length - 1)].panelName);
    } else {
      const consoleTab = document.getElementById('tab-btn-console');
      if (consoleTab && consoleTab.style.display !== 'none') {
        switchPanel('console');
      }
    }
  }
}
