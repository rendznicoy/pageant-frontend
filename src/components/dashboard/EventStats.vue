<script setup>
import { defineProps } from "vue";

defineProps({
  candidatesCount: Number,
  judgesCount: Number,
  categoriesCount: Number,
  activeCategoriesCount: Number,
  judgesWithPendingScores: Array,
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
      <div class="flex justify-between">
        <span class="text-gray-600">Active Categories</span>
        <span class="font-medium">{{ activeCategoriesCount || 0 }}</span>
      </div>
      <div class="mt-4">
        <span class="text-gray-600 font-semibold"
          >Judges with Pending Scores:</span
        >
        <ul class="list-disc list-inside text-sm mt-1">
          <li v-for="(judge, index) in judgesWithPendingScores" :key="index">
            {{ judge }}
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
