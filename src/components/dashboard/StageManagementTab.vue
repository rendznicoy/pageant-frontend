<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { useToast } from "vue-toastification";
import { debounce } from "lodash";
import axiosClient from "@/axios";
import Pusher from "pusher-js";

const props = defineProps({
  eventId: {
    type: String,
    required: true,
  },
});

const toast = useToast();
const stages = ref([]);
const candidates = ref([]);
const loading = ref(false);
const selectedStage = ref(null);
const selectedCategory = ref(null);
const currentCandidateId = ref(null);
const topCandidatesCount = ref(null);
const partialResults = ref(null);
const showTopCandidatesModal = ref(false);
const pendingScoresMap = ref({});
let pusher = null;
let channel = null;

const fetchStages = async () => {
  if (!props.eventId || isNaN(props.eventId)) {
    console.error("Invalid eventId:", props.eventId);
    toast.error("Invalid event ID provided.");
    loading.value = false;
    return;
  }
  loading.value = true;
  try {
    console.log("Fetching stages for eventId:", props.eventId);
    const stagesResponse = await axiosClient.get(
      `/api/v1/events/${props.eventId}/stages`
    );
    stages.value = stagesResponse.data || [];

    const pendingScoresResponse = await axiosClient.get(
      `/api/v1/events/${props.eventId}/categories/pending-scores`
    );
    pendingScoresMap.value = pendingScoresResponse.data.pending_scores || {};

    for (const stage of stages.value) {
      for (const category of stage.categories) {
        category.has_pending_scores =
          pendingScoresMap.value[category.id] || false;
      }
    }

    const activeCategories = stages.value
      .flatMap((stage) => stage.categories)
      .filter((cat) => cat.status === "active");
    if (
      activeCategories.length > 0 &&
      activeCategories[0].current_candidate_id
    ) {
      currentCandidateId.value = activeCategories[0].current_candidate_id;
    }
    console.log("Stages fetched:", stages.value);
  } catch (error) {
    console.error("Error fetching stages:", {
      status: error.response?.status,
      message: error.response?.data?.message,
      errors: error.response?.data?.errors,
    });
    toast.error(error.response?.data?.message || "Failed to load stages.");
  } finally {
    loading.value = false;
  }
};

const fetchCandidates = async () => {
  try {
    const response = await axiosClient.get(
      `/api/v1/events/${props.eventId}/candidates`
    );
    console.log("Full candidates response:", response);
    candidates.value = response.data.data || [];
    if (!candidates.value.length) {
      toast.warning("No active candidates found for this event.");
    }
  } catch (error) {
    console.error("Error fetching candidates:", error);
    toast.error("Failed to fetch candidates.");
  }
};

const startStage = async (stageId) => {
  loading.value = true;
  try {
    const response = await axiosClient.post(
      `/api/v1/events/${props.eventId}/stages/${stageId}/start`
    );
    toast.success(response.data.message || "Stage started successfully!");
    await fetchStages();
  } catch (error) {
    toast.error(error.response?.data?.message || "Failed to start stage.");
  } finally {
    loading.value = false;
  }
};

const resetStage = async (stageId) => {
  loading.value = true;
  try {
    const response = await axiosClient.post(
      `/api/v1/events/${props.eventId}/stages/${stageId}/reset`
    );
    toast.success(response.data.message || "Stage reset successfully!");
    await fetchStages();
  } catch (error) {
    toast.error(error.response?.data?.message || "Failed to reset stage.");
  } finally {
    loading.value = false;
  }
};

const finalizeStage = async (stageId) => {
  loading.value = true;
  try {
    await axiosClient.post(
      `/api/v1/events/${props.eventId}/stages/${stageId}/finalize`
    );
    toast.success("Stage finalized successfully!");
    await fetchStages();
  } catch (error) {
    toast.error(error.response?.data?.message || "Failed to finalize stage.");
  } finally {
    loading.value = false;
  }
};

