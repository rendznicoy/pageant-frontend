<script setup>
import { ref, onMounted, onUnmounted, computed } from "vue";
import { useToast } from "vue-toastification";
import axiosClient from "@/axios";
import { useEventStore } from "@/stores/event";

let interval = null;

const { eventId, stageId } = defineProps(["eventId", "stageId"]);

const toast = useToast();
const finalResults = ref([]);
const finalJudges = ref([]);
const loading = ref(false);
const exporting = ref(false);
const showPreview = ref(false);
const previewUrl = ref("");
const stages = ref([]);
const partialResultsByStage = ref({});
const judgesByStage = ref({});
const eventMaxScore = ref(100);
const categoryResults = ref({});
const isDarkMode = ref(false);
const eventStore = useEventStore();

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

// New: All candidates with confirmed scores regardless of active status
const allPartialResults = ref({});

// Whole-page pagination
const currentPage = ref(1);
const itemsPerPage = ref(1); // Show 1 section per page

const allSections = computed(() => {
  const sections = [];

  if (finalResults.value.length > 0) {
    sections.push({
      type: "final",
      title: "Final Results",
      data: finalResults.value,
      judges: finalJudges.value,
    });
  }

  Object.entries(categoryResults.value).forEach(([stageId, stageData]) => {
    if (stageData?.categories?.length > 0) {
      const stage = stages.value.find(
        (s) => (s.id || s.stage_id).toString() === stageId.toString()
      );
      sections.push({
        type: "category",
        title: `Category Results – ${
          stage?.name || stage?.stage_name || "Unknown Stage"
        }`,
        stageId: stageId,
        data: stageData.categories,
      });
    }
  });

  Object.entries(partialResultsByStage.value).forEach(
    ([stageId, stageData]) => {
      if (stageData?.males?.length > 0 || stageData?.females?.length > 0) {
        const stage = stages.value.find(
          (s) => (s.id || s.stage_id).toString() === stageId.toString()
        );
        sections.push({
          type: "stage",
          title: `Stage Results – ${
            stage?.name || stage?.stage_name || "Unknown Stage"
          }`,
          stageId: stageId,
          data: stageData,
        });
      }
    }
  );

  // Append the All Candidates Section
  if (
    allPartialResults.value?.males?.length ||
    allPartialResults.value?.females?.length
  ) {
    sections.push({
      type: "all",
      title: "All Candidates (Confirmed Scores)",
      data: allPartialResults.value,
    });
  }

  return sections;
});

const totalPages = computed(() => allSections.value.length);

const currentSection = computed(() => {
  return allSections.value[currentPage.value - 1] || null;
});

// Navigation functions
const goToPage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
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

//  Auto-refresh functionality
const startAutoRefresh = () => {
  if (interval) clearInterval(interval);
  interval = setInterval(async () => {
    if (eventId) {
      console.log("Auto-refreshing results...");
      // Remove loading indicators for auto-refresh
      try {
        await fetchFinalResults();
        await fetchAllPartialResults();
        await fetchCategoryResults();
      } catch (error) {
        console.error("Auto-refresh error:", error);
        // Don't show toast errors for auto-refresh
      }
    }
  }, 30000);
};

const stopAutoRefresh = () => {
  if (interval) {
    clearInterval(interval);
    interval = null;
  }
};

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

