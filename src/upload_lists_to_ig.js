const axios = require('axios')
const parse = require('csv-parse')
//const IG = require('ig-api')
const IG = require('node-ig-api')
const pRetry = require('p-retry')
const delay = require('delay')
const fs = require('fs')
//const readline = require('readline');
const path = require('path');

const epcache = require('./epic_cache')

var epic_dicts = {}
var asxcodes = []
var watchlists = []

//require('dotenv').config()

//IG numerical username (same as what you log into IG with)
//const igusername = process.env.IG_USER
//IG Password
//const igpassword = process.env.IG_PASS
//Base IG API URL
const igurl = 'https://api.ig.com/gateway/deal/'
//IG API Key (genereted under "account settings" in IG Portal)
//const igapikey = process.env.IG_API_KEY

//ASX Listed companies list URL
const asxListedCompaniesURL = 'https://www.asx.com.au/asx/research/ASXListedCompanies.csv'

async function getASXCompanies() {
    try {
        var response = await axios.request({
            method: "GET",
            url: asxListedCompaniesURL,
            responseType: "stream",
        });
        
        const asxListParser = response.data.pipe(parse({ from_line: 3 }))
        const asxCodes = {}
        for await (const ticker_entry of asxListParser) {
            if (ticker_entry[0].endsWith(' LIMITED')) { ticker_entry[0] = ticker_entry[0].substr(0, ticker_entry[0].length -8) }
            if (ticker_entry[0].endsWith(' LIMITED.')) { ticker_entry[0] = ticker_entry[0].substr(0, ticker_entry[0].length -9) }
            if (ticker_entry[0].endsWith(' LTD')) { ticker_entry[0] = ticker_entry[0].substr(0, ticker_entry[0].length -4) }
            if (ticker_entry[0].endsWith(' TRUST')) { ticker_entry[0] = ticker_entry[0].substr(0, ticker_entry[0].length -6) }
            if (ticker_entry[0].endsWith(' REIT')) { ticker_entry[0] = ticker_entry[0].substr(0, ticker_entry[0].length -6) }        
            asxCodes[ticker_entry[1]] = ticker_entry[0];
        }
        return asxCodes
    }
    catch (error) {
        return error;
    }
}

async function tryreq(func) {
    const response = await pRetry(func, {
        onFailedAttempt: (error) => {
            if (error.body.errorCode === 'error.public-api.exceeded-api-key-allowance') {
                delay(60000)
            }
            else {
                throw(error)
            }
        },
        retries: 1
    })
    return response;
}

async function createlist(syms, country, listname, listprefix) {
    epics = []
    for (const sym of syms) {
        // Check epic cache and epic overrides first
        exchange = epcache.exchanges[country]
        if (epic_dicts.epic_dict_r.hasOwnProperty(sym+'.'+exchange)) {
            epics.push(epic_dicts.epic_dict_r[sym+'.'+exchange])
            continue
        }
        // Search IG by company name
        let marketInfo = undefined
        if (country == 'AU') {
            // marketInfo = await IG.search(escape(asxcodes[sym]))
            //})            
            marketInfo = await tryreq(async () => {
                return await IG.search(escape(asxcodes[sym]))
            })
            // If search by company name fails, search by symbol
            if (marketInfo.markets == undefined) {
                //marketInfo = await IG.search(sym)
                marketInfo = await tryreq(async () => {
                    return await IG.search(sym)
                })
            }
        }
        if (marketInfo['markets'] != undefined) {
            // Cycle through markets returned and get more information
            for (const market of marketInfo['markets']) {
                //marketExtendedInfo = await IG.epicDetails([market.epic])
                marketExtendedInfo = await tryreq(async () => {
                    return await IG.epicDetails([market.epic])
                })
                // If market id shares in in correct country than select it
                if ((marketExtendedInfo.marketDetails[0].instrument.type === 'SHARES') && (marketExtendedInfo.marketDetails[0].instrument.country === 'AU')) {
                    epics.push(market.epic)
                    continue
                }    
            }
        }
    }

    let watchlist = undefined
    // Check if list is less than 50
    if ((epics.length > 0) && (epics.length < 51)) {
        watchlist = {
            name: listprefix+'-'+listname,
            epics: epics
        }
        watchlists.push(watchlist)
    // If list is greater than 50, split into lists no greater than 50
    } else if (epics.length > 50) {
        for (let i = 0; i < Math.ceil(epics.length/50); i++) {
            watchlist = {
                name: listprefix+'-'+listname+'-'+(i+1).toString(),
                epics: epics.slice(i*50, (i+1)*50)
            }
            watchlists.push(watchlist)
        }
    }
}

var upload_lists = async function(igusername, igpassword, igapikey, listprefix, selectedlists) {
    try {
        asxcodes = await getASXCompanies()
        epic_dicts = await epcache.getEpicDicts()
        
        process.env.IG_API_KEY=igapikey
        process.env.IG_IDENTIFIER=igusername
        process.env.IG_PASSWORD=igpassword
        //process.env.IG_DEMO=FALSE        
        
        await IG.login(true)
        //const ig = new IG(igapikey, false)

        // Login to IG
        //await ig.login(igusername, igpassword)

        // Delete any existing lists
        //const watchlists = await tryreq(() => {return await IG.watchlists()})
        const existing_watchlists = await IG.watchlists()
        if (existing_watchlists != undefined) {
            existing_watchlists.filter( (list) => { return list.name.startsWith(listprefix+"-") } 
            ).forEach(
                (list) => { tryreq(async () => {return await IG.deleteWatchlist(list.id)} ) }
                //(list) => { return IG.deleteWatchlist(list.id) }
            )
        }

        for (var i=0, n=selectedlists.length;i<n;i++) {
            var syms = fs.readFileSync(selectedlists[i], 'utf8').split('\r\n')
            var country = syms[0].substr(syms[0].length - 2)
            for (let i = 0; i < syms.length; i++) {
                syms[i] = syms[i].substr(0, syms[i].length - 3)
            }
            syms = syms.filter((sym) => { return sym != '' })
            await createlist(syms, country, path.basename(selectedlists[i], '.tls'), listprefix)
          }        
          // Create a watchlists
          for (const watchlist of watchlists) {
            await tryreq(async () => { await IG.createWatchlist(watchlist.name, watchlist.epics) })
            //await IG.createWatchlist(watchlist.name, watchlist.epics)
          }
    } catch(error) {
        console.log(error)
    }
};

module.exports.upload_lists = async function(igapikey, igusername, igpassword, listprefix, selectedlists) {
    await upload_lists(igapikey, igusername, igpassword, listprefix, selectedlists)
};