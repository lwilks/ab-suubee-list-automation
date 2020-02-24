#!/usr/bin/env python
# coding: utf-8
from dotenv import load_dotenv
from bs4 import BeautifulSoup
import requests
import json
import csv
import time
import os
import datetime
import pytz
import re
from google.oauth2 import service_account
from googleapiclient.discovery import build
from datetime import date, timedelta
from collections import OrderedDict

load_dotenv()

utc_now = pytz.utc.localize(datetime.datetime.utcnow())
au_now = utc_now.astimezone(pytz.timezone("Australia/Melbourne"))

date_str = au_now.strftime('%d/%m/%Y')

# Function to read ticker symbol lists, translate symbol lists into IG API "epics" lists and create list in IG
def createlist(syms, country, listname, checknewscode=False, printonly=True):
    global timeout
    global igurl
    epics = []

    exchange = ''
    if country == 'AU':
        exchange = 'ASX'

    #Loop through ticker list and resolve ticker symbols into epics
    for sym in syms:
        #If an override exists, use that instead
        if overrides.get(sym+'.'+exchange):
            epics.append(overrides.get(sym+'.'+exchange))
            continue

        #Check if the epic has been cached to google sheets in the past 7 days. If so, use that.
        if cache.get(sym+'.'+exchange):
            last_updated = cache.get(sym+'.'+exchange)['LAST UPDATE']
            d1, m1, y1 = last_updated.split('/')
            last_updated_date = date(int(y1), int(m1), int(d1))
            current_date = date(au_now.year, au_now.month, au_now.day)
            cutoff_date = current_date - timedelta(days = 7)
            if last_updated_date >= cutoff_date:
                epics.append(cache.get(sym+'.'+exchange)['EPIC'])
                continue    
        
        #Search for symbol in IG API. If max hits exceeded (code 403) than wait (for duration specified in timeout variable) then try again
        r = tryreq('markets?searchTerm='+sym, None, headers, 'GET')           
        json_data = json.loads(r.text)

        #If nothing found, try ticker instead of company name
        if not len(json_data['markets']):
            r = tryreq('markets?searchTerm='+sym, None, headers, 'GET')
            json_data = json.loads(r.text)

        for market in json_data['markets']:
            epic = market['epic']
            headers2 = {'Version': '3', 'X-IG-API-KEY': igapikey, 'X-SECURITY-TOKEN': igsectoken, 'CST': igcst}   
            r2 = tryreq('markets/'+epic, None, headers2, 'GET')              
            json_data2 = json.loads(r2.text)
            newscode = json_data2['instrument']['newsCode']
            if (json_data2['instrument']['type'] == 'SHARES' and json_data2['instrument']['country'] == country):
                if (newscode[:newscode.find('.')] == sym or checknewscode == False):
                    epics.append(market['epic'])
                    break
            
    d = {}
    d['name'] = 'LA-'+listname
    d['epics'] = epics

    epics2 = []
    if len(epics) > 50:
        d['name'] = 'LA-'+listname+'-1'
        d['epics'] = epics[:50]
        epics2 = epics[51:]

    if printonly:
        print(json.dumps(d, indent = 4))
    else:
        r = tryreq('watchlists', d, headers, 'POST')  

    if len(epics2):
        d['name'] = 'LA-'+listname+'-2'
        d['epics'] = epics2
        if printonly:
            print(json.dumps(d, indent = 4))
        else:
            r = tryreq('watchlists', d, headers, 'POST')
    
    return r.text        

#Try request. If we recieve a 403 response, wait 60 seconds and try again.
def tryreq(param, d, headers, method):
    global timeout
    global igurl
    try:
        data = None
        if d:
            data = json.dumps(d)
        r = session.request(method=method, url=igurl+param, data=data, headers=headers)
        r.raise_for_status()
    except requests.exceptions.HTTPError as err:
        if (err.response.status_code == 403):
            time.sleep(timeout)
            r = session.request(method=method, url=igurl+param, data=data, headers=headers)
        else:
            print(err)
            return err
    return r

#Load epic cache from google sheets
def loadepiccache():    
    r = session.get('https://docs.google.com/spreadsheets/d/e/2PACX-1vT4J-8vOBv1cC9gDT-d0CbhQF8DQVeH4PunXCHrSmc2OmVX7ZF1qFfrGNmVXI_G-8N6GbrjMJxibQFn/pub?gid=232493082&single=true&output=csv', headers={'Cache-Control': 'no-cache'})
    rows = r.text.split("\n")
    reader = csv.DictReader(rows)

    cache = {}
    for row in reader:
        key = row.pop('TICKER')+'.'+row.pop('EXCHANGE')
        cache[key] = row
    return cache    

