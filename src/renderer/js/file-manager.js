async function openProject() {
  const projectPath = await window.electronAPI.openProjectDialog();
  if (projectPath) {
    await applyProject(projectPath);
    await window.electronAPI.addRecentProject(projectPath);
    await populateRecentProjects();
  }
}

async function openRecentProject(projectPath) {
  const fileMenu = document.querySelector('.dropdown-content');
  if (fileMenu) { fileMenu.style.display = 'none'; setTimeout(() => { fileMenu.style.display = ''; }, 300); }
  await applyProject(projectPath);
  await window.electronAPI.addRecentProject(projectPath);
  await populateRecentProjects();
}

async function applyProject(projectPath) {
  currentProjectPath = projectPath;
  openTabs = [];
  activeTabPath = null;
  renderTabs();
  renderActiveTabContent();
  await refreshProjectFiles();
  await window.electronAPI.watchProjectDir(projectPath);
}

async function populateRecentProjects() {
  const container = document.getElementById('recent-projects-list');
  if (!container) return;
  const list = await window.electronAPI.getRecentProjects();
  container.innerHTML = '';

  const footerSep = document.getElementById('recent-footer-sep');
  const clearBtn = document.getElementById('recent-clear-btn');

  if (list.length === 0) {
    const el = document.createElement('div');
    el.className = 'menu-option';
    el.style.cssText = 'color:#888; pointer-events:none; cursor:default;';
    el.textContent = '최근 항목 없음';
    container.appendChild(el);
    if (footerSep) footerSep.style.display = 'none';
    if (clearBtn) clearBtn.style.display = 'none';
    return;
  }

  list.forEach(p => {
    const name = p.split('/').filter(Boolean).pop() || p;
    const displayPath = p.replace(/^\/home\/[^/]+/, '~');
    const el = document.createElement('div');
    el.className = 'menu-option';
    el.title = p;
    const nameSpan = document.createElement('span');
    nameSpan.textContent = '📁 ' + name;
    const pathSpan = document.createElement('span');
    pathSpan.textContent = displayPath;
    pathSpan.style.cssText = 'font-size:11px; color:#666; margin-left:8px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;';
    el.appendChild(nameSpan);
    el.appendChild(pathSpan);
    el.addEventListener('click', () => openRecentProject(p));
    container.appendChild(el);
  });

  if (footerSep) footerSep.style.display = '';
  if (clearBtn) clearBtn.style.display = '';
}

async function clearRecentProjects() {
  await window.electronAPI.clearRecentProjects();
  await populateRecentProjects();
}

async function refreshProjectFiles() {
  const folderNameSpan = document.getElementById('current-folder-name');
  const fileListUl = document.getElementById('file-list-tree');

  if (!currentProjectPath) {
    if (folderNameSpan) folderNameSpan.textContent = '';
    if (fileListUl) {
      fileListUl.innerHTML = `
        <div style="padding: 16px 12px; text-align: center;">
          <p style="font-size: 12px; color: #888; margin-bottom: 12px;"></p>
          <button onclick="openProject()" style="width: 100%; padding: 8px; font-size: 12px; background: #007acc; color: #fff; border: none; border-radius: 4px; cursor: pointer; margin-bottom: 8px;">📂 프로젝트 폴더 열기</button>
          <button onclick="openNewProjectModal()" style="width: 100%; padding: 8px; font-size: 12px; background: #3c3c3c; color: #fff; border: 1px solid #555; border-radius: 4px; cursor: pointer;">✨ 새 프로젝트...</button>
        </div>
      `;
    }
    return;
  }

  const parts = currentProjectPath.split('/');
  if (folderNameSpan) folderNameSpan.textContent = parts[parts.length - 1] || currentProjectPath;

  try {
    const files = await window.electronAPI.readDir(currentProjectPath);
    if (fileListUl) fileListUl.innerHTML = '';

    files.forEach(file => {
      const li = document.createElement('li');
      let icon = file.isDirectory ? '📁 ' : '📄 ';
      if (!file.isDirectory) {
        if (/\.(jpg|jpeg|png|bmp|webp)$/i.test(file.name)) icon = '🖼️ ';
        else if (/\.(mp4|webm|ogv)$/i.test(file.name)) icon = '🎥 ';
        else if (file.name.endsWith('.py')) icon = '🐍 ';
      }
      li.textContent = icon + file.name;
      li.onclick = () => { if (!file.isDirectory) openFile(file.path, file.name); };
      li.oncontextmenu = (e) => {
        e.preventDefault();
        e.stopPropagation();
        contextTargetFilePath = file.path;
        contextTargetFileName = file.name;
        showExplorerContextMenu(e.clientX, e.clientY, true);
      };
      fileListUl.appendChild(li);
    });
  } catch (err) {
    console.error('refreshProjectFiles error:', err);
  }
}

