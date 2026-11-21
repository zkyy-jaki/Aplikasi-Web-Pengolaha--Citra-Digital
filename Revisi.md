# Audit & Rencana Refaktorisasi Algoritma Pengolahan Citra Digital (From Scratch)

Dokumen ini memuat analisis mendalam mengenai ketergantungan library pada aplikasi **PCD Studio**, pemisahan fitur yang sudah manual vs yang masih *black-box*, serta cetak biru teknis implementasi algoritma manual (berbasis NumPy) agar mahasiswa dapat menjelaskan prinsip **sebab-akibat matematis** di hadapan dosen penguji.

---

## 1. Latar Belakang & Urgensi

Dalam konteks mata kuliah **Pengolahan Citra Digital (PCD)**:
- **Tuntutan Evaluasi Dosen:** Mahasiswa diharapkan memahami representasi citra sebagai matriks $2\text{D}/3\text{D}$, operasi tetangga (*neighborhood operation*), konvolusi spasial, dan distribusi frekuensi piksel secara matematis.
- **Masalah Saat Ini:** Sebagian besar filter spasial dan transformasi intensitas masih memanggil fungsi bawaan OpenCV (`cv2.*`). Fungsi tersebut bersifat *black-box* (terenkapsulasi dalam binary C++), sehingga alur komputasi piksel per piksel tidak tampak pada kode sumber.
- **Tujuan Refaktorisasi:** Menghapus fungsi *black-box* OpenCV pada seluruh logika pemrosesan citra, menggantinya dengan implementasi algoritma murni menggunakan operasi array/vektorisasi NumPy, dan menyisakan OpenCV **hanya untuk membaca/menulis file (I/O)**.

---

## 2. Audit Status Fitur Saat Ini

### A. Fitur yang SUDAH Murni Manual / Rumus Sendiri (Aman) ✅

Fitur-fitur di bawah ini sudah menggunakan rumus matematis langsung tanpa fungsi instan OpenCV:

| Fitur | Implementasi Saat Ini | Penjelasan Matematis ke Dosen |
| :--- | :--- | :--- |
| **Grayscale: Luminance** | `0.299*R + 0.587*G + 0.114*B` | Standar ITU-R BT.601 yang disesuaikan dengan kurva sensitivitas fotoreseptor mata manusia terhadap warna hijau. |
| **Grayscale: Average** | `(R + G + B) / 3` | Rata-rata aritmatika sederhana ketiga kanal warna RGB. |
| **Grayscale: Lightness** | `(max(R,G,B) + min(R,G,B)) / 2` | Desaturasi berdasarkan nilai extremum rentang intensitas. |
| **Brightness** | `np.clip(I.astype(int16) + beta, 0, 255)` | Penjumlahan skalar linear dengan *safe clamping* dan casting 16-bit untuk mencegah cacat *wrap-around* / *overflow*. |
| **Negative** | `255 - I` | Pembalikan nilai intensitas komplementer terhadap nilai maksimum 8-bit. |
| **Color Dodge (Sketch)** | `(gray * 255) // max(1, 255 - blurred)` | Pembagian intensitas citra asli dengan inversi citra kabur; guard `max(1, ...)` mencegah *division-by-zero*. |
| **Unsharp Masking** | `I_in + alpha * (I_in - I_blur)` | Ekstraksi komponen frekuensi tinggi $(I - I_{\text{blur}})$ yang dikalikan faktor penguat $\alpha$ lalu dijumlahkan kembali ke citra asli. |

---

### B. Fitur yang MASIH Memakai Library OpenCV (Rentan Evaluasi) ⚠️

Fitur-fitur ini masih menggunakan fungsi *black-box* OpenCV yang berisiko dipertanyakan dosen saat demo:

