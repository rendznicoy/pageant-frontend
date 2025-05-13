import { defineStore } from "pinia";
import { ref } from "vue";
import axiosClient from "@/axios";

export const useEventStore = defineStore("event", () => {
  const events = ref([]);
  const loading = ref(false);
  const initialized = ref(false);
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Fetch all events
  const fetchEvents = async (forceRefresh = false) => {
    if (loading.value) return; // Prevent concurrent requests
    loading.value = true;

    try {
      const local = localStorage.getItem("dashboard_events");
      const cacheTimestamp = localStorage.getItem("dashboard_events_timestamp");
      const now = Date.now();
      const isCacheValid =
        cacheTimestamp && now - parseInt(cacheTimestamp) < CACHE_DURATION;

      if (!forceRefresh && isCacheValid && local) {
        events.value = JSON.parse(local);
        return;
      }

      const res = await axiosClient.get("/api/v1/events");
      events.value = res.data;
      localStorage.setItem("dashboard_events", JSON.stringify(events.value));
      localStorage.setItem("dashboard_events_timestamp", now.toString());
    } catch (err) {
      console.error("Failed to fetch events:", err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Get a specific event by ID
  const getEventById = (id) => {
    console.log(`Looking for event with ID: ${id} (type: ${typeof id})`);
    console.log(`Available events: ${events.value.length}`);

    const stringId = String(id);
    const event = events.value.find(
      (event) => String(event.event_id) === stringId
    );
    console.log("Found event:", event);
    return event;
  };

  // Fetch a specific event
  const fetchEvent = async (eventId) => {
    try {
      const res = await axiosClient.get(`/api/v1/events/${eventId}`);
      return res.data;
    } catch (err) {
      console.error(`Failed to fetch event ${eventId}:`, err);
      throw err;
    }
  };

  const updateEvent = async (eventId, formData) => {
    try {
      // Log what's being sent for debugging
      if (formData instanceof FormData) {
        console.log("FormData contents:");
        for (let pair of formData.entries()) {
          console.log(
            pair[0] + ": " + (pair[1] instanceof File ? pair[1].name : pair[1])
          );
        }
      }

      const res = await axiosClient.patch(
        `/api/v1/events/${eventId}/edit`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      // Update the local event data
      const updatedEventIndex = events.value.findIndex(
        (event) => String(event.event_id) === String(eventId)
      );

      if (updatedEventIndex !== -1 && res.data.event) {
        events.value[updatedEventIndex] = res.data.event;
        saveToLocal();
      }

      return res.data.event;
    } catch (error) {
      console.error("Full error:", error);
      if (error.response) {
        console.error("Response data:", error.response.data);
        console.error("Response status:", error.response.status);
      }
      throw error;
    }
  };

  // Delete an event
  const deleteEvent = async (id) => {
    try {
      console.log(`Sending DELETE request for event ${id}`);
      await axiosClient.delete(`/api/v1/events/${id}`, {
        data: { event_id: id },
      });
      events.value = events.value.filter(
        (e) => String(e.event_id) !== String(id)
      );
      localStorage.setItem("dashboard_events", JSON.stringify(events.value));
      console.log(`Deleted event ${id} from store`);
    } catch (error) {
      console.error(`Failed to delete event ${id}:`, error);
      throw new Error(
        `Failed to delete event: ${
          error.response?.data?.message || error.message
        }`
      );
    }
  };

  // Start an event
  const startEvent = async (id) => {
    try {
      console.log(`Sending POST request to start event ${id}`);
      const response = await axiosClient.post(`/api/v1/events/${id}/start`, {
        event_id: id,
      });
      const updatedEvent = response.data.event;
      const index = events.value.findIndex(
        (e) => String(e.event_id) === String(id)
      );
      if (index !== -1) {
        events.value[index] = { ...events.value[index], ...updatedEvent };
        events.value = [...events.value];
        localStorage.setItem("dashboard_events", JSON.stringify(events.value));
      }
      console.log(`Started event ${id}`);
      return updatedEvent;
    } catch (error) {
      console.error(`Failed to start event ${id}:`, error);
      const message = error.response?.data?.message || error.message;
      throw new Error(`Failed to start event: ${message}`);
    }
  };

  // Finalize an event
  const finalizeEvent = async (id) => {
    try {
      console.log(`Sending POST request to finalize event ${id}`);
      const response = await axiosClient.post(`/api/v1/events/${id}/finalize`, {
        event_id: id,
      });
      const updatedEvent = response.data.event;
      const index = events.value.findIndex(
        (e) => String(e.event_id) === String(id)
      );
      if (index !== -1) {
        events.value[index] = { ...events.value[index], ...updatedEvent };
        events.value = [...events.value];
        localStorage.setItem("dashboard_events", JSON.stringify(events.value));
      }
      console.log(`Finalized event ${id}`);
      return updatedEvent;
    } catch (error) {
      console.error(`Failed to finalize event ${id}:`, error);
      throw new Error(
        `Failed to finalize event: ${
          error.response?.data?.message || error.message
        }`
      );
    }
  };

  // Reset an event
  const resetEvent = async (id) => {
    try {
      console.log(`Sending POST request to reset event ${id}`);
      const response = await axiosClient.post(`/api/v1/events/${id}/reset`, {
        event_id: id,
      });
      const updatedEvent = response.data.event;
      const index = events.value.findIndex(
        (e) => String(e.event_id) === String(id)
      );
      if (index !== -1) {
        events.value[index] = { ...events.value[index], ...updatedEvent };
        events.value = [...events.value];
        localStorage.setItem("dashboard_events", JSON.stringify(events.value));
      }
      console.log(`Reset event ${id}`);
      return updatedEvent;
    } catch (error) {
      console.error(`Failed to reset event ${id}:`, error);
      throw new Error(
        `Failed to reset event: ${
          error.response?.data?.message || error.message
        }`
      );
    }
  };

  // Toggle star status
  const toggleStar = async (id) => {
    try {
      const stringId = String(id);
      const response = await axiosClient.post(
        `/api/v1/events/${id}/toggle-star`
      );
      const updatedEvent = response.data.event;
      const index = events.value.findIndex(
        (e) => String(e.event_id) === stringId
      );
      if (index !== -1) {
        events.value[index].is_starred = updatedEvent.is_starred;
        events.value = [...events.value];
        localStorage.setItem("dashboard_events", JSON.stringify(events.value));
        console.log(
          `Toggled starred for event ${id}: ${updatedEvent.is_starred}`
        );
      }
    } catch (error) {
      console.error(`Failed to toggle star for event ${id}:`, error);
      throw new Error(
        `Failed to toggle star: ${
          error.response?.data?.message || error.message
        }`
      );
    }
  };

  const saveToLocal = () => {
    localStorage.setItem("dashboard_events", JSON.stringify(events.value));
  };

  return {
    events,
    loading,
    initialized,
    fetchEvents,
    fetchEvent,
    getEventById,
    updateEvent,
    deleteEvent,
    startEvent,
    finalizeEvent,
    resetEvent,
    toggleStar,
    saveToLocal,
  };
});
