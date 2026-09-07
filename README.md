# Traffic Twin

**Trafik İzleme ve Analiz Platformu**

Traffic Twin, gerçek trafik ölçüm istasyonlarını harita üzerinde izlemek, tarihsel davranışı analiz etmek, açıklanabilir anomaliler üretmek ve operatörler arasında gerçek zamanlı not paylaşmak için tasarlanan bir staj projesidir.

> Proje durumu: MVP ve Aşama 6 teslimat sertleştirmesi tamamlandı. Gerçek Fintraffic TMS istasyonları `/monitoring` ekranında canlı izlenir; gerçek OSM kavşak ilişkileri sürümlü yol/mesafe/yön politikasıyla sensörlere eşlenir. Yapılandırılabilir kayan baseline ve median/MAD motoru, hız ve hacmi aynı yerel gün/saat geçmişiyle karşılaştırır; yetersiz veri, aday ve aktif anomali durumlarını açıklama kanıtıyla gösterir. Aynı harita çalışma alanındaki Analiz modu gerçek geçmiş seriyi karşılaştırır ve senkron replay eder.

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

## Çalışma Alanı

- `/monitoring`: Aranabilir varlık seçim çubuğu; yoğunluk, gerçek OSM yol akışı ve 3B hacim görünümlü kalıcı harita üzerinde Canlı ile Analiz modları
- `/monitoring?mode=analysis`: Gerçek geçmiş kullanılabilirliği, uygun tarih önerisi, sunucu hesaplı dönem KPI'ları, tarihsel filtreleme, iki istasyonlu karşılaştırma ve senkron replay
- `/analytics`: Eski paylaşılmış bağlantıları filtreleri koruyarak yeni Analiz moduna yönlendiren uyumluluk rotası

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
- [Yaklaşık 10 dakikalık demo akışı](docs/DEMO.md)

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
- Geçmiş analiz: `http://localhost:3000/monitoring?mode=analysis`
- API sağlık kontrolü: `http://localhost:4000/health`
- Helsinki istasyon API'si: `http://localhost:4000/api/coverage-areas/helsinki/stations`
- Geçmiş API'si: `http://localhost:4000/api/analytics/helsinki/history`
- Operatör notu API'si: `http://localhost:4000/api/operator-notes?assetId=fintraffic-tms:20002`
- Socket.IO: `http://localhost:4000` (canlı trafik, operatör notu ve replay olayları)
- PostgreSQL/PostGIS: `localhost:55432`

`POSTGRES_PORT` ve `DATABASE_URL`, başka bir yerel servisle çakışma halinde `.env` üzerinden birlikte değiştirilebilir. Veritabanını durdurmak için `pnpm db:down` kullanılır.

İlk açılışta backend Fintraffic'ten gerçek güncel istasyon kataloğunu ve ölçümleri alır. İnternet veya upstream erişimi yoksa başlangıç hatası açıkça gösterilir; sentetik başlangıç verisi kullanılmaz.

### Demo Verisini Hazırlama

Canlı izleme temiz kurulumda kendiliğinden çalışır. Kavşak, geçmiş karşılaştırma ve anomali kanıtlarını hazırlamak için uygulama açıkken aşağıdaki gerçek veri komutları bir kez çalıştırılır:

```bash
pnpm junctions:sync --coverage helsinki
pnpm history:import --station 20002 --date 2026-09-03
pnpm history:import --station 20004 --date 2026-09-03
pnpm history:import --station 20002 --date 2026-08-29
pnpm history:import --station 20002 --date 2026-08-22
pnpm history:import --station 20002 --date 2026-08-15
pnpm history:import --station 20002 --date 2026-08-08
pnpm history:import --station 20002 --date 2026-08-01
pnpm history:import --station 20002 --date 2026-07-25
pnpm anomalies:evaluate --coverage helsinki
```

Bu tarihler uygulamaya gömülü değildir; doğrulanmış demo artifact'lerini tekrar üretmek için belgelenmiş komut girdileridir. Yeni dönemler aynı CLI ile eklenebilir.

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

## Gerçek OSM Kavşaklarını Senkronlama

OSM'de açıkça `type=junction` olarak modellenen ilişkiler kapsama alanı bazında alınır. Eşleşen sensör, mesafe, yön farkı, yol referansı, güven ve politika sürümü PostgreSQL/PostGIS'te korunur:

```bash
pnpm junctions:sync --coverage helsinki
```

Senkron çalışma zamanı mock'u kullanmaz. Eşleşmeyen OSM ilişkileri trafik varlığına dönüştürülmez; bir sensör yalnız en yakın uyumlu kavşağa bağlanır. Sonuç `http://localhost:4000/api/coverage-areas/helsinki/junctions` üzerinden okunur.

## Açıklanabilir Anomali

Canlı poll sonrası her istasyon–yön–metrik durumu gerçek saatlik geçmişle yeniden değerlendirilir. Varsayılan pencere son 12 hafta, minimum örnek 6 ve aktifleşme eşiği iki ardışık sapmadır; değerler `.env` üzerinden değiştirilebilir. Aynı observation idempotent kalır:

```bash
pnpm anomalies:evaluate --coverage helsinki
```

Sonuç `http://localhost:4000/api/coverage-areas/helsinki/anomalies` üzerinden okunur. Her kombinasyon için yalnız güncel state satırı tutulur; kullanılan baseline örnekleri ve politika snapshot'ı bu satırda korunur. Böylece canlı değerlendirme veritabanında sınırsız satır üretmez.

## Kalite Komutları

```bash
pnpm verify
```

`verify`; format, lint, typecheck, unit/component testleri ve production build'i çalıştırır. Sağlıklı yerel PostgreSQL/PostGIS üzerinde entegrasyon testlerini de eklemek için:

```bash
pnpm verify:full
```

Ayrı ayrı çalıştırılabilen karşılıkları:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm build
```

Arayüz açık temayı varsayılan kullanır; başlıktaki tema düğmesi seçimi tarayıcıda saklar ve MapLibre altlığını OpenFreeMap Liberty/Dark stiline geçirir. Harita seçili varlığa odaklanır; durum halkaları, hover özeti ve ölçek kontrolü bağlamı kaybetmeden incelemeyi destekler. Bağlantı, altlık ve ikincil veri sorgusu hataları gerçek boş sonuçtan ayrılır ve son bilinen veri açıkça işaretlenir.

Harita WebGL 2'yi, desteklenmeyen ortamlarda WebGL 1 geri dönüşünü kullanır. Bu nedenle MapLibre GL JS bağımlılığı 5.x sürüm hattında tutulur.

Zorunlu teslimat hedefi Docker destekli yerel ortamdır; internete açık demo opsiyoneldir.
