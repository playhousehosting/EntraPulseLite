# EntraPulseLite Testing Guidelines

## Testing Structure

The EntraPulseLite test suite is organized into multiple categories to ensure comprehensive coverage of all application features:

```
src/tests/
├── unit/                 # Unit tests for individual components
├── integration/          # Integration tests for system interactions
├── e2e/                  # End-to-end tests for user flows
├── mocks/                # Mock data and services
└── fixtures/             # Test fixtures and data
```

## Test Categories

### Unit Tests
Focus on individual component functionality in isolation, with dependencies mocked.

Key test files:
- `auth.test.ts` - Authentication service
- `components.test.tsx` - React components
- `error-handler.test.ts` - Error handling utilities
- `external-lokka-mcp.test.ts` - External Lokka MCP Server implementation
- `lokka-mcp-fallback.test.ts` - Fallback mechanisms for server startup

### Integration Tests
Focus on how components work together, testing real interactions between systems.

Key test files:
- `auth.test.ts` - Authentication flows
- `graph.test.ts` - Microsoft Graph API integration
- `mcp.test.ts` - MCP server integration
- `lokka-tenant-connection.test.ts` - Connection to Entra ID tenant with client credentials
- `lokka-mcp-errors.test.ts` - Error handling in the External Lokka MCP Server

### End-to-End Tests
Focus on complete user journeys and application flows.

Key test files:
- `app.test.ts` - Complete application startup and basic functionality
- `lokka-mcp-e2e.test.ts` - Full flow from LLM to External Lokka MCP to Graph API

## Running Tests

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run end-to-end tests
npm run test:e2e

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Testing Environmental Dependencies

Some tests require specific environmental setup:

### Local LLM Tests
- Requires Ollama or LM Studio running locally
- Configure LLM provider in `.env.local`

### Microsoft Graph API Tests
- Requires valid Microsoft credentials
- For client credentials tests, requires:
  - `LOKKA_TENANT_ID`
  - `LOKKA_CLIENT_ID`
  - `LOKKA_CLIENT_SECRET`

### External Lokka Tests
- Requires the `@merill/lokka` package (installed globally for some tests)
- Install using: `npm install -g @merill/lokka`

## Test Skipping

Tests that require specific environmental setup use conditional test execution:

```typescript
// Skip the test if tenant credentials are not configured
const shouldRunTests = 
  process.env.LOKKA_TENANT_ID &&
  process.env.LOKKA_CLIENT_ID &&
  process.env.LOKKA_CLIENT_SECRET;

// Skip the entire test suite if tenant credentials are not configured
(shouldRunTests ? describe : describe.skip)('with tenant credentials', () => {
  // Tests here
});
```

## Best Practices

1. **Mock external services** in unit tests
2. **Use real services** in integration tests
3. **Clean up resources** after tests, especially in integration tests
4. **Keep tests independent** - no test should depend on another test's state
5. **Use appropriate timeouts** for asynchronous operations
6. **Handle authentication explicitly** in each test that requires it
7. **Test error cases** as thoroughly as success cases
8. **Test fallback mechanisms** for resilience

## Coverage Goals

- Unit tests: 80%+ coverage
- Integration tests: Cover all critical paths
- E2E tests: Cover main user journeys

## Continuous Integration

Tests automatically run in CI for pull requests and main branch commits.

## Adding New Tests

When adding new features, ensure you add appropriate tests to maintain coverage:

1. Unit tests for new components or services
2. Integration tests for new system interactions
3. E2E tests for new user flows
4. Update mocks as needed for new dependencies
