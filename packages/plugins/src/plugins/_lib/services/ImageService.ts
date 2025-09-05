import PluginService from "./PluginService";
import { EAspectRatio } from "../ts/types";

export interface IImageDetails {
  src: string;
  node: HTMLImageElement;
  aspect: EAspectRatio;
  isLoaded: boolean; // New property to track the loaded status
  onLoad?: (event: Event) => void;
  onError?: (event: ErrorEvent) => void;
}

type TRestrictedImageDetails = Omit<IImageDetails, "node" | "isLoaded">;

class ImageService extends PluginService {
  private _images: IImageDetails[]; // Assuming you'll always initialize with an array
  private _defaultAspectRatio = EAspectRatio.Square;

  constructor(images: TRestrictedImageDetails[]) {
    super();

    this.extendImageDetails(images);
  }

  private loadImage(imageDetails: IImageDetails): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = imageDetails.src;

      img.onload = (event: Event) => {
        imageDetails.isLoaded = true;
        if (imageDetails.onLoad) {
          imageDetails.onLoad(event);
        }
        resolve(); // Resolve the promise when the image is loaded
      };

      img.onerror = (event: ErrorEvent) => {
        imageDetails.isLoaded = false;
        if (imageDetails.onError) {
          imageDetails.onError(event);
        }
        reject(); // Reject the promise on error
      };

      imageDetails.node = img;
    });
  }

  isImageLoaded(src: string): boolean {
    const imageDetail = this._images.find((image) => image.src === src);
    return !!imageDetail?.isLoaded;
  }

  getImageDetails(): IImageDetails[] {
    return this._images;
  }

  getImageNodes(): HTMLImageElement[] {
    return this._images.map((image) => image.node);
  }

  preloadImages(): Promise<IImageDetails[]> {
    const loadPromises = this._images.map((image) => this.loadImage(image));
    return Promise.all(loadPromises)
      .then(() => this._images)
      .catch((err) => err);
  }

  extendImageDetails(restrictedImageDetails: TRestrictedImageDetails[]) {
    this._images = restrictedImageDetails.map((details) => ({
      ...details,
      isLoaded: false,
      aspect: details.aspect || this._defaultAspectRatio,
      node: null,
    }));
  }

  init(): Promise<IImageDetails[]> {
    return this.preloadImages();
  }

  destroy(): void {
    this._images.forEach((image) => image.node.remove()); // Optional: Remove images from DOM
    this._images = []; // Clear the images array
  }
}

export default ImageService;
