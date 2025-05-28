<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useEventStore } from "@/stores/event";
import { useUserStore } from "@/stores/user";
import { useToast } from "vue-toastification";
import FlatPickr from "vue-flatpickr-component";
import "flatpickr/dist/flatpickr.css";
import axiosClient from "@/axios";
import Breadcrumbs from "@/components/layout/Breadcrumbs.vue";
import Multiselect from "vue-multiselect";
import "vue-multiselect/dist/vue-multiselect.min.css";
import DateUtils from "@/utils/DateUtils";

const toast = useToast();
const router = useRouter();
const eventStore = useEventStore();
const userStore = useUserStore();
const manualStatisticianInput = ref("");
const manualStatisticians = ref([]);

const userId = computed(() => userStore.user?.user_id);

const eventData = ref({
  event_name: "",
  venue: "",
  start_date: "",
  end_date: "",
  status: "inactive",
  cover_photo: null,
  description: "",
  division: "standard",
  created_by: userId.value,
});

watch(
  () => userId.value,
  (newVal) => {
    if (newVal) eventData.value.created_by = newVal;
  },
  { immediate: true }
);

const previewImage = ref(null);
const errors = ref({});
const serverError = ref("");
const isSubmitting = ref(false);

const selectedStatisticians = ref([]);
const allEligibleUsers = ref([]);

const fetchAdmins = async () => {
  try {
    const res = await axiosClient.get("/api/v1/users?roles=admin,tabulator");
    console.log("Raw response from /users:", res);
    allEligibleUsers.value = res.data || [];
  } catch {
    toast.error("Failed to load statisticians");
  }
};

onMounted(async () => {
  await fetchAdmins();
  if (!userStore.user) {
    await userStore.fetchUser();
    if (userStore.user?.user_id) {
      eventData.value.created_by = userStore.user.user_id;
    }
  }
});

const handleImageUpload = (e) => {
  const file = e.target.files[0];
  if (file) {
    eventData.value.cover_photo = file;
    previewImage.value = URL.createObjectURL(file);
  }
};

const clearPhoto = () => {
  eventData.value.cover_photo = null;
  previewImage.value = null;
};

