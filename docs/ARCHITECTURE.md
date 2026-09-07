# Traffic Twin Hedef Mimarisi

## Durum ve İlkeler

Bu belge hedef mimariyi tanımlar. Aşama 6 itibarıyla Fintraffic adapter'ı, ortak contracts paketi, istasyon kataloğu, PostgreSQL/PostGIS şeması, kalıcı observation serisi, merkezi conditional polling, REST reconciliation, Socket.IO canlı batch akışı, kalıcı operatör notları, geçmiş import ve toplulaştırma, analitik/replay, OSM kavşak senkronu, kayan baseline/anomali motoru, React Query/Axios istemcisi, MapLibre çalışma alanı ve teslimat dayanıklılık durumları uygulanmıştır.

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
- `data/raw`: Fintraffic kaynak dosyaları için Git dışı yerel arşiv. Server container hâline getirildiğinde aynı yol kalıcı volume olarak bağlanacaktır.

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

Import, her istasyon ve kaynak günü için resmî CSV'yi akış hâlinde indirip `.csv.gz` olarak arşivler; SHA-256, byte boyutu, kaynak URL'si, kayıt sayıları ve işlem durumu `ingestion_artifacts` manifest'ine yazılır. Hatalı kaynak kayıtları özetlere katılmaz. Tek transaction dakika/saat/gün özetlerini artifact kökeniyle değiştirir; aynı checksum ve işlem sürümü yeniden geldiğinde sonuç çoğaltılmaz.

`traffic_observations` canlı yakın dönem serisidir. `traffic_aggregates` geçmiş dakika/saat/gün serisini tutar. Bakım komutu çalıştırıldığında varsayılan olarak canlı observation ve dakika özetlerini 90 günden sonra siler; saat ve gün özetleriyle artifact manifest'i kalır. Bu komut MVP'de zamanlanmış değildir. Sıkıştırılmış ham arşivin yaşam döngüsü veritabanından ayrıdır ve bilinçli bir arşiv politikası değişikliği olmadan otomatik silinmez.

## Kavşak Türetme

OSM `type=junction` ilişkileri kapsama alanı sınırıyla Overpass'ten alınır; relation merkezi, üye yol referansları ve OSM kaynak zamanı normalize edilip PostGIS'e yazılır. Bu ilk dilim açıkça modellenmiş OSM kavşak ilişkilerini kapsar; işaretlenmemiş sokak kesişimleri henüz türetilmez.

Fintraffic istasyonunun yol referansı sağlayıcı adından çıkarılır. Aday eşleşme aynı yol referansı, en çok 1.500 metre mesafe ve yakın nokta dışında en çok 45 derece yol ekseni farkı ister. 250 metre içindeki sensörlerde kavşak merkezi taşıt yollarının ortasında kalabildiği için bearing eleme amacıyla kullanılmaz fakat kanıt olarak saklanır. Bir sensör yalnızca en yakın uyumlu kavşağa atanır. Eşiklerin tamamı `osm-road-ref-distance-bearing-v1` politika sürümüyle kaydedilir.

Kavşak kapsaması `FULL`, `PARTIAL` veya `INSUFFICIENT` olur. En az iki sensör bütün bilinen yol referanslarını kapsıyorsa tam, en az iki sensör yalnız bir bölümünü kapsıyorsa kısmi, tek sensör varsa yetersizdir. Eşleşmeyen OSM ilişkisi izlenen trafik varlığına dönüştürülmez. Fiziksel istasyon kaydı değişmeden yaşamaya devam eder; türetilmiş kavşak ve sensör eşleşmeleri ayrı tablolardır.

## Analitik ve Anomali

Analitik sorgu en çok iki varlık, dönem, çözünürlük, metrik ve yön taşır. Server iki güne kadar dakika, 90 güne kadar saat, daha uzun aralıkta gün çözünürlüğünü otomatik seçer; istemci bunu açıkça değiştirebilir. Manifest tarihleri istenen günlerle karşılaştırılarak `COMPLETE`, `PARTIAL` veya `NO_DATA` kapsaması döndürülür. Grafik bileşeni haritadan bağımsızdır ve `/analytics` çalışma alanında kullanılır.

Replay en çok iki günlük dakika özetini yükler. Her Socket.IO bağlantısının ayrı, sunucu taraflı replay oturumu vardır; başlatma, duraklatma, sürdürme, hız değiştirme ve durdurma komutları Zod sözleşmeleriyle doğrulanır. Yayınlanan canonical kare, grafikteki referans çizgisini ve haritadaki istasyon değerlerini aynı zaman damgasıyla günceller.

Anomali motoru aynı yerel haftanın günü/saat dilimi için kayan baseline kullanır. Varsayılan pencere 12 hafta, minimum örnek sayısı 6 ve aktifleşme kalıcılığı iki ardışık sapmadır; bunlar sürümlü politika değerleridir. Median/MAD tabanlı sonuç, kullanılan veri ve güven bilgisiyle saklanır.

