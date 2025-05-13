<script setup>
import { ref, computed, watch } from "vue";
import { useToast } from "vue-toastification";
import DateUtils from "@/utils/DateUtils"; // Import the new DateUtils

const toast = useToast();

const props = defineProps({
  show: Boolean,
  event: Object,
  loading: Boolean,
});

const emit = defineEmits(["close", "save"]);

const form = ref({
  event_name: "",
  event_code: "",
  start_date: "",
  end_date: "",
  description: "",
});

const errors = ref({});

// Initialize form with event data using DateUtils
const initializeForm = () => {
  if (props.event) {
    form.value = {
      event_name: props.event.event_name || "",
      event_code: props.event.event_code || "",
      // Format dates for input fields
      start_date: DateUtils.formatForInput(props.event.start_date),
      end_date: DateUtils.formatForInput(props.event.end_date),
      description: props.event.description || "",
    };
  }
};

// Compute validation for dates
const isEndDateValid = computed(() => {
  if (!form.value.start_date || !form.value.end_date) return true;
  return new Date(form.value.end_date) >= new Date(form.value.start_date);
});

const validateForm = () => {
  errors.value = {};
  let isValid = true;

  if (!form.value.event_name) {
    errors.value.event_name = ["Event name is required"];
    isValid = false;
  } else if (form.value.event_name.length > 255) {
    errors.value.event_name = ["Event name must be 255 characters or less"];
    isValid = false;
  }

  if (form.value.start_date && !DateUtils.parseDate(form.value.start_date)) {
    errors.value.start_date = ["Invalid start date and time"];
    isValid = false;
  }

  if (form.value.end_date && !DateUtils.parseDate(form.value.end_date)) {
    errors.value.end_date = ["Invalid end date and time"];
    isValid = false;
  }

  if (!isEndDateValid.value) {
    errors.value.end_date = ["End date must be on or after start date"];
    isValid = false;
  }

  return isValid;
};

const handleSave = () => {
  if (!validateForm()) {
    toast.error("Please fix the form errors.", { timeout: 5000 });
    return;
  }

  const payload = {
    event_name: form.value.event_name,
    // Format dates for API using our utility
    start_date: DateUtils.formatForApi(form.value.start_date),
    end_date: DateUtils.formatForApi(form.value.end_date),
    description: form.value.description || "",
  };

  emit("save", payload);
};

const handleClose = () => {
  errors.value = {};
  initializeForm();
  emit("close");
};

watch(() => props.event, initializeForm, { immediate: true });
</script>

<template>
  <div
    v-if="show"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
  >
    <div class="bg-white rounded-lg shadow-xl max-w-lg w-full relative">
      <button
        @click="handleClose"
        class="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-gray-600 hover:text-gray-800 transition"
        title="Close"
      >
        <i class="fas fa-times text-xl"></i>
      </button>
      <div class="p-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Edit Event</h3>

        <form @submit.prevent="handleSave" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Event Name</label
            >
            <input
              v-model="form.event_name"
              type="text"
              maxlength="255"
              class="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-600"
              :class="{ 'border-red-500': errors.event_name }"
              required
            />
            <p v-if="errors.event_name" class="text-red-500 text-xs mt-1">
              {{ errors.event_name[0] }}
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Event Code</label
            >
            <input
              :value="form.event_code"
              type="text"
              class="w-full border rounded px-3 py-2 bg-gray-100 text-gray-600 cursor-not-allowed"
              readonly
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Start Date & Time</label
            >
            <input
              v-model="form.start_date"
              type="datetime-local"
              class="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-600"
              :class="{ 'border-red-500': errors.start_date }"
            />
            <p v-if="errors.start_date" class="text-red-500 text-xs mt-1">
              {{ errors.start_date[0] }}
            </p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >End Date & Time</label
            >
            <input
              v-model="form.end_date"
              type="datetime-local"
              class="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-600"
              :class="{ 'border-red-500': errors.end_date || !isEndDateValid }"
            />
            <p v-if="errors.end_date" class="text-red-500 text-xs mt-1">
              {{ errors.end_date[0] }}
            </p>
            <p v-else-if="!isEndDateValid" class="text-red-500 text-xs mt-1">
              End date must be on or after start date
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Description</label
            >
            <textarea
              v-model="form.description"
              class="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-600"
              rows="4"
            ></textarea>
            <p v-if="errors.description" class="text-red-500 text-xs mt-1">
              {{ errors.description[0] }}
            </p>
          </div>

          <div class="flex justify-end space-x-2">
            <button
              type="submit"
              :disabled="loading || !isEndDateValid"
              class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span v-if="loading">Saving...</span>
              <span v-else>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
