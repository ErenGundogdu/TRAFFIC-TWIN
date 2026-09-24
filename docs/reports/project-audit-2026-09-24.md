# Traffic Twin ayrıntılı doğrulama raporu

Tarih: 24 Eylül 2026  
Kapsama alanı: Helsinki (`Europe/Helsinki`)  
İncelenen çalışma zamanı: yerel web `http://localhost:3000`, API `http://localhost:4000`, yerel PostgreSQL/PostGIS

Bu rapor kodun test sonucunu, çalışan uygulamadaki kullanıcı akışlarını ve veritabanındaki gerçek istasyon kapsamını birlikte değerlendirir. Canlı tazelik, koridor ve yol olayı eşleşmeleri anlık değerlerdir; CSV matrisi 11:14–11:21 Europe/Helsinki arasında alınan snapshot'ı içerir.

## Sonuç

Uygulamanın zorunlu doğrulamaları ve ana kullanıcı akışları çalışıyor. Format, lint, TypeScript, production build, 330 birim/bileşen/sözleşme testi ve gerçek PostGIS/Socket.IO kullanan 20 integration testi geçti. Tarayıcı konsolunda hata veya uyarı görülmedi.

Canlı istasyon, uzun dönem günlük/saatlik analiz, anomali, yol olayı bağlamı ve saatlik replay kullanılabilir durumda. En büyük gerçek ürün açığı şerit geçmişidir: panel ve hesap motoru çalışıyor, fakat 76 istasyonun hiçbirinde 12 haftalık aynı gün/saat karşılaştırması için gereken en az 6 gerçek şerit örneği yok. Dakikalık replay ve araç sınıfı/şerit kırılımı da yalnız birkaç istasyonda bir günlük ayrıntılı içe aktarıma sahip.

Kritik seviyede çökme, sahte varsayılan değer veya yanlış istasyona ait veri saptanmadı. Günlük çözünürlükte oynatılamayan replay için yan kartın “Hazır” demesi kullanıcıyı yanıltıyordu; bu denetimde “Kullanılamıyor / Oynatma yok” olarak düzeltildi. Demo belgesindeki yalnız iki günlük replay anlatımı da dakika için 2 gün, saat için 30 gün olacak şekilde güncellendi.

## Otomatik doğrulama

| Kontrol                                  | Sonuç         |
| ---------------------------------------- | ------------- |
| Biçim denetimi                           | Geçti         |
| ESLint                                   | Geçti         |
| TypeScript strict typecheck              | Geçti         |
| Sözleşme testleri                        | 27/27 geçti   |
| Server birim testleri                    | 154/154 geçti |
| Web birim ve bileşen testleri            | 149/149 geçti |
| Production build                         | Geçti         |
| PostgreSQL/PostGIS/Socket.IO integration | 20/20 geçti   |
| Toplam test                              | 350/350 geçti |

API sağlık, katalog, geçmiş kullanılabilirliği, dakika/saat/gün/otomatik geçmiş sorgusu, kavşak, anomali, yol olayı, şerit geçmişi, koridor ve saha bildirimi listeleme uçları gerçek çalışan sunucuda `200` döndürdü. Var olmayan istasyon `404 HISTORY_SCOPE_NOT_FOUND`, geçersiz yön ise `400 INVALID_REQUEST` döndürdü.

## Gerçek veri kapsamı

