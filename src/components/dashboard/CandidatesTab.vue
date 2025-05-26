// CandidatesTab.vue
<script setup>
import { ref, onMounted, computed, watch, watchEffect } from "vue";
import { useDarkModeStore } from "@/stores/darkMode"; // Add this import
import { useToast } from "vue-toastification";
import axiosClient from "@/axios";
import CandidateFilters from "@/components/dashboard/CandidateFilters.vue";

const props = defineProps({
  eventId: { type: String, required: true },
  division: { type: String, required: true },
});

const BACKEND_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const toast = useToast();
const candidates = ref([]);
const loading = ref(false);
const showCreateModal = ref(false);
const showEditModal = ref(false);
const selectedCandidate = ref(null);
const searchQuery = ref("");
const filter = ref("all");
const itemsPerPage = 5;
const currentPage = ref(1);
const showStatusModal = ref(false);
const selectedStatusTarget = ref(null);
const editPreviewUrl = ref("");
const showDeleteModal = ref(false);
const candidateToDelete = ref(null);
const eventStatus = ref("inactive");
const darkModeStore = useDarkModeStore();
const isDarkMode = computed(() => darkModeStore.isDarkMode);

// Dark mode initialization
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

// Management Lock logic
const isEventLocked = computed(() => {
  return ["active", "completed"].includes(eventStatus.value);
});

const fetchEventDetails = async () => {
  try {
    const eventData = await axiosClient.get(`/api/v1/events/${props.eventId}`);
    console.log("Event data received:", eventData);

    const data = eventData.data || eventData;
    eventStatus.value = data.status || "inactive";

    console.log("Event status updated:", eventStatus.value);
  } catch (error) {
    console.error("Error fetching event details:", error);
    toast.error("Failed to fetch event details");
  }
};

const onCreatePhotoChange = (e) => handleImageUpload(e, previewUrl);
const onEditPhotoChange = (e) => handleImageUpload(e, editPreviewUrl);

const totalItems = computed(() => filteredCandidates.value.length);
const totalPages = computed(() => Math.ceil(totalItems.value / itemsPerPage));

const form = ref({
  first_name: "",
  last_name: "",
  candidate_number: "",
  sex: "",
  team: "",
  photo: null,
});

const previewUrl = ref("");

const getImageUrl = (photo) => {
  if (!photo) return "/vsu.png";
  const fullPath = photo.startsWith("/storage/")
    ? `${BACKEND_BASE_URL}${photo}`
    : `${BACKEND_BASE_URL}/storage/${photo}`;
  return `${fullPath}?t=${Date.now()}`;
};

const handleImageError = (event) => {
  event.target.src = "/vsu.png";
};

const handleImageUpload = (e, targetRef) => {
  if (!targetRef || typeof targetRef !== "object" || !("value" in targetRef)) {
    console.error("Invalid targetRef passed to handleImageUpload");
    return;
  }
  const file = e.target.files[0];
  if (file && file.type.startsWith("image/")) {
    targetRef.value = URL.createObjectURL(file);

    if (targetRef === editPreviewUrl && selectedCandidate.value) {
      selectedCandidate.value.photo = file;
    }
  }
};

const handleDeleteConfirmed = async () => {
  if (!candidateToDelete.value) return;

  if (isEventLocked.value) {
    toast.error("Cannot delete candidates when event is active or completed.");
    return;
  }

  try {
    loading.value = true;
    await axiosClient.delete(
      `/api/v1/events/${props.eventId}/candidates/${candidateToDelete.value.candidate_id}`
    );
    toast.success("Candidate deleted successfully!");
    await fetchCandidates();
    currentPage.value = 1;
  } catch (error) {
    toast.error(error.response?.data?.message || "Failed to delete candidate.");
  } finally {
    loading.value = false;
    showDeleteModal.value = false;
    candidateToDelete.value = null;
  }
};

const fetchCandidates = async () => {
  loading.value = true;
  try {
    const response = await axiosClient.get(
      `/api/v1/events/${props.eventId}/candidates`
    );
    candidates.value = Array.isArray(response.data)
      ? response.data
      : response.data.data || [];
  } catch (error) {
    toast.error(
      error.response?.data?.message ||
        `Failed to load candidates (Status: ${error.response?.status})`
    );
  } finally {
    loading.value = false;
  }
};

const sendCandidateRequest = async (url, formData, method = "post") => {
  if (isEventLocked.value) {
    toast.error("Cannot modify candidates when event is active or completed.");
    return;
  }

  loading.value = true;
  try {
    await axiosClient[method](url, formData);

    toast.success("Candidate saved successfully!");
    showCreateModal.value = false;
    showEditModal.value = false;
    await fetchCandidates();
    currentPage.value = 1;
  } catch (error) {
    // Enhanced error handling
    const response = error.response;

    if (response?.status === 422 && response?.data?.errors) {
      // Handle validation errors specifically
      const errors = response.data.errors;

      if (errors.candidate_number) {
        toast.error("Candidate number must be unique and valid.");
      } else if (errors.email) {
        toast.error("Email address is already in use or invalid.");
      } else if (errors.first_name || errors.last_name) {
        toast.error("Name fields are required and must be valid.");
      } else if (errors.sex) {
        toast.error("Please select a valid sex option.");
      } else if (errors.team) {
        toast.error("Team name is required.");
      } else if (errors.photo) {
        toast.error("Photo must be a valid image file (max 10MB).");
      } else {
        // Generic validation error
        const firstError = Object.values(errors)[0];
        toast.error(Array.isArray(firstError) ? firstError[0] : firstError);
      }

      // Log detailed errors for debugging
      console.error("Validation errors:", errors);
      Object.entries(errors).forEach(([field, messages]) => {
        console.warn(`Validation failed for ${field}:`, messages);
      });
    } else {
      // Handle other error types
      const message =
        "Failed to save candidate. Please check for duplications in candidate number.";
      toast.error(message);
    }
  } finally {
    loading.value = false;
  }
};

