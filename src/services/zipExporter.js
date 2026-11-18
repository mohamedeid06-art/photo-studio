import JSZip from 'jszip';
import { saveAs } from 'file-saver';

/**
 * Strips ONLY the trailing image file extension (.jpg, .jpeg, .png, .webp)
 * while preserving dots inside passport scanner filenames such as "20.A18115760".
 */
export function getBaseFileName(filename = 'photo') {
  const trimmed = String(filename || '').trim();
  const withoutExt = trimmed.replace(/\.(jpe?g|png|webp|bmp|gif)$/i, '').trim();
  return withoutExt || 'photo';
}

/**
 * Ensures a clean .jpg filename preserving the full original (or user-edited) base name.
 */
export function formatOutputJpgName(baseOrFullName) {
  const base = getBaseFileName(baseOrFullName).replace(/[\\/:*?"<>|]/g, '_');
  return `${base || 'photo'}.jpg`;
}

/**
 * Downloads a single processed photo preserving its original/custom filename as .jpg.
 */
export function downloadSinglePhoto(item) {
  if (!item?.processedBlob) return;
  const fileName = formatOutputJpgName(item.customName || item.originalName);
  saveAs(item.processedBlob, fileName);
}

/**
 * Bundles all processed photos directly in the root of a single .zip archive
 * while preserving full original filenames (including dots like "20.A18115760.jpg").
 *
 * @param {Array} readyItems - Array of photo items with processedBlob
 * @param {Function} onProgress - Optional progress callback (0 to 100)
 */
export async function downloadBatchAsZip(readyItems, onProgress) {
  if (!readyItems || readyItems.length === 0) return;

  const zip = new JSZip();
  const usedNamesCount = new Map();

  for (const item of readyItems) {
    if (!item.processedBlob) continue;

    const rawBase = getBaseFileName(item.customName || item.originalName).replace(
      /[\\/:*?"<>|]/g,
      '_'
    );
    const safeBase = rawBase || 'photo';
    const normalizedKey = safeBase.toLowerCase();

    const prevCount = usedNamesCount.get(normalizedKey) || 0;
    usedNamesCount.set(normalizedKey, prevCount + 1);

    const finalFileName =
      prevCount === 0 ? `${safeBase}.jpg` : `${safeBase} (${prevCount + 1}).jpg`;

    zip.file(finalFileName, item.processedBlob);
  }

  const zipBlob = await zip.generateAsync(
    {
      type: 'blob',
      compression: 'STORE',
    },
    (metadata) => {
      if (onProgress) {
        onProgress(Math.round(metadata.percent));
      }
    }
  );

  const dateStamp = new Date().toISOString().slice(0, 10);
  saveAs(zipBlob, `صور_التأشيرات_الجاهزة_${dateStamp}.zip`);
}
