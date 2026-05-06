import { useState, useEffect } from "react";
import { getFlights } from "../services/api";

export function useFlights(searchParams = null) {
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const searchKey = searchParams ? JSON.stringify(searchParams) : null;

  useEffect(() => {
    if (!searchKey) return;

    let cancelled = false;
    const parsedSearchParams = JSON.parse(searchKey);

    async function fetchFlights() {
      setLoading(true);
      setError(null);
      try {
        const data = await getFlights(parsedSearchParams);
        if (!cancelled) setFlights(data);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchFlights();
    return () => { cancelled = true; };
  }, [searchKey]);

  return { flights, loading, error };
}
