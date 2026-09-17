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
- [x] Tek harita çalışma alanında URL tabanlı Analiz modu ve ortak grafik bileşeni
- [x] Varlık karşılaştırması
- [x] Socket.IO replay oturumu ve senkron zaman imleci

Çıkış kriteri: **Tamamlandı.** Fintraffic'in 3 Eylül 2026 tarihli iki gerçek TMS artifact'i checksum ve kaynak kökeniyle arşivlendi; 95.206 geçerli araç kaydı 5.104 dakika, 96 saat ve 4 gün özetine dönüştürüldü. `/monitoring?mode=analysis` gün/ay/yıl/özel aralık, metrik, yön ve otomatik çözünürlük filtrelerini URL'de taşır; kalıcı haritayı korurken iki istasyonu aynı grafikte karşılaştırır ve eksik günleri açıkça gösterir. Eski `/analytics` bağlantıları filtre kaybetmeden bu moda yönlenir. Yakın dönem dakika serisi Socket.IO üzerinden oynatılabilir, durdurulabilir, hızı değiştirilebilir ve zaman çizelgesinden en yakın gerçek kareye götürülebilir; grafik ile harita canonical replay karesini kullanır.

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

- [x] Hata, loading, empty, stale ve yetersiz veri durumları
- [x] Erişilebilirlik ve açık/koyu tema kontrolü
- [x] Tam lint, typecheck, test ve production build
- [x] README kurulum ve çalışma adımlarının gerçek komutlarla güncellenmesi
- [x] `kararlar.md`, mimari ve demo senaryosunun güncellenmesi
- [x] Yaklaşık 10 dakikalık demo hazırlığı

Doğrulama kanıtı: Kilitli pnpm kurulumu tekrarlandı; boş PostgreSQL/PostGIS 3.5 veritabanında 17 commitli migration ve 17 public tablo doğrulandı. Güncel doğrulamada format, lint, strict typecheck, 167 unit/component testi, 13 gerçek PostgreSQL/PostGIS/Socket.IO entegrasyon testi ve Next.js/Express production build'i başarıyla tamamlandı. Gerçek canlı katalog ile 76 istasyon, 5 türetilmiş kavşak, gerçek OSM yol akışı, 3B hacim, yol olayları, istasyon–olay bağlamı ve geçmiş analiz çalışma alanı kontrol edildi.

Çıkış kriteri: **Tamamlandı.** Temiz kurulumdan çalışan demo üretilebilir ve brief'in bütün zorunlu maddeleri `docs/DEMO.md` akışında kanıtlanabilir.

## MVP Sonrası Adaylar

### Analiz kullanılabilirliği iyileştirmesi

- [x] Gerçek ingestion manifestinden istasyon ve tarih kullanılabilirliği API'si
- [x] Geçmişi olan istasyonları öne çıkaran seçim etiketleri
- [x] Karşılaştırma için ortak gün hesabı ve en son verili gün eylemi
- [x] Verisiz sorguda gerçek verili istasyon önerileri

### Açıklanabilir dönem özeti

- [x] Canonical agregalardan sunucu taraflı KPI hesabı
- [x] Ağırlıklı ortalama/medyan hız, toplam geçiş ve yoğun zaman dilimi
- [x] İki yönlü hacim dağılımı ve kullanılan örnek sayısı
- [x] Yetersiz veri halinde nullable sözleşme ve açık kullanıcı durumu

### Yol ve yoğunluk görselleştirmesi

- [x] Gerçek araç/saat ölçümlü MapLibre ısı katmanı
- [x] Göreli ölçekli ve açıklamalı 3B hacim sütunları
- [x] Seçili istasyon için yol referanslı gerçek OSM geometrisi
- [x] Fintraffic bearing ile yön eşleştirme ve yol üzeri akış okları
- [x] Yön başına dinamik derece/pusula kimliği ve ortak detay–analiz–replay–harita sunumu
- [x] OSM başarısızlık/no-match durumunda ölçümü koruyan bozulma davranışı

### İstasyona göre normalize canlı akış

