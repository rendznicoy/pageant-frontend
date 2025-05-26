<script setup>
import { defineProps, defineEmits } from "vue";

const props = defineProps({
  show: Boolean,
  loading: Boolean,
  isDarkMode: {
    type: Boolean,
    default: false,
  },
  eventName: {
    type: String,
    default: "this event",
  },
});

const emit = defineEmits(["close", "confirm"]);
</script>

<template>
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="show"
      class="fixed inset-0 backdrop-blur-sm bg-black/50 flex items-center justify-center z-[9999] p-4"
      @click.self="emit('close')"
    >
      <Transition
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="transform opacity-0 scale-75"
        enter-to-class="transform opacity-100 scale-100"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="transform opacity-100 scale-100"
        leave-to-class="transform opacity-0 scale-75"
      >
        <div
          v-if="show"
          class="rounded-xl shadow-xl max-w-md w-full relative"
          :class="
            isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'
          "
        >
          <button
            @click="emit('close')"
            :disabled="loading"
            class="absolute top-4 right-4 w-8 h-8 flex items-center justify-center transition-all duration-200 rounded-full disabled:opacity-50"
            :class="
              isDarkMode
                ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            "
            title="Close"
          >
            <i class="fas fa-times text-lg"></i>
          </button>

          <div class="p-6">
            <div class="flex items-center mb-6">
              <div
                class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 sm:mx-0 sm:h-10 sm:w-10"
              >
                <i
                  class="fas fa-exclamation-triangle text-red-600 dark:text-red-400"
                ></i>
              </div>
              <div class="ml-4">
                <h3
                  class="text-lg font-semibold transition-colors"
                  :class="isDarkMode ? 'text-white' : 'text-gray-900'"
                >
                  Delete Event
                </h3>
              </div>
            </div>

            <div class="mb-6">
              <p
                class="mb-4 transition-colors"
                :class="isDarkMode ? 'text-gray-300' : 'text-gray-600'"
              >
                Are you sure you want to
                <strong class="text-red-600 dark:text-red-400">DELETE</strong>
                this event? This action will
                <strong class="text-red-600 dark:text-red-400"
                  >PERMANENTLY</strong
                >
                remove the event and all associated data.
              </p>

              <div
                class="text-sm border rounded-lg px-4 py-3 transition-colors"
                :class="
                  isDarkMode
                    ? 'bg-red-900/20 border-red-500/50 text-red-200'
                    : 'bg-red-50 border-red-200 text-red-700'
                "
              >
                <div class="flex items-start">
                  <i
                    class="fas fa-exclamation-triangle mr-2 mt-0.5 flex-shrink-0"
                  ></i>
                  <div>
                    <p class="font-medium mb-1">
                      Warning: This action cannot be undone!
                    </p>
                    <p class="text-xs opacity-90">
                      All event data, including judges, candidates, scores, and
                      stages will be permanently deleted.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div class="flex justify-end space-x-3">
              <button
                @click="emit('close')"
                :disabled="loading"
                class="px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                :class="
                  isDarkMode
                    ? 'text-gray-300 border border-gray-600 hover:bg-gray-700 focus:ring-gray-500'
                    : 'text-gray-700 border border-gray-300 hover:bg-gray-100 focus:ring-gray-500'
                "
              >
                Cancel
              </button>
              <button
                @click="emit('confirm')"
                :disabled="loading"
                class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-[120px] justify-center"
              >
                <i v-if="loading" class="fas fa-spinner fa-spin"></i>
                <i v-else class="fas fa-trash"></i>
                {{ loading ? "Deleting..." : "Delete Event" }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>
