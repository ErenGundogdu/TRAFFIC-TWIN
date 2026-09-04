# Traffic Twin Yol Haritası

## Çalışma Kuralı

Her aşama şu döngüyle ilerler:

```text
Anla → küçük dikey dilimi planla → uygula → test et → çalıştır → belgeyi güncelle
```

Bir sonraki aşama, mevcut aşamanın çıkış kriterleri doğrulanmadan otomatik başlamaz. Yol haritası yaklaşık beş haftalık staj planına uyarlanmıştır; özellik eklemek yerine çalışan dikey dilimler önceliklidir.

## Aşama 0 — Kararlar ve Belgeler

- [x] Ürün ve MVP kapsamı
- [x] Harita, veri, AI ve WebSocket kararları
- [x] Hedef mimari ve proje kuralları
- [x] Belgelerin kullanıcı tarafından son gözden geçirilmesi

Çıkış kriteri: Planlanan ile uygulanmış durum açıkça ayrılmış ve çelişen temel karar kalmamış olmalıdır.

## Aşama 1 — Workspace ve Kalite Altyapısı

- [x] pnpm workspace: `apps/web`, `apps/server`; ortak paketler gerçek ihtiyaç oluştuğunda eklenecek
- [x] Next.js App Router + TypeScript
- [x] Express + TypeScript ve `GET /health`
- [x] ESLint, Prettier, Husky, lint-staged
- [x] Vitest ve React Testing Library
- [x] Docker Compose ile PostgreSQL/PostGIS
- [x] Ortam değişkenlerinin Zod doğrulaması

Çıkış kriteri: **Tamamlandı.** `pnpm dev` ile web ve API birlikte açıldı; lint, format, typecheck, test ve production build komutları doğrulandı. PostGIS `3.5.7` sağlıklı container üzerinde doğrulandı.

## Aşama 2 — Gerçek Fintraffic Dikey Dilimi

- [x] Fintraffic istemcisi, gzip ve kimlik başlığı
- [x] Gerçek payload fixture'larıyla parser/normalizer testleri
- [x] İstasyon kataloğu ve Helsinki kapsama alanı
- [x] PostgreSQL şeması ve ilk migration
- [x] REST ile istasyon/snapshot bootstrap
- [x] MapLibre + OpenFreeMap üzerinde istasyon katmanı
- [x] Seçim, URL ve detay paneli senkronizasyonu

Çıkış kriteri: **Tamamlandı.** Canlı API doğrulamasında Helsinki kapsama alanında 76 aktif istasyon döndü. Kullanıcı istasyonu harita veya listeden seçebiliyor; seçim URL'ye yazılıyor ve iki yönün gerçek kayan 5 dakikalık hız/hacim ölçümleri, ölçüm zamanı, saat dilimi, kaynak ve tazelik durumuyla gösteriliyor. Eksik ölçüm yerine veri üretilmiyor.

## Aşama 3 — Canlı Socket.IO ve Operatör Notları

- Conditional polling ve idempotent observation yazımı
- Batch canlı trafik Socket.IO olayı
- Reconnect ve REST reconciliation
- RHF + Zod not formu
- Client → server acknowledgement → broadcast
- Not kalıcılığı ve iki istemcili integration testi

Çıkış kriteri: Canlı değerler yenilemesiz değişir; iki istemci aynı canonical notu görür; kopma durumunda veri doğruluğu korunur.

## Aşama 4 — Geçmiş, Analitik ve Replay

- Ham dosya artifact arşivi ve manifest
- Sınırlı Helsinki geçmiş backfill'i
- Dakika/saat/gün toplulaştırmaları
- Tarih/metrik/yön filtre formu
- `/analytics` rotası ve ortak grafik bileşenleri
- Dönem/varlık karşılaştırması
- Socket.IO replay oturumu ve senkron zaman imleci

Çıkış kriteri: Gerçek geçmiş veri günlük/aylık/yıllık görüntülenir, iki seçim karşılaştırılır ve yakın dönem akışı replay edilebilir.

## Aşama 5 — Kavşak ve AI İçgörüsü

- OSM kapsama alanı senkronizasyonu
- İstasyon–yol–kavşak eşleştirme politikası
- En az bir doğrulanmış kavşak grubu ve kapsama gösterimi
- Kayan baseline üretimi
- Median/MAD anomali motoru ve kalıcılık
- Harita katmanı, açıklama paneli ve unit testler

Çıkış kriteri: Türetilmiş kavşakların veri kapsamı dürüstçe görünür; gerçek baseline'a sahip varlıklarda açıklanabilir anomali uçtan uca çalışır.

## Aşama 6 — Teslimat Sertleştirmesi

- Hata, loading, empty, stale ve yetersiz veri durumları
- Erişilebilirlik ve açık/koyu tema kontrolü
- Tam lint, typecheck, test ve production build
- README kurulum ve çalışma adımlarının gerçek komutlarla güncellenmesi
- `kararlar.md`, mimari ve demo senaryosunun güncellenmesi
- Yaklaşık 10 dakikalık demo hazırlığı

Çıkış kriteri: Temiz kurulumdan çalışan demo üretilebilir ve brief'in bütün zorunlu maddeleri kanıtlanabilir.

## MVP Sonrası Adaylar

Yalnızca Aşama 6 tamamlandıktan ve kalan zaman değerlendirildikten sonra:

1. LLM destekli yönetici raporu
2. Trafik senaryosu/simülasyon modu
3. Yeni gerçek veri sağlayıcısı
4. Kapsama alanı yönetim ekranı
5. PDF raporu ve zamanlanmış raporlar
6. İnternete açık demo ve CI/CD