| Fitur | Fungsi OpenCV Saat Ini | Rumus / Algoritma Manual Seharusnya | Risiko Ditanya Dosen |
| :--- | :--- | :--- | :--- |
| **Mirroring (Geometri)** | `cv2.flip(img, code)` | **Slicing Matriks NumPy:**<br>• Horizontal: `img[:, ::-1]`<br>• Vertikal: `img[::-1, :]`<br>• Keduanya: `img[::-1, ::-1]` | Sangat dasar. Membalik matriks menggunakan library luar menunjukkan ketergantungan yang tidak perlu. |
| **Thresholding (Biner, Inv, Truncate, To Zero)** | `cv2.threshold(...)` | **Kondisional NumPy:**<br>• Binary: `np.where(I > T, 255, 0)`<br>• Inv: `np.where(I > T, 0, 255)`<br>• Trunc: `np.where(I > T, T, I)`<br>• ToZero: `np.where(I > T, I, 0)` | Operasi *point processing* element-wise sederhana yang seharusnya ditulis murni dari definisi matematika ambang batas. |
| **Otsu Thresholding** | `cv2.threshold(..., cv2.THRESH_OTSU)` | **Pencarian Ambang Bimodal:**<br>Mencari nilai $T \in [0, 255]$ yang memaksimalkan varians antar-kelas:<br>$$\sigma_b^2(T) = \omega_0(T) \cdot \omega_1(T) \cdot (\mu_0(T) - \mu_1(T))^2$$ | Pertanyaan ujian teori klasik: dosen sering meminta mahasiswa menjelaskan tahapan pencarian $T$ dari histogram. |
| **Histogram Equalization** | `cv2.equalizeHist(...)` | **CDF (Cumulative Distribution Function):**<br>1. Hitung histogram frekuensi $h(v)$<br>2. Hitung kumulatif: $CDF(v) = \sum_{i=0}^v h(i)$<br>3. Normalisasi: $T(v) = \text{round}\left(\frac{CDF(v) - CDF_{\min}}{(M \times N) - CDF_{\min}} \times 255\right)$<br>4. Transformasikan nilai piksel dengan lookup table. | Dosen hampir pasti menanyakan rumus CDF dan bagaimana distribusi probabilitas kumulatif meratakan histogram. |
| **Filter Spasial 2D (Konvolusi)** | `cv2.filter2D(...)` | **Manual 2D Convolution:**<br>1. *Padding* pada tepi citra (replicate / reflect)<br>2. *Sliding window* patch $k \times k$<br>3. Perkalian titik elemen matriks (*element-wise product*) & penjumlahan $\sum(W \cdot K)$<br>4. *Clipping* ke rentang $[0, 255]$. | Konvolusi adalah fondasi utama PCD. Dosen ingin melihat loop/vektorisasi perhitungan perkalian kernel dengan piksel tetangga. |
| **Averaging Blur** | `cv2.blur(...)` | Konvolusi manual dengan kernel matriks seragam berbobot $K_{i,j} = \frac{1}{k \times k}$. | Dosen ingin melihat pembuatan kernel kotak dan perata-rataan nilai tetangga. |
| **Gaussian Blur** | `cv2.GaussianBlur(...)` | Buat matriks Gaussian 2D manual berbobot kurva lonceng:<br>$$G(x, y) = \frac{1}{2\pi\sigma^2} e^{-\frac{x^2+y^2}{2\sigma^2}}$$ lalu dinormalisasi ($\sum G = 1$) dan dikonvolusikan ke citra. | Membuktikan pemahaman parameter $\sigma$ (standar deviasi sebaran Gaussian). |
| **Median Blur** | `cv2.medianBlur(...)` | Mengambil seluruh piksel tetangga dalam jendela $k \times k$, mengurutkan nilai (*sorting*), dan mengambil nilai median (tengah). | Teori non-linear filter peredam derau *salt-and-pepper* tanpa mengaburkan garis tepi objek. |
| **Sobel & Prewitt** | `cv2.Sobel()`, `cv2.filter2D()` | Konvolusi manual dengan kernel turunan pertama arah horizontal ($G_x$) dan vertikal ($G_y$), kemudian hitung magnitudo gradien:<br>$$G = \sqrt{G_x^2 + G_y^2}$$ | Dosen sering meminta menunjukkan arah matriks gradien diferensial. |
| **Laplacian** | `cv2.Laplacian(...)` | Konvolusi manual dengan kernel turunan kedua Laplacian isotropik 4-tetangga atau 8-tetangga:<br>$$K = \begin{bmatrix} 0 & 1 & 0 \\ 1 & -4 & 1 \\ 0 & 1 & 0 \end{bmatrix}$$ | Membedakan turunan pertama (Sobel) dengan turunan kedua (Laplacian). |
| **Canny Edge Detection** | `cv2.Canny(...)` | Implementasi 5 tahapan Canny:<br>1. Gaussian Filter Smoothing<br>2. Gradien Sobel & Arah Sudut $\theta$<br>3. *Non-Maximum Suppression* (NMS)<br>4. *Double Thresholding* (Strong & Weak edges)<br>5. *Edge Tracking by Hysteresis* | Canny bawaan OpenCV menyembunyikan logika NMS dan Hysteresis yang menjadi poin penting penilaian algoritma. |
| **Kalkulasi Histogram** | `cv2.calcHist(...)` | Menghitung frekuensi nilai kemunculan intensitas $0 \dots 255$ menggunakan `np.bincount(channel.flatten(), minlength=256)`. | Menghitung frekuensi nilai adalah dasar statistik citra yang sangat mudah dibuat manual. |

---

## 3. Cetak Biru Teknis Refaktorisasi (From Scratch)

Rencana struktur modul agar kode bersih, modular, dan siap dipresentasikan:

```
backend/app/services/
├── core_conv.py          # [BARU] Fungsi konvolusi 2D manual (padding + sliding window / vectorization)
├── ops_point.py          # Refaktor: Thresholding manual (np.where), Otsu manual, Equalization CDF manual
├── ops_blur.py           # Refaktor: Pembuatan kernel Gaussian manual, Averaging manual, Median sort manual
├── ops_detail.py         # Refaktor: Sobel, Prewitt, Laplacian, dan Canny 5-stage manual
├── ops_geometry.py       # Refaktor: Mirroring murni array slicing (img[:, ::-1])
├── histogram.py          # Refaktor: Histogram manual via np.bincount
└── alpha_utils.py        # Helper handling transparansi PNG
```