const submitCandidate = async (event, isEdit = false) => {
  event.preventDefault();
  const formData = new FormData(event.target);

  if (isEdit) {
    const candidate = selectedCandidate.value;

    formData.set("first_name", candidate.first_name || "");
    formData.set("last_name", candidate.last_name || "");
    formData.set("candidate_number", candidate.candidate_number || "");
    formData.set("sex", candidate.sex || "");
    formData.set("team", candidate.team || "");
    formData.set("is_active", candidate.is_active ? "true" : "false");
    formData.set("event_id", props.eventId);
    formData.set("candidate_id", candidate.candidate_id);
    formData.set("_method", "PATCH");

    const fileInput = event.target.querySelector('input[name="photo"]');
    if (fileInput?.files?.[0]) {
      formData.set("photo", fileInput.files[0]);
    }

    await sendCandidateRequest(
      `/api/v1/events/${props.eventId}/candidates/${candidate.candidate_id}/edit`,
      formData,
      "post"
    );
  } else {
    formData.set("event_id", props.eventId);

    await sendCandidateRequest(
      `/api/v1/events/${props.eventId}/candidates/create`,
      formData,
      "post"
    );
  }
};

const openCreateModal = () => {
  if (isEventLocked.value) {
    toast.warning(
      "Cannot create candidates when event is active or completed."
    );
    return;
  }
  showCreateModal.value = true;
};

const openEditModal = (candidate) => {
  if (isEventLocked.value) {
    toast.warning("Cannot edit candidates when event is active or completed.");
    return;
  }

  selectedCandidate.value = {
    first_name: candidate.first_name || "",
    last_name: candidate.last_name || "",
    candidate_number: candidate.candidate_number || "",
    sex: candidate.sex || "",
    team: candidate.team || "",
    is_active: candidate.is_active ?? true,
    candidate_id: candidate.candidate_id,
    photo: candidate.photo || null,
  };
  editPreviewUrl.value = "";
  showEditModal.value = true;
};

const filteredCandidates = computed(() => {
  const query = searchQuery.value.toLowerCase();
  const team = filter.value;

  const filtered = candidates.value.filter((candidate) => {
    const matchesTeam = team === "all" || candidate.team === team;
    const matchesSearch =
      candidate.first_name.toLowerCase().includes(query) ||
      candidate.last_name.toLowerCase().includes(query) ||
      candidate.candidate_number.toLowerCase().includes(query) ||
      (candidate.team && candidate.team.toLowerCase().includes(query));
    return matchesTeam && matchesSearch;
  });

  // Sort by candidate number
  return filtered.sort((a, b) => {
    const aNum = parseInt(a.candidate_number) || 0;
    const bNum = parseInt(b.candidate_number) || 0;
    return aNum - bNum;
  });
});

const paginatedCandidates = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  return filteredCandidates.value.slice(start, start + itemsPerPage);
});

const goToPage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
  }
};

const openStatusModal = (candidate) => {
  if (isEventLocked.value) {
    toast.warning(
      "Cannot update candidate status when event is active or completed."
    );
    return;
  }
  selectedStatusTarget.value = candidate;
  showStatusModal.value = true;
};

const updateCandidateStatus = async (isActive) => {
  if (isEventLocked.value) {
    toast.error(
      "Cannot update candidate status when event is active or completed."
    );
    return;
  }

  try {
    if (!selectedStatusTarget.value?.candidate_id || !props.eventId) {
      toast.error("Missing candidate or event ID.");
      return;
    }

    const payload = {
      candidate_id: selectedStatusTarget.value.candidate_id,
      event_id: props.eventId,
      is_active: isActive,
      team: selectedStatusTarget.value.team ?? "",
    };

    console.log("Sending payload:", payload);

    await axiosClient.patch(
      `/api/v1/events/${props.eventId}/candidates/${selectedStatusTarget.value.candidate_id}/edit`,
      payload
    );

    toast.success(`Candidate marked as ${isActive ? "Active" : "Inactive"}`);
    showStatusModal.value = false;
    await fetchCandidates();
  } catch (error) {
    toast.error("Failed to update candidate status.");
    console.error("Validation Errors:", error.response?.data?.errors);
  }
};

const confirmDeleteCandidate = (candidate) => {
  if (isEventLocked.value) {
    toast.warning(
      "Cannot delete candidates when event is active or completed."
    );
    return;
  }
  candidateToDelete.value = candidate;
  showDeleteModal.value = true;
};

// Watch for event status changes
watch(eventStatus, (newStatus) => {
  console.log("Event status changed to:", newStatus);
});

onMounted(async () => {
  console.log("CandidatesTab mounted with eventId:", props.eventId);
  await fetchEventDetails();
  await fetchCandidates();
  console.log("Initial event status:", eventStatus.value);
  console.log("filtered:", filteredCandidates.value.length);
  console.log("paginated:", paginatedCandidates.value.length);
  console.log("totalPages:", totalPages.value);
});

watch([filter, searchQuery], () => {
  currentPage.value = 1;
});

watch(showCreateModal, (val) => {
  if (!val) previewUrl.value = "";
});
watch(showEditModal, (val) => {
  if (!val) editPreviewUrl.value = "";
});

watchEffect(() => {
  console.log("Sample candidate sex value:", candidates.value[0]?.sex);
});
</script>

