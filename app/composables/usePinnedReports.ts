const STORAGE_KEY = 'erp-pinned-reports'

// Shared across every ReportCategoryCard instance via useState (SSR-safe:
// each request gets its own empty array, then the client hydrates from
// localStorage in onMounted so the pinned set never leaks between
// users/requests).
export function usePinnedReports() {
  const pinned = useState<string[]>('pinned-reports', () => [])

  onMounted(() => {
    if (pinned.value.length > 0) return
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) pinned.value = JSON.parse(stored)
    } catch {
      // ignore corrupt storage
    }
  })

  function isPinned(to: string) {
    return pinned.value.includes(to)
  }

  function togglePin(to: string) {
    pinned.value = isPinned(to) ? pinned.value.filter((r) => r !== to) : [...pinned.value, to]
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pinned.value))
    } catch {
      // ignore write failures (private browsing, quota, etc.)
    }
  }

  function clearAll() {
    pinned.value = []
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
  }

  return { pinned, isPinned, togglePin, clearAll }
}
