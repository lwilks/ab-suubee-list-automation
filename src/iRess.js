const { ipcRenderer, clipboard } = require('electron');
var path = require("path");

document.querySelector('#back_btn').addEventListener('click', function(e) {
    event.preventDefault();
    var args = {
        iresslistpath: document.querySelector('#listpath').value,
    }
    ipcRenderer.send('update_iress_config', args);    
    window.location.href = "index.html";
});

document.querySelector('#browse_btn').addEventListener('click', function(e) {
    event.preventDefault();
    ipcRenderer.send('browse_ab_path');
});

ipcRenderer.on('ab_path_sent', (event, arg) => {
    document.querySelector('#listpath').value = arg
    var args = {
        listpath: arg,
        ext: '*.tls'
    }
    ipcRenderer.send('get_valid_lists', args);
});

ipcRenderer.send('get_iress_config');

ipcRenderer.on('iress_config_sent', (event, listpath) => {  
    if (listpath.length) {
        document.querySelector('#listpath').value = listpath
        var args = {
            listpath: listpath,
            ext: '*.tls'
        }
        ipcRenderer.send('get_valid_lists', args);   
    }
});

ipcRenderer.on('valid_lists_sent', (event, validlists, listpath) => {
    if (validlists.length) {
        var addLists = document.querySelector('#addlists')
        var length = addLists.options.length;
        for (i = length-1; i >= 0; i--) {
            addLists.options[i] = null;
        }
        for (let i = 0; i < validlists.length; i++) {
        var opt = document.createElement('option');
        opt.appendChild( document.createTextNode(validlists[i]) );
        opt.value = listpath+'\\'+validlists[i];
        addLists.appendChild(opt);
        }        
    }  
});

document.querySelector('#convertlist').addEventListener('click', function(e) {
    event.preventDefault();
    var addLists = document.querySelector('#addlists')
    if (!(addLists.selectedIndex < 0)) {
        ipcRenderer.send('convert_list_iress', addLists.options[addLists.selectedIndex].value);
    }
});

ipcRenderer.on('converted_iress_sent', (event, convertedlist) => {  
    if (convertedlist.length) {
        document.querySelector('#listoutput').value = convertedlist
    }
});

document.querySelector('#copy_btn').addEventListener('click', function(e) {
    event.preventDefault();
    clipboard.writeText(document.querySelector('#listoutput').value)
});