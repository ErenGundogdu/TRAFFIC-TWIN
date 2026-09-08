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
- En az bir doğrulanmış kavşak grubu bağlı sensör ve kapsama bilgisiyle gösterilir.

### 2. Geçmiş, Analiz, Karşılaştırma ve Replay

Kullanıcı varlık, metrik, yön, tarih aralığı ve çözünürlük seçerek geçmiş seriyi görüntüler. `/monitoring?mode=analysis` aynı kalıcı harita ve varlık seçim sözleşmesi içinde analizi açar; eski `/analytics` bağlantıları filtreleri korunarak bu moda yönlendirilir. Yakın dönem verisi dakikalık, uzun dönem verisi saatlik/günlük özetlerden sunulur. Replay gerçek kayıtları zaman sırasıyla Socket.IO üzerinden oynatır ve harita bağlamı ile grafik zaman imlecini senkron ilerletir.

Kabul kriterleri:

- Gün, ay, yıl ve özel aralık sorguları uygun veri çözünürlüğünü seçer.
- İki zaman dönemi veya iki varlık ortak metrikler üzerinden karşılaştırılabilir.
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

### 4. Operatör Notları

Kullanıcı seçili trafik varlığına kısa bir not bırakır. Form React Hook Form ve Zod ile doğrulanır. Not Socket.IO acknowledgement ile server'a ulaşır, PostgreSQL'e yazılır ve bağlı bütün istemcilere canonical kayıt olarak yayınlanır.

Kabul kriterleri:

- Boş, yalnızca boşluk içeren veya sınırı aşan mesaj reddedilir.
- İki açık istemcide yeni not sayfa yenilemeden görünür.
- Yeniden bağlanan istemci REST listesinden kaçırdığı notları uzlaştırır.
- Not kaynak varlık, oluşturulma zamanı ve server üretimli kimliğiyle saklanır.

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
- CLI ile başlayan kapsama alanı yönetiminin admin ekranına taşınması
