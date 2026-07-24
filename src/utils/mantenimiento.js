export const ADMIN_EMAIL = "josedanny09@gmail.com";

export function mantenimientoActivo(mantenimientoHasta) {
  if (!mantenimientoHasta) return false;
  return new Date(mantenimientoHasta).getTime() > Date.now();
}
