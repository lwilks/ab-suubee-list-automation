const { ipcRenderer, clipboard } = require('electron');
var path = require("path");

document.querySelector('#back_btn').addEventListener('click', function(e) {
    event.preventDefault();
    let cnvselected = document.querySelector('#conversion').value
    var args = {
        iresslistpath: document.querySelector('#listpath').value,
        conversion: cnvselected
    }
    ipcRenderer.send('update_iress_config', args);    
    window.location.href = "index.html";
});

document.querySelector('#conversion').addEventListener('change', function(e) {
    let cnvselected = document.querySelector('#conversion').value
    var args
    let listpath = document.querySelector('#listpath').value
    var ext
    if (cnvselected === 'ab') { ext = '*.tls' }
    if (cnvselected === 'tv') { ext = '*.txt' }   
    var args = {
        listpath: listpath,
        ext: ext
    }    
    ipcRenderer.send('get_valid_lists', args);     
});

document.querySelector('#browse_btn').addEventListener('click', function(e) {
    event.preventDefault();
    ipcRenderer.send('browse_ab_path');
});

ipcRenderer.on('ab_path_sent', (event, arg) => {
    document.querySelector('#listpath').value = arg
    let cnvselected = document.querySelector('#conversion').value
    var ext
    if (cnvselected === 'ab') { ext = '*.tls' }
    if (cnvselected === 'tv') { ext = '*.txt' }
    var args = {
        listpath: arg,
        ext: ext
    }
    ipcRenderer.send('get_valid_lists', args);
});

ipcRenderer.send('get_iress_config');

ipcRenderer.on('iress_config_sent', (event, listpath, conversion) => {  
    document.querySelector('#conversion').value = conversion
    if (listpath.length) {
        document.querySelector('#listpath').value = listpath
        let cnvselected = document.querySelector('#conversion').value
        var ext
        if (cnvselected === 'ab') { ext = '*.tls' }
        if (cnvselected === 'tv') { ext = '*.txt' }        
        var args = {
            listpath: listpath,
            ext: ext
        }
        ipcRenderer.send('get_valid_lists', args);   
    }
});

ipcRenderer.on('valid_lists_sent', (event, validlists, listpath) => {
    var addLists = document.querySelector('#addlists')
    var length = addLists.options.length;
    for (i = length-1; i >= 0; i--) {
        addLists.options[i] = null;
    }    
    if (validlists.length) {
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
    let cnvselected = document.querySelector('#conversion').value
    var addLists = document.querySelector('#addlists')
    var args = {
        listpath: addLists.options[addLists.selectedIndex].value,
        conversion: cnvselected
    }    
    if (!(addLists.selectedIndex < 0)) {
        ipcRenderer.send('convert_list_iress', args);
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