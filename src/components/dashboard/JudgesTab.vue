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

const onEditPhotoChange = (e) => handleImageUpload(e, editPreviewPhoto);

const filteredJudges = computed(() => {
  const query = searchQuery.value.toLowerCase();
  const sorted = [...judges.value].sort((a, b) => {
    const aVal = (a?.first_name || "").toString().toLowerCase();
    const bVal = (b?.first_name || "").toString().toLowerCase();
    return aVal.localeCompare(bVal);
  });

  return sorted.filter((j) =>
    [j.first_name, j.last_name, j.email, j.pin_code]
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

const confirmDeleteJudge = (judge) => {
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

const openEditModal = (judge) => {
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
  formData.set("email", judge.email || "");
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

onMounted(() => {
  fetchJudges();
  console.log("Event ID:", props.eventId);
});
</script>

<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <div class="flex items-center space-x-2">
        <i class="fas fa-gavel text-green-600 text-2xl mb-1"></i>
        <h2 class="text-2xl font-semibold text-green-800">Judges</h2>
      </div>
      <button
        @click="showCreateModal = true"
        class="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
      >
        <i class="fas fa-plus mr-2"></i>
        Add Judge
      </button>
    </div>

    <!-- Search Card -->
    <div class="bg-white border border-gray-200 rounded-lg p-4 mb-6">
      <div class="flex flex-col md:flex-row justify-between items-center gap-4">
        <!-- Search Input with Icon -->
        <div class="relative w-full md:w-300">
          <i
            class="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-green-600"
          ></i>
          <input
            type="text"
            v-model="searchQuery"
            placeholder="Search judge..."
            class="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-green-600 text-sm"
          />
        </div>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-12">
      <i class="fas fa-spinner fa-spin text-3xl text-green-600"></i>
    </div>
    <div
      v-else-if="judges.length"
      class="bg-white rounded-lg shadow overflow-x-auto"
    >
      <table class="min-w-full divide-y divide-gray-200 text-sm">
        <thead class="bg-gray-100">
          <tr>
            <th class="px-6 py-3 text-left font-semibold text-gray-700">#</th>
            <th class="px-6 py-3 text-left font-semibold text-gray-700">
              Photo
            </th>
            <th class="px-6 py-3 text-left font-semibold text-gray-700">
              Pin Code
            </th>
            <th class="px-6 py-3 text-left font-semibold text-gray-700">
              Name
            </th>
            <th class="px-6 py-3 text-left font-semibold text-gray-700">
              Email
            </th>
            <th class="px-6 py-3 text-left font-semibold text-gray-700">
              Actions
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          <tr
            v-for="(judge, index) in filteredJudges"
            :key="`judge-${index}`"
            class="hover:bg-gray-50 transition"
          >
            <td class="px-6 py-4 text-gray-400">{{ index + 1 }}.</td>

            <!-- Profile Photo -->
            <td class="px-6 py-4">
              <img
                :src="judge.profile_photo || '/vsu.png'"
                alt="Profile Photo"
                class="w-12 h-12 rounded-full object-cover border border-gray-300"
                @error="(e) => (e.target.src = '/vsu.png')"
              />
            </td>

            <!-- Pin Code -->
            <td class="px-6 py-4">
              {{ judge.pin_code }}
            </td>

            <!-- Full Name -->
            <td class="px-6 py-4">
              {{ judge.first_name }} {{ judge.last_name }}
            </td>

            <!-- Clickable Email -->
            <td class="px-6 py-4">
              <a
                :href="`mailto:${judge.email}`"
                class="text-green-600 hover:underline"
              >
                {{ judge.email }}
              </a>
            </td>

            <!-- Actions -->
            <td class="px-6 py-4">
              <div class="flex flex-wrap gap-2">
                <button
                  @click="openEditModal(judge)"
                  class="flex items-center gap-1 border border-indigo-200 text-indigo-600 hover:text-white hover:bg-indigo-600 px-3 py-1 rounded-md text-xs font-medium transition"
                >
                  <i class="fas fa-edit"></i>
                  Edit
                </button>
                <button
                  @click="confirmDeleteJudge(judge)"
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
    </div>
    <div v-else class="text-center py-10">
      <p class="text-gray-500">No judges found.</p>
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

        <h2 class="text-xl font-bold text-gray-800 mb-4">Add Judge</h2>

        <form
          @submit.prevent="handleCreateJudgeSubmit($event)"
          class="space-y-4"
        >
          <!-- Profile Photo Upload -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Profile Photo</label
            >
            <input
              type="file"
              name="photo"
              accept="image/*"
              @change="onCreatePhotoChange"
              class="block w-full text-sm text-gray-500 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
            />
            <div
              v-if="previewPhoto"
              class="mt-2 max-h-48 overflow-hidden border rounded"
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

          <!-- Email -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Email</label
            >
            <input
              type="email"
              name="email"
              required
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

        <h2 class="text-xl font-bold text-gray-800 mb-4">Edit Judge</h2>

        <form @submit.prevent="handleEditJudgeSubmit" class="space-y-4">
          <!-- Profile Photo Upload -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Profile Photo</label
            >
            <input
              type="file"
              name="photo"
              accept="image/*"
              @change="onEditPhotoChange"
              class="block w-full text-sm text-gray-500 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
            />
            <div
              v-if="editPreviewPhoto"
              class="mt-2 max-h-48 overflow-hidden border rounded"
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
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >First Name</label
            >
            <input
              type="text"
              name="first_name"
              v-model="selectedJudge.first_name"
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
              v-model="selectedJudge.last_name"
              required
              class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <!-- Email -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Email</label
            >
            <input
              type="email"
              name="email"
              v-model="selectedJudge.email"
              required
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

    <!-- Confirm Delete Modal -->
    <div
      v-if="showDeleteModal"
      class="fixed inset-0 z-50 bg-opacity-30 backdrop-blur-md flex items-center justify-center p-4"
    >
      <div class="bg-white rounded-lg p-6 shadow-lg max-w-sm w-full">
        <h3 class="text-lg font-semibold text-gray-800 mb-4">Confirm Delete</h3>
        <p class="text-gray-600 mb-6">
          Are you sure you want to delete
          <strong
            >{{ judgeToDelete?.first_name }}
            {{ judgeToDelete?.last_name }}</strong
          >? This action cannot be undone.
        </p>

        <div class="flex justify-end gap-3">
          <button
            @click="showDeleteModal = false"
            class="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            @click="performDeleteJudge"
            :disabled="loading"
            class="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50"
          >
            {{ loading ? "Deleting..." : "Delete" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