async function openFile(filePath, fileName) {
  const isImage = /\.(jpg|jpeg|png|bmp|webp)$/i.test(fileName);
  const isVideo = /\.(mp4|webm|ogv)$/i.test(fileName);
  let content = '';

  if (!isImage && !isVideo) content = await window.electronAPI.readFile(filePath);

  const existingTab = openTabs.find(t => t.path === filePath);
  if (!existingTab) {
    openTabs.push({ path: filePath, name: fileName, content, isModified: false, isImage, isVideo });
  }
  activeTabPath = filePath;
  renderTabs();
  renderActiveTabContent();
}

function openNewProjectModal() {
  document.getElementById('new-project-modal').style.display = 'flex';
}

function closeNewProjectModal() {
  document.getElementById('new-project-modal').style.display = 'none';
}

async function confirmNewProject() {
  const projName = document.getElementById('project-name-input').value.trim();
  closeNewProjectModal();
  if (!projName) return;

  const res = await window.electronAPI.newProjectDialog();
  if (res && res.success) {
    currentProjectPath = res.path;
    openTabs = [];
    activeTabPath = null;
    renderTabs();
    renderActiveTabContent();
    await refreshProjectFiles();
    openFile(res.path + '/main.py', 'main.py');
  }
}

function createNewFileFromExplorer() {
  hideExplorerContextMenu();
  if (!currentProjectPath) { alert('먼저 프로젝트를 열거나 생성해주세요.'); return; }
  const modal = document.getElementById('new-file-modal');
  const input = document.getElementById('new-file-name-input');
  if (input) input.value = 'sample.py';
  if (modal) modal.style.display = 'flex';
  setTimeout(() => { if (input) { input.focus(); input.select(); } }, 50);
}

function closeNewFileModal() {
  const modal = document.getElementById('new-file-modal');
  if (modal) modal.style.display = 'none';
}

async function confirmCreateNewFile() {
  const input = document.getElementById('new-file-name-input');
  const fileName = input ? input.value.trim() : '';
  closeNewFileModal();
  if (!fileName || !currentProjectPath) return;

  const newFilePath = currentProjectPath + '/' + fileName;
  try {
    const res = await window.electronAPI.writeFile(newFilePath, `print("Hello from ${fileName}\\n")\n`);
    if (res && res.success) {
      await refreshProjectFiles();
      openFile(newFilePath, fileName);
    } else {
      alert(`새 파일 생성 실패: ${res ? res.error : '알 수 없는 오류'}`);
    }
  } catch (err) {
    alert(`새 파일 생성 중 오류 발생: ${err.message}`);
  }
}

function copySelectedFile() {
  hideExplorerContextMenu();
  if (!contextTargetFilePath) return;
  clipboardFilePath = contextTargetFilePath;
  clipboardFileName = contextTargetFileName;
}

