---
name: patentscope
description: Google Patents search and retrieval via CLI. Activate when user mentions "patent", "prior art", "IP", "intellectual property", "patent search", "claims", or "patent family". Examples: "Search patents for machine learning", "Get patent claims", "Find patents by inventor".
---

# Patentscope

## Rules

1. Only activate when patents or intellectual property are mentioned
2. Always use `--json` and pipe through `jq` to keep context small
3. Set `SERPAPI_API_KEY` env var or run `patentscope login` before use
4. Use `--include` with `get` to control response size — default is `metadata,abstract`
5. Use `--max-length` on `get` to truncate long patent sections

## Output

Default: human-readable text. With `--json`: raw JSON (no envelope).

```bash
patentscope search "query" --json | jq '.[0] | {patent_id, title}'
patentscope get US7654321B2 --json | jq '{title, abstract}'
```

## Primary Workflow: Search and Retrieve

```bash
# 1. Search patents
patentscope search "machine learning classification" --json | jq '.[] | {patent_id, title, assignee}'

# 2. Get patent details (metadata + abstract by default)
patentscope get US7654321B2 --json | jq '{title, abstract}'

# 3. Get full patent with claims
patentscope get US7654321B2 --include metadata,abstract,claims --json
```

## Common Patterns

```bash
# Filter by inventor and date range
patentscope search "neural network" --inventor "Hinton" --after "filing:20200101" --json | jq '.[] | {patent_id, title}'

# Filter by assignee and country
patentscope search "battery" --assignee "Tesla" --country US --json | jq '.[] | {patent_id, title}'

# Granted patents only, sorted newest first
patentscope search "CRISPR" --status GRANT --sort new --json | jq '.[] | {patent_id, title, date}'

# Get claims and description with length limit
patentscope get EP3456789A1 --include claims,description --max-length 5000 --json

# Get patent family members
patentscope get US7654321B2 --include metadata,family_members --json | jq '.family_members'

# Get citations
patentscope get US7654321B2 --include citations --json | jq '.citations'

# Paginate search results
patentscope search "autonomous driving" --num 20 --page 2 --json | jq '.[] | {patent_id, title}'
```

## References

- **All commands:** [ref-commands.md](ref-commands.md)
- **Full help:** `patentscope --help`
