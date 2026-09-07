# Traffic Twin Demo Akışı

## Amaç

Bu akış yaklaşık 10 dakikada brief'in zorunlu teknolojilerini ve dört MVP yeteneğini gerçek veri üzerinden kanıtlar. Demo sırasında sentetik veya mock trafik kullanılmaz.

## Ön Koşul

README'deki kurulum ve demo verisi hazırlama komutları tamamlanmış, `pnpm dev` çalışıyor olmalıdır. Başlangıç URL'si:

```text
http://localhost:3000/monitoring?station=fintraffic-tms%3A20002
```

## 0:00–1:00 — Mimari ve Veri Kökeni

- Depo yapısını kısaca gösterin: Next.js web, Express/Socket.IO server, ortak Zod contracts ve PostgreSQL/PostGIS.
- Harita altlığının OpenFreeMap/OSM, trafik ölçümlerinin Fintraffic olduğunu belirtin.
- Sensörün fiziksel kaynak varlık, kavşağın OSM geometrisi ve doğrulanmış sensör eşleşmelerinden türetilmiş ayrı varlık olduğunu açıklayın.

Kanıt: başlıktaki kaynak durumu, saat dilimi ve harita attribution metinleri.

## 1:00–3:00 — Canlı İzleme ve Dayanıklılık

- Varlık seçim çubuğunu açıp TMS 20002'yi arayın ve istasyonu seçin; URL'deki `station` parametresinin değiştiğini gösterin.
- İki yönün son 5 dakikalık kayan hız/hacmini, ölçüm zamanını ve tazelik etiketini açıklayın.
- Canlı bağlantı ve Fintraffic kaynak durumunun farklı göstergeler olduğunu belirtin.
- Tema düğmesiyle koyu temaya geçin; arayüzün ve MapLibre stilinin birlikte değiştiğini gösterin.

Kanıt: seçim–URL–panel senkronu, gerçek ölçüm zamanı, stale/unknown etiketleri ve kalıcı tema seçimi.

## 3:00–4:15 — Türetilmiş Kavşak

- Varlık seçim çubuğunda “Kavşaklar” görünümüne geçip tam veya kısmi kapsamalı bir kavşak seçin.
- OSM relation kimliği, yol referansları, bağlı fiziksel sensörler, mesafe/yön farkı, güven ve politika sürümünü gösterin.
- Bir sensörün yalnız en yakın uyumlu kavşağa atandığını; yetersiz kapsamada veri uydurulmadığını belirtin.

Kanıt: kavşak detay paneli ve haritadaki bağımsız kavşak katmanı.

## 4:15–6:30 — Geçmiş Analiz ve Karşılaştırma

- Üstteki `Analiz` moduna geçin; haritanın ve seçili istasyonun korunduğunu, URL'ye `mode=analysis` eklendiğini gösterin.
- Tarihleri `03.09.2026–04.09.2026`, yönü `1`, çözünürlüğü `Dakika` yapın.
- Karşılaştırma istasyonu olarak TMS 20004'ü seçip analizi uygulayın.
- İki gerçek seriyi, tam/kısmi/eksik gün kapsamasını ve saat dilimini açıklayın.
- Gün/Ay/Yıl kısayollarının mutlak sabit tarih değil, çalışılan güne göre kayan aralık ürettiğini belirtin.

Kanıt: paylaşılabilir filtre URL'si, iki serili grafik ve veri kapsama rozeti.

## 6:30–7:45 — Senkron Replay

- En fazla iki günlük ve veri içeren aralıkta replay'i başlatın.
- Duraklatın, hızı değiştirin ve sürdürün.
- Grafik zaman imleci ile harita bağlamının aynı canonical Socket.IO replay zamanını kullandığını gösterin.
- `Canlıya dön` ile replay oturumunu kapatıp aynı haritada canlı moda geçin.

Kanıt: oynatma durumu, kare zamanı, hız kontrolü ve eşzamanlı harita/grafik ilerlemesi.

## 7:45–9:00 — Açıklanabilir Anomali

- TMS 20002 ile canlı izlemeye dönün ve baseline panelini gösterin.
- Mevcut değer, beklenen aralık, son 12 haftalık kayan pencere, örnek sayısı, güven ve politika sürümünü açıklayın.
- Tek sapmanın `CANDIDATE`, yalnız ardışık ikinci sapmanın `ACTIVE` olduğunu; yüksek yoğunluğun tek başına anomali olmadığını belirtin.

Kanıt: gerçek aynı yerel gün/saat örnekleri ve açıklama girdileriyle saklanan güncel durum.

## 9:00–10:00 — Çift Yönlü Operatör Notu ve Kapanış

- Aynı istasyonu iki tarayıcı sekmesinde açın.
- Bir sekmeden operatör adı ve not girin; ikinci sekmede yenilemeden görünmesini gösterin.
- Akışı özetleyin: client komutu → Zod doğrulaması → Socket.IO acknowledgement → PostgreSQL → canonical broadcast.
- Son olarak `pnpm verify:full` çıktısının format, lint, typecheck, test, build ve gerçek PostGIS/Socket.IO entegrasyonlarını kapsadığını belirtin.

Kanıt: iki istemcide aynı server kimliği ve oluşturulma zamanıyla görünen kalıcı not.

## Kesinti Olursa

- Fintraffic geçici olarak erişilemezse son ölçüm, yaşı ve kaynak kesintisiyle gösterilir; yeni değer üretilmez.
- Socket.IO kesilirse son bilinen ölçümler etiketi görünür; yeniden bağlantıda REST reconciliation çalışır.
- OpenFreeMap altlığı yüklenemezse trafik API'si ve paneller çalışmaya devam eder, altlık sorunu ayrı gösterilir.
- Tarih artifact'i yoksa grafik boşluğu doldurmaz; eksik gün sayısını gösterir.
