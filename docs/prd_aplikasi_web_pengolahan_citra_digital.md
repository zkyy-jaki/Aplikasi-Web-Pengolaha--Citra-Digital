# Product Requirements Document (PRD): Aplikasi Web Pengolahan Citra Digital

## 1. Ringkasan Produk & Ruang Lingkup

### Tujuan Produk
Membangun aplikasi web interaktif untuk melakukan eksperimen dan pemrosesan citra digital secara *real-time* maupun bertahap (*pipeline*). Aplikasi ini dirancang khusus untuk memenuhi kebutuhan proyek akhir mata kuliah Pengolahan Citra Digital (PCD), sehingga tidak hanya menampilkan hasil akhir secara visual, tetapi juga menyediakan transparansi parameter, distribusi intensitas piksel (histogram), dan perbandingan langsung antara citra asli dengan citra hasil olahan.

### Target Pengguna
* **Mahasiswa / Pengembang:** Melakukan demonstrasi algoritma pengolahan citra, membandingkan efektivitas variasi filter (khususnya 5 jenis blur dan deteksi tepi), serta mengekspor hasil untuk laporan.
* **Dosen Penguji:** Memverifikasi kebenaran implementasi matematis/algoritmis, menguji parameter ekstrem (*edge cases*), dan mengamati perubahan histogram dari setiap operasi.

### Asumsi & Keputusan Awal yang Perlu Dikonfirmasi
Dokumen ini disusun dengan beberapa asumsi kerja yang dapat disesuaikan sebelum fase implementasi:
1. **Kebijakan Library vs Implementasi Manual:** Diasumsikan pemrosesan inti menggunakan *library* komputasi numerik/citra standar (seperti OpenCV + NumPy di Python atau manipulasi array `ImageData` di JavaScript). Jika mata kuliah melarang penggunaan fungsi siap pakai (misalnya `cv2.GaussianBlur`), maka layer pemrosesan harus mengganti pemanggilan fungsi tersebut dengan implementasi konvolusi matriks manual tanpa mengubah spesifikasi UI dan kontrak API di bawah ini.
2. **Mode Operasi Berantai (Pipeline):** Aplikasi diasumsikan mendukung penumpukan operasi (contoh: *Grayscale -> Median Blur -> Thresholding*), bukan hanya menerapkan satu efek terpisah dari gambar asli.
3. **Target Perangkat:** Dioptimalkan untuk layar desktop/laptop (resolusi minimal $1280 \times 720$) karena ruang kerja membutuhkan tampilan kanvas ganda, panel kontrol parameter, dan grafik histogram secara bersamaan.

---

## 2. Alur Kerja Utama & Manajemen State

Agar pengguna dapat menguji skenario pengolahan citra yang realistis, aplikasi menerapkan konsep **Non-Destructive Preview dengan Commit ke History Stack**:

1. **Upload Citra:** Pengguna memuat gambar lokal. Sistem menyimpan salinan gambar mentah (*Original Buffer*) dan menjadikannya state awal (*Current State*).
2. **Eksplorasi & Live Preview:** Saat pengguna memilih metode (misalnya *Gaussian Blur*) dan menggeser slider parameter, sistem menghitung pratinjau dari *Current State* tanpa langsung mengubah riwayat.
3. **Apply (Commit) atau Cancel:**
   * Menekan **Apply** menyimpan hasil pratinjau menjadi *Current State* baru dan mencatat operasi beserta parameternya ke dalam *Operation History* (maksimal 20 langkah untuk menjaga memori).
   * Menekan **Cancel** mengembalikan tampilan ke *Current State* sebelum penyesuaian.
4. **Inspeksi:** Pengguna dapat beralih mode tampilan (*Side-by-Side*, *Split Slider*, atau *Single View*), melakukan *Zoom/Pan*, serta memantau perubahan histogram sebelum dan sesudah proses.
5. **Undo / Redo / Reset:** Pengguna bisa membatalkan langkah terakhir, mengulangi langkah, atau mengembalikan citra ke kondisi asli dalam satu klik.
6. **Ekspor:** Pengguna mengunduh citra hasil akhir (*Current State*) dalam format pilihan.

