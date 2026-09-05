<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
      <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Overview widgets go here as features are added.</p>
    </div>

    <section>
      <DashboardSectionHeader icon="i-lucide-layout-dashboard" label="Getting started" />
      <UCard>
        <EmptyState
          icon="i-lucide-layout-dashboard"
          title="No widgets yet"
          description="Wire up StatTile cards here, backed by a report composable, the same way property-management-web's dashboard does."
        />
      </UCard>
    </section>
  </div>
</template>

<script setup lang="ts"></script>
