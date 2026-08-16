async function loadFragment(slotId, filename) {
  const res = await fetch(filename);
  const html = await res.text();
  document.getElementById(slotId).innerHTML = html;
}

function showToast(message, anchorEl, duration = 2000) {
  let toast = document.getElementById('toast-notification');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast-notification';
    document.body.appendChild(toast);
  }
  toast.textContent = message;

  if (anchorEl) {
    const rect = anchorEl.getBoundingClientRect();
    toast.style.left = (rect.right + 8) + 'px';
    toast.style.top = (rect.top + rect.height / 2) + 'px';
    toast.style.transform = 'translateY(-50%)';
    toast.style.bottom = '';
  }

  toast.classList.add('toast-visible');
  clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(() => toast.classList.remove('toast-visible'), duration);
}

function toggleProjectPanel(show) {
  const panel = document.getElementById('project-panel');
  if (show !== undefined) {
    panel.style.display = show ? 'flex' : 'none';
  } else {
    panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
  }
}

function toggleTerminalMenu(show) {
  const panel = document.getElementById('terminal-panel');
  if (show !== undefined) {
    panel.style.display = show ? 'flex' : 'none';
  } else {
    panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
  }
  if (panel.style.display !== 'none' && terminals.length === 0) {
    addTerminalTab();
  }
}

function clearTerminalOutput() {
  document.getElementById('terminal-output').textContent = '';
}

function showExplorerContextMenu(x, y, isFileSelected = false) {
  const menu = document.getElementById('explorer-context-menu');
  const fileOnlyItems = [
    document.getElementById('menu-opt-rename'),
    document.getElementById('menu-opt-copy'),
    document.getElementById('menu-opt-delete'),
    document.getElementById('menu-opt-copy-fullpath'),
    document.getElementById('menu-opt-copy-relpath'),
    document.getElementById('menu-sep-paths'),
  ];
  fileOnlyItems.forEach(el => { if (el) el.style.display = isFileSelected ? 'block' : 'none'; });

  if (!isFileSelected) { contextTargetFilePath = null; contextTargetFileName = null; }

  const optPaste = document.getElementById('menu-opt-paste');
  if (optPaste) {
    optPaste.style.opacity = clipboardFilePath ? '1' : '0.4';
    optPaste.style.pointerEvents = clipboardFilePath ? 'auto' : 'none';
  }

  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;
  menu.style.display = 'block';
}

function hideExplorerContextMenu() {
  document.getElementById('explorer-context-menu').style.display = 'none';
}

function showTabContextMenu(x, y, filePath) {
  contextTargetTabPath = filePath;
  const menu = document.getElementById('tab-context-menu');
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;
  menu.style.display = 'block';
}

function hideTabContextMenu() {
  document.getElementById('tab-context-menu').style.display = 'none';
}

async function handleTabContextMenu(action) {
  hideTabContextMenu();
  if (!contextTargetTabPath) return;

  if (action === 'copy-path') {
    await navigator.clipboard.writeText(contextTargetTabPath);
  } else if (action === 'copy-relative-path') {
    let relPath = contextTargetTabPath;
    if (currentProjectPath && contextTargetTabPath.startsWith(currentProjectPath)) {
      relPath = contextTargetTabPath.replace(currentProjectPath, '').replace(/^\//, '');
    }
    await navigator.clipboard.writeText(relPath);
  } else if (action === 'close') {
    closeTab(contextTargetTabPath);
  } else if (action === 'close-others') {
    openTabs = openTabs.filter(t => t.path === contextTargetTabPath);
    activeTabPath = contextTargetTabPath;
    renderTabs();
    renderActiveTabContent();
  } else if (action === 'close-all') {
    openTabs = [];
    activeTabPath = null;
    renderTabs();
    renderActiveTabContent();
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  // 1단계: 외곽 쉘 로드
  await Promise.all([
    loadFragment('slot-titlebar',      'renderer/titlebar.html'),
    loadFragment('slot-container',     'renderer/container.html'),
    loadFragment('slot-modals',        'renderer/components/modals.html'),
    loadFragment('slot-context-menus', 'renderer/components/context-menus.html'),
  ]);

  // 2단계: container 내부 패널 로드 (slot-actionbar 등은 1단계 후 존재)
  await Promise.all([
    loadFragment('slot-actionbar',    'renderer/actionbar.html'),
    loadFragment('slot-project',      'renderer/project.html'),
    loadFragment('slot-editor',       'renderer/editor.html'),
    loadFragment('slot-control-panel', 'renderer/control-panel.html'),
  ]);

  // 3단계: panels 쉘 로드 (slot-panels는 editor.html 로드 후 존재)
  await loadFragment('slot-panels', 'renderer/panels.html');

  // 4단계: 콘솔 로드 + 터미널은 JS로 동적 생성
  await loadFragment('slot-console', 'renderer/panels/console.html');

  // fragment 로드 완료 후 Monaco 초기화 및 패널 초기화
  initMonaco();
  initPanels();
  toggleTerminalMenu(false);

  refreshProjectFiles();
  populateRecentProjects();

  window.electronAPI.onWindowState((isMaximized) => {
    const btn = document.getElementById('maximize-btn')
    if (!btn) return
    btn.textContent = isMaximized ? '⧉' : '□'
    btn.title = isMaximized ? '복원' : '최대화'
  })

  document.getElementById('project-panel').addEventListener('contextmenu', (e) => {
    e.preventDefault();
    showExplorerContextMenu(e.clientX, e.clientY);
  });

  document.addEventListener('click', () => {
    hideExplorerContextMenu();
    hideTabContextMenu();
    const subMenu = document.getElementById('source-sub-menu');
    if (subMenu) subMenu.style.display = 'none';
  });

  document.addEventListener('keydown', (e) => {
    const activeEl = document.activeElement;
    const isInput = activeEl && (
      activeEl.tagName === 'INPUT' ||
      activeEl.tagName === 'TEXTAREA' ||
      activeEl.classList.contains('inputarea')
    );
    if (isInput) return;

    if (e.key === 'F2' && contextTargetFilePath) {
      e.preventDefault(); openRenameModal();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c' && contextTargetFilePath) {
      copySelectedFile();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v' && clipboardFilePath) {
      pasteCopiedFile();
    } else if (e.key === 'Delete' && contextTargetFilePath) {
      deleteSelectedFile();
    }
  });

  if (window.electronAPI && window.electronAPI.onPythonOutput) {
    window.electronAPI.onPythonOutput((payload) => {
      const outputDiv = document.getElementById('terminal-output');
      if (outputDiv && payload.data) {
        outputDiv.textContent += payload.data;
        outputDiv.scrollTop = outputDiv.scrollHeight;
      }
    });
  }

  if (window.electronAPI && window.electronAPI.onProjectDirChanged) {
    window.electronAPI.onProjectDirChanged(() => {
      if (currentProjectPath) refreshProjectFiles();
    });
  }

  if (window.electronAPI && window.electronAPI.onPythonExit) {
    window.electronAPI.onPythonExit((payload) => {
      isPythonRunning = false;
      if (visionLiveInterval) { clearInterval(visionLiveInterval); visionLiveInterval = null; }
      updateRunButtonState();
      const visionStatusBar = document.getElementById('vision-status-bar');
      const activeTab = openTabs.find(t => t.path === activeTabPath);
      const fileName = activeTab ? activeTab.name : '비전 스크립트';
      if (visionStatusBar) {
        visionStatusBar.textContent = `⏸ 분석 완료/정지: ${fileName} (마지막 프레임 유지)`;
      }
      refreshProjectFiles();
    });
  }
});
