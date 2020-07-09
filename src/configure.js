const { ipcRenderer } = require('electron');

document.querySelector('#back_btn').addEventListener('click', function(e) {
    event.preventDefault();
    var args  = {
        iguser: document.querySelector('#iguser').value,
        igpass: document.querySelector('#igpass').value,
        igapikey: document.querySelector('#igapi').value,
        ab_lists_path: document.querySelector('#ablistpath').value
    }
    ipcRenderer.send('update_config', args);
    window.location.href = "index.html";
});

document.querySelector('#browse_btn').addEventListener('click', function(e) {
    event.preventDefault();
    ipcRenderer.send('browse_ab_path');
});

ipcRenderer.send('get_form_values');

ipcRenderer.on('ran_update_config', (event, arg) => {
    console.log(arg)
});

ipcRenderer.on('ab_path_sent', (event, arg) => {
    document.querySelector('#ablistpath').value = arg
});

ipcRenderer.on('form_values_sent', (event, igapikey, igusername, igpassword, ab_lists_path) => {
    if (igapikey.length) {
        document.querySelector('#igapi').value = igapikey
    }
    if (igusername.length) {
        document.querySelector('#iguser').value = igusername
    }
    if (igapikey.length) {
        document.querySelector('#igpass').value = igpassword
    }
    if (ab_lists_path.length) {
        document.querySelector('#ablistpath').value = ab_lists_path
    }      
    console.log(arg)
});