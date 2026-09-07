<template>
  <div>
    <div class="mb-4">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
    </div>

    <UTabs v-model="section" :items="sectionTabs" :content="false" class="mb-4" />

    <!-- ═══════════════════ SALES ═══════════════════ -->
    <template v-if="section === 'sales'">
      <UTabs v-model="salesTab" :items="salesTabs" :content="false" class="mb-4" />
      <UCard class="mb-4">
        <div class="flex flex-wrap items-end gap-3">
          <UFormField label="Company">
            <USelect v-model="companyId" :items="activeCompanyOptions" placeholder="All companies" class="w-52" />
          </UFormField>
          <UFormField label="From">
            <UInput v-model="dateFrom" type="date" class="w-40" />
          </UFormField>
          <UFormField label="To">
            <UInput v-model="dateTo" type="date" class="w-40" />
          </UFormField>
          <UFormField label="Status">
            <USelect v-model="salesStatus" :items="salesStatusOptions" placeholder="All except cancelled" class="w-44" />
          </UFormField>
        </div>
      </UCard>

      <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />
      <div v-if="loading" class="text-sm text-gray-400 py-8 text-center">Loading…</div>

      <template v-else-if="salesTab === 'summary' && salesSummary">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <UCard>
            <p class="text-xs text-gray-400">Orders</p>
            <p class="text-xl font-semibold text-gray-900 dark:text-white">{{ salesSummary.orderCount }}</p>
          </UCard>
          <UCard>
            <p class="text-xs text-gray-400">Total amount</p>
            <p class="text-xl font-semibold text-gray-900 dark:text-white">{{ formatCurrency(salesSummary.totalAmount) }}</p>
          </UCard>
          <UCard>
            <p class="text-xs text-gray-400">Average order value</p>
            <p class="text-xl font-semibold text-gray-900 dark:text-white">{{ formatCurrency(salesSummary.averageOrderValue) }}</p>
          </UCard>
        </div>
        <UCard>
          <template #header><h2 class="text-sm font-semibold text-gray-900 dark:text-white">By status</h2></template>
          <EmptyState v-if="salesSummary.byStatus.length === 0" icon="i-lucide-check-circle" title="No orders in this period" />
          <table v-else class="w-full text-sm">
            <thead>
              <tr class="text-left text-xs text-gray-400 border-b border-gray-200 dark:border-gray-800">
                <th class="py-2 pr-3">Status</th>
                <th class="py-2 px-3 text-right">Orders</th>
                <th class="py-2 pl-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in salesSummary.byStatus" :key="row.status" class="border-b border-gray-100 dark:border-gray-800/60">
                <td class="py-1.5 pr-3"><StatusBadge :status="row.status" /></td>
                <td class="py-1.5 px-3 text-right text-gray-600 dark:text-gray-300">{{ row.orderCount }}</td>
                <td class="py-1.5 pl-3 text-right text-gray-900 dark:text-white">{{ formatCurrency(row.totalAmount) }}</td>
              </tr>
            </tbody>
          </table>
        </UCard>
      </template>

      <UCard v-else-if="salesTab === 'by-product' && salesByProduct">
        <EmptyState v-if="salesByProduct.rows.length === 0" icon="i-lucide-check-circle" title="No sales in this period" />
        <table v-else class="w-full text-sm">
          <thead>
            <tr class="text-left text-xs text-gray-400 border-b border-gray-200 dark:border-gray-800">
              <th class="py-2 pr-3">Product</th>
              <th class="py-2 px-3 text-right">Quantity</th>
              <th class="py-2 pl-3 text-right">Revenue</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in salesByProduct.rows" :key="row.productId" class="border-b border-gray-100 dark:border-gray-800/60">
              <td class="py-1.5 pr-3 text-gray-900 dark:text-white">{{ row.productName }} ({{ row.productSku }})</td>
              <td class="py-1.5 px-3 text-right text-gray-600 dark:text-gray-300">{{ row.quantity }}</td>
              <td class="py-1.5 pl-3 text-right font-medium text-gray-900 dark:text-white">{{ formatCurrency(row.revenue) }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="border-t-2 border-gray-200 dark:border-gray-800 font-medium">
              <td class="py-2 pr-3">Total</td>
              <td class="py-2 px-3 text-right">{{ salesByProduct.totalQuantity }}</td>
              <td class="py-2 pl-3 text-right">{{ formatCurrency(salesByProduct.totalRevenue) }}</td>
            </tr>
          </tfoot>
        </table>
      </UCard>

      <UCard v-else-if="salesTab === 'by-customer' && salesByCustomer">
        <EmptyState v-if="salesByCustomer.rows.length === 0" icon="i-lucide-check-circle" title="No sales in this period" />
        <table v-else class="w-full text-sm">
          <thead>
            <tr class="text-left text-xs text-gray-400 border-b border-gray-200 dark:border-gray-800">
              <th class="py-2 pr-3">Customer</th>
              <th class="py-2 px-3 text-right">Orders</th>
              <th class="py-2 pl-3 text-right">Revenue</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in salesByCustomer.rows" :key="row.customerId" class="border-b border-gray-100 dark:border-gray-800/60">
              <td class="py-1.5 pr-3 text-gray-900 dark:text-white">{{ row.customerName ?? '—' }}</td>
              <td class="py-1.5 px-3 text-right text-gray-600 dark:text-gray-300">{{ row.orderCount }}</td>
              <td class="py-1.5 pl-3 text-right font-medium text-gray-900 dark:text-white">{{ formatCurrency(row.revenue) }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="border-t-2 border-gray-200 dark:border-gray-800 font-medium">
              <td class="py-2 pr-3" colspan="2">Total</td>
              <td class="py-2 pl-3 text-right">{{ formatCurrency(salesByCustomer.totalRevenue) }}</td>
            </tr>
          </tfoot>
        </table>
      </UCard>

      <UCard v-else-if="salesTab === 'by-salesperson' && salesBySalesperson">
        <UAlert
          color="neutral"
          variant="subtle"
          class="mb-4"
          title="Grouped by order creator"
          description="There's no dedicated sales-rep assignment in the system — this groups by whoever created each sales order."
        />
        <EmptyState v-if="salesBySalesperson.rows.length === 0" icon="i-lucide-check-circle" title="No sales in this period" />
        <table v-else class="w-full text-sm">
          <thead>
            <tr class="text-left text-xs text-gray-400 border-b border-gray-200 dark:border-gray-800">
              <th class="py-2 pr-3">Created by</th>
              <th class="py-2 px-3 text-right">Orders</th>
              <th class="py-2 pl-3 text-right">Revenue</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in salesBySalesperson.rows" :key="row.salesperson" class="border-b border-gray-100 dark:border-gray-800/60">
              <td class="py-1.5 pr-3 text-gray-900 dark:text-white">{{ row.salesperson }}</td>
              <td class="py-1.5 px-3 text-right text-gray-600 dark:text-gray-300">{{ row.orderCount }}</td>
              <td class="py-1.5 pl-3 text-right font-medium text-gray-900 dark:text-white">{{ formatCurrency(row.revenue) }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="border-t-2 border-gray-200 dark:border-gray-800 font-medium">
              <td class="py-2 pr-3" colspan="2">Total</td>
              <td class="py-2 pl-3 text-right">{{ formatCurrency(salesBySalesperson.totalRevenue) }}</td>
            </tr>
          </tfoot>
        </table>
      </UCard>
    </template>

    <!-- ═══════════════════ PURCHASE ═══════════════════ -->
    <template v-else-if="section === 'purchase'">
      <UTabs v-model="purchaseTab" :items="purchaseTabs" :content="false" class="mb-4" />
      <UCard class="mb-4">
        <div class="flex flex-wrap items-end gap-3">
          <UFormField label="Company">
            <USelect v-model="companyId" :items="activeCompanyOptions" placeholder="All companies" class="w-52" />
          </UFormField>
          <UFormField label="From">
            <UInput v-model="dateFrom" type="date" class="w-40" />
          </UFormField>
          <UFormField label="To">
            <UInput v-model="dateTo" type="date" class="w-40" />
          </UFormField>
          <UFormField label="Status">
            <USelect v-model="purchaseStatus" :items="purchaseStatusOptions" placeholder="All except cancelled" class="w-44" />
          </UFormField>
        </div>
      </UCard>

      <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />
      <div v-if="loading" class="text-sm text-gray-400 py-8 text-center">Loading…</div>

      <template v-else-if="purchaseTab === 'summary' && purchaseSummary">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <UCard>
            <p class="text-xs text-gray-400">Orders</p>
            <p class="text-xl font-semibold text-gray-900 dark:text-white">{{ purchaseSummary.orderCount }}</p>
          </UCard>
          <UCard>
            <p class="text-xs text-gray-400">Total amount</p>
            <p class="text-xl font-semibold text-gray-900 dark:text-white">{{ formatCurrency(purchaseSummary.totalAmount) }}</p>
          </UCard>
          <UCard>
            <p class="text-xs text-gray-400">Average order value</p>
            <p class="text-xl font-semibold text-gray-900 dark:text-white">{{ formatCurrency(purchaseSummary.averageOrderValue) }}</p>
          </UCard>
        </div>
        <UCard>
          <template #header><h2 class="text-sm font-semibold text-gray-900 dark:text-white">By status</h2></template>
          <EmptyState v-if="purchaseSummary.byStatus.length === 0" icon="i-lucide-check-circle" title="No orders in this period" />
          <table v-else class="w-full text-sm">
            <thead>
              <tr class="text-left text-xs text-gray-400 border-b border-gray-200 dark:border-gray-800">
                <th class="py-2 pr-3">Status</th>
                <th class="py-2 px-3 text-right">Orders</th>
                <th class="py-2 pl-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in purchaseSummary.byStatus" :key="row.status" class="border-b border-gray-100 dark:border-gray-800/60">
                <td class="py-1.5 pr-3"><StatusBadge :status="row.status" /></td>
                <td class="py-1.5 px-3 text-right text-gray-600 dark:text-gray-300">{{ row.orderCount }}</td>
                <td class="py-1.5 pl-3 text-right text-gray-900 dark:text-white">{{ formatCurrency(row.totalAmount) }}</td>
              </tr>
            </tbody>
          </table>
        </UCard>
      </template>

      <UCard v-else-if="purchaseTab === 'by-supplier' && purchaseBySupplier">
        <EmptyState v-if="purchaseBySupplier.rows.length === 0" icon="i-lucide-check-circle" title="No purchases in this period" />
        <table v-else class="w-full text-sm">
          <thead>
            <tr class="text-left text-xs text-gray-400 border-b border-gray-200 dark:border-gray-800">
              <th class="py-2 pr-3">Supplier</th>
              <th class="py-2 px-3 text-right">Orders</th>
              <th class="py-2 pl-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in purchaseBySupplier.rows" :key="row.supplierId" class="border-b border-gray-100 dark:border-gray-800/60">
              <td class="py-1.5 pr-3 text-gray-900 dark:text-white">{{ row.supplierName ?? '—' }}</td>
              <td class="py-1.5 px-3 text-right text-gray-600 dark:text-gray-300">{{ row.orderCount }}</td>
              <td class="py-1.5 pl-3 text-right font-medium text-gray-900 dark:text-white">{{ formatCurrency(row.amount) }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="border-t-2 border-gray-200 dark:border-gray-800 font-medium">
              <td class="py-2 pr-3" colspan="2">Total</td>
              <td class="py-2 pl-3 text-right">{{ formatCurrency(purchaseBySupplier.totalAmount) }}</td>
            </tr>
          </tfoot>
        </table>
      </UCard>

      <UCard v-else-if="purchaseTab === 'by-product' && purchaseByProduct">
        <EmptyState v-if="purchaseByProduct.rows.length === 0" icon="i-lucide-check-circle" title="No purchases in this period" />
        <table v-else class="w-full text-sm">
          <thead>
            <tr class="text-left text-xs text-gray-400 border-b border-gray-200 dark:border-gray-800">
              <th class="py-2 pr-3">Product</th>
              <th class="py-2 px-3 text-right">Quantity</th>
              <th class="py-2 pl-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in purchaseByProduct.rows" :key="row.productId" class="border-b border-gray-100 dark:border-gray-800/60">
              <td class="py-1.5 pr-3 text-gray-900 dark:text-white">{{ row.productName }} ({{ row.productSku }})</td>
              <td class="py-1.5 px-3 text-right text-gray-600 dark:text-gray-300">{{ row.quantity }}</td>
              <td class="py-1.5 pl-3 text-right font-medium text-gray-900 dark:text-white">{{ formatCurrency(row.amount) }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="border-t-2 border-gray-200 dark:border-gray-800 font-medium">
              <td class="py-2 pr-3">Total</td>
              <td class="py-2 px-3 text-right">{{ purchaseByProduct.totalQuantity }}</td>
              <td class="py-2 pl-3 text-right">{{ formatCurrency(purchaseByProduct.totalAmount) }}</td>
            </tr>
          </tfoot>
        </table>
      </UCard>
    </template>

    <!-- ═══════════════════ INVENTORY ═══════════════════ -->
    <template v-else-if="section === 'inventory'">
      <UTabs v-model="inventoryTab" :items="inventoryTabs" :content="false" class="mb-4" />
      <UCard class="mb-4">
        <div class="flex flex-wrap items-end gap-3">
          <UFormField label="Company">
            <USelect v-model="companyId" :items="activeCompanyOptions" placeholder="All companies" class="w-52" />
          </UFormField>
          <UFormField label="Warehouse">
            <USelect v-model="warehouseId" :items="warehouseFilterOptions" placeholder="All warehouses" class="w-48" />
          </UFormField>
          <template v-if="inventoryTab === 'stock-movement'">
            <UFormField label="Type">
              <USelect v-model="movementType" :items="movementTypeOptions" placeholder="All types" class="w-40" />
            </UFormField>
            <UFormField label="From">
              <UInput v-model="dateFrom" type="date" class="w-40" />
            </UFormField>
            <UFormField label="To">
              <UInput v-model="dateTo" type="date" class="w-40" />
            </UFormField>
          </template>
        </div>
      </UCard>

      <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />
      <div v-if="loading" class="text-sm text-gray-400 py-8 text-center">Loading…</div>

      <template v-else-if="inventoryTab === 'stock-report'">
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
          <UCard>
            <p class="text-xs text-gray-400">Products</p>
            <p class="text-xl font-semibold text-gray-900 dark:text-white">{{ stockReportRows.length }}</p>
          </UCard>
          <UCard>
            <p class="text-xs text-gray-400">Total on hand</p>
            <p class="text-xl font-semibold text-gray-900 dark:text-white">{{ stockReportTotalOnHand }}</p>
          </UCard>
          <UCard>
            <p class="text-xs text-gray-400">Total available</p>
            <p class="text-xl font-semibold text-gray-900 dark:text-white">{{ stockReportTotalAvailable }}</p>
          </UCard>
          <UCard>
            <p class="text-xs text-gray-400">Total valuation</p>
            <p class="text-xl font-semibold text-gray-900 dark:text-white">{{ formatCurrency(stockReportTotalValuation) }}</p>
          </UCard>
        </div>
        <UCard>
          <EmptyState v-if="stockReportRows.length === 0" icon="i-lucide-boxes" title="No stock yet" />
          <div v-else class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="text-left text-xs text-gray-400 border-b border-gray-200 dark:border-gray-800">
                  <th class="py-2 pr-3">Product</th>
                  <th class="py-2 pr-3">Warehouse</th>
                  <th class="py-2 px-3 text-right">On hand</th>
                  <th class="py-2 px-3 text-right">Available</th>
                  <th class="py-2 px-3 text-right">Incoming</th>
                  <th class="py-2 pl-3 text-right">Valuation</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in stockReportRows" :key="row.productId + '-' + row.warehouseId" class="border-b border-gray-100 dark:border-gray-800/60">
                  <td class="py-1.5 pr-3 text-gray-900 dark:text-white">{{ row.productName }} ({{ row.productSku }})</td>
                  <td class="py-1.5 pr-3 text-gray-600 dark:text-gray-300">{{ row.warehouseName }}</td>
                  <td class="py-1.5 px-3 text-right text-gray-600 dark:text-gray-300">{{ row.currentStock }}</td>
                  <td class="py-1.5 px-3 text-right text-gray-600 dark:text-gray-300">{{ row.availableStock }}</td>
                  <td class="py-1.5 px-3 text-right text-gray-600 dark:text-gray-300">{{ row.incomingStock }}</td>
                  <td class="py-1.5 pl-3 text-right font-medium text-gray-900 dark:text-white">{{ formatCurrency(row.valuationValue) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </UCard>
      </template>

      <UCard v-else-if="inventoryTab === 'stock-movement'">
        <EmptyState v-if="stockMovements.length === 0" icon="i-lucide-history" title="No movements match your filters" />
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-xs text-gray-400 border-b border-gray-200 dark:border-gray-800">
                <th class="py-2 pr-3">Date</th>
                <th class="py-2 pr-3">Product</th>
                <th class="py-2 pr-3">Warehouse</th>
                <th class="py-2 pr-3">Type</th>
                <th class="py-2 px-3 text-right">Qty change</th>
                <th class="py-2 pl-3">Reference</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="m in stockMovements" :key="m.id" class="border-b border-gray-100 dark:border-gray-800/60">
                <td class="py-1.5 pr-3 text-gray-600 dark:text-gray-300">{{ formatDateTime(m.createdAt) }}</td>
                <td class="py-1.5 pr-3 text-gray-900 dark:text-white">{{ m.productName }} ({{ m.productSku }})</td>
                <td class="py-1.5 pr-3 text-gray-600 dark:text-gray-300">{{ m.warehouseName ?? '—' }}</td>
                <td class="py-1.5 pr-3"><StatusBadge :status="m.type" /></td>
                <td class="py-1.5 px-3 text-right font-medium" :class="m.quantityDelta >= 0 ? 'text-success' : 'text-error'">
                  {{ m.quantityDelta >= 0 ? '+' : '' }}{{ m.quantityDelta }}
                </td>
                <td class="py-1.5 pl-3 text-gray-400">{{ m.referenceType }} #{{ m.referenceId }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </UCard>

      <template v-else-if="inventoryTab === 'stock-valuation' && stockValuation">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <UCard>
            <p class="text-xs text-gray-400">Total quantity</p>
            <p class="text-xl font-semibold text-gray-900 dark:text-white">{{ stockValuation.totalQuantity }}</p>
          </UCard>
          <UCard>
            <p class="text-xs text-gray-400">Total value</p>
            <p class="text-xl font-semibold text-gray-900 dark:text-white">{{ formatCurrency(stockValuation.totalValue) }}</p>
          </UCard>
        </div>
        <UCard>
          <template #header><h2 class="text-sm font-semibold text-gray-900 dark:text-white">By warehouse</h2></template>
          <EmptyState v-if="stockValuation.rows.length === 0" icon="i-lucide-check-circle" title="No stock yet" />
          <table v-else class="w-full text-sm">
            <thead>
              <tr class="text-left text-xs text-gray-400 border-b border-gray-200 dark:border-gray-800">
                <th class="py-2 pr-3">Warehouse</th>
                <th class="py-2 px-3 text-right">Products</th>
                <th class="py-2 px-3 text-right">Quantity</th>
                <th class="py-2 pl-3 text-right">Value</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in stockValuation.rows" :key="row.warehouseId" class="border-b border-gray-100 dark:border-gray-800/60">
                <td class="py-1.5 pr-3 text-gray-900 dark:text-white">{{ row.warehouseName }}</td>
                <td class="py-1.5 px-3 text-right text-gray-600 dark:text-gray-300">{{ row.productCount }}</td>
                <td class="py-1.5 px-3 text-right text-gray-600 dark:text-gray-300">{{ row.totalQuantity }}</td>
                <td class="py-1.5 pl-3 text-right font-medium text-gray-900 dark:text-white">{{ formatCurrency(row.totalValue) }}</td>
              </tr>
            </tbody>
          </table>
        </UCard>
      </template>

      <UCard v-else-if="inventoryTab === 'low-stock' && lowStock">
        <UAlert
          color="neutral"
          variant="subtle"
          class="mb-4"
          title="Only products with a reorder point set"
          description="Set a reorder point on a product to have it show up here once available stock falls below it."
        />
        <EmptyState v-if="lowStock.rows.length === 0" icon="i-lucide-check-circle" title="Nothing is low on stock" />
        <table v-else class="w-full text-sm">
          <thead>
            <tr class="text-left text-xs text-gray-400 border-b border-gray-200 dark:border-gray-800">
              <th class="py-2 pr-3">Product</th>
              <th class="py-2 pr-3">Warehouse</th>
              <th class="py-2 px-3 text-right">Available</th>
              <th class="py-2 pl-3 text-right">Reorder point</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in lowStock.rows" :key="row.productId + '-' + row.warehouseId" class="border-b border-gray-100 dark:border-gray-800/60">
              <td class="py-1.5 pr-3 text-gray-900 dark:text-white">{{ row.productName }} ({{ row.productSku }})</td>
              <td class="py-1.5 pr-3 text-gray-600 dark:text-gray-300">{{ row.warehouseName }}</td>
              <td class="py-1.5 px-3 text-right text-error font-medium">{{ row.availableStock }}</td>
              <td class="py-1.5 pl-3 text-right text-gray-600 dark:text-gray-300">{{ row.reorderPoint }}</td>
            </tr>
          </tbody>
        </table>
      </UCard>
    </template>

    <!-- ═══════════════════ ACCOUNTING ═══════════════════ -->
    <template v-else-if="section === 'accounting'">
      <UCard>
        <EmptyState
          icon="i-lucide-bar-chart-3"
          title="Accounting reports live on their own page"
          description="P&L, Balance sheet, Cash flow, Trial balance, General ledger, and AR/AP aging are all on Financial Reports."
        >
          <template #action>
            <NuxtLink to="/financial-reports">
              <UButton icon="i-lucide-arrow-right" trailing>Open Financial Reports</UButton>
            </NuxtLink>
          </template>
        </EmptyState>
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { TabsItem } from '@nuxt/ui'
import type { SalesByCustomer, SalesByProduct, SalesBySalesperson, SalesSummary } from '~/composables/useSalesReports'
import type { SalesOrderStatus } from '~/composables/useSalesOrders'
import type { PurchaseByProduct, PurchaseBySupplier, PurchaseSummary } from '~/composables/usePurchaseReports'
import type { PurchaseOrderStatus } from '~/composables/usePurchaseOrders'
import type { InventoryOverviewRow } from '~/composables/useInventoryOverview'
import type { StockMovement, StockMovementType } from '~/composables/useStockMovements'
import type { LowStock, StockValuation } from '~/composables/useInventoryReports'

definePageMeta({ middleware: 'admin' })

const { summary: fetchSalesSummary, byProduct: fetchSalesByProduct, byCustomer: fetchSalesByCustomer, bySalesperson: fetchSalesBySalesperson } =
  useSalesReports()
const { summary: fetchPurchaseSummary, bySupplier: fetchPurchaseBySupplier, byProduct: fetchPurchaseByProduct } = usePurchaseReports()
const { get: fetchInventoryOverview } = useInventoryOverview()
const { list: fetchStockMovements } = useStockMovements()
const { stockValuation: fetchStockValuation, lowStock: fetchLowStock } = useInventoryReports()
const { list: listCompanies } = useCompanies()
const { list: listWarehouses } = useWarehouses()

type Section = 'sales' | 'purchase' | 'inventory' | 'accounting'
const section = ref<Section>('sales')
const sectionTabs: TabsItem[] = [
  { label: 'Sales', value: 'sales' },
  { label: 'Purchase', value: 'purchase' },
  { label: 'Inventory', value: 'inventory' },
  { label: 'Accounting', value: 'accounting' }
]

type SalesTab = 'summary' | 'by-product' | 'by-customer' | 'by-salesperson'
const salesTab = ref<SalesTab>('summary')
const salesTabs: TabsItem[] = [
  { label: 'Summary', value: 'summary' },
  { label: 'By product', value: 'by-product' },
  { label: 'By customer', value: 'by-customer' },
  { label: 'By salesperson', value: 'by-salesperson' }
]

type PurchaseTab = 'summary' | 'by-supplier' | 'by-product'
const purchaseTab = ref<PurchaseTab>('summary')
const purchaseTabs: TabsItem[] = [
  { label: 'Summary', value: 'summary' },
  { label: 'By supplier', value: 'by-supplier' },
  { label: 'By product', value: 'by-product' }
]

type InventoryTab = 'stock-report' | 'stock-movement' | 'stock-valuation' | 'low-stock'
const inventoryTab = ref<InventoryTab>('stock-report')
const inventoryTabs: TabsItem[] = [
  { label: 'Stock report', value: 'stock-report' },
  { label: 'Stock movement', value: 'stock-movement' },
  { label: 'Stock valuation', value: 'stock-valuation' },
  { label: 'Low stock', value: 'low-stock' }
]

const companies = ref<{ id: number; name: string; active: boolean }[]>([])
const warehouses = ref<{ id: number; name: string; companyId: number }[]>([])
const companyId = ref<number | undefined>(undefined)
const warehouseId = ref<number | undefined>(undefined)
const dateFrom = ref('')
const dateTo = ref('')
const salesStatus = ref<SalesOrderStatus | undefined>(undefined)
const purchaseStatus = ref<PurchaseOrderStatus | undefined>(undefined)
const movementType = ref<StockMovementType | undefined>(undefined)

const activeCompanyOptions = computed(() => [
  { label: 'All companies', value: undefined },
  ...companies.value.filter((c) => c.active).map((c) => ({ label: c.name, value: c.id }))
])
const warehouseFilterOptions = computed(() => [
  { label: 'All warehouses', value: undefined },
  ...warehouses.value.filter((w) => companyId.value === undefined || w.companyId === companyId.value).map((w) => ({ label: w.name, value: w.id }))
])

const salesStatusOptions = [
  { label: 'All except cancelled', value: undefined },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Submitted', value: 'SUBMITTED' },
  { label: 'Confirmed', value: 'CONFIRMED' },
  { label: 'Partially delivered', value: 'PARTIALLY_DELIVERED' },
  { label: 'Delivered', value: 'DELIVERED' },
  { label: 'Cancelled', value: 'CANCELLED' }
]
const purchaseStatusOptions = [
  { label: 'All except cancelled', value: undefined },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Submitted', value: 'SUBMITTED' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Sent', value: 'SENT' },
  { label: 'Partially received', value: 'PARTIALLY_RECEIVED' },
  { label: 'Received', value: 'RECEIVED' },
  { label: 'Cancelled', value: 'CANCELLED' }
]
const movementTypeOptions = [
  { label: 'All types', value: undefined },
  { label: 'Receipt', value: 'RECEIPT' },
  { label: 'Issue', value: 'ISSUE' },
  { label: 'Transfer out', value: 'TRANSFER_OUT' },
  { label: 'Transfer in', value: 'TRANSFER_IN' },
  { label: 'Adjustment', value: 'ADJUSTMENT' }
]

const loading = ref(false)
const error = ref('')

const salesSummary = ref<SalesSummary | null>(null)
const salesByProduct = ref<SalesByProduct | null>(null)
const salesByCustomer = ref<SalesByCustomer | null>(null)
const salesBySalesperson = ref<SalesBySalesperson | null>(null)
const purchaseSummary = ref<PurchaseSummary | null>(null)
const purchaseBySupplier = ref<PurchaseBySupplier | null>(null)
const purchaseByProduct = ref<PurchaseByProduct | null>(null)
const stockReportRows = ref<InventoryOverviewRow[]>([])
const stockMovements = ref<StockMovement[]>([])
const stockValuation = ref<StockValuation | null>(null)
const lowStock = ref<LowStock | null>(null)

const stockReportTotalOnHand = computed(() => stockReportRows.value.reduce((sum, r) => sum + r.currentStock, 0))
const stockReportTotalAvailable = computed(() => stockReportRows.value.reduce((sum, r) => sum + r.availableStock, 0))
const stockReportTotalValuation = computed(() => stockReportRows.value.reduce((sum, r) => sum + r.valuationValue, 0))

async function load() {
  loading.value = true
  error.value = ''
  try {
    if (section.value === 'sales') {
      const filter = { companyId: companyId.value, dateFrom: dateFrom.value || undefined, dateTo: dateTo.value || undefined, status: salesStatus.value }
      if (salesTab.value === 'summary') salesSummary.value = await fetchSalesSummary(filter)
      else if (salesTab.value === 'by-product') salesByProduct.value = await fetchSalesByProduct(filter)
      else if (salesTab.value === 'by-customer') salesByCustomer.value = await fetchSalesByCustomer(filter)
      else salesBySalesperson.value = await fetchSalesBySalesperson(filter)
    } else if (section.value === 'purchase') {
      const filter = { companyId: companyId.value, dateFrom: dateFrom.value || undefined, dateTo: dateTo.value || undefined, status: purchaseStatus.value }
      if (purchaseTab.value === 'summary') purchaseSummary.value = await fetchPurchaseSummary(filter)
      else if (purchaseTab.value === 'by-supplier') purchaseBySupplier.value = await fetchPurchaseBySupplier(filter)
      else purchaseByProduct.value = await fetchPurchaseByProduct(filter)
    } else if (section.value === 'inventory') {
      const invFilter = { companyId: companyId.value, warehouseId: warehouseId.value }
      if (inventoryTab.value === 'stock-report') {
        stockReportRows.value = (await fetchInventoryOverview({ ...invFilter, size: 100000 })).data
      } else if (inventoryTab.value === 'stock-movement') {
        stockMovements.value = (
          await fetchStockMovements({
            ...invFilter,
            type: movementType.value,
            dateFrom: dateFrom.value || undefined,
            dateTo: dateTo.value || undefined,
            size: 200,
            sortBy: 'createdAt',
            sortOrder: 'desc'
          })
        ).data
      } else if (inventoryTab.value === 'stock-valuation') {
        stockValuation.value = await fetchStockValuation(invFilter)
      } else {
        lowStock.value = await fetchLowStock(invFilter)
      }
    }
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  const [c, w] = await Promise.all([listCompanies({ size: 200 }), listWarehouses({ size: 200 })])
  companies.value = c.data
  warehouses.value = w.data
  await load()
})
watch(
  [section, salesTab, purchaseTab, inventoryTab, companyId, warehouseId, dateFrom, dateTo, salesStatus, purchaseStatus, movementType],
  load
)
</script>
