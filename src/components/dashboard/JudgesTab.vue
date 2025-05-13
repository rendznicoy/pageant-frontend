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
const judges = ref([]);
const loading = ref(false);
const showCreateModal = ref(false);
const showEditModal = ref(false);
const selectedJudge = ref(null);

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
    toast.error(error.response?.data?.message || "Failed to create judge.");
  } finally {
    loading.value = false;
  }
};

const updateJudge = async (formData) => {
  loading.value = true;
  try {
    await axiosClient.patch(
      `/api/v1/events/${props.eventId}/judges/${selectedJudge.value.id}/edit`,
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
  if (!confirm("Are you sure you want to delete this judge?")) return;
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

const openEditModal = (judge) => {
  selectedJudge.value = { ...judge, id: judge.pin_code };
  showEditModal.value = true;
};

onMounted(() => {
  fetchJudges();
  console.log("Event ID:", props.eventId);
});
</script>

<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <h2 class="text-xl font-semibold text-gray-800">Judges</h2>
      <button
        @click="showCreateModal = true"
        class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
      >
        Add Judge
      </button>
    </div>

    <div v-if="loading" class="flex justify-center py-12">
      <i class="fas fa-spinner fa-spin text-3xl text-green-600"></i>
    </div>
    <div
      v-else-if="judges.length"
      class="bg-white rounded-lg shadow overflow-hidden"
    >
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Pin Code
            </th>
            <th
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Name
            </th>
            <th
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Email
            </th>
            <th
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Actions
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="judge in judges" :key="judge.pin_code">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {{ judge.pin_code }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {{ judge.first_name }} {{ judge.last_name }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {{ judge.email }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
              <button
                @click="openEditModal(judge)"
                class="text-indigo-600 hover:text-indigo-900 mr-4"
              >
                Edit
              </button>
              <button
                @click="deleteJudge(judge.pin_code)"
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
      <p class="text-gray-500">No judges found.</p>
    </div>

    <!-- Create Modal -->
    <div
      v-if="showCreateModal"
      class="fixed insets-0 bg-gray-600 bg-opacity-50 flex items-center justify-center"
      style="z-index: 1000"
    >
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 class="text-lg font-semibold mb-4">Add Judge</h3>
        <form @submit.prevent="createJudge(new FormData($event.target))">
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
            <label class="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              name="email"
              required
              class="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
            />
          </div>
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
      class="fixed insets-0 bg-gray-600 bg-opacity-50 flex items-center justify-center"
      style="z-index: 1000"
    >
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 class="text-lg font-semibold mb-4">Edit Judge</h3>
        <form @submit.prevent="updateJudge(new FormData($event.target))">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700"
              >First Name</label
            >
            <input
              type="text"
              name="first_name"
              :value="selectedJudge?.first_name"
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
              :value="selectedJudge?.last_name"
              required
              class="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
            />
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              name="email"
              :value="selectedJudge?.email"
              required
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
