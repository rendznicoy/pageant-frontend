<!-- EventHeader.vue -->
<script setup>
import { ref } from "vue";
import { useEventStore } from "@/stores/event";

const eventStore = useEventStore();
const isRefreshing = ref(false);

const refreshDashboard = async () => {
  isRefreshing.value = true;
  try {
    await eventStore.fetchEvents(true);
  } catch (error) {
    console.error("Failed to refresh dashboard:", error);
  } finally {
    isRefreshing.value = false;
  }
};
</script>

<template>
  <div class="bg-white shadow">
    <div class="flex justify-center items-center py-6 h-24 relative">
      <div class="relative">
        <img
          src="/VSU Logo.png"
          alt="VSU Logo"
          class="h-14 hover:opacity-90 cursor-pointer"
          @click="refreshDashboard"
          :class="{ 'opacity-50': isRefreshing }"
        />
        <div
          v-if="isRefreshing"
          class="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <i class="fas fa-spinner fa-spin text-green-600 text-2xl"></i>
        </div>
      </div>
    </div>
  </div>
</template>
