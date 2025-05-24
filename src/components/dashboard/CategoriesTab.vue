<script setup>
import { ref, onMounted, watch } from "vue";
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
const showDeleteStageModal = ref(false);
const showDeleteCategoryModal = ref(false);
const stageToDelete = ref(null);
const categoryToDelete = ref(null);

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
    console.log("Calling /stages with eventId:", props.eventId);
  } catch (error) {
    console.error("Error fetching stages:", error); // this logs full Axios error
    const message =
      error.response?.data?.message ||
      error.message ||
      "Failed to load stages.";
    toast.error(message);
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
  loading.value = true;
  try {
    const formData = new FormData();
    formData.append("_method", "DELETE");
    formData.append("event_id", props.eventId); // REQUIRED for DestroyStageRequest
    formData.append("stage_id", stageId); // REQUIRED for DestroyStageRequest

    await axiosClient.post(
      `/api/v1/events/${props.eventId}/stages/${stageId}`,
      formData
    );

    toast.success("Stage deleted successfully!");
    await fetchStages();
  } catch (error) {
    console.error("Delete stage failed:", error.response?.data);
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
    console.error("Validation Errors:", error.response?.data?.errors);
    toast.error(error.response?.data?.message || "Failed to update category.");
  } finally {
    loading.value = false;
  }
};

const deleteCategory = async (categoryId) => {
  loading.value = true;
  try {
    const formData = new FormData();
    formData.append("_method", "DELETE");
    formData.append("event_id", props.eventId);
    formData.append("category_id", categoryId);

    // Find the stage_id by locating the stage containing this category
    const stage = stages.value.find((s) =>
      s.categories.some((c) => c.id === categoryId)
    );
    const matchedCategory = stage?.categories.find((c) => c.id === categoryId);

    if (!stage || !matchedCategory) {
      throw new Error("Could not resolve stage_id for category.");
    }

    formData.append("stage_id", stage.id);

    await axiosClient.post(
      `/api/v1/events/${props.eventId}/categories/${categoryId}`,
      formData
    );

    toast.success("Category deleted successfully!");
    await fetchStages();
  } catch (error) {
    console.error(
      "Delete stage failed:",
      error.response?.data || error.message
    );
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
  selectedCategory.value = {
    id: category.id, // required for endpoint URL
    category_id: category.id,
    event_id: category.event_id,
    stage_id: category.stage_id,
    category_name: category.name,
    category_weight: category.weight,
    max_score: category.max_score,
  };
  showEditCategoryModal.value = true;
};

const handleCreateStage = (e) => {
  const formData = new FormData(e.target);
  formData.set("event_id", props.eventId);
  createStage(formData);
};

const handleUpdateStage = async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);

  formData.set("event_id", props.eventId);
  formData.set("stage_id", selectedStage.value.id); // or selectedStage.value.stage_id
  formData.set("_method", "PATCH"); // Laravel expects this for form-based PATCH

  for (let [key, val] of formData.entries()) {
    console.log(key, val);
  }

  try {
    await axiosClient.post(
      `/api/v1/events/${props.eventId}/stages/${selectedStage.value.id}/edit`,
      formData
    );
    toast.success("Stage updated successfully!");
    showEditStageModal.value = false;
    await fetchStages();
  } catch (error) {
    console.error("Stage update error:", error.response?.data);
    toast.error(error.response?.data?.message || "Failed to update stage.");
  }
};

const handleCreateCategory = (e) => {
  const formData = new FormData(e.target);
  formData.set("event_id", props.eventId);
  formData.set("stage_id", currentStageId.value);
  createCategory(formData);
};

const handleUpdateCategory = async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);

  formData.set("event_id", props.eventId);
  formData.set("category_id", selectedCategory.value.category_id);
  formData.set("stage_id", selectedCategory.value.stage_id);
  formData.set("_method", "PATCH");

  for (let [key, val] of formData.entries()) {
    console.log(key, val);
  }

  try {
    await axiosClient.post(
      `/api/v1/events/${props.eventId}/categories/${selectedCategory.value.id}/edit`,
      formData
    );
    toast.success("Category updated successfully!");
    showEditCategoryModal.value = false;
    await fetchStages();
  } catch (error) {
    console.error("Category update error:", error.response?.data);
    toast.error(error.response?.data?.message || "Failed to update category.");
  } finally {
    loading.value = false;
  }
};

const confirmDeleteStage = (stage) => {
  stageToDelete.value = stage;
  showDeleteStageModal.value = true;
};

const confirmDeleteCategory = (category) => {
  categoryToDelete.value = category;
  showDeleteCategoryModal.value = true;
};

