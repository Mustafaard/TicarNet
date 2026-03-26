# GitHub'dan VPS'e Otomatik Deploy (Tek Seferlik Kurulum)

Bu kurulumdan sonra `main` branch'e her `git push` yaptığında sunucu otomatik güncellenir.

## 1) Repo görünürlüğünü private yap

Web arayüz:
- GitHub repo -> `Settings` -> `General` -> `Danger Zone` -> `Change repository visibility` -> `Make private`

Terminal (opsiyonel, `gh` yüklüyse):
```bash
gh repo edit Mustafaard/TicarNet --visibility private
```

Not:
- Sonradan tekrar public yapabilirsin.
- Private olduğunda sadece sen ve izin verdiğin kişiler görebilir.

## 2) Sunucudaki repo erişimini private repo için hazırla

Sunucuda (`root` veya yetkili kullanıcı):
```bash
sudo -u deploy mkdir -p /home/deploy/.ssh
sudo -u deploy chmod 700 /home/deploy/.ssh
sudo -u deploy ssh-keygen -t ed25519 -f /home/deploy/.ssh/id_ed25519_github -N "" -C "ticarnet-vps-git"
sudo -u deploy cat /home/deploy/.ssh/id_ed25519_github.pub
```

Çıkan `*.pub` anahtarını GitHub'da ekle:
- Repo -> `Settings` -> `Deploy keys` -> `Add deploy key`
- `Allow write access` kapalı kalsın (read-only yeterli)

Repo remote'u SSH'e çevir:
```bash
cd /var/www/ticarnet/current
sudo -u deploy git remote set-url origin git@github.com:Mustafaard/TicarNet.git
sudo -u deploy bash -lc 'ssh -i /home/deploy/.ssh/id_ed25519_github -o StrictHostKeyChecking=accept-new -T git@github.com || true'
```

Deploy script `git pull` yaparken bu anahtarı kullanması için:
```bash
sudo -u deploy bash -lc 'cat > /home/deploy/.ssh/config << "EOF"
Host github.com
  HostName github.com
  User git
  IdentityFile /home/deploy/.ssh/id_ed25519_github
  IdentitiesOnly yes
EOF'
sudo -u deploy chmod 600 /home/deploy/.ssh/config
```

## 3) GitHub Actions'ın sunucuya SSH ile bağlanması için key oluştur

Kendi bilgisayarında:
```bash
ssh-keygen -t ed25519 -f ~/.ssh/ticarnet_actions -N "" -C "ticarnet-actions"
```

Public key'i sunucuya ekle:
```bash
cat ~/.ssh/ticarnet_actions.pub | ssh deploy@SUNUCU_IP "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
```

Windows PowerShell için:
```powershell
type $env:USERPROFILE\.ssh\ticarnet_actions.pub | ssh deploy@SUNUCU_IP "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
```

## 4) GitHub Secrets gir

Repo -> `Settings` -> `Secrets and variables` -> `Actions` -> `New repository secret`

Gerekli secret'lar:
- `VPS_HOST` = sunucu IP (ör: `178.210.161.210`)
- `VPS_SSH_USER` = `deploy`
- `VPS_SSH_KEY` = `~/.ssh/ticarnet_actions` private key içeriği
- `VPS_SSH_PORT` = `22` (opsiyonel, farklı portsa gir)

## 5) Test et

Lokalden küçük bir commit at:
```bash
git add .
git commit -m "test auto deploy"
git push origin main
```

GitHub -> `Actions` -> `Deploy VPS` işini kontrol et.

Sunucuda doğrulama:
```bash
sudo -u deploy pm2 status
curl -s http://127.0.0.1:8787/api/health
```

---

Bu kurulumdan sonra normal geliştirme akışı:
1. Kodu düzenle
2. `git push origin main`
3. Sunucu otomatik deploy olur
