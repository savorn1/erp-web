<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Custom roles</h1>
      <UButton icon="i-lucide-plus" to="/custom-roles/new">New role</UButton>
    </div>

    <UAlert
      color="neutral"
      variant="subtle"
      class="mb-4"
      title="Only used by User accounts"
      description="Admin accounts always have full access and never need a custom role. Assign a role to a User account from the Users page to grant it these per-module permissions."
    />

    <UCard class="mb-4">
      <UInput v-model="search" placeholder="Search name" icon="i-lucide-search" class="w-56" />
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />

    <UCard>
      <DataTable :rows="pagedRows" :columns="columns" :loading="loading" refreshable numbered @refresh="load">
        <template #actions-data="{ row }">
          <div class="flex items-center gap-2">
            <UButton size="xs" color="primary" variant="soft" icon="i-lucide-pencil" :to="`/custom-roles/${row.id}`">Edit</UButton>
            <UButton size="xs" color="error" variant="soft" icon="i-lucide-trash-2" @click="confirmDelete = row">Delete</UButton>
          </div>
        </template>
        <template #empty-state>
          <EmptyState icon="i-lucide-shield" title="No custom roles yet" description="Create the first custom role to get started.">
            <template #action>
              <UButton icon="i-lucide-plus" to="/custom-roles/new">New role</UButton>
            </template>
          </EmptyState>
        </template>
      </DataTable>

      <div v-if="total > 0" class="pt-4">
        <DataPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
      </div>
    </UCard>

    <ConfirmModal
      :model-value="confirmDelete !== null"
      title="Delete custom role"
      :description="`Delete role '${confirmDelete?.name ?? ''}'? This cannot be undone.`"
      confirm-label="Delete"
      color="error"
      :loading="deleting"
      @update:model-value="
        (v: boolean) => {
          if (!v) confirmDelete = null
        }
      "
      @confirm="onDelete"
    />
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { CustomRole } from '~/composables/useCustomRoles'

definePageMeta({ middleware: 'admin' })

const { list, remove } = useCustomRoles()
const toast = useToast()

const rows = ref<CustomRole[]>([])
const loading = ref(false)
const error = ref('')

const sort = ref<{ column: string; direction: 'asc' | 'desc' } | undefined>({ column: 'id', direction: 'desc' })
const { page, pageSize, total, rows: pagedRows, search } = useClientTable(rows, { pageSize: 10, searchFields: ['name'] })

const columns: ColumnDef<CustomRole>[] = [
  { key: 'name' },
  { key: 'description', value: (row) => row.description ?? '—' },
  { key: 'permissions', label: 'Grants', value: (row) => `${row.permissions.length} grant(s)` },
  { key: 'actions', label: '' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    rows.value = (await list({ size: 200 })).data
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    loading.value = false
  }
}

const deleting = ref(false)
const confirmDelete = ref<CustomRole | null>(null)
async function onDelete() {
  if (!confirmDelete.value) return
  deleting.value = true
  try {
    await remove(confirmDelete.value.id)
    toast.add({ title: 'Custom role deleted', color: 'success' })
    confirmDelete.value = null
    await load()
  } catch (err) {
    toast.add({ title: 'Could not delete custom role', description: apiErrorMessage(err), color: 'error' })
  } finally {
    deleting.value = false
  }
}

onMounted(load)
</script>
