import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      if (!base64) {
        reject(new Error("No se pudo convertir la imagen."));
      } else {
        resolve(base64);
      }
    };
    reader.onerror = () => reject(reader.error || new Error("Error leyendo la imagen."));
    reader.readAsDataURL(blob);
  });
}

function browserAnchorDownload(blob: Blob, filename: string): string {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  return `Imagen descargada: ${filename}`;
}

export async function downloadPngBlob(blob: Blob, filename: string): Promise<string> {
  if (Capacitor.isNativePlatform()) {
    try {
      const data = await blobToBase64(blob);
      // Intentar primero en Documentos/DulceVictoria
      try {
        await Filesystem.writeFile({
          path: `DulceVictoria/${filename}`,
          data,
          directory: Directory.Documents,
          recursive: true,
        });
        return `Imagen guardada en Documentos/DulceVictoria/${filename}`;
      } catch (docErr) {
        console.warn("No se pudo escribir en Documents, intentando en almacenamiento interno:", docErr);
        // Fallback a almacenamiento privado de la app (Directory.Data)
        await Filesystem.writeFile({
          path: filename,
          data,
          directory: Directory.Data,
          recursive: true,
        });
        return `Imagen guardada en el dispositivo: ${filename}`;
      }
    } catch (nativeErr) {
      console.warn("Fallo en guardado nativo, usando descarga web alternativa:", nativeErr);
      return browserAnchorDownload(blob, filename);
    }
  }

  return browserAnchorDownload(blob, filename);
}

export async function sharePngBlob(
  blob: Blob,
  filename: string,
  title: string
): Promise<{ shared: boolean; message: string }> {
  if (Capacitor.isNativePlatform()) {
    try {
      const data = await blobToBase64(blob);
      await Filesystem.writeFile({
        path: filename,
        data,
        directory: Directory.Cache,
      });
      const { uri } = await Filesystem.getUri({
        path: filename,
        directory: Directory.Cache,
      });
      await Share.share({
        title,
        text: title,
        url: uri,
        files: [uri],
        dialogTitle: title,
      });
      return { shared: true, message: "Imagen lista para compartir." };
    } catch (nativeErr) {
      console.warn("Fallo Capacitor Share, probando alternativas:", nativeErr);
    }
  }

  // Alternativa con Web Share API estándar si el navegador lo soporta
  try {
    const file = new File([blob], filename, { type: "image/png" });
    if (typeof navigator !== "undefined" && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ title, text: title, files: [file] });
      return { shared: true, message: "Imagen compartida exitosamente." };
    }
  } catch (webErr) {
    console.warn("Fallo o cancelación de navigator.share:", webErr);
  }

  // Si compartir no está disponible o falla, descargamos el archivo como respaldo seguro
  const msg = browserAnchorDownload(blob, filename);
  return { shared: false, message: msg };
}
