<script setup>
import FilterDropdown from "../shared/FilterDropdown.vue";
import SortDropdown from "../shared/SortDropdown.vue";
import ViewDropdown from "../shared/ViewDropdown.vue";
import ShowCountDropdown from "../shared/ShowCountDropdown.vue";
import { watch } from "vue";

const emit = defineEmits([
  "filter-changed",
  "sort-changed",
  "view-changed",
  "count-changed",
]);

const filter = defineModel("filter");
const sort = defineModel("sort");
const view = defineModel("view");
const showCount = defineModel("showCount");

// Watch for changes and emit events
watch(filter, (newVal) => {
  emit("filter-changed", newVal);
});

watch(sort, (newVal) => {
  emit("sort-changed", newVal);
});

watch(view, (newVal) => {
  emit("view-changed", newVal);
});

watch(showCount, (newVal) => {
  emit("count-changed", newVal);
});
</script>

<template>
  <div class="flex flex-wrap justify-between items-center mb-6 gap-4">
    <div class="flex flex-wrap gap-2">
      <FilterDropdown v-model:filter="filter" />
      <SortDropdown v-model:sort="sort" />
      <ViewDropdown v-model:view="view" />
      <ShowCountDropdown v-model:showCount="showCount" />
    </div>

    <div>
      <button
        disabled
        title="Customize is under maintenance"
        class="bg-gray-300 text-gray-600 px-4 py-2 rounded cursor-not-allowed"
      >
        Customize this page
      </button>
    </div>
  </div>
</template>