const startCategory = async (categoryId) => {
  loading.value = true;
  try {
    const response = await axiosClient.post(
      `/api/v1/events/${props.eventId}/categories/${categoryId}/start`
    );
    console.log("Start Category response:", response.data);
    toast.success(response.data.message || "Category started successfully!");
    await fetchStages();
  } catch (error) {
    console.error("Start Category error:", error.response?.data);
    toast.error(error.response?.data?.message || "Failed to start category.");
  } finally {
    loading.value = false;
  }
};

const resetCategory = async (categoryId) => {
  loading.value = true;
  try {
    const response = await axiosClient.post(
      `/api/v1/events/${props.eventId}/categories/${categoryId}/reset`
    );
    console.log("Reset Category response:", response.data);
    toast.success(response.data.message || "Category reset successfully!");
    await fetchStages();
  } catch (error) {
    console.error("Reset Category error:", error.response?.data);
    toast.error(error.response?.data?.message || "Failed to reset category.");
  } finally {
    loading.value = false;
  }
};

const setCandidate = debounce(async (categoryId, candidateId) => {
  if (!candidateId) {
    toast.error("Please select a valid candidate.");
    return;
  }
  loading.value = true;
  try {
    const response = await axiosClient.post(
      `/api/v1/events/${props.eventId}/categories/${categoryId}/set-candidate`,
      { candidate_id: candidateId }
    );
    toast.success(response.data.message || "Candidate set successfully!");
    currentCandidateId.value = candidateId;
    await fetchStages();
  } catch (error) {
    console.error("Set candidate error:", error.response?.data);
    toast.error(error.response?.data?.message || "Failed to set candidate.");
    if (error.response?.status === 422) {
      const activeCategory = stages.value
        .flatMap((stage) => stage.categories)
        .find((cat) => cat.id === categoryId);
      if (activeCategory && activeCategory.current_candidate_id) {
        currentCandidateId.value = activeCategory.current_candidate_id;
      }
    }
  } finally {
    loading.value = false;
  }
}, 300);

const finalizeCategory = async (categoryId) => {
  loading.value = true;
  try {
    await axiosClient.post(
      `/api/v1/events/${props.eventId}/categories/${categoryId}/finalize`
    );
    toast.success("Category finalized successfully!");
    currentCandidateId.value = null;
    await fetchStages();
  } catch (error) {
    toast.error(
      error.response?.data?.message || "Failed to finalize category."
    );
  } finally {
    loading.value = false;
  }
};

const fetchPartialResults = async (stageId) => {
  loading.value = true;
  try {
    const response = await axiosClient.get(
      `/api/v1/events/${props.eventId}/stages/${stageId}/partial-results`
    );
    partialResults.value = response.data.results || [];
  } catch (error) {
    toast.error(
      error.response?.data?.message || "Failed to load partial results."
    );
  } finally {
    loading.value = false;
  }
};

const selectTopCandidates = async () => {
  if (!topCandidatesCount.value || topCandidatesCount.value <= 0) {
    toast.error("Please enter a valid number of top candidates.");
    return;
  }
  loading.value = true;
  try {
    await axiosClient.post(
      `/api/v1/events/${props.eventId}/stages/${selectedStage.value.id}/select-top-candidates`,
      {
        top_candidates_count: topCandidatesCount.value,
      }
    );
    toast.success("Top candidates selected successfully!");
    showTopCandidatesModal.value = false;
    await fetchCandidates();
    await fetchStages();
  } catch (error) {
    toast.error(
      error.response?.data?.message || "Failed to select top candidates."
    );
  } finally {
    loading.value = false;
  }
};

