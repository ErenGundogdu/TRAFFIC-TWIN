# Traffic Twin Ürün Tanımı

## Durum

Bu belge hedef ürünü tanımlar. Henüz uygulandığı açıkça belirtilmeyen bütün maddeler `Planlandı` durumundadır.

## Vizyon

Traffic Twin, farklı coğrafyalardaki gerçek trafik kaynaklarını ortak bir modelde birleştiren; harita, geçmiş analiz ve gerçek zamanlı operasyon akışlarını senkron sunan genişleyebilir bir trafik dijital ikizi platformudur. İlk veri sağlayıcısı Fintraffic, ilk kapsama alanı Helsinki metropol bölgesidir.

## Hedef Kullanıcı

Birincil kullanıcı trafik durumunu izleyen operatördür. Operatör canlı durumu görür, bir istasyon veya kavşağı inceler, geçmişle karşılaştırır, beklenmeyen davranışın nedenini okur ve diğer operatörlere not bırakır. Analist odaklı ayrıntılı rapor oluşturma daha sonraki aşamadır.

## Temel Kavramlar

- **Traffic asset:** Sensör istasyonu, kavşak, yol segmenti, koridor veya trafik bölgesi gibi haritalanabilir varlık.
- **Sensor station:** Sağlayıcının gerçek fiziksel ölçüm noktası.
- **Junction:** OSM geometrisi ile doğrulanan bir veya daha fazla sensör yaklaşımından türetilmiş varlık.
- **Observation:** Belirli zaman, yön ve pencere için ölçülen hız/hacim gibi değer.
- **Congestion:** Mevcut trafik akışının sıkışıklık durumu.
- **Anomaly:** Tarihsel olarak beklenen davranıştan açıklanabilir sapma.
- **Coverage area:** Sistemin veri keşfi ve senkronizasyonu yaptığı coğrafi sınır ve saat dilimi.

## MVP Yetenekleri

### 1. Canlı İzleme

Kullanıcı `/monitoring` ekranında tanımlı kapsama alanındaki aktif Fintraffic istasyonlarını görür. Harita açıldığında Helsinki başlangıç görünümünü kullanır ancak bütün ülke istasyonları ve gelecekteki bölgeler backend kataloğundan dinamik alınır. İstasyon seçimi URL, detay paneli ve ilgili grafiklerle senkron olur. Kullanıcı veri kaynağını, son ölçüm zamanını, tazelik durumunu, yönleri, hızı ve hacmi görebilir.

Kabul kriterleri:

- REST başlangıç yüklemesi beklemeden anlamlı yüklenme/hata durumu gösterir.
- Socket.IO güncellemesi aynı istasyonun görünümünü sayfa yenilemeden değiştirir.
- Bağlantı kesilirse son veri `stale` olarak işaretlenir; sahte değer üretilmez.
- Harita katmanları istasyon, doğrulanmış kavşak, not ve anomali için ayrı yönetilir.
- Harita, gerçek araç/saat değerinden üretilen yoğunluk ve göreli 3B hacim görünümleri ile seçili istasyonun gerçek OSM yol geometrisi üzerindeki yönlü akışını sunar.
- Fintraffic yol bearing'i yön başına derece ve pusula kimliğine normalize edilir; detay, analiz, replay ve harita aynı dinamik yön sunumunu kullanır, eksik bearing için yön tahmin edilmez.
- Yönlü yol akışı, ülke genelinde sabit hız eşikleri yerine Fintraffic'in istasyona özgü serbest akış ve kapasite referanslarıyla açıklanır; eksik referansta durum üretilmez.
- Başarılı OSM yol bağlamı kalıcı tutulur; Overpass geçici olarak erişilemezse son doğrulanmış geometri kaynak zamanı ve `stale` durumu görünür biçimde sunulur.
- En az bir doğrulanmış kavşak grubu bağlı sensör ve kapsama bilgisiyle gösterilir.

MVP sonrasında tamamlanan ilk bağlam katmanı, Fintraffic'in resmî yol çalışmaları ve trafik duyurularıdır. Olay geometrileri Helsinki kapsama alanına dinamik olarak süzülür; yeni olay için istasyon veya yol kimliği elle tanımlanmaz. Kullanıcı iki olay kategorisini haritada bağımsız açıp kapatabilir. Bu katman olay ile ölçülen yoğunluk/anomali arasında nedensellik iddia etmez; yalnız doğrulanabilir operasyon bağlamı sağlar.

