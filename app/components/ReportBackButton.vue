<template>
  <UButton variant="link" color="primary" icon="i-lucide-arrow-left" size="xs" class="mb-1 px-0" @click="goBack"> Back to reports </UButton>
</template>

<script setup lang="ts">
// Every report page renders this, near the top — the one place common to all
// of them — so it doubles as where a visit gets recorded for the reports
// index's "Recently viewed" section.
//
// Navigates with an explicit #section hash rather than router.back(): the
// previous approach relied on the browser/Nuxt restoring the reports index's
// *scroll position* on a real back/popstate navigation, but that restore
// races against that page's own async widgets (summary tiles, the trend
// chart) resizing it after mount, and silently loses whenever that race
// goes the wrong way — which is exactly the "doesn't remember where I was"
// bug this replaces. A route hash is resolved by Nuxt's router
// scrollBehavior itself (the same mechanism the category jump-nav bar's
// plain `#anchor` links already use), so there's no race to lose.
const router = useRouter()
const route = useRoute()
const { recordVisit } = useRecentReports()
const { sectionIdForPath } = useReportCatalog()

onMounted(() => {
  recordVisit(route.path)
})

function goBack() {
  const sectionId = sectionIdForPath(route.path)
  if (sectionId) {
    router.push({ path: '/reports', hash: `#${sectionId}` })
  } else if (window.history.state?.back) {
    router.back()
  } else {
    router.push('/reports')
  }
}
</script>
