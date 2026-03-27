# TicarNet Production Deploy (Hosting.com.tr VPS)

Bu dokuman, Hosting.com.tr uzerindeki Ubuntu VPS icin TicarNet production kurulumunu ozetler.

## 1) On Kosullar

- Ubuntu 22.04 LTS veya 24.04 LTS
- Root veya sudo yetkili bir kullanici
- Domain DNS A kaydi sunucu IP'sine yonlenmis olmali
- GitHub repository erisimi
- Gmail App Password (destek ve sifre sifirlama e-postalari icin)

Gmail notu:
- Google hesapta 2 adimli dogrulama acik olmali.
- SMTP sifresi olarak normal hesap sifresi degil, **App Password** kullanilmalidir.

## 2) Sunucuda ilk kurulum

Proje klasorunde calistir:

```bash
sudo bash scripts/vps-prod-setup.sh \
  --domain ALANADI \
  --email MAIL@ALANADI \
  --repo-url https://github.com/<org>/<repo>.git \
  --branch main \
  --smtp-user mustafaard76@gmail.com \
  --smtp-app-password GMAIL_APP_PASSWORD \
  --mail-from "TicarNet Online <mustafaard76@gmail.com>" \
  --support-inbox-email mustafaard76@gmail.com
```

Script su adimlari uygular:
- Node.js 20 + PM2 + Nginx kurar
- `server/.env` dosyasini production degerleriyle gunceller
- `npm ci` + `npm run check:production-env` + `npm run build` calistirir
- PM2 servisini ayarlar
- Nginx reverse proxy + SSL (Let's Encrypt) kurar

## 3) Production env zorunlu alanlar

`server/.env` icinde en az su degerler dogru olmalidir:

```env
NODE_ENV=production
API_HOST=127.0.0.1
API_PORT=8787
CLIENT_URL=https://ALANADI
RESET_LINK_BASE_URL=https://ALANADI
CORS_ALLOWED_ORIGINS=https://ALANADI
JWT_SECRET=<uzun-rastgele-secret>
HEALTHCHECK_TOKEN=<uzun-rastgele-token>
DB_FILE_PATH=/var/lib/ticarnet/db.json
UPLOAD_ROOT_DIR=/var/lib/ticarnet/uploads
AVATAR_UPLOAD_DIR=/var/lib/ticarnet/uploads/avatars

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=mustafaard76@gmail.com
SMTP_APP_PASSWORD=<gmail-app-password>
MAIL_FROM="TicarNet Online <mustafaard76@gmail.com>"

SUPPORT_INBOX_EMAIL=mustafaard76@gmail.com
```

## 4) E-posta akislari

- Destek talepleri `SUPPORT_INBOX_EMAIL` adresine gider.
- Sifre sifirlama e-postasi icin SMTP ayarlari zorunludur.
- SMTP gecici sorun yasarsa destek ticket kaydi DB'de kaybolmaz (`supportTickets`).

## 5) APK yayin linki

Public sabit APK linki:

- `/download/ticarnet.apk`

Sunucu uzerinden:

```bash
npm run apk:publish:web -- --source /path/to/ticarnet.apk
```

Bu komut:
- `public/download/ticarnet.apk` dosyasini gunceller
- `public/download/latest.json` uretir
- `public/download/index.html` sayfasinda tek indirme butonu birakir

## 6) Operasyon komutlari

PM2 durum:

```bash
pm2 status
pm2 logs ticarnet-api --lines 200
```

Nginx test:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

Health check:

```bash
curl -fsS http://127.0.0.1:8787/api/health
```

Production env self-check:

```bash
npm run check:production-env
```
