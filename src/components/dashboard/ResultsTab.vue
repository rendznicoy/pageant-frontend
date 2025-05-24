<script setup>
import { ref, onMounted, onUnmounted, computed } from "vue";
import { useToast } from "vue-toastification";
import { useRoute } from "vue-router";
import axiosClient from "@/axios";

let interval = null;

const { eventId, stageId } = defineProps(["eventId", "stageId"]);

const toast = useToast();
const finalResults = ref([]);
const loading = ref(false);
const showPreview = ref(false);
const previewUrl = ref("");
const stages = ref([]);
const partialResultsByStage = ref({});

const rankBySex = (candidates = []) => {
  const males = candidates.filter((c) => c.sex?.toLowerCase() === "m");
  const females = candidates.filter((c) => c.sex?.toLowerCase() === "f");

  const rankedMales = males
    .sort((a, b) => b.raw_average - a.raw_average)
    .map((c, index) => ({ ...c, rank: index + 1 }));

  const rankedFemales = females
    .sort((a, b) => b.raw_average - a.raw_average)
    .map((c, index) => ({ ...c, rank: index + 1 }));

  return { males: rankedMales, females: rankedFemales };
};

const fetchAllPartialResults = async () => {
  console.log("[fetchAllPartialResults] called with eventId:", eventId);
  if (!eventId) return;

  try {
    const res = await axiosClient.get(`/api/v1/events/${eventId}/stages`);
    stages.value = Array.isArray(res) ? res : res.data ?? [];

    console.log("Stages received:", stages.value);

    for (const stage of stages.value) {
      if (!stage.id) {
        console.warn("Stage missing id:", stage);
        continue;
      }

      const partial = await axiosClient.get(
        `/api/v1/events/${eventId}/stages/${stage.id}/partial-results`
      );

      const { males, females } = rankBySex(partial.candidates || []);
      partialResultsByStage.value[stage.id] = { males, females };
    }

    console.log("partialResultsByStage:", partialResultsByStage.value);
  } catch (e) {
    console.error("Error fetching partial results:", e);
  }
};

const fetchFinalResults = async () => {
  console.log("[fetchFinalResults] called with eventId:", eventId);
  if (!eventId) {
    toast.error("Missing event ID.");
    return;
  }

  loading.value = true;
  try {
    const data = await axiosClient.get(
      `/api/v1/events/${eventId}/scores/final-results`
    );

    console.log("✅ Final results API response:", data);

    finalResults.value = Array.isArray(data?.candidates) ? data.candidates : [];

    console.log("✅ FinalResults.value length:", finalResults.value.length);

    if (!finalResults.value.length) {
      toast.info("No final results available yet.");
    }
  } catch (error) {
    console.error("Error fetching final results:", error);
    toast.error(
      error.response?.data?.message || "Failed to load final results."
    );
  } finally {
    loading.value = false;
  }
};

