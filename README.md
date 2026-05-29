# ⚽ World Cup Prediction 2026

> Ứng dụng dự đoán kết quả bóng đá World Cup dành cho các công ty. Ai đoán giỏi nhất sẽ đóng quỹ ít nhất! 🏆

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **UI**: TailwindCSS v3 + shadcn/ui + Lucide Icons
- **State**: Zustand
- **Router**: React Router v6
- **Backend**: Supabase (Auth, PostgreSQL, Storage, Realtime)

## Tính năng

### User
- 🔐 Đăng ký / đăng nhập với chọn công ty
- ⚽ Dự đoán kết quả: Thắng / Hòa / Thua
- ⭐ Hệ thống Sao Hy Vọng (5 sao/user)
- 💰 Theo dõi tiền quỹ phải đóng
- 🏆 Bảng xếp hạng theo công ty
- 📊 Dashboard cá nhân + lịch sử dự đoán
- ⏱️ Countdown đến trận đấu
- 🌙 Dark mode mặc định

### Admin (`/admin`)
- 📊 Dashboard tổng quan
- 🏟️ CRUD trận đấu + cập nhật kết quả (tự động tính điểm)
- 🏢 CRUD công ty + upload logo
- 👥 Quản lý user: ban, reset sao, chuyển công ty
- ⚽ CRUD đội bóng + logo

### Luật tính tiền
| Tình huống | Tiền quỹ |
|-----------|----------|
| ✅ Đoán đúng | 0đ (không mất) |
| ❌ Đoán sai | +10.000đ |
| ⭐✅ Sao + Đúng | -10.000đ (giảm trừ) |
| ⭐❌ Sao + Sai | +20.000đ |

> Bảng xếp hạng sắp xếp theo **tổng tiền phải đóng tăng dần** — ai đóng ít nhất đứng đầu!

## Setup

### 1. Clone và cài dependencies

```bash
git clone <repo>
cd worldcup-prediction
npm install
```

### 2. Tạo project Supabase

1. Vào [supabase.com](https://supabase.com) → **New Project**
2. Lấy `Project URL` và `anon key` từ **Settings → API**

### 3. Cấu hình environment

```bash
cp .env.example .env.local
```

Điền vào `.env.local`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Setup Database

Trong Supabase **SQL Editor**, chạy lần lượt:

```sql
-- 1. Schema (tables + RLS + trigger + RPC)
-- Paste nội dung file: supabase/schema.sql

-- 2. Seed data (companies, teams, matches demo)
-- Paste nội dung file: supabase/seed.sql
```

### 5. Storage Buckets

Trong Supabase **Storage**, tạo 3 buckets (Public):
- `company-logos`
- `team-logos`  
- `avatars`

Rồi vào **SQL Editor** chạy:
```sql
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('company-logos', 'company-logos', true),
  ('team-logos', 'team-logos', true),
  ('avatars', 'avatars', true);

CREATE POLICY "public_read" ON storage.objects FOR SELECT USING (
  bucket_id IN ('company-logos', 'team-logos', 'avatars')
);
CREATE POLICY "auth_upload" ON storage.objects FOR INSERT WITH CHECK (
  auth.role() = 'authenticated'
);
```

### 6. Tạo Admin User

1. Đăng ký tài khoản bình thường qua `/auth`
2. Trong Supabase **SQL Editor**:
```sql
UPDATE profiles SET role = 'admin' WHERE id = 'your-user-uuid';
```

### 7. Chạy dev server

```bash
npm run dev
```

Mở [http://localhost:5173](http://localhost:5173)

## Deploy lên Vercel

```bash
npm run build
```

Hoặc kết nối repo với Vercel và set environment variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Folder Structure

```
src/
├── components/
│   ├── layout/       # Navbar, BottomNav
│   └── ui/           # Reusable UI components
├── lib/
│   ├── supabase.ts   # Supabase client
│   └── utils.ts      # Helper functions
├── pages/
│   ├── admin/        # Admin pages
│   └── *.tsx         # User pages
├── services/         # API calls to Supabase
├── stores/           # Zustand state
└── types/            # TypeScript types
supabase/
├── schema.sql        # Database schema + RLS
└── seed.sql          # Demo data
```

## License

MIT — For fun and entertainment only. No real gambling! 🎉
