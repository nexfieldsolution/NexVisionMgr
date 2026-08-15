function initMonaco() {
  if (!window.require) return;
  require.config({ paths: { 'vs': '../node_modules/monaco-editor/min/vs' } });
  require(['vs/editor/editor.main'], function () {
    monacoEditor = monaco.editor.create(document.getElementById('monaco-editor-container'), {
      value: '',
      language: 'python',
      theme: 'vs-dark',
      automaticLayout: true,
      fontSize: 14,
      fontFamily: "'Consolas', 'Fira Code', 'Courier New', monospace",
      minimap: { enabled: true },
      scrollBeyondLastLine: false,
      tabSize: 4,
      renderLineHighlight: 'all',
      lineNumbers: 'on',
      cursorBlinking: 'smooth',
      smoothScrolling: true
    });

    monacoEditor.onDidChangeModelContent(() => {
      const activeTab = openTabs.find(t => t.path === activeTabPath);
      if (activeTab && !activeTab.isImage && !activeTab.isVideo) {
        const currentVal = monacoEditor.getValue();
        if (activeTab.content !== currentVal) {
          activeTab.content = currentVal;
          activeTab.isModified = true;
          renderTabs();
        }
      }
    });
  });
}

function getLanguageByFileName(fileName) {
  const ext = fileName.split('.').pop().toLowerCase();
  switch (ext) {
    case 'py':   return 'python';
    case 'js':   return 'javascript';
    case 'json': return 'json';
    case 'html': return 'html';
    case 'css':  return 'css';
    case 'md':   return 'markdown';
    default:     return 'plaintext';
  }
}

function renderTabs() {
  const tabsBar = document.getElementById('editor-tabs-bar');
  tabsBar.innerHTML = '';

  openTabs.forEach(tab => {
    const tabEl = document.createElement('div');
    tabEl.className = `tab ${tab.path === activeTabPath ? 'active' : ''}`;

    let icon = '📄 ';
    if (tab.isImage) icon = '🖼️ ';
    else if (tab.isVideo) icon = '🎥 ';
    else if (tab.name.endsWith('.py')) icon = '🐍 ';

    const titleSpan = document.createElement('span');
    titleSpan.textContent = icon + tab.name + (tab.isModified ? ' ●' : '');
    tabEl.appendChild(titleSpan);

    const closeBtn = document.createElement('span');
    closeBtn.className = 'close-tab';
    closeBtn.textContent = '✕';
    closeBtn.onclick = (e) => { e.stopPropagation(); closeTab(tab.path); };
    tabEl.appendChild(closeBtn);

    tabEl.onclick = () => switchTab(tab.path);
    tabEl.oncontextmenu = (e) => { e.preventDefault(); showTabContextMenu(e.clientX, e.clientY, tab.path); };
    tabsBar.appendChild(tabEl);
  });
}

function switchTab(filePath) {
  activeTabPath = filePath;
  renderTabs();
  renderActiveTabContent();
}

function closeTab(filePath) {
  openTabs = openTabs.filter(t => t.path !== filePath);
  if (activeTabPath === filePath) {
    activeTabPath = openTabs.length > 0 ? openTabs[openTabs.length - 1].path : null;
  }
  renderTabs();
  renderActiveTabContent();
}

function renderActiveTabContent() {
  const activeTab = openTabs.find(t => t.path === activeTabPath);
  const noFileNotice = document.getElementById('no-file-notice');
  const editorContainer = document.getElementById('monaco-editor-container');
  const imageViewer = document.getElementById('image-viewer');
  const viewerImg = document.getElementById('viewer-img');
  const viewerVideo = document.getElementById('viewer-video');
  const imageInfo = document.getElementById('image-info');

  if (activeTab) {
    noFileNotice.style.display = 'none';
    if (activeTab.isImage) {
      editorContainer.style.display = 'none';
      imageViewer.style.display = 'flex';
      if (viewerVideo) viewerVideo.style.display = 'none';
      viewerImg.style.display = 'block';
      viewerImg.src = 'file://' + activeTab.path + '?' + Date.now();
      imageInfo.textContent = `📷 이미지: ${activeTab.name}`;
    } else if (activeTab.isVideo) {
      editorContainer.style.display = 'none';
      imageViewer.style.display = 'flex';
      viewerImg.style.display = 'none';
      viewerVideo.style.display = 'block';
      viewerVideo.src = 'file://' + activeTab.path;
      imageInfo.textContent = `🎥 비디오 재생 중: ${activeTab.name}`;
    } else {
      imageViewer.style.display = 'none';
      if (viewerVideo) viewerVideo.pause();
      editorContainer.style.display = 'block';
      if (monacoEditor) {
        const lang = getLanguageByFileName(activeTab.name);
        const model = monacoEditor.getModel();
        if (model) monaco.editor.setModelLanguage(model, lang);
        if (monacoEditor.getValue() !== activeTab.content) {
          monacoEditor.setValue(activeTab.content);
        }
      }
    }
  } else {
    noFileNotice.style.display = 'block';
    editorContainer.style.display = 'none';
    imageViewer.style.display = 'none';
    if (viewerVideo) viewerVideo.pause();
  }

  updateRunButtonState();
}

function updateRunButtonState() {
  const runBtn = document.getElementById('run-btn');
  const activeTab = openTabs.find(t => t.path === activeTabPath);

  if (isPythonRunning) {
    runBtn.className = 'activity-icon running-run';
    runBtn.textContent = '⏹';
    runBtn.title = '⏹ 파이썬 스크립트 중지';
  } else if (activeTab && activeTab.name.toLowerCase().endsWith('.py')) {
    runBtn.className = 'activity-icon active-run';
    runBtn.textContent = '▶';
    runBtn.title = `▶ Python 스크립트 실행 (${activeTab.name})`;
  } else {
    runBtn.className = 'activity-icon disabled-run';
    runBtn.textContent = '▶';
    runBtn.title = '실행하기';
  }
}

function triggerEditorAction(actionId) {
  if (!monacoEditor) return;
  if (actionId === 'undo')    monacoEditor.trigger('keyboard', 'undo', null);
  if (actionId === 'redo')    monacoEditor.trigger('keyboard', 'redo', null);
  if (actionId === 'comment') monacoEditor.trigger('keyboard', 'editor.action.commentLine', null);
}

async function saveCurrentFile() {
  const activeTab = openTabs.find(t => t.path === activeTabPath);
  if (!activeTab || activeTab.isImage || activeTab.isVideo) return;

  if (monacoEditor) {
    const currentContent = monacoEditor.getValue();
    const res = await window.electronAPI.writeFile(activeTab.path, currentContent);
    if (res && res.success) {
      activeTab.content = currentContent;
      activeTab.isModified = false;
      renderTabs();
    } else {
      alert(`파일 저장 실패: ${res ? res.error : '알 수 없는 오류'}`);
    }
  }
}
