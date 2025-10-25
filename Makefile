.PHONY: help install build clean format format-check lint check typecheck test all

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

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

typecheck: ## Run TypeScript type checking only
	npm run typecheck

test: ## Run all tests (unit + integration)
	npm test

test-unit: ## Run unit tests only
	npm run test:unit

test-integration: ## Run integration tests only
	npm run test:integration

ci: clean install format-check check build test-unit ## Run full CI pipeline locally

all: clean install build check test ## Run full build pipeline

.DEFAULT_GOAL := help

