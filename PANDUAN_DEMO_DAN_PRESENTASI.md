# Panduan Demo & Naskah Presentasi Proyek Akhir PCD Studio
**Aplikasi Web Pengolahan Citra Digital (Pure NumPy / From-Scratch Implementation)**

Dokumen ini disusun sebagai panduan lengkap demo aplikasi dan presentasi untuk kelompok beranggotakan **4 orang**. Setiap anggota memiliki pembagian materi yang proporsional, alur demo UI yang jelas, penjelasan sebab-akibat matematis kode (*white-box* NumPy), serta antisipasi pertanyaan dosen (tanya-jawab teknis).

---

## 📋 Ringkasan Pembagian Tugas & Waktu (Total ~12–15 Menit)

| Anggota | Topik Utama | Metode / Fitur yang Didemokan | Estimasi Waktu |
| :--- | :--- | :--- | :---: |
| **Speaker 1** | **Arsitektur Sistem, UI Canvas, & Operasi Titik / Warna** | - Arsitektur Web & Filosofi Pure NumPy<br>- UI 3-Panel, Histogram multi-kanal & Statistik<br>- Grayscale (BT.601, Avg, Lightness)<br>- Brightness & Negative<br>- Thresholding (Manual & Otsu)<br>- Equalization (Global CDF & CLAHE) | 3.5 Menit |
| **Speaker 2** | **Engine Konvolusi, Filter Spasial, & Penghalusan (Blur)** | - Engine Konvolusi 2D Manual (`core_conv.py`)<br>- Averaging Blur (Box Filter)<br>- Gaussian Blur & Optimasi Separable 1D<br>- Median Blur (Non-linear & Strip Processing)<br>- Bilateral Filter (Edge-Preserving)<br>- Custom Matrix 3x3 / 5x5 (Standard Filter 2D) | 3.5 Menit |
| **Speaker 3** | **Penajaman (Sharpening) & Deteksi Tepi Orde 1 & 2** | - Konsep Turunan Citra Digital (Gradient vs Laplacian)<br>- Sharpening (Standard, Strong, Unsharp Masking)<br>- Deteksi Tepi: Sobel ($G_x, G_y, \text{Magnitudo}$)<br>- Deteksi Tepi: Prewitt<br>- Deteksi Tepi: Laplacian & LoG (Pre-Gaussian)<br>- Efek Artistik: Pencil Sketch (Color Dodge) | 3.0 Menit |
| **Speaker 4** | **Canny Edge 5-Tahap, Geometri, Alpha Preservation, & QA** | - Bedah Algoritma Canny 5-Tahap From-Scratch (NMS & Hysteresis BFS)<br>- Mirroring (Slicing Memory Contiguous)<br>- Arsitektur Pelestarian Kanal Alpha (PNG Transparan)<br>- Undo/Redo/Reset, Split-Slider & Ekspor Multi-Format<br>- Quality Gate: 124 Pytest Lulus, 0 OpenCV di Processing | 3.5 Menit |

---

## 🧑‍💻 Detail Pembagian Materi, Aksi Demo, & Naskah Presentasi

---

### SPEKER 1: Arsitektur Sistem, Workstation Canvas, & Operasi Titik / Warna

#### 1. Fokus Materi & Konsep Matematis
1. **Filosofi From-Scratch**: Tidak memakai library *black-box* seperti `cv2.cvtColor`, `cv2.threshold`, atau `cv2.equalizeHist`. Seluruh manipulasi piksel dihitung langsung di atas matriks NumPy berbasis rumus ilmiah citra digital. OpenCV hanya digunakan pada layer batas (I/O) untuk membaca bytes gambar (`cv2.imdecode`) dan mengekspor file (`cv2.imencode`).
2. **Grayscale**:
   - **Luminance ITU-R BT.601**: $Y = 0.299R + 0.587G + 0.114B$ (memperhitungkan sensitivitas mata manusia yang paling peka pada cahaya hijau).
   - **Average**: $Y = (R + G + B) / 3$.
   - **Lightness**: $Y = (\max(R,G,B) + \min(R,G,B)) / 2$.
3. **Brightness & Negative**:
   - Brightness: $O = \text{clip}(I + \beta, 0, 255)$ menggunakan tipe data `int16` agar tidak terjadi *wrap-around* / *overflow* modulo 256.
   - Negative: $O = 255 - I$.
4. **Thresholding & Otsu**:
   - Biner manual: $O = 255 \text{ jika } I > T \text{ else } 0$.
   - **Otsu Thresholding**: Mencari ambang optimal $T^*$ yang memaksimalkan varians antar-kelas (*between-class variance*):[text](PANDUAN_DEMO_DAN_PRESENTASI.md)
     $$\sigma_b^2(T) = \omega_0(T) \cdot \omega_1(T) \cdot (\mu_0(T) - \mu_1(T))^2$$
     Dihitung via histogram probabilitas `float64` tanpa fungsi bawaan OpenCV.
5. **Histogram Equalization**:
   - **Global CDF**: Meratakan distribusi derajat keabuan melalui fungsi kumulatif:
     $$s_k = \text{round}\left(\frac{\text{CDF}(k) - \text{CDF}_{\min}}{N - \text{CDF}_{\min}} \times 255\right)$$
     Pada citra berwarna, konversi dilakukan ke ruang warna $Y\text{CrCb}$ manual; perataan hanya diterapkan pada kanal $Y$ (luminance) agar rona warna (*chrominance*) tidak rusak.
   - **CLAHE**: Membagi citra ke dalam tile $8\times 8$, memotong histogram pada *clip limit*, meredistribusikan piksel terpotong secara merata, lalu menghitung interpolasi bilinear antar tile-center.

