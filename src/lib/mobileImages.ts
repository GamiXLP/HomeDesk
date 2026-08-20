import {
  Camera,
  MediaTypeSelection,
} from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { Filesystem } from '@capacitor/filesystem';

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

function base64ToBytes(value: string) {
  const base64 = value.includes(',')
    ? value.slice(value.indexOf(',') + 1)
    : value;

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (
    let index = 0;
    index < binary.length;
    index += 1
  ) {
    bytes[index] =
      binary.charCodeAt(index);
  }

  return bytes;
}

function detectImageType(
  bytes: Uint8Array,
  declaredFormat?: string,
) {
  // JPEG: FF D8 FF
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return 'image/jpeg';
  }

  // PNG
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'image/png';
  }

  // WEBP = RIFF .... WEBP
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp';
  }

  switch (
    declaredFormat?.toLowerCase()
  ) {
    case 'jpeg':
    case 'jpg':
      return 'image/jpeg';

    case 'png':
      return 'image/png';

    case 'webp':
      return 'image/webp';

    default:
      return null;
  }
}

function extensionForMime(
  mime: string,
) {
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
        mediaType:
          MediaTypeSelection.Photo,

        allowMultipleSelection:
          limit > 1,

        limit,

        includeMetadata: true,

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

      if (!result.uri) {
        throw new Error(
          'Das ausgewählte Bild besitzt keinen lesbaren Dateipfad.',
        );
      }

      /*
       * Capacitor empfiehlt für vollständige
       * native Bilddaten die URI über das
       * Filesystem einzulesen.
       */
      const fileResult =
        await Filesystem.readFile({
          path: result.uri,
        });

      let bytes: Uint8Array;

      if (
        typeof fileResult.data ===
        'string'
      ) {
        bytes = base64ToBytes(
          fileResult.data,
        );
      } else {
        bytes = new Uint8Array(
          await fileResult.data.arrayBuffer(),
        );
      }

      if (bytes.byteLength === 0) {
        throw new Error(
          'Das ausgewählte Bild enthält keine Bilddaten.',
        );
      }

      if (
        bytes.byteLength >
        maxSizeBytes
      ) {
        throw new Error(
          'Das ausgewählte Bild ist größer als 5 MB.',
        );
      }

      const mime =
        detectImageType(
          bytes,
          result.metadata?.format,
        );

      if (
        !mime ||
        !ALLOWED_TYPES.has(mime)
      ) {
        throw new Error(
          'Das Bildformat konnte nicht sicher erkannt werden.',
        );
      }

      const extension =
        extensionForMime(mime);

      const name =
        `homedesk-${Date.now()}-${index + 1}.${extension}`;

      const fileBuffer = bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      ) as ArrayBuffer;

      files.push(
        new File(
          [fileBuffer],
          name,
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
