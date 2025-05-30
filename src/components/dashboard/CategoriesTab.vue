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

// Dark mode state
const isDarkMode = ref(false);

// Initialize dark mode from localStorage
onMounted(() => {
  const savedDarkMode = localStorage.getItem("darkMode");
  if (savedDarkMode !== null) {
    isDarkMode.value = savedDarkMode === "true";
  } else {
    isDarkMode.value = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
  }
});

const stageForm = ref({
  stage_name: "",
});

const categoryForm = ref({
  category_name: "",
  category_weight: "",
  max_score: null,
});

const maxScoreForm = ref({
  global_max_score: null,
});

const clearForms = () => {
  stageForm.value.stage_name = "";
  categoryForm.value.category_name = "";
  categoryForm.value.category_weight = "";
  categoryForm.value.max_score = globalMaxScore.value;
  maxScoreForm.value.global_max_score = globalMaxScore.value;
};

const toast = useToast();
const stages = ref([]);
const loading = ref(false);
const showCreateStageModal = ref(false);
const showEditStageModal = ref(false);
const showCreateCategoryModal = ref(false);
const showEditCategoryModal = ref(false);
const showEditMaxScoreModal = ref(false);
const selectedStage = ref(null);
const selectedCategory = ref(null);
const currentStageId = ref(null);
const showDeleteStageModal = ref(false);
const showDeleteCategoryModal = ref(false);
const stageToDelete = ref(null);
const categoryToDelete = ref(null);
const eventStatus = ref("inactive");
const globalMaxScore = ref(100);

// Enhanced watch for selectedCategory changes
watch(
  () => selectedCategory.value,
  (newCategory) => {
    if (newCategory) {
      categoryForm.value = {
        category_name: newCategory.category_name || newCategory.name,
        category_weight: newCategory.category_weight || newCategory.weight,
        max_score: newCategory.max_score || globalMaxScore.value,
      };
    }
  },
  { deep: true }
);

// Watch for global max score changes to update category form
watch(
  () => globalMaxScore.value,
  (newMaxScore) => {
    categoryForm.value.max_score = newMaxScore;
  },
  { immediate: true }
);

const createStage = async (formData) => {
  if (isEventLocked.value) {
    toast.error("Cannot create stages when event is active or completed.");
    return;
  }

  loading.value = true;
  try {
    await axiosClient.post(
      `/api/v1/events/${props.eventId}/stages/create`,
      formData
    );
    toast.success("Stage created successfully!");
    showCreateStageModal.value = false;
    clearForms();
    await fetchStages();
  } catch (error) {
    toast.error(error.response?.data?.message || "Failed to create stage.");
  } finally {
    loading.value = false;
  }
};

const updateStage = async (formData) => {
  if (isEventLocked.value) {
    toast.error("Cannot update stages when event is active or completed.");
    return;
  }

  loading.value = true;
  try {
    await axiosClient.post(
      `/api/v1/events/${props.eventId}/stages/${selectedStage.value.id}/edit`,
      formData
    );
    toast.success("Stage updated successfully!");
    showEditStageModal.value = false;
    clearForms();
    await fetchStages();
  } catch (error) {
    toast.error(error.response?.data?.message || "Failed to update stage.");
  } finally {
    loading.value = false;
  }
};

const deleteStage = async (stage) => {
  if (isEventLocked.value) {
    toast.error("Cannot delete stages when event is active or completed.");
    return;
  }

  loading.value = true;
  try {
    // Send as form data for DELETE request validation
    const formData = new FormData();
    formData.append("stage_id", stage.id);
    formData.append("event_id", props.eventId);
    formData.append("_method", "DELETE");

    await axiosClient.post(
      `/api/v1/events/${props.eventId}/stages/${stage.id}`,
      formData
    );
    toast.success("Stage deleted successfully!");
    await fetchStages();
  } catch (error) {
    toast.error(error.response?.data?.message || "Failed to delete stage.");
  } finally {
    loading.value = false;
  }
};

