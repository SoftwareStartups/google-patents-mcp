# Google Patents MCP Server (`google-patents-mcp`)

[![smithery badge](https://smithery.ai/badge/@SoftwareStartups/google-patents-mcp)](https://smithery.ai/server/@SoftwareStartups/google-patents-mcp)
[![npm version](https://badge.fury.io/js/%40softwarestartups%2Fgoogle-patents-mcp.svg)](https://badge.fury.io/js/%40softwarestartups%2Fgoogle-patents-mcp)

This project provides a Model Context Protocol (MCP) server that allows
searching Google Patents information via the
[SerpApi Google Patents API](https://serpapi.com/google-patents-api).

## Credits

This project is a fork of the original [google-patents-mcp](https://github.com/KunihiroS/google-patents-mcp) by [Kunihiro Sasayama](https://github.com/KunihiroS). We extend our gratitude for the foundational work and inspiration.

## Installing via Smithery

To install Google Patents MCP Server for Claude Desktop automatically via
[Smithery](https://smithery.ai/server/@SoftwareStartups/google-patents-mcp):

```bash
npx -y @smithery/cli install @SoftwareStartups/google-patents-mcp --client claude
```

## Features

* Provides two focused MCP tools for patent research:
  * `search_patents` - Fast metadata search via SerpApi
  * `get_patent_content` - Fetch full patent text (claims, description)
* Uses SerpApi for search and direct Google Patents scraping for full content.
* Can be run directly using `npx` without local installation.

## Prerequisites

* **Node.js:** Version 18 or higher is recommended.
* **npm:** Required to run the `npx` command.
* **SerpApi API Key:** You need a valid API key from
  [SerpApi](https://serpapi.com/) to use the Google Patents API.

## Quick Start (Using npx)

The easiest way to run this server is using `npx`. This command downloads
(if necessary) and runs the server directly.

```bash
npx @softwarestartups/google-patents-mcp
```

The server will start and listen for MCP requests on standard input/output.

## Configuration

The server requires your SerpApi API key. You can provide it in one of the
following ways:

1. **Environment Variable (Recommended for MCP Hosts):**
   Set the `SERPAPI_API_KEY` environment variable when running the server.
   MCP Host configurations often allow setting environment variables for
   servers.

   Example MCP Host configuration snippet (`config.json` or similar):

   ```json
   {
     "mcpServers": {
       "google-patents-mcp": {
         "command": "npx",
         "args": [
           "-y",
           "@softwarestartups/google-patents-mcp"
         ],
         "env": {
           "SERPAPI_API_KEY": "YOUR_ACTUAL_SERPAPI_KEY"
         }
       }
     }
   }
   ```

2. **.env File:**
   Create a `.env` file in the directory where you run the `npx` command
   (for local testing or if not using an MCP Host), or in your home directory
   (`~/.google-patents-mcp.env`), with the following content:

   ```dotenv
   SERPAPI_API_KEY=YOUR_ACTUAL_SERPAPI_KEY
   # Optional: Set log level (e.g., debug, info, warn, error)
   # LOG_LEVEL=debug
   ```

   **Note:** While using a `.env` file is convenient for local testing, for
   production or integration with MCP Hosts, setting the environment variable
   directly via the host configuration is the recommended and more secure
   approach. The primary intended use case is execution via `npx`, where
   environment variables are typically managed by the calling process or
   MCP Host.

   The server searches for `.env` files in the following order:

   * `./.env` (relative to where `npx` is run)
   * `~/.google-patents-mcp.env` (in your home directory)

## Provided MCP Tools

### `search_patents`

Searches Google Patents via SerpApi. Returns patent metadata only (no full text).

**Parameters:**

| Parameter  | Type    | Required | Description                                           |
|------------|---------|----------|-------------------------------------------------------|
| `q`        | string  | No       | Search query. Use semicolon to separate terms        |
| `page`     | integer | No       | Page number for pagination (default: 1)              |
| `num`      | integer | No       | Results per page (10-100, default: 10)               |
| `sort`     | string  | No       | Sort by: 'relevance', 'new', 'old' (default: 'relevance') |
| `before`   | string  | No       | Max date filter (e.g., 'publication:20231231')       |
| `after`    | string  | No       | Min date filter (e.g., 'publication:20230101')       |
| `inventor` | string  | No       | Filter by inventor names (comma-separated)           |
| `assignee` | string  | No       | Filter by assignee names (comma-separated)           |
| `country`  | string  | No       | Filter by country codes (e.g., 'US', 'WO,JP')        |
| `language` | string  | No       | Filter by language (e.g., 'ENGLISH', 'JAPANESE')     |
| `status`   | string  | No       | Filter by status: 'GRANT' or 'APPLICATION'           |
| `type`     | string  | No       | Filter by type: 'PATENT' or 'DESIGN'                 |
| `scholar`  | boolean | No       | Include Google Scholar results (default: false)      |

**Returns:** Patent metadata including title, publication number, assignee, inventor, dates, and `patent_link` (used for `get_patent_content`).

**Example:**

```json
{
  "name": "search_patents",
  "arguments": {
    "q": "quantum computing",
    "num": 10,
    "status": "GRANT",
    "country": "US",
    "after": "publication:20230101"
  }
}
```

### `get_patent_content`

Fetches full patent content (claims, description) from Google Patents by URL or ID. Supports selective content retrieval through optional flags.

**Parameters:**

| Parameter             | Type    | Required | Description                                           |
|-----------------------|---------|----------|-------------------------------------------------------|
| `patent_url`          | string  | No*      | Full Google Patents URL (from search results)         |
| `patent_id`           | string  | No*      | Patent ID (e.g., 'US1234567A')                        |
| `include_claims`      | boolean | No       | Include patent claims in response (default: true)     |
| `include_description` | boolean | No       | Include patent description in response (default: true)|
| `include_full_text`   | boolean | No       | Include combined full text in response (default: true)|

*At least one parameter (`patent_url` or `patent_id`) must be provided. If both are provided, `patent_url` takes precedence.

**Returns:** JSON object with requested fields:

* `claims` (string[]): Array of patent claims (if `include_claims` is true)
* `description` (string): Patent description text (if `include_description` is true)
* `full_text` (string): Combined claims and description (if `include_full_text` is true)

Fields are omitted from the response if their corresponding flag is set to false or if the content could not be retrieved.

**Examples:**

Fetch all content (default):

```json
{
  "name": "get_patent_content",
  "arguments": {
    "patent_url": "https://patents.google.com/patent/US7654321B2"
  }
}
```

Using patent ID:

```json
{
  "name": "get_patent_content",
  "arguments": {
    "patent_id": "US7654321B2"
  }
}
```

Fetch only claims:

```json
{
  "name": "get_patent_content",
  "arguments": {
    "patent_id": "US7654321B2",
    "include_claims": true,
    "include_description": false,
    "include_full_text": false
  }
}
```

Fetch description and full text without separate claims:

```json
{
  "name": "get_patent_content",
  "arguments": {
    "patent_url": "https://patents.google.com/patent/US7654321B2",
    "include_claims": false,
    "include_description": true,
    "include_full_text": true
  }
}
```

## Typical Workflow

The two tools are designed to work together:

1. **Search for patents** using `search_patents` to find relevant patents
2. **Get full content** using `get_patent_content` for patents of interest

Example workflow:

```typescript
// Step 1: Search for patents
const searchResult = await callTool({
  name: "search_patents",
  arguments: {
    q: "neural network chip",
    num: 10,
    status: "GRANT"
  }
});

// Step 2: Get full content for first result
const firstPatent = searchResult.organic_results[0];
const contentResult = await callTool({
  name: "get_patent_content",
  arguments: {
    patent_url: firstPatent.patent_link
  }
});

// Now you have full patent text including claims
console.log(contentResult.claims);
```

## Development

### Setup

1. **Clone the repository:**

   ```bash
   git clone https://github.com/SoftwareStartups/google-patents-mcp.git
   cd google-patents-mcp
   ```

2. **Install dependencies:**

   ```bash
   make install
   # or: npm install
   ```

3. **Set up environment variables:**

   ```bash
   export SERPAPI_API_KEY="your_api_key_here"
   ```

### Development Workflow

**Build the project:**

```bash
make build
# or: npm run build
```

**Format code:**

```bash
make format
# or: npm run format
```

**Check code quality (lint + typecheck):**

```bash
make check
# or: npm run lint && npm run typecheck
```

**Run tests:**

```bash
make test
# or: npm test
```

**Clean build artifacts:**

```bash
make clean
```

**Full build pipeline:**

```bash
make all
# Runs: clean → install → build → check → test
```

### Run Locally

**Production mode:**

```bash
npm start
```

**Development mode (with auto-rebuild):**

```bash
npm run dev
```

### Code Quality Standards

This project uses:

* **ESLint** for code linting with TypeScript-aware rules
* **Prettier** for code formatting
* **TypeScript** strict mode for type safety
* No `any` types allowed (enforced by ESLint)

Run `make check` before committing to ensure code quality.

## Testing

The project includes unit tests and integration tests:

```bash
# Install dependencies and build
npm install
npm run build

# Set your SerpApi API key
export SERPAPI_API_KEY="your_api_key_here"

# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration
```

## Logging

* Logs are output to standard error.
* Log level can be controlled via the `LOG_LEVEL` environment variable
  (`error`, `warn`, `info`, `http`, `verbose`, `debug`, `silly`).
  Defaults to `info`.
* A log file is attempted to be created in the project root
  (`google-patents-server.log`), user's home directory
  (`~/.google-patents-server.log`), or `/tmp/google-patents-server.log`.
