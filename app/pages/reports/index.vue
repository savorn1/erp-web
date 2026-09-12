<template>
  <div>
    <div class="mb-4">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
    </div>

    <ReportCategoryCard
      title="Sales reports"
      :tiles="salesReportTiles"
      mode="select"
      class="mb-4"
      @select="
        (v) => {
          section = 'sales'
          salesTab = v as SalesTab
        }
      "
    />
    <ReportCategoryCard
      title="Purchase reports"
      :tiles="purchaseReportTiles"
      mode="select"
      class="mb-4"
      @select="
        (v) => {
          section = 'purchase'
          purchaseTab = v as PurchaseTab
        }
      "
    />
    <ReportCategoryCard
      title="Inventory reports"
      :tiles="inventoryReportTiles"
      mode="select"
      class="mb-4"
      @select="
        (v) => {
          section = 'inventory'
          inventoryTab = v as InventoryTab
        }
      "
    />
    <ReportCategoryCard
      title="Accounting reports"
      :tiles="accountingReportTiles"
      mode="select"
      class="mb-4"
      @select="
        (v) => {
          section = 'accounting'
          accountingTab = v as AccountingTab
        }
      "
    />
    <ReportCategoryCard title="More accounting reports" :tiles="accountingExternalReportTiles" class="mb-6" />

    <UCard class="mb-4">
      <template #header>
        <span class="font-semibold text-gray-900 dark:text-white">Now viewing: {{ activeReportLabel }}</span>
      </template>
    </UCard>

    <!-- ═══════════════════ SALES ═══════════════════ -->
    <template v-if="section === 'sales'">
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
      <UCard class="mb-4">
        <div class="flex flex-wrap items-end gap-3">
          <UFormField label="Company">
            <USelect v-model="companyId" :items="activeCompanyOptions" placeholder="All companies" class="w-52" />
          </UFormField>
          <UFormField v-if="usesAccountingAsOfDate" label="As of date">
            <UInput v-model="asOfDate" type="date" class="w-44" />
          </UFormField>
          <template v-if="usesAccountingDateRange">
            <UFormField label="From">
              <UInput v-model="dateFrom" type="date" class="w-40" />
            </UFormField>
            <UFormField label="To">
              <UInput v-model="dateTo" type="date" class="w-40" />
            </UFormField>
          </template>
          <UFormField v-if="accountingTab === 'general-ledger'" label="Account" required>
            <USelect v-model="accountId" :items="accountOptions" placeholder="Select an account" class="w-56" />
          </UFormField>
        </div>
        <p v-if="glReportNote" class="text-xs text-gray-400 mt-3">
          Reflects only what's been manually posted in
          <NuxtLink to="/journal-entries" class="underline">Journal Entries</NuxtLink> — nothing else in the system posts to the general ledger automatically
          yet.
        </p>
        <p v-if="accountingTab === 'tax-report'" class="text-xs text-gray-400 mt-3">
          Groups approved sales and purchase invoices by the tax percent typed on their lines — it can't attribute a rate to a named VAT/withholding
          <NuxtLink to="/tax-rates" class="underline">tax rate</NuxtLink> since order and invoice lines aren't linked to one.
        </p>
      </UCard>

      <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />
      <div v-if="loading" class="text-sm text-gray-400 py-8 text-center">Loading…</div>

      <!-- Trial balance -->
      <template v-else-if="accountingTab === 'trial-balance' && trialBalance">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <UCard>
            <p class="text-xs text-gray-400">Total debits</p>
            <p class="text-xl font-semibold text-gray-900 dark:text-white">{{ formatCurrency(trialBalance.debitTotal) }}</p>
          </UCard>
          <UCard>
            <p class="text-xs text-gray-400">Total credits</p>
            <p class="text-xl font-semibold text-gray-900 dark:text-white">{{ formatCurrency(trialBalance.creditTotal) }}</p>
          </UCard>
          <UCard>
            <p class="text-xs text-gray-400">Balanced</p>
            <p class="text-xl font-semibold" :class="trialBalance.debitTotal === trialBalance.creditTotal ? 'text-success' : 'text-error'">
              {{ trialBalance.debitTotal === trialBalance.creditTotal ? 'Yes' : 'No' }}
            </p>
          </UCard>
        </div>
        <UCard>
          <DataTable :rows="trialBalance.rows" :columns="trialBalanceColumns" :exportable="false">
            <template #empty-state>
              <EmptyState icon="i-lucide-check-circle" title="Nothing posted yet" />
            </template>
          </DataTable>
        </UCard>
      </template>

      <!-- General ledger -->
      <UCard v-else-if="accountingTab === 'general-ledger'">
        <EmptyState v-if="!accountId" icon="i-lucide-book-text" title="Select an account" description="Choose an account above to see its ledger." />
        <template v-else-if="generalLedger">
          <div class="flex items-center justify-between mb-3 text-sm">
            <span class="text-gray-900 dark:text-white font-medium">{{ generalLedger.accountCode }} — {{ generalLedger.accountName }}</span>
            <span class="text-gray-400">Opening: {{ formatCurrency(generalLedger.openingBalance) }}</span>
          </div>
          <DataTable :rows="generalLedger.lines" :columns="generalLedgerColumns" :exportable="false">
            <template #empty-state>
              <EmptyState icon="i-lucide-check-circle" title="No activity in this period" />
            </template>
          </DataTable>
        </template>
      </UCard>

      <!-- Balance sheet -->
      <template v-else-if="accountingTab === 'balance-sheet' && balanceSheet">
        <UAlert
          v-if="!balanceSheet.balanced"
          color="error"
          variant="subtle"
          class="mb-4"
          title="Out of balance"
          description="Assets don't equal liabilities + equity — this shouldn't happen for posted double-entry data."
        />
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UCard>
            <template #header><h2 class="text-sm font-semibold text-gray-900 dark:text-white">Assets</h2></template>
            <DataTable :rows="balanceSheet.assets" :columns="assetsColumns" :exportable="false">
              <template #empty-state>
                <EmptyState icon="i-lucide-check-circle" title="Nothing posted yet" />
              </template>
            </DataTable>
          </UCard>
          <div class="space-y-4">
            <UCard>
              <template #header><h2 class="text-sm font-semibold text-gray-900 dark:text-white">Liabilities</h2></template>
              <DataTable :rows="balanceSheet.liabilities" :columns="liabilitiesColumns" :exportable="false">
                <template #empty-state>
                  <EmptyState icon="i-lucide-check-circle" title="Nothing posted yet" />
                </template>
              </DataTable>
            </UCard>
            <UCard>
              <template #header><h2 class="text-sm font-semibold text-gray-900 dark:text-white">Equity</h2></template>
              <DataTable :rows="balanceSheet.equity" :columns="equityColumns" :exportable="false" />
            </UCard>
          </div>
        </div>
      </template>

      <!-- Profit & loss -->
      <template v-else-if="accountingTab === 'profit-and-loss' && profitAndLoss">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <UCard>
            <p class="text-xs text-gray-400">Revenue</p>
            <p class="text-xl font-semibold text-gray-900 dark:text-white">{{ formatCurrency(profitAndLoss.revenueTotal) }}</p>
          </UCard>
          <UCard>
            <p class="text-xs text-gray-400">Expenses</p>
            <p class="text-xl font-semibold text-gray-900 dark:text-white">{{ formatCurrency(profitAndLoss.expenseTotal) }}</p>
          </UCard>
          <UCard>
            <p class="text-xs text-gray-400">Net income</p>
            <p class="text-xl font-semibold" :class="profitAndLoss.netIncome >= 0 ? 'text-success' : 'text-error'">
              {{ formatCurrency(profitAndLoss.netIncome) }}
            </p>
          </UCard>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UCard>
            <template #header><h2 class="text-sm font-semibold text-gray-900 dark:text-white">Revenue</h2></template>
            <DataTable :rows="profitAndLoss.revenue" :columns="revenueColumns" :exportable="false">
              <template #empty-state>
                <EmptyState icon="i-lucide-check-circle" title="No revenue posted in this period" />
              </template>
            </DataTable>
          </UCard>
          <UCard>
            <template #header><h2 class="text-sm font-semibold text-gray-900 dark:text-white">Expenses</h2></template>
            <DataTable :rows="profitAndLoss.expenses" :columns="expenseColumns" :exportable="false">
              <template #empty-state>
                <EmptyState icon="i-lucide-check-circle" title="No expenses posted in this period" />
              </template>
            </DataTable>
          </UCard>
        </div>
      </template>

      <!-- Cash flow -->
      <UCard v-else-if="accountingTab === 'cash-flow' && cashFlow">
        <DataTable :rows="cashFlow.accounts" :columns="cashFlowColumns" :exportable="false">
          <template #empty-state>
            <EmptyState icon="i-lucide-landmark" title="No bank or cash accounts yet" />
          </template>
        </DataTable>
      </UCard>

      <!-- AR aging -->
      <UCard v-else-if="accountingTab === 'ar-aging' && arAging">
        <EmptyState v-if="arAging.rows.length === 0" icon="i-lucide-check-circle" title="Nothing outstanding" />
        <AgingTable v-else :report="arAging!" :entity-label="'Customer'" />
      </UCard>

      <!-- AP aging -->
      <UCard v-else-if="accountingTab === 'ap-aging' && apAging">
        <EmptyState v-if="apAging.rows.length === 0" icon="i-lucide-check-circle" title="Nothing outstanding" />
        <AgingTable v-else :report="apAgingAsGeneric!" :entity-label="'Supplier'" />
      </UCard>

      <!-- Tax report -->
      <template v-else-if="accountingTab === 'tax-report' && taxReport">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <UCard>
            <p class="text-xs text-gray-400">Output tax (sales)</p>
            <p class="text-xl font-semibold text-gray-900 dark:text-white">{{ formatCurrency(taxReport.outputTaxTotal) }}</p>
          </UCard>
          <UCard>
            <p class="text-xs text-gray-400">Input tax (purchases)</p>
            <p class="text-xl font-semibold text-gray-900 dark:text-white">{{ formatCurrency(taxReport.inputTaxTotal) }}</p>
          </UCard>
          <UCard>
            <p class="text-xs text-gray-400">Net tax payable</p>
            <p class="text-xl font-semibold" :class="taxReport.netTaxPayable >= 0 ? 'text-error' : 'text-success'">
              {{ formatCurrency(taxReport.netTaxPayable) }}
            </p>
          </UCard>
        </div>
        <UCard class="mb-4">
          <template #header><h2 class="text-sm font-semibold text-gray-900 dark:text-white">Output tax — sales invoices</h2></template>
          <DataTable :rows="taxReport.outputTax" :columns="taxColumns" :exportable="false">
            <template #empty-state>
              <EmptyState icon="i-lucide-check-circle" title="No output tax in this period" />
            </template>
          </DataTable>
        </UCard>
        <UCard>
          <template #header><h2 class="text-sm font-semibold text-gray-900 dark:text-white">Input tax — purchase invoices</h2></template>
          <DataTable :rows="taxReport.inputTax" :columns="taxColumns" :exportable="false">
            <template #empty-state>
              <EmptyState icon="i-lucide-check-circle" title="No input tax in this period" />
            </template>
          </DataTable>
        </UCard>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { ReportTile } from '~/components/ReportCategoryCard.vue'
