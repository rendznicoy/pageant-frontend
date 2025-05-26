<script setup>
import { ref, watch, computed } from "vue";
import { useDarkModeStore } from "@/stores/darkMode";

const props = defineProps({
  score: [Number, null],
  comments: String,
  isSubmitting: Boolean,
  maxScore: Number,
  handleScoreInput: Function,
  restrictScoreKeydown: Function,
  submitScore: Function,
});
const emit = defineEmits(["update:comments"]);

const darkModeStore = useDarkModeStore();
const isDarkMode = computed(() => darkModeStore.isDarkMode);

// Local state for comments
const localComments = ref(props.comments || "");

// Keep localComments in sync with prop changes (if parent resets/comments)
watch(
  () => props.comments,
  (val) => {
    localComments.value = val ?? "";
  }
);

// Emit update when textarea changes
function onCommentsInput(e) {
  localComments.value = e.target.value;
  emit("update:comments", localComments.value);
}
</script>

<template>
  <div class="space-y-6 lg:w-2/3 w-full">
    <!-- Score Input -->
    <div>
      <label
        for="score"
        class="block text-lg font-medium mb-3 transition-colors"
        :class="isDarkMode ? 'text-gray-200' : 'text-gray-700'"
      >
        <i
          class="fas fa-star mr-2 transition-colors"
          :class="isDarkMode ? 'text-yellow-400' : 'text-yellow-500'"
        ></i>
        Score (0-{{ maxScore }}):
      </label>
      <div class="relative">
        <input
          type="text"
          id="score"
          :value="score ?? ''"
          @input="handleScoreInput"
          @keydown="restrictScoreKeydown"
          :disabled="isSubmitting"
          placeholder="Enter score"
          class="w-full px-6 py-4 text-xl rounded-xl border-2 transition-all duration-300 focus:ring-4 focus:ring-blue-500/20"
          :class="
            isDarkMode
              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500'
              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
          "
        />
        <div
          v-if="score !== null"
          class="absolute right-4 top-4 text-xl font-bold transition-colors"
          :class="isDarkMode ? 'text-blue-400' : 'text-blue-600'"
        >
          {{ score }}/{{ maxScore }}
        </div>
      </div>
    </div>
    <!-- Comments Input -->
    <div>
      <label
        for="comments"
        class="block text-lg font-medium mb-3 transition-colors"
        :class="isDarkMode ? 'text-gray-200' : 'text-gray-700'"
      >
        <i
          class="fas fa-comment mr-2 transition-colors"
          :class="isDarkMode ? 'text-blue-400' : 'text-blue-500'"
        ></i>
        Comments:
      </label>
      <textarea
        id="comments"
        :value="localComments"
        @input="onCommentsInput"
        :disabled="isSubmitting"
        placeholder="Optional comments about the candidate's performance"
        rows="4"
        class="w-full px-4 py-3 rounded-xl border-2 transition-all duration-300 focus:ring-4 focus:ring-blue-500/20"
        :class="
          isDarkMode
            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500'
            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
        "
      ></textarea>
    </div>
    <!-- Submit Button -->
    <button
      @click="submitScore"
      :disabled="isSubmitting"
      class="w-full py-4 px-6 rounded-xl font-medium text-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center hover:scale-[1.02] shadow-lg"
      :class="
        isDarkMode
          ? 'bg-green-600 hover:bg-green-700 text-white shadow-green-900/20'
          : 'bg-green-600 hover:bg-green-700 text-white shadow-green-600/20'
      "
    >
      <span v-if="isSubmitting" class="mr-2">
        <svg
          class="animate-spin h-5 w-5 text-white"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          ></circle>
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      </span>
      <i class="fas fa-paper-plane mr-2"></i>
      Submit Score
    </button>
  </div>
</template>