| Yetenek                                  | İstasyon kapsamı | Yorum                                                                    |
| ---------------------------------------- | ---------------: | ------------------------------------------------------------------------ |
| Katalog                                  |            76/76 | Fintraffic kaynağı `AVAILABLE`                                           |
| En az bir yönde canlı hız                |            73/76 | 3 istasyonda hız yok                                                     |
| İki yönde de canlı hız ve akış           |            70/76 | 3 istasyon resmen tek yönlü; 3 istasyonda iki yön hız eksik              |
| Canlı şerit satırı                       |            73/76 | 3 istasyonda şerit snapshot'ı yok                                        |
| En az bir şeritte hız                    |            39/76 | 34 istasyonun şeritleri yalnız geçiş/akış veriyor                        |
| Tüm görünen şeritleri yöne eşli          |            62/76 | 11 istasyonda toplam 22 eşlenmemiş şerit; 3 istasyonda şerit yok         |
| En az bir yönde saatlik replay           |            76/76 | Saatlik replay aralığı en fazla 30 gün                                   |
| Resmî kurulum yönlerinde saatlik replay  |            76/76 | 73 çift yönlü, 3 resmî tek yönlü istasyon                                |
| Dakikalık replay                         |             3/76 | Yalnız TMS 5, 6 ve 20002; her birinde bir ayrıntılı gün                  |
| En az bir yönde günlük analiz            |            76/76 | Günlük özet oynatılamaz, analiz edilir                                   |
| Resmî kurulum yönlerinde günlük analiz   |            76/76 | 73 çift yönlü, 3 resmî tek yönlü istasyon                                |
| Araç sınıfı kırılımı                     |             4/76 | TMS 5, 6, 196 ve 20002; birer gün                                        |
| Şerit kırılımlı geçmiş                   |             4/76 | Aynı dört istasyonda birer gün                                           |
| Kullanılabilir 12 haftalık şerit bağlamı |             0/76 | Minimum 6 benzer saat örneği hiçbir istasyonda yok                       |
| Yeterli anomaly baseline'ı               |            73/76 | TMS 179 ve 196'da değerlendirme yok; TMS 20028 yetersiz                  |
| Doğrulanmış yol bağlamı                  |            67/76 | 9 istasyon eşleşmemiş/istenmemiş                                         |
| En az 3 istasyonlu statik koridor        |            61/76 | Aynı doğrulanmış yol numarası grubuna göre                               |
| Anlık kullanılabilir koridor             |            48/76 | Snapshot'ta en az iki güncel, yönü uyumlu komşu; canlı tazelikle değişir |
| Kavşağa bağlı istasyon                   |            10/76 | Toplam 5 kavşak: 2 tam, 1 kısmi, 2 yetersiz                              |
| Güncel yol olayı bağlamı bulunan         |            66/76 | 10 istasyonda o an politika mesafesinde olay yok                         |
| Operatör notu bulunan                    |             2/76 | Kullanıcı içeriği; sıfır olması işlev arızası değildir                   |
| Saha bildirimi bulunan                   |             0/76 | Kullanıcı içeriği; listeleme ve realtime integration testi geçti         |

Geçmişte görünen gün sayısı istasyon başına 286–1849, ortanca 1806 gündür. TMS 20029 için 297, TMS 20030 için 286 gün vardır; bunlar daha yeni başlayan kaynak serileridir. “Geçmiş gün” rozeti en az bir geçmiş kayıt bulunan günü anlatır; seçili yön ve metrik için eksiksiz kapsama garantisi değildir. Analiz ekranındaki `COMPLETE/PARTIAL/NO_DATA`, mevcut gün sayısı ve eksik gün gerekçesi esas göstergedir.

## İstasyon istisnaları

Canlı hızın iki yönde de bulunmadığı istasyonlar:

- TMS 179 `vt7_Fazerila`
- TMS 196 `Niinisaarentie`
- TMS 20028 `st170_Kulosaari_LML` — akış değeri gelir, hız gelmez; arayüz hız için açıkça “Şerit hız verisi yok” gösterir.

Resmî Fintraffic şerit yerleşiminde yalnız bir yönde ölçüm yapan istasyonlar:

- TMS 20016 `vt1_Espoo_Säterinmetsä_2_Hki`: yön 1'de 0, Helsinki yönü olan yön 2'de 3 şerit
- TMS 20021 `vt3_Kotamäki_HML`: Hämeenlinna yönü olan yön 1'de 4, yön 2'de 0 şerit
- TMS 20027 `vt3_Peräjä_Hki`: yön 1'de 0, Helsinki yönü olan yön 2'de 3 şerit

