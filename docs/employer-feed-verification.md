# Employer feed: slug verification

Run date: 2026-10-02 (UTC). Every row below was fetched live, returned HTTP 200 and parsed as JSON.

How the list was built:
- Candidate names were tried against all three ATS endpoints with likely slugs (about 2,000 requests).
- A board was kept only if it returned HTTP 200 with valid JSON and at least one posting, and at least one posting had a UK location (UK, England, Scotland, Wales, London, Edinburgh, Manchester and similar). That check is what makes it a UK-present employer; the list is not hand-curated by reputation.
- Slugs that matched a different company (for example generic words like "echo", "remote", "peak", "wise") were dropped.
- Job counts are totals on the board at run time, across all locations and role types, not only internships.

Endpoints:
- greenhouse: `https://boards-api.greenhouse.io/v1/boards/{slug}/jobs`
- lever: `https://api.lever.co/v0/postings/{slug}?mode=json`
- ashby: `https://api.ashbyhq.com/posting-api/job-board/{slug}`

**Verified employers: 177**

| Employer | ATS | Slug | HTTP | Jobs on board |
|---|---|---|---|---|
| Adyen | greenhouse | adyen | 200 | 220 |
| Affirm | greenhouse | affirm | 200 | 190 |
| Airbnb | greenhouse | airbnb | 200 | 154 |
| Aircall | lever | aircall | 200 | 77 |
| Airtable | greenhouse | airtable | 200 | 4 |
| Airwallex | ashby | airwallex | 200 | 549 |
| Akuna Capital | greenhouse | akunacapital | 200 | 41 |
| Algolia | greenhouse | algolia | 200 | 38 |
| Amplitude | ashby | amplitude | 200 | 37 |
| Anthropic | greenhouse | anthropic | 200 | 639 |
| Asana | greenhouse | asana | 200 | 97 |
| Auto Trader | greenhouse | autotrader | 200 | 14 |
| Beamery | ashby | beamery | 200 | 5 |
| Binance | lever | binance | 200 | 310 |
| Block | greenhouse | block | 200 | 227 |
| Blockchain.com | greenhouse | blockchain | 200 | 38 |
| Braze | greenhouse | braze | 200 | 349 |
| Bugcrowd | greenhouse | bugcrowd | 200 | 8 |
| Bybit | greenhouse | bybit | 200 | 160 |
| Capital on Tap | greenhouse | capitalontap | 200 | 46 |
| Checkatrade | ashby | checkatrade | 200 | 18 |
| ClearBank | ashby | clearbank | 200 | 7 |
| ClickHouse | ashby | clickhouse | 200 | 195 |
| Cockroach Labs | greenhouse | cockroachlabs | 200 | 19 |
| Codat | ashby | codat | 200 | 4 |
| Cognism | greenhouse | cognism | 200 | 18 |
| Cognition | ashby | cognition | 200 | 103 |
| Cohere | ashby | cohere | 200 | 136 |
| Coinbase | greenhouse | coinbase | 200 | 228 |
| Contentful | greenhouse | contentful | 200 | 20 |
| Contentsquare | lever | contentsquare | 200 | 29 |
| Coupa | lever | coupa | 200 | 33 |
| Culture Amp | greenhouse | cultureamp | 200 | 32 |
| Cursor | ashby | cursor | 200 | 132 |
| CuspAI | ashby | cuspai | 200 | 15 |
| Cyberhaven | ashby | cyberhaven | 200 | 26 |
| Databricks | greenhouse | databricks | 200 | 885 |
| Datadog | greenhouse | datadog | 200 | 442 |
| DeepL | ashby | deepl | 200 | 18 |
| Deliveroo | greenhouse | deliveroo | 200 | 182 |
| Dialpad | greenhouse | dialpad | 200 | 60 |
| Docker | ashby | docker | 200 | 61 |
| Dojo | greenhouse | dojo | 200 | 26 |
| Dropbox | greenhouse | dropbox | 200 | 39 |
| Duolingo | greenhouse | duolingo | 200 | 61 |
| Elastic | greenhouse | elastic | 200 | 394 |
| ElevenLabs | ashby | elevenlabs | 200 | 171 |
| Elliptic | ashby | elliptic | 200 | 23 |
| Epic Games | greenhouse | epicgames | 200 | 150 |
| Faculty | ashby | faculty | 200 | 77 |
| Farfetch | lever | farfetch | 200 | 43 |
| Figma | greenhouse | figma | 200 | 163 |
| Fivetran | greenhouse | fivetran | 200 | 181 |
| Flock | ashby | flock | 200 | 9 |
| Flow Traders | greenhouse | flowtraders | 200 | 45 |
| Form3 | greenhouse | form3 | 200 | 8 |
| FREENOW | greenhouse | freenow | 200 | 34 |
| Freetrade | ashby | freetrade | 200 | 5 |
| Funding Circle | ashby | fundingcircle | 200 | 18 |
| GitLab | greenhouse | gitlab | 200 | 212 |
| GoCardless | greenhouse | gocardless | 200 | 25 |
| Grafana | greenhouse | grafanalabs | 200 | 122 |
| Graphcore | greenhouse | graphcore | 200 | 178 |
| Griffin | ashby | griffin | 200 | 6 |
| Gymshark | greenhouse | gymshark | 200 | 21 |
| H Company | ashby | hcompany | 200 | 24 |
| Healx | lever | healx | 200 | 2 |
| HelloFresh | greenhouse | hellofresh | 200 | 425 |
| Helsing | greenhouse | helsing | 200 | 166 |
| Hopper | ashby | hopper | 200 | 19 |
| IMC Trading | greenhouse | imc | 200 | 168 |
| Immersive Labs | ashby | immersivelabs | 200 | 10 |
| Intercom | greenhouse | intercom | 200 | 108 |
| IonQ | greenhouse | ionq | 200 | 118 |
| Isomorphic Labs | greenhouse | isomorphiclabs | 200 | 29 |
| Jane Street | greenhouse | janestreet | 200 | 230 |
| JetBrains | greenhouse | jetbrains | 200 | 67 |
| Jump Trading | greenhouse | jumptrading | 200 | 111 |
| Kaluza | greenhouse | kaluza | 200 | 35 |
| Kayak | ashby | kayak | 200 | 34 |
| Klaviyo | greenhouse | klaviyo | 200 | 133 |
| Lattice | greenhouse | lattice | 200 | 12 |
| Lendable | ashby | lendable | 200 | 71 |
| Lindus | ashby | lindus | 200 | 2 |
| Linear | ashby | linear | 200 | 30 |
| Lovable | ashby | lovable | 200 | 77 |
| Man Group | greenhouse | mangroup | 200 | 58 |
| Mapbox | ashby | mapbox | 200 | 44 |
| Marshmallow | ashby | marshmallow | 200 | 11 |
| Mixpanel | greenhouse | mixpanel | 200 | 62 |
| Mollie | ashby | mollie | 200 | 42 |
| Moneybox | ashby | moneybox | 200 | 16 |
| MongoDB | greenhouse | mongodb | 200 | 391 |
| Monzo | greenhouse | monzo | 200 | 71 |
| Moonpig | lever | moonpig | 200 | 13 |
| Multiverse | ashby | multiverse | 200 | 20 |
| Mux | ashby | mux | 200 | 1 |
| Neo4j | greenhouse | neo4j | 200 | 66 |
| Nothing | greenhouse | nothing | 200 | 9 |
| Notion | ashby | notion | 200 | 138 |
| OakNorth | ashby | oaknorth | 200 | 17 |
| Ocado Group | greenhouse | ocadogroup | 200 | 52 |
| Okta | greenhouse | okta | 200 | 369 |
| OKX | greenhouse | okx | 200 | 328 |
| OpenAI | ashby | openai | 200 | 829 |
| Oyster | ashby | oyster | 200 | 26 |
| Paddle | ashby | paddle | 200 | 23 |
| Palantir | lever | palantir | 200 | 319 |
| Parloa | greenhouse | parloa | 200 | 50 |
| Pay.UK | greenhouse | payuk | 200 | 5 |
| Peloton | greenhouse | peloton | 200 | 58 |
| Pendo | greenhouse | pendo | 200 | 23 |
| Pennylane | ashby | pennylane | 200 | 148 |
| PhysicsX | greenhouse | physicsx | 200 | 43 |
| Pigment | lever | pigment | 200 | 137 |
| Pinterest | greenhouse | pinterest | 200 | 167 |
| Plaid | ashby | plaid | 200 | 122 |
| Pleo | ashby | pleo | 200 | 34 |
| Point72 | greenhouse | point72 | 200 | 212 |
| PostHog | ashby | posthog | 200 | 8 |
| PsiQuantum | greenhouse | psiquantum | 200 | 74 |
| Quantexa | ashby | quantexa | 200 | 38 |
| Ramp | ashby | ramp | 200 | 158 |
| Recorded Future | greenhouse | recordedfuture | 200 | 50 |
| Reddit | greenhouse | reddit | 200 | 152 |
| Redis | ashby | redis | 200 | 31 |
| Replit | ashby | replit | 200 | 72 |
| Rigetti | lever | rigetti | 200 | 16 |
| Ripple | greenhouse | ripple | 200 | 132 |
| Riverlane | greenhouse | riverlane | 200 | 29 |
| Robinhood | greenhouse | robinhood | 200 | 162 |
| Roblox | greenhouse | roblox | 200 | 255 |
| Rubrik | greenhouse | rubrik | 200 | 128 |
| Sanity | ashby | sanity | 200 | 34 |
| Scale AI | greenhouse | scaleai | 200 | 192 |
| Schonfeld | greenhouse | schonfeld | 200 | 72 |
| Shield AI | lever | shieldai | 200 | 583 |
| Snowflake | ashby | snowflake | 200 | 347 |
| Sophos | lever | sophos | 200 | 83 |
| Spire | greenhouse | spire | 200 | 41 |
| Spotify | lever | spotify | 200 | 82 |
| Squarepoint | greenhouse | squarepointcapital | 200 | 90 |
| Starburst | greenhouse | starburst | 200 | 30 |
| Strava | ashby | strava | 200 | 30 |
| Stripe | greenhouse | stripe | 200 | 712 |
| Sumo Logic | greenhouse | sumologic | 200 | 9 |
| SumUp | greenhouse | sumup | 200 | 341 |
| Supabase | ashby | supabase | 200 | 48 |
| Synthesia | ashby | synthesia | 200 | 49 |
| Tanium | greenhouse | tanium | 200 | 55 |
| Teya | ashby | teya | 200 | 125 |
| Tide | greenhouse | tide | 200 | 82 |
| Tines | greenhouse | tines | 200 | 26 |
| Tractable | ashby | tractable | 200 | 3 |
| Trading 212 | ashby | trading212 | 200 | 66 |
| Trainline | ashby | trainline | 200 | 29 |
| TripAdvisor | greenhouse | tripadvisor | 200 | 100 |
| TrueLayer | greenhouse | truelayer | 200 | 3 |
| Trustpilot | greenhouse | trustpilot | 200 | 49 |
| Twilio | greenhouse | twilio | 200 | 129 |
| Unmind | ashby | unmind | 200 | 1 |
| Veracode | greenhouse | veracode | 200 | 11 |
| Vercel | greenhouse | vercel | 200 | 86 |
| Virtu | greenhouse | virtu | 200 | 48 |
| Vitesse | ashby | vitesse | 200 | 4 |
| Vonage | greenhouse | vonage | 200 | 20 |
| Wayflyer | ashby | wayflyer | 200 | 19 |
| Wayve | ashby | wayve | 200 | 39 |
| Webflow | greenhouse | webflow | 200 | 25 |
| Winton | greenhouse | winton | 200 | 9 |
| Wolt | greenhouse | wolt | 200 | 214 |
| Wordsmith | ashby | wordsmith | 200 | 20 |
| Xero | ashby | xero | 200 | 119 |
| Zego | ashby | zego | 200 | 43 |
| Zilch | ashby | zilch | 200 | 14 |
| Zoe | ashby | zoe | 200 | 7 |
| Zopa | lever | zopa | 200 | 34 |
