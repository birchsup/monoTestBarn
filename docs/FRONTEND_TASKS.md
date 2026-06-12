# FRONTEND_TASKS — задачи по приведению фронтенда к актуальному API

Источник: `docs/BACKEND_API.md` (актуальные эндпоинты бэкенда), сверено с текущим кодом
`frontend/src`. Задачи разбиты на три блока: **P0** — фронт сломан (зовёт удалённые маршруты),
**P1** — несоответствие контракту, **P2** — новый функционал, который бэкенд уже поддерживает.

> **Статус: все задачи FE-1 … FE-13 выполнены** (проверено вживую против локального бэкенда).
> Попутно исправлен CORS на бэке (`backend/main.go`): добавлен метод `PATCH` в
> `AllowedMethods` и `X-Total-Count`/`X-Limit`/`X-Offset` в `ExposedHeaders` — без этого
> смена статусов в run и пагинация не работали из браузера. Зафиксировано в
> `docs/BACKEND_API.md` и `docs/API_CONTRACT.md`.

---

## P0 — починить вызовы удалённых (legacy) эндпоинтов

Эти маршруты на бэке больше не существуют — соответствующие экраны сейчас неработоспособны.

### ✅ FE-1. Детальная страница test case: чтение и обновление
- **Файл**: `frontend/src/tetsCaseDetailedView/TestCaseDetail.js`
- Заменить:
  - `GET /testcase?id={id}` (строки 25, 115) → `GET /testcases/{id}`;
  - `PUT /test-case/update?id={id}` (строка 96) → `PUT /testcases/{id}`, body `{ "test": { ... } }`.
- Обработать `404` (кейс не найден) — показать сообщение вместо падения.

### ✅ FE-2. Привязка кейса к suite со страницы test case
- **Файл**: `frontend/src/tetsCaseDetailedView/TestCaseDetail.js` (строка 161)
- Заменить `POST /test-suites/add-cases` (suite_id в body) →
  `POST /test-suites/{id}/cases:batch`, body `{ "case_ids": [caseId] }`.
- Внимание: обычный `POST /test-suites/{id}/cases` имеет **replace**-семантику
  (отвязывает кейсы от прежних suites); для добавления одного кейса использовать `:batch` (идемпотентен).

### ✅ FE-3. Детальная страница suite: чтение, добавление и удаление кейсов
- **Файл**: `frontend/src/testSuites/detailedView/TestSuiteDetails.js`
- Заменить:
  - `GET /test-suite?id={id}` (строка 16) → `GET /test-suites/{id}`;
  - `DELETE /test-suite/remove-case?suite_id=&case_id=` (строка 51) → `DELETE /test-suites/{id}/cases/{caseId}` (успех — `204`);
  - `POST /test-suites/add-cases` (строка 66) → `POST /test-suites/{id}/cases:batch`.
- Желательно перевести роут с query-параметра (`?id=`) на path-параметр `/test-suites/:id` в `App.js`.

### ✅ FE-4. Список suites: удаление suite
- **Файл**: `frontend/src/testSuites/list/listOftestSuites.js` (строка 29)
- Заменить `DELETE /test-suite/delete?id={id}` → `DELETE /test-suites/{id}` (успех — `204`).

### ✅ FE-5. Создание suite
- **Файл**: `frontend/src/testSuites/newTestSuite/addTestSuite.js` (строка 22)
- Заменить `POST http://localhost:8080/add-test-suite` → `POST {link}/test-suites`
  (успех — `201`). Убрать хардкод `localhost:8080`, использовать `link` из `ngrock.js`.

### ✅ FE-6. Детальная страница test run: чтение и смена статусов
- **Файл**: `frontend/src/testRuns/testRunDetailedView.js`
- Заменить:
  - `GET http://localhost:8080/test-runs/cases?run_id={id}` (строка 16) → `GET {link}/test-runs/{id}`;
  - `PUT http://localhost:8080/test-runs/case/status?...` (строка 42) → `PATCH {link}/test-runs/{runId}/cases/{caseId}`.
