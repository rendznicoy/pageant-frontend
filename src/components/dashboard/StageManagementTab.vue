<script setup>
import {
  ref,
  onMounted,
  onUnmounted,
  computed,
  watch,
  watchEffect,
  nextTick,
} from "vue";
import { useToast } from "vue-toastification";
import { debounce } from "lodash";
import axiosClient from "@/axios";
import Pusher from "pusher-js";
import { useRouter } from "vue-router";

const enhancedScoringTooltipContent = `
Enhanced Scoring Process:
- Mean Rating: Average of all judges' scores
- Mean Rank: Average of individual judge rankings
- Overall Rank: Based primarily on Mean Rating; Mean Rank used as tiebreaker
Example:
Judge A: 90 (Rank 1), Judge B: 88 (Rank 2)
Mean Rating = (90 + 88) ÷ 2 = 89
Mean Rank = (1 + 2) ÷ 2 = 1.5
Lower Mean Rank is better for tiebreaking
`;

const getScoreColorClass = (score) => {
  const maxScore = eventMaxScore.value;
  const percentage = (score / maxScore) * 100;

  if (percentage < 60) return "bg-red-100 text-red-800";
  if (percentage >= 60 && percentage < 80)
    return "bg-yellow-100 text-yellow-800";
  return "bg-green-100 text-green-800";
};

const hasActiveStage = computed(() => {
  return stages.value.some((stage) => stage.status === "active");
});

const hasActiveCategory = computed(() => {
  return stages.value.some((stage) =>
    stage.categories.some((category) => category.status === "active")
  );
});

const getStatusIcon = (status) => {
  switch (status) {
    case "pending":
      return "fas fa-clock text-yellow-500";
    case "active":
      return "fas fa-play-circle text-green-500";
    case "finalized":
      return "fas fa-check-circle text-blue-500";
    default:
      return "fas fa-question-circle text-gray-500";
  }
};

const eventDivision = ref("standard");

const lastStage = computed(() => {
  if (!stages.value.length) return null;
  return stages.value[stages.value.length - 1];
});

const isSingleStage = computed(() => {
  return stages.value.length === 1;
});

const isStandardDivision = computed(() => {
  return eventDivision.value === "standard";
});

const selectStage = (stage) => {
  selectedStage.value = stage;
  showTopCandidatesModal.value = true;
};

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
const eventMaxScore = ref(100);

let pusher = null;
let channel = null;

const hasPending = (categoryId) => {
  const key = String(categoryId);
  const value = pendingScoresMap.value[key];
  if (value === undefined) {
    console.warn(`pendingScoresMap missing key: ${key}`);
  }
  return Boolean(value);
};

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

    // Fetch event details to get division
    const eventResponse = await axiosClient.get(
      `/api/v1/events/${props.eventId}`
    );
    eventDivision.value = eventResponse.division || "standard";
    eventMaxScore.value = eventResponse.max_score || 100;

    // Fetch stages
    const stagesResponse = await axiosClient.get(
      `/api/v1/events/${props.eventId}/stages`
    );
    stages.value = stagesResponse.data.map((stage) => ({
      ...stage,
      id: stage.stage_id,
      categories: (stage.categories ?? []).map((cat) => ({
        ...cat,
        id: cat.category_id,
      })),
    }));

    // Fetch pending scores
    const pendingScoresResponse = await axiosClient.get(
      `/api/v1/events/${props.eventId}/categories/pending-scores`
    );
    const rawMap = pendingScoresResponse?.pending_scores ?? {};
    pendingScoresMap.value = {};

    // Initialize pendingScoresMap with real values
    for (const stage of stages.value) {
      for (const cat of stage.categories) {
        const key = String(cat.id);
        pendingScoresMap.value[key] = Boolean(rawMap[key] ?? false);
      }
    }

    // Set category flags
    for (const stage of stages.value) {
      for (const category of stage.categories) {
        const hasPending = pendingScoresMap.value[String(category.id)];
        category.has_pending_scores = hasPending;
        category.cannot_switch = hasPending;
      }
    }

    // Initialize hasSelectedTopCandidates
    stages.value.forEach((stage) => {
      hasSelectedTopCandidates.value[stage.id] = !!stage.top_candidates_count;
    });

    // Auto-refresh partial results for active/finalized stages
    const activeOrFinalizedStage = stages.value.find(
      (s) => s.status === "active" || s.status === "finalized"
    );
    if (
      activeOrFinalizedStage &&
      (!selectedStage.value ||
        selectedStage.value.id === activeOrFinalizedStage.id)
    ) {
      selectedStage.value = activeOrFinalizedStage;
      await fetchPartialResults(activeOrFinalizedStage.id);
    }

    console.log("Stages fetched:", stages.value);
  } catch (error) {
    handleError(error, "Failed to load stages.");
  } finally {
    loading.value = false;
  }
};

const activeCandidates = ref([]);

