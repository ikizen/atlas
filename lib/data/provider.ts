import type { AtlasData } from "@/lib/types";

/**
 * The data layer contract. Phase 1 uses LocalStorageProvider. Phase 2 swaps in
 * a Supabase-backed provider implementing this same interface — UI/store code
 * must never touch storage directly, only go through a DataProvider.
 */
export interface DataProvider {
  /**
   * Synchronous snapshot for instant first paint (Phase 1, localStorage).
   * Async providers (Phase 2) may return an empty snapshot here and hydrate
   * the real data via `load()`.
   */
  getInitialState(): AtlasData;

  /** Persist the full document. */
  save(data: AtlasData): Promise<void>;

  /** Optional async load — used by remote providers in Phase 2. */
  load?(): Promise<AtlasData>;
}
