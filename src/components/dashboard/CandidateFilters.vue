<script setup>
import { computed } from "vue";

const props = defineProps({
  filter: String,
  candidates: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(["update:filter"]);

// Extract unique teams from the candidate list
const teams = computed(() => {
  const allTeams = props.candidates.map((c) => c.team?.trim()).filter(Boolean);
  return [...new Set(allTeams)].sort();
});
</script>

<template>
  <div class="relative w-full max-w-xs overflow-x-auto overflow-y-auto">
    <!-- Left filter icon -->
    <div
      class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
    >
      <i class="fas fa-filter text-green-600 text-sm"></i>
    </div>

    <!-- Right chevron icon -->
    <div
      class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"
    >
      <i class="fas fa-chevron-down text-green-600 text-sm"></i>
    </div>

    <!-- Dropdown select -->
    <select
      :value="filter"
      @change="emit('update:filter', $event.target.value)"
      class="block w-full appearance-none border border-green-300 rounded-lg pl-10 pr-8 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-600 bg-white hover:bg-green-50"
    >
      <option value="all" class="bg-white hover:bg-green-50 text-gray-700">
        All Teams
      </option>
      <option
        v-for="team in teams"
        :key="team"
        :value="team"
        class="bg-white hover:bg-green-50 text-gray-700"
      >
        {{ team }}
      </option>
    </select>
  </div>
</template>
