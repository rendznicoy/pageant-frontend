<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from "vue";
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
import ScoresTab from "@/components/dashboard/ScoresTab.vue";
import StageManagementTab from "@/components/dashboard/StageManagementTab.vue";
import ChangeDivisionModal from "@/components/ui/ChangeDivisionModal.vue";

const route = useRoute();
const router = useRouter();
const eventStore = useEventStore();
const sidebar = useSidebarStore();
const toast = useToast();

const eventId = route.params.id;
const event = ref(null);
const loading = ref(true);
const activeTab = ref(route.query.tab || "overview");
const showCoverPhotoModal = ref(false);
const showEditEventModal = ref(false);
const showResetEventModal = ref(false);
const showDeleteEventModal = ref(false);
const showChangeDivisionModal = ref(false);
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
  { id: "scores", label: "Scores", disabled: false },
  { id: "results", label: "Results", disabled: false },
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

const handleChangeDivision = () => {
  showChangeDivisionModal.value = true;
};

const handleConfirmDivisionChange = async (newDivision) => {
  try {
    isLoading.value = true;

    await axiosClient.patch(`/api/v1/events/${eventId}/division`, {
      division: newDivision,
    });

    event.value = await eventStore.fetchEvent(eventId);
    toast.success(
      `Division changed to ${newDivision.replace(
        "-",
        " "
      )} and candidates were reset.`
    );
  } catch (err) {
    const errors = err.response?.data?.errors || {};
    console.error("Change division error:", errors);
    toast.error(
      Object.values(errors).flat().join(" ") || "Division update failed."
    );
  } finally {
    showChangeDivisionModal.value = false;
    isLoading.value = false;
  }
};

const updateCoverPhoto = async (file) => {
  const formData = new FormData();

  formData.append("cover_photo", file);
  formData.append("_method", "PATCH");

  formData.append("event_name", event.value?.event_name || "");
  formData.append("venue", event.value?.venue || "");
  formData.append(
    "start_date",
    new Date(event.value?.start_date)
      .toISOString()
      .slice(0, 19)
      .replace("T", " ")
  );
  formData.append(
    "end_date",
    new Date(event.value?.end_date).toISOString().slice(0, 19).replace("T", " ")
  );
  formData.append("description", event.value?.description || "");
  formData.append("status", event.value?.status || "inactive");

  try {
    await axiosClient.post(`/api/v1/events/${eventId}/edit`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    toast.success("Cover photo updated successfully.");
    event.value = await eventStore.fetchEvent(eventId);
    imageTimestamp.value = Date.now();
    showCoverPhotoModal.value = false; // ✅ Close modal
  } catch (error) {
    console.error(
      "Cover photo update error:",
      error.response?.data?.errors || error.message
    );
    toast.error("Failed to update cover photo.");
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
  if (!event.value || event.value.status !== "completed") {
    toast.error(
      "This event has no results yet. It is either inactive or still ongoing."
    );
    return;
  }

  try {
    isLoading.value = true;
    const response = await axiosClient.get(
      `/api/v1/events/${eventId}/results/preview`,
      { responseType: "blob" }
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

    const response = await eventStore.finalizeEvent(eventId);

    toast.success("Event finalized successfully");
    event.value = await eventStore.fetchEvent(eventId);
  } catch (err) {
    console.error("Finalize error:", err);

    const serverMessage =
      err?.response?.data?.message ||
      err?.message ||
      "An unexpected error occurred";

    if (err.response?.status === 403) {
      toast.error("You are not authorized to finalize this event.");
    } else if (err.response?.status === 422) {
      toast.error("Event cannot be finalized due to missing or invalid data.");
    } else {
      toast.error(`${serverMessage}`);
    }
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

watch(activeTab, (newTab) => {
  router.replace({ query: { ...route.query, tab: newTab } });
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
              <div
                class="flex flex-col md:flex-row md:items-center md:justify-between gap-2"
              >
                <h1 class="text-2xl font-bold text-gray-800">
                  {{ event.event_name }}
                </h1>
                <div class="flex flex-wrap gap-2 md:justify-end">
                  <!-- Status Badge -->
                  <div
                    class="text-md text-white px-2 py-1 rounded inline-flex items-center"
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
                    <span class="capitalize">
                      {{ event.status }}
                    </span>
                  </div>

                  <!-- Division Badge -->
                  <div
                    v-if="event.division"
                    class="text-md text-white px-2 py-1 rounded inline-flex items-center"
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
                      {{ event.division.replace("-", " ") }}
                    </span>
                  </div>
                </div>
              </div>
              <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p class="text-sm text-gray-500">Start Date</p>
                  <p class="font-medium">
                    {{ DateUtils.formatDateTime(event.start_date) }}
                  </p>
                </div>
                <div>
                  <p class="text-sm text-gray-500">End Date</p>
                  <p class="font-medium">
                    {{ DateUtils.formatDateTime(event.end_date) }}
                  </p>
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
                    :active-categories="event.active_categories_count"
                    :pending-judges="event.judges_with_pending_scores"
                  />
                  <EventActions
                    @edit="handleEdit"
                    @view-results="handleViewResults"
                    @delete="handleDelete"
                    @start="handleStart"
                    @finalize="handleFinalize"
                    @reset="handleReset"
                    @change-division="handleChangeDivision"
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
                  :division="event.division"
                />
                <JudgesTab v-if="activeTab === 'judges'" :event-id="eventId" />
                <CategoriesTab
                  v-if="activeTab === 'categories'"
                  :event-id="eventId"
                />
                <ScoresTab v-if="activeTab === 'scores'" :event-id="eventId" />
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
    <ChangeDivisionModal
      :show="showChangeDivisionModal"
      :currentDivision="event?.division"
      @cancel="showChangeDivisionModal = false"
      @confirm="handleConfirmDivisionChange"
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
