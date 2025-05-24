<script setup>
import { ref, watch, computed, onMounted } from "vue";
import { useToast } from "vue-toastification";
import DateUtils from "@/utils/DateUtils";
import FlatPickr from "vue-flatpickr-component";
import "flatpickr/dist/flatpickr.css";
import axiosClient from "@/axios";

const props = defineProps({
  show: Boolean,
  event: Object,
  loading: Boolean,
});

const emit = defineEmits(["close", "save"]);

const toast = useToast();

const form = ref({
  event_name: "",
  venue: "",
  event_code: "",
  start_date: "",
  end_date: "",
  description: "",
});

const selectedFile = ref(null);
const previewUrl = ref("");
const errors = ref({});

const selectedStatisticians = ref([]);
const allEligibleUsers = ref([]);

const fetchAdmins = async () => {
  try {
    const res = await axiosClient.get("/api/v1/users?role=admin-tabulator");
    allEligibleUsers.value = res.data || [];
  } catch {
    toast.error("Failed to load statisticians");
  }
};

onMounted(fetchAdmins);

watch(
  () => props.event,
  (event) => {
    if (event) {
      form.value = {
        event_name: event.event_name || "",
        venue: event.venue || "",
        event_code: event.event_code || "",
        start_date: DateUtils.toFlatPickrFormat(event.start_date),
        end_date: DateUtils.toFlatPickrFormat(event.end_date),
        description: event.description || "",
      };
      selectedStatisticians.value = event.statisticians || [];
      previewUrl.value = event.cover_photo
        ? getImageUrl(event.cover_photo)
        : "/vsu.png";
      selectedFile.value = null;
    }
  },
  { immediate: true }
);

const flatPickrConfig = {
  enableTime: true,
  dateFormat: "Y-m-d H:i",
  time_24hr: false,
  minuteIncrement: 5,
  altInput: true,
  altFormat: "F j, Y h:i K",
  static: true,
  position: "auto",
  disableMobile: true,
};

const endDateConfig = computed(() => ({
  ...flatPickrConfig,
  minDate: form.value.start_date || new Date(),
}));

function getImageUrl(filePath) {
  const base = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
  return filePath.startsWith("/storage/")
    ? `${base}${filePath}`
    : `${base}/storage/${filePath}`;
}

const handleFileChange = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const validTypes = ["image/jpeg", "image/png", "image/jpg", "image/gif"];
  if (!validTypes.includes(file.type)) {
    toast.error("Invalid image type.");
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    toast.error("File must not exceed 5MB.");
    return;
  }
  selectedFile.value = file;
  previewUrl.value = URL.createObjectURL(file);
};

const handleClose = () => {
  errors.value = {};
  selectedFile.value = null;
  emit("close");
};

const handleSubmit = () => {
  errors.value = {};
  const formData = new FormData();
  formData.append("event_name", form.value.event_name || "");
  formData.append("venue", form.value.venue || "");
  formData.append("description", form.value.description || "");
  formData.append("statisticians", JSON.stringify(selectedStatisticians.value));
  if (form.value.start_date)
    formData.append(
      "start_date",
      DateUtils.formatForApi(form.value.start_date)
    );
  if (form.value.end_date)
    formData.append("end_date", DateUtils.formatForApi(form.value.end_date));
  if (selectedFile.value) formData.append("cover_photo", selectedFile.value);
  formData.append("_method", "PATCH");

  emit("save", formData);
};
</script>

<template>
  <div
    v-if="show"
    class="fixed inset-0 backdrop-blur-md bg-opacity-50 z-50 flex items-center justify-center p-4"
  >
    <div
      class="bg-white rounded-lg shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto relative p-6 animate-in fade-in-0 zoom-in-95"
    >
      <button
        @click="handleClose"
        class="absolute top-3 right-3 text-gray-500 hover:text-gray-700 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
        type="button"
      >
        <i class="fas fa-times"></i>
      </button>

      <h2 class="text-xl font-bold text-gray-800 mb-4">Edit Event</h2>

      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Cover Photo
        </label>
        <div class="mt-2 flex flex-col space-y-2">
          <input
            type="file"
            accept="image/*"
            @change="handleFileChange"
            class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
          />
          <div
            v-if="previewUrl"
            class="mt-2 max-h-64 overflow-hidden rounded border"
          >
            <img
              :src="previewUrl"
              alt="Cover Preview"
              class="w-full h-auto max-h-64 object-contain rounded"
              @error="(e) => (e.target.src = '/vsu.png')"
            />
          </div>
        </div>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Event Name *
            </label>
            <input
              v-model="form.event_name"
              type="text"
              class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Venue
            </label>
            <input
              v-model="form.venue"
              type="text"
              class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <FlatPickr
              v-model="form.start_date"
              :config="flatPickrConfig"
              class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Select start date and time"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <FlatPickr
              v-model="form.end_date"
              :config="endDateConfig"
              class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Select end date and time"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              v-model="form.description"
              class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              rows="4"
            ></textarea>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Statisticians
            </label>
            <select
              v-model="selectedStatisticians"
              multiple
              class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-green-500"
            >
              <option
                v-for="user in allEligibleUsers"
                :key="user.user_id"
                :value="{
                  id: user.user_id,
                  name: user.first_name + ' ' + user.last_name,
                }"
              >
                {{ user.first_name }} {{ user.last_name }}
              </option>
            </select>
            <p class="text-xs text-gray-500 mt-1">
              Hold Ctrl (Cmd) to select multiple.
            </p>
          </div>

          <div class="flex justify-end gap-3 mt-6">
            <button
              type="button"
              @click="handleClose"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              :disabled="loading"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="loading"
              class="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <i v-if="loading" class="fas fa-spinner fa-spin"></i>
              {{ loading ? "Saving..." : "Save Changes" }}
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>
