const { app, BrowserWindow } = require('electron');
const path = require('path');
const os = require('os');
const express = require('express');
const cors = require('cors');
const MarkdownToQTI = require('./MarkdownToQTI');

let mainWindow;
let server;
const PORT = 3456;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    titleBarStyle: 'hiddenInset', // macOS style
    icon: path.join(__dirname, 'assets/icon_runtime.png'),
    show: false // Don't show until ready
  });

  // Load the app after server starts
  mainWindow.loadURL(`http://localhost:${PORT}`);

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startServer() {
  const expressApp = express();
  
  expressApp.use(cors());
  expressApp.use(express.json({ limit: '50mb' }));
  expressApp.use(express.static(path.join(__dirname, 'public')));

  // API endpoint for conversion
  expressApp.post('/api/convert', async (req, res) => {
    try {
      const { markdown, filename } = req.body;
      
      if (!markdown) {
        return res.status(400).json({ error: 'No markdown content provided' });
      }

      const converter = new MarkdownToQTI();
      
      // Use the new convert method that creates proper Canvas-compatible structure
      const outputFilename = filename || 'qti_export.zip';
      const fs = require('fs');
      const tempPath = path.join(os.tmpdir(), 'qti_temp_' + Date.now() + '.zip');
      
      await converter.convert(markdown, tempPath);
      
      // Check if file was created successfully
      if (!fs.existsSync(tempPath)) {
        throw new Error('Failed to create QTI file');
      }
      
      // Read the generated file and send it
      const zipBuffer = fs.readFileSync(tempPath);
      
      // Clean up temp file
      try {
        fs.unlinkSync(tempPath);
      } catch (cleanupError) {
        console.warn('Could not clean up temp file:', cleanupError.message);
      }

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${filename || 'qti_export.zip'}"`);
      res.send(zipBuffer);

    } catch (error) {
      console.error('Conversion error:', error);
      res.status(500).json({ error: error.message || 'Conversion failed' });
    }
  });

  server = expressApp.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

app.whenReady().then(() => {
  startServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // On macOS, completely quit the app when window is closed
  if (server) {
    server.close();
  }
  app.quit();
});

app.on('before-quit', () => {
  if (server) {
    server.close();
  }
});