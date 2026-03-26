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

### Android (Bundled)

- `npm run android:sync`
- `npm run android:install`
- `npm run android:launch`

### Android (Live Demo)

APK'nin uzaktaki web surumunu acmasi icin:

```bash
CAP_SERVER_URL=https://play.ticarnet.com npm run android:sync:live
npm run android:install
```

## Hesap Verisini Korumak

Production ortaminda su alanlari `server/.env` dosyanda ayarla:

```env
DB_FILE_PATH=/var/lib/ticarnet/db.json
UPLOAD_ROOT_DIR=/var/lib/ticarnet/uploads
AVATAR_UPLOAD_DIR=/var/lib/ticarnet/uploads/avatars
JWT_SECRET=UZUN_VE_GUVENLI_BIR_ANAHTAR
CORS_ALLOWED_ORIGINS=https://play.ticarnet.com
HEALTHCHECK_TOKEN=UZUN_VE_GIZLI_BIR_TOKEN
```

Bu yollar proje disinda oldugunda deploy sirasinda hesaplar korunur.

## Production Deploy

Detayli kurulum:
- `docs/DEPLOYMENT_TR.md`
- `docs/DIGITALOCEAN_PROD_TR.md`
- `docs/GITHUB_AUTO_DEPLOY_TR.md` (self-hosted runner ile push yapinca otomatik VPS deploy)
- `docs/VSC_SSH_DIREKT_DEPLOY_TR.md` (GitHub olmadan VS Code -> SSH direkt deploy)
- `docs/nginx.ticarnet.conf.example`

Tek komut deploy scripti:

```bash
npm run deploy:vps
```

Bu script:
- git guncellemesi alir
- `npm ci` ve `npm run build` calistirir
- DB yedegi alir
- PM2 ile servisi reload eder

GitHub kullanmadan (sunucuda VS Code Remote-SSH ile duzenleme):

```bash
bash scripts/vps-deploy.sh --skip-pull --run-lint
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
- `http://SUNUCU_IP/download/ticarnet.apk`

DigitalOcean ilk kurulum otomasyonu:

```bash
sudo bash scripts/digitalocean-prod-setup.sh --help
```

Tum Ubuntu VPS'lerde kullanilabilen genel komut:

```bash
sudo bash scripts/vps-prod-setup.sh --help
```

Yuk testi (smoke):

```bash
bash scripts/vps-load-smoke.sh --url https://play.ticarnet.com/api/health --connections 60 --duration 25
```