---

## 3. Spesifikasi Fungsional Rinci

### 3.1. Open File (Muat Citra)
* **Mekanisme Input:** Tombol *file picker* dan area *drag-and-drop*.
* **Format Didukung:** `.jpg`, `.jpeg`, `.png`, `.bmp`, `.webp`.
* **Batasan & Validasi:**
  * Ukuran file maksimal: 10 MB (dapat dikonfigurasi).
  * Validasi ekstensi dan tipe MIME di sisi klien maupun server (jika pakai backend) untuk menolak file korup atau non-gambar.
  * Jika dimensi gambar melebihi batas kerja optimal (misalnya lebih dari $4000 \times 4000$ piksel), sistem menampilkan peringatan dan menawarkan opsi *downscale* otomatis untuk menjaga responsivitas, atau memproses resolusi penuh dengan indikator *loading*.
* **Metadata yang Ditampilkan:** Nama file, dimensi (lebar $\times$ tinggi dalam piksel), ukuran file, dan jumlah kanal warna (RGB / RGBA / Grayscale).

### 3.2. Histogram
* **Fungsi:** Menampilkan distribusi frekuensi nilai intensitas piksel (rentang 0 hingga 255) pada sumbu X dan jumlah piksel pada sumbu Y.
* **Mode Tampilan:**
  * **RGB Mode:** Tiga kurva/batang terpisah atau *overlay* (Merah, Hijau, Biru) untuk citra berwarna.
  * **Grayscale / Luminance Mode:** Satu kurva intensitas keabuan.
  * **Perbandingan:** Opsi menampilkan histogram *Original* berdampingan atau tumpang tindih dengan histogram *Processed*.
* **Statistik Ringkas (Nilai Tambah PCD):** Menampilkan nilai *Min*, *Max*, *Mean*, dan *Standard Deviation* intensitas piksel yang terbarui otomatis setiap kali citra berubah.

### 3.3. Thresholding
Mengubah citra menjadi citra biner atau tersegmentasi berdasarkan nilai ambang batas (*threshold*) $T$.
* **Prasyarat:** Jika citra input masih berwarna (RGB), sistem otomatis mengonversinya ke grayscale terlebih dahulu sebelum menerapkan thresholding (dengan notifikasi kecil pada panel).
* **Metode & Parameter:**
  * **Manual Thresholding:**
    * *Binary:* $I_{out} = 255$ jika $I_{in} > T$, selainnya $0$.
    * *Binary Inverse:* $I_{out} = 0$ jika $I_{in} > T$, selainnya $255$.
    * *Truncate:* $I_{out} = T$ jika $I_{in} > T$, selainnya $I_{in}$.
    * *To Zero:* $I_{out} = I_{in}$ jika $I_{in} > T$, selainnya $0$.
    * Parameter: Slider nilai ambang $T$ ($0$ sampai $255$, default: $127$).
  * **Otsu's Automatic Thresholding (Opsional tapi sangat direkomendasikan):** Menghitung nilai $T$ optimal secara otomatis dengan meminimalkan varians intra-kelas, lalu menampilkan nilai $T$ hasil perhitungan Otsu ke pengguna.

### 3.4. Equalization (Histogram Equalization)
Meningkatkan kontras citra dengan meratakan distribusi histogram menggunakan Fungsi Distribusi Kumulatif (CDF).
* **Logika Pemrosesan:**
  * **Untuk Citra Grayscale:** Menerapkan pemetaan CDF langsung pada kanal tunggal:
    $$s_k = \text{round}\left(\frac{L - 1}{M \times N} \sum_{j=0}^{k} n_j\right)$$
  * **Untuk Citra Berwarna (RGB):** Tidak disarankan melakukan equalization terpisah pada R, G, dan B secara langsung karena menyebabkan distorsi warna (*color shift*). Sistem harus mengonversi citra ke ruang warna **YCrCb** (atau **HSV**), menerapkan equalization hanya pada kanal luminansi **Y** (atau **V**), lalu mengonversi kembali ke RGB.
