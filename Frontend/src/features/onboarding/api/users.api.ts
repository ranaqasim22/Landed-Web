import axios from 'axios'
import type { AuthUser } from '@/features/auth/api/auth.api'
import { api } from '@/lib/api'
import type { ProfileChanges } from '../schemas/onboarding.schemas'

export const usersApi = {
  updateMe: (changes: ProfileChanges) =>
    api.patch<AuthUser>('/users/me', changes).then((res) => res.data),

  // Goes straight to storage, so it uses plain axios to keep our cookies and token out of it.
  uploadAvatar: async (file: Blob, onProgress: (percent: number) => void) => {
    const { data } = await api.post<{ uploadUrl: string; fileUrl: string }>('/uploads/presign', {
      contentType: file.type,
      size: file.size,
    })
    await axios.put(data.uploadUrl, file, {
      headers: { 'Content-Type': file.type },
      onUploadProgress: ({ progress }) => onProgress(Math.round((progress ?? 0) * 100)),
    })
    return data.fileUrl
  },
}
