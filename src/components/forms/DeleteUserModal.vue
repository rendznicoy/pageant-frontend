<script setup>
import { computed, ref } from "vue";
import { useDarkModeStore } from "@/stores/darkMode";

const darkModeStore = useDarkModeStore();
const isDarkMode = computed(() => darkModeStore.isDarkMode);

const props = defineProps({
  user: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(["confirm", "cancel"]);

// NEW: Submission state exposed to parent
const isSubmitting = ref(false);
defineExpose({ isSubmitting });
</script>

<template>
  <div
    class="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50"
    :class="isDarkMode ? 'bg-black/60' : 'bg-black/40'"
  >
    <div
      class="p-6 rounded-lg shadow-lg max-w-sm w-full relative transition-colors duration-300"
      :class="isDarkMode ? 'bg-gray-800' : 'bg-white'"
    >
      <button
        @click="emit('cancel')"
        class="absolute top-2 right-2 text-xl font-bold p-2 rounded-full transition-colors duration-200"
        :class="
          isDarkMode
            ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
        "
        aria-label="Close"
      >
        <i class="fas fa-times"></i>
      </button>

      <h2
        class="text-xl font-semibold mb-4 transition-colors duration-200"
        :class="isDarkMode ? 'text-gray-200' : 'text-gray-800'"
      >
        Confirm Deletion
      </h2>

      <p
        class="mb-4 transition-colors duration-200"
        :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'"
      >
        Are you sure you want to delete {{ user?.first_name }}
        {{ user?.last_name }}?
      </p>

      <div class="flex justify-end space-x-4">
        <button
          @click="emit('cancel')"
          class="px-4 py-2 rounded-md transition-colors duration-200"
          :class="
            isDarkMode
              ? 'bg-gray-600 text-gray-300 hover:bg-gray-500'
              : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
          "
        >
          Cancel
        </button>
        <button
          @click="emit('confirm')"
          :disabled="isSubmitting"
          class="px-4 py-2 text-white rounded-md transition-colors duration-200 disabled:opacity-50"
          :class="
            isDarkMode
              ? 'bg-red-700 hover:bg-red-600'
              : 'bg-red-600 hover:bg-red-700'
          "
        >
          {{ isSubmitting ? "Processing..." : "Delete User" }}
        </button>
      </div>
    </div>
  </div>
</template>
