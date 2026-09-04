# Katkı ve Geliştirme Düzeni

## Temel Yaklaşım

Her değişiklik küçük, çalıştırılabilir ve test edilebilir bir dikey dilim olmalıdır. Refactor ile davranış değişikliğini mümkün olduğunca ayrı commit'lerde tutun. İlgisiz dosyaları veya kullanıcıya ait mevcut değişiklikleri düzeltme amacıyla değiştirmeyin.

## Commit Mesajları

Commit mesajları İngilizce ve anlamlı olmalıdır. Conventional Commits biçimi kullanılacaktır:

```text
feat(telemetry): normalize Fintraffic station observations
fix(realtime): reconcile snapshot after socket reconnect
test(analytics): cover rolling baseline minimum samples
docs(architecture): record retention policy
```

## Kod Kontrolleri

Mevcut kalite kapıları kökten şu komutlarla çalışır:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm build
```

PostGIS ve iki gerçek istemcili Socket.IO integration testleri ayrı `pnpm test:integration` komutuyla çalışır. Komutlar gerçekten eklenip doğrulanmadan README'de kullanılabilir olarak gösterilmemelidir.

## Pre-commit

Husky ve lint-staged yalnızca staged dosyalar üzerinde Prettier, ESLint ve uygun hızlı unit testleri çalıştırır. Docker/PostGIS integration testleri ve production build her commit'i gereksiz yavaşlatmamak için ayrıca çalıştırılır.

## Test Verisi

- Çalışan uygulamada sentetik/mock trafik yoktur.
- Fintraffic fixture'ları gerçek yanıttan alınır, kişisel veri içermez ve kaynak/tarih bilgisiyle belgelenir.
- Unit testler dış bağımlılık sınırlarını izole edebilir.
- PostGIS sorguları ve migration'lar ayrı test veritabanında integration testiyle doğrulanır.
- Canlı API smoke testi varsayılan test paketine dahil edilmez.

## Dokümantasyon

Yeni veya değişen mimari karar `kararlar.md` ve gerekiyorsa hedef mimaride güncellenir. Tamamlanan aşama `docs/ROADMAP.md` içinde ancak kabul kriterleri doğrulandıktan sonra işaretlenir. README yalnızca mevcut çalışan davranışı açıkça anlatmalı; gelecek özellikleri hedef olarak etiketlemelidir.
