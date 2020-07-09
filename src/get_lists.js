const request = require('request')
const parse = require('csv-parse')
const fs = require('fs')
const glob = require("glob")

const listIndexURL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHISABW77-Qsg6EM5aHOI3wGTPi_tzECzRU5hrrQEyQLnxFnPVsgRE50uuadvHIB4-jRIR0snlSReM/pub?gid=0&single=true&output=csv'

const epcache = require('./epic_cache')

var epic_dicts = {}

var get_lists = async function(path) {
  try {
    //var epic_dict = epic_cache.epic_dict
    epic_dicts = await epcache.getEpicDicts()
    const exchanges = epcache.exchanges

    let existingListFiles = glob.sync("SB-*.tls", { cwd: path })
    for (let i = 0; i < existingListFiles.length; i++) {
      fs.unlinkSync(path+'\\'+existingListFiles[i])
    }

    var strongSectorListFile = fs.createWriteStream('SB-Strong Sectors.tls')
    var allStocksListFile = fs.createWriteStream('SB-All Stocks.tls')
    var allUSStocksListFile = fs.createWriteStream('SB-US-All Stocks.tls')

    // Cycle through list index and determine list URL's
    const listIndexParser = request(listIndexURL).pipe(parse({ from_line: 2, trim: true }))
    for await (const list_record of listIndexParser) {
        // Name of list
        let list_name = list_record[0]
        // Is this a strong sector list
        let isStrongSector = (!list_name.startsWith("SB-Emerging")
            && !list_name.startsWith("SB-Leaders")
            && !list_name.startsWith("SB-Shorts")
            && !list_name.startsWith("SB-US Gold")
            && !list_name.startsWith("SB-US Leaders")
            && !list_name.startsWith("SB-US Short"))
        // Is this a US List
        let isUSList = (list_name.startsWith("SB-US Gold")
            || list_name.startsWith("SB-US Leaders")
            || list_name.startsWith("SB-US Short"))
        // Is this a short List
        let isShortList = list_name.startsWith("SB-Shorts")
        // Is this a US short List
        let isUSShortList = list_name.startsWith("SB-US Short")
        // Open file for writing
        var listFile = fs.createWriteStream(path+'/'+list_name.replace(/\//g, "")+'.tls')
        // Loop through each list and write to file
        let listParser = request(list_record[1]).pipe(parse({ trim: true }))
        for await (const list_entry of listParser) {
            //var translated_list_entry = epic_dicts.epic_dict[list_entry][0]+'.'+exchanges[epic_dicts.epic_dict[list_entry][1]]+'\n'
            var translated_list_entry = epic_dicts.epic_dict[list_entry][0]+'.'+epic_dicts.epic_dict[list_entry][1]+'\n'
            if (isStrongSector) { strongSectorListFile.write(translated_list_entry) }
            if (!isStrongSector && !isUSList && !isShortList) { allStocksListFile.write(translated_list_entry) }
            if (isUSList && !isUSShortList) { allUSStocksListFile.write(translated_list_entry) }
            listFile.write(translated_list_entry)
        }
        listFile.end()
    }
    strongSectorListFile.end()
    allStocksListFile.end()
    allUSStocksListFile.end()
  } catch (error) {
    console.log(error);
  }
}

module.exports.get_lists = async function(path) {
  await get_lists(path);
} 