## 2025-05-14 - ID-based Store Selection
**Learning:** Subscribing to deep objects in Zustand (like an entire list of folders) causes re-renders across all child components whenever any property of any object changes. Switching to ID-only subscriptions at the parent level and individual lookups in children significantly reduces re-render surface area.
**Action:** Use `useShallow` to select lists of IDs, and have child components perform their own lookups by ID.

## 2025-05-14 - Race Conditions in ID Lookups
**Learning:** When using ID-based subscriptions, a parent might still render a child for an ID that was just deleted from the store before the component unmounts.
**Action:** Always handle the `undefined` case with an early `return null` when looking up state by ID in a component.

## 2025-05-14 - Pre-normalizing Search Targets
**Learning:** Performing `toLowerCase()` on thousands of strings (titles, URLs, folders) inside a search filtering loop is extremely expensive and happens on every keystroke.
**Action:** Pre-normalize (lowercase) search targets in a `useMemo` that only updates when the data set changes, not on every query update.

## 2025-05-14 - Responsive Filtering with `useDeferredValue`
**Learning:** Complex fuzzy filtering over large data sets can block the main thread, making search input feel laggy.
**Action:** Use `useDeferredValue` for the search query to allow the input to update immediately while the filtered results update as a non-blocking transition.
