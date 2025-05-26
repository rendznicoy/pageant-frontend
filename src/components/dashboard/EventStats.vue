<script setup>
import { computed } from "vue";
import { useDarkModeStore } from "@/stores/darkMode";

defineProps({
  candidatesCount: Number,
  judgesCount: Number,
  categoriesCount: Number,
});

const darkModeStore = useDarkModeStore();
const isDarkMode = computed(() => darkModeStore.isDarkMode);
</script>

<template>
  <div
    class="rounded-xl shadow-lg p-6 transition-all duration-300 border"
    :class="
      isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    "
  >
    <!-- Header -->
    <div class="flex items-center mb-6">
      <div
        class="w-10 h-10 rounded-lg flex items-center justify-center mr-3"
        :class="
          isDarkMode
            ? 'bg-blue-900/30 text-blue-400'
            : 'bg-blue-100 text-blue-600'
        "
      >
        <i class="fas fa-chart-bar text-lg"></i>
      </div>
      <h3
        class="text-lg font-semibold transition-colors"
        :class="isDarkMode ? 'text-white' : 'text-gray-800'"
      >
        Event Statistics
      </h3>
    </div>

    <!-- Statistics Grid -->
    <div class="space-y-4">
      <!-- Candidates -->
      <div
        class="flex items-center justify-between p-4 rounded-lg transition-all duration-200 hover:scale-[1.02]"
        :class="
          isDarkMode
            ? 'bg-gray-700/50 hover:bg-gray-700'
            : 'bg-gray-50 hover:bg-gray-100'
        "
      >
        <div class="flex items-center">
          <div
            class="w-8 h-8 rounded-full flex items-center justify-center mr-3"
            :class="
              isDarkMode
                ? 'bg-green-900/40 text-green-400'
                : 'bg-green-100 text-green-600'
            "
          >
            <i class="fas fa-users text-sm"></i>
          </div>
          <div>
            <span
              class="text-sm font-medium transition-colors"
              :class="isDarkMode ? 'text-gray-300' : 'text-gray-600'"
            >
              Candidates
            </span>
            <p
              class="text-xs transition-colors"
              :class="isDarkMode ? 'text-gray-500' : 'text-gray-400'"
            >
              Total participants
            </p>
          </div>
        </div>
        <div class="text-right">
          <span
            class="text-2xl font-bold transition-colors"
            :class="
              isDarkMode
                ? candidatesCount > 0
                  ? 'text-green-400'
                  : 'text-gray-400'
                : candidatesCount > 0
                ? 'text-green-600'
                : 'text-gray-500'
            "
          >
            {{ candidatesCount || 0 }}
          </span>
        </div>
      </div>

      <!-- Judges -->
      <div
        class="flex items-center justify-between p-4 rounded-lg transition-all duration-200 hover:scale-[1.02]"
        :class="
          isDarkMode
            ? 'bg-gray-700/50 hover:bg-gray-700'
            : 'bg-gray-50 hover:bg-gray-100'
        "
      >
        <div class="flex items-center">
          <div
            class="w-8 h-8 rounded-full flex items-center justify-center mr-3"
            :class="
              isDarkMode
                ? 'bg-purple-900/40 text-purple-400'
                : 'bg-purple-100 text-purple-600'
            "
          >
            <i class="fas fa-gavel text-sm"></i>
          </div>
          <div>
            <span
              class="text-sm font-medium transition-colors"
              :class="isDarkMode ? 'text-gray-300' : 'text-gray-600'"
            >
              Judges
            </span>
            <p
              class="text-xs transition-colors"
              :class="isDarkMode ? 'text-gray-500' : 'text-gray-400'"
            >
              Event evaluators
            </p>
          </div>
        </div>
        <div class="text-right">
          <span
            class="text-2xl font-bold transition-colors"
            :class="
              isDarkMode
                ? judgesCount > 0
                  ? 'text-purple-400'
                  : 'text-gray-400'
                : judgesCount > 0
                ? 'text-purple-600'
                : 'text-gray-500'
            "
          >
            {{ judgesCount || 0 }}
          </span>
        </div>
      </div>

      <!-- Categories -->
      <div
        class="flex items-center justify-between p-4 rounded-lg transition-all duration-200 hover:scale-[1.02]"
        :class="
          isDarkMode
            ? 'bg-gray-700/50 hover:bg-gray-700'
            : 'bg-gray-50 hover:bg-gray-100'
        "
      >
        <div class="flex items-center">
          <div
            class="w-8 h-8 rounded-full flex items-center justify-center mr-3"
            :class="
              isDarkMode
                ? 'bg-amber-900/40 text-amber-400'
                : 'bg-amber-100 text-amber-600'
            "
          >
            <i class="fas fa-list text-sm"></i>
          </div>
          <div>
            <span
              class="text-sm font-medium transition-colors"
              :class="isDarkMode ? 'text-gray-300' : 'text-gray-600'"
            >
              Categories
            </span>
            <p
              class="text-xs transition-colors"
              :class="isDarkMode ? 'text-gray-500' : 'text-gray-400'"
            >
              Scoring criteria
            </p>
          </div>
        </div>
        <div class="text-right">
          <span
            class="text-2xl font-bold transition-colors"
            :class="
              isDarkMode
                ? categoriesCount > 0
                  ? 'text-amber-400'
                  : 'text-gray-400'
                : categoriesCount > 0
                ? 'text-amber-600'
                : 'text-gray-500'
            "
          >
            {{ categoriesCount || 0 }}
          </span>
        </div>
      </div>
    </div>

    <!-- Status Indicator -->
    <div
      class="mt-6 pt-4 border-t transition-colors"
      :class="isDarkMode ? 'border-gray-600' : 'border-gray-200'"
    >
      <div class="flex items-center justify-center">
        <div
          v-if="candidatesCount > 0 && judgesCount > 0 && categoriesCount > 0"
          class="flex items-center px-3 py-2 rounded-full text-sm font-medium"
          :class="
            isDarkMode
              ? 'bg-green-900/30 text-green-400'
              : 'bg-green-100 text-green-700'
          "
        >
          <i class="fas fa-check-circle mr-2"></i>
          Ready for Event
        </div>
        <div
          v-else
          class="flex items-center px-3 py-2 rounded-full text-sm font-medium"
          :class="
            isDarkMode
              ? 'bg-amber-900/30 text-amber-400'
              : 'bg-amber-100 text-amber-700'
          "
        >
          <i class="fas fa-exclamation-triangle mr-2"></i>
          Setup Required
        </div>
      </div>
    </div>
  </div>
</template>
