var fs = require('fs');

var ab_to_tv = async function (filepath) {
    let doc = fs.readFileSync(filepath, 'utf8')
    doc = doc.replace(/(\w+)(?=\.)\.(\w+)/g, "$2:$1")
    doc = doc.replace(/(\S+)\s+/g, "$1,")
    doc = doc.replace(/AU:/g,"ASX:")
    return doc;
}

var tv_to_ab = async function (filepath) {
    let doc = fs.readFileSync(filepath, 'utf8')
    doc = doc.replace(/(\w+)(?=\:)\:(\w+)/g, "$2.$1")
    doc = doc.replace(/\,/g,"\n")
    doc = doc.replace(/^\s*[\r\n]/gm, '');
    doc = doc.replace(/.ASX/g,".AU")
    return doc;
}

module.exports = {
    ab_to_tv: async function(filepath) {
        return await ab_to_tv(filepath);
    },
    tv_to_ab: async function(filepath) {
        return await tv_to_ab(filepath);
    }    
}