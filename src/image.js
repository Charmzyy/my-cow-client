// Phone photos are often 3–8 MB. Downscale to 1280px JPEG before upload: much less mobile data,
// and PNGs with transparency become plain RGB (which the model expects).
export const MAX_UPLOAD_MB = 4; // matches the API's max:4096 (KB) rule

export async function shrink(original, maxSide = 1280) {
  if (!/^image\/(jpeg|png|webp|bmp)$/.test(original.type)) return original;
  try {
    const bitmap = await createImageBitmap(original);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && original.type === 'image/jpeg' && original.size < 1.5 * 1024 * 1024) return original;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    if (!blob) return original;
    return new File([blob], original.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    return original;
  }
}

// Validates + shrinks a picked file. Returns { file } or { error }.
export async function preparePhoto(selected) {
  if (!selected) return { error: '' };
  if (!selected.type.startsWith('image/')) return { error: 'Please choose a photo (JPG or PNG).' };
  const ready = await shrink(selected);
  if (ready.size > MAX_UPLOAD_MB * 1024 * 1024) {
    return { error: `That photo is too large. Please use one under ${MAX_UPLOAD_MB} MB.` };
  }
  return { file: ready };
}
