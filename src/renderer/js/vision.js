async function toggleVisionSourceMenu() {
  const subMenu = document.getElementById('source-sub-menu');
  if (!subMenu) return;

  if (subMenu.style.display !== 'none') {
    subMenu.style.display = 'none';
    return;
  }

  const container = document.getElementById('camera-list-container');
  if (container) container.innerHTML = '<div style="padding: 8px 12px; font-size: 12px; color: #888888;">🔍 카메라 감지 중...</div>';
  subMenu.style.display = 'block';

  const cameras = await window.electronAPI.detectCameras();
  if (!container) return;
  container.innerHTML = '';

  if (!cameras || cameras.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = 'padding: 8px 12px; font-size: 12px; color: #888888;';
    empty.textContent = '연결된 카메라가 없습니다';
    container.appendChild(empty);
    return;
  }

  cameras.forEach(cam => {
    const isSelected = String(selectedCameraDeviceId) === String(cam.id);
    const div = document.createElement('div');
    div.style.cssText = `padding: 8px 12px; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 8px; border-radius: 3px; background: transparent; color: ${isSelected ? '#4ec9b0' : '#ffffff'};`;
    div.innerHTML = `<img src="asset/icon-camera.svg" style="width: 18px; height: 18px;" /><span>${isSelected ? '✓ ' : ''}${cam.label || 'Camera ' + cam.id}</span>`;
    div.addEventListener('mouseover', () => { div.style.background = '#37373d'; });
    div.addEventListener('mouseout',  () => { div.style.background = 'transparent'; });
    div.addEventListener('click', (e) => { e.stopPropagation(); selectVisionSource(cam); });
    container.appendChild(div);
  });
}

async function selectVisionSource(cameraDevice) {
  const subMenu = document.getElementById('source-sub-menu');
  if (subMenu) subMenu.style.display = 'none';

  if (isPythonRunning) {
    await window.electronAPI.killPythonScript();
    isPythonRunning = false;
    if (visionLiveInterval) { clearInterval(visionLiveInterval); visionLiveInterval = null; }
    updateRunButtonState();
    const visionImg = document.getElementById('vision-result-img');
    const visionVid = document.getElementById('vision-result-video');
    const visionNoResult = document.getElementById('vision-no-result');
    const visionStatusBar = document.getElementById('vision-status-bar');
    if (visionImg) { visionImg.style.display = 'none'; visionImg.src = ''; }
    if (visionVid) { visionVid.style.display = 'none'; visionVid.pause(); }
    if (visionNoResult) visionNoResult.style.display = 'block';
    if (visionStatusBar) visionStatusBar.textContent = '상태: 대기 중';
  }

  selectedCameraDeviceId = cameraDevice.id;
  currentVisionSource = 'camera';
  const visionStatusBar = document.getElementById('vision-status-bar');
  if (visionStatusBar) visionStatusBar.textContent = `📷 ${cameraDevice.label || 'Camera ' + cameraDevice.id} 선택됨`;
}

function toggleVisionPanel(show) {
  const panel = document.getElementById('control-panel');
  const icon = document.getElementById('activity-vision-icon');
  if (show !== undefined) {
    panel.style.display = show ? 'flex' : 'none';
  } else {
    panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
  }
  if (panel.style.display !== 'none') icon.classList.add('active');
  else icon.classList.remove('active');
}

async function runActivePythonFile() {
  if (isPythonRunning) {
    await window.electronAPI.killPythonScript();
    isPythonRunning = false;
    if (visionLiveInterval) { clearInterval(visionLiveInterval); visionLiveInterval = null; }
    const visionStatusBar = document.getElementById('vision-status-bar');
    if (visionStatusBar) visionStatusBar.textContent = `🛑 비전 분석 중지됨`;
    const outputDiv = document.getElementById('terminal-output');
    if (outputDiv) outputDiv.textContent += '\n🛑 [사용자 요청] 파이썬 스크립트 실행이 중지되었습니다.\n';
    updateRunButtonState();
    return;
  }

  const activeTab = openTabs.find(t => t.path === activeTabPath);
  if (!activeTab || !activeTab.name.toLowerCase().endsWith('.py')) {
    showToast('실행할 파이썬 파일(.py)을 열어주세요', document.getElementById('run-btn'));
    return;
  }

  if (activeTab.isModified) await saveCurrentFile();

  isPythonRunning = true;
  updateRunButtonState();
  toggleTerminalMenu(true);
  toggleVisionPanel(true);

  const visionImg = document.getElementById('vision-result-img');
  const visionVid = document.getElementById('vision-result-video');
  const visionNoResult = document.getElementById('vision-no-result');
  const visionStatusBar = document.getElementById('vision-status-bar');

  if (visionVid) { visionVid.style.display = 'none'; visionVid.pause(); }
  if (visionImg) { visionImg.style.display = 'none'; visionImg.src = ''; }
  if (visionNoResult) visionNoResult.style.display = 'block';
  if (visionStatusBar) visionStatusBar.textContent = `⚡ 비전 스트리밍 실시간 라이브 분석 중...`;

  const scriptDir = activeTab.path.substring(0, activeTab.path.lastIndexOf('/'));
  const targetPreviewDir = scriptDir || currentProjectPath;

  // 이전 실행의 preview.jpg 삭제 — 구버전 프레임이 버퍼에 남지 않도록
  await window.electronAPI.deleteFile(targetPreviewDir + '/preview.jpg');

  if (visionLiveInterval) clearInterval(visionLiveInterval);
  const gen = ++visionIntervalGen;
  visionLiveInterval = setInterval(() => {
    if (gen !== visionIntervalGen) return;
    if (targetPreviewDir && visionImg) {
      const imgUrl = 'file://' + targetPreviewDir + '/preview.jpg?' + Date.now();
      const tempImg = new Image();
      tempImg.onload = () => {
        if (gen !== visionIntervalGen) return; // 구버전 콜백 차단
        if (visionImg && tempImg.naturalWidth > 0 && tempImg.naturalHeight > 0) {
          if (visionNoResult) visionNoResult.style.display = 'none';
          visionImg.style.display = 'block';
          visionImg.src = imgUrl;
        }
      };
      tempImg.src = imgUrl;
    }
  }, 50);

  let sourceArgs = [];
  if (currentVisionSource === 'camera') {
    sourceArgs = ['--source-type', 'camera', '--source-value', String(selectedCameraDeviceId || '0')];
  }

  await window.electronAPI.runPythonScript(activeTab.path, sourceArgs);
}
