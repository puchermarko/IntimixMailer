// Preload script — runs in renderer context before page loads
// Keeps contextIsolation enabled for security

const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('pultifyDesktop', {
  isDesktopApp: true,
  platform: process.platform,
  version: require('./package.json').version,
})
