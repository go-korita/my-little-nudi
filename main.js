const { app, BrowserWindow, ipcMain, screen } = require('electron')
const Store = require('electron-store')

const store = new Store()
let win

// 창 열기 전 저장해둘 collapsed 위치
let collapsedX, collapsedY

function createWindow() {
  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize

  // 기본 위치: 화면 우측 하단
  collapsedX = sw - 160
  collapsedY = sh - 140

  win = new BrowserWindow({
    width: 140,
    height: 120,
    x: collapsedX,
    y: collapsedY,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    hasShadow: false,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  win.loadFile('index.html')

  // 개발할 때 DevTools 보고 싶으면 아래 주석 해제
  // win.webContents.openDevTools({ mode: 'detach' })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ====== IPC: 투두 데이터 저장/불러오기 ======
ipcMain.handle('store:get', () => {
  return store.get('todos', [])
})

ipcMain.handle('store:set', (event, todos) => {
  store.set('todos', todos)
})

// ====== IPC: 창 크기 전환 ======
ipcMain.on('window:expand', () => {
  // collapsed 위치 저장
  const [x, y] = win.getPosition()
  collapsedX = x
  collapsedY = y

  // 우측 하단 앵커를 유지하면서 크게
  const newX = Math.max(0, x + 140 - 280)
  const newY = Math.max(0, y + 120 - 440)
  win.setBounds({ x: newX, y: newY, width: 280, height: 440 })
})

ipcMain.on('window:collapse', () => {
  // 저장된 collapsed 위치로 복원
  win.setBounds({ x: collapsedX, y: collapsedY, width: 140, height: 120 })
})

// ====== IPC: 드래그 (collapsed 상태) ======
let dragStartX, dragStartY, winStartX, winStartY

ipcMain.on('drag:start', (event, { mouseX, mouseY }) => {
  const [x, y] = win.getPosition()
  winStartX = x
  winStartY = y
  dragStartX = mouseX
  dragStartY = mouseY
})

ipcMain.on('drag:move', (event, { mouseX, mouseY }) => {
  win.setPosition(
    winStartX + (mouseX - dragStartX),
    winStartY + (mouseY - dragStartY)
  )
})
