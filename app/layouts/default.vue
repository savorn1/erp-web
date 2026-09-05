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
        <UNavigationMenu :collapsed="collapsed" :tooltip="collapsed" :items="items" orientation="vertical" />
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
import type { BreadcrumbItem, DropdownMenuItem, NavigationMenuItem } from '@nuxt/ui'

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

// Starter nav — add feature groups here the same way (a `type: 'label'`
// header followed by its items), gating admin-only items behind `isAdmin`.
const items = computed<NavigationMenuItem[]>(() => [
  { label: 'Dashboard', to: '/', icon: 'i-lucide-layout-dashboard' },

  ...(isAdmin.value
    ? [
        { label: 'Setup', type: 'label' as const },
        { label: 'Companies', to: '/companies', icon: 'i-lucide-building-2' },
        { label: 'Branches', to: '/branches', icon: 'i-lucide-map-pin' },
        { label: 'Departments', to: '/departments', icon: 'i-lucide-sitemap' },

        { label: 'Master Data', type: 'label' as const },
        { label: 'Products', to: '/products', icon: 'i-lucide-package' },
        { label: 'Product variants', to: '/product-variants', icon: 'i-lucide-boxes' },
        { label: 'Categories', to: '/product-categories', icon: 'i-lucide-tags' },
        { label: 'Brands', to: '/product-brands', icon: 'i-lucide-badge' },
        { label: 'Types', to: '/product-types', icon: 'i-lucide-shapes' },
        { label: 'Units of measure', to: '/units-of-measure', icon: 'i-lucide-ruler' },
        { label: 'Suppliers', to: '/suppliers', icon: 'i-lucide-truck' },
        { label: 'Supplier types', to: '/supplier-types', icon: 'i-lucide-shapes' },
        { label: 'Customers', to: '/customers', icon: 'i-lucide-contact' },
        { label: 'Customer types', to: '/customer-types', icon: 'i-lucide-shapes' },
        { label: 'Customer groups', to: '/customer-groups', icon: 'i-lucide-users-round' },
        { label: 'Price groups', to: '/price-groups', icon: 'i-lucide-tags' },
        { label: 'Product prices', to: '/product-prices', icon: 'i-lucide-tag' },
        { label: 'Price lookup', to: '/pricing-lookup', icon: 'i-lucide-search' },

        { label: 'Warehouses', type: 'label' as const },
        { label: 'Warehouses', to: '/warehouses', icon: 'i-lucide-warehouse' },
        { label: 'Zones', to: '/warehouse-zones', icon: 'i-lucide-layout-grid' },
        { label: 'Shelves / bins', to: '/warehouse-bins', icon: 'i-lucide-package-2' },

        { label: 'Stock Receiving', type: 'label' as const },
        { label: 'Purchase orders', to: '/purchase-orders', icon: 'i-lucide-clipboard-list' },
        { label: 'Goods receipts', to: '/goods-receipts', icon: 'i-lucide-package-check' },
        { label: 'Stock levels', to: '/stock-levels', icon: 'i-lucide-boxes' },
        { label: 'Stock movements', to: '/stock-movements', icon: 'i-lucide-history' },
        { label: 'Serial numbers', to: '/serial-numbers', icon: 'i-lucide-scan-barcode' },

        { label: 'Stock Issue', type: 'label' as const },
        { label: 'Sales orders', to: '/sales-orders', icon: 'i-lucide-file-text' },
        { label: 'Deliveries', to: '/deliveries', icon: 'i-lucide-truck' },
        { label: 'Invoices', to: '/invoices', icon: 'i-lucide-receipt' },
        { label: 'Payments', to: '/payments', icon: 'i-lucide-banknote' },

        { label: 'Stock Transfer', type: 'label' as const },
        { label: 'Stock transfers', to: '/stock-transfers', icon: 'i-lucide-repeat' },

        { label: 'Stock Adjustment', type: 'label' as const },
        { label: 'Stock adjustments', to: '/stock-adjustments', icon: 'i-lucide-scale' },

        { label: 'Inventory Control', type: 'label' as const },
        { label: 'Inventory overview', to: '/inventory-overview', icon: 'i-lucide-layout-dashboard' },
        { label: 'Stock counts', to: '/stock-counts', icon: 'i-lucide-clipboard-check' },

        { label: 'CRM', type: 'label' as const },
        { label: 'Leads', to: '/leads', icon: 'i-lucide-user-plus' },
        { label: 'Opportunities', to: '/opportunities', icon: 'i-lucide-target' },
        { label: 'Quotations', to: '/quotations', icon: 'i-lucide-file-text' },

        { label: 'Administration', type: 'label' as const },
        { label: 'Users', to: '/users', icon: 'i-lucide-users' }
      ]
    : [])
])

// Derived from the same nav list so it can never drift out of sync with the
// sidebar — walks `items` tracking the last `type: 'label'` group seen (e.g.
// "Administration") as the section a page belongs to.
const breadcrumbItems = computed<BreadcrumbItem[]>(() => {
  let section: string | undefined
  for (const item of items.value) {
    if (item.type === 'label') {
      section = item.label
      continue
    }
    if (item.to !== route.path) continue
    return section ? [{ label: section }, { label: item.label, icon: item.icon }] : [{ label: item.label, icon: item.icon }]
  }
  // Routes outside the sidebar nav (e.g. /profile) fall back to the last path segment.
  const segment = route.path.split('/').filter(Boolean).pop()
  return [{ label: segment ? humanize(segment) : 'Dashboard' }]
})
</script>
