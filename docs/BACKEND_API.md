# BACKEND_API — актуальные эндпоинты бэкенда

Краткий справочник по **действующим** API бэкенда (источник истины — `backend/main.go`
и `backend/internal/api/*`). Подробная история контракта и семантика — в `docs/API_CONTRACT.md`.

## Общие правила

- **Base URL**: корень сервера (порт `8080`), без префикса версии. Фронтенд берёт адрес из
  `REACT_APP_BACKEND_URL` (`frontend/src/ngrock.js`).
- **Формат ошибок** (все эндпоинты):
  ```json
  { "code": "string", "message": "string", "details": null }
  ```
  Типовые коды: `invalid_json`, `invalid_path_param`, `invalid_query_param`, `invalid_request`,
  `route_not_found`, `method_not_allowed`, `*_not_found`, `*_in_use` (409), `internal_error`.
- **Update/Delete несуществующего ресурса** → `404` (через `RowsAffected`).
- **Конфликты целостности** → `409` (`test_case_in_use`, `test_suite_in_use`).
- **List-эндпоинты** (`GET /testcases`, `GET /test-suites`, `GET /test-runs`):
  - Query: `limit` (default 50), `offset`, `sort_by` (whitelist), `order` (`asc`|`desc`, default `desc`).
  - Метаданные пагинации — в заголовках: `X-Total-Count`, `X-Limit`, `X-Offset`
    (включены в `Access-Control-Expose-Headers` для браузерных клиентов).
  - Тело — JSON-массив.
- **CORS**: разрешённые методы `GET, POST, PUT, PATCH, DELETE, OPTIONS`;
  origin'ы — из `CORS_ALLOWED_ORIGINS` (fallback `*`).
- **Batch-эндпоинты** (`*:batch`) — partial success, ответ `200 OK`:
  ```json
  {
    "results": [
      { "id": 1, "status": "ok" },
      { "id": 2, "status": "error", "error": { "code": "...", "message": "..." } }
    ],
    "summary": { "total": 2, "succeeded": 1, "failed": 1 }
  }
  ```

## Test Cases

| Method | Path | Назначение |
|---|---|---|
| POST | `/testcases` | Создать test case. Body: `{ "test": { ... } }` → `200`, созданный кейс с `id` |
| GET | `/testcases` | Список кейсов. Фильтр: `q` (поиск по содержимому `test`); `sort_by`: `id` |
| GET | `/testcases/{id}` | Один кейс (+ `suite_id`/`suite_name`, если привязан). `404` если нет |
| PUT | `/testcases/{id}` | Обновить поле `test`. Body: `{ "test": { ... } }`. `404` если нет |
| DELETE | `/testcases/{id}` | Удалить кейс. `404` если нет, `409 test_case_in_use` если используется в run |
| DELETE | `/testcases:batch` | Массовое удаление. Body: `{ "ids": [1, 2, 3] }`. Partial success |

## Test Suites

| Method | Path | Назначение |
|---|---|---|
| GET | `/test-suites` | Список suites. Фильтр: `name` (ILIKE); `sort_by`: `created_at`, `name`, `id` |
| POST | `/test-suites` | Создать suite. Body: `{ "name": "...", "description": "..." }` → `201` |
| GET | `/test-suites/{id}` | Suite + вложенный массив `test_cases`. `404` если нет |
| PUT | `/test-suites/{id}` | Обновить `name`/`description` → `200`, обновлённый suite. `404` если нет |
| DELETE | `/test-suites/{id}` | Удалить suite → `204`. Связи с кейсами удаляются по CASCADE |
| POST | `/test-suites/{id}/cases` | Привязать кейсы (**replace**-семантика: кейсы отвязываются от прежних suites). Body: `{ "case_ids": [1, 2] }` → `200` без тела |
| POST | `/test-suites/{id}/cases:batch` | Массовая привязка (идемпотентно, partial success). Body: `{ "case_ids": [...] }` |
| DELETE | `/test-suites/{id}/cases/{caseId}` | Удалить связь suite-case → `204`. `404` если связи нет |

## Test Runs

| Method | Path | Назначение |
|---|---|---|
| POST | `/test-runs` | Создать run из `suite_id`, `test_case_ids` или их комбинации → `201`, run details |
| GET | `/test-runs` | Список runs. Фильтры: `suite_id`, `date_from`, `date_to` (RFC3339); `sort_by`: `created_at`, `id` |
| GET | `/test-runs/{id}` | Детали run: `cases[]` + `summary`. `404` если нет |
| PATCH | `/test-runs/{runId}/cases/{caseId}` | Обновить статус/комментарий кейса в run → `200`, run details с пересчитанной `summary` |
| PATCH | `/test-runs/{runId}/cases:batch` | Массовая смена статусов (partial success) |

### POST `/test-runs` — body

```json
{
  "suite_id": 10,
  "test_case_ids": [1, 2, 3],
  "run_details": { "name": "Regression run" },
  "executed_by": "qa.user"
}
```
Хотя бы один источник (`suite_id` или `test_case_ids`) обязателен; несуществующий suite/case → `404`.

### GET `/test-runs/{id}` — ответ

```json
{
  "id": 5,
  "suite_id": 10,
  "created_at": "2026-06-13T10:00:00Z",
  "cases": [
    { "case_id": 1, "status": "passed", "comment": "", "executed_at": "...", "executed_by": "qa.user" }
  ],
  "summary": { "passed": 1, "failed": 0, "blocked": 0, "skipped": 0, "not_run": 2 }
}
```

### PATCH `/test-runs/{runId}/cases/{caseId}` — body

```json
{ "status": "passed", "comment": "Executed successfully", "executed_by": "qa.user" }
```
Допустимые статусы: `passed`, `failed`, `blocked`, `skipped`, `not_run`.

### PATCH `/test-runs/{runId}/cases:batch` — body

```json
{
  "executed_by": "qa.user",
  "items": [
    { "case_id": 1, "status": "passed", "comment": "ok" },
    { "case_id": 2, "status": "failed", "comment": "broken" }
  ]
}
```

## Удалённые (legacy) маршруты — на бэке их больше НЕТ

| Legacy (старый фронт) | Актуальная замена |
|---|---|
| `GET /testcase?id={id}` | `GET /testcases/{id}` |
| `PUT /test-case/update?id={id}` | `PUT /testcases/{id}` |
| `DELETE /test-case/delete?id={id}` | `DELETE /testcases/{id}` |
| `GET /test-suite?id={id}` | `GET /test-suites/{id}` |
| `POST /add-test-suite` | `POST /test-suites` |
| `DELETE /test-suite/delete?id={id}` | `DELETE /test-suites/{id}` |
| `POST /test-suites/add-cases` (suite_id в body) | `POST /test-suites/{id}/cases` |
| `DELETE /test-suite/remove-case?suite_id=&case_id=` | `DELETE /test-suites/{id}/cases/{caseId}` |
| `GET /test-runs/cases?run_id={id}` | `GET /test-runs/{id}` |
| `PUT /test-runs/case/status?run_id=&case_id=` | `PATCH /test-runs/{runId}/cases/{caseId}` |
