-- ============================================================================
-- 90 Gün Kampı — Supabase kurulumu
--
-- Supabase panelinde SQL Editor'ü aç, bu dosyanın TAMAMINI yapıştır ve çalıştır.
-- Bir kez çalıştırman yeterli. Tekrar çalıştırmak zarar vermez.
--
-- Verinin tamamı JSON olarak saklanır: ileride yeni metrik eklendiğinde
-- burada hiçbir değişiklik gerekmez.
-- ============================================================================

create table if not exists public.gunler (
  kullanici   uuid        not null references auth.users(id) on delete cascade,
  tarih       date        not null,
  veri        jsonb       not null,
  guncellendi text        not null default '',
  primary key (kullanici, tarih)
);

create table if not exists public.haftalar (
  kullanici   uuid        not null references auth.users(id) on delete cascade,
  hafta_basi  date        not null,
  veri        jsonb       not null,
  guncellendi text        not null default '',
  primary key (kullanici, hafta_basi)
);

create table if not exists public.ayarlar (
  kullanici   uuid        primary key references auth.users(id) on delete cascade,
  veri        jsonb       not null,
  guncellendi text        not null default ''
);

-- ── Satır bazlı güvenlik ────────────────────────────────────────────────────
-- Bu olmadan anon anahtarını bilen herkes verini okuyabilir. Zorunlu.
alter table public.gunler   enable row level security;
alter table public.haftalar enable row level security;
alter table public.ayarlar  enable row level security;

-- Her kullanıcı yalnızca kendi satırlarını görür ve yazar.
drop policy if exists "kendi gunleri"   on public.gunler;
drop policy if exists "kendi haftalari" on public.haftalar;
drop policy if exists "kendi ayarlari"  on public.ayarlar;

create policy "kendi gunleri" on public.gunler
  for all
  using (auth.uid() = kullanici)
  with check (auth.uid() = kullanici);

create policy "kendi haftalari" on public.haftalar
  for all
  using (auth.uid() = kullanici)
  with check (auth.uid() = kullanici);

create policy "kendi ayarlari" on public.ayarlar
  for all
  using (auth.uid() = kullanici)
  with check (auth.uid() = kullanici);
