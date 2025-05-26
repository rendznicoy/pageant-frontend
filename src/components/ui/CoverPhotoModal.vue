<script setup>
import { ref, watch, computed } from "vue";
import { useDarkModeStore } from "@/stores/darkMode";

const props = defineProps({
  show: Boolean,
  loading: Boolean,
});

const emit = defineEmits(["close", "save"]);

const darkModeStore = useDarkModeStore();
const isDarkMode = computed(() => darkModeStore.isDarkMode);

const file = ref(null);
const error = ref(null);
const previewUrl = ref(null);
const fileName = ref("No file chosen");
const dragOver = ref(false);

const handleFileChange = (event) => {
  const selectedFile = event.target.files[0];
  processFile(selectedFile);
};

const handleDrop = (event) => {
  event.preventDefault();
  dragOver.value = false;
  const selectedFile = event.dataTransfer.files[0];
  if (selectedFile) {
    processFile(selectedFile);
  }
};

const handleDragOver = (event) => {
  event.preventDefault();
  dragOver.value = true;
};

const handleDragLeave = () => {
  dragOver.value = false;
};

const processFile = (selectedFile) => {
  if (!selectedFile) {
    fileName.value = "No file chosen";
    file.value = null;
    previewUrl.value = null;
    return;
  }

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
};

const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
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
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
  }
  previewUrl.value = null;
  fileName.value = "No file chosen";
  dragOver.value = false;
  emit("close");
};

const removeFile = () => {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
  }
  file.value = null;
  previewUrl.value = null;
  fileName.value = "No file chosen";
  error.value = null;
};

watch(
  () => props.show,
  (newVal) => {
    if (!newVal) {
      handleClose();
    }
  }
);
</script>

