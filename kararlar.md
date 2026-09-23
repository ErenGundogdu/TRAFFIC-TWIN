# Teknik Kararlar

Bu belge, staj brief'inde araştırılması istenen dört ana teknoloji kararını ve kabul edilmiş ek mimari yönü kaydeder. Kararlar uygulama sırasında elde edilen kanıtlarla değişirse eski gerekçe silinmez; yeni karar tarihçesi ayrıca eklenir.

## 1. Harita Altyapısı — MapLibre GL JS

Harita motoru olarak MapLibre GL JS, React entegrasyonu için `react-map-gl/maplibre` seçildi. MapLibre açık kaynaklı, WebGL tabanlı ve canlı GeoJSON, vektör karo, cluster, heatmap ve özel katman kullanımına uygundur. React wrapper'ı harita kamerası ile panel, URL ve analiz durumunun kontrollü biçimde senkron tutulmasını kolaylaştırır. Görsel altlık için açık temada yol hiyerarşisini belirgin gösteren OpenFreeMap Bright, koyu temada OpenFreeMap Dark kullanılacaktır. Harita stili konfigüre edilebilir tutulacak ve ileride PMTiles veya başka bir sağlayıcıya geçiş MapLibre feature'larını değiştirmeyecektir.

İstasyon işaretleri veri tazeliğini renk, sağlayıcıdan gelen yol yönünü ise yakınlaştırma düzeyine bağlı yön oku ile gösterir. Yön bilgisi bulunmadığında ok çizilmez. Kavşak işareti kapsam durumunu gösterir; doğrulanmış yaklaşım geometrisi bulunmadan kavşak kol sayısı veya fiziksel şekli tahmin edilmez.

MapLibre GL JS 5.x sürüm hattı korunacaktır. 6.x sürümü WebGL 1 desteğini kaldırdığı için yalnızca WebGL 1 sunan tarayıcı veya GPU ortamlarında haritayı tamamen boş bırakır; 5.x ise WebGL 2 bulunmadığında WebGL 1'e geri düşer. Hedef tarayıcı tabanı WebGL 2 olarak değiştirilmeden ana sürüm yükseltilmeyecektir.

## 2. Trafik ve Kavşak Verisi — Fintraffic TMS + OpenStreetMap

Ana trafik kaynağı olarak Fintraffic Digitraffic TMS seçildi; çünkü gerçek, koordinatlı ve yaklaşık dakikalık güncellenen yol sensörü ölçümleri sağlar. Backend bütün istasyonların verisini dakikada bir bulk REST ve conditional GET ile alacak, normalize edecek ve kendi Socket.IO kanalı üzerinden istemcilere yayınlayacaktır. İlk fiziksel varlık sensör istasyonudur; kavşaklar OpenStreetMap geometrileriyle mesafe, yol ve yön uyumu doğrulanan sensör yaklaşımlarından türetilecektir. Helsinki ilk kapsama alanıdır fakat ülke, bbox ve merkez koordinatları UI koduna sabitlenmeyecektir. Çalışan ürün akışında sentetik trafik veya grid verisi kullanılmayacak, eksik ölçümler açıkça bilinmeyen olarak işaretlenecektir.

## 3. AI Yaklaşımı — Açıklanabilir İstatistiksel Anomali

İlk AI destekli içgörü, gerçek tarihsel ölçümler üzerinde çalışan sağlam istatistiksel anomali tespitidir. Her istasyon/yön/zaman dilimi için yapılandırılabilir kayan pencereyle median, MAD ve beklenen aralık hesaplanacaktır; başlangıç profili, resmî saatlik raporların yayın gecikmesini tolere etmek için son 26 haftadır. Yoğunluk ile anomali ayrı tutulacak, yüksek fakat beklenen trafik anomali sayılmayacaktır. Yeterli örnek yoksa sonuç üretilmeyecek; aktif alarm için ardışık gözlem kalıcılığı aranacaktır. Her sonuç kullanılan politika sürümü, zaman penceresi, örnek sayısı, beklenen değer ve sapma nedeniyle açıklanabilir olacaktır; LLM tabanlı yönetici raporu MVP sonrasına bırakılmıştır.

## 4. WebSocket Mimarisi — Ayrı Express + Socket.IO Sunucusu

