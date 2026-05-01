# O'zbek Sentiment Backend

Flask + SQLite backend for Uzbek text emotion/sentiment analysis. The API uses JWT auth, role-based admin access, database-backed dictionary analysis, Gemini 2.5 Flash analysis, hybrid comparison, history, dashboards, charts, and admin monitoring.

## Setup

1. Virtual environment:

```bash
python -m venv venv
```

2. Activate:

```bash
source venv/bin/activate
```

3. Install:

```bash
pip install -r requirements.txt
```

4. `backend/.env`:

```env
GEMINI_API_KEY=your_api_key_here
JWT_SECRET_KEY=your_secret_key_here
DATABASE_URL=sqlite:///sentiment.db
GEMINI_MODEL=gemini-3-flash-preview
MAX_TEXT_LENGTH=5000
CORS_ORIGINS=*
```

5. Database seed:

```bash
python seed.py
```

6. Run:

```bash
python app.py
```

Server: `http://127.0.0.1:5000`

Seed admin: `admin@example.com / admin123`

## Response Format

Success:

```json
{ "success": true, "data": {} }
```

Error:

```json
{ "success": false, "message": "Xatolik sababi" }
```

## Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

Protected endpoints require:

```text
Authorization: Bearer <token>
```

Roles:

- `USER`: analyze text and view own history/statistics.
- `ADMIN`: manage dictionary/rules/imports and view admin statistics/history.

## Analyze

`POST /api/analyze`

```json
{
  "text": "Bugun xizmat juda yaxshi bo'ldi, lekin kutish vaqti uzoq edi.",
  "mode": "HYBRID"
}
```

Modes:

- `DATASET`: uses `DictionaryWord` rows from SQLite.
- `GEMINI`: uses the model configured in `GEMINI_MODEL`.
- `HYBRID`: compares dataset and Gemini. If Gemini fails, dataset result is saved and returned with `ai_available=false`.

Every analysis is saved to `AnalysisHistory` with original text, normalized text, dataset result, Gemini result, final result, detected words, explanations, and timestamp.

## CSV Import

`POST /api/dictionary/import-csv`

Admin-only. Send `multipart/form-data` with field name `file`.

CSV format:

```csv
word,type,weight
yaxshi,POSITIVE,1
yomon,NEGATIVE,-1
oddiy,NEUTRAL,0
emas,NEGATION,0
juda,INTENSIFIER,2
```

Import behavior:

- Duplicates are updated by `normalized_word`.
- Uzbek apostrophe variants are normalized: `o'`, `o‘`, `oʻ`, `g'`, `g‘`, `gʻ`.
- Case is ignored.
- Response includes `inserted`, `updated`, `skipped`, and `errors`.

## Dictionary API

- `GET /api/dictionary`
- `GET /api/dictionary?type=POSITIVE&search=yaxshi&page=1&size=20`
- `POST /api/dictionary` admin-only
- `PUT /api/dictionary/<id>` admin-only
- `DELETE /api/dictionary/<id>` admin-only
- `POST /api/dictionary/import-csv` admin-only

## Rules API

- `GET /api/rules`
- `POST /api/rules` admin-only
- `PUT /api/rules/<id>` admin-only
- `DELETE /api/rules/<id>` admin-only

Active rules affect dataset analysis:

- `POSITIVE_SCORE`
- `NEGATIVE_SCORE`
- `NEGATION`
- `INTENSIFIER`
- `NEUTRAL_SCORE`

## History API

- `GET /api/history`
- `GET /api/history/<id>`
- `DELETE /api/history/<id>`

Filters:

```text
page=1
size=10
sentiment=IJOBIY
mode=HYBRID
date_from=2026-01-01
date_to=2026-01-31
search=xizmat
```

Admin:

- `GET /api/admin/history`
- `GET /api/admin/history?user_id=1&page=1&size=20`

## Statistics API

User:

- `GET /api/stats/summary`
- `GET /api/stats/daily?days=30`
- `GET /api/stats/sentiment-distribution`
- `GET /api/stats/top-words?limit=20`
- `GET /api/stats/recent-analyses?limit=10`

Admin:

- `GET /api/admin/stats/summary`
- `GET /api/admin/stats/users`

All statistics are calculated from SQLite tables, primarily `AnalysisHistory`.

## Frontend Example

```js
const response = await fetch("http://127.0.0.1:5000/api/analyze", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    text: "Bugun xizmat juda yaxshi bo'ldi",
    mode: "HYBRID",
  }),
});

const payload = await response.json();
```