- [x] Fintraffic yön bazlı serbest-akış ve kapasite oranlarının normalize edilmesi
- [x] Mevsimsel `VVAPAAS1/2` ve `MS1/2` sabitlerinin istasyon-yön profili olarak kalıcılığı
- [x] Sürümlü ve açıklanabilir akış sınıflandırması; eksik girdide `INSUFFICIENT_DATA`
- [x] İstasyon kartı ile gerçek OSM yol katmanında aynı akış durumunun gösterimi

### Dinamik yol olayı bağlamı

- [x] Resmî Fintraffic yol çalışması ve trafik duyurusu istemcisi
- [x] GeoJSON geometri, kaynak zamanı, yaşam döngüsü ve önem normalizasyonu
- [x] Helsinki geometrik kapsama süzmesi ve kalıcı güncel snapshot
- [x] Bağımsız MapLibre katman anahtarları, olay özeti ve bozulma davranışı
- [x] Yön, bildirilen etkiler ve gönderen kurumun kayıpsız normalizasyonu
- [x] Kısa hover özeti ve tıklamayla açılan kalıcı ayrıntı kartı

Doğrulama kanıtı: 14 Eylül 2026 canlı sağlayıcı senkronunda Helsinki kapsama alanıyla kesişen 51 gerçek olay (49 yol çalışması, 2 trafik duyurusu) alındı; 45 aktif ve 6 yaklaşan durum ortak sözleşmeye dönüştürüldü. Harita, kategori anahtarları ve bağımsız ikincil sorgu davranışı tarayıcıda doğrulandı. Olay katmanı yoğunluk veya anomali için neden-sonuç iddiası üretmez.

### OSM yol bağlamı dayanıklılığı

- [x] Son doğrulanmış istasyon yol geometrisinin PostgreSQL'de kalıcılığı
- [x] Başarısız yenilemede kaynak zamanını koruyan `STALE` fallback
- [x] Beş dakikalık başarısız yenileme geri çekilmesi
- [x] Upstream HTTP/ağ hatası ayrımı ve görünür sunucu logu
- [x] `FRESH`/`STALE` durumuna göre React Query yeniden doğrulaması

### Trafik olayı kaynak güncelliği

- [x] Son başarılı senkron zamanından sunucu taraflı `FRESH`/`STALE`/`UNAVAILABLE` sınıflandırması
- [x] Poll aralığına bağlı dinamik güncellik eşiği
- [x] Harita katman kontrolünde son başarılı zaman ve açık bozulma durumu
- [x] Sözleşme, servis ve kullanıcı arayüzü testleri

### Trafik olayı gezgini

- [x] Kaynak metni ve yol numarası araması
- [x] Kategori, yaşam döngüsü ve etki düzeyi filtreleri
- [x] URL tabanlı filtre ve olay seçimi
- [x] Listeden gerçek geometriye harita odağı ve ayrıntı kartı
- [x] Harita çizimi ile olay keşfi sorumluluklarının feature sınırında ayrılması

### İstasyon–trafik olayı operasyon bağlamı

- [x] İstasyon noktası ile gerçek olay geometrisi arasında PostGIS mesafe hesabı
- [x] Dinamik yol numarası eşleşmesi ve sürümlü aynı-yol/yakın-çevre politikası
- [x] Ayrı bağlam servisi, repository ve REST sözleşmesi
- [x] İstasyon detayından URL ile senkron gerçek olay geometrisi seçimi
- [x] Yakınlığın nedensellik olmadığını belirten açık kanıt sunumu
- [x] Saf eşleştirme, servis, sözleşme, UI ve gerçek PostGIS entegrasyon testleri

Doğrulama kanıtı: TMS 20002 canlı doğrulamasında kimlik eşleştirmesi olmadan aynı Yol 1 üzerinde 0 m ve 1,3 km, yakın çevrede Yol 50 üzerinde 478 m uzaklıkta üç gerçek olay bulundu. Bağlam kartı seçimi canonical olay kimliğini URL'ye taşıdı ve mevcut harita olay seçimiyle birleştirildi. `0 m`, istasyon noktasının olay geometrisi üzerinde bulunmasını ifade eder; üretilmiş ölçüm değildir.

