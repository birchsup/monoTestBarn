// Global test setup for Vitest.
// Adds jest-dom matchers (toBeInTheDocument, toHaveValue, ...) and clears the
// DOM between tests.
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup, configure } from '@testing-library/react';

// This codebase uses `data-test-id` (hyphenated), not Testing Library's
// default `data-testid`. Point *ByTestId queries at the right attribute.
configure({ testIdAttribute: 'data-test-id' });

afterEach(() => {
    cleanup();
});
