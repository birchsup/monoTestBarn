# testBarn — монорепо

Платформа управления тестами: бэкенд на Go + веб-фронтенд на React.

## Структура

- `backend/` — API-сервер на Go (БД, миграции, REST API под `internal/api`, `db/`).
  Запуск/окружение — см. `backend/README.md` и `backend/docker-compose.yml`.
- `frontend/` — SPA на React (Create React App / react-scripts). Источник в `frontend/src`.
  Локальная конфигурация — `frontend/.env` (не коммитится).
- `docs/` — **общий источник правды** для обоих слоёв. Главное:
  - `docs/API_CONTRACT.md` — контракт API между фронтом и бэком.
  - `docs/AGENTS_GUIDE.md`, `docs/DELIVERY_PLAN.md`, `docs/PRODUCT_BACKLOG.md`.

## Правила для агента

- Любое изменение API трогает **оба** слоя: при правке эндпоинта в `backend/`
  обнови соответствующий вызов в `frontend/src` и зафиксируй контракт в `docs/API_CONTRACT.md`.
- Сквозные изменения (поле/эндпоинт через бэк → фронт) делай одним логическим коммитом.
- Команды бэка запускай из `backend/`, фронта — из `frontend/`.

## Частые команды

Весь проект (из корня репо):
- `docker compose up --build` — поднять всё разом: БД, миграции, бэкенд (http://localhost:8080) и фронт (http://localhost:3000).
  Корневой `docker-compose.yml` подключает `backend/docker-compose.yml` через `include` и добавляет фронт
  (`frontend/Dockerfile`: прод-сборка CRA + nginx; адрес бэкенда вшивается build-арг'ом `REACT_APP_BACKEND_URL`).

Backend (из `backend/`):
- `docker compose up` — поднять только сервис и БД
- `go test ./...` — тесты

Frontend (из `frontend/`):
- `npm install` — зависимости
- `npm start` — дев-сервер
- `npm run build` — прод-сборка
