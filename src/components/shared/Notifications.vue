<script setup>
import { ref, onMounted, onUnmounted } from "vue";

const notifications = ref([]); // Later fetch real data

const panelOpen = ref(false);

function togglePanel() {
  panelOpen.value = !panelOpen.value;
}

function handleClickOutside(event) {
  if (!event.target.closest(".notifications-dropdown")) {
    panelOpen.value = false;
  }
}

onMounted(() => {
  document.addEventListener("click", handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside);
});
</script>

<template>
  <div class="relative">
    <!-- Notification Bell -->
    <button
      @click.stop="togglePanel"
      class="relative rounded-full p-1 text-white hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-white"
    >
      <i class="fas fa-bell text-xl"></i>
    </button>

    <!-- Dropdown Panel -->
    <div
      v-if="panelOpen"
      class="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg border border-gray-300 z-50 notifications-dropdown"
    >
      <div class="p-4 border-b">
        <h3 class="text-green-800 font-bold">Notifications</h3>
      </div>

      <div
        class="max-h-60 overflow-y-auto flex flex-col items-center justify-center p-4 text-gray-500"
      >
        <template v-if="notifications.length === 0">
          You have no notifications
        </template>
        <template v-else>
          <div
            v-for="(notif, idx) in notifications"
            :key="idx"
            class="w-full text-left mb-2"
          >
            <p class="text-gray-700">{{ notif.message }}</p>
            <small class="text-gray-400">{{ notif.timestamp }}</small>
          </div>
        </template>
      </div>

      <div class="border-t p-2 text-center">
        <a href="/notification" class="text-green-700 text-sm hover:underline">
          See all
        </a>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* optional smoothness */
</style>