async function pasteCopiedFile() {
  hideExplorerContextMenu();
  if (!clipboardFilePath || !currentProjectPath) {
    alert('복사된 파일이 없거나 프로젝트 폴더가 열려있지 않습니다.');
    return;
  }

  const extIndex = clipboardFileName.lastIndexOf('.');
  let baseName = clipboardFileName;
  let ext = '';
  if (extIndex !== -1) { baseName = clipboardFileName.substring(0, extIndex); ext = clipboardFileName.substring(extIndex); }

  let newFileName = `${baseName}(2)${ext}`;
  let counter = 2;
  const currentFiles = await window.electronAPI.readDir(currentProjectPath);
  const existingNames = currentFiles ? currentFiles.map(f => f.name) : [];
  while (existingNames.includes(newFileName)) { counter++; newFileName = `${baseName}(${counter})${ext}`; }

  const destPath = `${currentProjectPath}/${newFileName}`;
  const res = await window.electronAPI.copyFileTo(clipboardFilePath, destPath);
  if (res && res.success) {
    await refreshProjectFiles();
    openFile(destPath, newFileName);
  } else {
    alert(`파일 붙여넣기 실패: ${res ? res.error : '알 수 없는 오류'}`);
  }
}

async function deleteSelectedFile() {
  hideExplorerContextMenu();
  if (!contextTargetFilePath) return;
  if (!confirm(`정말로 '${contextTargetFileName}' 파일을 삭제하시겠습니까?`)) return;

  const res = await window.electronAPI.deleteFile(contextTargetFilePath);
  if (res && res.success) {
    closeTab(contextTargetFilePath);
    await refreshProjectFiles();
  } else {
    alert(`파일 삭제 실패: ${res ? res.error : '알 수 없는 오류'}`);
  }
}

function copyFileFullPath() {
  hideExplorerContextMenu();
  if (!contextTargetFilePath) return;
  navigator.clipboard.writeText(contextTargetFilePath);
}

function copyFileRelativePath() {
  hideExplorerContextMenu();
  if (!contextTargetFilePath || !currentProjectPath) return;
  let relPath = contextTargetFilePath;
  if (relPath.startsWith(currentProjectPath)) {
    relPath = relPath.substring(currentProjectPath.length);
    if (relPath.startsWith('/')) relPath = relPath.substring(1);
  }
  navigator.clipboard.writeText(relPath);
}

function openRenameModal() {
  hideExplorerContextMenu();
  if (!contextTargetFilePath) return;
  const modal = document.getElementById('rename-file-modal');
  const input = document.getElementById('rename-file-input');
  if (input) input.value = contextTargetFileName || '';
  if (modal) modal.style.display = 'flex';
  setTimeout(() => {
    if (input) {
      input.focus();
      const dotIdx = input.value.lastIndexOf('.');
      if (dotIdx > 0) input.setSelectionRange(0, dotIdx);
      else input.select();
    }
  }, 50);
}

function closeRenameModal() {
  const modal = document.getElementById('rename-file-modal');
  if (modal) modal.style.display = 'none';
}

async function confirmRenameFile() {
  const input = document.getElementById('rename-file-input');
  const newName = input ? input.value.trim() : '';
  closeRenameModal();
  if (!newName || !contextTargetFilePath || newName === contextTargetFileName) return;

  const parentDir = contextTargetFilePath.substring(0, contextTargetFilePath.lastIndexOf('/'));
  const newPath = `${parentDir}/${newName}`;

  const res = await window.electronAPI.renameFile(contextTargetFilePath, newPath);
  if (res && res.success) {
    const targetTab = openTabs.find(t => t.path === contextTargetFilePath);
    if (targetTab) {
      targetTab.path = newPath;
      targetTab.name = newName;
      if (activeTabPath === contextTargetFilePath) activeTabPath = newPath;
      renderTabs();
    }
    await refreshProjectFiles();
  } else {
    alert(`파일 이름 변경 실패: ${res ? res.error : '알 수 없는 오류'}`);
  }
}
