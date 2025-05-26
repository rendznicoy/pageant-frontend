<script setup>
import { ref, watch, computed, onMounted } from "vue";
import { useToast } from "vue-toastification";
import DateUtils from "@/utils/DateUtils";
import FlatPickr from "vue-flatpickr-component";
import "flatpickr/dist/flatpickr.css";
import axiosClient from "@/axios";
import Multiselect from "vue-multiselect";
import "vue-multiselect/dist/vue-multiselect.min.css";

const props = defineProps({
  show: Boolean,
  event: Object,
  loading: Boolean,
  isDarkMode: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["close", "save"]);

const toast = useToast();

const form = ref({
  event_name: "",
  venue: "",
  start_date: "",
  end_date: "",
  description: "",
});

const selectedFile = ref(null);
const previewUrl = ref("");
const errors = ref({});

const selectedStatisticians = ref([]);
const allEligibleUsers = ref([]);
const manualStatisticianInput = ref("");
const manualStatisticians = ref([]);

// Fetch eligible users for statisticians
const fetchAdmins = async () => {
  try {
    const res = await axiosClient.get("/api/v1/users?roles=admin,tabulator");
    allEligibleUsers.value = res.data || [];
  } catch (error) {
    console.error("Failed to load statisticians:", error);
    toast.error("Failed to load statisticians", {
      timeout: 4000,
      position: "top-right",
    });
  }
};

onMounted(fetchAdmins);

// Watch for event prop changes and initialize form
watch(
  () => props.event,
  (event) => {
    if (event) {
      form.value = {
        event_name: event.event_name || "",
        venue: event.venue || "",
        start_date: DateUtils.toFlatPickrFormat(event.start_date),
        end_date: DateUtils.toFlatPickrFormat(event.end_date),
        description: event.description || "",
      };

      // Initialize statisticians
      selectedStatisticians.value = [];
      manualStatisticians.value = [];

      if (event.statisticians) {
        event.statisticians.forEach((stat) => {
          if (stat.id) {
            const user = allEligibleUsers.value.find(
              (u) => u.user_id === stat.id
            );
            if (user) {
              selectedStatisticians.value.push(user);
            }
          } else {
            manualStatisticians.value.push(stat.name);
          }
        });
      }

      previewUrl.value = event.cover_photo
        ? getImageUrl(event.cover_photo)
        : "/vsu.png";
      selectedFile.value = null;
      errors.value = {};
    }
  },
  { immediate: true }
);

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
    toast.error("Please select a valid image file (JPEG, PNG, JPG, GIF)", {
      timeout: 4000,
      position: "top-right",
      icon: "fas fa-file-image",
    });
    e.target.value = "";
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    toast.error("File size must not exceed 5MB", {
      timeout: 4000,
      position: "top-right",
      icon: "fas fa-weight-hanging",
    });
    e.target.value = "";
    return;
  }

  selectedFile.value = file;
  previewUrl.value = URL.createObjectURL(file);
};

const clearPhoto = () => {
  selectedFile.value = null;
  previewUrl.value = props.event?.cover_photo
    ? getImageUrl(props.event.cover_photo)
    : "/vsu.png";
};

const addManualStatistician = () => {
  const name = manualStatisticianInput.value.trim();
  if (name && !manualStatisticians.value.includes(name)) {
    manualStatisticians.value.push(name);
    manualStatisticianInput.value = "";
  }
};

const handleClose = () => {
  errors.value = {};
  selectedFile.value = null;
  manualStatisticianInput.value = "";
  emit("close");
};

