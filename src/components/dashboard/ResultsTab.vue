<script setup>
import { ref, onMounted } from "vue";
import { useToast } from "vue-toastification";
import axiosClient from "@/axios";

const props = defineProps({
  eventId: {
    type: String,
    required: true,
  },
});

const toast = useToast();
const scores = ref([]);
const loading = ref(false);
const showPreview = ref(false);
const previewUrl = ref("");

const fetchScores = async () => {
  loading.value = true;
  try {
    const response = await axiosClient.get(
      `/api/v1/events/${props.eventId}/scores`
    );
    scores.value = response.data.data || [];
  } catch (error) {
    toast.error(error.response?.data?.message || "Failed to load scores.");
  } finally {
    loading.value = false;
  }
};

const downloadReport = async () => {
  loading.value = true;
  try {
    const response = await axiosClient.get(
      `/api/v1/events/${props.eventId}/report`,
      {
        responseType: "blob",
      }
    );
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `event_${props.eventId}_report.pdf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    toast.success("Report downloaded successfully!");
  } catch (error) {
    toast.error(error.response?.data?.message || "Failed to download report.");
  } finally {
    loading.value = false;
  }
};

const previewReport = async () => {
  loading.value = true;
  try {
    const response = await axiosClient.get(
      `/api/v1/events/${props.eventId}/results/preview`,
      {
        responseType: "blob",
      }
    );
    const blob = new Blob([response.data], { type: "application/pdf" });
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
  fetchScores();
  console.log("Event ID:", props.eventId);
});
</script>

<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <h2 class="text-xl font-semibold text-gray-800">Results</h2>
      <div class="space-x-2">
        <button
          @click="previewReport"
          class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          :disabled="loading"
        >
          {{ loading ? "Loading..." : "Preview Results" }}
        </button>
        <button
          @click="downloadReport"
          class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          :disabled="loading"
        >
          {{ loading ? "Downloading..." : "Download PDF Report" }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-12">
      <i class="fas fa-spinner fa-spin text-3xl text-green-600"></i>
    </div>
    <div
      v-else-if="scores.length"
      class="bg-white rounded-lg shadow overflow-hidden"
    >
      <table class="min-w-full divide-y divide-gray-200">
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
              Judge
            </th>
            <th
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Category
            </th>
            <th
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Score
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr
            v-for="score in scores"
            :key="`${score.judge_id}-${score.candidate_id}-${score.category_id}`"
          >
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {{ score.candidate?.name || "Unknown" }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {{ score.judge?.name || "Unknown" }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {{ score.category?.name || "Unknown" }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              {{ score.score }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else class="text-center py-10">
      <p class="text-gray-500">No results found.</p>
    </div>

    <!-- PDF Preview Modal -->
    <div
      v-if="showPreview"
      class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-lg w-full max-w-4xl h-[80vh] p-6">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-semibold">Results Preview</h3>
          <button
            @click="closePreview"
            class="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          >
            Close
          </button>
        </div>
        <iframe
          :src="previewUrl"
          class="w-full h-full border-0"
          title="PDF Preview"
        ></iframe>
      </div>
    </div>
  </div>
</template>
