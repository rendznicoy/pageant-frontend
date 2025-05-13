<!-- ListItem.vue -->
<script setup>
import { ref, defineProps, defineEmits, onUnmounted, onMounted } from "vue";
import { useRouter } from "vue-router";

const props = defineProps({
  event: {
    type: Object,
    required: true,
  },
});

const BACKEND_BASE_URL =
  import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

const emit = defineEmits(["toggle-star", "remove"]);
const router = useRouter();
const showMenu = ref(false);
const isNavigating = ref(false);

const getImageUrl = (coverPhoto) => {
  if (coverPhoto) {
    const cleanPath = coverPhoto.startsWith("/storage/")
      ? coverPhoto.replace("/storage/", "")
      : coverPhoto;
    return `${BACKEND_BASE_URL}/storage/${cleanPath}?t=${Date.now()}`;
  }
  return "/vsu.png";
};

const handleImageError = (event) => {
  event.target.src = "/vsu.png";
};

// Navigation function
const navigateToEvent = async (eventId) => {
  isNavigating.value = true;
  try {
    await router.push(`/events/${eventId}`);
  } finally {
    isNavigating.value = false;
  }
};

function formatDate(dateString) {
  if (!dateString || isNaN(new Date(dateString).getTime())) {
    return "Not set";
  }
  const options = { year: "numeric", month: "short", day: "numeric" };
  return new Date(dateString).toLocaleDateString(undefined, options);
}

function closeMenu(event) {
  if (!event.target.closest(".dropdown-menu")) {
    showMenu.value = false;
  }
}

onMounted(() => {
  console.log("Event data:", props.event);
  console.log("Cover photo path:", props.event.cover_photo);
  console.log("Computed image URL:", getImageUrl(props.event.cover_photo));
  if (typeof window !== "undefined") {
    window.addEventListener("click", closeMenu);
  }
});

onUnmounted(() => {
  window.removeEventListener("click", closeMenu);
});

function getStatusLabel(status) {
  switch (status) {
    case "active":
      return "Active";
    case "inactive":
      return "Inactive";
    case "completed":
      return "Completed";
    default:
      return "Unknown";
  }
}
</script>

<template>
  <div
    class="bg-white rounded shadow hover:shadow-md transition p-4 relative flex items-center h-30 z-1"
  >
    <!-- Left -->
    <div
      class="w-12 h-12 mr-4 flex-shrink-0 cursor-pointer"
      tabindex="0"
      role="button"
      @click="navigateToEvent(event.event_id)"
      @keyup.enter="navigateToEvent(event.event_id)"
    >
      <img
        :src="getImageUrl(event.cover_photo)"
        :alt="event.event_name ? `${event.event_name} Cover` : 'Event Cover'"
        class="h-full w-full object-cover rounded"
        @error="handleImageError"
      />
    </div>
    <!-- Right -->
    <div
      class="flex-grow min-w-0 cursor-pointer"
      tabindex="0"
      role="button"
      @click="navigateToEvent(event.event_id)"
      @keyup.enter="navigateToEvent(event.event_id)"
    >
      <div class="flex items-center justify-between">
        <div class="min-w-0">
          <div
            class="text-lg font-semibold text-green-800 hover:underline truncate block cursor-pointer"
          >
            {{ event.event_name }}
          </div>
          <p class="text-sm text-gray-500 truncate">
            {{ event.event_code }}
          </p>
          <p class="text-sm text-gray-600 mt-1">
            <span class="font-medium">Start:</span>
            {{ formatDate(event.start_date) }}
          </p>
          <p class="text-sm text-gray-600 mt-1">
            <span class="font-medium">End:</span>
            {{ formatDate(event.end_date) }}
          </p>
        </div>
        <div class="flex items-center ml-4">
          <span
            class="text-xs px-2 py-1 rounded mr-3"
            :class="{
              'bg-green-100 text-green-800': event.status === 'active',
              'bg-yellow-100 text-yellow-800': event.status === 'inactive',
              'bg-gray-100 text-gray-800': event.status === 'completed',
            }"
          >
            {{ getStatusLabel(event.status) }}
          </span>
          <p class="text-xs text-gray-400">
            Last Accessed: {{ formatDate(event.last_accessed) }}
          </p>
        </div>
      </div>
      <div class="mt-2 w-full">
        <div
          class="h-1 rounded-full"
          :class="{
            'bg-green-400': event.status === 'active',
            'bg-yellow-400': event.status === 'inactive',
            'bg-gray-400': event.status === 'completed',
          }"
        ></div>
      </div>
    </div>
    <!-- Dropdown Menu -->
    <div class="absolute top-2 right-2">
      <button
        @click.stop="showMenu = !showMenu"
        class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-200 transition"
        aria-haspopup="true"
        :aria-expanded="showMenu"
        aria-label="Open event actions"
      >
        <i class="fas fa-ellipsis-v"></i>
      </button>
      <div
        v-if="showMenu"
        class="dropdown-menu absolute right-0 mt-2 w-40 bg-white rounded shadow-md border z-1000"
      >
        <a
          href="#"
          class="block px-4 py-2 text-sm hover:bg-gray-100"
          @click.prevent="emit('toggle-star', event.event_id)"
        >
          <i
            class="fas"
            :class="event.starred ? 'fa-star text-yellow-500' : 'fa-star'"
          ></i>
          <span class="ml-2">{{
            event.starred ? "Unstar this event" : "Star this event"
          }}</span>
        </a>
        <a
          href="#"
          class="block px-4 py-2 text-sm hover:bg-gray-100"
          @click.prevent="emit('remove', event.event_id)"
        >
          <i
            class="fas"
            :class="event.removed ? 'fa-undo-alt' : 'fa-trash'"
          ></i>
          <span class="ml-2">{{
            event.removed ? "Restore to view" : "Remove from view"
          }}</span>
        </a>
      </div>
    </div>
  </div>
</template>

<style scoped>
.clickable-area {
  transition: background-color 0.2s ease;
}
.clickable-area:hover {
  background-color: rgba(0, 0, 0, 0.02);
}
</style>