const validateForm = () => {
  errors.value = {};
  let isValid = true;

  // Event name validation
  if (!form.value.event_name?.trim()) {
    errors.value.event_name = "Event name is required";
    toast.error("Event name is required", {
      timeout: 4000,
      position: "top-right",
      icon: "fas fa-exclamation-triangle",
    });
    isValid = false;
  }

  // Venue validation
  if (!form.value.venue?.trim()) {
    errors.value.venue = "Venue is required";
    toast.error("Venue is required", {
      timeout: 4000,
      position: "top-right",
      icon: "fas fa-exclamation-triangle",
    });
    isValid = false;
  }

  // Start date validation
  if (!form.value.start_date) {
    errors.value.start_date = "Start date is required";
    toast.error("Start date is required", {
      timeout: 4000,
      position: "top-right",
    });
    isValid = false;
  }

  // End date validation
  if (!form.value.end_date) {
    errors.value.end_date = "End date is required";
    toast.error("End date is required", {
      timeout: 4000,
      position: "top-right",
    });
    isValid = false;
  }

  // Date comparison validation
  if (form.value.start_date && form.value.end_date) {
    const startDate = DateUtils.parseDate(form.value.start_date);
    const endDate = DateUtils.parseDate(form.value.end_date);

    if (!startDate || !endDate) {
      toast.error("Invalid date format", {
        timeout: 4000,
        position: "top-right",
      });
      isValid = false;
    } else if (endDate <= startDate) {
      errors.value.end_date = "End date must be after start date";
      toast.error("End date must be after start date", {
        timeout: 4000,
        position: "top-right",
      });
      isValid = false;
    }
  }

  // Statisticians validation
  const allStatisticians = [
    ...selectedStatisticians.value.map((user) => ({
      id: user.user_id,
      name: `${user.first_name} ${user.last_name}`,
    })),
    ...manualStatisticians.value.map((name) => ({
      id: null,
      name,
    })),
  ];

  if (allStatisticians.length === 0) {
    toast.error("At least one statistician is required", {
      timeout: 4000,
      position: "top-right",
      icon: "fas fa-users",
    });
    isValid = false;
  }

  return isValid;
};

const handleSubmit = () => {
  if (!validateForm()) {
    return;
  }

  // Create FormData
  const formData = new FormData();
  formData.append("event_name", form.value.event_name || "");
  formData.append("venue", form.value.venue || "");
  formData.append("description", form.value.description || "");

  // Add statisticians
  const allStatisticians = [
    ...selectedStatisticians.value.map((user) => ({
      id: user.user_id,
      name: `${user.first_name} ${user.last_name}`,
    })),
    ...manualStatisticians.value.map((name) => ({
      id: null,
      name,
    })),
  ];
  formData.append("statisticians", JSON.stringify(allStatisticians));

  // Add dates using DateUtils
  if (form.value.start_date) {
    formData.append(
      "start_date",
      DateUtils.formatForApi(form.value.start_date)
    );
  }
  if (form.value.end_date) {
    formData.append("end_date", DateUtils.formatForApi(form.value.end_date));
  }

  // Add file if selected
  if (selectedFile.value) {
    formData.append("cover_photo", selectedFile.value);
  }

  formData.append("_method", "PATCH");

  emit("save", formData);
};
</script>

