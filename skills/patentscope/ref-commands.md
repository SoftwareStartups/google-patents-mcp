# Commands

All examples use `--json` for jq piping.

## Search

```
patentscope search [query] [flags]
```

| Flag | Args | Purpose |
|------|------|---------|
| `-p, --page` | `<number>` | Page number (default: 1) |
| `-n, --num` | `<number>` | Results per page (10-100, default: 10) |
| `--sort` | `new\|old` | Sort by date |
| `--before` | `<type:YYYYMMDD>` | Max date filter |
| `--after` | `<type:YYYYMMDD>` | Min date filter |
| `--inventor` | `<name>` | Filter by inventor (comma-separated) |
| `--assignee` | `<name>` | Filter by assignee (comma-separated) |
| `--country` | `<code>` | Country code (comma-separated, e.g. `US,WO,JP`) |
| `--language` | `<lang>` | Language filter (comma-separated) |
| `--status` | `GRANT\|APPLICATION` | Patent status |
| `--type` | `PATENT\|DESIGN` | Patent type |
| `--scholar` | | Include Google Scholar results |

Date filter types: `priority`, `filing`, `publication`. Example: `--after "filing:20220101"` `--before "publication:20231231"`

Languages: ENGLISH, GERMAN, CHINESE, FRENCH, SPANISH, ARABIC, JAPANESE, KOREAN, PORTUGUESE, RUSSIAN, ITALIAN, DUTCH, SWEDISH, FINNISH, NORWEGIAN, DANISH

```bash
# Basic search
patentscope search "machine learning" --json | jq '.[] | {patent_id, title, assignee}'

# Inventor search with date range
patentscope search --inventor "Smith,Jones" --after "filing:20200101" --json | jq '.[] | {patent_id, title}'

# Granted US patents, newest first
patentscope search "battery" --country US --status GRANT --sort new --json | jq '.[] | {patent_id, title, date}'

# Paginate
patentscope search "autonomous" --num 20 --page 3 --json | jq 'length'

# Design patents
patentscope search "phone case" --type DESIGN --json | jq '.[] | {patent_id, title}'
```

## Get

```
patentscope get <patentId> [flags]
```

| Flag | Args | Purpose |
|------|------|---------|
| `-i, --include` | `<sections>` | Comma-separated sections to include |
| `--max-length` | `<number>` | Max character length for content |

Patent ID formats: `US7654321B2`, `EP3456789A1`, `WO2023001234A1`, or full Google Patents URL.

Sections: `metadata`, `abstract`, `claims`, `description`, `family_members`, `citations`. Default: `metadata,abstract`.

```bash
# Default (metadata + abstract)
patentscope get US7654321B2 --json | jq '{title, abstract}'

# Full patent with all sections
patentscope get US7654321B2 --include metadata,abstract,claims,description,family_members,citations --json

# Claims only, truncated
patentscope get EP3456789A1 --include claims --max-length 5000 --json | jq '.claims'

# Family members
patentscope get US7654321B2 --include family_members --json | jq '.family_members[]'

# Citation analysis
patentscope get US7654321B2 --include citations --json | jq '.citations[]'

# Using a full URL
patentscope get "https://patents.google.com/patent/US7654321B2" --json
```

## Auth

```bash
patentscope login                          # Interactive prompt
patentscope login --api-key "YOUR_KEY"     # Non-interactive
patentscope login --skipValidation         # Skip API key validation
patentscope logout
```

Env var `SERPAPI_API_KEY` overrides stored credentials.
