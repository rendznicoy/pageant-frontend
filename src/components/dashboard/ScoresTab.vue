// ScoresTab.vue
<script setup>
import { ref, onMounted, onUnmounted, computed } from "vue";
import { useToast } from "vue-toastification";
import axiosClient from "@/axios";

const props = defineProps({
  eventId: {
    type: [String, Number],
    required: true,
  },
});

let interval = null;

const toast = useToast();
const scores = ref([]);
const stages = ref([]);
const loading = ref(false);
const selectedStage = ref("all");
const selectedCategory = ref("all");
const selectedCandidate = ref("all");
const selectedJudge = ref("all");
const eventMaxScore = ref(100);
const isDarkMode = ref(false);

// Pagination
const currentPage = ref(1);
const itemsPerPage = ref(20);

// Dark mode initialization
const initializeDarkMode = () => {
  const savedDarkMode = localStorage.getItem("darkMode");
  if (savedDarkMode === "true") {
    isDarkMode.value = true;
    document.documentElement.classList.add("dark");
  } else if (savedDarkMode === "false") {
    isDarkMode.value = false;
    document.documentElement.classList.remove("dark");
  } else {
    const systemPrefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    isDarkMode.value = systemPrefersDark;
    if (systemPrefersDark) {
      document.documentElement.classList.add("dark");
    }
  }
};

const fetchScores = async () => {
  if (!props.eventId) {
    toast.error("Missing event ID.");
    return;
  }

  loading.value = true;
  try {
    const [scoresData, stagesData, eventData] = await Promise.all([
      axiosClient.get(`/api/v1/events/${props.eventId}/scores`),
      axiosClient.get(`/api/v1/events/${props.eventId}/stages`),
      axiosClient.get(`/api/v1/events/${props.eventId}`),
    ]);

    console.log("Raw scores data:", scoresData);
    console.log("Raw stages data:", stagesData);
    console.log("Raw event data:", eventData);

    // Since axios interceptor unwraps response.data, the data is already unwrapped
    // Extract event max score
    eventMaxScore.value =
      eventData?.max_score || eventData?.global_max_score || 100;

    // Handle scores data - axios interceptor already unwrapped response.data
    if (Array.isArray(scoresData)) {
      scores.value = scoresData;
    } else if (scoresData && Array.isArray(scoresData.data)) {
      scores.value = scoresData.data;
    } else if (
      scoresData &&
      scoresData.scores &&
      Array.isArray(scoresData.scores)
    ) {
      scores.value = scoresData.scores;
    } else {
      scores.value = [];
      console.warn("Unexpected scores data structure:", scoresData);
    }

    // Handle stages data - axios interceptor already unwrapped response.data
    if (Array.isArray(stagesData)) {
      stages.value = stagesData;
    } else if (stagesData && Array.isArray(stagesData.data)) {
      stages.value = stagesData.data;
    } else if (
      stagesData &&
      stagesData.stages &&
      Array.isArray(stagesData.stages)
    ) {
      stages.value = stagesData.stages;
    } else {
      stages.value = [];
      console.warn("Unexpected stages data structure:", stagesData);
    }

    console.log("Processed scores:", scores.value);
    console.log("Processed stages:", stages.value);
    console.log("Sample score structure:", scores.value[0]);
    console.log("Sample stage structure:", stages.value[0]);
    console.log("Event max score:", eventMaxScore.value);

    // Reset to first page when data changes
    currentPage.value = 1;

    if (!scores.value.length) {
      toast.info("No scores available yet.");
    }
  } catch (error) {
    console.error("Error fetching data:", error);
    toast.error(
      error.response?.data?.message || error?.message || "Failed to load data."
    );
  } finally {
    loading.value = false;
  }
};

const getScoreColorClass = (score) => {
  const maxScore = eventMaxScore.value;
  const percentage = (score / maxScore) * 100;

  if (percentage < 60) {
    return isDarkMode.value
      ? "bg-red-800 text-red-200"
      : "bg-red-100 text-red-800";
  }
  if (percentage >= 60 && percentage < 80) {
    return isDarkMode.value
      ? "bg-yellow-800 text-yellow-200"
      : "bg-yellow-100 text-yellow-800";
  }
  return isDarkMode.value
    ? "bg-green-800 text-green-200"
    : "bg-green-100 text-green-800";
};