Next.js'ten ayrı, kalıcı çalışan Node.js/Express + Socket.IO backend seçildi. REST; ilk yükleme, katalog, geçmiş ve analiz sorgularını, Socket.IO ise canlı trafik, kaynak durumu, replay kareleri ve operatör notlarını taşıyacaktır. Operatör notu client → server → broadcast yönünde çalışarak brief'in çift yönlü WebSocket şartını karşılayacaktır. Fintraffic upstream bağlantısında MQTT yerine bir dakikalık bulk REST polling seçilmiştir; veri çözünürlüğü aynı olduğundan bu yaklaşım daha sade ve ölçülüdür. Yerel Docker ortamı zorunlu hedef, kalıcı bağlantı destekleyen çevrim içi dağıtım ise opsiyoneldir.

## Kabul Edilmiş Ek Kararlar

- Mimari, Next.js web ile Express/Socket.IO modüler monolit backend'den oluşan pnpm workspace yapısıdır.
- PostgreSQL + PostGIS coğrafi ve tarihsel verinin ana deposudur; Drizzle şema/migration ve veri erişiminde kullanılır.
- Gerçek ham Fintraffic dosyaları sıkıştırılmış kaynak arşivinde varsayılan 14 gün tutulur; yalnız başarıyla işlenmiş ve gerekli aggregate kapsamı doğrulanmış dosya güvenli arşiv kökü içinden temizlenir. Manifest ve checksum kalıcıdır. Varsayılan sorgulanabilir pencereler dakika için 7 gün, saat için 2 yıl ve gün için 5 yıldır. Böylece bütün istasyonlarda beş yıllık ham arşivin ölçülen örneklemle yaklaşık 84 GB'a çıkması engellenirken uzun dönem analiz korunur.
- Uzun dönem genel hız/hacim verisi resmî TMS Statistics raporlarından alınır. Düzeltilmiş hacim ile hız raporunun araç örnek sayısı farklı olabileceği için ayrı tablolarda saklanır; analiz okuma katmanında zaman kovası üzerinden birleştirilir. Araç sınıfı, şerit ve şerit×sınıf analizi Statistics raporundan uydurulmaz; yalnız ayrıntılı ham geçiş kaydından üretilir.
- Canlı lane numarası Yön 1/Yön 2'ye sabit haritayla bağlanmaz. Günlük ham geçmişte en az 20 geçiş ve `%98` yön baskınlığı varsa sürümlü kanıtla (`history-lane-direction-v1`) eşleştirilir. Bu kanıt henüz oluşmamış istasyonlarda, resmî TMS Statistics kaynağının `kaista1`/`kaista2` (yön başına şerit sayısı) alanından türetilen ikincil, düşük öncelikli bir sürümle (`kaista-sequential-v1`) atama yapılır: yalnızca canlıda gerçekten ölçüm üreten şerit numaralarına, resmî toplam şerit sayısını aşmadan atanır; hiçbir zaman gerçek kanıdın üzerine yazmaz. Bu ikinci kaynak bellek içinde günlük olarak yenilenir, kalıcı tabloya yazılmaz. 22 Eylül 2026'da vt1, vt3, vt4, kt51 ve st101 yollarında 14 istasyonun gerçek geçiş verisiyle doğrulandı: canlıda görünen hiçbir şerit yanlış yöne atanmadı; resmî sayının gerçekte var olmayan "hayali" şeritler öngördüğü iki istasyonda (TMS 117, TMS 150) bu şeritler zaten canlı veri üretmediği için sorun oluşturmadı.
- Canlı şerit hacminde Fintraffic'in kayan ve sabit beş dakikalık sensörleri ayrı kökenle korunur. Aynı şeritte ikisi de varsa kayan pencere kullanılır; yalnız sabit pencere varsa bu gerçek değer saklanır ve arayüzde `Sabit 5 dk.` olarak belirtilir. Kaynak şerit hızı sağlamadığında hacimden hız türetilmez.
- Arayüz ve belgeler Türkçe; kod, API alanları ve commit mesajları İngilizcedir.
- Açık tema varsayılan, koyu tema ikincildir; trafik durumları yalnızca renkle ifade edilmez.
- Tema seçimi tarayıcıda kalıcıdır ve aynı sözleşme OpenFreeMap açık/koyu stilini değiştirir. Klavye odağı ile azaltılmış hareket tercihi global erişilebilirlik davranışıdır.
- MVP dört yetenekle sınırlıdır: canlı izleme, geçmiş/analiz/replay, anomali ve operatör notları.
