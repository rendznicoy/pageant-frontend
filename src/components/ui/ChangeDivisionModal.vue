<script setup>
import { ref, computed } from "vue";

const props = defineProps({
  show: Boolean,
  currentDivision: String,
});

const emit = defineEmits(["confirm", "cancel"]);

const selectedDivision = ref("");

const divisionOptions = computed(() =>
  ["standard", "male-only", "female-only"].filter(
    (d) => d !== props.currentDivision
  )
);
</script>
<template>
  <div
    v-if="show"
    class="fixed inset-0 backdrop-blur-md bg-opacity-50 z-50 flex items-center justify-center"
  >
    <div class="bg-white rounded-lg shadow-lg p-6 max-w-md w-full space-y-4">
      <h2 class="text-lg font-bold">Change Division</h2>
      <select
        v-model="selectedDivision"
        class="form-select mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
      >
        <option disabled value="">Select new division</option>
        <option v-for="opt in divisionOptions" :key="opt" :value="opt">
          {{ opt.replace("-", " ").toUpperCase() }}
        </option>
      </select>
      <p class="block text-sm font-medium text-gray-700">
        Changing the division will reset all existing candidates. This action
        cannot be undone. Are you sure you want to proceed?
      </p>
      <div class="flex justify-end gap-2 pt-4">
        <button
          @click="$emit('cancel')"
          class="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
        >
          Cancel
        </button>
        <button
          @click="$emit('confirm', selectedDivision)"
          :disabled="!selectedDivision"
          class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Confirm
        </button>
      </div>
    </div>
  </div>
</template>