* **Parameter:** Toggle mode (Standard Global Equalization; opsional: CLAHE dengan parameter *Clip Limit* dan *Tile Grid Size* untuk perbandingan kontras lokal).
* **Verifikasi Visual:** Grafik histogram harus langsung memperlihatkan penyebaran ulang intensitas secara merata.

### 3.5. Sketch (Efek Sketsa Pensil)
Mengubah foto menjadi tampilan gambar garis pensil hitam-putih.
* **Alur Algoritma:**
  1. Konversi citra ke Grayscale ($I_{gray}$).
  2. Buat salinan negatif dari citra grayscale ($I_{inv} = 255 - I_{gray}$).
  3. Terapkan Gaussian Blur pada $I_{inv}$ menghasilkan $I_{blur}$.
  4. Gabungkan $I_{gray}$ dan $I_{blur}$ menggunakan operasi *Color Dodge*:
     $$I_{out}(x,y) = \min\left(255,\ \frac{I_{gray}(x,y) \times 255}{\max(1,\ 255 - I_{blur}(x,y))}\right)$$
     *(Penyebut dibatasi minimal $1$ untuk mencegah pembagian dengan nol).*
* **Parameter:**
  * *Blur Intensity / Kernel Size:* Bilangan ganjil $3$ sampai $51$ (default: $21$). Semakin besar kernel, semakin tebal dan lembut garis arsir sketsa.

### 3.6. Blur (5 Variasi)
Seluruh variasi blur ditempatkan dalam satu grup kategori "Blur" dengan tab atau dropdown pemilih metode agar pengguna mudah membandingkan karakteristik tiap filter (terutama pada citra bernoise).

| Variasi Blur | Karakteristik Algoritma | Parameter Kontrol | Kasus Uji Utama |
| :--- | :--- | :--- | :--- |
| **1. Gaussian Blur** | Konvolusi dengan kernel distribusi Gaussian 2D (bobot terbesar di piksel pusat, meluruh ke tepi). Menghasilkan efek buram paling natural. | - Kernel Size: Ganjil ($3 \times 3$ hingga $31 \times 31$, default $5 \times 5$)<br>- Sigma ($\sigma$): $0.1$ hingga $10.0$ (atau $0$ = auto) | Reduksi *Gaussian noise* ringan dan preprocessing deteksi tepi. |
| **2. Averaging Blur (Box Filter)** | Konvolusi menggunakan kernel seragam di mana setiap elemen bernilai $\frac{1}{k \times k}$. Menghitung rata-rata aritmetika piksel tetangga. | - Kernel Size: Ganjil ($3 \times 3$ hingga $31 \times 31$, default $5 \times 5$) | Pembandingan langsung dengan Gaussian (menunjukkan tepi lebih pudar/kotak). |
| **3. Median Blur** | Filter non-linear yang mengganti piksel pusat dengan nilai median dari piksel tetangga dalam jendela $k \times k$. | - Kernel Size: Ganjil ($3$ hingga $31$, default $5$) | Menghilangkan *salt-and-pepper noise* tanpa terlalu mengaburkan tepi tajam. |
| **4. Bilateral Blur** | Filter non-linear *edge-preserving* yang menimbang jarak spasial sekaligus perbedaan intensitas warna antar piksel. | - Diameter ($d$): $1$ hingga $15$ (default $9$)<br>- Sigma Color ($\sigma_c$): $10$ hingga $150$ (default $75$)<br>- Sigma Space ($\sigma_s$): $10$ hingga $150$ (default $75$) | Menghaluskan permukaan/tekstur sambil menjaga batas tepi objek tetap tajam. |
| **5. Standard Blur (Filter 2D)** | Konvolusi 2D umum (*general 2D convolution*) menggunakan matriks kernel eksplisit $K$ terhadap citra ($I * K$). | - Pilihan ukuran kernel: $3 \times 3$ atau $5 \times 5$<br>- Input matriks bobot (default: kernel rata-rata/weighted blur seperti Gaussian aproksimasi $\frac{1}{16}\begin{bmatrix}1&2&1\\2&4&2\\1&2&1\end{bmatrix}$)<br>- Opsi *Auto-Normalize* (membagi dengan jumlah total elemen kernel agar kecerahan citra tidak berubah). | Demonstrasi konsep inti konvolusi spasial dan kustomisasi kernel manual saat ujian/demo. |

