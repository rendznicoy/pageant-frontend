<script setup>
import { ref, onMounted } from "vue";
import { useToast } from "vue-toastification";
import axiosClient from "@/axios";

const props = defineProps({
  eventId: {
    type: String,
    required: true,
  },
});

const toast = useToast();
const candidates = ref([]);
const loading = ref(false);
const showCreateModal = ref(false);
const showEditModal = ref(false);
const selectedCandidate = ref(null);

const fetchCandidates = async () => {
  loading.value = true;
  try {
    const response = await axiosClient.get(
      `/api/v1/events/${props.eventId}/candidates`
    );
    console.log("Candidates response:", response.data);
    candidates.value = Array.isArray(response.data)
      ? response.data
      : response.data.data || [];
  } catch (error) {
    console.error("Error fetching candidates:", error.response);
    toast.error(
      error.response?.data?.message ||
        `Failed to load candidates (Status: ${error.response?.status})`
    );
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

onMounted(() => {
  fetchCandidates();
  console.log("Event ID:", props.eventId);
});
</script>

<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <h2 class="text-xl font-semibold text-gray-800">Candidates</h2>
      <button
        @click="showCreateModal = true"
        class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
      >
        Add Candidate
      </button>
    </div>

    <div v-if="loading" class="flex justify-center py-12">
      <i class="fas fa-spinner fa-spin text-3xl text-green-600"></i>
    </div>
    <div
      v-else-if="candidates.length"
      class="bg-white rounded-lg shadow overflow-hidden"
    >
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Number
            </th>
            <th
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Name
            </th>
            <th
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Sex
            </th>
            <th
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Team
            </th>
            <th
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Actions
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="candidate in candidates" :key="candidate.candidate_id">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {{ candidate.candidate_number }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {{ candidate.first_name }} {{ candidate.last_name }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {{ candidate.sex }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {{ candidate.team }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
              <button
                @click="openEditModal(candidate)"
                class="text-indigo-600 hover:text-indigo-900 mr-4"
              >
                Edit
              </button>
              <button
                @click="deleteCandidate(candidate.candidate_id)"
                class="text-red-600 hover:text-red-900"
              >
                Delete
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else class="text-center py-10">
      <p class="text-gray-500">No candidates found.</p>
    </div>

    <!-- Create Modal -->
    <div
      v-if="showCreateModal"
      class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center"
    >
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 class="text-lg font-semibold mb-4">Add Candidate</h3>
        <form @submit.prevent="createCandidate(new FormData($event.target))">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700"
              >First Name</label
            >
            <input
              type="text"
              name="first_name"
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
              required
              class="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
            />
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700">Sex</label>
            <select
              name="sex"
              required
              class="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
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
              class="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
            />
          </div>
          <!-- Add photo input if needed -->
          <div class="flex justify-end space-x-2">
            <button type="button" @click="showCreateModal = false">
              Cancel
            </button>
            <button type="submit" :disabled="loading">
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