import type { SalesByCustomer, SalesByProduct, SalesBySalesperson, SalesSummary } from '~/composables/useSalesReports'
import type { SalesOrderStatus } from '~/composables/useSalesOrders'
import type { PurchaseByProduct, PurchaseBySupplier, PurchaseSummary } from '~/composables/usePurchaseReports'
import type { PurchaseOrderStatus } from '~/composables/usePurchaseOrders'
import type { InventoryOverviewRow } from '~/composables/useInventoryOverview'
import type { StockMovement, StockMovementType } from '~/composables/useStockMovements'
import type { LowStock, StockValuation } from '~/composables/useInventoryReports'
import type {
  BalanceSheet,
  CashFlow,
  CashFlowAccountRow,
  FinancialStatementLine,
  GeneralLedger,
  GeneralLedgerLine,
  ProfitAndLoss,
  TrialBalance,
  TrialBalanceRow
} from '~/composables/useFinancialReports'
import type { InvoiceAgingReport } from '~/composables/useInvoices'
import type { PurchaseInvoiceAgingReport } from '~/composables/usePurchaseInvoices'
import type { TaxReport, TaxReportRateRow } from '~/composables/useTaxReport'

definePageMeta({ middleware: 'admin' })

const {
  summary: fetchSalesSummary,
  byProduct: fetchSalesByProduct,
  byCustomer: fetchSalesByCustomer,
  bySalesperson: fetchSalesBySalesperson
} = useSalesReports()
const { summary: fetchPurchaseSummary, bySupplier: fetchPurchaseBySupplier, byProduct: fetchPurchaseByProduct } = usePurchaseReports()
const { get: fetchInventoryOverview } = useInventoryOverview()
const { list: fetchStockMovements } = useStockMovements()
const { stockValuation: fetchStockValuation, lowStock: fetchLowStock } = useInventoryReports()
const {
  trialBalance: fetchTrialBalance,
  generalLedger: fetchGeneralLedger,
  balanceSheet: fetchBalanceSheet,
  profitAndLoss: fetchProfitAndLoss,
  cashFlow: fetchCashFlow
} = useFinancialReports()
const { agingReport: fetchArAging } = useInvoices()
const { agingReport: fetchApAging } = usePurchaseInvoices()
const { generate: fetchTaxReport } = useTaxReport()
const { list: listCompanies } = useCompanies()
const { list: listWarehouses } = useWarehouses()
const { list: listAccounts } = useAccounts()

