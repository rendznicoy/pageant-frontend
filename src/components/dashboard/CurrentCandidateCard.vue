<script setup>
import { computed } from "vue";
import { useDarkModeStore } from "@/stores/darkMode";

defineProps({
  candidate: Object,
  getCandidatePhotoUrl: Function,
  handleImageError: Function,
});

const darkModeStore = useDarkModeStore();
const isDarkMode = computed(() => darkModeStore.isDarkMode);
</script>

<template>
  <div class="lg:w-1/3 w-full">
    <div class="text-center lg:text-left">
      <div class="flex items-center justify-center lg:justify-start mb-4">
        <h3
          class="text-2xl font-bold transition-colors"
          :class="isDarkMode ? 'text-white' : 'text-gray-800'"
        >
          {{ candidate.first_name }} {{ candidate.last_name }}
        </h3>
        <span
          class="ml-3 px-3 py-1 rounded-full text-sm font-medium transition-colors"
          :class="
            isDarkMode
              ? 'bg-blue-800/50 text-blue-200 border border-blue-700'
              : 'bg-blue-100 text-blue-800 border border-blue-200'
          "
        >
          #{{ candidate.candidate_number }}
        </span>
      </div>
      <div class="relative group mx-auto lg:mx-0 w-fit">
        <img
          v-if="candidate.photo"
          :src="getCandidatePhotoUrl(candidate.photo)"
          alt="Candidate Photo"
          class="w-56 h-56 object-cover rounded-2xl shadow-lg transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl border"
          :class="isDarkMode ? 'border-gray-600' : 'border-gray-200'"
          @error="handleImageError"
        />
        <div
          v-else
          class="w-56 h-56 rounded-2xl flex items-center justify-center transition-colors border"
          :class="
            isDarkMode
              ? 'bg-gray-700 text-gray-400 border-gray-600'
              : 'bg-gray-200 text-gray-500 border-gray-300'
          "
        >
          <div class="text-center">
            <i class="fas fa-user text-4xl mb-2"></i>
            <p class="text-sm">No photo available</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
