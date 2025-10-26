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
  * `get_patent` - Comprehensive patent data retrieval (claims, description, family members, citations, metadata)
* Uses SerpApi for both search and detailed patent information, eliminating fragile HTML parsing.
* Can be run directly using `npx` without local installation.

## Breaking Changes in v1.0.0

**⚠️ This is a major version update with breaking changes:**

* **Replaced `get_patent_content` with `get_patent`**: The new tool provides comprehensive patent data including family members and citations
* **Enhanced `include` parameter**: Now supports `["claims", "description", "family_members", "citations", "metadata"]`
* **New default behavior**: Default `include` is `["metadata", "description"]` instead of just `["description"]`
* **Eliminated HTML parsing**: All data now comes from SerpAPI's structured endpoints for better reliability

If you're upgrading from v0.x, update your tool calls from `get_patent_content` to `get_patent` and review the new `include` parameter options.

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

### `get_patent`

Fetches comprehensive patent data from SerpAPI including claims, description, family members, citations, and metadata. Supports selective content retrieval through the include parameter.

**Parameters:**

| Parameter    | Type    | Required | Description                                           |
|--------------|---------|----------|-------------------------------------------------------|
| `patent_url` | string  | No*      | Full Google Patents URL (from search results)         |
| `patent_id`  | string  | No*      | Patent ID (e.g., 'US1234567A')                        |
| `include`    | array   | No       | Array of content sections to include. Valid values (case-insensitive): "claims", "description", "family_members", "citations", "metadata". Defaults to ["metadata", "description"]. |
| `max_length` | integer | No       | Maximum character length for returned content. Content will be truncated at natural boundaries (paragraph ends, complete claims). If omitted, no limit is applied. |

*At least one parameter (`patent_url` or `patent_id`) must be provided. If both are provided, `patent_url` takes precedence.

**Returns:** JSON object with requested fields:

* `patent_id` (string): Patent identifier
* `title` (string): Patent title
* `description` (string): Patent description text (if "description" is in include array)
* `claims` (string[]): Array of patent claims (if "claims" is in include array)
* `family_members` (array): Patent family members with region and status (if "family_members" is in include array)
* `citations` (object): Citation counts including forward_citations, backward_citations, family_to_family_citations (if "citations" is in include array)
* `metadata` (object): Patent metadata including publication_number, assignee, inventor, dates (if "metadata" is in include array)

Fields are omitted from the response if they are not requested in the include array or if the content could not be retrieved.

**Examples:**

Fetch metadata and description (default):

```json
{
  "name": "get_patent",
  "arguments": {
    "patent_url": "https://patents.google.com/patent/US7654321B2"
  }
}
```

Using patent ID:

```json
{
  "name": "get_patent",
  "arguments": {
    "patent_id": "US7654321B2"
  }
}
```

Fetch only claims:

```json
{
  "name": "get_patent",
  "arguments": {
    "patent_id": "US7654321B2",
    "include": ["claims"]
  }
}
```

Fetch comprehensive patent analysis with family and citations:

```json
{
  "name": "get_patent",
  "arguments": {
    "patent_url": "https://patents.google.com/patent/US7654321B2",
    "include": ["metadata", "description", "claims", "family_members", "citations"]
  }
}
```

Fetch content with length limit to minimize token usage:

```json
{
  "name": "get_patent",
  "arguments": {
    "patent_id": "US7654321B2",
    "include": ["description", "claims"],
    "max_length": 5000
  }
}
```

## Typical Workflow

The two tools are designed to work together:

1. **Search for patents** using `search_patents` to find relevant patents
2. **Get comprehensive data** using `get_patent` for patents of interest

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

// Step 2: Get comprehensive data for first result
const firstPatent = searchResult.organic_results[0];
const patentData = await callTool({
  name: "get_patent",
  arguments: {
    patent_url: firstPatent.patent_link,
    include: ["metadata", "description", "claims", "family_members", "citations"]
  }
});

// Now you have comprehensive patent data including:
// - Basic metadata (title, assignee, dates)
// - Full description and claims
// - Patent family members across different countries
// - Citation counts for patent strength assessment
console.log(patentData.family_members);
console.log(patentData.citations);
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

   Create a `.env` file in the project root. First, create a `.env.example` file with the following content:

   ```dotenv
   # SerpApi Configuration
   # Get your API key from https://serpapi.com/
   SERPAPI_API_KEY=your_serpapi_key_here

   # Optional: Set log level (error, warn, info, http, verbose, debug, silly)
   # LOG_LEVEL=info
   ```

   Then copy it to `.env` and edit with your actual API key:

   ```bash
   cp .env.example .env
   # Edit .env and replace 'your_serpapi_key_here' with your actual SerpApi key
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

## Testing

The project includes unit tests, integration tests, and end-to-end tests with real API calls:

```bash
# Install dependencies and build
make install
make build

# Set up environment variables (see Development Setup section above)
# The e2e tests will automatically load SERPAPI_API_KEY from .env file

# Run all tests (unit + integration)
make test

# Run unit tests only
make test-unit

# Run integration tests only
make test-integration

# Run end-to-end tests with real SerpAPI calls
make test-e2e

# Run all tests including e2e
make test-all
```

### Test Types

- **Unit Tests**: Test individual functions and classes in isolation
- **Integration Tests**: Test the MCP server functionality with mocked API responses
- **End-to-End Tests**: Test complete workflows with real SerpAPI calls

The end-to-end tests validate that the server can successfully:
- Search for patents using real SerpAPI queries
- Fetch patent content with claims, descriptions, and metadata
- Handle various search filters and parameters
- Process patent family members and citations
- Complete full workflows from search to content retrieval

**Note**: End-to-end tests automatically load `SERPAPI_API_KEY` from the `.env` file and will make actual API calls, which may consume your SerpAPI quota.

## Logging

* Logs are output to standard error.
* Log level can be controlled via the `LOG_LEVEL` environment variable
  (`error`, `warn`, `info`, `http`, `verbose`, `debug`, `silly`).
  Defaults to `info`.
* A log file is attempted to be created in the project root
  (`google-patents-server.log`), user's home directory
  (`~/.google-patents-server.log`), or `/tmp/google-patents-server.log`.
