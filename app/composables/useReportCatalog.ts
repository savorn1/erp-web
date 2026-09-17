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
    {
      to: '/reports/purchase/detail',
      icon: 'i-lucide-list',
      label: 'Detail',
      description: 'Every purchased line, with unit cost, discount, and tax broken out.'
    },
    { to: '/reports/purchase/by-date', icon: 'i-lucide-calendar-days', label: 'By date', description: 'Order count and spend per order date.' },
    {
      to: '/reports/purchase/by-category',
      icon: 'i-lucide-tags',
      label: 'By product category',
      description: 'Quantity purchased and spend per product category.'
    },
    { to: '/reports/purchase/by-brand', icon: 'i-lucide-badge', label: 'By brand', description: 'Quantity purchased and spend per product brand.' },
    {
      to: '/reports/purchase/by-uom',
      icon: 'i-lucide-ruler',
      label: 'By unit of measure',
      description: 'Quantity purchased and spend per unit of measure ordered.'
    },
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
    {
      to: '/reports/purchase/discounts',
      icon: 'i-lucide-percent',
      label: 'Discounts',
      description: 'Every discounted line, with the discount amount received.'
    },
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
    {
      to: '/purchase-requests',
      icon: 'i-lucide-clipboard-list',
      label: 'Purchase requisitions',
      description: 'Internal requests to purchase, before an RFQ or PO exists.'
    },
    { to: '/purchase-orders', icon: 'i-lucide-shopping-cart', label: 'Purchase orders', description: 'Every purchase order and its status.' },
    { to: '/goods-receipts', icon: 'i-lucide-package-check', label: 'Goods receipts', description: 'Goods received against purchase orders.' },
    { to: '/purchase-invoices', icon: 'i-lucide-receipt', label: 'Purchase invoices', description: 'Supplier invoices raised against purchase orders.' }
  ])

  const inventoryReportTiles: ReportTile[] = withColor('teal', [
    {
      to: '/reports/inventory/stock-report',
      icon: 'i-lucide-boxes',
      label: 'Stock summary',
      description: 'On hand, available, and incoming quantity per product and warehouse.'
    },
    {
      to: '/reports/inventory/stock-detail',
      icon: 'i-lucide-package-2',
      label: 'Stock detail',
      description: 'Bin-level on-hand quantity per product and warehouse.'
    },
    {
      to: '/reports/inventory/stock-movement',
      icon: 'i-lucide-history',
      label: 'Stock movement',
      description: 'Every stock change — receipts, issues, transfers, and adjustments.'
    },
    {
      to: '/reports/inventory/stock-ledger',
      icon: 'i-lucide-book-text',
      label: 'Stock ledger',
      description: 'Chronological stock movements for a product, with a running balance.'
    },
    { to: '/reports/inventory/stock-in', icon: 'i-lucide-log-in', label: 'Stock in', description: 'Inbound quantity per product and warehouse.' },
    { to: '/reports/inventory/stock-out', icon: 'i-lucide-log-out', label: 'Stock out', description: 'Outbound quantity per product and warehouse.' },
    {
      to: '/reports/inventory/stock-in-out-summary',
      icon: 'i-lucide-arrow-left-right',
      label: 'Stock in/out summary',
      description: 'Inbound and outbound quantity side by side, with net change, per product and warehouse.'
    },
    {
      to: '/reports/inventory/stock-roll-forward',
      icon: 'i-lucide-list-restart',
      label: 'Stock roll-forward',
      description: 'Beginning balance, in, out, adjustments, and ending balance per product and warehouse.'
    },
    {
      to: '/reports/inventory/stock-transfer',
      icon: 'i-lucide-repeat',
      label: 'Stock transfer',
      description: 'Every stock transfer between warehouses and its status.'
    },
    {
      to: '/reports/inventory/stock-adjustment',
      icon: 'i-lucide-scale',
      label: 'Stock adjustment',
      description: 'Every stock adjustment request and its approval status.'
    },
    {
      to: '/reports/inventory/stock-opening',
      icon: 'i-lucide-log-in',
      label: 'Stock opening',
      description: 'Quantity on hand at the start of a date range.'
    },
    { to: '/reports/inventory/stock-closing', icon: 'i-lucide-log-out', label: 'Stock closing', description: 'Quantity on hand as of the end of a date.' },
    {
      to: '/reports/inventory/stock-valuation',
      icon: 'i-lucide-landmark',
      label: 'Stock valuation',
      description: 'Total quantity and value on hand, by warehouse.'
    },
    {
      to: '/reports/inventory/stock-aging',
      icon: 'i-lucide-clock',
      label: 'Stock aging',
      description: 'Current stock bucketed by days since it was last received.'
    },
    {
      to: '/reports/inventory/batch-lot-stock',
      icon: 'i-lucide-package-2',
      label: 'Batch / lot stock',
      description: 'Current quantity per batch/lot, aggregated across every warehouse.'
    },
    {
      to: '/reports/inventory/serial-number-stock',
      icon: 'i-lucide-scan-barcode',
      label: 'Serial number stock',
      description: 'Every individually-tracked unit currently in stock.'
    },
    {
      to: '/reports/inventory/expiry-stock',
      icon: 'i-lucide-calendar-x',
      label: 'Expiry stock',
      description: 'Batches with an expiration date, soonest first.'
    },
    { to: '/reports/inventory/low-stock', icon: 'i-lucide-triangle-alert', label: 'Low stock', description: 'Products below their reorder point.' },
    {
      to: '/reports/inventory/out-of-stock',
      icon: 'i-lucide-package-x',
      label: 'Out of stock',
      description: 'Products with zero or negative on-hand quantity.'
    },
    { to: '/reports/inventory/overstock', icon: 'i-lucide-triangle-alert', label: 'Overstock', description: 'Products above their max stock threshold.' },
    {
      to: '/reports/inventory/fast-moving',
      icon: 'i-lucide-trending-up',
      label: 'Fast moving stock',
      description: 'Products with the highest outbound quantity over a trailing window.'
    },
    {
      to: '/reports/inventory/slow-moving',
      icon: 'i-lucide-turtle',
      label: 'Slow moving stock',
      description: 'Products with the least outbound activity over a trailing window.'
    },
    {
      to: '/reports/inventory/dead-stock',
      icon: 'i-lucide-ban',
      label: 'Dead stock',
      description: 'Products on hand with zero outbound activity over a trailing window.'
    },
    {
      to: '/reports/inventory/negative-stock',
      icon: 'i-lucide-circle-alert',
      label: 'Negative stock',
      description: 'A data-integrity check — should normally be empty.'
    },
    {
      to: '/reports/inventory/inventory-count',
      icon: 'i-lucide-clipboard-check',
      label: 'Inventory count',
      description: 'Every physical stock count, with how many lines had a variance.'
    },
    {
      to: '/reports/inventory/stock-variance',
      icon: 'i-lucide-git-compare',
      label: 'Stock variance',
      description: 'Counted lines where the physical count differed from the system quantity.'
    },
    {
      to: '/reports/inventory/warehouse-stock',
      icon: 'i-lucide-warehouse',
      label: 'Warehouse stock',
      description: 'On-hand quantity and value totalled per warehouse.'
    },
    {
      to: '/reports/inventory/location-stock',
      icon: 'i-lucide-map-pin',
      label: 'Location stock',
      description: 'On-hand quantity totalled per bin/location.'
    },
    {
      to: '/reports/inventory/product-stock',
      icon: 'i-lucide-package',
      label: 'Product stock',
      description: 'On-hand quantity and value per product, across every warehouse.'
    },
    {
      to: '/reports/inventory/product-category-stock',
      icon: 'i-lucide-tags',
      label: 'Product category stock',
      description: 'On-hand quantity and value totalled per product category.'
    },
    {
      to: '/reports/inventory/product-variant-stock',
      icon: 'i-lucide-badge',
      label: 'Product variant stock',
      description: "Every variant alongside its parent product's total on-hand stock."
    },
    { to: '/reports/inventory/uom-stock', icon: 'i-lucide-ruler', label: 'UOM stock', description: 'On-hand quantity totalled per unit of measure.' },
    {
      to: '/reports/inventory/stock-by-customer',
      icon: 'i-lucide-users',
      label: 'Stock by customer',
      description: 'Quantity on open sales orders per customer.'
    },
    {
      to: '/reports/inventory/stock-by-supplier',
      icon: 'i-lucide-truck',
      label: 'Stock by supplier',
      description: 'Quantity on open purchase orders per supplier.'
    },
    {
      to: '/reports/inventory/stock-by-warehouse',
      icon: 'i-lucide-warehouse',
      label: 'Stock by warehouse',
      description: 'Same data as Warehouse Stock.'
    },
    {
      to: '/reports/inventory/stock-by-location',
      icon: 'i-lucide-map-pin',
      label: 'Stock by location',
      description: 'Same data as Location Stock.'
    },
    {
      to: '/reports/inventory/stock-by-batch-lot',
      icon: 'i-lucide-package-2',
      label: 'Stock by batch / lot',
      description: 'Same data as Batch/Lot Stock.'
    },
    {
      to: '/reports/inventory/stock-by-serial-number',
      icon: 'i-lucide-scan-barcode',
      label: 'Stock by serial number',
      description: 'Same data as Serial Number Stock.'
    },
    {
      to: '/reports/inventory/stock-cost',
      icon: 'i-lucide-circle-dollar-sign',
      label: 'Stock cost',
      description: 'Unit cost and total inventory cost per product.'
    },
    {
      to: '/reports/inventory/stock-profitability',
      icon: 'i-lucide-piggy-bank',
      label: 'Stock profitability',
      description: 'Revenue, cost, and gross profit per product for a period.'
    },
    {
      to: '/reports/inventory/inventory-performance',
      icon: 'i-lucide-gauge',
      label: 'Inventory performance',
      description: 'Turnover ratio per product for a period.'
    }
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
    { to: '/reports/accounting/tax-detail', icon: 'i-lucide-list-checks', label: 'Tax detail', description: 'Every taxed invoice line, output and input.' },
    {
      to: '/reports/accounting/tax-by-customer',
      icon: 'i-lucide-users',
      label: 'Tax by customer',
      description: 'Output tax collected per customer, for a period.'
    },
    { to: '/reports/accounting/tax-by-supplier', icon: 'i-lucide-truck', label: 'Tax by supplier', description: 'Input tax paid per supplier, for a period.' },
    {
      to: '/reports/accounting/tax-by-product',
      icon: 'i-lucide-package',
      label: 'Tax by product',
      description: 'Output and input tax attributed to each product.'
    },
    {
      to: '/reports/accounting/statement-of-changes-in-equity',
      icon: 'i-lucide-trending-up',
      label: 'Statement of changes in equity',
      description: 'Beginning equity, net income, and other equity changes for a period.'
    },
    {
      to: '/reports/accounting/depreciation-schedule',
      icon: 'i-lucide-trending-down',
      label: 'Depreciation schedule',
      description: 'Period-by-period depreciation posted per fixed asset.'
    }
  ])

  const accountingExternalReportTiles: ReportTile[] = withColor('indigo', [
    { to: '/chart-of-accounts', icon: 'i-lucide-book-open', label: 'Chart of accounts', description: 'Every account and its type, code, and hierarchy.' },
    { to: '/journal-entries', icon: 'i-lucide-book-text', label: 'Journal entries', description: 'Every journal entry, draft or posted, with its lines.' },
    { to: '/accounts-receivable', icon: 'i-lucide-wallet', label: 'Accounts receivable', description: 'Outstanding customer invoices and balances.' },
    { to: '/accounts-payable', icon: 'i-lucide-landmark', label: 'Accounts payable', description: 'Outstanding supplier bills and balances.' }
  ])

  const arReportTiles: ReportTile[] = withColor('indigo', [
    {
      to: '/reports/accounts-receivable/summary',
      icon: 'i-lucide-bar-chart-3',
      label: 'AR summary',
      description: 'Total outstanding and overdue receivables, as of a date.'
    },
    { to: '/reports/accounts-receivable/detail', icon: 'i-lucide-list', label: 'AR detail', description: 'Every line of every currently-outstanding invoice.' },
    {
      to: '/reports/accounts-receivable/customer-balance',
      icon: 'i-lucide-users',
      label: 'Customer balance',
      description: 'Outstanding balance per customer, as of a date.'
    },
    {
      to: '/reports/accounts-receivable/customer-statement',
      icon: 'i-lucide-book-text',
      label: 'Customer statement',
      description: "One customer's invoices, payments, and credit notes over a period, with a running balance."
    },
    {
      to: '/reports/accounts-receivable/collections',
      icon: 'i-lucide-hand-coins',
      label: 'Collections',
      description: 'Payments received from customers during a period.'
    },
    {
      to: '/reports/accounts-receivable/bad-debt',
      icon: 'i-lucide-triangle-alert',
      label: 'Bad debt',
      description: 'Outstanding invoices overdue beyond a threshold, worth reviewing for write-off.'
    },
    {
      to: '/reports/accounts-receivable/credit-notes',
      icon: 'i-lucide-receipt',
      label: 'Credit notes',
      description: 'Every credit note issued against a customer invoice.'
    }
  ])

  const arExternalReportTiles: ReportTile[] = withColor('indigo', [
    { to: '/reports/accounting/ar-aging', icon: 'i-lucide-arrow-down-to-line', label: 'AR aging', description: 'Outstanding customer invoices by age bucket.' },
    {
      to: '/reports/sales/outstanding-invoices',
      icon: 'i-lucide-receipt',
      label: 'Outstanding invoices',
      description: 'Approved invoices with a balance still owed, by days overdue — same data as Overdue Invoice, sorted oldest-first.'
    },
    { to: '/payments', icon: 'i-lucide-banknote', label: 'Customer payments', description: 'Every payment received from a customer.' }
  ])

  const apReportTiles: ReportTile[] = withColor('orange', [
    {
      to: '/reports/accounts-payable/summary',
      icon: 'i-lucide-bar-chart-3',
      label: 'AP summary',
      description: 'Total outstanding and overdue payables, as of a date.'
    },
    {
      to: '/reports/accounts-payable/detail',
      icon: 'i-lucide-list',
      label: 'AP detail',
      description: 'Every line of every currently-outstanding purchase invoice.'
    },
    {
      to: '/reports/accounts-payable/supplier-balance',
      icon: 'i-lucide-truck',
      label: 'Supplier balance',
      description: 'Outstanding balance per supplier, as of a date.'
    },
    {
      to: '/reports/accounts-payable/supplier-statement',
      icon: 'i-lucide-book-text',
      label: 'Supplier statement',
      description: "One supplier's invoices, payments, and credit notes over a period, with a running balance."
    },
    {
      to: '/reports/accounts-payable/payments',
      icon: 'i-lucide-banknote',
      label: 'Payments made',
      description: 'Payments made to suppliers during a period.'
    },
    {
      to: '/reports/accounts-payable/debit-notes',
      icon: 'i-lucide-receipt',
      label: 'Debit notes',
      description: 'Every credit note received from a supplier against a purchase invoice.'
    }
  ])

  const apExternalReportTiles: ReportTile[] = withColor('orange', [
    { to: '/reports/accounting/ap-aging', icon: 'i-lucide-arrow-up-from-line', label: 'AP aging', description: 'Outstanding supplier bills by age bucket.' },
    {
      to: '/reports/purchase/outstanding-invoices',
      icon: 'i-lucide-receipt',
      label: 'Outstanding invoices',
      description: 'Approved supplier bills with a balance still owed, by days overdue — same data as Overdue Invoice, sorted oldest-first.'
    },
    { to: '/supplier-payments', icon: 'i-lucide-banknote', label: 'Supplier payments', description: 'Every payment made to a supplier.' }
  ])

  const manufacturingReportTiles: ReportTile[] = withColor('amber', [
    {
      to: '/reports/manufacturing/summary',
      icon: 'i-lucide-bar-chart-3',
      label: 'Summary',
      description: 'Order count, planned/produced/scrap quantity, broken down by status.'
    },
    {
      to: '/reports/manufacturing/material-consumption',
      icon: 'i-lucide-boxes',
      label: 'Material consumption',
      description: 'Raw materials drawn from stock, per component.'
    },
    {
      to: '/reports/manufacturing/production-output',
      icon: 'i-lucide-package-check',
      label: 'Production output',
      description: 'Finished goods produced by completed orders, per product.'
    },
    {
      to: '/reports/manufacturing/scrap-wastage',
      icon: 'i-lucide-trash-2',
      label: 'Scrap & wastage',
      description: 'Completed orders that scrapped finished-good units.'
    },
    {
      to: '/reports/manufacturing/cost',
      icon: 'i-lucide-calculator',
      label: 'Manufacturing cost',
      description: 'Material, labor, and overhead cost per completed order.'
    },
    {
      to: '/reports/manufacturing/rejections',
      icon: 'i-lucide-shield-x',
      label: 'Rejections',
      description: 'Finished-good batches rejected at quality control.'
    },
    {
      to: '/reports/manufacturing/material-requirements',
      icon: 'i-lucide-package-search',
      label: 'Material requirements',
      description: 'Outstanding material needed across open orders, for procurement planning.'
    },
    {
      to: '/reports/manufacturing/bom-cost',
      icon: 'i-lucide-list-tree',
      label: 'BOM cost',
      description: 'Standard material cost of every active recipe, live from current component costs.'
    },
    {
      to: '/reports/manufacturing/cost-variance',
      icon: 'i-lucide-scale',
      label: 'Cost variance',
      description: 'Standard vs. actual material cost per order.'
    },
    {
      to: '/reports/manufacturing/production-time',
      icon: 'i-lucide-timer',
      label: 'Production time',
      description: 'Actual cycle time for every completed order.'
    },
    {
      to: '/reports/manufacturing/quality-pass-fail',
      icon: 'i-lucide-badge-check',
      label: 'Quality pass/fail',
      description: 'Inspection pass rate, per product.'
    },
    {
      to: '/reports/manufacturing/plan-vs-actual',
      icon: 'i-lucide-target',
      label: 'Plan vs actual',
      description: 'Planned vs produced quantity, achievement rate, and yield.'
    },
    {
      to: '/reports/manufacturing/production-trend',
      icon: 'i-lucide-trending-up',
      label: 'Production trend',
      description: 'Completed order count and quantity produced, by month.'
    },
    {
      to: '/reports/manufacturing/profitability',
      icon: 'i-lucide-piggy-bank',
      label: 'Profitability',
      description: 'Selling price vs. manufacturing cost, per product.'
    },
    {
      to: '/reports/manufacturing/work-center-utilization',
      icon: 'i-lucide-factory',
      label: 'Work center utilization',
      description: 'Hours logged against completed work orders, per work center.'
    },
    {
      to: '/reports/manufacturing/machine-utilization',
      icon: 'i-lucide-cog',
      label: 'Machine utilization',
      description: 'Hours logged against completed work orders, per machine.'
    },
    {
      to: '/reports/manufacturing/operation-performance',
      icon: 'i-lucide-route',
      label: 'Operation performance',
      description: 'Standard vs. actual time per operation.'
    },
    {
      to: '/reports/manufacturing/machine-cost',
      icon: 'i-lucide-cog',
      label: 'Machine cost',
      description: "Hours logged x each machine's cost per hour."
    }
  ])

  const manufacturingExternalReportTiles: ReportTile[] = withColor('amber', [
    { to: '/bill-of-materials', icon: 'i-lucide-list-tree', label: 'Bill of materials', description: 'Every recipe, versioned, and its component list.' },
    { to: '/routings', icon: 'i-lucide-route', label: 'Routings', description: 'The shop-floor operation sequence behind each BOM.' },
    { to: '/work-centers', icon: 'i-lucide-factory', label: 'Work centers', description: 'Production areas that routing operations run in.' },
    { to: '/machines', icon: 'i-lucide-cog', label: 'Machines', description: 'Equipment assigned to work centers.' },
    { to: '/production-plans', icon: 'i-lucide-calendar-range', label: 'Production plans', description: 'Groups of manufacturing orders planned over a period.' },
    { to: '/manufacturing-orders', icon: 'i-lucide-clipboard-list', label: 'Manufacturing orders', description: 'Every manufacturing order and its status.' },
    { to: '/work-orders', icon: 'i-lucide-list-ordered', label: 'Work order report', description: 'Every shop-floor operation step, across all orders.' }
  ])

  // Cross-ledger payment reports (customer + supplier payments + bank).
  // Indigo like AR — they sit under Accounting in the sidebar.
  const paymentReportTiles: ReportTile[] = withColor('indigo', [
    { to: '/reports/payments/summary', icon: 'i-lucide-bar-chart-3', label: 'Summary', description: 'Received, paid out, refunded, and net cash flow for a period.' },
    { to: '/reports/payments/detail', icon: 'i-lucide-list', label: 'Detail', description: 'Every customer and supplier payment, merged into one ledger.' },
    {
      to: '/reports/payments/detail?party=CUSTOMER&type=PAYMENT',
      icon: 'i-lucide-hand-coins',
      label: 'Receipts',
      description: 'Money received from customers (refunds excluded).'
    },
    { to: '/reports/payments/detail?method=CASH', icon: 'i-lucide-wallet', label: 'Cash payments', description: 'Both ledgers, cash method only.' },
    {
      to: '/reports/payments/detail?method=BANK_TRANSFER',
      icon: 'i-lucide-landmark',
      label: 'Bank payments',
      description: 'Both ledgers, bank transfer method only.'
    },
    { to: '/reports/payments/by-method', icon: 'i-lucide-credit-card', label: 'By method', description: 'Count and net amount per payment method.' },
    {
      to: '/reports/payments/by-branch',
      icon: 'i-lucide-map-pin',
      label: 'By branch',
      description: 'Attributed to the branch of the user who recorded each payment.'
    },
    { to: '/reports/payments/refunds', icon: 'i-lucide-undo-2', label: 'Refunds', description: 'Refunds issued to customers and received from suppliers.' },
    { to: '/reports/payments/transfers', icon: 'i-lucide-arrow-left-right', label: 'Transfers', description: 'Money moved between bank and cash accounts.' },
    {
      to: '/reports/payments/collection-by-customer',
      icon: 'i-lucide-users',
      label: 'Collection by customer',
      description: 'Received, refunded, and net per customer.'
    },
    {
      to: '/reports/payments/collection-by-salesperson',
      icon: 'i-lucide-user',
      label: 'Collection by salesperson',
      description: 'Collected amounts attributed to whoever created the underlying order.'
    },
    {
      to: '/reports/payments/reconciliation',
      icon: 'i-lucide-git-compare',
      label: 'Payment reconciliation',
      description: 'Bank-method payments vs. bank deposits/withdrawals, plus reconciled status per account.'
    }
  ])

  const paymentExternalReportTiles: ReportTile[] = withColor('indigo', [
    { to: '/reports/accounts-receivable/collections', icon: 'i-lucide-hand-coins', label: 'Customer payments', description: 'The AR collections report.' },
    { to: '/reports/accounts-payable/payments', icon: 'i-lucide-banknote', label: 'Supplier payments', description: 'The AP payments-made report.' },
    {
      to: '/reports/sales/outstanding-invoices',
      icon: 'i-lucide-receipt',
      label: 'Outstanding & overdue collection',
      description: 'Approved invoices with a balance still owed, by days overdue.'
    },
    { to: '/reports/accounting/ar-aging', icon: 'i-lucide-arrow-down-to-line', label: 'Collection aging', description: 'Outstanding customer invoices by age bucket.' },
    { to: '/payments', icon: 'i-lucide-hand-coins', label: 'Payment register', description: 'Every customer payment and refund.' },
    { to: '/supplier-payments', icon: 'i-lucide-banknote', label: 'Supplier payment register', description: 'Every supplier payment and refund.' },
    { to: '/bank-accounts', icon: 'i-lucide-landmark', label: 'Bank & cash', description: 'Accounts, transactions, and bank reconciliation.' }
  ])

  // Single source of truth for which <ReportCategoryCard :id="..."> section
  // a given report route lives under — shared by the reports index page
  // (which renders each section with this same id) and ReportBackButton
  // (which uses it to jump straight back to the right one instead of
  // landing at the top of a very long page every time).
  const sectionTiles: Record<string, ReportTile[]> = {
    sales: salesReportTiles,
    'more-sales': salesExternalReportTiles,
    purchase: purchaseReportTiles,
    'more-purchase': purchaseExternalReportTiles,
    inventory: inventoryReportTiles,
    accounting: accountingReportTiles,
    'more-accounting': accountingExternalReportTiles,
    ar: arReportTiles,
    'more-ar': arExternalReportTiles,
    ap: apReportTiles,
    'more-ap': apExternalReportTiles,
    manufacturing: manufacturingReportTiles,
    'more-manufacturing': manufacturingExternalReportTiles,
    payments: paymentReportTiles,
    'more-payments': paymentExternalReportTiles
  }
  function sectionIdForPath(path: string): string | undefined {
    for (const [id, tiles] of Object.entries(sectionTiles)) {
      if (tiles.some((t) => t.to === path)) return id
    }
    return undefined
  }

  return {
    salesReportTiles,
    salesExternalReportTiles,
    purchaseReportTiles,
    purchaseExternalReportTiles,
    inventoryReportTiles,
    accountingReportTiles,
    accountingExternalReportTiles,
    arReportTiles,
    arExternalReportTiles,
    apReportTiles,
    apExternalReportTiles,
    manufacturingReportTiles,
    manufacturingExternalReportTiles,
    paymentReportTiles,
    paymentExternalReportTiles,
    sectionIdForPath
  }
}
