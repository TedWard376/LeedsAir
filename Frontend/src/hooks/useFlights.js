import { useState, useEffect } from "react";
import { getFlights } from "../services/api";

export function useFlights(searchParams = null) {
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!searchParams) return;

    let cancelled = false;

    async function fetchFlights() {
      setLoading(true);
      setError(null);
      try {
        const data = await getFlights(searchParams);
        if (!cancelled) setFlights(data);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchFlights();
    return () => { cancelled = true; };
  }, [JSON.stringify(searchParams)]);

  return { flights, loading, error };
}