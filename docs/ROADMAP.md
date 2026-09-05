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

- [x] Conditional polling ve idempotent observation yazımı
- [x] Batch canlı trafik Socket.IO olayı
- [x] Reconnect ve REST reconciliation
- [x] RHF + Zod not formu
- [x] Client → server acknowledgement → broadcast
- [x] Not kalıcılığı ve iki istemcili integration testi

Çıkış kriteri: **Tamamlandı.** Canlı Fintraffic doğrulamasında kaynak zamanı sayfa yenilenmeden `15:31:25` → `15:32:45` değişti ve ölçümler kalıcı zaman serisine yazıldı. Socket istemcisi her bağlantıda REST snapshot/not uzlaşması yapıyor. Gerçek PostGIS ve iki Socket.IO istemcili entegrasyon testi, oluşturma acknowledgement'ı ile iki istemcinin aynı kalıcı canonical notu aldığını doğruluyor.

## Aşama 4 — Geçmiş, Analitik ve Replay

- [x] Ham dosya artifact arşivi ve manifest
- [x] Sınırlı Helsinki geçmiş backfill'i
- [x] Dakika/saat/gün toplulaştırmaları
- [x] Tarih/metrik/yön filtre formu
- [x] `/analytics` rotası ve ortak grafik bileşeni
- [x] Varlık karşılaştırması
- [x] Socket.IO replay oturumu ve senkron zaman imleci

Çıkış kriteri: **Tamamlandı.** Fintraffic'in 3 Eylül 2026 tarihli iki gerçek TMS artifact'i checksum ve kaynak kökeniyle arşivlendi; 95.206 geçerli araç kaydı 5.104 dakika, 96 saat ve 4 gün özetine dönüştürüldü. `/analytics` gün/ay/yıl/özel aralık, metrik, yön ve otomatik çözünürlük filtrelerini URL'de taşır; iki istasyonu aynı grafikte karşılaştırır ve eksik günleri açıkça gösterir. Yakın dönem dakika serisi Socket.IO üzerinden oynatılabilir, duraklatılabilir, hızı değiştirilebilir; grafik zaman imleci ve harita değerleri aynı replay karesini kullanır.

## Aşama 5 — Kavşak ve AI İçgörüsü

- [x] OSM kapsama alanı senkronizasyonu
- [x] İstasyon–yol–kavşak eşleştirme politikası
- [x] En az bir doğrulanmış kavşak grubu ve kapsama gösterimi
- [x] Kayan baseline üretimi
- [x] Median/MAD anomali motoru ve kalıcılık
- [x] Anomali harita katmanı, açıklama paneli ve unit testler

Ara kanıt: 5 Eylül 2026 gerçek OSM senkronunda Helsinki sınırındaki 6 `type=junction` ilişkisinden 5'i, yol referansı/mesafe/yön politikasıyla 10 benzersiz Fintraffic sensörüne eşleştirildi. Aynı sensör yalnız en yakın uyumlu kavşağa atanır. İki kavşak `FULL`, biri `PARTIAL`, ikisi `INSUFFICIENT` kapsamayla harita ve detay panelinde gösterilir; OSM relation kimliği ile eşleştirme kanıtı korunur.

Anomali kanıtı: TMS 20002 için önceki 6 cumartesinin resmî Fintraffic artifact'leri içeri alındı. Canlı hız ve hacim, `Europe/Helsinki` aynı yerel gün/saat dilimindeki gerçek örneklerle karşılaştırıldı; panel mevcut değer, beklenen aralık, örnek sayısı, güven, politika ve ardışık sapma sayısını gösterdi. Gerçek bir hacim sapması önce `CANDIDATE` olarak kaldı; tek ölçümle aktif alarm üretilmedi.

Çıkış kriteri: **Tamamlandı.** Türetilmiş kavşakların veri kapsamı görünür ve gerçek baseline'a sahip istasyonda açıklanabilir anomali uçtan uca çalışır. Yetersiz geçmişte değer üretilmez; güncel anomali state'i kombinasyon başına tek satırla sınırlıdır.

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
