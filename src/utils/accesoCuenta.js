// Estados de cuenta soportados en perfiles.estado_cuenta:
// 'prueba' | 'activo' | 'exento' | 'vencido' | 'suspendido'

export function accesoVencido(perfil) {
  if (!perfil) return false;

  const { estado_cuenta, fecha_limite_acceso } = perfil;

  if (estado_cuenta === "exento") return false;
  if (estado_cuenta === "vencido" || estado_cuenta === "suspendido") return true;

  if (estado_cuenta === "prueba" || estado_cuenta === "activo") {
    if (!fecha_limite_acceso) return false;
    const hoy = new Date().toISOString().slice(0, 10);
    return fecha_limite_acceso < hoy;
  }

  // estado_cuenta no definido o desconocido: no bloquear.
  return false;
}