#### 2. Skenario Aksi Demo (Layar Proyektor)
1. Buka browser pada aplikasi PCD Studio (`http://localhost:5173`).
2. Tunjukkan keadaan awal kanvas (Empty State) dengan dot-grid pastel pink, tombol **Open Image**, dan 3 tombol sampel gambar.
3. Klik sampel gambar **Low Contrast**.
4. Arahkan kursor ke panel kanan atas: tunjukkan histogram dan 4 indikator statistik tabular (`MIN`, `MAX`, `MEAN`, `STD`).
5. Pada menu kiri, pilih **TONE & COLOR** $\rightarrow$ **Grayscale** $\rightarrow$ ganti metode dari *Luminance* ke *Average* lalu *Lightness*. Tunjukkan perubahan nilai histogram secara *real-time*.
6. Pilih **Brightness**, geser slider $\beta = +50$, lalu klik **Apply**. Tunjukkan histogram bergeser ke kanan.
7. Pilih **Thresholding**, coba metode **Otsu**. Tunjukkan nilai ambang $T$ terhitung otomatis (misal $T=110$).
8. Pilih **Histogram Equalization**, pilih **Global**, lalu ganti ke **CLAHE**. Tunjukkan kontras lokal meningkat tanpa memunculkan *blocking artifacts*.

#### 3. Naskah Bicara (Script)
> *"Selamat pagi/siang Bapak Dosen dan rekan-rekan sekalian. Pada hari ini kelompok kami mempresentasikan proyek akhir Pengolahan Citra Digital, yaitu **PCD Studio**.*
>
> *Sesuai dengan instruksi, seluruh fitur pemrosesan citra di aplikasi ini kami bangun **murni dari nol (pure NumPy / from-scratch)** tanpa menggunakan fungsi black-box OpenCV. OpenCV kami isolasi hanya untuk membaca stream byte citra saat upload dan encode saat ekspor file. Di luar itu, seluruh kalkulasi piksel murni logika matematika kami sendiri.*
>
> *Sebagai pembuka, saya mendemonstrasikan workstation dan kelompok operasi titik (Point Operations). Ketika citra dimuat, sistem langsung menghitung distribusi derajat keabuan menggunakan `np.bincount` untuk menghasilkan histogram 256 bin dan statistik real-time: Nilai Minimum, Maksimum, Rata-rata, dan Standar Deviasi.*
>
> *Pada operasi Grayscale, kami mengimplementasikan 3 rumus standar. Pertama, Luminance standar ITU-R BT.601: $0.299R + 0.587G + 0.114B$. Mengapa bobot Green paling besar yaitu 0.587? Karena reseptor kerucut mata manusia paling sensitif terhadap spektrum cahaya hijau. Kedua, metode Average rata-rata aritmatika, dan ketiga Lightness rata-rata nilai ekstrem.*
>
> *Selanjutnya pada Brightness, kode kami meng-cast array ke `int16` sebelum dijumlahkan dengan bias $\beta$, lalu di-`clip(0, 255)`. Ini krusial agar tidak terjadi overflow atau efek solarisasi jika menggunakan `uint8` bawaan.*
>
> *Pada Thresholding Otsu, program kami mengiterasi 256 level ambang untuk mencari nilai T yang menghasilkan varians antar-kelas terbesar secara otomatis, sehingga objek terpisah dari latar belakang tanpa perlu tebak-tebak angka slider.*
>
> *Terakhir, untuk Histogram Equalization citra berwarna, jika kita meratakan kanal R, G, dan B secara terpisah, warna gambar akan rusak drastis. Solusinya, citra kami ubah secara manual ke ruang warna YCrCb menggunakan perkalian matriks BT.601, lalu kami ratakan kanal Y saja menggunakan fungsi kumulatif CDF, dan dikembalikan ke BGR. Hasilnya, kontras meningkat drastis namun warna asli gambar tetap natural.*
>
> *Selanjutnya, rekan saya [Nama Speaker 2] akan menjelaskan engine konvolusi spasial dan filter penghalusan citra."*

---

### SPEAKER 2: Engine Konvolusi, Filter Spasial, & Penghalusan (Blur)

#### 1. Fokus Materi & Konsep Matematis
1. **Engine Konvolusi 2D Manual (`core_conv.py`)**:
   - Rumus matematis konvolusi diskrit 2D:
     $$O(y, x) = \sum_{i=-r}^{r} \sum_{j=-r}^{r} I(y - i, x - j) \cdot K(i, j)$$
   - Menggunakan *reflect padding* (`np.pad(..., mode="reflect")`) agar batas tepi citra tidak menghasilkan garis hitam (seperti pada *zero padding*).
   - Array kernel dibalik 180° (`kernel[::-1, ::-1]`) sesuai definisi konvolusi formal (bukan korelasi silang).
   - Menghasilkan `float64` tanpa *clipping* di dalam engine agar operasi turunan/gradien yang membutuhkan nilai negatif tetap presisi.
2. **Averaging / Box Blur**:
   - Kernel seragam berbobot $1 / (k \times k)$ di mana semua elemen bernilai sama.
