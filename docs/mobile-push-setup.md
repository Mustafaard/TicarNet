# Mobil Push Kurulum Notları (FCM + Capacitor)

Bu proje artık gerçek cihaz push tokenlarını backend'e kaydediyor ve backend tarafında Firebase Cloud Messaging ile bildirim gönderiyor.

## 1) Firebase Android uygulaması

1. Firebase Console'da bir proje oluştur.
2. Android uygulamasını ekle:
   - Package name: `com.ticarnet.app`
3. `google-services.json` dosyasını indir.
4. Dosyayı native Android projede `android/app/google-services.json` konumuna yerleştir.

## 2) Backend ortam değişkenleri

`server/.env` içine aşağıdakilerden birini ekle:

- Yöntem A (önerilen): `FIREBASE_SERVICE_ACCOUNT_JSON`
- Yöntem B: `FIREBASE_SERVICE_ACCOUNT_FILE`
- Yöntem C: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`

Ek olarak:

- `FIREBASE_ENABLED=true`

## 3) Capacitor senkronizasyonu

```bash
npm run build
npx cap sync android
```

## 4) Cihaz testi

1. Uygulamayı Android cihazda aç.
2. Kullanıcı girişi yap.
3. Push izin penceresinde izni ver.
4. `Profil > Push` ekranında aktif cihaz sayısının arttığını doğrula.
5. Fiyat alarmı, üretim dolumu veya açık artırma bitişi tetikleyip bildirim al.

## Not

Bu repodaki `android` klasörü eksik native dosyalarla tutuluyorsa (`AndroidManifest.xml`, `build.gradle` vb.), Android Studio tarafında tam native proje bulunmalıdır. Eksikse platformu temiz şekilde yeniden ekleyip senkronizasyonu tekrar çalıştır.
