# Traffic Twin Hedef Mimarisi

## Durum ve İlkeler

Bu belge hedef mimariyi tanımlar. Aşama 6 itibarıyla Fintraffic adapter'ı, ortak contracts paketi, istasyon kataloğu, PostgreSQL/PostGIS şeması, kalıcı observation serisi, merkezi conditional polling, REST reconciliation, Socket.IO canlı batch akışı, kalıcı operatör notları, geçmiş import ve toplulaştırma, analitik/replay, OSM kavşak senkronu, kayan baseline/anomali motoru, React Query/Axios istemcisi, MapLibre çalışma alanı ve teslimat dayanıklılık durumları uygulanmıştır. MVP sonrası dinamik Fintraffic yol olayı bağlamı ve operatör kaynaklı saha bildirimi katmanı da tamamlanmıştır.

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
        field-reports/
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
        field-reports/
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

Fintraffic adapter'ı gzip, `Digitraffic-User`, ETag/Last-Modified, bir dakikalık bulk TMS polling ve provider alanlarının normalizasyonundan sorumludur. Aynı provider sınırındaki trafik mesajı istemcisi resmî Simple JSON v2 yol çalışması ve trafik duyurusu endpoint'lerini varsayılan beş dakikalık aralıkla okur. UI Fintraffic alan adlarını bilmez. MQTT gelecekte aynı provider'ın başka bir transport implementasyonu olabilir; mevcut transport REST'tir.

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

Yol olayları sağlayıcı GeoJSON geometrisi korunarak ortak kategori, yaşam döngüsü ve önem sözleşmesine normalize edilir. Kapsama seçimi olay geometrisinin kapsama kutusuyla kesişmesine göre yapılır; istasyon kimliği veya belirli bir yol kodu sabitlenmez. Başarılı senkron kapsama alanının güncel snapshot'ını atomik olarak değiştirir ve ayrı senkron kaydı kaynak/geliş zamanını saklar. Sağlayıcı hatası mevcut gerçek snapshot'ı silmez. Kaynak önem bilgisi yoksa `UNKNOWN` kullanılır; başlık veya açıklamadan önem tahmini yapılmaz. Fintraffic'in özgün Fince metni ve kaynak dili korunur.

Ortak yol olayı sözleşmesi sağlayıcının yönünü `BOTH`, `POSITIVE`, `NEGATIVE` veya `UNKNOWN` olarak normalize eder; varsa kaynak yön açıklamasını ayrıca korur. Bildirilen etkiler, gönderen kurum, konum açıklaması ve operasyon yorumu kaynak dilinde saklanır. Harita yalnız kısa hover özetini üretir; tıklamayla açılan trafik olayı feature'ı bu alanları kalıcı ayrıntı kartında sunar.

İstasyon–olay bağlamı genel olay kataloğundan ayrı bir `TrafficEventContextService` ve repository sorumluluğudur. Repository seçili istasyon noktasıyla aktif/yaklaşan olayın nokta, çizgi veya alan geometrisi arasındaki gerçek küresel mesafeyi PostGIS `ST_DWithin`/`ST_Distance` ile hesaplar; sorgu GeoJSON'dan üretilen geography ifadesindeki GIST indeksini kullanır. Saf eşleştirme politikası istasyon yol referansı ile olay `roadNumbers` alanını karşılaştırır: aynı yol kanıtı olan olaylar en çok 5 km, diğer yakın olaylar en çok 1 km içinde kabul edilir; aynı yol önce, ardından mesafe, yaşam döngüsü ve önem sırasıyla en çok 8 sonuç döner. Eşikler ve sonuçla taşınan sürüm `station-event-context-v1` politikasında merkezidir. Yeni istasyon ve olaylar kimlik bazlı konfigürasyon olmadan aynı sorguya girer. Mesafe veya yol eşleşmesi nedensellik skoru değildir.

