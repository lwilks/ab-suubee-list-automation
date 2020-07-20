var fs = require('fs');

var iress_export = async function(filepath) {
    let doc = fs.readFileSync(filepath, 'utf8') //, function(err, doc) {
    var comments = doc.replace(/^\s*[\r\n]/gm, '');
    comments = comments.replace(/(\.AU)/g, ".ASX")
    return comments;
    //});
}

module.exports.iress_export = async function(filepath) {
    return await iress_export(filepath);
} 