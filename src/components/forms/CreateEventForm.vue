<script setup>
import { ref, computed } from "vue";
import { useToast } from "vue-toastification";

const toast = useToast();

const props = defineProps({
  judges: {
    type: Array,
    required: true,
  },
  user: {
    type: Object,
    required: true,
  },
  errors: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits(["submit"]);

const event = ref({
  event_name: "",
  event_description: "",
  event_date: "",
  event_location: "",
  event_type: "competition",
  event_status: "upcoming",
  judge_id: null,
});
const isSubmitting = ref(false);
const formErrors = ref({});

// Validation rules
const validateField = (field, value) => {
  switch (field) {
    case "event_name":
      if (!value) return "Event name is required.";
      if (value.length < 3) return "Event name must be at least 3 characters.";
      return "";
    case "event_description":
      if (value && value.length > 500)
        return "Description cannot exceed 500 characters.";
      return "";
    case "event_date":
      if (!value) return "Event date is required.";
      const today = new Date().toISOString().split("T")[0];
      if (value < today) return "Event date cannot be in the past.";
      return "";
    case "event_location":
      if (!value) return "Location is required.";
      if (value.length < 3) return "Location must be at least 3 characters.";
      return "";
    case "event_type":
      if (!["competition", "workshop", "seminar"].includes(value))
        return "Invalid event type.";
      return "";
    case "event_status":
      if (!["upcoming", "ongoing", "completed"].includes(value))
        return "Invalid event status.";
      return "";
    case "judge_id":
      if (value && !props.judges.some((judge) => judge.user_id === value))
        return "Invalid judge selected.";
      return "";
    default:
      return "";
  }
};

// Check required fields
const checkRequiredFields = () => {
  const requiredFields = [
    { key: "event_name", label: "Event Name" },
    { key: "event_date", label: "Event Date" },
    { key: "event_location", label: "Location" },
  ];
  const missingFields = requiredFields.filter(
    (field) => !event.value[field.key]
  );
  missingFields.forEach((field) => {
    toast.error(`${field.label}: This field is required`);
  });
  return missingFields.length === 0;
};

// Validate all fields
const validateForm = () => {
  formErrors.value = {
    event_name: validateField("event_name", event.value.event_name),
    event_description: validateField(
      "event_description",
      event.value.event_description
    ),
    event_date: validateField("event_date", event.value.event_date),
    event_location: validateField("event_location", event.value.event_location),
    event_type: validateField("event_type", event.value.event_type),
    event_status: validateField("event_status", event.value.event_status),
    judge_id: validateField("judge_id", event.value.judge_id),
  };
  return Object.values(formErrors.value).every((error) => !error);
};

// Handle input change
const handleInput = (field) => {
  formErrors.value[field] = validateField(field, event.value[field]);
};

// Submit form
const submitForm = async () => {
  isSubmitting.value = true;
  if (!checkRequiredFields()) {
    validateForm();
    isSubmitting.value = false;
    return;
  }
  if (!validateForm()) {
    toast.error("Please fix form errors before submitting.");
    isSubmitting.value = false;
    return;
  }
  try {
    await emit("submit", event.value);
  } catch (errors) {
    formErrors.value = errors;
  } finally {
    isSubmitting.value = false;
  }
};

// Computed property to disable submit button
const isSubmitDisabled = computed(() => {
  return (
    Object.values(formErrors.value).some((error) => error) ||
    !event.value.event_name ||
    !event.value.event_date ||
    !event.value.event_location ||
    isSubmitting.value
  );
});
</script>

<template>
  <form @submit.prevent="submitForm" class="space-y-4">
    <div class="relative">
      <label class="block text-sm font-medium text-gray-700">Event Name</label>
      <div class="relative">
        <i class="fas fa-calendar-alt absolute left-3 top-4 text-gray-500"></i>
        <input
          v-model="event.event_name"
          type="text"
          class="mt-1 block w-full pl-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
          required
          @input="handleInput('event_name')"
        />
      </div>
      <p
        v-if="formErrors.event_name || errors.event_name"
        class="mt-1 text-sm text-red-600"
      >
        {{
          formErrors.event_name || (errors.event_name && errors.event_name[0])
        }}
      </p>
    </div>
    <div class="relative">
      <label class="block text-sm font-medium text-gray-700">Description</label>
      <div class="relative">
        <i class="fas fa-file-alt absolute left-3 top-4 text-gray-500"></i>
        <textarea
          v-model="event.event_description"
          class="mt-1 block w-full pl-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
          rows="4"
          @input="handleInput('event_description')"
        ></textarea>
      </div>
      <p
        v-if="formErrors.event_description || errors.event_description"
        class="mt-1 text-sm text-red-600"
      >
        {{
          formErrors.event_description ||
          (errors.event_description && errors.event_description[0])
        }}
      </p>
    </div>
    <div class="relative">
      <label class="block text-sm font-medium text-gray-700">Event Date</label>
      <div class="relative">
        <i class="fas fa-calendar-day absolute left-3 top-4 text-gray-500"></i>
        <input
          v-model="event.event_date"
          type="date"
          class="mt-1 block w-full pl-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
          required
          @input="handleInput('event_date')"
        />
      </div>
      <p
        v-if="formErrors.event_date || errors.event_date"
        class="mt-1 text-sm text-red-600"
      >
        {{
          formErrors.event_date || (errors.event_date && errors.event_date[0])
        }}
      </p>
    </div>
    <div class="relative">
      <label class="block text-sm font-medium text-gray-700">Location</label>
      <div class="relative">
        <i
          class="fas fa-map-marker-alt absolute left-3 top-4 text-gray-500"
        ></i>
        <input
          v-model="event.event_location"
          type="text"
          class="mt-1 block w-full pl-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
          required
          @input="handleInput('event_location')"
        />
      </div>
      <p
        v-if="formErrors.event_location || errors.event_location"
        class="mt-1 text-sm text-red-600"
      >
        {{
          formErrors.event_location ||
          (errors.event_location && errors.event_location[0])
        }}
      </p>
    </div>
    <div class="relative">
      <label class="block text-sm font-medium text-gray-700">Event Type</label>
      <div class="relative">
        <i class="fas fa-list absolute left-3 top-4 text-gray-500"></i>
        <select
          v-model="event.event_type"
          class="mt-1 block w-full pl-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
          @input="handleInput('event_type')"
        >
          <option value="competition">Competition</option>
          <option value="workshop">Workshop</option>
          <option value="seminar">Seminar</option>
        </select>
      </div>
      <p
        v-if="formErrors.event_type || errors.event_type"
        class="mt-1 text-sm text-red-600"
      >
        {{
          formErrors.event_type || (errors.event_type && errors.event_type[0])
        }}
      </p>
    </div>
    <div class="relative">
      <label class="block text-sm font-medium text-gray-700">Status</label>
      <div class="relative">
        <i class="fas fa-toggle-on absolute left-3 top-4 text-gray-500"></i>
        <select
          v-model="event.event_status"
          class="mt-1 block w-full pl-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
          @input="handleInput('event_status')"
        >
          <option value="upcoming">Upcoming</option>
          <option value="ongoing">Ongoing</option>
          <option value="completed">Completed</option>
        </select>
      </div>
      <p
        v-if="formErrors.event_status || errors.event_status"
        class="mt-1 text-sm text-red-600"
      >
        {{
          formErrors.event_status ||
          (errors.event_status && errors.event_status[0])
        }}
      </p>
    </div>
    <div class="relative">
      <label class="block text-sm font-medium text-gray-700">Judge</label>
      <div class="relative">
        <i class="fas fa-user-tie absolute left-3 top-4 text-gray-500"></i>
        <select
          v-model="event.judge_id"
          class="mt-1 block w-full pl-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
          @input="handleInput('judge_id')"
        >
          <option :value="null">Select Judge</option>
          <option
            v-for="judge in judges"
            :key="judge.user_id"
            :value="judge.user_id"
          >
            {{ judge.first_name }} {{ judge.last_name }}
          </option>
        </select>
      </div>
      <p
        v-if="formErrors.judge_id || errors.judge_id"
        class="mt-1 text-sm text-red-600"
      >
        {{ formErrors.judge_id || (errors.judge_id && errors.judge_id[0]) }}
      </p>
    </div>
    <div class="flex space-x-4">
      <button
        type="submit"
        class="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none transition-colors"
        :disabled="isSubmitDisabled"
      >
        {{ isSubmitting ? "Processing" : "Create Event" }}
      </button>
    </div>
  </form>
</template>

<style scoped>
.relative {
  position: relative;
}
</style>
