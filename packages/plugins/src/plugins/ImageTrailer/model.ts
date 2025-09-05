import { AnimationFrameService, MouseEventsService } from "../_lib/services";
import ImageService, { IImageDetails } from "../_lib/services/ImageService";
import { EMouseEvent } from "../_lib/services/MouseEventsService";
import { EAspectRatio, PluginOptions } from "../_lib/ts/types";
import DomUtils from "../_lib/utils/DomUtils";
import PluginBase from "../_PluginBase/model";
import gsap from "gsap";
import StringUtils from "../_lib/utils/StringUtils";

interface IImageTrailerptions {
  images: string[];
  crop?: EAspectRatio;
  maxWidth?: number;
}

interface IImageData {
  node: HTMLDivElement;
  lastPos: {
    x: number;
    y: number;
  };
  velocity: {
    x: number;
    y: number;
  };
  opacity: number;
}

class ImageTrailer extends PluginBase<IImageTrailerptions> {
  private _windowMouseEvents: MouseEventsService | null = null;
  private _sectionMouseEvents: MouseEventsService | null = null;
  private _tickService: AnimationFrameService | null = null;
  private _imageService: ImageService | null = null;
  private _timelines: GSAPTimeline[] | null = null;
  private _currImageIdx: number = 0;
  private _crop: EAspectRatio | null = null;
  private _maxWidth: number = 240;

  private _isActive: boolean = false;

  private _lastMouseX: number = 0;
  private _lastMouseY: number = 0;
  private _posX: number = 0;
  private _posY: number = 0;

  private _maxVelocity: number = 10;
  private _fadeThreshold: number = 0.45; // Velocity threshold to start fading
  private _minOpacity: number = 0.0; // Minimum opacity (fully transparent)
  private _fadeRate: number = 0.08; // Rate at which the image fades out


  private _imageData: IImageData[] | null = null;
  private _debounceTickerId: any = null;

  private readonly _mouseMoveThreshold: number = 50;
  private readonly _debounceTickerTimeout: number = 100;

  

  posX = 0;
  posY = 0;
  isDisabled = false;

  allowedOptions: (keyof IImageTrailerptions)[] = ["images"];

  private _images: string[] = [
    "https://images.pexels.com/photos/17022636/pexels-photo-17022636/free-photo-of-redhead-with-freckles-wearing-makeup.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    "https://images.pexels.com/photos/5221588/pexels-photo-5221588.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    "https://images.pexels.com/photos/14774843/pexels-photo-14774843.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    "https://images.pexels.com/photos/20766853/pexels-photo-20766853/free-photo-of-the-cathedral-of-florence-italy.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    "https://images.pexels.com/photos/18669641/pexels-photo-18669641/free-photo-of-a-boat-on-the-canal-grande-in-venice-italy.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    "https://images.pexels.com/photos/20837398/pexels-photo-20837398/free-photo-of-a-woman-in-a-coat-and-dress-is-posing-for-a-photo.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    "https://images.pexels.com/photos/20788940/pexels-photo-20788940/free-photo-of-the-cover-of-the-album-the-girl-in-the-red-dress.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    "https://images.pexels.com/photos/20144127/pexels-photo-20144127/free-photo-of-two-peacocks-standing-in-front-of-a-building.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    "https://purepng.com/public/uploads/large/big-green-watermelon-t18.png",

  ];

  constructor(container: any, options: PluginOptions<IImageTrailerptions>) {
    super(container, "Image Trailer");

    this.validateOptions(options);

    this._tickService = new AnimationFrameService(this.onTick.bind(this));
    this._windowMouseEvents = new MouseEventsService(window, [
      {
        event: EMouseEvent.Move,
        handler: this.onWindowMouseMove.bind(this),
      },
    ]);
    this._sectionMouseEvents = new MouseEventsService(this.container, [
      {
        event: EMouseEvent.Move,
        handler: this.onSectionMouseMove.bind(this),
      },
      {
        event: EMouseEvent.Leave,
        handler: this.onSectionMouseLeave.bind(this),
      },
    ]);
    this._imageService = new ImageService(
      this._images.map((x) => ({
        src: x,
        aspect: this._crop,
      }))
    );
  }

  protected validateOptions(options: PluginOptions<IImageTrailerptions>): void {
    if (options._crop) {
      const pascal = StringUtils.toPascalCase(options._crop);

      if (Object.keys(EAspectRatio).includes(pascal)) {
        options.crop = EAspectRatio[pascal];
      }
    }

    return this.setOptions(options);
  }

  lerp(start, end, t): number {
    return start * (1 - t) + end * t;
  }

  getPrevImageIdx(): number {
    if (this._currImageIdx === 0) return this._imageData.length - 1;
    else return this._currImageIdx - 1;
  }

  getNextImageIdx(): number {
    if (this._currImageIdx < this._imageData.length - 1)
      return this._currImageIdx + 1;
    else return 0;
  }

  incrementCurrImageIdx(): void {
    if (this._images) {
      this._currImageIdx = (this._currImageIdx + 1) % this._images.length;

      // Reset the position and opacity for the new active image
      this._imageData[this._currImageIdx].lastPos.x =
        this._posX - this._imageData[this._currImageIdx].velocity.x;
      this._imageData[this._currImageIdx].lastPos.y =
        this._posY - this._imageData[this._currImageIdx].velocity.y;
      this._imageData[this._currImageIdx].opacity = 1; // Ensure the image is fully opaque when it becomes active
    }
  }

