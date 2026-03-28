# Hosting.com.tr VPS XLarge Kurulum (Web + APK)

Bu akis, `TicarNet` oyununu ayni backend ile:
- web (tarayici)
- Android APK

olarak online calistirir.

Not:
- Evet, `VPS - XLarge (8 vCPU / 8 GB RAM)` bu is icin uygundur.
- Kurulum Ubuntu 20.04 / 22.04 icin gecerli.

## 1) Satin Alirken Secilecekler

Hosting.com.tr panelde:
1. Paket: `VPS - XLarge`
2. Isletim sistemi: `Ubuntu 20.04 LTS` veya `Ubuntu 22.04 LTS`
3. Lokasyon: Turkiye (oyuncu kitlen TR ise)
4. Root erisimi aktif

Domain gerekiyorsa ornek: `ticarnet.tr`

## 2) DNS Ayari

Domain yonetiminde A kaydi:
- Host: `@`
- Type: `A`
- Value: `VPS_IP`

Istersen ek olarak:
- Host: `www`
- Type: `A`
- Value: `VPS_IP`

DNS yayilimi tamamlaninca devam et.

## 3) Panel ekranina gore dogru giris

Bu panelde Ubuntu kurulu olsa bile `Erisim Bilgileri` sekmesinde `administrator / RDP` bilgisi gorunebilir.
Bu bilgi Linux `root` terminal sifresi yerine gecmez.

Temiz kurulum sonrasi dogru yol:
- `Terminal` butonu veya `VNC` ekrani
- login: `root`
- sonra panel terminalinden asagidaki tek satir

## 4) Tek Satir Ilk Kurulum (GitHub'dan cekip kurar)

Sunucuda:

```bash
apt-get update -y && apt-get install -y curl ca-certificates && bash <(curl -fsSL https://raw.githubusercontent.com/Mustafaard/TicarNet/main/scripts/vps-panel-bootstrap.sh) --non-interactive --domain ticarnet.tr --email mustafaard76@gmail.com --repo-url https://github.com/Mustafaard/TicarNet.git --branch main --smtp-user mustafaard76@gmail.com --support-inbox-email mustafaard76@gmail.com --mail-from "TicarNet Online <mustafaard76@gmail.com>"
```

DNS henuz hazir degilse gecici IP kurulumu:

```bash
apt-get update -y && apt-get install -y curl ca-certificates && bash <(curl -fsSL https://raw.githubusercontent.com/Mustafaard/TicarNet/main/scripts/vps-panel-bootstrap.sh) --non-interactive --skip-ssl --domain 178.210.161.210 --public-base-url http://178.210.161.210 --repo-url https://github.com/Mustafaard/TicarNet.git --branch main --smtp-user mustafaard76@gmail.com --support-inbox-email mustafaard76@gmail.com --mail-from "TicarNet Online <mustafaard76@gmail.com>"
```

VNC terminal uzun satirlari bozuyorsa daha saglam yol:

```bash
apt-get update -y
apt-get install -y git curl ca-certificates
rm -rf /root/TicarNet
git clone --depth 1 https://github.com/Mustafaard/TicarNet.git /root/TicarNet
cd /root/TicarNet
export DOMAIN=178.210.161.210
export PUBLIC_BASE_URL=http://178.210.161.210
export ENABLE_SSL=0
export NON_INTERACTIVE=1
export FIREBASE_AUTH_ENABLED=false
bash scripts/vps-panel-bootstrap.sh
```

Bu komut otomatik kurar:
- Nginx + SSL
- PM2
- firewall + fail2ban
- rate-limit
- DB backup cron
- guvenli env ayarlari

Kurulumdan sonra acik kayit politikasini (herkes girsin, ayni IP'de max 2 hesap) tekrar uygulamak icin:

```bash
cd /var/www/ticarnet/current
sudo bash scripts/vps-apply-account-policy.sh \
  --max-accounts-per-scope 2 \
  --enforce-register-ip-on-login false \
  --enforce-register-subnet-on-login false
```

## 5) Canli Kontrol

```bash
sudo -u deploy pm2 status
curl -s http://127.0.0.1:8787/api/health
curl -I https://ticarnet.tr
sudo fail2ban-client status
```

## 6) Web + APK Calisma Modeli

### 6.1 Web
Kullanicilar direkt:
- `https://ticarnet.tr`

### 6.2 APK (Canli Sunucuya Bagli)
Bu modda web deploy ettiginde APK otomatik yeni surumu gorur.

Local bilgisayarinda proje klasorunde:

```bash
CAP_SERVER_URL=https://ticarnet.tr npm run android:deploy:live
```

### 6.3 APK (Bundled)
Store release yaklasiminda APK icine o anki web dosyalari gomulur:

```bash
npm run android:release:apk
```

## 7) GitHub Push Sonrasi Tek Komut Guncelleme

Sunucuda:

```bash
cd /var/www/ticarnet/current
bash scripts/vps-update.sh
```

Bu komut:
- GitHub'daki `main` branch'i ceker
- lokal kirli kodu temizler
- `npm ci` + `npm run lint` + `npm run build` calistirir
- DB yedegi alir
- PM2 reload yapar

Kod degisikligini GitHub'a attiktan sonra sunucuda sadece bu komutu calistirman yeterlidir.

## 8) Kritik Notlar

- `%100 guvenlik` yoktur; bu kurulum ciddi seviyede koruma saglar.
- `MAX_ACCOUNTS_PER_SCOPE=2` ayari aktif (ayni IP/Wi-Fi uzerinde 2 hesap limiti).
- Farkli IP/subnet login engeli kapali: `ENFORCE_REGISTER_IP_ON_LOGIN=false`, `ENFORCE_REGISTER_SUBNET_ON_LOGIN=false`.
- DB dosyasi proje disinda kalici dizinde oldugu icin guncellemede hesaplar silinmez.

## 9) Demo APK Uret ve Linkten Dagit

### 9.1 Localde APK uret (Windows)

```powershell
cd C:\Users\user\OneDrive\Desktop\TicarNet
npm run apk:build:demo
```

Uretilen dosya:
- `release/ticarnet-demo-debug.apk`

### 9.2 APK'yi VPS'e yukle

SSH 22 aciksa:

```powershell
scp C:\Users\user\OneDrive\Desktop\TicarNet\release\ticarnet-demo-debug.apk root@VPS_IP:/var/www/ticarnet/current/release/
```

SSH kapaliysa Hosting panel dosya yoneticisinden ayni yola yukle:
- `/var/www/ticarnet/current/release/ticarnet-demo-debug.apk`

### 9.3 APK indirme linkini tek komutla ac

VPS'te:

```bash
cd /var/www/ticarnet/current
sudo bash scripts/vps-publish-apk.sh \
  --domain apk.ticarnet.tr \
  --apk-source /var/www/ticarnet/current/release/ticarnet-demo-debug.apk \
  --apk-name ticarnet.apk \
  --brand-name "TicarNet Online" \
  --enable-ssl --email admin@ticarnet.tr
```

Calisan link:
- `https://apk.ticarnet.tr/` (logo + butonlu indirme sayfasi)
- `https://apk.ticarnet.tr/ticarnet.apk` (direkt APK)

Not:
- Dosya ayni anda web dist altina da kopyalandigi icin ana domainde de calisir:
  - `https://ticarnet.tr/download/ticarnet.apk`

### 9.4 DNS zorunlu

Domain panelinde A kaydi:
- Host: `apk`
- Type: `A`
- Value: `VPS_IP`


