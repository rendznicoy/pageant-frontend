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
      console.log(
        `Stage ${stage.id} hasSelectedTopCandidates:`,
        hasSelectedTopCandidates.value[stage.id]
      );
    });

    // Set initial current candidate
    const activeCategories = stages.value
      .flatMap((stage) => stage.categories ?? [])
      .filter((cat) => cat.status === "active");

    if (
      activeCategories.length > 0 &&
      activeCategories[0].current_candidate_id
    ) {
      currentCandidateId.value = activeCategories[0].current_candidate_id;
    }

    console.log(
      "→ Set pendingScoresMap during fetchStages:",
      pendingScoresMap.value
    );
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
  const males = partialResults.value.filter(
    (c) => c.sex?.toLowerCase() === "m" || c.sex?.toLowerCase() === "M"
  );
  const females = partialResults.value.filter(
    (c) => c.sex?.toLowerCase() === "f" || c.sex?.toLowerCase() === "F"
  );

  console.log(
    "Filtered MALES:",
    males.length,
    males.map((c) => c.candidate?.first_name)
  );
  console.log(
    "Filtered FEMALES:",
    females.length,
    females.map((c) => c.candidate?.first_name)
  );

  console.log(
    "RAW partialResults response:",
    JSON.stringify(partialResults.value, null, 2)
  );

  const requiredPerSex = topCandidatesCount.value / 2;

  if (males.length < requiredPerSex || females.length < requiredPerSex) {
    toast.error(
      `Not enough candidates. You need at least ${requiredPerSex} males and ${requiredPerSex} females with confirmed scores.`
    );
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
    const debouncedFetchStages = debounce(fetchStages, 10000);

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
                    if (lastStage?.id === stage.id) {
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
                    v-if="['active', 'finalized'].includes(category.status)"
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

                  <!-- only show that hint if category is still pending or stage isn’t active -->
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
                  <!-- if category.status==='finalized', nothing gets shown here (you’ll have your Reset button above) -->
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
                {{ result.candidate?.first_name }}
                {{ result.candidate?.last_name }} (#{{
                  result.candidate?.candidate_number
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
