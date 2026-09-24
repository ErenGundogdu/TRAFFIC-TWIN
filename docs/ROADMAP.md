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

Doğrulama kanıtı: Kilitli pnpm kurulumu tekrarlandı; boş PostgreSQL/PostGIS 3.5 veritabanında 17 commitli migration ve 17 public tablo doğrulandı. Güncel doğrulamada format, lint, strict typecheck, 176 unit/component testi, 13 gerçek PostgreSQL/PostGIS/Socket.IO entegrasyon testi ve Next.js/Express production build'i başarıyla tamamlandı. Gerçek canlı katalog ile 76 istasyon, 5 türetilmiş kavşak, gerçek OSM yol akışı, 3B hacim, yol olayları, istasyon–olay bağlamı ve geçmiş analiz çalışma alanı kontrol edildi.

Çıkış kriteri: **Tamamlandı.** Temiz kurulumdan çalışan demo üretilebilir ve brief'in bütün zorunlu maddeleri `docs/DEMO.md` akışında kanıtlanabilir.

## MVP Sonrası Adaylar

### Çalışma alanı arayüz yenilemesi — Tamamlandı

- [x] Dinamik yön ve tazelik işaretleriyle modern MapLibre varlık katmanları
- [x] Zoom düzeyine göre genelleşen semantik istasyon, kavşak, olay ve saha bildirimi ikon sistemi
- [x] Katman, veri tazeliği ve trafik durumunu birlikte yöneten dinamik harita filtresi
- [x] Sekmeli, sorumluluklarına ayrılmış istasyon detay paneli
- [x] Aynı haritayı koruyan URL tabanlı Analiz çalışma alanı ve KPI sunumu
- [x] Ayrı Replay çalışma modu, gerçek zaman çizelgesi ve canonical harita–grafik senkronu
- [x] Replay başlamadan canlı ölçümlerin gizlenmesi
- [x] Tarihsel snapshot'ı bulunmayan güncel olay, anomali ve saha bildirimi katmanlarının Replay'den ayrılması

Çıkış kriteri: **Tamamlandı.** Canlı, Analiz ve Replay aynı varlık/URL sözleşmesini kullanır; feature public API sınırları korunur. TMS 20002 ve TMS 20004'ün gerçek 3 Eylül 2026 dakika serisiyle Replay başlatma, zaman çizelgesi, harita ölçümü ve grafik referans çizgisi tarayıcıda birlikte doğrulanmıştır.

### Analiz kullanılabilirliği iyileştirmesi

- [x] Gerçek ingestion manifestinden istasyon ve tarih kullanılabilirliği API'si
- [x] Geçmişi olan istasyonları öne çıkaran seçim etiketleri
- [x] Karşılaştırma için ortak gün hesabı ve en son verili gün eylemi
- [x] Verisiz sorguda gerçek verili istasyon önerileri

### Açıklanabilir dönem özeti

- [x] Canonical agregalardan sunucu taraflı KPI hesabı
- [x] Ağırlıklı ortalama/medyan hız, toplam geçiş ve yoğun zaman dilimi
- [x] İki yönlü hacim dağılımı ve kullanılan örnek sayısı
- [x] Aynı dönem istasyon farklarını mutlak değer ve yüzdeyle açıklayan karşılaştırma kartı
- [x] Gerçek dakika/saat agregalarından gün–saat zaman deseni matrisi
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

### Kademeli geçmiş saklama ve otomatik kapsama — Devam ediyor

- [x] Çözünürlük bazlı gerçek aggregate kapsama envanteri
- [x] Son 7 gün dakika, son 2 yıl saat ve son 5 yıl gün saklama politikası
- [x] Kaynak gününün yaşına göre yalnız gerekli çözünürlükleri üreten parser akışı
- [x] Süresi dolan çözünürlükleri artifact bütünlüğünü bozmadan temizleyen retention servisi
- [x] Kullanıcı işlerini otomatik kapsama işlerinden önce çalıştıran amaç ve öncelik kuyruğu
- [ ] Kapsama alanı profili ve yeni istasyonları elle eşleştirmeden bulan zamanlayıcı
- [ ] Sağlayıcıyı ve yerel depolamayı koruyan hız/batch sınırı
- [x] Başarılı ve gerekli aggregate kapsamı doğrulanmış ham `.csv.gz` dosyaları için 14 günlük yaşam döngüsü
- [ ] Çözünürlük bazlı kapsam ve arka plan ilerlemesi kullanıcı görünümü

