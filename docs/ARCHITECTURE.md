# Traffic Twin Hedef Mimarisi

## Durum ve İlkeler

Bu belge hedef mimariyi tanımlar. Aşama 3 itibarıyla Fintraffic adapter'ı, ortak contracts paketi, istasyon kataloğu, PostgreSQL/PostGIS şeması, kalıcı observation serisi, merkezi conditional polling, REST reconciliation, Socket.IO canlı batch akışı, kalıcı operatör notları, React Query/Axios istemcisi ve MapLibre çalışma alanı uygulanmıştır. Geçmiş import, analitik, replay, kavşak ve anomali bölümleri hedef durumdur.

Mimari şu ilkeleri korur:

- Brief'in zorunlu teknolojileri görünür ve anlamlı kullanım noktalarına sahiptir.
- Gerçek trafik kaynağı ile sunum birbirinden ayrıdır.
- Harita, analiz ve raporlar aynı domain ve filtre sözleşmesini paylaşır.
- Yeni sağlayıcı/mod eklemek mümkündür; henüz olmayan kullanım için genel framework kurulmaz.
- Eksik veri uydurulmaz ve veri kökeni kaybolmaz.

## Sistem Görünümü

```text
Fintraffic REST          OpenStreetMap / Overpass
      │                            │
      ▼                            ▼
Fintraffic adapter              OSM adapter
      └──────────────┬─────────────┘
                     ▼
          Normalize + validate (Zod)
                     │
          ┌──────────┴───────────┐
          ▼                      ▼
 PostgreSQL + PostGIS      Domain services
          │                      │
          └──────────┬───────────┘
                     ▼
             Express REST API
               + Socket.IO
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
 Next.js / React Query     Realtime client
          └──────────┬──────────┘
                     ▼
        MapLibre + panels + charts
```

## Depo Yapısı

```text
apps/
  web/
    src/
      app/
      features/
        traffic-workspace/
        traffic-map/
        station-monitoring/
        junction-monitoring/
        traffic-history/
        traffic-analytics/
        traffic-comparison/
        anomaly-insights/
        operator-notes/
        replay/
      shared/

  server/
    src/
      app/
      modules/
        asset-catalog/
        telemetry/
        analytics/
        anomaly-detection/
        operator-notes/
        replay/
        ingestion/
        coverage-areas/
        providers/
          fintraffic/
          openstreetmap/
      infrastructure/
      shared/

packages/
  domain/
  contracts/
  database/
```

Klasörler ihtiyaç ortaya çıktığında oluşturulur. Her feature/modül kendi public `index.ts` yüzeyini sunar; başka feature'lar iç uygulama dosyalarına bağlanmaz.

## Runtime ve Dağıtım

- `apps/web`: Next.js App Router istemcisi, varsayılan port 3000.
- `apps/server`: Node.js/Express REST ve Socket.IO sunucusu, varsayılan port 4000.
- `postgres`: PostgreSQL + PostGIS Docker servisi.
- `raw-data`: Fintraffic kaynak dosyaları için Git dışı kalıcı Docker volume.

İlk hedef `docker compose` ile yerel çalışmadır. Web ve server ayrı deploy edilebilir kalır; çevrim içi demo zorunlu değildir.

## Domain Modeli

```ts
type TrafficAssetKind =
  "sensor-station" | "junction" | "road-segment" | "corridor" | "traffic-zone";

type TrafficCapability =
  | "speed"
  | "volume"
  | "vehicle-classification"
  | "directional-flow"
  | "operator-notes";
```

`TrafficAsset`, sağlayıcı bağımsız kimlik, tür, geometri, kapsama alanı, yetenek ve `sourceRefs` taşır. Core hız/hacim alanları tipli kolonlarda tutulur; sağlayıcıya özgü ham alanlar domain sözleşmesinin yerine geçirilmez. Gerçekten korunması gereken ek metadata JSONB içinde kaynak kökeniyle saklanabilir, ancak analitik metrik hâline gelmesi için açık bir domain tanımı gerekir.

## Sağlayıcı Sınırı

```ts
interface TrafficDataProvider {
  readonly id: string;
  discoverAssets(query: AssetQuery): Promise<TrafficAsset[]>;
  getCurrentState(query: CurrentStateQuery): Promise<TrafficObservation[]>;
  importHistory?(query: HistoryImportQuery): Promise<ImportResult>;
}
```

Fintraffic adapter'ı gzip, `Digitraffic-User`, ETag/Last-Modified, bir dakikalık bulk polling ve provider alanlarının normalizasyonundan sorumludur. UI Fintraffic sensör adlarını bilmez. MQTT gelecekte aynı provider'ın başka bir transport implementasyonu olabilir; MVP transport'u REST'tir.

## Canlı Veri Akışı

```text
1. Server istasyon metadata'sını periyodik senkronlar.
2. Bulk trafik endpoint'ini en fazla dakikada bir conditional GET ile çağırır.
3. 304 yanıtında normalize veya broadcast yapmaz.
4. 200 yanıtını Zod ile doğrular ve ortak observation modeline çevirir.
5. Yeni sabit pencere ölçümlerini idempotent biçimde PostgreSQL'e yazar.
6. Güncel snapshot'ı tek batch Socket.IO olayıyla yayınlar.
7. Web, React Query bootstrap sonucunu Socket.IO güncellemeleriyle uzlaştırır.
```