const accountingExternalReportTiles: ReportTile[] = [
  { to: '/accounts-receivable', icon: 'i-lucide-wallet', label: 'Accounts receivable', description: 'Outstanding customer invoices and balances.' },
  { to: '/accounts-payable', icon: 'i-lucide-landmark', label: 'Accounts payable', description: 'Outstanding supplier bills and balances.' }
]

type Section = 'sales' | 'purchase' | 'inventory' | 'accounting'
const section = ref<Section>('sales')

const activeReportLabel = computed(() => {
  if (section.value === 'sales') return `Sales — ${salesReportTiles.find((t) => t.to === salesTab.value)?.label ?? salesTab.value}`
  if (section.value === 'purchase') return `Purchase — ${purchaseReportTiles.find((t) => t.to === purchaseTab.value)?.label ?? purchaseTab.value}`
  if (section.value === 'inventory') return `Inventory — ${inventoryReportTiles.find((t) => t.to === inventoryTab.value)?.label ?? inventoryTab.value}`
  return `Accounting — ${accountingReportTiles.find((t) => t.to === accountingTab.value)?.label ?? accountingTab.value}`
})

type SalesTab = 'summary' | 'by-product' | 'by-customer' | 'by-salesperson'
const salesTab = ref<SalesTab>('summary')
const salesReportTiles: ReportTile[] = [
  { to: 'summary', icon: 'i-lucide-bar-chart-3', label: 'Summary', description: 'Order count, total amount, and average order value, broken down by status.' },
  { to: 'by-product', icon: 'i-lucide-package', label: 'By product', description: 'Quantity sold and revenue per product.' },
  { to: 'by-customer', icon: 'i-lucide-users', label: 'By customer', description: 'Orders and revenue per customer.' },
  { to: 'by-salesperson', icon: 'i-lucide-user', label: 'By salesperson', description: 'Orders and revenue grouped by whoever created the sales order.' }
]

