# TicarNet Production Deploy Rehberi

Bu rehber ile su hedefleri tamamlarsin:
- Oyun web uzerinden herkese acilir (telefon + PC tarayici)
- API tek sunucuda guvenli sekilde calisir
- Hesap verileri deploy sirasinda korunur
- VS Code ile guncelleme yapip tek komutla yayina alabilirsin
- Android APK demo uretebilirsin (bundled veya live mode)

## Hizli Yol (Aktif VPS Akisi)

Bu proje icin aktif ve desteklenen sunucu kurulumu:
- `docs/HOSTING_COMTR_VPS_XLARGE_TR.md`
- `scripts/vps-prod-setup.sh`

## 1) Onerilen Mimari

- Isletim sistemi: Ubuntu 20.04 LTS veya Ubuntu 22.04 LTS
- Sunucu: minimum 2 vCPU / 4 GB RAM / 80 GB SSD
- Web sunucu: Nginx
- Process manager: PM2
- Node.js: 20 LTS
- Veri kaliciligi:
  - `DB_FILE_PATH=/var/lib/ticarnet/db.json`
  - Upload dizini proje disinda kalici yol

Neden?
- Kod deploy edilirken hesap verisi repo disinda kaldigi icin silinmez.
- `pm2 startOrReload` ile servis kesintisi minimuma iner.
- Nginx ayni domain altinda `/api` proxy yaptigi icin web + websocket stabil calisir.

### Sunucu Notu

- Bu kurulum Ubuntu VPS uzerinde calisir.
- Aktif operasyon senaryosu: Hosting.com.tr VPS.
- Hosting panelde Ubuntu kullanirken `administrator / RDP` bilgilerini degil, `Terminal` veya `VNC` ekranindaki `root` oturumunu kullan.

### Panel Terminalinde Sifirdan Kurulum

Temiz Ubuntu ekrani geldiyse su tek satir yeterlidir:

```bash
apt-get update -y && apt-get install -y curl ca-certificates && bash <(curl -fsSL https://raw.githubusercontent.com/Mustafaard/TicarNet/main/scripts/vps-panel-bootstrap.sh) --non-interactive --domain ticarnet.tr --email mustafaard76@gmail.com --repo-url https://github.com/Mustafaard/TicarNet.git --branch main --smtp-user mustafaard76@gmail.com --support-inbox-email mustafaard76@gmail.com --mail-from "TicarNet Online <mustafaard76@gmail.com>"
```

DNS hazir degilse gecici HTTP/IP kurulumu:

```bash
apt-get update -y && apt-get install -y curl ca-certificates && bash <(curl -fsSL https://raw.githubusercontent.com/Mustafaard/TicarNet/main/scripts/vps-panel-bootstrap.sh) --non-interactive --skip-ssl --domain 178.210.161.210 --public-base-url http://178.210.161.210 --repo-url https://github.com/Mustafaard/TicarNet.git --branch main --smtp-user mustafaard76@gmail.com --support-inbox-email mustafaard76@gmail.com --mail-from "TicarNet Online <mustafaard76@gmail.com>"
```

