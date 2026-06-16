# Test Creation Flow

Full description of how a test case is created in TestBarn, end to end — from the
form a user fills in, through the shared API client, to the backend endpoint and
the database, and back to the UI feedback.

> Scope: the **New Test Case** page only (`/create`). Creating *test suites*
> (`/add-test-suite`) and *test runs* are separate flows.

---

## 1. Entry points

The page lives at route `/create` (`frontend/src/App.js`) and renders
`CreateTestCase` (`frontend/src/createTestCase/CreateTestCase.js`).

Users reach it from:

- **Header** — the "+" / create button (`components/Header.js` → `navigate('/create')`).
- **Home** — primary call-to-action (`home/Home.js`).
- **Test cases list** — the "New" / empty-state buttons (`listOfCases/TestCasesList.js`).

---

## 2. The form (component state)

The whole form is a single `testCase` object held in `useState`:

| Field          | Type     | Default              | Notes                                             |
| -------------- | -------- | -------------------- | ------------------------------------------------- |
| `name`         | string   | `''`                 | **Required.** Validated (see §3).                 |
| `preconditions`| string   | `''`                 | Free text.                                        |
| `priority`     | string   | `''`                 | Free text (sidebar).                              |
| `isAutomated`  | string   | `'want to automate'` | Custom `Select`: `want to automate` / `can't be automated` / `automated`. |
| `created_by`   | string   | `''`                 | Free text (sidebar). Not validated.               |
| `steps`        | array    | `[{ step: 1, action: '', expected_result: '' }]` | One empty step to start. |

Layout: a two-column form (`create-layout`) — the main card holds name,
preconditions and the steps; the sidebar (`aside`) holds priority, automation
status and author.

### Editing handlers

- `handleChange(e)` — generic handler for the top-level fields. For `name` it also
  re-runs validation on every keystroke and updates `nameError`.
- `handleStepChange(index, e)` — immutably updates `action` / `expected_result`
  of a single step.
- `addStep()` — appends a fresh empty step, numbered `steps.length + 1`.
- `isAutomated` — updated directly via the custom `Select`'s `onChange`.

> **Steps are not required.** The step textareas carry an `required` HTML
> attribute, but the `<form>` is rendered with `noValidate`, so native HTML
> constraint validation is disabled. A test case can be created with empty steps.
> Only the **name** is enforced (in JS).

---

## 3. Validation

`validateName(value)`:

- Trims the value; empty → `"Name is required"`.
- Length > `NAME_MAX_LENGTH` (200) → `"Name must be 200 characters or less"`.
- Otherwise → `''` (valid).

The error is shown inline under the name input (`.field-error`) and the input
gets the `input-invalid` class + `aria-invalid="true"`.

Validation runs in two places:
1. Live, on each `name` keystroke (`handleChange`).
2. On submit (`handleSubmit`) — if invalid, submission is aborted early.

---

## 4. Submit → API

`handleSubmit(e)`:

```
e.preventDefault()
const error = validateName(testCase.name)
if (error) { setNameError(error); return }      // hard stop on invalid name

try {
    await apiPost('/testcases', { test: testCase })
    toast.success('Test case created successfully!')
    navigate('/testcases')                        // back to the list
} catch (err) {
    toast.error(`Failed to create test case: ${errorMessage(err)}`)
}
```

The whole `testCase` object is wrapped under a `test` key — the backend stores it
as the JSON `test` column (see §6).

### Shared API client

`apiPost` (`frontend/src/api/client.js`) `POST`s JSON to `${link}/testcases`.
On a non-2xx response it throws an `ApiError` carrying `status`, `code`,
`message`, `details`. `errorMessage(err)` extracts a human-readable message for
the toast.

---

## 5. User feedback — toasts (not `alert`)

Feedback uses app-wide **toast notifications**, not native `window.alert()`:

- `components/Toast.js` — `ToastProvider` + `useToast()` hook. The provider is
  mounted once in `App.js`, wrapping the whole app inside the router.
- `useToast()` returns `{ show, success, error, info, dismiss }`. Toasts
  auto-dismiss after ~4s and can be clicked / closed manually.
- `components/Toast.css` — styling built on the design tokens
  (`--color-success`, `--color-danger`, `--shadow-md`, …); pinned top-right.

On success the user sees a green toast **and is redirected to `/testcases`**, so
the freshly created case appears in the list. On failure they stay on the form
and see a red toast with the backend message — nothing is lost, they can retry.

> Historical note: this page previously used `alert('Test case created
> successfully!')` and stayed on the form (no redirect). Both issues are fixed —
> see §8.

---

## 6. Backend

| Method | Path         | Handler                                  |
| ------ | ------------ | ---------------------------------------- |
| POST   | `/testcases` | `api.CreateTestCase` (`backend/main.go:40`) |

- Request body: a `db.TestCase`; the `test` field (arbitrary valid JSON) is
  required by the DB. `suite_id` / `suite_name` are optional/nullable.
- DB: `INSERT INTO test_cases (test)`, table `test_cases`.
- Response: `200 OK` with the created `TestCase` (now carrying an `id`).
- Errors: `400` invalid JSON · `500` insert failure.

See `docs/API_CONTRACT.md` → "POST `/testcases`" for the authoritative contract.

---

## 7. End-to-end sequence

```
User → New Test Case form (/create)
     → fills name (required) + optional fields/steps
     → Create
        → validateName  ──(invalid)→ inline error, stop
        └─(valid)→ apiPost('/testcases', { test })
                     → POST /testcases  → INSERT INTO test_cases(test)
                        ├─(200)→ toast.success + navigate('/testcases')
                        └─(4xx/5xx)→ toast.error(message), stay on form
```

---

## 8. Recent fixes

1. **Redirect after save (bug fix).** After a successful create the page now
   `navigate('/testcases')`, matching the sibling *Add Test Suite* flow
   (`testSuites/newTestSuite/addTestSuite.js`, which navigates to `/test-suites`).
   Previously the user was left on the form with stale data — easy to submit a
   duplicate.
2. **Toasts replace `alert()`.** Native blocking `alert()` calls were replaced
   with non-blocking toast notifications via the new `ToastProvider` / `useToast`.

### Files touched

- `frontend/src/createTestCase/CreateTestCase.js` — redirect + toasts.
- `frontend/src/components/Toast.js`, `Toast.css` — new toast system.
- `frontend/src/App.js` — mount `ToastProvider`.
