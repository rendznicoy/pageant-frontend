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
    class="dark-mode-toggle"
    :class="{ 'dark-mode-active': isDarkMode }"
    aria-label="Toggle dark mode"
  >
    <div class="toggle-container">
      <i class="fas fa-sun sun-icon" :class="{ 'sun-hidden': isDarkMode }"></i>
      <i
        class="fas fa-moon moon-icon"
        :class="{ 'moon-visible': isDarkMode }"
      ></i>
    </div>
  </button>
</template>

<style scoped>
.dark-mode-toggle {
  position: relative;
  padding: 0.5rem;
  border-radius: 0.375rem;
  background-color: rgba(255, 255, 255, 0.1);
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
  overflow: hidden;
}

.dark-mode-toggle:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

.toggle-container {
  position: relative;
  width: 1.5rem;
  height: 1.5rem;
}

.sun-icon,
.moon-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  transition: all 0.3s ease;
  color: #fbbf24;
}

.moon-icon {
  color: #60a5fa;
  opacity: 0;
  transform: translate(-50%, -50%) rotate(180deg);
}

.moon-visible {
  opacity: 1;
  transform: translate(-50%, -50%) rotate(0deg);
}

.sun-hidden {
  opacity: 0;
  transform: translate(-50%, -50%) rotate(-180deg);
}

.dark-mode-active {
  background-color: rgba(59, 130, 246, 0.2);
}
</style>