3. **Gaussian Blur & Optimasi Separable 1D**:
   - Fungsi kurva lonceng Gauss 2D:
     $$G(x, y) = \frac{1}{2\pi\sigma^2} \exp\left(-\frac{x^2 + y^2}{2\sigma^2}\right)$$
   - Jika $\sigma \le 0$, digunakan auto-sigma standar: $\sigma = 0.3 \cdot ((k - 1) \cdot 0.5 - 1) + 0.8$.
   - **Terobosan Separable Convolution**: Karena fungsi Gauss bersifat separabel ($e^{-(x^2+y^2)} = e^{-x^2} \cdot e^{-y^2}$), konvolusi 2D ukuran $K \times K$ dipecah menjadi dua tahap konvolusi 1D: pass horizontal (panjang $K$) lalu pass vertikal (panjang $K$).
   - **Dampak Performa**: Kompleksitas terpangkas dari $O(K^2)$ menjadi $O(2K)$. Pada citra resolusi tinggi 4 MP dengan kernel $31\times 31$, waktu eksekusi terpangkas dari **77.2 detik menjadi 3.1 detik** (~24x lebih cepat!).
4. **Median Blur (Filter Non-Linear)**:
   - Mengambil nilai median (tengah) dari jendela tetangga $k \times k$ setelah diurutkan.
   - Sangat unggul menghilangkan derau bintik (*Salt-and-Pepper noise*) tanpa mengaburkan tepi objek secara berlebihan.
   - **Strip-Processing Memory Optimization**: Pada citra 4 MP dengan kernel besar, `sliding_window_view` membutuhkan hingga 7.4 GB RAM jika dievaluasi sekaligus. Kami menerapkan *strip processing* per blok baris sehingga pemakaian RAM stabil di bawah **80 MB** (hemat 99% RAM).
5. **Bilateral Filter (Edge-Preserving Smoothing)**:
   - Menggabungkan dua fungsi pembobotan Gauss: bobot kedekatan spasial (*domain filter*) dan bobot kemiripan intensitas warna (*range filter*):
     $$w(i, j) = \exp\left(-\frac{\Delta x^2 + \Delta y^2}{2\sigma_s^2}\right) \times \exp\left(-\frac{\|I(x, y) - I(x+j, y+i)\|^2}{2\sigma_c^2}\right)$$
   - Piksel tetangga yang berbeda warna jauh (tepi objek) diberi bobot mendekati 0, sehingga area rata dihaluskan tetapi garis tepi tetap tajam.
6. **Standard Filter 2D**:
   - Editor matriks interaktif 3x3 dan 5x5 di UI dengan fitur auto-normalisasi bobot.

#### 2. Skenario Aksi Demo (Layar Proyektor)
1. Klik tombol sampel gambar **Salt & Pepper**.
2. Pilih menu **BLUR FILTERS** $\rightarrow$ **Averaging Blur** ($k=5$). Tunjukkan derau bintik hanya memudar menjadi bercak abu-abu kotor.
3. Klik **Reset** di top bar.
4. Pilih **Median Blur** ($k=5$). Klik **Apply**. Tunjukkan derau *salt & pepper* lenyap 100% dan gambar menjadi bersih.
5. Muat citra bertekstur/wajah (atau klik sampel Geometric).
6. Terapkan **Gaussian Blur** ($k=9$). Tunjukkan tepi ikut buram.
7. Klik Undo. Terapkan **Bilateral Filter** ($d=9, \sigma_{\text{color}}=75, \sigma_{\text{space}}=75$). Tunjukkan permukaan bidang menjadi mulus rata (*smooth*), tetapi garis tepi bentuk geometris tetap tajam (*edge-preserved*).
8. Buka **Standard Filter 2D**, ubah nilai matriks di UI inspector (misalnya masukkan kernel penajaman atau filter kustom), lalu klik **Apply** untuk menunjukkan fleksibilitas engine konvolusi.

#### 3. Naskah Bicara (Script)
> *"Terima kasih [Speaker 1]. Saya akan melanjutkan pada modul filter spasial dan engine konvolusi 2D.*
>
> *Di jantung pemrosesan spasial aplikasi ini, kami membangun fungsi `manual_convolve2d` di file `core_conv.py`. Konvolusi kami menggunakan reflect padding agar piksel di tepi gambar tidak menghitam, dan kernel dibalik 180 derajat sesuai teori konvolusi matematis.*
>
> *Salah satu masalah utama implementasi filter spasial di Python murni adalah performa pada citra besar. Untuk Gaussian Blur dengan kernel maksimal 31x31, konvolusi 2D konvensional membutuhkan 961 kali perkalian array per piksel. Kami melakukan optimasi cerdas dengan menerapkan **Separable Convolution**. Karena fungsi Gaussian bersifat separabel, kami memecahnya menjadi konvolusi 1D horizontal dilanjutkan 1D vertikal. Operasi berkurang drastis dari 961 menjadi hanya 31 + 31 = 62 operasi. Hasil benchmark kami membuktikan waktu proses citra 4 Megapixel turun dari 77 detik menjadi hanya 3,1 detik!*
>
> *Selanjutnya adalah filter non-linear, yaitu Median Blur. Berbeda dengan rata-rata, median filter tidak terpengaruh oleh nilai ekstrem. Di layar bisa kita lihat pada sampel derau Salt & Pepper: Averaging Blur gagal karena nilai 0 dan 255 ikut dirata-ratakan sehingga menghasilkan bercak buram. Namun Median Blur berhasil melenyapkan derau 100% karena nilai ekstrem otomatis tersingkir saat pengurutan elemen jendela.*
>
> *Untuk menjaga efisiensi RAM, kami mendesain algoritma **Strip-Processing**. Pada citra resolusi tinggi, alih-alih membuat array jendela 3.8 miliar elemen yang memakan 7.4 GB RAM, kami memproses citra per potongan baris, memangkas penggunaan memori hingga 99% menjadi hanya 78 MB.*
>
> *Terakhir, kami menghadirkan Bilateral Filter. Masalah Gaussian blur biasa adalah tepi objek ikut kabur. Bilateral filter memecahkan ini dengan mengalikan bobot jarak spasial dengan bobot selisih warna fotometrik. Jika ada perbedaan warna yang tajam (seperti tepi objek), bobotnya menjadi nol sehingga batas tepi tidak ikut diburamkan.*
>
> *Berikutnya, rekan saya [Nama Speaker 3] akan memaparkan penajaman citra dan deteksi tepi orde pertama dan kedua."*

