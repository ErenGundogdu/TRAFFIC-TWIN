interface StyleImageRegistry {
  addImage: (
    id: string,
    image: {
      width: number;
      height: number;
      data: Uint8Array;
    },
  ) => unknown;
  hasImage: (id: string) => boolean;
}

const TRANSPARENT_PIXEL = new Uint8Array([0, 0, 0, 0]);

export function provideTransparentStyleImageFallback(
  registry: StyleImageRegistry,
  imageId: string,
) {
  if (registry.hasImage(imageId)) return false;

  registry.addImage(imageId, {
    width: 1,
    height: 1,
    data: TRANSPARENT_PIXEL.slice(),
  });
  return true;
}
