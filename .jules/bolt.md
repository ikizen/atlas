## 2025-05-14 - ID-based Store Selection
**Learning:** Subscribing to deep objects in Zustand (like an entire list of folders) causes re-renders across all child components whenever any property of any object changes. Switching to ID-only subscriptions at the parent level and individual lookups in children significantly reduces re-render surface area.
**Action:** Use `useShallow` to select lists of IDs, and have child components perform their own lookups by ID.

## 2025-05-14 - Race Conditions in ID Lookups
**Learning:** When using ID-based subscriptions, a parent might still render a child for an ID that was just deleted from the store before the component unmounts.
**Action:** Always handle the `undefined` case with an early `return null` when looking up state by ID in a component.