## 2) Ilk Kurulum

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm i -g pm2
```

Proje:

```bash
sudo mkdir -p /var/www/ticarnet
sudo chown -R $USER:$USER /var/www/ticarnet
cd /var/www/ticarnet
git clone <REPO_URL> current
cd current
npm ci
```

Kalici veri dizinleri:

```bash
sudo mkdir -p /var/lib/ticarnet/uploads/avatars
sudo chown -R $USER:$USER /var/lib/ticarnet
```

`server/.env` icinde kritik alanlar:

```env
NODE_ENV=production
CLIENT_URL=https://ticarnet.tr
RESET_LINK_BASE_URL=https://ticarnet.tr
CORS_ALLOWED_ORIGINS=https://ticarnet.tr
CORS_ALLOW_NO_ORIGIN=true
HEALTHCHECK_TOKEN=UZUN_VE_GIZLI_BIR_TOKEN
WS_ALLOW_QUERY_TOKEN=false
MAX_ACCOUNTS_PER_SCOPE=2
ENFORCE_REGISTER_IP_ON_LOGIN=false
ENFORCE_REGISTER_SUBNET_ON_LOGIN=false
ACCOUNT_DELETION_ENABLED=false
DB_FILE_PATH=/var/lib/ticarnet/db.json
UPLOAD_ROOT_DIR=/var/lib/ticarnet/uploads
AVATAR_UPLOAD_DIR=/var/lib/ticarnet/uploads/avatars
JWT_SECRET=UZUN_VE_GUVENLI_BIR_ANAHTAR
```

## 3) Nginx Ayari

Bu dosyayi baz al:
- `docs/nginx.ticarnet.conf.example`

Aktif et:

```bash
sudo cp docs/nginx.ticarnet.conf.example /etc/nginx/sites-available/ticarnet.conf
sudo ln -s /etc/nginx/sites-available/ticarnet.conf /etc/nginx/sites-enabled/ticarnet.conf
sudo nginx -t
sudo systemctl reload nginx
```

SSL:
- Let's Encrypt ile sertifika alip conf icindeki sertifika yollarini guncelle.

## 4) Ilk Production Baslatma

```bash
npm run build
pm2 start ecosystem.config.cjs --update-env
pm2 save
pm2 startup
```

Kontrol:

```bash
pm2 status
curl http://127.0.0.1:8787/api/health
curl http://127.0.0.1:8787/api/health/backup
curl http://127.0.0.1:8787/api/health/system
sudo fail2ban-client status
sudo fail2ban-client status ticarnet-auth-abuse
bash scripts/vps-load-smoke.sh --url https://ticarnet.tr/api/health --connections 60 --duration 25
```

## 5) VS Code ile Guncelleme (Hesaplar Korunarak)

En temiz yol:
1. VS Code `Remote - SSH` ile VPS'e baglan.
2. `/var/www/ticarnet/current` klasorunu ac.
3. Kod degisikligini push et veya serverda `git pull` ile cek.
4. Asagidaki tek komutu calistir:

```bash
cd /var/www/ticarnet/current
bash scripts/vps-update.sh
```

Bu komut ne yapar?
- `scripts/vps-update.sh` calisir
- `scripts/vps-deploy.sh` tetiklenir
- DB dosyasinin yedegini alir (`/var/backups/ticarnet`)
- `npm ci` + `npm run build`
- PM2 ile API servisini reload eder

Hesap politikasini acik kayit modunda sabitlemek icin:

```bash
sudo bash scripts/vps-apply-account-policy.sh \
  --max-accounts-per-scope 2 \
  --enforce-register-ip-on-login false \
  --enforce-register-subnet-on-login false
```

Guvenlik kontrolu:

```bash
npm run backup:db:verify:strict
```

## 6) Android APK Akislari

### A) Bundled APK (Store icin uygun)
Bu modda web dosyalari APK icine gomulur.

```bash
npm run android:sync
npm run android:install
```

### B) Live APK (Demo ve hizli guncelleme)
Bu modda APK uzaktaki siteyi acar. Web deploy ettiginde APK hemen yeni surumu gorur.

```bash
CAP_SERVER_URL=https://ticarnet.tr npm run android:sync:live
npm run android:install
```

Not:
- `live` mod demo icin cok pratiktir.
- Store release icin genelde `bundled` tercih edilir.

## 7) Hesap Kaybi Yasamamak Icin Kontrol Listesi

- `DB_FILE_PATH` mutlaka proje disi kalici dizinde olsun.
- `npm run data:reset` komutunu production ortaminda calistirma.
- `DB_HARD_STOP_ON_EMPTY_WRITE=true` acik olsun (bos users/profiles write engeli).
- Deploy oncesi DB yedegi alinmis olmali (`/var/backups/ticarnet`).
- `server/.env` dosyasini git'e koyma.
- SSL ve domain ayarlari tamamlanmadan herkese acik duyuru yapma.

Geri yukleme (sadece zorunlu durumda):

```bash
npm run data:restore -- --confirm=RESTORE_TICARNET_DB --i-understand-overwrite
```