Katman, son başarılı olay senkronunu kapsama alanının saat diliminde gösterir. Güncellik eşiği trafik olayı poll aralığının iki katından dinamik hesaplanır; eşik aşılırsa kalıcı son snapshot silinmeden `Son geçerli veri`, hiç başarılı senkron yoksa `Henüz veri alınmadı` durumu gösterilir.

Olay gezgini; kaynak metni/yol araması, kategori, aktif-yaklaşan yaşam döngüsü ve sağlayıcının verdiği etki düzeyi filtrelerini sunar. Sonuç seçimi haritayı gerçek olay geometrisine odaklar ve ayrıntı kartını açar. Filtreler ile seçili olay `/monitoring` URL'sinde korunur; yeni olaylar için yol veya olay kimliği elle tanımlanmaz.

Harita üzerindeki kısa olay özeti tıklamayla kalıcı ayrıntı kartına dönüşür. Kart; kaynak dilini değiştirmeden olayın yolunu, yönünü, yaşam döngüsünü, etki düzeyini, sağlayıcının bildirdiği etkileri, konum ve operasyon açıklamasını, gönderen kurumu ve kaynak güncelleme zamanını kapsama alanının saat diliminde gösterir. Sağlayıcının vermediği alanlar tahmin edilmez.

Seçili istasyonun operasyon bağlamı, aktif ve yaklaşan olayların gerçek geometrisine olan PostGIS mesafesini hesaplar. İstasyonun sağlayıcıdan türetilen yol referansı olayın yol numarasıyla eşleşiyorsa aynı yol kanıtı ayrıca gösterilir. Eşleşme istasyon veya olay kimliklerine göre sabitlenmez; yeni senkronlanan kayıtlar aynı sürümlü politikayla otomatik değerlendirilir. Sonuç yakınlık ve yol eşleşmesi sunar, olayın ölçülen trafik durumuna neden olduğunu iddia etmez. Bağlam kartından seçilen olay mevcut URL ve harita seçimiyle senkron biçimde gerçek geometrisine açılır.

### 2. Geçmiş, Analiz, Karşılaştırma ve Replay

Kullanıcı varlık, metrik, yön, tarih aralığı ve çözünürlük seçerek geçmiş seriyi görüntüler. `/monitoring?mode=analysis` aynı kalıcı harita ve varlık seçim sözleşmesi içinde analizi açar; eski `/analytics` bağlantıları filtreleri korunarak bu moda yönlendirilir. Yakın dönem verisi dakikalık, uzun dönem verisi saatlik/günlük özetlerden sunulur. Replay gerçek kayıtları zaman sırasıyla Socket.IO üzerinden oynatır ve harita bağlamı ile grafik zaman imlecini senkron ilerletir.

Kabul kriterleri:

- Gün, ay, yıl ve iki ucu dahil özel tarih aralığı sorguları uygun veri çözünürlüğünü seçer.
- İki varlık aynı dönem ve ortak metrik üzerinden karşılaştırılabilir. İki ayrı zaman döneminin karşılaştırılması planlı genişlemedir.
- Eksik tarih aralığı için ingestion durumu görünür, boş sonuç gerçek veri gibi gösterilmez.
- Replay oynatılabilir, durdurulabilir, hızı değiştirilebilir, zaman çizelgesinden gerçek bir ölçüm anına götürülebilir ve canlı moda dönebilir.
- Mod, seçim ve filtreler `/monitoring` URL'sinde paylaşılabilir biçimde korunur.
- İstasyonların geçmiş veri bulunurluğu ve gerçek import tarihleri seçimden önce görünür; verisiz seçimde çalışabilecek varlık ve en son ortak gün önerilir.
- Seçilen dönem için ağırlıklı ortalama/medyan hız, toplam geçiş, yoğun zaman dilimi, hız aralığı ve iki yönlü hacim dağılımı sunucuda hesaplanıp veri temeliyle gösterilir.

### 3. Açıklanabilir Anomali

Sistem, yapılandırılabilir kayan baseline ile mevcut hız/hacim davranışını karşılaştırır. Varsayılan profil aynı istasyon, yön, haftanın günü ve saat için son 12 haftayı kullanır. Yeterli tarih yoksa anomali üretmez. Sonuç, kullanıcıya mevcut değer, beklenen aralık, sapma, örnek sayısı ve güven bilgisiyle açıklanır.

Kabul kriterleri:

