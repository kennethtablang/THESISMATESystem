import { toast as _toast } from 'react-toastify'

const opts = { position: 'bottom-right', autoClose: 3500, closeOnClick: true, pauseOnHover: true }

export const toast = {
  success: (msg) => _toast.success(msg, opts),
  error:   (msg) => _toast.error(msg, opts),
  info:    (msg) => _toast.info(msg, opts),
}