Şerit snapshot'ı bulunmayanlar TMS 125, 179 ve 196'dır. Şerit satırı olup hiçbir şeritte hız bulunmayan 34 istasyonun tam listesi CSV'de `live_lanes > 0` ve `lanes_with_speed = 0` filtresiyle görülebilir.

TMS 20021 ile TMS 20027 aynı `vt3 / Hämeenlinnanväylä` otoyolunda, aynı yol kesiminde ve yaklaşık 353 metre aralıktadır. Birincisi Hämeenlinna yönünü, ikincisi Helsinki yönünü ölçen tamamlayıcı fiziksel istasyonlardır. Saatlik ve günlük kayıtlardaki yön deseni canlı ölçümler ve Fintraffic'in resmî `kaista1/kaista2` değerleriyle tutarlıdır; yeniden aktarılması gereken kayıp yön değildir.

Doğrulanmış yol bağlamı bulunmayanlar:

- TMS 9, 102, 125, 127, 128, 159, 183, 191 ve 20024

Dakikalık replay'i olan üç istasyonun gerçek ayrıntılı günü 15 Eylül 2026'dır. Dakika replay'i en fazla iki günlük aralık kabul eder; mevcut veride bu üç istasyon için fiilî kapsam bir gündür. Saat çözünürlüğü 76 istasyonun tamamında en az bir yönde çalışır ve en fazla 30 günlük aralık kabul eder.

## Veri kaynağı ile proje kapsamı ayrımı

Canlı hızın veya şerit hızının boş olması Fintraffic'in o snapshot'ta verdiği gerçek ölçüm eksikliği olabilir; TMS 20016, 20021 ve 20027'deki boş karşı yön ise fiziksel olarak kurulmamış yöndür. Uygulama hızı tahminî değerle doldurmuyor. Şerit yönlerinin 364'ü resmî şerit yerleşiminden, 13'ü gözlenen araç geçişlerinden geliyor; 22 şerit için yön kanıtı yok ve bunlar eşlenmiş gibi gösterilmiyor.

Uzun dönem günlük/saatlik toplamlar Fintraffic Statistics verisinden gelir. Kaynak dosyada hız veya hacim günü bulunmadığında analiz bunu `SOURCE_GAP`; henüz içeri alınmadığında `NOT_IMPORTED` olarak gösterir. TMS 20002 için 2022–2026 günlük hız sorgusu örneğinde 1728 istenen günün 1627'si bulundu ve sonuç doğru biçimde `PARTIAL` döndü.

Dakikalık geçmiş, şerit geçmişi ve araç sınıfı kırılımının dar olması projenin tamamlanmamış ayrıntılı geçmiş içe aktarım kapsamıdır. Fintraffic'in bu alanları hiçbir zaman vermediği anlamına gelmez. Otomatik tüm-istasyon ham geçmiş planlayıcısı, hız/batch sınırları ve kapsam tamamlama işi yol haritasında hâlâ devam ediyor.

Yol bağlamı ve kavşak sayısı Fintraffic eksikliği değildir. Bunlar OSM geometrisi ile proje eşleme politikasından türetilir. Dokuz yol bağlamı ve yetersiz/kısmi kavşaklar eşleme kapsamının mevcut sınırıdır.

## Tarayıcıda doğrulanan kullanıcı akışları