const rankedFinal = computed(() => rankBySex(finalResults.value));
const maleResults = computed(() => rankedFinal.value.males);
const femaleResults = computed(() => rankedFinal.value.females);

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

    // Check if it's already a Blob or wrap it
    const blob =
      response instanceof Blob
        ? response
        : new Blob([response], { type: "application/pdf" });

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
    toast.error(error.response?.data?.message || "Failed to download report.");
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
      `/api/v1/events/${eventId}/results/preview?event_id=${eventId}`,
      { responseType: "blob" }
    );

    const blob =
      response instanceof Blob
        ? response
        : new Blob([response], { type: "application/pdf" });

    previewUrl.value = window.URL.createObjectURL(blob);
    showPreview.value = true;
  } catch (error) {
    toast.error(error.response?.data?.message || "Failed to preview report.");
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

onMounted(() => {
  console.log("onMounted called, eventId:", eventId);
  if (eventId) {
    fetchFinalResults();
    fetchAllPartialResults();
  }
});

onUnmounted(() => {
  if (interval) clearInterval(interval);
});
</script>

<template>
  <div class="space-y-6">
    <!-- Final Results Section -->
    <div class="bg-green-100 rounded-lg shadow-lg p-6">
      <div class="flex justify-between items-center mb-4">
        <div class="flex items-center space-x-2">
          <i class="fas fa-trophy text-yellow-600 text-2xl"></i>
          <h2 class="text-2xl font-bold text-green-900">Final Results</h2>
        </div>
        <div class="flex space-x-2">
          <button
            @click="previewReport"
            class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
            :disabled="loading || !eventId"
          >
            <i class="fas fa-eye"></i>
            {{ loading ? "Loading..." : "Preview Results" }}
          </button>
          <button
            @click="downloadReport"
            class="flex items-center gap-2 px-4 py-2 bg-green-700 text-white rounded-md hover:bg-green-800 transition"
            :disabled="loading || !eventId"
          >
            <i class="fas fa-download"></i>
            {{ loading ? "Downloading..." : "Download PDF Report" }}
          </button>
        </div>
      </div>

      <div v-if="loading" class="flex justify-center py-12">
        <i class="fas fa-spinner fa-spin text-3xl text-green-600"></i>
      </div>

      <div
        v-else-if="finalResults.length"
        class="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        <!-- Male Final Results -->
        <div class="bg-white rounded-lg shadow p-4">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">
            Male Candidates
          </h3>
          <table class="min-w-full divide-y divide-gray-200 text-sm">
            <thead class="bg-gray-50">
              <tr>
                <th
                  class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase"
                >
                  Rank
                </th>
                <th
                  class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase"
                >
                  Candidate
                </th>
                <th
                  class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase"
                >
                  Raw Average
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr
                v-for="(result, index) in maleResults"
                :key="result.candidate_id"
              >
                <td class="px-4 py-2">{{ index + 1 }}</td>
                <td class="px-4 py-2">
                  {{ result.candidate.first_name }}
                  {{ result.candidate.last_name }} (#{{
                    result.candidate.candidate_number
                  }})
                </td>
                <td class="px-4 py-2">
                  {{ Number(result.raw_average).toFixed(2) }}/100
                </td>
              </tr>
              <tr v-if="!maleResults.length">
                <td colspan="3" class="px-4 py-2 text-sm text-gray-500">
                  No male candidates scored yet.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Female Final Results -->
        <div class="bg-white rounded-lg shadow p-4">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">
            Female Candidates
          </h3>
          <table class="min-w-full divide-y divide-gray-200 text-sm">
            <thead class="bg-gray-50">
              <tr>
                <th
                  class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase"
                >
                  Rank
                </th>
                <th
                  class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase"
                >
                  Candidate
                </th>
                <th
                  class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase"
                >
                  Raw Average
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr
                v-for="(result, index) in femaleResults"
                :key="result.candidate_id"
              >
                <td class="px-4 py-2">{{ index + 1 }}</td>
                <td class="px-4 py-2">
                  {{ result.candidate.first_name }}
                  {{ result.candidate.last_name }} (#{{
                    result.candidate.candidate_number
                  }})
                </td>
                <td class="px-4 py-2">
                  {{ Number(result.raw_average).toFixed(2) }}/100
                </td>
              </tr>
              <tr v-if="!femaleResults.length">
                <td colspan="3" class="px-4 py-2 text-sm text-gray-500">
                  No female candidates scored yet.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Partial Results by Stage -->
    <!-- Partial Results by Stage -->
    <div v-for="stage in stages" :key="stage.id" class="space-y-6">
      <div>
        <h3 class="text-xl font-semibold text-gray-800 mb-4">
          Partial Results – {{ stage.name }}
        </h3>
        <div class="flex flex-col md:flex-row gap-6">
          <!-- Male -->
          <div
            class="bg-white rounded-lg shadow p-6 w-full md:w-1/2 overflow-x-auto"
          >
            <h4 class="text-lg font-semibold text-gray-700 mb-3">
              Male Candidates
            </h4>
            <table class="min-w-full divide-y divide-gray-200 text-sm">
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
                <tr
                  v-for="(result, index) in partialResultsByStage[stage.id]
                    ?.males || []"
                  :key="result.candidate_id"
                >
                  <td class="px-6 py-4">{{ index + 1 }}</td>
                  <td class="px-6 py-4">
                    {{ result.candidate.first_name }}
                    {{ result.candidate.last_name }} (#{{
                      result.candidate.candidate_number
                    }})
                  </td>
                  <td class="px-6 py-4">
                    {{ Number(result.raw_average).toFixed(2) }}/100
                  </td>
                </tr>
                <tr v-if="!partialResultsByStage[stage.id]?.males?.length">
                  <td colspan="3" class="px-6 py-4 text-sm text-gray-500">
                    No male candidates scored for this stage yet.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Female -->
          <div
            class="bg-white rounded-lg shadow p-6 w-full md:w-1/2 overflow-x-auto"
          >
            <h4 class="text-lg font-semibold text-gray-700 mb-3">
              Female Candidates
            </h4>
            <table class="min-w-full divide-y divide-gray-200 text-sm">
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
                <tr
                  v-for="(result, index) in partialResultsByStage[stage.id]
                    ?.females || []"
                  :key="result.candidate_id"
                >
                  <td class="px-6 py-4">{{ index + 1 }}</td>
                  <td class="px-6 py-4">
                    {{ result.candidate.first_name }}
                    {{ result.candidate.last_name }} (#{{
                      result.candidate.candidate_number
                    }})
                  </td>
                  <td class="px-6 py-4">
                    {{ Number(result.raw_average).toFixed(2) }}/100
                  </td>
                </tr>
                <tr v-if="!partialResultsByStage[stage.id]?.females?.length">
                  <td colspan="3" class="px-6 py-4 text-sm text-gray-500">
                    No female candidates scored for this stage yet.
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
      v-if="
        !finalResults.length &&
        Object.values(partialResultsByStage).every((results) => !results.length)
      "
      class="text-center py-10"
    >
      <p class="text-gray-500">No results available yet.</p>
    </div>

    <!-- PDF Preview Modal -->
    <div
      v-if="showPreview"
      class="fixed inset-0 z-50 bg-black bg-opacity-50 backdrop-blur-md flex items-center justify-center p-6"
    >
      <div
        class="bg-white rounded-lg shadow-xl w-full max-w-5xl h-[85vh] relative p-6 animate-in fade-in-0 zoom-in-95"
      >
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-xl font-semibold text-gray-800">Results Preview</h3>
          <button
            @click="closePreview"
            class="text-gray-500 hover:text-gray-700 hover:bg-gray-100 w-8 h-8 flex items-center justify-center rounded-full"
          >
            <i class="fas fa-times"></i>
          </button>
        </div>
        <iframe
          :src="previewUrl"
          class="w-full h-full border-0 rounded-md"
          title="PDF Preview"
        ></iframe>
      </div>
    </div>
  </div>
</template>
