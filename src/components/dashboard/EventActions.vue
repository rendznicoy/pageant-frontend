<script setup>
import { defineEmits, defineProps, computed } from "vue";
import { useDarkModeStore } from "@/stores/darkMode";

const props = defineProps({
  eventStatus: {
    type: String,
    default: "inactive",
  },
});

const emit = defineEmits([
  "edit",
  "view-results",
  "delete",
  "start",
  "finalize",
  "reset",
  "change-division",
]);

const darkModeStore = useDarkModeStore();
const isDarkMode = computed(() => darkModeStore.isDarkMode);

// Management Lock logic - Edit actions locked for both active AND completed events
const isManagementLocked = computed(() => {
  return props.eventStatus === "active" || props.eventStatus === "completed";
});

// Delete should only be disabled for active events, allow for inactive and completed
const isDeleteDisabled = computed(() => {
  return props.eventStatus === "active";
});

// Action definitions with metadata
const actions = computed(() => [
  {
    id: "change-division",
    label: "Change Division",
    icon: "fas fa-exchange-alt",
    color: "orange",
    disabled: isManagementLocked.value,
    description: "Modify event division type",
  },
  {
    id: "edit",
    label: "Edit Event",
    icon: "fas fa-edit",
    color: "green",
    disabled: isManagementLocked.value,
    description: "Update event details",
  },
  {
    id: "view-results",
    label: "View Results",
    icon: "fas fa-chart-line",
    color: "blue",
    disabled: false,
    description: "Preview event results",
  },
  {
    id: "start",
    label: "Start Event",
    icon: "fas fa-play",
    color: "indigo",
    disabled: false,
    description: "Begin event scoring",
  },
  {
    id: "finalize",
    label: "Finalize Event",
    icon: "fas fa-check-circle",
    color: "purple",
    disabled: false,
    description: "Complete and lock event",
  },
  {
    id: "reset",
    label: "Reset Event",
    icon: "fas fa-undo",
    color: "yellow",
    disabled: false,
    description: "Reset to inactive state",
  },
  {
    id: "delete",
    label: "Delete Event",
    icon: "fas fa-trash",
    color: "red",
    disabled: isDeleteDisabled.value, // Only disabled when active
    description: "Permanently remove event",
  },
]);

// Helper function to get tooltip message based on event status and action
const getTooltipMessage = (action) => {
  if (!action.disabled) return "";

  if (action.id === "delete") {
    return "🔒 Cannot delete active events";
  }

  // For management actions (edit, change-division)
  if (props.eventStatus === "active") {
    return "🔒 Cannot modify active events";
  } else if (props.eventStatus === "completed") {
    return "🔒 Cannot modify completed events";
  }

  return `🔒 Disabled: Event is ${props.eventStatus}`;
};

// Rest of the component code remains the same...
const getButtonClasses = (action) => {
  const baseClasses =
    "w-full p-4 rounded-lg transition-all duration-200 flex items-center justify-between group relative";

  if (action.disabled) {
    return `${baseClasses} ${
      isDarkMode.value
        ? "bg-gray-700/50 text-gray-500 cursor-not-allowed border border-gray-600"
        : "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
    }`;
  }

  const colorMap = {
    orange: isDarkMode.value
      ? "bg-orange-900/30 text-orange-400 border border-orange-700/50 hover:bg-orange-900/50 hover:border-orange-600"
      : "bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 hover:border-orange-300",
    green: isDarkMode.value
      ? "bg-green-900/30 text-green-400 border border-green-700/50 hover:bg-green-900/50 hover:border-green-600"
      : "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 hover:border-green-300",
    blue: isDarkMode.value
      ? "bg-blue-900/30 text-blue-400 border border-blue-700/50 hover:bg-blue-900/50 hover:border-blue-600"
      : "bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 hover:border-blue-300",
    indigo: isDarkMode.value
      ? "bg-indigo-900/30 text-indigo-400 border border-indigo-700/50 hover:bg-indigo-900/50 hover:border-indigo-600"
      : "bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300",
    purple: isDarkMode.value
      ? "bg-purple-900/30 text-purple-400 border border-purple-700/50 hover:bg-purple-900/50 hover:border-purple-600"
      : "bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 hover:border-purple-300",
    yellow: isDarkMode.value
      ? "bg-yellow-900/30 text-yellow-400 border border-yellow-700/50 hover:bg-yellow-900/50 hover:border-yellow-600"
      : "bg-yellow-50 text-yellow-700 border border-yellow-200 hover:bg-yellow-100 hover:border-yellow-300",
    red: isDarkMode.value
      ? "bg-red-900/30 text-red-400 border border-red-700/50 hover:bg-red-900/50 hover:border-red-600"
      : "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 hover:border-red-300",
  };

  return `${baseClasses} ${
    colorMap[action.color]
  } hover:scale-[1.02] hover:shadow-md`;
};

