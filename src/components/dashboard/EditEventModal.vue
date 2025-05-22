<script setup>
import { reactive, watch, computed, ref } from "vue";
import { useEventStore } from "@/stores/event";
import axiosClient from "@/axios";

axiosClient.defaults.withCredentials = true;

const BACKEND_BASE_URL =
  import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

const imageTimestamp = ref(Date.now());
const isLoading = ref(false);

const props = defineProps({
  event: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(["close", "updated"]);

const store = useEventStore();

const form = reactive({
  event_name: "",
  venue: "",
  start_date: "",
  end_date: "",
  cover_photo: null,
  preview_url: "",
});

// Custom FlatPickr configurations for start and end dates
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
  timePicker: {
    showHours: true,
    showMinutes: true,
    showSeconds: false,
  },
};

// Configuration for end date with minDate constraint
const endDateConfig = computed(() => ({
  ...flatPickrConfig,
  minDate: form.start_date || new Date(),
}));

const previewImageUrl = computed(() => {
  // First check if we have a preview URL from file upload
  if (form.preview_url) return form.preview_url;

  // Check if event exists and has cover_photo
  if (!props.event?.cover_photo) return "/vsu.png";

  const path = props.event.cover_photo;
  const fullPath = path.startsWith("/storage/")
    ? `${BACKEND_BASE_URL}${path}`
    : `${BACKEND_BASE_URL}/storage/${path}`;

  return `${fullPath}?t=${imageTimestamp.value}`;
});

async function submit() {
  if (isLoading.value) return;
  isLoading.value = true;

  try {
    await axiosClient.get("/api/csrf-cookie");

    console.log("Form values:", {
      event_name: form.event_name,
      venue: form.venue,
      start_date: form.start_date,
      end_date: form.end_date,
      cover_photo: form.cover_photo,
    });

    const formData = new FormData();
    if (form.event_name) {
      formData.append("event_name", form.event_name);
    } else {
      console.warn("event_name is empty");
    }
    formData.append("venue", form.venue || "");
    if (form.start_date) {
      const startDate = new Date(form.start_date);
      if (!isNaN(startDate)) {
        formData.append("start_date", startDate.toISOString());
      } else {
        console.warn("Invalid start_date:", form.start_date);
      }
    }
    if (form.end_date) {
      const endDate = new Date(form.end_date);
      if (!isNaN(endDate)) {
        formData.append("end_date", endDate.toISOString());
      } else {
        console.warn("Invalid end_date:", form.end_date);
      }
    }
    if (form.cover_photo instanceof File) {
      formData.append("cover_photo", form.cover_photo);
      console.log("cover_photo file:", {
        name: form.cover_photo.name,
        size: form.cover_photo.size,
        type: form.cover_photo.type,
      });
    } else if (form.cover_photo) {
      console.warn("cover_photo is not a valid File object:", form.cover_photo);
    }

    for (let [key, value] of formData.entries()) {
      console.log(`FormData: ${key} =`, value);
    }

    const response = await store.updateEvent(props.event.event_id, formData);
    console.log("Update response:", response);

    if (
      !response.success &&
      response.message === "No fields provided to update."
    ) {
      throw new Error(
        "No fields provided to update. Please modify at least one field."
      );
    }

    if (window.app?.config?.globalProperties?.$toast) {
      window.app.config.globalProperties.$toast.success(
        response.message || "Event updated successfully!"
      );
    }

    await store.fetchEvents(true);
    emit("updated", response.event);
    emit("close");
  } catch (error) {
    console.error("Error updating event:", error);
    console.error("Error response:", error.response?.data || error.message);
    if (window.app?.config?.globalProperties?.$toast) {
      window.app.config.globalProperties.$toast.error(
        error.response?.data?.message ||
          error.message ||
          "Failed to update event. Please try again."
      );
    }
  } finally {
    isLoading.value = false;
  }
}

// Parse date string to FlatPickr compatible format while preserving the correct time
function toFlatPickrFormat(dateString) {
  if (!dateString) return "";

  // Create a date object from the string
  const date = new Date(dateString);
  if (isNaN(date)) return "";

  // Return format compatible with FlatPickr (Y-m-d H:i)
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function handleFileChange(e) {
  const selectedFile = e.target.files[0];
  if (!selectedFile) {
    console.warn("No file selected");
    return;
  }

  const validTypes = ["image/jpeg", "image/png", "image/jpg", "image/gif"];
  if (!validTypes.includes(selectedFile.type)) {
    console.error("Invalid file type:", selectedFile.type);
    alert("Please select a valid image file (JPEG, PNG, JPG, GIF).");
    return;
  }

  if (selectedFile.size > 5 * 1024 * 1024) {
    console.error("File size exceeds 5MB:", selectedFile.size);
    alert("File size must not exceed 5MB.");
    return;
  }

  form.cover_photo = selectedFile;
  form.preview_url = URL.createObjectURL(selectedFile);
  imageTimestamp.value = Date.now();
  console.log("Selected file:", {
    name: selectedFile.name,
    size: selectedFile.size,
    type: selectedFile.type,
  });
}

function getImageUrl(fileName) {
  if (!fileName) return "";
  const path = fileName.startsWith("/storage/")
    ? fileName
    : `/storage/${fileName}`;
  return `${BACKEND_BASE_URL}${path}`;
}

// Handle FlatPickr date change events
function onStartDateChange(selectedDates, dateStr) {
  if (selectedDates.length > 0) {
    // Preserve the actual selected date object
    form.start_date = dateStr;
  }
}

function onEndDateChange(selectedDates, dateStr) {
  if (selectedDates.length > 0) {
    // Preserve the actual selected date object
    form.end_date = dateStr;
  }
}

// Initialize form when event prop changes
watch(
  () => props.event,
  (newEvent) => {
    if (!newEvent) return;

    form.event_name = newEvent.event_name || "";
    form.venue = newEvent.venue || "";

    // Parse dates properly to ensure correct time display
    form.start_date = toFlatPickrFormat(newEvent.start_date);
    form.end_date = toFlatPickrFormat(newEvent.end_date);

    console.log("Original start date:", newEvent.start_date);
    console.log("Parsed start date:", form.start_date);

    form.preview_url = newEvent.cover_photo
      ? getImageUrl(newEvent.cover_photo)
      : "";
    form.cover_photo = null; // clear previous file
  },
  { immediate: true }
);
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
  >
    <div
      class="bg-white rounded-xl shadow-lg w-full max-w-xl max-h-full overflow-y-auto p-6 relative animate-in fade-in-0 zoom-in-95"
    >
      <!-- Close Button -->
      <button
        @click="$emit('close')"
        class="absolute top-3 right-3 text-gray-500 hover:text-gray-700 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
        type="button"
      >
        <i class="fas fa-times"></i>
      </button>

      <!-- Header -->
      <h2 class="text-xl font-bold text-gray-800 mb-4">Edit Event</h2>

      <!-- Cover Photo Section -->
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
            v-if="previewImageUrl"
            class="mt-2 max-h-64 overflow-hidden rounded border"
          >
            <img
              :src="previewImageUrl"
              alt="Cover Preview"
              class="w-full h-auto max-h-64 object-contain rounded"
              @error="(e) => (e.target.src = '/vsu.png')"
            />
          </div>
        </div>
      </div>

      <!-- Form -->
      <form @submit.prevent="submit">
        <div class="space-y-4">
          <!-- Event Name -->
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

          <!-- Venue -->
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

          <!-- Start Date with FlatPickr -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <FlatPickr
              v-model="form.start_date"
              :config="flatPickrConfig"
              @on-change="onStartDateChange"
              class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Select start date and time"
            />
          </div>

          <!-- End Date with FlatPickr -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <FlatPickr
              v-model="form.end_date"
              :config="endDateConfig"
              @on-change="onEndDateChange"
              class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Select end date and time"
            />
          </div>
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-3 mt-6">
          <button
            type="button"
            @click="$emit('close')"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            :disabled="isLoading"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="isLoading"
            class="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <i v-if="isLoading" class="fas fa-spinner fa-spin"></i>
            {{ isLoading ? "Saving..." : "Save Changes" }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
