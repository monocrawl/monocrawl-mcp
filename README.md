<p align="center">
  <a href="https://www.monocrawl.com"><img src="https://www.monocrawl.com/opengraph-image.png" alt="Monocrawl: one API for social data. Public data for your apps and AI agents." width="720"></a>
</p>

# Monocrawl MCP

**Give your AI agent live public data from 70+ platforms.** Profiles, posts, comments, transcripts, products, prices, reviews, listings, jobs, ads and search results from TikTok, Instagram, YouTube, LinkedIn, X, Reddit, Amazon, Walmart, Vinted, Booking.com, Airbnb, Tripadvisor, Zillow, Zoopla, Rightmove, Trustpilot, Google and many more, plus website crawls and live browser sessions. One key, one response format, and **1,000 free credits every month**.

[![npm](https://img.shields.io/npm/v/monocrawl-mcp?color=cb3837&label=npm)](https://www.npmjs.com/package/monocrawl-mcp)
[![MCP Registry](https://img.shields.io/badge/MCP%20Registry-listed-2ea44f)](https://registry.modelcontextprotocol.io/v0/servers?search=com.monocrawl/mcp)
[![Endpoints](https://img.shields.io/badge/endpoints-650%2B-0969da)](https://www.monocrawl.com/docs/endpoints)
[![Platforms](https://img.shields.io/badge/platforms-70%2B-0969da)](https://www.monocrawl.com/platforms)
[![Free credits](https://img.shields.io/badge/free-1%2C000%20credits%2Fmonth-2ea44f)](https://www.monocrawl.com/pricing)
[![License: MIT](https://img.shields.io/badge/license-MIT-yellow)](https://opensource.org/licenses/MIT)

[Quick start](#quick-start) · [Client setup](#client-setup) · [What you can ask](#what-you-can-ask) · [Tools](#tools) · [Platforms](#platforms) · [Pricing](#pricing) · [Configuration](#configuration)

## Why Monocrawl

- **650+ endpoints across REST and MCP.** Your agent can call every one of the 610 live data endpoints across 74 platforms straight from this server, including website crawls and live browser sessions.
- **Sign in with your browser.** One command connects Claude Code, Codex, Cursor, VS Code and five other agents. No key to copy or paste.
- **Works in Claude.ai and ChatGPT today.** Add Monocrawl as a custom connector and sign in with OAuth.
- **Always current.** Tools, parameters and prices load live from the hosted service. Nothing is bundled, so nothing goes out of date.
- **Spending you control.** Every result reports its cost. Cap any call with `max_credits`, preview any cost for free, and set a credit limit on each connection.
- **Failed calls cost nothing.** Errors and upstream failures are refunded automatically.
- **Big results, paid for once.** Large responses are kept for 24 hours, and `get_result` reads them in full at no charge.

## Quick start

### 1. Browser sign-in (recommended)

```sh
npx -y monocrawl-cli@latest init --agent claude
```

Swap `claude` for `codex`, `cursor`, `vscode`, `grok`, `opencode`, `gemini`, `openclaw` or `hermes`. A browser tab opens, you approve the connection, and the helper writes it to your agent's MCP settings. Your key never appears in the terminal or the chat. Each connection can be given a credit limit or revoked in the [dashboard](https://www.monocrawl.com/dashboard/api/keys).

### 2. Hosted server, nothing to install

| Client | How to connect |
|---|---|
| Claude.ai, ChatGPT | Add a custom connector with `https://www.monocrawl.com/mcp/oauth`, then sign in |
| Claude Code | `claude mcp add --scope user --transport http monocrawl https://www.monocrawl.com/mcp --header "Authorization: Bearer mn_your_key_here"` |
| Gemini CLI | `gemini mcp add --scope user --transport http monocrawl https://www.monocrawl.com/mcp/oauth` |
| Any HTTP client | `https://www.monocrawl.com/mcp` with an `Authorization: Bearer mn_your_key_here` or `x-api-key` header |

### 3. This package, running locally

For clients that only start local (stdio) servers. Requires Node.js 22 or newer.

```json
{
  "mcpServers": {
    "monocrawl": {
      "command": "npx",
      "args": ["-y", "monocrawl-mcp@latest"],
      "env": {
        "MONOCRAWL_API_KEY": "mn_your_key_here"
      }
    }
  }
}
```

[Create a free account](https://www.monocrawl.com/signup) and copy a key from [API keys](https://www.monocrawl.com/dashboard/api/keys). Keys start with `mn_`. Want to look around first? Leave out the `env` block: `list_endpoints`, `get_endpoint` and `get_docs` work without an account.

## Client setup

Restart your client after saving its configuration, then ask your agent to check your Monocrawl balance to confirm the tools loaded.

<details>
<summary><b>Claude Code</b></summary>

```sh
claude mcp add --scope user --transport stdio monocrawl --env MONOCRAWL_API_KEY=mn_your_key_here -- npx -y monocrawl-mcp@latest
```

</details>

<details>
<summary><b>Claude Desktop</b></summary>

Add this to `claude_desktop_config.json`: `~/Library/Application Support/Claude/` on macOS, `%APPDATA%\Claude\` on Windows.

```json
{
  "mcpServers": {
    "monocrawl": {
      "command": "npx",
      "args": ["-y", "monocrawl-mcp@latest"],
      "env": { "MONOCRAWL_API_KEY": "mn_your_key_here" }
    }
  }
}
```

</details>

<details>
<summary><b>Cursor</b></summary>

Add this to `~/.cursor/mcp.json`, or to `.cursor/mcp.json` in a project.

```json
{
  "mcpServers": {
    "monocrawl": {
      "command": "npx",
      "args": ["-y", "monocrawl-mcp@latest"],
      "env": { "MONOCRAWL_API_KEY": "mn_your_key_here" }
    }
  }
}
```

</details>

<details>
<summary><b>VS Code</b></summary>

Add this to `.vscode/mcp.json`. VS Code asks for the key once and stores it securely, so it never sits in the file.

```json
{
  "inputs": [
    { "type": "promptString", "id": "monocrawl-key", "description": "Monocrawl API key", "password": true }
  ],
  "servers": {
    "monocrawl": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "monocrawl-mcp@latest"],
      "env": { "MONOCRAWL_API_KEY": "${input:monocrawl-key}" }
    }
  }
}
```

</details>

<details>
<summary><b>Windsurf</b></summary>

Add this to `~/.codeium/windsurf/mcp_config.json`.

```json
{
  "mcpServers": {
    "monocrawl": {
      "command": "npx",
      "args": ["-y", "monocrawl-mcp@latest"],
      "env": { "MONOCRAWL_API_KEY": "mn_your_key_here" }
    }
  }
}
```

</details>

<details>
<summary><b>Codex</b></summary>

Add this to `~/.codex/config.toml`.

```toml
[mcp_servers.monocrawl]
command = "npx"
args = ["-y", "monocrawl-mcp@latest"]
env = { MONOCRAWL_API_KEY = "mn_your_key_here" }
```

</details>

<details>
<summary><b>Any other MCP client</b></summary>

Run `npx -y monocrawl-mcp@latest` as a stdio server with `MONOCRAWL_API_KEY` in its environment.

</details>

## What you can ask

Ask in plain language. Your agent picks the endpoints, checks prices and makes the calls.

| Ask your agent | What it uses |
|---|---|
| "Get NASA's TikTok profile and its latest videos." | `tiktok/profile`, `tiktok/profile-videos` |
| "What are people saying about the Stanley cup on Reddit this week?" | `reddit/search`, `reddit/post/comments` |
| "Compare prices for Sony WH-1000XM5 headphones on Amazon, Walmart and eBay." | `amazon/search`, `walmart/search`, `ebay/search` |
| "Summarise the latest Trustpilot reviews for Monzo." | `trustpilot/reviews` |
| "Find hotels in Lisbon on Booking.com for 10 to 14 October." | `booking/search-hotels` |
| "Transcribe this YouTube video and list its sponsors." | `youtube/post-transcript`, `youtube/video-sponsors` |
| "What have Barbour wax jackets actually sold for on Vinted?" | `vinted/sold-comparables` |
| "Crawl the Vercel changelog and list this month's releases." | `start_data_job` (`web/crawl`) |
| "What would a Zoopla valuation cost before I run it?" | `get_endpoint` (free) |
| "Watch r/MechanicalKeyboards for posts about Keychron and show me new ones each morning." | `create_monitor`, `monitor_findings` |

Every response uses the same envelope on every platform. This is a real response for NASA's TikTok profile, recorded on 26 September 2026 and trimmed:

```json
{
  "success": true,
  "platform": "tiktok",
  "endpoint": "/v1/tiktok/profile",
  "data": {
    "handle": "nasa",
    "name": "NASA",
    "url": "https://www.tiktok.com/@nasa",
    "verified": true,
    "followers": 1829985,
    "following": 23,
    "likes_count": 9619119,
    "video_count": 48
  },
  "credits_used": 1
}
```

Full responses also carry `credits_remaining` and a `request_id` for support and receipts.

## Tools

19 tools. The ones that start jobs, open browsers or change monitors show a free preview first and only act once confirmed.

| Tool | What it does | Account needed | Cost |
|---|---|---|---|
| `list_endpoints` | Browse the live catalogue by platform or keyword, with each endpoint's price | No | Free |
| `get_endpoint` | One endpoint in full: parameters, price and a ready-to-run example | No | Free |
| `get_docs` | Read Monocrawl guides as Markdown | No | Free |
| `call_endpoint` | Fetch live data from any endpoint. `max_credits` caps the charge, `idempotency_key` makes retries safe, `dry_run` returns a free estimate | Yes | The endpoint's price |
| `get_result` | Read a large result in full for 24 hours without running it again | Yes | Free |
| `get_balance` | Your credits and this connection's spending limit | Yes | Free |
| `list_monitors` | Every monitor with its schedule, last run and spend this month | Yes | Free |
| `get_monitor` | One monitor with its recent runs and receipts | Yes | Free |
| `create_monitor` | Watch a subject across platforms on a schedule. Shows the plan and estimate first, then creates it once confirmed | Yes | 1 credit, then each run |
| `update_monitor` | Pause, resume, rename or reschedule a monitor | Yes | Free |
| `run_monitor` | Run a monitor now. Shows the estimate first | Yes | Per run |
| `monitor_findings` | New findings with evidence links, newest first | Yes | Free |
| `mark_monitor_findings_seen` | Mark findings as read | Yes | Free |
| `delete_monitor` | Delete a monitor once confirmed | Yes | Free |
| `start_data_job` | Crawl a website, batch-scrape many URLs, run an autonomous web task, or collect Tripadvisor attraction and restaurant reviews. Gives a free estimate first, then starts with a credit cap | Yes | The job's price |
| `cancel_web_job` | Check on a data job or cancel it | Yes | Free |
| `create_browser_session` | Open a hosted browser, optionally on a web page. Gives a free estimate first, then opens with a credit cap | Yes | The session's price |
| `execute_browser_session` | Run code in the live page to click, type, fill in forms or read it. Shows the exact code and page before anything runs | Yes | Per run |
| `close_browser_session` | Close a browser session | Yes | Free |

Monitors keep running on Monocrawl's servers after your chat closes, and deliver findings to the dashboard or your own destinations.

## Platforms

All 610 live data endpoints across 74 platforms are callable from this server, through the same key as the [REST API](https://www.monocrawl.com/docs/api-reference). Ask your agent to run `list_endpoints` for the live list with prices.

### Social and community

| Platform | Endpoints | What your agent can get |
|---|---:|---|
| TikTok | 35 | Profiles, videos, comments and replies, transcripts, trending, TikTok's popular hashtag and video boards, top ads, search across videos, users, hashtags and sounds, hashtag details, songs and effects, followers and following, audience, liked videos, reposts, playlists, collections, places, live status |
| Instagram | 38 | Profiles and account details, posts, reels, full post and reel feeds, stories and highlights, comments and replies, likers, engagement and post stats, followers and following, similar accounts, username suggestions, tagged, location and audio feeds, transcripts, trending reels, search across profiles, reels, hashtags, places and music |
| YouTube | 29 | Channels, videos, Shorts, live streams, playlists, community posts, comments and replies, transcripts and subtitles, sponsors, thumbnails and media files, search with filters and autocomplete, trending videos and Shorts |
| LinkedIn | 43 | Profiles and every profile section (experience, education, skills, certifications, honours, publications, recommendations, volunteering, interests), posts, comments, reactions and reposts, companies with their people, posts and jobs, groups, jobs, transcripts, search across people, posts, jobs, schools, industries and locations |
| X (Twitter) | 16 | Profiles, tweets, replies, quotes, retweeters, mentions, media, followers and following, communities, video transcripts, tweet and user search |
| Facebook | 23 | Pages and profiles, posts, reels and full reel feeds, photos, comments and replies, groups and group posts, events and event search, Marketplace search and listings, video transcripts, search across pages, people, posts and videos |
| Reddit | 13 | Posts and comment threads, subreddits and their details, users with their posts and comments, video transcripts, search across posts, comments and subreddits, in-subreddit search, a multi-query research sweep |
| Threads | 6 | Profiles, posts, comments, user posts, keyword and user search |
| Quora | 7 | Questions, answers, profiles, Spaces, topics, user posts, search |
| Pinterest | 4 | Pins, boards, a user's boards, search |
| Rumble | 5 | Search, channel videos, videos, comments, transcripts |
| Twitch | 4 | Profiles, clips, videos, stream schedules |
| Bluesky | 4 | Profiles, posts, a user's posts, search |
| Snapchat | 3 | Profiles, Spotlight videos and their comments |
| Telegram | 3 | Public channels, channel posts, single posts |
| Truth Social | 3 | Profiles, posts, a user's posts |
| Kwai | 3 | Profiles, posts, a user's posts |
| Kick | 1 | Clips |

### Shopping and marketplaces

| Platform | Endpoints | What your agent can get |
|---|---:|---|
| Amazon | 11 | Search, products, reviews, best sellers, deals, categories, offers from every seller, seller profiles, products and reviews, shop pages |
| Walmart | 8 | Search, products, offers, reviews, category browsing, rollbacks, sellers and seller reviews |
| Klarna | 18 | Products and every merchant offer, price history, comparisons, search and suggestions, user and expert reviews, category browsing with filters and buying guides, stores |
| AliExpress | 12 | Search, products and descriptions, reviews, shipping, similar items, hot products, promotions, stores and their products, categories |
| Sephora | 12 | Search and suggestions, products, reviews, similar products, brands, categories, stores and in-store availability |
| Etsy | 11 | Search and suggestions, listings, reviews, similar items, categories, shops with their listings and reviews |
| H&M | 9 | Search and suggestions, products, new arrivals, similar items, supplier and factory disclosures, categories, stores |
| Gumtree | 9 | UK classifieds: search and suggestions, listings, similar listings, trending searches, categories, filters, locations |
| Vinted | 8 | Search, search by image, listings, sellers with their items and feedback, price suggestions, sold comparables |
| Google Shopping | 7 | Search, products, price history, reviews, sellers, deals, store reviews |
| Target | 6 | Search, products, reviews, categories, store lookup |
| Kohl's | 5 | Search, reviews, product questions, categories, stores |
| TikTok Shop | 5 | Products, reviews, search, shop catalogues, creator showcases |
| Home Depot | 3 | Search, products, reviews |
| eBay | 2 | Listing search and listing details |
| Wayfair | 1 | Product reviews |

### Travel and property

| Platform | Endpoints | What your agent can get |
|---|---:|---|
| Tripadvisor | 17 | Hotels, restaurants, attractions and cruises: search, details and traveller reviews, place lookup |
| Booking.com | 12 | Hotel search, details, rooms, availability, review scores and reviews, attractions, flight search |
| Airbnb | 7 | Stay search, stay details, availability, prices, ratings, reviews, place lookup |
| Zoopla | 12 | Sale and rental search, property details and history, valuations and estimates, sold prices, area and street data, estate agents |
| Rightmove | 9 | Sale and rental search, property details, similar homes, estate agents, sold prices |
| Zillow | 5 | For-sale and sold search, property and building details, location lookup |

### Reviews, apps and local

| Platform | Endpoints | What your agent can get |
|---|---:|---|
| Trustpilot | 8 | Company search, profiles and reviews, reviewer profiles and their reviews, categories |
| Google Places | 8 | Place search and details, reviews, questions and answers, business updates, hotel search |
| Yelp | 7 | Business search and suggestions, business details, reviews, photos, menus, related businesses |
| G2 | 7 | Software products, reviews, categories, vendors and their products |
| App Store | 8 | App search and suggestions, app details, reviews, charts, categories |
| Google Play | 8 | App search and suggestions, app details, reviews, charts, categories |

### Search, news and markets

| Platform | Endpoints | What your agent can get |
|---|---:|---|
| Google Search | 4 | Web, news, image and Maps results |
| Google Quick Search | 1 | Fast web results |
| Google News | 1 | News search |
| Google Trends | 3 | Interest over time, related queries, what is trending now |
| Content Analysis | 9 | Cross-web brand mentions, sentiment, phrase trends, rating distributions, summaries |
| Mosaic | 3 | One query across many platforms, creator discovery, forum search |
| Google Finance | 4 | Quotes, ticker search, market overviews |
| Markets | 4 | Price history, company news, options chains, financial statements |
| Polymarket | 1 | Prediction-market research |

### Ad libraries

| Platform | Endpoints | What your agent can get |
|---|---:|---|
| Meta Ad Library | 5 | Ad and advertiser search, an advertiser's ads, ad details, video-ad transcripts |
| Google Ads Transparency | 3 | Advertiser search, an advertiser's ads, ad details |
| TikTok Ad Library | 2 | Ad search, ad details |
| LinkedIn Ad Library | 2 | Ad search, ad details |

### Jobs, companies and developers

| Platform | Endpoints | What your agent can get |
|---|---:|---|
| Job boards | 11 | Job search and listings from LinkedIn, Indeed, Bing and Xing, company lookup, salary ranges by title |
| GitHub | 12 | Users and their repositories, READMEs, releases, issues and top issues, issue comments, search, repository dossiers, contributor activity |
| Hacker News | 4 | Stories, comment trees, profiles, search |
| Companies House | 3 | UK company search, company records, officers |

### Music

| Platform | Endpoints | What your agent can get |
|---|---:|---|
| Spotify | 7 | Artists, albums, tracks, playlists, podcasts and episodes, search |
| Apple Music | 4 | Artists, albums, tracks, search |
| SoundCloud | 3 | Artists, their tracks, track details |

### Web and link-in-bio

| Platform | Endpoints | What your agent can get |
|---|---:|---|
| Web | 16 | Scrape any page to Markdown, extract structured data, map a site's URLs, parse documents, find a brand's social profiles, crawl whole sites, batch-scrape many URLs, run autonomous web tasks, drive live browser sessions |
| On-Page SEO | 1 | SEO audit of a single page |
| Linktree | 1 | Every link on a creator's page |
| Linkbio | 1 | Every link on a creator's page |
| LinkMe | 1 | Every link on a creator's page |
| Komi | 1 | Every link on a creator's page |
| Pillar | 1 | Every link on a creator's page |

### Cross-platform research

| Platform | Endpoints | What your agent can get |
|---|---:|---|
| Panorama | 27 | Research across platforms in one call: brand mentions and mention surges, reputation, share of voice, earned media, demand signals, leads, creator vetting, audience overlap, handle audits, crisis post-mortems, employer brand, product reviews and review integrity, launch and developer-tool briefs, video intelligence, comment and URL lookup, batch profiles and post stats |

## Pricing

Every endpoint has a fixed credit price, shown by `list_endpoints` and `get_endpoint` before you spend anything. Most cost 1 to 5 credits.

| Plan | Credits each month | Price |
|---|---:|---:|
| Free | 1,000 | $0, no card needed |
| Starter | 10,000 | $29 a month |
| Pro | 40,000 | $99 a month |
| Growth | 135,000 | $299 a month |
| Business | 400,000 | $799 a month |

Annual billing and extra credit top-ups are available on paid plans. See [pricing](https://www.monocrawl.com/pricing).

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `MONOCRAWL_API_KEY` | Empty | Your key. Optional for free discovery; needed for data, account and monitor tools |
| `MONOCRAWL_TIMEOUT_MS` | `75000` | Time allowed for each request, from 100 to 120000 milliseconds |
| `MONOCRAWL_MCP_URL` | `https://www.monocrawl.com/mcp` | Service address. Only the official address and local `127.0.0.1` or `[::1]` addresses for development are accepted |

## How the bridge handles your key and your credits

- **Your key goes to Monocrawl and nowhere else.** Redirects and unofficial addresses are refused.
- **A paid request is sent once.** The bridge never retries on its own, even after a timeout, so a slow call is never charged twice. To retry on purpose, reuse the same `idempotency_key`.
- **The same rules as the hosted service.** Prices, account limits, key permissions and confirmation steps are all enforced by Monocrawl, so running locally costs exactly the same.
- **Clean output.** Standard output carries only MCP messages; diagnostics go to standard error.

## Troubleshooting

| What you see | What to do |
|---|---|
| Monocrawl tools don't appear | Restart the client or start a new session, then ask your agent to check your balance |
| `401` or `UNAUTHORIZED` | Check `MONOCRAWL_API_KEY`, or create a new key in [API keys](https://www.monocrawl.com/dashboard/api/keys) |
| `npx` fails to start the server | This package needs Node.js 22 or newer. Run `node --version` to check |
| A result stops partway | Large results come with a stored copy. Ask your agent to read it with `get_result`; it's free for 24 hours |

## Links

- [Create a free account](https://www.monocrawl.com/signup), with 1,000 credits every month
- [MCP guide](https://www.monocrawl.com/docs/mcp)
- [Setup for each client](https://www.monocrawl.com/docs/integrations)
- [All platforms](https://www.monocrawl.com/platforms)
- [API reference](https://www.monocrawl.com/docs/api-reference)
- [Service status](https://www.monocrawl.com/status)
- Support: support@monocrawl.com

## License

MIT © NTV LTD, trading as Monocrawl. Use of the Monocrawl service is governed by the [terms of service](https://www.monocrawl.com/legal/terms-and-conditions).
