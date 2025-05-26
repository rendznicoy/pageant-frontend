<script setup>
import { computed } from "vue";
import { useDarkModeStore } from "@/stores/darkMode";

defineProps({
  judgeName: String,
  currentCategory: Object,
});

const darkModeStore = useDarkModeStore();
const isDarkMode = computed(() => darkModeStore.isDarkMode);
</script>

<template>
  <div
    class="group transform transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1"
  >
    <div
      class="rounded-xl shadow-lg p-6 h-full transition-all duration-300 border"
      :class="
        isDarkMode
          ? 'bg-gray-800 border-gray-700 hover:shadow-gray-900/50'
          : 'bg-white border-gray-200 hover:shadow-xl'
      "
    >
      <div class="flex items-center mb-4">
        <div
          class="p-2 rounded-lg mr-3 transition-colors"
          :class="
            isDarkMode
              ? 'bg-green-900/30 text-green-400'
              : 'bg-green-100 text-green-600'
          "
        >
          <i class="fas fa-user-tie"></i>
        </div>
        <h2
          class="text-xl font-semibold transition-colors"
          :class="isDarkMode ? 'text-white' : 'text-blue-800'"
        >
          Judge's Details
        </h2>
      </div>
      <div class="space-y-3">
        <div class="flex items-start">
          <div
            class="w-32 font-medium transition-colors"
            :class="isDarkMode ? 'text-gray-300' : 'text-gray-600'"
          >
            Judge Name:
          </div>
          <div
            class="flex-1 font-medium transition-colors"
            :class="isDarkMode ? 'text-white' : 'text-gray-800'"
          >
            {{ judgeName || "Loading..." }}
          </div>
        </div>
        <div class="flex items-start">
          <div
            class="w-32 font-medium transition-colors"
            :class="isDarkMode ? 'text-gray-300' : 'text-gray-600'"
          >
            Category:
          </div>
          <div
            class="flex-1 transition-colors"
            :class="isDarkMode ? 'text-gray-100' : 'text-gray-800'"
          >
            {{ currentCategory?.category_name || "Not assigned" }}
          </div>
        </div>
        <div v-if="currentCategory" class="flex items-start">
          <div
            class="w-32 font-medium transition-colors"
            :class="isDarkMode ? 'text-gray-300' : 'text-gray-600'"
          >
            Stage:
          </div>
          <div
            class="flex-1 transition-colors"
            :class="isDarkMode ? 'text-gray-100' : 'text-gray-800'"
          >
            {{ currentCategory.stage_name }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