type PurchaseTab = 'summary' | 'by-supplier' | 'by-product'
const purchaseTab = ref<PurchaseTab>('summary')
const purchaseReportTiles: ReportTile[] = [
  { to: 'summary', icon: 'i-lucide-bar-chart-3', label: 'Summary', description: 'Order count and total amount, broken down by status.' },
  { to: 'by-supplier', icon: 'i-lucide-truck', label: 'By supplier', description: 'Orders and spend per supplier.' },
  { to: 'by-product', icon: 'i-lucide-package', label: 'By product', description: 'Quantity purchased and spend per product.' }
]

type InventoryTab = 'stock-report' | 'stock-movement' | 'stock-valuation' | 'low-stock'
const inventoryTab = ref<InventoryTab>('stock-report')
const inventoryReportTiles: ReportTile[] = [
  { to: 'stock-report', icon: 'i-lucide-boxes', label: 'Stock report', description: 'On hand, available, and incoming quantity per product and warehouse.' },
  { to: 'stock-movement', icon: 'i-lucide-history', label: 'Stock movement', description: 'Every stock change — receipts, issues, transfers, and adjustments.' },
  { to: 'stock-valuation', icon: 'i-lucide-landmark', label: 'Stock valuation', description: 'Total quantity and value on hand, by warehouse.' },
  { to: 'low-stock', icon: 'i-lucide-triangle-alert', label: 'Low stock', description: 'Products below their reorder point.' }
]

