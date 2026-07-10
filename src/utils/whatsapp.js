export const WHATSAPP_NUMBER = "50687889993";

export const WHATSAPP_SUPPORT_OPTIONS = [
  { id: "consulta", label: "Consulta", icon: "❓", mensaje: "Hola, tengo una consulta sobre AGEP:" },
  { id: "comentario", label: "Comentario", icon: "💬", mensaje: "Hola, quiero dejar un comentario sobre AGEP:" },
  { id: "mejora", label: "Petición de mejora", icon: "💡", mensaje: "Hola, quiero sugerir una mejora para AGEP:" },
];

export function abrirWhatsAppSoporte(mensaje) {
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(mensaje)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}
