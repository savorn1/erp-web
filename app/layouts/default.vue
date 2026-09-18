<template>
  <UDashboardGroup class="bg-gray-50 dark:bg-gray-950">
    <!-- Cmd/Ctrl+K anywhere in the app — items are derived straight from the
         sidebar nav below, so it can never list a page the sidebar doesn't
         also have (see searchGroups). -->
    <UDashboardSearch :groups="searchGroups" />

    <!-- Deliberately always dark, independent of the app's own light/dark
         toggle — the `dark` class forces every Nuxt UI component inside
         (nav items, icons, the collapse button) onto its dark-mode tokens
         regardless of the outer mode, so this doesn't need per-component
         overrides. -->
    <UDashboardSidebar v-if="!kioskMode" collapsible :collapsed-size="4" class="dark bg-gray-950 border-gray-900">
      <template #header="{ collapsed }">
        <NuxtLink to="/" class="flex items-center gap-2.5" :class="collapsed ? 'justify-center w-full' : ''">
          <span class="flex items-center justify-center w-8 h-8 rounded-lg bg-primary-500 text-white shrink-0">
            <UIcon name="i-lucide-boxes" class="w-4 h-4" />
          </span>
          <span v-if="!collapsed" class="font-bold text-gray-900 dark:text-white tracking-tight"> ERP </span>
        </NuxtLink>
      </template>

      <template #default="{ collapsed }">
        <SidebarNav :items="items" :collapsed="collapsed" />
      </template>

      <template #footer>
        <UDashboardSidebarCollapse />
      </template>
    </UDashboardSidebar>

    <UDashboardPanel>
      <template #header>
        <UDashboardNavbar>
          <template #left>
            <UBreadcrumb :items="breadcrumbItems" />
          </template>

          <template #right>
            <UDashboardSearchButton />
            <UColorModeButton />
            <NotificationBell />
            <UDropdownMenu :items="profileItems" :content="{ align: 'end' }" :ui="{ content: 'w-56' }">
              <UButton size="sm" color="neutral" variant="ghost" trailing-icon="i-lucide-chevron-down">
                <UAvatar :alt="username ?? '?'" size="2xs" />
                {{ username }}
              </UButton>
            </UDropdownMenu>
          </template>
        </UDashboardNavbar>
      </template>

      <template #body>
        <slot />
      </template>
    </UDashboardPanel>
  </UDashboardGroup>
</template>

<script setup lang="ts">
import type { BreadcrumbItem, DropdownMenuItem } from '@nuxt/ui'
import type { SidebarItem } from '~/components/SidebarNav.vue'

const { username, role, hasAnyAccess, logout } = useAuth()
const { kioskMode } = useKioskMode()
const route = useRoute()

const profileItems = computed<DropdownMenuItem[][]>(() => [
  [
    {
      label: username.value ?? '',
      description: role.value === 'ADMIN' ? 'Administrator' : 'User',
      avatar: { alt: username.value ?? '?' },
      type: 'label'
    }
  ],
  [{ label: 'Profile', icon: 'i-lucide-user', to: '/profile' }],
  [{ label: 'Log out', icon: 'i-lucide-log-out', color: 'error', onSelect: () => logout() }]
])

