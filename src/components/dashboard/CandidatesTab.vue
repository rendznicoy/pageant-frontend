<script setup>
import { ref, onMounted, computed, watch, watchEffect } from "vue";
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
const filter = ref("all"); // you can update this to reflect actual filter options
const itemsPerPage = 5;
const currentPage = ref(1);
const showStatusModal = ref(false);
const selectedStatusTarget = ref(null);
const editPreviewUrl = ref("");
const showDeleteModal = ref(false);
const candidateToDelete = ref(null);

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

    // Also attach the file itself if editing
    if (targetRef === editPreviewUrl && selectedCandidate.value) {
      selectedCandidate.value.photo = file;
    }
  }
};

const handleDeleteConfirmed = async () => {
  if (!candidateToDelete.value) return;

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
  loading.value = true;
  try {
    await axiosClient[method](url, formData);

    toast.success("Candidate saved successfully!");
    showCreateModal.value = false;
    showEditModal.value = false;
    await fetchCandidates();
    currentPage.value = 1;
  } catch (error) {
    toast.error(error.response?.data?.message || "Failed to save candidate.");
    console.error("Validation errors:", error.response?.data?.errors);
    if (error.response?.data?.errors) {
      Object.entries(error.response.data.errors).forEach(
        ([field, messages]) => {
          console.warn(
            `Validation failed for ${field}: ${messages.join(", ")}`
          );
        }
      );
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

    // Set form fields manually
    formData.set("first_name", candidate.first_name || "");
    formData.set("last_name", candidate.last_name || "");
    formData.set("candidate_number", candidate.candidate_number || "");
    formData.set("sex", candidate.sex || "");
    formData.set("team", candidate.team || "");
    formData.set("is_active", candidate.is_active ? "true" : "false");
    formData.set("event_id", props.eventId);
    formData.set("candidate_id", candidate.candidate_id);

    // Add _method override so Laravel processes it as a PATCH
    formData.set("_method", "PATCH");

    // If a new photo file is selected
    const fileInput = event.target.querySelector('input[name="photo"]');
    if (fileInput?.files?.[0]) {
      formData.set("photo", fileInput.files[0]);
    }

    // Submit as POST with _method override
    await sendCandidateRequest(
      `/api/v1/events/${props.eventId}/candidates/${candidate.candidate_id}/edit`,
      formData,
      "post"
    );
  } else {
    // Set event_id explicitly for creation
    formData.set("event_id", props.eventId);

    await sendCandidateRequest(
      `/api/v1/events/${props.eventId}/candidates/create`,
      formData,
      "post"
    );
  }
};

const deleteCandidate = async (candidateId) => {
  if (!confirm("Are you sure you want to delete this candidate?")) return;
  loading.value = true;
  try {
    await axiosClient.delete(
      `/api/v1/events/${props.eventId}/candidates/${candidateId}`
    );
    toast.success("Candidate deleted successfully!");
    await fetchCandidates();
    currentPage.value = 1;
  } catch (error) {
    toast.error(error.response?.data?.message || "Failed to delete candidate.");
  } finally {
    loading.value = false;
  }
};

const openEditModal = (candidate) => {
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

  return candidates.value.filter((candidate) => {
    const matchesTeam = team === "all" || candidate.team === team;
    const matchesSearch =
      candidate.first_name.toLowerCase().includes(query) ||
      candidate.last_name.toLowerCase().includes(query) ||
      candidate.candidate_number.toLowerCase().includes(query) ||
      (candidate.team && candidate.team.toLowerCase().includes(query));
    return matchesTeam && matchesSearch;
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
  selectedStatusTarget.value = candidate;
  showStatusModal.value = true;
};

const updateCandidateStatus = async (isActive) => {
  try {
    if (!selectedStatusTarget.value?.candidate_id || !props.eventId) {
      toast.error("Missing candidate or event ID.");
      return;
    }

    const payload = {
      candidate_id: selectedStatusTarget.value.candidate_id,
      event_id: props.eventId,
      is_active: isActive,
      team: selectedStatusTarget.value.team ?? "", // optional fallback
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
  candidateToDelete.value = candidate;
  showDeleteModal.value = true;
};

onMounted(() => {
  fetchCandidates();
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
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <div class="flex items-center space-x-2">
        <i class="fas fa-user-friends text-green-600 text-2xl mb-1"></i>
        <h2 class="text-2xl font-semibold text-green-800">Candidates</h2>
      </div>
      <button
        @click="showCreateModal = true"
        class="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
      >
        <i class="fas fa-plus mr-2"></i>
        Add Candidate
      </button>
    </div>

    <!-- Filters & Search Card -->
    <div class="bg-white border border-gray-200 rounded-lg p-4 mb-6">
      <div class="flex flex-col md:flex-row justify-between items-center gap-4">
        <div class="flex items-center space-x-2 w-full md:w-40">
          <CandidateFilters
            v-if="candidates.length"
            v-model:filter="filter"
            :candidates="candidates"
          />
        </div>

        <!-- Search Input with Icon -->
        <div class="relative w-full md:w-300">
          <i
            class="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-green-600"
          ></i>
          <input
            type="text"
            v-model="searchQuery"
            placeholder="Search candidate..."
            class="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-green-600 text-sm"
          />
        </div>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-12">
      <i class="fas fa-spinner fa-spin text-3xl text-green-600"></i>
    </div>

    <div
      v-else-if="filteredCandidates.length > 0"
      class="bg-white rounded-lg shadow overflow-x-auto"
    >
      <table class="min-w-full divide-y divide-gray-200 text-sm">
        <thead class="bg-gray-100">
          <tr>
            <th class="px-6 py-3 text-left font-semibold text-gray-700">
              Photo
            </th>
            <th class="px-6 py-3 text-left font-semibold text-gray-700">#</th>
            <th class="px-6 py-3 text-left font-semibold text-gray-700">
              Name
            </th>
            <th class="px-6 py-3 text-left font-semibold text-gray-700">
              Team
            </th>
            <th class="px-6 py-3 text-left font-semibold text-gray-700">Sex</th>
            <th class="px-6 py-3 text-left font-semibold text-gray-700">
              Status
            </th>
            <th class="px-6 py-3 text-left font-semibold text-gray-700">
              Actions
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          <tr
            v-for="candidate in paginatedCandidates"
            :key="candidate.candidate_id"
            class="hover:bg-gray-50 transition"
          >
            <td class="px-6 py-4">
              <img
                :src="getImageUrl(candidate.photo)"
                :alt="`${candidate.first_name} ${candidate.last_name}`"
                class="w-12 h-12 rounded-full object-cover border border-gray-300"
                @error="handleImageError"
              />
            </td>
            <td class="px-6 py-4 font-medium text-gray-800">
              {{ candidate.candidate_number }}
            </td>
            <td class="px-6 py-4 text-gray-600">
              {{ candidate.first_name }} {{ candidate.last_name }}
            </td>
            <td class="px-6 py-4 text-gray-600">
              {{ candidate.team }}
            </td>
            <td class="px-6 py-4">
              <span
                class="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold"
                :class="{
                  'bg-blue-100 text-blue-800': candidate.sex === 'M',
                  'bg-pink-100 text-pink-800': candidate.sex === 'F',
                }"
              >
                <i
                  class="fas"
                  :class="{
                    'fa-mars': candidate.sex === 'M',
                    'fa-venus': candidate.sex === 'F',
                  }"
                ></i>
              </span>
            </td>
            <td class="px-6 py-4">
              <span
                class="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold transition cursor-pointer shadow-sm hover:shadow-md hover:scale-[1.02]"
                :class="{
                  'bg-green-100 text-green-800 hover:bg-green-200':
                    candidate.is_active,
                  'bg-gray-200 text-gray-600 hover:bg-gray-300':
                    !candidate.is_active,
                }"
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
            </td>

            <td class="px-6 py-4">
              <div class="flex flex-wrap gap-2">
                <button
                  @click="openEditModal(candidate)"
                  class="flex items-center gap-1 border border-indigo-200 text-indigo-600 hover:text-white hover:bg-indigo-600 px-3 py-1 rounded-md text-xs font-medium transition"
                >
                  <i class="fas fa-edit"></i>
                  Edit
                </button>
                <button
                  @click="confirmDeleteCandidate(candidate)"
                  class="flex items-center gap-1 border border-red-200 text-red-600 hover:text-white hover:bg-red-600 px-3 py-1 rounded-md text-xs font-medium transition"
                >
                  <i class="fas fa-trash"></i>
                  Delete
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <!-- Pagination Controls -->
      <div
        v-if="totalPages > 1"
        class="bg-white border border-gray-200 rounded-lg shadow-md p-4 mt-6 flex justify-between items-center"
      >
        <span class="text-sm text-green-600">
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
          class="flex items-center border border-gray-200 rounded overflow-hidden"
        >
          <!-- Previous Arrow -->
          <button
            @click="goToPage(currentPage - 1)"
            :disabled="currentPage === 1"
            class="px-3 py-1 bg-white text-green-600 hover:bg-gray-100 disabled:opacity-40"
          >
            <i class="fas fa-chevron-left"></i>
          </button>

          <!-- Current Page -->
          <span
            class="px-4 py-1.5 bg-green-600 text-white text-sm font-semibold select-none"
          >
            {{ currentPage }}
          </span>

          <!-- Next Arrow -->
          <button
            @click="goToPage(currentPage + 1)"
            :disabled="currentPage === totalPages"
            class="px-3 py-1 bg-white text-green-600 hover:bg-gray-100 disabled:opacity-40"
          >
            <i class="fas fa-chevron-right"></i>
          </button>
        </div>
      </div>
    </div>

    <div v-else class="text-center py-10 text-gray-500">
      No candidates found.
    </div>

    <!-- Create Modal -->
    <div
      v-if="showCreateModal"
      class="fixed inset-0 backdrop-blur-md bg-opacity-50 z-50 flex items-center justify-center p-4"
    >
      <div
        class="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto relative p-6 animate-in fade-in-0 zoom-in-95"
      >
        <button
          @click="showCreateModal = false"
          class="absolute top-3 right-3 text-gray-500 hover:text-gray-700 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
          type="button"
        >
          <i class="fas fa-times"></i>
        </button>

        <h2 class="text-xl font-bold text-gray-800 mb-4">Add Candidate</h2>

        <form @submit="(e) => submitCandidate(e, false)" class="space-y-4">
          <!-- Photo Upload -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Photo</label
            >
            <input
              type="file"
              name="photo"
              accept="image/*"
              @change="onCreatePhotoChange"
              class="block w-full text-sm text-gray-500 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
            />
            <div
              v-if="previewUrl"
              class="mt-2 max-h-48 overflow-hidden border rounded"
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
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >First Name</label
            >
            <input
              type="text"
              name="first_name"
              required
              class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <!-- Last Name -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Last Name</label
            >
            <input
              type="text"
              name="last_name"
              required
              class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <!-- Candidate Number -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Candidate Number</label
            >
            <input
              type="text"
              name="candidate_number"
              required
              class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <!-- Sex -->
          <div>
            <!-- Only show when division is 'standard' -->
            <div v-if="props.division === 'standard'">
              <label class="block text-sm font-medium text-gray-700 mb-1"
                >Sex</label
              >
              <select
                name="sex"
                v-model="form.sex"
                required
                class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="M">Male</option>
                <option value="F">Female</option>
              </select>
            </div>

            <!-- Hidden input for other divisions -->
            <input
              v-else
              type="hidden"
              name="sex"
              :value="props.division === 'male-only' ? 'M' : 'F'"
            />
            <input type="hidden" name="event_id" :value="props.eventId" />
          </div>

          <!-- Team -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Team</label
            >
            <input
              type="text"
              name="team"
              class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <!-- Actions -->
          <div class="flex justify-end gap-3 mt-6">
            <button
              type="button"
              @click="showCreateModal = false"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              :disabled="loading"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="loading"
              class="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <i v-if="loading" class="fas fa-spinner fa-spin"></i>
              {{ loading ? "Saving..." : "Save" }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Edit Modal -->
    <div
      v-if="showEditModal"
      class="fixed inset-0 backdrop-blur-md bg-opacity-50 z-50 flex items-center justify-center p-4"
    >
      <div
        class="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto relative p-6 animate-in fade-in-0 zoom-in-95"
      >
        <button
          @click="showEditModal = false"
          class="absolute top-3 right-3 text-gray-500 hover:text-gray-700 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
          type="button"
        >
          <i class="fas fa-times"></i>
        </button>

        <h2 class="text-xl font-bold text-gray-800 mb-4">Edit Candidate</h2>
        <form @submit="(e) => submitCandidate(e, true)" class="space-y-4">
          <!-- Photo Upload -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Photo</label
            >
            <input
              type="file"
              name="photo"
              accept="image/*"
              @change="onEditPhotoChange"
              class="block w-full text-sm text-gray-500 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
            />
            <div class="mt-2 max-h-48 overflow-hidden border rounded">
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
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >First Name</label
            >
            <input
              type="text"
              name="first_name"
              :value="selectedCandidate.first_name"
              @input="selectedCandidate.first_name = $event.target.value"
              required
              class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <!-- Last Name -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Last Name</label
            >
            <input
              type="text"
              name="last_name"
              :value="selectedCandidate.last_name"
              @input="selectedCandidate.last_name = $event.target.value"
              required
              class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <!-- Candidate Number -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Candidate Number</label
            >
            <input
              type="text"
              name="candidate_number"
              :value="selectedCandidate.candidate_number"
              @input="selectedCandidate.candidate_number = $event.target.value"
              required
              class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <!-- Sex -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Sex</label
            >
            <select
              name="sex"
              :value="selectedCandidate.sex"
              @change="selectedCandidate.sex = $event.target.value"
              required
              class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              :disabled="props.division !== 'standard'"
            >
              <option value="M">Male</option>
              <option value="F">Female</option>
            </select>
          </div>

          <!-- Team -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Team</label
            >
            <input
              type="text"
              name="team"
              :value="selectedCandidate.team"
              @input="selectedCandidate.team = $event.target.value"
              class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <!-- Actions -->
          <div class="flex justify-end gap-3 mt-6">
            <button
              type="button"
              @click="showEditModal = false"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="loading"
              class="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <i v-if="loading" class="fas fa-spinner fa-spin"></i>
              {{ loading ? "Saving..." : "Save" }}
            </button>
          </div>
        </form>
      </div>
    </div>
    <!-- Status Modal -->
    <div
      v-if="showStatusModal"
      class="fixed inset-0 backdrop-blur-md bg-opacity-50 z-50 flex items-center justify-center p-4"
    >
      <div
        class="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto relative p-6 animate-in fade-in-0 zoom-in-95"
      >
        <button
          @click="showStatusModal = false"
          class="absolute top-3 right-3 text-gray-500 hover:text-gray-700 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
        >
          <i class="fas fa-times"></i>
        </button>

        <h2 class="text-xl font-bold text-gray-800 mb-4">
          Manually Update Candidate Status
        </h2>

        <p class="text-gray-600 mb-4">
          Update status for
          <strong
            >{{ selectedStatusTarget?.first_name }}
            {{ selectedStatusTarget?.last_name }}</strong
          >.
        </p>

        <div
          class="bg-gray-50 text-sm text-gray-600 border border-gray-200 rounded px-4 py-3 mb-6"
        >
          The candidate will only be scored if marked as active.
        </div>

        <div class="flex flex-col gap-3">
          <button
            v-if="!selectedStatusTarget?.is_active"
            class="flex items-center justify-center gap-2 px-4 py-2 rounded border border-green-300 bg-green-50 text-green-700 hover:bg-green-100"
            @click="updateCandidateStatus(true)"
          >
            <i class="fas fa-check-circle"></i> Mark as Active
          </button>
          <button
            v-else
            class="flex items-center justify-center gap-2 px-4 py-2 rounded border border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
            @click="updateCandidateStatus(false)"
          >
            <i class="fas fa-times-circle"></i> Mark as Inactive
          </button>
        </div>

        <div class="flex justify-end pt-6">
          <button
            class="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded hover:bg-green-700"
            @click="showStatusModal = false"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
    <!-- Delete Confirmation Modal -->
    <div
      v-if="showDeleteModal"
      class="fixed inset-0 z-50 bg-opacity-30 backdrop-blur-md flex items-center justify-center p-4"
    >
      <div class="bg-white rounded-lg p-6 shadow-lg max-w-sm w-full">
        <h3 class="text-lg font-semibold text-gray-800 mb-4">
          Confirm Deletion
        </h3>
        <p class="text-gray-600 mb-6">
          Are you sure you want to delete
          <strong
            >{{ candidateToDelete?.first_name }}
            {{ candidateToDelete?.last_name }}</strong
          >? This action cannot be undone.
        </p>
        <div class="flex justify-end gap-3">
          <button
            class="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
            @click="showDeleteModal = false"
          >
            Cancel
          </button>
          <button
            class="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
            @click="handleDeleteConfirmed"
            :disabled="loading"
          >
            {{ loading ? "Deleting..." : "Delete" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
