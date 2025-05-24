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
const categories = ref([]);
const judges = ref([]);
const candidates = ref([]);
const loading = ref(false);
const selectedStage = ref("all");
const selectedCategory = ref("all");
const selectedCandidate = ref("all");
const selectedJudge = ref("all");

const fetchScores = async () => {
  if (!props.eventId) {
    toast.error("Missing event ID.");
    return;
  }

  loading.value = true;
  try {
    const response = await axiosClient.get(
      `/api/v1/events/${props.eventId}/scores`
    );

    // If the response is a raw array
    if (Array.isArray(response)) {
      scores.value = response;
    } else if (Array.isArray(response.data)) {
      scores.value = response.data;
    } else {
      scores.value = response.data.scores || [];
      stages.value = response.data.stages || [];
      categories.value = response.data.categories || [];
      judges.value = response.data.judges || [];
      candidates.value = response.data.candidates || [];
    }

    console.log("Scores fetched:", scores.value);

    if (!scores.value.length) {
      toast.info("No scores available yet.");
    }
  } catch (error) {
    console.error("Error fetching scores:", error);
    toast.error(error.response?.data?.message || "Failed to load scores.");
  } finally {
    loading.value = false;
  }
};

const filteredScores = computed(() => {
  let filtered = scores.value;

  if (selectedStage.value !== "all") {
    filtered = filtered.filter(
      (score) => score.stage_id == selectedStage.value
    );
  }

  if (selectedCategory.value !== "all") {
    filtered = filtered.filter(
      (score) => score.category_id == selectedCategory.value
    );
  }

  if (selectedCandidate.value !== "all") {
    filtered = filtered.filter(
      (score) => score.candidate_id == selectedCandidate.value
    );
  }

  if (selectedJudge.value !== "all") {
    filtered = filtered.filter(
      (score) => score.judge_id == selectedJudge.value
    );
  }

  return filtered;
});

const scoresByStage = computed(() => {
  const grouped = {};

  filteredScores.value.forEach((score) => {
    const stageId = score.stage_id || "overall";
    if (!grouped[stageId]) {
      grouped[stageId] = [];
    }
    grouped[stageId].push(score);
  });

  return grouped;
});

const getStageTitle = (stageId) => {
  if (stageId === "overall") return "Overall Scores";
  const stage = stages.value.find((s) => s.stage_id == stageId);
  return stage ? stage.stage_name : `Stage ${stageId}`;
};

