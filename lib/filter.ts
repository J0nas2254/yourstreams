// Reine Filter-Logik (kein React), direkt per node --test prüfbar.
import { FREE_TV_ID, isFreeKind } from "./free-tv.ts";
import type { AvailabilityEntry } from "./types.ts";

/** Ein Titel zählt nur dann als „auf meinen Diensten“, wenn eine echte
 *  Provider-ID aus seinen Verfügbarkeitsdaten zu den ausgewählten Diensten passt. */
export function isOnMyServices(
  availabilityProviderIds: number[],
  myServices: number[]
): boolean {
  if (myServices.length === 0) return false;
  return availabilityProviderIds.some((id) => myServices.includes(id));
}

/** Wie isOnMyServices, aber Free TV zählt bei kind free/ads – unabhängig von IDs. */
export function isOnMyServicesEntries(
  availability: AvailabilityEntry[],
  myServices: number[]
): boolean {
  if (myServices.length === 0) return false;
  if (availability.some((a) => myServices.includes(a.provider_id))) return true;
  if (myServices.includes(FREE_TV_ID) && availability.some((a) => isFreeKind(a.kind))) return true;
  return false;
}