---

### SPEAKER 3: Penajaman (Sharpening) & Deteksi Tepi Orde 1 & 2

#### 1. Fokus Materi & Konsep Matematis
1. **Konsep Dasar Turunan Citra Digital**:
   - Tepi (*edge*) adalah area pada citra di mana terjadi perubahan intensitas piksel secara mendadak / diskontinu.
   - **Turunan Pertama (Gradient)**: Menghasilkan nilai ekstrem lokal (puncak magnitudo) tepat pada tepi. Arah vektor gradien selalu tegak lurus terhadap arah garis tepi.
   - **Turunan Kedua (Laplacian)**: Menghasilkan persilangan nol (*zero-crossing*) tepat di tengah garis tepi, bersifat isotropik (bebas arah).
2. **Penajaman (Sharpening)**:
   - **Kernel Standard 3x3**:
     $$\begin{bmatrix} 0 & -1 & 0 \\ -1 & 5 & -1 \\ 0 & -1 & 0 \end{bmatrix}$$
     Meningkatkan kontras frekuensi tinggi dengan mengurangkan tetangga 4-arah dari piksel pusat.
   - **Kernel Strong 3x3**: Melibatkan tetangga diagonal (8-arah) dengan bobot pusat $+9$.
   - **Unsharp Masking**:
     $$I_{\text{sharp}} = I + \alpha \cdot (I - G_\sigma(I))$$
     Komponen detail frekuensi tinggi didapat dari selisih citra asli dengan citra Gaussian Blur-nya, lalu dikalikan faktor pengali $\alpha \in [0.0, 3.0]$.
3. **Operator Sobel (Gradien Orde 1)**:
   - Menggabungkan diferensiasi dengan penghalusan (smoothing) tegak lurus arah turunan untuk meredam derau:
     $$K_x = \begin{bmatrix} -1 & 0 & 1 \\ -2 & 0 & 2 \\ -1 & 0 & 1 \end{bmatrix}, \quad K_y = \begin{bmatrix} -1 & -2 & -1 \\ 0 & 0 & 0 \\ 1 & 2 & 1 \end{bmatrix}$$
   - Magnitudo gradien gabungan: $G = \sqrt{G_x^2 + G_y^2}$.
4. **Operator Prewitt**:
   - Mirip Sobel, namun tanpa pembobotan ekstra pada baris/kolom tengah (bobot seragam 1):
     $$K_x = \begin{bmatrix} -1 & 0 & 1 \\ -1 & 0 & 1 \\ -1 & 0 & 1 \end{bmatrix}, \quad K_y = \begin{bmatrix} -1 & -1 & -1 \\ 0 & 0 & 0 \\ 1 & 1 & 1 \end{bmatrix}$$
5. **Operator Laplacian & LoG (Orde 2)**:
   - Menghitung divergensi gradien menggunakan kernel 4-arah:
     $$K_{\text{Lap}} = \begin{bmatrix} 0 & 1 & 0 \\ 1 & -4 & 1 \\ 0 & 1 & 0 \end{bmatrix}$$
   - Karena turunan kedua sangat peka terhadap derau, disediakan opsi **Pre-Gaussian Smoothing** (Laplacian of Gaussian / LoG).
6. **Pencil Sketch (Color Dodge)**:
   - Inversi citra grayscale $\rightarrow$ Gaussian Blur kernel lebar ($k=21$) $\rightarrow$ *Color Dodge blending*:
     $$O(x, y) = \text{clip}\left(\frac{\text{Gray}(x, y) \times 255}{\max(1, 255 - \text{Blurred}(x, y))}, 0, 255\right)$$
   - Pembagian dijaga menggunakan $\max(1, \dots)$ untuk mencegah *division by zero* pada piksel putih solid.

#### 2. Skenario Aksi Demo (Layar Proyektor)
1. Muat sampel citra **Geometric Pattern**.
2. Pilih menu **DETAIL & EDGE** $\rightarrow$ **Sharpening** $\rightarrow$ pilih **Unsharp Mask**.
3. Geser slider $\alpha_{\text{strength}}$ dari 0.5 ke 2.5. Tunjukkan garis-garis batas tekstur menjadi semakin tegas dan kontras.
4. Pilih **Sobel Operator**.
   - Klik radio button **X-direction**: tunjukkan hanya garis tepi vertikal yang menyala terang.
   - Klik radio button **Y-direction**: tunjukkan hanya garis tepi horizontal yang menyala terang.
   - Klik **Combined**: tunjukkan seluruh kontur terdeteksi sempurna secara isotropik.
