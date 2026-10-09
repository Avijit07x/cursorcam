export class FrameCache {
  readonly #urlFor: (index: number) => string;
  readonly #bitmaps = new Map<number, Promise<ImageBitmap>>();

  constructor(urlFor: (index: number) => string) {
    this.#urlFor = urlFor;
  }

  get(index: number): Promise<ImageBitmap> {
    let bitmap = this.#bitmaps.get(index);
    if (!bitmap) {
      bitmap = this.#load(index);
      this.#bitmaps.set(index, bitmap);
    }
    return bitmap;
  }

  releaseBefore(index: number): void {
    for (const [key, bitmap] of this.#bitmaps) {
      if (key >= index) continue;
      this.#bitmaps.delete(key);
      void bitmap.then((loaded) => loaded.close()).catch(() => undefined);
    }
  }

  close(): void {
    this.releaseBefore(Infinity);
  }

  async #load(index: number): Promise<ImageBitmap> {
    const response = await fetch(this.#urlFor(index));
    if (!response.ok) throw new Error(`Frame ${index} is missing (HTTP ${response.status}).`);
    return createImageBitmap(await response.blob());
  }
}
