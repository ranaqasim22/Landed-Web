import { isAxiosError } from 'axios'

export function getAuthErrorMessage(
  error: unknown,
  byStatus: Record<number, string> = {},
) {
  if (isAxiosError(error)) {
    if (!error.response) {
      // A dropped request while online means our server is down, not their connection.
      return navigator.onLine
        ? "We can't reach Landed right now. Try again in a moment"
        : 'No internet — check your connection and try again'
    }
    if (error.response.status === 429) {
      return 'Too many attempts, try again in a minute'
    }
    const message = byStatus[error.response.status]
    if (message) return message
  }
  return 'Something went wrong on our side. Please try again'
}
