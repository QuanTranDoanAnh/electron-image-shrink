const path = require('path')
const os = require('os')
const { app, BrowserWindow, Menu, globalShortcut, ipcMain, shell } = require('electron')
// Set env
process.env.NODE_ENV = 'development'

const isDev = process.env.NODE_ENV !== 'production' ? true : false
const isMac = process.platform === 'darwin' ? true : false

let mainWindow
let aboutWindow

function createMainWindow () {
  mainWindow = new BrowserWindow({
    title: 'Image Shrink',
    width: isDev ? 800 : 500,
    height: 600,
    icon: './assets/icons/Icon_256x256.png',
    resizable: isDev ? true : false,
    backgroundColor: 'white',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })
  if (isDev) {
    mainWindow.webContents.openDevTools()
  }
  //mainWindow.loadURL(`file://${__dirname}/app/index.html`)
  mainWindow.loadFile('./app/index.html')
}

function createAboutWindow () {
  aboutWindow = new BrowserWindow({
    title: 'About Image Shrink',
    width: 300,
    height: 300,
    icon: './assets/icons/Icon_256x256.png',
    resizable: false,
    backgroundColor: 'white'
  })

  //mainWindow.loadURL(`file://${__dirname}/app/index.html`)
  aboutWindow.loadFile('./app/about.html')
}

app.whenReady().then(() => {
  createMainWindow()

  const mainMenu = Menu.buildFromTemplate(menu)
  Menu.setApplicationMenu(mainMenu)

  //mainWindow.whenReady().then(() => mainWindow = null)
})

const menu = [
  ...(isMac 
    ? [
        {
          label: app.name,
          submenu: [
            {
              label: 'About',
              click: createAboutWindow
            }
          ]
        }
    ] : []),
  {
    role: 'fileMenu'
  },
  ...(!isMac 
    ? [
        {
          label: 'Help',
          submenu: [
            {
              label: 'About',
              click: createAboutWindow
            }
          ]
        },
    ] : []),
  ...(isDev ? [
    {
      label: 'Developer',
      submenu: [
        { role: 'reload' },
        { role: 'forcereload' },
        { type: 'separator' },
        { role: 'toggledevtools' },
      ]
    }
  ] : [])
]

ipcMain.on('image:minimize', (e, options) => {
  options.dest = path.join(os.homedir(), 'imageshrink')
  shrinkImage(options)
})

async function shrinkImage({ imgPath, quality, dest }) {
  try {
    const pngQuality = quality / 100
    const imagemin = (await import('imagemin')).default
    const imageminMozjpeg = (await import('imagemin-mozjpeg')).default
    const imageminPngquant = (await import('imagemin-pngquant')).default
    const slash = (await import('slash')).default
    const files = await imagemin([slash(imgPath)], {
      destination: dest,
      plugins: [
        imageminMozjpeg({ quality }),
        imageminPngquant({ 
          quality: [pngQuality, pngQuality]
        })
      ]
    })

    console.log(dest)

    shell.openPath(dest)

    mainWindow.webContents.send('image:done')
  } catch (err) {
    console.error(err)
  }
}

app.on('window-all-closed', () => {
  if (!isMac) {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow()
  }
})