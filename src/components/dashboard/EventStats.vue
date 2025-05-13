<script setup>
import { defineProps } from "vue";

defineProps({
  candidatesCount: Number,
  judgesCount: Number,
  categoriesCount: Number,
});
</script>

<template>
  <div class="bg-white p-4 rounded border">
    <h3 class="font-medium text-gray-800 mb-4">Event Statistics</h3>
    <div class="space-y-3">
      <div class="flex justify-between">
        <span class="text-gray-600">Candidates</span>
        <span class="font-medium">{{ candidatesCount || 0 }}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-gray-600">Judges</span>
        <span class="font-medium">{{ judgesCount || 0 }}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-gray-600">Categories</span>
        <span class="font-medium">{{ categoriesCount || 0 }}</span>
      </div>
    </div>
  </div>
</template>
