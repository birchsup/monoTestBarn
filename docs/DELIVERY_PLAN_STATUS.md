# DELIVERY_PLAN_STATUS

Статус задач из `docs/DELIVERY_PLAN.md` по фактическому состоянию кода.

Легенда:
- `[done]` — выполнено полностью по требованиям документа.
- `[partial]` — реализовано частично, но DoD не закрыт.
- `[todo]` — не реализовано.

## Backend

### 1) Канонизация REST-маршрутов v1
- Статус: `[partial]`
- Почему:
  - CRUD для `testcases` и `test-suites` переведён на канонические path-based маршруты.
  - Операции связи suite-case тоже переведены на nested routes: `POST /test-suites/{id}/cases`, `DELETE /test-suites/{id}/cases/{caseId}`.
  - Интеграционные тесты обновлены под новый контракт и компилируются.
  - Полный статус оставлен `partial`, потому что integration suite целиком не удалось прогнать в текущем окружении без Docker.

### 2) API создания и чтения test runs
- Статус: `[done]`
- Почему:
  - Реализованы `POST /test-runs`, `GET /test-runs`, `GET /test-runs/{id}`.
  - Run создаётся из suite, из списка кейсов или из комбинации обоих источников.
  - Есть материализация `test_run_cases`, дедупликация `test_case_ids`, валидация и `404` для отсутствующих suite/case.
  - Run-list и run-details доступны, данные сохраняются в БД.

### 3) Статусы выполнения кейсов в run
- Статус: `[done]`
- Почему:
  - В `test_run_cases` есть `status`, `comment`, `executed_at`, `executed_by`.
  - Реализован `PATCH /test-runs/{runId}/cases/{caseId}`.
  - В `GET /test-runs/{id}` возвращается summary.
  - Статусы валидируются по разрешённому набору.

### 4) Единый формат ошибок и валидаций
- Статус: `[done]`
- Почему:
  - Введён единый JSON-формат `{ code, message, details }` (`internal/api/errors.go`).
  - Все публичные handlers отвечают JSON-ошибками через `writeError/writeJSON`; plain-text `http.Error` убран.
  - `NotFoundHandler`/`MethodNotAllowedHandler` тоже возвращают JSON.
  - `sql.ErrNoRows`/`pgx.ErrNoRows` мапятся на `404`; невалидный ввод — на `400`.
  - Негативные сценарии покрыты интеграционными тестами.

### 5) Семантика update/delete через RowsAffected
- Статус: `[done]`
- Почему:
  - `UpdateTestCaseInDB`, `DeleteTestCaseInDB`, `DeleteTestSuite`, `RemoveTestCaseFromSuite` проверяют `RowsAffected -> 404`.
  - `UpdateTestSuite` мапит `pgx.ErrNoRows` (через `RETURNING`) на `404`.
  - Handlers возвращают доменные коды `test_case_not_found` / `test_suite_not_found` / `suite_case_link_not_found`.
  - Покрыто тестом `TestRowsAffectedNotFound`.

### 6) FK-стратегия удаления
- Статус: `[done]`
- Почему:
  - Миграция `000004_fk_on_delete_policy` фиксирует политику:
    - `test_suite_cases.*` -> `CASCADE`;
    - `test_runs.suite_id` -> `SET NULL` (сохранение истории прогона);
    - `test_run_cases.run_id` -> `CASCADE`;
    - `test_run_cases.case_id` -> `RESTRICT`.
  - FK-нарушение (`23503`) маппится на доменный `409` (`test_case_in_use` / `test_suite_in_use`).
  - Покрыто `TestForeignKeyConflictOnDelete` и `TestDeleteSuiteCascadesLinks`.

### 7) Пагинация, фильтрация, сортировка API
- Статус: `[done]`
- Почему:
  - Для `GET /testcases`, `GET /test-suites`, `GET /test-runs` добавлены `limit/offset`, `sort_by`, `order`.
  - Метаданные пагинации отдаются заголовками `X-Total-Count`, `X-Limit`, `X-Offset` (тело остаётся JSON-массивом — backward compatible).
  - Фильтры: `q` (testcases), `name` (suites), `suite_id`/`date_from`/`date_to` (runs).
  - `sort_by`/`limit`/`offset` валидируются по whitelist; индексы добавлены миграцией `000005`.
  - Покрыто `TestListPaginationAndSort`.

