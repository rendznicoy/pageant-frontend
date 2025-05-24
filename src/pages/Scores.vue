<script setup>
import Navbar from "@/components/layout/Navbar.vue";
import Sidebar from "@/components/layout/Sidebar.vue";
import { ref, onMounted, onUnmounted, computed } from "vue";
import { useToast } from "vue-toastification";
import { useRoute, useRouter } from "vue-router";
import axiosClient from "@/axios";
import { useSidebarStore } from "@/sidebar";

const route = useRoute();
const toast = useToast();
const finalResults = ref([]);
const loading = ref(false);
const showPreview = ref(false);
const previewUrl = ref("");
const error = ref(null);
const router = useRouter();
const sidebar = useSidebarStore();
const windowWidth = ref(window.innerWidth);

const eventId = computed(() => route.query.eventId);
const stageId = computed(() => route.query.stageId);

const hasResults = computed(() => finalResults.value.length > 0);

const updateWindowWidth = () => {
  windowWidth.value = window.innerWidth;
};

const layoutShift = computed(() =>
  sidebar.isOpen && windowWidth.value >= 1024 ? "ml-64" : "ml-0"
);

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
    finalResults.value = response.candidates || [];
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
  finalResults.value
    .filter(
      (r) =>
        r?.candidate &&
        (r.sex?.toLowerCase() === "m" || r.sex?.toLowerCase() === "male")
    )
    .map((c, i) => ({ ...c, rank: i + 1 }))
);

const femaleResults = computed(() =>
  finalResults.value
    .filter(
      (r) =>
        r?.candidate &&
        (r.sex?.toLowerCase() === "f" || r.sex?.toLowerCase() === "female")
    )
    .map((c, i) => ({ ...c, rank: i + 1 }))
);

const downloadReport = async () => {
  if (!finalResults.value.length) {
    toast.info("No results to download.");
    return;
  }

  loading.value = true;
  try {
    const response = await axiosClient.get(
      `/api/v1/events/${eventId.value}/report`,
      {
        responseType: "blob",
      }
    );

    const blob =
      response instanceof Blob
        ? response
        : new Blob([response], { type: "application/pdf" });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `event_${eventId.value}_report.pdf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    toast.success("Report downloaded successfully!");
  } catch (err) {
    console.error("Download error:", err);
    toast.error(err.response?.data?.message || "Failed to download report.");
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
      `/api/v1/events/${eventId.value}/results/preview?event_id=${eventId.value}`,
      { responseType: "blob" }
    );

    const blob =
      response instanceof Blob
        ? response
        : new Blob([response], { type: "application/pdf" });

    previewUrl.value = window.URL.createObjectURL(blob);
    showPreview.value = true;
  } catch (err) {
    console.error("Preview error:", err);
    toast.error(err.response?.data?.message || "Failed to preview report.");
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

const goBack = () => {
  if (eventId.value) {
    router.push({ name: "EventDetail", params: { id: eventId.value } });
  } else {
    toast.error("Missing event ID for redirection.");
  }
};

onMounted(() => {
  if (eventId.value && stageId.value) {
    fetchFinalResults();
  } else {
    toast.warning("Please select a stage to view results.");
    error.value = "Missing event or stage ID";
  }
  window.addEventListener("resize", updateWindowWidth);
});

onUnmounted(() => {
  window.removeEventListener("resize", updateWindowWidth);
});
</script>

<template>
  <div class="min-h-screen bg-gray-100 overflow-x-hidden overflow-y-auto">
    <Navbar />
    <Sidebar />
    <div class="flex-1 transition-all duration-300" :class="layoutShift">
      <div class="p-6 space-y-6">
        <div class="flex justify-between items-center">
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
            <button
              @click="goBack"
              class="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-800 transition"
            >
              <i class="fas fa-arrow-left"></i>
              Return to Event
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

        <div
          v-else-if="hasResults"
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
                <tr v-for="result in maleResults" :key="result.candidate_id">
                  <td class="px-4 py-2">{{ result.rank || "N/A" }}</td>
                  <td class="px-4 py-2">
                    {{ result.candidate?.first_name }}
                    {{ result.candidate?.last_name }} (#{{
                      result.candidate?.candidate_number || "N/A"
                    }})
                  </td>
                  <td class="px-4 py-2">
                    {{ Number(result.raw_average || 0).toFixed(2) }}/100
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
                <tr v-for="result in femaleResults" :key="result.candidate_id">
                  <td class="px-4 py-2">{{ result.rank || "N/A" }}</td>
                  <td class="px-4 py-2">
                    {{ result.candidate?.first_name }}
                    {{ result.candidate?.last_name }} (#{{
                      result.candidate?.candidate_number || "N/A"
                    }})
                  </td>
                  <td class="px-4 py-2">
                    {{ Number(result.raw_average || 0).toFixed(2) }}/100
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

        <div v-else class="text-center py-10">
          <p class="text-gray-500">No final results found.</p>
        </div>
      </div>
    </div>
    <div
      v-if="showPreview"
      class="fixed inset-0 z-50 bg-black bg-opacity-50 backdrop-blur-md flex items-center justify-center p-6"
    >
      <div
        class="bg-white rounded-lg shadow-xl w-full max-w-5xl h-[85vh] relative p-6"
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
