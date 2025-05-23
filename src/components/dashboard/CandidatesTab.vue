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
  const path = photo.startsWith("/storage/") ? photo : `/storage/${photo}`;
  return `${BACKEND_BASE_URL}${path}?t=${Date.now()}`;
};

const handleImageError = (event) => {
  event.target.src = "/vsu.png";
};

const handlePhotoUpload = (e) => {
  const file = e.target.files[0];
  if (file && file.type.startsWith("image/")) {
    previewUrl.value = URL.createObjectURL(file);
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

const handleCreateSubmit = async (event) => {
  event.preventDefault(); // ✅ stop page reload

  const formData = new FormData(event.target);
  loading.value = true;
  try {
    await axiosClient.post(
      `/api/v1/events/${props.eventId}/candidates/create`,
      formData
    );
    toast.success("Candidate created successfully!");
    showCreateModal.value = false;
    await fetchCandidates();
    currentPage.value = 1;
  } catch (error) {
    toast.error(error.response?.data?.message || "Failed to create candidate.");
  } finally {
    loading.value = false;
  }
};

const createCandidate = async (formData) => {
  loading.value = true;
  try {
    await axiosClient.post(
      `/api/v1/events/${props.eventId}/candidates/create`,
      formData
    );
    toast.success("Candidate created successfully!");
    showCreateModal.value = false;
    await fetchCandidates();
    currentPage.value = 1;
  } catch (error) {
    toast.error(error.response?.data?.message || "Failed to create candidate.");
  } finally {
    loading.value = false;
  }
};

const updateCandidate = async (formData) => {
  loading.value = true;
  try {
    await axiosClient.patch(
      `/api/v1/events/${props.eventId}/candidates/${selectedCandidate.value.id}/edit`,
      formData
    );
    toast.success("Candidate updated successfully!");
    showEditModal.value = false;
    await fetchCandidates();
    currentPage.value = 1;
  } catch (error) {
    toast.error(error.response?.data?.message || "Failed to update candidate.");
  } finally {
    loading.value = false;
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
  selectedCandidate.value = { ...candidate, id: candidate.candidate_id };
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

onMounted(() => {
  fetchCandidates();
  console.log("filtered:", filteredCandidates.value.length);
  console.log("paginated:", paginatedCandidates.value.length);
  console.log("totalPages:", totalPages.value);
});

watch([filter, searchQuery], () => {
  currentPage.value = 1;
});

watchEffect(() => {
  console.log("filtered:", filteredCandidates.value.length);
  console.log("paginated:", paginatedCandidates.value.length);
  console.log("totalPages:", totalPages.value);
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
      class="bg-white rounded-lg shadow overflow-hidden"
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
            <th class="px-6 py-3 text-left font-semibold text-gray-700">Sex</th>
            <th class="px-6 py-3 text-left font-semibold text-gray-700">
              Team
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
            <td class="px-6 py-4">
              <span
                class="inline-block px-2 py-1 rounded text-xs font-semibold"
                :class="{
                  'bg-green-100 text-green-800': candidate.sex === 'male',
                  'bg-pink-100 text-pink-800': candidate.sex === 'female',
                }"
              >
                {{ candidate.sex }}
              </span>
            </td>
            <td class="px-6 py-4 text-gray-600">
              {{ candidate.team }}
            </td>
            <td class="px-6 py-4 space-x-2">
              <button
                @click="openEditModal(candidate)"
                class="text-indigo-600 hover:text-indigo-900"
              >
                <i class="fas fa-edit mr-1"></i>Edit
              </button>
              <button
                @click="deleteCandidate(candidate.candidate_id)"
                class="text-red-600 hover:text-red-800"
              >
                <i class="fas fa-trash mr-1"></i>Delete
              </button>
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
      class="fixed inset-0 backdrop-blur-md bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
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

        <form @submit="handleCreateSubmit" class="space-y-4">
          <!-- Photo Upload -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Photo</label
            >
            <input
              type="file"
              name="photo"
              accept="image/*"
              @change="handlePhotoUpload"
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
      class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center"
    >
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 class="text-lg font-semibold mb-4">Edit Candidate</h3>
        <form @submit.prevent="updateCandidate(new FormData($event.target))">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700"
              >First Name</label
            >
            <input
              type="text"
              name="first_name"
              :value="selectedCandidate?.first_name"
              required
              class="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
            />
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700"
              >Last Name</label
            >
            <input
              type="text"
              name="last_name"
              :value="selectedCandidate?.last_name"
              required
              class="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
            />
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700"
              >Candidate Number</label
            >
            <input
              type="text"
              name="candidate_number"
              :value="selectedCandidate?.candidate_number"
              required
              class="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
            />
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700">Sex</label>
            <select
              name="sex"
              :value="selectedCandidate?.sex"
              required
              class="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
              :disabled="props.division !== 'standard'"
            >
              <option value="M">Male</option>
              <option value="F">Female</option>
            </select>
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700">Team</label>
            <input
              type="text"
              name="team"
              :value="selectedCandidate?.team"
              class="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
            />
          </div>
          <div class="flex justify-end space-x-2">
            <button type="button" @click="showEditModal = false">Cancel</button>
            <button type="submit" :disabled="loading">
              {{ loading ? "Saving..." : "Save" }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
