let activePanelName = 'console';
let terminalIdCounter = 0;
const terminals = [];

function initPanels() {
  addTerminalTab();
}

function addTerminalTab() {
  terminalIdCounter++;
  const id        = terminalIdCounter;
  const panelName = `terminal-${id}`;
  const label     = id === 1 ? '🖥️ 터미널' : `🖥️ 터미널 ${id}`;

  // 탭 버튼
  const tabEl = document.createElement('div');
  tabEl.id        = `tab-btn-${panelName}`;
  tabEl.className = 'panel-tab';
  tabEl.textContent = label;
  tabEl.onclick = () => switchPanel(panelName);
  document.getElementById('panel-tabs').appendChild(tabEl);

  // 패널 영역
  const paneEl = document.createElement('div');
  paneEl.id = `bash-pane-${id}`;
  paneEl.style.cssText = 'flex:1; flex-direction:column; overflow:hidden; display:none;';

  const outputEl = document.createElement('div');
  outputEl.id        = `bash-output-${id}`;
  outputEl.className = 'terminal-output';
  outputEl.style.color = '#cccccc';

  const inputBar = document.createElement('div');
  inputBar.style.cssText = 'display:flex; align-items:center; background:#1e1e1e; border-top:1px solid #333333; padding:4px 10px; gap:6px; flex-shrink:0;';

  const prompt = document.createElement('span');
  prompt.style.cssText = "color:#4ec9b0; font-family:'Consolas',monospace; font-size:12px;";
  prompt.textContent = '$';

  const inputEl = document.createElement('input');
  inputEl.id          = `bash-input-${id}`;
  inputEl.type        = 'text';
  inputEl.placeholder = 'bash 명령어 입력 후 Enter...';
  inputEl.style.cssText = "flex:1; background:transparent; border:none; outline:none; color:#cccccc; font-family:'Consolas','Courier New',monospace; font-size:12px; user-select:text; cursor:text;";
  inputEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') execBashById(id); });

  inputBar.appendChild(prompt);
  inputBar.appendChild(inputEl);
  paneEl.appendChild(outputEl);
  paneEl.appendChild(inputBar);

  document.getElementById('panels-content').appendChild(paneEl);
  terminals.push({ id, panelName, paneEl, tabEl });

  switchPanel(panelName);
}

function switchPanel(name) {
  const consolePan = document.getElementById('console-pane');
  if (consolePan) consolePan.style.display = name === 'console' ? 'flex' : 'none';

  terminals.forEach(t => {
    t.paneEl.style.display = name === t.panelName ? 'flex' : 'none';
  });

  document.querySelectorAll('.panel-tab').forEach(el => el.classList.remove('panel-tab-active'));
  document.getElementById(`tab-btn-${name}`)?.classList.add('panel-tab-active');

  activePanelName = name;

  if (name !== 'console') {
    const term = terminals.find(t => t.panelName === name);
    term?.paneEl.querySelector('input')?.focus();
  }
}

function clearActivePanel() {
  if (activePanelName === 'console') {
    clearTerminalOutput();
  } else {
    const term = terminals.find(t => t.panelName === activePanelName);
    if (term) {
      const out = document.getElementById(`bash-output-${term.id}`);
      if (out) out.textContent = '';
    }
  }
}

async function execBashById(id) {
  const input  = document.getElementById(`bash-input-${id}`);
  const output = document.getElementById(`bash-output-${id}`);
  if (!input || !output) return;

  const command = input.value.trim();
  if (!command) return;

  output.textContent += `$ ${command}\n`;
  input.value = '';
  output.scrollTop = output.scrollHeight;

  const result = await window.electronAPI.runBashCommand(command, currentProjectPath);
  if (result.stdout) output.textContent += result.stdout;
  if (result.stderr) output.textContent += result.stderr;
  output.scrollTop = output.scrollHeight;
}
