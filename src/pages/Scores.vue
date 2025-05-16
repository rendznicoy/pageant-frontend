<script setup>
import { ref, onMounted, computed } from "vue";
import { useToast } from "vue-toastification";
import { useRoute } from "vue-router";
import axiosClient from "@/axios";

const route = useRoute();
const toast = useToast();
const finalResults = ref([]);
const loading = ref(false);
const showPreview = ref(false);
const previewUrl = ref("");
const error = ref(null);

const eventId = computed(() => route.query.eventId);
const stageId = computed(() => route.query.stageId);

const fetchFinalResults = async () => {
  if (!eventId.value || !stageId.value) {
    toast.error("Missing event or stage ID.");
    error.value = "Invalid parameters";
    return;
  }
  loading.value = true;
  try {
    const response = await axiosClient.get(
      `/api/v1/events/${eventId.value}/stages/${stageId.value}/partial-results`
    );
    finalResults.value = response.data.candidates || [];
    console.log("Final results fetched:", finalResults.value);
    if (!finalResults.value.length) {
      toast.info("No final results available yet.");
    }
  } catch (err) {
    console.error("Error fetching final results:", err);
    error.value =
      err.response?.data?.message || "Failed to load final results.";
    toast.error(error.value);
  } finally {
    loading.value = false;
  }
};

const maleResults = computed(() =>
  finalResults.value.filter(
    (result) => result?.sex === "male" && result?.candidate
  )
);

const femaleResults = computed(() =>
  finalResults.value.filter(
    (result) => result?.sex === "female" && result?.candidate
  )
);

const downloadReport = async () => {
  loading.value = true;
  try {
    const response = await axiosClient.get(
      `/api/v1/events/${eventId.value}/report`,
      { responseType: "blob" }
    );
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `event_${eventId.value}_report.pdf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    toast.success("Report downloaded successfully!");
  } catch (err) {
    toast.error(err.response?.data?.message || "Failed to download report.");
  } finally {
    loading.value = false;
  }
};

const previewReport = async () => {
  if (!eventId.value) {
    toast.error("Missing event ID.");
    error.value = "Invalid event ID";
    return;
  }
  loading.value = true;
  try {
    const response = await axiosClient.get(
      `/api/v1/events/${eventId.value}/results/preview`,
      { responseType: "blob" }
    );
    console.log("Preview response:", {
      status: response.status,
      contentType: response.headers["content-type"],
      size: response.data.size,
    });
    if (!response.data || response.data.size === 0) {
      throw new Error("Empty or invalid PDF response");
    }
    if (response.headers["content-type"] !== "application/pdf") {
      throw new Error(
        `Unexpected content type: ${response.headers["content-type"]}`
      );
    }
    const blob = new Blob([response.data], { type: "application/pdf" });
    previewUrl.value = window.URL.createObjectURL(blob);
    window.open(previewUrl.value, "_blank"); // Open directly in new tab
    // showPreview.value = true; // Comment out to skip modal
  } catch (err) {
    console.error("Preview error:", err);
    error.value = err.message || "Failed to preview report.";
    toast.error(error.value);
  } finally {
    loading.value = false;
  }
};

const closePreview = () => {
  showPreview.value = true;
  if (previewUrl.value) {
    window.URL.revokeObjectURL(previewUrl.value);
    previewUrl.value = "";
  }
};

onMounted(() => {
  if (eventId.value && stageId.value) {
    fetchFinalResults();
  } else {
    toast.warning("Please select a stage to view results.");
    error.value = "Missing event or stage ID";
  }
});
</script>

<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <h2 class="text-xl font-semibold text-gray-800">Final Results</h2>
      <div class="space-x-2">
        <button
          @click="previewReport"
          class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          :disabled="loading || !eventId"
        >
          {{ loading ? "Loading..." : "Preview Results" }}
        </button>
        <button
          @click="downloadReport"
          class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          :disabled="loading || !eventId"
        >
          {{ loading ? "Downloading..." : "Download PDF Report" }}
        </button>
      </div>
    </div>

    <div
      v-if="error"
      class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded"
    >
      {{ error }}
    </div>

    <div v-else-if="loading" class="flex justify-center py-12">
      <i class="fas fa-spinner fa-spin text-3xl text-green-600"></i>
    </div>
    <div v-else-if="finalResults.length" class="bg-white rounded-lg shadow p-6">
      <!-- Male Candidates Table -->
      <h3 class="text-lg font-semibold text-gray-900 mb-4">Male Candidates</h3>
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
              {{ result.rank || "N/A" }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {{ result.candidate?.first_name || "Unknown" }}
              {{ result.candidate?.last_name || "" }}
              ({{
                result.candidate?.candidate_number
                  ? `#${result.candidate.candidate_number}`
                  : "N/A"
              }})
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {{ Number(result.raw_average || 0).toFixed(2) }}/100
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
      <h3 class="text-lg font-semibold text-gray-900 mb-4">
        Female Candidates
      </h3>
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
              {{ result.rank || "N/A" }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {{ result.candidate?.first_name || "Unknown" }}
              {{ result.candidate?.last_name || "" }}
              ({{
                result.candidate?.candidate_number
                  ? `#${result.candidate.candidate_number}`
                  : "N/A"
              }})
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {{ Number(result.raw_average || 0).toFixed(2) }}/100
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
    <div v-else class="text-center py-10">
      <p class="text-gray-500">No final results found.</p>
    </div>

    <!-- PDF Preview Modal -->
    <div
      v-if="showPreview"
      class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-lg w-full max-w-4xl h-[80vh] p-6 pdf-modal">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-semibold">Results Preview</h3>
          <button
            @click="closePreview"
            class="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          >
            Close
          </button>
        </div>
        <object
          v-if="previewUrl"
          :data="previewUrl"
          type="application/pdf"
          class="w-full h-[calc(100%-2rem)] border-0"
        >
          <embed
            :src="previewUrl"
            type="application/pdf"
            class="w-full h-[calc(100%-2rem)] border-0"
          />
          <iframe
            :src="previewUrl"
            class="w-full h-[calc(100%-2rem)] border-0"
            title="PDF Preview"
          ></iframe>
          <div class="text-red-600 mt-2 p-4 bg-red-100 rounded">
            <p>Unable to display PDF in this browser.</p>
            <p>
              <a
                :href="previewUrl"
                target="_blank"
                class="underline font-semibold"
                >Open in new tab</a
              >
              or
              <a
                href="#"
                @click.prevent="downloadReport"
                class="underline font-semibold"
                >download the report</a
              >.
            </p>
          </div>
        </object>
        <div v-else class="text-red-600 p-4 bg-red-100 rounded">
          <p>No preview available.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pdf-modal {
  max-height: 80vh;
  overflow: hidden;
}
.pdf-modal object,
.pdf-modal embed,
.pdf-modal iframe {
  display: block;
  width: 100%;
  min-height: 500px;
  border: none;
}
</style>
