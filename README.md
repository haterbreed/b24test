# RealPay · Битрикс24 CRM Дашборд

Красивый дашборд с реальными данными из Битрикс24: сделки, контакты, компании, графики.

## Структура

```
b24-app/
├── index.js          # Node.js сервер (Express)
├── package.json
├── .env              # Настройки (вебхук)
├── .gitignore
└── public/
    └── index.html    # Фронтенд дашборда
```

## Быстрый старт

```bash
# 1. Установить зависимости
npm install

# 2. Запустить
npm start
```

Открыть: http://localhost:3000

---

## Деплой на сервер (VPS / Ubuntu)

```bash
# Установить Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Скопировать файлы на сервер
scp -r b24-app/ user@your-server:/home/user/

# Зайти на сервер
ssh user@your-server
cd b24-app
npm install

# Запустить через PM2 (не падает при закрытии терминала)
sudo npm install -g pm2
pm2 start index.js --name b24-dashboard
pm2 save
pm2 startup
```

---

## Деплой на Railway (бесплатно, самый простой способ)

1. Зайди на https://railway.app и зарегистрируйся
2. New Project → Deploy from GitHub
3. Залей папку b24-app в GitHub репозиторий
4. В Railway: Variables → добавь `B24_WEBHOOK` и `PORT=3000`
5. Готово — Railway даст тебе публичный URL

---

## Деплой на Render (бесплатно)

1. https://render.com → New Web Service
2. Connect GitHub репозиторий
3. Build Command: `npm install`
4. Start Command: `node index.js`
5. Environment Variables: `B24_WEBHOOK=https://realpay.bitrix24.ru/rest/1/nvxswslx4p6q9bgg`

---

## Настройка .env

```
B24_WEBHOOK=https://realpay.bitrix24.ru/rest/1/nvxswslx4p6q9bgg
PORT=3000
```

> ⚠️ Не заливай .env в публичный GitHub! Он добавлен в .gitignore.

---

## API эндпоинты

| URL | Описание |
|-----|----------|
| `GET /` | Дашборд (HTML) |
| `GET /api/summary` | Сводка: KPI, графики, последние сделки |
| `GET /api/deals` | Все сделки (с фильтром `?stage=WON&search=...`) |
| `GET /api/contacts` | Контакты (первые 100) |

---

## Что умеет дашборд

- **KPI карточки**: суммы выигранных/активных/проигранных сделок
- **График по месяцам**: количество сделок по месяцам
- **Круговая диаграмма**: сделки по стадиям
- **Таблица сделок**: поиск, фильтр по стадии, пагинация
- **Таблица контактов**: имя, телефон, email, должность
- **Кнопка "Обновить"**: подгружает свежие данные из Б24
