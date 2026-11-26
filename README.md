# PCD Studio

**PCD Studio** adalah aplikasi workstation berbasis web untuk pengolahan citra digital interaktif. Seluruh algoritma pemrosesan citra diimplementasikan secara *from-scratch* menggunakan **Pure NumPy** tanpa bergantung pada fungsi pemrosesan *black-box* OpenCV, sehingga setiap transformasi piksel memiliki perilaku matematis yang transparan, dapat diaudit, dan mudah dijelaskan.

---

## Arsitektur Inti

| Komponen | Teknologi & Peran |
| :--- | :--- |
| **Backend API** | FastAPI, Pydantic v2, Python 3.12+ |
| **Image Engine** | **Pure NumPy** (`core_conv.py`, `ops_*.py`, `histogram.py`, `alpha_utils.py`). OpenCV (`cv2`) diisolasi khusus untuk codec I/O (`cv2.imdecode` & `cv2.imencode`) dan aset sampel awal. |
| **Frontend UI** | React 19, TypeScript (`strict`), Vite, Tailwind CSS, Recharts, Lucide Icons |
| **Desain Visual** | Workstation 3-panel *Light Pastel Pink (Soft Blush)* (`#F3ECEF` canvas, `#FFF8FA` panels, `#FCEAF0` surfaces, `#EBD5DD` borders, `#C85A7C` accent) |

---

## Fitur & Implementasi Algoritma

### 1. Tone & Color (Operasi Titik & Histogram)
- **Grayscale:** Luminance standar ITU-R BT.601 ($Y = 0.299R + 0.587G + 0.114B$), Average, dan Lightness.
- **Brightness:** Penyesuaian linear dengan aritmatika 16-bit (`int16`) dan `clip(0, 255)` untuk mencegah *overflow wrap-around*.
- **Negative:** Inversi intensitas $(255 - I)$ dengan pelestarian kanal Alpha.
- **Thresholding:** Binary, Binary Inverse, Truncate, To Zero, serta **Otsu Automatic Thresholding** berbasis perhitungan *between-class variance* (`float64`) yang mengembalikan nilai ambang optimal $T$ ke antarmuka.
- **Histogram Equalization:**
  - *Global Equalization:* Konversi manual ke ruang warna YCrCb (BT.601), perataan CDF khusus kanal $Y$ agar rona warna tidak bergeser, dan guard untuk citra satu warna solid.
  - *CLAHE (Adaptive):* Pembagian grid tile $N \times N$, *clip limit* & redistribusi histogram per tile, serta interpolasi bilinear antarpusat tile.

### 2. Blur & Filter Spasial (`core_conv.py` & `ops_blur.py`)
- **Engine Konvolusi 2D Manual:** Mendukung citra 2D dan 3D dengan *reflect padding*, mengembalikan `float64` tanpa *clipping* internal agar operasi gradien tetap presisi.
- **Gaussian Blur (Separable 1D):** Dioptimalkan menjadi dua pass 1D (horizontal lalu vertikal) dengan kompleksitas $O(2K)$ alih-alih $O(K^2)$, mendukung auto-sigma standar.
- **Averaging Blur:** Kernel box seragam $1 / (k \times k)$.
- **Median Blur (Strip-Processing):** Menggunakan `sliding_window_view` dengan pemrosesan per blok baris agar penggunaan memori tetap efisien pada citra resolusi tinggi dan kernel besar hingga $31 \times 31$.
- **Bilateral Filter:** Penghalusan *edge-preserving* terpublikasi vektor dengan pembobotan kedekatan spasial ($\sigma_s$) dan selisih intensitas warna ($\sigma_c$).
- **Standard Filter 2D:** Editor matriks kustom interaktif berukuran $3 \times 3$ dan $5 \times 5$ lengkap dengan preset, *auto-normalize*, serta proteksi pembagian nol.

### 3. Detail Enhancement & Deteksi Tepi (`ops_detail.py`)
- **Sharpening:** Kernel Standard, Kernel Strong, dan **Unsharp Masking** ($I_{\text{out}} = I + \alpha \cdot (I - G_\sigma(I))$).
- **Sobel Operator:** Konvolusi gradien orde 1 ukuran $3 \times 3$ dan $5 \times 5$ untuk arah `X`, `Y`, atau `Magnitude` ($\sqrt{G_x^2 + G_y^2}$).
- **Prewitt Operator:** Operator diferensial gradien dengan bobot seragam $\pm 1$.
- **Laplacian:** Turunan kedua isotropik (4-tetangga) dengan opsi *Pre-Gaussian Smoothing* (LoG).
- **Canny Edge Detection (5 Tahap Murni):** Gaussian Smoothing ($5 \times 5, \sigma=1.4$) $\rightarrow$ Sobel Gradient & Angle $\rightarrow$ *Vectorized Non-Maximum Suppression* 4 arah $\rightarrow$ Double Thresholding $\rightarrow$ *Edge Tracking by Hysteresis* menggunakan antrean BFS (`collections.deque`).
- **Pencil Sketch:** Inversi $\rightarrow$ Gaussian Blur $\rightarrow$ *Color Dodge* dengan guard penyebut minimal `1.0`.

