# PCD Studio — Aplikasi Web Pengolahan Citra Digital

Aplikasi workstation interaktif pengolahan citra digital berbasis web untuk demonstrasi, eksperimen, dan pengujian algoritma citra dengan perbandingan visual *real-time* (Single, Side-by-Side, dan Split-Slider), grafik histogram multi-kanal, statistik intensitas piksel, serta manajemen *history stack* non-destruktif (*Undo*, *Redo*, *Reset*).

---

## 🚀 Panduan Menjalankan Aplikasi

### Prasyarat
- Python 3.11+ (direkomendasikan Python 3.12)
- Node.js v18+ (direkomendasikan Node.js v20/v22) & npm

---

### 1. Menjalankan Backend (FastAPI)
```bash
# Pindah ke direktori backend
cd backend

# Buat virtual environment (opsional namun disarankan)
python -m venv .venv
# Aktivasi di Windows PowerShell:
.venv\Scripts\Activate.ps1

# Install dependensi
pip install -r requirements.txt

# Jalankan server FastAPI dengan Uvicorn
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
Backend akan aktif di:
- **API Server:** `http://127.0.0.1:8000`
- **Swagger UI Interactive Docs:** `http://127.0.0.1:8000/api/docs`
- **Health Check Endpoint:** `http://127.0.0.1:8000/api/health`

---

### 2. Menjalankan Frontend (Vite + React)
```bash
# Buka terminal baru dan pindah ke direktori frontend
cd frontend

# Install dependensi frontend
npm install

# Jalankan dev server Vite
npm run dev
```
Frontend akan aktif di: `http://localhost:3000` (atau port yang dialokasikan Vite). Permintaan ke `/api/*` secara otomatis diproxy ke backend `http://127.0.0.1:8000`.

---

## 🧪 Pengujian & Quality Gate

### Backend Tests & Linting
```bash
cd backend

# Menjalankan linter Ruff
python -m ruff check app tests

# Menjalankan seluruh test suite Pytest (124 unit & integration tests)
python -m pytest tests -v
```

### Frontend Typecheck, Linting & Build
```bash
cd frontend

# Typecheck TypeScript (Strict Mode)
npx tsc --noEmit

# Linting kode frontend
npm run lint

# Kompilasi Production Build
npm run build
```

---

## 📂 Peta Struktur Folder Proyek

```
Projek Akhir PC/
├── README.md                                  # Dokumentasi utama proyek
├── docs/
│   └── prd_aplikasi_web_pengolahan_citra_digital.md  # Single Source of Truth (PRD)
├── ui/
│   └── uiux.webp                              # Aset referensi visual workstation
├── backend/                                   # Arsitektur backend FastAPI & OpenCV
│   ├── pyproject.toml                         # Konfigurasi Ruff & Pytest
│   ├── requirements.txt                       # Dependensi Python
│   ├── app/
│   │   ├── main.py                            # Entrypoint FastAPI, CORS & Error Handler
│   │   ├── core/
│   │   │   ├── config.py                      # Batasan file (10MB), TTL (1800s), history
│   │   │   ├── exceptions.py                  # Domain exception (AppError hierarchy)
│   │   │   └── logging.py                     # Structured logger (session, op, latency)
│   │   ├── services/
│   │   │   ├── registry.py                    # Operation Registry Pattern
│   │   │   ├── alpha_utils.py                 # Isolasi & preservasi kanal Alpha PNG
│   │   │   ├── ops_point.py                   # Grayscale, Brightness, Negative, Threshold, Equalize
│   │   │   ├── ops_blur.py                    # Gaussian, Averaging, Median, Bilateral, Filter 2D
│   │   │   ├── ops_detail.py                  # Sharpening, Sobel, Prewitt, Laplacian, Canny, Sketch
│   │   │   ├── ops_geometry.py                # Mirroring (Horizontal, Vertical, Both)
│   │   │   ├── histogram.py                   # Kalkulasi 256-bin histogram & statistik
│   │   │   └── session_manager.py             # Magic byte, history stack, export handler
│   │   ├── routers/
│   │   │   ├── images.py                      # Endpoints /api/images (upload, process, history, export)
│   │   │   └── samples.py                     # Endpoints /api/samples
│   │   └── samples/
│   │       └── generator.py                   # Generator 3 gambar sampel demo bawaan
│   └── tests/                                 # 124 Unit & Integration Tests Pytest
└── frontend/                                  # Arsitektur workstation React + TypeScript
    ├── index.html
    ├── vite.config.ts                         # Konfigurasi Vite & proxy backend
    ├── tailwind.config.js                     # Palet dark workstation (#111315, #181A1F, #2A2D34)
    ├── src/
    │   ├── main.tsx                           # Root render dengan ErrorBoundary
    │   ├── App.tsx                            # Layout 3-Panel workstation & keyboard shortcuts
    │   ├── types/
    │   │   └── operations.ts                  # Discriminated union types operasi citra
    │   ├── constants/
    │   │   └── operations.ts                  # Metadata, rentang slider, dan matriks preset
    │   ├── services/
    │   │   └── api.ts                         # HTTP fetch client & domain error mapper
    │   ├── hooks/
    │   │   ├── useImageWorkspace.ts           # State machine workspace, viewport & history
    │   │   └── useDebouncedPreview.ts         # Live preview debounce 180ms + AbortController
    │   └── components/
    │       ├── layout/
    │       │   ├── TopBar.tsx                 # Header navigasi, metadata, view mode, zoom & actions
    │       │   ├── LeftSidebar.tsx            # Daftar kategori & 17 filter pengolahan citra
    │       │   ├── CenterStage.tsx            # Kanvas Single / Side-by-Side / Split-Slider + Drag-Drop
    │       │   └── RightInspector.tsx         # Histogram multi-kanal, parameter kontrol, history stack
    │       ├── controls/
    │       │   ├── ToneColorControls.tsx      # Kontrol Grayscale, Brightness, Threshold, Equalize
    │       │   ├── BlurControls.tsx           # Kontrol Gaussian, Box, Median, Bilateral, Matriks Filter 2D
    │       │   ├── DetailControls.tsx         # Kontrol Sharpening, Sobel, Canny, Pencil Sketch
    │       │   └── GeometryControls.tsx       # Kontrol Mirroring
    │       ├── modals/
    │       │   └── ExportModal.tsx            # Dialog simpan file (PNG, JPEG + slider quality, BMP)
    │       └── common/
    │           ├── ErrorBoundary.tsx          # React error boundary fallback
    │           └── ToastError.tsx             # Toast notifikasi error terstruktur
```

