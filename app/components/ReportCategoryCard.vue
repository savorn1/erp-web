<template>
  <UCard>
    <template #header>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <span class="font-semibold text-gray-900 dark:text-white">{{ title }}</span>
        <UInput v-model="search" icon="i-lucide-search" size="sm" placeholder="Search…" class="w-full sm:w-56" />
      </div>
    </template>
    <DataTable :rows="filteredTiles" :columns="columns" :exportable="false" @select="onSelect">
      <template #label-data="{ row }">
        <div class="flex items-center gap-3">
          <div class="shrink-0 rounded-lg p-2 bg-primary-50 dark:bg-primary-400/10 text-primary-500 dark:text-primary-300">
            <UIcon :name="row.icon" class="w-5 h-5" />
          </div>
          <span class="font-medium text-gray-900 dark:text-white">{{ row.label }}</span>
        </div>
      </template>
      <template v-if="mode === 'select'" #actions-data="{ row }">
        <button type="button" class="text-primary-500 font-medium" @click.stop="onSelect(row)">Open</button>
      </template>
      <template #empty-state>
        <EmptyState icon="i-lucide-search-x" title="No matches" :description="`Nothing matches '${search}'`" />
      </template>
    </DataTable>
  </UCard>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'

export interface ReportTile {
  /** A route path in 'route' mode (default); an opaque value (e.g. a sub-tab
   * name) passed to `select` in 'select' mode. */
  to: string
  icon: string
  label: string
  description: string
}

const props = withDefaults(defineProps<{ title: string; tiles: ReportTile[]; mode?: 'route' | 'select' }>(), { mode: 'route' })
const emit = defineEmits<{ select: [value: string] }>()
const router = useRouter()

function onSelect(row: ReportTile) {
  if (props.mode === 'select') emit('select', row.to)
  else router.push(row.to)
}

const search = ref('')
const filteredTiles = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return props.tiles
  return props.tiles.filter((tile) => tile.label.toLowerCase().includes(q) || tile.description.toLowerCase().includes(q))
})

const columns = computed<ColumnDef<ReportTile>[]>(() => [
  { key: 'label', label: 'Report' },
  { key: 'description', label: 'Description' },
  ...(props.mode === 'route' ? [{ key: 'actions', label: '', type: 'link' as const, value: () => 'Open', href: (row: ReportTile) => row.to }] : [{ key: 'actions', label: '' }])
])
</script>
