# Запуск Omarket Price Monitor

## Предварительные требования

- Python 3.12+ ([python.org](https://www.python.org/downloads/))
- Node.js 20+ ([nodejs.org](https://nodejs.org/))
- Docker Desktop ([docker.com](https://www.docker.com/products/docker-desktop/))

---

## Шаг 1: Настройка

1. Скопируйте `.env.example` → `.env` и заполните:
   ```
   OMARKET_LOGIN=ваш_логин
   OMARKET_PASSWORD=ваш_пароль
   ```

---

## Шаг 2: База данных и Redis

```powershell
docker-compose up -d
```

Дождитесь запуска (5-10 секунд).

---

## Шаг 3: Backend

```powershell
cd backend

# Создать виртуальное окружение
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Установить зависимости
pip install -r requirements.txt
playwright install chromium

# Применить миграции
alembic upgrade head

# Запустить FastAPI
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API доступно: http://localhost:8000/docs

---

## Шаг 4: Celery Worker (новый терминал)

```powershell
cd backend
.\.venv\Scripts\Activate.ps1

# Запустить воркер
celery -A worker.celery_app worker --loglevel=info --pool=threads --concurrency=4 -Q monitoring,default
```

---

## Шаг 5: Celery Beat (новый терминал)

```powershell
cd backend
.\.venv\Scripts\Activate.ps1

celery -A worker.beat_schedule beat --loglevel=info
```

---

## Шаг 6: Frontend

```powershell
cd frontend
npm install
npm run dev
```

Дашборд: http://localhost:5173

---

## Важно: настройка селекторов

После первого запуска необходимо проверить селекторы CSS на реальных страницах Omarket.kz.

В файле `backend/.env` или `backend/app/config.py` задаются переменные:
- `SELECTOR_OUR_PRICE` — селектор нашей цены
- `SELECTOR_COMPETITOR_BLOCK` — блок конкурента
- `SELECTOR_COMPETITOR_PRICE` — цена конкурента
- и др.

**Как найти правильные селекторы:**
1. Откройте карточку товара на Omarket.kz
2. Нажмите F12 → вкладка Elements
3. Найдите блок с ценами поставщиков
4. Скопируйте CSS-класс или атрибут
5. Обновите переменные в `.env`

---

## Структура логов

- `backend/logs/app.log` — общий лог (JSON)
- `backend/logs/screenshots/` — скриншоты при ошибках обновления цены
- `backend/logs/selector_debug_*.html` — HTML при ошибке селекторов