---

## 🛠️ Fitur Utama & Kepatuhan Algoritma PCD

1. **Anti-Overflow Brightness Clamping:** Operasi kecerahan menggunakan tipe data 16-bit dengan fungsi `clip(0, 255)` untuk mencegah artefak *wrap-around*.
2. **Kanal Transparansi Alpha Terjaga:** Operasi negatif, grayscale, dan blur mengisolasi kanal Alpha sehingga gambar PNG transparan tidak menjadi berlatar hitam.
3. **Equalization Bebas Color Shift:** Equalization citra berwarna dilakukan secara eksklusif pada kanal luminansi $Y$ dalam ruang warna YCrCb sebelum dikembalikan ke RGB.
4. **Sketch dengan Guard Pembagi:** Efek pensil *Color Dodge* membatasi penyebut minimal 1 (`max(1, 255 - I_blur)`) agar tidak memicu pembagian dengan nol pada area putih.
5. **Standard Filter 2D Kustom:** Mendukung editor matriks bobot $3\times3$ dan $5\times5$ dengan fitur *Auto-Normalize* dan pencegahan pembagian dengan nol jika total bobot matriks bernilai $0$.
6. **Otsu Automatic Thresholding:** Segmentasi otomatis menghitung nilai $T$ optimal berdasarkan varians intra-kelas dan menampilkan nilai $T$ hasil perhitungan secara transparan kepada pengguna.
7. **Deteksi Tepi Lengkap:** Sobel (arah X, Y, atau gabungan), Prewitt, Laplacian (dengan filter LoG), dan Canny (dengan validasi $T_{low} \le T_{high}$).
8. **Split-Slider Interaktif:** Pengguna dapat menggeser garis vertikal pembanding pada kanvas untuk menginspeksi citra sebelum dan sesudah diproses secara instan.

---

## ❓ Panduan Troubleshooting Singkat

- **Port 8000 atau 3000 sudah terpakai:**
  Jalankan backend di port lain, misalnya `uvicorn app.main:app --port 8001`, lalu sesuaikan target proxy di `frontend/vite.config.ts`.
- **Upload File Ditolak (Error `INVALID_FILE`):**
  Backend memvalidasi *magic bytes* biner file (bukan hanya ekstensi nama). Pastikan file yang diunggah adalah file gambar asli (JPEG, PNG, BMP, atau WebP), bukan file format lain (seperti PDF atau TXT) yang diubah ekstensinya.
- **Koneksi Frontend ke Backend Gagal:**
  Pastikan backend FastAPI sudah berjalan di terminal terpisah sebelum membuka frontend di browser. Uji endpoint `http://127.0.0.1:8000/api/health` di browser.
- **Jeda pada Perubahan Parameter:**
  Slider menerapkan *debounce* 180ms dan `AbortController` untuk membatalkan kalkulasi lama saat slider digeser cepat, menjaga UI tetap responsif.
