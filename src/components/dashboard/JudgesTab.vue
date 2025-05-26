// JudgesTab.vue
<script setup>
import { ref, onMounted, computed, watch } from "vue";
import { useToast } from "vue-toastification";
import axiosClient from "@/axios";

const props = defineProps({
  eventId: {
    type: String,
    required: true,
  },
});

const BACKEND_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const toast = useToast();
const judges = ref([]);
const loading = ref(false);
const showCreateModal = ref(false);
const showEditModal = ref(false);
const selectedJudge = ref(null);
const searchQuery = ref("");
const previewPhoto = ref("");
const editPreviewPhoto = ref("");
const showDeleteModal = ref(false);
const judgeToDelete = ref(null);
const eventStatus = ref("inactive");
const isDarkMode = ref(false);

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

const onEditPhotoChange = (e) => handleImageUpload(e, editPreviewPhoto);

const filteredJudges = computed(() => {
  const query = searchQuery.value.toLowerCase();
  const sorted = [...judges.value].sort((a, b) => {
    const aVal = (a?.first_name || "").toString().toLowerCase();
    const bVal = (b?.first_name || "").toString().toLowerCase();
    return aVal.localeCompare(bVal);
  });

  return sorted.filter((j) =>
    [j.first_name, j.last_name, j.pin_code]
      .join(" ")
      .toLowerCase()
      .includes(query)
  );
});

const fetchJudges = async () => {
  loading.value = true;
  try {
    const response = await axiosClient.get(
      `/api/v1/events/${props.eventId}/judges`
    );
    console.log("Judges response:", response.data);
    judges.value = Array.isArray(response.data)
      ? response.data
      : response.data.data || [];
  } catch (error) {
    console.error("Error fetching judges:", error.response);
    toast.error(
      error.response?.data?.message ||
        `Failed to load judges (Status: ${error.response?.status})`
    );
  } finally {
    loading.value = false;
  }
};

const createJudge = async (formData) => {
  if (isEventLocked.value) {
    toast.error("Cannot create judges when event is active or completed.");
    return;
  }

  loading.value = true;
  try {
    await axiosClient.post(
      `/api/v1/events/${props.eventId}/judges/create`,
      formData
    );
    toast.success("Judge created successfully!");
    showCreateModal.value = false;
    await fetchJudges();
  } catch (error) {
    console.error("Validation Errors:", error.response?.data?.errors);
    toast.error(error.response?.data?.message || "Failed to create judge.");
  } finally {
    loading.value = false;
  }
};

const updateJudge = async (formData) => {
  if (isEventLocked.value) {
    toast.error("Cannot update judges when event is active or completed.");
    return;
  }

  loading.value = true;
  try {
    await axiosClient.patch(
      `/api/v1/events/${props.eventId}/judges/${selectedJudge.value.judge_id}/edit`,
      formData
    );
    toast.success("Judge updated successfully!");
    showEditModal.value = false;
    await fetchJudges();
  } catch (error) {
    toast.error(error.response?.data?.message || "Failed to update judge.");
  } finally {
    loading.value = false;
  }
};

const deleteJudge = async (judgeId) => {
  if (isEventLocked.value) {
    toast.error("Cannot delete judges when event is active or completed.");
    return;
  }

  loading.value = true;
  try {
    await axiosClient.delete(
      `/api/v1/events/${props.eventId}/judges/${judgeId}`
    );
    toast.success("Judge deleted successfully!");
    await fetchJudges();
  } catch (error) {
    toast.error(error.response?.data?.message || "Failed to delete judge.");
  } finally {
    loading.value = false;
  }
};

const confirmDeleteJudge = (judge) => {
  if (isEventLocked.value) {
    toast.warning("Cannot delete judges when event is active or completed.");
    return;
  }
  judgeToDelete.value = judge;
  showDeleteModal.value = true;
};

const performDeleteJudge = async () => {
  if (!judgeToDelete.value) return;

  loading.value = true;
  try {
    await axiosClient.delete(
      `/api/v1/events/${props.eventId}/judges/${judgeToDelete.value.judge_id}`
    );
    toast.success("Judge deleted successfully!");
    await fetchJudges();
  } catch (error) {
    toast.error(error.response?.data?.message || "Failed to delete judge.");
  } finally {
    showDeleteModal.value = false;
    judgeToDelete.value = null;
    loading.value = false;
  }
};

const openCreateModal = () => {
  if (isEventLocked.value) {
    toast.warning("Cannot create judges when event is active or completed.");
    return;
  }
  showCreateModal.value = true;
};

