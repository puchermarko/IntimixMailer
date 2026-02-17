const { app, BrowserWindow, shell, Menu, Tray, nativeImage } = require('electron')
const path = require('path')

const APP_URL = 'https://pultify.hu/login'
const APP_NAME = 'Pultify'

let mainWindow = null
let tray = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 800,
    minHeight: 600,
    title: APP_NAME,
    icon: path.join(__dirname, 'icon.png'),
    autoHideMenuBar: true,
    backgroundColor: '#1a1d23',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      spellcheck: true,
    },
  })

  // Remove default menu bar
  Menu.setApplicationMenu(null)

  // Load the web app
  mainWindow.loadURL(APP_URL)

  // Show window when ready to avoid white flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  // Open external links in the default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Allow navigation within pultify.hu
    if (url.includes('pultify.hu')) {
      return { action: 'deny' }
    }
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // Handle navigation — keep pultify.hu inside the app, open others externally
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.includes('pultify.hu')) {
      event.preventDefault()
      shell.openExternal(url)
    }
  })

  // Minimize to tray on close (Windows behavior)
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault()
      mainWindow.hide()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function createTray() {
  try {
    const iconPath = path.join(__dirname, 'icon.png')
    const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
    tray = new Tray(icon)

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Megnyitás',
        click: () => {
          if (mainWindow) {
            mainWindow.show()
            mainWindow.focus()
          }
        },
      },
      { type: 'separator' },
      {
        label: 'Kilépés',
        click: () => {
          app.isQuitting = true
          app.quit()
        },
      },
    ])

    tray.setToolTip(APP_NAME)
    tray.setContextMenu(contextMenu)

    tray.on('click', () => {
      if (mainWindow) {
        if (mainWindow.isVisible()) {
          mainWindow.focus()
        } else {
          mainWindow.show()
        }
      }
    })
  } catch (e) {
    // Tray icon is optional — don't crash if icon is missing
    console.warn('Tray icon not available:', e.message)
  }
}

// Single instance lock — prevent multiple windows
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
    }
  })

  app.whenReady().then(() => {
    createWindow()
    createTray()
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})

app.on('before-quit', () => {
  app.isQuitting = true
})