const fetchCandidates = async () => {
  try {
    const response = await axiosClient.get(
      `/api/v1/events/${props.eventId}/candidates`
    );

    const raw = Array.isArray(response.data)
      ? response.data
      : response.data.data || [];

    candidates.value = raw.map((c) => ({
      ...c,
      is_active: c.is_active == 1,
    }));

    activeCandidates.value = candidates.value.filter((c) => c.is_active);

    // Debugging info
    console.log("CANDIDATES:", candidates.value);
    console.log("ACTIVE CANDIDATES:", activeCandidates.value);
  } catch (error) {
    handleError(error, "Failed to fetch candidates");
  }
};

const fetchPartialResults = async (stageId) => {
  loading.value = true;
  try {
    console.log("→ Calling partial-results for stage", stageId);

    // 1. Call the endpoint
    const response = await axiosClient.get(
      `/api/v1/events/${props.eventId}/stages/${stageId}/partial-results`
    );

    // 2. Inspect what you actually got back
    console.log("← Raw response object:", response);

    // 3. Figure out where `candidates` lives
    const payload =
      response && typeof response === "object"
        ? // if there's a .candidates on the root, use it, otherwise look under .data
          "candidates" in response
          ? response
          : response.data || {}
        : {};

    // 4. Pull out the array (or fall back to empty)
    const rawCandidates = Array.isArray(payload.candidates)
      ? payload.candidates
      : [];

    // 5. Normalize and set your ref
    partialResults.value = rawCandidates.map((c) => ({
      ...c,
      sex:
        c.sex?.toLowerCase() === "m"
          ? "male"
          : c.sex?.toLowerCase() === "f"
          ? "female"
          : c.sex,
    }));

    console.log("⤷ Parsed partialResults:", partialResults.value);

    // 6. Notify if *really* empty
    if (!partialResults.value.length) {
      console.warn("No partial results returned for stage:", stageId);
      toast.info("No confirmed scores available for this stage yet.");
    }

    // 7. Force a re-render
    await nextTick();
  } catch (error) {
    handleError(error, "Failed to load partial results");
    partialResults.value = [];
  } finally {
    loading.value = false;
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

    const msg = response?.data?.message || "Stage started.";
    toast.success(msg);

    await fetchStages();
    await fetchPartialResults(stageId);
  } catch (error) {
    handleError(error, "Failed to start stage");
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

    const msg = response?.data?.message || "Stage reset successfully!";
    toast.success(msg);

    await fetchStages();
    partialResults.value = [];
  } catch (error) {
    handleError(error, "Failed to reset stage");
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
    handleError(error, "Failed to finalize stage");
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

    const msg = response?.data?.message || "Category started successfully!";
    toast.success(msg);
    await fetchStages();
  } catch (error) {
    handleError(error, "Failed to start category");
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

    const msg = response?.data?.message || "Category reset successfully!";
    toast.success(msg);
    await fetchStages();
  } catch (error) {
    handleError(error, "Failed to reset category");
  } finally {
    loading.value = false;
  }
};

const setCandidate = debounce(async (categoryId, candidateId) => {
  const category = stages.value
    .flatMap((stage) => stage.categories)
    .find((c) => c.id === categoryId);

  if (!category) {
    toast.error("Category not found.");
    return;
  }

  const previousCandidateId = category.current_candidate_id;

  // Check if dropdown should be disabled
  if (isCandidateDropdownDisabled(category)) {
    toast.warning(
      "Cannot change candidate while scoring is in progress or candidate is already set."
    );
    category.current_candidate_id = previousCandidateId;
    return;
  }

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

    toast.success(response?.data?.message || "Candidate set successfully!");
    currentCandidateId.value = candidateId;

    await fetchStages(); // Only refresh if success
  } catch (error) {
    category.current_candidate_id = previousCandidateId;
    handleError(error, "Failed to set candidate");
  } finally {
    loading.value = false;
  }
}, 300);

const onCandidateChange = async (category, newCandidateId) => {
  const oldValue = category.current_candidate_id;

  try {
    await setCandidate(category.id, newCandidateId);
  } catch (error) {
    category.current_candidate_id = oldValue; // Revert if switch fails
    toast.error(error.message || "Failed to switch candidate");
  }
};

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
    handleError(error, "Failed to finalize category");
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
  if (isStandardDivision.value) {
    // Standard division requires even numbers and equal male/female split
    const males = partialResults.value.filter(
      (c) => c.sex?.toLowerCase() === "m" || c.sex?.toLowerCase() === "male"
    );
    const females = partialResults.value.filter(
      (c) => c.sex?.toLowerCase() === "f" || c.sex?.toLowerCase() === "female"
    );

    const requiredPerSex = topCandidatesCount.value / 2;

    if (males.length < requiredPerSex || females.length < requiredPerSex) {
      toast.error(
        `Not enough candidates. You need at least ${requiredPerSex} males and ${requiredPerSex} females with confirmed scores.`
      );
      return;
    }
  } else {
    // Male-only or female-only division
    const availableCandidates = partialResults.value.length;
    if (availableCandidates < topCandidatesCount.value) {
      toast.error(
        `Not enough candidates. Only ${availableCandidates} candidates available with confirmed scores.`
      );
      return;
    }
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
    hasSelectedTopCandidates.value[selectedStage.value.id] = true;
    showTopCandidatesModal.value = false;
    showConfirmSelectModal.value = false;
    await fetchCandidates();
    await fetchStages();
  } catch (error) {
    handleError(error, "Failed to select top candidates");
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
    handleError(error, "Failed to reset top candidates.");
  } finally {
    loading.value = false;
  }
};