### 8) Batch/bulk операции
- Статус: `[done]`
- Почему:
  - `DELETE /testcases:batch`, `POST /test-suites/{id}/cases:batch`, `PATCH /test-runs/{runId}/cases:batch`.
  - Каждый элемент обрабатывается независимо; успешные изменения сохраняются.
  - Ответ содержит per-item `results[]` и `summary` (partial success).
  - Покрыто `TestBatchDeleteTestCases`, `TestBatchAddCasesToSuite`, `TestBatchUpdateRunCaseStatus`.

## Frontend

### 1) Минимальный UI для MVP-потока
- Статус: `[todo]`
- Почему:
  - В репозитории нет frontend/UI.

### 2) Улучшения UX после MVP
- Статус: `[todo]`
- Почему:
  - Нет frontend-реализации и соответствующего API.

### 3) Функции зрелости
- Статус: `[todo]`
- Почему:
  - Нет версий кейсов, audit log, тегов, комментариев, экспорта и UI для них.

## QA

### 1) Unit-тесты
- Статус: `[todo]`
- Почему:
  - Выделенных unit-тестов на валидацию DTO, error mapping, summary и batch-логику нет.

### 2) Integration-тесты API
- Статус: `[done]`
- Почему:
  - Есть интеграционные тесты для `GET /testcases/{id}`, CRUD и для `test-runs`.
  - Добавлен файл `tests_test/integrations/mvp_extensions_test.go` с покрытием `RowsAffected -> 404`, FK-policy (`409`/cascade), пагинации/сортировки и batch-операций.
  - Примечание: прогон требует Docker (testcontainers); локально без Docker тесты только компилируются.

### 3) E2E-тесты (UI)
- Статус: `[todo]`
- Почему:
  - UI отсутствует, E2E-сценарии не реализованы.

### 4) Негативные сценарии
- Статус: `[partial]`
- Почему:
  - Есть негативные проверки `400/404` для `GET /testcases/{id}`, `test-runs`, update/delete и стандартизованный `409` (FK conflict).
  - Покрыты невалидные query-параметры (`limit`, `sort_by`) и partial-success batch.
  - Остаётся непокрытым: конкурентные обновления статусов в одном run и экспорт (функция не реализована).

### 5) Нефункциональные проверки
- Статус: `[partial]`
- Почему:
  - Путь к миграциям в интеграционных тестах сделан переносимым.
  - Но нет подтверждённого CI/smoke-потока и остальных нефункциональных проверок.

## DB / Infra

### 1) Миграции под run-case execution
- Статус: `[done]`
- Почему:
  - Добавлены поля `status`, `comment`, `executed_at`, `executed_by`.
  - Есть `CHECK` по статусам.
  - Добавлены индексы `test_run_cases(run_id)`, `test_run_cases(status)`, `test_runs(created_at)`.

### 2) FK-политика и referential integrity
- Статус: `[done]`
- Почему:
  - Миграция `000004_fk_on_delete_policy` пересоздаёт все FK с явным `ON DELETE` (`CASCADE`/`SET NULL`/`RESTRICT`).

### 3) Миграции под масштабирование списков
- Статус: `[done]`
- Почему:
  - Миграция `000005_list_scaling_indexes` добавляет индексы `test_suites(name)`, `test_suites(created_at)`, `test_runs(suite_id)` под фильтры/сортировки.

### 4) Миграции под недостающие функции
- Статус: `[todo]`
- Почему:
  - Таблицы для versioning/audit/tags/comments/export отсутствуют.

### 5) Infra и окружения
- Статус: `[partial]`
- Почему:
  - В `docker-compose` и README есть базовый локальный запуск.
  - Переносимость пути миграций улучшена.
  - Добавлен env-конфиг: `CORS_ALLOWED_ORIGINS` (CORS), `DEFAULT_PAGE_SIZE`/`MAX_PAGE_SIZE` (пагинация).
  - Остаётся: оформить единый CI smoke-workflow (миграции + интеграционные тесты в чистом окружении).
