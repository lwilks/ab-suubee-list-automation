const { ipcRenderer } = require('electron');

document.querySelector('#get_list_btn').addEventListener('click', function(e) {
    event.preventDefault();
    ipcRenderer.send('get_list_submitted');
});

ipcRenderer.on('ran_get_lists_submitted', (event, arg) => {
    console.log(arg)
});

// document.querySelector('#push_list_btn').addEventListener('click', function(e) {
//     event.preventDefault();
//     ipcRenderer.send('push_list_submitted');
// });

// ipcRenderer.on('ran_push_lists_submitted', (event, arg) => {
//     console.log(arg)
// });