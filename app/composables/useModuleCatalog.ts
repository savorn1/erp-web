// Curated catalog of permission "modules" for the Custom Roles permission
// grid. Each `key` matches the real backend URL segment right after
// /api/admin/ (see PermissionAuthorizationManager, which derives a request's
// module the same way) — grouped here to mirror the sidebar's own sections
// purely for a readable admin UI; the grouping itself has no backend meaning.
// `color` matches that same section's accent color in app/layouts/default.vue,
// so a group reads consistently whether you're in the sidebar or here.
export interface ModuleCatalogEntry {
  key: string
  label: string
}

export interface ModuleCatalogGroup {
  group: string
  color: string
  modules: ModuleCatalogEntry[]
}

// Full literal class strings per color — Tailwind's JIT compiler only picks
// up classes it can see written out, so `text-${color}-600` built by string
// interpolation would silently produce no styling at build time.
const GROUP_COLOR_CLASSES: Record<string, string> = {
  sky: 'text-sky-600 dark:text-sky-400 border-sky-500',
  violet: 'text-violet-600 dark:text-violet-400 border-violet-500',
  teal: 'text-teal-600 dark:text-teal-400 border-teal-500',
  orange: 'text-orange-600 dark:text-orange-400 border-orange-500',
  amber: 'text-amber-600 dark:text-amber-400 border-amber-500',
  emerald: 'text-emerald-600 dark:text-emerald-400 border-emerald-500',
  indigo: 'text-indigo-600 dark:text-indigo-400 border-indigo-500',
  rose: 'text-rose-600 dark:text-rose-400 border-rose-500',
  cyan: 'text-cyan-600 dark:text-cyan-400 border-cyan-500',
  fuchsia: 'text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500'
}

export function groupColorClasses(color: string) {
  return GROUP_COLOR_CLASSES[color] ?? GROUP_COLOR_CLASSES.cyan!
}

export function useModuleCatalog() {
  const catalog: ModuleCatalogGroup[] = [
    {
      group: 'Organization',
      color: 'sky',
      modules: [
        { key: 'companies', label: 'Companies' },
        { key: 'branches', label: 'Branches' },
        { key: 'departments', label: 'Departments' }
      ]
    },
    {
      group: 'Master data',
      color: 'violet',
      modules: [
        { key: 'products', label: 'Products' },
        { key: 'product-categories', label: 'Product categories' },
        { key: 'product-brands', label: 'Product brands' },
        { key: 'product-types', label: 'Product types' },
        { key: 'units-of-measure', label: 'Units of measure' },
        { key: 'uom-categories', label: 'UOM categories' },
        { key: 'uom-conversions', label: 'UOM conversions' },
        { key: 'suppliers', label: 'Suppliers' },
        { key: 'supplier-types', label: 'Supplier types' },
        { key: 'customers', label: 'Customers' },
        { key: 'customer-types', label: 'Customer types' },
        { key: 'customer-groups', label: 'Customer groups' },
        { key: 'price-groups', label: 'Price groups' },
        { key: 'product-prices', label: 'Product prices' },
        { key: 'pricing', label: 'Price lookup' }
      ]
    },
    {
      group: 'Inventory',
      color: 'teal',
      modules: [
        { key: 'warehouses', label: 'Warehouses' },
        { key: 'warehouse-zones', label: 'Warehouse zones' },
        { key: 'warehouse-bins', label: 'Shelves / bins' },
        { key: 'stock-levels', label: 'Stock levels' },
        { key: 'stock-movements', label: 'Stock movements' },
        { key: 'serial-numbers', label: 'Serial numbers' },
        { key: 'stock-transfers', label: 'Stock transfers' },
        { key: 'stock-adjustments', label: 'Stock adjustments' },
        { key: 'stock-counts', label: 'Stock counts' },
        { key: 'inventory-overview', label: 'Inventory overview' },
        { key: 'inventory-settings', label: 'Inventory settings' }
      ]
    },
    {
      group: 'Purchasing',
      color: 'orange',
      modules: [
        { key: 'purchase-requests', label: 'Purchase requests' },
        { key: 'rfqs', label: 'RFQs' },
        { key: 'purchase-orders', label: 'Purchase orders' },
        { key: 'goods-receipts', label: 'Goods receipts' },
        { key: 'purchase-invoices', label: 'Purchase invoices' },
        { key: 'purchase-credit-notes', label: 'Purchase credit notes' },
        { key: 'supplier-payments', label: 'Supplier payments' }
      ]
    },
    {
      group: 'Manufacturing',
      color: 'amber',
      modules: [
        { key: 'bill-of-materials', label: 'Bill of materials' },
        { key: 'routings', label: 'Routings' },
        { key: 'work-centers', label: 'Work centers' },
        { key: 'machines', label: 'Machines' },
        { key: 'production-plans', label: 'Production plans' },
        { key: 'manufacturing-orders', label: 'Manufacturing orders' },
        { key: 'work-orders', label: 'Work orders' }
      ]
    },
    {
      group: 'Sales',
      color: 'emerald',
      modules: [
        { key: 'leads', label: 'Leads' },
        { key: 'opportunities', label: 'Opportunities' },
        { key: 'quotations', label: 'Quotations' },
        { key: 'sales-orders', label: 'Sales orders' },
        { key: 'deliveries', label: 'Deliveries' },
        { key: 'invoices', label: 'Invoices' },
        { key: 'credit-notes', label: 'Credit notes' },
        { key: 'payments', label: 'Payments' }
      ]
    },
    {
      group: 'Accounting',
      color: 'indigo',
      modules: [
        { key: 'accounts', label: 'Chart of accounts' },
        { key: 'journals', label: 'Journals' },
        { key: 'journal-entries', label: 'Journal entries' },
        { key: 'posting-rules', label: 'Posting rules' },
        { key: 'bank-accounts', label: 'Bank & cash' },
        { key: 'cost-centers', label: 'Cost centers' },
        { key: 'fiscal-years', label: 'Fiscal years' },
        { key: 'accounting-periods', label: 'Accounting periods' },
        { key: 'fixed-assets', label: 'Fixed assets' },
        { key: 'tax-rates', label: 'Tax rates' },
        { key: 'collection-activities', label: 'Collection activities' }
      ]
    },
    {
      group: 'Reports & analytics',
      color: 'cyan',
      modules: [
        { key: 'dashboard', label: 'Dashboard' },
        { key: 'sales-reports', label: 'Sales reports' },
        { key: 'purchase-reports', label: 'Purchase reports' },
        { key: 'inventory-reports', label: 'Inventory reports' },
        { key: 'manufacturing-reports', label: 'Manufacturing reports' },
        { key: 'financial-reports', label: 'Financial reports' },
        { key: 'ar-reports', label: 'Accounts receivable reports' },
        { key: 'ap-reports', label: 'Accounts payable reports' },
        { key: 'payment-reports', label: 'Payment reports' },
        { key: 'tax-report', label: 'Tax report' }
      ]
    },
    {
      group: 'Point of sale',
      color: 'fuchsia',
      modules: [
        { key: 'registers', label: 'Registers' },
        { key: 'pos-sessions', label: 'POS sessions' },
        { key: 'pos-sales', label: 'POS sales' },
        { key: 'pos-exchanges', label: 'POS exchanges' },
        { key: 'pos-held-sales', label: 'POS held sales' }
      ]
    },
    {
      group: 'Administration',
      color: 'rose',
      modules: [
        { key: 'users', label: 'Users' },
        { key: 'custom-roles', label: 'Custom roles' },
        { key: 'audit-logs', label: 'Audit log' }
      ]
    }
  ]

  return { catalog }
}