const deleteCategory = async (category) => {
  if (isEventLocked.value) {
    toast.error("Cannot delete categories when event is active or completed.");
    return;
  }

  loading.value = true;
  try {
    // Send stage_id as query parameter since it's required by validation
    await axiosClient.delete(
      `/api/v1/events/${props.eventId}/categories/${category.id}?stage_id=${category.stage_id}`
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
  if (isEventLocked.value) {
    toast.warning("Cannot edit stages when event is active or completed.");
    return;
  }
  selectedStage.value = stage;
  stageForm.value.stage_name = stage.name;
  showEditStageModal.value = true;
};

const openEditMaxScoreModal = () => {
  if (isEventLocked.value) {
    toast.warning("Cannot edit max score when event is active or completed.");
    return;
  }
  maxScoreForm.value.global_max_score = globalMaxScore.value;
  showEditMaxScoreModal.value = true;
};

// Single computed property for checking if event is locked
const isEventLocked = computed(() => {
  return ["active", "completed"].includes(eventStatus.value);
});

// Enhanced method to handle max score input changes
const handleMaxScoreChange = (event) => {
  const value = parseInt(event.target.value) || globalMaxScore.value;
  categoryForm.value.max_score = Math.max(
    1,
    Math.min(globalMaxScore.value, value)
  ); // ✅ uses global max
};

const handleDeleteStage = async () => {
  if (stageToDelete.value && stageToDelete.value.id) {
    await deleteStage(stageToDelete.value); // Pass full object instead of just ID
    showDeleteStageModal.value = false;
    stageToDelete.value = null;
  }
};

const handleDeleteCategory = async () => {
  if (categoryToDelete.value && categoryToDelete.value.id) {
    await deleteCategory(categoryToDelete.value); // Pass full object instead of just ID
    showDeleteCategoryModal.value = false;
    categoryToDelete.value = null;
  }
};

// Function to validate category weight
// Function to validate category weight
const validateCategoryWeight = (
  newWeight,
  stageId,
  excludeCategoryId = null
) => {
  const stage = stages.value.find((s) => s.id === stageId);
  if (!stage) return { isValid: false, message: "Stage not found" };

  // ✅ Fix: Ensure proper type comparison and exclusion
  const currentTotal = stage.categories
    .filter((cat) => {
      // Convert both IDs to strings for comparison to avoid type mismatch
      const catId = String(cat.id || cat.category_id);
      const excludeId = String(excludeCategoryId);
      return catId !== excludeId;
    })
    .reduce((sum, cat) => sum + (cat.weight || 0), 0);

  const newTotal = currentTotal + newWeight;

  // ✅ Add debugging to help troubleshoot
  console.log("Category weight validation:", {
    newWeight,
    stageId,
    excludeCategoryId,
    currentTotal,
    newTotal,
    categories: stage.categories.map((cat) => ({
      id: cat.id,
      category_id: cat.category_id,
      weight: cat.weight,
      excluded: String(cat.id || cat.category_id) === String(excludeCategoryId),
    })),
  });

  if (newTotal > 100) {
    return {
      isValid: false,
      message: `Category weight total exceeds limit of 100. Current total: ${currentTotal}, trying to add: ${newWeight}, would result in: ${newTotal}`,
    };
  }

  return { isValid: true, newTotal };
};

const fetchEventDetails = async () => {
  try {
    console.log("Fetching event details for:", props.eventId);

    const eventData = await axiosClient.get(`/api/v1/events/${props.eventId}`);
    const data = eventData.data || eventData;

    console.log("Event data received:", data);

    eventStatus.value = data.status || "inactive";

    // ✅ Use the actual database value, not a default
    if (data.global_max_score !== undefined && data.global_max_score !== null) {
      globalMaxScore.value = data.global_max_score;
    } else {
      globalMaxScore.value = 100; // Only use default if not set in database
    }

    console.log("Global max score set to:", globalMaxScore.value);

    // Set form values after fetching
    categoryForm.value.max_score = globalMaxScore.value;
    maxScoreForm.value.global_max_score = globalMaxScore.value;
  } catch (error) {
    console.error("Error fetching event details:", error);
    toast.error("Failed to fetch event details");
  }
};

const fetchStages = async () => {
  loading.value = true;
  try {
    const stagesData = await axiosClient.get(
      `/api/v1/events/${props.eventId}/stages`
    );

    stages.value = Array.isArray(stagesData)
      ? stagesData
      : Array.isArray(stagesData?.data)
      ? stagesData.data
      : [];

    console.log("Fetched stages with categories:", stages.value);

    stages.value.forEach((stage) => {
      stage.totalWeight =
        stage.categories?.reduce((sum, cat) => sum + (cat.weight || 0), 0) || 0;

      if (stage.categories) {
        stage.categories.forEach((category) => {
          console.log(
            `Category "${category.name}" max_score:`,
            category.max_score
          );
        });
      }
    });
  } catch (error) {
    console.error("Error fetching stages:", error);
    const message =
      error.response?.data?.message ||
      error.message ||
      "Failed to load stages.";
    toast.error(message);
  } finally {
    loading.value = false;
  }
};

const updateGlobalMaxScore = async (newMaxScore) => {
  if (isEventLocked.value) {
    toast.error("Cannot update max score when event is active or completed.");
    return;
  }

  loading.value = true;
  try {
    console.log("Updating global max score to:", newMaxScore);

    const response = await axiosClient.patch(
      `/api/v1/events/${props.eventId}/global-max-score`,
      {
        global_max_score: newMaxScore,
      }
    );

    console.log("Global max score update response:", response);

    // Update local state
    globalMaxScore.value = newMaxScore;

    // ✅ Force refresh all data to show updated categories
    await Promise.all([fetchEventDetails(), fetchStages()]);

    toast.success("Global max score updated successfully!");
    showEditMaxScoreModal.value = false;
    clearForms();

    console.log("Categories should now show max score:", newMaxScore);
  } catch (error) {
    console.error("updateGlobalMaxScore error:", error);
    toast.error(
      error.response?.data?.message || "Failed to update global max score."
    );
  } finally {
    loading.value = false;
  }
};

const createCategory = async (formData) => {
  if (isEventLocked.value) {
    toast.error("Cannot create categories when event is active or completed.");
    return;
  }

  const weight = parseInt(formData.get("category_weight"));
  const stageId = parseInt(formData.get("stage_id"));

  const validation = validateCategoryWeight(weight, stageId);
  if (!validation.isValid) {
    toast.error(validation.message);
    return;
  }

  loading.value = true;
  try {
    formData.set("max_score", globalMaxScore.value);
    await axiosClient.post(
      `/api/v1/events/${props.eventId}/categories/create`,
      formData
    );
    toast.success("Category created successfully!");
    showCreateCategoryModal.value = false;
    clearForms();
    await fetchStages();
  } catch (error) {
    toast.error(error.response?.data?.message || "Failed to create category.");
  } finally {
    loading.value = false;
  }
};

const updateCategory = async (formData) => {
  if (isEventLocked.value) {
    toast.error("Cannot update categories when event is active or completed.");
    return;
  }

  const weight = parseInt(formData.get("category_weight"));
  const categoryId =
    parseInt(formData.get("category_id")) || selectedCategory.value.id;
  const stageId = parseInt(formData.get("stage_id"));

  console.log("Update category validation inputs:", {
    weight,
    categoryId,
    stageId,
    selectedCategory: selectedCategory.value,
  });

  const validation = validateCategoryWeight(weight, stageId, categoryId);
  if (!validation.isValid) {
    toast.error(validation.message);
    return;
  }

  loading.value = true;
  try {
    const maxScore =
      parseInt(formData.get("max_score")) || globalMaxScore.value;
    formData.delete("max_score");
    formData.set("max_score", maxScore);

    // ✅ Ensure we're using the correct category ID
    formData.set("category_id", selectedCategory.value.category_id);

    console.log(
      "Sending update request with FormData:",
      Object.fromEntries(formData.entries())
    );

    await axiosClient.post(
      `/api/v1/events/${props.eventId}/categories/${selectedCategory.value.id}/edit`,
      formData
    );
    toast.success("Category updated successfully!");
    showEditCategoryModal.value = false;
    clearForms();
    await fetchStages();
  } catch (error) {
    console.error("Category update error:", error);
    toast.error(error.response?.data?.message || "Failed to update category.");
  } finally {
    loading.value = false;
  }
};

const openEditCategoryModal = (category) => {
  if (isEventLocked.value) {
    toast.warning("Cannot edit categories when event is active or completed.");
    return;
  }

  console.log("Opening edit modal for category:", category);

  selectedCategory.value = {
    id: category.category_id || category.id, // ✅ Use category_id if available
    category_id: category.category_id || category.id,
    event_id: category.event_id,
    stage_id: category.stage_id,
    category_name: category.name,
    category_weight: category.weight,
    max_score: globalMaxScore.value,
  };

  categoryForm.value.category_name = category.name;
  categoryForm.value.category_weight = category.weight;
  categoryForm.value.max_score = globalMaxScore.value;

  console.log("Selected category for edit:", selectedCategory.value);

  showEditCategoryModal.value = true;
};

const confirmDeleteStage = (stage) => {
  if (isEventLocked.value) {
    toast.warning("Cannot delete stages when event is active or completed.");
    return;
  }
  stageToDelete.value = stage;
  showDeleteStageModal.value = true;
};

const confirmDeleteCategory = (category) => {
  if (isEventLocked.value) {
    toast.warning(
      "Cannot delete categories when event is active or completed."
    );
    return;
  }
  categoryToDelete.value = category;
  showDeleteCategoryModal.value = true;
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
  formData.set("stage_id", selectedStage.value.id);
  formData.set("_method", "PATCH");
  await updateStage(formData);
};

const handleCreateCategory = (e) => {
  const formData = new FormData(e.target);
  formData.set("event_id", props.eventId);
  formData.set("stage_id", currentStageId.value);
  formData.set("max_score", globalMaxScore.value);
  createCategory(formData);
};

const handleUpdateCategory = async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  formData.set("event_id", props.eventId);
  formData.set("category_id", selectedCategory.value.category_id);
  formData.set("stage_id", selectedCategory.value.stage_id);
  formData.set("max_score", globalMaxScore.value); // Use global max score instead
  formData.set("_method", "PATCH");
  await updateCategory(formData);
};

const handleUpdateGlobalMaxScore = (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const newMaxScore = parseInt(formData.get("global_max_score"));
  updateGlobalMaxScore(newMaxScore);
};

const openCreateCategoryModal = (stageId) => {
  if (isEventLocked.value) {
    toast.warning(
      "Cannot create categories when event is active or completed."
    );
    return;
  }
  currentStageId.value = stageId;
  showCreateCategoryModal.value = true;
};

onMounted(async () => {
  await fetchEventDetails();
  await fetchStages();
});
</script>

<template>
  <div
    :class="
      isDarkMode
        ? 'bg-gray-900 text-white min-h-screen'
        : 'bg-gray-50 text-gray-900 min-h-screen'
    "
    class="space-y-6 p-6 transition-colors duration-300"
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
        <div class="flex items-center space-x-4">
          <div class="flex items-center space-x-3">
            <div class="bg-green-500 p-3 rounded-full">
              <i class="fas fa-layer-group text-white text-2xl"></i>
            </div>
            <div>
              <h2
                class="text-2xl lg:text-3xl font-bold transition-colors"
                :class="isDarkMode ? 'text-white' : 'text-green-900'"
              >
                Stages & Categories
              </h2>
              <p
                class="text-sm transition-colors"
                :class="isDarkMode ? 'text-gray-300' : 'text-green-700'"
              >
                Organize your event structure and scoring criteria
              </p>
            </div>
          </div>
        </div>

        <div
          class="flex flex-col sm:flex-row items-start sm:items-center gap-3"
        >
          <!-- Global Max Score Display -->
          <div
            :class="
              isDarkMode
                ? 'bg-blue-900/50 border-blue-700'
                : 'bg-white/60 border-blue-200'
            "
            class="flex items-center space-x-2 px-4 py-2 rounded-lg shadow-sm border backdrop-blur-sm"
          >
            <div
              :class="
                isDarkMode
                  ? 'bg-blue-700 text-blue-300'
                  : 'bg-blue-100 text-blue-600'
              "
              class="p-1 rounded-full"
            >
              <i class="fas fa-star text-sm"></i>
            </div>
            <div>
              <span
                :class="isDarkMode ? 'text-blue-300' : 'text-blue-700'"
                class="text-xs font-medium block"
              >
                Max Score
              </span>
              <span
                :class="isDarkMode ? 'text-blue-200' : 'text-blue-800'"
                class="text-lg font-bold"
              >
                {{ globalMaxScore }}
              </span>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <!-- Edit Max Score Button -->
            <div class="relative group">
              <button
                @click="openEditMaxScoreModal"
                :disabled="isEventLocked"
                class="flex items-center px-3 py-2 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg text-sm"
                :class="
                  isEventLocked
                    ? isDarkMode
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : isDarkMode
                    ? 'bg-blue-700 hover:bg-blue-600 text-blue-100'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                "
              >
                <i class="fas fa-edit mr-2"></i>
                Edit Max Score
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

            <!-- Add Stage Button -->
            <div class="relative group">
              <button
                @click="showCreateStageModal = true"
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
                Add Stage
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
      </div>
    </div>

    <!-- Event Status Warning -->
    <div
      v-if="isEventLocked"
      :class="
        isDarkMode
          ? 'bg-gradient-to-r from-red-900/20 to-red-800/20 border-red-500'
          : 'bg-gradient-to-r from-red-50 to-red-100 border-red-400'
      "
      class="border-l-4 p-4 rounded-r-lg shadow-sm"
    >
      <div class="flex items-start">
        <div
          :class="
            isDarkMode ? 'bg-red-800 text-red-400' : 'bg-red-100 text-red-600'
          "
          class="p-2 rounded-full mr-3 mt-1"
        >
          <i class="fas fa-lock"></i>
        </div>
        <div>
          <h3
            :class="isDarkMode ? 'text-red-300' : 'text-red-800'"
            class="text-sm font-bold"
          >
            🔒 Management Locked - Event is {{ eventStatus.toUpperCase() }}
          </h3>
          <p
            :class="isDarkMode ? 'text-red-400' : 'text-red-700'"
            class="text-xs mt-2 leading-relaxed"
          >
            All stage and category management functions are disabled while the
            event is {{ eventStatus }}. To make changes, please reset the event
            to inactive status first.
          </p>
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
            class="fas fa-layer-group text-lg"
          ></i>
        </div>
      </div>
      <p
        :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'"
        class="mt-4 font-medium"
      >
        Loading categories...
      </p>
    </div>

    <!-- Stages List -->
    <div v-else-if="stages.length" class="space-y-6">
      <div
        v-for="stage in stages"
        :key="stage.id"
        :class="[
          isEventLocked ? 'opacity-75' : '',
          isDarkMode
            ? 'bg-gray-800 border-gray-700 hover:shadow-2xl'
            : 'bg-white border-gray-200 hover:shadow-xl',
        ]"
        class="rounded-2xl shadow-lg transition-all duration-300 overflow-hidden border"
      >
        <!-- Stage Header -->
        <div
          :class="
            isDarkMode
              ? 'bg-gradient-to-r from-gray-700 to-gray-800 border-gray-600'
              : 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200'
          "
          class="px-6 py-5 border-b"
        >
          <div class="flex justify-between items-start">
            <div class="flex-1">
              <div class="flex items-center space-x-3 mb-3">
                <div
                  :class="
                    isDarkMode
                      ? 'bg-indigo-900 text-indigo-400'
                      : 'bg-indigo-100 text-indigo-600'
                  "
                  class="p-2 rounded-lg"
                >
                  <i class="fas fa-layer-group"></i>
                </div>
                <h3 class="text-xl font-bold">{{ stage.name }}</h3>
              </div>

              <div class="flex flex-wrap items-center gap-4">
                <div class="flex items-center space-x-2">
                  <i
                    :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'"
                    class="fas fa-folder text-sm"
                  ></i>
                  <span
                    :class="isDarkMode ? 'text-gray-300' : 'text-gray-600'"
                    class="text-sm font-medium"
                  >
                    {{ stage.categories?.length || 0 }} Categories
                  </span>
                </div>

                <div class="flex items-center space-x-2">
                  <i
                    :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'"
                    class="fas fa-weight-hanging text-sm"
                  ></i>
                  <span
                    :class="[
                      'text-sm font-bold px-3 py-1 rounded-full',
                      stage.totalWeight === 100
                        ? isDarkMode
                          ? 'text-green-300 bg-green-900'
                          : 'text-green-700 bg-green-100'
                        : isDarkMode
                        ? 'text-red-300 bg-red-900'
                        : 'text-red-700 bg-red-100',
                    ]"
                  >
                    {{ stage.totalWeight || 0 }}/100
                    <i
                      :class="
                        stage.totalWeight === 100
                          ? 'fas fa-check-circle'
                          : 'fas fa-exclamation-circle'
                      "
                      class="ml-1"
                    ></i>
                  </span>
                </div>
              </div>
            </div>

            <!-- Stage Actions -->
            <div class="flex flex-wrap gap-2">
              <div class="relative group">
                <button
                  @click="openEditStageModal(stage)"
                  :disabled="isEventLocked"
                  :class="[
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                    isEventLocked ? 'opacity-50 cursor-not-allowed' : '',
                    isDarkMode
                      ? 'border-indigo-600 text-indigo-400 hover:bg-indigo-500 hover:text-white'
                      : 'border-indigo-300 text-indigo-600 hover:bg-indigo-600 hover:text-white',
                  ]"
                  class="border"
                >
                  <i class="fas fa-edit"></i>
                  <span>Edit</span>
                </button>
                <div
                  v-if="isEventLocked"
                  :class="
                    isDarkMode
                      ? 'bg-gray-600 text-white'
                      : 'bg-gray-800 text-white'
                  "
                  class="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs rounded px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10"
                >
                  Disabled: Event {{ eventStatus }}
                </div>
              </div>

              <div class="relative group">
                <button
                  @click="confirmDeleteStage(stage)"
                  :disabled="isEventLocked"
                  :class="[
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                    isEventLocked ? 'opacity-50 cursor-not-allowed' : '',
                    isDarkMode
                      ? 'border-red-600 text-red-400 hover:bg-red-500 hover:text-white'
                      : 'border-red-300 text-red-600 hover:bg-red-600 hover:text-white',
                  ]"
                  class="border"
                >
                  <i class="fas fa-trash"></i>
                  <span>Delete</span>
                </button>
                <div
                  v-if="isEventLocked"
                  :class="
                    isDarkMode
                      ? 'bg-gray-600 text-white'
                      : 'bg-gray-800 text-white'
                  "
                  class="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs rounded px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10"
                >
                  Disabled: Event {{ eventStatus }}
                </div>
              </div>

              <div class="relative group">
                <button
                  @click="openCreateCategoryModal(stage.id)"
                  :disabled="isEventLocked"
                  :class="[
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                    isEventLocked ? 'opacity-50 cursor-not-allowed' : '',
                    isDarkMode
                      ? 'border-green-600 text-green-400 hover:bg-green-500 hover:text-white'
                      : 'border-green-300 text-green-600 hover:bg-green-600 hover:text-white',
                  ]"
                  class="border"
                >
                  <i class="fas fa-plus"></i>
                  <span>Add Category</span>
                </button>
                <div
                  v-if="isEventLocked"
                  :class="
                    isDarkMode
                      ? 'bg-gray-600 text-white'
                      : 'bg-gray-800 text-white'
                  "
                  class="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs rounded px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10"
                >
                  Disabled: Event {{ eventStatus }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Categories Table -->
        <div v-if="stage.categories?.length" class="overflow-x-auto">
          <table
            class="min-w-full divide-y"
            :class="isDarkMode ? 'divide-gray-600' : 'divide-gray-200'"
          >
            <thead :class="isDarkMode ? 'bg-gray-700' : 'bg-gray-50'">
              <tr>
                <th
                  :class="isDarkMode ? 'text-gray-300' : 'text-gray-600'"
                  class="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider"
                >
                  <i class="fas fa-tag mr-2"></i>Name
                </th>
                <th
                  :class="isDarkMode ? 'text-gray-300' : 'text-gray-600'"
                  class="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider"
                >
                  <i class="fas fa-weight-hanging mr-2"></i>Weight
                </th>
                <th
                  :class="isDarkMode ? 'text-gray-300' : 'text-gray-600'"
                  class="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider"
                >
                  <i class="fas fa-star mr-2"></i>Max Score
                </th>
                <th
                  :class="isDarkMode ? 'text-gray-300' : 'text-gray-600'"
                  class="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider"
                >
                  <i class="fas fa-cogs mr-2"></i>Actions
                </th>
              </tr>
            </thead>
            <tbody
              :class="[
                isDarkMode
                  ? 'bg-gray-800 divide-gray-700'
                  : 'bg-white divide-gray-200',
                'divide-y',
              ]"
            >
              <tr
                v-for="category in stage.categories"
                :key="category.id"
                :class="isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'"
                class="transition-colors duration-150"
              >
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div
                      :class="
                        isDarkMode
                          ? 'bg-purple-900 text-purple-400'
                          : 'bg-purple-100 text-purple-600'
                      "
                      class="p-2 rounded-lg mr-3"
                    >
                      <i class="fas fa-bookmark text-sm"></i>
                    </div>
                    <span class="text-sm font-semibold">{{
                      category.name
                    }}</span>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span
                    :class="[
                      'inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold',
                      category.weight
                        ? isDarkMode
                          ? 'bg-blue-900 text-blue-200'
                          : 'bg-blue-100 text-blue-800'
                        : isDarkMode
                        ? 'bg-gray-700 text-gray-300'
                        : 'bg-gray-100 text-gray-800',
                    ]"
                  >
                    {{ category.weight }}%
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span
                    :class="
                      isDarkMode
                        ? 'bg-green-900 text-green-200'
                        : 'bg-green-100 text-green-800'
                    "
                    class="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold"
                  >
                    {{ globalMaxScore }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex gap-2">
                    <div class="relative group">
                      <button
                        @click="openEditCategoryModal(category)"
                        :disabled="isEventLocked"
                        :class="[
                          'flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200',
                          isEventLocked ? 'opacity-50 cursor-not-allowed' : '',
                          isDarkMode
                            ? 'border-indigo-600 text-indigo-400 hover:bg-indigo-500 hover:text-white'
                            : 'border-indigo-300 text-indigo-600 hover:bg-indigo-600 hover:text-white',
                        ]"
                        class="border"
                      >
                        <i class="fas fa-edit"></i>
                        <span>Edit</span>
                      </button>
                      <div
                        v-if="isEventLocked"
                        :class="
                          isDarkMode
                            ? 'bg-gray-600 text-white'
                            : 'bg-gray-800 text-white'
                        "
                        class="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs rounded px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      >
                        Disabled: Event {{ eventStatus }}
                      </div>
                    </div>

                    <div class="relative group">
                      <button
                        @click="confirmDeleteCategory(category)"
                        :disabled="isEventLocked"
                        :class="[
                          'flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200',
                          isEventLocked ? 'opacity-50 cursor-not-allowed' : '',
                          isDarkMode
                            ? 'border-red-600 text-red-400 hover:bg-red-500 hover:text-white'
                            : 'border-red-300 text-red-600 hover:bg-red-600 hover:text-white',
                        ]"
                        class="border"
                      >
                        <i class="fas fa-trash"></i>
                        <span>Delete</span>
                      </button>
                      <div
                        v-if="isEventLocked"
                        :class="
                          isDarkMode
                            ? 'bg-gray-600 text-white'
                            : 'bg-gray-800 text-white'
                        "
                        class="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs rounded px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10"
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

        <!-- Empty Categories State -->
        <div v-else class="px-6 py-12 text-center">
          <div
            :class="
              isDarkMode
                ? 'bg-gray-700 text-gray-500'
                : 'bg-gray-100 text-gray-400'
            "
            class="p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center"
          >
            <i class="fas fa-folder-open text-2xl"></i>
          </div>
          <p
            :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'"
            class="font-medium"
          >
            No categories in this stage.
          </p>
          <p
            :class="isDarkMode ? 'text-gray-500' : 'text-gray-400'"
            class="text-sm mt-1"
          >
            Add your first category to get started.
          </p>
        </div>
      </div>
    </div>

    <!-- Empty Stages State -->
    <div v-else class="text-center py-20">
      <div
        :class="
          isDarkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-100 text-gray-400'
        "
        class="p-6 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center"
      >
        <i class="fas fa-layer-group text-3xl"></i>
      </div>
      <h3
        :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'"
        class="text-xl font-bold mb-2"
      >
        No stages found
      </h3>
      <p :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'" class="mb-6">
        Create your first stage to organize your event categories.
      </p>
      <button
        @click="showCreateStageModal = true"
        :disabled="isEventLocked"
        :class="[
          'inline-flex items-center px-6 py-3 rounded-xl transition-colors duration-200 font-medium shadow-lg',
          isEventLocked ? 'opacity-50 cursor-not-allowed' : '',
          isDarkMode
            ? 'bg-green-700 hover:bg-green-600 text-white'
            : 'bg-green-600 hover:bg-green-700 text-white',
        ]"
      >
        <i class="fas fa-plus mr-2"></i>
        Add First Stage
      </button>
    </div>

    <!-- CREATE STAGE MODAL -->
    <div
      v-if="showCreateStageModal"
      class="fixed inset-0 backdrop-blur-sm bg-black/50 z-50 flex items-center justify-center p-4"
      @click="showCreateStageModal = false"
    >
      <div
        :class="
          isDarkMode
            ? 'bg-gray-800 border-gray-700'
            : 'bg-white border-gray-200'
        "
        class="rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto relative p-6 border"
        @click.stop
      >
        <button
          @click="showCreateStageModal = false"
          :class="
            isDarkMode
              ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700'
              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
          "
          class="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full transition-colors"
          type="button"
        >
          <i class="fas fa-times"></i>
        </button>

        <div class="flex items-center space-x-3 mb-6">
          <div
            :class="
              isDarkMode
                ? 'bg-green-900 text-green-400'
                : 'bg-green-100 text-green-600'
            "
            class="p-3 rounded-xl"
          >
            <i class="fas fa-plus text-xl"></i>
          </div>
          <h2 class="text-2xl font-bold">Add New Stage</h2>
        </div>

        <form @submit.prevent="handleCreateStage($event)" class="space-y-6">
          <div>
            <label
              :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'"
              class="block text-sm font-semibold mb-2"
            >
              <i class="fas fa-tag mr-2"></i>Stage Name
            </label>
            <input
              type="text"
              name="stage_name"
              required
              placeholder="Enter stage name (e.g., Preliminary Round)"
              :class="
                isDarkMode
                  ? 'border-gray-600 bg-gray-700 text-white focus:ring-green-400'
                  : 'border-gray-300 bg-white text-gray-900 focus:ring-green-500'
              "
              class="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-colors"
            />
            <input type="hidden" name="event_id" :value="props.eventId" />
          </div>

          <div
            :class="isDarkMode ? 'border-gray-600' : 'border-gray-200'"
            class="flex justify-end gap-3 pt-4 border-t"
          >
            <button
              type="button"
              @click="showCreateStageModal = false"
              :class="
                isDarkMode
                  ? 'text-gray-300 bg-gray-700 border-gray-600 hover:bg-gray-600'
                  : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50'
              "
              class="px-6 py-3 text-sm font-medium border rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
              :disabled="loading"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="loading"
              :class="
                isDarkMode
                  ? 'bg-green-700 hover:bg-green-600'
                  : 'bg-green-600 hover:bg-green-700'
              "
              class="px-6 py-3 text-sm font-medium text-white border border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors shadow-lg"
            >
              <i v-if="loading" class="fas fa-spinner fa-spin"></i>
              <i v-else class="fas fa-save"></i>
              {{ loading ? "Creating..." : "Create Stage" }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- EDIT MAX SCORE MODAL -->
    <div
      v-if="showEditMaxScoreModal"
      class="fixed inset-0 backdrop-blur-sm bg-black/50 z-50 flex items-center justify-center p-4"
      @click="showEditMaxScoreModal = false"
    >
      <div
        :class="
          isDarkMode
            ? 'bg-gray-800 border-gray-700'
            : 'bg-white border-gray-200'
        "
        class="rounded-2xl shadow-2xl max-w-md w-full p-6 border"
        @click.stop
      >
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center space-x-3">
            <div
              :class="
                isDarkMode
                  ? 'bg-blue-900 text-blue-400'
                  : 'bg-blue-100 text-blue-600'
              "
              class="p-3 rounded-xl"
            >
              <i class="fas fa-star text-xl"></i>
            </div>
            <h2 class="text-xl font-bold">Edit Global Max Score</h2>
          </div>
          <button
            @click="showEditMaxScoreModal = false"
            :class="
              isDarkMode
                ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
            "
            class="p-2 rounded-lg transition-colors"
          >
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div
          :class="
            isDarkMode
              ? 'bg-blue-900/30 border-blue-800'
              : 'bg-blue-50 border-blue-200'
          "
          class="mb-6 p-4 rounded-xl border"
        >
          <div class="flex items-start space-x-3">
            <i
              :class="isDarkMode ? 'text-blue-400' : 'text-blue-600'"
              class="fas fa-info-circle mt-0.5"
            ></i>
            <div>
              <p
                :class="isDarkMode ? 'text-blue-300' : 'text-blue-800'"
                class="text-sm font-medium"
              >
                Important Notice
              </p>
              <p
                :class="isDarkMode ? 'text-blue-400' : 'text-blue-700'"
                class="text-sm mt-1"
              >
                This will set the maximum score for all existing and future
                categories in this event.
              </p>
            </div>
          </div>
        </div>

        <form @submit.prevent="handleUpdateGlobalMaxScore($event)">
          <div class="mb-6">
            <label
              :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'"
              class="block text-sm font-semibold mb-2"
            >
              Global Max Score
            </label>
            <input
              type="number"
              name="global_max_score"
              v-model="maxScoreForm.global_max_score"
              required
              min="1"
              max="100"
              :class="
                isDarkMode
                  ? 'border-gray-600 bg-gray-700 text-white focus:ring-blue-400'
                  : 'border-gray-300 bg-white text-gray-900 focus:ring-blue-500'
              "
              class="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-colors"
            />
          </div>
          <div class="flex justify-end gap-3">
            <button
              type="button"
              @click="showEditMaxScoreModal = false"
              :class="
                isDarkMode
                  ? 'text-gray-300 bg-gray-700 border-gray-600 hover:bg-gray-600'
                  : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50'
              "
              class="px-6 py-3 text-sm font-medium border rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="loading"
              :class="
                isDarkMode
                  ? 'bg-blue-700 hover:bg-blue-600'
                  : 'bg-blue-600 hover:bg-blue-700'
              "
              class="px-6 py-3 text-sm font-medium text-white border border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors shadow-lg"
            >
              <i v-if="loading" class="fas fa-spinner fa-spin"></i>
              <i v-else class="fas fa-save"></i>
              {{ loading ? "Updating..." : "Update Score" }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- CREATE CATEGORY MODAL -->
    <div
      v-if="showCreateCategoryModal"
      class="fixed inset-0 backdrop-blur-sm bg-black/50 z-50 flex items-center justify-center p-4"
      @click="showCreateCategoryModal = false"
    >
      <div
        :class="
          isDarkMode
            ? 'bg-gray-800 border-gray-700'
            : 'bg-white border-gray-200'
        "
        class="rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 border"
        @click.stop
      >
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center space-x-3">
            <div
              :class="
                isDarkMode
                  ? 'bg-green-900 text-green-400'
                  : 'bg-green-100 text-green-600'
              "
              class="p-3 rounded-xl"
            >
              <i class="fas fa-bookmark text-xl"></i>
            </div>
            <h2 class="text-xl font-bold">Add Category</h2>
          </div>
          <button
            @click="showCreateCategoryModal = false"
            :class="
              isDarkMode
                ? 'text-gray-400 hover:text-gray-300'
                : 'text-gray-400 hover:text-gray-600'
            "
            class="transition"
          >
            <i class="fas fa-times"></i>
          </button>
        </div>

        <form @submit.prevent="handleCreateCategory($event)" class="space-y-4">
          <div class="mb-4">
            <label
              :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'"
              class="block text-sm font-semibold mb-2"
            >
              Category Name
            </label>
            <input
              type="text"
              name="category_name"
              required
              placeholder="Enter category name"
              :class="
                isDarkMode
                  ? 'border-gray-600 bg-gray-700 text-white focus:ring-green-400'
                  : 'border-gray-300 bg-white text-gray-900 focus:ring-green-500'
              "
              class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-colors"
            />
          </div>

          <div class="mb-4">
            <label
              :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'"
              class="block text-sm font-semibold mb-2"
            >
              Weight (%)
            </label>
            <input
              type="number"
              name="category_weight"
              required
              min="1"
              max="100"
              placeholder="Enter weight percentage"
              :class="
                isDarkMode
                  ? 'border-gray-600 bg-gray-700 text-white focus:ring-green-400'
                  : 'border-gray-300 bg-white text-gray-900 focus:ring-green-500'
              "
              class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-colors"
            />
            <p
              :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'"
              class="text-xs mt-1"
            >
              Weight must be between 1-100%. Total stage weight should equal
              100%.
            </p>
          </div>

          <div class="mb-4">
            <label
              :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'"
              class="block text-sm font-semibold mb-2"
            >
              Max Score (Global Setting)
            </label>
            <div
              :class="
                isDarkMode
                  ? 'border-gray-600 bg-gray-700 text-gray-300'
                  : 'border-gray-200 bg-gray-50 text-gray-600'
              "
              class="w-full border rounded-lg px-3 py-2 text-sm"
            >
              {{ globalMaxScore }}
            </div>
            <p
              :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'"
              class="text-xs mt-1"
            >
              Max score is set globally for all categories in this event.
            </p>
          </div>

          <input type="hidden" name="event_id" :value="props.eventId" />
          <input type="hidden" name="stage_id" :value="currentStageId" />

          <div class="flex justify-end gap-3 mt-6">
            <button
              type="button"
              @click="showCreateCategoryModal = false"
              :class="
                isDarkMode
                  ? 'text-gray-300 bg-gray-700 border-gray-600 hover:bg-gray-600'
                  : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50'
              "
              class="px-4 py-2 text-sm font-medium border rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
              :disabled="loading"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="loading"
              :class="
                isDarkMode
                  ? 'bg-green-700 hover:bg-green-600'
                  : 'bg-green-600 hover:bg-green-700'
              "
              class="px-4 py-2 text-sm font-medium text-white border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              <i v-if="loading" class="fas fa-spinner fa-spin"></i>
              {{ loading ? "Creating..." : "Create Category" }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- EDIT CATEGORY MODAL -->
    <div
      v-if="showEditCategoryModal"
      class="fixed inset-0 backdrop-blur-sm bg-black/50 z-50 flex items-center justify-center p-4"
      @click="showEditCategoryModal = false"
    >
      <div
        :class="
          isDarkMode
            ? 'bg-gray-800 border-gray-700'
            : 'bg-white border-gray-200'
        "
        class="rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 border"
        @click.stop
      >
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center space-x-3">
            <div
              :class="
                isDarkMode
                  ? 'bg-blue-900 text-blue-400'
                  : 'bg-blue-100 text-blue-600'
              "
              class="p-3 rounded-xl"
            >
              <i class="fas fa-edit text-xl"></i>
            </div>
            <h2 class="text-xl font-bold">Edit Category</h2>
          </div>
          <button
            @click="showEditCategoryModal = false"
            :class="
              isDarkMode
                ? 'text-gray-400 hover:text-gray-300'
                : 'text-gray-400 hover:text-gray-600'
            "
            class="transition"
          >
            <i class="fas fa-times"></i>
          </button>
        </div>

        <form @submit.prevent="handleUpdateCategory($event)" class="space-y-4">
          <div class="mb-4">
            <label
              :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'"
              class="block text-sm font-semibold mb-2"
            >
              Category Name
            </label>
            <input
              type="text"
              name="category_name"
              v-model="categoryForm.category_name"
              required
              :class="
                isDarkMode
                  ? 'border-gray-600 bg-gray-700 text-white focus:ring-green-400'
                  : 'border-gray-300 bg-white text-gray-900 focus:ring-green-500'
              "
              class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-colors"
            />
          </div>

          <div class="mb-4">
            <label
              :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'"
              class="block text-sm font-semibold mb-2"
            >
              Weight (%)
            </label>
            <input
              type="number"
              name="category_weight"
              v-model="categoryForm.category_weight"
              required
              min="1"
              max="100"
              :class="
                isDarkMode
                  ? 'border-gray-600 bg-gray-700 text-white focus:ring-green-400'
                  : 'border-gray-300 bg-white text-gray-900 focus:ring-green-500'
              "
              class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-colors"
            />
            <p
              :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'"
              class="text-xs mt-1"
            >
              Weight must be between 1-100%. Total stage weight should equal
              100%.
            </p>
          </div>

          <div class="mb-4">
            <label
              :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'"
              class="block text-sm font-semibold mb-2"
            >
              Max Score (Global Setting)
            </label>
            <div
              :class="
                isDarkMode
                  ? 'border-gray-600 bg-gray-700 text-gray-300'
                  : 'border-gray-200 bg-gray-50 text-gray-600'
              "
              class="w-full border rounded-lg px-3 py-2 text-sm"
            >
              {{ globalMaxScore }}
            </div>
            <p
              :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'"
              class="text-xs mt-1"
            >
              Max score is set globally for all categories in this event.
            </p>
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

          <div class="flex justify-end gap-3 mt-6">
            <button
              type="button"
              @click="showEditCategoryModal = false"
              :class="
                isDarkMode
                  ? 'text-gray-300 bg-gray-700 border-gray-600 hover:bg-gray-600'
                  : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50'
              "
              class="px-4 py-2 text-sm font-medium border rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="loading"
              :class="
                isDarkMode
                  ? 'bg-green-700 hover:bg-green-600'
                  : 'bg-green-600 hover:bg-green-700'
              "
              class="px-4 py-2 text-sm font-medium text-white border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              <i v-if="loading" class="fas fa-spinner fa-spin"></i>
              {{ loading ? "Updating..." : "Update Category" }}
            </button>
          </div>
        </form>
      </div>
    </div>
    <!-- EDIT STAGE MODAL -->
    <div
      v-if="showEditStageModal"
      class="fixed inset-0 backdrop-blur-sm bg-black/50 z-50 flex items-center justify-center p-4"
      @click="showEditStageModal = false"
    >
      <div
        :class="
          isDarkMode
            ? 'bg-gray-800 border-gray-700'
            : 'bg-white border-gray-200'
        "
        class="rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto relative p-6 border"
        @click.stop
      >
        <button
          @click="showEditStageModal = false"
          :class="
            isDarkMode
              ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700'
              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
          "
          class="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full transition-colors"
          type="button"
        >
          <i class="fas fa-times"></i>
        </button>

        <div class="flex items-center space-x-3 mb-6">
          <div
            :class="
              isDarkMode
                ? 'bg-blue-900 text-blue-400'
                : 'bg-blue-100 text-blue-600'
            "
            class="p-3 rounded-xl"
          >
            <i class="fas fa-edit text-xl"></i>
          </div>
          <h2 class="text-2xl font-bold">Edit Stage</h2>
        </div>

        <form @submit.prevent="handleUpdateStage($event)" class="space-y-6">
          <div>
            <label
              :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'"
              class="block text-sm font-semibold mb-2"
            >
              <i class="fas fa-tag mr-2"></i>Stage Name
            </label>
            <input
              type="text"
              name="stage_name"
              v-model="stageForm.stage_name"
              required
              :class="
                isDarkMode
                  ? 'border-gray-600 bg-gray-700 text-white focus:ring-blue-400'
                  : 'border-gray-300 bg-white text-gray-900 focus:ring-blue-500'
              "
              class="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-colors"
            />
            <input type="hidden" name="event_id" :value="props.eventId" />
            <input type="hidden" name="stage_id" :value="selectedStage?.id" />
          </div>

          <div
            :class="isDarkMode ? 'border-gray-600' : 'border-gray-200'"
            class="flex justify-end gap-3 pt-4 border-t"
          >
            <button
              type="button"
              @click="showEditStageModal = false"
              :class="
                isDarkMode
                  ? 'text-gray-300 bg-gray-700 border-gray-600 hover:bg-gray-600'
                  : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50'
              "
              class="px-6 py-3 text-sm font-medium border rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="loading"
              :class="
                isDarkMode
                  ? 'bg-blue-700 hover:bg-blue-600'
                  : 'bg-blue-600 hover:bg-blue-700'
              "
              class="px-6 py-3 text-sm font-medium text-white border border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors shadow-lg"
            >
              <i v-if="loading" class="fas fa-spinner fa-spin"></i>
              <i v-else class="fas fa-save"></i>
              {{ loading ? "Updating..." : "Update Stage" }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- DELETE STAGE MODAL -->
    <div
      v-if="showDeleteStageModal"
      class="fixed inset-0 backdrop-blur-sm bg-black/50 z-50 flex items-center justify-center p-4"
      @click="showDeleteStageModal = false"
    >
      <div
        :class="
          isDarkMode
            ? 'bg-gray-800 border-gray-700'
            : 'bg-white border-gray-200'
        "
        class="rounded-2xl shadow-2xl max-w-md w-full p-6 border"
        @click.stop
      >
        <div class="flex items-center space-x-3 mb-4">
          <div class="bg-red-100 p-3 rounded-full">
            <i class="fas fa-exclamation-triangle text-red-600 text-xl"></i>
          </div>
          <h3 class="text-lg font-bold text-red-600">Confirm Delete</h3>
        </div>

        <p :class="isDarkMode ? 'text-gray-300' : 'text-gray-600'" class="mb-6">
          Are you sure you want to delete the stage
          <strong>"{{ stageToDelete?.name || "Unknown" }}"</strong> and all its
          categories? This action cannot be undone.
        </p>

        <div class="flex justify-end gap-3">
          <button
            @click="showDeleteStageModal = false"
            :class="
              isDarkMode
                ? 'text-gray-300 bg-gray-700 border-gray-600 hover:bg-gray-600'
                : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50'
            "
            class="px-4 py-2 text-sm font-medium border rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            @click="handleDeleteStage"
            :disabled="loading"
            class="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 transition-colors"
          >
            {{ loading ? "Deleting..." : "Delete" }}
          </button>
        </div>
      </div>
    </div>

    <!-- DELETE CATEGORY MODAL -->
    <div
      v-if="showDeleteCategoryModal"
      class="fixed inset-0 backdrop-blur-sm bg-black/50 z-50 flex items-center justify-center p-4"
      @click="showDeleteCategoryModal = false"
    >
      <div
        :class="
          isDarkMode
            ? 'bg-gray-800 border-gray-700'
            : 'bg-white border-gray-200'
        "
        class="rounded-2xl shadow-2xl max-w-md w-full p-6 border"
        @click.stop
      >
        <div class="flex items-center space-x-3 mb-4">
          <div class="bg-red-100 p-3 rounded-full">
            <i class="fas fa-exclamation-triangle text-red-600 text-xl"></i>
          </div>
          <h3 class="text-lg font-bold text-red-600">Confirm Delete</h3>
        </div>

        <p :class="isDarkMode ? 'text-gray-300' : 'text-gray-600'" class="mb-6">
          Are you sure you want to delete the category
          <strong>"{{ categoryToDelete?.name || "Unknown" }}"</strong>? This
          action cannot be undone.
        </p>

        <div class="flex justify-end gap-3">
          <button
            @click="showDeleteCategoryModal = false"
            :class="
              isDarkMode
                ? 'text-gray-300 bg-gray-700 border-gray-600 hover:bg-gray-600'
                : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50'
            "
            class="px-4 py-2 text-sm font-medium border rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            @click="handleDeleteCategory"
            :disabled="loading"
            class="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 transition-colors"
          >
            {{ loading ? "Deleting..." : "Delete" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
