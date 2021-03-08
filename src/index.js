const { app, BrowserWindow, ipcMain, globalShortcut } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const electron = require('electron');
const { API_URL, RESOURCE_END } = require('./config');
const axios = require('axios');
const fetch = require('electron-fetch').default
const userDataPath = (electron.app || electron.remote.app).getPath('userData');
const Store = require('./store/store');
const {machineId, machineIdSync}  = require('node-machine-id');
const {download} = require('electron-dl');
const fs = require('fs')
const AWS = require('aws-sdk');

const s3 = new AWS.S3({
    accessKeyId: 'AKIA3MD5BY3NDB6AOUXU',
    secretAccessKey: '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',
    region: 'us-east-1',
});

var updateCheckTime;
var isAutoUpdate = false;
var access_token;

//Window
var errorWindow;
var registerWindow;
var mainWindow;

autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
log.info('App starting...');

if (require('electron-squirrel-startup')) { 
    app.quit();
}

const createWindow = () => {
    checkUpdate();
    mainWindow = new BrowserWindow({
        webPreferences: {
            nodeIntegration: true,
            webviewTag: true
        }, 
        frame: false,
        width: 800,
        height: 200,
        show: false
    });
    mainWindow.setFullScreen(true);
    mainWindow.setResizable(false);
    mainWindow.setMenuBarVisibility(false);
    mainWindow.loadFile(path.join(__dirname, 'screens/screens-units/index.html'));
    mainWindow.webContents.openDevTools();

    //Register window
    registerWindow = new BrowserWindow({
        webPreferences: {
            nodeIntegration: true,
            webviewTag: true
        }, 
        width: 800,
        height: 330,
        show: false
    });
    registerWindow.setResizable(false);
    registerWindow.setMenuBarVisibility(false);
    registerWindow.loadFile(path.join(__dirname, 'screens/registration/index.html'));
    // registerWindow.webContents.openDevTools();

    //Error
    errorWindow = new BrowserWindow({
        webPreferences: {
            nodeIntegration: true,
            webviewTag: true
        }, 
        width: 800,
        height: 200,
        show: false
    });
    errorWindow.setResizable(false);
    errorWindow.setMenuBarVisibility(false);
    errorWindow.loadFile(path.join(__dirname, 'screens/errors/index.html'));


    globalShortcut.register('Control+Shift+R', () => {
        log.info('User reset key manual')
        inValidRegistration()
    })

    // globalShortcut.register('Control+R', () => {
    //     console.log('Reload')
    // })
    
};

