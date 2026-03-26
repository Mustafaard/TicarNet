# DigitalOcean Sabit Aylik Prod Kurulum

Bu rehber, TicarNet'i DigitalOcean uzerinde:
- Nginx reverse proxy
- PM2 surekli API servisi
- Let's Encrypt SSL
- Otomatik DB backup
- UFW firewall
- Fail2ban brute-force korumasi
- Nginx rate-limit + connection-limit
- Kernel/sysctl + swap tuning

ile tek akista kurar.

Not: Kurulum scripti Ubuntu tabanli diger VPS saglayicilarinda da calisir.
Provider-bagimsiz ad:
- `scripts/vps-prod-setup.sh`

## 1) Sabit Aylik Maliyet Modeli (26 Mart 2026)

DigitalOcean Basic Droplet referanslari:
- 1 GB RAM: 6 USD/ay
- 2 GB RAM: 12 USD/ay

Kaynak:
- https://www.digitalocean.com/pricing/droplets
- https://docs.digitalocean.com/products/droplets/details/pricing/

Sabit aylik kalmak icin:
1. Tek droplet kullan (ek load balancer ekleme).
2. Baslangicta Managed DB acma (tek node ile devam et).
3. Snapshot/backup urunlerini bilerek ac (ek ucret dogurur).
4. Billing alert tanimla.

## 2) On Kosullar

1. Ubuntu 22.04 LTS droplet ac.
2. Domain A kaydini droplet IP'sine yonlendir (or: `play.ticarnet.com`).
3. Sunucuya SSH ile baglan.

## 3) Tek Komut Kurulum

Projeyi sunucuya clone ettikten sonra:

```bash
cd /var/www/ticarnet/current
sudo bash scripts/digitalocean-prod-setup.sh \
  --domain play.ticarnet.com \
  --email admin@domain.com \
  --repo-url https://github.com/<org>/<repo>.git \
  --branch main
```

GitHub kullanmayacaksan, projeyi once VS Code Remote-SSH ile
`/var/www/ticarnet/current` klasorune kopyalayip su komutu calistir:

```bash
sudo bash scripts/vps-prod-setup.sh \
  --domain play.ticarnet.com \
  --email admin@domain.com
```

Scriptin yaptiklari:
1. Gerekli paketleri kurar (`nginx`, `ufw`, `node`, `pm2`, `certbot`, `fail2ban`).
2. Uygulama kullanicisi ve kalici veri dizinlerini olusturur.
3. Kodu ceker/gunceller, `npm ci` + `npm run build` calistirir.
4. `server/.env` icinde production degerlerini ayarlar.
5. PM2 ile API'yi ayaga kaldirir.
6. Nginx conf kurar ve SSL sertifikasi alir.
7. Nginx tarafinda auth endpointleri icin ekstra rate-limit ve API icin IP bazli limitler uygular.
8. UFW'de sadece SSH + HTTP/HTTPS acik birakir.
9. Fail2ban ile SSH + auth endpoint saldirilarinda otomatik IP ban uygular.
10. Sysctl tuning ve swap ile pik yukte ani RAM/tcp darbogaz riskini azaltir.
11. 6 saatte bir DB backup cron kurulumu yapar.

## 4) Kurulum Sonrasi Kontrol

```bash
sudo -u deploy pm2 status
curl -I https://play.ticarnet.com
curl -s http://127.0.0.1:8787/api/health
sudo ufw status
sudo fail2ban-client status
sudo fail2ban-client status ticarnet-auth-abuse
sudo crontab -l | grep db-backup
bash scripts/vps-load-smoke.sh --url https://play.ticarnet.com/api/health --connections 60 --duration 25
```

## 5) Gunluk Deploy

Yeni surum yayinlamak icin:

```bash
cd /var/www/ticarnet/current
bash scripts/vps-deploy.sh --branch main
```

## 5.1) GitHub Olmadan (Sadece VS Code)

Evet, olur. Akis:
1. VS Code Remote-SSH ile VPS'e baglan.
2. `/var/www/ticarnet/current` klasorunu ac.
3. Dosyalari dogrudan sunucuda duzenle.
4. Deploy:

```bash
bash scripts/vps-deploy.sh --skip-pull --run-lint
```

Bu komut:
- GitHub/pull adimini atlar.
- Build oncesi DB yedegi alir.
- PM2 servisini reload eder.

## 6) Backup Dosya Konumlari

- DB: `DB_FILE_PATH` (`/var/lib/ticarnet/db.json`)
- Zaman damgali backup: `/var/backups/ticarnet/db-YYYYMMDD_HHMMSS.json`
- Checksum: `/var/backups/ticarnet/db-YYYYMMDD_HHMMSS.json.sha256`
- Log: `/var/log/ticarnet-db-backup.log`
- Varsayilan retention: silme yok (`DB_BACKUP_RETENTION_DAYS=0`)

## 7) Sik Kullanilan Bayraklar

Script varsayilanlari degistirmek icin:

```bash
sudo bash scripts/digitalocean-prod-setup.sh \
  --domain play.ticarnet.com \
  --email admin@domain.com \
  --repo-url https://github.com/<org>/<repo>.git \
  --api-port 8787 \
  --backup-dir /var/backups/ticarnet
```

Opsiyonel:
- SSL'i gecici atlamak icin: `--skip-ssl`
- Firewall adimini atlamak icin: `--skip-firewall`
- PM2 startup adimini atlamak icin: `--skip-pm2-startup`
- Fail2ban adimini atlamak icin: `--skip-fail2ban`
- Sysctl tuning adimini atlamak icin: `--skip-sysctl-tuning`
- Swap adimini atlamak icin: `--skip-swap`
- Hesap limiti: `--max-accounts-per-scope 2`
- Kayit IP'si disinda login engeli: `--enforce-register-ip-on-login false`
- Kayit subnet disinda login engeli: `--enforce-register-subnet-on-login false`

Performans/saldiri ayarlari:
- `--swap-size-mb 1024`
- `--nginx-limit-req-rate 30r/s`
- `--nginx-limit-req-burst 90`
- `--nginx-limit-conn-per-ip 40`

## 8) Hesap/Ag Politikasi (Wi-Fi / IP)

Script production `.env` icine su degerleri yazar:
- `MAX_ACCOUNTS_PER_SCOPE=2`
- `ENFORCE_REGISTER_IP_ON_LOGIN=false`
- `ENFORCE_REGISTER_SUBNET_ON_LOGIN=false`
- `ACCOUNT_DELETION_ENABLED=false`

Bu sayede:
- Ayni public IP/Wi-Fi uzerinden en fazla 2 hesap acilir.
- Kullanici farkli Wi-Fi/IP'den de giris yapabilir (hesap kilitlenmez).
- Hesap silme akisi kapali olur.

Mevcut sunucuda bu politikayi tek komutla tekrar uygulamak icin:

```bash
cd /var/www/ticarnet/current
sudo bash scripts/vps-apply-account-policy.sh \
  --max-accounts-per-scope 2 \
  --enforce-register-ip-on-login false \
  --enforce-register-subnet-on-login false
```
