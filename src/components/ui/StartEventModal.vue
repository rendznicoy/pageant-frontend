<script setup>
import { defineProps, defineEmits } from "vue";

const props = defineProps({
  show: Boolean,
  loading: Boolean,
  isDarkMode: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["close", "confirm"]);
</script>

<template>
  <div
    v-if="show"
    class="fixed inset-0 backdrop-blur-sm bg-black/50 bg-opacity-50 flex items-center justify-center z-50 p-4 transition-all duration-300"
  >
    <div
      class="rounded-lg shadow-xl max-w-md w-full relative animate-in fade-in-0 zoom-in-95 transition-all duration-300"
      :class="isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'"
    >
      <button
        @click="emit('close')"
        class="absolute top-4 right-4 w-8 h-8 flex items-center justify-center transition-all duration-200 rounded-full"
        :class="
          isDarkMode
            ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
            : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
        "
        title="Close"
      >
        <i class="fas fa-times text-xl"></i>
      </button>
      <div class="p-6">
        <div class="flex items-center mb-4">
          <div
            class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 sm:mx-0 sm:h-10 sm:w-10"
          >
            <i class="fas fa-play text-indigo-600"></i>
          </div>
          <div class="ml-4">
            <h3
              class="text-lg font-medium transition-colors"
              :class="isDarkMode ? 'text-white' : 'text-gray-900'"
            >
              Start Event
            </h3>
          </div>
        </div>
        <p
          class="mb-6 transition-colors"
          :class="isDarkMode ? 'text-gray-300' : 'text-gray-600'"
        >
          Are you sure you want to start this event? This will disable most
          functionalities as the scoring is ongoing.
        </p>
        <div
          class="text-sm border rounded-lg px-4 py-3 mb-6 transition-colors"
          :class="
            isDarkMode
              ? 'bg-indigo-900/20 border-indigo-500 text-indigo-200'
              : 'bg-indigo-50 border-indigo-400 text-indigo-700'
          "
        >
          <i class="fas fa-info-circle mr-2"></i>
          Once started, you will not be able to modify judges, candidates, or
          categories.
        </div>
        <div class="flex justify-end space-x-3">
          <button
            @click="emit('close')"
            class="px-4 py-2 text-sm rounded transition-all duration-200"
            :class="
              isDarkMode
                ? 'text-gray-300 border border-gray-600 hover:bg-gray-700'
                : 'text-gray-700 border border-gray-300 hover:bg-gray-100'
            "
          >
            Cancel
          </button>
          <button
            @click="emit('confirm')"
            :disabled="loading"
            class="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <i v-if="loading" class="fas fa-spinner fa-spin"></i>
            <i v-else class="fas fa-play"></i>
            {{ loading ? "Starting..." : "Start Event" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