const setupWebSocket = () => {
  const appKey = import.meta.env.VITE_PUSHER_APP_KEY;
  const cluster = import.meta.env.VITE_PUSHER_APP_CLUSTER;

  if (!appKey || !cluster) {
    console.error("Pusher credentials are missing.");
    toast.error("Real-time updates unavailable: Pusher configuration missing.");
    return;
  }

  try {
    pusher = new Pusher(appKey, {
      cluster: cluster,
      encrypted: true,
    });

    channel = pusher.subscribe(`event.${props.eventId}`);
    const debouncedFetchStages = debounce(fetchStages, 1000);
    channel.bind("App\\Events\\StageStatusUpdated", (e) => {
      toast.info(`Stage ${e.stage_id} status updated to ${e.status}`);
      debouncedFetchStages();
    });
    channel.bind("App\\Events\\CategoryStatusUpdated", (e) => {
      toast.info(`Category ${e.category_id} status updated to ${e.status}`);
      debouncedFetchStages();
    });
    channel.bind("App\\Events\\CandidateSet", async (e) => {
      toast.info(`Candidate ${e.candidate_id} set for scoring`);
      currentCandidateId.value = e.candidate_id;
      await refreshPendingScores();
      debouncedFetchStages();
    });
    channel.bind("App\\Events\\ScoreSubmitted", async (e) => {
      toast.info(`Score submitted for candidate`);
      await refreshPendingScores();
    });
    channel.bind("App\\Events\\ScoreConfirmed", async (e) => {
      toast.info(`Score confirmed for candidate`);
      await refreshPendingScores();
    });
  } catch (error) {
    console.error("Failed to initialize Pusher:", error);
    toast.error("Failed to connect to real-time updates.");
  }
};

const refreshPendingScores = async () => {
  try {
    const response = await axiosClient.get(
      `/api/v1/events/${props.eventId}/categories/pending-scores`
    );
    pendingScoresMap.value = response.data.pending_scores || {};
    for (const stage of stages.value) {
      for (const category of stage.categories) {
        category.has_pending_scores =
          pendingScoresMap.value[category.id] || false;
      }
    }
  } catch (error) {
    console.error("Error refreshing pending scores:", error);
    toast.error("Failed to refresh pending scores");
  }
};

const categoryHasPendingScores = (category) => {
  return pendingScoresMap.value[category.id] || false;
};

const candidateHasScore = (candidateId, categoryId) => {
  return false; // Replace with actual implementation
};

onMounted(() => {
  fetchStages();
  fetchCandidates();
  setupWebSocket();
});

onUnmounted(() => {
  if (pusher && channel) {
    pusher.unsubscribe(`event.${props.eventId}`);
    pusher.disconnect();
  }
});
</script>

