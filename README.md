# TicarNet Online

TicarNet, React + Vite istemcisi, Express API ve Capacitor Android katmanindan olusan bir online oyun projesidir.

## Platformlar

- Web: tarayici uzerinden yayina acilir
- PC: herhangi bir masaustu tarayicidan oynanir
- Android: Capacitor ile APK cikisi alinabilir

## Teknoloji

- Frontend: React 19, Vite 7
- Backend: Node.js, Express 5, ws
- Mobil: Capacitor 8 (Android)
- Surekli servis: PM2 + Nginx (production)
- Guvenlik: API rate-limit, WebSocket abuse guard, VPS fail2ban + Nginx rate-limit

## Yerel Gelistirme

```bash
npm install
npm run dev
```

Varsayilan adresler:
- Web: `http://localhost:5173`
- API: `http://localhost:8787`

## Kritik Komutlar

- `npm run dev`: web + API birlikte calisir
- `npm run api:dev`: sadece API
- `npm run build`: production web build
- `npm run verify`: lint + build kontrolu
- `npm run ship`: tek komutla `git add + commit + push` (sunucu deploy tetikleme)
- `npm run ship:mobile`: demo APK build + `/download/ticarnet.apk` hazirlama + `git push`
- `npm run season:reset`: tum profillerin sezon puanini (league.seasonPoints) sifirlar

### Android (Bundled)

- `npm run android:sync`
- `npm run android:install`
- `npm run android:launch`

### Android (Live Demo)

APK'nin uzaktaki web surumunu acmasi icin:

```bash
CAP_SERVER_URL=https://ticarnet.tr npm run android:sync:live
npm run android:install
```

Not:
- Native push (FCM) kullanmak istiyorsan Android projesinde `android/app/google-services.json` olmalidir.
- Firebase hazir degilse crash engellemek icin push varsayilan olarak kapali gelir.
- Acmak icin build oncesi: `VITE_NATIVE_PUSH_ENABLED=true`

## Hesap Verisini Korumak

Production ortaminda su alanlari `server/.env` dosyanda ayarla:

```env
DB_FILE_PATH=/var/lib/ticarnet/db.json
UPLOAD_ROOT_DIR=/var/lib/ticarnet/uploads
AVATAR_UPLOAD_DIR=/var/lib/ticarnet/uploads/avatars
JWT_SECRET=UZUN_VE_GUVENLI_BIR_ANAHTAR
CORS_ALLOWED_ORIGINS=https://ticarnet.tr
HEALTHCHECK_TOKEN=UZUN_VE_GIZLI_BIR_TOKEN
```

Bu yollar proje disinda oldugunda deploy sirasinda hesaplar korunur.

## Production Deploy

Detayli kurulum:
- `docs/DEPLOYMENT_TR.md`
- `docs/HOSTING_COMTR_VPS_XLARGE_TR.md`
- `docs/GITHUB_AUTO_DEPLOY_TR.md` (self-hosted runner ile push yapinca otomatik VPS deploy)
- `docs/VSC_SSH_DIREKT_DEPLOY_TR.md` (GitHub olmadan VS Code -> SSH direkt deploy)
- `docs/nginx.ticarnet.conf.example`

Hosting panel terminalinde sifirdan kurulum (yeniden kurulum sonrasi tek satir):

```bash
apt-get update -y && apt-get install -y curl ca-certificates && bash <(curl -fsSL https://raw.githubusercontent.com/Mustafaard/TicarNet/main/scripts/vps-panel-bootstrap.sh) --non-interactive --domain ticarnet.tr --email mustafaard76@gmail.com --repo-url https://github.com/Mustafaard/TicarNet.git --branch main --smtp-user mustafaard76@gmail.com --support-inbox-email mustafaard76@gmail.com --mail-from "TicarNet Online <mustafaard76@gmail.com>"
```

DNS hazir degilse gecici HTTP/IP kurulum:

```bash
apt-get update -y && apt-get install -y curl ca-certificates && bash <(curl -fsSL https://raw.githubusercontent.com/Mustafaard/TicarNet/main/scripts/vps-panel-bootstrap.sh) --non-interactive --skip-ssl --domain 178.210.161.210 --public-base-url http://178.210.161.210 --repo-url https://github.com/Mustafaard/TicarNet.git --branch main --smtp-user mustafaard76@gmail.com --support-inbox-email mustafaard76@gmail.com --mail-from "TicarNet Online <mustafaard76@gmail.com>"
```

VNC terminal uzun argumanlari bozuyorsa kisa yol:

```bash
git clone --depth 1 https://github.com/Mustafaard/TicarNet.git /root/TicarNet
cd /root/TicarNet
export DOMAIN=178.210.161.210
export PUBLIC_BASE_URL=http://178.210.161.210
export ENABLE_SSL=0
export NON_INTERACTIVE=1
export FIREBASE_AUTH_ENABLED=false
bash scripts/vps-panel-bootstrap.sh
```

Domain + SSL ile:

```bash
sudo bash scripts/vps-fresh-install.sh --domain ticarnet.tr --enable-ssl --email admin@ticarnet.tr
```

Domain + SSL + SMTP (sifre yenileme e-postasi icin onerilen):

```bash
sudo bash scripts/vps-fresh-install.sh \
  --domain ticarnet.tr \
  --enable-ssl \
  --email admin@ticarnet.tr \
  --smtp-user YOUR_GMAIL@gmail.com \
  --smtp-app-password YOUR_GMAIL_APP_PASSWORD \
  --mail-from "TicarNet Online <YOUR_GMAIL@gmail.com>" \
  --support-inbox-email YOUR_GMAIL@gmail.com
```

Sunucuda GitHub'a pushlanan son kodu tek komutla cekip guncellemek icin:

```bash
cd /var/www/ticarnet/current && bash scripts/vps-update.sh
```

Bu script:
- git guncellemesi alir
- `npm ci` ve `npm run build` calistirir
- DB yedegi alir
- PM2 ile servisi reload eder

GitHub kullanmadan (sunucuda VS Code Remote-SSH ile duzenleme):

```bash
bash scripts/vps-update.sh
```

GitHub kullanmadan (lokal VS Code'dan SSH ile tek komut upload + deploy):

```powershell
npm run deploy:vps:ssh
```

GitHub + otomatik deploy tetikleme (tek komut):

```powershell
npm run ship
```

Telefon indirme APK dosyasini da ayni anda guncellemek icin:

```powershell
npm run ship:mobile
```

Bu komut sonunda dosya su adrese duser:
- `https://ticarnet.tr/download/ticarnet.apk`

PowerShell'de kontrol icin `curl` yerine `curl.exe` kullan:

```powershell
curl.exe -s "https://ticarnet.tr/api/health"
curl.exe -I "https://ticarnet.tr/download/ticarnet.apk"
```

Tum Ubuntu VPS'lerde kullanilabilen genel komut:

```bash
sudo bash scripts/vps-prod-setup.sh --help
```

Sifre sifirlama e-postasi dogrulamasi:

```bash
cd /var/www/ticarnet/current
grep -E "^(SMTP_USER|SMTP_APP_PASSWORD|MAIL_FROM|RESET_LINK_BASE_URL)=" server/.env
curl -s http://127.0.0.1:8787/api/health
```

Yuk testi (smoke):

```bash
bash scripts/vps-load-smoke.sh --url https://ticarnet.tr/api/health --connections 60 --duration 25
```
