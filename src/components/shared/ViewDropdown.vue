<script setup>
const model = defineModel("view");

// Default to "card" if no value is set
if (!model.value) {
  model.value = "card";
}
</script>

<template>
  <i
    class="fas fa-grip text-green-900 items-center justify-center mt-2 ml-2"
  ></i>
  <select
    v-model="model"
    class="border rounded px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500"
  >
    <option value="card">Card</option>
    <option value="list">List</option>
  </select>
</template>
