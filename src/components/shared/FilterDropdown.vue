<script setup>
const model = defineModel("filter");

// Set default filter option
if (!model.value) {
  model.value = "all";
}
</script>

<template>
  <select
    v-model="model"
    class="border rounded px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500"
  >
    <option value="all">All Events</option>
    <option value="active">Active</option>
    <option value="inactive">Inactive</option>
    <option value="completed">Completed</option>
    <option value="starred">Starred</option>
    <option value="removed">Removed</option>
  </select>
</template>
>