Operatör günlüğünde istemci Zod ile doğrulanan komutu Socket.IO üzerinden yollar. Sunucu varlığı doğrular; kategori ve operasyon durumunu PostgreSQL CHECK kısıtlarıyla da koruyarak kaydı yazar. Canonical kayıt acknowledgement ile gönderildikten sonra kapsama odasına yayınlanır; istemciler yalnız canonical sunucu kaydını önbelleğe ekler. Kategori `GENERAL`, `MAINTENANCE`, `FAULT`, `INSPECTION`; durum `INFORMATIONAL`, `ACTION_REQUIRED`, `RESOLVED` ortak sözleşmesidir. Mevcut satırlar migration ile `GENERAL`/`INFORMATIONAL` olarak korunur. Kayıtlar değiştirilemez günlük girdileridir; gelecekteki bağımsız saha bildirimi ve onun onay yaşam döngüsü bu tabloya yüklenmez.

Saha bildirimi ayrı `field-reports` bounded context'idir. Create komutu konum, kategori, önem, açıklama, kapsama ve geçici operatör adını taşır; durum taşımaz. `FieldReportService` kapsama varlığını ve koordinatın bbox içinde olduğunu doğrular, gözlem zamanını server saatinden üretir. Repository konumu SRID 4326 PostGIS `Point` olarak GIST indeksli `field_reports` tablosuna yazar. Kaynak `OPERATOR`, ilk durum `PENDING_REVIEW` veritabanı ve canonical response düzeyinde zorunludur. REST kapsama kataloğunu yükler; Socket.IO create acknowledgement ve kapsama odası broadcast'i sağlar. Authentication eklendiğinde yalnız yetkili server komutları `VERIFIED`, `REJECTED` veya `RESOLVED` geçişi yapacaktır.

Socket payload'ları `packages/contracts` içindeki Zod şemalarından tür türetir. Her ölçüm kendi kaynak zamanını taşır; batch zamanı ölçüm zamanı yerine kullanılmaz.

## Tipli API ve Hata Sınırları

`packages/contracts`, REST hata gövdesi ile Socket.IO acknowledgement hatalarının ortak `code`, `message` ve doğrulama ayrıntısı sözleşmesinin sahibidir. REST hataları ayrıca her istekte server tarafından üretilen `requestId` ve UTC `timestamp` taşır; `x-request-id` response header'ı aynı kimliği verir. Express hata middleware'i domain ve dış sağlayıcı hatalarını bu tek sözleşmeye dönüştürür. Zod doğrulama hataları alan yolu, hata kodu ve mesajı kaybedilmeden `details` içinde sunulur.

Server router'ları `params` ve `query` değerlerini ortak, generic Zod request yardımcılarıyla doğrular; `request.params` non-null assertion'ları iş kuralı katmanına taşınmaz. Socket.IO event haritaları da `packages/contracts` içinde client→server ve server→client yönleri ayrı olacak şekilde tiplenir; bu statik tipler ağ sınırındaki Zod runtime doğrulamasının yerine geçmez.

Web'deki ortak `apiClient`, her feature isteğinden bir response Zod şeması ister ve ham Axios verisini `unknown` olarak kabul eder. Başarılı gövde şemaya uymuyorsa `INVALID_API_RESPONSE`, tipli server hata gövdesi geldiyse kaynak `code`, `requestId`, `timestamp` ve ayrıntıları taşıyan `ApiError` üretilir. Feature API fonksiyonları Axios response veya type assertion ile uğraşmaz; yalnız doğrulanmış domain sonucunu döndürür. Yeni HTTP fiilleri ancak gerçek bir feature ihtiyacı oluştuğunda bu istemciye eklenir.

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

Canlı trafik akış durumu, anomali motorundan ayrı bir telemetry politikasıdır. Fintraffic'in yön bazlı kayan beş dakikalık serbest-akış ve kapasite yüzdeleri ortak sözleşmeye normalize edilir; `VVAPAAS1/2` ile `MS1/2` sabitleri kaynak açıklaması için istasyon-yön profili olarak saklanır. Hız yüzdesi `0–<10` durma noktasında, `10–<25` kuyruklanma, `25–<75` yavaş, `75–<90` yoğun akış ve `90+` akıcı olarak `fintraffic-flow-v1` politikasıyla sınıflanır. Sağlayıcı oranı bulunmadığında oran gerçek hız ve istasyon referansından hesaplanır; ikisi de yoksa sabit bölgesel eşik uygulanmaz ve sonuç `INSUFFICIENT_DATA` olur. Canlı gözlem, sağlayıcının hesapladığı yüzdeleri kendi kaynak zamanıyla sakladığı için REST reconciliation aynı açıklanabilir durumu yeniden kurabilir.

