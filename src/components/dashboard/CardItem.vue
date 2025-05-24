<script setup>
import { ref, defineProps, defineEmits, onUnmounted, onMounted } from "vue";
import { useRouter } from "vue-router";
import DeleteEventModal from "@/components/ui/DeleteEventModal.vue";

const BACKEND_BASE_URL =
  import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

const props = defineProps({ event: Object });
const emit = defineEmits(["remove", "edit"]);
const router = useRouter();

const showMenu = ref(false);
const showDeleteModal = ref(false);
const isDeleting = ref(false);
const dropdownRef = ref(null);

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
  showDeleteModal.value = true;
}

function removeEvent() {
  isDeleting.value = true;
  emit("remove", props.event.event_id);
  showDeleteModal.value = false;
  isDeleting.value = false;
}

onMounted(() => {
  document.addEventListener("click", closeMenu);
});
onUnmounted(() => {
  document.removeEventListener("click", closeMenu);
});
</script>

<template>
  <div
    class="bg-white rounded-lg border shadow-md hover:shadow-lg transition p-4 relative flex flex-col h-80 z-10 overflow-hidden"
    :class="{
      'border-green-400': event.status === 'active',
      'border-yellow-400': event.status === 'inactive',
      'border-gray-400': event.status === 'completed',
    }"
  >
    <!-- Cover Photo -->
    <router-link
      :to="`/events/${event.event_id}`"
      class="w-full h-1/2 mb-2 clickable-area"
    >
      <img
        :src="getImageUrl(event.cover_photo)"
        :alt="`${event.event_name || 'Event'} Cover`"
        class="h-full w-full object-cover rounded"
        @error="handleImageError"
      />
    </router-link>

    <!-- Details -->
    <div class="w-full flex flex-col justify-between">
      <div class="mb-4">
        <router-link
          :to="`/events/${event.event_id}`"
          class="flex flex-wrap items-center justify-between gap-2 clickable-area"
        >
          <div
            class="text-lg font-semibold text-green-800 hover:underline truncate"
          >
            {{ event.event_name }}
          </div>
          <div class="flex gap-2">
            <!-- Status Badge -->
            <div
              class="text-xs text-white px-2 py-1 rounded inline-flex items-center"
              :class="{
                'bg-green-400': event.status === 'active',
                'bg-yellow-400': event.status === 'inactive',
                'bg-gray-400': event.status === 'completed',
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
              class="text-xs text-white px-2 py-1 rounded inline-flex items-center"
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

      <div class="mt-auto">
        <p class="text-sm text-gray-600 mt-4">
          <i class="fas fa-map-marker-alt mr-1"></i>
          <span>{{ event.venue || "Not set" }}</span>
        </p>
        <p class="text-sm text-gray-600 mt-2">
          <i class="fas fa-calendar-alt mr-1"></i>
          <span>{{ formatDateRange(event.start_date, event.end_date) }}</span>
        </p>
      </div>
    </div>

    <!-- Dropdown Menu -->
    <div class="absolute bottom-2 right-2">
      <button
        @click.stop="showMenu = !showMenu"
        class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-200 transition"
      >
        <i class="fas fa-ellipsis-v text-lg text-gray-600"></i>
      </button>
      <div
        v-if="showMenu"
        ref="dropdownRef"
        class="dropdown-menu absolute right-0 bottom-10 w-40 bg-white rounded shadow-md border z-50"
      >
        <a
          href="#"
          @click.prevent="$emit('edit', event)"
          class="block px-2 py-2 text-sm hover:bg-gray-100"
        >
          <i class="fas fa-edit"></i>
          <span class="ml-2">Update</span>
        </a>
        <a
          href="#"
          @click.prevent="confirmDelete"
          class="block px-2 py-2 text-sm hover:bg-gray-100"
        >
          <i class="fas fa-trash"></i>
          <span class="ml-2">Delete</span>
        </a>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <DeleteEventModal
      :show="showDeleteModal"
      :loading="isDeleting"
      @close="showDeleteModal = false"
      @confirm="removeEvent"
    />
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
