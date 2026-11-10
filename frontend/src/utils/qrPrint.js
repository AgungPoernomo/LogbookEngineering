/**
 * FASE 5.3 — Utilitas cetak label QR mesin.
 *
 * Dipakai oleh `MachineQrModal.vue` (cetak satu mesin) dan
 * `MachineQRPrintView.vue` (cetak batch per Line). HTML label dibangun sebagai
 * string lalu ditulis ke window baru agar dokumen cetak bersih (tanpa layout
 * aplikasi), sehingga `window.print()` hanya menghasilkan kartu QR.
 *
 * Catatan: warna memakai nilai token Tailwind proyek (primary #2563EB / ink
 * #111827 / line #E6E9F0) karena dokumen cetak berada di luar scope Tailwind.
 */

const PRINT_BRAND = 'Satoria - Engineer Logbook'

/**
 * Escape teks agar aman dimasukkan ke HTML string.
 */
export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Kartu label QR tunggal.
 *
 * @param {{ name: string, plant_name?: string, image_src: string }} machine
 * @returns {string}
 */
export function buildQrCardHtml(machine) {
  return `
    <div class="card">
      <div class="brand">${escapeHtml(PRINT_BRAND)}</div>
      <div class="qr"><img src="${machine.image_src}" alt="QR Code" /></div>
      <div class="name">${escapeHtml(machine.name)}</div>
      <div class="line">${escapeHtml(machine.plant_name || '-')}</div>
    </div>
  `.trim()
}

/**
 * Dokumen HTML lengkap berisi n kartu QR (grid 2 kolom saat cetak).
 *
 * @param {Array<{ name: string, plant_name?: string, image_src: string }>} machines
 * @param {{ title?: string, subtitle?: string }} [options]
 * @returns {string}
 */
export function buildPrintDocumentHtml(machines = [], { title = 'QR Code Mesin', subtitle = '' } = {}) {
  const cards = machines.map(buildQrCardHtml).join('\n')

  return `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    * { box-sizing: border-box; }
    @page { size: A4; margin: 10mm; }
    body {
      margin: 0;
      font-family: Inter, 'Plus Jakarta Sans', system-ui, -apple-system, Segoe UI, sans-serif;
      color: #111827;
      background: #ffffff;
    }
    header { margin-bottom: 8mm; border-bottom: 1px solid #E6E9F0; padding-bottom: 3mm; }
    header h1 { margin: 0; font-size: 14pt; font-weight: 700; }
    header p { margin: 1mm 0 0; font-size: 9pt; color: #6B7280; }
    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6mm; }
    .card {
      border: 1px solid #E6E9F0;
      border-radius: 3mm;
      padding: 5mm 4mm;
      text-align: center;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .card .brand {
      font-size: 7pt;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #2563EB;
    }
    .card .qr img {
      width: 42mm;
      height: 42mm;
      object-fit: contain;
      margin: 3mm auto 2mm;
      display: block;
    }
    .card .name { font-size: 10pt; font-weight: 700; line-height: 1.25; word-break: break-word; }
    .card .line { font-size: 8pt; color: #6B7280; margin-top: 1mm; }
    footer { margin-top: 6mm; font-size: 7.5pt; color: #9CA3AF; text-align: center; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <header>
    <h1>${escapeHtml(title)}</h1>
    ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ''}
  </header>
  <div class="grid">
    ${cards}
  </div>
  <footer>${escapeHtml(PRINT_BRAND)} — ${escapeHtml(new Date().toLocaleDateString('id-ID'))}</footer>
</body>
</html>`
}

/**
 * Buka window baru, tulis dokumen label, lalu panggil `window.print()`.
 * Popup diblokir browser → mengembalikan false (pemanggil menampilkan alert).
 *
 * @param {string} html
 * @returns {boolean}
 */
export function openPrintWindow(html) {
  if (typeof window === 'undefined') return false

  const printWindow = window.open('', '_blank', 'width=900,height=1000')
  if (!printWindow) return false

  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()

  // Tunggu gambar QR (data URL) selesai dimuat sebelum dialog cetak dibuka.
  const triggerPrint = () => {
    try {
      printWindow.focus()
      printWindow.print()
    } catch (err) {
      console.error('Gagal membuka dialog cetak:', err)
    }
  }

  if (printWindow.document.readyState === 'complete') {
    setTimeout(triggerPrint, 150)
  } else {
    printWindow.onload = () => setTimeout(triggerPrint, 150)
  }

  return true
}

/**
 * Simpan data URL PNG sebagai file unduhan.
 *
 * @param {string} dataUrl
 * @param {string} filename
 */
export function downloadDataUrl(dataUrl, filename) {
  if (typeof document === 'undefined' || !dataUrl) return
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = filename || 'qr-mesin.png'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Nama file unduhan QR: qr-mesin-<id>-<slug>.png (sama dengan backend).
 */
export function buildQrDownloadFilename(machine) {
  const slug = String(machine?.name || 'mesin')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'mesin'
  return `qr-mesin-${Number(machine?.id)}-${slug}.png`
}