// Starter nav — add feature groups here the same way (a top-level item with
// `children`), gating admin-only items behind `hasAnyAccess` (ADMIN always,
// or a USER whose custom role was granted at least one permission — see
// useAuth.can/middleware/admin.ts). Organization and Master Data stay open
// by default since they're small/frequently used; the rest start collapsed
// to keep the sidebar from being one long list. Each group's `color` picks
// its accent hue in SidebarNav (header icon, active-item background/border)
// so groups stay visually distinct at a glance.
//
// Known limitation: this shows the full nav to any USER who has ANY grant
// at all, not just the sections they're actually permitted in — filtering
// each of the ~70 modules' nav items individually against their specific
// grants is out of scope for now. A USER who follows a link they lack
// permission for gets a 403 from the backend on that page, same as any
// other ungranted action.
const items = computed<SidebarItem[]>(() => [
  { label: 'Dashboard', to: '/', icon: 'i-lucide-layout-dashboard' },

  ...(hasAnyAccess.value
    ? [
        { label: 'Reports', to: '/reports', icon: 'i-lucide-file-bar-chart-2' },

        {
          label: 'Organization',
          icon: 'i-lucide-building-2',
          color: 'sky',
          defaultOpen: true,
          children: [
            { label: 'Companies', to: '/companies', icon: 'i-lucide-building-2' },
            { label: 'Branches', to: '/branches', icon: 'i-lucide-map-pin' },
            { label: 'Departments', to: '/departments', icon: 'i-lucide-network' }
          ]
        },
        {
          label: 'Master Data',
          icon: 'i-lucide-database',
          color: 'violet',
          defaultOpen: true,
          children: [
            { label: 'Products', to: '/products', icon: 'i-lucide-package' },
            { label: 'Categories', to: '/product-categories', icon: 'i-lucide-tags' },
            { label: 'Brands', to: '/product-brands', icon: 'i-lucide-badge' },
            { label: 'Types', to: '/product-types', icon: 'i-lucide-shapes' },
            { label: 'Units of measure', to: '/units-of-measure', icon: 'i-lucide-ruler' },
            { label: 'UOM categories', to: '/uom-categories', icon: 'i-lucide-shapes' },
            { label: 'UOM conversions', to: '/uom-conversions', icon: 'i-lucide-arrow-left-right' },
            { label: 'Suppliers', to: '/suppliers', icon: 'i-lucide-truck' },
            { label: 'Supplier types', to: '/supplier-types', icon: 'i-lucide-shapes' },
            { label: 'Customers', to: '/customers', icon: 'i-lucide-contact' },
            { label: 'Customer types', to: '/customer-types', icon: 'i-lucide-shapes' },
            { label: 'Customer groups', to: '/customer-groups', icon: 'i-lucide-users-round' },
            { label: 'Price groups', to: '/price-groups', icon: 'i-lucide-tags' },
            { label: 'Product prices', to: '/product-prices', icon: 'i-lucide-tag' },
            { label: 'Price lookup', to: '/pricing-lookup', icon: 'i-lucide-search' }
          ]
        },
        {
          label: 'Inventory',
          icon: 'i-lucide-warehouse',
          color: 'teal',
          children: [
            { label: 'Warehouses', to: '/warehouses', icon: 'i-lucide-warehouse' },
            { label: 'Zones', to: '/warehouse-zones', icon: 'i-lucide-layout-grid' },
            { label: 'Shelves / bins', to: '/warehouse-bins', icon: 'i-lucide-package-2' },
            { label: 'Stock levels', to: '/stock-levels', icon: 'i-lucide-boxes' },
            { label: 'Stock movements', to: '/stock-movements', icon: 'i-lucide-history' },
            { label: 'Serial numbers', to: '/serial-numbers', icon: 'i-lucide-scan-barcode' },
            { label: 'Stock transfers', to: '/stock-transfers', icon: 'i-lucide-repeat' },
            { label: 'Stock adjustments', to: '/stock-adjustments', icon: 'i-lucide-scale' },
            { label: 'Inventory overview', to: '/inventory-overview', icon: 'i-lucide-layout-dashboard' },
            { label: 'Stock counts', to: '/stock-counts', icon: 'i-lucide-clipboard-check' },
            { label: 'Inventory settings', to: '/inventory-settings', icon: 'i-lucide-sliders-horizontal' }
          ]
        },
        {
          label: 'Purchasing',
          icon: 'i-lucide-shopping-cart',
          color: 'orange',
          children: [
            { label: 'Purchase requests', to: '/purchase-requests', icon: 'i-lucide-clipboard-list' },
            { label: 'RFQs', to: '/rfqs', icon: 'i-lucide-send' },
            { label: 'Purchase orders', to: '/purchase-orders', icon: 'i-lucide-shopping-cart' },
            { label: 'Goods receipts', to: '/goods-receipts', icon: 'i-lucide-package-check' },
            { label: 'Purchase invoices', to: '/purchase-invoices', icon: 'i-lucide-receipt' },
            { label: 'Supplier payments', to: '/supplier-payments', icon: 'i-lucide-banknote' }
          ]
        },
        {
          label: 'Manufacturing',
          icon: 'i-lucide-factory',
          color: 'amber',
          children: [
            { label: 'Bill of materials', to: '/bill-of-materials', icon: 'i-lucide-list-tree' },
            { label: 'Routings', to: '/routings', icon: 'i-lucide-route' },
            { label: 'Work centers', to: '/work-centers', icon: 'i-lucide-factory' },
            { label: 'Machines', to: '/machines', icon: 'i-lucide-cog' },
            { label: 'Production plans', to: '/production-plans', icon: 'i-lucide-calendar-range' },
            { label: 'Manufacturing orders', to: '/manufacturing-orders', icon: 'i-lucide-clipboard-list' }
          ]
        },
        {
          label: 'Sales',
          icon: 'i-lucide-file-text',
          color: 'emerald',
          children: [
            { label: 'Leads', to: '/leads', icon: 'i-lucide-user-plus' },
            { label: 'Quotations', to: '/quotations', icon: 'i-lucide-file-text' },
            { label: 'Sales orders', to: '/sales-orders', icon: 'i-lucide-file-text' },
            { label: 'Deliveries', to: '/deliveries', icon: 'i-lucide-truck' },
            { label: 'Invoices', to: '/invoices', icon: 'i-lucide-receipt' },
            { label: 'Recurring invoices', to: '/recurring-invoices', icon: 'i-lucide-repeat' },
            { label: 'Payments', to: '/payments', icon: 'i-lucide-banknote' },
            { label: 'RMA / Returns', to: '/rma-requests', icon: 'i-lucide-undo-2' },
            { label: 'Support tickets', to: '/tickets', icon: 'i-lucide-life-buoy' },
            { label: 'Commission rules', to: '/commission-rules', icon: 'i-lucide-hand-coins' }
          ]
        },
        {
          label: 'Accounting',
          icon: 'i-lucide-landmark',
          color: 'indigo',
          children: [
            { label: 'Chart of accounts', to: '/chart-of-accounts', icon: 'i-lucide-book-open' },
            { label: 'Journals', to: '/journals', icon: 'i-lucide-book-text' },
            { label: 'Journal entries', to: '/journal-entries', icon: 'i-lucide-book-text' },
            { label: 'Posting rules', to: '/posting-rules', icon: 'i-lucide-sliders-horizontal' },
            { label: 'Accounts receivable', to: '/accounts-receivable', icon: 'i-lucide-hand-coins' },
            { label: 'Accounts payable', to: '/accounts-payable', icon: 'i-lucide-credit-card' },
            { label: 'Bank & cash', to: '/bank-accounts', icon: 'i-lucide-landmark' },
            { label: 'Petty cash', to: '/petty-cash', icon: 'i-lucide-wallet' },
            { label: 'Cost centers', to: '/cost-centers', icon: 'i-lucide-building-2' },
            { label: 'Budgets', to: '/budgets', icon: 'i-lucide-calculator' },
            { label: 'Fiscal years', to: '/fiscal-years', icon: 'i-lucide-calendar' },
            { label: 'Fixed assets', to: '/fixed-assets', icon: 'i-lucide-briefcase' },
            { label: 'Tax rates', to: '/tax-rates', icon: 'i-lucide-percent' }
          ]
        },
        {
          label: 'Point of Sale',
          icon: 'i-lucide-store',
          color: 'fuchsia',
          children: [
            { label: 'Checkout', to: '/pos', icon: 'i-lucide-shopping-bag' },
            { label: 'Dashboard', to: '/pos/dashboard', icon: 'i-lucide-bar-chart-3' },
            { label: 'Registers', to: '/registers', icon: 'i-lucide-monitor' },
            { label: 'Sessions', to: '/pos/sessions', icon: 'i-lucide-door-open' },
            { label: 'Sales', to: '/pos/sales', icon: 'i-lucide-receipt-text' },
            { label: 'Exchanges', to: '/pos/exchanges', icon: 'i-lucide-repeat' }
          ]
        },
        {
          label: 'Administration',
          icon: 'i-lucide-shield',
          color: 'rose',
          children: [
            { label: 'Users', to: '/users', icon: 'i-lucide-users' },
            { label: 'Custom roles', to: '/custom-roles', icon: 'i-lucide-shield' },
            { label: 'Audit log', to: '/audit-logs', icon: 'i-lucide-history' },
            { label: 'Approval rules', to: '/approval-rules', icon: 'i-lucide-check-check' }
          ]
        }
      ]
    : [])
])