*Catatan Edge Case untuk Blur:* Penanganan batas tepi citra (*border padding*) harus didefinisikan secara konsisten, disarankan menggunakan *Replicate* atau *Reflect Padding* agar tepi gambar tidak menjadi hitam pekat saat kernel besar digunakan.

### 3.7. Grayscale
Mengonversi citra berwarna RGB menjadi citra keabuan 1 kanal (atau 3 kanal identik untuk konsistensi rendering kanvas).
* **Metode Default (Luminance / Rec. 601):**
  $$Y = 0.299R + 0.587G + 0.114B$$
  *(Dipilih sebagai default karena sesuai dengan sensitivitas mata manusia terhadap warna hijau).*
* **Opsi Tambahan (Dropdown):** *Average Method* ($\frac{R+G+B}{3}$) dan *Lightness Method* ($\frac{\max(R,G,B) + \min(R,G,B)}{2}$) agar pengguna bisa membandingkan hasil konversi.

### 3.8. Brightness
Mengatur tingkat kecerahan citra melalui operasi titik linear (*point processing*).
* **Rumus:**
  $$I_{out}(x,y) = \text{clip}(I_{in}(x,y) + \beta,\ 0,\ 255)$$
* **Parameter:** Slider nilai $\beta$ dari $-100$ hingga $+100$ (atau $-255$ hingga $+255$), default $0$, dilengkapi input angka manual untuk presisi.
* **Edge Case:** Nilai di bawah $0$ wajib di-clamp ke $0$, dan nilai di atas $255$ wajib di-clamp ke $255$ (tidak boleh terjadi *integer overflow/wrap-around* pada tipe data `uint8`).

### 3.9. Negative (Inversi Citra)
Membalik intensitas setiap piksel terhadap nilai maksimum ($255$).
* **Rumus:**
  $$I_{out}(x,y) = 255 - I_{in}(x,y)$$
* **Perilaku Kanal:** Diterapkan pada kanal R, G, dan B (atau kanal tunggal untuk grayscale). Jika citra adalah PNG transparan, kanal Alpha ($A$) **tidak boleh ikut dibalik** agar latar belakang transparan tetap terjaga.
* **Parameter:** Tidak ada (operasi satu klik / toggle preview).

### 3.10. Mirroring (Pencerminan Geometris)
Membalik posisi koordinat piksel tanpa mengubah nilai intensitasnya.
* **Mode Operasi:**
  * **Horizontal Flip:** $I_{out}(x, y) = I_{in}(W - 1 - x,\ y)$
  * **Vertical Flip:** $I_{out}(x, y) = I_{in}(x,\ H - 1 - y)$
  * **Both (Horizontal + Vertical):** Pencerminan terhadap kedua sumbu sekaligus.
* **Kontrol UI:** Tiga tombol aksi cepat (Horizontal, Vertical, Both).

