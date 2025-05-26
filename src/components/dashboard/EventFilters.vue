<script setup>
import { watch, computed } from "vue";
import { useDarkModeStore } from "@/stores/darkMode";

const darkModeStore = useDarkModeStore();
const isDarkMode = computed(() => darkModeStore.isDarkMode);

const emit = defineEmits(["filter-changed"]);
const filter = defineModel("filter");

watch(filter, (newVal) => {
  emit("filter-changed", newVal);
});
</script>

<template>
  <div class="relative w-full max-w-xs">
    <!-- Left filter icon -->
    <div
      class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
    >
      <i
        class="fas fa-filter text-sm transition-colors"
        :class="isDarkMode ? 'text-green-400' : 'text-green-600'"
      ></i>
    </div>

    <!-- Right chevron icon -->
    <div
      class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"
    >
      <i
        class="fas fa-chevron-down text-sm transition-colors"
        :class="isDarkMode ? 'text-green-400' : 'text-green-600'"
      ></i>
    </div>

    <!-- Dropdown select -->
    <select
      v-model="filter"
      class="block w-full appearance-none border rounded-lg pl-10 pr-8 py-2 text-sm focus:outline-none focus:ring-2 transition-colors duration-200"
      :class="
        isDarkMode
          ? 'border-green-600 text-gray-300 bg-gray-700 hover:bg-gray-600 focus:ring-green-400'
          : 'border-green-300 text-gray-700 bg-white hover:bg-green-50 focus:ring-green-600'
      "
    >
      <option
        value="all"
        :class="
          isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-white text-gray-700'
        "
      >
        All Events
      </option>
      <option
        value="active"
        :class="
          isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-white text-gray-700'
        "
      >
        Active Events
      </option>
      <option
        value="inactive"
        :class="
          isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-white text-gray-700'
        "
      >
        Inactive Events
      </option>
      <option
        value="completed"
        :class="
          isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-white text-gray-700'
        "
      >
        Completed Events
      </option>
    </select>
  </div>
</template>