<template>
  <div class="space-y-6">
    <h2 class="text-xl font-semibold text-gray-800">Stage Management</h2>

    <div v-if="loading" class="flex justify-center py-12">
      <i class="fas fa-spinner fa-spin text-3xl text-green-600"></i>
    </div>
    <div v-else-if="stages.length" class="space-y-6">
      <div
        v-for="stage in stages"
        :key="stage.id"
        class="bg-white rounded-lg shadow"
      >
        <div class="flex justify-between items-center px-6 py-4 bg-gray-50">
          <div>
            <h3 class="text-lg font-medium text-gray-900">{{ stage.name }}</h3>
            <p class="text-sm text-gray-500">
              Status: {{ stage.status || "pending" }}
            </p>
            <p class="text-red-500">Debug: stage.status = {{ stage.status }}</p>
          </div>
          <div class="space-x-2">
            <button
              v-if="stage.status === 'pending'"
              @click="startStage(stage.id)"
              class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              :disabled="loading"
            >
              Start Stage
            </button>
            <button
              v-if="stage.status === 'active'"
              @click="resetStage(stage.id)"
              class="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
              :disabled="loading"
            >
              Reset Stage
            </button>
            <button
              v-if="stage.status === 'active'"
              @click="finalizeStage(stage.id)"
              class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              :disabled="loading"
            >
              Finalize Stage
            </button>
            <button
              v-if="stage.status === 'finalized'"
              @click="
                () => {
                  selectedStage = stage;
                  fetchPartialResults(stage.id);
                  showTopCandidatesModal = true;
                }
              "
              class="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
              :disabled="loading"
            >
              View Partial Results / Select Top Candidates
            </button>
          </div>
        </div>
        <div v-if="stage.categories.length" class="p-6">
          <h4 class="text-md font-semibold text-gray-800 mb-4">Categories</h4>
          <div class="space-y-4">
            <div
              v-for="category in stage.categories"
              :key="category.id"
              class="flex justify-between items-center"
            >
              <div>
                <p class="text-sm font-medium text-gray-900">
                  {{ category.name }}
                </p>
                <p class="text-sm text-gray-500">
                  Status: {{ category.status || "pending" }}
                </p>
                <p
                  v-if="category.current_candidate_id"
                  class="text-sm text-gray-500"
                >
                  Current Candidate:
                  {{
                    candidates.find(
                      (c) => c.candidate_id === category.current_candidate_id
                    )?.first_name
                  }}
                  {{
                    candidates.find(
                      (c) => c.candidate_id === category.current_candidate_id
                    )?.last_name
                  }}
                </p>
              </div>
              <div class="space-x-2">
                <button
                  v-if="
                    category.status === 'pending' && stage.status === 'active'
                  "
                  @click="startCategory(category.id)"
                  class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  :disabled="loading"
                >
                  Start Category
                </button>
                <button
                  v-if="category.status === 'active'"
                  @click="resetCategory(category.id)"
                  class="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
                  :disabled="loading"
                >
                  Reset Category
                </button>
                <button
                  v-if="category.status === 'active'"
                  @click="finalizeCategory(category.id)"
                  class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  :disabled="loading"
                >
                  Finalize Category
                </button>
                <select
                  v-model="category.current_candidate_id"
                  @change="setCandidate(category.id, $event.target.value)"
                  :disabled="
                    category.status !== 'active' || category.has_pending_scores
                  "
                >
                  <option value="">Select Candidate</option>
                  <option
                    v-for="candidate in candidates"
                    :value="candidate.candidate_id"
                    :key="candidate.candidate_id"
                  >
                    {{ candidate.candidate_number }} -
                    {{ candidate.first_name }} {{ candidate.last_name }}
                  </option>
                </select>
                <p
                  v-if="categoryHasPendingScores(category)"
                  class="text-xs text-orange-500 mt-1"
                >
                  Cannot change candidate while scoring is in progress
                </p>
                <p class="text-red-500">
                  Debug: category.status = {{ category.status }}, stage.status =
                  {{ stage.status }}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="px-6 py-4 text-sm text-gray-500">
          No categories in this stage.
        </div>
      </div>
    </div>
    <div v-else class="text-center py-10">
      <p class="text-gray-500">No stages found.</p>
    </div>

    <div
      v-if="showTopCandidatesModal"
      class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 class="text-lg font-semibold mb-4">
          Select Top Candidates for {{ selectedStage?.name }}
        </h3>
        <div v-if="partialResults" class="mb-4">
          <h4 class="text-md font-medium mb-2">Partial Results</h4>
          <ul>
            <li
              v-for="result in partialResults"
              :key="result.candidate_id"
              class="text-sm"
            >
              {{ result.candidate?.first_name }}
              {{ result.candidate?.last_name }}:
              {{ result.average_score.toFixed(2) }}
            </li>
          </ul>
        </div>
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700"
            >Number of Top Candidates</label
          >
          <input
            type="number"
            v-model="topCandidatesCount"
            min="1"
            class="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
          />
        </div>
        <div class="flex justify-end space-x-2">
          <button
            @click="showTopCandidatesModal = false"
            class="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            @click="selectTopCandidates"
            class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            :disabled="loading"
          >
            {{ loading ? "Saving..." : "Save" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
