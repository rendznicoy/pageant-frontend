<script setup>
import { watch } from "vue";

const emit = defineEmits(["filter-changed"]);

const filter = defineModel("filter");

watch(filter, (newVal) => {
  emit("filter-changed", newVal);
});
</script>

<template>
  <div class="flex flex-wrap items-center mb-6 gap-4">
    <div class="flex flex-wrap gap-2">
      <select
        v-model="filter"
        class="p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
      >
        <option value="all">All Events</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
        <option value="completed">Completed</option>
      </select>
    </div>
  </div>
</template>
