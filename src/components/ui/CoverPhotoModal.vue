<script setup>
import { ref, watch } from "vue";

const props = defineProps({
  show: Boolean,
  loading: Boolean,
});

const emit = defineEmits(["close", "save"]);

const file = ref(null);
const error = ref(null);
const previewUrl = ref(null);
const fileName = ref("No file chosen");

const handleFileChange = (event) => {
  const selectedFile = event.target.files[0];
  if (selectedFile) {
    if (
      !["image/jpeg", "image/png", "image/jpg", "image/gif"].includes(
        selectedFile.type
      )
    ) {
      error.value = "Please select a valid image file (JPEG, PNG, JPG, GIF).";
      file.value = null;
      previewUrl.value = null;
      fileName.value = "No file chosen";
      return;
    }
    if (selectedFile.size > 5 * 1024 * 1024) {
      error.value = "File size must not exceed 5MB.";
      file.value = null;
      previewUrl.value = null;
      fileName.value = "No file chosen";
      return;
    }
    error.value = null;
    file.value = selectedFile;
    fileName.value = selectedFile.name;
    previewUrl.value = URL.createObjectURL(selectedFile);
    console.log(
      "Selected file:",
      file.value.name,
      file.value.type,
      file.value.size
    );
  } else {
    fileName.value = "No file chosen";
    file.value = null;
    previewUrl.value = null;
  }
};

const handleSave = () => {
  if (!file.value) {
    error.value = "Please select an image.";
    return;
  }
  console.log("Emitting save with file:", file.value.name);
  emit("save", file.value);
};

const handleClose = () => {
  error.value = null;
  file.value = null;
  previewUrl.value = null;
  fileName.value = "No file chosen";
  emit("close");
};

watch(
  () => props.show,
  (newVal) => {
    if (!newVal) {
      error.value = null;
      file.value = null;
      previewUrl.value = null;
      fileName.value = "No file chosen";
    }
  }
);
</script>

<template>
  <div
    v-if="show"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto"
  >
    <div
      class="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto relative"
    >
      <button
        @click="handleClose"
        class="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-gray-600 hover:text-gray-800 transition"
        title="Close"
      >
        <i class="fas fa-times text-xl"></i>
      </button>
      <div class="p-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">
          Upload Cover Photo
        </h3>

        <div v-if="error" class="mb-4 p-3 bg-red-50 text-red-700 rounded">
          {{ error }}
        </div>

        <div class="mb-4 flex items-center space-x-4">
          <label
            class="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition cursor-pointer"
          >
            Choose File
            <input
              type="file"
              accept="image/*"
              @change="handleFileChange"
              class="hidden"
            />
          </label>
          <span class="text-gray-600">{{ fileName }}</span>
        </div>

        <div v-if="previewUrl" class="mb-4">
          <img
            :src="previewUrl"
            alt="Preview"
            class="w-full h-32 object-cover rounded"
          />
        </div>

        <div class="flex justify-end">
          <button
            @click="handleSave"
            :disabled="loading || !file"
            class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="loading">Uploading...</span>
            <span v-else>Upload</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