### 4. Geometri, Transparansi, & Workstation
- **Mirroring:** Pencerminan `None`, `Horizontal`, `Vertical`, dan `Both` via NumPy slicing dengan `np.ascontiguousarray` agar aman saat kompresi ekspor.
- **Alpha Channel Preservation:** Seluruh operasi mengisolasi dan memulihkan kanal Alpha (`split_alpha` & `merge_alpha`) sehingga gambar PNG transparan tetap mempertahankan transparansinya.
- **Inspeksi Visual & History:** Mode tampilan `Single`, `Side-by-Side`, dan `Split-Slider`; grafik histogram 256-bin (`RGB` / `Luma`, `Current` / `Original`, unduh PNG) dengan statistik `MIN`, `MAX`, `MEAN`, `STD`; *history stack* non-destruktif (`Undo`, `Redo`, `Reset`); serta ekspor `PNG`, `JPEG` (slider kualitas), dan `BMP`.

### 5. Input Kamera (Webcam)
- **Mode Snapshot to Workspace:** Mengambil foto beresolusi penuh dari webcam (dengan opsi *Mirror* dan pemilihan perangkat kamera), langsung mengunggahnya ke sesi standar agar dapat diolah lengkap dengan histogram, history, dan ekspor, serta otomatis mematikan stream kamera setelah pengambilan gambar.
- **Mode Live Real-Time Processing (Stateless):** Mengaktifkan preview filter secara langsung pada feed webcam melalui endpoint stateless `POST /api/images/process-frame` tanpa membuat sesi, tanpa mengisi *history stack*, dan tanpa menghitung histogram per frame. Dilengkapi pilihan batas resolusi (`320px`, `480px`, `640px`, `1080p`), *throttling* (~15 FPS cap), *busy guard* (maksimal 1 request *in-flight*), serta pembacaan `FPS` dan `ms/frame` pada status bar.

---

## Panduan Menjalankan Aplikasi

### Prasyarat
- Python 3.11+ (direkomendasikan Python 3.12)
- Node.js v18+ (direkomendasikan Node.js v20/v22) & npm

### 1. Menjalankan Backend (FastAPI)

```bash
cd backend

# Buat dan aktifkan virtual environment (opsional, disarankan)
python -m venv .venv
# Windows PowerShell:
.venv\Scripts\Activate.ps1

# Install dependensi
pip install -r requirements.txt

# Jalankan server Uvicorn
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Endpoint utama backend:
- API Base URL: `http://127.0.0.1:8000`
- Dokumentasi Interaktif (Swagger UI): `http://127.0.0.1:8000/api/docs`
- Health Check: `http://127.0.0.1:8000/api/health`

### 2. Menjalankan Frontend (Vite + React)

```bash
# Pada terminal terpisah
cd frontend

# Install dependensi
npm install

# Jalankan dev server
npm run dev
```

Frontend berjalan di `http://localhost:3000`. Seluruh request ke `/api/*` otomatis diteruskan oleh proxy Vite ke `http://127.0.0.1:8000`.

---

## Pengujian & Quality Gate

### Backend (Pytest & Ruff)

```bash
cd backend

# Linter kode backend
python -m ruff check app tests

# Menjalankan seluruh unit & integration tests (131 tests)
python -m pytest tests -v
```

### Frontend (TypeScript, Oxlint, & Build)

```bash
cd frontend

# Pengecekan tipe TypeScript (Strict Mode)
npx tsc --noEmit

# Linter kode frontend
npm run lint

# Kompilasi production build
npm run build
```

---

## Struktur Direktori Proyek