5. Bandingkan dengan **Prewitt Operator** dan **Laplacian Operator**.
6. Centang toggle **Pre-Gaussian Filter** pada Laplacian: tunjukkan derau bintik latar belakang langsung teredam bersih dan garis kontur utama tetap terisolasi.
7. Pilih menu **Pencil Sketch**: tunjukkan citra berubah menjadi sketsa pensil artistik berarsir halus secara instan.

#### 3. Naskah Bicara (Script)a
> *"Terima kasih [Speaker 2]. Saya akan memaparkan teknik penajaman citra dan deteksi tepi orde pertama dan kedua.*
>
> *Pada modul penajaman, kami menyediakan metode Kernel Matrix dan Unsharp Masking. Prinsip Unsharp Masking adalah: citra asli kita kurangkan dengan versi buramnya (Gaussian Blur). Hasil pengurangan ini murni memuat komponen frekuensi tinggi, yaitu tepi dan detail halus. Detail ini kemudian kita kalikan dengan faktor kekuatan alpha lalu kita tambahkan kembali ke citra asli. Hasilnya, foto terlihat jauh lebih tajam dan jernih tanpa artefak halo yang berlebihan.*
>
> *Beralih ke Deteksi Tepi, konsep matematisnya berakar pada kalkulus diferensial citra. Tepi adalah daerah di mana turunan pertama intensitas mencapai nilai maksimum lokal.*
>
> *Di sini kami mengimplementasikan dua operator gradien ternama: Sobel dan Prewitt. Pada operator Sobel, kernel horizontal $K_x$ mendeteksi perubahan intensitas kiri-ke-kanan, sehingga menonjolkan garis tepi vertikal. Sebaliknya kernel vertikal $K_y$ menonjolkan garis tepi horizontal. Kita bisa melihat di layar demo: ketika saya memilih arah X, garis horizontal menghilang dan hanya garis vertikal yang terdeteksi. Saat digabung dengan rumus magnitudo Euclidean $\sqrt{G_x^2 + G_y^2}$, seluruh kontur objek tertangkap.*
>
> *Sementara itu, operator Laplacian bekerja pada turunan kedua $\nabla^2 I$. Keunggulannya adalah sifatnya yang seragam ke segala arah (isotropik). Namun, turunan kedua memiliki kelemahan alami: sangat sensitif terhadap noise. Karena itu, kami melengkapinya dengan fitur Laplacian of Gaussian (LoG), di mana gambar dihaluskan terlebih dahulu dengan filter Gauss sebelum diturunkan, menghasilkan garis tepi yang bersih dari gangguan derau.*
>
> *Terakhir, kami juga mengimplementasikan efek Pencil Sketch berbasis Color Dodge matematis. Citra diinversi, diburamkan, lalu dibagi dengan pembagi yang diproteksi dari division by zero, menciptakan efek sketsa artistik seperti lukisan tangan.*
>
> *Selanjutnya, rekan saya [Nama Speaker 4] akan membedah algoritma tingkat lanjut Canny 5-Tahap, pelestarian transparansi alpha, dan pengujian kualitas sistem."*

---

### SPEAKER 4: Canny Edge 5-Tahap, Geometri, Alpha Preservation, & QA Integrity

#### 1. Fokus Materi & Konsep Matematis
1. **Bedah Canny Edge Detection (5-Stage Pure NumPy Algorithm)**:
   Merupakan standar emas (*gold standard*) deteksi tepi optimal (memenuhi kriteria Canny: deteksi baik, lokalisasi tepat, dan respon tunggal). Diimplementasikan tanpa `cv2.Canny`:
   - **Tahap 1 (Noise Smoothing)**: Filter Gaussian $5\times 5, \sigma=1.4$ manual.
   - **Tahap 2 (Gradient & Orientation)**: Konvolusi Sobel manual mencari magnitudo $M = \sqrt{G_x^2 + G_y^2}$ dan sudut $\theta = \arctan2(G_y, G_x) \pmod{180^\circ}$.
   - **Tahap 3 (Vectorized Non-Maximum Suppression / NMS)**:
     Kuantisasi sudut ke 4 sektor utama: $0^\circ, 45^\circ, 90^\circ, 135^\circ$.
     *Ketelitian Koordinat Citra*: Mengingat sumbu-$y$ citra mengarah ke bawah ($+y$ ke bawah, $+x$ ke kanan):
     - Arah $0^\circ$ (horizontal): bandingkan dengan tetangga kiri $(r, c-1)$ dan kanan $(r, c+1)$.
     - Arah $45^\circ$ (vektor down-right): bandingkan dengan up-left $(r-1, c-1)$ dan down-right $(r+1, c+1)$.
     - Arah $90^\circ$ (vertikal): bandingkan dengan atas $(r-1, c)$ dan bawah $(r+1, c)$.
     - Arah $135^\circ$ (vektor down-left): bandingkan dengan up-right $(r-1, c+1)$ dan down-left $(r+1, c-1)$.
     Piksel hanya dipertahankan jika nilainya merupakan nilai maksimum lokal di sepanjang arah gradien. Hasilnya: garis tepi tebal langsung menipis menjadi garis presisi selebar **1–2 piksel**.
   - **Tahap 4 (Double Thresholding)**:
     Mengklasifikasikan piksel menjadi tepi kuat (*strong edge* jika $M \ge T_{\text{high}}$), tepi lemah (*weak edge* jika $T_{\text{low}} \le M < T_{\text{high}}$), dan non-tepi ($M < T_{\text{low}}$).
   - **Tahap 5 (Edge Tracking by Hysteresis via BFS Queue)**:
     Tepi lemah hanya dipertahankan menjadi tepi sejati jika terhubung secara 8-konektivitas dengan tepi kuat. Diimplementasikan secara efisien menggunakan antrean `collections.deque` (Breadth-First Search) yang hanya menelusuri piksel tepi, bebas dari rekursi berat (*no recursion limit*).
