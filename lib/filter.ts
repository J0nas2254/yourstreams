// Reine Filter-Logik (kein React), direkt per node --test prüfbar.

/** Ein Titel zählt nur dann als „auf meinen Diensten“, wenn eine echte
 *  Provider-ID aus seinen Verfügbarkeitsdaten zu den ausgewählten Diensten passt. */
export function isOnMyServices(
  availabilityProviderIds: number[],
  myServices: number[]
): boolean {
  if (myServices.length === 0) return false;
  return availabilityProviderIds.some((id) => myServices.includes(id));
}
