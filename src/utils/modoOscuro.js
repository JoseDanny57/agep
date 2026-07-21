import { supabase } from "../lib/supabase";

export function aplicarModoOscuro(activo) {
  document.documentElement.classList.toggle("dark", !!activo);
}

// Cambia el modo oscuro al instante en el DOM y persiste en segundo plano en perfiles.modo_oscuro
export function cambiarModoOscuro({ userId, perfil, setPerfil, nuevoValor }) {
  aplicarModoOscuro(nuevoValor);
  setPerfil(p => ({ ...p, modo_oscuro: nuevoValor }));
  supabase.from("perfiles").update({ modo_oscuro: nuevoValor }).eq("id", userId).then(({ error }) => {
    if (error) console.error("Error al guardar modo oscuro:", error);
  });
}
