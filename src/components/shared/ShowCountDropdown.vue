<script setup>
const model = defineModel("showCount");

// Set default value if unset
if (!model.value) {
  model.value = "all";
}
</script>

<template>
  <label for="showCount" class="mr-2 mt-1 ml-2">Show</label>
  <select
    v-model="model"
    class="border rounded px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500"
  >
    <option value="all">All</option>
    <option value="12">12</option>
  </select>
</template>
