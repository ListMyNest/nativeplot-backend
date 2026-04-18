## Frontend quick setup (team)

```bash
cd listmynest-frontend/listmynest-frontend
npm install
copy .env.example .env.local
npm run dev
```

Notes:
- `NEXT_PUBLIC_API_BASE_URL` defaults to `http://localhost:8080/v1` if not set.
- For `next/image` to load Supabase Storage URLs, set `NEXT_PUBLIC_SUPABASE_URL`.

