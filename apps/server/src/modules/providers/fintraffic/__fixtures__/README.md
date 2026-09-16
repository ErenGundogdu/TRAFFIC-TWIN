# Fintraffic Test Fixture'ları

Bu dizindeki payload'lar sentetik trafik üretmek için kullanılmaz. Yalnızca parser ve normalizer unit testlerinde kullanılan, gerçek Fintraffic cevaplarından küçültülmüş kayıtlardır.

- Kaynak: `https://tie.digitraffic.fi/api/tms/v1/stations`
- Kaynak: `https://tie.digitraffic.fi/api/tms/v1/stations/data`
- Kaynak: `https://tie.digitraffic.fi/api/tms/v1/stations/20002/data`
- İstasyon: `20002` — `vt1_Espoo_Hirvisuo`
- Alınma tarihi: `2026-09-04`
- Akış oranı kesiti alınma tarihi: `2026-09-08`
- Lisans: CC BY 4.0, Fintraffic / Digitraffic

Alan değerleri değiştirilmemiş, yalnızca test kapsamında kullanılmayan diğer istasyonlar ve sensörler çıkarılmıştır.

`station-flow-ratios.sample.json`, aynı istasyonun Fintraffic tarafından `VVAPAAS1/2` ve `MS1/2` sabitleriyle hesaplanan dört yön bazlı kayan beş dakika yüzde sensörünü içerir.

`traffic-announcements.sample.json` ve `roadworks.sample.json`, resmî Simple JSON v2 uçlarından 14 Eylül 2026 tarihinde alınan birer gerçek olayın kullanılmayan alanları çıkarılmış kesitleridir.

`history.sample.csv`, TMS 20002 için 2026-09-03 tarihli resmî ham geçmiş dosyasından (`lamraw_20002_26_246.csv`) 2026-09-04 tarihinde alınmış beş satırlık bir kesittir. Kaynak tarafından hatalı işaretlenmiş bir satır, dışlama davranışını doğrulamak için korunmuştur.
