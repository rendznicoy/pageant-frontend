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

let pusher = null;
let channel = null;

const router = useRouter();
const toast = useToast();
const stages = ref([]);
const candidates = ref([]);
const loading = ref(false);
const selectedStage = ref(null);
const selectedCategory = ref(null);
const currentCandidateId = ref(null);
const topCandidatesCount = ref(null);
const showTopCandidatesModal = ref(false);
const showConfirmSelectModal = ref(false);
const showConfirmResetModal = ref(false);
const pendingScoresMap = ref({});
const hasSelectedTopCandidates = ref({});
const eventMaxScore = ref(100);
const stageLoading = ref({});
const categoryLoading = ref({});
const candidateLoading = ref({});
const topCandidatesLoading = ref(false);
const showCandidateModal = ref(false);
const selectedCategoryForCandidate = ref(null);
const candidateSearchTerm = ref("");
const showCandidateConfirmModal = ref(false);
const selectedCandidateForConfirmation = ref(null);
const previewUrl = ref(null);
const showPreview = ref(false);

const closePreview = () => {
  if (previewUrl.value) {
    window.URL.revokeObjectURL(previewUrl.value);
    previewUrl.value = null;
  }
  showPreview.value = false;
};

// Enhanced candidate selection function
const selectCandidateFromModal = async (candidateId) => {
  const candidate = candidates.value.find(
    (c) => c.candidate_id === candidateId
  );
  selectedCandidateForConfirmation.value = {
    candidate,
    categoryId: selectedCategoryForCandidate.value.id,
    categoryName: selectedCategoryForCandidate.value.name,
  };
  showCandidateConfirmModal.value = true;
};

// Filtered candidates for search
const filteredCandidatesForSelection = computed(() => {
  if (!selectedCategoryForCandidate.value) return [];

  const available = getAvailableCandidates(
    selectedCategoryForCandidate.value.id
  );

  if (!candidateSearchTerm.value) return available;

  const searchLower = candidateSearchTerm.value.toLowerCase();
  return available.filter(
    (candidate) =>
      candidate.first_name.toLowerCase().includes(searchLower) ||
      candidate.last_name.toLowerCase().includes(searchLower) ||
      candidate.candidate_number.toString().includes(searchLower) ||
      candidate.team?.toLowerCase().includes(searchLower)
  );
});

// Function to open candidate selection modal
const openCandidateSelection = (category) => {
  selectedCategoryForCandidate.value = category;
  candidateSearchTerm.value = "";
  showCandidateModal.value = true;
};

