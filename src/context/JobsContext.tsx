import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { fetchAllJobs, type Job } from "../api/supabase";

// ─── Cache localStorage (stale-while-revalidate) ──────────────────────────────

const CACHE_KEY = "chabe_jobs_v2"; // v2 : invalide le cache tronqué (bug PAGE_SIZE=2000)
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 min

interface CacheEntry {
  jobs: Job[];
  ts: number;
}

function readCache(): CacheEntry | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CacheEntry;
  } catch {
    return null;
  }
}

function writeCache(jobs: Job[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ jobs, ts: Date.now() }));
  } catch {
    // Ignore — quota dépassé ou navigation privée
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface JobsContextValue {
  jobs: Job[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const JobsContext = createContext<JobsContextValue | null>(null);

export function JobsProvider({ children }: { children: React.ReactNode }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchingRef = useRef(false);

  const load = useCallback((forceRefresh = false) => {
    // Éviter les double-appels simultanés (React StrictMode double-mount)
    if (fetchingRef.current && !forceRefresh) return;

    if (!forceRefresh) {
      const cached = readCache();
      if (cached) {
        const age = Date.now() - cached.ts;
        if (age < CACHE_TTL_MS) {
          // Cache frais : afficher immédiatement, rafraîchir en arrière-plan
          setJobs(cached.jobs);
          setLoading(false);
          setError(null);
          if (!fetchingRef.current) {
            fetchingRef.current = true;
            fetchAllJobs()
              .then((data) => {
                setJobs(data);
                writeCache(data);
              })
              .catch(() => { /* conserver données stale en cas d'erreur */ })
              .finally(() => { fetchingRef.current = false; });
          }
          return;
        }
        // Cache périmé : afficher les données stale pendant le chargement
        setJobs(cached.jobs);
      }
    }

    // Chargement complet avec spinner
    fetchingRef.current = true;
    setLoading(true);
    setError(null);

    fetchAllJobs()
      .then((data) => {
        setJobs(data);
        writeCache(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      })
      .finally(() => { fetchingRef.current = false; });
  }, []);

  useEffect(() => {
    load(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [load]);

  const refetch = useCallback(() => {
    load(true); // Force refresh — bypass cache
  }, [load]);

  const value: JobsContextValue = {
    jobs,
    loading,
    error,
    refetch,
  };

  return (
    <JobsContext.Provider value={value}>
      {children}
    </JobsContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useJobs(): JobsContextValue {
  const ctx = useContext(JobsContext);
  if (!ctx) {
    throw new Error("useJobs must be used within JobsProvider");
  }
  return ctx;
}
