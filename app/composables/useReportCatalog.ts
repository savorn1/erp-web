import type { ReportTile } from '~/components/ReportCategoryCard.vue'

// Stamps every tile in a category with that category's accent color (see
// reportTileColors.ts) instead of repeating `color: 'x'` on every literal —
// one place to change a category's hue.
function withColor(color: string, tiles: Omit<ReportTile, 'color'>[]): ReportTile[] {
  return tiles.map((t) => ({ ...t, color }))
}

// Central list of every report's real route and metadata (icon/label/
// description) — shared by the /reports catalog page and by each report
// page's own breadcrumb, so a route/label never needs to be typed out twice.
export function useReportCatalog() {
  // Colors mirror SidebarNav's own group accents (Sales=emerald,
  // Purchasing=orange, Inventory=teal, Accounting=indigo) so a report's icon
  // ties back to its sidebar section at a glance.
  const salesReportTiles: ReportTile[] = withColor('emerald', [
    {
      to: '/reports/sales/summary',
      icon: 'i-lucide-bar-chart-3',
      label: 'Summary',
      description: 'Order count, total amount, and average order value, broken down by status.'
    },
    { to: '/reports/sales/by-product', icon: 'i-lucide-package', label: 'By product', description: 'Quantity sold and revenue per product.' },
    { to: '/reports/sales/by-customer', icon: 'i-lucide-users', label: 'By customer', description: 'Orders and revenue per customer.' },
    {
      to: '/reports/sales/by-salesperson',
      icon: 'i-lucide-user',
      label: 'By salesperson',
      description: 'Orders and revenue grouped by whoever created the sales order.'
    },
    { to: '/reports/sales/detail', icon: 'i-lucide-list', label: 'Detail', description: 'Every sold line, with unit price, discount, and tax broken out.' },
    { to: '/reports/sales/by-date', icon: 'i-lucide-calendar-days', label: 'By date', description: 'Order count and revenue per order date.' },
    {
      to: '/reports/sales/by-category',
      icon: 'i-lucide-tags',
      label: 'By product category',
      description: 'Quantity sold and revenue per product category.'
    },
    {
      to: '/reports/sales/by-customer-group',
      icon: 'i-lucide-users-round',
      label: 'By customer group',
      description: 'Orders and revenue per customer group.'
    },
    {
      to: '/reports/sales/by-warehouse',
      icon: 'i-lucide-warehouse',
      label: 'By warehouse',
      description: 'Orders and revenue per source warehouse.'
    },
    {
      to: '/reports/sales/cancellations',
      icon: 'i-lucide-ban',
      label: 'Cancellations',
      description: 'Cancelled orders and the revenue they would have represented.'
    },
    { to: '/reports/sales/discounts', icon: 'i-lucide-percent', label: 'Discounts', description: 'Every discounted line, with the discount amount given.' },
    {
      to: '/reports/sales/outstanding',
      icon: 'i-lucide-clock',
      label: 'Outstanding orders',
      description: 'Orders not yet fully delivered, with undelivered quantity and value.'
    },
    { to: '/reports/sales/by-brand', icon: 'i-lucide-badge', label: 'By brand', description: 'Quantity sold and revenue per product brand.' },
    {
      to: '/reports/sales/by-customer-type',
      icon: 'i-lucide-user-check',
      label: 'By customer type',
      description: 'Orders and revenue per customer type.'
    },
    {
      to: '/reports/sales/pending-orders',
      icon: 'i-lucide-hourglass',
      label: 'Pending orders',
      description: 'Orders in Draft or Submitted, still waiting on approval.'
    },
    {
      to: '/reports/sales/pending-deliveries',
      icon: 'i-lucide-package-search',
      label: 'Pending deliveries',
      description: 'Deliveries not yet shipped or completed.'
    },
    {
      to: '/reports/sales/outstanding-invoices',
      icon: 'i-lucide-receipt',
      label: 'Outstanding invoices',
      description: 'Approved invoices with a balance still owed, by days overdue.'
    },
    { to: '/reports/sales/monthly', icon: 'i-lucide-calendar', label: 'Monthly sales', description: 'Order count and revenue grouped by month.' },
    { to: '/reports/sales/yearly', icon: 'i-lucide-calendar-range', label: 'Yearly sales', description: 'Order count and revenue grouped by year.' },
    {
      to: '/reports/sales/growth',
      icon: 'i-lucide-trending-up',
      label: 'Growth',
      description: 'Revenue and order count for a period vs. the equivalent period before it.'
    }
  ])

  const salesExternalReportTiles: ReportTile[] = withColor('emerald', [
    { to: '/invoices', icon: 'i-lucide-receipt', label: 'Sales invoices', description: 'Invoices raised against sales orders.' },
    { to: '/sales-orders', icon: 'i-lucide-file-text', label: 'Sales orders', description: 'Every sales order and its status.' },
    { to: '/quotations', icon: 'i-lucide-file-text', label: 'Quotations', description: 'Quotations sent to customers.' },
    { to: '/deliveries', icon: 'i-lucide-truck', label: 'Deliveries', description: 'Deliveries fulfilled against sales orders.' }
  ])

  const purchaseReportTiles: ReportTile[] = withColor('orange', [
    {
      to: '/reports/purchase/summary',
      icon: 'i-lucide-bar-chart-3',
      label: 'Summary',
      description: 'Order count and total amount, broken down by status.'
    },
    { to: '/reports/purchase/by-supplier', icon: 'i-lucide-truck', label: 'By supplier', description: 'Orders and spend per supplier.' },
    { to: '/reports/purchase/by-product', icon: 'i-lucide-package', label: 'By product', description: 'Quantity purchased and spend per product.' },
    { to: '/reports/purchase/detail', icon: 'i-lucide-list', label: 'Detail', description: 'Every purchased line, with unit cost, discount, and tax broken out.' },
    { to: '/reports/purchase/by-date', icon: 'i-lucide-calendar-days', label: 'By date', description: 'Order count and spend per order date.' },
    {
      to: '/reports/purchase/by-category',
      icon: 'i-lucide-tags',
      label: 'By product category',
      description: 'Quantity purchased and spend per product category.'
    },
    { to: '/reports/purchase/by-brand', icon: 'i-lucide-badge', label: 'By brand', description: 'Quantity purchased and spend per product brand.' },
    { to: '/reports/purchase/by-uom', icon: 'i-lucide-ruler', label: 'By unit of measure', description: 'Quantity purchased and spend per unit of measure ordered.' },
    {
      to: '/reports/purchase/by-supplier-type',
      icon: 'i-lucide-user-check',
      label: 'By supplier type',
      description: 'Orders and spend per supplier type.'
    },
    { to: '/reports/purchase/by-warehouse', icon: 'i-lucide-warehouse', label: 'By warehouse', description: 'Orders and spend per receiving warehouse.' },
    {
      to: '/reports/purchase/pending-orders',
      icon: 'i-lucide-hourglass',
      label: 'Pending orders',
      description: 'Orders in Draft or Submitted, still waiting on approval.'
    },
    {
      to: '/reports/purchase/pending-goods-receipts',
      icon: 'i-lucide-package-search',
      label: 'Pending goods receipts',
      description: 'Receipts still awaiting quality check.'
    },
    {
      to: '/reports/purchase/outstanding-invoices',
      icon: 'i-lucide-receipt',
      label: 'Outstanding invoices',
      description: 'Approved supplier bills with a balance still owed, by days overdue.'
    },
    {
      to: '/reports/purchase/cancellations',
      icon: 'i-lucide-ban',
      label: 'Cancellations',
      description: 'Cancelled orders and the spend they would have represented.'
    },
    { to: '/reports/purchase/discounts', icon: 'i-lucide-percent', label: 'Discounts', description: 'Every discounted line, with the discount amount received.' },
    { to: '/reports/purchase/monthly', icon: 'i-lucide-calendar', label: 'Monthly purchases', description: 'Order count and spend grouped by month.' },
    { to: '/reports/purchase/yearly', icon: 'i-lucide-calendar-range', label: 'Yearly purchases', description: 'Order count and spend grouped by year.' },
    {
      to: '/reports/purchase/supplier-price-history',
      icon: 'i-lucide-history',
      label: 'Supplier price history',
      description: 'Every price paid to one supplier over time, across every product.'
    },
    {
      to: '/reports/purchase/product-price-history',
      icon: 'i-lucide-history',
      label: 'Product price history',
      description: 'Every price paid for one product over time, across every supplier.'
    },
    {
      to: '/reports/purchase/supplier-performance',
      icon: 'i-lucide-trending-up',
      label: 'Supplier performance',
      description: 'On-time delivery rate and average delay per supplier, from expected date to receipt.'
    }
  ])

  const purchaseExternalReportTiles: ReportTile[] = withColor('orange', [
    { to: '/purchase-requests', icon: 'i-lucide-clipboard-list', label: 'Purchase requisitions', description: 'Internal requests to purchase, before an RFQ or PO exists.' },
    { to: '/purchase-orders', icon: 'i-lucide-shopping-cart', label: 'Purchase orders', description: 'Every purchase order and its status.' },
    { to: '/goods-receipts', icon: 'i-lucide-package-check', label: 'Goods receipts', description: 'Goods received against purchase orders.' },
    { to: '/purchase-invoices', icon: 'i-lucide-receipt', label: 'Purchase invoices', description: 'Supplier invoices raised against purchase orders.' }
  ])

  const inventoryReportTiles: ReportTile[] = withColor('teal', [
    {
      to: '/reports/inventory/stock-report',
      icon: 'i-lucide-boxes',
      label: 'Stock report',
      description: 'On hand, available, and incoming quantity per product and warehouse.'
    },
    {
      to: '/reports/inventory/stock-movement',
      icon: 'i-lucide-history',
      label: 'Stock movement',
      description: 'Every stock change — receipts, issues, transfers, and adjustments.'
    },
    {
      to: '/reports/inventory/stock-valuation',
      icon: 'i-lucide-landmark',
      label: 'Stock valuation',
      description: 'Total quantity and value on hand, by warehouse.'
    },
    { to: '/reports/inventory/low-stock', icon: 'i-lucide-triangle-alert', label: 'Low stock', description: 'Products below their reorder point.' }
  ])

  const accountingReportTiles: ReportTile[] = withColor('indigo', [
    {
      to: '/reports/accounting/trial-balance',
      icon: 'i-lucide-scale',
      label: 'Trial balance',
      description: 'Debit and credit balances for every account, as of a date.'
    },
    {
      to: '/reports/accounting/general-ledger',
      icon: 'i-lucide-book-text',
      label: 'General ledger',
      description: 'Every posted line for one account, with a running balance.'
    },
    {
      to: '/reports/accounting/balance-sheet',
      icon: 'i-lucide-landmark',
      label: 'Balance sheet',
      description: 'Assets, liabilities, and equity as of a date.'
    },
    {
      to: '/reports/accounting/profit-and-loss',
      icon: 'i-lucide-trending-up',
      label: 'Profit & loss',
      description: 'Revenue, expenses, and net income for a period.'
    },
    {
      to: '/reports/accounting/cash-flow',
      icon: 'i-lucide-banknote',
      label: 'Cash flow',
      description: 'Opening/closing balance and net change per bank account.'
    },
    {
      to: '/reports/accounting/ar-aging',
      icon: 'i-lucide-arrow-down-to-line',
      label: 'AR aging',
      description: 'Outstanding customer invoices by age bucket.'
    },
    {
      to: '/reports/accounting/ap-aging',
      icon: 'i-lucide-arrow-up-from-line',
      label: 'AP aging',
      description: 'Outstanding supplier bills by age bucket.'
    },
    { to: '/reports/accounting/tax-report', icon: 'i-lucide-receipt', label: 'Tax report', description: 'Output and input tax by rate, for a period.' },
    {
      to: '/reports/accounting/statement-of-changes-in-equity',
      icon: 'i-lucide-trending-up',
      label: 'Statement of changes in equity',
      description: 'Beginning equity, net income, and other equity changes for a period.'
    }
  ])

  const accountingExternalReportTiles: ReportTile[] = withColor('indigo', [
    { to: '/chart-of-accounts', icon: 'i-lucide-book-open', label: 'Chart of accounts', description: 'Every account and its type, code, and hierarchy.' },
    { to: '/journal-entries', icon: 'i-lucide-book-text', label: 'Journal entries', description: 'Every journal entry, draft or posted, with its lines.' },
    { to: '/accounts-receivable', icon: 'i-lucide-wallet', label: 'Accounts receivable', description: 'Outstanding customer invoices and balances.' },
    { to: '/accounts-payable', icon: 'i-lucide-landmark', label: 'Accounts payable', description: 'Outstanding supplier bills and balances.' }
  ])

  return {
    salesReportTiles,
    salesExternalReportTiles,
    purchaseReportTiles,
    purchaseExternalReportTiles,
    inventoryReportTiles,
    accountingReportTiles,
    accountingExternalReportTiles
  }
}
