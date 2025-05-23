<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useEventStore } from "@/stores/event";
import { useUserStore } from "@/stores/user";
import { useToast } from "vue-toastification";
import axiosClient from "@/axios";
import Navbar from "@/components/layout/Navbar.vue";
import Sidebar from "@/components/layout/Sidebar.vue";
import Breadcrumbs from "@/components/layout/Breadcrumbs.vue";

const toast = useToast();
const router = useRouter();
const eventStore = useEventStore();
const userStore = useUserStore();

const userId = computed(() => userStore.user?.user_id);

const eventData = ref({
  event_name: "",
  venue: "", // ✅ replaced event_code
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

onMounted(async () => {
  try {
    if (!userStore.user) {
      await userStore.fetchUser();
      if (userStore.user?.user_id) {
        eventData.value.created_by = userStore.user.user_id;
      }
    }
  } catch (error) {
    serverError.value = "Unable to fetch user data. Redirecting to login...";
    toast.error(serverError.value, { timeout: 5000 });
    setTimeout(() => router.push("/login"), 2000);
  }
});

const createEvent = async () => {
  if (isSubmitting.value) return;

  isSubmitting.value = true;
  errors.value = {};
  serverError.value = "";

  if (!validateEventData()) {
    isSubmitting.value = false;
    return;
  }

  try {
    const formData = new FormData();
    formData.append("event_name", eventData.value.event_name);
    formData.append("venue", eventData.value.venue);
    formData.append(
      "start_date",
      new Date(eventData.value.start_date)
        .toISOString()
        .slice(0, 19)
        .replace("T", " ")
    );
    formData.append(
      "end_date",
      new Date(eventData.value.end_date)
        .toISOString()
        .slice(0, 19)
        .replace("T", " ")
    );
    formData.append("status", eventData.value.status);
    formData.append("division", eventData.value.division || "standard");
    formData.append("description", eventData.value.description || "");
    formData.append("created_by", eventData.value.created_by);

    if (eventData.value.cover_photo) {
      formData.append("cover_photo", eventData.value.cover_photo);
    }

    const response = await axiosClient.post("/api/v1/events/create", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    toast.success("Event created successfully!", { timeout: 3000 });
    await eventStore.fetchEvents(true);
    router.push("/admin/dashboard");
  } catch (error) {
    handleCreateError(error);
  } finally {
    isSubmitting.value = false;
  }
};

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

  return isValid;
};

const handleCreateError = (error) => {
  if (error.response?.status === 422) {
    errors.value = error.response.data.errors || {};
    serverError.value = "Validation failed. Please check the form.";
    toast.error(serverError.value, { timeout: 5000 });
  } else if (error.response?.status === 401) {
    serverError.value = "You are not authorized to create events.";
    toast.error(serverError.value, { timeout: 5000 });
    setTimeout(() => router.push("/login/admin"), 2000);
  } else {
    serverError.value = "Failed to create event.";
    toast.error(serverError.value, { timeout: 5000 });
  }
};
</script>

<template>
  <div class="min-h-screen bg-gray-100">
    <Navbar />
    <Sidebar />
    <Breadcrumbs
      :items="[
        { label: 'Dashboard', to: '/admin/dashboard' },
        { label: 'Create Event' },
      ]"
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
          >
            Event Name (max 50 characters)
          </label>
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
          <label for="venue" class="block text-sm font-medium text-gray-700">
            Venue
          </label>
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
          >
            Start Date & Time
          </label>
          <FlatPickr
            v-model="eventData.start_date"
            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
            required
          />
          <p v-if="errors.start_date" class="mt-1 text-sm text-red-600">
            {{ errors.start_date[0] }}
          </p>
        </div>
        <div>
          <label for="end_date" class="block text-sm font-medium text-gray-700">
            End Date & Time
          </label>
          <FlatPickr
            v-model="eventData.end_date"
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
          >
            Event Description (optional)
          </label>
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
          <label for="status" class="block text-sm font-medium text-gray-700">
            Status
          </label>
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
          <label class="block text-sm font-medium text-gray-700">
            Event Cover Photo (optional, max 5MB)
          </label>
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
              class="absolute top-0 right-0 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-700 focus:outline-none"
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