### 3.11. Sharpening (Penajaman Citra)
Mempertegas transisi intensitas dan detail tepi pada citra.
* **Metode yang Didukung:**
  * **Laplacian / Convolution Kernel Sharpening:** Konvolusi dengan kernel standar seperti:
    $$K = \begin{bmatrix} 0 & -1 & 0 \\ -1 & 5 & -1 \\ 0 & -1 & 0 \end{bmatrix} \quad \text{atau} \quad \begin{bmatrix} -1 & -1 & -1 \\ -1 & 9 & -1 \\ -1 & -1 & -1 \end{bmatrix}$$
  * **Unsharp Masking (Direkomendasikan untuk slider halus):**
    $$I_{out} = \text{clip}\left(I_{in} + \alpha \cdot (I_{in} - I_{blur}),\ 0,\ 255\right)$$
* **Parameter:**
  * Pilihan metode (*Kernel Standard*, *Kernel Strong*, atau *Unsharp Mask*).
  * Slider *Strength* ($\alpha$: $0.0$ hingga $3.0$) khusus untuk mode Unsharp Mask.

### 3.12. Edge Detection (Deteksi Tepi)
Mendeteksi diskontinuitas intensitas pada citra untuk mengekstrak batas objek.
* **Prasyarat:** Otomatis menerapkan konversi Grayscale internal sebelum perhitungan gradien.
* **Operator yang Didukung (Dropdown):**
  1. **Sobel:** Menghitung gradien horizontal ($G_x$) dan vertikal ($G_y$) dengan kernel $3 \times 3$ (atau $5 \times 5$), lalu menggabungkannya dengan magnitudo $G = \sqrt{G_x^2 + G_y^2}$. Opsi tampilan: *Combined*, *X-only*, *Y-only*.
  2. **Prewitt:** Mirip Sobel dengan bobot kernel seragam ($\pm 1$). Berguna sebagai pembanding teori saat presentasi.
  3. **Laplacian:** Turunan kedua yang sensitif terhadap tepi di segala arah (disertai opsi checkbox *Pre-Gaussian Blur* / LoG untuk meredam noise).
  4. **Canny:** Deteksi tepi multi-tahap (Gaussian smoothing -> Gradien -> Non-Maximum Suppression -> Hysteresis Thresholding).
     * Parameter: *Low Threshold* ($0$ sampai $255$, default $50$) dan *High Threshold* ($0$ sampai $255$, default $150$), dengan validasi nilai Low selalu lebih kecil atau sama dengan High.

### 3.13. Save File (Simpan Citra)
* **Format Ekspor:** PNG (*lossless*, default), JPEG (dengan slider kualitas 10% hingga 100%, default 90%), dan BMP.
* **Penamaan File Otomatis:** Default `<nama_file_asli>_processed.<ext>`, dapat diubah oleh pengguna sebelum mengunduh.
* **Fitur Pendukung Laporan:** Tombol opsional untuk mengunduh grafik histogram saat ini sebagai PNG (sangat membantu untuk penyusunan laporan proyek akhir).

---

## 4. Rancangan Antarmuka & Pengalaman Pengguna (UI/UX)

Tata letak menggunakan struktur **3-Panel Workstation** (seperti aplikasi editing profesional minimalis) dengan skema warna netral/gelap (*dark neutral background* seperti `#121417` atau `#181A1F`) agar persepsi kontras dan warna citra tidak terdistorsi oleh layar putih yang menyilaukan.

### Struktur Layout
1. **Top Navigation Bar (Tinggi ~56px):**
   * Kiri: Judul aplikasi + tombol **Open File**.
   * Tengah: Info file aktif (nama, dimensi) + kontrol *View Mode* (Single / Side-by-Side / Split Slider) + kontrol Zoom (Fit, 50%, 100%, 200%).
   * Kanan: Tombol **Undo**, **Redo**, **Reset**, dan tombol utama **Save File**.
2. **Left Sidebar — Daftar Operasi (Lebar ~240px):**
   * Pengelompokan logis (bukan sekadar daftar datar 13 item) agar navigasi cepat:
     * *Warna & Intensitas:* Grayscale, Brightness, Negative, Equalization, Thresholding.
     * *Filter Spasial (Blur):* Gaussian, Averaging, Median, Bilateral, Standard Filter 2D.
     * *Detail & Efek:* Sharpening, Edge Detection, Sketch.
     * *Geometri:* Mirroring.
