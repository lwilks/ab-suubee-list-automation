const request = require('request')
const parse = require('csv-parse')

const overridesURL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT4J-8vOBv1cC9gDT-d0CbhQF8DQVeH4PunXCHrSmc2OmVX7ZF1qFfrGNmVXI_G-8N6GbrjMJxibQFn/pub?output=csv'
const cacheURL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT4J-8vOBv1cC9gDT-d0CbhQF8DQVeH4PunXCHrSmc2OmVX7ZF1qFfrGNmVXI_G-8N6GbrjMJxibQFn/pub?gid=232493082&single=true&output=csv'

const exchanges = {
    "AU": "ASX",
    "US": "US"
}

const countries = {
    "ASX": "AU",
    "US": "US"
}

async function getEpicDicts() {
    var epic_dict = {}
    var epic_dict_r = {}
    // Lookup cache to assist with reversing epics
    const cacheParser = request(cacheURL).pipe(parse({ from_line: 2 }))
    for await (const cache_entry of cacheParser) {
        epic_dict[cache_entry[2]] = [cache_entry[0], cache_entry[1]]
        epic_dict_r[cache_entry[0]+'.'+cache_entry[1]] = cache_entry[2]
    }
    // Lookup overrides to assist with reversing epics
    const overridesParser = request(overridesURL).pipe(parse({ from_line: 2 }))
    for await (const override of overridesParser) {
        epic_dict[override[2]] = [override[0], override[1]]
        epic_dict_r[override[0]+'.'+override[1]] = override[2]
    }

    return {epic_dict, epic_dict_r}
}

module.exports = {
    getEpicDicts: getEpicDicts,
    exchanges: exchanges,
    countries: countries
}