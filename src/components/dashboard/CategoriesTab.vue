<script setup>
import { ref, onMounted } from "vue";
import { useToast } from "vue-toastification";
import axiosClient from "@/axios"; // Assuming you have an axios client setup

const props = defineProps({
  eventId: {
    type: String,
    required: true,
  },
});

const toast = useToast();
const stages = ref([]);
const loading = ref(false);
const showCreateStageModal = ref(false);
const showEditStageModal = ref(false);
const showCreateCategoryModal = ref(false);
const showEditCategoryModal = ref(false);
const selectedStage = ref(null);
const selectedCategory = ref(null);
const currentStageId = ref(null);

const fetchStages = async () => {
  loading.value = true;
  try {
    const response = await axiosClient.get(
      `/api/v1/events/${props.eventId}/stages`
    );
    stages.value = Array.isArray(response.data)
      ? response.data
      : response.data.data || [];
    console.log("Stages:", stages.value); // Debug log
  } catch (error) {
    console.error("Error fetching stages:", error.response);
    toast.error(
      error.response?.data?.message ||
        `Failed to load stages (Status: ${error.response?.status})`
    );
  } finally {
    loading.value = false;
  }
};

const createStage = async (formData) => {
  loading.value = true;
  try {
    await axiosClient.post(
      `/api/v1/events/${props.eventId}/stages/create`,
      formData
    );
    toast.success("Stage created successfully!");
    showCreateStageModal.value = false;
    await fetchStages();
  } catch (error) {
    toast.error(error.response?.data?.message || "Failed to create stage.");
  } finally {
    loading.value = false;
  }
};

const updateStage = async (formData) => {
  loading.value = true;
  try {
    await axiosClient.patch(
      `/api/v1/events/${props.eventId}/stages/${selectedStage.value.id}/edit`,
      formData
    );
    toast.success("Stage updated successfully!");
    showEditStageModal.value = false;
    await fetchStages();
  } catch (error) {
    toast.error(error.response?.data?.message || "Failed to update stage.");
  } finally {
    loading.value = false;
  }
};

const deleteStage = async (stageId) => {
  if (
    !confirm("Are you sure you want to delete this stage and its categories?")
  )
    return;
  loading.value = true;
  try {
    await axiosClient.delete(
      `/api/v1/events/${props.eventId}/stages/${stageId}`
    );
    toast.success("Stage deleted successfully!");
    await fetchStages();
  } catch (error) {
    toast.error(error.response?.data?.message || "Failed to delete stage.");
  } finally {
    loading.value = false;
  }
};

const createCategory = async (formData) => {
  loading.value = true;
  try {
    await axiosClient.post(
      `/api/v1/events/${props.eventId}/categories/create`,
      formData
    );
    toast.success("Category created successfully!");
    showCreateCategoryModal.value = false;
    await fetchStages();
  } catch (error) {
    toast.error(error.response?.data?.message || "Failed to create category.");
  } finally {
    loading.value = false;
  }
};

const updateCategory = async (formData) => {
  loading.value = true;
  try {
    await axiosClient.patch(
      `/api/v1/events/${props.eventId}/categories/${selectedCategory.value.id}/edit`,
      formData
    );
    toast.success("Category updated successfully!");
    showEditCategoryModal.value = false;
    await fetchStages();
  } catch (error) {
    toast.error(error.response?.data?.message || "Failed to update category.");
  } finally {
    loading.value = false;
  }
};

const deleteCategory = async (categoryId) => {
  if (!confirm("Are you sure you want to delete this category?")) return;
  loading.value = true;
  try {
    await axiosClient.delete(
      `/api/v1/events/${props.eventId}/categories/${categoryId}`
    );
    toast.success("Category deleted successfully!");
    await fetchStages();
  } catch (error) {
    toast.error(error.response?.data?.message || "Failed to delete category.");
  } finally {
    loading.value = false;
  }
};

const openEditStageModal = (stage) => {
  selectedStage.value = { ...stage };
  showEditStageModal.value = true;
};

const openCreateCategoryModal = (stageId) => {
  currentStageId.value = stageId;
  showCreateCategoryModal.value = true;
};

const openEditCategoryModal = (category) => {
  selectedCategory.value = { ...category };
  showEditCategoryModal.value = true;
};

onMounted(() => {
  fetchStages();
  console.log("Event ID:", props.eventId);
});
</script>

