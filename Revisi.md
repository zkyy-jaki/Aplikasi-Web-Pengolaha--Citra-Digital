# Spesifikasi Refaktorisasi Algoritma PCD (From Scratch / Pure NumPy)

Dokumen ini adalah spesifikasi teknis untuk merombak seluruh operasi pemrosesan citra di backend **PCD Studio** agar menggunakan implementasi algoritma manual berbasis NumPy tanpa fungsi *black-box* OpenCV (`cv2.*`).

## 0. Instruksi Kerja untuk Coding Agent

Sebelum menulis atau mengubah kode:
1. Audit seluruh pemanggilan `cv2.` di direktori `backend/` terlebih dahulu.
2. Pertahankan seluruh kontrak API FastAPI (endpoint, nama parameter, tipe payload, dan format respons) agar frontend tidak terdampak.
3. Pertahankan mekanisme pelestarian kanal alpha (`alpha_utils.py`) pada gambar PNG transparan.
4. Ikuti seluruh batasan teknis, spesifikasi modul, dan strategi pengujian di bawah ini secara ketat.

---

## 1. Batasan Keras (Hard Constraints)

### A. Batasan Penggunaan OpenCV
Penggunaan OpenCV (`cv2`) di seluruh proyek **hanya diizinkan** untuk proses I/O file:
- `cv2.imdecode(...)` untuk membaca byte gambar menjadi array NumPy.
- `cv2.imencode(...)` untuk mengekspor array NumPy menjadi byte PNG/JPEG/BMP.

**Dilarang keras** menggunakan fungsi OpenCV lainnya di jalur pemrosesan citra, termasuk namun tidak terbatas pada:
- `cv2.cvtColor` (ganti dengan slicing `img[..., ::-1]` untuk BGR/RGB, rumus Luminance untuk Grayscale, dan matriks BT.601 manual untuk RGB/YCrCb).
- `cv2.flip`, `cv2.threshold`, `cv2.equalizeHist`, `cv2.filter2D`, `cv2.blur`, `cv2.GaussianBlur`, `cv2.medianBlur`, `cv2.bilateralFilter`, `cv2.Sobel`, `cv2.Laplacian`, `cv2.Canny`, dan `cv2.calcHist`.

### B. Batasan Performa & Vektorisasi (Backend Web)
- Aplikasi menerima unggahan citra hingga 10 MB.
- **Dilarang** menggunakan *nested Python loop* per piksel (`for y in range(h): for x in range(w):`) pada operasi filter spasial, thresholding, median, bilateral, maupun NMS Canny.
- Gunakan vektorisasi NumPy, array slicing, loop pada dimensi kernel (`k_h x k_w`), atau `np.lib.stride_tricks.sliding_window_view`.
- Pengecualian loop eksplisit hanya diizinkan pada *Edge Tracking by Hysteresis* (Canny) menggunakan antrean `collections.deque` (BFS) yang hanya mengunjungi piksel tepi (*strong/weak edges*).

---

## 2. Audit Fitur & Ruang Lingkup Refaktorisasi

### A. Sudah Manual (Pertahankan & Verifikasi)
- **Grayscale** (Luminance `0.299R + 0.587G + 0.114B`, Average `(R+G+B)/3`, Lightness `(max+min)/2`)
- **Brightness** (`np.clip(I.astype(np.int16) + beta, 0, 255).astype(np.uint8)`)
- **Negative** (`255 - I`)

### B. Semi-Manual (Perbaiki Dependensi & Guard Tipe Data)
- **Unsharp Masking (`ops_detail.py`):** Pastikan pemanggilan blur di dalamnya menggunakan `Gaussian Blur` manual dari `ops_blur.py`, bukan `cv2.GaussianBlur`. Hitung dalam `float64`, lalu `np.clip(np.round(...), 0, 255).astype(np.uint8)`.
- **Pencil Sketch / Color Dodge (`ops_detail.py`):** Pastikan proses blur menggunakan `Gaussian Blur` manual. Hindari *overflow* `uint8` pada perkalian `gray * 255` dengan melakukan casting ke `np.float64` (atau `np.int32`), gunakan `np.maximum(1.0, 255.0 - blurred)` sebagai penyebut, lalu clip ke `[0, 255]` dan cast ke `np.uint8`.