const setupWebSocket = () => {
  if (pusher && pusher.connection.state === "connected") return;
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
    const debouncedFetchStages = debounce(fetchStages, 60000);

    channel.bind("App\\Events\\StageStatusUpdated", (e) => {
      console.log(`Stage ${e.stage_id} status updated to ${e.status}`);
      debouncedFetchStages();
    });

    // inside setupWebSocket():
    channel.bind("App\\Events\\CategoryStatusUpdated", async (e) => {
      toast.info(`Category ${e.category_id} status updated to ${e.status}`);

      await fetchStages();
      await refreshPendingScores();

      if (e.status === "finalized") {
        const stage = stages.value.find((stage) =>
          stage.categories.some((cat) => cat.id === e.category_id)
        );

        if (stage && stage.id === selectedStage.value?.id) {
          await fetchPartialResults(stage.id);
        }
      }
    });

    channel.bind("App\\Events\\ScoreSubmitted", async (e) => {
      toast.info(`Score submitted for candidate`);
      await refreshPendingScores();
    });
    channel.bind("App\\Events\\ScoreConfirmed", async (e) => {
      await refreshPendingScores();

      // only refresh the partial‐results table when this was the last judge
      if (
        selectedStage.value?.id === e.stage_id &&
        !pendingScoresMap.value[String(e.category_id)]
      ) {
        await fetchPartialResults(e.stage_id);
      }
    });
  } catch (error) {
    handleError(error, "Failed to connect to real-time updates");
  }
};

// Updated function to determine if candidate dropdown should be disabled
const isCandidateDropdownDisabled = (category) => {
  const id = String(category.id || category.category_id);
  if (!id) return true;

  const hasPendingScores = Boolean(pendingScoresMap.value[id]);

  console.log(
    `Category ${id} - Dropdown Disabled:`,
    hasPendingScores || loading.value,
    "PendingScoresMap:",
    pendingScoresMap.value[id],
    "Loading:",
    loading.value
  );

  return hasPendingScores || loading.value;
};

const isCandidateUsedElsewhere = (candidateId, currentCategoryId) => {
  return stages.value
    .flatMap((stage) => stage.categories)
    .some(
      (cat) =>
        cat.id !== currentCategoryId &&
        cat.status === "active" &&
        cat.current_candidate_id === candidateId
    );
};

const refreshPendingScores = async () => {
  try {
    const response = await axiosClient.get(
      `/api/v1/events/${props.eventId}/categories/pending-scores`
    );
    const rawMap = response?.data?.pending_scores || {};
    pendingScoresMap.value = { ...rawMap };

    console.log("→ REFRESH pendingScoresMap:", pendingScoresMap.value);

    for (const stage of stages.value) {
      for (const category of stage.categories) {
        // Ensure ID is present
        category.id = category.id || category.category_id;

        const key = String(category.id);
        const updated = Boolean(pendingScoresMap.value[key]);

        console.log(
          `→ Category ${key}: has_pending_scores = ${updated}, from map:`,
          pendingScoresMap.value
        );
      }
    }
  } catch (error) {
    handleError(error, "Failed to refresh pending scores");
  }
};

const refreshPartialResults = async () => {
  // 1) pick the stage you're showing the table for…
  const stageToFetch =
    selectedStage.value ||
    stages.value.find((s) => s.status === "active") ||
    stages.value.find((s) => s.status === "finalized");

  // 2) clear out the old rows so the user sees the spinner/empty state
  partialResults.value = [];

  if (stageToFetch) {
    await fetchPartialResults(stageToFetch.id);
  }
};

const getAvailableCandidates = (categoryId) => {
  return candidates.value.filter((candidate) => {
    // Only show active candidates
    if (!candidate.is_active) return false;

    // Find the category to check its current state
    const category = stages.value
      .flatMap((stage) => stage.categories)
      .find((c) => c.id === categoryId);

    if (!category) return false;

    // If this category already has this candidate set, always allow it to be selected
    if (category.current_candidate_id === candidate.candidate_id) {
      return true;
    }

    // Check if this candidate has been fully scored in this category
    // (This would require an API call to check if all judges have confirmed scores)
    // For now, we'll use a simplified check

    // Check if this candidate is currently being used in any OTHER active category
    const isCurrentlyUsedElsewhere = stages.value
      .flatMap((stage) => stage.categories)
      .some(
        (cat) =>
          cat.id !== categoryId && // Different category
          cat.status === "active" && // Category is active
          cat.current_candidate_id === candidate.candidate_id // Candidate is set
      );

    // Exclude candidates currently being used in other active categories
    return !isCurrentlyUsedElsewhere;
  });
};

