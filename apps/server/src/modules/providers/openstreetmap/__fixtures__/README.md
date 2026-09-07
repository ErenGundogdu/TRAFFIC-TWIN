# OpenStreetMap Fixture Kaynağı

`junction.sample.json`, 5 Eylül 2026 tarihinde genel Overpass API üzerinden alınan OSM `relation/11264073` kavşak ilişkisi ile ilişkideki gerçek yol etiketlerinin küçültülmüş örneğidir.

Sorgu, `type=junction` ilişkisini ve `way(r.junctions)[highway]` üyelerini `out body center` biçiminde istemiştir. Fixture yalnız parser ve eşleştirme testlerinde kullanılır; çalışma zamanında sentetik veri kaynağı değildir.

`road-context.sample.json`, 7 Eylül 2026 tarihinde TMS 20002 çevresinde `way(around:120,60.220898,24.637997)[highway]` sorgusuyla alınan gerçek Overpass yanıtının küçültülmüş örneğidir. Yol referansı `1` olan iki Turunväylä taşıt yolu ile referans filtresinin dışarıda bırakması gereken bir yakın yol korunmuştur.

Veri: OpenStreetMap katkıcıları, ODbL.
