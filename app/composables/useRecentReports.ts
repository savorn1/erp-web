const STORAGE_KEY = 'erp-recent-reports'
const MAX_RECENT = 8

// Shared across ReportBackButton (which records each visit) and the reports
// index page (which renders the list) via useState — same SSR-safe pattern
// as usePinnedReports.
export function useRecentReports() {
  const recent = useState<string[]>('recent-reports', () => [])

  onMounted(() => {
    if (recent.value.length > 0) return
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) recent.value = JSON.parse(stored)
    } catch {
      // ignore corrupt storage
    }
  })

  function recordVisit(path: string) {
    // Re-reads localStorage directly rather than trusting `recent.value` —
    // recordVisit can fire before the onMounted load above has run (hook
    // order isn't guaranteed across component instances), and starting from
    // a stale/empty in-memory value would silently drop prior history.
    let current: string[] = recent.value
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) current = JSON.parse(stored)
    } catch {
      // ignore corrupt storage
    }
    const next = [path, ...current.filter((p) => p !== path)].slice(0, MAX_RECENT)
    recent.value = next
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // ignore write failures
    }
  }

  function clearAll() {
    recent.value = []
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
  }

  return { recent, recordVisit, clearAll }
}
