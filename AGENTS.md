# Traffic Twin Proje Talimatları

Bu dosya, bu depoda çalışan kodlama ajanları için kalıcı proje kurallarını tanımlar. Kullanıcının güncel isteği her zaman bu dosyadaki genel yönlendirmelerden önceliklidir.

## Başlamadan Önce

- Ürün kapsamı için `docs/PROJECT.md`, hedef mimari için `docs/ARCHITECTURE.md`, aşamalar için `docs/ROADMAP.md`, zorunlu maddeler için `docs/BRIEF-COMPLIANCE.md` ve kabul edilmiş teknoloji kararları için `kararlar.md` dosyasını okuyun.
- Belgelerdeki `Planlandı`, `Devam ediyor` ve `Tamamlandı` durumlarını birbirine karıştırmayın. Uygulanmamış bir özelliği README veya demo belgesinde çalışıyor gibi anlatmayın.
- Staj brief'inin temel önceliğini koruyun: az sayıda özelliği sağlam altyapı, anlamlı testler ve anlaşılır mimariyle tamamlayın.
- Kararları senior full-stack geliştirici titizliğiyle alın; bu kalite hedefini brief dışı özellik veya gereksiz altyapı eklemek için gerekçe yapmayın.

## Değişiklik Sınırı

- Yalnızca istenen aşamayı veya özelliği uygulayın. Simülasyon, LLM raporu, yeni sağlayıcı ya da yönetim paneli gibi ileri kapsamları ayrıca istenmeden başlatmayın.
- Yeni soyutlamayı gelecekte gerekebilir diye eklemeyin. İlk gerçek kullanım üzerinden ilerleyin; ikinci somut kullanım ortaya çıktığında ortak sözleşmeyi çıkarın.
- Kullanıcıya gösterilen çalışma zamanı verilerinde sentetik veya mock trafik üretmeyin. Testlerde ağ ve veritabanı sınırları izole edilebilir; parser testlerinde kaynağı belirtilmiş gerçek Fintraffic payload fixture'ları tercih edilir.
- Resmî API varken web scraping eklemeyin.

## Mimari Sınırlar

- Uygulama `apps/web`, `apps/server` ve gerektiğinde `packages/domain`, `packages/contracts`, `packages/database` workspace'lerinden oluşur.
- Frontend feature'ları kendi public API'leri dışından içe aktarılmamalıdır. Feature iç dosyalarına başka feature'lardan deep import yapmayın.
- Harita render ve etkileşimden sorumludur; ingestion, analitik, sağlayıcı normalizasyonu ve iş kuralları harita feature'ına yerleştirilmez.
- React Query sunucu durumunun, URL paylaşılabilir çalışma alanı durumunun, küçük istemci store'u ise geçici harita/panel durumunun sahibidir. Aynı veriyi birden fazla state katmanında kopyalamayın.
- REST ilk yükleme ve sorgular içindir. Socket.IO canlı trafik, replay kareleri, kaynak durumu ve operatör notlarının çift yönlü yayını içindir.
- Provider verileri önce ortak domain sözleşmesine normalize edilir. Fintraffic alanlarını UI bileşenlerine veya genel domain mantığına sızdırmayın.
- Fiziksel sensör istasyonu kaynak varlıktır. Kavşak, doğrulanmış OSM geometrisi ve sensör yaklaşım eşleşmelerinden türetilir; istasyon kaydı kavşağa dönüştürülmez veya silinmez.

## Veri Doğruluğu

- Eksik hız, kapasite, yön veya zaman bilgisi için tahminî varsayılan üretmeyin; açık bir `UNKNOWN`/`INSUFFICIENT_DATA` durumu kullanın.
- API ve veritabanı zamanlarını UTC tutun. Kullanıcı arayüzünde varlığın kapsama alanı saat dilimini kullanın ve saat dilimini görünür kılın.
- Yoğunluk ve anomaliyi ayrı kavramlar olarak modelleyin. Yoğunluk mevcut akışı, anomali ise tarihsel baseline'a göre beklenmeyen sapmayı ifade eder.
- Anomali baseline'ı yapılandırılabilir kayan pencere kullanır. Sonuçla birlikte politika sürümü, pencere, örnek sayısı ve açıklama girdileri saklanır.
- Kaynak, ölçüm zamanı, veri tazeliği, kapsama ve güven bilgilerini kaybetmeyin.

## Kod Kalitesi

- TypeScript strict modunu koruyun. Dış sistem, REST, form, ortam değişkeni ve Socket.IO girdilerini Zod ile çalışma zamanında doğrulayın.
- SOLID, DRY ve KISS'i karar filtresi olarak kullanın. Anlamı farklı kodları yalnızca benziyor diye birleştirmeyin.
- Tek dosyada birden fazla akış birikmeye başladığında sorumluluğa göre bölün. Sabit dosya sayısı veya satır sayısı hedeflemek yerine bağımlılık ve değişme nedenini esas alın.
- Yorumlar kodun ne yaptığını tekrar etmemeli; yalnızca neden, veri kaynağı tuhaflığı veya önemli invariant açıklamalıdır.
- Migration dosyalarını commit edin. Şema değişikliklerini doğrudan elle uygulanmış, kayıtsız SQL olarak bırakmayın.

## Doğrulama

- Değişikliğe orantılı olarak format, lint, typecheck ve ilgili testleri çalıştırın.
- PostGIS davranışını yalnızca mock ile doğrulamayın; ilgili değişikliklerde test veritabanıyla integration testi kullanın.
- Socket.IO olaylarında hem payload doğrulamasını hem yeniden bağlanma/REST reconciliation davranışını test edin.
- Bir aşamayı tamamlandı olarak işaretlemeden önce kabul kriterlerini ve çalıştırılabilir komutları doğrulayın.

## Dil ve İsimlendirme

- Kaynak kod, dosya adları, API/DTO alanları ve commit mesajları İngilizcedir.
- Kullanıcı arayüzü ve proje belgeleri Türkçedir.
- Kullanıcıya gösterilen teknik kaynak adları gerekli olduğunda özgün biçimini koruyabilir; açıklaması Türkçe olmalıdır.
