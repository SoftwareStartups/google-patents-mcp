# Tests

## Structure

```text
tests/
├── unit/                            # No external dependencies, fast
│   ├── tools/                       # MCP tool unit tests
│   ├── cli/commands/                # CLI command tests
│   ├── cli/format.test.ts           # Output formatting
│   ├── auth/keychain.test.ts        # Credential storage
│   ├── services/                    # serpapi, patent service
│   └── utils/                       # truncator, ID resolver, extractor
├── integration-mocked-api.test.ts   # Full MCP flow with mock SerpApi server
├── e2e-real-api.test.ts             # Real SerpApi (requires SERPAPI_API_KEY)
└── helpers/
    ├── test-data.ts          # Mock fixtures: mockPatentResult, mockSearchResponse, etc.
    ├── test-utils.ts         # createMockLogger(), createMockSerpApiClient(), createMockPatentService(), parseToolResponse()
    ├── mcp-client.ts         # createMcpTestClient() / closeMcpTestClient()
    ├── assertions.ts         # assertValidSearchResponse(), assertValidPatentData(), assertHasMetadata()
    └── mock-serpapi-server.ts # Full mock HTTP server for SerpApi endpoints
```

## Running Tests

```bash
task test              # Unit tests
task test:integration  # Full MCP flow with mock SerpApi server
task test:e2e          # Real API (requires SERPAPI_API_KEY env var)
```

## Helpers

- **test-data.ts** — Mock data fixtures for patent results, search responses, and patent details. Pre-built objects with realistic data.
- **test-utils.ts** — Mock factories: `createMockLogger()`, `createMockSerpApiClient()`, `createMockPatentService()`. `parseToolResponse()` extracts and validates content from MCP `CallToolResult` responses.
- **mcp-client.ts** — `createMcpTestClient()` spins up a real MCP server/client pair for integration tests. Always call `closeMcpTestClient()` in cleanup.
- **assertions.ts** — Domain-specific custom assertions: `assertValidSearchResponse()`, `assertValidPatentData()`, `assertHasMetadata()`, `assertHasAbstract()`.
- **mock-serpapi-server.ts** — Mock HTTP server that mimics SerpApi endpoints. Returns canned responses for search and patent detail requests.

## Conventions

- Framework: `bun:test` (Jest-compatible `describe`/`it`/`expect`)
- Test files: `*.test.ts` mirroring `src/` structure
- Test behavior and outcomes, not implementation details
- Add a unit test for every bug fix
- Tests are production code: strict types, no `any`, no shortcuts
- Unit tests must not make network calls
- Integration tests use `mock-serpapi-server.ts` for deterministic results
- E2E tests are gated by credential availability
- Use custom assertions from `helpers/assertions.ts` for patent validation
