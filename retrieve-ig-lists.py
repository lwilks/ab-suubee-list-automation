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
def createlist(syms, country, listname):
    listname = listname.strip()
    listname = listname.replace(" ", "_")
    listname = listname.replace('/', "_")
    listname = listname.replace('\\', "_")

    ablists = os.environ['AB_LISTS']

    f= open(ablists+listname+".tls","w+")

    #Loop through ticker list and resolve ticker symbols into epics
    for sym in syms:       
        f.write(sym+'.'+country+'\n')

    print ("Written "+listname+".tls")

# Main function - log's into Suubee, scrapes list data from Trade Desk and US Page, provides list of ticker symbols to createlist function for creation of lists in IG (and ProRealtime)
def run(event=None,context=None):
    #Suubee Premium username
    username = os.environ['SUUBEE_USER']
    #Suubee Premium password
    password = os.environ['SUUBEE_PASS']
    #Suubee Premium url
    url = 'https://suubeepremium.com/login/'
    
    # If modifying these scopes, delete the file token.pickle.
    global SCOPES
    SCOPES = ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/spreadsheets']

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
	
    #Build list of ticker codes from leaders table
    syms = {}
    for leader in leaders.find_all('tr'):
        try:
            syms[leader.find('td').text.strip()] = asxcodes[leader.find('td').text.strip()]
        except KeyError:
            continue

    #Submit list to createlist function for tranlation into "epics" and list creation
    createlist(syms, 'AU', 'Leaders')
    
    #Build list of ticker codes from emerging table
    syms = {}
    leaders = soup.find('tbody', id='juniors_content')
    for leader in leaders.find_all('tr'):
        try:
            syms[leader.find('td').text.strip()] = asxcodes[leader.find('td').text.strip()]
        except KeyError:
            continue

    #Submit list to createlist function for tranlation into "epics" and list creation
    createlist(syms, 'AU', 'Emerging')

    #Build list of ticker codes from shorts table
    syms = {}
    leaders = soup.find('tbody', id='top20content')
    for leader in leaders.find_all('tr'):
        try:
            syms[leader.find('td').text.strip()] = asxcodes[leader.find('td').text.strip()]
        except KeyError:
            continue

    #Submit list to createlist function for tranlation into "epics" and list creation
    createlist(syms, 'AU', 'Shorts')

    #Cycle through various sector lists
    leadercount = 0    
    leaders = soup.find('table', class_='strongsectors_table')
    titles = leaders.find_all('div', class_='subtitle_widget')
    for leader in leaders.find_all('table', class_='subtable'):
        syms = {}
        #Build list of ticker codes from sector table
        for ticker in leader.find_all('tr'):
            try:
                syms[ticker.find('td').text.strip()] = asxcodes[ticker.find('td').text.strip()]
            except KeyError:
                continue

        #Submit list to createlist function for tranlation into "epics" and list creation
        createlist(syms, 'AU', titles[leadercount].text)
        leadercount += 1

run()