  calculateTimeout(mouseSpeed): number {
    // Ensure mouseSpeed is between 0 and 1
    const minTimeout = 100; // Timeout in milliseconds at mouse speed 0
    const maxTimeout = 1000; // Timeout in milliseconds at mouse speed 1

    // Linearly interpolate the timeout between minTimeout and maxTimeout based on mouseSpeed
    const timeout = maxTimeout - (maxTimeout - minTimeout) * mouseSpeed;

    return timeout;
  }

  onWindowMouseMove(event: MouseEvent): void {
    const { left, top } = this.getContainerBounds();
    this._posX = event.clientX - left;
    this._posY = event.clientY - top;

    const mouseDistanceMoved = Math.sqrt(
      Math.pow(this._posX - this._lastMouseX, 2) +
        Math.pow(this._posY - this._lastMouseY, 2)
    );

    if (mouseDistanceMoved > this._mouseMoveThreshold) {
      this.onImageSwitch();
      this._lastMouseX = this._posX;
      this._lastMouseY = this._posY;
    }

    // Debounce logic to detect when mouse movement stops, if needed
    if (this._debounceTickerId) clearTimeout(this._debounceTickerId);
    this._debounceTickerId = setTimeout(() => {
      this.onWindowMouseMoveStop();
    }, this._debounceTickerTimeout);
  }

  onSectionMouseMove() {
    if (!this._isActive) this._isActive = true;
    if (!this._windowMouseEvents.isListening()) this._windowMouseEvents.init();
    if (!this._tickService.isTicking()) this._tickService.startAnimation();
  }

  onSectionMouseLeave() {
    // Cleanup
    this._windowMouseEvents.destroy();
    this._isActive = false;
  }

  onWindowMouseMoveStop(): void {
    clearTimeout(this._debounceTickerId);
    this._debounceTickerId = null;
  }

  onImageSwitch(): void {
    this.incrementCurrImageIdx();
    this.updateStacking();
  }

  getCurrentImage(): HTMLElement {
    return this.getImageNode(this._currImageIdx);
  }

  updateStacking(): void {
    this._imageData.forEach((image, i) => {
      if (i === this._currImageIdx) {
        image.node.style.zIndex = this._imageData.length.toString();
      } else {
        image.node.style.zIndex = (this._imageData.length - 1).toString();
      }
    });
  }

  isImageAnimating(imageIdx: number): boolean {
    return this._timelines[imageIdx].isActive();
  }

  fadeOutPrevImage(): void {
    const tl = this._timelines[this.getPrevImageIdx()];
    tl.restart();
  }

  getImageNode(imageIdx: number): HTMLDivElement {
    return this._imageData[imageIdx].node;
  }

  getContainerBounds() {
    return this.container.getBoundingClientRect();
  }

  onTick(): void {
    if (!this._images) return;

    this._imageData.forEach((image, index) => {
      if (index === this._currImageIdx) {
        // Active image logic to follow the mouse, similar to previous implementations
        let desiredVelocityX = (this._posX - image.lastPos.x) * 0.1;
        let desiredVelocityY = (this._posY - image.lastPos.y) * 0.1;

        image.velocity.x =
          Math.sign(desiredVelocityX) *
          Math.min(Math.abs(desiredVelocityX), this._maxVelocity);
        image.velocity.y =
          Math.sign(desiredVelocityY) *
          Math.min(Math.abs(desiredVelocityY), this._maxVelocity);

        image.opacity = 1; // Ensure the current image is fully opaque
      } else {
        // Decrease velocity for non-active images
        image.velocity.x *= 0.95;
        image.velocity.y *= 0.95;

        // Start fading if the velocity is below a certain threshold
        if (
          Math.abs(image.velocity.x) < this._fadeThreshold &&
          Math.abs(image.velocity.y) < this._fadeThreshold
        ) {
          image.opacity = Math.max(
            this._minOpacity,
            image.opacity - this._fadeRate
          );
        }
      }

      // Update position and apply opacity
      image.lastPos.x += image.velocity.x;
      image.lastPos.y += image.velocity.y;

      image.node.style.left = `${image.lastPos.x}px`;
      image.node.style.top = `${image.lastPos.y}px`;
      image.node.style.opacity = `${image.opacity}`;
    });
  }

  wrapImages(wrapperEl: string, images: HTMLElement[]): HTMLElement[] {
    return DomUtils.wrapMany(images, wrapperEl);
  }

  createImages(images: IImageDetails[]): void {
    const wrappedImages: IImageData[] = images.map((image) => {
      const el = DomUtils.wrapElement(image.node, "div") as HTMLDivElement;
      el.classList.add("trailer-image", `aspect-${this._crop || "intrinsic"}`);
      el.style.maxWidth = this._maxWidth + "px";
      return {
        node: el,
        lastPos: {
          x: 0,
          y: 0,
        },
        velocity: {
          x: 0,
          y: 0,
        },
        opacity: 1,
      };
    });

    this._imageData = wrappedImages;
  }

  appendImages(): void {
    DomUtils.appendMany(
      this.container,
      this._imageData.map((image) => image.node)
    );
  }

  createTimeline(el: HTMLElement, onComplete?: gsap.Callback) {
    const tl = gsap.timeline({ paused: true, onComplete });
    tl.to(el, {
      opacity: 0,
      delay: 0.5,
      duration: 1,
      ease: "Linear.EaseNone",
    });

    return tl;
  }

  createTimelines(): void {
    this._timelines = this._imageData.map((image) =>
      this.createTimeline(image.node)
    );
  }

  init(): void {
    this._imageService
      .init()
      .then((images) => {
        this.createImages(images);
        this.appendImages();
        this.createTimelines();
        this._sectionMouseEvents.init();
        this._tickService.init();
      })
      .catch((err) => console.log(err));
  }
}

export default ImageTrailer;