Fintraffic station bearing'i yol kayıt sisteminin artan yönünü tanımlar. Provider adapter'ı bu değeri Yön 1 için kaynak heading, Yön 2 için 180 derece karşı heading olarak ortak `degrees`, `compassPoint` ve `determination` sözleşmesine dönüştürür. Yerelleştirilmiş uzun/kısa yön adları API'de saklanmaz; web sunum katmanındaki tek formatter tarafından üretilir. Bearing yoksa heading `null` kalır ve arayüz yön bilgisi uydurmaz.

Analitik sorgu en çok iki varlık, dönem, çözünürlük, metrik ve yön taşır. Kullanıcı arayüzündeki başlangıç ve bitiş takvim günleri dahildir; web bu seçimi kapsama alanı saat diliminde API'nin yarı açık `[from, to)` UTC aralığına dönüştürür. Böylece aynı gün başlangıç/bitiş olarak seçilebilir ve veritabanı sınırında çift sayım oluşmaz. Server iki güne kadar dakika, 90 güne kadar saat, daha uzun aralıkta gün çözünürlüğünü otomatik seçer; istemci bunu açıkça değiştirebilir. Manifest tarihleri istenen günlerle karşılaştırılarak `COMPLETE`, `PARTIAL` veya `NO_DATA` kapsaması döndürülür. Grafik bileşeni haritadan bağımsızdır ve `/monitoring?mode=analysis` içindeki yerleştirilebilir analiz panelinde kullanılır. `/analytics` yalnız eski filtreli bağlantıları bu moda taşıyan uyumluluk rotasıdır.

URL'deki analiz filtreleri istemci sınırında doğrulanır. Geçersiz metrik, çözünürlük, yön, tarih veya karşılaştırma istasyonu güvenli varsayılana döner ve kullanıcıya hangi filtrenin uygulanmadığı bildirilir. Formun Zod doğrulaması her iki tarih alanının hatasını ayrı gösterir; native HTML doğrulaması submit akışını React Hook Form'dan önce sessizce kesmez.

Aynı geçmiş yanıtındaki dönem özeti UI'da ham seriden yeniden hesaplanmaz. Server seçilen çözünürlüğün canonical agregalarından örnek sayısıyla ağırlıklı ortalama hızı, zaman dilimi ortalamalarının medyanını, minimum/maksimum hızı, toplam ve tepe araç sayısını üretir. Yön dağılımı için iki yön aynı sorgu aralığında okunur; seçili yön grafiği değişmeden kalır. Ölçüm yoksa sıfır hız gibi tahminî değer yerine nullable metrik ve `Yetersiz veri` durumu döner.

`GET /api/analytics/:coverageAreaId/availability`, başarıyla işlenmiş ve geçerli kayıt içeren ingestion artifact manifestlerinden istasyon başına gerçek tarih listesini üretir. İstemci bu sözleşmeyle geçmişi olan istasyonları öne alır, karşılaştırma varlıklarının ortak günlerini hesaplar ve verisiz sorguda en son çalışabilir günü önerir. Liste UI kodunda sabitlenmez; yeni import tamamlandığında React Query yenilemesiyle genişler.

Replay en çok iki günlük dakika özetini yükler. Her Socket.IO bağlantısının ayrı, sunucu taraflı replay oturumu vardır; başlatma, duraklatma, sürdürme, hız değiştirme, zaman imlecini taşıma ve durdurma komutları Zod sözleşmeleriyle doğrulanır. Seek komutu istenen UTC zamanına en yakın gerçek kareyi yayınlar; eksik dakikayı sentetik veriyle doldurmaz. Yayınlanan canonical kare, grafikteki referans çizgisini ve haritadaki seçili yön ölçümlerini aynı zaman damgasıyla günceller; diğer yönler canlı veriyle karıştırılmaz.