Otomatik kapsama, sağlayıcı ve disk için hız/batch sınırı tamamlanmadan etkinleştirilmez. Mevcut gerçek artifact örnekleminde ortalama dosya boyutu yaklaşık 606 KB olduğundan bütün istasyonların beş yıllık ham arşivi yaklaşık 84 GB'a ulaşabilir. Ham dosya varsayılan 14 günlük yeniden işleme penceresinden sonra yalnız `PROCESSED` artifact ve yaşına göre gerekli `AVAILABLE` aggregate çözünürlükleri doğrulandığında silinebilir. Manifest, checksum ve özetler korunur; başarısız/işlenmemiş artifact, eksik kapsam veya arşiv kökü dışındaki yol silinmez.

### Resmî uzun dönem TMS istatistik kapsamı — Kademeli aktarım sürüyor

- [x] Fintraffic Statistics saatlik/günlük hız ve hacim raporu istemcisi
- [x] Finlandiya yerel zamanını UTC'ye dönüştüren doğrulanmış CSV parser'ları
- [x] Düzeltilmiş hacim ile hız örnek sayısını ayıran idempotent PostgreSQL tabloları
- [x] Tek istasyon ve kapsamadaki tüm istasyonlar için parçalı CLI akışı
- [x] Mevcut analiz serisi, dönem özeti ve kullanılabilirlik sorgularına entegrasyon
- [x] Gerçek PostgreSQL üzerinde tekrar yazma ve analiz okuma testi
- [x] Araç sınıfı 1–9 sunumu, şerit ve şerit×sınıf kompozisyonu
- [x] Kanıt eşiği sağlandığında canlı lane–yön eşleşmesi
- [x] Kanıt oluşmamış istasyonlarda resmî şerit sayısından (kaista1/kaista2) ikincil, düşük öncelikli lane–yön ataması
- [x] Aynı yöndeki güncel şerit hızlarını ve geçiş oranlarını birlikte özetleyen, ölçüm kanıtlı dengesizlik ipucu
- [x] Çok günlük şerit geçmişi yeterli olduğunda aynı gün/saat ortanca aralığına göre hız ve geçiş bağlamı; kapsam eksikse örnek sayısıyla açık yetersiz veri durumu
- [ ] Canlı veri setinde değerlendirmeyi etkinleştirecek en az altı benzer saatlik gerçek şerit kapsamı
- [x] Doğrulanmış aynı koridor istasyonlarında eşzamanlı ölçümlerle yerel etkinin devam edip etmediğini gösterme
- [x] TMS 20002 ve TMS 20004 için Ağustos 2026 saatlik/günlük pilot aktarımı ve iki istasyonlu analiz doğrulaması
- [x] `429`/geçici hata yeniden denemesi, düşük istek temposu ve `Retry-After` uyumu
- [x] İstasyon–yön–tarih parçası bazında kalıcı checkpoint ve kesinti sonrası atlama
- [x] Deterministik `--limit` partileri ve istasyon bazında hata izolasyonu
- [x] Yerel saat dilimine göre kayan beş yıllık günlük / iki yıllık saatlik CLI penceresi ve sabit takvim parçası checkpoint'i
- [x] Seçili metrik/yön için kaynakta boş gün, aktarılmamış gün ve nedeni doğrulanamayan dakikalık gün ayrımı
- [x] Sağlayıcının çoklu istasyon raporunu kontrollü batch ile ayrıştırma ve kaynak hesaplama hatasını istasyon/tarih aralığına izole etme
- [x] Başarısız hız veya hacim aralığını kalıcı günlüğe alıp analizde `SOURCE_ERROR` olarak ayırma
- [x] İki istasyonda 365 günlük karşılaştırma ve ilk beş katalog istasyonunda Ağustos günlük aktarımı
- [x] Açık ayın resmî günlük hız/hacim raporlarını sunucu açılışında ve günlük aralıkla idempotent yenileme
- [x] Önceki ayı üçüncü yerel günden itibaren kesinleştirme ve analiz sorgularını periyodik yenileme
- [ ] Saatlik iki yıl ve günlük beş yıl verisinin kontrollü toplu aktarımı
- [ ] Aktarım sonrası istasyon/tarih kapsamı ve disk maliyeti doğrulaması