# Main function - log's into Suubee, scrapes list data from Trade Desk and US Page, provides list of ticker symbols to createlist function for creation of lists in IG (and ProRealtime)
def run(event=None,context=None):
    #IG numerical username (same as what you log into IG with)
    igusername = os.environ['IG_USER']
    #IG Password
    igpassword = os.environ['IG_PASS']
    #Base IG API URL
    global igurl
    igurl = 'https://api.ig.com/gateway/deal/'
    #IG API Key (genereted under "account settings" in IG Portal)
    global igapikey
    igapikey = os.environ['IG_API_KEY']

    #Suubee Premium username
    username = os.environ['SUUBEE_USER']
    #Suubee Premium password
    password = os.environ['SUUBEE_PASS']
    #Suubee Premium url
    url = 'https://suubeepremium.com/login/'
    
    # If modifying these scopes, delete the file token.pickle.
    global SCOPES
    SCOPES = ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/spreadsheets']

    # The ID and range of a sample spreadsheet.
    global SPREADSHEET_ID
    SPREADSHEET_ID = '1EoWJEMzhDH_bc_vIWjlzq0O4mOh6etaxrCFOLr9ec9A'
    global SPREADSHEET_RANGE_NAME
    SPREADSHEET_RANGE_NAME = 'EPICCACHE'

    #Set to true to print list of "epics" instead of creating lists
    printonly = False

    #Start requests "session"
    global session
    session = requests.Session()
    
    #Create headers - Need to make script look like desktop browsewr so we get the full site from Suubee
    global headers
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.76 Safari/537.36'} # This is chrome, you can set whatever browser you like
    r = session.get(url, headers=headers)

    #Login to suubee premium
    values = {'log' : username, 'pwd' : password, 'rememberme' : 'forever', 'wp-submit' : 'Log In', 'redirect_to' : 'https://suubeepremium.com/trading-desk/', 'mepr_process_login_form' : 'true', 'mepr_is_login_page' : 'true'}
    r = session.post(url, data=values, headers=headers)

    #Use Beautiful Soup library to scrape and parse Suubee website data
    soup = BeautifulSoup(r.text, 'lxml')

    #Find "Leaders" table
    leaders = soup.find('tbody', id='leaders_content')
    if leaders is None:
        print("Invalid username\password combination for Suubee")
        return "<p>Invalid username\password combination for Suubee</p>"

    #Get list of symbols and full company names from ASX website
    r = session.get('https://www.asx.com.au/asx/research/ASXListedCompanies.csv')

    rows = r.text.split("\n")

    reader = csv.DictReader(rows[2:])

    #Make sure we only filter in valid company types
    asxcodes = {}
    for row in reader:    
        key = row.pop('ASX code')
        if row['Company name'].endswith(' LIMITED'):
            row['Company name'] = row['Company name'][:-8]
        if row['Company name'].endswith(' LIMITED.'):
            row['Company name'] = row['Company name'][:-9]        
        if row['Company name'].endswith(' LTD'):
            row['Company name'] = row['Company name'][:-4]
        if row['Company name'].endswith(' TRUST'):
            row['Company name'] = row['Company name'][:-6]
        if row['Company name'].endswith(' REIT'):
            row['Company name'] = row['Company name'][:-6]         
        asxcodes[key] = row['Company name']

    #Load overrides from google sheets
    r = session.get('https://docs.google.com/spreadsheets/d/e/2PACX-1vT4J-8vOBv1cC9gDT-d0CbhQF8DQVeH4PunXCHrSmc2OmVX7ZF1qFfrGNmVXI_G-8N6GbrjMJxibQFn/pub?output=csv')
    rows = r.text.split("\n")
    reader = csv.DictReader(rows)

    global overrides
    overrides = {}
    for row in reader:
        key = row.pop('TICKER')+'.'+row.pop('EXCHANGE')
        overrides[key] = row['EPIC']

    #Load epic cache from google sheets
    global cache 
    cache = loadepiccache()

    #Create header to authenticate with IG API
    headers = {'Version': '2', 'X-IG-API-KEY': igapikey}
    data = {"identifier": igusername, "password": igpassword, "encryptedPassword": '' } 

    #How long should be wait between calls to IG API if we have exceeded max hits (default 65 seconds)
    global timeout
    timeout = 65
    
    #Authenticate with IG API. If max hits exceeded (code 403) than wait (for duration specified in timeout variable) then try again
    try:
        r = session.post(igurl+'session', json=data, headers=headers)
        r.raise_for_status()
    except requests.exceptions.HTTPError as err:
        if (err.response.status_code == 403):
            time.sleep(timeout)
            try:
                r = session.post(igurl+'session', json=data, headers=headers)
                r.raise_for_status()
            except requests.exceptions.HTTPError as err:
                if (err.response.status_code == 403):
                    print("Invalid API key for IG")
                    print("Raw Exception: "+str(err))
                    return "<p>Invalid API key for IG</p>"
                else:
                    print(err)
                    return "<p>"+str(err)+"</p>"
        elif (err.response.status_code == 401):
            print("Invalid username and password combination for IG")
            print("Raw Exception: "+str(err))
            return "<p>Invalid username and password combination for IG</p>"
        else:
            print(err)
            return "<p>"+str(err)+"</p>"

    #Get security token from IG
    global igsectoken
    igsectoken = r.headers.get('X-SECURITY-TOKEN')
    global igcst
    igcst = r.headers.get('CST')

    #Construct new header for IG with the security token obtained above
    headers = {'Version': '1', 'X-IG-API-KEY': igapikey, 'X-SECURITY-TOKEN': igsectoken, 'CST': igcst}
	
    results = []
	
    r = tryreq('watchlists', None, headers, 'GET')

    watchlists = json.loads(r.text)

    #If we are not simply printing the epics then delete the existing lists we have created
    if not printonly:
        for x in watchlists['watchlists']:
            valid = re.search("^LA-*", x['name'])
            if valid:
                r = tryreq('watchlists/'+x['id'], None, headers, 'DELETE')

    f1= open("lists.txt","r")
    for line1 in f1:
        if f1.mode == 'r':
            f2= open(line1.strip(),"r")

            if f2.mode == 'r':
                syms = []
                for line2 in f2:
                    syms.append(line2.split('.')[0])

                createlist(syms, 'AU', os.path.basename(line1.strip()), printonly=printonly)
            else:
                print ("Error opening "+line1+"!")    
        else:
            print ("Error opening lists.txt!")
run()