type AccountingTab = 'trial-balance' | 'general-ledger' | 'balance-sheet' | 'profit-and-loss' | 'cash-flow' | 'ar-aging' | 'ap-aging' | 'tax-report'
const accountingTab = ref<AccountingTab>('trial-balance')
const accountingReportTiles: ReportTile[] = [
  { to: 'trial-balance', icon: 'i-lucide-scale', label: 'Trial balance', description: 'Debit and credit balances for every account, as of a date.' },
  { to: 'general-ledger', icon: 'i-lucide-book-text', label: 'General ledger', description: 'Every posted line for one account, with a running balance.' },
  { to: 'balance-sheet', icon: 'i-lucide-landmark', label: 'Balance sheet', description: 'Assets, liabilities, and equity as of a date.' },
  { to: 'profit-and-loss', icon: 'i-lucide-trending-up', label: 'Profit & loss', description: 'Revenue, expenses, and net income for a period.' },
  { to: 'cash-flow', icon: 'i-lucide-banknote', label: 'Cash flow', description: 'Opening/closing balance and net change per bank account.' },
  { to: 'ar-aging', icon: 'i-lucide-arrow-down-to-line', label: 'AR aging', description: 'Outstanding customer invoices by age bucket.' },
  { to: 'ap-aging', icon: 'i-lucide-arrow-up-from-line', label: 'AP aging', description: 'Outstanding supplier bills by age bucket.' },
  { to: 'tax-report', icon: 'i-lucide-receipt', label: 'Tax report', description: 'Output and input tax by rate, for a period.' }
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

const asOfDate = ref(new Date().toISOString().slice(0, 10))
const accountId = ref<number | undefined>(undefined)
const glAccounts = ref<{ id: number; accountCode: string; name: string; companyId: number }[]>([])
const accountOptions = computed(() =>
  glAccounts.value
    .filter((a) => companyId.value === undefined || a.companyId === companyId.value)
    .map((a) => ({ label: `${a.accountCode} — ${a.name}`, value: a.id }))
)
const usesAccountingAsOfDate = computed(() => ['trial-balance', 'balance-sheet', 'ar-aging', 'ap-aging'].includes(accountingTab.value))
const usesAccountingDateRange = computed(() => ['profit-and-loss', 'cash-flow', 'general-ledger', 'tax-report'].includes(accountingTab.value))
const glReportNote = computed(() => ['trial-balance', 'general-ledger', 'balance-sheet', 'profit-and-loss'].includes(accountingTab.value))

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

const trialBalance = ref<TrialBalance | null>(null)
const generalLedger = ref<GeneralLedger | null>(null)
const balanceSheet = ref<BalanceSheet | null>(null)
const profitAndLoss = ref<ProfitAndLoss | null>(null)
const cashFlow = ref<CashFlow | null>(null)
const arAging = ref<InvoiceAgingReport | null>(null)
const apAging = ref<PurchaseInvoiceAgingReport | null>(null)
const taxReport = ref<TaxReport | null>(null)

// AgingTable takes InvoiceAgingReport's row shape (customerId/customerName) —
// re-key the AP report's supplierId/supplierName rows to match so one
// component can render both.
const apAgingAsGeneric = computed<InvoiceAgingReport | null>(() =>
  apAging.value
    ? {
        asOfDate: apAging.value.asOfDate,
        rows: apAging.value.rows.map((r) => ({
          customerId: r.supplierId,
          customerName: r.supplierName,
          current: r.current,
          days1To30: r.days1To30,
          days31To60: r.days31To60,
          days61To90: r.days61To90,
          days90Plus: r.days90Plus,
          total: r.total
        })),
        totals: {
          customerId: null,
          customerName: apAging.value.totals.supplierName,
          current: apAging.value.totals.current,
          days1To30: apAging.value.totals.days1To30,
          days31To60: apAging.value.totals.days31To60,
          days61To90: apAging.value.totals.days61To90,
          days90Plus: apAging.value.totals.days90Plus,
          total: apAging.value.totals.total
        }
      }
    : null
)

const trialBalanceColumns = computed<ColumnDef<TrialBalanceRow>[]>(() => [
  { key: 'accountCode', label: 'Code', class: 'font-mono text-gray-400' },
  { key: 'accountName', label: 'Account', footer: () => 'Total' },
  { key: 'accountType', label: 'Type', type: 'status' },
  {
    key: 'debitBalance',
    label: 'Debit',
    type: 'currency',
    value: (row) => (row.debitBalance > 0 ? row.debitBalance : null),
    footer: () => trialBalance.value?.debitTotal
  },
  {
    key: 'creditBalance',
    label: 'Credit',
    type: 'currency',
    value: (row) => (row.creditBalance > 0 ? row.creditBalance : null),
    footer: () => trialBalance.value?.creditTotal
  }
])

const generalLedgerColumns = computed<ColumnDef<GeneralLedgerLine>[]>(() => [
  { key: 'entryDate', label: 'Date', type: 'date' },
  { key: 'journalNumber', label: 'Journal' },
  { key: 'description', label: 'Description', value: (row) => row.description ?? '—', footer: () => 'Closing balance' },
  { key: 'debit', label: 'Debit', type: 'currency', value: (row) => (row.debit > 0 ? row.debit : null) },
  { key: 'credit', label: 'Credit', type: 'currency', value: (row) => (row.credit > 0 ? row.credit : null) },
  { key: 'runningBalance', label: 'Balance', type: 'currency', footer: () => generalLedger.value?.closingBalance }
])

// Assets/Liabilities/Equity and Revenue/Expenses are all the same
// "account name + amount, with a labeled total" shape.
function statementColumns(totalLabel: string, total: () => number | undefined): ColumnDef<FinancialStatementLine>[] {
  return [
    { key: 'accountName', label: 'Account', footer: () => totalLabel },
    { key: 'amount', label: 'Amount', type: 'currency', footer: total }
  ]
}
const assetsColumns = computed(() => statementColumns('Total assets', () => balanceSheet.value?.assetsTotal))
const liabilitiesColumns = computed(() => statementColumns('Total liabilities', () => balanceSheet.value?.liabilitiesTotal))
const equityColumns = computed(() => statementColumns('Total equity', () => balanceSheet.value?.equityTotal))
const revenueColumns = computed(() => statementColumns('Total revenue', () => profitAndLoss.value?.revenueTotal))
const expenseColumns = computed(() => statementColumns('Total expenses', () => profitAndLoss.value?.expenseTotal))

const cashFlowColumns = computed<ColumnDef<CashFlowAccountRow>[]>(() => [
  { key: 'bankAccountName', label: 'Account', footer: () => 'Total' },
  { key: 'openingBalance', label: 'Opening', type: 'currency', footer: () => cashFlow.value?.totalOpeningBalance },
  { key: 'inflow', label: 'Inflow', type: 'currency', prefix: () => '+', class: 'text-success', footer: () => cashFlow.value?.totalInflow },
  { key: 'outflow', label: 'Outflow', type: 'currency', prefix: () => '-', class: 'text-error', footer: () => cashFlow.value?.totalOutflow },
  {
    key: 'netChange',
    label: 'Net change',
    type: 'currency',
    class: (row) => (row.netChange >= 0 ? 'text-success' : 'text-error'),
    footer: () => cashFlow.value?.totalNetChange
  },
  { key: 'closingBalance', label: 'Closing', type: 'currency', footer: () => cashFlow.value?.totalClosingBalance }
])

const taxColumns = computed<ColumnDef<TaxReportRateRow>[]>(() => [
  { key: 'taxRatePercent', label: 'Rate', suffix: '%' },
  { key: 'taxableAmount', label: 'Taxable amount', type: 'currency' },
  { key: 'taxAmount', label: 'Tax amount', type: 'currency' }
])

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
    } else if (section.value === 'accounting') {
      if (accountingTab.value === 'trial-balance') {
        trialBalance.value = await fetchTrialBalance({ companyId: companyId.value, asOfDate: asOfDate.value })
      } else if (accountingTab.value === 'general-ledger') {
        generalLedger.value = accountId.value
          ? await fetchGeneralLedger({ accountId: accountId.value, dateFrom: dateFrom.value || undefined, dateTo: dateTo.value || undefined })
          : null
      } else if (accountingTab.value === 'balance-sheet') {
        balanceSheet.value = await fetchBalanceSheet({ companyId: companyId.value, asOfDate: asOfDate.value })
      } else if (accountingTab.value === 'profit-and-loss') {
        profitAndLoss.value = await fetchProfitAndLoss({
          companyId: companyId.value,
          dateFrom: dateFrom.value || undefined,
          dateTo: dateTo.value || undefined
        })
      } else if (accountingTab.value === 'cash-flow') {
        cashFlow.value = await fetchCashFlow({ companyId: companyId.value, dateFrom: dateFrom.value || undefined, dateTo: dateTo.value || undefined })
      } else if (accountingTab.value === 'ar-aging') {
        arAging.value = await fetchArAging({ companyId: companyId.value, asOfDate: asOfDate.value })
      } else if (accountingTab.value === 'ap-aging') {
        apAging.value = await fetchApAging({ companyId: companyId.value, asOfDate: asOfDate.value })
      } else {
        taxReport.value = await fetchTaxReport({ companyId: companyId.value, dateFrom: dateFrom.value || undefined, dateTo: dateTo.value || undefined })
      }
    }
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    loading.value = false
  }
}