app.on('ready', createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

//------------------------------------------------------

const store = new Store({
    configName: 'configuration',
    defaults: {
        access_token: '',
        uid: ''
    }
});

function successProductKey() {
    registerWindow.hide();
    sendStatusToMain('Fetching display configuration...');
    log.info('Fetching display configuration...');
    PostData('/fetch-display-configuration', '', 'GET')
    .then(res => {
        // mainWindow.webContents.send('init-display-configuration', res.result)
        checkIfAnyResourceForDownload(res.result);
    })
    .catch(error => {
        if(error.code === 3000) {
            // inValidRegistration();
        }
    });
}


async function checkIfAnyResourceForDownload(res) {
    sendStatusToMain('Checking resources....');
    let signageResources = []
    for (let i = 0; i < res.configuration.screen.length; i++) {
        const e = res.configuration.screen[i];
        if(e.signage_resource.length > 0) {
            for (let kn = 0; kn < e.signage_resource.length; kn++) {
                const knd = e.signage_resource[kn];
                signageResources.push(knd)
            }
        }else {
            signageResources = []
        }
        
    }

    if(signageResources.length > 0) {
        sendStatusToMain('Downloading resources....');
        for (let k = 0; k < signageResources.length; k++) {
            const el = signageResources[k];
            if(fs.existsSync(userDataPath + '/resources/signage/' + el.fileName)) {
                if(signageResources.length === k + 1) {
                    mainWindow.webContents.send('init-display-configuration', {
                        data: res,
                        resourcePath: userDataPath + '/resources/signage/'
                    });
                    return true;
                }
            }else {
                console.log(el)
                let c = k + 1;
                download(mainWindow, await s3.getSignedUrl('getObject', {Bucket: 'devpan-cdn', Key: el.fileName}), {directory: path.join(userDataPath, 'resources/signage')})
                .then(dl => {
                    if(signageResources.length === c) {
                        mainWindow.webContents.send('init-display-configuration', {
                            data: res
                        });
                        return true;
                    }
                });
            }
        }
    }else {
        mainWindow.webContents.send('init-display-configuration', {
            data: res
        });
    }

    // console.log(signageResources, 'LOg')
    
}

function inValidRegistration() {
    store.set('access_token', '')
    store.set('uid', '')
    log.info('System register key invalid.')
    sendStatusToMain('Waiting for registration...')
    registerWindow.show();
}

ipcMain.on('check-system', (e, d) => {
    log.info('Checking system...')
    /*
    * Check system time.
    * Check system is registered or not.
    * 
    */
    const token = store.get('access_token')
    access_token = token;
    if(! token) {
        log.info('System not registered')
        registerWindow.show();
        sendStatusToMain('Waiting for registration...')

    }else {
        sendStatusToMain('Checking system registration...');
        log.info('System already registered...');
        log.info('Checking system registration...');
        PostData('/check-application-key/' + token, '', 'GET')
        .then(res => {
            successProductKey()
        })
        .catch(error => {
            inValidRegistration()
            log.info(error.data);
        })
    }

});

//Application registration
ipcMain.on('register-application', async(e, d) => {
    let id = await machineId();
    PostData('/registration', {product_key: d, system_id: id})
    .then(res => {
        if(res) {
            store.set('access_token', res.result.token)
            store.set('uid', res.result.uid)
            access_token = res.result.token;
            log.info('Registration success');
            successProductKey()
        }
    })
    .catch(error => {
        log.info('Registration error: ', error);
        registerWindow.webContents.send('error-product-activation', error.message)
    })
});

ipcMain.on('set-resource-path', (e, d) => {

    let pass = [];
    for (let i = 0; i < d.length; i++) {
        const data = d[i];
        pass.push({
            type: data.type,
            filePath: userDataPath + '/resources/signage/' + data.fileName
        });
    }
    e.reply('set-resource-path-completed', pass);
})

ipcMain.on('close-window', () => {
    app.quit();
})


//------------------------------------------------------

function sendStatusToMain(text) {
    
    mainWindow.webContents.send('status', text)
}

//Auto Update
autoUpdater.on('checking-for-update', () => {
})

autoUpdater.on('update-available', (ev, info) => {
    clearInterval(updateCheckTime);
})

autoUpdater.on('update-not-available', (ev, info) => {
    log.info('info', info);
})

autoUpdater.on('error', (ev, err) => {
    log.info('err', err);
})

autoUpdater.on('update-downloaded', (ev, info) => {
    setTimeout(function() {
        global.quitting = true;
        autoUpdater.quitAndInstall();
        app.quit();
    }, 5000)
})

autoUpdater.updateConfigPath = RESOURCE_END + '/config/dev-app-update.yml';

function checkUpdate() {
    if(isAutoUpdate) {
        updateCheckTime = setInterval(function() {
            log.info('starting update check');
            autoUpdater.checkForUpdates()  
        }, 10000);
    }
}

function PostData(url, body, method = 'POST') {
    
    return new Promise(async (resolve, reject) => {

        let options = {};

        if(method !== 'GET') {
            options = {
                method: method,
                body: JSON.stringify(body)
            }
        }

        options['headers'] = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + store.get('access_token')}

        // console.log(API_URL + url, method, options)
        fetch(API_URL + url, options)
	    .catch(err => console.log(err, 'Err'))
        .then(res => res.json())
	    .then(res => {
            if(res.status) {
                resolve(res)
            }else {
                reject(res)
            }
        })
    });
}

