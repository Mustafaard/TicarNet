# Hosting.com.tr VPS XLarge Kurulum (Web + APK)

Bu akis, `TicarNet` oyununu ayni backend ile:
- web (tarayici)
- Android APK

olarak online calistirir.

Not:
- Evet, `VPS - XLarge (8 vCPU / 8 GB RAM)` bu is icin uygundur.
- Kurulum Ubuntu 22.04 LTS varsayimi ile yazildi.

## 1) Satin Alirken Secilecekler

Hosting.com.tr panelde:
1. Paket: `VPS - XLarge`
2. Isletim sistemi: `Ubuntu 22.04 LTS`
3. Lokasyon: Turkiye (oyuncu kitlen TR ise)
4. Root erisimi aktif

Domain gerekiyorsa ornek: `play.ticarnet.com`

## 2) DNS Ayari

Domain yonetiminde A kaydi:
- Host: `play`
- Type: `A`
- Value: `VPS_IP`

DNS yayilimi tamamlaninca devam et.

## 3) VPS'e Baglan ve Projeyi Kopyala (GitHub'siz)

Windows PowerShell (kendi bilgisayarinda):

```powershell
scp -r C:\Users\user\OneDrive\Desktop\TicarNet root@VPS_IP:/var/www/
```

Sunucuda:

```bash
ssh root@VPS_IP
mkdir -p /var/www/ticarnet
if [ -d /var/www/ticarnet/current ]; then mv /var/www/ticarnet/current /var/www/ticarnet/current_backup_$(date +%Y%m%d_%H%M%S); fi
mv /var/www/TicarNet /var/www/ticarnet/current
```

## 4) Tek Komut Prod Kurulum

Sunucuda:

```bash
cd /var/www/ticarnet/current
chmod +x scripts/digitalocean-prod-setup.sh scripts/vps-prod-setup.sh scripts/db-backup.sh scripts/vps-deploy.sh
sudo bash scripts/vps-prod-setup.sh \
  --domain play.ticarnet.com \
  --email admin@senindomain.com
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
curl -I https://play.ticarnet.com
sudo fail2ban-client status
```

## 6) Web + APK Calisma Modeli

### 6.1 Web
Kullanicilar direkt:
- `https://play.ticarnet.com`

### 6.2 APK (Canli Sunucuya Bagli)
Bu modda web deploy ettiginde APK otomatik yeni surumu gorur.

Local bilgisayarinda proje klasorunde:

```bash
CAP_SERVER_URL=https://play.ticarnet.com npm run android:deploy:live
```

### 6.3 APK (Bundled)
Store release yaklasiminda APK icine o anki web dosyalari gomulur:

```bash
npm run android:release:apk
```

## 7) Guncelleme Akisi (GitHub'siz)

VS Code Remote-SSH ile VPS'e baglan:
- Klasor: `/var/www/ticarnet/current`
- Dosyalari dogrudan duzenle

Deploy:

```bash
cd /var/www/ticarnet/current
bash scripts/vps-deploy.sh --skip-pull --run-lint
```

Bu akista deploy oncesi DB yedegi alinmaya devam eder.

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
  --domain apk.ticarnet.online \
  --apk-source /var/www/ticarnet/current/release/ticarnet-demo-debug.apk \
  --apk-name ticarnet.apk \
  --brand-name "TicarNet Online" \
  --enable-ssl --email admin@ticarnet.online
```

Calisan link:
- `https://apk.ticarnet.online/` (logo + butonlu indirme sayfasi)
- `https://apk.ticarnet.online/ticarnet.apk` (direkt APK)

Not:
- Dosya ayni anda web dist altina da kopyalandigi icin ana domainde de calisir:
  - `https://play.ticarnet.com/download/ticarnet.apk`

### 9.4 DNS zorunlu

Domain panelinde A kaydi:
- Host: `apk`
- Type: `A`
- Value: `VPS_IP`

