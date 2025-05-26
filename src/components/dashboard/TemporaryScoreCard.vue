<script setup>
import { computed } from "vue";
import { useDarkModeStore } from "@/stores/darkMode";

defineProps({
  score: Number,
  comments: String,
  isSubmitting: Boolean,
  maxScore: Number,
});
const emit = defineEmits(["confirmScore"]);

const darkModeStore = useDarkModeStore();
const isDarkMode = computed(() => darkModeStore.isDarkMode);

function confirmScore() {
  emit("confirmScore");
}
</script>

<template>
  <div
    class="mb-6 p-6 rounded-xl border transition-all duration-300"
    :class="
      isDarkMode
        ? 'bg-blue-900/30 border-blue-700 shadow-lg shadow-blue-900/20'
        : 'bg-blue-50 border-blue-200 shadow-blue-100/50'
    "
  >
    <div class="flex items-center mb-4">
      <i
        class="fas fa-clock mr-2 transition-colors"
        :class="isDarkMode ? 'text-blue-400' : 'text-blue-600'"
      ></i>
      <h3
        class="text-lg font-semibold transition-colors"
        :class="isDarkMode ? 'text-blue-300' : 'text-blue-800'"
      >
        Temporary Score
      </h3>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
      <div>
        <div
          class="text-sm font-medium mb-1 transition-colors"
          :class="isDarkMode ? 'text-gray-300' : 'text-gray-600'"
        >
          Score:
        </div>
        <div
          class="text-3xl font-bold transition-colors"
          :class="isDarkMode ? 'text-blue-300' : 'text-blue-800'"
        >
          {{ score }}<span class="text-lg">/{{ maxScore }}</span>
        </div>
      </div>
      <div>
        <div
          class="text-sm font-medium mb-1 transition-colors"
          :class="isDarkMode ? 'text-gray-300' : 'text-gray-600'"
        >
          Comments:
        </div>
        <div
          class="transition-colors"
          :class="isDarkMode ? 'text-gray-100' : 'text-gray-800'"
        >
          {{ comments || "None" }}
        </div>
      </div>
    </div>
    <button
      @click="confirmScore"
      :disabled="isSubmitting"
      class="w-full py-3 px-6 rounded-lg font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center hover:scale-[1.02] shadow-lg"
      :class="
        isDarkMode
          ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-900/20'
          : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'
      "
    >
      <span v-if="isSubmitting" class="mr-2">
        <svg
          class="animate-spin h-5 w-5 text-white"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          ></circle>
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      </span>
      <i class="fas fa-check mr-2"></i>
      Confirm Score
    </button>
  </div>
</template>
