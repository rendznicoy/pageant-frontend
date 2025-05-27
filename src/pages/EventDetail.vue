<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useEventStore } from "@/stores/event";
import { useToast } from "vue-toastification";
import { useDarkModeStore } from "@/stores/darkMode"; // Add this import
import DateUtils from "@/utils/DateUtils";
import axiosClient from "@/axios";
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
import StatisticiansPanel from "@/components/dashboard/StatisticiansPanel.vue";
import StartEventModal from "@/components/ui/StartEventModal.vue";
import FinalizeEventModal from "@/components/ui/FinalizeEventModal.vue";

const route = useRoute();
const router = useRouter();
const eventStore = useEventStore();
const darkModeStore = useDarkModeStore(); // Add this
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
const showStartEventModal = ref(false);
const showFinalizeEventModal = ref(false);
const showPreview = ref(false);
const previewUrl = ref("");

const BACKEND_BASE_URL =
  import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

const windowWidth = ref(window.innerWidth);

const isDarkMode = computed(() => darkModeStore.isDarkMode);

// Add the missing eventStatus computed property
const eventStatus = computed(() => {
  return event.value?.status || "inactive";
});

const initializeDarkMode = () => {
  const savedDarkMode = localStorage.getItem("darkMode");
  if (savedDarkMode === "true") {
    isDarkMode.value = true;
    document.documentElement.classList.add("dark");
  } else if (savedDarkMode === "false") {
    isDarkMode.value = false;
    document.documentElement.classList.remove("dark");
  } else {
    const systemPrefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    isDarkMode.value = systemPrefersDark;
    if (systemPrefersDark) {
      document.documentElement.classList.add("dark");
    }
  }
};

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
  if (event.value?.statisticians) {
    formData.append("statisticians", JSON.stringify(event.value.statisticians));
  }

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
    toast.error(`${err.message}`);
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

// Update handleViewResults method in EventDetail.vue
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

    // response is the full axios response due to blob handling in interceptor
    const blob = new Blob([response.data], { type: "application/pdf" });
    previewUrl.value = window.URL.createObjectURL(blob);
    showPreview.value = true;
  } catch (err) {
    console.error("Preview error:", err);
    toast.error(`Failed to view results: ${err.message}`);
  } finally {
    isLoading.value = false;
  }
};

const closePreview = () => {
  showPreview.value = false;
  if (previewUrl.value) {
    window.URL.revokeObjectURL(previewUrl.value);
    previewUrl.value = "";
  }
};

const handleDelete = () => {
  showDeleteEventModal.value = true;
};

// Update handleStart method in EventDetail.vue
// Update handleStart method in EventDetail.vue
const handleStart = async () => {
  // Check constraints before showing modal
  const candidatesCount = event.value?.candidates_count || 0;
  const judgesCount = event.value?.judges_count || 0;
  const categoriesCount = event.value?.categories_count || 0;

  if (candidatesCount < 1) {
    toast.error("Cannot start event: At least 1 candidate is required.");
    return;
  }
  if (judgesCount < 1) {
    toast.error("Cannot start event: At least 1 judge is required.");
    return;
  }
  if (categoriesCount < 1) {
    toast.error("Cannot start event: At least 1 category is required.");
    return;
  }

  // Fetch stages count - axios interceptor already returns response.data
  try {
    const stagesResponse = await axiosClient.get(
      `/api/v1/events/${eventId}/stages`
    );
    // stagesResponse is already the data due to axios interceptor
    const stagesData = Array.isArray(stagesResponse)
      ? stagesResponse
      : stagesResponse.data || [];
    const stagesCount = stagesData.length || 0;

    console.log("Stages check:", { stagesResponse, stagesData, stagesCount });

    if (stagesCount < 1) {
      toast.error("Cannot start event: At least 1 stage is required.");
      return;
    }
  } catch (error) {
    console.error("Error fetching stages:", error);
    toast.error("Cannot verify stages. Please try again.");
    return;
  }

  if (event.value?.status !== "inactive") {
    toast.error("Only inactive events can be started.");
    return;
  }

  showStartEventModal.value = true;
};

const handleFinalize = () => {
  if (event.value?.status !== "active") {
    toast.error("Only active events can be finalized.");
    return;
  }
  showFinalizeEventModal.value = true;
};

const handleConfirmStart = async () => {
  try {
    isLoading.value = true;
    await eventStore.startEvent(eventId);
    toast.success("Event started successfully");
    event.value = await eventStore.fetchEvent(eventId);
  } catch (err) {
    toast.error(`Failed to start event: ${err.message}`);
  } finally {
    isLoading.value = false;
    showStartEventModal.value = false;
  }
};

const handleConfirmFinalize = async () => {
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
    showFinalizeEventModal.value = false;
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
  closePreview(); // Clean up PDF blob URL
});

watch(activeTab, (newTab) => {
  router.replace({ query: { ...route.query, tab: newTab } });
});
</script>

