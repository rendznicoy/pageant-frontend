// event.js
import { defineStore } from "pinia";
import { ref } from "vue";
import axiosClient from "@/axios";

export const useEventStore = defineStore("event", () => {
  const events = ref([]);
  const loading = ref(false);
  const initialized = ref(false);
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  const fetchEvents = async (forceRefresh = false) => {
    if (loading.value) return;
    loading.value = true;

    try {
      const local = localStorage.getItem("dashboard_events");
      const cacheTimestamp = localStorage.getItem("dashboard_events_timestamp");
      const now = Date.now();
      const isCacheValid =
        cacheTimestamp && now - parseInt(cacheTimestamp) < CACHE_DURATION;

      if (!forceRefresh && isCacheValid && local) {
        events.value = JSON.parse(local);
        console.log("Loaded events from cache:", events.value); // Debug log
        return events.value; // Return events for chaining
      }

      const data = await axiosClient.get("/api/v1/events");
      events.value = data.map((event) => ({
        event_id: event.event_id,
        event_name: event.event_name,
        venue: event.venue || "Not set",
        start_date: event.start_date,
        end_date: event.end_date,
        status: event.status,
        division: event.division || "standard",
        removed: event.removed || false,
        cover_photo: event.cover_photo,
      }));
      console.log("Fetched events from API:", events.value); // Debug log
      localStorage.setItem("dashboard_events", JSON.stringify(events.value));
      localStorage.setItem("dashboard_events_timestamp", now.toString());
      return events.value; // Return events for chaining
    } catch (err) {
      console.error("Failed to fetch events:", err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const getEventById = (id) => {
    const stringId = String(id);
    return events.value.find((event) => String(event.event_id) === stringId);
  };

  const fetchEvent = async (eventId) => {
    try {
      const data = await axiosClient.get(`/api/v1/events/${eventId}`);
      return data;
    } catch (err) {
      console.error(`Failed to fetch event ${eventId}:`, err);
      throw err;
    }
  };

  const updateEvent = async (eventId, formData) => {
    try {
      const data = await axiosClient.post(
        `/api/v1/events/${eventId}/edit?_method=PATCH`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      console.log("RAW response from axiosClient.post():", data);

      if (data && data.event) {
        const updatedEventIndex = events.value.findIndex(
          (event) => String(event.event_id) === String(eventId)
        );
        if (updatedEventIndex !== -1) {
          events.value[updatedEventIndex] = {
            ...data.event,
            venue: data.event.venue || "Not set",
          };
          events.value = [...events.value]; // Ensure reactivity
          saveToLocal();
        }
        // Clear cache to force refresh
        localStorage.removeItem("dashboard_events");
        localStorage.removeItem("dashboard_events_timestamp");
        await fetchEvents(true); // Force refresh from server
      }

      return data; // ✅ Return data directly
    } catch (error) {
      console.error("Update error:", error.response?.data || error.message);
      throw error;
    }
  };

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

  const startEvent = async (id) => {
    try {
      console.log(`Sending POST request to start event ${id}`);
      const data = await axiosClient.post(`/api/v1/events/${id}/start`, {
        event_id: id,
      });
      const updatedEvent = data.event;
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

  const finalizeEvent = async (id) => {
    try {
      console.log(`Sending POST request to finalize event ${id}`);
      const data = await axiosClient.post(`/api/v1/events/${id}/finalize`, {
        event_id: id,
      });
      const updatedEvent = data.event;
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

  const resetEvent = async (id) => {
    try {
      console.log(`Sending POST request to reset event ${id}`);
      const data = await axiosClient.post(`/api/v1/events/${id}/reset`, {
        event_id: id,
      });
      const updatedEvent = data.event;
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

  const saveToLocal = () => {
    localStorage.setItem("dashboard_events", JSON.stringify(events.value));
    localStorage.setItem("dashboard_events_timestamp", Date.now().toString());
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
    saveToLocal,
  };
});
