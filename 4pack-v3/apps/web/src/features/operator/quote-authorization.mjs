export function initialQuoteSelection(initial, requested, authorization) {
  const services = initial.services ?? (requested.services ?? []).filter(s => authorization?.services.includes(s));
  return { services, mode: initial.mode ?? requested.mode ?? authorization?.modes[0] ?? "" };
}
export function quoteAuthorizationError(quote, authorization, labels = {}) {
  if (!authorization) return "No pudimos verificar tu habilitación. Actualizá la página y revisá Perfil empresarial antes de cotizar.";
  const invalid = (quote.services ?? []).filter(s => !authorization.services.includes(s));
  if (invalid.length) return `Servicios no habilitados: ${invalid.map(s => labels[s] ?? s).join(", ")}. Quitalos de la oferta. Podés revisar tus habilitaciones en Perfil empresarial.`;
  if (!authorization.modes.includes(quote.mode)) return "La modalidad elegida no está habilitada para tu empresa. Elegí una modalidad habilitada o revisá Perfil empresarial.";
  return null;
}
export function quoteRejectionMessage(message) {
  if (message === "La oferta excede los servicios o modalidades habilitados") return "El servidor rechazó los servicios o la modalidad de la oferta. Actualizá la página para cargar tus habilitaciones vigentes, quitá las opciones no habilitadas y volvé a enviar. Revisá Perfil empresarial si necesitás otra habilitación.";
  return message;
}
