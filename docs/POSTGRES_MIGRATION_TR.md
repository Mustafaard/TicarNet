# TicarNet PostgreSQL Geçiş Planı (Kesintisiz)

Bu planın amacı mevcut JSON tabanlı çalışma düzeninden PostgreSQL’e **servis kesintisi olmadan** geçmektir.

## 1) Hedef Mimari

- Uygulama veri erişimi için tek bir `data access layer` (DAL) kullanır.
- Geçiş sürecinde:
  - Yazma işlemleri: JSON + PostgreSQL (dual-write)
  - Okuma işlemleri: önce JSON, doğrulama sonrası PostgreSQL
- Acil geri dönüş için tek env anahtarıyla JSON moduna dönülebilir.

Önerilen env değişkenleri:

```env
DB_PROVIDER=json
POSTGRES_ENABLED=false
POSTGRES_URL=postgresql://ticarnet:password@127.0.0.1:5432/ticarnet
DB_DUAL_WRITE=false
DB_READ_SOURCE=json
```

## 2) Şema Tasarımı (İlk Faz)

İlk fazda kritik tablolar:

- `users`
- `game_profiles`
- `global_announcements`
- `direct_messages`
- `friend_requests`
- `admin_audit_logs`
- `admin_action_requests`
- `chat_rooms`
- `chat_messages`

Not:
- JSON içindeki nested alanlar (ör. bazı profil alt alanları) ilk geçişte `jsonb` olarak tutulabilir.
- Sonraki fazlarda normalize edilir.

## 3) Geçiş Aşamaları

### Aşama A: Hazırlık

1. PostgreSQL sunucusunu kur.
2. Ayrı kullanıcı/veritabanı oluştur (`ticarnet`).
3. Uygulama için migration altyapısı ekle (örn. SQL migration dosyaları).
4. Test ortamında boş şemayı ayağa kaldır.

### Aşama B: Veri Aktarım Aracı

1. JSON `db.json` dosyasını okuyup PostgreSQL’e idempotent yazan script hazırla.
2. Script tekrar çalıştırıldığında veri bozmayacak şekilde `upsert` kullan.
3. Aktarım sonrası satır sayısı ve checksum raporu üret.

### Aşama C: Shadow (Dual-Write) Dönemi

1. Uygulama yazma yollarında JSON sonrası PostgreSQL yazmasını ekle.
2. PostgreSQL yazma başarısızsa:
   - JSON başarıyla yazılmışsa logla, alarm üret.
   - kritik endpointlerde isteğe göre hard-fail stratejisi uygula.
3. Bu dönemde okuma hâlâ JSON’dan yapılır.

### Aşama D: Doğrulama

1. Günlük kıyas raporu:
   - kullanıcı/profil sayıları
   - duyuru sayısı
   - son 24 saat DM sayısı
2. Fark varsa otomatik uyarı üret.
3. En az 3-7 gün tutarlı kıyas sağlanmadan read switch yapılmaz.

### Aşama E: Read Switch

1. `DB_READ_SOURCE=postgres` ile önce düşük riskli endpointleri geçir.
2. Sonra tüm okuma akışlarını PostgreSQL’e al.
3. JSON yedek/restore mekanizmasını bir süre daha pasif yedek olarak koru.

### Aşama F: Tam Geçiş

1. `DB_PROVIDER=postgres`
2. `DB_DUAL_WRITE=false`
3. JSON yazma kodu kaldırılmaz, en az bir sürüm daha “fallback mode” olarak tutulur.

## 4) Geri Dönüş Planı (Rollback)

Anlık geri dönüş:

```env
DB_PROVIDER=json
DB_READ_SOURCE=json
DB_DUAL_WRITE=false
POSTGRES_ENABLED=false
```

Koşullar:
- PostgreSQL latency kritik eşik üstüne çıkarsa
- veri kıyas raporunda tutarsızlık tespit edilirse
- migration sonrası login/oyun döngüsü hataları görülürse

## 5) Kesintisiz Geçiş İçin Operasyon Kuralları

- Geçiş penceresinde `data:reset` ve destructive scriptler kapalı olmalı.
- Her aşama öncesi:
  - `backup:db:verify:strict`
  - PostgreSQL snapshot yedeği
- Geçiş günü:
  - canlı metrik paneli izleme (`/api/health/system`)
  - hata loglarını anlık izleme

## 6) Kabul Kriterleri

- Login, kayıt, profil güncelleme, mesajlaşma, duyuru akışları hatasız.
- 72 saat boyunca JSON/PG kıyas raporu tutarlı.
- P95 API sürelerinde anlamlı regresyon yok.
- Rollback anahtarı doğrulanmış.

## 7) Sonraki Teknik İş Paketleri

1. DAL soyutlama katmanını ekleme.
2. İlk PostgreSQL migration dosyalarını oluşturma.
3. JSON -> PostgreSQL backfill scripti yazma.
4. Dual-write’i `users`, `game_profiles`, `global_announcements` ile başlatma.
5. Kıyas raporlayıcı cron scriptini ekleme.
