<script setup>
import { defineProps, defineEmits } from "vue";

const props = defineProps({
  show: Boolean,
  loading: Boolean,
});

const emit = defineEmits(["close", "confirm"]);
</script>

<template>
  <div
    v-if="show"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
  >
    <div class="bg-white rounded-lg shadow-xl max-w-md w-full relative">
      <button
        @click="emit('close')"
        class="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-gray-600 hover:text-gray-800 transition"
        title="Close"
      >
        <i class="fas fa-times text-xl"></i>
      </button>
      <div class="p-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Reset Event</h3>
        <p class="text-gray-600 mb-6">
          Are you sure you want to reset this event? This will set the event
          status to inactive.
        </p>
        <div class="flex justify-end space-x-3">
          <button
            @click="emit('confirm')"
            :disabled="loading"
            class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="loading">Resetting...</span>
            <span v-else>Reset Event</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