const setButtonLoading = (element, isLoading, originalText, loadingText) => {
  if (isLoading) {
    element.disabled = true;
    element.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i>${loadingText}`;
  } else {
    element.disabled = false;
    element.innerHTML = originalText;
  }
};

const formatScore = (score) => {
  const numScore = parseFloat(score || 0);
  return numScore.toFixed(2);
};

const formatMeanRating = (rating) => {
  const numRating = parseFloat(rating || 0);
  return numRating.toFixed(2);
};

const formatMeanRank = (rank) => {
  const numRank = parseFloat(rank || 0);
  return numRank.toFixed(2);
};

const partialResults = ref([]);

const activePartialResults = computed(() =>
  partialResults.value.filter((c) => c.candidate?.is_active || c.is_active)
);

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

const fetchPartialResults = async (stageId, showToasts = true) => {
  loading.value = true;
  try {
    console.log("→ Calling partial-results-active for stage", stageId);

    const response = await axiosClient.get(
      `/api/v1/events/${props.eventId}/stages/${stageId}/partial-results-active`
    );

    const payload =
      response && typeof response === "object"
        ? "candidates" in response
          ? response
          : response.data || {}
        : {};

    const rawCandidates = Array.isArray(payload.candidates)
      ? payload.candidates
      : [];

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

    await nextTick();
  } catch (error) {
    handleError(error, "Failed to load partial results");
    partialResults.value = [];
  } finally {
    loading.value = false;
  }
};

// Redirect to Results Tab for final results
const viewFinalResults = async (stageId) => {
  // Check if there are results to preview
  if (!partialResults.value.length) {
    toast.info("No results to preview.");
    return;
  }

  loading.value = true;
  try {
    const response = await axiosClient.get(
      `/api/v1/events/${props.eventId}/results/preview`,
      {
        responseType: "blob",
      }
    );

    console.log("Preview response:", response); // Debug log

    // Handle the blob response - axios interceptor returns full response for blobs
    let blob;
    if (response.data && response.data instanceof Blob) {
      blob = response.data;
    } else if (response instanceof Blob) {
      blob = response;
    } else {
      console.error("Unexpected response format:", response);
      throw new Error("Invalid response format for PDF preview");
    }

    // Verify blob has content and correct type
    console.log("Blob size:", blob.size, "Blob type:", blob.type); // Debug log

    if (blob.size === 0) {
      throw new Error("Received empty PDF file");
    }

    // Force PDF mime type if not set
    if (!blob.type || blob.type === "application/octet-stream") {
      blob = new Blob([blob], { type: "application/pdf" });
    }

    previewUrl.value = window.URL.createObjectURL(blob);
    showPreview.value = true;
  } catch (error) {
    console.error("Preview error:", error);
    handleError(
      error,
      error.response?.data?.message ||
        "Failed to preview report: " + error.message
    );
  } finally {
    loading.value = false;
  }
};

const startStage = async (stageId) => {
  stageLoading.value[stageId] = "starting";
  try {
    const response = await axiosClient.post(
      `/api/v1/events/${props.eventId}/stages/${stageId}/start`
    );

    const msg = response?.data?.message || "Stage started.";
    toast.success(msg);

    await fetchStages();
    await fetchPartialResults(stageId, false);
  } catch (error) {
    handleError(error, "Failed to start stage");
  } finally {
    delete stageLoading.value[stageId];
  }
};

const resetStage = async (stageId) => {
  stageLoading.value[stageId] = "resetting";
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
    delete stageLoading.value[stageId];
  }
};

const finalizeStage = async (stageId) => {
  stageLoading.value[stageId] = "finalizing";
  try {
    await axiosClient.post(
      `/api/v1/events/${props.eventId}/stages/${stageId}/finalize`
    );
    toast.success("Stage finalized successfully!");
    await fetchStages();
    await fetchPartialResults(stageId, false);
  } catch (error) {
    handleError(error, "Failed to finalize stage");
  } finally {
    delete stageLoading.value[stageId];
  }
};

const startCategory = async (categoryId) => {
  categoryLoading.value[categoryId] = "starting";
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
    delete categoryLoading.value[categoryId];
  }
};

const resetCategory = async (categoryId) => {
  categoryLoading.value[categoryId] = "resetting";
  try {
    const response = await axiosClient.post(
      `/api/v1/events/${props.eventId}/categories/${categoryId}/reset`
    );

    const msg = response?.data?.message || "Category reset successfully!";
    toast.success(msg);

    // Clear scored candidates cache for this category
    clearScoredCandidatesCache(categoryId);

    await fetchStages();
  } catch (error) {
    handleError(error, "Failed to reset category");
  } finally {
    delete categoryLoading.value[categoryId];
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

    // Clear cache for this category when a new candidate is set
    clearScoredCandidatesCache(categoryId);

    await fetchStages();
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
  categoryLoading.value[categoryId] = "finalizing";
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
    delete categoryLoading.value[categoryId];
  }
};

const selectTopCandidates = async () => {
  if (!topCandidatesCount.value || topCandidatesCount.value <= 0) {
    toast.error("Please enter a valid number of top candidates.");
    return;
  }
  showConfirmSelectModal.value = true; // Show confirmation modal
};

const confirmCandidateSelection = async () => {
  const { candidate, categoryId } = selectedCandidateForConfirmation.value;
  candidateLoading.value[categoryId] = true;

  try {
    await setCandidate(categoryId, candidate.candidate_id);
    showCandidateModal.value = false;
    showCandidateConfirmModal.value = false;
    selectedCategoryForCandidate.value = null;
    selectedCandidateForConfirmation.value = null;
  } catch (error) {
    // Error already handled in setCandidate
  } finally {
    candidateLoading.value[categoryId] = false;
  }
};

const confirmSelectTopCandidates = async () => {
  if (isStandardDivision.value) {
    // Standard division requires even numbers and equal male/female split
    const males = activePartialResults.value.filter(
      (c) => c.sex?.toLowerCase() === "m" || c.sex?.toLowerCase() === "male"
    );
    const females = activePartialResults.value.filter(
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
    const availableCandidates = activePartialResults.value.length;
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
      { top_candidates_count: topCandidatesCount.value }
    );
    toast.success("Top candidates selected successfully!");
    hasSelectedTopCandidates.value[selectedStage.value.id] = true;
    showTopCandidatesModal.value = false;
    showConfirmSelectModal.value = false;
    await fetchCandidates();
    await fetchStages();
    await fetchPartialResults(selectedStage.value.id);
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
    await fetchPartialResults(selectedStage.value.id);
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

    // Check if this candidate is currently being used in any OTHER active category
    const isCurrentlyUsedElsewhere = stages.value
      .flatMap((stage) => stage.categories)
      .some(
        (cat) =>
          cat.id !== categoryId && // Different category
          cat.status === "active" && // Category is active
          cat.current_candidate_id === candidate.candidate_id // Candidate is set
      );

    if (isCurrentlyUsedElsewhere) {
      return false;
    }

    // NEW: Exclude candidates who have been fully scored in this category
    // Simple logic: if category is active/finalized and candidate is not current,
    // check if they might have been processed already
    if (category.status !== "pending") {
      const key = `${categoryId}-${candidate.candidate_id}`;
      const isScored = scoredCandidatesMap.value[key];
      if (isScored) {
        return false;
      }
    }

    return true;
  });
};

const clearScoredCandidatesCache = (categoryId = null) => {
  if (categoryId) {
    // Clear cache for specific category
    Object.keys(scoredCandidatesMap.value).forEach((key) => {
      if (key.startsWith(`${categoryId}-`)) {
        delete scoredCandidatesMap.value[key];
      }
    });
  } else {
    // Clear entire cache
    scoredCandidatesMap.value = {};
  }
};

const getCandidateDisplayText = (candidate, categoryId) => {
  const baseText = `${candidate.candidate_number} - ${candidate.first_name} ${candidate.last_name}`;

  if (isCandidateUsedElsewhere(candidate.candidate_id, categoryId)) {
    return `${baseText} (In use elsewhere)`;
  }

  return baseText;
};

const scoredCandidatesMap = ref({});

const isCandidateFullyScored = async (categoryId, candidateId) => {
  const key = `${categoryId}-${candidateId}`;

  // Check our cache first
  if (scoredCandidatesMap.value[key] !== undefined) {
    return scoredCandidatesMap.value[key];
  }

  try {
    // You could make an API call here to check if all judges have confirmed scores
    // for this candidate in this category. For now, we'll use a simpler approach.
    const category = stages.value
      .flatMap((stage) => stage.categories)
      .find((c) => c.id === categoryId);

    if (!category) return false;

    // If the category has moved to a different candidate or is finalized,
    // and this isn't the current candidate, assume it's been scored
    const isScored =
      category.status === "finalized" ||
      (category.current_candidate_id !== null &&
        category.current_candidate_id !== candidateId &&
        !hasPending(categoryId));

    // Cache the result
    scoredCandidatesMap.value[key] = isScored;
    return isScored;
  } catch (error) {
    console.warn("Error checking if candidate is fully scored:", error);
    return false;
  }
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

const maleResults = computed(() => {
  const results = partialResults.value.filter(
    (result) =>
      result.sex?.toLowerCase() === "m" || result.sex?.toLowerCase() === "male"
  );

  // Sort and assign ranks within males only
  const sorted = results.sort((a, b) => {
    if (a.mean_rank !== b.mean_rank) {
      return (a.mean_rank || 999) - (b.mean_rank || 999);
    }
    return (b.mean_rating || 0) - (a.mean_rating || 0);
  });

  return sorted.map((result, index) => ({
    ...result,
    rank: index + 1,
  }));
});

const femaleResults = computed(() => {
  const results = partialResults.value.filter(
    (result) =>
      result.sex?.toLowerCase() === "f" ||
      result.sex?.toLowerCase() === "female"
  );

  // Sort and assign ranks within females only
  const sorted = results.sort((a, b) => {
    if (a.mean_rank !== b.mean_rank) {
      return (a.mean_rank || 999) - (b.mean_rank || 999);
    }
    return (b.mean_rating || 0) - (a.mean_rating || 0);
  });

  return sorted.map((result, index) => ({
    ...result,
    rank: index + 1,
  }));
});

const previewTopCandidates = async () => {
  if (!topCandidatesCount.value || topCandidatesCount.value <= 0) {
    toast.error("Please enter a valid number of top candidates.");
    return;
  }

  loading.value = true;
  try {
    const response = await axiosClient.post(
      `/api/v1/events/${props.eventId}/stages/${selectedStage.value.id}/preview-top-candidates`,
      { top_candidates_count: topCandidatesCount.value }
    );

    const candidatesPreview = response?.data?.candidates || [];

    if (!candidatesPreview.length) {
      toast.info("No eligible candidates available for this preview.");
    } else {
      toast.success("Preview generated. Displayed below.");
      partialResults.value = candidatesPreview;
    }
  } catch (error) {
    handleError(error, "Failed to preview top candidates");
  } finally {
    loading.value = false;
  }
};

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
  if (previewUrl.value) {
    window.URL.revokeObjectURL(previewUrl.value);
  }
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

watch(showTopCandidatesModal, async (isOpen) => {
  if (isOpen && selectedStage.value?.id && topCandidatesCount.value) {
    try {
      await previewTopCandidates();
    } catch (e) {
      console.warn("Preview fetch failed:", e.message);
    }
  }
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
            <div class="flex flex-wrap gap-2">
              <button
                v-if="stage.status === 'pending' && !hasActiveStage"
                @click="startStage(stage.id)"
                class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-all duration-200 disabled:opacity-50"
                :disabled="stageLoading[stage.id]"
              >
                <i
                  v-if="stageLoading[stage.id] === 'starting'"
                  class="fas fa-spinner fa-spin mr-2"
                ></i>
                <i v-else class="fas fa-play mr-2"></i>
                {{
                  stageLoading[stage.id] === "starting"
                    ? "Starting..."
                    : "Start Stage"
                }}
              </button>
              <div v-if="stage.status === 'active'" class="flex gap-2">
                <button
                  @click="resetStage(stage.id)"
                  class="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-all duration-200 disabled:opacity-50"
                  :disabled="stageLoading[stage.id]"
                >
                  <i
                    v-if="stageLoading[stage.id] === 'resetting'"
                    class="fas fa-spinner fa-spin mr-2"
                  ></i>
                  <i v-else class="fas fa-undo mr-2"></i>
                  {{
                    stageLoading[stage.id] === "resetting"
                      ? "Resetting..."
                      : "Reset Stage"
                  }}
                </button>
                <button
                  @click="finalizeStage(stage.id)"
                  class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-all duration-200 disabled:opacity-50"
                  :disabled="stageLoading[stage.id]"
                >
                  <i
                    v-if="stageLoading[stage.id] === 'finalizing'"
                    class="fas fa-spinner fa-spin mr-2"
                  ></i>
                  <i v-else class="fas fa-check mr-2"></i>
                  {{
                    stageLoading[stage.id] === "finalizing"
                      ? "Finalizing..."
                      : "Finalize Stage"
                  }}
                </button>
              </div>
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
                class="flex justify-between items-start gap-4"
              >
                <div class="flex-1">
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
                <div class="flex flex-col gap-2 min-w-[320px]">
                  <!-- Category Action Buttons Row -->
                  <div class="flex gap-2">
                    <button
                      v-if="
                        category.status === 'pending' &&
                        stage.status === 'active' &&
                        !hasActiveCategory
                      "
                      @click="startCategory(category.id)"
                      class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-all duration-200 disabled:opacity-50"
                      :disabled="categoryLoading[category.id]"
                    >
                      <i
                        v-if="categoryLoading[category.id] === 'starting'"
                        class="fas fa-spinner fa-spin mr-2"
                      ></i>
                      <i v-else class="fas fa-play mr-2"></i>
                      {{
                        categoryLoading[category.id] === "starting"
                          ? "Starting..."
                          : "Start Category"
                      }}
                    </button>
                    <div v-if="category.status === 'active'" class="flex gap-2">
                      <button
                        @click="resetCategory(category.id)"
                        class="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-all duration-200 disabled:opacity-50"
                        :disabled="categoryLoading[category.id]"
                      >
                        <i
                          v-if="categoryLoading[category.id] === 'resetting'"
                          class="fas fa-spinner fa-spin mr-2"
                        ></i>
                        <i v-else class="fas fa-undo mr-2"></i>
                        {{
                          categoryLoading[category.id] === "resetting"
                            ? "Resetting..."
                            : "Reset Category"
                        }}
                      </button>
                      <button
                        @click="finalizeCategory(category.id)"
                        class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-all duration-200 disabled:opacity-50"
                        :disabled="categoryLoading[category.id]"
                      >
                        <i
                          v-if="categoryLoading[category.id] === 'finalizing'"
                          class="fas fa-spinner fa-spin mr-2"
                        ></i>
                        <i v-else class="fas fa-check mr-2"></i>
                        {{
                          categoryLoading[category.id] === "finalizing"
                            ? "Finalizing..."
                            : "Finalize Category"
                        }}
                      </button>
                    </div>
                  </div>

                  <!-- Candidate Selection Section -->
                  <template
                    v-if="
                      stage.status === 'active' && category.status === 'active'
                    "
                  >
                    <div class="flex flex-col space-y-2">
                      <button
                        @click="openCandidateSelection(category)"
                        :disabled="
                          isCandidateDropdownDisabled(category) ||
                          candidateLoading[category.id]
                        "
                        class="px-4 py-3 bg-white border-2 border-gray-300 rounded-lg hover:border-blue-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed min-w-[280px] text-left"
                        :class="{
                          'border-green-500 bg-green-50':
                            category.current_candidate_id &&
                            !isCandidateDropdownDisabled(category),
                          'border-red-300 bg-red-50':
                            isCandidateDropdownDisabled(category),
                          'border-gray-300 hover:border-blue-500':
                            !category.current_candidate_id &&
                            !isCandidateDropdownDisabled(category),
                        }"
                      >
                        <div class="flex items-center justify-between">
                          <div class="flex-1">
                            <div
                              v-if="category.current_candidate_id"
                              class="flex items-center"
                            >
                              <div class="flex-1">
                                <div class="font-medium text-gray-900">
                                  {{
                                    candidates.find(
                                      (c) =>
                                        c.candidate_id ===
                                        category.current_candidate_id
                                    )?.first_name
                                  }}
                                  {{
                                    candidates.find(
                                      (c) =>
                                        c.candidate_id ===
                                        category.current_candidate_id
                                    )?.last_name
                                  }}
                                </div>
                                <div class="text-sm text-gray-500">
                                  #{{
                                    candidates.find(
                                      (c) =>
                                        c.candidate_id ===
                                        category.current_candidate_id
                                    )?.candidate_number
                                  }}
                                  -
                                  {{
                                    candidates.find(
                                      (c) =>
                                        c.candidate_id ===
                                        category.current_candidate_id
                                    )?.team
                                  }}
                                </div>
                              </div>
                              <div class="ml-2">
                                <span
                                  v-if="!isCandidateDropdownDisabled(category)"
                                  class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full"
                                >
                                  ✓ Set
                                </span>
                                <span
                                  v-else
                                  class="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full"
                                >
                                  🔒 Locked
                                </span>
                              </div>
                            </div>
                            <div v-else class="text-gray-500">
                              <i class="fas fa-user-plus mr-2"></i>
                              Select Candidate
                            </div>
                          </div>
                          <div class="ml-3">
                            <i
                              v-if="candidateLoading[category.id]"
                              class="fas fa-spinner fa-spin text-blue-500"
                            ></i>
                            <i
                              v-else
                              class="fas fa-chevron-down text-gray-400"
                            ></i>
                          </div>
                        </div>
                      </button>

                      <!-- Status indicators -->
                      <div class="text-xs pl-2">
                        <p
                          v-if="hasPending(category.id)"
                          class="text-red-600 flex items-center"
                        >
                          <i class="fas fa-lock mr-1"></i>
                          Scoring in progress - selection locked
                        </p>
                        <p
                          v-else-if="category.current_candidate_id"
                          class="text-green-600 flex items-center"
                        >
                          <i class="fas fa-check-circle mr-1"></i>
                          All scores confirmed - can change candidate
                        </p>
                        <p v-else class="text-blue-600 flex items-center">
                          <i class="fas fa-info-circle mr-1"></i>
                          Ready to select candidate
                        </p>
                        <p class="text-gray-500 mt-1">
                          {{ getAvailableCandidates(category.id).length }}
                          candidates available
                        </p>
                      </div>
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
      <div
        v-if="!stages.length && !Object.keys(stageLoading).length"
        class="text-center py-10"
      >
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
            html: true,
            triggers: ['hover', 'click'],
          }"
        >
          <i class="fas fa-info-circle text-gray-400"></i>
        </span>
      </h3>

      <div
        v-if="activePartialResults.length === 0"
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
                          ).toFixed(2)
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
                          ).toFixed(2)
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
                  v-for="result in activePartialResults"
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
                        ).toFixed(2)
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
                html: true,
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
          <div v-if="activePartialResults.length" class="mb-6">
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
                              ).toFixed(2)
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
                              ).toFixed(2)
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
    <!-- Enhanced Candidate Selection Modal -->
    <div
      v-if="showCandidateModal"
      class="fixed inset-0 bg-gray-600 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50"
    >
      <div
        class="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
      >
        <div class="p-6 border-b border-gray-200">
          <div class="flex justify-between items-center">
            <h3 class="text-xl font-bold text-gray-800 flex items-center">
              <i class="fas fa-users text-blue-500 mr-2"></i>
              Select Candidate for {{ selectedCategoryForCandidate?.name }}
            </h3>
            <button
              @click="showCandidateModal = false"
              class="text-gray-400 hover:text-gray-600"
            >
              <i class="fas fa-times text-xl"></i>
            </button>
          </div>

          <!-- Search Bar -->
          <div class="mt-4">
            <div class="relative">
              <i
                class="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              ></i>
              <input
                v-model="candidateSearchTerm"
                type="text"
                placeholder="Search by name, number, or team..."
                class="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        <div class="p-6 max-h-96 overflow-y-auto">
          <div
            v-if="!filteredCandidatesForSelection.length"
            class="text-center py-8 text-gray-500"
          >
            <i class="fas fa-search text-gray-300 text-3xl mb-2"></i>
            <p>No candidates found matching your search.</p>
          </div>

          <div v-else class="grid gap-3">
            <button
              v-for="candidate in filteredCandidatesForSelection"
              :key="candidate.candidate_id"
              @click="selectCandidateFromModal(candidate.candidate_id)"
              :disabled="candidateLoading[selectedCategoryForCandidate?.id]"
              class="flex items-center p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 disabled:opacity-50 text-left"
              :class="{
                'border-green-500 bg-green-50':
                  candidate.candidate_id ===
                  selectedCategoryForCandidate?.current_candidate_id,
                'ring-2 ring-blue-200':
                  candidate.candidate_id ===
                  selectedCategoryForCandidate?.current_candidate_id,
              }"
            >
              <div class="flex-1">
                <div class="flex items-center justify-between">
                  <div>
                    <div class="font-semibold text-gray-900 flex items-center">
                      <span
                        class="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-bold mr-3"
                      >
                        #{{ candidate.candidate_number }}
                      </span>
                      {{ candidate.first_name }} {{ candidate.last_name }}
                      <span
                        v-if="
                          candidate.candidate_id ===
                          selectedCategoryForCandidate?.current_candidate_id
                        "
                        class="ml-2 text-green-600"
                      >
                        <i class="fas fa-check-circle"></i>
                      </span>
                    </div>
                    <div class="text-sm text-gray-600 mt-1">
                      <i class="fas fa-users mr-1"></i>
                      {{ candidate.team }}
                    </div>
                  </div>
                  <div class="text-right">
                    <div class="text-xs text-gray-500 uppercase tracking-wide">
                      {{ candidate.sex === "M" ? "Male" : "Female" }}
                    </div>
                  </div>
                </div>
              </div>
              <div class="ml-4">
                <i
                  v-if="candidateLoading[selectedCategoryForCandidate?.id]"
                  class="fas fa-spinner fa-spin text-blue-500"
                ></i>
                <i v-else class="fas fa-chevron-right text-gray-400"></i>
              </div>
            </button>
          </div>
        </div>

        <div
          class="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center"
        >
          <div class="text-sm text-gray-600">
            <i class="fas fa-info-circle mr-1"></i>
            {{ filteredCandidatesForSelection.length }} candidates available
          </div>
          <button
            @click="showCandidateModal = false"
            class="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
    <div
      v-if="showCandidateConfirmModal"
      class="fixed inset-0 bg-gray-600 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div class="p-6 border-b border-gray-200">
          <h3 class="text-xl font-bold text-gray-800 flex items-center">
            <i class="fas fa-exclamation-triangle text-orange-500 mr-2"></i>
            Confirm Candidate Selection
          </h3>
        </div>

        <div class="p-6">
          <div class="mb-4">
            <p class="text-gray-600 mb-3">
              Are you sure you want to select this candidate for scoring?
            </p>

            <!-- Candidate Info Card -->
            <div class="bg-gray-50 rounded-lg p-4 border-2 border-gray-200">
              <div class="flex items-center">
                <div
                  class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-bold mr-3"
                >
                  #{{
                    selectedCandidateForConfirmation?.candidate
                      ?.candidate_number
                  }}
                </div>
                <div>
                  <div class="font-semibold text-gray-900">
                    {{
                      selectedCandidateForConfirmation?.candidate?.first_name
                    }}
                    {{ selectedCandidateForConfirmation?.candidate?.last_name }}
                  </div>
                  <div class="text-sm text-gray-600">
                    {{ selectedCandidateForConfirmation?.candidate?.team }} •
                    {{
                      selectedCandidateForConfirmation?.candidate?.sex === "M"
                        ? "Male"
                        : "Female"
                    }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Category Info -->
            <div class="mt-3 text-sm text-gray-600">
              <strong>Category:</strong>
              {{ selectedCandidateForConfirmation?.categoryName }}
            </div>
          </div>

          <!-- Warning Message -->
          <div class="bg-orange-50 border-l-4 border-orange-400 p-4 mb-4">
            <div class="flex">
              <div class="flex-shrink-0">
                <i class="fas fa-lock text-orange-400 text-lg"></i>
              </div>
              <div class="ml-3">
                <p class="text-sm text-orange-800 font-medium">
                  Important: Selection Lock
                </p>
                <p class="text-sm text-orange-700 mt-1">
                  Once you confirm this selection,
                  <strong>the candidate will be locked for scoring</strong>
                  until all judges have submitted and confirmed their scores.
                  You will not be able to change the candidate during the
                  scoring process.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div
          class="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3"
        >
          <button
            @click="showCandidateConfirmModal = false"
            class="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
          >
            <i class="fas fa-times mr-1"></i>
            Cancel
          </button>
          <button
            @click="confirmCandidateSelection"
            class="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50"
            :disabled="
              candidateLoading[selectedCandidateForConfirmation?.categoryId]
            "
          >
            <i
              v-if="
                candidateLoading[selectedCandidateForConfirmation?.categoryId]
              "
              class="fas fa-spinner fa-spin mr-2"
            ></i>
            <i v-else class="fas fa-lock mr-2"></i>
            {{
              candidateLoading[selectedCandidateForConfirmation?.categoryId]
                ? "Confirming..."
                : "Confirm & Lock Selection"
            }}
          </button>
        </div>
      </div>
    </div>
    <!-- PDF Preview Modal -->
    <div
      v-if="showPreview"
      class="fixed inset-0 bg-gray-600 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50"
    >
      <div
        class="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden"
      >
        <div
          class="p-4 border-b border-gray-200 flex justify-between items-center"
        >
          <h3 class="text-xl font-bold text-gray-800 flex items-center">
            <i class="fas fa-file-pdf text-red-500 mr-2"></i>
            Final Results Preview
          </h3>
          <button
            @click="closePreview"
            class="text-gray-400 hover:text-gray-600 text-xl"
          >
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="p-4 h-[80vh]">
          <iframe
            v-if="previewUrl"
            :src="previewUrl"
            class="w-full h-full border-0 rounded"
            title="PDF Preview"
          ></iframe>
          <div v-else class="flex items-center justify-center h-full">
            <i class="fas fa-spinner fa-spin text-3xl text-gray-400"></i>
          </div>
        </div>

        <div
          class="px-4 py-3 bg-gray-50 border-t border-gray-200 flex justify-end"
        >
          <button
            @click="closePreview"
            class="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
          >
            <i class="fas fa-times mr-1"></i>
            Close Preview
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