- Canlı istasyon seçimi, URL senkronu ve 76 istasyonlu harita açıldı.
- TMS 196'da iki yön için “Veri yok”, ölçüm zamanı için “Ölçüm yok” gösterildi; tahmin üretilmedi.
- TMS 20028'de güncel sıfır akış korunurken eksik hız ayrı gösterildi.
- Saatlik 1–3 Eylül replay'i 48 gerçek kareyle başladı, harita ve grafik aynı kareyi izledi ve sona ulaştı.
- Isı haritası, yol akışı ve 3B hacim görünümü arasında geçiş çalıştı. 3B görünüm bunun fiziksel yükseklik değil göreli araç/saat ölçeği olduğunu açıkladı.
- 365 günlük analiz 365/365 tam kapsama, KPI'lar ve zaman serisini gösterdi.
- Günlük özet replay ekranında oynatma devre dışı kaldı ve dakika/saat gereksinimini açıkladı.
- Tarayıcı konsolunda error/warn kaydı yoktu.

## Bulunan ve düzeltilen yanıltmalar

1. Günlük veya yetersiz replay seçiminde oynatma düğmesi devre dışı ve açıklama doğruydu, ancak yan kart “Harita senkronu: Hazır” diyordu. Kart artık `Kullanılamıyor` ve `Oynatma yok` gösteriyor.
2. Demo belgesi replay'i yalnız “en fazla iki gün” diye anlatıyordu. Dakika için 2 gün, saat için 30 gün ve günlük özetin oynatılamadığı açıklandı.

## Kalan iş önceliği

1. Ayrıntılı saatlik şerit geçmişini en az 6 aynı gün/saat örneğine çıkarın. Bu tamamlanmadan şerit geçmiş bağlamı 76 istasyonun hiçbirinde kullanıcıya sonuç üretemez.
2. Ham ayrıntılı importu kontrollü biçimde genişletin. Dakikalık replay ile araç sınıfı/şerit kırılımı bugün yalnız 3–4 istasyon ve bir gün seviyesindedir.
3. Resmî şerit sayısı sıfır olan fiziksel olarak kurulmamış yönleri arayüzde “0 araç/sa” veya genel “yetersiz veri” gibi göstermeyin; “Bu istasyon bu yönü ölçmüyor” olarak ayırın. TMS 20021/20027 gibi tamamlayıcı karşı yön istasyonlarının ilişkisini kullanıcıya açıklayın.
4. Dokuz eksik yol bağlamını ve beş kavşağın üç kısmi/yetersiz eşleşmesini gözden geçirin.
5. Canlı şerit hızı vermeyen 34 istasyonu akış temelli görünüm olarak etiketlemeye devam edin; kullanıcıya hız kıyası vaat etmeyin.

## İstasyon matrisi

Tüm 76 istasyonun satır bazlı sonucu [station-feature-coverage-2026-09-24.csv](./station-feature-coverage-2026-09-24.csv) dosyasındadır. Önemli sütunlar:

- `live_speed_directions`, `live_flow_directions`, `current_complete_directions`: canlı yön kapsamı
- `live_lanes`, `lanes_with_speed`, `mapped_lane_count`, `unmapped_lane_count`: canlı şerit kapsamı
- `minute_replay_directions`, `hour_replay_directions`, `daily_analysis_directions`: analiz/replay kullanılabilirliği
- `official_direction_1_lanes`, `official_direction_2_lanes`, `official_expected_directions`: Fintraffic'in resmî fiziksel şerit/yön kurulumu
- `expected_hourly_coverage`, `expected_daily_coverage`: yalnız resmen kurulu yönler esas alınarak geçmiş kapsamı
- `history_days_visible`, `first_available_date`, `last_available_date`: genel geçmiş günleri
- `vehicle_class_days`, `lane_detail_days`, `lane_history_ready_evaluations`: ayrıntılı veri ve şerit geçmişi
- `road_context_status`, `corridor_station_count`, `corridor_ready_directions`: yol/koridor kapsamı
- `junction_count`, `sufficient_anomaly_evaluations`, `event_context_matches`: kavşak, anomali ve olay bağlamı

`current_freshness`, `corridor_ready_directions` ve `event_context_matches` snapshot değerleridir; canlı kaynak yenilendikçe değişir.
