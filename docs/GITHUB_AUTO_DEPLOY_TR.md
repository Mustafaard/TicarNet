# GitHub Push ile Otomatik VPS Deploy (SSH Portu Acik Olmadan)

Bu yontem `GitHub hosted runner -> VPS SSH` baglantisina ihtiyac duymaz.  
Runner dogrudan VPS icinde calisir (self-hosted), bu nedenle `22` portu disariya acik olmasa da deploy olur.

## 1) VPS tarafinda tek seferlik runner kurulumu

GitHub:
1. Repo -> `Settings` -> `Actions` -> `Runners` -> `New self-hosted runner`
2. `Linux` + `x64` sec
3. `Registration token` degerini kopyala

VPS terminalinde:

```bash
cd /var/www/ticarnet/current
sudo bash scripts/vps-setup-gh-runner.sh \
  --repo Mustafaard/TicarNet \
  --token BURAYA_GITHUB_RUNNER_TOKEN
```

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
- `http://SUNUCU_IP/download/ticarnet.apk`

## 5) Kontrol komutlari

VPS:

```bash
cd /var/www/ticarnet/current
curl -s http://127.0.0.1:8787/api/health
sudo -u deploy pm2 status
```

GitHub:
- `Actions` sekmesinde son calisma `green` olmali.