Anomali motoru aynı yerel haftanın günü/saat dilimi için kayan baseline kullanır. Varsayılan pencere 12 hafta, minimum örnek sayısı 6 ve aktifleşme kalıcılığı iki ardışık sapmadır; bunlar sürümlü politika değerleridir. Median/MAD tabanlı sonuç, kullanılan veri ve güven bilgisiyle saklanır.

Canlı poll yeni observation yazdığında hız ve saatlik akış karşılaştırması çalışır. MAD sıfır veya çok küçük olduğunda anlamsız hassasiyeti önlemek için metrik bazlı minimum mutlak sapma eşiği uygulanır. Tek sapma `CANDIDATE`, zaman açısından ardışık ikinci sapma `ACTIVE` olur; normal ölçüm sayacı sıfırlar. Aynı kaynak observation yeniden işlenmez.

`anomaly_evaluations` bir event günlüğü değil, güncel durum tablosudur. İstasyon–yön–metrik–politika başına en fazla bir satır bulunur ve yeni ölçüm bu satırı günceller. Baseline örnekleri, pencere, yerel zaman dilimi, median/MAD girdileri ve politika snapshot'ı birlikte saklanır. Bu seçim açıklanabilirliği korurken dakikalık canlı akışın sınırsız satır büyütmesini engeller.

## İstemci Durumu ve İki Yönlü Senkronizasyon

- React Query: katalog, ölçüm, geçmiş, analiz ve notların server state'i.
- URL: rota, seçili varlıklar, mod, tarih aralığı, metrik, yön ve paylaşılabilir filtreler.
- Küçük UI store'u: kamera, hover, açık panel ve geçici harita etkileşimi.
- React Hook Form + Zod: filtre ve not girişleri.

Haritada veya varlık çubuğunda seçim URL'yi günceller; detay paneli ve analiz grafiği aynı seçimi okur. Canlı/Analiz geçişi `mode` parametresini değiştirir, seçimi ve analiz filtrelerini kaybetmez. Nesnenin kopyası state'te tutulmaz; ID üzerinden güncel React Query/Socket.IO verisinden türetilir.

Saha bildirimi kataloğunun sahibi React Query, seçili kalıcı bildirimin sahibi `report` URL parametresidir. Kaydedilmemiş konum ve oluşturma aracının açık/kapalı durumu geçici çalışma alanı state'idir; URL'ye veya server cache'ine yazılmaz. `FieldReportComposer`, detay kartı ve veri hook'u harita kabuğundan bağımsızdır; gelecekte ayrı rota aynı feature API'sini kullanabilir.

İstasyon ve kavşak kataloğu, harita alanını daraltan kalıcı listeler yerine çalışma alanının üstündeki tek varlık seçim çubuğundan açılır. Çubuk tür geçişi, ad/TMS/yol araması ve kaydırılabilir sonuç görünümü sağlar; seçim yine aynı URL sözleşmesini kullanır. Birleşik gezinme bileşeni `traffic-workspace` içinde kalır, istasyon ve kavşak feature'larının veri sorumluluğunu üstlenmez.

Seçim detayı tek bileşen ağacı olarak geniş ekranda üçüncü kolonda, daha dar ekranlarda harita üzerinde kapatılabilir panelde gösterilir. Responsive görünüm aynı veriyi ikinci kez sorgulayan veya iki form örneği oluşturan ayrı bir mobil detay implementasyonu kullanmaz.

## Harita Modları ve Katmanlar

Tek bir `TrafficMap` kabuğu kullanılır. Mod tanımı görünür katmanları, gerekli yetenekleri ve yan panel slotlarını seçer; harita implementasyonunu çoğaltmaz.

MVP modları canlı, geçmiş/replay ve karşılaştırmadır. Simülasyon ancak MVP tamamlandıktan sonra yeni bir mod olarak eklenebilir. İstasyonlar, kavşaklar, notlar, anomaliler ve yol olayları bağımsız MapLibre source/layer bileşenleridir.

