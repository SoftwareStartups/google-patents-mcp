Google Patents API
API uptime
100.000%
Google Patents API allows you to scrape patent and scholar results from Google Patents. The API is accessed through the following endpoint: /search?engine=google_patents. A user may query the following: https://serpapi.com/search?engine=google_patents utilizing a GET request. Head to the playground for a live and interactive demo.

API Parameters
Search Query
q

Optional

Parameter defines the query you want to search. You can split multiple search terms with semicolon ;. For advanced search syntax, please refer to About Google Patents.

Example for single search term:
(Coffee) OR (Tea)

Example for multiple search terms (separated by semicolon ;):
(Coffee) OR (Tea);(A47J)

Pagination
page

Optional

Parameter defines the page number. It's used for pagination. (e.g., 1 (default) is the first page of results, 2 is the 2nd page of results, etc.).

num

Optional

Parameter controls the number of results per page. Minimum: 10, Maximum: 100.

Advanced Google Patents Parameters
sort

Optional

Parameter defines the sorting method. By default, the results are sorted by Relevance.
List of supported values are:
new - Newest
old - Oldest
Patent results are sorted by filing_date while scholar results are sorted by publication_date for new and old values.

clustered

Optional

Parameter defines how the results should be grouped.
List of supported values are:
true - Classification

dups

Optional

Parameter defines the method of deduplication. Either Family (default) or Publication.
List of supported values are:
language - Publication

patents

Optional

Parameter controls whether or not to include Google Patents results. (Defaults to true)

scholar

Optional

Parameter controls whether or not to include Google Scholar results. (Defaults to false)

Date Range
before

Optional

Parameter defines the maximum date of the results. The format of this field is type:YYYYMMDD. type can be one of priority, filing, and publication.
Example:
- priority:20221231
- publication:20230101

after

Optional

Parameter defines the minimum date of the results. The format of this field is type:YYYYMMDD. type can be one of priority, filing, and publication.
Example:
- priority:20221231
- publication:20230101

Participants
inventor

Optional

Parameter defines the inventors of the patents. Split multiple inventors with , (comma)

assignee

Optional

Parameter defines the assignees of the patents. Split multiple assignees with , (comma)

Advanced Filters
country

Optional

Parameter filters patent results by countries. Split multiple country codes with , (comma).
List of supported country codes.
Example:WO,US.

language

Optional

Parameter filters patent results by languages. Split multiple languages with , (comma).
List of supported values are:
ENGLISH, GERMAN, CHINESE, FRENCH, SPANISH, ARABIC, JAPANESE, KOREAN, PORTUGUESE, RUSSIAN, ITALIAN, DUTCH, SWEDISH, FINNISH, NORWEGIAN, DANISH.
Example:ENGLISH,GERMAN.

status

Optional

Parameter filters patent results by status.
List of supported values are:
GRANT - Grant
APPLICATION - Application

type

Optional

Parameter filters patent results by type.
List of supported values are:
PATENT - Patent
DESIGN - Design

litigation

Optional

Parameter filters patent results by litigation status.
List of supported values are:
YES - Has Related Litigation
NO - No Known Litigation

Serpapi Parameters
engine

Required

Set parameter to google_patents to use the Google Patents API engine.

no_cache

Optional

Parameter will force SerpApi to fetch the Google Patents results even if a cached version is already present. A cache is served only if the query and all parameters are exactly the same. Cache expires after 1h. Cached searches are free, and are not counted towards your searches per month. It can be set to false (default) to allow results from the cache, or true to disallow results from the cache. no_cache and async parameters should not be used together.

async

Optional

Parameter defines the way you want to submit your search to SerpApi. It can be set to false (default) to open an HTTP connection and keep it open until you got your search results, or true to just submit your search to SerpApi and retrieve them later. In this case, you'll need to use our Searches Archive API to retrieve your results. async and no_cache parameters should not be used together. async should not be used on accounts with Ludicrous Speed enabled.

zero_trace

Optional

Enterprise only. Parameter enables ZeroTrace mode. It can be set to false (default) or true. Enable this mode to skip storing search parameters, search files, and search metadata on our servers. This may make debugging more difficult.

api_key

Required

Parameter defines the SerpApi private key to use.

output

Optional

Parameter defines the final output you want. It can be set to json (default) to get a structured JSON of the results, or html to get the raw html retrieved.

API Results
JSON Results
JSON output includes structured data for Organic Results and Summary.

