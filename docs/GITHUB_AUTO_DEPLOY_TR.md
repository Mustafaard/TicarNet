# GitHub Push ile Otomatik VPS Deploy (SSH Portu Disariya Acik Olmadan)

Bu yontem `GitHub hosted runner -> VPS SSH` baglantisina ihtiyac duymaz.  
Runner dogrudan VPS icinde calisir (self-hosted), bu nedenle `22` portu disariya acik olmasa da deploy olur.

## 0) VPS'i sifirdan kur (opsiyonel ama onerilen)

Server klasorleri silindiyse once su komut:

```bash
apt-get update -y && apt-get install -y curl ca-certificates && bash <(curl -fsSL https://raw.githubusercontent.com/Mustafaard/TicarNet/main/scripts/vps-panel-bootstrap.sh) --non-interactive --domain ticarnet.tr --email mustafaard76@gmail.com --repo-url https://github.com/Mustafaard/TicarNet.git --branch main --smtp-user mustafaard76@gmail.com --support-inbox-email mustafaard76@gmail.com --mail-from "TicarNet Online <mustafaard76@gmail.com>"
```

Bu adim:
- `/var/www/ticarnet/current` kodunu yeniden kurar
- `server/.env` dosyasini olusturur
- PM2 + Nginx + API + `/download/ticarnet.apk` rotasini ayaga kaldirir

## 1) VPS tarafinda tek seferlik runner kurulumu

GitHub:
1. Repo -> `Settings` -> `Actions` -> `Runners` -> `New self-hosted runner`
2. `Linux` + `x64` sec
3. `Registration token` degerini kopyala

VPS terminalinde:

```bash
cd /var/www/ticarnet/current
git fetch --all --prune && git checkout main && git reset --hard origin/main
sudo bash scripts/vps-setup-gh-runner.sh \
  --repo Mustafaard/TicarNet \
  --token BURAYA_GITHUB_RUNNER_TOKEN
```

`No such file or directory` hatasi alirsan sebep eski koddur. Yukaridaki `git fetch ... reset --hard` satirini calistir.

Kurulum tamamlaninca GitHub `Actions -> Runners` ekraninda `ticarnet-vps` gorunmelidir.

## 2) Otomatik deploy akisi

Bu repodaki `.github/workflows/deploy-vps.yml` artik self-hosted runner ile calisir.

`main` branch'e her push'ta:
1. Kod `/var/www/ticarnet/current` altina senkronlanir.
2. Eski `server/.env` korunur.
3. `bash scripts/vps-deploy.sh --skip-pull` calisir.
4. API health kontrol edilir.

## 3) Gelistirme akisi (VS Code)

Kod degisikligini pushlamak icin:

```powershell
npm run ship
```

Bu komut:
- `git add -A`
- `git commit`
- `git push origin main`

ve workflow otomatik deploy eder.

## 4) APK'yi telefon indirme linkine koymak

Demo APK build + web indirme dosyasini guncelle + push:

```powershell
npm run ship:mobile
```

Deploy sonrasi APK linki:
- `https://ticarnet.tr/download/ticarnet.apk`

## 5) Kontrol komutlari

VPS:

```bash
cd /var/www/ticarnet/current
curl -s http://127.0.0.1:8787/api/health
sudo -u deploy pm2 status
```

GitHub:
- `Actions` sekmesinde son calisma `green` olmali.

Windows PowerShell'de kontrol komutlari:

```powershell
curl.exe -s "http://178.210.161.210/api/health"
curl.exe -I "https://ticarnet.tr/download/ticarnet.apk"
```