<template>
  <div
    v-if="show"
    class="fixed inset-0 z-[9999] flex items-center justify-center backdrop-blur-md p-4"
  >
    <div
      class="rounded-xl shadow-lg w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 relative animate-in fade-in-0 zoom-in-95 transition-colors duration-200"
      :class="isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'"
    >
      <!-- Close Button -->
      <button
        @click="handleClose"
        :disabled="loading"
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

      <form @submit.prevent="handleSubmit" class="space-y-6" novalidate>
        <!-- Event Cover Photo -->
        <div>
          <label
            class="block text-sm font-medium mb-2 transition-colors"
            :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'"
          >
            Event Cover Photo (optional, max 5MB)
          </label>
          <input
            type="file"
            accept="image/*"
            @change="handleFileChange"
            :disabled="loading"
            class="block w-full text-sm rounded-lg border transition-all duration-200 disabled:opacity-50"
            :class="
              isDarkMode
                ? 'bg-gray-700 border-gray-600 text-gray-300 file:bg-green-800 file:text-green-200 file:border-0 file:py-2 file:px-4 file:rounded-l-lg hover:file:bg-green-700'
                : 'bg-white border-gray-300 text-gray-500 file:bg-green-50 file:text-green-700 file:border-0 file:py-2 file:px-4 file:rounded-l-lg hover:file:bg-green-100'
            "
          />
          <div v-if="previewUrl" class="relative mt-3">
            <div
              class="max-h-64 overflow-hidden rounded border shadow-md"
              :class="isDarkMode ? 'border-gray-600' : 'border-gray-300'"
            >
              <img
                :src="previewUrl"
                alt="Cover Preview"
                class="w-full h-auto max-h-64 object-contain rounded"
                @error="(e) => (e.target.src = '/vsu.png')"
              />
            </div>
            <button
              v-if="selectedFile"
              type="button"
              @click="clearPhoto"
              :disabled="loading"
              class="absolute top-2 right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-700 focus:outline-none transition-colors disabled:opacity-50"
              title="Remove photo"
            >
              <span class="text-sm">×</span>
            </button>
          </div>
        </div>

        <!-- Event Name -->
        <div>
          <label
            class="block text-sm font-medium mb-2 transition-colors"
            :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'"
          >
            Event Name *
          </label>
          <input
            v-model="form.event_name"
            type="text"
            maxlength="50"
            :disabled="loading"
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
            class="block text-sm font-medium mb-2 transition-colors"
            :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'"
          >
            Venue *
          </label>
          <input
            v-model="form.venue"
            type="text"
            :disabled="loading"
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

        <!-- Start Date with Flatpickr -->
        <div>
          <label
            class="block text-sm font-medium mb-2 transition-colors"
            :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'"
          >
            Start Date & Time *
          </label>
          <FlatPickr
            v-model="form.start_date"
            :config="flatPickrConfig"
            :disabled="loading"
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

        <!-- End Date with Flatpickr -->
        <div>
          <label
            class="block text-sm font-medium mb-2 transition-colors"
            :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'"
          >
            End Date & Time *
          </label>
          <FlatPickr
            v-model="form.end_date"
            :config="endDateConfig"
            :disabled="loading"
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

        <!-- Description -->
        <div>
          <label
            class="block text-sm font-medium mb-2 transition-colors"
            :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'"
          >
            Event Description (optional)
          </label>
          <textarea
            v-model="form.description"
            rows="4"
            :disabled="loading"
            class="w-full border rounded-lg px-3 py-3 text-sm transition-all duration-200 disabled:opacity-50"
            :class="
              isDarkMode
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-green-500 focus:ring-green-500'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-green-500 focus:ring-green-500'
            "
            placeholder="Enter event description"
          ></textarea>
        </div>

        <!-- Statisticians -->
        <div>
          <label
            class="block text-sm font-medium mb-2 transition-colors duration-200"
            :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'"
          >
            Statisticians
          </label>
          <Multiselect
            v-model="selectedStatisticians"
            :options="allEligibleUsers"
            :multiple="true"
            :track-by="'user_id'"
            :label="'email'"
            :disabled="loading"
            placeholder="Select statisticians"
            :class="isDarkMode ? 'multiselect-dark' : ''"
          >
            <template #tag="{ option, remove }">
              <span
                class="inline-flex items-center rounded-full px-2 py-1 text-sm mr-1 mb-1 transition-colors"
                :class="
                  isDarkMode
                    ? 'bg-gray-600 text-gray-200'
                    : 'bg-gray-200 text-gray-700'
                "
              >
                <img
                  :src="option.profile_photo || '/vsu.png'"
                  class="w-5 h-5 rounded-full mr-1"
                  alt="avatar"
                />
                {{ option.email }}
                <button
                  type="button"
                  class="ml-1 hover:text-red-500 transition-colors"
                  :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'"
                  @click.stop="remove(option)"
                >
                  &times;
                </button>
              </span>
            </template>

            <template #option="{ option }">
              <div class="flex items-center gap-2">
                <img
                  :src="option.profile_photo || '/vsu.png'"
                  class="w-6 h-6 rounded-full"
                  alt="avatar"
                />
                <span class="text-sm">{{ option.email }}</span>
              </div>
            </template>
          </Multiselect>

          <!-- Manual Statistician Input -->
          <div class="mt-4">
            <label
              class="block text-sm font-medium mb-2 transition-colors duration-200"
              :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'"
            >
              Manually Add Statistician (For non-registered users)
            </label>
            <div class="flex gap-2">
              <input
                v-model="manualStatisticianInput"
                type="text"
                :disabled="loading"
                placeholder="Full Name"
                class="flex-1 px-3 py-2 border rounded-md text-sm transition-all duration-200 disabled:opacity-50"
                :class="
                  isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-green-500 focus:ring-green-500'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-green-500 focus:ring-green-500'
                "
              />
              <button
                type="button"
                @click="addManualStatistician"
                :disabled="loading"
                class="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                Add
              </button>
            </div>

            <div
              v-if="manualStatisticians.length"
              class="mt-2 flex flex-wrap gap-2"
            >
              <span
                v-for="(name, index) in manualStatisticians"
                :key="index"
                class="inline-flex items-center px-3 py-1 rounded-full text-sm transition-colors"
                :class="
                  isDarkMode
                    ? 'bg-gray-600 text-gray-200'
                    : 'bg-gray-200 text-gray-700'
                "
              >
                {{ name }}
                <button
                  @click="manualStatisticians.splice(index, 1)"
                  :disabled="loading"
                  class="ml-2 hover:text-red-600 transition-colors disabled:opacity-50"
                  :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'"
                  title="Remove"
                >
                  &times;
                </button>
              </span>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex justify-end gap-3 mt-8">
          <button
            type="button"
            @click="handleClose"
            :disabled="loading"
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
            :disabled="loading"
            class="px-6 py-3 text-sm font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-[140px] justify-center"
            :class="
              isDarkMode
                ? 'text-green-100 bg-green-700 border border-transparent hover:bg-green-600'
                : 'text-white bg-green-600 border border-transparent hover:bg-green-700'
            "
          >
            <i v-if="loading" class="fas fa-spinner fa-spin"></i>
            <i v-else class="fas fa-save"></i>
            {{ loading ? "Saving..." : "Save Changes" }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
/* More specific multiselect dark mode styles */
:deep(.multiselect-dark.multiselect .multiselect__tags) {
  background: rgb(55, 65, 81) !important;
  border-color: rgb(75, 85, 99) !important;
  color: white !important;
}

:deep(.multiselect-dark.multiselect .multiselect__input) {
  background: transparent !important;
  color: white !important;
}

:deep(.multiselect-dark.multiselect .multiselect__input::placeholder) {
  color: rgb(156, 163, 175) !important;
}

:deep(.multiselect-dark.multiselect .multiselect__content-wrapper) {
  background: rgb(55, 65, 81) !important;
  border-color: rgb(75, 85, 99) !important;
  border: 1px solid rgb(75, 85, 99) !important;
}

:deep(.multiselect-dark.multiselect .multiselect__content) {
  background: rgb(55, 65, 81) !important;
}

:deep(.multiselect-dark.multiselect .multiselect__element) {
  background: rgb(55, 65, 81) !important;
}

:deep(.multiselect-dark.multiselect .multiselect__option) {
  color: white !important;
  background: rgb(55, 65, 81) !important;
}

:deep(.multiselect-dark.multiselect .multiselect__option:after) {
  background: rgb(55, 65, 81) !important;
}

:deep(.multiselect-dark.multiselect .multiselect__option--highlight) {
  background: rgb(34, 197, 94) !important;
  color: white !important;
}

:deep(.multiselect-dark.multiselect .multiselect__option--selected) {
  background: rgb(21, 128, 61) !important;
  color: white !important;
}

:deep(.multiselect-dark.multiselect .multiselect__placeholder) {
  color: rgb(156, 163, 175) !important;
}

:deep(.multiselect-dark.multiselect .multiselect__single) {
  color: white !important;
}

:deep(.multiselect-dark.multiselect .multiselect__select) {
  background: rgb(55, 65, 81) !important;
}

:deep(.multiselect-dark.multiselect .multiselect__select:before) {
  border-color: rgb(156, 163, 175) transparent transparent !important;
}
</style>