A search status is accessible through search_metadata.status. It flows this way: Processing -> Success || Error. If a search has failed, error will contain an error message. search_metadata.id is the search ID inside SerpApi.

HTML Results
This API does not have html response, just a text. search_metadata.prettify_html_file contains prettified version of result. It is displayed in playground.

API Examples
JSON structure overview
{
  ...
  "organic_results": [
    {
      "position": "Integer - Position of the organic result",
      "rank": "Integer - Rank of the organic result - It may be different from `position` when the results are grouped",
      "cpc": "String - Cooperative Patent Classification (CPC) to the patent", // only present when `cluster` parameter is set to `true`
      "cpc_descrition": "String - The description of the CPC", // only present when `cluster` parameter is set to `true`
      "title": "String - The title of the patent / scholar",
      "snippet": "String - The snippet of the patent / scholar",
      "publication_date": "String - The publication date of the patent / scholar",
      "is_scholar": "Boolean - True if it's a scholar (Google Scholar) result",
      "patent_id": "String - ID of the patent",
      "scholar_id": "String - ID of the scholar",
      "patent_link": "String - URL to the patent page",
      "scholar_link": "String - URL to the scholar page",
      "serpapi_link": "String - URL to SerpApi Google Patents Details API",
      // following fields are patent results only
      "priority_date": "String - The priority date",
      "filing_date": "String - The filed date",
      "grant_date": "String - The granted date",
      "inventor": "String - Name of the inventor",
      "assignee": "String - Name of the assignee",
      "publication_number": "String - Publication number of the patent",
      "language": "String - Language of the patent",
      "thumbnail": "String - URL to the thumbnail of the patent",
      "pdf": "String - URL to the PDF document of the patent",
      "figures": "Array - URLs to more images of the patent, normally includes a `thumnail` and a `full` sized image",
      "country_status": "Hash - Statuses of the patent in each country. The key is the country code, the value is one of `ACTIVE`, `NOT_ACTIVE`, `UNKNOWN`",
      // following fields are scholar results only
      "url_hostname": "String - Hostname of the scholar's URL",
      "author": "String - Name of the author",
      "author_etal": "Boolean - Whether this scholar has three or more authors",
      "publication_venue": "String - Venue of publication",
    }
  ],
  "summary": {
    "assignee": [
      "key": "String - Name of the assignee",
      "percentage": "String - Percentage of the assignee",
      "frequency": [
        {
          "year_range": "String - Year range of the item",
          "percentage": "String - Percentage of the year range",
        }
      ]
    ],
    "inventor": "Array - Summary of the inventors, the structure is the same as `assignee`",
    "cpc": "Array - Summary of the CPCs, the structure is the same as `assignee`",
  },
  ...
}
Example with 
q
:
(Coffee)
parameter
GET


https://serpapi.com/search.json?engine=google_patents&q=(Coffee)

Code to integrate


Ruby

require 'google_search_results' 

params = {
  engine: "google_patents",
  q: "(Coffee)",
  api_key: "secret_api_key"
}

search = GoogleSearch.new(params)
organic_results = search.get_hash[:organic_results]

JSON Example

