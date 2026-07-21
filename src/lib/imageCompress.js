// Comprime una imagen en el navegador solo si supera maxSizeBytes.
// Redimensiona a maxWidth (manteniendo proporción) y recodifica como JPEG,
// bajando la calidad de a `step` hasta quedar bajo el límite o llegar a minQuality.
export function compressImageIfNeeded(file, { maxSizeBytes, maxWidth, startQuality = 0.8, minQuality = 0.1, step = 0.1 }) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/") || file.size <= maxSizeBytes) {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("No se pudo procesar la imagen."));
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const baseName = file.name.replace(/\.[^.]+$/, "") || "imagen";

        const intentar = (quality) => {
          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error("No se pudo comprimir la imagen."));
              return;
            }
            if (blob.size <= maxSizeBytes || quality <= minQuality) {
              resolve(new File([blob], `${baseName}.jpg`, { type: "image/jpeg" }));
              return;
            }
            intentar(Math.round((quality - step) * 100) / 100);
          }, "image/jpeg", quality);
        };
        intentar(startQuality);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
