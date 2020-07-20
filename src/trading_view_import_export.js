const { ipcRenderer } = require('electron');
var path = require("path");

document.querySelector('#back_btn').addEventListener('click', function(e) {
    event.preventDefault();
    var sel_options = document.querySelector('#addlists').options
    var sel_list_vals = []
    for (var i=0, n=sel_options.length;i<n;i++) {
        if (sel_options[i].selected) sel_list_vals.push(sel_options[i].value)
    }
    let cnvselected = document.querySelector('#conversion').value
    var args
    if (cnvselected === 'tv') {    
        args  = {
            tvlistin: document.querySelector('#listpathin').value,
            tvlistout: document.querySelector('#listpathout').value,
            tvselected: sel_list_vals,
            conversion: cnvselected
        }
    }
    if (cnvselected === 'ab') {    
        args  = {
            ablistin: document.querySelector('#listpathin').value,
            ablistout: document.querySelector('#listpathout').value,
            abselected: sel_list_vals,
            conversion: cnvselected
        }
    }    
    ipcRenderer.send('update_tv_config', args);
    window.location.href = "index.html";
});

document.querySelector('#conversion').addEventListener('change', function(e) {
    var sel_options = document.querySelector('#addlists').options
    var sel_list_vals = []
    for (var i=0, n=sel_options.length;i<n;i++) {
        if (sel_options[i].selected) sel_list_vals.push(sel_options[i].value)
    }
    let cnvselected = document.querySelector('#conversion').value
    var args
    if (cnvselected === 'ab') {    
        args  = {
            tvlistin: document.querySelector('#listpathin').value,
            tvlistout: document.querySelector('#listpathout').value,
            tvselected: sel_list_vals,
            conversion: cnvselected
        }
    }
    if (cnvselected === 'tv') {    
        args  = {
            ablistin: document.querySelector('#listpathin').value,
            ablistout: document.querySelector('#listpathout').value,
            abselected: sel_list_vals,
            conversion: cnvselected
        }
    }    
    ipcRenderer.send('update_tv_config', args);
    ipcRenderer.send('get_tv_config');
});

document.querySelector('#browse_btn').addEventListener('click', function(e) {
    event.preventDefault();
    ipcRenderer.send('browse_ab_path');
});

ipcRenderer.on('ab_path_sent', (event, arg) => {
    document.querySelector('#listpathin').value = arg
    let ext
    let cnvselected = document.querySelector('#conversion').value
    if (cnvselected === 'tv') {
        ext = '*.tls'
    }
    if (cnvselected === 'ab') {
        ext = '*.txt'
    }    
    var args = {
        listpath: arg,
        ext: ext
    }
    ipcRenderer.send('get_valid_lists', args);
});

document.querySelector('#browse_btn_out').addEventListener('click', function(e) {
    event.preventDefault();
    ipcRenderer.send('browse_path_out');
});

ipcRenderer.on('out_path_sent', (event, arg) => {
    document.querySelector('#listpathout').value = arg
});

ipcRenderer.send('get_tv_config');

ipcRenderer.on('tv_config_sent', (event, tvlistin, tvlistout, tvselected, ablistin, ablistout, abselected, conversion) => {  
    if (typeof tvlistin === 'undefined') { tvlistin = '' }
    if (typeof tvlistout === 'undefined') { tvlistout = '' }
    if (typeof tvselected === 'undefined') { tvselected = '' }
    if (typeof ablistin === 'undefined') { ablistin = '' }
    if (typeof ablistout === 'undefined') { ablistout = '' }
    if (typeof abselected === 'undefined') { abselected = '' }                    
    document.querySelector('#listpathin').value = ''
    document.querySelector('#listpathout').value = ''
    var addLists = document.querySelector('#addlists')
    var length = addLists.options.length;
    for (i = length-1; i >= 0; i--) {
        addLists.options[i] = null;
    }
    let cnvselected = document.querySelector('#conversion').value
    if (conversion.length) {
        cnvselected = conversion
        document.querySelector('#conversion').value = conversion
    }
    if (cnvselected === 'tv') {
        if (tvlistin.length) {
            document.querySelector('#listpathin').value = tvlistin
            var args = {
                listpath: tvlistin,
                ext: '*.tls'
            }
            ipcRenderer.send('get_valid_lists', args);     
        }
        if (tvlistout.length) {
            document.querySelector('#listpathout').value = tvlistout
        }
        // if (tvselected.length) {
        //     var selLists = document.querySelector('#addlists')
        //     for (let i = 0; i < tvselected.length; i++) {
        //         var opt = document.createElement('option');
        //         opt.appendChild( document.createTextNode(path.basename(tvselected[i])) );
        //         opt.value = tvselected[i];
        //         selLists.appendChild(opt);
        //     }        
        // }                
    }
    if (cnvselected === 'ab') {
        if (ablistin.length) {
            document.querySelector('#listpathin').value = ablistin
            var args = {
                listpath: ablistin,
                ext: '*.txt'
            }
            ipcRenderer.send('get_valid_lists', args);     
        }
        if (ablistout.length) {
            document.querySelector('#listpathout').value = ablistout
        }
        // if (abselected.length) {
        //     var selLists = document.querySelector('#addlists')
        //     for (let i = 0; i < abselected.length; i++) {
        //         var opt = document.createElement('option');
        //         opt.appendChild( document.createTextNode(path.basename(abselected[i])) );
        //         opt.value = abselected[i];
        //         selLists.appendChild(opt);
        //     }        
        // }                
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

document.querySelector('#convert_btn').addEventListener('click', function(e) {
    var sel_options = document.querySelector('#addlists').options
    var sel_list_vals = []
    for (var i=0, n=sel_options.length;i<n;i++) {
        if (sel_options[i].selected) sel_list_vals.push(sel_options[i].value)
    }
    let cnvselected = document.querySelector('#conversion').value
    var args = {
        lists: sel_list_vals,
        outdir: document.querySelector('#listpathout').value
    }    
    if (cnvselected === 'tv') {
        ipcRenderer.send('convert_list_tv', args);
    }
    if (cnvselected === 'ab') {
        ipcRenderer.send('convert_list_ab', args);
    }    
    event.preventDefault();
});