2. **Operasi Geometri & Memory Contiguity**:
   - Pencerminan horizontal (`img[:, ::-1]`), vertikal (`img[::-1, :]`), dan keduanya (`img[::-1, ::-1]`).
   - Wajib dibungkus `np.ascontiguousarray(...)` untuk membalik *negative strides* memori NumPy agar tidak memicu error kompresi saat citra diekspor.
3. **Arsitektur Pelestarian Kanal Alpha (PNG Transparansi)**:
   - Modul `alpha_utils.py` mengisolasi kanal alpha sebelum pemrosesan (`split_alpha`) dan merekonstruksinya kembali setelah operasi selesai (`merge_alpha`).
   - Menjamin seluruh operasi (Grayscale, Thresholding, Edge Detection, Blur, Sharpening, Mirroring) **tidak pernah merusak transparansi citra PNG**.
4. **UX Workstation & Quality Gate**:
   - Split-slider interaktif sebelum/sesudah, Zoom kontrol, Multi-view (Single, Side-by-Side, Split).
   - Ekspor PNG, JPEG (dengan slider kualitas kompresi), dan BMP.
   - **Hasil Audit Kualitas**:
     - **124 dari 124 unit test pytest LULUS 100% (0 fail)**.
     - **0 panggilan OpenCV black-box** pada seluruh folder layanan.
     - Linter Ruff bersih (*clean code standard*).

#### 2. Skenario Aksi Demo (Layar Proyektor)
1. Unggah citra berformat **PNG Transparan** (misal logo atau karakter berlatar belakang transparan).
2. Tunjukkan pada Center Stage: latar belakang transparan dirender dengan pola *checkerboard* halus.
3. Terapkan operasi **Canny Edge Detection** ($T_{\text{low}}=50, T_{\text{high}}=150$).
4. Tunjukkan hasil tepi Canny yang sangat tajam selebar 1 piksel tanpa garis putus-putus atau bercak tebal, dan **kanal transparansi latar belakang tetap utuh transparan**.
5. Di Top Bar, ubah View Mode ke **Split**.
6. Geser garis slider pemisah ke kiri dan kanan untuk membandingkan foto asli vs hasil olah secara langsung.
7. Uji tombol **Undo** $\rightarrow$ gambar kembali ke tahap sebelumnya; lalu klik **Redo** $\rightarrow$ kembali ke hasil Canny.
8. Buka menu **GEOMETRY** $\rightarrow$ pilih **Mirror Horizontal** lalu **Mirror Both**.
9. Klik tombol **Save File** di sudut kanan atas:
   - Pilih format JPEG, geser slider Quality ke 80%, lalu klik **Download**.
   - Tunjukkan file terunduh dengan benar di komputer.
10. Buka terminal (jika diminta dosen) dan ketik:
    `python -m pytest tests/`
    Tunjukkan terminal hijau: `124 passed in 0.42s`.

#### 3. Naskah Bicara (Script)
> *"Terima kasih [Speaker 3]. Di bagian penutup ini, saya akan mendemonstrasikan algoritma paling komprehensif di aplikasi kami: **Canny Edge Detection 5-Tahap**, penanganan kanal transparansi, serta pengujian kualitas sistem.*
>
> *Banyak mahasiswa yang mengira deteksi tepi Canny cukup memanggil fungsi OpenCV. Di PCD Studio, kami membongkar dan membangun ke-5 tahap Canny murni dengan algoritma NumPy:*
> *Tahap 1, Gaussian smoothing meredam derau frekuensi tinggi.*
> *Tahap 2, kami menghitung gradien Sobel X dan Y beserta orientasi sudutnya.*
> *Tahap 3 adalah Non-Maximum Suppression secara tervektorisasi. Di sini kami sangat teliti: karena koordinat piksel layar bertambah ke bawah (+y), vektor sudut 45 derajat mengarah ke kanan-bawah. Kode kami membandingkan piksel dengan tetangga di sepanjang garis gradien dan menekan semua piksel yang bukan nilai puncak. Hasilnya, tepian yang tadinya tebal 8 piksel langsung dipangkas menjadi garis tunggal tajam setebal 1 piksel.*
> *Tahap 4, Double Thresholding mengklasifikasikan piksel tepi menjadi strong edge dan weak edge.*
> *Dan Tahap 5, kami menggunakan algoritma Breadth-First Search (BFS) dengan antrean `collections.deque` untuk melacak tepi lemah yang menyambung ke tepi kuat, sehingga garis tepi kontur tidak terputus-putus.*
>
> *Selain itu, kami juga memecahkan tantangan transparansi citra PNG. Pada library standar, gambar transparan sering kali berubah menjadi hitam pekat setelah difilter. Di aplikasi kami, modul `alpha_utils` memisahkan kanal alpha sebelum pemrosesan dan merekonstruksinya kembali setelah filter selesai. Dapat dilihat pada demo di layar: gambar logo PNG transparan ini setelah dikenakan filter Canny maupun Grayscale, latarnya tetap transparan sempurna.*
>
> *Pada operasi Geometri Mirroring, kami menerapkan `.ascontiguousarray()` pada slicing NumPy agar struktur memori citra tertata rapat dan tidak corrupt saat diunduh.*
>
> *Sebagai jaminan mutu rekayasa perangkat lunak, kami menjalankan pengujian ketat. Seluruh **124 unit test pytest lulus 100%** hanya dalam 0.42 detik, audit statis membuktikan tidak ada pemanggilan OpenCV di seluruh engine pemrosesan citra, dan kode lulus linter standar industri.*
>
> *Demikian presentasi dari kelompok kami. Kami siap menjawab pertanyaan dan mendiskusikan implementasi kode lebih mendalam bersama Bapak Dosen. Terima kasih."*

