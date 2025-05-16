<script setup>
import { ref, onMounted, onUnmounted, computed } from "vue";
import { useToast } from "vue-toastification";
import { debounce } from "lodash";
import axiosClient from "@/axios";
import Pusher from "pusher-js";
import { useRouter } from "vue-router";

const props = defineProps({
  eventId: {
    type: String,
    required: true,
  },
});

const router = useRouter();
const toast = useToast();
const stages = ref([]);
const candidates = ref([]);
const loading = ref(false);
const selectedStage = ref(null);
const selectedCategory = ref(null);
const currentCandidateId = ref(null);
const topCandidatesCount = ref(null);
const partialResults = ref([]);
const showTopCandidatesModal = ref(false);
const showConfirmSelectModal = ref(false);
const showConfirmResetModal = ref(false);
const pendingScoresMap = ref({});
const hasSelectedTopCandidates = ref({});
let pusher = null;
let channel = null;

// Determine the last stage
const lastStage = computed(() => {
  if (!stages.value.length) return null;
  // Sort by id and take the last one
  return stages.value.sort((a, b) => a.id - b.id)[stages.value.length - 1];
});

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

    // Initialize hasSelectedTopCandidates based on top_candidates_count
    stages.value.forEach((stage) => {
      hasSelectedTopCandidates.value[stage.id] = !!stage.top_candidates_count;
      console.log(
        `Stage ${stage.id} hasSelectedTopCandidates:`,
        hasSelectedTopCandidates.value[stage.id]
      );
    });

    const pendingScoresResponse = await axiosClient.get(
      `/api/v1/events/${props.eventId}/categories/pending-scores`
    );
    pendingScoresMap.value = pendingScoresResponse.data.pending_scores || {};
    console.log("Pending scores:", pendingScoresMap.value);

    for (const stage of stages.value) {
      for (const category of stage.categories) {
        category.has_pending_scores =
          pendingScoresMap.value[category.id] || false;
        console.log(
          `Category ${category.id} has_pending_scores:`,
          category.has_pending_scores
        );
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
    console.error("Error fetching stages:", error);
    toast.error(error.response?.data?.message || "Failed to load stages.");
  } finally {
    loading.value = false;
  }
};

const activeCandidates = computed(() => {
  return candidates.value.filter((candidate) => candidate.is_active === true);
});

const fetchCandidates = async () => {
  try {
    const response = await axiosClient.get(
      `/api/v1/events/${props.eventId}/candidates`
    );
    console.log("Full candidates response:", response.data);
    candidates.value = response.data.data || [];
    console.log(
      "Candidates fetched:",
      candidates.value.map((c) => ({
        id: c.candidate_id,
        name: `${c.first_name} ${c.last_name}`,
        is_active: c.is_active,
      }))
    );
    if (!candidates.value.length) {
      toast.warning("No active candidates found for this event.");
    }
  } catch (error) {
    console.error("Error fetching candidates:", error);
    toast.error("Failed to fetch candidates.");
  }
};