const createEvent = async () => {
  if (isSubmitting.value) return;

  isSubmitting.value = true;
  errors.value = {};
  serverError.value = "";

  if (!validateEventData()) {
    isSubmitting.value = false;
    return;
  }

  // Show loading toast
  const loadingToastId = toast.info("Creating event...", {
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
    const formData = new FormData();
    formData.append("event_name", eventData.value.event_name);
    formData.append("venue", eventData.value.venue);
    formData.append(
      "start_date",
      DateUtils.formatForApi(eventData.value.start_date)
    );
    formData.append(
      "end_date",
      DateUtils.formatForApi(eventData.value.end_date)
    );
    formData.append("status", eventData.value.status);
    formData.append("division", eventData.value.division || "standard");
    formData.append("description", eventData.value.description || "");
    formData.append("created_by", eventData.value.created_by);
    formData.append(
      "statisticians",
      JSON.stringify([
        ...selectedStatisticians.value.map((user) => ({
          id: user.user_id,
          name: `${user.first_name} ${user.last_name}`,
        })),
        ...manualStatisticians.value.map((name) => ({
          id: null,
          name,
        })),
      ])
    );

    if (eventData.value.cover_photo) {
      formData.append("cover_photo", eventData.value.cover_photo);
    }

    for (let pair of formData.entries()) {
      console.log(`${pair[0]}:`, pair[1]);
    }

    await axiosClient.post("/api/v1/events/create", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    toast.dismiss(loadingToastId);

    toast.success(`"${eventData.value.event_name}" created successfully!`, {
      timeout: 4000,
      position: "top-right",
      icon: "fas fa-check-circle",
    });

    await eventStore.fetchEvents(true);
    router.push("/admin/dashboard");
  } catch (error) {
    // Dismiss loading toast
    toast.dismiss(loadingToastId);
    handleCreateError(error);
  } finally {
    isSubmitting.value = false;
  }
};

const formatDateTime = (date) =>
  new Date(date).toISOString().slice(0, 19).replace("T", " ");

const validateEventData = () => {
  let isValid = true;
  errors.value = {};

  if (!eventData.value.event_name) {
    errors.value.event_name = ["Event name is required"];
    isValid = false;
  }

  if (!eventData.value.venue) {
    errors.value.venue = ["Venue is required"];
    isValid = false;
  }

  if (
    !eventData.value.start_date ||
    isNaN(new Date(eventData.value.start_date).getTime())
  ) {
    errors.value.start_date = ["Invalid start date and time"];
    isValid = false;
  }

  if (
    !eventData.value.end_date ||
    isNaN(new Date(eventData.value.end_date).getTime())
  ) {
    errors.value.end_date = ["Invalid end date and time"];
    isValid = false;
  } else if (
    new Date(eventData.value.end_date) < new Date(eventData.value.start_date)
  ) {
    errors.value.end_date = ["End date and time must be after start date"];
    isValid = false;
  }

  if (!eventData.value.created_by) {
    serverError.value = "User not authenticated. Please log in again.";
    toast.error(serverError.value);
    setTimeout(() => router.push("/login/admin"), 2000);
    isValid = false;
  }

  if (
    eventData.value.cover_photo &&
    !["image/jpeg", "image/png", "image/jpg", "image/gif"].includes(
      eventData.value.cover_photo.type
    )
  ) {
    errors.value.cover_photo = ["Invalid image format"];
    isValid = false;
  } else if (eventData.value.cover_photo?.size > 5 * 1024 * 1024) {
    errors.value.cover_photo = ["Cover photo must be less than 5MB"];
    isValid = false;
  }

  if (!eventData.value.event_name?.trim()) {
    errors.value.event_name = ["Event name is required"];
    toast.error("Event name is required", {
      timeout: 4000,
      position: "top-right",
      icon: "fas fa-exclamation-triangle",
    });
    isValid = false;
  }

  if (!eventData.value.venue?.trim()) {
    errors.value.venue = ["Venue is required"];
    toast.error("Venue is required", {
      timeout: 4000,
      position: "top-right",
      icon: "fas fa-map-marker-alt",
    });
    isValid = false;
  }

  return isValid;
};

const handleCreateError = (error) => {
  if (error.response?.status === 422) {
    errors.value = error.response.data.errors || {};
    serverError.value = "Validation failed. Please check the form.";
    toast.error(serverError.value);
  } else if (error.response?.status === 401) {
    serverError.value = "You are not authorized to create events.";
    toast.error(serverError.value);
    setTimeout(() => router.push("/login/admin"), 2000);
  } else {
    serverError.value = "Failed to create event.";
    toast.error(serverError.value);
  }
};

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
  minDate: eventData.value.start_date || new Date(),
}));

const addManualStatistician = () => {
  const name = manualStatisticianInput.value.trim();
  if (name && !manualStatisticians.value.includes(name)) {
    manualStatisticians.value.push(name);
    manualStatisticianInput.value = "";
  }
};
</script>