// Cmd/Ctrl+K command palette — built from the exact same `items` list the
// sidebar renders, so it always matches (a route missing from one is
// missing from the other). Top-level links (Dashboard, Reports) land in
// their own unlabeled group; every collapsible section's children become a
// group of their own, suffixed with the section name so a search hit like
// "Invoices" still reads as "Invoices — Sales" if there's ever a clash.
interface SearchItem {
  id: string
  label: string
  icon?: string
  suffix?: string
  onSelect: () => void
}
const searchGroups = computed(() => {
  const groups: { id: string; label?: string; items: SearchItem[] }[] = []
  const topLevel: SearchItem[] = []
  for (const item of items.value) {
    if ('to' in item) {
      topLevel.push({ id: item.to, label: item.label, icon: item.icon, onSelect: () => navigateTo(item.to) })
    } else {
      groups.push({
        id: item.label,
        label: item.label,
        items: item.children.map((child) => ({
          id: child.to,
          label: child.label,
          icon: child.icon,
          suffix: item.label,
          onSelect: () => navigateTo(child.to)
        }))
      })
    }
  }
  if (topLevel.length > 0) groups.unshift({ id: 'top', items: topLevel })
  return groups
})

// Derived from the same nav list so it can never drift out of sync with the
// sidebar — each top-level item is now a collapsible group with `children`,
// so a page's section is whichever group's children contains its route.
const breadcrumbItems = computed<BreadcrumbItem[]>(() => {
  for (const item of items.value) {
    if ('to' in item) {
      if (item.to === route.path) return [{ label: item.label, icon: item.icon }]
      continue
    }
    for (const child of item.children) {
      if (child.to === route.path) return [{ label: item.label }, { label: child.label, icon: child.icon }]
    }
  }
  // Routes outside the sidebar nav (e.g. /profile) fall back to the last path segment.
  const segment = route.path.split('/').filter(Boolean).pop()
  return [{ label: segment ? humanize(segment) : 'Dashboard' }]
})
</script>
