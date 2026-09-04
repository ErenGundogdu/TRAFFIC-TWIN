# Traffic Twin

**Trafik İzleme ve Analiz Platformu**

Traffic Twin, gerçek trafik ölçüm istasyonlarını harita üzerinde izlemek, tarihsel davranışı analiz etmek, açıklanabilir anomaliler üretmek ve operatörler arasında gerçek zamanlı not paylaşmak için tasarlanan bir staj projesidir.

> Proje durumu: Aşama 2 tamamlandı. Gerçek Fintraffic TMS istasyonları `/monitoring` ekranında OpenFreeMap üzerinde görüntüleniyor; istasyon seçimi URL ve detay paneliyle senkron çalışıyor. Socket.IO, geçmiş, replay, anomali ve operatör notları sonraki aşamalardadır.

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

## Planlanan Çalışma Alanları

- `/monitoring`: Canlı harita, katmanlar, filtreler, detay, notlar ve replay
- `/analytics`: Tarihsel analiz, dönem/varlık karşılaştırması ve dışa aktarılabilir sonuçlar

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
- API sağlık kontrolü: `http://localhost:4000/health`
- Helsinki istasyon API'si: `http://localhost:4000/api/coverage-areas/helsinki/stations`
- PostgreSQL/PostGIS: `localhost:55432`

`POSTGRES_PORT` ve `DATABASE_URL`, başka bir yerel servisle çakışma halinde `.env` üzerinden birlikte değiştirilebilir. Veritabanını durdurmak için `pnpm db:down` kullanılır.

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