const getCandidateDisplayText = (candidate, categoryId) => {
  const baseText = `${candidate.candidate_number} - ${candidate.first_name} ${candidate.last_name}`;

  if (isCandidateUsedElsewhere(candidate.candidate_id, categoryId)) {
    return `${baseText} (In use elsewhere)`;
  }

  return baseText;
};

const handleError = (
  error,
  fallbackMessage = "An unexpected error occurred"
) => {
  const message =
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallbackMessage;

  toast.error(message);

  console.error("API Error:", {
    message,
    full: error,
    response: error?.response,
  });
};

const hasActiveCategoryInStage = (stage) => {
  return stage.categories.some((cat) => cat.status === "active");
};

const maleResults = computed(() =>
  partialResults.value.filter(
    (result) =>
      result.sex?.toLowerCase() === "m" || result.sex?.toLowerCase() === "male"
  )
);

const femaleResults = computed(() =>
  partialResults.value.filter(
    (result) =>
      result.sex?.toLowerCase() === "f" ||
      result.sex?.toLowerCase() === "female"
  )
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
  try {
    if (pusher && pusher.connection.state === "connected") {
      pusher.unsubscribe(`event.${props.eventId}`);
      pusher.disconnect();
    }
  } catch (e) {
    console.warn("Error during Pusher cleanup:", e.message);
  }
});

watch(selectedStage, (newStage) => {
  if (!newStage || !newStage.id) return;
  partialResults.value = [];
  fetchPartialResults(newStage.id);
});

watchEffect(async () => {
  const activeStage = stages.value.find((s) => s.status === "active");
  if (activeStage && selectedStage.value?.id !== activeStage.id) {
    selectedStage.value = activeStage;
    partialResults.value = [];
    await fetchPartialResults(activeStage.id);
  }
});
</script>

