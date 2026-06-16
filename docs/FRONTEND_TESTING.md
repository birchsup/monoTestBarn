# Frontend Testing (Vitest + Testing Library)

Unit / component tests for the React frontend run on **Vitest** with
**@testing-library/react**. This is separate from CRA's built-in
`react-scripts test` (Jest), which is left untouched.

## Commands

Run from `frontend/`:

| Command                  | What it does                                   |
| ------------------------ | ---------------------------------------------- |
| `npm run test:unit`      | Vitest in watch mode (local development).      |
| `npm run test:unit:run`  | Vitest once, non-interactive (CI / pre-push).  |
| `npm test`               | Unchanged — CRA's Jest runner.                 |

## Toolchain

Dev dependencies (`package.json`):

- `vitest` — test runner.
- `jsdom` — DOM environment for component tests.
- `@testing-library/react`, `@testing-library/user-event` — render & interact.
- `@testing-library/jest-dom` — DOM matchers (`toBeInTheDocument`, …).
- `esbuild` — used directly by the config (see below).

### Config — `vitest.config.js`

Two project-specific quirks are handled here:

1. **JSX inside `.js` files.** This codebase (CRA-style) puts JSX in plain `.js`
   files. Vitest's bundled Vite picks the esbuild loader from the file
   extension, so `.js` is parsed as plain JS and fails on JSX. A small `pre`
   plugin (`jsx-in-js`) compiles JSX in `src/**/*.{js,jsx}` with React's
   **automatic** runtime (no `import React` needed) before Vite's import
   analysis runs. We deliberately do **not** use `@vitejs/plugin-react`: its
   current version targets a newer Vite plugin-filter API than Vitest 1.x
   bundles, so its transform silently never runs.

2. **`data-test-id` attribute.** The app uses `data-test-id` (hyphenated), not
   Testing Library's default `data-testid`. `src/test/setup.js` calls
   `configure({ testIdAttribute: 'data-test-id' })` so `*ByTestId` queries work
   against the existing markup.

`src/test/setup.js` also registers the jest-dom matchers and runs `cleanup()`
after each test.

### Test file location & naming

- Tests live next to the code: `src/**/*.{test,spec}.{js,jsx}`.
- `.js` is preferred to match the rest of the codebase (the `jsx-in-js` plugin
  compiles JSX in either extension).

## What is currently covered

The first suite targets the **test case "Name" field**, which has two
validation rules.

### `src/createTestCase/validateName.js`

The validation logic was extracted from `CreateTestCase.js` into this pure,
side-effect-free module so it can be unit tested in isolation and reused:

- **Rule 1 — required:** non-empty after `trim()`, else `"Name is required"`.
- **Rule 2 — max length:** raw length ≤ `NAME_MAX_LENGTH` (200), else
  `"Name must be 200 characters or less"`.
- Required is checked **before** length.

### `src/createTestCase/validateName.test.js` (pure unit tests — 8)

- Empty and whitespace-only → required error.
- Non-blank (incl. surrounded by spaces) → passes.
- Boundary: exactly 200 chars passes; 201 fails.
- Length is measured on the **raw** value, not the trimmed one.
- Precedence: a long whitespace-only string reports "required" first.
- A typical valid name returns `''`.

### `src/createTestCase/CreateTestCase.test.js` (component tests — 5)

Renders the form inside `<MemoryRouter>` + `<ToastProvider>`. `useNavigate` and
the API client (`apiPost` / `errorMessage`) are mocked with `vi.mock`.

- Submitting an empty name shows the required error and **does not** call the
  API or navigate.
- Typing more than 200 chars shows the max-length error live.
- Fixing an invalid name clears the error.
- A valid submit `POST`s `/testcases` with `{ test: { name: … } }` and
  redirects to `/testcases`.
- An API failure shows an **error toast** and does not redirect.

## Adding more tests

1. Create `*.test.js` next to the code under test.
2. Use `data-test-id` selectors via `screen.getByTestId(...)`.
3. For components that use the router, toasts, or the API client, wrap with the
   needed providers and mock `../api/client` as shown in
   `CreateTestCase.test.js`.
