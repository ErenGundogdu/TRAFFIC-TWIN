# OpenStreetMap Fixture Kaynağı

`junction.sample.json`, 5 Eylül 2026 tarihinde genel Overpass API üzerinden alınan OSM `relation/11264073` kavşak ilişkisi ile ilişkideki gerçek yol etiketlerinin küçültülmüş örneğidir.

Sorgu, `type=junction` ilişkisini ve `way(r.junctions)[highway]` üyelerini `out body center` biçiminde istemiştir. Fixture yalnız parser ve eşleştirme testlerinde kullanılır; çalışma zamanında sentetik veri kaynağı değildir.

Veri: OpenStreetMap katkıcıları, ODbL.
