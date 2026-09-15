<template>
  <div>
    <div class="flex items-center gap-3 mb-6">
      <UButton icon="i-lucide-arrow-left" color="neutral" variant="ghost" @click="onLeave" />
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ pageTitle }}</h1>
    </div>

    <div v-if="loadingDetail" class="text-sm text-gray-400 py-12 text-center">Loading…</div>
    <template v-else>
      <div class="space-y-6">
        <UAlert
          color="neutral"
          variant="subtle"
          title="Only used by User accounts"
          description="Admin accounts always have full access and never need a custom role. Assign a role to a User account from the Users page to grant it these per-module permissions."
        />

        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-shield" class="w-4 h-4 text-gray-400 dark:text-gray-500" />
              <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Role details</h2>
            </div>
          </template>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UFormField label="Name" required>
              <UInput v-model="form.name" class="w-full" />
            </UFormField>
            <UFormField label="Description">
              <UInput v-model="form.description" class="w-full" />
            </UFormField>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-grid-3x3" class="w-4 h-4 text-gray-400 dark:text-gray-500" />
                <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Permissions</h2>
              </div>
              <UCheckbox :model-value="allSelected" label="Select all" @update:model-value="(v: boolean) => toggleAll(v)" />
            </div>
          </template>
          <div class="divide-y divide-gray-200 dark:divide-gray-800">
            <div v-for="group in catalog" :key="group.group" class="py-3 first:pt-0 last:pb-0">
              <p class="text-xs font-semibold uppercase tracking-wide mb-2 pl-2 border-l-2" :class="groupColorClasses(group.color)">{{ group.group }}</p>
              <div class="space-y-1">
                <div v-for="mod in group.modules" :key="mod.key" class="grid grid-cols-5 items-center gap-2 text-sm">
                  <span class="col-span-1 text-gray-700 dark:text-gray-300">{{ mod.label }}</span>
                  <UCheckbox
                    :model-value="isModuleFullySelected(mod.key)"
                    label="All"
                    @update:model-value="(v: boolean) => toggleModule(mod.key, v)"
                  />
                  <UCheckbox v-model="form.grid[mod.key].READ" label="Read" />
                  <UCheckbox v-model="form.grid[mod.key].WRITE" label="Write" />
                  <UCheckbox v-model="form.grid[mod.key].APPROVE" label="Approve" />
                </div>
              </div>
            </div>
          </div>
        </UCard>

        <UAlert v-if="formError" color="error" variant="subtle" :title="formError" />

        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" @click="onLeave">Cancel</UButton>
          <UButton :loading="saving" @click="onSaveForm">{{ isNew ? 'Create' : 'Save changes' }}</UButton>
        </div>
      </div>
    </template>

    <ConfirmModal
      :model-value="showLeaveConfirm"
      title="Discard changes?"
      description="You have unsaved changes on this custom role. Leaving now will discard them."
      confirm-label="Discard"
      color="error"
      @update:model-value="
        (v: boolean) => {
          if (!v) showLeaveConfirm = false
        }
      "
      @confirm="confirmLeave"
    />
  </div>
</template>

<script setup lang="ts">
import type { CustomRolePayload, PermissionAction, PermissionGrant } from '~/composables/useCustomRoles'

definePageMeta({ middleware: 'admin' })

const route = useRoute()
const router = useRouter()
const idParam = route.params.id as string
const isNew = idParam === 'new'

const { get, create, update } = useCustomRoles()
const { catalog } = useModuleCatalog()
const allModuleKeys = catalog.flatMap((g) => g.modules.map((m) => m.key))
const toast = useToast()

const loadingDetail = ref(true)
const saving = ref(false)
const formError = ref('')

type Grid = Record<string, Record<PermissionAction, boolean>>

function emptyGrid(): Grid {
  const grid: Grid = {}
  for (const key of allModuleKeys) {
    grid[key] = { READ: false, WRITE: false, APPROVE: false }
  }
  return grid
}

function gridFromPermissions(permissions: PermissionGrant[]): Grid {
  const grid = emptyGrid()
  for (const grant of permissions) {
    if (grid[grant.module]) grid[grant.module][grant.action] = true
  }
  return grid
}

function permissionsFromGrid(grid: Grid): PermissionGrant[] {
  const grants: PermissionGrant[] = []
  for (const [module, actions] of Object.entries(grid)) {
    for (const action of ['READ', 'WRITE', 'APPROVE'] as PermissionAction[]) {
      if (actions[action]) grants.push({ module, action })
    }
  }
  return grants
}

const form = reactive<{ name: string; description: string; grid: Grid }>({
  name: '',
  description: '',
  grid: emptyGrid()
})

const allSelected = computed(() => allModuleKeys.every((key) => isModuleFullySelected(key)))
function toggleAll(value: boolean) {
  for (const key of allModuleKeys) {
    toggleModule(key, value)
  }
}
function isModuleFullySelected(key: string) {
  const actions = form.grid[key]
  return actions.READ && actions.WRITE && actions.APPROVE
}
function toggleModule(key: string, value: boolean) {
  form.grid[key].READ = value
  form.grid[key].WRITE = value
  form.grid[key].APPROVE = value
}

const pageTitle = computed(() => (isNew ? 'New custom role' : 'Edit custom role'))

const formSnapshot = ref('')
function snapshotForm() {
  formSnapshot.value = JSON.stringify(form)
}
const isDirty = computed(() => JSON.stringify(form) !== formSnapshot.value)

const showLeaveConfirm = ref(false)
function onLeave() {
  if (isDirty.value) {
    showLeaveConfirm.value = true
  } else {
    router.push('/custom-roles')
  }
}
function confirmLeave() {
  showLeaveConfirm.value = false
  router.push('/custom-roles')
}

async function loadDetail() {
  loadingDetail.value = true
  try {
    if (isNew) {
      snapshotForm()
      return
    }
    const detail = await get(Number(idParam))
    form.name = detail.name
    form.description = detail.description ?? ''
    form.grid = gridFromPermissions(detail.permissions)
    snapshotForm()
  } catch (err) {
    formError.value = apiErrorMessage(err)
  } finally {
    loadingDetail.value = false
  }
}

async function onSaveForm() {
  formError.value = ''
  if (!form.name.trim()) {
    formError.value = 'Please enter a name'
    return
  }
  const payload: CustomRolePayload = {
    name: form.name,
    description: form.description || undefined,
    permissions: permissionsFromGrid(form.grid)
  }
  saving.value = true
  try {
    if (isNew) {
      await create(payload)
      toast.add({ title: 'Custom role created', color: 'success' })
    } else {
      await update(Number(idParam), payload)
      toast.add({ title: 'Custom role updated', color: 'success' })
    }
    router.push('/custom-roles')
  } catch (err) {
    formError.value = apiErrorMessage(err)
  } finally {
    saving.value = false
  }
}

onMounted(loadDetail)
</script>
