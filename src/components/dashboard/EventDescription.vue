<script setup>
import { computed, defineProps } from "vue";
import { useDarkModeStore } from "@/stores/darkMode";

defineProps({
  description: String,
});

const darkModeStore = useDarkModeStore();
const isDarkMode = computed(() => darkModeStore.isDarkMode);

// Helper to estimate reading time
const getReadingTime = (text) => {
  if (!text) return 0;
  const wordsPerMinute = 200;
  const wordCount = text.trim().split(/\s+/).length;
  const minutes = Math.ceil(wordCount / wordsPerMinute);
  return minutes;
};

// Helper to count words
const getWordCount = (text) => {
  if (!text) return 0;
  return text.trim().split(/\s+/).length;
};
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
            ? 'bg-indigo-900/30 text-indigo-400'
            : 'bg-indigo-100 text-indigo-600'
        "
      >
        <i class="fas fa-file-alt text-lg"></i>
      </div>
      <div>
        <h3
          class="text-lg font-semibold transition-colors"
          :class="isDarkMode ? 'text-white' : 'text-gray-800'"
        >
          Event Description
        </h3>
        <p
          class="text-xs transition-colors"
          :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'"
        >
          Event overview and details
        </p>
      </div>
    </div>

    <!-- Description Content -->
    <div v-if="description" class="space-y-4">
      <!-- Description Text -->
      <div
        class="prose prose-sm max-w-none transition-colors"
        :class="isDarkMode ? 'prose-invert text-gray-300' : 'text-gray-700'"
      >
        <div
          class="p-4 rounded-lg leading-relaxed transition-all duration-200"
          :class="
            isDarkMode
              ? 'bg-gray-700/30 hover:bg-gray-700/50'
              : 'bg-gray-50 hover:bg-gray-100/70'
          "
        >
          {{ description }}
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-8">
      <div
        class="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 transition-colors"
        :class="
          isDarkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-100 text-gray-400'
        "
      >
        <i class="fas fa-edit text-2xl"></i>
      </div>
      <h4
        class="text-lg font-medium mb-2 transition-colors"
        :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'"
      >
        No Description Available
      </h4>
      <p
        class="text-sm mb-4 transition-colors"
        :class="isDarkMode ? 'text-gray-500' : 'text-gray-500'"
      >
        Add a description to provide more context about this event.
      </p>

      <!-- Call to Action -->
      <div
        class="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105"
        :class="
          isDarkMode
            ? 'bg-indigo-900/30 text-indigo-400 hover:bg-indigo-900/50'
            : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
        "
      >
        <i class="fas fa-plus mr-2"></i>
        Edit event to add description
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Custom prose styling for dark mode */
.prose-invert {
  color: rgb(209, 213, 219);
}

.prose-invert strong {
  color: rgb(243, 244, 246);
}

.prose-invert em {
  color: rgb(156, 163, 175);
}

/* Smooth text selection */
::selection {
  background-color: rgba(99, 102, 241, 0.3);
}

.dark ::selection {
  background-color: rgba(129, 140, 248, 0.3);
}
</style>
