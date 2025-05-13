<script setup>
import { ref, defineProps, defineEmits, onUnmounted, onMounted } from "vue";
import { useRouter } from "vue-router";

const BACKEND_BASE_URL =
  import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

const props = defineProps({ event: Object });
const emit = defineEmits(["toggle-star", "remove"]);
const router = useRouter();
const showMenu = ref(false);
const isNavigating = ref(false);

const navigateToEvent = async (eventId) => {
  isNavigating.value = true;
  try {
    await router.push(`/events/${eventId}`);
  } finally {
    isNavigating.value = false;
  }
};

const getImageUrl = (coverPhoto) => {
  if (!coverPhoto) return "/vsu.png";
  const path = coverPhoto.startsWith("/storage/")
    ? coverPhoto
    : `/storage/${coverPhoto}`;
  return `${BACKEND_BASE_URL}${path}?t=${Date.now()}`;
};

const handleImageError = (event) => {
  event.target.src = "/vsu.png";
};

function formatDate(dateString) {
  if (!dateString || isNaN(new Date(dateString).getTime())) {
    return "Not set"; // Changed from "Not accessed yet" for consistency
  }
  const options = { year: "numeric", month: "short", day: "numeric" };
  return new Date(dateString).toLocaleDateString(undefined, options);
}

function closeMenu(event) {
  if (!event.target.closest(".dropdown-menu")) showMenu.value = false;
}

onMounted(() => {
  window.addEventListener("click", closeMenu);
});

onUnmounted(() => window.removeEventListener("click", closeMenu));

function toggleStar() {
  console.log(`Toggling star for event_id: ${props.event.event_id}`);
  emit("toggle-star", props.event.event_id);
}

function removeEvent() {
  console.log(`Removing event_id: ${props.event.event_id}`);
  emit("remove", props.event.event_id);
}

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
    class="bg-white rounded shadow hover:shadow-md transition p-4 relative flex h-48 z-1"
  >
    <div
      class="w-1/3 mr-4 cursor-pointer"
      tabindex="0"
      role="button"
      @click="navigateToEvent(event.event_id)"
      @keyup.enter="navigateToEvent(event.event_id)"
    >
      <img
        :src="getImageUrl(event.cover_photo)"
        :key="'cover-' + event.event_id"
        :alt="event.event_name ? `${event.event_name} Cover` : 'Event Cover'"
        class="h-full w-full object-cover rounded"
        @error="handleImageError"
      />
    </div>
    <div
      class="w-2/3 flex flex-col justify-between pr-8 cursor-pointer"
      tabindex="0"
      role="button"
      @click="navigateToEvent(event.event_id)"
      @keyup.enter="navigateToEvent(event.event_id)"
    >
      <div>
        <div
          class="text-lg font-semibold text-green-800 hover:underline block truncate"
        >
          {{ event.event_name }}
        </div>
        <p class="text-sm text-gray-500 mt-1 truncate">
          {{ event.event_code }}
        </p>
        <p class="text-sm text-gray-600 mt-1">
          <span class="font-medium">Start:</span>
          {{ formatDate(event.start_date) }}
        </p>
        <p class="text-sm text-gray-600 mt-1">
          <span class="font-medium">End:</span> {{ formatDate(event.end_date) }}
        </p>
      </div>
      <div>
        <p class="text-xs text-gray-500 mb-1">
          {{ getStatusLabel(event.status) }}
        </p>
        <div class="flex items-center mt-2">
          <div
            class="w-full h-2 rounded-full"
            :class="{
              'bg-green-400': event.status === 'active',
              'bg-yellow-400': event.status === 'inactive',
              'bg-gray-400': event.status === 'completed',
            }"
          ></div>
        </div>
        <p class="text-xs text-gray-400 mt-2">
          Last Accessed: {{ formatDate(event.last_accessed) }}
        </p>
      </div>
    </div>
    <div class="absolute top-2 right-2">
      <button
        @click.stop="showMenu = !showMenu"
        class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-200 transition"
      >
        <i class="fas fa-ellipsis-v text-lg text-gray-600"></i>
      </button>
      <div
        v-if="showMenu"
        class="dropdown-menu absolute right-0 mt-2 w-40 bg-white rounded shadow-md border z-1000"
      >
        <a
          href="#"
          @click.prevent="toggleStar"
          class="block px-2 py-2 text-sm hover:bg-gray-100"
        >
          <i
            class="fas"
            :class="event.is_starred ? 'fa-star text-yellow-500' : 'fa-star'"
          ></i>
          <span class="ml-2">{{
            event.is_starred ? "Unstar this event" : "Star this event"
          }}</span>
        </a>
        <a
          href="#"
          @click.prevent="removeEvent"
          class="block px-2 py-2 text-sm hover:bg-gray-100"
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
