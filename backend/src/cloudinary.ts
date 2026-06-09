import { v2 as cloudinary } from "cloudinary";

// Configuración usando variables de entorno (recomendado)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;

/**
 * Sube un archivo (imagen, PDF, etc.) a Cloudinary en la carpeta especificada.
 * @param buffer - Buffer del archivo
 * @param carpeta - Carpeta destino en Cloudinary (ej: "recibos", "pagos/comprobantes")
 * @param nombre - Nombre público opcional (sin extensión)
 * @returns URL pública del archivo subido
 */
export const subirArchivo = (
  buffer: Buffer,
  carpeta: string,
  nombre?: string
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const uploadOptions: any = {
      folder: carpeta,
      resource_type: "raw", // "raw" para PDFs, "image" para imágenes
    };
    if (nombre) {
      uploadOptions.public_id = nombre;
    }
    cloudinary.uploader
      .upload_stream(uploadOptions, (error, result) => {
        if (error || !result) return reject(error);
        resolve(result.secure_url);
      })
      .end(buffer);
  });
};
