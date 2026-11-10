# RIFTROOM

Монорепо на npm workspaces: фронтенд, бекенд і спільний контракт між ними.

```
apps/
  web/      фронтенд: React 19 + TypeScript + Vite, React Router
  api/      бекенд: NestJS 12 + Prisma 7 + PostgreSQL
packages/
  shared/   спільні типи, zod-схеми валідації, коди помилок, опис API
docker/     init-скрипти Postgres
scripts/    dev-скрипт, що запускає api + web разом
```

## Вимоги

- Node.js **22.12+** (перевірено на 22.18)
- Docker (для PostgreSQL). Можна й власний Postgres: тоді змініть `DATABASE_URL`.

## Локальний запуск

```bash
# 1. Залежності (postinstall збирає packages/shared і генерує Prisma Client)
npm install

# 2. Змінні оточення API
cp apps/api/.env.example apps/api/.env

# 3. PostgreSQL у Docker (порт 5433, щоб не конфліктувати з локальним Postgres)
npm run db:up

# 4. Міграції
npm run db:deploy

# 5. API + фронтенд разом
npm run dev
```

Відкрийте http://localhost:5173, зареєструйтеся, і вас перекине на Dashboard.

Vite проксіює `/api` на `http://localhost:3000`, тому браузер працює з одним origin, а cookie залишаються first-party.
Окремо можна запускати так: `npm run dev:api` і `npm run dev:web`.

## Команди (з кореня)

| Команда | Що робить |
| --- | --- |
| `npm run dev` | API (watch) + Vite dev server |
| `npm run build` | збірка shared → api → web |
| `npm run typecheck` | TypeScript у всіх пакетах |
| `npm run lint` | oxlint по всьому репо |
| `npm test` | тести всіх пакетів (API-тести потребують запущеного Postgres) |
| `npm run db:up` / `db:down` | запустити / зупинити Postgres у Docker |
| `npm run db:migrate` | створити нову міграцію після зміни `schema.prisma` |
| `npm run db:deploy` | застосувати наявні міграції |

## Авторизація: як це влаштовано

**Сесії.** Після реєстрації чи входу сервер генерує випадковий 256-бітний токен і кладе його в cookie `rr_session`:
`HttpOnly`, `SameSite=Lax`, `Secure` у production (там же додається префікс `__Host-`).
У базі (`sessions`) зберігається тільки SHA-256 хеш токена, тож витік бази не дає змоги викрасти сесію.
Logout видаляє сесію на сервері. Сесія живе 30 днів (`SESSION_TTL_DAYS`).

**Паролі.** Хешуються scrypt (`node:crypto`, N=2^17, r=8, p=1, сіль 16 байт), як радить OWASP. Нативні залежності не потрібні.
Параметри зберігаються в самому хеші, тож вартість можна підняти без міграції старих паролів.
Для неіснуючого email вхід витрачає стільки ж часу, скільки для існуючого: за часом відповіді не можна визначити, чи зареєстрований email.

**CSRF.** Double-submit token: `GET /api/auth/csrf` ставить HttpOnly cookie і повертає той самий токен у тілі.
Кожен POST має передати його в заголовку `X-CSRF-Token`. Додатково запити з чужим `Origin` відхиляються.
API-клієнт фронтенду робить це автоматично.

**Захист від перебору.**
- Per-IP rate limit на `/auth/login` і `/auth/register` (`AUTH_RATE_LIMIT_PER_MINUTE`, типово 10/хв).
- Блокування акаунта: 5 невдалих входів для одного email за 15 хвилин дають `429` з `Retry-After`.
  Лічильник зберігається в Postgres (`login_failures`), тому переживає рестарти. Успішний вхід його скидає.

**Помилки.** Усі помилки API мають один формат (`ApiErrorBody` з `packages/shared`):

```json
{ "statusCode": 400, "code": "VALIDATION_ERROR", "message": "…", "fieldErrors": { "email": "…" } }
```

Внутрішні деталі (stack trace, SQL) назовні не віддаються.

**Контракт.** `packages/shared` містить zod-схеми (одні й ті самі для форм і для API), тип `User` без `passwordHash`
і `ApiContract`, тобто мапу `"METHOD /path"` → тип запиту й відповіді. Якщо поміняти контракт, фронт перестане компілюватися.

## API

| Метод | Шлях | Опис |
| --- | --- | --- |
| GET | `/api/health` | перевірка API і бази |
| GET | `/api/auth/csrf` | CSRF-токен |
| POST | `/api/auth/register` | `{ username, email, password }` → `201 { user }` + сесія |
| POST | `/api/auth/login` | `{ email, password }` → `200 { user }` + сесія |
| POST | `/api/auth/logout` | `204`, сесію видалено |
| GET | `/api/auth/me` | `200 { user }` або `401` |

Username зберігається в нижньому регістрі (3–24 символи: `a-z`, `0-9`, `_`), email теж нормалізується до нижнього регістру.

## Тести

- `packages/shared`: правила валідації.
- `apps/api`: юніт-тести хешування паролів і e2e-тести на **реальній** базі `riftroom_test` (реєстрація, вхід, `/me`, logout, CSRF, блокування, rate limit, прострочені сесії, формат помилок).
  Тести відмовляться працювати з базою, назва якої не закінчується на `_test`.
- `apps/web`: потоки авторизації на справжньому дереві маршрутів (захищені маршрути, форми, CSRF-retry, logout) із заглушкою `fetch`.

## Змінні оточення API

Див. [`apps/api/.env.example`](apps/api/.env.example). Головні з них: `DATABASE_URL`, `API_PORT`, `WEB_ORIGIN` (дозволені origin через кому), `TRUST_PROXY=1` за reverse proxy.
Для фронтенду на іншому домені задайте `VITE_API_URL` під час збірки `apps/web`.