Statistics yolu genel uzun dönem hız/hacim analizi içindir; araç sınıfı ve şerit ayrıntısı sağlamaz. Bu ayrıntılar yalnız ihtiyaç duyulan tarih ve istasyonların ham geçiş dosyalarından üretilir. 21 Eylül 2026 pilotunda TMS 20002'nin 3 Eylül 2026 günü ile TMS 20002/20004'ün Ağustos 2026 dönemi aktarıldı: her iki istasyon için Ağustos'ta yön başına 744 saatlik ve 31 günlük kayıt, karşılaştırma sorgusunda `COMPLETE` kapsam verdi. TMS 20002'nin 3 Eylül resmî hacmi, aynı günün ham agregası ve 24 saatlik toplamıyla iki yönde de eşleşti; hız farkı resmî rapor yuvarlamasından kaynaklanan 0,05 km/sa altındaydı.

22 Eylül 2026 şerit pilotunda TMS 5, 6 ve 20002 için 15 Eylül ham geçişleri işlendi. Bu üç istasyonda iki yönün her birinde en az iki şeridin yönü `%98` kanıt eşiğiyle doğrulandı ve canlı hız bulundu. Anlık karşılaştırma yalnız yönü kanıtlı, en çok 5 dakikalık, birbirine en çok 2 dakika uzaklıktaki ve şerit başına en az 60 araç/sa geçiş oranlı ölçümleri kullanır. Her şerit, aynı yöndeki geri kalan şeritlerin ortanca hızı ve geçiş oranıyla ayrı ayrı karşılaştırılır; böylece ikinci yavaş bir şerit, referansı kendi düşürüp tek şeridin arkasına gizlenemez. Hız farkı en az 15 km/sa ve `%40` ise eşiği aşan her şerit ayrı satırda bildirilir; hiçbir şerit eşiği aşmazsa bağlam için en yavaş şerit yine de gösterilir. Bulgu, engel veya kapanma doğrulanmış olay sayılmaz. Şerit geçmişi henüz çok günlük olağan davranış çıkaracak kapsamda değildir; diğer istasyonların yön kanıtı da oluşmadan karşılaştırma oralarda gösterilmez.

22 Eylül 2026'da gerçek geçiş kanıdı yalnızca 3 istasyonda bulunduğu için, geri kalan istasyonlarda lane–yön eşleşmesi resmî TMS Statistics kaynağının `kaista1`/`kaista2` (yön başına şerit sayısı) alanından ikincil bir politikayla (`kaista-sequential-v1`) genişletildi: şeritler sırayla yön 1'in şerit sayısı kadar ilk gruba, kalanı yön 2'ye atanır; yalnızca canlıda gerçekten ölçüm üreten şerit numaralarına, resmî toplamı aşmadan uygulanır. Gerçek kanıt (`history-lane-direction-v1`) her zaman önceliklidir. Hipotez, farklı yollardaki (vt1, vt3, vt4, kt51, st101) 14 istasyonun 15 Eylül 2026 gerçek ham geçiş verisiyle doğrulandı: simetrik ve asimetrik (2/2'den 5/5'e) şerit dağılımlarının tamamında canlıda görünen hiçbir şerit yanlış yöne atanmadı. İki istasyonda (TMS 117, TMS 150) resmî sayı gerçekte var olmayan ek şerit öngördü; bu "hayali" şeritler canlı veri hiç üretmediği için atama dışı kaldı, hatalı etiketleme oluşmadı. Kaynak bellek içinde günlük döngüyle yenilenir, kalıcı tabloya yazılmaz.