//  CSV Export
const exportResultsCSV = async () => {
  if (!finalResults.value.length && !finalJudges.value.length) {
    toast.info("No results to export.");
    return;
  }

  exporting.value = true;
  try {
    const csvData = [];
    const headers = [
      "Candidate Number",
      "Candidate Name",
      "Team",
      "Sex",
      "Mean Rating",
      "Mean Rank", // Add Mean Rank column
      "Overall Rank",
    ];
    csvData.push(headers);

    // Use the same ranking logic as the display
    const { males: maleResults, females: femaleResults } = rankBySex(
      finalResults.value,
      true
    );

    if (maleResults.length > 0) {
      csvData.push(["=== MALE CANDIDATES ==="]);
      maleResults.forEach((result) => {
        const row = [
          result.candidate.candidate_number,
          `${result.candidate.first_name} ${result.candidate.last_name}`,
          result.candidate.team || "N/A",
          "Male",
          parseFloat(result.mean_rating || result.raw_average || 0).toFixed(2), // Ensure 2 decimal places
          parseFloat(result.mean_rank || 0).toFixed(2), // Add mean rank with 2 decimal places
          result.rank || result.overall_rank || "N/A",
        ];
        csvData.push(row);
      });
    }

    if (femaleResults.length > 0) {
      csvData.push([""]);
      csvData.push(["=== FEMALE CANDIDATES ==="]);
      femaleResults.forEach((result) => {
        const row = [
          result.candidate.candidate_number,
          `${result.candidate.first_name} ${result.candidate.last_name}`,
          result.candidate.team || "N/A",
          "Female",
          parseFloat(result.mean_rating || result.raw_average || 0).toFixed(2), // Ensure 2 decimal places
          parseFloat(result.mean_rank || 0).toFixed(2), // Add mean rank with 2 decimal places
          result.rank || result.overall_rank || "N/A",
        ];
        csvData.push(row);
      });
    }

    const csvContent = csvData
      .map((row) =>
        row
          .map((field) =>
            typeof field === "string" && field.includes(",")
              ? `"${field.replace(/"/g, '""')}"`
              : field
          )
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `event_${eventId}_results.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    toast.success("Results exported successfully!");
  } catch (error) {
    console.error("Export error:", error);
    toast.error("Failed to export results: " + error.message);
  } finally {
    exporting.value = false;
  }
};

// Manual refresh function
const refreshResults = async () => {
  let hasErrors = false;
  const errors = [];

  try {
    await fetchFinalResults();
  } catch (error) {
    hasErrors = true;
    errors.push("final results");
    console.error("Error fetching final results:", error);
  }

  try {
    await fetchAllPartialResults();
  } catch (error) {
    hasErrors = true;
    errors.push("partial results");
    console.error("Error fetching partial results:", error);
  }

  try {
    await fetchCategoryResults();
  } catch (error) {
    hasErrors = true;
    errors.push("category results");
    console.error("Error fetching category results:", error);
  }

  if (hasErrors) {
    toast.error(
      `Failed to refresh: ${errors.join(", ")}. Check console for details.`
    );
  } else {
    toast.success("Results refreshed!");
  }
};

// Ranking function
const rankBySex = (candidates = [], useCorrectLogic = true) => {
  if (!useCorrectLogic) {
    const males = candidates.filter((c) => c.sex?.toLowerCase() === "m");
    const females = candidates.filter((c) => c.sex?.toLowerCase() === "f");
    return { males, females };
  }

  // 🔥 Fix: include all candidates regardless of is_active
  const visibleCandidates = candidates;

  const males = visibleCandidates.filter((c) => c.sex?.toLowerCase() === "m");
  const females = visibleCandidates.filter((c) => c.sex?.toLowerCase() === "f");

  // Sort by mean_rank (ascending), then mean_rating (descending)
  const sortedMales = males
    .sort((a, b) => {
      if ((a.mean_rank || 999) === (b.mean_rank || 999)) {
        return (b.mean_rating || 0) - (a.mean_rating || 0);
      }
      return (a.mean_rank || 999) - (b.mean_rank || 999);
    })
    .map((candidate, index) => ({
      ...candidate,
      rank: index + 1,
    }));

  const sortedFemales = females
    .sort((a, b) => {
      if ((a.mean_rank || 999) === (b.mean_rank || 999)) {
        return (b.mean_rating || 0) - (a.mean_rating || 0);
      }
      return (a.mean_rank || 999) - (b.mean_rank || 999);
    })
    .map((candidate, index) => ({
      ...candidate,
      rank: index + 1,
    }));

  return { males: sortedMales, females: sortedFemales };
};

// Score color logic
const getScoreColorClass = (score, isWeightedScore = true) => {
  if (isWeightedScore) {
    // For weighted scores, use different thresholds
    if (score < 60)
      return isDarkMode.value
        ? "bg-red-800 text-red-200"
        : "bg-red-100 text-red-800";
    if (score >= 60 && score < 80)
      return isDarkMode.value
        ? "bg-yellow-800 text-yellow-200"
        : "bg-yellow-100 text-yellow-800";
    return isDarkMode.value
      ? "bg-green-800 text-green-200"
      : "bg-green-100 text-green-800";
  } else {
    // For category scores, use percentage-based thresholds
    const percentage = (score / eventMaxScore.value) * 100;
    if (percentage < 60)
      return isDarkMode.value
        ? "bg-red-800 text-red-200"
        : "bg-red-100 text-red-800";
    if (percentage >= 60 && percentage < 80)
      return isDarkMode.value
        ? "bg-yellow-800 text-yellow-200"
        : "bg-yellow-100 text-yellow-800";
    return isDarkMode.value
      ? "bg-green-800 text-green-200"
      : "bg-green-100 text-green-800";
  }
};

// Fetch category results with better error handling
const fetchCategoryResults = async () => {
  if (!eventId) return;

  try {
    // Wait for stages to be loaded first
    if (!stages.value.length) {
      await fetchAllPartialResults();
    }

    const promises = stages.value.map(async (stage) => {
      const stageId = stage.id || stage.stage_id;
      try {
        const categoryRes = await axiosClient.get(
          `/api/v1/events/${eventId}/stages/${stageId}/category-results`
        );

        // Fix: Handle response consistently
        categoryResults.value[stageId] = categoryRes.data || categoryRes;
      } catch (stageError) {
        console.error(
          `Error fetching category results for stage ${stageId}:`,
          stageError
        );
      }
    });

    await Promise.all(promises);
  } catch (error) {
    console.error("Error fetching category results:", error);
  }
};

// Partial results fetching
const fetchAllPartialResults = async () => {
  if (!eventId) return;

  try {
    const eventResponse = await axiosClient.get(`/api/v1/events/${eventId}`);
    const eventData = eventResponse;
    eventMaxScore.value =
      eventData.max_score || eventData.global_max_score || 100;

    const res = await axiosClient.get(`/api/v1/events/${eventId}/stages`);
    stages.value = Array.isArray(res.data)
      ? res.data
      : res.data?.data || res || [];

    for (const stage of stages.value) {
      const stageId = stage.id || stage.stage_id;

      // Use the permanent results endpoint for Results Tab
      const partial = await axiosClient.get(
        `/api/v1/events/${eventId}/stages/${stageId}/partial-results-permanent`
      );

      const partialData = partial.data
        ? partial
        : { data: { candidates: partial.candidates || partial } };
      const candidates =
        partialData.data?.candidates || partialData.candidates || [];

      const { males, females } = rankBySex(candidates, true);
      partialResultsByStage.value[stageId] = { males, females };
      judgesByStage.value[stageId] =
        partialData.data?.judges || partialData.judges || [];
    }
  } catch (e) {
    console.error("Error fetching partial results:", e);
  }
};

// e5e7eb final results
const fetchFinalResults = async () => {
  if (!eventId) {
    throw new Error("Missing event ID");
  }

  loading.value = true;
  try {
    const eventResponse = await axiosClient.get(`/api/v1/events/${eventId}`);

    // Fix: Handle axios interceptor unwrapping consistently
    const eventData = eventResponse; // axios interceptor already unwrapped it
    eventMaxScore.value =
      eventData.max_score || eventData.global_max_score || 100;

    const data = await axiosClient.get(
      `/api/v1/events/${eventId}/scores/final-results`
    );

    // Handle final results response
    finalResults.value = Array.isArray(data?.candidates) ? data.candidates : [];
    finalJudges.value = Array.isArray(data?.judges) ? data.judges : [];

    if (!finalResults.value.length) {
      console.info("No final results available yet.");
    }
  } catch (error) {
    console.error("Error fetching final results:", error);
    throw error;
  } finally {
    loading.value = false;
  }
};

// PDF functions
// Replace both downloadReport and previewReport functions in ResultsTab.vue:

const downloadReport = async () => {
  if (!finalResults.value.length) {
    toast.info("No results to download.");
    return;
  }

  loading.value = true;
  try {
    const response = await axiosClient.get(`/api/v1/events/${eventId}/report`, {
      responseType: "blob",
    });

    console.log("Download response:", response); // Debug log

    // Handle the blob response - axios interceptor returns full response for blobs
    let blob;
    if (response.data && response.data instanceof Blob) {
      blob = response.data;
    } else if (response instanceof Blob) {
      blob = response;
    } else {
      console.error("Unexpected response format:", response);
      throw new Error("Invalid response format for PDF download");
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

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `event_${eventId}_report.pdf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    toast.success("Report downloaded successfully!");
  } catch (error) {
    console.error("Download error:", error);
    toast.error(
      error.response?.data?.message ||
        "Failed to download report: " + error.message
    );
  } finally {
    loading.value = false;
  }
};

const previewReport = async () => {
  if (!finalResults.value.length) {
    toast.info("No results to preview.");
    return;
  }

  loading.value = true;
  try {
    const response = await axiosClient.get(
      `/api/v1/events/${eventId}/results/preview`,
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
    toast.error(
      error.response?.data?.message ||
        "Failed to preview report: " + error.message
    );
  } finally {
    loading.value = false;
  }
};

const closePreview = () => {
  showPreview.value = false;
  if (previewUrl.value) {
    window.URL.revokeObjectURL(previewUrl.value);
    previewUrl.value = "";
  }
};

onMounted(async () => {
  initializeDarkMode();
  if (eventId) {
    loading.value = true;
    try {
      await Promise.all([fetchFinalResults(), fetchAllPartialResults()]);
      await fetchCategoryResults();
    } catch (error) {
      console.error("Error during initial load:", error);
    } finally {
      loading.value = false;
    }
    startAutoRefresh();
  }
});

onUnmounted(() => {
  stopAutoRefresh();
});
</script>

<template>
  <div
    class="space-y-8 transition-colors duration-300 min-h-screen"
    :class="isDarkMode ? 'bg-gray-900' : 'bg-gray-50'"
  >
    <!-- Header with Navigation -->
    <div
      class="rounded-xl shadow-lg p-6 transition-all duration-300"
      :class="
        isDarkMode
          ? 'bg-gray-800 border border-gray-700'
          : 'bg-gradient-to-r from-green-50 to-emerald-50'
      "
    >
      <!-- Header controls -->
      <div
        class="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-6 space-y-4 lg:space-y-0"
      >
        <div class="flex items-center space-x-3">
          <div class="bg-yellow-500 p-3 rounded-full">
            <i class="fas fa-trophy text-white text-2xl"></i>
          </div>
          <div>
            <h2
              class="text-2xl lg:text-3xl font-bold transition-colors"
              :class="isDarkMode ? 'text-white' : 'text-green-900'"
            >
              {{ currentSection?.title || "Results" }}
            </h2>
            <p
              class="text-sm transition-colors"
              :class="isDarkMode ? 'text-gray-300' : 'text-green-700'"
            >
              (Max Score: {{ eventMaxScore }})
            </p>
          </div>
        </div>

        <!-- Action buttons -->
        <!-- Action buttons -->
        <div class="flex flex-row gap-2 flex-wrap sm:flex-nowrap">
          <button
            @click="refreshResults"
            class="flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-all duration-200 shadow-md hover:shadow-lg whitespace-nowrap"
            :class="
              isDarkMode
                ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                : 'bg-gray-600 text-white hover:bg-gray-700'
            "
            :disabled="loading"
          >
            <i class="fas fa-sync-alt" :class="{ 'fa-spin': loading }"></i>
            {{ loading ? "Refreshing..." : "Refresh" }}
          </button>

          <button
            @click="exportResultsCSV"
            class="flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-all duration-200 shadow-md hover:shadow-lg whitespace-nowrap"
            :class="
              isDarkMode
                ? 'bg-purple-700 hover:bg-purple-600 text-purple-100'
                : 'bg-purple-600 text-white hover:bg-purple-700'
            "
            :disabled="exporting || !finalResults.length"
          >
            <i class="fas fa-file-csv" :class="{ 'fa-spin': exporting }"></i>
            {{ exporting ? "Exporting..." : "Export CSV" }}
          </button>

          <button
            @click="previewReport"
            class="flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-all duration-200 shadow-md hover:shadow-lg whitespace-nowrap"
            :class="
              isDarkMode
                ? 'bg-blue-700 hover:bg-blue-600 text-blue-100'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            "
            :disabled="loading || !eventId"
          >
            <i class="fas fa-eye"></i>
            {{ loading ? "Loading..." : "Preview PDF" }}
          </button>

          <button
            @click="downloadReport"
            class="flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-all duration-200 shadow-md hover:shadow-lg whitespace-nowrap"
            :class="
              isDarkMode
                ? 'bg-green-700 hover:bg-green-600 text-green-100'
                : 'bg-green-700 text-white hover:bg-green-800'
            "
            :disabled="loading || !eventId"
          >
            <i class="fas fa-download"></i>
            {{ loading ? "Downloading..." : "Download PDF" }}
          </button>
        </div>
      </div>

      <!-- Auto-refresh indicator -->
      <div
        class="flex items-center text-sm mb-4 transition-colors"
        :class="isDarkMode ? 'text-gray-400' : 'text-green-600'"
      >
        <i class="fas fa-sync-alt fa-spin mr-2 opacity-50"></i>
        Auto-refreshing every 30 seconds
      </div>

      <!-- Page Navigation -->
      <div
        v-if="totalPages > 1"
        class="flex justify-between items-center py-4 border-t transition-colors"
        :class="isDarkMode ? 'border-gray-600' : 'border-gray-300'"
      >
        <div
          class="text-sm transition-colors"
          :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'"
        >
          Showing {{ currentPage }} of {{ totalPages }} sections
        </div>

        <div class="flex items-center space-x-2">
          <button
            @click="prevPage"
            :disabled="currentPage === 1"
            class="flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200"
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
            <i class="fas fa-chevron-left mr-2"></i>
            Previous
          </button>

          <div class="flex items-center space-x-1">
            <template v-for="page in totalPages" :key="page">
              <button
                v-if="
                  page === 1 ||
                  page === totalPages ||
                  Math.abs(page - currentPage) <= 2
                "
                @click="goToPage(page)"
                class="px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200"
                :class="
                  page === currentPage
                    ? isDarkMode
                      ? 'bg-blue-700 text-blue-100'
                      : 'bg-blue-600 text-white'
                    : isDarkMode
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                "
              >
                {{ page }}
              </button>
              <span
                v-else-if="
                  (page === 2 && currentPage > 4) ||
                  (page === totalPages - 1 && currentPage < totalPages - 3)
                "
                class="px-2 py-2 text-sm"
                :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'"
              >
                ...
              </span>
            </template>
          </div>

          <button
            @click="nextPage"
            :disabled="currentPage === totalPages"
            class="flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200"
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
            <i class="fas fa-chevron-right ml-2"></i>
          </button>
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
            class="fas fa-trophy text-lg"
          ></i>
        </div>
      </div>
      <p
        :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'"
        class="mt-4 font-medium"
      >
        Loading results...
      </p>
    </div>

    <!-- Current Section Content -->
    <div v-else-if="currentSection" class="space-y-8">
      <!-- Final Results Section -->
      <div v-if="currentSection.type === 'final'" class="space-y-8">
        <!-- Male Results -->
        <div
          class="rounded-xl shadow-lg overflow-hidden transition-all duration-300"
          :class="
            isDarkMode ? 'bg-gray-700 border border-gray-600' : 'bg-white'
          "
        >
          <div
            class="p-4 transition-colors"
            :class="
              isDarkMode
                ? 'bg-blue-800 text-blue-100'
                : 'bg-blue-600 text-white'
            "
          >
            <h3 class="text-xl font-semibold flex items-center">
              <i class="fas fa-male mr-2"></i>
              Male Candidates ({{ rankBySex(finalResults, true).males.length }})
            </h3>
          </div>

          <div class="overflow-x-auto">
            <table
              class="min-w-full divide-y transition-colors"
              :class="isDarkMode ? 'divide-gray-600' : 'divide-gray-200'"
            >
              <thead
                class="transition-colors"
                :class="isDarkMode ? 'bg-gray-600' : 'bg-gray-50'"
              >
                <tr>
                  <th
                    class="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors"
                    :class="isDarkMode ? 'text-gray-300' : 'text-gray-500'"
                  >
                    Rank
                  </th>
                  <th
                    class="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors"
                    :class="isDarkMode ? 'text-gray-300' : 'text-gray-500'"
                  >
                    Candidate
                  </th>
                  <th
                    class="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors"
                    :class="isDarkMode ? 'text-gray-300' : 'text-gray-500'"
                  >
                    Mean Rating
                  </th>
                  <th
                    class="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors"
                    :class="isDarkMode ? 'text-gray-300' : 'text-gray-500'"
                  >
                    Mean Rank
                  </th>
                </tr>
              </thead>
              <tbody
                class="divide-y transition-colors"
                :class="
                  isDarkMode
                    ? 'bg-gray-700 divide-gray-600'
                    : 'bg-white divide-gray-200'
                "
              >
                <tr
                  v-for="result in rankBySex(finalResults, true).males"
                  :key="result.candidate_id"
                  class="transition-colors hover:opacity-80"
                  :class="isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-50'"
                >
                  <td class="px-3 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                      <span
                        class="text-2xl font-bold transition-colors"
                        :class="isDarkMode ? 'text-white' : 'text-gray-900'"
                      >
                        {{ result.overall_rank || result.rank }}
                      </span>
                      <i
                        v-if="(result.overall_rank || result.rank) === 1"
                        class="fas fa-crown text-yellow-500 ml-2"
                      ></i>
                    </div>
                  </td>
                  <td class="px-3 py-4">
                    <div class="min-w-0">
                      <div
                        class="text-sm font-medium truncate transition-colors"
                        :class="isDarkMode ? 'text-white' : 'text-gray-900'"
                      >
                        {{ result.candidate.first_name }}
                        {{ result.candidate.last_name }}
                      </div>
                      <div
                        class="text-xs truncate transition-colors"
                        :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'"
                      >
                        #{{ result.candidate.candidate_number }} -
                        {{ result.candidate.team }}
                      </div>
                    </div>
                  </td>
                  <td class="px-3 py-4 whitespace-nowrap">
                    <span
                      class="px-2 py-1 rounded-full text-xs font-medium"
                      :class="getScoreColorClass(result.mean_rating, true)"
                    >
                      {{ Number(result.mean_rating || 0).toFixed(2) }}
                    </span>
                  </td>
                  <td class="px-3 py-4 whitespace-nowrap">
                    <span
                      class="text-sm transition-colors"
                      :class="isDarkMode ? 'text-gray-300' : 'text-gray-900'"
                    >
                      {{ Number(result.mean_rank || 0).toFixed(2) }}
                    </span>
                  </td>
                </tr>
                <tr v-if="!rankBySex(finalResults, true).males.length">
                  <td
                    colspan="4"
                    class="px-6 py-8 text-center transition-colors"
                    :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'"
                  >
                    No active male candidates scored yet.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Female Results -->
        <div
          class="rounded-xl shadow-lg overflow-hidden transition-all duration-300"
          :class="
            isDarkMode ? 'bg-gray-700 border border-gray-600' : 'bg-white'
          "
        >
          <div
            class="p-4 transition-colors"
            :class="
              isDarkMode
                ? 'bg-pink-800 text-pink-100'
                : 'bg-pink-600 text-white'
            "
          >
            <h3 class="text-xl font-semibold flex items-center">
              <i class="fas fa-female mr-2"></i>
              Female Candidates ({{
                rankBySex(finalResults, true).females.length
              }})
            </h3>
          </div>

          <div class="overflow-x-auto">
            <table
              class="min-w-full divide-y transition-colors"
              :class="isDarkMode ? 'divide-gray-600' : 'divide-gray-200'"
            >
              <thead
                class="transition-colors"
                :class="isDarkMode ? 'bg-gray-600' : 'bg-gray-50'"
              >
                <tr>
                  <th
                    class="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors"
                    :class="isDarkMode ? 'text-gray-300' : 'text-gray-500'"
                  >
                    Rank
                  </th>
                  <th
                    class="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors"
                    :class="isDarkMode ? 'text-gray-300' : 'text-gray-500'"
                  >
                    Candidate
                  </th>
                  <th
                    class="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors"
                    :class="isDarkMode ? 'text-gray-300' : 'text-gray-500'"
                  >
                    Mean Rating
                  </th>
                  <th
                    class="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors"
                    :class="isDarkMode ? 'text-gray-300' : 'text-gray-500'"
                  >
                    Mean Rank
                  </th>
                </tr>
              </thead>
              <tbody
                class="divide-y transition-colors"
                :class="
                  isDarkMode
                    ? 'bg-gray-700 divide-gray-600'
                    : 'bg-white divide-gray-200'
                "
              >
                <tr
                  v-for="result in rankBySex(finalResults, true).females"
                  :key="result.candidate_id"
                  class="transition-colors hover:opacity-80"
                  :class="isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-50'"
                >
                  <td class="px-3 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                      <span
                        class="text-2xl font-bold transition-colors"
                        :class="isDarkMode ? 'text-white' : 'text-gray-900'"
                      >
                        {{ result.overall_rank || result.rank }}
                      </span>
                      <i
                        v-if="(result.overall_rank || result.rank) === 1"
                        class="fas fa-crown text-yellow-500 ml-2"
                      ></i>
                    </div>
                  </td>
                  <td class="px-3 py-4">
                    <div class="min-w-0">
                      <div
                        class="text-sm font-medium truncate transition-colors"
                        :class="isDarkMode ? 'text-white' : 'text-gray-900'"
                      >
                        {{ result.candidate.first_name }}
                        {{ result.candidate.last_name }}
                      </div>
                      <div
                        class="text-xs truncate transition-colors"
                        :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'"
                      >
                        #{{ result.candidate.candidate_number }} -
                        {{ result.candidate.team }}
                      </div>
                    </div>
                  </td>
                  <td class="px-3 py-4 whitespace-nowrap">
                    <span
                      class="px-2 py-1 rounded-full text-xs font-medium"
                      :class="getScoreColorClass(result.mean_rating, true)"
                    >
                      {{ Number(result.mean_rating || 0).toFixed(2) }}
                    </span>
                  </td>
                  <td class="px-3 py-4 whitespace-nowrap">
                    <span
                      class="text-sm transition-colors"
                      :class="isDarkMode ? 'text-gray-300' : 'text-gray-900'"
                    >
                      {{ Number(result.mean_rank || 0).toFixed(2) }}
                    </span>
                  </td>
                </tr>
                <tr v-if="!rankBySex(finalResults, true).females.length">
                  <td
                    colspan="4"
                    class="px-6 py-8 text-center transition-colors"
                    :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'"
                  >
                    No active female candidates scored yet.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Category Results Section -->
      <div v-else-if="currentSection.type === 'category'" class="space-y-6">
        <div
          v-for="category in currentSection.data"
          :key="category.category_id"
          class="rounded-xl shadow-lg p-6 transition-all duration-300"
          :class="
            isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'
          "
        >
          <div class="mb-4">
            <h4
              class="text-lg font-semibold transition-colors"
              :class="isDarkMode ? 'text-white' : 'text-gray-800'"
            >
              {{ category.category_name }}
              <span
                class="text-sm font-normal transition-colors"
                :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'"
              >
                (Max: {{ category.max_score }}, Weight: {{ category.weight }}%)
              </span>
            </h4>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Male Category Results -->
            <div
              class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4"
              :class="isDarkMode ? 'from-blue-900 to-indigo-900' : ''"
            >
              <h5
                class="text-md font-semibold mb-3 flex items-center"
                :class="isDarkMode ? 'text-blue-200' : 'text-blue-800'"
              >
                <i class="fas fa-male mr-2"></i>
                Male Results ({{ category.males?.length || 0 }})
              </h5>
              <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                  <thead :class="isDarkMode ? 'bg-blue-800' : 'bg-blue-100'">
                    <tr>
                      <th
                        class="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider"
                        :class="isDarkMode ? 'text-blue-200' : 'text-blue-800'"
                      >
                        Rank
                      </th>
                      <th
                        class="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider"
                        :class="isDarkMode ? 'text-blue-200' : 'text-blue-800'"
                      >
                        Candidate
                      </th>
                      <th
                        class="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider"
                        :class="isDarkMode ? 'text-blue-200' : 'text-blue-800'"
                      >
                        Category Avg
                      </th>
                    </tr>
                  </thead>
                  <tbody
                    class="divide-y divide-gray-200"
                    :class="
                      isDarkMode ? 'bg-blue-900 divide-blue-700' : 'bg-white'
                    "
                  >
                    <tr
                      v-for="result in category.males || []"
                      :key="result.candidate_id"
                      class="hover:bg-blue-50 transition-colors"
                      :class="isDarkMode ? 'hover:bg-blue-800' : ''"
                    >
                      <td class="px-3 py-2 whitespace-nowrap">
                        <span
                          class="text-sm font-bold"
                          :class="isDarkMode ? 'text-white' : 'text-gray-900'"
                        >
                          {{ result.rank }}
                        </span>
                      </td>
                      <td class="px-3 py-2 whitespace-nowrap">
                        <div>
                          <div
                            class="text-xs font-medium"
                            :class="
                              isDarkMode ? 'text-blue-100' : 'text-gray-900'
                            "
                          >
                            {{ result.first_name }} {{ result.last_name }}
                          </div>
                          <div
                            class="text-xs"
                            :class="
                              isDarkMode ? 'text-blue-300' : 'text-gray-500'
                            "
                          >
                            #{{ result.candidate_number }}
                          </div>
                        </div>
                      </td>
                      <td class="px-3 py-2 whitespace-nowrap">
                        <span
                          class="px-2 py-1 rounded-full text-xs font-medium"
                          :class="
                            getScoreColorClass(
                              result.category_average,
                              category.max_score
                            )
                          "
                        >
                          {{ Number(result.category_average).toFixed(2) }}/{{
                            category.max_score
                          }}
                        </span>
                      </td>
                    </tr>
                    <tr v-if="!category.males?.length">
                      <td
                        colspan="3"
                        class="px-3 py-4 text-center text-xs"
                        :class="isDarkMode ? 'text-blue-300' : 'text-gray-500'"
                      >
                        No male candidates scored yet.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Female Category Results -->
            <div
              class="bg-gradient-to-r from-pink-50 to-rose-50 rounded-lg p-4"
              :class="isDarkMode ? 'from-pink-900 to-rose-900' : ''"
            >
              <h5
                class="text-md font-semibold mb-3 flex items-center"
                :class="isDarkMode ? 'text-pink-200' : 'text-pink-800'"
              >
                <i class="fas fa-female mr-2"></i>
                Female Results ({{ category.females?.length || 0 }})
              </h5>
              <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                  <thead :class="isDarkMode ? 'bg-pink-800' : 'bg-pink-100'">
                    <tr>
                      <th
                        class="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider"
                        :class="isDarkMode ? 'text-pink-200' : 'text-pink-800'"
                      >
                        Rank
                      </th>
                      <th
                        class="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider"
                        :class="isDarkMode ? 'text-pink-200' : 'text-pink-800'"
                      >
                        Candidate
                      </th>
                      <th
                        class="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider"
                        :class="isDarkMode ? 'text-pink-200' : 'text-pink-800'"
                      >
                        Category Avg
                      </th>
                    </tr>
                  </thead>
                  <tbody
                    class="divide-y divide-gray-200"
                    :class="
                      isDarkMode ? 'bg-pink-900 divide-pink-700' : 'bg-white'
                    "
                  >
                    <tr
                      v-for="result in category.females || []"
                      :key="result.candidate_id"
                      class="hover:bg-pink-50 transition-colors"
                      :class="isDarkMode ? 'hover:bg-pink-800' : ''"
                    >
                      <td class="px-3 py-2 whitespace-nowrap">
                        <span
                          class="text-sm font-bold"
                          :class="isDarkMode ? 'text-white' : 'text-gray-900'"
                        >
                          {{ result.rank }}
                        </span>
                      </td>
                      <td class="px-3 py-2 whitespace-nowrap">
                        <div>
                          <div
                            class="text-xs font-medium"
                            :class="
                              isDarkMode ? 'text-pink-100' : 'text-gray-900'
                            "
                          >
                            {{ result.first_name }} {{ result.last_name }}
                          </div>
                          <div
                            class="text-xs"
                            :class="
                              isDarkMode ? 'text-pink-300' : 'text-gray-500'
                            "
                          >
                            #{{ result.candidate_number }}
                          </div>
                        </div>
                      </td>
                      <td class="px-3 py-2 whitespace-nowrap">
                        <span
                          class="px-2 py-1 rounded-full text-xs font-medium"
                          :class="
                            getScoreColorClass(
                              result.category_average,
                              category.max_score
                            )
                          "
                        >
                          {{ Number(result.category_average).toFixed(2) }}/{{
                            category.max_score
                          }}
                        </span>
                      </td>
                    </tr>
                    <tr v-if="!category.females?.length">
                      <td
                        colspan="3"
                        class="px-3 py-4 text-center text-xs"
                        :class="isDarkMode ? 'text-pink-300' : 'text-gray-500'"
                      >
                        No female candidates scored yet.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Stage Results Section -->
      <div v-else-if="currentSection.type === 'stage'" class="space-y-6">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <!-- Male Stage Results -->
          <div
            class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6"
          >
            <h4
              class="text-lg font-semibold text-blue-800 mb-4 flex items-center"
            >
              <i class="fas fa-male mr-2"></i>
              Male Candidates ({{ currentSection.data.males?.length || 0 }})
            </h4>

            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200">
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
                    v-for="result in currentSection.data.males || []"
                    :key="result.candidate_id"
                    class="hover:bg-blue-50 transition-colors"
                  >
                    <td class="px-4 py-3 whitespace-nowrap">
                      <span class="text-lg font-bold text-gray-900">
                        {{ result.overall_rank || result.rank }}
                      </span>
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
                            result.mean_rating || result.raw_average || 0
                          ).toFixed(2)
                        }}/{{ eventMaxScore }}
                      </span>
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap">
                      <span class="text-sm text-gray-900">
                        {{ Number(result.mean_rank || 0).toFixed(2) }}
                      </span>
                    </td>
                  </tr>
                  <tr v-if="!currentSection.data.males?.length">
                    <td
                      colspan="4"
                      class="px-4 py-6 text-center text-gray-500 text-sm"
                    >
                      No male candidates scored for this stage yet.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Female Stage Results -->
          <div class="bg-gradient-to-r from-pink-50 to-rose-50 rounded-lg p-6">
            <h4
              class="text-lg font-semibold text-pink-800 mb-4 flex items-center"
            >
              <i class="fas fa-female mr-2"></i>
              Female Candidates ({{ currentSection.data.females?.length || 0 }})
            </h4>

            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200">
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
                    v-for="result in currentSection.data.females || []"
                    :key="result.candidate_id"
                    class="hover:bg-pink-50 transition-colors"
                  >
                    <td class="px-4 py-3 whitespace-nowrap">
                      <span class="text-lg font-bold text-gray-900">
                        {{ result.overall_rank || result.rank }}
                      </span>
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
                            result.mean_rating || result.raw_average || 0
                          ).toFixed(2)
                        }}/{{ eventMaxScore }}
                      </span>
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap">
                      <span class="text-sm text-gray-900">
                        {{ Number(result.mean_rank || 0).toFixed(2) }}
                      </span>
                    </td>
                  </tr>
                  <tr v-if="!currentSection.data.females?.length">
                    <td
                      colspan="4"
                      class="px-4 py-6 text-center text-gray-500 text-sm"
                    >
                      No female candidates scored for this stage yet.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- No Results Message -->
    <div
      v-else-if="!loading && allSections.length === 0"
      class="text-center py-16 rounded-xl transition-all duration-300"
      :class="isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-gray-50'"
    >
      <i
        class="fas fa-chart-line text-4xl mb-4 transition-colors"
        :class="isDarkMode ? 'text-gray-500' : 'text-gray-400'"
      ></i>
      <p
        class="text-lg transition-colors"
        :class="isDarkMode ? 'text-gray-300' : 'text-gray-500'"
      >
        No results available yet.
      </p>
      <p
        class="text-sm transition-colors"
        :class="isDarkMode ? 'text-gray-400' : 'text-gray-400'"
      >
        Results will appear once scoring begins.
      </p>
    </div>

    <!-- PDF Preview Modal -->
    <div
      v-if="showPreview"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300"
      :class="isDarkMode ? 'bg-black/80' : 'bg-black/75'"
    >
      <div
        class="w-full max-w-7xl h-[95vh] relative overflow-hidden rounded-2xl shadow-2xl transition-all duration-300"
        :class="isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'"
      >
        <div
          class="flex justify-between items-center p-6 border-b transition-colors"
          :class="
            isDarkMode
              ? 'bg-gray-700 border-gray-600'
              : 'bg-gray-50 border-gray-200'
          "
        >
          <div>
            <h3
              class="text-2xl font-bold transition-colors"
              :class="isDarkMode ? 'text-white' : 'text-gray-800'"
            >
              Results Preview
            </h3>
          </div>
          <button
            @click="closePreview"
            class="w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200"
            :class="
              isDarkMode
                ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-600'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
            "
          >
            <i class="fas fa-times text-lg"></i>
          </button>
        </div>

        <div class="h-[calc(95vh-88px)] p-4">
          <iframe
            :src="previewUrl"
            class="w-full h-full border-0 rounded-lg shadow-inner"
            title="PDF Preview"
          >
          </iframe>
        </div>
      </div>
    </div>
  </div>
</template>
