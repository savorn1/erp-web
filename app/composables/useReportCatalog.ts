import type { ReportTile } from '~/components/ReportCategoryCard.vue'

// Central list of every report's real route and metadata (icon/label/
// description) — shared by the /reports catalog page and by each report
// page's own breadcrumb, so a route/label never needs to be typed out twice.
export function useReportCatalog() {
  const salesReportTiles: ReportTile[] = [
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
    }
  ]

  const salesExternalReportTiles: ReportTile[] = [
    { to: '/invoices', icon: 'i-lucide-receipt', label: 'Sales invoices', description: 'Invoices raised against sales orders.' },
    { to: '/sales-orders', icon: 'i-lucide-file-text', label: 'Sales orders', description: 'Every sales order and its status.' },
    { to: '/quotations', icon: 'i-lucide-file-text', label: 'Quotations', description: 'Quotations sent to customers.' },
    { to: '/deliveries', icon: 'i-lucide-truck', label: 'Deliveries', description: 'Deliveries fulfilled against sales orders.' }
  ]

  const purchaseReportTiles: ReportTile[] = [
    {
      to: '/reports/purchase/summary',
      icon: 'i-lucide-bar-chart-3',
      label: 'Summary',
      description: 'Order count and total amount, broken down by status.'
    },
    { to: '/reports/purchase/by-supplier', icon: 'i-lucide-truck', label: 'By supplier', description: 'Orders and spend per supplier.' },
    { to: '/reports/purchase/by-product', icon: 'i-lucide-package', label: 'By product', description: 'Quantity purchased and spend per product.' }
  ]

  const inventoryReportTiles: ReportTile[] = [
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
  ]

  const accountingReportTiles: ReportTile[] = [
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
    { to: '/reports/accounting/tax-report', icon: 'i-lucide-receipt', label: 'Tax report', description: 'Output and input tax by rate, for a period.' }
  ]

  const accountingExternalReportTiles: ReportTile[] = [
    { to: '/accounts-receivable', icon: 'i-lucide-wallet', label: 'Accounts receivable', description: 'Outstanding customer invoices and balances.' },
    { to: '/accounts-payable', icon: 'i-lucide-landmark', label: 'Accounts payable', description: 'Outstanding supplier bills and balances.' }
  ]

  return { salesReportTiles, salesExternalReportTiles, purchaseReportTiles, inventoryReportTiles, accountingReportTiles, accountingExternalReportTiles }
}