```text
Projek Akhir PC/
├── README.md
├── .gitignore
├── docs/
│   └── prd_aplikasi_web_pengolahan_citra_digital.md
├── UI/
│   └── uiux.webp
├── backend/
│   ├── pyproject.toml
│   ├── requirements.txt
│   ├── app/
│   │   ├── main.py                  # Entrypoint FastAPI, CORS & exception handler
│   │   ├── core/
│   │   │   ├── config.py            # Konfigurasi batas file, preview, history & live frame
│   │   │   ├── exceptions.py        # Hirarki domain exception (AppError)
│   │   │   └── logging.py           # Structured logging
│   │   ├── routers/
│   │   │   ├── images.py            # /api/images (upload, process, process-frame, history, export)
│   │   │   └── samples.py           # /api/samples
│   │   ├── samples/
│   │   │   └── generator.py         # Generator 3 gambar sampel benchmark
│   │   └── services/
│   │       ├── core_conv.py         # Engine konvolusi 2D/separable & konversi warna BT.601
│   │       ├── registry.py          # Operation Registry Pattern & validasi parameter
│   │       ├── alpha_utils.py       # Isolasi & pelestarian kanal Alpha PNG
│   │       ├── ops_point.py         # Grayscale, Brightness, Negative, Threshold, Otsu, Equalize, CLAHE
│   │       ├── ops_blur.py          # Gaussian, Averaging, Median, Bilateral, Standard Filter 2D
│   │       ├── ops_detail.py        # Sharpening, Sobel, Prewitt, Laplacian, Canny 5-stage, Sketch
│   │       ├── ops_geometry.py      # Mirroring (Horizontal, Vertical, Both)
│   │       ├── histogram.py         # Kalkulasi histogram 256-bin & statistik piksel
│   │       └── session_manager.py   # Validasi magic bytes, history stack, downscale, export
│   └── tests/                       # 131 unit & integration tests Pytest
│       ├── conftest.py
│       ├── test_histogram.py
│       ├── test_live_frame.py
│       ├── test_ops_blur.py
│       ├── test_ops_detail.py
│       ├── test_ops_geometry.py
│       ├── test_ops_point.py
│       ├── test_registry_api.py
│       └── test_session.py
└── frontend/
    ├── index.html
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts               # Konfigurasi Vite (port 3000) & proxy /api -> :8000
    ├── tailwind.config.js           # Palet Light Pastel Pink (Soft Blush)
    └── src/
        ├── main.tsx                 # Root render dengan ErrorBoundary
        ├── App.tsx                  # Layout 3-panel, kamera & keyboard shortcuts
        ├── index.css                # Styling global, dot-grid canvas & checkerboard PNG
        ├── types/
        │   └── operations.ts        # Discriminated union types kontrak API
        ├── constants/
        │   └── operations.ts        # Metadata operasi, nilai default & preset matriks
        ├── services/
        │   └── api.ts               # HTTP client, error mapper & processLiveFrame
        ├── hooks/
        │   ├── useImageWorkspace.ts # Manajemen state sesi, viewport & history
        │   ├── useDebouncedPreview.ts # Live preview debounce 180ms + AbortController
        │   └── useWebcam.ts         # Siklus hidup webcam, snapshot & live filter loop
        └── components/
            ├── layout/
            │   ├── TopBar.tsx       # Open Image, Use Camera, metadata, view mode, zoom & export
            │   ├── LeftSidebar.tsx  # Daftar kategori & 17 operasi citra
            │   ├── CenterStage.tsx  # Viewport kanvas (Single/Side-by-Side/Split) & Camera Mode
            │   └── RightInspector.tsx # Histogram, parameter kontrol dinamis & history stack
            ├── controls/
            │   ├── ToneColorControls.tsx
            │   ├── BlurControls.tsx
            │   ├── DetailControls.tsx
            │   └── GeometryControls.tsx
            ├── modals/
            │   └── ExportModal.tsx
            └── common/
                ├── ErrorBoundary.tsx
                └── ToastError.tsx
```

---

## Troubleshooting

- **Port 8000 atau 3000 sudah digunakan:** Jalankan backend di port alternatif (misalnya `--port 8001`) lalu perbarui target proxy di `frontend/vite.config.ts`.
- **Upload ditolak (`INVALID_FILE`):** Backend memvalidasi *magic bytes* file secara langsung, bukan ekstensi nama. Pastikan berkas benar-benar berformat gambar valid (JPEG, PNG, BMP, atau WebP).
- **Kamera tidak dapat diakses di browser:** API `navigator.mediaDevices.getUserMedia` hanya diizinkan oleh browser pada origin `http://localhost` atau `https://`. Pastikan izin kamera di browser tidak diblokir dan webcam tidak sedang dipakai oleh aplikasi lain.
- **FPS rendah saat Live Filter pada resolusi 1080p:** Filter komputasi berat (*Bilateral*, *Median*, atau *Canny*) di atas Pure NumPy membutuhkan waktu pemrosesan lebih lama per frame pada `1080p`. *Busy guard* secara otomatis mencegah antrean request menumpuk; turunkan pemilih resolusi di bar kamera ke `480px` atau `320px` untuk responsivitas tinggi.