<template>
  <div
    v-if="show"
    class="fixed inset-0 backdrop-blur-sm bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto transition-all duration-300"
  >
    <div
      class="rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative animate-in fade-in-0 zoom-in-95 transition-all duration-300"
      :class="isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'"
    >
      <!-- Header -->
      <div
        class="flex items-center justify-between p-6 border-b transition-colors"
        :class="isDarkMode ? 'border-gray-600' : 'border-gray-200'"
      >
        <div class="flex items-center">
          <div
            class="w-10 h-10 rounded-lg flex items-center justify-center mr-3"
            :class="
              isDarkMode
                ? 'bg-blue-900/30 text-blue-400'
                : 'bg-blue-100 text-blue-600'
            "
          >
            <i class="fas fa-image text-lg"></i>
          </div>
          <div>
            <h3
              class="text-xl font-bold transition-colors"
              :class="isDarkMode ? 'text-white' : 'text-gray-900'"
            >
              Upload Cover Photo
            </h3>
            <p
              class="text-sm transition-colors"
              :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'"
            >
              Choose an image to represent your event
            </p>
          </div>
        </div>
        <button
          @click="handleClose"
          class="w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200"
          :class="
            isDarkMode
              ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          "
          title="Close"
        >
          <i class="fas fa-times text-lg"></i>
        </button>
      </div>

      <div class="p-6 space-y-6">
        <!-- Error Message -->
        <div
          v-if="error"
          class="p-4 rounded-lg border transition-colors"
          :class="
            isDarkMode
              ? 'bg-red-900/20 border-red-700 text-red-400'
              : 'bg-red-50 border-red-200 text-red-700'
          "
        >
          <div class="flex items-center">
            <i class="fas fa-exclamation-triangle mr-2"></i>
            {{ error }}
          </div>
        </div>

        <!-- Upload Area -->
        <div
          @drop="handleDrop"
          @dragover="handleDragOver"
          @dragleave="handleDragLeave"
          class="relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200"
          :class="[
            dragOver
              ? isDarkMode
                ? 'border-blue-400 bg-blue-900/20'
                : 'border-blue-400 bg-blue-50'
              : isDarkMode
              ? 'border-gray-600 hover:border-gray-500 bg-gray-700/30'
              : 'border-gray-300 hover:border-gray-400 bg-gray-50',
            'cursor-pointer',
          ]"
        >
          <input
            type="file"
            accept="image/*"
            @change="handleFileChange"
            class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />

          <div v-if="!previewUrl" class="space-y-4">
            <div
              class="w-16 h-16 mx-auto rounded-full flex items-center justify-center transition-colors"
              :class="
                dragOver
                  ? isDarkMode
                    ? 'bg-blue-900/40 text-blue-400'
                    : 'bg-blue-100 text-blue-600'
                  : isDarkMode
                  ? 'bg-gray-600 text-gray-400'
                  : 'bg-gray-200 text-gray-500'
              "
            >
              <i class="fas fa-cloud-upload-alt text-2xl"></i>
            </div>
            <div>
              <p
                class="text-lg font-medium mb-2 transition-colors"
                :class="isDarkMode ? 'text-gray-200' : 'text-gray-700'"
              >
                Drop your image here, or
                <span
                  class="transition-colors"
                  :class="isDarkMode ? 'text-blue-400' : 'text-blue-600'"
                >
                  browse
                </span>
              </p>
              <p
                class="text-sm transition-colors"
                :class="isDarkMode ? 'text-gray-500' : 'text-gray-500'"
              >
                Supports: JPEG, PNG, JPG, GIF (Max 5MB)
              </p>
            </div>
          </div>

          <!-- Preview -->
          <div v-else class="relative">
            <img
              :src="previewUrl"
              alt="Preview"
              class="w-full h-48 object-cover rounded-lg shadow-md"
            />
            <button
              @click.stop="removeFile"
              class="absolute top-2 right-2 w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700 transition-colors shadow-lg"
              title="Remove image"
            >
              <i class="fas fa-times text-sm"></i>
            </button>
          </div>
        </div>

        <!-- File Info -->
        <div
          v-if="file"
          class="p-4 rounded-lg border transition-colors"
          :class="
            isDarkMode
              ? 'bg-gray-700/50 border-gray-600'
              : 'bg-gray-50 border-gray-200'
          "
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <div
                class="w-10 h-10 rounded-lg flex items-center justify-center"
                :class="
                  isDarkMode
                    ? 'bg-green-900/40 text-green-400'
                    : 'bg-green-100 text-green-600'
                "
              >
                <i class="fas fa-file-image"></i>
              </div>
              <div>
                <p
                  class="font-medium transition-colors"
                  :class="isDarkMode ? 'text-gray-200' : 'text-gray-800'"
                >
                  {{ fileName }}
                </p>
                <p
                  class="text-sm transition-colors"
                  :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'"
                >
                  {{ formatFileSize(file.size) }}
                </p>
              </div>
            </div>
            <div
              class="w-6 h-6 rounded-full flex items-center justify-center"
              :class="
                isDarkMode
                  ? 'bg-green-900/40 text-green-400'
                  : 'bg-green-100 text-green-600'
              "
            >
              <i class="fas fa-check text-sm"></i>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex justify-end space-x-3 pt-4">
          <button
            @click="handleClose"
            class="px-6 py-3 text-sm font-medium rounded-lg transition-all duration-200"
            :class="
              isDarkMode
                ? 'text-gray-300 bg-gray-700 border border-gray-600 hover:bg-gray-600'
                : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
            "
            :disabled="loading"
          >
            Cancel
          </button>
          <button
            @click="handleSave"
            :disabled="loading || !file"
            class="px-6 py-3 text-sm font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            :class="
              isDarkMode
                ? 'text-blue-100 bg-blue-700 border border-transparent hover:bg-blue-600'
                : 'text-white bg-blue-600 border border-transparent hover:bg-blue-700'
            "
          >
            <i v-if="loading" class="fas fa-spinner fa-spin"></i>
            <i v-else class="fas fa-upload"></i>
            <span>{{ loading ? "Uploading..." : "Upload Photo" }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Smooth animations */
@keyframes fade-in-0 {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes zoom-in-95 {
  from {
    transform: scale(0.95);
  }
  to {
    transform: scale(1);
  }
}

.animate-in {
  animation: fade-in-0 0.2s ease-out, zoom-in-95 0.2s ease-out;
}

/* Drag and drop visual feedback */
.border-dashed {
  border-style: dashed;
}

/* File input styling */
input[type="file"] {
  cursor: pointer;
}
</style>
