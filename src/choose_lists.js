const { ipcRenderer } = require('electron');
var path = require("path");

document.querySelector('#back_btn').addEventListener('click', function(e) {
    event.preventDefault();
    var sel_options = document.querySelector('#selectedlists').options
    var sel_list_vals = []
    for (var i=0, n=sel_options.length;i<n;i++) {
        if (sel_options[i].value) sel_list_vals.push(sel_options[i].value)
    }
    var args  = {
        listpath: document.querySelector('#listpath').value,
        listprefix: document.querySelector('#listprefix').value,
        selectedlists: sel_list_vals
    }
    ipcRenderer.send('update_list_config', args);    
    window.location.href = "index.html";
});

document.querySelector('#browse_btn').addEventListener('click', function(e) {
    event.preventDefault();
    ipcRenderer.send('browse_ab_path');
});

ipcRenderer.on('ab_path_sent', (event, arg) => {
    document.querySelector('#listpath').value = arg
    ipcRenderer.send('get_valid_lists', arg);
});

ipcRenderer.send('get_push_list_values');

ipcRenderer.on('push_list_values_sent', (event, listpath, listprefix, selectedlists) => {  
    if (listpath.length) {
        document.querySelector('#listpath').value = listpath
        ipcRenderer.send('get_valid_lists', listpath);   
    }
    if (listprefix.length) {
        document.querySelector('#listprefix').value = listprefix
    }
    if (selectedlists.length) {
        var selLists = document.querySelector('#selectedlists')
        for (let i = 0; i < selectedlists.length; i++) {
        var opt = document.createElement('option');
        opt.appendChild( document.createTextNode(path.basename(selectedlists[i])) );
        opt.value = selectedlists[i];
        selLists.appendChild(opt);
        }        
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

document.querySelector('#addlist').addEventListener('click', function(e) {
    event.preventDefault();
    var addLists = document.querySelector('#addlists')
    if (!(addLists.selectedIndex < 0)) {
        var selLists = document.querySelector('#selectedlists')
        var opt = document.createElement('option');
        opt.appendChild( document.createTextNode(addLists.options[addLists.selectedIndex].text) );
        opt.value = addLists.options[addLists.selectedIndex].value;
        selLists.appendChild(opt);
    }
});

document.querySelector('#removelist').addEventListener('click', function(e) {
    event.preventDefault();
    var selLists = document.querySelector('#selectedlists')
    selLists.removeChild(selLists.options[selLists.selectedIndex])
});

document.querySelector('#push_list_btn').addEventListener('click', function(e) {
    event.preventDefault();
    var sel_options = document.querySelector('#selectedlists').options
    var sel_list_vals = []
    for (var i=0, n=sel_options.length;i<n;i++) {
        if (sel_options[i].value) sel_list_vals.push(sel_options[i].value)
    }
    var args  = {
        listprefix: document.querySelector('#listprefix').value,
        selectedlists: sel_list_vals
    }    
    ipcRenderer.send('push_list_submitted', args);
});

// ipcRenderer.on('ran_push_lists_submitted', (event, arg) => {
//     console.log(arg)
// });