const openEditModal = (judge) => {
  if (isEventLocked.value) {
    toast.warning("Cannot edit judges when event is active or completed.");
    return;
  }
  selectedJudge.value = { ...judge };
  editPreviewPhoto.value = getImageUrl(judge.profile_photo);
  showEditModal.value = true;
};

const handleImageUpload = (e, targetRef) => {
  if (!targetRef || typeof targetRef !== "object" || !("value" in targetRef)) {
    console.error("Invalid targetRef passed to handleImageUpload");
    return;
  }
  const file = e.target.files[0];
  if (file && file.type.startsWith("image/")) {
    targetRef.value = URL.createObjectURL(file);
  }
};

const onCreatePhotoChange = (e) => handleImageUpload(e, previewPhoto);

const handleCreateJudgeSubmit = async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  formData.set("event_id", props.eventId);
  await createJudge(formData);
};

const handleEditJudgeSubmit = async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);

  const judge = selectedJudge.value;

  // Manually set form values
  formData.set("first_name", judge.first_name || "");
  formData.set("last_name", judge.last_name || "");
  formData.set("event_id", props.eventId);
  formData.set("judge_id", judge.judge_id);
  formData.set("user_id", judge.user_id);
  formData.set("_method", "PATCH"); // Laravel expects this for PATCH via POST

  // Attach photo file if selected
  const fileInput = e.target.querySelector('input[name="photo"]');
  if (fileInput?.files?.[0]) {
    formData.set("photo", fileInput.files[0]);
  }

  // Debug: see what you're sending
  for (let [key, val] of formData.entries()) {
    console.log(key, val);
  }

  // Send as POST request with method override
  await axiosClient.post(
    `/api/v1/events/${props.eventId}/judges/${judge.judge_id}/edit`,
    formData
  );

  toast.success("Judge updated successfully!");
  showEditModal.value = false;
  await fetchJudges();
};

const getImageUrl = (photo) => {
  if (!photo) return "/vsu.png";
  // Use as-is if it's already an absolute URL
  if (photo.startsWith("http")) return `${photo}?t=${Date.now()}`;
  return `${BACKEND_BASE_URL}/storage/${photo}?t=${Date.now()}`;
};

// Watch for event status changes
watch(eventStatus, (newStatus) => {
  console.log("Event status changed to:", newStatus);
});

