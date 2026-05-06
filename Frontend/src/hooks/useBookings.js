import { useState, useEffect, useCallback } from "react";
import { getBookings, createBooking } from "../services/api";

export function useBookings(userId = null) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    if (!userId) {
      setBookings([]);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchBookings() {
      setLoading(true);
      setError(null);
      try {
        const data = await getBookings(userId);
        if (!cancelled) setBookings(data);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchBookings();
    return () => { cancelled = true; };
  }, [userId]);

  const submitBooking = useCallback(async (bookingData) => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const newBooking = await createBooking(bookingData);
      setBookings((prev) => [...prev, newBooking]);
      return newBooking;
    } catch (err) {
      setSubmitError(err.message);
      return null;
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { bookings, loading, error, submitBooking, submitting, submitError };
}
