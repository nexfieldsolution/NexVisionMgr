let currentProjectPath = null;
let openTabs = [];
let activeTabPath = null;
let contextTargetTabPath = null;
let monacoEditor = null;
let visionLiveInterval = null;
let visionIntervalGen = 0;

let contextTargetFilePath = null;
let contextTargetFileName = null;
let clipboardFilePath = null;
let clipboardFileName = null;

let currentVisionSource = 'camera';
let selectedCameraDeviceId = '0';
let isPythonRunning = false;