onMounted(async () => {
  initializeDarkMode();
  console.log("JudgesTab mounted with eventId:", props.eventId);
  await fetchEventDetails();
  await fetchJudges();
  console.log("Initial event status:", eventStatus.value);
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
            <i class="fas fa-gavel text-white text-2xl"></i>
          </div>
          <div>
            <h2
              class="text-2xl lg:text-3xl font-bold transition-colors"
              :class="isDarkMode ? 'text-white' : 'text-green-900'"
            >
              Judges Management
            </h2>
            <p
              class="text-sm transition-colors"
              :class="isDarkMode ? 'text-gray-300' : 'text-green-700'"
            >
              Manage judges and their credentials
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
            Add Judge
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
            🔒 Judge Management Locked - Event is
            {{ eventStatus.toUpperCase() }}
          </h3>
          <p
            class="text-xs mt-1"
            :class="isDarkMode ? 'text-red-400' : 'text-red-700'"
          >
            All judge management functions are disabled while the event is
            {{ eventStatus }}. To make changes, please reset the event to
            inactive status first.
          </p>
        </div>
      </div>
    </div>

    <!-- Enhanced Search Card -->
    <div
      class="rounded-lg shadow-lg p-6 transition-all duration-300"
      :class="
        isDarkMode
          ? 'bg-gray-800 border border-gray-700'
          : 'bg-white border border-gray-200'
      "
    >
      <div class="flex flex-col md:flex-row justify-between items-center gap-4">
        <!-- Search Input with Icon -->
        <div class="relative w-full md:w-96">
          <i
            class="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 transition-colors"
            :class="isDarkMode ? 'text-green-400' : 'text-green-600'"
          ></i>
          <input
            type="text"
            v-model="searchQuery"
            placeholder="Search judges by name or pin code..."
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
            class="fas fa-hammer text-lg"
          ></i>
        </div>
      </div>
      <p
        :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'"
        class="mt-4 font-medium"
      >
        Loading judges...
      </p>
    </div>

    <!-- Judges Table -->
    <div
      v-else-if="judges.length"
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
                #
              </th>
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
                Pin Code
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
              v-for="(judge, index) in filteredJudges"
              :key="`judge-${index}`"
              class="transition-colors hover:opacity-80"
              :class="isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'"
            >
              <td
                class="px-6 py-4 transition-colors"
                :class="isDarkMode ? 'text-gray-400' : 'text-gray-400'"
              >
                {{ index + 1 }}.
              </td>

              <!-- Profile Photo -->
              <td class="px-6 py-4">
                <div class="relative">
                  <img
                    :src="judge.profile_photo || '/vsu.png'"
                    alt="Profile Photo"
                    class="w-12 h-12 rounded-full object-cover border-2 shadow-md transition-all duration-200 hover:scale-105"
                    :class="isDarkMode ? 'border-gray-600' : 'border-gray-300'"
                    @error="(e) => (e.target.src = '/vsu.png')"
                  />
                </div>
              </td>

              <!-- Pin Code -->
              <td class="px-6 py-4">
                <span
                  class="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold"
                  :class="
                    isDarkMode
                      ? 'bg-blue-900 text-blue-200'
                      : 'bg-blue-100 text-blue-800'
                  "
                >
                  {{ judge.pin_code }}
                </span>
              </td>

              <!-- Full Name -->
              <td class="px-6 py-4">
                <div
                  class="font-medium transition-colors"
                  :class="isDarkMode ? 'text-white' : 'text-gray-900'"
                >
                  {{ judge.first_name }} {{ judge.last_name }}
                </div>
              </td>
              <!-- Actions -->
              <td class="px-6 py-4">
                <div class="flex flex-wrap gap-2">
                  <!-- Edit Button -->
                  <div class="relative group">
                    <button
                      @click="openEditModal(judge)"
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
                      @click="confirmDeleteJudge(judge)"
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
    </div>

    <!-- No Judges Message -->
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
          class="fas fa-gavel text-2xl transition-colors"
          :class="isDarkMode ? 'text-gray-400' : 'text-gray-400'"
        ></i>
      </div>
      <h3
        class="text-lg font-medium mb-2 transition-colors"
        :class="isDarkMode ? 'text-gray-200' : 'text-gray-900'"
      >
        No Judges Found
      </h3>
      <p
        class="mb-4 transition-colors"
        :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'"
      >
        Get started by adding your first judge to the event.
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
          Add First Judge
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
            Add Judge
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

        <form
          @submit.prevent="handleCreateJudgeSubmit($event)"
          class="space-y-6"
        >
          <!-- Profile Photo Upload -->
          <div>
            <label
              class="block text-sm font-medium mb-2 transition-colors"
              :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'"
            >
              Profile Photo
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
              v-if="previewPhoto"
              class="mt-3 max-h-48 overflow-hidden rounded-lg border shadow-md"
              :class="isDarkMode ? 'border-gray-600' : 'border-gray-300'"
            >
              <img
                :src="previewPhoto"
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
              {{ loading ? "Creating..." : "Create Judge" }}
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
            Edit Judge
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

        <form @submit.prevent="handleEditJudgeSubmit" class="space-y-6">
          <!-- Profile Photo Upload -->
          <div>
            <label
              class="block text-sm font-medium mb-2 transition-colors"
              :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'"
            >
              Profile Photo
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
              v-if="editPreviewPhoto"
              class="mt-3 max-h-48 overflow-hidden rounded-lg border shadow-md"
              :class="isDarkMode ? 'border-gray-600' : 'border-gray-300'"
            >
              <img
                :src="editPreviewPhoto"
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
              v-model="selectedJudge.first_name"
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
              v-model="selectedJudge.last_name"
              required
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
              {{ loading ? "Updating..." : "Update Judge" }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Enhanced Confirm Delete Modal -->
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
              Confirm Delete
            </h3>
          </div>
        </div>

        <p
          class="mb-6 transition-colors"
          :class="isDarkMode ? 'text-gray-300' : 'text-gray-600'"
        >
          Are you sure you want to delete judge
          <strong class="font-semibold">
            {{ judgeToDelete?.first_name }}
            {{ judgeToDelete?.last_name }} </strong
          >? This action cannot be undone and will permanently remove all
          associated data.
        </p>

        <div class="flex justify-end gap-3">
          <button
            @click="showDeleteModal = false"
            class="px-4 py-2 text-sm rounded-lg transition-all duration-200"
            :class="
              isDarkMode
                ? 'text-gray-300 border border-gray-600 hover:bg-gray-700'
                : 'text-gray-700 border border-gray-300 hover:bg-gray-100'
            "
          >
            Cancel
          </button>
          <button
            @click="performDeleteJudge"
            :disabled="loading"
            class="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all duration-200"
          >
            <i v-if="loading" class="fas fa-spinner fa-spin"></i>
            <i v-else class="fas fa-trash"></i>
            {{ loading ? "Deleting..." : "Delete Judge" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