### C. Wajib Direfaktor Total ke Pure NumPy
1. **Konversi Warna** (pengganti `cv2.cvtColor`)
2. **Mirroring** (`ops_geometry.py`)
3. **Thresholding: Binary, Binary Inv, Truncate, To Zero** (`ops_point.py`)
4. **Otsu Thresholding** (`ops_point.py`)
5. **Histogram Equalization** (`ops_point.py`)
6. **Core Konvolusi 2D & Standard Filter 2D** (`core_conv.py`, `ops_blur.py`)
7. **Averaging Blur** (`ops_blur.py`)
8. **Gaussian Blur** (`ops_blur.py`)
9. **Median Blur** (`ops_blur.py`)
10. **Bilateral Filter** (`ops_blur.py`)
11. **Sobel & Prewitt Operator** (`ops_detail.py`)
12. **Laplacian** (`ops_detail.py`)
13. **Canny Edge Detection (5-stage)** (`ops_detail.py`)
14. **Kalkulasi Histogram** (`histogram.py`)

---

## 3. Cetak Biru Teknis Per Modul

Struktur target di `backend/app/services/`:

```text
backend/app/services/
├── core_conv.py      # [BARU] Konvolusi 2D manual (2D/3D) + helper konversi warna manual
├── ops_geometry.py   # Mirroring via array slicing (contiguous)
├── ops_point.py      # Thresholding manual, Otsu (float64), Equalization CDF manual
├── ops_blur.py       # Standard Filter 2D, Averaging, Gaussian, Median, Bilateral manual
├── ops_detail.py     # Unsharp Masking, Pencil Sketch, Sobel, Prewitt, Laplacian, Canny 5-stage
├── histogram.py      # Histogram via np.bincount
└── alpha_utils.py    # Pertahankan handling transparansi PNG

A. core_conv.py (Konvolusi 2D & Utilitas Warna)Aturan Penting:Fungsi manual_convolve2d TIDAK BOLEH melakukan np.clip(0, 255) atau casting ke uint8 di dalam fungsi, karena operasi gradien (Sobel, Prewitt, Laplacian) membutuhkan nilai negatif mentah.Harus mendukung citra 2D (H, W) maupun 3D (H, W, C).Sediakan parameter flip_kernel: bool = True untuk membalik kernel 180 derajat (kernel[::-1, ::-1]) sesuai definisi matematis konvolusi murni.Pythonimport numpy as np

def manual_convolve2d(
    image: np.ndarray,
    kernel: np.ndarray,
    mode: str = "reflect",
    flip_kernel: bool = True,
) -> np.ndarray:
    """Konvolusi 2D manual untuk citra 2D (H, W) dan 3D (H, W, C). Mengembalikan array float64 tanpa clipping."""
    img = image.astype(np.float64)
    k = np.asarray(kernel, dtype=np.float64)
    if flip_kernel:
        k = k[::-1, ::-1]

    k_h, k_w = k.shape
    pad_top = k_h // 2
    pad_bottom = k_h - 1 - pad_top
    pad_left = k_w // 2
    pad_right = k_w - 1 - pad_left

    if img.ndim == 2:
        h, w = img.shape
        padded = np.pad(img, ((pad_top, pad_bottom), (pad_left, pad_right)), mode=mode)
        output = np.zeros((h, w), dtype=np.float64)
        for r in range(k_h):
            for c in range(k_w):
                if k[r, c] != 0.0:
                    output += padded[r : r + h, c : c + w] * k[r, c]
        return output

    if img.ndim == 3:
        h, w, ch = img.shape
        padded = np.pad(img, ((pad_top, pad_bottom), (pad_left, pad_right), (0, 0)), mode=mode)
        output = np.zeros((h, w, ch), dtype=np.float64)
        for r in range(k_h):
            for c in range(k_w):
                if k[r, c] != 0.0:
                    output += padded[r : r + h, c : c + w, :] * k[r, c]
        return output

    raise ValueError(f"Unsupported image dimensions: {img.ndim}")
Helper Konversi Warna Manual (pengganti cv2.cvtColor):BGR <-> RGB: img[..., ::-1].copy()BGR -> Grayscale (BT.601): np.clip(np.round(0.114 * B + 0.587 * G + 0.299 * R), 0, 255).astype(np.uint8)Jika Equalization pada gambar berwarna menggunakan ruang warna YCrCb (cek perilaku kode saat ini), implementasikan konversi BGR <-> YCrCb secara manual menggunakan rumus matriks ITU-R BT.601:$Y = 0.299R + 0.587G + 0.114B$$C_r = (R - Y) \cdot 0.713 + 128$$C_b = (B - Y) \cdot 0.564 + 128$Invers:$R = Y + 1.403(C_r - 128)$$G = Y - 0.714(C_r - 128) - 0.344(C_b - 128)$$B = Y + 1.773(C_b - 128)$B. ops_geometry.py (Mirroring)Horizontal: np.ascontiguousarray(img[:, ::-1])Vertikal: np.ascontiguousarray(img[::-1, :])Keduanya: np.ascontiguousarray(img[::-1, ::-1])Catatan: Wajib gunakan .copy() atau np.ascontiguousarray(...) agar array tidak memiliki negative strides saat diteruskan ke cv2.imencode.C. ops_point.py (Thresholding, Otsu, Equalization)Thresholding Manual (np.where):Binary: np.where(gray > T, 255, 0).astype(np.uint8)Binary Inv: np.where(gray > T, 0, 255).astype(np.uint8)Truncate: np.where(gray > T, T, gray).astype(np.uint8)To Zero: np.where(gray > T, gray, 0).astype(np.uint8)To Zero Inv (jika ada): np.where(gray > T, 0, gray).astype(np.uint8)Otsu Thresholding Manual (float64 & Probabilitas):
Gunakan probabilitas $\omega_0(T), \omega_1(T)$ dalam float64 agar terhindar dari kehilangan presisi pada citra resolusi tinggi:Pythondef manual_otsu(gray: np.ndarray) -> tuple[np.ndarray, float]:
    hist = np.bincount(gray.ravel(), minlength=256).astype(np.float64)
    total = float(gray.size)
    if total == 0:
        return gray.copy(), 0.0

    probs = hist / total
    bins = np.arange(256, dtype=np.float64)
    total_mean = float(np.dot(bins, probs))

    omega_bg = 0.0
    mu_bg_acc = 0.0
    max_var = -1.0
    best_t = 0

    for t in range(256):
        omega_bg += probs[t]
        if omega_bg <= 0.0:
            continue
        omega_fg = 1.0 - omega_bg
        if omega_fg <= 0.0:
            break

        mu_bg_acc += t * probs[t]
        mean_bg = mu_bg_acc / omega_bg
        mean_fg = (total_mean - mu_bg_acc) / omega_fg

        var_between = omega_bg * omega_fg * ((mean_bg - mean_fg) ** 2)
        if var_between > max_var:
            max_var = var_between
            best_t = t

    binary = np.where(gray > best_t, 255, 0).astype(np.uint8)
    return binary, float(best_t)
Histogram Equalization Manual (dengan Guard Citra Solid):Pythondef manual_equalize_channel(channel: np.ndarray) -> np.ndarray:
    if channel.size == 0:
        return channel.copy()

    hist = np.bincount(channel.ravel(), minlength=256)
    cdf = hist.cumsum()
    nonzero = cdf[cdf > 0]
    if nonzero.size == 0:
        return channel.copy()

    cdf_min = int(nonzero[0])
    denom = channel.size - cdf_min
    if denom <= 0:
        # Guard untuk citra satu warna solid (semua piksel bernilai sama)
        return channel.copy()

    lut = np.round(np.maximum(cdf - cdf_min, 0) * 255.0 / denom).astype(np.uint8)
    return lut[channel]
Untuk citra berwarna (3 kanal): cocokkan dengan perilaku aplikasi sebelumnya (ideal: konversi manual ke YCrCb -> equalize kanal Y saja -> konversi balik ke BGR agar rona warna tidak rusak).D. ops_blur.py (Standard Filter 2D, Averaging, Gaussian, Median, Bilateral)Standard Filter 2D: Panggil manual_convolve2d(image, kernel) lalu np.clip(np.round(out), 0, 255).astype(np.uint8).Averaging Blur: Buat kernel np.ones((k, k), dtype=np.float64) / (k * k), panggil manual_convolve2d, lalu clip & cast ke uint8.Gaussian Blur:Jika sigma <= 0, gunakan rumus auto-sigma standar: sigma = 0.3 * ((k - 1) * 0.5 - 1) + 0.8.Buat grid koordinat berpusat di 0 (ax = np.arange(k) - (k - 1) / 2.0), hitung:$$G(x, y) = \exp\left(-\frac{x^2 + y^2}{2\sigma^2}\right)$$lalu normalisasi kernel /= kernel.sum().Panggil manual_convolve2d, lalu clip & cast ke uint8.Median Blur (Vektorisasi Memori-Efisien):Gunakan np.pad(..., mode="reflect") dan np.lib.stride_tricks.sliding_window_view(padded, (k, k)).Untuk citra 3D (H, W, C), proses per kanal (for ch in range(C)) untuk menjaga puncak penggunaan RAM tetap aman pada gambar besar, lalu hitung np.median(windows, axis=(-2, -1)) dan cast ke uint8.Bilateral Filter (Vektorisasi Loop Dimensi Kernel):Pastikan diameter d ganjil (if d <= 0, turunkan dari sigma_space misal d = max(3, int(2 * round(2 * sigma_space) + 1)) dengan batas atas wajar sesuai parameter API; jika genap, tambah 1).Guard jika sigma_color <= 0 atau sigma_space <= 0: kembalikan image.copy().Implementasi vektorisasi (bebas loop (H, W)):Pythondef manual_bilateral_filter(
    image: np.ndarray, d: int, sigma_color: float, sigma_space: float
) -> np.ndarray:
    if sigma_color <= 0 or sigma_space <= 0 or d <= 1:
        return image.copy()
    if d % 2 == 0:
        d += 1

    radius = d // 2
    img_f = image.astype(np.float64)
    two_ss_sq = 2.0 * (sigma_space ** 2)
    two_sc_sq = 2.0 * (sigma_color ** 2)

    if img_f.ndim == 2:
        h, w = img_f.shape
        padded = np.pad(img_f, ((radius, radius), (radius, radius)), mode="reflect")
        num = np.zeros((h, w), dtype=np.float64)
        den = np.zeros((h, w), dtype=np.float64)
    else:
        h, w, ch = img_f.shape
        padded = np.pad(img_f, ((radius, radius), (radius, radius), (0, 0)), mode="reflect")
        num = np.zeros((h, w, ch), dtype=np.float64)
        den = np.zeros((h, w, 1), dtype=np.float64)

    for dr in range(-radius, radius + 1):
        for dc in range(-radius, radius + 1):
            spatial_w = np.exp(-(dr * dr + dc * dc) / two_ss_sq)
            if img_f.ndim == 2:
                neighbor = padded[radius + dr : radius + dr + h, radius + dc : radius + dc + w]
                diff_sq = (neighbor - img_f) ** 2
            else:
                neighbor = padded[radius + dr : radius + dr + h, radius + dc : radius + dc + w, :]
                diff_sq = np.sum((neighbor - img_f) ** 2, axis=2, keepdims=True)

            weight = spatial_w * np.exp(-diff_sq / two_sc_sq)
            num += weight * neighbor
            den += weight

    out = num / np.maximum(den, 1e-12)
    return np.clip(np.round(out), 0, 255).astype(np.uint8)
E. ops_detail.py (Sobel, Prewitt, Laplacian, Canny)Sobel & Prewitt:Konversi ke grayscale secara manual jika input 3 kanal (sesuaikan dengan perilaku API saat ini).Kernel Sobel 3x3:$K_x = \begin{bmatrix}-1 & 0 & 1 \\ -2 & 0 & 2 \\ -1 & 0 & 1\end{bmatrix}$,$K_y = \begin{bmatrix}-1 & -2 & -1 \\ 0 & 0 & 0 \\ 1 & 2 & 1\end{bmatrix}$.Kernel Prewitt 3x3:$K_x = \begin{bmatrix}-1 & 0 & 1 \\ -1 & 0 & 1 \\ -1 & 0 & 1\end{bmatrix}$,$K_y = \begin{bmatrix}-1 & -1 & -1 \\ 0 & 0 & 0 \\ 1 & 1 & 1\end{bmatrix}$.Hitung gx = manual_convolve2d(gray, Kx) dan gy = manual_convolve2d(gray, Ky) (tanpa clipping).Hitung magnitudo $G = \sqrt{G_x^2 + G_y^2}$ (atau arah tunggal jika parameter API mendukung dx/dy atau direction).Petakan ke 8-bit dengan np.clip(np.round(mag), 0, 255).astype(np.uint8) (atau ikuti aturan normalisasi yang sudah diharapkan unit test).Laplacian:Kernel 4-tetangga [[0, 1, 0], [1, -4, 1], [0, 1, 0]] atau 8-tetangga [[1, 1, 1], [1, -8, 1], [1, 1, 1]] sesuai parameter.Hitung resp = manual_convolve2d(gray, kernel) (tanpa clipping).Petakan ke 8-bit dengan nilai absolut np.clip(np.round(np.abs(resp)), 0, 255).astype(np.uint8).Canny Edge Detection (5 Tahap Murni):Tahap 1 (Smoothing): Konversi grayscale manual + Gaussian Blur manual (k=5, sigma=1.4).Tahap 2 (Gradien & Arah): Hitung gx, gy dengan Sobel manual; mag = np.hypot(gx, gy); angle = np.rad2deg(np.arctan2(gy, gx)) % 180.0.Tahap 3 (Non-Maximum Suppression - Vektorisasi Penuh):
Kuantisasi sudut ke 4 arah (0°, 45°, 90°, 135°). Pad mag sebesar 1 piksel (mode="constant", constant_values=0). Bandingkan mag dengan dua tetangga searah gradien menggunakan array slicing dan boolean mask (dilarang memakai loop (H, W)):Arah 0° (angle < 22.5 atau angle >= 157.5): bandingkan kiri (r, c-1) & kanan (r, c+1).Arah 45° (22.5 <= angle < 67.5): bandingkan kanan-atas (r-1, c+1) & kiri-bawah (r+1, c-1) (pastikan konsisten dengan konvensi sumbu-y ke bawah dan tanda kernel Sobel yang dipakai).Arah 90° (67.5 <= angle < 112.5): bandingkan atas (r-1, c) & bawah (r+1, c).Arah 135° (112.5 <= angle < 157.5): bandingkan kiri-atas (r-1, c-1) & kanan-bawah (r+1, c+1).
Pertahankan nilai mag hanya jika mag >= neighbor_1 dan mag >= neighbor_2, selain itu set ke 0.Tahap 4 (Double Thresholding):strong = nms >= high_thresholdweak = (nms >= low_threshold) & (~strong)Tahap 5 (Edge Tracking by Hysteresis - BFS):
Inisialisasi result = np.zeros_like(gray, dtype=np.uint8) dan set result[strong] = 255.
Masukkan seluruh koordinat np.argwhere(strong) ke collections.deque. Lakukan BFS 8-tetangga: setiap tetangga yang bernilai weak dan belum berstatus 255 diubah menjadi 255 lalu dimasukkan ke antrean.F. histogram.pyGanti cv2.calcHist dengan np.bincount(channel.ravel(), minlength=256).tolist() (atau tipe array/int sesuai skema respons JSON yang ada).4. Roadmap Eksekusi & Kriteria VerifikasiTahap 1: Buat core_conv.py (konvolusi 2D/3D + helper konversi warna manual).Tahap 2: Refaktor ops_geometry.py dan histogram.py.Tahap 3: Refaktor ops_point.py (Thresholding, Otsu, Equalization).Tahap 4: Refaktor ops_blur.py (Standard Filter 2D, Averaging, Gaussian, Median, Bilateral).Tahap 5: Refaktor ops_detail.py (Unsharp Masking, Pencil Sketch, Sobel, Prewitt, Laplacian, Canny).Tahap 6 (Audit Statis OpenCV): Jalankan pencarian cv2. di seluruh backend/app/. Kriteria lulus: tidak ada satu pun panggilan cv2. selain cv2.imdecode dan cv2.imencode.Tahap 7 (Pengujian pytest & Toleransi):Jalankan seluruh test suite (pytest).Catatan Penting tentang Akurasi: Implementasi manual NumPy dapat memiliki selisih kecil (misalnya 1–5 level intensitas pada piksel tertentu) dibanding OpenCV karena OpenCV menggunakan aritmatika fixed-point internal, L1-norm default pada Canny, atau aturan border/rounding yang sedikit berbeda.Jika terdapat unit test lama yang membandingkan output secara bit-exact terhadap fungsi cv2.*, perbarui assertion tersebut menjadi validasi berbasis toleransi (np.allclose / batas MAE) serta validasi properti matematis (dimensi, dtype == np.uint8, rentang [0, 255], konsistensi kanal alpha, dan edge cases seperti gambar satu warna solid).Tambahkan uji khusus untuk Bilateral Filter dan edge case citra solid (0 varians) jika belum tercakup.