### Varlık operasyon günlüğü

- [x] Operatör notunda bakım, arıza, kontrol ve genel not kategorileri
- [x] Bilgi, işlem gerekli ve çözüldü operasyon durumları
- [x] Ortak Zod/TypeScript, Socket.IO ve PostgreSQL kısıtlarının aynı sözleşmeye bağlanması
- [x] Eski kayıtları `Genel not / Bilgi` olarak koruyan migration
- [x] Form seçimi, canonical broadcast ve liste etiketleri için testler

Bağımsız harita konumuna bırakılan saha bildirimi, operatör günlüğü tablosuna yüklenmeden ayrı bir feature olarak uygulanmıştır.

### Operatör saha bildirimi

- [x] Aynı MapLibre çalışma alanında açık araçla serbest nokta seçimi
- [x] Kaza, yoğunluk, yol/sinyal/sensör sorunları için tipli kategori ve önem sözleşmesi
- [x] Kapsama bbox doğrulaması ve server tarafından zorunlu `PENDING_REVIEW` ataması
- [x] SRID 4326 PostGIS Point kalıcılığı ve GIST konum indeksi
- [x] REST reconciliation ile Socket.IO create acknowledgement/broadcast akışı
- [x] Resmî Fintraffic olaylarından bağımsız, kaynak ve onay durumu görünür harita katmanı
- [x] URL tabanlı kayıt seçimi; yalnız istemcide tutulan kaydedilmemiş konum
- [x] Contract, servis, form, harita verisi ve gerçek PostgreSQL/iki istemci testleri

Admin doğrulama komutları ve ayrı saha bildirimi yönetim sayfası authentication sonrasına planlanmıştır. Mevcut `field-reports` feature'ı harita kabuğundan ayrıldığı için form, katalog ve detay bileşenleri yeni rotada tekrar kullanılabilir.

### Dinamik geçmiş veri kapsamı — Tamamlandı

- [x] İstasyon ve dahil tarih aralığı için ortak Zod/TypeScript plan sözleşmesi
- [x] Kalıcı artifact manifestinden kullanılabilir, eksik, başarısız, indirilmiş ve geçerli verisiz günleri ayıran planlama servisi
- [x] Kapsama alanı ve varlık sınırını doğrulayan salt-okunur REST endpoint'i
- [x] Sözleşme, servis, HTTP ve gerçek PostgreSQL manifest sorgusu testleri
- [x] Eksik günleri kalıcı iş olarak sıraya alma ve kontrollü worker yürütmesi
- [x] İş ilerlemesi, yeniden deneme ve sunucu yeniden başlamasında uzlaşma
- [x] Analiz ekranında açık kullanıcı onayıyla import başlatma ve ilerleme gösterimi

Plan ve analiz sorguları sağlayıcı indirmesini kendiliğinden başlatmaz. Kullanıcı açıkça onay verdiğinde yalnız `MISSING`, `FAILED` veya `PENDING_PROCESSING` günleri kalıcı işe alınır. Bugün ve gelecek günler kapsama alanının yerel tarihine göre `NOT_YET_AVAILABLE` kalır. Tek worker işi gün gün yürütür; süreç kesilirse `RUNNING` iş başlangıçta güvenli biçimde yeniden kuyruğa alınır. Gerçek Fintraffic uçtan uca denemesinde TMS 20002 için 2 Eylül 2026 işi tamamlanmış, manifest ve analiz kapsamı `AVAILABLE`/`COMPLETE` durumuna geçmiştir.

Yalnızca Aşama 6 tamamlandıktan ve kalan zaman değerlendirildikten sonra:

1. LLM destekli yönetici raporu
2. Trafik senaryosu/simülasyon modu
3. Yeni gerçek veri sağlayıcısı
4. Kapsama alanı yönetim ekranı
5. PDF raporu ve zamanlanmış raporlar
6. İnternete açık demo ve CI/CD