3. **Center Stage — Kanvas Utama (Fleksibel):**
   * Menampilkan citra dengan latar belakang pola kotak-kotak (*checkerboard*) khusus untuk area transparan PNG.
   * Mendukung perbandingan *Split Slider* (garis vertikal yang bisa digeser kiri-kanan untuk membandingkan Original vs Processed secara presisi).
   * Saat belum ada file dimuat, area ini berfungsi sebagai zona *Drag-and-Drop* penuh disertai tombol sampel gambar bawaan (misalnya gambar standar dengan noise *salt-and-pepper* dan gambar rendah kontras untuk kemudahan demo).
4. **Right Sidebar — Panel Parameter & Inspektor (Lebar ~320px):**
   * **Bagian Atas (Histogram Panel):** Grafik Histogram interaktif (toggle RGB / Grayscale + toggle Original vs Processed) beserta ringkasan statistik piksel (Min, Max, Mean, Std Dev).
   * **Bagian Tengah (Parameter Kontrol):** Dinamis sesuai operasi yang dipilih. Berisi slider, input angka, dropdown metode, matriks $3 \times 3$ atau $5 \times 5$ (khusus Filter 2D), serta tombol **Apply** dan **Cancel**.
   * **Bagian Bawah (Operation History / Pipeline):** Daftar kronologis operasi yang sudah diterapkan pada gambar (contoh: `1. Grayscale (Luminance)` -> `2. Median Blur (k=5)` -> `3. Canny (50, 150)`).

---

## 5. Arsitektur Teknis & Trade-off Implementasi

Terdapat dua pendekatan arsitektur utama untuk membangun aplikasi ini. Pilihan sebaiknya disesuaikan dengan kenyamanan *stack* dan aturan mata kuliah.

### Perbandingan Pendekatan Arsitektur

| Aspek | Opsi A: Frontend + Python Backend (FastAPI + OpenCV/NumPy) | Opsi B: Full Client-Side (React/Next.js + Canvas API / OpenCV.js WASM) |
| :--- | :--- | :--- |
| **Akurasi & Kemudahan Algoritma** | Sangat tinggi. OpenCV + NumPy sudah sangat matang untuk Bilateral Blur, Canny, Otsu, dan YCrCb Equalization. Mudah juga menulis versi manual dengan vektorisasi NumPy. | Cukup menantang jika murni JS Canvas (harus coding Bilateral, Canny, Otsu manual dan berisiko lambat). Pakai `OpenCV.js` (WASM) menyelesaikan ini, tetapi ukuran bundle ~8–10 MB. |
| **Latensi Live Preview** | Ada jeda jaringan (*round-trip* HTTP) setiap slider digeser. Wajib menerapkan *debouncing* (150–300 ms) dan *preview downscaling* (misal maks lebar 1000px). | Instan untuk operasi ringan (Brightness, Negative, Grayscale, Mirroring) karena tanpa transfer jaringan. Operasi berat (Bilateral/Filter 2D besar) wajib ditaruh di **Web Worker** agar UI tidak *freeze*. |
| **Biaya & Kemudahan Deploy** | Butuh hosting backend Python (misal VPS, Railway, Render) terpisah dari frontend. | Sangat mudah dan gratis (hosting statis seperti Vercel), tidak butuh server pemrosesan. |
| **Kesesuaian untuk Proyek PCD** | **Sangat Direkomendasikan** jika materi kuliah PCD diajarkan menggunakan Python/OpenCV, sehingga kode backend bisa langsung dijelaskan ke dosen sesuai referensi kuliah. | **Direkomendasikan** jika ingin performa tanpa server dan fokus penuh pada ekosistem TypeScript/Web. |

### Spesifikasi Kontrak API (Jika Memilih Opsi A: Frontend + FastAPI Backend)

