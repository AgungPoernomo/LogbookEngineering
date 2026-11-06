import Swal from 'sweetalert2'

/**
 * Wrapper terpusat SweetAlert2 (F1.3) agar seluruh aplikasi memakai
 * dialog konfirmasi/notifikasi yang konsisten menggantikan alert()/confirm() bawaan browser.
 */
const base = Swal.mixin({
  confirmButtonColor: '#2563eb',
  cancelButtonColor: '#64748b',
  reverseButtons: true,
  buttonsStyling: true
})

export const alert = {
  success(title, text = '') {
    return base.fire({ icon: 'success', title, text })
  },
  error(title, text = '') {
    return base.fire({ icon: 'error', title, text })
  },
  info(title, text = '') {
    return base.fire({ icon: 'info', title, text })
  },
  async confirm(title, text = '', confirmText = 'Ya, lanjutkan', icon = 'warning') {
    const res = await base.fire({
      icon,
      title,
      text,
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: 'Batal'
    })
    return res.isConfirmed
  },
  async prompt(title, inputLabel = '', placeholder = '') {
    const res = await base.fire({
      title,
      input: 'textarea',
      inputLabel,
      inputPlaceholder: placeholder,
      showCancelButton: true,
      confirmButtonText: 'Kirim',
      cancelButtonText: 'Batal',
      inputValidator: (value) => (!value || !value.trim() ? 'Kolom ini wajib diisi.' : undefined)
    })
    return res.isConfirmed ? String(res.value).trim() : null
  },
  toast(title, icon = 'success') {
    return base.fire({
      toast: true,
      position: 'top-end',
      icon,
      title,
      showConfirmButton: false,
      timer: 2500,
      timerProgressBar: true
    })
  }
}

export default alert
