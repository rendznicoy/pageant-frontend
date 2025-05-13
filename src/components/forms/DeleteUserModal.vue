<script setup>
const props = defineProps({
  user: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(["confirm", "cancel"]);
</script>

<template>
  <div
    class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50"
  >
    <div class="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full">
      <button
        @click="emit('cancel')"
        class="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-xl font-bold"
        aria-label="Close"
      >
        <i class="fas fa-times text-4xl mr-2"></i>
      </button>
      <h2 class="text-xl font-semibold text-gray-800 mb-4">Confirm Deletion</h2>
      <p class="text-gray-600 mb-4">
        Are you sure you want to delete {{ user?.first_name }}
        {{ user?.last_name }}?
      </p>
      <div class="flex justify-end space-x-4">
        <button
          @click="emit('confirm')"
          class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          Delete
        </button>
      </div>
    </div>
  </div>
</template>
