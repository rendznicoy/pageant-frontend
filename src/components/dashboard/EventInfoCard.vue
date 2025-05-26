<script setup>
import { computed } from "vue";
import { useDarkModeStore } from "@/stores/darkMode";

defineProps({
  event: Object,
  date: String,
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
              ? 'bg-blue-900/30 text-blue-400'
              : 'bg-blue-100 text-blue-600'
          "
        >
          <i class="fas fa-calendar-alt"></i>
        </div>
        <h2
          class="text-xl font-semibold transition-colors"
          :class="isDarkMode ? 'text-white' : 'text-blue-800'"
        >
          Event Information
        </h2>
      </div>

      <div v-if="event" class="space-y-3">
        <div class="flex items-start">
          <div
            class="w-32 font-medium transition-colors"
            :class="isDarkMode ? 'text-gray-300' : 'text-gray-600'"
          >
            Event Name:
          </div>
          <div
            class="flex-1 font-medium transition-colors"
            :class="isDarkMode ? 'text-white' : 'text-gray-800'"
          >
            {{ event.event_name }}
          </div>
        </div>
        <div class="flex items-start">
          <div
            class="w-32 font-medium transition-colors"
            :class="isDarkMode ? 'text-gray-300' : 'text-gray-600'"
          >
            Date:
          </div>
          <div
            class="flex-1 transition-colors"
            :class="isDarkMode ? 'text-gray-100' : 'text-gray-800'"
          >
            {{ date }}
          </div>
        </div>
        <div class="flex items-start">
          <div
            class="w-32 font-medium transition-colors"
            :class="isDarkMode ? 'text-gray-300' : 'text-gray-600'"
          >
            Location:
          </div>
          <div
            class="flex-1 transition-colors"
            :class="isDarkMode ? 'text-gray-100' : 'text-gray-800'"
          >
            {{ event.venue || "TBA" }}
          </div>
        </div>
      </div>

      <div v-else class="flex items-center justify-center h-24">
        <div class="flex items-center space-x-2">
          <div
            class="animate-spin w-5 h-5 border-2 border-t-transparent rounded-full transition-colors"
            :class="isDarkMode ? 'border-blue-400' : 'border-blue-600'"
          ></div>
          <span
            class="transition-colors"
            :class="isDarkMode ? 'text-gray-300' : 'text-gray-400'"
          >
            Loading event information...
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
