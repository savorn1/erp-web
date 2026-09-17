// Shared toggle the POS checkout/exchange pages use to hide the admin
// sidebar for a full-width, tablet-friendly cashier view (see
// app/layouts/default.vue, which reads this to decide whether to render
// <UDashboardSidebar>). Session-only (useState, not persisted) and reset by
// the page itself on unmount, so leaving /pos never leaves another page
// stuck without its sidebar.
export function useKioskMode() {
  const kioskMode = useState<boolean>('kioskMode', () => false)

  function enable() {
    kioskMode.value = true
  }
  function disable() {
    kioskMode.value = false
  }
  function toggle() {
    kioskMode.value = !kioskMode.value
  }

  return { kioskMode, enable, disable, toggle }
}
