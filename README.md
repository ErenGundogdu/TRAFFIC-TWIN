# Traffic Twin

**Trafik İzleme ve Analiz Platformu**

Traffic Twin, gerçek trafik ölçüm istasyonlarını harita üzerinde izlemek, tarihsel davranışı analiz etmek, açıklanabilir anomaliler üretmek ve operatörler arasında gerçek zamanlı not paylaşmak için tasarlanan bir staj projesidir.

> Proje durumu: Aşama 4 tamamlandı. Gerçek Fintraffic TMS istasyonları `/monitoring` ekranında canlı izlenir; `/analytics` gerçek günlük artifact'lerden üretilen dakika/saat/gün serisini filtreler, iki istasyonu karşılaştırır ve yakın dönemi harita-grafik senkron replay eder. Kalıcı operatör notları acknowledgement sonrası kapsama alanındaki istemcilere ulaşır. Kavşak türetme ve açıklanabilir anomali sonraki aşamadadır.

## Hedef MVP

1. Gerçek Fintraffic TMS istasyonlarının canlı izlenmesi
2. Gerçek geçmiş veriden analiz, karşılaştırma ve senkron replay
3. Kayan tarihsel baseline ile açıklanabilir anomali tespiti
4. Socket.IO üzerinden çift yönlü operatör notları

Sensör istasyonları fiziksel veri kaynağıdır. OpenStreetMap yol ağıyla doğrulanan istasyon yaklaşımlarından izlenebilir kavşaklar türetilebilir; iki varlık türü sistemde birlikte korunur.

## Planlanan Teknoloji Yığını

- Next.js App Router, React ve TypeScript
- MapLibre GL JS, `react-map-gl/maplibre` ve OpenFreeMap
- TanStack React Query, Axios, React Hook Form ve Zod
- Tailwind CSS, seçili shadcn/ui bileşenleri ve Recharts
- Node.js, Express ve Socket.IO
- PostgreSQL, PostGIS, Drizzle ORM ve `node-postgres`
- pnpm workspaces
- Vitest ve React Testing Library
- ESLint, Prettier, Husky ve lint-staged

## Veri Kaynakları

- [Fintraffic Digitraffic TMS](https://www.digitraffic.fi/en/road-traffic/lam/): Gerçek istasyon metadata'sı, hız, yön ve trafik hacmi
- [OpenStreetMap](https://www.openstreetmap.org/): Yol ve kavşak geometrileri
- [OpenFreeMap](https://openfreemap.org/): OpenStreetMap tabanlı görsel altlık harita

Çalışan ürün akışında sentetik veya mock trafik verisi kullanılmaz. Eksik veri uydurulmaz; tazelik, kapsama ve yetersiz veri durumu kullanıcıya gösterilir.

## Çalışma Alanları

- `/monitoring`: Canlı harita, istasyon seçimi, yön ölçümleri ve operatör notları
- `/analytics`: Tarihsel filtreleme, iki istasyonlu karşılaştırma ve senkron replay

Harita, panel ve analiz seçimleri ortak URL ve çalışma alanı sözleşmesiyle iki yönlü senkron tutulur.

## Belgeler

- [Ürün kapsamı](docs/PROJECT.md)
- [Hedef mimari](docs/ARCHITECTURE.md)
- [Yol haritası](docs/ROADMAP.md)
- [Brief uyumluluk matrisi](docs/BRIEF-COMPLIANCE.md)
- [Teknoloji kararları](kararlar.md)
- [Katkı ve kalite kuralları](CONTRIBUTING.md)
- [Ajan talimatları](AGENTS.md)
- [Proje geliştirme skill'i](skills/traffic-twin-development/SKILL.md)

## Kurulum

Gereksinimler: Node.js `20.19+`, pnpm `10.26+` ve Docker Compose.

```bash
pnpm install
cp .env.example .env
pnpm db:up
pnpm db:migrate
pnpm dev
```

- Web: `http://localhost:3000`
- Canlı izleme: `http://localhost:3000/monitoring`
- Geçmiş analiz: `http://localhost:3000/analytics`
- API sağlık kontrolü: `http://localhost:4000/health`
- Helsinki istasyon API'si: `http://localhost:4000/api/coverage-areas/helsinki/stations`
- Geçmiş API'si: `http://localhost:4000/api/analytics/helsinki/history`
- Operatör notu API'si: `http://localhost:4000/api/operator-notes?assetId=fintraffic-tms:20002`
- Socket.IO: `http://localhost:4000` (canlı trafik, operatör notu ve replay olayları)
- PostgreSQL/PostGIS: `localhost:55432`

`POSTGRES_PORT` ve `DATABASE_URL`, başka bir yerel servisle çakışma halinde `.env` üzerinden birlikte değiştirilebilir. Veritabanını durdurmak için `pnpm db:down` kullanılır.

`LIVE_POLL_INTERVAL_MS` en az `60000` olabilir. REST istekleri Fintraffic'i ayrıca çağırmaz; kalıcı son snapshot'ı döndürür. Fintraffic geçici olarak erişilemezse son gerçek ölçüm yaşı ve bozulmuş kaynak durumu korunur, veri üretilmez.

## Gerçek Geçmiş Veriyi İçeri Alma

Fintraffic günlük ham dosyaları istasyon ve gün bazında açıkça içeri alınır. Örnek:

```bash
pnpm history:import --station 20002 --date 2026-09-03
pnpm history:import --station 20004 --date 2026-09-03
```

Dosyalar `data/raw` altında sıkıştırılmış ve Git dışında tutulur; checksum ve işlem manifest'i PostgreSQL'e yazılır. Aynı kaynak yeniden işlendiğinde satırlar çoğaltılmaz. Gün/ay/yıl aralığına göre dakika/saat/gün özeti seçilir; indirilmeyen tarihler kullanıcıya eksik kapsama olarak gösterilir.

Canlı observation ve dakika özetlerinin varsayılan saklama süresi 90 gündür. Saat/gün özetleri ile ham artifact'ler uzun dönem kalır. Yapılandırılmış temizliği elle doğrulamak için:

```bash
pnpm maintenance:retention
```

## Kalite Komutları

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm build
```

Zorunlu teslimat hedefi Docker destekli yerel ortamdır; internete açık demo opsiyoneldir.
