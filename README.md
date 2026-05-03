# patentscope

CLI for searching and retrieving Google Patents data via the
[SerpApi Google Patents API](https://serpapi.com/google-patents-api).
Also works as an [MCP](https://modelcontextprotocol.io/) server for AI-assisted patent research.

## Credits

This project is a fork of the original [google-patents-mcp](https://github.com/KunihiroS/google-patents-mcp) by [Kunihiro Sasayama](https://github.com/KunihiroS). We extend our gratitude for the foundational work and inspiration.

## Quick Start

```bash
# Install
bun add -g @softwarestartups/patentscope

# Or run without installing
bunx @softwarestartups/patentscope search "quantum computing"
```

Pre-built binaries (no runtime required) are available on the
[GitHub Releases](https://github.com/SoftwareStartups/patentscope/releases) page.

## Use with Claude Code

This repo is a Claude Code plugin marketplace. Install the companion skill so Claude Code can drive `patentscope` for you:

```bash
/plugin marketplace add SoftwareStartups/patentscope
/plugin install patentscope@softwarestartups-patentscope
```

Once installed, just ask Claude in plain language (e.g., "Search patents for adaptive optics by Inventor X") and the skill will activate automatically. The plugin tracks this repo's releases — run `/plugin marketplace update softwarestartups-patentscope` to get the latest skill revisions.

## Prerequisites

* **Bun:** Version 1.0 or higher (not needed when using a pre-built binary).
* **SerpApi API Key:** A valid key from [SerpApi](https://serpapi.com/).

## Configuration

Save your API key once with the `login` command:

```bash
patentscope login
# Enter your SerpApi API key: ****

# Or non-interactively
patentscope login --api-key YOUR_KEY
```

The key is stored in `~/.config/patentscope/config.json` with strict file permissions.

To remove the stored key:

```bash
patentscope logout
```

The `SERPAPI_API_KEY` environment variable takes precedence over the stored config, useful for CI or temporary overrides.

## CLI Usage

```
Usage: patentscope <command> [flags]

Commands:
  login              Save your SerpApi API key
  logout             Remove saved API key
  search [query]     Search Google Patents
  get <patentId>     Get patent details
  serve              Start the MCP server on stdio

Flags:
  -h, --help      Show this help message
  -v, --version   Show version information
      --json      Output as JSON
```

All human-readable output goes to **stderr**. Stdout is reserved for `--json` structured output and the MCP JSON-RPC transport (in `serve` mode).

### Searching patents

```bash
# Basic search
patentscope search "neural network chip"

# With filters
patentscope search "battery" --status GRANT --country US --num 20

# Date range
patentscope search "CRISPR" --after publication:20230101 --before publication:20231231

# Filter by inventor or assignee
patentscope search --inventor "John Smith" --assignee "Google"

# JSON output
patentscope search "quantum computing" --json
```

**Search flags:**

| Flag           | Description                                |
|----------------|--------------------------------------------|
| `-p, --page`   | Page number (default: 1)                  |
| `-n, --num`    | Results per page (10-100, default: 10)    |
| `--sort`       | Sort by `new` or `old`                    |
| `--before`     | Max date (e.g. `publication:20231231`)    |
| `--after`      | Min date (e.g. `publication:20230101`)    |
| `--inventor`   | Filter by inventor                        |
| `--assignee`   | Filter by assignee                        |
| `--country`    | Country code (e.g. `US`, `WO,JP`)        |
| `--language`   | Language (e.g. `ENGLISH`, `JAPANESE`)     |
| `--status`     | `GRANT` or `APPLICATION`                  |
| `--type`       | `PATENT` or `DESIGN`                      |
| `--scholar`    | Include Google Scholar results            |

### Retrieving patent details

```bash
# Get metadata and abstract (default)
patentscope get US7654321B2

# Get specific sections
patentscope get US7654321B2 --include claims,description

# Get everything
patentscope get EP3456789A1 --include metadata,abstract,claims,description,family_members,citations

# Limit content length
patentscope get US7654321B2 --include description,claims --maxLength 5000

# JSON output
patentscope get US7654321B2 --json
```

**Get flags:**

| Flag              | Description                                                      |
|-------------------|------------------------------------------------------------------|
| `-i, --include`   | Comma-separated sections: `metadata`, `abstract`, `claims`, `description`, `family_members`, `citations` (default: `metadata,abstract`) |
| `--maxLength`     | Maximum character length for returned content                    |

### JSON output mode

Add `--json` to any command for structured output on stdout:

```bash
patentscope search "quantum computing" --json
patentscope get US7654321B2 --json
patentscope --version --json
patentscope --help --json
```

## MCP Server

The `serve` command starts an MCP server on stdio, exposing two tools:
`search_patents` and `get_patent`.

### MCP Host Configuration

Using a pre-built binary (download from [GitHub Releases](https://github.com/SoftwareStartups/patentscope/releases)):

```json
{
  "mcpServers": {
    "patentscope": {
      "command": "/path/to/patentscope-darwin-arm64",
      "args": ["serve"]
    }
  }
}
```

Using `bunx`:

```json
{
  "mcpServers": {
    "patentscope": {
      "command": "bunx",
      "args": ["@softwarestartups/patentscope", "serve"]
    }
  }
}
```

The MCP server uses the API key from `~/.config/patentscope/config.json` (set via `patentscope login`). Override with the `SERPAPI_API_KEY` environment variable if needed.

### MCP Tools

#### `search_patents`

Searches Google Patents via SerpApi. Returns patent metadata (title, publication number, assignee, inventor, dates, and `patent_link`).

| Parameter  | Type    | Required | Description                                           |
|------------|---------|----------|-------------------------------------------------------|
| `q`        | string  | No       | Search query (semicolon-separated terms)             |
| `page`     | integer | No       | Page number (default: 1)                             |
| `num`      | integer | No       | Results per page (10-100, default: 10)               |
| `sort`     | string  | No       | `new` or `old`                                       |
| `before`   | string  | No       | Max date (e.g. `publication:20231231`)               |
| `after`    | string  | No       | Min date (e.g. `publication:20230101`)               |
| `inventor` | string  | No       | Inventor name (comma-separated)                      |
| `assignee` | string  | No       | Assignee name (comma-separated)                      |
| `country`  | string  | No       | Country code (e.g. `US`, `WO,JP`)                    |
| `language` | string  | No       | Language (e.g. `ENGLISH`, `JAPANESE`)                |
| `status`   | string  | No       | `GRANT` or `APPLICATION`                             |
| `type`     | string  | No       | `PATENT` or `DESIGN`                                 |
| `scholar`  | boolean | No       | Include Google Scholar results (default: false)      |

#### `get_patent`

Fetches comprehensive patent data including claims, description, family members, citations, and metadata.

| Parameter    | Type    | Required | Description                                           |
|--------------|---------|----------|-------------------------------------------------------|
| `patent_url` | string  | No*      | Full Google Patents URL                               |
| `patent_id`  | string  | No*      | Patent ID (e.g. `US1234567A`)                         |
| `include`    | array   | No       | Sections to include (default: `["metadata", "abstract"]`) |
| `max_length` | integer | No       | Maximum character length for content                  |

*At least one of `patent_url` or `patent_id` must be provided. If both are given, `patent_url` takes precedence.

## Binary Releases

Pre-built binaries for all supported platforms are available on the
[GitHub Releases](https://github.com/SoftwareStartups/patentscope/releases) page.
No Bun or Node.js installation required.

| Platform | Architecture | Binary |
|----------|-------------|--------|
| Linux    | x64         | `patentscope-linux-x64` |
| Linux    | arm64       | `patentscope-linux-arm64` |
| macOS    | x64         | `patentscope-darwin-x64` |
| macOS    | arm64       | `patentscope-darwin-arm64` |

```bash
curl -L https://github.com/SoftwareStartups/patentscope/releases/latest/download/patentscope-darwin-arm64 -o patentscope
chmod +x patentscope
./patentscope login
./patentscope search "quantum computing"
```

### Releasing

Push a semver tag to trigger the release workflow:

```bash
git tag v1.2.3
git push origin v1.2.3
```

## Development

### Setup

```bash
git clone https://github.com/SoftwareStartups/patentscope.git
cd patentscope
bun install
patentscope login  # or: export SERPAPI_API_KEY=your_key
```

### Workflow

```bash
task build          # Build
task format         # Format code
task check          # Lint + typecheck
task test           # Unit + integration tests
task test:e2e       # End-to-end tests (real API calls)
task all            # clean -> install -> build -> check -> test
```

### Run locally

```bash
bun src/index.ts search "quantum computing"
bun src/index.ts get US7654321B2
bun src/index.ts serve
```

## Logging

Logs go to stderr. Control the level via `LOG_LEVEL` (error, warn, info, http, verbose, debug, silly). Defaults to `info`.
