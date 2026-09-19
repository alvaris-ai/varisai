# VARIS Data Layer

Migration utama berada di `supabase/migrations/202609180001_initial_schema.sql` dan seed development di `supabase/seed.sql`.

## Menjalankan pada Supabase

```bash
supabase db push
supabase db seed
```

Atau, pada project Postgres yang sudah memiliki `pgcrypto`, `vector`, dan fungsi `auth.uid()`:

```bash
psql "$DATABASE_URL" -f supabase/migrations/202609180001_initial_schema.sql
psql "$DATABASE_URL" -f supabase/seed.sql
```

## Pengujian

Mode offline memeriksa struktur migration tanpa database:

```bash
pnpm db:smoke
```

Jika `DATABASE_URL` tersedia, command yang sama menjalankan migration dalam transaction, insert user/conversation/message, select join untuk memverifikasi relasi, lalu rollback data smoke test:

```bash
$env:DATABASE_URL = "postgresql://..."
pnpm install
pnpm db:smoke
```

## Password

`password_hash` tidak menerima plaintext. Untuk local password-auth adapter, buat hash scrypt dengan:

```bash
pnpm db:hash-password "password-minimal-12-karakter"
```

Hasilnya disimpan hanya sebagai hash. Pada integrasi Supabase Auth, kolom `password_hash` tetap `NULL` karena credential hash dikelola oleh Supabase Auth.

## Data tambahan

Selain tabel minimum yang diminta, migration menambahkan `agents`, `agent_tool_bindings`, `agent_runs`, `run_events`, `tool_calls`, `memory_items`, `usage_records`, dan `audit_logs` agar sesuai dengan architecture plan. Semua tabel ownership-sensitive mengaktifkan RLS; service role hanya boleh digunakan dari backend.

