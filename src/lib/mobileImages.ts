import {
  Camera,
  MediaTypeSelection,
} from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

function mimeFromResult(
  format?: string,
  responseContentType?: string | null,
) {
  const responseType =
    responseContentType
      ?.split(';')[0]
      ?.trim()
      ?.toLowerCase();

  if (
    responseType &&
    ALLOWED_TYPES.has(responseType)
  ) {
    return responseType;
  }

  switch (format?.toLowerCase()) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';

    case 'png':
      return 'image/png';

    case 'webp':
      return 'image/webp';

    default:
      // Android liefert Galerie-Fotos normalerweise als JPEG.
      return 'image/jpeg';
  }
}

function extensionForMime(mime: string) {
  switch (mime) {
    case 'image/png':
      return 'png';

    case 'image/webp':
      return 'webp';

    default:
      return 'jpg';
  }
}

export async function pickNativeCommentImages(
  limit: number,
  maxSizeBytes: number,
): Promise<File[] | null> {
  if (!Capacitor.isNativePlatform()) {
    return null;
  }

  try {
    const { results } =
      await Camera.chooseFromGallery({
        mediaType: MediaTypeSelection.Photo,
        allowMultipleSelection: limit > 1,
        limit,
        includeMetadata: true,

        // Große Handyfotos werden direkt etwas verkleinert.
        quality: 88,
        targetWidth: 2048,
        targetHeight: 2048,
        correctOrientation: true,
      });

    const files: File[] = [];

    for (
      let index = 0;
      index < results.length;
      index += 1
    ) {
      const result = results[index];

      if (!result.webPath) {
        throw new Error(
          'Das ausgewählte Bild konnte nicht gelesen werden.',
        );
      }

      const response = await fetch(
        result.webPath,
      );

      if (!response.ok) {
        throw new Error(
          'Das ausgewählte Bild konnte nicht vom Gerät geladen werden.',
        );
      }

      const bytes =
        await response.arrayBuffer();

      const mime = mimeFromResult(
        result.metadata?.format,
        response.headers.get(
          'content-type',
        ),
      );

      if (!ALLOWED_TYPES.has(mime)) {
        throw new Error(
          'Dieses Bildformat wird nicht unterstützt.',
        );
      }

      if (
        bytes.byteLength >
        maxSizeBytes
      ) {
        throw new Error(
          'Das ausgewählte Bild ist auch nach der Optimierung größer als 5 MB.',
        );
      }

      const extension =
        extensionForMime(mime);

      const fileName =
        `homedesk-${Date.now()}-${index + 1}.${extension}`;

      files.push(
        new File(
          [bytes],
          fileName,
          {
            type: mime,
            lastModified: Date.now(),
          },
        ),
      );
    }

    return files;
  } catch (error) {
    const nativeError =
      error as {
        code?: string;
        message?: string;
      };

    // Nutzer hat den Picker einfach geschlossen.
    if (
      nativeError.code ===
        'OS-PLUG-CAMR-0020' ||
      /cancel/i.test(
        nativeError.message || '',
      )
    ) {
      return [];
    }

    throw error;
  }
}

export function imagePickerErrorMessage(
  error: unknown,
) {
  const nativeError =
    error as {
      code?: string;
      message?: string;
    };

  if (nativeError?.message) {
    return nativeError.code
      ? `${nativeError.message} (${nativeError.code})`
      : nativeError.message;
  }

  return 'Das Bild konnte nicht ausgewählt oder gelesen werden.';
}
