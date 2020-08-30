var fs = require('fs');

var iress_export = async function(filepath) {
    let doc = fs.readFileSync(filepath, 'utf8')
    var comments = doc.replace(/^\s*[\r\n]/gm, '');
    comments = comments.replace(/(\.AU)/g, ".ASX")
    return comments;
}

var iress_export_tv = async function(filepath) {
    let doc = fs.readFileSync(filepath, 'utf8')
    doc = doc.replace(/(\w+)(?=\:)\:(\w+)/g, "$2.$1")
    doc = doc.replace(/\,/g,"\n")
    doc = doc.replace(/^\s*[\r\n]/gm, '');
    return doc;
}

module.exports = {
    iress_export: async function(filepath) {
        return await iress_export(filepath);
    },
    iress_export_tv: async function(filepath) {
        return await iress_export_tv(filepath);
    }  
}