# 🚀 NexVision Manager (NexVisionMgr) 세션 작업 및 아키텍처 기록

- **작성 일자**: 2026년 8월 7일
- **프로젝트**: `NexVisionMgr` (Electron + OpenCV + Python 비전 분석기 매니저 IDE)
- **작성자**: Antigravity AI & Douglas

---

## 🎯 1. 주요 개발 및 개선 성과

### 📁 1-1. 탐색기 (Explorer) 파일 관리 및 컨텍스트 메뉴 완성
- **우클릭 컨텍스트 메뉴 항목 확충**:
  - `📄 새 파일...`
  - `✏️ 파일 이름 변경...` (`F2`) -> 베이스 파일명 자동 블록 선택 모달 제공
  - `📋 파일 복사` (`Ctrl+C`)
  - `📋 파일 붙여넣기` (`Ctrl+V`) -> 충돌 방지 스마트 파일명 자동 생성 (예: `hello-cv2(2).py`)
  - `🗑️ 파일 삭제` (`Delete`) -> 확인 대화상자 후 탭 자동 닫기 및 동기화
  - `🔗 전체 경로 복사` (Absolute Path: `/home/douglas/MyVisionProject/hello-cv2.py`)
  - `🔗 상대 경로 복사` (Relative Path: `hello-cv2.py`)
  - `🔄 새로고침`
- **단축키 바인딩**: `F2`, `Ctrl+C`, `Ctrl+V`, `Delete` 키보드 숏컷 (인풋 입력창 포커스 중 제외 처리)

### 🎥 1-2. 동적 비전 스트리밍 및 깨짐 없는 프레임 유지 (Freeze on Stop)
- **`hello-cv2.py` 보호**: 사용자의 원본 코드를 완전 보존.
- **`hello-cv3.py` 신규 구축**:
  - 액티비티 바에서 선택한 동영상 경로(`--source-type video`) 또는 카메라 디바이스(`--source-type camera`)를 파라미터로 동적 수신하여 실시간 흑백 비전 변환 후 30 FPS 라이브 스트리밍.
- **원자적 파일 교체 (Atomic File Replace) 및 손상 프레임 방지**:
  - 파이썬 측: `cv2.imwrite('preview_tmp.jpg')` 작성 후 `os.replace('preview_tmp.jpg', 'preview.jpg')` 원자적 교체 적용.
  - 브라우저 측: `naturalWidth > 0` 검증을 통과한 완전한 이미지 프레임만 렌더링.
  - **Freeze on Stop**: 프로세스 중지(`Stop`) 시 깨진 쓰레기 잔상이 나타나지 않고 **마지막 처리된 비전 분석 프레임이 선명하게 고정되어 유지**됨.

### 🎛️ 1-3. 우측 도킹 패널 `control-panel` (제어 패널) 고도화
- 기존 `vision-result-panel` DOM ID를 **`control-panel`**로 명칭 대치.
- 단순 결과 시각화에 그치지 않고, 비전 분석 알고리즘의 파라미터(임계값, 필터 등)를 대화형으로 조절하고 관제할 수 있는 **제어 패널 아키텍처**로 명칭 및 구조 정립.

---

## 🏛️ 2. Electron 아키텍처 & 데이터 흐름도

```text
[1. Renderer UI (index.html)]
    window.electronAPI.openProjectDialog() / copyFileTo() / runPythonScript()
          │
          ▼
[2. Bridge (preload.js)]
    contextBridge.exposeInMainWorld('electronAPI', {
      copyFileTo: (src, dest) => ipcRenderer.invoke('copy-file-to', { src, dest }),
      ...
    });
          │  (Electron IPC 채널 보안 분리 및 고유 문자열 이벤트 메시지 전송)
          ▼
[3. Main Process (index.js)]
    ipcMain.handle('copy-file-to', async (_, { srcPath, destPath }) => {
      // Node.js fs 및 OS API로 파일 시스템 제어
    });
```

---

## 🌐 3. 비전 생태계 (Multi-platform Ecosystem) 비전

```mermaid
graph TD
    Board[1. 임베디드 / FPGA 보드<br/>Artix-7 / Zynq 현장 초고속 엣지 수집] -->|현장 분석 데이터| ElectronApp[2. Electron PC 매니저 (NexVisionMgr)<br/>고성능 PC 분석 & 관제자 대시보드]
    Board -->|네트워크 / IoT| NextServer[3. Next.js 서버<br/>중앙 DB & 웹 관제 대시보드]
    NextServer -->|Push 알림 / REST API| MobileApp[4. Mobile 폰 앱 (Kotlin / Swift)<br/>모바일 원격 모니터링 & 스마트 알림]
```

- **엔지니어 모드**: Monaco 에디터를 통한 파이썬/OpenCV/YOLO 알고리즘 실시간 코딩 및 정밀 튜닝.
- **현장 관리자 모드**: 노코드(No-code) 원클릭 소스 전환, 제어 패널 비전 시각화 및 불량 데이터 디버깅.

---

## 📂 4. 주요 수정 및 관련 파일 목록

| 파일 경로 | 수정 내용 |
| :--- | :--- |
| `/WORK/VSCODE/NexVisionMgr/src/index.html` | 컨텍스트 메뉴 항목 확충, `control-panel` ID 변경, 프레임 검증 & Freeze 처리 |
| `/WORK/VSCODE/NexVisionMgr/src/index.js` | `copy-file-to`, `rename-file`, `delete-file` IPC 메인 핸들러 구현 |
| `/WORK/VSCODE/NexVisionMgr/src/preload.js` | `contextBridge`에 새 IPC API 함수들 안전 노출 |
| `/home/douglas/MyVisionProject/hello-cv3.py` | 동적 파라미터 수신 및 원자적 프리뷰 교체 비전 테스트 스크립트 |

---
*Next Step: OpenCV 경계선 감지(Canny Edge) 및 YOLOv8 객체 추적(Tracking) 알고리즘 제어 패널 슬라이더 연동*