<template>
  <div
    class="space-y-6 transition-colors duration-300 min-h-screen"
    :class="isDarkMode ? 'bg-gray-900' : 'bg-gray-50'"
  >
    <!-- Header -->
    <div
      class="rounded-xl shadow-lg p-6 transition-all duration-300"
      :class="
        isDarkMode
          ? 'bg-gray-800 border border-gray-700'
          : 'bg-gradient-to-r from-green-50 to-emerald-50'
      "
    >
      <div
        class="flex flex-col lg:flex-row lg:justify-between lg:items-center space-y-4 lg:space-y-0"
      >
        <div class="flex items-center space-x-3">
          <div class="bg-green-500 p-3 rounded-full">
            <i class="fas fa-user-friends text-white text-2xl"></i>
          </div>
          <div>
            <h2
              class="text-2xl lg:text-3xl font-bold transition-colors"
              :class="isDarkMode ? 'text-white' : 'text-green-900'"
            >
              Candidates Management
            </h2>
            <p
              class="text-sm transition-colors"
              :class="isDarkMode ? 'text-gray-300' : 'text-green-700'"
            >
              Manage event participants and their information
            </p>
          </div>
        </div>

        <div class="relative group">
          <button
            @click="openCreateModal"
            :disabled="isEventLocked"
            class="flex items-center px-4 py-2 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
            :class="
              isEventLocked
                ? isDarkMode
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : isDarkMode
                ? 'bg-green-700 hover:bg-green-600 text-green-100'
                : 'bg-green-600 text-white hover:bg-green-700'
            "
          >
            <i class="fas fa-plus mr-2"></i>
            Add Candidate
          </button>
          <div
            v-if="isEventLocked"
            class="absolute -bottom-12 left-1/2 transform -translate-x-1/2 bg-red-600 text-white text-xs rounded px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10"
          >
            🔒 Disabled: Event is {{ eventStatus }}
            <div
              class="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full border-4 border-transparent border-b-red-600"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Enhanced Event Status Warning -->
    <div
      v-if="isEventLocked"
      class="rounded-lg p-4 border-l-4 transition-all duration-300"
      :class="
        isDarkMode
          ? 'bg-red-900/20 border-red-500 text-red-200'
          : 'bg-red-50 border-red-400'
      "
    >
      <div class="flex items-center">
        <i
          class="fas fa-lock mr-3"
          :class="isDarkMode ? 'text-red-400' : 'text-red-600'"
        ></i>
        <div>
          <h3
            class="text-sm font-medium"
            :class="isDarkMode ? 'text-red-300' : 'text-red-800'"
          >
            🔒 Candidate Management Locked - Event is
            {{ eventStatus.toUpperCase() }}
          </h3>
          <p
            class="text-xs mt-1"
            :class="isDarkMode ? 'text-red-400' : 'text-red-700'"
          >
            All candidate management functions are disabled while the event is
            {{ eventStatus }}. To make changes, please reset the event to
            inactive status first.
          </p>
        </div>
      </div>
    </div>

    <!-- Enhanced Filters & Search Card -->
    <div
      class="rounded-lg shadow-lg p-6 transition-all duration-300"
      :class="
        isDarkMode
          ? 'bg-gray-800 border border-gray-700'
          : 'bg-white border border-gray-200'
      "
    >
      <div class="flex flex-col md:flex-row justify-between items-center gap-4">
        <div class="flex items-center space-x-2 w-full md:w-40">
          <CandidateFilters
            v-if="candidates.length"
            v-model:filter="filter"
            :candidates="candidates"
          />
        </div>

        <!-- Enhanced Search Input -->
        <div class="relative w-full md:w-96">
          <i
            class="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 transition-colors"
            :class="isDarkMode ? 'text-green-400' : 'text-green-600'"
          ></i>
          <input
            type="text"
            v-model="searchQuery"
            placeholder="Search candidates by name, number, or team..."
            class="pl-10 pr-4 py-3 border rounded-lg w-full text-sm transition-all duration-200"
            :class="
              isDarkMode
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-green-500 focus:ring-green-500'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-green-600 focus:ring-green-600'
            "
          />
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-16">
      <div class="relative">
        <div
          :class="
            isDarkMode
              ? 'border-green-800 border-t-green-400'
              : 'border-green-200 border-t-green-600'
          "
          class="w-16 h-16 border-4 rounded-full animate-spin"
        ></div>
        <div class="absolute inset-0 flex items-center justify-center">
          <i
            :class="isDarkMode ? 'text-green-400' : 'text-green-600'"
            class="fas fa-user-friends text-lg"
          ></i>
        </div>
      </div>
      <p
        :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'"
        class="mt-4 font-medium"
      >
        Loading candidates...
      </p>
    </div>

    <!-- Candidates Table -->
    <div
      v-else-if="filteredCandidates.length > 0"
      class="rounded-lg shadow-lg overflow-hidden transition-all duration-300"
      :class="isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'"
    >
      <div class="overflow-x-auto">
        <table
          class="min-w-full divide-y text-sm transition-colors"
          :class="isDarkMode ? 'divide-gray-600' : 'divide-gray-200'"
        >
          <thead
            class="transition-colors"
            :class="isDarkMode ? 'bg-gray-700' : 'bg-gray-100'"
          >
            <tr>
              <th
                class="px-6 py-4 text-left font-semibold transition-colors"
                :class="isDarkMode ? 'text-gray-200' : 'text-gray-700'"
              >
                Photo
              </th>
              <th
                class="px-6 py-4 text-left font-semibold transition-colors"
                :class="isDarkMode ? 'text-gray-200' : 'text-gray-700'"
              >
                #
              </th>
              <th
                class="px-6 py-4 text-left font-semibold transition-colors"
                :class="isDarkMode ? 'text-gray-200' : 'text-gray-700'"
              >
                Name
              </th>
              <th
                class="px-6 py-4 text-left font-semibold transition-colors"
                :class="isDarkMode ? 'text-gray-200' : 'text-gray-700'"
              >
                Team
              </th>
              <th
                class="px-6 py-4 text-left font-semibold transition-colors"
                :class="isDarkMode ? 'text-gray-200' : 'text-gray-700'"
              >
                Sex
              </th>
              <th
                class="px-6 py-4 text-left font-semibold transition-colors"
                :class="isDarkMode ? 'text-gray-200' : 'text-gray-700'"
              >
                Status
              </th>
              <th
                class="px-6 py-4 text-left font-semibold transition-colors"
                :class="isDarkMode ? 'text-gray-200' : 'text-gray-700'"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody
            class="divide-y transition-colors"
            :class="
              isDarkMode
                ? 'bg-gray-800 divide-gray-600'
                : 'bg-white divide-gray-200'
            "
          >
            <tr
              v-for="candidate in paginatedCandidates"
              :key="candidate.candidate_id"
              class="transition-colors hover:opacity-80"
              :class="isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'"
            >
              <td class="px-6 py-4">
                <div class="relative">
                  <img
                    :src="getImageUrl(candidate.photo)"
                    :alt="`${candidate.first_name} ${candidate.last_name}`"
                    class="w-12 h-12 rounded-full object-cover border-2 shadow-md transition-all duration-200 hover:scale-105"
                    :class="isDarkMode ? 'border-gray-600' : 'border-gray-300'"
                    @error="handleImageError"
                  />
                </div>
              </td>
              <td class="px-6 py-4">
                <span
                  class="font-medium transition-colors"
                  :class="isDarkMode ? 'text-white' : 'text-gray-800'"
                >
                  {{ candidate.candidate_number }}
                </span>
              </td>
              <td class="px-6 py-4">
                <div>
                  <div
                    class="font-medium transition-colors"
                    :class="isDarkMode ? 'text-white' : 'text-gray-900'"
                  >
                    {{ candidate.first_name }} {{ candidate.last_name }}
                  </div>
                </div>
              </td>
              <td class="px-6 py-4">
                <span
                  class="transition-colors"
                  :class="isDarkMode ? 'text-gray-300' : 'text-gray-600'"
                >
                  {{ candidate.team }}
                </span>
              </td>
              <td class="px-6 py-4">
                <span
                  class="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold"
                  :class="{
                    'bg-blue-100 text-blue-800':
                      candidate.sex === 'M' && !isDarkMode,
                    'bg-blue-800 text-blue-200':
                      candidate.sex === 'M' && isDarkMode,
                    'bg-pink-100 text-pink-800':
                      candidate.sex === 'F' && !isDarkMode,
                    'bg-pink-800 text-pink-200':
                      candidate.sex === 'F' && isDarkMode,
                  }"
                >
                  <i
                    class="fas"
                    :class="{
                      'fa-mars': candidate.sex === 'M',
                      'fa-venus': candidate.sex === 'F',
                    }"
                  ></i>
                  {{ candidate.sex === "M" ? "Male" : "Female" }}
                </span>
              </td>
              <td class="px-6 py-4">
                <div class="relative group">
                  <span
                    class="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold transition cursor-pointer shadow-sm hover:shadow-md hover:scale-[1.02]"
                    :class="
                      isEventLocked
                        ? candidate.is_active
                          ? isDarkMode
                            ? 'bg-green-800 text-green-200 cursor-not-allowed'
                            : 'bg-green-100 text-green-800 cursor-not-allowed'
                          : isDarkMode
                          ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                          : 'bg-gray-200 text-gray-600 cursor-not-allowed'
                        : candidate.is_active
                        ? isDarkMode
                          ? 'bg-green-800 text-green-200 hover:bg-green-700'
                          : 'bg-green-100 text-green-800 hover:bg-green-200'
                        : isDarkMode
                        ? 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    "
                    @click="openStatusModal(candidate)"
                  >
                    <i
                      class="fas"
                      :class="{
                        'fa-check-circle': candidate.is_active,
                        'fa-times-circle': !candidate.is_active,
                      }"
                    ></i>
                    {{ candidate.is_active ? "Active" : "Inactive" }}
                  </span>
                  <div
                    v-if="isEventLocked"
                    class="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  >
                    Disabled: Event {{ eventStatus }}
                  </div>
                </div>
              </td>

              <td class="px-6 py-4">
                <div class="flex flex-wrap gap-2">
                  <!-- Edit Button -->
                  <div class="relative group">
                    <button
                      @click="openEditModal(candidate)"
                      :disabled="isEventLocked"
                      class="flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium transition-all duration-200"
                      :class="
                        isEventLocked
                          ? isDarkMode
                            ? 'border border-gray-600 text-gray-500 cursor-not-allowed'
                            : 'border border-gray-300 text-gray-400 cursor-not-allowed'
                          : isDarkMode
                          ? 'border border-indigo-600 text-indigo-400 hover:text-white hover:bg-indigo-600'
                          : 'border border-indigo-200 text-indigo-600 hover:text-white hover:bg-indigo-600'
                      "
                    >
                      <i class="fas fa-edit"></i>
                      Edit
                    </button>
                    <div
                      v-if="isEventLocked"
                      class="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    >
                      Disabled: Event {{ eventStatus }}
                    </div>
                  </div>

                  <!-- Delete Button -->
                  <div class="relative group">
                    <button
                      @click="confirmDeleteCandidate(candidate)"
                      :disabled="isEventLocked"
                      class="flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium transition-all duration-200"
                      :class="
                        isEventLocked
                          ? isDarkMode
                            ? 'border border-gray-600 text-gray-500 cursor-not-allowed'
                            : 'border border-gray-300 text-gray-400 cursor-not-allowed'
                          : isDarkMode
                          ? 'border border-red-600 text-red-400 hover:text-white hover:bg-red-600'
                          : 'border border-red-200 text-red-600 hover:text-white hover:bg-red-600'
                      "
                    >
                      <i class="fas fa-trash"></i>
                      Delete
                    </button>
                    <div
                      v-if="isEventLocked"
                      class="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    >
                      Disabled: Event {{ eventStatus }}
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Enhanced Pagination Controls -->
      <div
        v-if="totalPages > 1"
        class="border-t p-4 flex justify-between items-center transition-colors"
        :class="
          isDarkMode
            ? 'border-gray-600 bg-gray-800'
            : 'border-gray-200 bg-white'
        "
      >
        <span
          class="text-sm transition-colors"
          :class="isDarkMode ? 'text-gray-300' : 'text-green-600'"
        >
          Showing {{ (currentPage - 1) * itemsPerPage + 1 }} to
          {{
            Math.min(
              (currentPage - 1) * itemsPerPage + paginatedCandidates.length,
              totalItems
            )
          }}
          of {{ totalItems }} results
        </span>

        <div
          class="flex items-center border rounded overflow-hidden"
          :class="isDarkMode ? 'border-gray-600' : 'border-gray-200'"
        >
          <!-- Previous Arrow -->
          <button
            @click="goToPage(currentPage - 1)"
            :disabled="currentPage === 1"
            class="px-3 py-1 transition-colors disabled:opacity-40"
            :class="
              isDarkMode
                ? 'bg-gray-700 text-green-400 hover:bg-gray-600'
                : 'bg-white text-green-600 hover:bg-gray-100'
            "
          >
            <i class="fas fa-chevron-left"></i>
          </button>

          <!-- Current Page -->
          <span
            class="px-4 py-1.5 text-sm font-semibold select-none"
            :class="
              isDarkMode
                ? 'bg-green-700 text-green-100'
                : 'bg-green-600 text-white'
            "
          >
            {{ currentPage }}
          </span>

          <!-- Next Arrow -->
          <button
            @click="goToPage(currentPage + 1)"
            :disabled="currentPage === totalPages"
            class="px-3 py-1 transition-colors disabled:opacity-40"
            :class="
              isDarkMode
                ? 'bg-gray-700 text-green-400 hover:bg-gray-600'
                : 'bg-white text-green-600 hover:bg-gray-100'
            "
          >
            <i class="fas fa-chevron-right"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- No Candidates Message -->
    <div
      v-else
      class="text-center py-16 rounded-xl transition-all duration-300"
      :class="isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-gray-50'"
    >
      <div
        class="mx-auto flex items-center justify-center h-16 w-16 rounded-full mb-4 transition-colors"
        :class="isDarkMode ? 'bg-gray-700' : 'bg-gray-100'"
      >
        <i
          class="fas fa-user-friends text-2xl transition-colors"
          :class="isDarkMode ? 'text-gray-400' : 'text-gray-400'"
        ></i>
      </div>
      <h3
        class="text-lg font-medium mb-2 transition-colors"
        :class="isDarkMode ? 'text-gray-200' : 'text-gray-900'"
      >
        No Candidates Found
      </h3>
      <p
        class="mb-4 transition-colors"
        :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'"
      >
        Get started by adding your first candidate to the event.
      </p>
      <div class="relative group inline-block">
        <button
          @click="openCreateModal"
          :disabled="isEventLocked"
          class="px-4 py-2 rounded-md transition-all duration-200"
          :class="
            isEventLocked
              ? isDarkMode
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : isDarkMode
              ? 'bg-green-700 hover:bg-green-600 text-green-100'
              : 'bg-green-600 text-white hover:bg-green-700'
          "
        >
          <i class="fas fa-plus mr-1"></i>
          Add First Candidate
        </button>
        <div
          v-if="isEventLocked"
          class="absolute -bottom-12 left-1/2 transform -translate-x-1/2 bg-red-600 text-white text-xs rounded px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10"
        >
          🔒 Disabled: Event is {{ eventStatus }}
        </div>
      </div>
    </div>

    <!-- Enhanced Create Modal -->
    <div
      v-if="showCreateModal"
      class="fixed inset-0 backdrop-blur-sm bg-black/50 bg-opacity-50 z-50 flex items-center justify-center p-4 transition-all duration-300"
    >
      <div
        class="rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 animate-in fade-in-0 zoom-in-95 transition-all duration-300"
        :class="isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'"
      >
        <div class="flex items-center justify-between mb-6">
          <h2
            class="text-2xl font-bold transition-colors"
            :class="isDarkMode ? 'text-white' : 'text-gray-800'"
          >
            <i class="fas fa-user-plus mr-2 text-green-500"></i>
            Add Candidate
          </h2>
          <button
            @click="showCreateModal = false"
            class="w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200"
            :class="
              isDarkMode
                ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            "
            type="button"
          >
            <i class="fas fa-times"></i>
          </button>
        </div>

        <form @submit="(e) => submitCandidate(e, false)" class="space-y-6">
          <!-- Photo Upload -->
          <div>
            <label
              class="block text-sm font-medium mb-2 transition-colors"
              :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'"
            >
              Photo
            </label>
            <input
              type="file"
              name="photo"
              accept="image/*"
              @change="onCreatePhotoChange"
              class="block w-full text-sm rounded-lg border transition-all duration-200"
              :class="
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-gray-300 file:bg-green-800 file:text-green-200 file:border-0 file:py-2 file:px-4 file:rounded-l-lg hover:file:bg-green-700'
                  : 'bg-white border-gray-300 text-gray-500 file:bg-green-50 file:text-green-700 file:border-0 file:py-2 file:px-4 file:rounded-l-lg hover:file:bg-green-100'
              "
            />
            <div
              v-if="previewUrl"
              class="mt-3 max-h-48 overflow-hidden rounded-lg border shadow-md"
              :class="isDarkMode ? 'border-gray-600' : 'border-gray-300'"
            >
              <img
                :src="previewUrl"
                alt="Photo Preview"
                class="w-full h-auto object-contain"
                @error="(e) => (e.target.src = '/vsu.png')"
              />
            </div>
          </div>

          <!-- First Name -->
          <div>
            <label
              class="block text-sm font-medium mb-2 transition-colors"
              :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'"
            >
              First Name
            </label>
            <input
              type="text"
              name="first_name"
              required
              class="w-full border rounded-lg px-3 py-3 text-sm transition-all duration-200"
              :class="
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-green-500 focus:ring-green-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-green-500 focus:ring-green-500'
              "
              placeholder="Enter first name"
            />
          </div>

          <!-- Last Name -->
          <div>
            <label
              class="block text-sm font-medium mb-2 transition-colors"
              :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'"
            >
              Last Name
            </label>
            <input
              type="text"
              name="last_name"
              required
              class="w-full border rounded-lg px-3 py-3 text-sm transition-all duration-200"
              :class="
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-green-500 focus:ring-green-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-green-500 focus:ring-green-500'
              "
              placeholder="Enter last name"
            />
          </div>

          <!-- Candidate Number -->
          <div>
            <label
              class="block text-sm font-medium mb-2 transition-colors"
              :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'"
            >
              Candidate Number
            </label>
            <input
              type="text"
              name="candidate_number"
              required
              class="w-full border rounded-lg px-3 py-3 text-sm transition-all duration-200"
              :class="
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-green-500 focus:ring-green-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-green-500 focus:ring-green-500'
              "
              placeholder="Enter candidate number"
            />
          </div>

          <!-- Sex -->
          <div>
            <div v-if="props.division === 'standard'">
              <label
                class="block text-sm font-medium mb-2 transition-colors"
                :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'"
              >
                Sex
              </label>
              <select
                name="sex"
                v-model="form.sex"
                required
                class="w-full border rounded-lg px-3 py-3 text-sm transition-all duration-200"
                :class="
                  isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-white focus:border-green-500 focus:ring-green-500'
                    : 'bg-white border-gray-300 text-gray-900 focus:border-green-500 focus:ring-green-500'
                "
              >
                <option value="M">Male</option>
                <option value="F">Female</option>
              </select>
            </div>

            <!-- Show info for non-standard divisions -->
            <div v-else>
              <label
                class="block text-sm font-medium mb-2 transition-colors"
                :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'"
              >
                Sex
                <span
                  class="ml-2 text-xs px-2 py-1 rounded-full font-semibold"
                  :class="
                    isDarkMode
                      ? 'bg-green-900 text-green-200'
                      : 'bg-green-100 text-green-800'
                  "
                >
                  Auto-assigned:
                  {{ props.division === "male-only" ? "Male" : "Female" }}
                </span>
              </label>
              <div
                class="w-full border rounded-lg px-3 py-3 text-sm transition-all duration-200 flex items-center justify-between"
                :class="
                  isDarkMode
                    ? 'bg-gray-600 border-gray-500 text-gray-300'
                    : 'bg-gray-100 border-gray-300 text-gray-500'
                "
              >
                <span>{{
                  props.division === "male-only" ? "Male" : "Female"
                }}</span>
                <i
                  class="fas fa-lock text-sm"
                  :class="isDarkMode ? 'text-green-400' : 'text-green-600'"
                ></i>
              </div>
              <p
                class="mt-1 text-xs transition-colors"
                :class="isDarkMode ? 'text-green-300' : 'text-green-700'"
              >
                <i class="fas fa-info-circle mr-1"></i>
                All candidates will be automatically assigned as
                {{ props.division === "male-only" ? "Male" : "Female" }} based
                on the event division.
              </p>
            </div>

            <input
              v-if="props.division !== 'standard'"
              type="hidden"
              name="sex"
              :value="props.division === 'male-only' ? 'M' : 'F'"
            />
            <input type="hidden" name="event_id" :value="props.eventId" />
          </div>

          <!-- Team -->
          <div>
            <label
              class="block text-sm font-medium mb-2 transition-colors"
              :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'"
            >
              Team
            </label>
            <input
              type="text"
              name="team"
              class="w-full border rounded-lg px-3 py-3 text-sm transition-all duration-200"
              :class="
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-green-500 focus:ring-green-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-green-500 focus:ring-green-500'
              "
              placeholder="Enter team name"
            />
          </div>

          <!-- Actions -->
          <div class="flex justify-end gap-3 mt-8">
            <button
              type="button"
              @click="showCreateModal = false"
              class="px-6 py-3 text-sm font-medium rounded-lg transition-all duration-200"
              :class="
                isDarkMode
                  ? 'text-gray-300 bg-gray-700 border border-gray-600 hover:bg-gray-600'
                  : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
              "
              :disabled="loading"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="loading"
              class="px-6 py-3 text-sm font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              :class="
                isDarkMode
                  ? 'text-green-100 bg-green-700 border border-transparent hover:bg-green-600'
                  : 'text-white bg-green-600 border border-transparent hover:bg-green-700'
              "
            >
              <i v-if="loading" class="fas fa-spinner fa-spin"></i>
              <i v-else class="fas fa-save"></i>
              {{ loading ? "Creating..." : "Create Candidate" }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Enhanced Edit Modal -->
    <div
      v-if="showEditModal"
      class="fixed inset-0 backdrop-blur-sm bg-black/50 bg-opacity-50 z-50 flex items-center justify-center p-4 transition-all duration-300"
    >
      <div
        class="rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 animate-in fade-in-0 zoom-in-95 transition-all duration-300"
        :class="isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'"
      >
        <div class="flex items-center justify-between mb-6">
          <h2
            class="text-2xl font-bold transition-colors"
            :class="isDarkMode ? 'text-white' : 'text-gray-800'"
          >
            <i class="fas fa-user-edit mr-2 text-indigo-500"></i>
            Edit Candidate
          </h2>
          <button
            @click="showEditModal = false"
            class="w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200"
            :class="
              isDarkMode
                ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            "
            type="button"
          >
            <i class="fas fa-times"></i>
          </button>
        </div>

        <form @submit="(e) => submitCandidate(e, true)" class="space-y-6">
          <!-- Photo Upload -->
          <div>
            <label
              class="block text-sm font-medium mb-2 transition-colors"
              :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'"
            >
              Photo
            </label>
            <input
              type="file"
              name="photo"
              accept="image/*"
              @change="onEditPhotoChange"
              class="block w-full text-sm rounded-lg border transition-all duration-200"
              :class="
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-gray-300 file:bg-green-800 file:text-green-200 file:border-0 file:py-2 file:px-4 file:rounded-l-lg hover:file:bg-green-700'
                  : 'bg-white border-gray-300 text-gray-500 file:bg-green-50 file:text-green-700 file:border-0 file:py-2 file:px-4 file:rounded-l-lg hover:file:bg-green-100'
              "
            />
            <div
              class="mt-3 max-h-48 overflow-hidden rounded-lg border shadow-md"
              :class="isDarkMode ? 'border-gray-600' : 'border-gray-300'"
            >
              <img
                :src="editPreviewUrl || getImageUrl(selectedCandidate?.photo)"
                alt="Candidate Photo"
                class="w-full h-auto object-contain"
                @error="(e) => (e.target.src = '/vsu.png')"
              />
            </div>
          </div>

          <!-- First Name -->
          <div>
            <label
              class="block text-sm font-medium mb-2 transition-colors"
              :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'"
            >
              First Name
            </label>
            <input
              type="text"
              name="first_name"
              :value="selectedCandidate.first_name"
              @input="selectedCandidate.first_name = $event.target.value"
              required
              class="w-full border rounded-lg px-3 py-3 text-sm transition-all duration-200"
              :class="
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-green-500 focus:ring-green-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-green-500 focus:ring-green-500'
              "
            />
          </div>

          <!-- Last Name -->
          <div>
            <label
              class="block text-sm font-medium mb-2 transition-colors"
              :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'"
            >
              Last Name
            </label>
            <input
              type="text"
              name="last_name"
              :value="selectedCandidate.last_name"
              @input="selectedCandidate.last_name = $event.target.value"
              required
              class="w-full border rounded-lg px-3 py-3 text-sm transition-all duration-200"
              :class="
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-green-500 focus:ring-green-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-green-500 focus:ring-green-500'
              "
            />
          </div>

          <!-- Candidate Number -->
          <div>
            <label
              class="block text-sm font-medium mb-2 transition-colors"
              :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'"
            >
              Candidate Number
            </label>
            <input
              type="text"
              name="candidate_number"
              :value="selectedCandidate.candidate_number"
              @input="selectedCandidate.candidate_number = $event.target.value"
              required
              class="w-full border rounded-lg px-3 py-3 text-sm transition-all duration-200"
              :class="
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-green-500 focus:ring-green-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-green-500 focus:ring-green-500'
              "
            />
          </div>

          <!-- Sex -->
          <div>
            <label
              class="block text-sm font-medium mb-2 transition-colors"
              :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'"
            >
              Sex
              <span
                v-if="props.division !== 'standard'"
                class="ml-2 text-xs px-2 py-1 rounded-full font-semibold"
                :class="
                  isDarkMode
                    ? 'bg-amber-900 text-amber-200'
                    : 'bg-amber-100 text-amber-800'
                "
              >
                Fixed by Event Division
              </span>
            </label>
            <div class="relative">
              <select
                name="sex"
                :value="selectedCandidate.sex"
                @change="selectedCandidate.sex = $event.target.value"
                required
                class="w-full border rounded-lg px-3 py-3 text-sm transition-all duration-200"
                :class="[
                  props.division !== 'standard'
                    ? isDarkMode
                      ? 'bg-gray-600 border-gray-500 text-gray-300 cursor-not-allowed opacity-75'
                      : 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed opacity-75'
                    : isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-white focus:border-green-500 focus:ring-green-500'
                    : 'bg-white border-gray-300 text-gray-900 focus:border-green-500 focus:ring-green-500',
                ]"
                :disabled="props.division !== 'standard'"
              >
                <option value="M">Male</option>
                <option value="F">Female</option>
              </select>

              <!-- Lock icon for disabled state -->
              <div
                v-if="props.division !== 'standard'"
                class="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none"
              >
                <i
                  class="fas fa-lock text-sm"
                  :class="isDarkMode ? 'text-amber-400' : 'text-amber-600'"
                ></i>
              </div>
            </div>

            <!-- Helper text for disabled state -->
            <p
              v-if="props.division !== 'standard'"
              class="mt-1 text-xs transition-colors"
              :class="isDarkMode ? 'text-amber-300' : 'text-amber-700'"
            >
              <i class="fas fa-info-circle mr-1"></i>
              Sex is automatically set based on the event's division setting ({{
                props.division
              }}).
            </p>
          </div>

          <!-- Team -->
          <div>
            <label
              class="block text-sm font-medium mb-2 transition-colors"
              :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'"
            >
              Team
            </label>
            <input
              type="text"
              name="team"
              :value="selectedCandidate.team"
              @input="selectedCandidate.team = $event.target.value"
              class="w-full border rounded-lg px-3 py-3 text-sm transition-all duration-200"
              :class="
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-green-500 focus:ring-green-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-green-500 focus:ring-green-500'
              "
            />
          </div>

          <!-- Actions -->
          <div class="flex justify-end gap-3 mt-8">
            <button
              type="button"
              @click="showEditModal = false"
              class="px-6 py-3 text-sm font-medium rounded-lg transition-all duration-200"
              :class="
                isDarkMode
                  ? 'text-gray-300 bg-gray-700 border border-gray-600 hover:bg-gray-600'
                  : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
              "
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="loading"
              class="px-6 py-3 text-sm font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              :class="
                isDarkMode
                  ? 'text-indigo-100 bg-indigo-700 border border-transparent hover:bg-indigo-600'
                  : 'text-white bg-indigo-600 border border-transparent hover:bg-indigo-700'
              "
            >
              <i v-if="loading" class="fas fa-spinner fa-spin"></i>
              <i v-else class="fas fa-save"></i>
              {{ loading ? "Updating..." : "Update Candidate" }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Enhanced Status Modal -->
    <div
      v-if="showStatusModal"
      class="fixed inset-0 backdrop-blur-sm bg-black/50 bg-opacity-50 z-50 flex items-center justify-center p-4 transition-all duration-300"
    >
      <div
        class="rounded-xl shadow-2xl max-w-lg w-full p-6 animate-in fade-in-0 zoom-in-95 transition-all duration-300"
        :class="isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'"
      >
        <div class="flex items-center justify-between mb-6">
          <h2
            class="text-xl font-bold transition-colors"
            :class="isDarkMode ? 'text-white' : 'text-gray-800'"
          >
            <i class="fas fa-toggle-on mr-2 text-blue-500"></i>
            Update Candidate Status
          </h2>
          <button
            @click="showStatusModal = false"
            class="w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200"
            :class="
              isDarkMode
                ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            "
          >
            <i class="fas fa-times"></i>
          </button>
        </div>

        <p
          class="mb-4 transition-colors"
          :class="isDarkMode ? 'text-gray-300' : 'text-gray-600'"
        >
          Update status for
          <strong class="font-semibold">
            {{ selectedStatusTarget?.first_name }}
            {{ selectedStatusTarget?.last_name }} </strong
          >.
        </p>

        <div
          class="text-sm border rounded-lg px-4 py-3 mb-6 transition-colors"
          :class="
            isDarkMode
              ? 'bg-gray-700 text-gray-300 border-gray-600'
              : 'bg-gray-50 text-gray-600 border-gray-200'
          "
        >
          <i class="fas fa-info-circle mr-2"></i>
          The candidate will only be scored if marked as active.
        </div>

        <div class="flex flex-col gap-3">
          <button
            v-if="!selectedStatusTarget?.is_active"
            class="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-all duration-200"
            :class="
              isDarkMode
                ? 'border-green-600 bg-green-800 text-green-200 hover:bg-green-700'
                : 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100'
            "
            @click="updateCandidateStatus(true)"
          >
            <i class="fas fa-check-circle"></i> Mark as Active
          </button>
          <button
            v-else
            class="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-all duration-200"
            :class="
              isDarkMode
                ? 'border-red-600 bg-red-800 text-red-200 hover:bg-red-700'
                : 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100'
            "
            @click="updateCandidateStatus(false)"
          >
            <i class="fas fa-times-circle"></i> Mark as Inactive
          </button>
        </div>

        <div class="flex justify-end pt-6">
          <button
            class="px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200"
            :class="
              isDarkMode
                ? 'text-gray-300 bg-gray-700 border border-gray-600 hover:bg-gray-600'
                : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
            "
            @click="showStatusModal = false"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>

    <!-- Enhanced Delete Confirmation Modal -->
    <div
      v-if="showDeleteModal"
      class="fixed inset-0 z-50 backdrop-blur-sm bg-black/50 bg-opacity-50 flex items-center justify-center p-4 transition-all duration-300"
    >
      <div
        class="rounded-xl p-6 shadow-2xl max-w-md w-full animate-in fade-in-0 zoom-in-95 transition-all duration-300"
        :class="isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'"
      >
        <div class="flex items-center mb-4">
          <div
            class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10"
          >
            <i class="fas fa-exclamation-triangle text-red-600"></i>
          </div>
          <div class="ml-4">
            <h3
              class="text-lg font-semibold transition-colors"
              :class="isDarkMode ? 'text-white' : 'text-gray-800'"
            >
              Confirm Deletion
            </h3>
          </div>
        </div>

        <p
          class="mb-6 transition-colors"
          :class="isDarkMode ? 'text-gray-300' : 'text-gray-600'"
        >
          Are you sure you want to delete candidate
          <strong class="font-semibold">
            {{ candidateToDelete?.first_name }}
            {{ candidateToDelete?.last_name }} </strong
          >? This action cannot be undone and will permanently remove all
          associated data.
        </p>

        <div class="flex justify-end gap-3">
          <button
            class="px-4 py-2 text-sm rounded-lg transition-all duration-200"
            :class="
              isDarkMode
                ? 'text-gray-300 border border-gray-600 hover:bg-gray-700'
                : 'text-gray-700 border border-gray-300 hover:bg-gray-100'
            "
            @click="showDeleteModal = false"
          >
            Cancel
          </button>
          <button
            class="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all duration-200"
            @click="handleDeleteConfirmed"
            :disabled="loading"
          >
            <i v-if="loading" class="fas fa-spinner fa-spin"></i>
            <i v-else class="fas fa-trash"></i>
            {{ loading ? "Deleting..." : "Delete Candidate" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