Saha bildirimleri de resmî yol olaylarından ayrı source/layer kullanır. Harita yalnız nokta seçimini callback olarak dışarı verir ve canonical bildirimleri çizer; form doğrulaması, Socket.IO komutu veya onay politikası `traffic-map` içine yerleştirilmez. Konum seçme aracı açıkken tıklama varlık seçimi üretmez. Reddedilmiş ve çözülmüş kayıtlar canlı katmanda çizilmez; `PENDING_REVIEW` kayıtlar operatör kaynağı ve onay durumu açık biçimde, doğrulanmış kayıttan farklı renkte sunulur.

Yol çalışmaları ve trafik duyuruları aynı canonical olay kaynağından ayrı görünürlük filtreleriyle çizilir. Nokta, çizgi ve alan GeoJSON geometrileri kaybedilmez; aktif ve yaklaşan durumlar sunumda ayrıştırılır, sona eren olaylar canlı katmanda gösterilmez. Olay kataloğunun sahibi React Query, paylaşılabilir filtrelerin sahibi URL'dir. Olay tıklaması kaynak metnini ve zaman bilgisini açar, fakat istasyon seçimini değiştirmez.

Olay arama/filtre sözleşmesi `traffic-events` feature'ında Zod ile URL'den okunur; küçük canlı katalog üzerinde saf istemci fonksiyonuyla uygulanır. Olay gezgini liste ve filtre sunumunun, `TrafficMap` ise yalnız geometri çizimi, harita odağı ve seçim olayının sahibidir. Seçili olay kimliği URL üzerinden iki bileşeni senkronlar. Sunucu taraflı query servisi ancak sayfalama veya büyük katalog gibi ikinci bir somut ihtiyaç oluştuğunda eklenecektir.

Seçili istasyonun trafik olayı bağlamı ayrı React Query sorgusudur; bu ikincil sorgunun yüklenme ve hata durumu istasyon detayını çökertmez. Bağlam sonucu olay nesnesini istemci state'ine kopyalamaz. Kart seçimi canonical olay kimliğini URL'ye yazar ve mevcut olay–harita akışını kullanarak gerçek geometriye odaklanır.

Olay kataloğunun `FRESH`, `STALE` ve `UNAVAILABLE` kaynak durumu server saatine ve son başarılı `fetchedAt` değerine göre üretilir. Güncellik eşiği yapılandırılmış trafik olayı poll aralığının iki katıdır; UI bu eşik veya sağlayıcı ayrıntısını yeniden hesaplamaz. `STALE` sonuç son gerçek snapshot'ı ve özgün kaynak zamanlarını korur.

Harita kabuğundaki geçici görselleştirme seçimi ürün modundan ayrıdır: `Isı haritası`, `Yol akışı` ve `3B hacim` aynı canonical canlı istasyon verisini farklı MapLibre katmanlarıyla sunar. Isı ağırlığı iki yönün toplam araç/saat değeridir. 3B sütun yüksekliği, görünür katalogdaki en yüksek gerçek hacme göre ölçeklenen sunum değeridir; fiziksel yükseklik veya yeni bir ölçüm değildir. Eksik hacme sahip istasyon ısı/3B hesabına katılmaz. Seçili bir istasyon bağlamında yol akışı varsayılan görünür; böylece istasyon noktası ile ölçülen yol ilişkisi doğrudan anlaşılır.

Seçili istasyonun yol akışı, server'ın Fintraffic istasyon adından çıkardığı yol referansı ile istasyonun 120 metre çevresindeki gerçek OSM `highway` geometrilerini eşleştirmesiyle üretilir. Oneway çizgi yönü Fintraffic bearing değerine göre Yön 1/Yön 2 ile ilişkilendirilir; politika `osm-ref-nearest-bearing-v1` olarak response içinde taşınır. Yönler istasyon kimliğine bağlı UI koşullarıyla değil, response içindeki yön alanıyla mavi/mor kenar ve yol üzeri etiketlere dönüştürülür; iç çizgi rengi hız durumunu, kalınlık araç/saat değerini korur.

