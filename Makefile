.PHONY: help install build clean format format-check lint check test test-unit test-e2e test-all all

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@grep -E '^[a-zA-Z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies
	npm install

build: ## Build TypeScript to JavaScript
	npm run build

clean: ## Remove build artifacts
	rm -rf build/
	rm -f *.tsbuildinfo

format: ## Format code with Prettier
	npm run format

format-check: ## Check code formatting
	npm run format:check

lint: check ## Alias for check (lint code)

check: ## Run ESLint and TypeScript type checking
	npm run lint
	npm run typecheck

test: build ## Run unit tests
	npm test

test-unit: build ## Run unit tests only (includes tool handlers)
	npm run test:unit

test-integration: build ## Run integration tests with mocked SerpAPI calls
	npm run test:integration

test-e2e: build ## Run end-to-end tests with real SerpAPI calls
	@echo "🚀 Running end-to-end tests with real SerpAPI calls..."
	@echo "⚠️  Note: This will make actual API calls and may consume your SerpAPI quota"
	@echo "📝 Loading SERPAPI_API_KEY from .env file if available"
	npm run test:e2e

test-all: build ## Run all tests including end-to-end tests with real API calls
	@echo "🧪 Running all tests (unit + integration + e2e)..."
	@echo "📝 Loading SERPAPI_API_KEY from .env file if available"
	npm run test:all

ci: clean install format-check check build test-unit ## Run full CI pipeline locally

all: clean install build check test ## Run full build pipeline

.DEFAULT_GOAL := help

