<template>
  <div>
    <div class="mb-4">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
      <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Pick a report below to open it on its own page.</p>
    </div>

    <UCard class="mb-4">
      <UInput v-model="search" icon="i-lucide-search" size="lg" placeholder="Search all reports…" />
    </UCard>

    <UCard v-if="search.trim()">
      <template #header>
        <span class="font-semibold text-gray-900 dark:text-white">{{ searchResults.length }} matching {{ searchResults.length === 1 ? 'report' : 'reports' }}</span>
      </template>
      <DataTable :rows="searchResults" :columns="searchColumns" :exportable="false" @select="(row) => router.push(row.to)">
        <template #label-data="{ row }">
          <div class="flex items-center gap-3">
            <UButton
              icon="i-lucide-star"
              :class="isPinned(row.to) ? 'text-warning' : 'text-gray-300 dark:text-gray-600'"
              variant="ghost"
              color="neutral"
              size="xs"
              aria-label="Toggle pin"
              @click.stop="togglePin(row.to)"
            />
            <div class="shrink-0 rounded-lg p-2 bg-primary-50 dark:bg-primary-400/10 text-primary-500 dark:text-primary-300">
              <UIcon :name="row.icon" class="w-5 h-5" />
            </div>
            <span class="font-medium text-gray-900 dark:text-white">{{ row.label }}</span>
          </div>
        </template>
        <template #empty-state>
          <EmptyState icon="i-lucide-search-x" title="No matches" :description="`Nothing matches '${search}'`" />
        </template>
      </DataTable>
    </UCard>

    <template v-else>
      <ReportCategoryCard v-if="pinnedTiles.length > 0" title="Pinned reports" :tiles="pinnedTiles" clearable class="mb-4" @clear="clearPinned" />
      <ReportCategoryCard v-if="recentTiles.length > 0" title="Recently viewed" :tiles="recentTiles" clearable class="mb-4" @clear="clearRecent" />

      <ReportCategoryCard title="Sales reports" :tiles="salesReportTiles" class="mb-4" />
      <ReportCategoryCard title="More sales reports" :tiles="salesExternalReportTiles" class="mb-4" />
      <ReportCategoryCard title="Purchase reports" :tiles="purchaseReportTiles" class="mb-4" />
      <ReportCategoryCard title="Inventory reports" :tiles="inventoryReportTiles" class="mb-4" />
      <ReportCategoryCard title="Accounting reports" :tiles="accountingReportTiles" class="mb-4" />
      <ReportCategoryCard title="More accounting reports" :tiles="accountingExternalReportTiles" />
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { ReportTile } from '~/components/ReportCategoryCard.vue'

definePageMeta({ middleware: 'admin' })

const router = useRouter()
const { salesReportTiles, salesExternalReportTiles, purchaseReportTiles, inventoryReportTiles, accountingReportTiles, accountingExternalReportTiles } =
  useReportCatalog()
const { pinned, isPinned, togglePin, clearAll: clearPinned } = usePinnedReports()
const { recent, clearAll: clearRecent } = useRecentReports()

const allTiles = computed<ReportTile[]>(() => [
  ...salesReportTiles,
  ...salesExternalReportTiles,
  ...purchaseReportTiles,
  ...inventoryReportTiles,
  ...accountingReportTiles,
  ...accountingExternalReportTiles
])

// Order follows the stored pin/visit order (most recently pinned/visited
// first), not the catalog's own order.
function tilesFor(paths: string[]): ReportTile[] {
  const byPath = new Map(allTiles.value.map((t) => [t.to, t]))
  return paths.map((p) => byPath.get(p)).filter((t): t is ReportTile => !!t)
}
const pinnedTiles = computed(() => tilesFor(pinned.value))
const recentTiles = computed(() => tilesFor(recent.value))

const search = ref('')
const searchResults = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return []
  return allTiles.value.filter((t) => t.label.toLowerCase().includes(q) || t.description.toLowerCase().includes(q))
})

const searchColumns: ColumnDef<ReportTile>[] = [
  { key: 'label', label: 'Report' },
  { key: 'description', label: 'Description' },
  { key: 'actions', label: '', type: 'link', value: () => 'Open', href: (row) => row.to }
]
</script>