- Адаптировать под новый формат ответа: объект run с `cases[]` (`case_id`, `status`, `comment`,
  `executed_at`, `executed_by`) и `summary` — вместо плоского массива с группировкой по `suite_id`.
- **Исправить набор статусов**: сейчас в UI `pending`, `running`, `passed`, `failed`, `skipped`;
  бэкенд принимает только `passed`, `failed`, `blocked`, `skipped`, `not_run`.
  Обновить селекторы статусов, фильтр и `StatusChart`.

---

## P1 — соответствие контракту и инфраструктура

### ✅ FE-7. Единый API-клиент
- Создать модуль (например, `frontend/src/api/client.js`): base URL из `REACT_APP_BACKEND_URL`,
  общие заголовки (`Content-Type`, `ngrok-skip-browser-warning`), разбор ошибок.
- Перевести все компоненты на него; убрать оставшиеся хардкоды `http://localhost:8080`
  и дублирование `.replace(/([^:]\/)\/+/g, "$1")`.

### ✅ FE-8. Единая обработка ошибок API
- Бэкенд возвращает ошибки в JSON: `{ "code", "message", "details" }`.
- Показывать `message` пользователю (toast/inline) вместо `console.error`;
  отдельно обрабатывать `404` (не найдено) и `409` (`test_case_in_use`, `test_suite_in_use` —
  объяснить, почему удаление невозможно).

---

## P2 — новый функционал, уже поддержанный бэкендом

### ✅ FE-9. Создание test run из UI
- Сейчас UI создания run отсутствует — runs можно только просматривать.
- Добавить форму/кнопку «Start run»: из страницы suite (`suite_id`), из списка кейсов
  (выбранные `test_case_ids`) или комбинации. `POST /test-runs` с `run_details.name` и `executed_by`.
- После `201` — переход на `/test-runs/{id}`.

### ✅ FE-10. Пагинация, поиск и сортировка списков
- Эндпоинты: `GET /testcases` (`q`), `GET /test-suites` (`name`), `GET /test-runs`
  (`suite_id`, `date_from`, `date_to`) + `limit`/`offset`/`sort_by`/`order`.
- Файлы: `listOfCases/TestCasesList.js`, `testSuites/list/listOftestSuites.js`,
  `testRuns/listOfTestRuns.js`.
- Использовать заголовки `X-Total-Count`, `X-Limit`, `X-Offset` для пейджера.

### ✅ FE-11. Удаление test case (одиночное и массовое)
- На странице кейса / в списке нет удаления, хотя бэкенд поддерживает
  `DELETE /testcases/{id}` и `DELETE /testcases:batch` (`{ "ids": [...] }`).
- Добавить кнопку удаления с подтверждением; для массового — чекбоксы в списке.
- Обработать `409 test_case_in_use` и partial success ответ batch
  (`results[]` + `summary`) — показать, что удалилось, а что нет.

### ✅ FE-12. Массовая смена статусов в test run
- Бэкенд: `PATCH /test-runs/{runId}/cases:batch`
  (`{ "executed_by", "items": [{ "case_id", "status", "comment" }] }`).
- В детальном виде run добавить мультивыбор кейсов + действие «set status for selected».
- Отобразить partial success результат.

### ✅ FE-13. Редактирование suite
- Бэкенд: `PUT /test-suites/{id}` (`name`, `description`) — на фронте редактирования suite нет.
- Добавить редактирование на детальной странице suite.

---

## Порядок выполнения

1. FE-7 (API-клиент) — фундамент, упростит всё остальное.
2. FE-1 … FE-6 (P0) — восстановить работоспособность экранов.
3. FE-8 — ошибки.
4. FE-9 … FE-13 — новый функционал по приоритету продукта.

Каждую задачу закрывать одним логическим коммитом; при изменении контракта — синхронно
обновлять `docs/BACKEND_API.md` / `docs/API_CONTRACT.md` (правило из `CLAUDE.md`).