const filteredScores = computed(() => {
  let filtered = scores.value;

  console.log("=== FILTERING DEBUG ===");
  console.log("Total scores:", filtered.length);
  console.log("Selected filters:", {
    stage: selectedStage.value,
    category: selectedCategory.value,
    candidate: selectedCandidate.value,
    judge: selectedJudge.value,
  });

  // Log sample score structure for debugging
  if (filtered.length > 0) {
    console.log("Sample score structure:", {
      score: filtered[0],
      stage_id_direct: filtered[0].stage_id,
      stage_object: filtered[0].stage,
      category_object: filtered[0].category,
      candidate_object: filtered[0].candidate,
      judge_object: filtered[0].judge,
    });
  }

  if (selectedStage.value !== "all") {
    const stageId = selectedStage.value;
    console.log("Filtering by stage:", stageId);

    filtered = filtered.filter((score) => {
      // Try multiple ways to get stage ID
      const scoreStageId =
        score.stage_id ||
        score.stage?.stage_id ||
        score.stage?.id ||
        score.category?.stage_id ||
        score.category?.stage?.stage_id ||
        score.category?.stage?.id;

      const match = String(scoreStageId) === String(stageId);

      if (!match && process.env.NODE_ENV === "development") {
        console.log("Stage filter mismatch:", {
          scoreStageId,
          selectedStageId: stageId,
          score_keys: Object.keys(score),
          category_keys: score.category ? Object.keys(score.category) : null,
        });
      }

      return match;
    });
    console.log("After stage filter:", filtered.length);
  }

  if (selectedCategory.value !== "all") {
    const categoryId = selectedCategory.value;
    console.log("Filtering by category:", categoryId);

    filtered = filtered.filter((score) => {
      const scoreCategoryId =
        score.category_id || score.category?.category_id || score.category?.id;
      const match = String(scoreCategoryId) === String(categoryId);

      if (!match && process.env.NODE_ENV === "development") {
        console.log("Category filter mismatch:", {
          scoreCategoryId,
          selectedCategoryId: categoryId,
        });
      }

      return match;
    });
    console.log("After category filter:", filtered.length);
  }

  if (selectedCandidate.value !== "all") {
    const candidateId = selectedCandidate.value;
    console.log("Filtering by candidate:", candidateId);

    filtered = filtered.filter((score) => {
      const scoreCandidateId =
        score.candidate_id || score.candidate?.candidate_id;
      const match = String(scoreCandidateId) === String(candidateId);

      if (!match && process.env.NODE_ENV === "development") {
        console.log("Candidate filter mismatch:", {
          scoreCandidateId,
          selectedCandidateId: candidateId,
        });
      }

      return match;
    });
    console.log("After candidate filter:", filtered.length);
  }

  if (selectedJudge.value !== "all") {
    const judgeId = selectedJudge.value;
    console.log("Filtering by judge:", judgeId);

    filtered = filtered.filter((score) => {
      const scoreJudgeId = score.judge_id || score.judge?.judge_id;
      const match = String(scoreJudgeId) === String(judgeId);

      if (!match && process.env.NODE_ENV === "development") {
        console.log("Judge filter mismatch:", {
          scoreJudgeId,
          selectedJudgeId: judgeId,
        });
      }

      return match;
    });
    console.log("After judge filter:", filtered.length);
  }

  console.log("Final filtered scores:", filtered.length);
  console.log("=== END FILTERING DEBUG ===");

  return filtered;
});

// Paginated scores
const paginatedScores = computed(() => {
  const startIndex = (currentPage.value - 1) * itemsPerPage.value;
  const endIndex = startIndex + itemsPerPage.value;
  return filteredScores.value.slice(startIndex, endIndex);
});

// Pagination computed properties
const totalPages = computed(() => {
  return Math.ceil(filteredScores.value.length / itemsPerPage.value);
});

const paginationRange = computed(() => {
  const current = currentPage.value;
  const total = totalPages.value;
  const delta = 2;
  const range = [];

  for (
    let i = Math.max(2, current - delta);
    i <= Math.min(total - 1, current + delta);
    i++
  ) {
    range.push(i);
  }

  if (current - delta > 2) {
    range.unshift("...");
  }
  if (current + delta < total - 1) {
    range.push("...");
  }

  range.unshift(1);
  if (total > 1) {
    range.push(total);
  }

  return range;
});

