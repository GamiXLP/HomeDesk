import {
  Camera,
  MediaTypeSelection,
} from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

const OUTPUT_MIME = 'image/jpeg';
const OUTPUT_EXTENSION = 'jpg';
const OUTPUT_QUALITY = 0.88;
const MAX_DIMENSION = 2048;

function loadImage(
  src: string,
): Promise<HTMLImageElement> {
  return new Promise(
    (resolve, reject) => {
      const image = new Image();

      image.onload = () => {
        resolve(image);
      };

      image.onerror = () => {
        reject(
          new Error(
            'Das ausgewählte Bild konnte nicht decodiert werden.',
          ),
        );
      };

      image.src = src;
    },
  );
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
): Promise<Blob> {
  return new Promise(
    (resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(
              new Error(
                'Das Bild konnte nicht in JPEG umgewandelt werden.',
              ),
            );

            return;
          }

          resolve(blob);
        },
        OUTPUT_MIME,
        OUTPUT_QUALITY,
      );
    },
  );
}

async function normalizeNativeImage(
  webPath: string,
  fileName: string,
  maxSizeBytes: number,
): Promise<File> {
  /*
   * WICHTIG:
   * Capacitor garantiert, dass webPath für
   * <img src="..."> gedacht ist.
   *
   * Wir lassen die WebView das native Bild also
   * zuerst wirklich decodieren.
   */
  const image =
    await loadImage(webPath);

  const sourceWidth =
    image.naturalWidth;

  const sourceHeight =
    image.naturalHeight;

  if (
    !sourceWidth ||
    !sourceHeight
  ) {
    throw new Error(
      'Das ausgewählte Bild hat keine gültige Auflösung.',
    );
  }

  const ratio =
    Math.min(
      1,
      MAX_DIMENSION /
        Math.max(
          sourceWidth,
          sourceHeight,
        ),
    );

  const width =
    Math.max(
      1,
      Math.round(
        sourceWidth * ratio,
      ),
    );

  const height =
    Math.max(
      1,
      Math.round(
        sourceHeight * ratio,
      ),
    );

  const canvas =
    document.createElement(
      'canvas',
    );

  canvas.width = width;
  canvas.height = height;

  const context =
    canvas.getContext('2d');

  if (!context) {
    throw new Error(
      'Die Bildverarbeitung wird auf diesem Gerät nicht unterstützt.',
    );
  }

  /*
   * Weißer Hintergrund:
   * Falls PNG/WebP transparent ist,
   * entstehen beim JPEG keine schwarzen Flächen.
   */
  context.fillStyle = '#ffffff';

  context.fillRect(
    0,
    0,
    width,
    height,
  );

  context.drawImage(
    image,
    0,
    0,
    width,
    height,
  );

  /*
   * Ab hier existiert kein Android-Sonderformat
   * mehr. Das Ergebnis ist ein normales JPEG,
   * das von unserer WebView selbst erzeugt wurde.
   */
  const blob =
    await canvasToBlob(
      canvas,
    );

  if (blob.size === 0) {
    throw new Error(
      'Das verarbeitete Bild enthält keine Daten.',
    );
  }

  if (
    blob.size >
    maxSizeBytes
  ) {
    throw new Error(
      'Das verarbeitete Bild ist größer als 5 MB.',
    );
  }

  /*
   * Vor dem Upload nochmals testen:
   * Kann HomeDesk sein eigenes Ergebnis anzeigen?
   *
   * Wenn nicht -> kein Upload.
   */
  const verificationUrl =
    URL.createObjectURL(
      blob,
    );

  try {
    await loadImage(
      verificationUrl,
    );
  } finally {
    URL.revokeObjectURL(
      verificationUrl,
    );
  }

  return new File(
    [blob],
    fileName,
    {
      type: OUTPUT_MIME,
      lastModified: Date.now(),
    },
  );
}

export async function pickNativeCommentImages(
  limit: number,
  maxSizeBytes: number,
): Promise<File[] | null> {
  if (
    !Capacitor.isNativePlatform()
  ) {
    return null;
  }

  try {
    const {
      results,
    } =
      await Camera.chooseFromGallery(
        {
          mediaType:
            MediaTypeSelection.Photo,

          allowMultipleSelection:
            limit > 1,

          limit,

          includeMetadata: true,

          quality: 90,

          targetWidth:
            MAX_DIMENSION,

          targetHeight:
            MAX_DIMENSION,

          correctOrientation: true,
        },
      );

    const files: File[] = [];

    for (
      let index = 0;
      index < results.length;
      index += 1
    ) {
      const result =
        results[index];

      if (!result.webPath) {
        throw new Error(
          'Das ausgewählte Bild besitzt keinen darstellbaren Pfad.',
        );
      }

      const name =
        `homedesk-${Date.now()}-${index + 1}.${OUTPUT_EXTENSION}`;

      const file =
        await normalizeNativeImage(
          result.webPath,
          name,
          maxSizeBytes,
        );

      files.push(file);
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
        nativeError.message ||
          '',
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

  if (
    nativeError?.message
  ) {
    return nativeError.code
      ? `${nativeError.message} (${nativeError.code})`
      : nativeError.message;
  }

  return 'Das Bild konnte nicht ausgewählt oder verarbeitet werden.';
}
