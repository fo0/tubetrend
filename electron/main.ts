import { app, BrowserWindow, shell } from "electron";
import path from "path";
import { fileURLToPath } from "node:url";

// ESM does not provide __dirname — derive it from import.meta.url
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Fallback to software rendering when GPU is unavailable
// (e.g. Chromebook/Crostini, VMs, headless Linux containers)
app.disableHardwareAcceleration();
app.commandLine.appendSwitch("disable-gpu");
app.commandLine.appendSwitch("disable-software-rasterizer");

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 800,
    minHeight: 600,
    title: "TubeTrend",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false,
  });

  win.setMenuBarVisibility(false);

  win.once("ready-to-show", () => {
    win.show();
  });

  // Open external links in the system browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://") || url.startsWith("http://")) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });

  // Block in-window navigation away from the app (Electron security checklist:
  // "disable or limit navigation"). Only the Vite dev server (HMR reloads) and
  // the packaged file:// bundle are legitimate destinations; anything else
  // (e.g. a link or file dragged onto the window) opens externally instead.
  win.webContents.on("will-navigate", (event, url) => {
    const devServerUrl = process.env.VITE_DEV_SERVER_URL;
    const isDevServer = !!devServerUrl && url.startsWith(devServerUrl);
    if (isDevServer || url.startsWith("file://")) return;
    event.preventDefault();
    if (url.startsWith("https://") || url.startsWith("http://")) {
      shell.openExternal(url);
    }
  });

  // vite-plugin-electron sets VITE_DEV_SERVER_URL in dev mode
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