const handleAction = (actionId) => {
  emit(actionId);
};
</script>

<template>
  <div
    class="rounded-xl shadow-lg p-6 transition-all duration-300 border"
    :class="
      isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    "
  >
    <!-- Header -->
    <div class="flex items-center mb-6">
      <div
        class="w-10 h-10 rounded-lg flex items-center justify-center mr-3"
        :class="
          isDarkMode
            ? 'bg-emerald-900/30 text-emerald-400'
            : 'bg-emerald-100 text-emerald-600'
        "
      >
        <i class="fas fa-cogs text-lg"></i>
      </div>
      <div>
        <h3
          class="text-lg font-semibold transition-colors"
          :class="isDarkMode ? 'text-white' : 'text-gray-800'"
        >
          Event Actions
        </h3>
        <p
          class="text-xs transition-colors"
          :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'"
        >
          Manage and control your event
        </p>
      </div>
    </div>

    <!-- Actions Grid -->
    <div class="space-y-3">
      <div v-for="action in actions" :key="action.id" class="relative">
        <button
          @click="handleAction(action.id)"
          :disabled="action.disabled"
          :class="getButtonClasses(action)"
        >
          <!-- Left side - Icon and Label -->
          <div class="flex items-center">
            <div
              class="w-8 h-8 rounded-full flex items-center justify-center mr-3 transition-colors"
              :class="
                action.disabled
                  ? isDarkMode
                    ? 'bg-gray-600 text-gray-500'
                    : 'bg-gray-200 text-gray-400'
                  : 'bg-current bg-opacity-20'
              "
            >
              <i :class="action.icon + ' text-sm'"></i>
            </div>
            <div class="text-left">
              <div
                class="font-medium transition-colors"
                :class="
                  action.disabled
                    ? isDarkMode
                      ? 'text-gray-500'
                      : 'text-gray-400'
                    : ''
                "
              >
                {{ action.label }}
              </div>
              <div
                class="text-xs opacity-75 transition-colors"
                :class="
                  action.disabled
                    ? isDarkMode
                      ? 'text-gray-600'
                      : 'text-gray-400'
                    : ''
                "
              >
                {{ action.description }}
              </div>
            </div>
          </div>

          <!-- Right side - Arrow or Lock -->
          <div class="flex items-center">
            <i
              v-if="action.disabled"
              class="fas fa-lock text-sm opacity-50"
            ></i>
            <i
              v-else
              class="fas fa-chevron-right text-sm opacity-0 group-hover:opacity-100 transition-opacity"
            ></i>
          </div>

          <!-- Tooltip for disabled actions -->
          <div
            v-if="action.disabled"
            class="absolute -top-12 left-1/2 transform -translate-x-1/2 px-3 py-2 text-xs rounded-lg text-white bg-gray-800 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none"
          >
            {{ getTooltipMessage(action) }}
            <div
              class="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"
            ></div>
          </div>
        </button>
      </div>
    </div>

    <!-- Status Information -->
    <div
      class="mt-6 pt-4 border-t transition-colors"
      :class="isDarkMode ? 'border-gray-600' : 'border-gray-200'"
    >
      <div class="flex items-center justify-between">
        <span
          class="text-sm transition-colors"
          :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'"
        >
          Event Status
        </span>
        <div class="flex items-center">
          <div
            class="w-2 h-2 rounded-full mr-2 transition-colors"
            :class="{
              'bg-green-400': eventStatus === 'active',
              'bg-yellow-400': eventStatus === 'inactive',
              'bg-gray-400': eventStatus === 'completed',
            }"
          ></div>
          <span
            class="text-sm font-medium capitalize transition-colors"
            :class="{
              'text-green-400': eventStatus === 'active',
              'text-yellow-400': eventStatus === 'inactive',
              'text-gray-400': eventStatus === 'completed',
            }"
          >
            {{ eventStatus }}
          </span>
        </div>
      </div>

      <!-- Lock warning -->
      <div
        v-if="isManagementLocked"
        class="mt-3 p-3 rounded-lg text-sm transition-colors"
        :class="
          isDarkMode
            ? 'bg-amber-900/20 border border-amber-700/50 text-amber-400'
            : 'bg-amber-50 border border-amber-200 text-amber-700'
        "
      >
        <div class="flex items-center">
          <i class="fas fa-info-circle mr-2"></i>
          Management actions are locked for {{ eventStatus }} events
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Smooth hover animations */
.group:hover .group-hover\:opacity-100 {
  opacity: 1;
}

/* Custom tooltip arrow */
.pointer-events-none {
  pointer-events: none;
}

/* Smooth scaling */
.hover\:scale-\[1\.02\]:hover {
  transform: scale(1.02);
}
</style>
