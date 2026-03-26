# TicarNet Calistirma Kilavuzu

## Gereksinimler

- Node.js 20+ (minimum 18)
- npm
- Android icin Android Studio + SDK

## Kurulum

```bash
npm install
```

## Gelistirme Modu

Web + API birlikte:

```bash
npm run dev
```

Sadece API:

```bash
npm run api:dev
```

## Yerel Erisim

- Web: `http://localhost:5173`
- API saglik kontrolu: `http://localhost:8787/api/health`
- Ayni agdaki cihazlar icin: `http://<bilgisayar-ip>:5173`

## Android Komutlari

### Bundled APK akis

```bash
npm run android:sync
npm run android:install
npm run android:launch
```

### Live APK demo akis

```bash
CAP_SERVER_URL=https://play.ticarnet.com npm run android:sync:live
npm run android:install
```

## Sifirdan Baslama (Tum veriyi siler)

```bash
npm run fresh:start
```

## Dikkat: Production Ortami

- Production'da `npm run data:reset` kullanma.
- `DB_FILE_PATH` proje disi kalici dizin olmali.
- Ayrintili production kurulumu icin `docs/DEPLOYMENT_TR.md` dosyasini izle.
