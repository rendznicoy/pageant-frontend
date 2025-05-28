<script setup>
import {
  ref,
  computed,
  defineProps,
  defineEmits,
  onUnmounted,
  onMounted,
} from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import DeleteEventModal from "@/components/ui/DeleteEventModal.vue";

const BACKEND_BASE_URL =
  import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
const toast = useToast();

const props = defineProps({
  event: Object,
  isDarkMode: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["remove", "edit"]);
const router = useRouter();

const showMenu = ref(false);
const showDeleteModal = ref(false);
const isDeleting = ref(false);
const dropdownRef = ref(null);

// Rest of your existing methods remain the same...
// Management lock logic - Edit is disabled for both active AND completed events
const isManagementLocked = computed(() => {
  return (
    props.event?.status === "active" || props.event?.status === "completed"
  );
});

// Delete is only disabled for active events, completed events can be deleted
const isDeleteDisabled = computed(() => {
  return props.event?.status === "active";
});

const getImageUrl = (coverPhoto) => {
  if (!coverPhoto) return "/vsu.png";

  // If it's already a full URL (starts with http), use it as-is
  if (coverPhoto.startsWith("http://") || coverPhoto.startsWith("https://")) {
    return `${coverPhoto}?t=${Date.now()}`;
  }

  // If it's a local storage path, construct the full URL
  const path = coverPhoto.startsWith("/storage/")
    ? coverPhoto
    : `/storage/${coverPhoto}`;
  return `${BACKEND_BASE_URL}${path}?t=${Date.now()}`;
};

const handleImageError = (event) => {
  event.target.src = "/vsu.png";
  toast.warning("Failed to load event cover photo", {
    timeout: 3000,
    position: "top-right",
  });
};

function formatDate(dateString) {
  if (!dateString || isNaN(new Date(dateString).getTime())) return "Not set";
  const options = { year: "numeric", month: "long", day: "numeric" };
  return new Date(dateString).toLocaleDateString(undefined, options);
}

function formatDateRange(start, end) {
  const startDate = formatDate(start);
  const endDate = formatDate(end);
  return `${startDate} - ${endDate}`;
}

function closeMenu(e) {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target)) {
    showMenu.value = false;
  }
}

function confirmDelete() {
  if (isDeleteDisabled.value) {
    toast.warning("Cannot delete active events", {
      timeout: 3000,
      position: "top-right",
      icon: "fas fa-lock",
    });
    return;
  }

  showDeleteModal.value = true;
  showMenu.value = false;
}

async function removeEvent() {
  if (isDeleting.value) return;

  isDeleting.value = true;

  try {
    const loadingToastId = toast.info("Deleting event...", {
      timeout: false,
      closeOnClick: false,
      pauseOnFocusLoss: false,
      pauseOnHover: false,
      draggable: false,
      showCloseButtonOnHover: false,
      hideProgressBar: false,
      closeButton: false,
      icon: "fas fa-spinner fa-spin",
      position: "top-right",
    });

    await emit("remove", props.event.event_id);

    toast.dismiss(loadingToastId);
    toast.success(
      `"${props.event.event_name}" has been deleted successfully!`,
      {
        timeout: 4000,
        position: "top-right",
        icon: "fas fa-check-circle",
      }
    );

    showDeleteModal.value = false;
  } catch (error) {
    console.error("Failed to delete event:", error);
    toast.error(
      `Failed to delete "${props.event.event_name}". Please try again.`,
      {
        timeout: 5000,
        position: "top-right",
        icon: "fas fa-exclamation-triangle",
      }
    );
  } finally {
    isDeleting.value = false;
  }
}

function handleEdit() {
  if (isManagementLocked.value) {
    const eventStatus = props.event?.status;
    const message =
      eventStatus === "active"
        ? "Cannot edit active events"
        : "Cannot edit completed events";

    toast.warning(message, {
      timeout: 3000,
      position: "top-right",
      icon: "fas fa-lock",
    });
    return;
  }

  emit("edit", props.event);
  showMenu.value = false;
}