<template>
  <div
    class="min-h-screen transition-all duration-300"
    :class="isDarkMode ? 'bg-gray-900' : 'bg-gray-100'"
  >
    <div class="transition-all duration-300">
      <Breadcrumbs
        :items="[{ label: 'Home', to: 'auto' }, { label: event?.event_name }]"
      />
      <div class="container mx-auto px-4 py-6">
        <!-- Loading state -->
        <div v-if="loading" class="flex justify-center py-12">
          <i
            class="fas fa-spinner fa-spin text-3xl"
            :class="isDarkMode ? 'text-green-400' : 'text-green-600'"
          ></i>
        </div>

        <!-- Event content -->
        <div v-else-if="event" class="space-y-6">
          <div
            class="rounded-lg shadow overflow-hidden transition-colors duration-300"
            :class="
              isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'
            "
          >
            <!-- Cover photo section -->
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

            <!-- Event details -->
            <div class="p-6">
              <div
                class="flex flex-col md:flex-row md:items-center md:justify-between gap-2"
              >
                <h1
                  class="text-2xl font-bold transition-colors duration-300"
                  :class="isDarkMode ? 'text-white' : 'text-gray-800'"
                >
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

              <!-- Date information -->
              <div class="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p
                    class="text-sm transition-colors duration-300"
                    :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'"
                  >
                    <i class="fas fa-map-marker-alt mr-1"></i>
                    Venue
                  </p>
                  <p
                    class="font-medium transition-colors duration-300"
                    :class="isDarkMode ? 'text-gray-200' : 'text-gray-900'"
                  >
                    {{ event.venue || "Not specified" }}
                  </p>
                </div>
                <div>
                  <p
                    class="text-sm transition-colors duration-300"
                    :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'"
                  >
                    <i class="fas fa-calendar-plus mr-1"></i>
                    Start Date
                  </p>
                  <p
                    class="font-medium transition-colors duration-300"
                    :class="isDarkMode ? 'text-gray-200' : 'text-gray-900'"
                  >
                    {{ DateUtils.formatDateTime(event.start_date) }}
                  </p>
                </div>
                <div>
                  <p
                    class="text-sm transition-colors duration-300"
                    :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'"
                  >
                    <i class="fas fa-calendar-check mr-1"></i>
                    End Date
                  </p>
                  <p
                    class="font-medium transition-colors duration-300"
                    :class="isDarkMode ? 'text-gray-200' : 'text-gray-900'"
                  >
                    {{ DateUtils.formatDateTime(event.end_date) }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Tabs section -->
          <div
            class="rounded-lg shadow transition-colors duration-300"
            :class="
              isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'
            "
          >
            <div
              class="border-b transition-colors duration-300"
              :class="isDarkMode ? 'border-gray-600' : 'border-gray-200'"
            >
              <nav class="flex overflow-x-auto">
                <button
                  v-for="tab in tabs"
                  :key="tab.id"
                  @click="activeTab = tab.id"
                  :disabled="tab.disabled"
                  class="px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors duration-300"
                  :class="[
                    activeTab === tab.id
                      ? isDarkMode
                        ? 'border-b-2 border-green-400 text-green-400'
                        : 'border-b-2 border-green-600 text-green-600'
                      : isDarkMode
                      ? 'text-gray-300 hover:text-gray-100'
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
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <EventDescription :description="event.description" />
                  <StatisticiansPanel :statisticians="event.statisticians" />
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <EventStats
                    :candidates-count="event.candidates_count"
                    :judges-count="event.judges_count"
                    :categories-count="event.categories_count"
                    :active-categories="event.active_categories_count"
                    :pending-judges="event.judges_with_pending_scores"
                  />
                  <EventActions
                    :event-status="eventStatus"
                    :is-dark-mode="isDarkMode"
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
          <p
            class="transition-colors duration-300"
            :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'"
          >
            No event data available.
          </p>
        </div>
      </div>
    </div>
    <!-- PDF Preview Modal -->
    <div
      v-if="showPreview"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300"
      :class="isDarkMode ? 'bg-black/80' : 'bg-black/75'"
    >
      <div
        class="w-full max-w-7xl h-[95vh] relative overflow-hidden rounded-2xl shadow-2xl transition-all duration-300"
        :class="isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'"
      >
        <div
          class="flex justify-between items-center p-6 border-b transition-colors"
          :class="
            isDarkMode
              ? 'bg-gray-700 border-gray-600'
              : 'bg-gray-50 border-gray-200'
          "
        >
          <div>
            <h3
              class="text-2xl font-bold transition-colors"
              :class="isDarkMode ? 'text-white' : 'text-gray-800'"
            >
              <i class="fas fa-chart-line mr-2 text-blue-500"></i>
              Results Preview
            </h3>
          </div>
          <button
            @click="closePreview"
            class="w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200"
            :class="
              isDarkMode
                ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-600'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
            "
          >
            <i class="fas fa-times text-lg"></i>
          </button>
        </div>

        <div class="h-[calc(95vh-88px)] p-4">
          <iframe
            :src="previewUrl"
            class="w-full h-full border-0 rounded-lg shadow-inner"
            title="PDF Preview"
          >
          </iframe>
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
    <StartEventModal
      :show="showStartEventModal"
      :loading="isLoading"
      :is-dark-mode="isDarkMode"
      @close="showStartEventModal = false"
      @confirm="handleConfirmStart"
    />
    <FinalizeEventModal
      :show="showFinalizeEventModal"
      :loading="isLoading"
      :is-dark-mode="isDarkMode"
      @close="showFinalizeEventModal = false"
      @confirm="handleConfirmFinalize"
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
