# İstasyon yön doğrulama raporu

Tarih: 24 Eylül 2026
Kapsama alanı: Helsinki (`Europe/Helsinki`)
İncelenen istasyon: 76/76
Canlı snapshot: 24 Eylül 2026 11:51–11:53 `Europe/Helsinki`

Bu denetim, uygulamadaki 76 istasyonu Fintraffic'in resmî `pisteet.json` istasyon yerleşimiyle eşleştirir. Resmî `kaista1/kaista2` şerit sayıları ve `suunta1/suunta2` yön adları; canlı yön özetleri, canlı şerit satırları ve içe alınmış saatlik/günlük geçmişle karşılaştırılmıştır.

## Sonuç

- 76 istasyonun tamamı resmî Fintraffic kaydıyla eşleşti; yön adı veya resmî şerit yerleşimi eksik istasyon yok.
- 73 istasyon iki yönü, 3 istasyon yalnız bir yönü fiziksel olarak ölçüyor. Toplam 149 resmî ölçüm yönü var.
- Snapshot sırasında 149 resmî yönün 143'ünde hem hız hem akış mevcut. Eksik 6 yön, TMS 179, 196 ve 20028'in ikişer yönüdür.
- Canlı şerit satırlarında ters yön eşlemesi saptanmadı. Resmî yerleşim dışında kalan 22 yer tutucu şeridin hiçbirinde aktif hız veya pozitif akış yok.
- Resmî 393 şeridin 377'si canlı snapshot'ta satır olarak bulunuyor; 16 resmî şerit o an ayrıntılı şerit satırı olarak gelmiyor. Bu eksiklik yön özetinin mutlaka eksik olduğu anlamına gelmiyor.
- Tüm istasyonların resmen kurulu yönlerinde saatlik ve günlük geçmiş var: beklenen tarihsel yön kapsamı 149/149.
- Dört istasyonda sayısal bearing yok: TMS 20021, 20024, 20025 ve 20027. Resmî hedef yön adları mevcut olsa da mevcut koridor algoritması sayısal yön açısı istediği için bu istasyonların yönleri koridor kıyasına giremiyor.

## Resmen tek yön ölçen istasyonlar

| İstasyon                                 | Resmî yerleşim           | Ölçülen yön         | Diğer yönün durumu      |
| ---------------------------------------- | ------------------------ | ------------------- | ----------------------- |
| TMS 20016 `vt1_Espoo_Säterinmetsä_2_Hki` | `kaista1=0`, `kaista2=3` | Yön 2 · Helsinki    | İstasyonda kurulu değil |
| TMS 20021 `vt3_Kotamäki_HML`             | `kaista1=4`, `kaista2=0` | Yön 1 · Hämeenlinna | İstasyonda kurulu değil |
| TMS 20027 `vt3_Peräjä_Hki`               | `kaista1=0`, `kaista2=3` | Yön 2 · Helsinki    | İstasyonda kurulu değil |

TMS 20021 ile TMS 20027 aynı resmî yol ve yol kesiminde, yaklaşık 353 metre aralıklı tamamlayıcı istasyonlardır. Biri Hämeenlinna, diğeri Helsinki yönünü ölçer. Boş görünen karşı yönler kayıp veri değildir.

## Canlı yön verisi eksik istasyonlar

| İstasyon                        | Kaynak durumu | Resmî yönler | Snapshot sonucu                 |
| ------------------------------- | ------------- | ------------ | ------------------------------- |
| TMS 179 `vt7_Fazerila`          | `UNAVAILABLE` | 1 ve 2       | Her iki yönde hız ve akış yok   |
| TMS 196 `Niinisaarentie`        | `UNAVAILABLE` | 1 ve 2       | Her iki yönde hız ve akış yok   |
| TMS 20028 `st170_Kulosaari_LML` | `FRESH`       | 1 ve 2       | Her iki yönde akış `0`, hız yok |

TMS 20028'in güncel zaman damgası taşıması, hız ölçümünün bulunduğu anlamına gelmez. Uygulamanın bu durumda hız üretmemesi doğrudur.

## Şerit düzeyindeki bulgular

Canlı snapshot 399 şerit satırı içerir. Bunların 377'si resmî şerit yerleşimine bağlanır. Kalan 22 satır resmî toplamın sonrasındaki şerit numaralarıdır; tümü hızsız ve sıfır akışlıdır. Bu nedenle yanlış yön verisi olarak kullanılmamalıdır.

Resmî olduğu hâlde snapshot'ta ayrıntılı şerit satırı bulunmayan 16 şerit şunlardadır:

- TMS 179: şerit 1–4
- TMS 196: şerit 1–2
- TMS 125: şerit 1–2
- TMS 150: şerit 7–10
- TMS 10: şerit 5–6
- TMS 117: şerit 3
- TMS 13: şerit 3

TMS 179 ve 196 kaynak olarak kullanılamaz durumdadır. Diğer beş istasyonda yön özeti mevcut olabilir; eksiklik yalnız canlı şerit kırılımındadır. Bu ayrım kullanıcıya “yön verisi yok” yerine “bazı şerit ayrıntıları gelmiyor” şeklinde anlatılmalıdır.

## Ürün açısından düzeltilmesi gereken ayrımlar

1. Mevcut API her istasyona iki yön nesnesi döndürüyor. TMS 20016, 20021 ve 20027'nin fiziksel olarak kurulmamış yönleri bu yüzden genel `INSUFFICIENT_DATA` ve sıfır akış gibi görünebiliyor. Sözleşmede `NOT_INSTALLED` veya eşdeğer açık bir durum ile resmî yön başına şerit sayısı taşınmalıdır.
2. Arayüzde yalnız “Yön 1 / Yön 2” yerine Fintraffic'in resmî hedef adları da gösterilmelidir. Sayısal yön açısı olmayan istasyonda bu adlar kullanıcıya bağlam verir; ancak sayısal bearing yerine analitik hesapta kullanılmamalıdır.
3. TMS 20021, 20024, 20025 ve 20027 için koridor kıyasının neden kullanılamadığı “yön açısı yok” şeklinde açıklanmalıdır. OSM geometrisinden açı türetilecekse bunun ayrı, test edilen bir veri politikası olması gerekir.
4. Resmî şerit satırı snapshot'ta yoksa bu durum, sıfır araç geçen mevcut bir şeritle aynı gösterilmemelidir.

## Ayrıntılı envanter

Tüm 76 istasyonun resmî yön adları, şerit sayıları, canlı yön durumu, şerit eşleşmesi, geçmiş kapsamı ve koridor uygunluğu [station-direction-audit-2026-09-24.csv](./station-direction-audit-2026-09-24.csv) dosyasındadır.

Snapshot değerleri zamanla değişebilir. Resmî yerleşim alanları Fintraffic'in istasyon tanımı değişmedikçe sabittir; canlı hız, akış, şerit satırı ve tazelik alanları anlıktır.
