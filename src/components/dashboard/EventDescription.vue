<script setup>
import { defineProps } from "vue";

defineProps({
  description: String,
});
</script>

<template>
  <div class="bg-gray-50 p-4 rounded border">
    <h3 class="font-medium text-gray-800 mb-2">Event Description</h3>
    <p v-if="description" class="text-gray-600">{{ description }}</p>
    <p v-else class="text-gray-400 italic">No description available.</p>
  </div>
</template>
