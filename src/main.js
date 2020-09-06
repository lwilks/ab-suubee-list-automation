// process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
// process.env.HTTP_PROXY = 'http://192.168.1.242:5555'
// process.env.HTTPS_PROXY = 'http://192.168.1.242:5555'

// var globalTunnel = require('global-tunnel-ng');
 
// globalTunnel.initialize({
//   connect: 'neither',
//   //protocol: 'https:',
//   host: '192.168.1.242',
//   port: 5555
// });

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const ProgressBar = require('electron-progressbar');
const glob = require("glob")

const upload_lists = require('./upload_lists_to_ig')
const get_lists = require('./get_lists')
const iress_export = require('./iRess_export')
const tv_import_export = require('./tv_import_export')
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

require('update-electron-app')()

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
    selectedlists: [],
    iresslistpath: '',
    conversion: '',
    tvlistin: '',
    tvlistout: '',
    tvselected: [],
    ablistin: '',
    ablistout: '',
    abselected: [],
    irconversion: ''
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
      progressBar.setCompleted()
      mainWindow.setProgressBar(-1)      
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
      progressBar.setCompleted()
      mainWindow.setProgressBar(-1)      
      dialog.showMessageBox(options = { type: 'error', title: 'Error!', message: 'Error: '+error.errorCode })
      console.log('Error: '+error)
    }
  });
  ipcMain.on('update_config', async (event, args) => {
    try {
      let { igapikey, iguser, igpass, ab_lists_path } = args;
      store.set('igdetails', { igapikey, iguser, igpass });      
      store.set('ab_lists_path', ab_lists_path);
    } catch(error) {
      dialog.showMessageBox(options = { type: 'error', title: 'Error!', message: 'Error: '+error.errorCode })
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
  ipcMain.on('update_iress_config', async (event, args) => {
    try {
      let { iresslistpath, conversion } = args;
      store.set('iresslistpath', iresslistpath);    
      if (typeof conversion !== 'undefined') { store.set('irconversion', conversion); }  
    } catch(error) {
      dialog.showMessageBox(options = { type: 'error', title: 'Error!', message: 'Error: '+error })
      console.log('Error: '+error)      
    }
  });
  ipcMain.on('get_iress_config', async (event, args) => {
    try {
      let iresslistpath = store.get('iresslistpath');
      let conversion = store.get('irconversion');
      event.sender.send('iress_config_sent', iresslistpath, conversion)
    } catch(error) {
      dialog.showMessageBox(options = { type: 'error', title: 'Error!', message: 'Error: '+error })
      console.log('Error: '+error)      
    }
  });  
  ipcMain.on('get_valid_lists', async (event, args) => {
    try {
      let { listpath, ext } = args;
      if (!fs.existsSync(listpath)) { throw('Path to Lists is not valid') }
      let valid_lists = glob.sync(ext, { cwd: listpath } )
      event.sender.send('valid_lists_sent', valid_lists, listpath )
    } catch(error) {
      dialog.showMessageBox(options = { type: 'error', title: 'Error!', message: 'Error: '+error })
      console.log('Error: '+error)      
    }
  });
  ipcMain.on('convert_list_iress', async (event, arg) => {
    try {
      let { listpath, conversion } = arg;
      if (!fs.existsSync(listpath)) { throw('Path to Lists is not valid') }
      let converted_list
      if (conversion === 'ab') {
        converted_list = await iress_export.iress_export(listpath)
      } else {
        converted_list = await iress_export.iress_export_tv(listpath)
      }
      event.sender.send('converted_iress_sent', converted_list )
    } catch(error) {
      dialog.showMessageBox(options = { type: 'error', title: 'Error!', message: 'Error: '+error })
      console.log('Error: '+error)      
    }
  });
  ipcMain.on('update_tv_config', async (event, args) => {
    try {
      let { tvlistin, tvlistout, tvselected, ablistin, ablistout, abselected, conversion } = args;

      if (typeof tvlistin !== 'undefined') { store.set('tvlistin', tvlistin); }
      if (typeof tvlistout !== 'undefined') { store.set('tvlistout', tvlistout);  }
      if (typeof tvselected !== 'undefined') { store.set('tvselected', tvselected); }
      if (typeof ablistin !== 'undefined') { store.set('ablistin', ablistin); }
      if (typeof ablistout !== 'undefined') { store.set('ablistout', ablistout);  }
      if (typeof abselected !== 'undefined') { store.set('abselected', abselected); }
      if (typeof conversion !== 'undefined') { store.set('conversion', conversion); }
    } catch(error) {
      dialog.showMessageBox(options = { type: 'error', title: 'Error!', message: 'Error: '+error })
      console.log('Error: '+error)      
    }
  });
  ipcMain.on('get_tv_config', async (event, args) => {
    try {
      let tvlistin = store.get('tvlistin');
      let tvlistout = store.get('tvlistout');
      let tvselected = store.get('tvselected');
      let ablistin = store.get('ablistin');
      let ablistout = store.get('ablistout');
      let abselected = store.get('abselected');
      let conversion = store.get('conversion');
      event.sender.send('tv_config_sent', tvlistin, tvlistout, tvselected, ablistin, ablistout, abselected, conversion)
    } catch(error) {
      dialog.showMessageBox(options = { type: 'error', title: 'Error!', message: 'Error: '+error })
      console.log('Error: '+error)      
    }
  });
  ipcMain.on('convert_list_tv', async (event, args) => {
    try {
      let {lists, outdir} = args;
      if (!fs.existsSync(outdir)) { throw('Path to Lists is not valid') }
      for (let i = 0; i < lists.length; i++) {
        let doc = await tv_import_export.ab_to_tv(lists[i])
        fs.writeFileSync(outdir+"\\"+path.basename(lists[i],'.tls')+'.txt', doc)
      }
      dialog.showMessageBox(options = { type: 'info', title: 'Conversion Complete!', message: 'Conversion Complete!' })
    } catch(error) {
      dialog.showMessageBox(options = { type: 'error', title: 'Error!', message: 'Error: '+error })
      console.log('Error: '+error)      
    }
  }); 
  ipcMain.on('convert_list_ab', async (event, args) => {
    try {
      let {lists, outdir} = args;
      if (!fs.existsSync(outdir)) { throw('Path to Lists is not valid') }
      for (let i = 0; i < lists.length; i++) {
        let doc = await tv_import_export.tv_to_ab(lists[i])
        fs.writeFileSync(outdir+"\\"+path.basename(lists[i],'.txt')+'.tls', doc)
      }
      dialog.showMessageBox(options = { type: 'info', title: 'Conversion Complete!', message: 'Conversion Complete!' })
    } catch(error) {
      dialog.showMessageBox(options = { type: 'error', title: 'Error!', message: 'Error: '+error })
      console.log('Error: '+error)      
    }
  });
  ipcMain.on('browse_path_out', async (event, args) => {
    try {
      let path = await dialog.showOpenDialog({properties: ['openFile', 'openDirectory', 'multiSelections']})
      event.sender.send('out_path_sent', path.filePaths[0])
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