// Helper function to get the appropriate tooltip message
const getEditTooltipMessage = computed(() => {
  if (!isManagementLocked.value) return "";

  const eventStatus = props.event?.status;
  return eventStatus === "active"
    ? "Cannot edit active events"
    : "Cannot edit completed events";
});

onMounted(() => {
  document.addEventListener("click", closeMenu);
});

onUnmounted(() => {
  document.removeEventListener("click", closeMenu);
});
</script>

<template>
  <div
    class="rounded-lg border shadow-md hover:shadow-lg transition-all duration-200 p-4 relative flex flex-col h-80 overflow-hidden transform hover:scale-[1.02]"
    :class="[
      isDarkMode ? 'bg-gray-800' : 'bg-white',
      {
        'border-green-400 dark:border-green-500': event.status === 'active',
        'border-yellow-400 dark:border-yellow-500': event.status === 'inactive',
        'border-gray-400 dark:border-gray-500': event.status === 'completed',
      },
    ]"
  >
    <!-- Cover Photo -->
    <router-link
      :to="`/events/${event.event_id}`"
      class="w-full h-1/2 mb-2 clickable-area rounded overflow-hidden"
    >
      <img
        :src="getImageUrl(event.cover_photo)"
        :alt="`${event.event_name || 'Event'} Cover`"
        class="h-full w-full object-cover rounded transition-transform duration-200 hover:scale-105"
        @error="handleImageError"
      />
    </router-link>

    <!-- Details -->
    <div class="w-full flex flex-col justify-between flex-1">
      <div class="mb-4">
        <router-link
          :to="`/events/${event.event_id}`"
          class="flex flex-wrap items-center justify-between gap-2 clickable-area"
        >
          <div
            class="text-lg font-semibold hover:underline truncate transition-colors duration-200"
            :class="isDarkMode ? 'text-green-200' : 'text-green-800'"
          >
            {{ event.event_name }}
          </div>
          <div class="flex gap-2">
            <!-- Status Badge -->
            <div
              class="text-xs text-white px-2 py-1 rounded inline-flex items-center transition-all duration-200"
              :class="{
                'bg-green-500 shadow-green-200': event.status === 'active',
                'bg-yellow-500 shadow-yellow-200': event.status === 'inactive',
                'bg-gray-500 shadow-gray-200': event.status === 'completed',
              }"
            >
              <i
                class="fas mr-1"
                :class="{
                  'fa-play': event.status === 'active',
                  'fa-pause': event.status === 'inactive',
                  'fa-check-circle': event.status === 'completed',
                }"
              ></i>
              <span>
                {{
                  event.status.charAt(0).toUpperCase() + event.status.slice(1)
                }}
              </span>
            </div>

            <!-- Division Badge -->
            <div
              v-if="event.division"
              class="text-xs text-white px-2 py-1 rounded inline-flex items-center transition-all duration-200"
              :class="{
                'bg-indigo-500': event.division === 'standard',
                'bg-blue-500': event.division === 'male-only',
                'bg-pink-500': event.division === 'female-only',
                'bg-gray-400': ![
                  'standard',
                  'male-only',
                  'female-only',
                ].includes(event.division),
              }"
            >
              <i
                class="fas mr-1"
                :class="{
                  'fa-users': event.division === 'standard',
                  'fa-mars': event.division === 'male-only',
                  'fa-venus': event.division === 'female-only',
                }"
              ></i>
              <span class="capitalize">
                {{ event.division?.replace?.("-", " ") || "Unknown" }}
              </span>
            </div>
          </div>
        </router-link>
      </div>

      <div class="mt-auto space-y-2">
        <p
          class="text-sm flex items-center transition-colors duration-200"
          :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'"
        >
          <i
            class="fas fa-map-marker-alt mr-2 transition-colors duration-200"
            :class="isDarkMode ? 'text-green-400' : 'text-green-600'"
          ></i>
          <span>{{ event.venue || "Not set" }}</span>
        </p>
        <p
          class="text-sm flex items-center transition-colors duration-200"
          :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'"
        >
          <i
            class="fas fa-calendar-alt mr-2 transition-colors duration-200"
            :class="isDarkMode ? 'text-green-400' : 'text-green-600'"
          ></i>
          <span>{{ formatDateRange(event.start_date, event.end_date) }}</span>
        </p>
      </div>
    </div>

    <!-- Dropdown Menu -->
    <div class="absolute bottom-2 right-2">
      <button
        @click.stop="showMenu = !showMenu"
        class="w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200"
        :class="isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'"
        :title="showMenu ? 'Close menu' : 'Open menu'"
      >
        <i
          class="fas fa-ellipsis-v text-lg transition-colors duration-200"
          :class="isDarkMode ? 'text-gray-300' : 'text-gray-600'"
        ></i>
      </button>

      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="transform scale-95 opacity-0"
        enter-to-class="transform scale-100 opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="transform scale-100 opacity-100"
        leave-to-class="transform scale-95 opacity-0"
      >
        <div
          v-if="showMenu"
          ref="dropdownRef"
          class="dropdown-menu absolute right-0 bottom-10 w-44 rounded-lg shadow-lg border overflow-hidden z-50"
          :class="
            isDarkMode
              ? 'bg-gray-700 border-gray-600'
              : 'bg-white border-gray-200'
          "
        >
          <!-- Edit Option -->
          <a
            href="#"
            @click.prevent="handleEdit"
            class="flex items-center px-4 py-3 text-sm transition-colors duration-200 relative group"
            :class="[
              isManagementLocked
                ? 'cursor-not-allowed'
                : isDarkMode
                ? 'hover:bg-gray-600 text-white'
                : 'hover:bg-gray-100',
              isManagementLocked
                ? isDarkMode
                  ? 'text-gray-500'
                  : 'text-gray-400'
                : '',
            ]"
          >
            <i
              class="w-4"
              :class="
                isManagementLocked
                  ? 'fas fa-lock text-gray-400'
                  : 'fas fa-edit text-blue-500'
              "
            ></i>
            <span class="ml-3">Edit Event</span>

            <!-- Tooltip for disabled edit -->
            <div
              v-if="isManagementLocked"
              class="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none"
            >
              {{ getEditTooltipMessage }}
            </div>
          </a>
          <a
            href="#"
            @click.prevent="confirmDelete"
            class="flex items-center px-4 py-3 text-sm transition-colors duration-200 relative group"
            :class="[
              isDeleteDisabled
                ? 'cursor-not-allowed'
                : isDarkMode
                ? 'hover:bg-gray-600'
                : 'hover:bg-gray-100',
              isDeleteDisabled
                ? isDarkMode
                  ? 'text-gray-500'
                  : 'text-gray-400'
                : isDarkMode
                ? 'text-red-400'
                : 'text-red-600',
            ]"
          >
            <i
              class="w-4"
              :class="
                isDeleteDisabled
                  ? 'fas fa-lock text-gray-400'
                  : 'fas fa-trash text-red-500'
              "
            ></i>
            <span class="ml-3">Delete Event</span>

            <!-- Tooltip for disabled delete -->
            <div
              v-if="isDeleteDisabled"
              class="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none"
            >
              Cannot delete active events
            </div>
          </a>
        </div>
      </Transition>
    </div>

    <!-- Delete Confirmation Modal with Teleport -->
    <Teleport to="body">
      <DeleteEventModal
        :show="showDeleteModal"
        :loading="isDeleting"
        :is-dark-mode="isDarkMode"
        @close="showDeleteModal = false"
        @confirm="removeEvent"
      />
    </Teleport>
  </div>
</template>

<style scoped>
.clickable-area {
  transition: all 0.2s ease;
}
.clickable-area:hover {
  background-color: rgba(0, 0, 0, 0.02);
}
.dark .clickable-area:hover {
  background-color: rgba(255, 255, 255, 0.05);
}
</style>
