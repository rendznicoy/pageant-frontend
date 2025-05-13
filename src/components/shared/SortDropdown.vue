<script setup>
const model = defineModel("sort");

// Set default sort option
if (!model.value) {
  model.value = "event_name";
}
</script>

<template>
  <i class="fas fa-arrow-down-short-wide text-green-900 ml-2 mr-2 mt-2"></i>
  <select
    v-model="model"
    class="border rounded px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500"
  >
    <option value="event_name">Event name</option>
    <option value="last_accessed">Last accessed</option>
  </select>
</template>