Untuk menghindari transfer gambar mentah berulang kali pada setiap geseran slider, gunakan pendekatan *session-based image storage* sementara (di memori/disk temp dengan TTL, misalnya 30 menit) atau pengiriman stateless terkompresi untuk pratinjau.

* **`POST /api/images/upload`**
  * Input: `multipart/form-data` (file gambar).
  * Output: `{ image_id, width, height, format, channels, preview_url, histogram_data, stats }`.
* **`POST /api/images/{image_id}/process`**
  * Input (JSON):
    ```json
    {
      "operation": "blur_bilateral",
      "params": {
        "diameter": 9,
        "sigma_color": 75,
        "sigma_space": 75
      },
      "commit": false,
      "preview_mode": true
    }
    ```
  * Penjelasan: Jika `commit: false`, server memproses versi pratinjau tanpa menimpa state aktif. Jika `commit: true`, server memproses resolusi asli, mendorong state baru ke history stack, dan mengembalikan gambar + histogram baru.
  * Output: `{ processed_image_base64_or_url, histogram_data, stats, processing_time_ms }`.
* **`POST /api/images/{image_id}/history/{action}`** (`undo` | `redo` | `reset`)
  * Output: State citra, daftar history terbaru, dan histogram terbaru.
* **`GET /api/images/{image_id}/export?format=png&quality=90`**
  * Output: Stream biner file citra resolusi penuh dengan header `Content-Disposition: attachment`.

---

## 6. Kebutuhan Non-Fungsional (NFR)

1. **Performa & Responsivitas:**
   * Operasi titik (*Grayscale, Brightness, Negative, Mirroring*): selesai dalam waktu kurang dari $150\text{ ms}$ untuk gambar resolusi pratinjau (maksimal $1280\text{ px}$ sisi terpanjang).
   * Operasi konvolusi & non-linear (*Gaussian, Median, Bilateral, Filter 2D, Canny, Sketch*): selesai dalam waktu kurang dari $500\text{ ms}$ pada resolusi pratinjau, dan kurang dari $2\text{ detik}$ pada resolusi penuh (hingga 4K).
   * Slider input wajib menerapkan **debounce** ($200\text{ ms}$) agar tidak membanjiri permintaan proses saat pengguna menggeser slider secara cepat.
2. **Keamanan & Integritas Data:**
   * Validasi *magic bytes* file upload (tidak hanya mengandalkan ekstensi nama file).
   * Jika menggunakan backend, file sementara di server wajib dibersihkan secara berkala (*scheduled cleanup*) untuk mencegah kehabisan penyimpanan.
   * Sanitasi nama file saat fitur *Save File* untuk mencegah karakter ilegal pada sistem operasi.
3. **Reliabilitas & Penanganan Error:**
   * Jika nilai input matriks Filter 2D tidak valid (misalnya teks non-numerik atau semua elemen bernilai $0$ dengan *auto-normalize* aktif), tampilkan pesan validasi langsung di kolom input tanpa memicu *crash* aplikasi.
   * Tampilkan indikator *loading* non-blocking pada kanvas jika pemrosesan memakan waktu lebih dari $300\text{ ms}$.
4. **Kompatibilitas Browser:**
   * Berjalan lancar pada versi terbaru Google Chrome, Microsoft Edge, dan Mozilla Firefox.

---

## 7. Rencana Pengujian & Kriteria Penerimaan (Acceptance Criteria)

Sebelum aplikasi dinyatakan siap untuk presentasi proyek akhir, seluruh kasus uji berikut harus lulus:

