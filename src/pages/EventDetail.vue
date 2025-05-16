<script setup>
import { ref, onMounted, onUnmounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useEventStore } from "@/stores/event";
import { useSidebarStore } from "@/sidebar";
import { useToast } from "vue-toastification";
import DateUtils from "@/utils/DateUtils";
import axiosClient from "@/axios";
import Navbar from "@/components/layout/Navbar.vue";
import Sidebar from "@/components/layout/Sidebar.vue";
import EventHeader from "@/components/dashboard/EventHeader.vue";
import Breadcrumbs from "@/components/layout/Breadcrumbs.vue";
import CoverPhotoModal from "@/components/ui/CoverPhotoModal.vue";
import EditEventModal from "@/components/ui/EditEventModal.vue";
import ResetEventModal from "@/components/ui/ResetEventModal.vue";
import DeleteEventModal from "@/components/ui/DeleteEventModal.vue";
import EventDescription from "@/components/dashboard/EventDescription.vue";
import EventStats from "@/components/dashboard/EventStats.vue";
import EventActions from "@/components/dashboard/EventActions.vue";
import CandidatesTab from "@/components/dashboard/CandidatesTab.vue";
import JudgesTab from "@/components/dashboard/JudgesTab.vue";
import CategoriesTab from "@/components/dashboard/CategoriesTab.vue";
import ResultsTab from "@/components/dashboard/ResultsTab.vue";
import StageManagementTab from "@/components/dashboard/StageManagementTab.vue";

const route = useRoute();
const router = useRouter();
const eventStore = useEventStore();
const sidebar = useSidebarStore();
const toast = useToast();

const eventId = route.params.id;
const event = ref(null);
const loading = ref(true);
const activeTab = ref("overview");
const showCoverPhotoModal = ref(false);
const showEditEventModal = ref(false);
const showResetEventModal = ref(false);
const showDeleteEventModal = ref(false);
const imageTimestamp = ref(Date.now());
const isLoading = ref(false);

const BACKEND_BASE_URL =
  import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

const windowWidth = ref(window.innerWidth);
const layoutShift = computed(() =>
  sidebar.isOpen && windowWidth.value >= 1024 ? "ml-64" : "ml-0"
);

const tabs = computed(() => [
  { id: "overview", label: "Overview", disabled: false },
  { id: "candidates", label: "Candidates", disabled: false },
  { id: "judges", label: "Judges", disabled: false },
  { id: "categories", label: "Categories", disabled: false },
  { id: "results", label: "Results", disabled: true },
  {
    id: "stage-management",
    label: "Stage Management",
    disabled: event.value?.status !== "active",
  },
]);

const getImageUrl = computed(() => {
  if (!event.value?.cover_photo) return "/vsu.png";
  const path = event.value.cover_photo;
  const fullPath = path.startsWith("/storage/")
    ? `${BACKEND_BASE_URL}${path}`
    : `${BACKEND_BASE_URL}/storage/${path}`;
  return `${fullPath}?t=${imageTimestamp.value}`;
});

// Handle window resize
const updateWindowWidth = () => {
  windowWidth.value = window.innerWidth;
};

const handleTabError = (error) => {
  console.error("Error in tab component:", error);
  toast.error("An error occurred in the tab. Please try again.");
};

