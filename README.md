# 90 Gün Kampı

90 günlük kişisel gelişim kampı için günlük ve haftalık takip uygulaması.
Telefon ve bilgisayardan kullanılmak üzere, mobil öncelikli tasarlandı.

## Takip edilen sütunlar

| Sütun | Frekans | İçerik |
|---|---|---|
| 🏋️ Vücut | Günlük + Haftalık | Antrenman (gitti mi, verim %, not); haftalık bel / kol / kilo ölçümü |
| ⚡ Enerji & Keyif | Günlük | Uyku süresi ve kalitesi, enerji, mutluluk, beslenme, kalori dengesi, iş saati |
| 🎯 Disiplin | Günlük | Disiplin puanı (%) — düşük puan = o gün çok ertelendi |
| 🎤 Özgüven & İletişim | Günlük + Haftalık | Sahne programı çalışması (dk), kitap (sayfa); haftalık özgüven puanı ve notu |
| 💰 Ek Gelir | Günlük | Ayrılan süre (dk), verim (%), ne yapıldığı |

Tek bir birleşik "kamp skoru" **yoktur**. İlerleme; metrik bazlı haftalık yüzde
değişim, 7 günlük hareketli ortalama, dönem karşılaştırmaları ve ölçüm hedeflerine
göre tempo üzerinden okunur.

## Verileriniz nerede duruyor?

**Girdiğiniz hiçbir veri bu depoya (repo) yazılmaz.** Bu depo yalnızca uygulamanın
kaynak kodunu içerir ve herkese açıktır.

Şu an tüm veri yalnızca **kendi tarayıcınızın yerel depolamasında** (`localStorage`)
tutulur — sunucuya gitmez, başka bir cihaza kendiliğinden geçmez. Cihazlar arasında
taşımak için Ayarlar ekranındaki JSON dışa/içe aktarma kullanılır.

Depolama katmanı bir adaptör arayüzünün (`src/lib/storage/adapter.ts`) arkasındadır;
ileride Supabase adaptörü eklendiğinde cihazlar arası gerçek senkron devreye girecek
ve arayüz ekranlarında değişiklik gerekmeyecek. Supabase anahtarları da koda
gömülmeyecek, uygulama içinden girilecek.

## Ekranlar

- **Bugün** — Günlük giriş formu. Kampın kaçıncı günü olduğu ve kaç alanın doldurulduğu üstte.
- **Hafta** — Pazar değerlendirmesi (özgüven puanı + not, ölçümler, dört metin alanı), haftanın
  otomatik özeti ve *bu hafta ↔ geçen hafta* karşılaştırma tablosu.
  Bel / kol / kilo **haftada yalnızca bir kez** girilir; kaydedildikten sonra kilitlenir, ikinci
  giriş kabul edilmez. Yanlış girildiyse kilit elle açılabilir.
- **Trendler** — Her metrik için gün gün grafik. Süre ve sayfa gibi biriken metrikler bar
  (hangi gün ne kadar), puan ve oranlar çizgi + 7 günlük hareketli ortalama. Üstte
  *ilk 2 hafta ↔ son 2 hafta* tablosu.
- **Hedefler** — Bel (94 → 88 cm) ve kol (36 → 39 cm) için gerçek ölçüm çizgisi ile hedef
  çizgisi üst üste; kat edilen yol, bugün olunması gereken değer ve mevcut tempoyla kamp
  sonunda nerede olunacağı.
- **Geçmiş** — Kampın tamamının takvim ısı haritası, giriş ve antrenman serileri; geçmiş bir güne
  dokunup düzenleme.
- **Ayarlar** — Kamp tarihleri, tema, alan aç/kapa, JSON yedek al / geri yükle, demo verisi.

## Yayın

`main` veya geliştirme dalına push edildiğinde GitHub Actions derleyip GitHub Pages'e yayınlar
(`.github/workflows/deploy.yml`).

**Tek seferlik kurulum:** GitHub → repo **Settings → Pages → Source = GitHub Actions**.

Uygulama bir PWA'dır: telefonda tarayıcıdan açıp "Ana ekrana ekle" dendiğinde uygulama gibi
çalışır ve internet olmadan da açılır.

## Geliştirme

```bash
npm install
npm run dev        # http://localhost:5173/deneme/
npm run build      # tip kontrolü + üretim derlemesi
npm run preview    # derlenmiş sürümü yerelde çalıştır
```

## Mimari

```
src/lib/metrics.ts          Metrik kayıt defteri — TEK doğruluk kaynağı
src/lib/types.ts            Veri modeli (Supabase tablolarına birebir eşlenecek)
src/lib/date.ts             Kamp günü / hafta hesapları
src/lib/stats.ts            Ortalama, hareketli ortalama, % değişim, seri, hedef temposu
src/lib/storage/            Depolama adaptörü (şu an: localStorage)
src/state/store.tsx         Uygulama durumu, otomatik kaydetme
src/components/             Arayüz bileşenleri
src/pages/                  Ekranlar
```

Günlük form alanları, trend grafikleri ve haftalık karşılaştırma tablosu
`src/lib/metrics.ts` içindeki listeden üretilir. **Yeni bir metrik eklemek için
oraya bir satır eklemek yeterlidir** — hiçbir ekranı elle değiştirmek gerekmez.

Grafik renkleri, koyu ve açık temada renk körlüğü ayrımı doğrulanmış sabit sıralı
bir kategorik paletten gelir; durum renkleri (iyi/uyarı/kötü) ayrıdır ve her zaman
ikon veya etiketle birlikte kullanılır — anlam asla renge tek başına bırakılmaz.
