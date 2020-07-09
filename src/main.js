const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const ProgressBar = require('electron-progressbar');
const glob = require("glob")

const upload_lists = require('./upload_lists_to_ig')
const get_lists = require('./get_lists')
const Store = require('./store');

const fs = require('fs')

//the first argument can be: a file, directory or glob pattern
// require('electron-reload')(__dirname, {
//   electron: path.join(__dirname, '..', 'node_modules', '.bin', 'electron.ps1')
// });

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
  app.quit();
}

require('update-electron-app')({
  repo: 'lwilks/ab-suubee-list-automation',
  updateInterval: '1 hour',
  logger: require('electron-log')
})

var mainWindow

// First instantiate the class
const store = new Store({
  // We'll call our data file 'user-preferences'
  configName: 'user-preferences',
  defaults: {
    igdetails: { igapikey: '', iguser: '', igpass: '' },
    ab_lists_path: '',
    listpath: '',
    listprefix: 'LA',
    selectedlists: []
  }
});

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,

    webPreferences: {
      //preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true
    },
    //show: false,
  });

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Open the DevTools.
  //mainWindow.webContents.openDevTools();

  mainWindow.setMenuBarVisibility(false)

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
  });
};

function handleSubmission() {
  ipcMain.on('get_list_submitted', async (event) => {
    try {
      // let { igapikey, igusername, igpassword } = store.get('igdetails');
      // if (igapikey === '') { throw('API key not present') }
      // if (igusername === '') { throw('IG username not present') }
      // if (igpassword === '') { throw('IG password not present') }
      ab_lists_path = store.get('ab_lists_path');
      if (ab_lists_path === '') { throw('Path to AmiBroker lists not defined') }
      if (!fs.existsSync(ab_lists_path)) { throw('Path to AmiBroker is not defined') }
      mainWindow.setProgressBar(2)
      var progressBar = new ProgressBar({
        text: 'Preparing data...',
        detail: 'Getting lists from IG...',        
        browserWindow: {
          modal: true,
          parent: mainWindow,
          webPreferences: {
            nodeIntegration: true
          },        
        }
      });
      progressBar
      .on('completed', function() {
        console.info(`completed...`);
        progressBar.detail = 'Task completed. Exiting...';
      })
      .on('aborted', function() {
        console.info(`aborted...`);
      });
      console.log('START GET LISTS!')  
      await get_lists.get_lists(ab_lists_path)
      event.sender.send('ran_get_lists_submitted', 'WE RAN GET LISTS!')
      progressBar.setCompleted();
      mainWindow.setProgressBar(-1)
    } catch (error) {
      dialog.showMessageBox(options = { type: 'error', title: 'Error!', message: 'Error: '+error })
      console.log('Error: '+error)
    }
  });
  ipcMain.on('push_list_submitted', async (event, args) => {
    try {
      let { igapikey, iguser, igpass } = store.get('igdetails');
      let { listprefix, selectedlists } = args;
      if (igapikey === '') { throw('API key not present') }
      if (iguser === '') { throw('IG username not present') }
      if (igpass === '') { throw('IG password not present') }
      if (listprefix === '') { throw('List prefix not present') }
      if (selectedlists.length < 1) { throw('No lists selected') }
      mainWindow.setProgressBar(2)
      var progressBar = new ProgressBar({
        text: 'Preparing data...',
        detail: 'Pushing AmiBroker lists to IG...',
        browserWindow: {
          modal: true,
          parent: mainWindow,
          webPreferences: {
            nodeIntegration: true
          },        
        }
      });
      progressBar
      .on('completed', function() {
        console.info(`completed...`);
        progressBar.detail = 'Task completed. Exiting...';
      })
      .on('aborted', function() {
        console.info(`aborted...`);
      });
      console.log('START PUSH LISTS!')  
      await upload_lists.upload_lists(iguser, igpass, igapikey, listprefix, selectedlists)
      event.sender.send('ran_push_lists_submitted', 'WE RAN PUSH LISTS!')
      progressBar.setCompleted();
      mainWindow.setProgressBar(-1)
    } catch (error) {
      dialog.showMessageBox(options = { type: 'error', title: 'Error!', message: 'Error: '+error })
      console.log('Error: '+error)
    }
  });
  ipcMain.on('update_config', async (event, args) => {
    try {
      let { igapikey, iguser, igpass, ab_lists_path } = args;
      store.set('igdetails', { igapikey, iguser, igpass });      
      store.set('ab_lists_path', ab_lists_path);
    } catch(error) {
      dialog.showMessageBox(options = { type: 'error', title: 'Error!', message: 'Error: '+error })
      console.log('Error: '+error)      
    }
  });
  ipcMain.on('get_form_values', async (event, args) => {
    try {
      let { igapikey, iguser, igpass } = store.get('igdetails');
      ab_lists_path = store.get('ab_lists_path');
      event.sender.send('form_values_sent', igapikey, iguser, igpass, ab_lists_path)
    } catch(error) {
      dialog.showMessageBox(options = { type: 'error', title: 'Error!', message: 'Error: '+error })
      console.log('Error: '+error)      
    }
  });
  ipcMain.on('browse_ab_path', async (event, args) => {
    try {
      let path = await dialog.showOpenDialog({properties: ['openFile', 'openDirectory', 'multiSelections']})
      event.sender.send('ab_path_sent', path.filePaths[0])
    } catch(error) {
      dialog.showMessageBox(options = { type: 'error', title: 'Error!', message: 'Error: '+error })
      console.log('Error: '+error)      
    }
  });
  ipcMain.on('update_list_config', async (event, args) => {
    try {
      let { listpath, listprefix, selectedlists } = args;
      store.set('listpath', listpath);      
      store.set('listprefix', listprefix); 
      store.set('selectedlists', selectedlists);
    } catch(error) {
      dialog.showMessageBox(options = { type: 'error', title: 'Error!', message: 'Error: '+error })
      console.log('Error: '+error)      
    }
  });
  ipcMain.on('get_push_list_values', async (event, args) => {
    try {
      let listpath = store.get('listpath');
      let listprefix = store.get('listprefix');
      let selectedlists = store.get('selectedlists');
      event.sender.send('push_list_values_sent', listpath, listprefix, selectedlists)
    } catch(error) {
      dialog.showMessageBox(options = { type: 'error', title: 'Error!', message: 'Error: '+error })
      console.log('Error: '+error)      
    }
  });
  ipcMain.on('get_valid_lists', async (event, args) => {
    try {
      let listpath = args;
      if (!fs.existsSync(listpath)) { throw('Path to Lists is not valid') }
      let valid_lists = glob.sync("*.tls", { cwd: listpath } )
      event.sender.send('valid_lists_sent', valid_lists, listpath )
    } catch(error) {
      dialog.showMessageBox(options = { type: 'error', title: 'Error!', message: 'Error: '+error })
      console.log('Error: '+error)      
    }
  });           
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  createWindow();
  handleSubmission();
});

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
