# 🔐 Panduan Setup Google OAuth 2.0 Resmi di VARIS AI

Panduan lengkap menghubungkan sistem autentikasi **Sign in with Google** resmi (Google OAuth 2.0 & OpenID Connect) pada VARIS AI Workspace untuk browser Desktop/Laptop dan Smartphone/Mobile.

---

## 1. Buka Google Cloud Console
1. Akses **[Google Cloud Console](https://console.cloud.google.com/)**.
2. Login dengan akun Google Anda.
3. Di bagian atas layar, klik **Select a project** (atau nama project saat ini) lalu klik **NEW PROJECT**.
4. Beri nama project: `VARIS AI Workspace` lalu klik **CREATE**.

---

## 2. Konfigurasi OAuth Consent Screen
1. Buka menu **APIs & Services** > **OAuth consent screen** (atau [klik tautan ini](https://console.cloud.google.com/apis/credentials/consent)).
2. Pilih User Type:
   - **External** (cocok untuk akun Gmail umum / pengujian langsung).
3. Klik **CREATE**.
4. Isi informasi aplikasi:
   - **App name**: `VARIS AI`
   - **User support email**: *Pilih email Google Anda*
   - **Developer contact information**: *Masukkan email Anda*
5. Klik **SAVE AND CONTINUE**.
6. Pada tahap **Scopes**:
   - Klik **ADD OR REMOVE SCOPES**.
   - Centang 3 scope dasar:
     - `.../auth/userinfo.email`
     - `.../auth/userinfo.profile`
     - `openid`
   - Klik **UPDATE** lalu **SAVE AND CONTINUE**.
7. Pada tahap **Test users**:
   - Klik **ADD USERS**.
   - Masukkan alamat email Gmail yang akan digunakan untuk login dan pengujian.
   - Klik **SAVE AND CONTINUE**.

---

## 3. Buat OAuth Client ID (Web Application)
1. Buka menu **APIs & Services** > **Credentials** (atau [klik tautan ini](https://console.cloud.google.com/apis/credentials)).
2. Klik **+ CREATE CREDENTIALS** di bagian atas, lalu pilih **OAuth client ID**.
3. Pada dropdown **Application type**, pilih **Web application**.
4. Beri nama: `VARIS Web Client`.

### A. Authorized JavaScript origins
Tambahkan URL berikut:
```text
http://localhost:3000
http://127.0.0.1:3000
http://192.168.1.13:3000
```
*(Catatan: `http://192.168.1.13:3000` diperlukan saat Anda membuka VARIS dari HP/Smartphone yang terhubung ke WiFi/LAN yang sama).*

### B. Authorized redirect URIs
Tambahkan URL redirect berikut:
```text
http://localhost:3000/api/auth/google/callback
http://127.0.0.1:3000/api/auth/google/callback
http://192.168.1.13:3000/api/auth/google/callback
```

5. Klik tombol **CREATE**.
6. Sebuah jendela popup akan menampilkan:
   - **Client ID** (contoh: `1234567890-abcdef.apps.googleusercontent.com`)
   - **Client Secret** (contoh: `GOCSPX-xyz1234567890`)

---

## 4. Masukkan Kredensial ke File `.env`
Buka file `.env` di direktori project VARIS AI (`c:\Users\USER\OneDrive\Documents\varisAI\.env`) dan masukkan:

```env
# Google OAuth 2.0 Credentials
GOOGLE_CLIENT_ID=masukkan_client_id_anda_di_sini.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=masukkan_client_secret_anda_di_sini
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
```

> **Catatan untuk testing di Smartphone/HP via IP LAN:**
> Jika Anda mengakses VARIS dari smartphone via `http://192.168.1.13:3000`, Anda dapat mengatur `APP_ORIGIN` atau `GOOGLE_CALLBACK_URL`:
> ```env
> APP_ORIGIN=http://192.168.1.13:3000
> GOOGLE_CALLBACK_URL=http://192.168.1.13:3000/api/auth/google/callback
> ```

---

## 5. Jalankan VARIS AI dan Uji Coba
1. Simpan file `.env`.
2. Buka browser (Chrome, Edge, Safari di HP maupun Laptop):
   - Buka `http://localhost:3000` atau `http://192.168.1.13:3000`
3. Klik tombol **Continue with Google** (atau 🔵 Continue with Google).
4. Browser akan langsung beralih ke halaman resmi Google (`accounts.google.com`):
   - Menampilkan akun-akun Google yang terdaftar di perangkat.
   - Mendukung 2-Step Verification / Passkey / Biometrik resmi Google.
5. Setelah Anda memilih akun Google, Google akan mengarahkan kembali ke VARIS AI dan Anda langsung masuk ke Dashboard Workspace dengan profil nama, email, dan foto avatar asli!