Başarılı Overpass sonucu `station_road_contexts` tablosunda son doğrulanmış snapshot olarak saklanır ve server belleğinde 24 saat önbelleğe alınır. Süresi dolan kayıt yenilenemezse kaynak zamanı değiştirilmeden `STALE` olarak sunulur; beş dakikalık geri çekilme aynı dış hatanın istek başına tekrarlanmasını engeller. React Query `FRESH` sonuçta 24 saat, `STALE` sonuçta beş dakika sonra yeniden doğrulama yapar. Kalıcı sonuç yoksa upstream hatası `502` olarak döner. Eşleşme veya kaynak yoksa yaklaşık çizgi üretilmez; istasyon noktası ve ölçümleri çalışmayı sürdürür.

Harita çalışma zamanı WebGL 2'yi tercih eder, bulunmadığında WebGL 1'e geri düşer. Bu uyumluluk sözleşmesi nedeniyle MapLibre GL JS 5.x sürüm hattında tutulur; WebGL 2 zorunlu kılan bir ana sürüm yükseltmesi hedef tarayıcı desteği ayrıca değiştirilmeden yapılmaz.

## Hata ve Bozulma Davranışı

- Fintraffic erişilemezse son bilinen veri yaşıyla gösterilir ve yeni veri uydurulmaz.
- Trafik mesajı senkronu başarısızsa son gerçek olay snapshot'ı korunur; hata istasyon kataloğunu veya haritayı çökertmez.
- Son başarılı trafik olayı senkronu güncellik eşiğini aşarsa katman `Son geçerli veri` ve kaynak zamanını görünür sunar; hiç başarılı senkron yoksa boş sonuç güncelmiş gibi gösterilmez.
- OpenFreeMap erişilemezse trafik API'si çalışmaya devam eder; harita altlık hatası görünür olur.
- Overpass yenilemesi başarısızsa son doğrulanmış yol bağlamı kaynak zamanı ve `STALE` işaretiyle sunulur; kalıcı sonuç yoksa ikincil istek `502` döner.
- OSM senkronizasyonu başarısızsa mevcut doğrulanmış geometri korunur.
- Socket.IO koparsa bağlantı durumu gösterilir; yeniden bağlanınca REST snapshot ve kaçırılan notlar uzlaştırılır.
- Import kısmen başarısızsa checkpoint üzerinden devam eder ve tamamlanmamış aralık analizde açıkça belirtilir.

İstemci, birincil istasyon kataloğu ile kavşak/anomali/not gibi ikincil sorguların hata durumlarını ayrı ele alır. İkincil servis hatası gerçek bir “0 kayıt” sonucu gibi sunulmaz ve ilgili bölüm bağımsız yeniden denenebilir. Klavye odağı görünürdür; azaltılmış hareket tercihi gereksiz animasyonları kapatır.

İstasyon güncelliği ölçüm zamanından hesaplanır: en çok 5 dakika `FRESH`, 5–15 dakika `STALE`, 15 dakikadan eski `OUTDATED`, ölçüm bulunmaması `UNAVAILABLE` durumudur. Kaynak bağlantısının genel durumu bu istasyon bazlı sınıflandırmanın yerine geçmez. Trafik akışı son 5 dakikalık kayan pencerenin saatlik geçiş oranıdır; kullanıcı arayüzünde son 5 dakikada geçen mutlak araç sayısı gibi sunulmaz.

## Tema ve Görsel Erişilebilirlik

Açık tema varsayılandır, kullanıcı seçimi tarayıcıda kalıcıdır. `data-theme` tabanlı tek tema sözleşmesi Tailwind bileşen renklerini ve MapLibre OpenFreeMap stilini birlikte değiştirir. Harita renkleri açıklama metni ve panel etiketleriyle desteklenir; güncellik, kapsama ve anomali yalnız renkle ifade edilmez. Grafik koyu temada eksen, grid ve tooltip kontrastını ayrıca uyarlar ve erişilebilir bir seri/zaman noktası özeti taşır.
