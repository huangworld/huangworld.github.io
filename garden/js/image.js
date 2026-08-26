// Camera/file photo → EXIF-rotated, resized JPEG blob + base64 for upload.

const MAX_EDGE = 1280;
const QUALITY = 0.8;

async function decodeToBitmap(file) {
    try {
        return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
        // Older Safari: options object unsupported. Modern browsers apply EXIF
        // orientation when decoding via <img> as well.
        const url = URL.createObjectURL(file);
        try {
            const img = new Image();
            await new Promise((res, rej) => {
                img.onload = res;
                img.onerror = rej;
                img.src = url;
            });
            return img;
        } finally {
            URL.revokeObjectURL(url);
        }
    }
}

export async function compress(file) {
    const src = await decodeToBitmap(file);
    const w = src.width || src.naturalWidth;
    const h = src.height || src.naturalHeight;
    const scale = Math.min(1, MAX_EDGE / Math.max(w, h));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    canvas.getContext("2d").drawImage(src, 0, 0, canvas.width, canvas.height);
    if (src.close) src.close();

    const blob = await new Promise((res, rej) =>
        canvas.toBlob((b) => (b ? res(b) : rej(new Error("toBlob failed"))), "image/jpeg", QUALITY)
    );
    const base64 = await new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res(String(reader.result).split(",")[1]);
        reader.onerror = rej;
        reader.readAsDataURL(blob);
    });
    return { blob, base64 };
}
