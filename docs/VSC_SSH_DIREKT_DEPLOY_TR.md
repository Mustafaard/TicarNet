# VS Code'dan SSH ile Direkt Deploy (GitHub'siz)

Bu akista kodu lokalde VS Code ile duzenlersin, sonra tek komutla VPS'e atip canliya alirsin.

## 1) Sunucuda bir kez hazirlik (hosting panel terminal, root)

```bash
apt-get update -y
apt-get install -y ca-certificates curl gnupg openssh-server ufw nginx
systemctl enable --now ssh
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
```

## 2) Windows'ta SSH key olustur (bir kez)

PowerShell:

```powershell
mkdir "$env:USERPROFILE\.ssh" -Force
ssh-keygen -t ed25519 -C "ticarnet-actions" -f "$env:USERPROFILE\.ssh\ticarnet_actions"
```

Public key'i kopyala:

```powershell
Get-Content "$env:USERPROFILE\.ssh\ticarnet_actions.pub"
```

Sunucuda yetki ver:

```bash
mkdir -p /root/.ssh
chmod 700 /root/.ssh
cat >> /root/.ssh/authorized_keys <<'EOF'
BURAYA_PUBLIC_KEY_TEK_SATIR
EOF
chmod 600 /root/.ssh/authorized_keys
```

## 3) Ilk deploy (lokal PowerShell)

```powershell
npm run deploy:vps:ssh
```

Varsayilanlar:
- Host: `178.210.161.210`
- User: `root`
- Port: `22`
- Key: `%USERPROFILE%\.ssh\ticarnet_actions`

## 4) Her guncellemede

Kod degistir, kaydet, sonra yine:

```powershell
npm run deploy:vps:ssh
```

Bu komut:
1. Projeyi arsivler
2. SSH ile `/tmp/ticarnet-deploy.tgz` olarak VPS'e atar
3. `/var/www/ticarnet/current` klasorunu yeni kodla gunceller
4. Eski `server/.env` varsa korur
5. `server/.env` yoksa `.env.example` uzerinden otomatik olusturur ve temel production degiskenlerini yazar
6. `bash scripts/vps-deploy.sh --skip-pull` calistirip build + PM2 reload yapar

## 5) Saglik kontrolu

```powershell
curl.exe -s http://178.210.161.210/api/health
```

Beklenen:

```json
{"success":true,"service":"ticarnet-api", ...}
```

## Opsiyonel: farkli host/kullanici/port

```powershell
npm run deploy:vps:ssh -- -VpsHost 178.210.161.210 -User root -Port 22 -KeyPath "$env:USERPROFILE\.ssh\ticarnet_actions"
```