// Pagination methods
const goToPage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
    // Scroll to top when changing pages
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
};

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    goToPage(currentPage.value + 1);
  }
};

const prevPage = () => {
  if (currentPage.value > 1) {
    goToPage(currentPage.value - 1);
  }
};

const scoresByStage = computed(() => {
  const grouped = {};

  paginatedScores.value.forEach((score) => {
    // Use the same logic as filtering to get stage_id
    const stageId =
      score.stage_id ||
      score.stage?.stage_id ||
      score.stage?.id ||
      score.category?.stage_id ||
      score.category?.stage?.stage_id ||
      score.category?.stage?.id ||
      "unassigned";

    if (!grouped[stageId]) {
      grouped[stageId] = [];
    }
    grouped[stageId].push(score);
  });

  return grouped;
});

const getStageTitle = (stageId) => {
  if (stageId === "unassigned") return "Unassigned Scores";
  const stage = stages.value.find(
    (s) => String(s.stage_id || s.id) === String(stageId)
  );
  return stage ? stage.stage_name || stage.name : `Stage ${stageId}`;
};

// Fixed availableStages
const availableStages = computed(() => {
  console.log("Computing availableStages:");
  console.log("- All scores:", scores.value.length);
  console.log("- Stages:", stages.value);

  const result = stages.value.map((stage) => ({
    id: String(stage.stage_id || stage.id),
    name: stage.stage_name || stage.name,
  }));

  console.log("- Available stages result:", result);
  return result;
});