- Yüksek yoğunluk tek başına anomali oluşturmaz.
- Baseline penceresi zaman ilerledikçe kayar ve kod değişikliği olmadan yapılandırılabilir.
- En az iki ardışık sapma olmadan aktif alarm oluşmaz.
- Hesaplama saf domain fonksiyonlarıyla unit test edilir.
- Anomali kaydı kullanılan politika ve baseline girdileriyle tekrar açıklanabilir.

### 4. Varlık Operasyon Günlüğü

Kullanıcı seçili trafik varlığına kategori ve operasyon durumu taşıyan kısa bir günlük girdisi bırakır. Kategori `Genel not`, `Bakım`, `Arıza` veya `Kontrol`; durum `Bilgi`, `İşlem gerekli` veya `Çözüldü` olabilir. Bu kayıt bir saha olayı veya değiştirilebilir iş emri değildir; sensör/kavşak gibi varlığın değiştirilemez operasyon geçmişidir. Form React Hook Form ve Zod ile doğrulanır. Kayıt Socket.IO acknowledgement ile server'a ulaşır, PostgreSQL'e yazılır ve bağlı bütün istemcilere canonical biçimde yayınlanır.

Kabul kriterleri:

- Boş, yalnızca boşluk içeren veya sınırı aşan mesaj reddedilir.
- İki açık istemcide yeni not sayfa yenilemeden görünür.
- Yeniden bağlanan istemci REST listesinden kaçırdığı notları uzlaştırır.
- Kayıt kaynak varlık, kategori, operasyon durumu, oluşturulma zamanı ve server üretimli kimliğiyle saklanır.

### 5. Saha Bildirimleri

MVP sonrası tamamlanan saha bildirimi aracı, operatörün mevcut bir sensör veya kavşağa bağlı olmadan aynı çalışma haritasında gerçek bir konum seçip gözlem kaydetmesini sağlar. İlk kategoriler kaza, trafik yoğunluğu, yol tehlikesi, yol hasarı, sinyalizasyon arızası, sensör sorunu ve diğer; önem düzeyleri düşük, orta ve yüksektir. Yeni kayıtların kaynağı `OPERATOR`, durumu server tarafından `PENDING_REVIEW` olarak atanır. Kullanıcı istemciden bir kaydı doğrulanmış gösteremez.

Bildirimler resmî Fintraffic olaylarından ayrı MapLibre source/layer ile çizilir ve kaynak/onay durumu görünür tutulur. Oluşturma aracı açıkken harita tıklaması yalnız geçici bildirim koordinatını seçer; normal varlık seçimi araç kapanana kadar duraklatılır. Koordinat kapsama alanı dışında ise server kaydı reddeder. Başarılı kayıt PostgreSQL/PostGIS'e yazılır ve Socket.IO acknowledgement/broadcast akışıyla açık istemcilere ulaşır. Seçili kayıt kimliği URL'de tutulurken kaydedilmemiş geçici konum yalnız istemci state'idir.

Bu ilk dilim kimlik doğrulama veya admin onayı uygulamaz. `VERIFIED`, `REJECTED` ve `RESOLVED` durumları gelecekte yetkili server komutlarının kullanacağı sözleşme olarak ayrılmıştır; genel kullanıcının create komutunda durum alanı yoktur. Ayrı bir saha bildirimi sayfası planlıdır; mevcut form, detay ve sorgular rota bağımsız `field-reports` feature'ında tutulduğu için aynı bileşenler taşınabilir.

## MVP Dışı

- Authentication ve authorization
- LLM ile metinsel/PDF yönetici raporu
- Trafik mikro-simülasyonu ve yol kapatma senaryoları
- Yeni gerçek trafik sağlayıcısının uygulanması
- Bölge yönetim arayüzü
- Production CI/CD ve yüksek erişilebilirlik
- Kendi dünya ölçekli harita karo altyapısı
- Tam mobil optimizasyon ve çoklu dil

## Gelecekteki Genişleme Noktaları

- Yeni veri sağlayıcı adapter'ları
- Yeni trafik varlığı, harita katmanı ve çalışma modu kayıtları
- AI destekli yapılandırılmış yönetici raporları
- Gerçek geçmiş veriden kalibre edilen senaryolar
- Kayıtlı görünümler, CSV/PDF çıktıları ve zamanlanmış raporlar
- Aynı varlık için iki ayrı zaman döneminin karşılaştırılması
- CLI ile başlayan kapsama alanı yönetiminin admin ekranına taşınması
- Saha bildirimleri için kimlik doğrulamalı admin inceleme ve onay akışı
