// EditEventModal.vue
<script setup>
import { ref, computed, watch } from "vue";
import { useToast } from "vue-toastification";
import DateUtils from "@/utils/DateUtils";
import { useEventStore } from "@/stores/event";

const toast = useToast();
const eventStore = useEventStore();

const props = defineProps({
  show: Boolean,
  event: Object,
  loading: Boolean,
});

const emit = defineEmits(["close", "save"]);

const form = ref({
  event_name: "",
  venue: "",
  event_code: "",
  start_date: "",
  end_date: "",
  description: "",
});

const originalFormValues = ref({});
const selectedFile = ref(null);
const errors = ref({});
const hasChanges = ref(false);

const initializeForm = () => {
  if (props.event) {
    console.log("Original start date:", props.event.start_date);
    form.value = {
      event_name: props.event.event_name || "",
      venue: props.event.venue || "",
      event_code: props.event.event_code || "",
      start_date: DateUtils.formatForInput(props.event.start_date),
      end_date: DateUtils.formatForInput(props.event.end_date),
      description: props.event.description || "",
    };
    originalFormValues.value = {
      event_name: props.event.event_name || "",
      venue: props.event.venue || "",
      event_code: props.event.event_code || "",
      start_date: props.event.start_date,
      end_date: props.event.end_date,
      description: props.event.description || "",
    };
    selectedFile.value = null;
    hasChanges.value = false;
  }
};

watch(
  form,
  () => {
    if (props.event) {
      hasChanges.value =
        form.value.event_name !== originalFormValues.value.event_name ||
        form.value.venue !== originalFormValues.value.venue ||
        form.value.description !== originalFormValues.value.description ||
        (form.value.start_date &&
          DateUtils.formatForApi(form.value.start_date) !==
            originalFormValues.value.start_date) ||
        (form.value.end_date &&
          DateUtils.formatForApi(form.value.end_date) !==
            originalFormValues.value.end_date) ||
        selectedFile.value !== null;
      console.log("Has changes:", hasChanges.value);
    }
  },
  { deep: true }
);

const isEndDateValid = computed(() => {
  if (!form.value.start_date || !form.value.end_date) return true;
  return new Date(form.value.end_date) >= new Date(form.value.start_date);
});

const detectChanges = () => {
  const startChanged = DateUtils.hasDateChanged(
    form.value.start_date,
    originalFormValues.value.start_date
  );
  const endChanged = DateUtils.hasDateChanged(
    form.value.end_date,
    originalFormValues.value.end_date
  );

  return (
    form.value.event_name !== originalFormValues.value.event_name ||
    form.value.venue !== originalFormValues.value.venue ||
    form.value.description !== originalFormValues.value.description ||
    startChanged ||
    endChanged ||
    selectedFile.value !== null
  );
};

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

  if (!form.value.venue) {
    errors.value.venue = ["Venue is required"];
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

  if (!detectChanges()) {
    toast.error(
      "No changes detected. Please modify at least one field before saving.",
      { timeout: 5000 }
    );
    isValid = false;
  }

  if (form.value.start_date) {
    const startDate = DateUtils.parseDate(form.value.start_date);
    if (!startDate || isNaN(startDate.getTime())) {
      errors.value.start_date = ["Invalid start date"];
      isValid = false;
    }
  }

  if (form.value.end_date) {
    const endDate = DateUtils.parseDate(form.value.end_date);
    if (!endDate || isNaN(endDate.getTime())) {
      errors.value.end_date = ["Invalid end date"];
      isValid = false;
    } else if (form.value.start_date) {
      const startDate = DateUtils.parseDate(form.value.start_date);
      if (endDate < startDate) {
        errors.value.end_date = ["End date must be after start date"];
        isValid = false;
      }
    }
  }

  return isValid;
};

const handleFileChange = (event) => {
  const file = event.target.files[0];
  if (file) {
    console.log("Selected file:", file);
    selectedFile.value = file;
    hasChanges.value = true;
  }
};

const submit = async () => {
  if (!detectChanges()) {
    toast.info("No changes detected.");
    return;
  }

  if (!validateForm()) return;

  const formData = new FormData();
  formData.append("event_name", form.value.event_name || "");
  formData.append("venue", form.value.venue || "");
  formData.append("description", form.value.description || "");
  formData.append("_method", "PATCH");

  const start = DateUtils.formatForApi(form.value.start_date);
  const end = DateUtils.formatForApi(form.value.end_date);

  if (start) formData.append("start_date", start);
  if (end) formData.append("end_date", end);
  if (selectedFile.value) formData.append("cover_photo", selectedFile.value);

  try {
    const response = await eventStore.updateEvent(
      props.event.event_id,
      formData
    );

    if (!response.success) {
      toast.info(response.message || "No changes made.");
      return;
    }

    toast.success("Event updated successfully!");
    handleClose();
  } catch (error) {
    toast.error("Error occurred while updating the event.");
  }
};

const handleClose = () => {
  errors.value = {};
  selectedFile.value = null;
  hasChanges.value = false;
  initializeForm();
  emit("close");
};

watch(
  form,
  () => {
    if (props.event) {
      hasChanges.value =
        (form.value.event_name || "") !==
          (originalFormValues.value.event_name || "") ||
        (form.value.venue || "") !== (originalFormValues.value.venue || "") ||
        (form.value.description || "") !==
          (originalFormValues.value.description || "") ||
        (form.value.start_date &&
          DateUtils.hasDateChanged(
            form.value.start_date,
            originalFormValues.value.start_date
          )) ||
        (form.value.end_date &&
          DateUtils.hasDateChanged(
            form.value.end_date,
            originalFormValues.value.end_date
          )) ||
        selectedFile.value !== null;
      console.log("Has changes:", hasChanges.value);
      console.log("Field comparison:", {
        name: form.value.event_name === originalFormValues.value.event_name,
        venue: form.value.venue === originalFormValues.value.venue,
        start: DateUtils.formatForApi(form.value.start_date),
        originalStart: originalFormValues.value.start_date,
      });
    }
  },
  { deep: true }
);
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
        <form @submit.prevent="submit" class="space-y-4">
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
              >Venue</label
            >
            <input
              v-model="form.venue"
              type="text"
              class="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-600"
              :class="{ 'border-red-500': errors.venue }"
              required
            />
            <p v-if="errors.venue" class="text-red-500 text-xs mt-1">
              {{ errors.venue[0] }}
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
              >Cover Photo</label
            >
            <input
              type="file"
              accept="image/*"
              @change="handleFileChange"
              class="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-600"
            />
            <p v-if="selectedFile" class="text-green-600 text-xs mt-1">
              Selected: {{ selectedFile.name }}
            </p>
            <p
              v-else-if="props.event && props.event.cover_photo"
              class="text-gray-600 text-xs mt-1"
            >
              Current: {{ props.event.cover_photo.split("/").pop() }}
            </p>
            <p v-if="errors.cover_photo" class="text-red-500 text-xs mt-1">
              {{ errors.cover_photo[0] }}
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
              type="button"
              @click="handleClose"
              class="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition"
            >
              Cancel
            </button>
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