const exportScores = async () => {
  if (!scores.value.length) {
    toast.info("No scores to export.");
    return;
  }

  loading.value = true;
  try {
    const response = await axiosClient.get(
      `/api/v1/events/${props.eventId}/scores/export`,
      { responseType: "blob" }
    );

    const blob = new Blob([response.data], { type: "text/csv" });

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
};

onMounted(() => {
  if (props.eventId) {
    fetchScores();
    interval = setInterval(fetchScores, 100000); // every 100 seconds
  }
});

onUnmounted(() => {
  if (interval) clearInterval(interval);
});
</script>

<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <div class="flex items-center space-x-2">
        <i class="fas fa-clipboard-list text-green-600 text-2xl mb-1"></i>
        <h2 class="text-2xl font-semibold text-green-800">Judge Scores</h2>
      </div>
      <div class="flex space-x-2">
        <button
          @click="fetchScores"
          class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
          :disabled="loading"
        >
          <i class="fas fa-sync-alt" :class="{ 'fa-spin': loading }"></i>
          {{ loading ? "Refreshing..." : "Refresh" }}
        </button>
        <button
          @click="exportScores"
          class="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
          :disabled="loading || !scores.length"
        >
          <i class="fas fa-download"></i>
          {{ loading ? "Exporting..." : "Export CSV" }}
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-lg shadow p-4">
      <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1"
            >Filter by Stage</label
          >
          <select
            v-model="selectedStage"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="all">All Stages</option>
            <option
              v-for="stage in [
                ...new Set(scores.map((s) => s.category?.stage_id)),
              ]"
              :key="stage"
              :value="stage"
            >
              {{ getStageTitle(stage) }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1"
            >Filter by Category</label
          >
          <select
            v-model="selectedCategory"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="all">All Categories</option>
            <option
              v-for="category in [
                ...new Map(
                  scores.map((s) => [s.category?.id, s.category])
                ).values(),
              ]"
              :key="category.id"
              :value="category.id"
            >
              {{ category.name }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1"
            >Filter by Candidate</label
          >
          <select
            v-model="selectedCandidate"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="all">All Candidates</option>
            <option
              v-for="candidate in [
                ...new Map(
                  scores.map((s) => [s.candidate?.candidate_id, s.candidate])
                ).values(),
              ]"
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
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Filter by Judge
          </label>
          <select
            v-model="selectedJudge"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="all">All Judges</option>
            <option
              v-for="judge in [
                ...new Map(
                  scores.map((s) => [s.judge?.judge_id, s.judge])
                ).values(),
              ]"
              :key="judge.judge_id"
              :value="judge.judge_id"
            >
              {{ judge.first_name }} {{ judge.last_name }}
            </option>
          </select>
        </div>
        <div class="flex items-end">
          <button
            @click="clearAllFilters"
            class="w-full px-3 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition"
          >
            <i class="fas fa-times mr-1"></i>
            Clear Filters
          </button>
        </div>
      </div>
    </div>

    <div v-if="loading && !scores.length" class="flex justify-center py-12">
      <i class="fas fa-spinner fa-spin text-3xl text-green-600"></i>
    </div>

    <div v-else-if="Object.keys(scoresByStage).length" class="space-y-6">
      <!-- Display scores grouped by stage -->
      <div
        v-for="(stageScores, stageId) in scoresByStage"
        :key="stageId"
        class="bg-white rounded-lg shadow p-6"
      >
        <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <i class="fas fa-trophy text-green-600 mr-2"></i>
          {{ getStageTitle(stageId) }}
          <span
            class="ml-2 text-sm bg-green-100 text-green-800 px-2 py-1 rounded-full"
          >
            {{ stageScores.length }}
            {{ stageScores.length === 1 ? "score" : "scores" }}
          </span>
        </h3>

        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200 text-sm">
            <thead class="bg-gray-50">
              <tr>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Candidate
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Category
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Judge
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Score
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Comments
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr
                v-for="score in stageScores"
                :key="`${score.candidate_id}-${score.category_id}-${score.judge_id}`"
              >
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {{ score.candidate?.first_name }}
                  {{ score.candidate?.last_name }} (#{{
                    score.candidate?.candidate_number
                  }})
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {{ score.category?.name || "Unknown Category" }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {{ score.judge?.first_name }} {{ score.judge?.last_name }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <span
                    class="px-2 py-1 rounded-full text-xs"
                    :class="{
                      'bg-red-100 text-red-800': score.score < 60,
                      'bg-yellow-100 text-yellow-800':
                        score.score >= 60 && score.score < 80,
                      'bg-green-100 text-green-800': score.score >= 80,
                    }"
                  >
                    {{ Number(score.score).toFixed(1) }}/100
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {{ score.comments || "No comment" }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="!stageScores.length" class="text-center py-8">
          <p class="text-gray-500">
            No scores found for this stage with current filters.
          </p>
        </div>
      </div>
    </div>

    <div v-else class="text-center py-10">
      <div
        class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 mb-4"
      >
        <i class="fas fa-clipboard-list text-gray-400 text-xl"></i>
      </div>
      <h3 class="text-lg font-medium text-gray-900 mb-2">
        No Scores Available
      </h3>
      <p class="text-gray-500 mb-4">
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
          selectedCandidate !== 'all'
        "
        @click="clearAllFilters"
        class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
      >
        <i class="fas fa-times mr-1"></i>
        Clear Filters
      </button>
    </div>
  </div>
</template>
