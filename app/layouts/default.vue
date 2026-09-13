<template>
  <UDashboardGroup class="bg-gray-50 dark:bg-gray-950">
    <!-- Deliberately always dark, independent of the app's own light/dark
         toggle — the `dark` class forces every Nuxt UI component inside
         (nav items, icons, the collapse button) onto its dark-mode tokens
         regardless of the outer mode, so this doesn't need per-component
         overrides. -->
    <UDashboardSidebar collapsible :collapsed-size="4" class="dark bg-gray-950 border-gray-900">
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
            <UColorModeButton />
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

const { username, role, isAdmin, logout } = useAuth()
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
// `children`), gating admin-only items behind `isAdmin`. Organization and
// Master Data stay open by default since they're small/frequently used;
// the rest start collapsed to keep the sidebar from being one long list.
// Each group's `color` picks its accent hue in SidebarNav (header icon,
// active-item background/border) so groups stay visually distinct at a glance.
const items = computed<SidebarItem[]>(() => [
  { label: 'Dashboard', to: '/', icon: 'i-lucide-layout-dashboard' },

  ...(isAdmin.value
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
            { label: 'Stock counts', to: '/stock-counts', icon: 'i-lucide-clipboard-check' }
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
          label: 'Sales',
          icon: 'i-lucide-file-text',
          color: 'emerald',
          children: [
            { label: 'Leads', to: '/leads', icon: 'i-lucide-user-plus' },
            { label: 'Opportunities', to: '/opportunities', icon: 'i-lucide-target' },
            { label: 'Quotations', to: '/quotations', icon: 'i-lucide-file-text' },
            { label: 'Sales orders', to: '/sales-orders', icon: 'i-lucide-file-text' },
            { label: 'Deliveries', to: '/deliveries', icon: 'i-lucide-truck' },
            { label: 'Invoices', to: '/invoices', icon: 'i-lucide-receipt' },
            { label: 'Payments', to: '/payments', icon: 'i-lucide-banknote' }
          ]
        },
        {
          label: 'Accounting',
          icon: 'i-lucide-landmark',
          color: 'indigo',
          children: [
            { label: 'Chart of accounts', to: '/chart-of-accounts', icon: 'i-lucide-book-open' },
            { label: 'Journal entries', to: '/journal-entries', icon: 'i-lucide-book-text' },
            { label: 'Accounts receivable', to: '/accounts-receivable', icon: 'i-lucide-hand-coins' },
            { label: 'Accounts payable', to: '/accounts-payable', icon: 'i-lucide-credit-card' },
            { label: 'Bank & cash', to: '/bank-accounts', icon: 'i-lucide-landmark' },
            { label: 'Tax rates', to: '/tax-rates', icon: 'i-lucide-percent' }
          ]
        },
        {
          label: 'Administration',
          icon: 'i-lucide-shield',
          color: 'rose',
          children: [{ label: 'Users', to: '/users', icon: 'i-lucide-users' }]
        }
      ]
    : [])
])

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