Canlı poll yeni observation yazdığında hız ve saatlik akış karşılaştırması çalışır. MAD sıfır veya çok küçük olduğunda anlamsız hassasiyeti önlemek için metrik bazlı minimum mutlak sapma eşiği uygulanır. Tek sapma `CANDIDATE`, zaman açısından ardışık ikinci sapma `ACTIVE` olur; normal ölçüm sayacı sıfırlar. Aynı kaynak observation yeniden işlenmez.

`anomaly_evaluations` bir event günlüğü değil, güncel durum tablosudur. İstasyon–yön–metrik–politika başına en fazla bir satır bulunur ve yeni ölçüm bu satırı günceller. Baseline örnekleri, pencere, yerel zaman dilimi, median/MAD girdileri ve politika snapshot'ı birlikte saklanır. Bu seçim açıklanabilirliği korurken dakikalık canlı akışın sınırsız satır büyütmesini engeller.

## İstemci Durumu ve İki Yönlü Senkronizasyon

- React Query: katalog, ölçüm, geçmiş, analiz ve notların server state'i.
- URL: rota, seçili varlıklar, mod, tarih aralığı, metrik, yön ve paylaşılabilir filtreler.
- Küçük UI store'u: kamera, hover, açık panel ve geçici harita etkileşimi.
- React Hook Form + Zod: filtre ve not girişleri.

Haritada seçim URL'yi günceller; panel, tablo ve grafik aynı seçimi okur. Analiz tablosundaki “haritada göster” eylemi aynı URL sözleşmesiyle `/monitoring` rotasına gider. Nesnenin kopyası state'te tutulmaz; ID üzerinden güncel React Query/Socket.IO verisinden türetilir.

Seçim detayı tek bileşen ağacı olarak geniş ekranda üçüncü kolonda, daha dar ekranlarda harita üzerinde kapatılabilir panelde gösterilir. Responsive görünüm aynı veriyi ikinci kez sorgulayan veya iki form örneği oluşturan ayrı bir mobil detay implementasyonu kullanmaz.

## Harita Modları ve Katmanlar

Tek bir `TrafficMap` kabuğu kullanılır. Mod tanımı görünür katmanları, gerekli yetenekleri ve yan panel slotlarını seçer; harita implementasyonunu çoğaltmaz.

MVP modları canlı, geçmiş/replay ve karşılaştırmadır. Simülasyon ancak MVP tamamlandıktan sonra yeni bir mod olarak eklenebilir. İstasyonlar, kavşaklar, notlar ve anomaliler bağımsız MapLibre source/layer bileşenleridir.

Harita çalışma zamanı WebGL 2'yi tercih eder, bulunmadığında WebGL 1'e geri düşer. Bu uyumluluk sözleşmesi nedeniyle MapLibre GL JS 5.x sürüm hattında tutulur; WebGL 2 zorunlu kılan bir ana sürüm yükseltmesi hedef tarayıcı desteği ayrıca değiştirilmeden yapılmaz.

## Hata ve Bozulma Davranışı

- Fintraffic erişilemezse son bilinen veri yaşıyla gösterilir ve yeni veri uydurulmaz.
- OpenFreeMap erişilemezse trafik API'si çalışmaya devam eder; harita altlık hatası görünür olur.
- OSM senkronizasyonu başarısızsa mevcut doğrulanmış geometri korunur.
- Socket.IO koparsa bağlantı durumu gösterilir; yeniden bağlanınca REST snapshot ve kaçırılan notlar uzlaştırılır.
- Import kısmen başarısızsa checkpoint üzerinden devam eder ve tamamlanmamış aralık analizde açıkça belirtilir.

İstemci, birincil istasyon kataloğu ile kavşak/anomali/not gibi ikincil sorguların hata durumlarını ayrı ele alır. İkincil servis hatası gerçek bir “0 kayıt” sonucu gibi sunulmaz ve ilgili bölüm bağımsız yeniden denenebilir. Klavye odağı görünürdür; azaltılmış hareket tercihi gereksiz animasyonları kapatır.

## Tema ve Görsel Erişilebilirlik

Açık tema varsayılandır, kullanıcı seçimi tarayıcıda kalıcıdır. `data-theme` tabanlı tek tema sözleşmesi Tailwind bileşen renklerini ve MapLibre OpenFreeMap stilini birlikte değiştirir. Harita renkleri açıklama metni ve panel etiketleriyle desteklenir; güncellik, kapsama ve anomali yalnız renkle ifade edilmez. Grafik koyu temada eksen, grid ve tooltip kontrastını ayrıca uyarlar ve erişilebilir bir seri/zaman noktası özeti taşır.