{
  "search_metadata": {
    "id": "64afe2d915afff17e18d922f",
    "status": "Success",
    "json_endpoint": "https://serpapi.com/searches/dadfa7408bfa2d66/64afe2d915afff17e18d922f.json",
    "created_at": "2023-07-13 11:41:13 UTC",
    "processed_at": "2023-07-13 11:41:13 UTC",
    "google_patents_url": "https://patents.google.com/xhr/query?url=q%3D%2528Coffee%2529",
    "raw_html_file": "https://serpapi.com/searches/dadfa7408bfa2d66/64afe2d915afff17e18d922f.html",
    "prettify_html_file": "https://serpapi.com/searches/dadfa7408bfa2d66/64afe2d915afff17e18d922f.prettify",
    "total_time_taken": 1.09
  },
  "search_parameters": {
    "engine": "google_patents",
    "q": "(Coffee)"
  },
  "search_information": {
    "total_results": 125048,
    "total_pages": 100,
    "page_number": 0
  },
  "organic_results": [
    {
      "position": 1,
      "rank": 0,
      "patent_id": "patent/US8110241B2/en",
      "patent_link": "https://patents.google.com/patent/US8110241B2/en",
      "serpapi_link": "https://serpapi.com/search.json?engine=google_patents_details&patent_id=patent%2FUS8110241B2%2Fen",
      "title": "Foaming soluble coffee powder containing pressurized gas",
      "snippet": "An instant coffee powder has dried soluble coffee in the form of particles or granules having internal voids filled with entrapped pressurized gas. Advantageously, when the coffee powder is dissolved in a beverage, the instant coffee powder produces a foam on the top surface of the beverage.",
      "priority_date": "2004-08-17",
      "filing_date": "2010-04-27",
      "grant_date": "2012-02-07",
      "publication_date": "2012-02-07",
      "inventor": "Bary Lyn Zeller",
      "assignee": "Kraft Foods Global Brands Llc",
      "publication_number": "US8110241B2",
      "language": "en",
      "thumbnail": "https://patentimages.storage.googleapis.com/25/a4/3c/08a69758ca974c/US08110241-20120207-D00000.png",
      "pdf": "https://patentimages.storage.googleapis.com/86/1c/bd/89a41d9faca215/US8110241.pdf",
      "figures": [
        {
          "thumbnail": "https://patentimages.storage.googleapis.com/bc/43/8a/befe307de64c7c/US08110241-20120207-D00000.png",
          "full": "https://patentimages.storage.googleapis.com/e0/9e/10/d0a025032833eb/US08110241-20120207-D00000.png"
        },
        {
          "thumbnail": "https://patentimages.storage.googleapis.com/c1/91/68/a0fc2ab8594671/US08110241-20120207-D00001.png",
          "full": "https://patentimages.storage.googleapis.com/5d/b3/37/ccdcbe58cbac2e/US08110241-20120207-D00001.png"
        }
      ],
      "country_status": {
        "EP": "ACTIVE",
        "US": "ACTIVE",
        "AR": "UNKNOWN",
        "AT": "NOT_ACTIVE",
        ...
      }
    },
    {
      "position": 2,
      "rank": 1,
      "patent_id": "patent/RU2766609C2/en",
      "patent_link": "https://patents.google.com/patent/RU2766609C2/en",
      "serpapi_link": "https://serpapi.com/search.json?engine=google_patents_details&patent_id=patent%2FRU2766609C2%2Fen",
      "title": "Roasted and ground powdered coffee and methods for its production",
      "snippet": "1. Dried roasted and ground coffee product containing particles of roasted and ground coffee, which are infused and/or coated with soluble coffee solids in an amount of 20-50 wt.%, and while these soluble coffee solids were subjected to extraction at a temperature below 60 °C 2. The dried roasted &hellip;",
      "priority_date": "2016-12-23",
      "filing_date": "2017-12-22",
      "grant_date": "2022-03-15",
      "publication_date": "2022-03-15",
      "inventor": "Федерико МОРА",
      "assignee": "Сосьете Де Продюи Нестле С.А.",
      "publication_number": "RU2766609C2",
      "language": "en",
      "thumbnail": "https://patentimages.storage.googleapis.com/23/fc/61/43bb57210f8b7f/00000001.png",
      "pdf": "https://patentimages.storage.googleapis.com/ab/3c/bb/d5d4b21616f08c/RU2766609C2.pdf",
      "figures": [
        {
          "thumbnail": "https://patentimages.storage.googleapis.com/e1/a2/76/38d9b190f71e04/00000001.png",
          "full": "https://patentimages.storage.googleapis.com/d1/86/b8/556e6f1e4d609b/00000001.png"
        }
      ],
      "country_status": {
        "WO": "UNKNOWN",
        "EP": "ACTIVE",
        "US": "ACTIVE",
        ...
      }
    },
    {
      "position": 3,
      "rank": 2,
      "patent_id": "patent/US8495950B2/en",
      "patent_link": "https://patents.google.com/patent/US8495950B2/en",
      "serpapi_link": "https://serpapi.com/search.json?engine=google_patents_details&patent_id=patent%2FUS8495950B2%2Fen",
      "title": "Method and apparatus for brewing coffee via universal coffee brewing chart &hellip;",
      "snippet": "wherein the brew formula ratio is a constant for different size batches of coffee brewed in accordance with the brew formula ratio. 11. The method of claim 4 , further comprising determining a projected target total dissolved solids (TDS) value for a coffee brew sample brewed as specified by the &hellip;",
      "priority_date": "2008-10-08",
      "filing_date": "2008-10-08",
      "grant_date": "2013-07-30",
      "publication_date": "2013-07-30",
      "inventor": "Vincent Fedele",
      "assignee": "Voice Systems Technology, Inc.",
      "publication_number": "US8495950B2",
      "language": "en",
      "thumbnail": "https://patentimages.storage.googleapis.com/f9/c6/73/311cd476a738f9/US08495950-20130730-D00000.png",
      "pdf": "https://patentimages.storage.googleapis.com/9b/13/3b/04ede26a15302b/US8495950.pdf",
      "figures": [
        {
          "thumbnail": "https://patentimages.storage.googleapis.com/48/2a/2c/66f95a4e79938c/US08495950-20130730-D00000.png",
          "full": "https://patentimages.storage.googleapis.com/68/0e/7b/399c0396b895eb/US08495950-20130730-D00000.png"
        },
        {
          "thumbnail": "https://patentimages.storage.googleapis.com/f8/75/c2/66c2c1a7fce878/US08495950-20130730-D00001.png",
          "full": "https://patentimages.storage.googleapis.com/97/31/80/9115dc57135085/US08495950-20130730-D00001.png"
        },
        {
          "thumbnail": "https://patentimages.storage.googleapis.com/38/05/98/b4b5eb0dfbeefb/US08495950-20130730-D00002.png",
          "full": "https://patentimages.storage.googleapis.com/69/f8/87/e7c19a808be041/US08495950-20130730-D00002.png"
        },
        ...
      ],
      "country_status": {
        "US": "ACTIVE"
      }
    },
    ...
  ],
  "summary": {
    "assignee": [
      {
        "key": "Total",
        "percentage": 100.0,
        "frequency": [
          {
            "year_range": "2022-2025",
            "percentage": 0.1
          },
          {
            "year_range": "2019-2022",
            "percentage": 2.7
          },
          ...
        ]
      },
       {
        "key": "Nestec S.A.",
        "percentage": 1.5,
        "frequency": [
          {
            "year_range": "2013-2016",
            "percentage": 0.1
          },
          {
            "year_range": "2010-2013",
            "percentage": 0.4
          },
          ...
        ]
      },
      {
        "key": "Societe Des Produits Nestle S.A.",
        "percentage": 1.2,
        "frequency": [
          {
            "year_range": "2019-2022",
            "percentage": 0.1
          },
          {
            "year_range": "2013-2016",
            "percentage": 0.2
          },
          ...
        ]
      },
      ...
    ],
    "inventor": [
      {
        "key": "Total",
        "percentage": 100.0,
        "frequency": [
          {
            "year_range": "2022-2025",
            "percentage": 0.1
          },
          {
            "year_range": "2019-2022",
            "percentage": 2.7
          },
          ...
        ]
      },
      {
        "key": "Ernesto Illy",
        "percentage": 0.6,
        "frequency": [
          {
            "year_range": "1989-1992",
            "percentage": 0.1
          },
          {
            "year_range": "1983-1986",
            "percentage": 0.1
          },
          ...
        ]
      },
      {
        "key": "Daniel Fischer",
        "percentage": 0.6,
        "frequency": [
          {
            "year_range": "2007-2010",
            "percentage": 0.1
          },
          {
            "year_range": "2004-2007",
            "percentage": 0.1
          },
          ...
        ]
      },
      ...
    ],
    "cpc": [
      {
        "key": "Total",
        "percentage": 100.0,
        "frequency": [
          {
            "year_range": "2022-2025",
            "percentage": 0.1
          },
          {
            "year_range": "2019-2022",
            "percentage": 2.7
          },
          ...
        ]
      },
      {
        "key": "A47J",
        "percentage": 66.7,
        "frequency": [
          {
            "year_range": "2022-2025",
            "percentage": 0.1
          },
          {
            "year_range": "2019-2022",
            "percentage": 1.7
          },
          ...
        ]
      },
      {
        "key": "A23F",
        "percentage": 19.5,
        "frequency": [
          {
            "year_range": "2022-2025",
            "percentage": 0.1
          },
          {
            "year_range": "2019-2022",
            "percentage": 0.8
          },
          ...
        ]
      },
      ...
    ]
  },
  "pagination": {
    "current": 0,
    "next": "https://patents.google.com/xhr/query?url=q%3D%2528Coffee%2529%26page%3D1"
  },
  "serpapi_pagination": {
    "current": 0,
    "next": "https://serpapi.com/search.json?engine=google_patents&page=1&q=%28Coffee%29"
  }
}