onMounted(() => {
  fetchStages();
  console.log("Event ID:", props.eventId);
});

watch([stageToDelete, showDeleteStageModal], () => {
  console.log("Modal trigger changed:", {
    stageToDelete: stageToDelete.value,
    showDeleteStageModal: showDeleteStageModal.value,
  });
});
</script>

<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <div class="flex items-center space-x-2">
        <i class="fas fa-layer-group text-green-600 text-2xl mb-1"></i>
        <h2 class="text-2xl font-semibold text-green-800">
          Stages & Categories
        </h2>
      </div>
      <button
        @click="showCreateStageModal = true"
        class="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
      >
        <i class="fas fa-plus mr-2"></i>
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
          <div class="flex flex-wrap gap-2">
            <button
              @click="openEditStageModal(stage)"
              class="flex items-center gap-1 border border-indigo-200 text-indigo-600 hover:text-white hover:bg-indigo-600 px-3 py-1 rounded-md text-xs font-medium transition"
            >
              <i class="fas fa-edit"></i>
              Edit
            </button>
            <button
              @click="confirmDeleteStage(stage)"
              class="flex items-center gap-1 border border-red-200 text-red-600 hover:text-white hover:bg-red-600 px-3 py-1 rounded-md text-xs font-medium transition"
            >
              <i class="fas fa-trash"></i>
              Delete
            </button>
            <button
              @click="openCreateCategoryModal(stage.id)"
              class="flex items-center gap-1 border border-green-200 text-green-600 hover:text-white hover:bg-green-600 px-3 py-1 rounded-md text-xs font-medium transition"
            >
              <i class="fas fa-plus"></i>
              Add Category
            </button>
          </div>
        </div>
        <div v-if="stage.categories.length" class="overflow-x-auto max-w-full">
          <table class="min-w-full divide-y divide-gray-200 text-sm">
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
                  <div class="flex flex-wrap gap-2">
                    <button
                      @click="openEditCategoryModal(category)"
                      class="flex items-center gap-1 border border-indigo-200 text-indigo-600 hover:text-white hover:bg-indigo-600 px-3 py-1 rounded-md text-xs font-medium transition"
                    >
                      <i class="fas fa-edit"></i>
                      Edit
                    </button>
                    <button
                      @click="confirmDeleteCategory(category)"
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
      class="fixed inset-0 backdrop-blur-md bg-opacity-50 z-50 flex items-center justify-center p-4"
    >
      <div
        class="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto relative p-6 animate-in fade-in-0 zoom-in-95"
      >
        <button
          @click="showCreateStageModal = false"
          class="absolute top-3 right-3 text-gray-500 hover:text-gray-700 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
          type="button"
        >
          <i class="fas fa-times"></i>
        </button>
        <h2 class="text-xl font-bold text-gray-800 mb-4">Add Stage</h2>
        <form @submit.prevent="handleCreateStage($event)" class="space-y-4">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Stage Name</label
            >
            <input
              type="text"
              name="stage_name"
              required
              class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <input type="hidden" name="event_id" :value="props.eventId" />
          </div>
          <div class="flex justify-end gap-3 mt-6">
            <button
              type="button"
              @click="showCreateStageModal = false"
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

    <!-- Edit Stage Modal -->
    <div
      v-if="showEditStageModal"
      class="fixed inset-0 backdrop-blur-md bg-opacity-50 z-50 flex items-center justify-center p-4"
    >
      <div
        class="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto relative p-6 animate-in fade-in-0 zoom-in-95"
      >
        <button
          @click="showEditStageModal = false"
          class="absolute top-3 right-3 text-gray-500 hover:text-gray-700 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
          type="button"
        >
          <i class="fas fa-times"></i>
        </button>
        <h2 class="text-xl font-bold text-gray-800 mb-4">Edit Stage</h2>
        <form @submit.prevent="handleUpdateStage">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Stage Name</label
            >
            <input
              type="text"
              name="stage_name"
              :value="selectedStage?.name"
              required
              class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <input type="hidden" name="event_id" :value="props.eventId" />
            <input type="hidden" name="stage_id" :value="selectedStage?.id" />
          </div>
          <div class="flex justify-end gap-3 mt-6">
            <button
              type="button"
              @click="showEditStageModal = false"
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

    <!-- Create Category Modal -->
    <div
      v-if="showCreateCategoryModal"
      class="fixed inset-0 backdrop-blur-md bg-opacity-50 z-50 flex items-center justify-center p-4"
    >
      <div
        class="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto relative p-6 animate-in fade-in-0 zoom-in-95"
      >
        <button
          @click="showCreateCategoryModal = false"
          class="absolute top-3 right-3 text-gray-500 hover:text-gray-700 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
          type="button"
        >
          <i class="fas fa-times"></i>
        </button>
        <h2 class="text-xl font-bold text-gray-800 mb-4">Add Category</h2>
        <form @submit.prevent="handleCreateCategory($event)" class="space-y-4">
          <!-- Category Name -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Category Name</label
            >
            <input
              type="text"
              name="category_name"
              required
              class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <!-- Category Weight -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Weight</label
            >
            <input
              type="number"
              name="category_weight"
              required
              min="0"
              max="100"
              class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Max Score</label
            >
            <input
              type="number"
              name="max_score"
              required
              min="1"
              max="100"
              class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <input type="hidden" name="event_id" :value="props.eventId" />
          <input type="hidden" name="stage_id" :value="currentStageId" />

          <!-- Actions -->
          <div class="flex justify-end gap-3 mt-6">
            <button
              type="button"
              @click="showCreateCategoryModal = false"
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

    <!-- Edit Category Modal -->
    <div
      v-if="showEditCategoryModal"
      class="fixed inset-0 backdrop-blur-md bg-opacity-50 z-50 flex items-center justify-center p-4"
    >
      <div
        class="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto relative p-6 animate-in fade-in-0 zoom-in-95"
      >
        <button
          @click="showEditCategoryModal = false"
          class="absolute top-3 right-3 text-gray-500 hover:text-gray-700 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
          type="button"
        >
          <i class="fas fa-times"></i>
        </button>
        <h2 class="text-xl font-bold text-gray-800 mb-4">Edit Category</h2>
        <form @submit.prevent="handleUpdateCategory($event)" class="space-y-4">
          <!-- Category Name -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Category Name</label
            >
            <input
              type="text"
              name="category_name"
              :value="selectedCategory?.category_name"
              required
              class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <!-- Category Weight -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Weight</label
            >
            <input
              type="number"
              name="category_weight"
              :value="selectedCategory?.category_weight"
              required
              min="0"
              max="100"
              class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <!-- Max Score -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Max Score</label
            >
            <input
              type="number"
              name="max_score"
              :value="selectedCategory?.max_score"
              required
              min="1"
              max="100"
              class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
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

          <!-- Actions -->
          <div class="flex justify-end gap-3 mt-6">
            <button
              type="button"
              @click="showEditCategoryModal = false"
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

    <!-- Delete Stage Modal -->
    <div
      v-if="showDeleteStageModal"
      class="fixed inset-0 z-50 bg-opacity-30 backdrop-blur-md flex items-center justify-center p-4"
    >
      <div class="bg-white rounded-lg p-6 shadow-lg max-w-sm w-full">
        <h3 class="text-lg font-semibold text-gray-800 mb-4">Confirm Delete</h3>
        <p class="text-gray-600 mb-6">
          Are you sure you want to delete the stage
          <strong>{{ stageToDelete?.name || "Unknown" }}</strong> and all its
          categories? This action cannot be undone.
        </p>
        <div class="flex justify-end gap-3">
          <button
            @click="showDeleteStageModal = false"
            class="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            @click="
              async () => {
                if (stageToDelete && stageToDelete.id) {
                  await deleteStage(stageToDelete.id);
                  showDeleteStageModal = false;
                  stageToDelete.value = null;
                }
              }
            "
            :disabled="loading"
            class="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50"
          >
            {{ loading ? "Deleting..." : "Delete" }}
          </button>
        </div>
      </div>
    </div>

    <!-- Delete Category Modal -->
    <div
      v-if="showDeleteCategoryModal"
      class="fixed inset-0 z-50 bg-opacity-30 backdrop-blur-md flex items-center justify-center p-4"
    >
      <div class="bg-white rounded-lg p-6 shadow-lg max-w-sm w-full">
        <h3 class="text-lg font-semibold text-gray-800 mb-4">Confirm Delete</h3>
        <p class="text-gray-600 mb-6">
          Are you sure you want to delete the category
          <strong>{{ categoryToDelete?.name || "Unknown" }}</strong
          >? This action cannot be undone.
        </p>
        <div class="flex justify-end gap-3">
          <button
            @click="showDeleteCategoryModal = false"
            class="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            @click="
              async () => {
                if (categoryToDelete && categoryToDelete.id) {
                  await deleteCategory(categoryToDelete.id);
                  showDeleteCategoryModal = false;
                  categoryToDelete.value = null;
                }
              }
            "
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