22 Eylül 2026 genişletmesinde TMS 20002/20004 için 1 Eylül 2025–31 Ağustos 2026 günlük aralığı karşılaştırmada 365/365 gün `COMPLETE` verdi. Aynı komut yeniden çalıştırıldığında tamamlanan iki yön `SKIPPED` oldu. İlk on katalog istasyonu (TMS 3–12) için de aynı yıllık günlük aralık aktarıldı; önceden tamamlanan ilk beşi checkpoint sayesinde tekrar indirilmedi ve bu partide istasyon hatası olmadı. Katalogdaki sağlayıcı kimliği `23003` iken Statistics TMS numarası `3` olabilir; CLI doğru `tmsNumber` alanını kullanır. TMS 6'nın ikinci yönünde sağlayıcı raporunda 365 günün 362'sinde hacim, 358'inde hız vardır; bu günler artık metrik ve yöne göre ayrı eksik kapsam olarak gösterilir. Hız kaydı olmayan dört günde mevcut hacim analitik özette korunur, hız uydurulmaz. Yeni partide TMS 8 için iki yönde toplam 696 hacim ve 696 hız, TMS 12 için 730 hacim ve 700 hız satırı geldi; eksik tarihler tamamlanmış gibi gösterilmez. Bu kapsamdan sonra veritabanında toplam 12 istasyon için 11.749 hacim ve 11.715 hız satırı vardır; tablolar indekslerle yaklaşık 3,25 ve 3,24 MB'dir. İki/beş yıllık bütün-istasyon aktarımı henüz tamamlanmadı; olmayan kapsam arayüzde varmış gibi gösterilmez.

24 Eylül 2026 doğrulama snapshot'ında 76 istasyonun tamamında en az bir yönde saatlik ve günlük hız+hacim çifti vardır; 73 istasyonda iki yön de kullanılabilir. Görünen geçmiş istasyon başına 286–1849 gün, ortanca 1806 gündür. TMS 20016 yön 1, TMS 20021 yön 2 ve TMS 20027 yön 1 eksik olduğu, ayrıca ayrıntılı dakika/şerit/araç sınıfı aktarımı yalnız birkaç istasyonda bulunduğu için bütün-istasyon aktarım hedefi hâlâ tamamlanmış sayılmaz. Ayrıntılı sonuç `docs/reports/project-audit-2026-09-24.md` dosyasındadır.

22 Eylül 2026 günlük toplu aktarımında 76 katalog istasyonunun tamamı için 1 Eylül 2021–31 Ağustos 2026 aralığı istendi. Veritabanında 249.620 günlük hacim ve 251.325 günlük hız satırı, 944 tamamlanmış tarih/yön parçası ve kaynak hesaplama hatası dönen yedi hız aralığı bulunuyor. İki istasyonlu beş yıllık gerçek API sorgusu 1.826 günün 1.552'sinde ortak hız verisi buldu; diğer günler `SOURCE_GAP` olarak açıkça işaretlendi. Kaynakta bulunmayan ölçüm üretilmedi. Saatlik iki yıllık aktarım sürmektedir.

Saatlik aktarımın Mart 2026 parçasında Fintraffic CSV'si yaz saati geçişindeki var olmayan Helsinki 03:00 saati için dolu hücre döndürdü; bu hücre UTC'de gerçek 04:00 ile çakışarak toplu eklemeyi durdurdu. Parser artık bu geçersiz yerel saati başka bir saatin ölçümü gibi yazmıyor; günlük resmî toplam ayrı tutuluyor. Saatlik aktarımın kalan kısmı veri aktarımı için ayrılan sonraki oturumda checkpoint üzerinden sürdürülecek.

Saatlik kısmi aktarımın mevcut veritabanı görüntüsünde 76 istasyondan 1.948.994 hacim ve 1.855.768 hız satırı, 2.703 tamamlanmış parça ve 152 kaynak hesaplama hatası aralığı vardır. Bu görüntü tam iki yıllık kapsam değildir; eksikler analizde aktarılmamış veya kaynak hatası olarak ayrılır.

- [x] Canlı–canlı, canlı–geçmiş ve ayrı dönemli geçmiş–geçmiş için iki bağımsız karşılaştırma tarafı ve paylaşılabilir URL
- [x] Kaynak birimi, tazelik, ölçüm penceresi ve tarihsel kapsamı gözeten fark politikası
- [ ] Bugünün tamamlanmamış kümülatif akışını geçmiş günün aynı saatine hizalayan ayrı analiz (mevcut canlı snapshot bunu tek başına sağlamaz)

Yalnızca Aşama 6 tamamlandıktan ve kalan zaman değerlendirildikten sonra:

1. LLM destekli yönetici raporu
2. Trafik senaryosu/simülasyon modu
3. Yeni gerçek veri sağlayıcısı
4. Kapsama alanı yönetim ekranı
5. PDF raporu ve zamanlanmış raporlar
6. İnternete açık demo ve CI/CD