const exportScores = async () => {
  if (!scores.value.length) {
    toast.warning("No scores available yet. Cannot export CSV.", {
      timeout: 4000,
      position: "top-right",
      icon: "fas fa-exclamation-triangle",
    });
    return;
  }

  loading.value = true;
  try {
    const response = await axiosClient.get(
      `/api/v1/events/${props.eventId}/scores/export`,
      { responseType: "blob" }
    );

    const blob = new Blob([response.data || response], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `event_${props.eventId}_scores.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    toast.success("Scores exported successfully!");
  } catch (error) {
    console.error("Export error:", error);
    toast.error(error?.message || "Failed to export scores.");
  } finally {
    loading.value = false;
  }
};

const clearAllFilters = () => {
  selectedStage.value = "all";
  selectedCategory.value = "all";
  selectedCandidate.value = "all";
  selectedJudge.value = "all";
  currentPage.value = 1;
};

// Watch for filter changes to reset pagination
const resetPagination = () => {
  currentPage.value = 1;
};

onMounted(() => {
  initializeDarkMode();
  if (props.eventId) {
    fetchScores();
    interval = setInterval(fetchScores, 60000);
  }
});

onUnmounted(() => {
  if (interval) clearInterval(interval);
});
</script>

<template>
  <div
    class="space-y-6 transition-colors duration-300 min-h-screen"
    :class="isDarkMode ? 'bg-gray-900' : 'bg-gray-50'"
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
      <div class="flex justify-between items-center">
        <div class="flex items-center space-x-3">
          <div class="bg-green-500 p-3 rounded-full">
            <i class="fas fa-clipboard-list text-white text-2xl"></i>
          </div>
          <div>
            <h2
              class="text-2xl lg:text-3xl font-bold transition-colors"
              :class="isDarkMode ? 'text-white' : 'text-green-900'"
            >
              Scores Management
            </h2>
            <p
              class="text-sm transition-colors"
              :class="isDarkMode ? 'text-gray-300' : 'text-green-700'"
            >
              View and manage all scoring data (Max: {{ eventMaxScore }})
            </p>
          </div>
        </div>

        <div class="flex space-x-2">
          <button
            @click="fetchScores"
            class="flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
            :class="
              isDarkMode
                ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            "
            :disabled="loading"
          >
            <i class="fas fa-sync-alt" :class="{ 'fa-spin': loading }"></i>
            {{ loading ? "Refreshing..." : "Refresh" }}
          </button>
          <button
            @click="exportScores"
            class="flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
            :class="
              isDarkMode
                ? 'bg-green-700 hover:bg-green-600 text-green-100'
                : 'bg-green-600 text-white hover:bg-green-700'
            "
            :disabled="loading || !filteredScores.length"
          >
            <i class="fas fa-download"></i>
            {{ loading ? "Exporting..." : "Export CSV" }}
          </button>
        </div>
      </div>
    </div>

    <!-- Enhanced Filters -->
    <div
      class="rounded-lg shadow-lg p-6 transition-all duration-300"
      :class="isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'"
    >
      <h3
        class="text-lg font-semibold mb-4 flex items-center transition-colors"
        :class="isDarkMode ? 'text-white' : 'text-gray-800'"
      >
        <i
          class="fas fa-filter mr-2"
          :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'"
        ></i>
        Filter Scores
      </h3>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label
            class="block text-sm font-medium mb-1 transition-colors"
            :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'"
          >
            Filter by Stage
          </label>
          <select
            v-model="selectedStage"
            @change="resetPagination"
            class="w-full px-3 py-2 border rounded-md transition-all duration-200"
            :class="
              isDarkMode
                ? 'bg-gray-700 border-gray-600 text-white focus:border-green-500 focus:ring-green-500'
                : 'bg-white border-gray-300 text-gray-900 focus:border-green-500 focus:ring-green-500'
            "
          >
            <option value="all">All Stages</option>
            <option
              v-for="stage in availableStages"
              :key="stage.id"
              :value="stage.id"
            >
              {{ stage.name }}
            </option>
          </select>
        </div>

        <div>
          <label
            class="block text-sm font-medium mb-1 transition-colors"
            :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'"
          >
            Filter by Category
          </label>
          <select
            v-model="selectedCategory"
            @change="resetPagination"
            class="w-full px-3 py-2 border rounded-md transition-all duration-200"
            :class="
              isDarkMode
                ? 'bg-gray-700 border-gray-600 text-white focus:border-green-500 focus:ring-green-500'
                : 'bg-white border-gray-300 text-gray-900 focus:border-green-500 focus:ring-green-500'
            "
          >
            <option value="all">All Categories</option>
            <option
              v-for="category in [
                ...new Map(
                  scores.map((s) => [
                    s.category?.category_id || s.category?.id,
                    s.category,
                  ])
                ).values(),
              ].filter(Boolean)"
              :key="category.category_id || category.id"
              :value="category.category_id || category.id"
            >
              {{ category.category_name || category.name }}
            </option>
          </select>
        </div>

        <div>
          <label
            class="block text-sm font-medium mb-1 transition-colors"
            :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'"
          >
            Filter by Candidate
          </label>
          <select
            v-model="selectedCandidate"
            @change="resetPagination"
            class="w-full px-3 py-2 border rounded-md transition-all duration-200"
            :class="
              isDarkMode
                ? 'bg-gray-700 border-gray-600 text-white focus:border-green-500 focus:ring-green-500'
                : 'bg-white border-gray-300 text-gray-900 focus:border-green-500 focus:ring-green-500'
            "
          >
            <option value="all">All Candidates</option>
            <option
              v-for="candidate in [
                ...new Map(
                  scores.map((s) => [s.candidate?.candidate_id, s.candidate])
                ).values(),
              ].filter(Boolean)"
              :key="candidate.candidate_id"
              :value="candidate.candidate_id"
            >
              {{ candidate.first_name }} {{ candidate.last_name }} (#{{
                candidate.candidate_number
              }})
            </option>
          </select>
        </div>

        <div>
          <label
            class="block text-sm font-medium mb-1 transition-colors"
            :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'"
          >
            Filter by Judge
          </label>
          <select
            v-model="selectedJudge"
            @change="resetPagination"
            class="w-full px-3 py-2 border rounded-md transition-all duration-200"
            :class="
              isDarkMode
                ? 'bg-gray-700 border-gray-600 text-white focus:border-green-500 focus:ring-green-500'
                : 'bg-white border-gray-300 text-gray-900 focus:border-green-500 focus:ring-green-500'
            "
          >
            <option value="all">All Judges</option>
            <option
              v-for="judge in [
                ...new Map(
                  scores.map((s) => [s.judge?.judge_id, s.judge])
                ).values(),
              ].filter(Boolean)"
              :key="judge.judge_id"
              :value="judge.judge_id"
            >
              {{ judge.first_name }} {{ judge.last_name }}
            </option>
          </select>
        </div>
      </div>

      <!-- Clear Filters and Stats -->
      <div
        class="mt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
      >
        <div
          class="text-sm transition-colors"
          :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'"
        >
          <i class="fas fa-info-circle mr-1"></i>
          Showing {{ paginatedScores.length }} of
          {{ filteredScores.length }} scores ({{ scores.length }} total)
        </div>

        <button
          @click="clearAllFilters"
          class="px-4 py-2 rounded-md transition-all duration-200"
          :class="
            isDarkMode
              ? 'bg-gray-600 text-gray-200 hover:bg-gray-500'
              : 'bg-gray-500 text-white hover:bg-gray-600'
          "
        >
          <i class="fas fa-times mr-1"></i>
          Clear Filters
        </button>
      </div>
    </div>

    <!-- Auto-refresh indicator -->
    <div
      class="flex items-center text-sm transition-colors ml-2"
      :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'"
    >
      <i class="fas fa-sync-alt fa-spin mr-2 opacity-50"></i>
      Auto-refreshing every minute
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
            class="fas fa-clipboard-list text-lg"
          ></i>
        </div>
      </div>
      <p
        :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'"
        class="mt-4 font-medium"
      >
        Loading scores...
      </p>
    </div>

    <!-- Scores Content -->
    <div v-else-if="Object.keys(scoresByStage).length" class="space-y-6">
      <!-- Pagination Info -->
      <div
        class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 rounded-lg transition-all duration-300"
        :class="
          isDarkMode
            ? 'bg-gray-800 border border-gray-700'
            : 'bg-white shadow-md'
        "
      >
        <div
          class="text-sm transition-colors"
          :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'"
        >
          Page {{ currentPage }} of {{ totalPages }} ({{
            (currentPage - 1) * itemsPerPage + 1
          }}-{{
            Math.min(currentPage * itemsPerPage, filteredScores.length)
          }}
          of {{ filteredScores.length }} scores)
        </div>

        <div class="flex items-center space-x-1">
          <button
            @click="prevPage"
            :disabled="currentPage === 1"
            class="px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200"
            :class="
              currentPage === 1
                ? isDarkMode
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : isDarkMode
                ? 'bg-blue-700 hover:bg-blue-600 text-blue-100'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            "
          >
            <i class="fas fa-chevron-left mr-1"></i>
            Previous
          </button>

          <!-- Page numbers -->
          <template v-for="page in paginationRange" :key="page">
            <button
              v-if="page !== '...'"
              @click="goToPage(page)"
              class="px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200"
              :class="
                page === currentPage
                  ? isDarkMode
                    ? 'bg-green-700 text-green-100'
                    : 'bg-green-600 text-white'
                  : isDarkMode
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              "
            >
              {{ page }}
            </button>
            <span
              v-else
              class="px-2 py-2 text-sm"
              :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'"
            >
              ...
            </span>
          </template>

          <button
            @click="nextPage"
            :disabled="currentPage === totalPages"
            class="px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200"
            :class="
              currentPage === totalPages
                ? isDarkMode
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : isDarkMode
                ? 'bg-blue-700 hover:bg-blue-600 text-blue-100'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            "
          >
            Next
            <i class="fas fa-chevron-right ml-1"></i>
          </button>
        </div>
      </div>

      <!-- Display scores grouped by stage -->
      <div
        v-for="(stageScores, stageId) in scoresByStage"
        :key="stageId"
        class="rounded-lg shadow-lg overflow-hidden transition-all duration-300"
        :class="isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'"
      >
        <div
          class="p-6 transition-colors"
          :class="
            isDarkMode
              ? 'bg-gradient-to-r from-green-800 to-green-700 text-green-100'
              : 'bg-gradient-to-r from-green-600 to-green-700 text-white'
          "
        >
          <h3 class="text-lg font-semibold flex items-center">
            <i class="fas fa-trophy mr-2"></i>
            {{ getStageTitle(stageId) }}
            <span class="ml-2 text-sm opacity-75">
              ({{ stageScores.length }}
              {{ stageScores.length === 1 ? "score" : "scores" }})
            </span>
          </h3>
        </div>

        <div class="p-6">
          <div class="overflow-x-auto">
            <table
              class="min-w-full divide-y transition-colors"
              :class="isDarkMode ? 'divide-gray-600' : 'divide-gray-200'"
            >
              <thead
                class="transition-colors"
                :class="isDarkMode ? 'bg-gray-700' : 'bg-gray-50'"
              >
                <tr>
                  <th
                    class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors"
                    :class="isDarkMode ? 'text-gray-300' : 'text-gray-500'"
                  >
                    Candidate
                  </th>
                  <th
                    class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors"
                    :class="isDarkMode ? 'text-gray-300' : 'text-gray-500'"
                  >
                    Category
                  </th>
                  <th
                    class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors"
                    :class="isDarkMode ? 'text-gray-300' : 'text-gray-500'"
                  >
                    Judge
                  </th>
                  <th
                    class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors"
                    :class="isDarkMode ? 'text-gray-300' : 'text-gray-500'"
                  >
                    Score
                  </th>
                  <th
                    class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors"
                    :class="isDarkMode ? 'text-gray-300' : 'text-gray-500'"
                  >
                    Comments
                  </th>
                </tr>
              </thead>
              <tbody
                class="divide-y transition-colors"
                :class="
                  isDarkMode
                    ? 'bg-gray-800 divide-gray-600'
                    : 'bg-white divide-gray-200'
                "
              >
                <tr
                  v-for="score in stageScores"
                  :key="`${score.candidate_id}-${score.category_id}-${score.judge_id}`"
                  class="transition-colors hover:opacity-80"
                  :class="isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'"
                >
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div
                        class="text-sm font-medium transition-colors"
                        :class="isDarkMode ? 'text-white' : 'text-gray-900'"
                      >
                        {{ score.candidate?.first_name }}
                        {{ score.candidate?.last_name }}
                      </div>
                      <div
                        class="text-xs transition-colors"
                        :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'"
                      >
                        #{{ score.candidate?.candidate_number }} -
                        {{ score.candidate?.team }}
                      </div>
                    </div>
                  </td>
                  <td
                    class="px-6 py-4 whitespace-nowrap text-sm transition-colors"
                    :class="isDarkMode ? 'text-gray-300' : 'text-gray-900'"
                  >
                    {{
                      score.category?.category_name ||
                      score.category?.name ||
                      "Unknown Category"
                    }}
                  </td>
                  <td
                    class="px-6 py-4 whitespace-nowrap text-sm transition-colors"
                    :class="isDarkMode ? 'text-gray-300' : 'text-gray-900'"
                  >
                    {{ score.judge?.first_name }} {{ score.judge?.last_name }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <span
                      class="px-2 py-1 rounded-full text-xs"
                      :class="getScoreColorClass(score.score)"
                    >
                      {{ Number(score.score).toFixed(1) }}/{{ eventMaxScore }}
                    </span>
                  </td>
                  <td
                    class="px-6 py-4 text-sm transition-colors"
                    :class="isDarkMode ? 'text-gray-300' : 'text-gray-900'"
                  >
                    <div class="max-w-xs truncate" :title="score.comments">
                      {{ score.comments || "No comment" }}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- No Results Message -->
    <div
      v-else
      class="text-center py-16 rounded-xl transition-all duration-300"
      :class="isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-gray-50'"
    >
      <div
        class="mx-auto flex items-center justify-center h-16 w-16 rounded-full mb-4 transition-colors"
        :class="isDarkMode ? 'bg-gray-700' : 'bg-gray-100'"
      >
        <i
          class="fas fa-clipboard-list text-2xl transition-colors"
          :class="isDarkMode ? 'text-gray-400' : 'text-gray-400'"
        ></i>
      </div>
      <h3
        class="text-lg font-medium mb-2 transition-colors"
        :class="isDarkMode ? 'text-gray-200' : 'text-gray-900'"
      >
        No Scores Available
      </h3>
      <p
        class="mb-4 transition-colors"
        :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'"
      >
        {{
          filteredScores.length
            ? "No scores match your current filters."
            : "Judges haven't submitted any scores yet."
        }}
      </p>
      <button
        v-if="
          selectedStage !== 'all' ||
          selectedCategory !== 'all' ||
          selectedCandidate !== 'all' ||
          selectedJudge !== 'all'
        "
        @click="clearAllFilters"
        class="px-4 py-2 rounded-md transition-all duration-200"
        :class="
          isDarkMode
            ? 'bg-green-700 hover:bg-green-600 text-green-100'
            : 'bg-green-600 text-white hover:bg-green-700'
        "
      >
        <i class="fas fa-times mr-1"></i>
        Clear All Filters
      </button>
    </div>
  </div>
</template>