---

## 🎯 Tanya-Jawab Teknis (Antisipasi Pertanyaan Kritis Dosen)

Berikut adalah daftar pertanyaan mendalam yang sering diajukan dosen penguji citra digital beserta jawaban ilmiah dan letak kodenya:

---

### Tanya-Jawab untuk Speaker 1 (Point & Histogram)
**Tanya:** *"Mengapa pada Grayscale Luminance bobot Green paling besar (0.587), bukan rata-rata sepertiga (0.333)?"*
> **Jawab:** *"Secara biologis, retina mata manusia memiliki jumlah sel fotoreseptor kerucut (cone cells) tipe M yang peka terhadap panjang gelombang hijau jauh lebih banyak dibandingkan warna merah dan biru. Standar internasional ITU-R BT.601 merumuskan bobot $0.299R + 0.587G + 0.114B$ agar persepsi kecerahan citra monokrom yang dilihat manusia cocok dengan intensitas cahaya alami aslinya. Jika memakai rata-rata aritmatika murni $(R+G+B)/3$, objek berwarna hijau akan tampak terlalu gelap dan objek biru akan tampak terlalu terang."*
> *(File referensi: `backend/app/services/core_conv.py:86`)*

**Tanya:** *"Bagaimana cara kerja Otsu Thresholding Anda mencari nilai ambang optimal?"*
> **Jawab:** *"Kami menghitung histogram probabilitas piksel $p_i = \text{hist}[i] / N$. Lalu kami menguji seluruh kemungkinan nilai ambang $T$ dari 0 sampai 255. Untuk setiap $T$, piksel terbagi menjadi dua kelas: latar belakang (bobot $\omega_0$, rata-rata $\mu_0$) dan latar depan (bobot $\omega_1$, rata-rata $\mu_1$). Kami menghitung varians antar-kelas $\sigma_b^2(T) = \omega_0 \cdot \omega_1 \cdot (\mu_0 - \mu_1)^2$. Nilai $T$ yang menghasilkan $\sigma_b^2$ terbesar dipilih sebagai nilai ambang terbaik. Kode kami dihitung dalam `float64` presisi tinggi agar tidak kehilangan angka desimal."*
> *(File referensi: `backend/app/services/ops_point.py:46`)*

---

### Tanya-Jawab untuk Speaker 2 (Konvolusi & Blur)
**Tanya:** *"Apa bukti matematis dan keuntungan performa dari konvolusi Gaussian terpisah (Separable Convolution)?"*
> **Jawab:** *"Fungsi eksponensial Gaussian 2D dapat difaktorkan menjadi perkalian dua fungsi 1D independen: $e^{-(x^2+y^2)/2\sigma^2} = e^{-x^2/2\sigma^2} \times e^{-y^2/2\sigma^2}$. Artinya, kita tidak perlu melakukan konvolusi matriks $K \times K$ yang membutuhkan $K^2$ operasi per piksel. Cukup konvolusi 1D secara horizontal dengan vektor baris panjang $K$, lalu hasilnya dikonvolusi vertikal dengan vektor kolom panjang $K$. Kompleksitas turun dari $O(K^2)$ menjadi $O(2K)$. Pada citra 4 Megapixel dengan kernel $31\times 31$, jumlah operasi turun dari 961 kali menjadi 62 kali per piksel, memangkas waktu proses dari 77 detik menjadi 3.1 detik."*
> *(File referensi: `backend/app/services/core_conv.py:53-108`)*

**Tanya:** *"Mengapa Median Filter jauh lebih efektif melawan Salt & Pepper dibanding Gaussian atau Averaging?"*
> **Jawab:** *"Averaging dan Gaussian adalah filter linier berbasis jumlah terbobot. Derau salt (255) dan pepper (0) bernilai sangat ekstrem. Saat dijumlahkan, nilai ekstrem tersebut merusak rata-rata piksel tetangga di sekitarnya sehingga derau hanya berubah menjadi bercak kabur. Sedangkan Median Filter adalah filter statistik non-linier peringkat (rank filter). Derau bintik akan berada di ujung paling kiri (0) atau paling kanan (255) saat elemen jendela diurutkan. Karena kita mengambil nilai median tepat di tengah, nilai ekstrem 0 dan 255 otomatis tereliminasi 100%."*
> *(File referensi: `backend/app/services/ops_blur.py:43-85`)*