const fetchPartialResults = async (stageId) => {
  try {
    console.log("Fetching partial results for:", {
      eventId: props.eventId,
      stageId,
    });
    const response = await axiosClient.get(
      `/api/v1/events/${props.eventId}/stages/${stageId}/partial-results`
    );
    partialResults.value = response.data.candidates || [];
    console.log("Partial results fetched:", partialResults.value);
    if (!partialResults.value.length) {
      console.warn("No partial results returned for stage:", stageId);
      toast.info("No confirmed scores available for this stage yet.");
    }
  } catch (error) {
    console.error("Error fetching partial results:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });
    toast.error(
      error.response?.data?.message || "Failed to load partial results."
    );
  }
};

// Redirect to Results Tab for final results
const viewFinalResults = (stageId) => {
  router.push({
    path: "/scores",
    query: { eventId: props.eventId, stageId },
  });
};

const startStage = async (stageId) => {
  loading.value = true;
  try {
    const response = await axiosClient.post(
      `/api/v1/events/${props.eventId}/stages/${stageId}/start`
    );
    toast.success(response.data.message || "Stage started successfully!");
    await fetchStages();
    await fetchPartialResults(stageId);
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
    partialResults.value = [];
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
    await fetchPartialResults(stageId);
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
    const stage = stages.value.find((s) =>
      s.categories.some((c) => c.id === categoryId)
    );
    if (stage) await fetchPartialResults(stage.id);
  } catch (error) {
    toast.error(
      error.response?.data?.message || "Failed to finalize category."
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
  showConfirmSelectModal.value = true; // Show confirmation modal
};

const confirmSelectTopCandidates = async () => {
  loading.value = true;
  try {
    await axiosClient.post(
      `/api/v1/events/${props.eventId}/stages/${selectedStage.value.id}/select-top-candidates`,
      {
        top_candidates_count: topCandidatesCount.value,
      }
    );
    toast.success("Top candidates selected successfully!");
    hasSelectedTopCandidates.value[selectedStage.value.id] = true; // Mark stage as having selected candidates
    showTopCandidatesModal.value = false;
    showConfirmSelectModal.value = false;
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

const resetTopCandidates = async () => {
  showConfirmResetModal.value = true; // Show reset confirmation modal
};

const confirmResetTopCandidates = async () => {
  loading.value = true;
  try {
    await axiosClient.post(
      `/api/v1/events/${props.eventId}/stages/${selectedStage.value.id}/reset-top-candidates`
    );
    toast.success("Top candidates selection reset successfully!");
    hasSelectedTopCandidates.value[selectedStage.value.id] = false; // Reset selection state
    showConfirmResetModal.value = false;
    topCandidatesCount.value = null; // Clear input
    await fetchCandidates();
    await fetchStages();
  } catch (error) {
    toast.error(
      error.response?.data?.message || "Failed to reset top candidates."
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
      console.log("ScoreConfirmed event received:", e);
      toast.info(`Score confirmed for candidate`);
      await refreshPendingScores();
      if (e.all_confirmed) {
        const stage = stages.value.find((s) =>
          s.categories.some((c) => c.id === e.score.category_id)
        );
        if (stage) {
          console.log("Fetching partial results for stage:", stage.id);
          await fetchPartialResults(stage.id);
          toast.info("Partial results updated");
        } else {
          console.warn("No stage found for category_id:", e.score.category_id);
          toast.error(
            "Stage not found for category. Partial results not updated."
          );
        }
      } else {
        console.log("Not all scores confirmed yet:", {
          category_id: e.score.category_id,
          candidate_id: e.score.candidate_id,
        });
      }
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

const categoryHasPendingScores = (computed) => {
  return pendingScoresMap.value[category.id] || false;
};

const candidateHasScore = (categoryId, candidateId) => {
  return false;
};

const hasActiveCategoryInStage = (stage) => {
  return stage.categories.some((cat) => cat.status === "active");
};

const maleResults = computed(() =>
  partialResults.value.filter((result) => result.sex === "male")
);

const femaleResults = computed(() =>
  partialResults.value.filter((result) => result.sex === "female")
);

onMounted(async () => {
  await fetchStages();
  await fetchCandidates();
  const activeStage = stages.value.find((s) => s.status === "active");
  if (activeStage) {
    console.log("Fetching initial partial results for stage:", activeStage.id);
    await fetchPartialResults(activeStage.id);
  }
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
  <div class="flex flex-col md:flex-row gap-6">
    <!-- Stage Management Section -->
    <div class="md:w-1/2 space-y-6">
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
              <h3 class="text-lg font-medium text-gray-900">
                {{ stage.name }}
              </h3>
              <p class="text-sm text-gray-500">
                Status: {{ stage.status || "pending" }}
              </p>
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
                    if (lastStage?.id === stage.id) {
                      viewFinalResults(stage.id);
                    } else {
                      fetchPartialResults(stage.id);
                      showTopCandidatesModal = true;
                    }
                  }
                "
                class="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                :disabled="loading"
              >
                {{
                  lastStage?.id === stage.id
                    ? "View Final Results"
                    : hasSelectedTopCandidates[stage.id]
                    ? "View Partial Results / Reset Selection"
                    : "View Partial Results / Select Top Candidates"
                }}
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
                    v-if="
                      category.current_candidate_id &&
                      category.status !== 'finalized'
                    "
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
                    :disabled="loading || hasActiveCategoryInStage(stage)"
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
                    v-if="category.status === 'active'"
                    v-model="category.current_candidate_id"
                    @change="setCandidate(category.id, $event.target.value)"
                    :disabled="
                      category.status !== 'active' ||
                      category.has_pending_scores
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
                    v-if="
                      category.status === 'active' &&
                      category.has_pending_scores
                    "
                    class="text-xs text-orange-500 mt-1"
                  >
                    Cannot change candidate while scoring is in progress
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
    </div>

    <!-- Partial Results Section -->
    <div class="md:w-1/2 bg-white rounded-lg shadow p-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        Partial Results
        <span
          class="ml-2 text-sm text-gray-500 cursor-help"
          v-tooltip="{
            content:
              'The Raw Average is calculated by summing the weighted scores (score × category weight / 100) for each judge and averaging across all judges. Scores range from 0 to 100.',
            triggers: ['hover', 'click'],
          }"
        >
          (?)
        </span>
      </h3>
      <div v-if="partialResults.length === 0" class="text-gray-500">
        No partial results available yet.
      </div>
      <div v-else>
        <!-- Male Candidates Table -->
        <h4 class="text-md font-medium text-gray-800 mb-2">Male Candidates</h4>
        <table class="min-w-full divide-y divide-gray-200 mb-6">
          <thead class="bg-gray-50">
            <tr>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Rank
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Candidate
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Raw Average
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="result in maleResults" :key="result.candidate_id">
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ result.rank }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ result.candidate.first_name }}
                {{ result.candidate.last_name }} (#{{
                  result.candidate.candidate_number
                }})
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ Number(result.raw_average).toFixed(2) }}/100
              </td>
            </tr>
            <tr v-if="!maleResults.length">
              <td colspan="3" class="px-6 py-4 text-sm text-gray-500">
                No male candidates scored yet.
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Female Candidates Table -->
        <h4 class="text-md font-medium text-gray-800 mb-2">
          Female Candidates
        </h4>
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Rank
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Candidate
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Raw Average
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="result in femaleResults" :key="result.candidate_id">
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ result.rank }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ result.candidate.first_name }}
                {{ result.candidate.last_name }} (#{{
                  result.candidate.candidate_number
                }})
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ Number(result.raw_average).toFixed(2) }}/100
              </td>
            </tr>
            <tr v-if="!femaleResults.length">
              <td colspan="3" class="px-6 py-4 text-sm text-gray-500">
                No female candidates scored yet.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Top Candidates Modal -->
    <div
      v-if="showTopCandidatesModal"
      class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 class="text-lg font-semibold mb-4">
          Select Top Candidates for {{ selectedStage?.name }}
        </h3>
        <div v-if="partialResults.length" class="mb-4">
          <h4 class="text-md font-medium mb-2 flex items-center">
            Partial Results
            <span
              class="ml-2 text-sm text-gray-500 cursor-help"
              v-tooltip="{
                content:
                  'The Raw Average is calculated by summing the weighted scores (score × category weight / 100) for each judge and averaging across all judges. Scores range from 0 to 100.',
                triggers: ['hover', 'click'],
              }"
            >
              (?)
            </span>
          </h4>
          <ul>
            <li
              v-for="result in partialResults"
              :key="result.candidate_id"
              class="text-sm"
            >
              {{ result.candidate.first_name }}
              {{ result.candidate.last_name }} (#{{
                result.candidate.candidate_number
              }}) - Rank {{ result.rank }}:
              {{ Number(result.raw_average).toFixed(2) }}/100
            </li>
          </ul>
        </div>
        <div class="mb-4">
          <div v-if="!hasSelectedTopCandidates[selectedStage?.id]">
            <label class="block text-sm font-medium text-gray-700">
              Number of Top Candidates (must be even)
            </label>
            <input
              type="number"
              v-model="topCandidatesCount"
              min="2"
              step="2"
              class="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
            />
          </div>
          <div v-else>
            <button
              @click="resetTopCandidates"
              class="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
              :disabled="loading"
            >
              Reset Selection
            </button>
          </div>
        </div>
        <div class="flex justify-end space-x-2">
          <button
            @click="showTopCandidatesModal = false"
            class="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            v-if="!hasSelectedTopCandidates[selectedStage?.id]"
            @click="selectTopCandidates"
            class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            :disabled="loading"
          >
            {{ loading ? "Saving..." : "Save" }}
          </button>
        </div>
      </div>
    </div>

    <!-- Confirm Select Top Candidates Modal -->
    <div
      v-if="showConfirmSelectModal"
      class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 class="text-lg font-semibold mb-4">Confirm Selection</h3>
        <p class="text-sm text-gray-600 mb-4">
          Are you sure you want to select {{ topCandidatesCount }} top
          candidates ({{ topCandidatesCount / 2 }} males and
          {{ topCandidatesCount / 2 }} females) for {{ selectedStage?.name }}?
        </p>
        <div class="flex justify-end space-x-2">
          <button
            @click="showConfirmSelectModal = false"
            class="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            @click="confirmSelectTopCandidates"
            class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            :disabled="loading"
          >
            {{ loading ? "Confirming..." : "Confirm" }}
          </button>
        </div>
      </div>
    </div>

    <!-- Confirm Reset Top Candidates Modal -->
    <div
      v-if="showConfirmResetModal"
      class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 class="text-lg font-semibold mb-4">Confirm Reset</h3>
        <p class="text-sm text-gray-600 mb-4">
          Are you sure you want to reset the top candidates selection for
          {{ selectedStage?.name }}? This will reactivate all candidates for
          this event.
        </p>
        <div class="flex justify-end space-x-2">
          <button
            @click="showConfirmResetModal = false"
            class="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            @click="confirmResetTopCandidates"
            class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            :disabled="loading"
          >
            {{ loading ? "Resetting..." : "Reset" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
