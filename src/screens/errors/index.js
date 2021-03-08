const { ipcRenderer } = require("electron/renderer");


ipcRenderer.on('init-error', (e, params) => {
    alert();
});