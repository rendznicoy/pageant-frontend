<script setup>
import { computed } from "vue";
import { useDarkModeStore } from "@/stores/darkMode";

const darkModeStore = useDarkModeStore();
const isDarkMode = computed(() => darkModeStore.isDarkMode);

const toggleDarkMode = () => {
  darkModeStore.toggle();
};
</script>

<template>
  <button
    @click="toggleDarkMode"
    class="relative p-3 rounded-lg transition-all duration-300 ease-in-out hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2"
    :class="
      isDarkMode
        ? 'bg-gray-700 hover:bg-gray-600 text-yellow-400 focus:ring-yellow-400'
        : 'bg-gray-100 hover:bg-gray-200 text-gray-600 focus:ring-blue-500'
    "
    aria-label="Toggle dark mode"
  >
    <div class="relative w-5 h-5 overflow-hidden">
      <!-- Sun Icon -->
      <i
        class="fas fa-sun absolute inset-0 flex items-center justify-center transition-all duration-300 ease-in-out"
        :class="
          isDarkMode
            ? 'opacity-0 transform rotate-180 scale-50'
            : 'opacity-100 transform rotate-0 scale-100'
        "
      ></i>

      <!-- Moon Icon -->
      <i
        class="fas fa-moon absolute inset-0 flex items-center justify-center transition-all duration-300 ease-in-out"
        :class="
          isDarkMode
            ? 'opacity-100 transform rotate-0 scale-100'
            : 'opacity-0 transform -rotate-180 scale-50'
        "
      ></i>
    </div>
  </button>
</template>

<style scoped>
/* Additional styling for smooth transitions */
.fas {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

button:hover .fas {
  transform: scale(1.1);
}

/* Ensure proper centering */
.fas {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}
</style>