<template>
  <div class="min-h-screen bg-gray-100">
    <Breadcrumbs
      :items="[{ label: 'Home', to: 'auto' }, { label: 'Create Event' }]"
    />

    <div class="p-6 max-w-lg mx-auto">
      <h1 class="text-2xl font-bold text-gray-800 mb-6">Create New Event</h1>
      <div
        v-if="serverError"
        class="bg-red-200 border border-red-500 text-red-800 px-4 py-3 rounded relative mb-4"
        role="alert"
      >
        <span class="block sm:inline">{{ serverError }}</span>
      </div>
      <form @submit.prevent="createEvent" class="space-y-4">
        <div>
          <label
            for="event_name"
            class="block text-sm font-medium text-gray-700"
            >Event Name (max 50 characters)</label
          >
          <input
            id="event_name"
            v-model="eventData.event_name"
            type="text"
            maxlength="50"
            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
            required
          />
          <p v-if="errors.event_name" class="mt-1 text-sm text-red-600">
            {{ errors.event_name[0] }}
          </p>
        </div>

        <div>
          <label for="venue" class="block text-sm font-medium text-gray-700"
            >Venue</label
          >
          <input
            id="venue"
            v-model="eventData.venue"
            type="text"
            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
            required
          />
          <p v-if="errors.venue" class="mt-1 text-sm text-red-600">
            {{ errors.venue[0] }}
          </p>
        </div>

        <div>
          <label
            for="start_date"
            class="block text-sm font-medium text-gray-700"
            >Start Date & Time</label
          >
          <FlatPickr
            v-model="eventData.start_date"
            :config="flatPickrConfig"
            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
            required
          />
          <p v-if="errors.start_date" class="mt-1 text-sm text-red-600">
            {{ errors.start_date[0] }}
          </p>
        </div>

        <div>
          <label for="end_date" class="block text-sm font-medium text-gray-700"
            >End Date & Time</label
          >
          <FlatPickr
            v-model="eventData.end_date"
            :config="endDateConfig"
            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
            required
          />
          <p v-if="errors.end_date" class="mt-1 text-sm text-red-600">
            {{ errors.end_date[0] }}
          </p>
        </div>

        <div>
          <label
            for="description"
            class="block text-sm font-medium text-gray-700"
            >Event Description (optional)</label
          >
          <textarea
            id="description"
            v-model="eventData.description"
            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
            rows="4"
          ></textarea>
          <p v-if="errors.description" class="mt-1 text-sm text-red-600">
            {{ errors.description[0] }}
          </p>
        </div>

        <div>
          <label for="status" class="block text-sm font-medium text-gray-700"
            >Status</label
          >
          <select
            id="status"
            v-model="eventData.status"
            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
          >
            <option value="inactive">Inactive</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
          <p v-if="errors.status" class="mt-1 text-sm text-red-600">
            {{ errors.status[0] }}
          </p>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700"
            >Division</label
          >
          <select
            v-model="eventData.division"
            required
            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
          >
            <option value="standard">Standard</option>
            <option value="male-only">Male-only</option>
            <option value="female-only">Female-only</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700"
            >Statisticians</label
          >
          <Multiselect
            v-model="selectedStatisticians"
            :options="allEligibleUsers"
            :multiple="true"
            :track-by="'user_id'"
            :label="'email'"
            placeholder="Select statisticians"
            class="mt-1"
          >
            <template #tag="{ option, remove }">
              <span
                class="inline-flex items-center rounded-full bg-gray-200 px-2 py-1 text-sm text-gray-700 mr-1 mb-1"
              >
                <img
                  :src="option.profile_photo || '/user24.png'"
                  class="w-5 h-5 rounded-full mr-1"
                  alt="avatar"
                  @error="$event.target.src = '/user24.png'"
                />
                {{ option.email }}
                <button
                  type="button"
                  class="ml-1 text-gray-500 hover:text-red-500"
                  @click.stop="remove(option)"
                >
                  &times;
                </button>
              </span>
            </template>

            <template #option="{ option }">
              <div class="flex items-center gap-2">
                <img
                  :src="option.profile_photo || '/user24.png'"
                  class="w-6 h-6 rounded-full"
                  alt="avatar"
                  @error="$event.target.src = '/user24.png'"
                />
                <span class="text-sm">{{ option.email }}</span>
              </div>
            </template>
          </Multiselect>
          <div class="mt-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Manually Add Statistician (For non-registered users)
            </label>
            <div class="flex gap-2">
              <input
                v-model="manualStatisticianInput"
                type="text"
                placeholder="Full Name"
                class="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
              />
              <button
                type="button"
                @click="addManualStatistician"
                class="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
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
                class="inline-flex items-center bg-gray-200 px-3 py-1 rounded-full text-sm text-gray-700"
              >
                {{ name }}
                <button
                  @click="manualStatisticians.splice(index, 1)"
                  class="ml-2 text-gray-500 hover:text-red-600"
                  title="Remove"
                >
                  &times;
                </button>
              </span>
            </div>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700"
            >Event Cover Photo (optional, max 5MB)</label
          >
          <input
            type="file"
            @change="handleImageUpload"
            accept="image/jpeg,image/png,image/jpg,image/gif"
            class="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
          />
          <p v-if="errors.cover_photo" class="mt-1 text-sm text-red-600">
            {{ errors.cover_photo[0] }}
          </p>
          <div v-if="previewImage" class="relative mt-2">
            <img :src="previewImage" class="h-32 object-cover rounded" />
            <button
              type="button"
              @click="clearPhoto"
              class="absolute bottom-0 right-0 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-700 focus:outline-none"
              title="Remove photo"
              aria-label="Remove selected cover photo"
            >
              <span class="text-sm">×</span>
            </button>
          </div>
        </div>

        <div>
          <button
            type="submit"
            class="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none transition-colors"
            :disabled="isSubmitting"
          >
            {{ isSubmitting ? "Processing..." : "Create Event" }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
/* Add any specific styles if needed */
</style>