<
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
              <p class="text-sm text-gray-500 flex items-center">
                Status:
                <i
                  :class="getStatusIcon(stage.status || 'pending')"
                  class="ml-2"
                ></i>
              </p>
            </div>
            <div class="space-x-2">
              <button
                v-if="stage.status === 'pending' && !hasActiveStage"
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
                    if (isSingleStage || lastStage?.id === stage.id) {
                      viewFinalResults(stage.id);
                    } else {
                      selectStage(stage);
                    }
                  }
                "
                class="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                :disabled="loading"
              >
                {{
                  isSingleStage || lastStage?.id === stage.id
                    ? "View Final Results"
                    : hasSelectedTopCandidates[stage.id]
                    ? "Select Top Candidates / Reset Selection"
                    : "Select Top Candidates"
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
                  <p class="text-sm text-gray-500 flex items-center">
                    Status:
                    <i
                      :class="getStatusIcon(category.status || 'pending')"
                      class="ml-2"
                    ></i>
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
                      category.status === 'pending' &&
                      stage.status === 'active' &&
                      !hasActiveCategory
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

                  <!-- Updated Candidate Selection Logic -->
                  <template
                    v-if="
                      stage.status === 'active' && category.status === 'active'
                    "
                  >
                    <select
                      :value="category.current_candidate_id || ''"
                      @change="
                        (e) => onCandidateChange(category, e.target.value)
                      "
                      :disabled="
                        category && isCandidateDropdownDisabled(category)
                      "
                      class="border border-gray-300 rounded px-2 py-1"
                      :class="{
                        'bg-gray-100 cursor-not-allowed':
                          isCandidateDropdownDisabled(category),
                        'bg-white': !isCandidateDropdownDisabled(category),
                      }"
                    >
                      <option value="">
                        {{
                          category.current_candidate_id
                            ? "Change Candidate"
                            : "Select Candidate"
                        }}
                      </option>
                      <!-- Use the updated filtering method -->
                      <option
                        v-for="candidate in getAvailableCandidates(category.id)"
                        :key="candidate.candidate_id"
                        :value="candidate.candidate_id"
                        :class="{
                          'font-semibold':
                            category.current_candidate_id ===
                            candidate.candidate_id,
                        }"
                      >
                        {{ candidate.candidate_number }} -
                        {{ candidate.first_name }} {{ candidate.last_name }}
                        <span
                          v-if="
                            category.current_candidate_id ===
                            candidate.candidate_id
                          "
                        >
                          (Current)</span
                        >
                      </option>
                    </select>

                    <!-- Enhanced Status Messages -->
                    <div class="text-xs mt-1">
                      <p v-if="hasPending(category.id)" class="text-red-500">
                        Scoring in progress - dropdown disabled
                      </p>
                      <p
                        v-else-if="category.current_candidate_id"
                        class="text-green-500"
                      >
                        All scores confirmed - can change candidate
                      </p>
                      <p v-else class="text-gray-500">
                        Ready to select candidate
                      </p>
                      <!-- Show count of available candidates -->
                      <p class="text-gray-400 text-xs">
                        {{ getAvailableCandidates(category.id).length }}
                        candidates available
                        <span v-if="category.current_candidate_id"
                          >(including current)</span
                        >
                      </p>
                    </div>
                  </template>

                  <!-- only show that hint if category is still pending or stage isn't active -->
                  <template
                    v-else-if="
                      stage.status !== 'active' || category.status === 'pending'
                    "
                  >
                    <p class="text-xs text-gray-500 mt-1">
                      Candidate selection available only when stage and category
                      are active.
                    </p>
                  </template>
                  <!-- if category.status==='finalized', nothing gets shown here (you'll have your Reset button above) -->
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

    <!-- Enhanced Partial Results Section -->
    <div class="md:w-1/2 bg-white rounded-lg shadow-lg p-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <i class="fas fa-chart-line text-green-600 mr-2"></i>
        Partial Results
        <span
          class="ml-2 text-sm cursor-help"
          v-tooltip="{
            content: enhancedScoringTooltipContent,
            allowHTML: true,
            triggers: ['hover', 'click'],
          }"
        >
          <i class="fas fa-info-circle text-gray-400"></i>
        </span>
      </h3>

      <div
        v-if="partialResults.length === 0"
        class="text-center py-8 text-gray-500"
      >
        <i class="fas fa-chart-bar text-gray-300 text-3xl mb-2"></i>
        <p>No partial results available yet.</p>
      </div>

      <div v-else>
        <!-- Standard Division: Separate Male/Female Tables -->
        <template v-if="isStandardDivision">
          <!-- Male Candidates Table -->
          <div class="mb-6">
            <h4
              class="text-md font-medium text-blue-800 mb-3 flex items-center"
            >
              <i class="fas fa-male mr-2"></i>
              Male Candidates
            </h4>
            <div class="overflow-x-auto bg-blue-50 rounded-lg">
              <table class="min-w-full divide-y divide-blue-200">
                <thead class="bg-blue-100">
                  <tr>
                    <th
                      class="px-4 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider"
                    >
                      Rank
                    </th>
                    <th
                      class="px-4 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider"
                    >
                      Candidate
                    </th>
                    <th
                      class="px-4 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider"
                    >
                      Mean Rating
                    </th>
                    <th
                      class="px-4 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider"
                    >
                      Mean Rank
                    </th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  <tr
                    v-for="result in maleResults"
                    :key="result.candidate_id"
                    class="hover:bg-blue-50 transition-colors"
                  >
                    <td class="px-4 py-3 whitespace-nowrap">
                      <div class="flex items-center">
                        <span class="text-lg font-bold text-gray-900">{{
                          result.overall_rank || result.rank
                        }}</span>
                        <i
                          v-if="(result.overall_rank || result.rank) === 1"
                          class="fas fa-crown text-yellow-500 ml-2"
                        ></i>
                      </div>
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap">
                      <div>
                        <div class="text-sm font-medium text-gray-900">
                          {{ result.candidate?.first_name }}
                          {{ result.candidate?.last_name }}
                        </div>
                        <div class="text-xs text-gray-500">
                          #{{ result.candidate?.candidate_number }} -
                          {{ result.candidate?.team }}
                        </div>
                      </div>
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap">
                      <span
                        class="px-2 py-1 rounded-full text-xs font-medium"
                        :class="
                          getScoreColorClass(
                            result.mean_rating || result.raw_average
                          )
                        "
                      >
                        {{
                          Number(
                            result.mean_rating || result.raw_average
                          ).toFixed(1)
                        }}/{{ eventMaxScore }}
                      </span>
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap">
                      <span class="text-xs text-gray-600">
                        {{
                          result.mean_rank
                            ? Number(result.mean_rank).toFixed(2)
                            : "N/A"
                        }}
                      </span>
                    </td>
                  </tr>
                  <tr v-if="!maleResults.length">
                    <td
                      colspan="4"
                      class="px-4 py-6 text-center text-gray-500 text-sm"
                    >
                      No male candidates scored yet.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Female Candidates Table -->
          <div>
            <h4
              class="text-md font-medium text-pink-800 mb-3 flex items-center"
            >
              <i class="fas fa-female mr-2"></i>
              Female Candidates
            </h4>
            <div class="overflow-x-auto bg-pink-50 rounded-lg">
              <table class="min-w-full divide-y divide-pink-200">
                <thead class="bg-pink-100">
                  <tr>
                    <th
                      class="px-4 py-3 text-left text-xs font-medium text-pink-800 uppercase tracking-wider"
                    >
                      Rank
                    </th>
                    <th
                      class="px-4 py-3 text-left text-xs font-medium text-pink-800 uppercase tracking-wider"
                    >
                      Candidate
                    </th>
                    <th
                      class="px-4 py-3 text-left text-xs font-medium text-pink-800 uppercase tracking-wider"
                    >
                      Mean Rating
                    </th>
                    <th
                      class="px-4 py-3 text-left text-xs font-medium text-pink-800 uppercase tracking-wider"
                    >
                      Mean Rank
                    </th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  <tr
                    v-for="result in femaleResults"
                    :key="result.candidate_id"
                    class="hover:bg-pink-50 transition-colors"
                  >
                    <td class="px-4 py-3 whitespace-nowrap">
                      <div class="flex items-center">
                        <span class="text-lg font-bold text-gray-900">{{
                          result.overall_rank || result.rank
                        }}</span>
                        <i
                          v-if="(result.overall_rank || result.rank) === 1"
                          class="fas fa-crown text-yellow-500 ml-2"
                        ></i>
                      </div>
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap">
                      <div>
                        <div class="text-sm font-medium text-gray-900">
                          {{ result.candidate.first_name }}
                          {{ result.candidate.last_name }}
                        </div>
                        <div class="text-xs text-gray-500">
                          #{{ result.candidate.candidate_number }} -
                          {{ result.candidate.team }}
                        </div>
                      </div>
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap">
                      <span
                        class="px-2 py-1 rounded-full text-xs font-medium"
                        :class="
                          getScoreColorClass(
                            result.mean_rating || result.raw_average
                          )
                        "
                      >
                        {{
                          Number(
                            result.mean_rating || result.raw_average
                          ).toFixed(1)
                        }}/{{ eventMaxScore }}
                      </span>
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap">
                      <span class="text-xs text-gray-600">
                        {{
                          result.mean_rank
                            ? Number(result.mean_rank).toFixed(2)
                            : "N/A"
                        }}
                      </span>
                    </td>
                  </tr>
                  <tr v-if="!femaleResults.length">
                    <td
                      colspan="4"
                      class="px-4 py-6 text-center text-gray-500 text-sm"
                    >
                      No female candidates scored yet.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </template>

        <!-- Single Division Table -->
        <template v-else>
          <h4 class="text-md font-medium text-gray-800 mb-3">
            {{ eventDivision === "male-only" ? "Male" : "Female" }} Candidates
          </h4>
          <div class="overflow-x-auto bg-gray-50 rounded-lg">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-100">
                <tr>
                  <th
                    class="px-4 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider"
                  >
                    Rank
                  </th>
                  <th
                    class="px-4 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider"
                  >
                    Candidate
                  </th>
                  <th
                    class="px-4 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider"
                  >
                    Mean Rating
                  </th>
                  <th
                    class="px-4 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider"
                  >
                    Mean Rank
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr
                  v-for="result in partialResults"
                  :key="result.candidate_id"
                  class="hover:bg-gray-50 transition-colors"
                >
                  <td class="px-4 py-3 whitespace-nowrap">
                    <span class="text-lg font-bold text-gray-900">{{
                      result.overall_rank || result.rank
                    }}</span>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap">
                    <div>
                      <div class="text-sm font-medium text-gray-900">
                        {{ result.candidate?.first_name }}
                        {{ result.candidate?.last_name }}
                      </div>
                      <div class="text-xs text-gray-500">
                        #{{ result.candidate?.candidate_number }} -
                        {{ result.candidate?.team }}
                      </div>
                    </div>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap">
                    <span
                      class="px-2 py-1 rounded-full text-xs font-medium"
                      :class="
                        getScoreColorClass(
                          result.mean_rating || result.raw_average
                        )
                      "
                    >
                      {{
                        Number(
                          result.mean_rating || result.raw_average
                        ).toFixed(1)
                      }}/{{ eventMaxScore }}
                    </span>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap">
                    <span class="text-xs text-gray-600">
                      {{
                        result.mean_rank
                          ? Number(result.mean_rank).toFixed(2)
                          : "N/A"
                      }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
      </div>
    </div>

    <!-- Enhanced Top Candidates Modal -->
    <div
      v-if="showTopCandidatesModal"
      class="fixed inset-0 bg-gray-600 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50"
    >
      <div
        class="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
      >
        <div class="p-6 border-b border-gray-200">
          <h3 class="text-xl font-bold text-gray-800 flex items-center">
            <i class="fas fa-trophy text-yellow-500 mr-2"></i>
            Select Top Candidates for {{ selectedStage?.name }}
            <span
              class="ml-2 text-sm cursor-help"
              v-tooltip="{
                content: enhancedScoringTooltipContent,
                allowHTML: true,
                triggers: ['hover', 'click'],
              }"
            >
              <i class="fas fa-info-circle text-gray-400"></i>
            </span>
          </h3>
          <p class="text-gray-600 mt-1">
            Review current standings and select advancing candidates
          </p>
        </div>

        <div class="p-6">
          <!-- Partial Results Display -->
          <div v-if="partialResults.length" class="mb-6">
            <h4 class="text-lg font-semibold mb-4 text-gray-800">
              Current Standings
            </h4>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <!-- Male Results Table -->
              <div class="bg-blue-50 rounded-lg p-4">
                <h5 class="font-medium text-blue-800 mb-3 flex items-center">
                  <i class="fas fa-male mr-2"></i>
                  Male Candidates ({{ maleResults.length }})
                </h5>
                <div class="overflow-x-auto">
                  <table class="min-w-full divide-y divide-blue-200">
                    <thead class="bg-blue-100">
                      <tr>
                        <th
                          class="px-3 py-2 text-left text-xs font-medium text-blue-800 uppercase"
                        >
                          Rank
                        </th>
                        <th
                          class="px-3 py-2 text-left text-xs font-medium text-blue-800 uppercase"
                        >
                          Candidate
                        </th>
                        <th
                          class="px-3 py-2 text-left text-xs font-medium text-blue-800 uppercase"
                        >
                          Rating
                        </th>
                      </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                      <tr
                        v-for="result in maleResults"
                        :key="result.candidate_id"
                        class="hover:bg-blue-50"
                      >
                        <td class="px-3 py-2 text-sm font-bold">
                          {{ result.overall_rank || result.rank }}
                        </td>
                        <td class="px-3 py-2 text-sm">
                          <div class="font-medium">
                            {{ result.candidate.first_name }}
                            {{ result.candidate.last_name }}
                          </div>
                          <div class="text-xs text-gray-500">
                            #{{ result.candidate.candidate_number }}
                          </div>
                        </td>
                        <td class="px-3 py-2">
                          <span
                            class="px-2 py-1 rounded-full text-xs font-medium"
                            :class="
                              getScoreColorClass(
                                result.mean_rating || result.raw_average
                              )
                            "
                          >
                            {{
                              Number(
                                result.mean_rating || result.raw_average
                              ).toFixed(1)
                            }}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- Female Results Table -->
              <div class="bg-pink-50 rounded-lg p-4">
                <h5 class="font-medium text-pink-800 mb-3 flex items-center">
                  <i class="fas fa-female mr-2"></i>
                  Female Candidates ({{ femaleResults.length }})
                </h5>
                <div class="overflow-x-auto">
                  <table class="min-w-full divide-y divide-pink-200">
                    <thead class="bg-pink-100">
                      <tr>
                        <th
                          class="px-3 py-2 text-left text-xs font-medium text-pink-800 uppercase"
                        >
                          Rank
                        </th>
                        <th
                          class="px-3 py-2 text-left text-xs font-medium text-pink-800 uppercase"
                        >
                          Candidate
                        </th>
                        <th
                          class="px-3 py-2 text-left text-xs font-medium text-pink-800 uppercase"
                        >
                          Rating
                        </th>
                      </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                      <tr
                        v-for="result in femaleResults"
                        :key="result.candidate_id"
                        class="hover:bg-pink-50"
                      >
                        <td class="px-3 py-2 text-sm font-bold">
                          {{ result.overall_rank || result.rank }}
                        </td>
                        <td class="px-3 py-2 text-sm">
                          <div class="font-medium">
                            {{ result.candidate.first_name }}
                            {{ result.candidate.last_name }}
                          </div>
                          <div class="text-xs text-gray-500">
                            #{{ result.candidate.candidate_number }}
                          </div>
                        </td>
                        <td class="px-3 py-2">
                          <span
                            class="px-2 py-1 rounded-full text-xs font-medium"
                            :class="
                              getScoreColorClass(
                                result.mean_rating || result.raw_average
                              )
                            "
                          >
                            {{
                              Number(
                                result.mean_rating || result.raw_average
                              ).toFixed(1)
                            }}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <!-- Selection Controls -->
          <div class="bg-gray-50 rounded-lg p-4">
            <div v-if="!hasSelectedTopCandidates[selectedStage?.id]">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Number of Top Candidates to Advance
                <span v-if="isStandardDivision" class="text-gray-500"
                  >(must be even for equal male/female split)</span
                >
              </label>
              <div class="flex items-center space-x-4">
                <input
                  type="number"
                  v-model="topCandidatesCount"
                  :min="isStandardDivision ? 2 : 1"
                  :step="isStandardDivision ? 2 : 1"
                  :max="Math.min(maleResults.length, femaleResults.length) * 2"
                  class="w-24 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="6"
                />
                <div
                  v-if="isStandardDivision && topCandidatesCount"
                  class="text-sm text-gray-600 bg-white px-3 py-2 rounded border"
                >
                  <i class="fas fa-info-circle text-blue-500 mr-1"></i>
                  Will advance:
                  <strong>{{ topCandidatesCount / 2 }}</strong> males +
                  <strong>{{ topCandidatesCount / 2 }}</strong> females
                </div>
                <div
                  v-else-if="topCandidatesCount"
                  class="text-sm text-gray-600 bg-white px-3 py-2 rounded border"
                >
                  <i class="fas fa-info-circle text-blue-500 mr-1"></i>
                  Will advance: <strong>{{ topCandidatesCount }}</strong>
                  {{ eventDivision === "male-only" ? "male" : "female" }}
                  candidates
                </div>
              </div>
            </div>
            <div v-else class="text-center py-4">
              <div
                class="bg-green-100 text-green-800 px-4 py-2 rounded-lg inline-flex items-center"
              >
                <i class="fas fa-check-circle mr-2"></i>
                Top candidates already selected
              </div>
              <button
                @click="resetTopCandidates"
                class="ml-4 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition"
                :disabled="loading"
              >
                <i class="fas fa-undo mr-1"></i>
                Reset Selection
              </button>
            </div>
          </div>
        </div>

        <div
          class="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3"
        >
          <button
            @click="showTopCandidatesModal = false"
            class="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
          >
            <i class="fas fa-times mr-1"></i>
            Cancel
          </button>
          <button
            v-if="!hasSelectedTopCandidates[selectedStage?.id]"
            @click="selectTopCandidates"
            class="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
            :disabled="loading || !topCandidatesCount"
          >
            <i v-if="loading" class="fas fa-spinner fa-spin mr-2"></i>
            <i v-else class="fas fa-check mr-2"></i>
            {{ loading ? "Processing..." : "Confirm Selection" }}
          </button>
        </div>
      </div>
    </div>
    <!-- Reset Top Candidates Confirmation Modal -->
    <div
      v-if="showConfirmResetModal"
      class="fixed inset-0 bg-gray-600 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div class="p-6 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-800 flex items-center">
            <i class="fas fa-exclamation-triangle text-yellow-500 mr-2"></i>
            Reset Top Candidates Selection
          </h3>
        </div>

        <div class="p-6">
          <p class="text-gray-600 mb-4">
            Are you sure you want to reset the top candidates selection for
            <strong>{{ selectedStage?.name }}</strong
            >?
          </p>
          <p class="text-sm text-red-600 bg-red-50 p-3 rounded">
            <i class="fas fa-warning mr-1"></i>
            This will reactivate all candidates and clear the current selection.
            This action cannot be undone.
          </p>
        </div>

        <div
          class="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3"
        >
          <button
            @click="showConfirmResetModal = false"
            class="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
            :disabled="loading"
          >
            <i class="fas fa-times mr-1"></i>
            Cancel
          </button>
          <button
            @click="confirmResetTopCandidates"
            class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            :disabled="loading"
          >
            <i v-if="loading" class="fas fa-spinner fa-spin mr-2"></i>
            <i v-else class="fas fa-check mr-2"></i>
            {{ loading ? "Resetting..." : "Confirm Reset" }}
          </button>
        </div>
      </div>
    </div>

    <!-- Confirm Select Top Candidates Modal -->
    <div
      v-if="showConfirmSelectModal"
      class="fixed inset-0 bg-gray-600 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div class="p-6 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-800 flex items-center">
            <i class="fas fa-trophy text-yellow-500 mr-2"></i>
            Confirm Top Candidates Selection
          </h3>
        </div>

        <div class="p-6">
          <p class="text-gray-600 mb-4">
            Are you sure you want to select the top
            <strong>{{ topCandidatesCount }}</strong> candidates for
            <strong>{{ selectedStage?.name }}</strong
            >?
          </p>
          <div
            v-if="isStandardDivision"
            class="text-sm text-blue-600 bg-blue-50 p-3 rounded"
          >
            <i class="fas fa-info-circle mr-1"></i>
            This will advance {{ topCandidatesCount / 2 }} male and
            {{ topCandidatesCount / 2 }} female candidates to the next stage.
          </div>
          <div v-else class="text-sm text-blue-600 bg-blue-50 p-3 rounded">
            <i class="fas fa-info-circle mr-1"></i>
            This will advance {{ topCandidatesCount }}
            {{ eventDivision === "male-only" ? "male" : "female" }} candidates
            to the next stage.
          </div>
        </div>

        <div
          class="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3"
        >
          <button
            @click="showConfirmSelectModal = false"
            class="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
            :disabled="loading"
          >
            <i class="fas fa-times mr-1"></i>
            Cancel
          </button>
          <button
            @click="confirmSelectTopCandidates"
            class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            :disabled="loading"
          >
            <i v-if="loading" class="fas fa-spinner fa-spin mr-2"></i>
            <i v-else class="fas fa-check mr-2"></i>
            {{ loading ? "Selecting..." : "Confirm Selection" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
