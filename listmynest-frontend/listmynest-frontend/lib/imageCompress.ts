/**
 * Client-side listing photo compression before upload (target ≤200KB, max width 1200px, JPEG ~80%).
 */

const MAX_BYTES = 200 * 1024;
const MAX_WIDTH = 1200;
const INITIAL_QUALITY = 0.82;
const MIN_QUALITY = 0.55;
const QUALITY_STEP = 0.07;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    img.src = url;
  });
}

function canvasToJpegBlob(
  canvas: HTMLCanvasElement,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("JPEG encode failed"));
      },
      "image/jpeg",
      quality
    );
  });
}

/**
 * Returns a JPEG `File` (possibly original) under size budget.
 */
export async function compressImageForUpload(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.size <= MAX_BYTES) {
    return file;
  }

  const img = await loadImage(file);
  const ratio = Math.min(1, MAX_WIDTH / img.naturalWidth);
  const w = Math.max(1, Math.round(img.naturalWidth * ratio));
  const h = Math.max(1, Math.round(img.naturalHeight * ratio));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(img, 0, 0, w, h);

  let q = INITIAL_QUALITY;
  let blob = await canvasToJpegBlob(canvas, q);
  while (blob.size > MAX_BYTES && q > MIN_QUALITY) {
    q -= QUALITY_STEP;
    blob = await canvasToJpegBlob(canvas, q);
  }

  if (blob.size >= file.size) {
    return file;
  }

  const base = file.name.replace(/\.[^.]+$/, "") || "photo";
  return new File([blob], `${base}.jpg`, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}
