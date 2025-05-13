<script setup>
import { defineEmits } from "vue";

const emit = defineEmits([
  "edit",
  "view-results",
  "delete",
  "start",
  "finalize",
  "reset",
]);
</script>

<template>
  <div class="bg-white p-4 rounded border">
    <h3 class="font-medium text-gray-800 mb-4">Actions</h3>
    <div class="space-y-3">
      <button
        @click="$emit('edit')"
        class="w-full py-2 bg-green-600 text-white rounded hover:bg-green-700 transition flex items-center justify-center"
      >
        <i class="fas fa-edit mr-2"></i>
        Edit Event
      </button>
      <button
        @click="$emit('view-results')"
        class="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition flex items-center justify-center"
      >
        <i class="fas fa-chart-line mr-2"></i>
        View Results
      </button>
      <button
        @click="$emit('start')"
        class="w-full py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition flex items-center justify-center"
      >
        <i class="fas fa-play mr-2"></i>
        Start Event
      </button>
      <button
        @click="$emit('finalize')"
        class="w-full py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition flex items-center justify-center"
      >
        <i class="fas fa-check-circle mr-2"></i>
        Finalize Event
      </button>
      <button
        @click="$emit('reset')"
        class="w-full py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition flex items-center justify-center"
      >
        <i class="fas fa-undo mr-2"></i>
        Reset Event
      </button>
      <button
        @click="$emit('delete')"
        class="w-full py-2 bg-red-600 text-white rounded hover:bg-red-700 transition flex items-center justify-center"
      >
        <i class="fas fa-trash mr-2"></i>
        Delete Event
      </button>
    </div>
  </div>
</template>