// Deep-linkable from elsewhere in the app, e.g. the dashboard's "Profit" tile
// links to `/reports?section=accounting&tab=profit-and-loss`.
const route = useRoute()

onMounted(async () => {
  const [c, w, a] = await Promise.all([listCompanies({ size: 200 }), listWarehouses({ size: 200 }), listAccounts({ size: 1000 })])
  companies.value = c.data
  warehouses.value = w.data
  glAccounts.value = a.data

  const querySection = route.query.section
  if (querySection === 'sales' || querySection === 'purchase' || querySection === 'inventory' || querySection === 'accounting') {
    section.value = querySection
  }
  const queryTab = typeof route.query.tab === 'string' ? route.query.tab : undefined
  if (queryTab) {
    if (section.value === 'sales') salesTab.value = queryTab as SalesTab
    else if (section.value === 'purchase') purchaseTab.value = queryTab as PurchaseTab
    else if (section.value === 'inventory') inventoryTab.value = queryTab as InventoryTab
    else if (section.value === 'accounting') accountingTab.value = queryTab as AccountingTab
  }

  await load()
})
watch(
  [section, salesTab, purchaseTab, inventoryTab, accountingTab, companyId, warehouseId, dateFrom, dateTo, asOfDate, accountId, salesStatus, purchaseStatus, movementType],
  load
)
</script>
