import { describe, it, expect } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import SparepartMultiSelect from './SparepartMultiSelect.vue'

// ============================================================================
// FASE 5.2 / v6 — Picker sparepart multi-baris pada form teknisi.
// Mengunci kontrak: filter tipe item, empty state, serta render baris terpilih
// (nama part + qty + satuan) yang dipakai payload `sparepart_items`.
// ============================================================================

function render(props) {
  return renderToString(createSSRApp({ render: () => h(SparepartMultiSelect, props) }))
}

const selectedItems = [
  {
    sparepart_id: 3,
    qty_used: 2.5,
    part_name: 'Deep Groove Ball Bearing 6204',
    part_code: 'BRG-6204',
    unit: 'pcs'
  }
]

describe('SparepartMultiSelect', () => {
  it('menampilkan filter tipe item dan placeholder pencarian', async () => {
    const html = await render({ modelValue: [] })

    expect(html).toContain('Semua')
    expect(html).toContain('Suku Cadang Mesin')
    expect(html).toContain('Bahan Habis Pakai')
    expect(html).toContain('Cari sparepart (nama / kode / spesifikasi)...')
  })

  it('menampilkan empty state saat belum ada part dipilih', async () => {
    const html = await render({ modelValue: [] })

    expect(html).toContain('Belum ada sparepart dipilih')
  })

  it('merender part terpilih lengkap dengan qty dan satuan', async () => {
    const html = await render({ modelValue: selectedItems })

    expect(html).toContain('Deep Groove Ball Bearing 6204')
    expect(html).toContain('BRG-6204')
    // qty dari modelValue dipakai sebagai nilai awal input
    expect(html).toContain('value="2.5"')
    expect(html).toContain('pcs')
    expect(html).toContain('aria-label="Hapus Deep Groove Ball Bearing 6204"')
    expect(html).not.toContain('Belum ada sparepart dipilih')
  })

  it('menonaktifkan input qty & tombol hapus saat disabled', async () => {
    const html = await render({ modelValue: selectedItems, disabled: true })

    expect(html).toContain('disabled')
    expect(html).toContain('sparepart-qty-3')
  })
})