| No | Area Uji | Skenario Pengujian | Hasil yang Diharapkan |
| :--- | :--- | :--- | :--- |
| 1 | **Open File & Validasi** | Unggah file `.pdf` yang di-rename menjadi `.jpg`, lalu unggah gambar `.png` transparan yang valid. | File `.pdf` palsu ditolak dengan pesan error jelas; `.png` valid tampil dengan latar transparan dan metadata akurat. |
| 2 | **Histogram & Equalization** | Unggah gambar gelap/kontras rendah, lihat histogram, lalu jalankan *Equalization*. | Histogram awal menumpuk di sisi kiri; setelah equalization, distribusi melebar merata di rentang 0 hingga 255 dan warna kulit/objek pada citra RGB tidak berubah aneh (tidak *color shift*). |
| 3 | **Thresholding** | Jalankan Thresholding pada gambar berwarna dengan $T = 0$, $T = 127$, dan $T = 255$. | Pada $T=0$ hampir seluruh piksel putih ($255$); pada $T=255$ seluruh piksel hitam ($0$); tidak error meski input awal RGB. |
| 4 | **5 Variasi Blur** | Unggah gambar dengan *salt-and-pepper noise*, lalu bandingkan hasil *Averaging*, *Gaussian*, *Median*, *Bilateral*, dan *Filter 2D*. | *Median Blur* membersihkan titik noise paling bersih; *Bilateral* menghaluskan area datar tanpa mengaburkan garis tepi; *Filter 2D* merespons perubahan angka matriks secara nyata. |
| 5 | **Brightness & Clamping** | Geser Brightness ke $+100$ (atau $+255$) dan $-100$ (atau $-255$). | Area terang menjadi putih murni ($255$) dan gelap menjadi hitam murni ($0$) tanpa artefak warna aneh akibat *overflow*. |
| 6 | **Negative pada PNG** | Jalankan Negative pada logo PNG berlatar transparan. | Warna objek terbalik, tetapi area transparan tetap transparan (tidak berubah menjadi hitam pekat). |
| 7 | **Sketch** | Jalankan Sketch pada foto potret dengan kernel $5$ vs kernel $35$. | Tidak terjadi error pembagian nol pada area putih murni; perubahan kernel mengubah ketebalan arsir secara jelas. |
| 8 | **Edge Detection** | Uji Sobel, Prewitt, Laplacian, dan Canny pada citra bangunan/geometris. | Canny menghasilkan garis tepi tipis $1\text{ piksel}$ yang bersih; nilai *Low Threshold* tidak bisa diset lebih besar dari *High Threshold*. |
| 9 | **Pipeline & Undo/Redo** | Jalankan berurutan: *Grayscale -> Apply -> Gaussian Blur -> Apply -> Mirroring Horizontal -> Apply -> Undo 2x -> Reset*. | Setiap langkah tercatat di History, *Undo* mengembalikan citra dan histogram ke state persis sebelumnya, dan *Reset* kembali ke gambar asli. |
| 10 | **Save File** | Simpan hasil akhir sebagai PNG dan JPG (kualitas 50% vs 95%). | File terunduh sempurna, bisa dibuka di image viewer OS, dimensi sesuai resolusi asli, dan ukuran file JPG 50% lebih kecil dari 95%. |

---

## 8. Tahapan Implementasi yang Disarankan (Roadmap)

1. **Fase 1 — Fondasi & Pipeline (Hari 1–3):** Setup proyek (frontend + backend/worker), fitur *Open File*, tampilan kanvas, *Save File*, *History Stack* (Undo/Redo/Reset), dan modul *Histogram*.
2. **Fase 2 — Operasi Titik & Geometris (Hari 4–5):** Implementasi *Grayscale*, *Brightness*, *Negative*, *Mirroring*, *Thresholding*, dan *Equalization*.
3. **Fase 3 — Konvolusi & Filter Spasial (Hari 6–9):** Implementasi 5 variasi *Blur* (termasuk UI input matriks untuk *Filter 2D*), *Sharpening*, *Edge Detection* (Sobel, Prewitt, Laplacian, Canny), dan *Sketch*.
4. **Fase 4 — Polish UI, Optimasi & Pengujian (Hari 10–12):** Implementasi *Split-Slider Comparison*, *debouncing*, penambahan gambar sampel bawaan untuk demo, dan eksekusi seluruh daftar *Acceptance Criteria*.