<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <h2 class="text-xl font-semibold text-gray-800">Stages & Categories</h2>
      <button
        @click="showCreateStageModal = true"
        class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
      >
        Add Stage
      </button>
    </div>

    <div v-if="loading" class="flex justify-center py-12">
      <i class="fas fa-spinner fa-spin text-3xl text-green-600"></i>
    </div>
    <div v-else-if="stages.length" class="space-y-4">
      <div
        v-for="stage in stages"
        :key="stage.id"
        class="bg-white rounded-lg shadow overflow-hidden"
      >
        <div class="flex justify-between items-center px-6 py-4 bg-gray-50">
          <h3 class="text-lg font-medium text-gray-900">{{ stage.name }}</h3>
          <div class="space-x-2">
            <button
              @click="openEditStageModal(stage)"
              class="text-indigo-600 hover:text-indigo-900"
            >
              Edit
            </button>
            <button
              @click="deleteStage(stage.id)"
              class="text-red-600 hover:text-red-900"
            >
              Delete
            </button>
            <button
              @click="openCreateCategoryModal(stage.id)"
              class="text-green-600 hover:text-green-900"
            >
              <i class="fas fa-plus"></i> Add Category
            </button>
          </div>
        </div>
        <table
          v-if="stage.categories.length"
          class="min-w-full divide-y divide-gray-200"
        >
          <thead class="bg-gray-50">
            <tr>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Name
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Weight
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Max Score
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="category in stage.categories" :key="category.id">
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ category.name }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ category.weight }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ category.max_score }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button
                  @click="openEditCategoryModal(category)"
                  class="text-indigo-600 hover:text-indigo-900 mr-4"
                >
                  Edit
                </button>
                <button
                  @click="deleteCategory(category.id)"
                  class="text-red-600 hover:text-red-900"
                >
                  Delete
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-else class="px-6 py-4 text-sm text-gray-500">
          No categories in this stage.
        </div>
      </div>
    </div>
    <div v-else class="text-center py-10">
      <p class="text-gray-500">No stages found.</p>
    </div>

    <!-- Create Stage Modal -->
    <div
      v-if="showCreateStageModal"
      class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center"
    >
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 class="text-lg font-semibold mb-4">Add Stage</h3>
        <form @submit.prevent="createStage(new FormData($event.target))">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700"
              >Stage Name</label
            >
            <input
              type="text"
              name="stage_name"
              required
              class="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
            />
            <input type="hidden" name="event_id" :value="props.eventId" />
          </div>
          <div class="flex justify-end space-x-2">
            <button
              type="button"
              @click="showCreateStageModal = false"
              class="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="loading"
              class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              {{ loading ? "Saving..." : "Save" }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Edit Stage Modal -->
    <div
      v-if="showEditStageModal"
      class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center"
    >
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 class="text-lg font-semibold mb-4">Edit Stage</h3>
        <form @submit.prevent="updateStage(new FormData($event.target))">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700"
              >Stage Name</label
            >
            <input
              type="text"
              name="stage_name"
              :value="selectedStage?.name"
              required
              class="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
            />
            <input type="hidden" name="event_id" :value="props.eventId" />
            <input type="hidden" name="stage_id" :value="selectedStage?.id" />
          </div>
          <div class="flex justify-end space-x-2">
            <button
              type="button"
              @click="showEditStageModal = false"
              class="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="loading"
              class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              {{ loading ? "Saving..." : "Save" }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Create Category Modal -->
    <div
      v-if="showCreateCategoryModal"
      class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center"
    >
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 class="text-lg font-semibold mb-4">Add Category</h3>
        <form @submit.prevent="createCategory(new FormData($event.target))">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700"
              >Category Name</label
            >
            <input
              type="text"
              name="category_name"
              required
              class="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
            />
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700"
              >Weight</label
            >
            <input
              type="number"
              name="category_weight"
              required
              min="0"
              max="100"
              class="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
            />
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700"
              >Max Score</label
            >
            <input
              type="number"
              name="max_score"
              required
              min="1"
              max="10"
              class="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
            />
          </div>
          <input type="hidden" name="event_id" :value="props.eventId" />
          <input type="hidden" name="stage_id" :value="currentStageId" />
          <div class="flex justify-end space-x-2">
            <button
              type="button"
              @click="showCreateCategoryModal = false"
              class="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="loading"
              class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              {{ loading ? "Saving..." : "Save" }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Edit Category Modal -->
    <div
      v-if="showEditCategoryModal"
      class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center"
    >
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 class="text-lg font-semibold mb-4">Edit Category</h3>
        <form @submit.prevent="updateCategory(new FormData($event.target))">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700"
              >Category Name</label
            >
            <input
              type="text"
              name="category_name"
              :value="selectedCategory?.name"
              required
              class="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
            />
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700"
              >Weight</label
            >
            <input
              type="number"
              name="category_weight"
              :value="selectedCategory?.weight"
              required
              min="0"
              max="100"
              class="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
            />
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700"
              >Max Score</label
            >
            <input
              type="number"
              name="max_score"
              :value="selectedCategory?.max_score"
              required
              min="1"
              max="10"
              class="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
            />
          </div>
          <input type="hidden" name="event_id" :value="props.eventId" />
          <input
            type="hidden"
            name="category_id"
            :value="selectedCategory?.id"
          />
          <input
            type="hidden"
            name="stage_id"
            :value="selectedCategory?.stage_id"
          />
          <div class="flex justify-end space-x-2">
            <button
              type="button"
              @click="showEditCategoryModal = false"
              class="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="loading"
              class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              {{ loading ? "Saving..." : "Save" }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
