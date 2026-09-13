<template>
  <UButton variant="link" color="primary" icon="i-lucide-arrow-left" size="xs" class="mb-1 px-0" @click="goBack"> Back to reports </UButton>
</template>

<script setup lang="ts">
// Every report page renders this, near the top — the one place common to all
// of them — so it doubles as where a visit gets recorded for the reports
// index's "Recently viewed" section. Uses router.back() instead of a plain
// `to="/reports"` link because Nuxt only restores the reports index's scroll
// position on an actual back/popstate navigation, not on a fresh push —
// falls back to a push for direct/deep-linked visits with no in-app history.
const router = useRouter()
const route = useRoute()
const { recordVisit } = useRecentReports()

onMounted(() => {
  recordVisit(route.path)
})

function goBack() {
  if (window.history.state?.back) router.back()
  else router.push('/reports')
}
</script>