---

### Tanya-Jawab untuk Speaker 3 (Sharpening & Edge Detection)
**Tanya:** *"Apa perbedaan mendasar antara operator turunan pertama (Sobel) dan turunan kedua (Laplacian) dalam mendeteksi tepi?"*
> **Jawab:** *"Turunan pertama (Sobel) mendeteksi tepi berdasarkan kecuraman gradien (tingkat perubahan intensitas). Nilai magnitudo mencapai puncak maksimum lokal tepat pada lereng tepi, dan menghasilkan informasi arah vektor gradien ($\theta$). Kelemahannya, garis tepi yang dihasilkan cenderung tebal. Sedangkan turunan kedua (Laplacian) mendeteksi tepi berdasarkan titik persilangan nol (zero-crossing), yaitu saat turunan kedua berubah tanda dari positif ke negatif. Laplacian menghasilkan garis tepi yang lebih tipis dan bersifat isotropik (tidak tergantung arah), tetapi kelemahannya sangat rentan terhadap derau karena turunan kedua memperbesar variasi frekuensi tinggi."*
> *(File referensi: `backend/app/services/ops_detail.py:85-132`)*

**Tanya:** *"Bagaimana rumus matematis di balik Unsharp Masking?"*
> **Jawab:** *"Unsharp Masking meminjam istilah dari teknik fotografi kamar gelap. Pertama kita buat citra buram $G_\sigma(I)$ dengan filter Gaussian. Selisih citra asli dengan citra buram adalah topeng detail frekuensi tinggi (detail mask): $M = I - G_\sigma(I)$. Citra tajam akhir diperoleh dengan menambahkan kembali topeng detail tersebut ke citra asli dengan faktor pengali $\alpha$: $I_{\text{sharp}} = I + \alpha \cdot M$. Pada area rata di mana $I \approx G_\sigma(I)$, selisihnya 0 sehingga tidak berubah. Namun pada area tepi objek, selisihnya besar sehingga tepi menjadi lebih kontras dan tajam."*
> *(File referensi: `backend/app/services/ops_detail.py:48-58`)*

---

### Tanya-Jawab untuk Speaker 4 (Canny, Alpha, & Architecture)
**Tanya:** *"Bagaimana cara kerja Non-Maximum Suppression (NMS) pada algoritma Canny yang Anda bangun?"*
> **Jawab:** *"Setelah magnitudo gradien $M$ dan sudut $\theta$ dihitung dari Sobel, arah gradien dikuantisasi ke 4 sektor utama: $0^\circ, 45^\circ, 90^\circ,$ dan $135^\circ$. Untuk setiap piksel, kita melihat 2 tetangga yang berada searah dengan vektor gradien tersebut (tegak lurus garis tepi). Jika nilai piksel pusat lebih kecil dari salah satu dari dua tetangga tersebut, nilainya disupresi menjadi 0. Jika nilainya merupakan yang paling tinggi di antara keduanya, nilainya dipertahankan. Khusus pada sistem koordinat citra digital di mana sumbu-y mengarah ke bawah, sudut $45^\circ$ mengarah ke kuadran kanan-bawah, sehingga dibandingkan dengan tetangga $(r+1, c+1)$ dan $(r-1, c-1)$. Ini menjamin garis tepi menipis presisi menjadi selebar 1 piksel."*
> *(File referensi: `backend/app/services/ops_detail.py:161-197`)*

**Tanya:** *"Mengapa pada pencerminan citra (Mirroring) Anda menambahkan `np.ascontiguousarray`?"*
> **Jawab:** *"Operasi slicing NumPy seperti `img[:, ::-1]` tidak membuat array baru di memori, melainkan hanya membuat view dengan negative stride (langkah memori mundur). Saat array ber-stride negatif ini dioper ke modul encoder gambar (seperti fungsi kompresi PNG/JPEG), encoder membaca memori secara sekuensial linear dan akan menghasilkan crash atau citra corrupt. Dengan memanggil `np.ascontiguousarray(...)`, NumPy menyusun ulang data piksel tersebut ke dalam blok memori C-contiguous berurutan di RAM, menjamin stabilitas ekspor file 100%."*
> *(File referensi: `backend/app/services/ops_geometry.py:10-24`)*

---

## 🛠️ Tips Latihan Simulasi Demo Kelompok

1. **Sinkronisasi Transisi**: Latihlah kalimat operan antar speaker. Setiap kali satu orang selesai, sebutkan nama rekan berikutnya dan topik yang akan dibahas agar presentasi mengalir profesional.
2. **Koordinasi Operator & Presenter**: 
   - Opsi A: Speaker yang sedang berbicara sekaligus memegang mouse dan mengklik web.
   - Opsi B: Tunjuk 1 orang (misal Speaker 4) menjadi operator proyektor tetap yang mengklik fitur sesuai instruksi suara speaker yang sedang berbicara.
3. **Persiapan Terminal Cadangan**: Biarkan terminal backend dan frontend terbuka di latar belakang. Jika dosen bertanya: *"Coba buktikan kodenya benar-benar lulus test!"*, Anda tinggal alt-tab dan menjalankan `python -m pytest tests/` di terminal.