const updateCoverPhoto = async (file) => {
  isLoading.value = true;
  const formData = new FormData();
  formData.append("_method", "PATCH");
  formData.append("event_id", eventId);
  formData.append("cover_photo", file);

  try {
    await axiosClient.post(`/api/v1/events/${eventId}/edit`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    event.value = await eventStore.fetchEvent(eventId);
    imageTimestamp.value = Date.now();
    toast.success("Cover photo updated successfully!");
    showCoverPhotoModal.value = false;
  } catch (error) {
    console.error("Cover photo update error:", error);
    if (error.response?.data?.errors) {
      Object.values(error.response.data.errors)
        .flat()
        .forEach((message) => toast.error(message));
    } else {
      toast.error(error.message || "Failed to update cover photo.");
    }
  } finally {
    isLoading.value = false;
  }
};

const updateEventDetails = async (formData) => {
  isLoading.value = true;
  formData.append("event_id", route.params.id);

  try {
    await eventStore.updateEvent(route.params.id, formData);
    event.value = await eventStore.fetchEvent(route.params.id);
    toast.success("Event updated successfully!");
    imageTimestamp.value = Date.now();
    showEditEventModal.value = false;
  } catch (error) {
    console.error("Event update error:", error);
    toast.error(error.message || "Failed to update event.");
  } finally {
    isLoading.value = false;
  }
};

const handleConfirmReset = async () => {
  try {
    isLoading.value = true;
    await eventStore.resetEvent(eventId);
    toast.success("Event reset successfully");
    showResetEventModal.value = false;
    event.value = await eventStore.fetchEvent(eventId);
  } catch (err) {
    toast.error(`Failed to reset event: ${err.message}`);
  } finally {
    isLoading.value = false;
  }
};

const handleConfirmDelete = async () => {
  try {
    isLoading.value = true;
    await eventStore.deleteEvent(eventId);
    toast.success("Event deleted successfully");
    showDeleteEventModal.value = false;
    router.push("/admin/dashboard");
  } catch (err) {
    toast.error(`Failed to delete event: ${err.message}`);
  } finally {
    isLoading.value = false;
  }
};

const handleImageError = (event) => {
  event.target.src = "/vsu.png";
};

const formatDate = (dateString) => {
  return DateUtils.formatDate(dateString);
};

const statusData = computed(() => {
  if (!event.value) return { color: "gray", label: "Unknown" };
  switch (event.value.status) {
    case "active":
      return { color: "green", label: "Active" };
    case "inactive":
      return { color: "yellow", label: "Inactive" };
    case "completed":
      return { color: "gray", label: "Completed" };
    default:
      return { color: "gray", label: "Unknown" };
  }
});

const handleEdit = () => {
  showEditEventModal.value = true;
};

const handleViewResults = async () => {
  try {
    isLoading.value = true;
    const response = await axiosClient.get(
      `/api/v1/events/${eventId}/results/preview`,
      {
        responseType: "blob",
      }
    );
    const blob = new Blob([response.data], { type: "application/pdf" });
    const url = window.URL.createObjectURL(blob);
    window.open(url, "_blank");
  } catch (err) {
    toast.error(`Failed to view results: ${err.message}`);
  } finally {
    isLoading.value = false;
  }
};

const handleDelete = () => {
  showDeleteEventModal.value = true;
};

const handleStart = async () => {
  try {
    isLoading.value = true;
    await eventStore.startEvent(eventId);
    toast.success("Event started successfully");
    event.value = await eventStore.fetchEvent(eventId);
  } catch (err) {
    toast.error(`Failed to start event: ${err.message}`);
  } finally {
    isLoading.value = false;
  }
};

const handleFinalize = async () => {
  try {
    isLoading.value = true;
    await eventStore.finalizeEvent(eventId);
    toast.success("Event finalized successfully");
    event.value = await eventStore.fetchEvent(eventId);
  } catch (err) {
    toast.error(`Failed to finalize event: ${err.message}`);
  } finally {
    isLoading.value = false;
  }
};

const handleReset = () => {
  showResetEventModal.value = true;
};

onMounted(async () => {
  loading.value = true;
  try {
    if (!eventStore.initialized) {
      await eventStore.fetchEvents();
    }
    event.value = await eventStore.fetchEvent(eventId);
    if (!event.value) {
      toast.error("Event not found");
      router.push("/admin/dashboard");
    }
  } catch (err) {
    toast.error(`Failed to load event details: ${err.message}`);
    router.push("/admin/dashboard");
  } finally {
    loading.value = false;
  }
  window.addEventListener("resize", updateWindowWidth);
});

onUnmounted(() => {
  window.removeEventListener("resize", updateWindowWidth);
});
</script>

<template>
  <div class="min-h-screen bg-gray-100">
    <Navbar />
    <Sidebar />
    <div class="transition-all duration-300" :class="layoutShift">
      <EventHeader />
      <Breadcrumbs
        :items="[
          { label: 'Dashboard', to: '/admin/dashboard' },
          { label: event ? event.event_name : 'Event Details' },
        ]"
      />
      <div class="container mx-auto px-4 py-6">
        <div v-if="loading" class="flex justify-center py-12">
          <i class="fas fa-spinner fa-spin text-3xl text-green-600"></i>
        </div>
        <div v-else-if="event" class="space-y-6">
          <div class="bg-white rounded-lg shadow overflow-hidden">
            <div class="h-32 relative">
              <img
                :src="getImageUrl"
                :key="'cover-' + event.event_id + '-' + imageTimestamp"
                alt="Event cover"
                class="h-full w-full object-cover"
                @error="handleImageError"
              />
              <button
                @click="showCoverPhotoModal = true"
                class="absolute top-4 right-4 w-10 h-10 bg-white bg-opacity-80 rounded-full flex items-center justify-center hover:bg-opacity-100 transition"
                title="Edit cover photo"
              >
                <i class="fas fa-camera text-gray-700"></i>
              </button>
            </div>
            <div class="p-6">
              <div class="flex items-start justify-between">
                <div>
                  <h1 class="text-2xl font-bold text-gray-800">
                    {{ event.event_name }}
                  </h1>
                  <p class="text-gray-500 mt-1">{{ event.event_code }}</p>
                </div>
                <div>
                  <span
                    class="px-3 py-1 rounded-full text-sm font-medium"
                    :class="`bg-${statusData.color}-100 text-${statusData.color}-800`"
                  >
                    {{ statusData.label }}
                  </span>
                </div>
              </div>
              <div class="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p class="text-sm text-gray-500">Last Accessed</p>
                  <p class="font-medium">
                    {{ formatDate(event.last_accessed) }}
                  </p>
                </div>
                <div v-if="event.created_at">
                  <p class="text-sm text-gray-500">Created On</p>
                  <p class="font-medium">{{ formatDate(event.created_at) }}</p>
                </div>
                <div>
                  <p class="text-sm text-gray-500">Start Date</p>
                  <p class="font-medium">{{ formatDate(event.start_date) }}</p>
                </div>
                <div>
                  <p class="text-sm text-gray-500">End Date</p>
                  <p class="font-medium">{{ formatDate(event.end_date) }}</p>
                </div>
              </div>
            </div>
          </div>
          <div class="bg-white rounded-lg shadow">
            <div class="border-b">
              <nav class="flex overflow-x-auto">
                <button
                  v-for="tab in tabs"
                  :key="tab.id"
                  @click="activeTab = tab.id"
                  :disabled="tab.disabled"
                  class="px-6 py-4 text-sm font-medium whitespace-nowrap"
                  :class="[
                    activeTab === tab.id
                      ? 'border-b-2 border-green-600 text-green-600'
                      : 'text-gray-600 hover:text-gray-800',
                    tab.disabled ? 'opacity-50 cursor-not-allowed' : '',
                  ]"
                >
                  {{ tab.label }}
                </button>
              </nav>
            </div>
            <div class="p-6">
              <div v-if="activeTab === 'overview'" class="space-y-6">
                <EventDescription :description="event.description" />
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <EventStats
                    :candidates-count="event.candidates_count"
                    :judges-count="event.judges_count"
                    :categories-count="event.categories_count"
                  />
                  <EventActions
                    @edit="handleEdit"
                    @view-results="handleViewResults"
                    @delete="handleDelete"
                    @start="handleStart"
                    @finalize="handleFinalize"
                    @reset="handleReset"
                  />
                </div>
              </div>
              <div
                v-else-if="
                  activeTab === 'stage-management' && event.status !== 'active'
                "
              >
                <div class="text-center py-10">
                  <p class="text-gray-500">
                    Event is {{ statusData.label }}. Stage management is only
                    available when the event is active.
                  </p>
                </div>
              </div>
              <div v-else>
                <CandidatesTab
                  v-if="activeTab === 'candidates'"
                  :event-id="eventId"
                />
                <JudgesTab v-if="activeTab === 'judges'" :event-id="eventId" />
                <CategoriesTab
                  v-if="activeTab === 'categories'"
                  :event-id="eventId"
                />
                <ResultsTab
                  v-if="activeTab === 'results'"
                  :event-id="eventId"
                />
                <StageManagementTab
                  v-if="activeTab === 'stage-management'"
                  :event-id="eventId"
                />
              </div>
            </div>
          </div>
        </div>
        <div v-else>
          <p>No event data available.</p>
        </div>
      </div>
    </div>
    <CoverPhotoModal
      :show="showCoverPhotoModal"
      :loading="isLoading"
      @close="showCoverPhotoModal = false"
      @save="updateCoverPhoto"
    />
    <EditEventModal
      :show="showEditEventModal"
      :event="event"
      :loading="isLoading"
      @close="showEditEventModal = false"
      @save="updateEventDetails"
    />
    <ResetEventModal
      :show="showResetEventModal"
      :loading="isLoading"
      @close="showResetEventModal = false"
      @confirm="handleConfirmReset"
    />
    <DeleteEventModal
      :show="showDeleteEventModal"
      :loading="isLoading"
      @close="showDeleteEventModal = false"
      @confirm="handleConfirmDelete"
    />
  </div>
</template>

<style scoped>
.tab-button {
  position: relative;
}
.tab-button.active::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background-color: #16a34a;
}
</style>