REST katalog çağrısı canlı sağlayıcıyı doğrudan tetiklemez; veritabanındaki son kalıcı snapshot'ı okur. Temiz kurulumda ilk poll sunucu dinlemeye başlamadan çalışır. Her Socket.IO bağlantısı/yeniden bağlantısı son snapshot ve not sorgularını geçersiz kılar; böylece kaçırılmış olaylar REST üzerinden tamamlanır.

Operatör notunda istemci Zod ile doğrulanan komutu Socket.IO üzerinden yollar. Sunucu varlığı doğrular, notu PostgreSQL'e yazar, canonical kaydı acknowledgement ile gönderdikten sonra kapsama odasına yayınlar. İstemciler yalnız canonical sunucu kaydını önbelleğe ekler.

Socket payload'ları `packages/contracts` içindeki Zod şemalarından tür türetir. Her ölçüm kendi kaynak zamanını taşır; batch zamanı ölçüm zamanı yerine kullanılmaz.

## Geçmiş Veri ve Retention

- Ham Fintraffic günlük CSV dosyaları değişmeden `.csv.gz` olarak kaynak arşivinde tutulur.
- Artifact manifest'i sağlayıcı, istasyon, tarih, checksum ve işlenme durumunu PostgreSQL'de saklar.
- Yakın dönem normalize dakika serisi yapılandırılabilir süre boyunca tutulur.
- Saatlik ve günlük özetler uzun dönem kalıcıdır.
- Yeniden işleme gerektiğinde aynı artifact ve işlem sürümü idempotent çalışır.

İlk varsayılan yakın dönem 90 gündür; retention değeri kod sabiti değil konfigürasyondur. Yıllık sorgu ham satırları taramaz, uygun toplulaştırma tablosunu seçer.

## Kavşak Türetme

OSM yol grafiği kapsama alanı bazında senkronlanıp PostGIS'e yazılır. İstasyon; mesafe, yol kimliği/numarası, bearing ve yön uyumuyla yol yaklaşımına aday olur. Eşiklerin tamamı sürümlü eşleştirme politikasıdır. Düşük güvenli eşleşme otomatik olarak kavşak durumuna katılmaz.

Kavşak kapsaması `FULL`, `PARTIAL` veya `INSUFFICIENT` olur. Kavşağın durumu yalnızca yeterli ve zaman açısından uyumlu sensör yaklaşımlarından türetilir; istasyon varlığı yaşamaya devam eder.

## Analitik ve Anomali

Analitik sorgu varlıklar, dönem, çözünürlük, metrikler, yön ve opsiyonel karşılaştırma dönemi taşır. Server dönem uzunluğuna göre dakika/saat/gün kaynağını seçer. Grafik bileşenleri haritadan bağımsızdır ve hem çalışma alanı panelinde hem `/analytics` rotasında kullanılabilir.

Anomali motoru aynı yerel haftanın günü/saat dilimi için kayan baseline kullanır. Varsayılan pencere 12 hafta, minimum örnek sayısı 6 ve aktifleşme kalıcılığı iki ardışık sapmadır; bunlar sürümlü politika değerleridir. Median/MAD tabanlı sonuç, kullanılan veri ve güven bilgisiyle saklanır.

## İstemci Durumu ve İki Yönlü Senkronizasyon

- React Query: katalog, ölçüm, geçmiş, analiz ve notların server state'i.
- URL: rota, seçili varlıklar, mod, tarih aralığı, metrik, yön ve paylaşılabilir filtreler.
- Küçük UI store'u: kamera, hover, açık panel ve geçici harita etkileşimi.
- React Hook Form + Zod: filtre ve not girişleri.

Haritada seçim URL'yi günceller; panel, tablo ve grafik aynı seçimi okur. Analiz tablosundaki “haritada göster” eylemi aynı URL sözleşmesiyle `/monitoring` rotasına gider. Nesnenin kopyası state'te tutulmaz; ID üzerinden güncel React Query/Socket.IO verisinden türetilir.

## Harita Modları ve Katmanlar

Tek bir `TrafficMap` kabuğu kullanılır. Mod tanımı görünür katmanları, gerekli yetenekleri ve yan panel slotlarını seçer; harita implementasyonunu çoğaltmaz.

MVP modları canlı, geçmiş/replay ve karşılaştırmadır. Simülasyon ancak MVP tamamlandıktan sonra yeni bir mod olarak eklenebilir. İstasyonlar, kavşaklar, notlar ve anomaliler bağımsız MapLibre source/layer bileşenleridir.

## Hata ve Bozulma Davranışı

- Fintraffic erişilemezse son bilinen veri yaşıyla gösterilir ve yeni veri uydurulmaz.
- OpenFreeMap erişilemezse trafik API'si çalışmaya devam eder; harita altlık hatası görünür olur.
- OSM senkronizasyonu başarısızsa mevcut doğrulanmış geometri korunur.
- Socket.IO koparsa bağlantı durumu gösterilir; yeniden bağlanınca REST snapshot ve kaçırılan notlar uzlaştırılır.
- Import kısmen başarısızsa checkpoint üzerinden devam eder ve tamamlanmamış aralık analizde açıkça belirtilir.
