<script setup>
import { computed, defineProps } from "vue";

const props = defineProps({
  statisticians: {
    type: [Array, null],
    default: () => [],
  },
});

const safeStatisticians = computed(() => props.statisticians || []);
</script>

<template>
  <div class="bg-gray-50 p-4 rounded border">
    <h3 class="font-medium text-gray-800 mb-2">Statisticians</h3>
    <ul
      v-if="safeStatisticians.length"
      class="list-disc list-inside text-gray-600"
    >
      <li v-for="stat in safeStatisticians" :key="stat.id || stat.name">
        {{ stat.name || `${stat.first_name} ${stat.last_name}` }}
      </li>
    </ul>
    <p v-else class="text-gray-400 italic">No statistician/s assigned.</p>
  </div>
</template>
