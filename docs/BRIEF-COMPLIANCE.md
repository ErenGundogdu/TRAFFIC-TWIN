# Staj Brief'i Uyumluluk Matrisi

Bu belge brief'in zorunlu maddelerinin nerede uygulanacağını ve nasıl doğrulanacağını izler. Bir satır yalnızca belirtilen kanıt üretildiğinde `Tamamlandı` yapılır.

| Brief gereksinimi                  | Planlanan kullanım                                               | Aşama | Durum / kanıt                                             |
| ---------------------------------- | ---------------------------------------------------------------- | ----: | --------------------------------------------------------- |
| Next.js App Router + TypeScript    | `apps/web`                                                       |     1 | Tamamlandı: build/typecheck                               |
| Feature-based klasör yapısı        | Web feature'ları ve server modülleri, public API sınırları       |   1–5 | Aşama 2 feature/modülleriyle doğrulandı                   |
| ESLint + Prettier                  | Kökten çalışabilen lint ve format komutları                      |     1 | Tamamlandı: `pnpm lint`, `pnpm format:check`              |
| Husky + lint-staged                | Staged dosyalarda lint, format ve uygun hızlı testler            |     1 | Tamamlandı: `.husky/pre-commit`                           |
| React Query                        | REST bootstrap, katalog, geçmiş, analitik ve not server state'i  |   2–4 | Katalog, canlı uzlaşma, not ve geçmiş tamamlandı          |
| React Hook Form + Zod              | Operatör notu ve gelişmiş tarih/metrik filtre formları           |   3–4 | Not ve URL tabanlı analiz filtresi tamamlandı             |
| Axios ortak instance + interceptor | Web REST client; ortak base URL, timeout ve hata normalizasyonu  |     2 | Tamamlandı: schema alan generic client + tipli ortak hata |
| WebSocket ana veri akışı           | Express/Socket.IO → Next.js canlı istasyon batch'leri            |     3 | Tamamlandı: gerçek canlı batch + REST uzlaşması           |
| WebSocket çift yönlü özellik       | Operatör notu create acknowledgement ve broadcast                |     3 | Tamamlandı: kalıcılık + iki istemcili test                |
| AI destekli içgörü                 | Gerçek veride kayan median/MAD baseline ve açıklanabilir anomali |     5 | Tamamlandı: gerçek 6 haftalık kanıt + UI                  |
| Parsing/dönüştürme unit testleri   | Gerçek Fintraffic fixture'larıyla normalizasyon                  |     2 | Tamamlandı: kaynak/tarih belgeli fixture                  |
| Form validasyon unit testleri      | Operatör notu ve filtre Zod şemaları                             |   3–4 | Not ve geçmiş sorgu sözleşmeleri doğrulandı               |
| En az bir custom hook testi        | React Query/Socket.IO reconciliation hook'u                      |     3 | `useRealtimeSync` testi tamamlandı                        |
| Harita teknolojisi kararı          | MapLibre GL JS + gerekçe                                         |     0 | `kararlar.md`                                             |
| Trafik/veri kaynağı kararı         | Fintraffic TMS + OSM + gerekçe                                   |     0 | `kararlar.md`                                             |
| AI yaklaşımı kararı                | Açıklanabilir istatistiksel anomali + gerekçe                    |     0 | `kararlar.md`                                             |
| WebSocket mimarisi kararı          | Ayrı Express + Socket.IO server + gerekçe                        |     0 | `kararlar.md`                                             |
| README                             | Gerçek kurulum, çalıştırma ve mimari özeti                       |     6 | Tamamlandı: kurulum, demo verisi ve doğrulama             |
| Anlamlı commit geçmişi             | İngilizce Conventional Commits                                   |  Tümü | Aşama bazlı Conventional Commit geçmişi mevcut            |
| Test çalıştırma komutu             | Kök `pnpm test` ve ilgili ayrıntılar                             |   1/6 | Güncel: 173 unit/component + 13 integration               |
| Yaklaşık 10 dakikalık demo         | Canlı izleme, analiz/replay, anomali ve not akışı                |     6 | Tamamlandı: `docs/DEMO.md`                                |

## Kapsam Koruması

Authentication, gerçek ML modeli eğitimi, tam mobil optimizasyon, çoklu dil ve production CI/CD MVP için zorunlu değildir. LLM raporu, simülasyon, yeni sağlayıcı ve yönetim paneli ancak zorunlu satırlar doğrulandıktan sonra değerlendirilir.
