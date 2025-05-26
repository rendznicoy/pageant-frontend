<script setup>
import { reactive, watch, computed, ref, onMounted } from "vue";
import { useEventStore } from "@/stores/event";
import { useToast } from "vue-toastification";
import axiosClient from "@/axios";
import FlatPickr from "vue-flatpickr-component";
import "flatpickr/dist/flatpickr.css";
import "vue-multiselect/dist/vue-multiselect.min.css";
import DateUtils from "@/utils/DateUtils";

axiosClient.defaults.withCredentials = true;

const BACKEND_BASE_URL =
  import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
const toast = useToast();

const imageTimestamp = ref(Date.now());
const isLoading = ref(false);

const props = defineProps({
  event: {
    type: Object,
    required: true,
  },
  isDarkMode: {
    type: Boolean,
    default: false,
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

const allEligibleUsers = ref([]);
const errors = ref({});

// FlatPickr configurations
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

const endDateConfig = computed(() => ({
  ...flatPickrConfig,
  minDate: form.start_date || new Date(),
}));

const previewImageUrl = computed(() => {
  if (form.preview_url) return form.preview_url;
  if (!props.event?.cover_photo) return "/vsu.png";

  const path = props.event.cover_photo;
  const fullPath = path.startsWith("/storage/")
    ? `${BACKEND_BASE_URL}${path}`
    : `${BACKEND_BASE_URL}/storage/${path}`;

  return `${fullPath}?t=${imageTimestamp.value}`;
});

async function submit() {
  if (isLoading.value) return;

  // Reset errors
  errors.value = {};

  // Validation
  if (!form.event_name?.trim()) {
    errors.value.event_name = "Event name is required";
    toast.error("Event name is required", {
      timeout: 4000,
      position: "top-right",
      icon: "fas fa-exclamation-triangle",
    });
    return;
  }

  if (!form.venue?.trim()) {
    errors.value.venue = "Venue is required";
    toast.error("Venue is required", {
      timeout: 4000,
      position: "top-right",
      icon: "fas fa-exclamation-triangle",
    });
    return;
  }

  if (!form.start_date) {
    errors.value.start_date = "Start date is required";
    toast.error("Start date is required", {
      timeout: 4000,
      position: "top-right",
    });
    return;
  }

  if (!form.end_date) {
    errors.value.end_date = "End date is required";
    toast.error("End date is required", {
      timeout: 4000,
      position: "top-right",
    });
    return;
  }

  // Date validation
  const startDate = new Date(form.start_date);
  const endDate = new Date(form.end_date);

  if (endDate <= startDate) {
    errors.value.end_date = "End date must be after start date";
    toast.error("End date must be after start date", {
      timeout: 4000,
      position: "top-right",
    });
    return;
  }

  isLoading.value = true;

  const loadingToastId = toast.info("Updating event...", {
    timeout: false,
    closeOnClick: false,
    pauseOnFocusLoss: false,
    pauseOnHover: false,
    draggable: false,
    showCloseButtonOnHover: false,
    hideProgressBar: false,
    closeButton: false,
    icon: "fas fa-spinner fa-spin",
    position: "top-right",
  });

  try {
    await axiosClient.get("/api/csrf-cookie");

    const formData = new FormData();
    formData.append("event_name", form.event_name);
    formData.append("venue", form.venue || "");

    if (form.start_date) {
      formData.append("start_date", DateUtils.formatForApi(form.start_date));
    }
    if (form.end_date) {
      formData.append("end_date", DateUtils.formatForApi(form.end_date));
    }
    if (form.cover_photo instanceof File) {
      formData.append("cover_photo", form.cover_photo);
    }

    const response = await store.updateEvent(props.event.event_id, formData);

    toast.dismiss(loadingToastId);

    if (
      !response.success &&
      response.message === "No fields provided to update."
    ) {
      toast.warning("No changes were made to the event", {
        timeout: 3000,
        position: "top-right",
        icon: "fas fa-info-circle",
      });
      emit("close");
      return;
    }

    toast.success(
      `"${
        response.event?.event_name || form.event_name
      }" updated successfully!`,
      {
        timeout: 4000,
        position: "top-right",
        icon: "fas fa-check-circle",
      }
    );

    await store.fetchEvents(true);
    emit("updated", response.event);
    emit("close");
  } catch (error) {
    console.error("Error updating event:", error);
    toast.dismiss(loadingToastId);

    const errorMessage =
      error.response?.data?.message ||
      error.message ||
      "Failed to update event";

    if (error.response?.status === 422) {
      toast.error("Please check your input and try again", {
        timeout: 5000,
        position: "top-right",
        icon: "fas fa-exclamation-triangle",
      });

      const errors = error.response.data.errors;
      if (errors) {
        Object.keys(errors).forEach((field) => {
          if (errors[field] && errors[field].length > 0) {
            toast.error(`${field}: ${errors[field][0]}`, {
              timeout: 4000,
              position: "top-right",
            });
          }
        });
      }
    } else if (error.response?.status === 401) {
      toast.error("You are not authorized to update this event", {
        timeout: 5000,
        position: "top-right",
        icon: "fas fa-lock",
      });
    } else if (error.response?.status === 404) {
      toast.error("Event not found", {
        timeout: 4000,
        position: "top-right",
        icon: "fas fa-search",
      });
    } else {
      toast.error(errorMessage, {
        timeout: 5000,
        position: "top-right",
        icon: "fas fa-exclamation-triangle",
      });
    }
  } finally {
    isLoading.value = false;
  }
}

function toFlatPickrFormat(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date)) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function handleFileChange(e) {
  const selectedFile = e.target.files[0];
  if (!selectedFile) return;

  const validTypes = ["image/jpeg", "image/png", "image/jpg", "image/gif"];
  if (!validTypes.includes(selectedFile.type)) {
    toast.error("Please select a valid image file (JPEG, PNG, JPG, GIF)", {
      timeout: 4000,
      position: "top-right",
      icon: "fas fa-file-image",
    });
    e.target.value = "";
    return;
  }

  if (selectedFile.size > 5 * 1024 * 1024) {
    toast.error("File size must not exceed 5MB", {
      timeout: 4000,
      position: "top-right",
      icon: "fas fa-weight-hanging",
    });
    e.target.value = "";
    return;
  }

  form.cover_photo = selectedFile;
  form.preview_url = URL.createObjectURL(selectedFile);
  imageTimestamp.value = Date.now();
}

function clearPhoto() {
  form.cover_photo = null;
  form.preview_url = props.event?.cover_photo
    ? getImageUrl(props.event.cover_photo)
    : "/vsu.png";
}

function getImageUrl(fileName) {
  if (!fileName) return "";
  const path = fileName.startsWith("/storage/")
    ? fileName
    : `/storage/${fileName}`;
  return `${BACKEND_BASE_URL}${path}`;
}

function onStartDateChange(selectedDates, dateStr) {
  if (selectedDates.length > 0) {
    form.start_date = dateStr;
  }
}

function onEndDateChange(selectedDates, dateStr) {
  if (selectedDates.length > 0) {
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
    form.start_date = toFlatPickrFormat(newEvent.start_date);
    form.end_date = toFlatPickrFormat(newEvent.end_date);
    form.preview_url = newEvent.cover_photo
      ? getImageUrl(newEvent.cover_photo)
      : "";
    form.cover_photo = null;
  },
  { immediate: true }
);
</script>

<template>
  <div
    class="fixed inset-0 z-[9999] flex items-center justify-center backdrop-blur-md p-4"
  >
    <div
      class="rounded-xl shadow-lg w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 relative animate-in fade-in-0 zoom-in-95 transition-colors duration-200"
      :class="isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'"
    >
      <!-- Close Button -->
      <button
        @click="$emit('close')"
        :disabled="isLoading"
        class="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full transition-colors duration-200 disabled:opacity-50"
        :class="
          isDarkMode
            ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
        "
        type="button"
        title="Close"
      >
        <i class="fas fa-times"></i>
      </button>

      <!-- Header -->
      <h2
        class="text-xl font-bold mb-6 transition-colors duration-200"
        :class="isDarkMode ? 'text-gray-100' : 'text-gray-800'"
      >
        <i class="fas fa-edit text-green-600 dark:text-green-400 mr-2"></i>
        Edit Event
      </h2>

      <form @submit.prevent="submit" class="space-y-6" novalidate>
        <!-- Cover Photo Section -->
        <div>
          <label
            class="block text-sm font-medium mb-2 transition-colors duration-200"
            :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'"
          >
            Event Cover Photo (optional, max 5MB)
          </label>
          <input
            type="file"
            accept="image/*"
            @change="handleFileChange"
            :disabled="isLoading"
            class="block w-full text-sm rounded-lg border transition-all duration-200 disabled:opacity-50"
            :class="
              isDarkMode
                ? 'bg-gray-700 border-gray-600 text-gray-300 file:bg-green-800 file:text-green-200 file:border-0 file:py-2 file:px-4 file:rounded-l-lg hover:file:bg-green-700'
                : 'bg-white border-gray-300 text-gray-500 file:bg-green-50 file:text-green-700 file:border-0 file:py-2 file:px-4 file:rounded-l-lg hover:file:bg-green-100'
            "
          />
          <div v-if="previewImageUrl" class="relative mt-3">
            <div
              class="max-h-64 overflow-hidden rounded border shadow-md"
              :class="isDarkMode ? 'border-gray-600' : 'border-gray-300'"
            >
              <img
                :src="previewImageUrl"
                alt="Cover Preview"
                class="w-full h-auto max-h-64 object-contain rounded"
                @error="(e) => (e.target.src = '/vsu.png')"
              />
            </div>
            <button
              v-if="form.cover_photo"
              type="button"
              @click="clearPhoto"
              class="absolute top-2 right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-700 focus:outline-none transition-colors"
              title="Remove photo"
            >
              <span class="text-sm">×</span>
            </button>
          </div>
        </div>

        <!-- Event Name -->
        <div>
          <label
            class="block text-sm font-medium mb-2 transition-colors duration-200"
            :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'"
          >
            Event Name *
          </label>
          <input
            v-model="form.event_name"
            type="text"
            maxlength="50"
            :disabled="isLoading"
            class="w-full border rounded-lg px-3 py-3 text-sm transition-all duration-200 disabled:opacity-50"
            :class="[
              isDarkMode
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-green-500 focus:ring-green-500'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-green-500 focus:ring-green-500',
              errors.event_name ? 'border-red-500' : '',
            ]"
            placeholder="Enter event name (max 50 characters)"
          />
          <p v-if="errors.event_name" class="mt-1 text-sm text-red-600">
            {{ errors.event_name }}
          </p>
        </div>

        <!-- Venue -->
        <div>
          <label
            class="block text-sm font-medium mb-2 transition-colors duration-200"
            :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'"
          >
            Venue *
          </label>
          <input
            v-model="form.venue"
            type="text"
            :disabled="isLoading"
            class="w-full border rounded-lg px-3 py-3 text-sm transition-all duration-200 disabled:opacity-50"
            :class="[
              isDarkMode
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-green-500 focus:ring-green-500'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-green-500 focus:ring-green-500',
              errors.venue ? 'border-red-500' : '',
            ]"
            placeholder="Enter venue"
          />
          <p v-if="errors.venue" class="mt-1 text-sm text-red-600">
            {{ errors.venue }}
          </p>
        </div>

        <!-- Start Date with FlatPickr -->
        <div>
          <label
            class="block text-sm font-medium mb-2 transition-colors duration-200"
            :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'"
          >
            Start Date & Time *
          </label>
          <FlatPickr
            v-model="form.start_date"
            :config="flatPickrConfig"
            :disabled="isLoading"
            @on-change="onStartDateChange"
            class="w-full border rounded-lg px-3 py-3 text-sm transition-all duration-200 disabled:opacity-50"
            :class="[
              isDarkMode
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-green-500 focus:ring-green-500'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-green-500 focus:ring-green-500',
              errors.start_date ? 'border-red-500' : '',
            ]"
            placeholder="Select start date and time"
          />
          <p v-if="errors.start_date" class="mt-1 text-sm text-red-600">
            {{ errors.start_date }}
          </p>
        </div>

        <!-- End Date with FlatPickr -->
        <div>
          <label
            class="block text-sm font-medium mb-2 transition-colors duration-200"
            :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'"
          >
            End Date & Time *
          </label>
          <FlatPickr
            v-model="form.end_date"
            :config="endDateConfig"
            :disabled="isLoading"
            @on-change="onEndDateChange"
            class="w-full border rounded-lg px-3 py-3 text-sm transition-all duration-200 disabled:opacity-50"
            :class="[
              isDarkMode
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-green-500 focus:ring-green-500'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-green-500 focus:ring-green-500',
              errors.end_date ? 'border-red-500' : '',
            ]"
            placeholder="Select end date and time"
          />
          <p v-if="errors.end_date" class="mt-1 text-sm text-red-600">
            {{ errors.end_date }}
          </p>
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-3 mt-8">
          <button
            type="button"
            @click="$emit('close')"
            :disabled="isLoading"
            class="px-6 py-3 text-sm font-medium rounded-lg transition-all duration-200 disabled:opacity-50"
            :class="
              isDarkMode
                ? 'text-gray-300 bg-gray-700 border border-gray-600 hover:bg-gray-600'
                : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
            "
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="isLoading"
            class="px-6 py-3 text-sm font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-[140px] justify-center"
            :class="
              isDarkMode
                ? 'text-green-100 bg-green-700 border border-transparent hover:bg-green-600'
                : 'text-white bg-green-600 border border-transparent hover:bg-green-700'
            "
          >
            <i v-if="isLoading" class="fas fa-spinner fa-spin"></i>
            <i v-else class="fas fa-save"></i>
            {{ isLoading ? "Saving..." : "Save Changes" }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
:deep(.multiselect-dark .multiselect__tags) {
  background: rgb(55, 65, 81);
  border-color: rgb(75, 85, 99);
  color: white;
}

:deep(.multiselect-dark .multiselect__input) {
  background: transparent;
  color: white;
}

:deep(.multiselect-dark .multiselect__input::placeholder) {
  color: rgb(156, 163, 175);
}

:deep(.multiselect-dark .multiselect__content-wrapper) {
  background: rgb(55, 65, 81);
  border-color: rgb(75, 85, 99);
}

:deep(.multiselect-dark .multiselect__option) {
  color: white;
}

:deep(.multiselect-dark .multiselect__option--highlight) {
  background: rgb(34, 197, 94);
  color: white;
}
</style>
