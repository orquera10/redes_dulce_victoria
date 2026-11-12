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

export async function downloadPngBlob(blob: Blob, filename: string): Promise<string> {
  if (Capacitor.isNativePlatform()) {
    const data = await blobToBase64(blob);
    await Filesystem.writeFile({
      path: `DulceVictoria/${filename}`,
      data,
      directory: Directory.Documents,
      recursive: true,
    });
    return `Imagen guardada en Documentos/DulceVictoria/${filename}`;
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return `Imagen descargada: ${filename}`;
}

export async function sharePngBlob(
  blob: Blob,
  filename: string,
  title: string
): Promise<{ shared: boolean; message: string }> {
  if (Capacitor.isNativePlatform()) {
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
      url: uri,
      dialogTitle: title,
    });
    return { shared: true, message: "Imagen lista para compartir." };
  }

  const file = new File([blob], filename, { type: "image/png" });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({ title, files: [file] });
    return { shared: true, message: "Imagen compartida." };
  }

  const msg = await downloadPngBlob(blob, filename);
  return { shared: false, message: msg };
}
