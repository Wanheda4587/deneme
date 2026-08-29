// Senkron birleştirme testleri.  Çalıştırmak için: npm test
import { birlestir, zaman } from './senkron.ts'

let gecti = 0, kaldi = 0
const kontrol = (ad: string, sartlar: boolean) => {
  if (sartlar) { gecti++; console.log('  ✓', ad) }
  else { kaldi++; console.log('  ✗', ad) }
}

type K = { date: string; updatedAt: string; deger?: number }
const a = (date: string, updatedAt: string, deger?: number): K => ({ date, updatedAt, deger })

console.log('Birleştirme (daha yeni yazan kazanır):')

// 1) Uzakta olmayan yerel kayıt korunur
{
  const r = birlestir<K>([a('2026-09-01', '2026-09-01T10:00Z', 1)], [], (x) => x.date)
  kontrol('yerelde olup uzakta olmayan korunur', r.sonuc.length === 1 && r.sonuc[0].deger === 1 && r.uzaktanGelen === 0)
}
// 2) Yerelde olmayan uzak kayıt eklenir
{
  const r = birlestir<K>([], [a('2026-09-01', '2026-09-01T10:00Z', 2)], (x) => x.date)
  kontrol('uzakta olup yerelde olmayan eklenir', r.sonuc.length === 1 && r.sonuc[0].deger === 2 && r.uzaktanGelen === 1)
}
// 3) Aynı gün, uzak daha yeni → uzak kazanır
{
  const r = birlestir<K>(
    [a('2026-09-01', '2026-09-01T10:00Z', 1)],
    [a('2026-09-01', '2026-09-01T12:00Z', 2)],
    (x) => x.date,
  )
  kontrol('uzak daha yeniyse uzak kazanır', r.sonuc[0].deger === 2 && r.uzaktanGelen === 1)
}
// 4) Aynı gün, yerel daha yeni → yerel kazanır (veri kaybı olmamalı)
{
  const r = birlestir<K>(
    [a('2026-09-01', '2026-09-01T14:00Z', 1)],
    [a('2026-09-01', '2026-09-01T12:00Z', 2)],
    (x) => x.date,
  )
  kontrol('yerel daha yeniyse yerel kazanır', r.sonuc[0].deger === 1 && r.uzaktanGelen === 0)
}
// 5) Eşit zaman → yerel korunur (gereksiz yazma sayılmaz)
{
  const r = birlestir<K>(
    [a('2026-09-01', '2026-09-01T12:00Z', 1)],
    [a('2026-09-01', '2026-09-01T12:00Z', 2)],
    (x) => x.date,
  )
  kontrol('eşit zamanda yerel korunur', r.sonuc[0].deger === 1 && r.uzaktanGelen === 0)
}
// 6) Zaman damgası boş olan eski sayılır
{
  const r = birlestir<K>(
    [a('2026-09-01', '', 1)],
    [a('2026-09-01', '2026-09-01T12:00Z', 2)],
    (x) => x.date,
  )
  kontrol('damgasız yerel kaydın üstüne uzak yazar', r.sonuc[0].deger === 2)
  kontrol('zaman() boşu en eski sayar', zaman('') === '0000' && zaman(undefined) === '0000')
}
// 7) Farklı günler birleşir, hiçbiri kaybolmaz
{
  const r = birlestir<K>(
    [a('2026-09-01', 't1', 1), a('2026-09-02', 't1', 2)],
    [a('2026-09-02', 't2', 22), a('2026-09-03', 't1', 3)],
    (x) => x.date,
  )
  const h = new Map(r.sonuc.map((x) => [x.date, x.deger]))
  kontrol('üç günün hepsi mevcut', r.sonuc.length === 3)
  kontrol('yalnız yerel gün korundu', h.get('2026-09-01') === 1)
  kontrol('çakışan günde daha yeni kazandı', h.get('2026-09-02') === 22)
  kontrol('yalnız uzak gün eklendi', h.get('2026-09-03') === 3)
}
// 8) Gerçek senaryo: bilgisayarda dün girilen veri, boş telefona iner
{
  const bilgisayar = [a('2026-09-01', '2026-09-01T22:00Z', 7), a('2026-09-02', '2026-09-02T21:00Z', 8)]
  const telefon: K[] = []
  const r = birlestir<K>(telefon, bilgisayar, (x) => x.date)
  kontrol('boş telefon bilgisayarın 2 gününü alır', r.sonuc.length === 2 && r.uzaktanGelen === 2)
}

console.log(`\n${gecti} geçti, ${kaldi} kaldı`)
process.exit(kaldi === 0 ? 0 : 1)