### A. Konvolusi 2D Manual (`core_conv.py`)
Inti seluruh filter spasial adalah fungsi konvolusi manual:
```python
def manual_convolve2d(image: np.ndarray, kernel: np.ndarray) -> np.ndarray:
    """Konvolusi 2D manual dengan padding refleksi dan kalkulasi titik tetangga."""
    k_h, k_w = kernel.shape
    pad_h, pad_w = k_h // 2, k_w // 2
    
    # 1. Padding agar dimensi citra tidak menyusut
    padded = np.pad(image, ((pad_h, pad_h), (pad_w, pad_w)), mode='reflect')
    
    # 2. Sliding window konvolusi
    h, w = image.shape
    output = np.zeros((h, w), dtype=np.float32)
    for r in range(k_h):
        for c in range(k_w):
            output += padded[r : r + h, c : c + w] * kernel[r, c]
            
    return np.clip(output, 0, 255).astype(np.uint8)
```

### B. Histogram Equalization Manual (`ops_point.py`)
Menerapkan transformasi fungsi distribusi kumulatif:
```python
def manual_equalize_channel(channel: np.ndarray) -> np.ndarray:
    # 1. Hitung histogram frekuensi
    hist = np.bincount(channel.flatten(), minlength=256)
    
    # 2. Hitung Cumulative Distribution Function (CDF)
    cdf = hist.cumsum()
    
    # 3. Mask nilai nol & normalisasi ke 0-255
    cdf_m = np.ma.masked_equal(cdf, 0)
    cdf_m = (cdf_m - cdf_m.min()) * 255 / (channel.size - cdf_m.min())
    lookup_table = np.ma.filled(cdf_m, 0).astype(np.uint8)
    
    # 4. Transformasikan piksel citra via lookup table
    return lookup_table[channel]
```

### C. Otsu's Thresholding Manual (`ops_point.py`)
Mencari ambang optimal bimodal:
```python
def manual_otsu(gray: np.ndarray) -> tuple[np.ndarray, float]:
    hist = np.bincount(gray.flatten(), minlength=256).astype(np.float32)
    total_pixels = gray.size
    current_max = 0.0
    threshold = 0
    
    weight_bg = 0.0
    sum_bg = 0.0
    sum_total = np.dot(np.arange(256), hist)
    
    for t in range(256):
        weight_bg += hist[t]
        if weight_bg == 0:
            continue
        weight_fg = total_pixels - weight_bg
        if weight_fg == 0:
            break
            
        sum_bg += t * hist[t]
        mean_bg = sum_bg / weight_bg
        mean_fg = (sum_total - sum_bg) / weight_fg
        
        # Varians antar kelas
        variance_between = weight_bg * weight_fg * ((mean_bg - mean_fg) ** 2)
        if variance_between > current_max:
            current_max = variance_between
            threshold = t
            
    binary = np.where(gray > threshold, 255, 0).astype(np.uint8)
    return binary, float(threshold)
```

---

## 4. Batasan Penggunaan OpenCV yang Diperbolehkan

Dalam proyek akademik ini, library OpenCV dibatasi hanya pada:
1. `cv2.imdecode(...)`: Mengubah raw byte upload dari format PNG/JPEG menjadi array NumPy saat request masuk.
2. `cv2.imencode(...)`: Melakukan encode array NumPy menjadi format PNG/JPEG/BMP saat ekspor hasil olahan.

> [!NOTE]
> Seluruh kalkulasi nilai piksel citra (aritmatika, penajaman, pengaburan, segmentasi, deteksi tepi, dan statistik) dijalankan **100% menggunakan kode algoritma kita sendiri**.

---

## 5. Rencana Langkah Kerja (Roadmap Eksekusi)

1. **Tahap 1:** Buat modul `core_conv.py` berisi fungsi konvolusi manual 2D.
2. **Tahap 2:** Refaktor `ops_geometry.py` (Mirroring) ke slicing matriks NumPy.
3. **Tahap 3:** Refaktor `ops_point.py` (Thresholding biner manual, Otsu variance loop manual, dan Equalization CDF manual).
4. **Tahap 4:** Refaktor `ops_blur.py` (Perhitungan rumus matriks Gauss, matriks box averaging, dan sorting median window).
5. **Tahap 5:** Refaktor `ops_detail.py` (Sobel, Prewitt, Laplacian, dan tahapan Canny).
6. **Tahap 6:** Refaktor `histogram.py` menggunakan `np.bincount`.
7. **Tahap 7:** Jalankan `pytest` (124 unit test) dan pastikan seluruh pengujian tetap lulus hijau dengan akurasi yang identik.
