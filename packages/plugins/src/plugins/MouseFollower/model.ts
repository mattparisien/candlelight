import gsap from "gsap";
import AnimationFrameService from "../_lib/services/AnimationFrameService";
import CanvasService from "../_lib/services/CanvasService";
import MouseEventsService from "../_lib/services/MouseEventsService";
import { EMouseEvent } from "../_lib/services/MouseEventsService";
import { PluginOptions } from "../_lib/ts/types";
import PluginBase from "../_PluginBase/model";
import { HTML_SELECTOR_MAP, SQSP_BLOCK_SELECTOR_MAP } from "../_lib/config/domMappings";

interface IMouseFollowerOptions {
  color: string;
  radius: number;
  speed: number;
  opacity: number;
  hi: boolean;
}

interface IMouseFollower {
  posX: number;
  posY: number;
  isDisabled: boolean;
  init(): void;
  scaleIn(): void;
  scaleOut(): void;
  lerp(start: number, end: number, amount: number): number;
}

class MouseFollower
  extends PluginBase<IMouseFollowerOptions>
  implements IMouseFollower {
  private _canvasService: CanvasService;
  private _tickService: AnimationFrameService;
  private _mouseEventsService: MouseEventsService;


  private _color: string = "#FBC9C2";
  private _radius: number = 20;
  private _speed: number = 0.1;
  private _opacity: number = 1.0;
  private _fadeSpeed: number = 0.3; // Static fade speed

  private _colorProxy: string = this._color;
  private _radiusProxy: number = this._radius;
  private _isHoveringInteractive: boolean = false;
  private _hasPointer: boolean = false;
  private _leavingWindow: boolean = false; // track window-exit fade state
    
  private _hi: boolean = false; // unused for now

  posX = 0;
  posY = 0;
  isDisabled = false;

  options: PluginOptions<IMouseFollowerOptions> = {
    color: this._color,
    radius: this._radius,
    hi: this._hi,
    speed: this._speed,
    opacity: this._opacity,
  }

  allowedOptions: (keyof IMouseFollowerOptions)[] = [
    "color",
    "hi",
    "radius",
    "speed",
    "opacity",
  ];

  constructor(container: any, options: PluginOptions<IMouseFollowerOptions>) {
    super(container, "Mouse Follower");

    this.options = this.validateOptions(options);
    this._canvasService = new CanvasService(
      this.container as HTMLCanvasElement,
      "2d"
    );
    this._tickService = new AnimationFrameService(this.onTick.bind(this));
    this._mouseEventsService = new MouseEventsService(window, [
      {
        event: EMouseEvent.Move,
        handler: this.onMouseMove.bind(this),
      },
      {
        event: EMouseEvent.Enter,
        handler: this.onMouseEnter.bind(this),
      },
      {
        event: EMouseEvent.Leave,
        handler: this.onMouseLeave.bind(this),
      },
      {
        event: EMouseEvent.Out,
        handler: this.onMouseOut.bind(this),
      },
    ]);
  }

  protected validateOptions(options: PluginOptions<IMouseFollowerOptions>): PluginOptions<IMouseFollowerOptions> {
    this.setOptions(options);

    // Parse and apply options
    if (options.radius !== undefined) {
      this._radius = typeof options.radius === 'string' ? parseFloat(options.radius) : options.radius;
    }
    if (options.speed !== undefined) {
      this._speed = typeof options.speed === 'string' ? parseFloat(options.speed) : options.speed;
    }
    if (options.color !== undefined) {
      this._color = options.color;
    }
    if (options.opacity !== undefined) {
      this._opacity = typeof options.opacity === 'string' ? parseFloat(options.opacity) : options.opacity;
      // Clamp opacity between 0 and 1
      this._opacity = Math.max(0, Math.min(1, this._opacity));
      // Update canvas opacity immediately if canvas is initialized
      if (this._canvasService && this._canvasService.canvas) {
        this.updateCanvasOpacity();
      }
    }

    return this.options;
  }

  resizeCanvas() {
    this._canvasService.canvas.width = window.innerWidth;
    this._canvasService.canvas.height = window.innerHeight;

    // Make canvas background transparent
    const ctx = this._canvasService.context as CanvasRenderingContext2D;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }

  updateCanvasOpacity() {
    // Set the overall opacity of the canvas element
    (this._canvasService.canvas as HTMLCanvasElement).style.opacity = this._opacity.toString();
  }

  lerp(start: number, end: number, t: number): number {
    return start * (1 - t) + end * t;
  }

  draw() {
    const ctx = this._canvasService.context as CanvasRenderingContext2D;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Draw circle
    ctx.beginPath();
    ctx.arc(this.posX, this.posY, this._radius, 0, 2 * Math.PI);
    ctx.lineWidth = 5;
    ctx.fillStyle = this._color;
    ctx.fill();
  }

  scaleIn() {
    if (this._radius !== this._radiusProxy) {
      // Only scale in if not already at original radius
      gsap.to(this, {
        _radius: this._radiusProxy,
        ease: "Power3.Out",
        duration: this._fadeSpeed,
      });
    }
  }

  // Allow optional onComplete for cases like leaving window
  scaleOut(onComplete?: () => void) {
    if (this._radius !== 0) {
      gsap.to(this, { _radius: 0, ease: "Power3.Out", duration: this._fadeSpeed, onComplete });
    } else if (onComplete) {
      onComplete();
    }
  }

  onTick(): void {
    if (!this._hasPointer) return; // avoid drawing from (0,0)

    this.posX = this.lerp(this.posX, this._mouseEventsService.clientX, this._speed);
    this.posY = this.lerp(this.posY, this._mouseEventsService.clientY, this._speed);
    this.draw();
  }

  private setInitialFromEvent(e: MouseEvent) {
    // Set exact position and draw once before animating radius
    this.posX = e.clientX;
    this.posY = e.clientY;
    this._hasPointer = true;
    this.draw();
    this.scaleIn();
  }
  onMouseEnter(event: MouseEvent): void {
    // Cancel any pending window-leave reset
    this._leavingWindow = false;

    if (!this._hasPointer) {
      this.setInitialFromEvent(event);
      return;
    }
    if (this._radius === 0) this.scaleIn();
  }

  onMouseMove(event: MouseEvent): void {
    if (!this._hasPointer) {
      this.setInitialFromEvent(event);
      return; // skip hover logic this very first frame
    }

    // (existing hover logic)
    const target = event.target as HTMLElement;
    const isOverInteractive = this.isOverInteractiveElement(target);

    if (isOverInteractive && !this._isHoveringInteractive) {
      this._isHoveringInteractive = true;
      this.scaleOut();
    } else if (!isOverInteractive && this._isHoveringInteractive) {
      this._isHoveringInteractive = false;
      this.scaleIn();
    }
  }

  onMouseLeave(event: MouseEvent): void {
    // Treat like leaving the window; fade out, then allow re-anchor
    if (this._leavingWindow) return; // already processing a window leave
    this._leavingWindow = true;
    this.scaleOut(() => {
      if (this._leavingWindow) {
        this._hasPointer = false; // re-anchor on next enter, but only if still outside
        this._leavingWindow = false;
      }
    });
  }

  onMouseOut(event: MouseEvent): void {
    // Scale out only when the pointer leaves the window (no relatedTarget)
    const toElement = (event.relatedTarget || (event as any).toElement) as Node | null;
    if (!toElement) {
      if (this._leavingWindow) return; // already processing a window leave
      this._leavingWindow = true;
      this.scaleOut(() => {
        if (this._leavingWindow) {
          this._hasPointer = false; // ensures we re-anchor on next enter
          this._leavingWindow = false;
        }
      });
    }
  }

  addListeners() {
    window.addEventListener("resize", this.resizeCanvas.bind(this));
  }

  private isOverInteractiveElement(element: HTMLElement): boolean {
    if (!element) return false;

    // Check if the element itself matches interactive selectors
    const buttonSelector = HTML_SELECTOR_MAP.get("button");
    const linkSelector = HTML_SELECTOR_MAP.get("link");
    const sqspButtonSelector = SQSP_BLOCK_SELECTOR_MAP.get("button");

    if (buttonSelector && element.matches(buttonSelector)) return true;
    if (linkSelector && element.matches(linkSelector)) return true;
    if (sqspButtonSelector && element.matches(sqspButtonSelector)) return true;

    // Check if any parent element matches interactive selectors
    let parent = element.parentElement;
    while (parent) {
      if (buttonSelector && parent.matches(buttonSelector)) return true;
      if (linkSelector && parent.matches(linkSelector)) return true;
      if (sqspButtonSelector && parent.matches(sqspButtonSelector)) return true;
      parent = parent.parentElement;
    }

    return false;
  }

  init() {
    this._radiusProxy = this._radius;
    this._colorProxy = this._color;

    this._canvasService.init();
    this.resizeCanvas();

    // Transparent canvas + opacity
    (this._canvasService.canvas as HTMLCanvasElement).style.backgroundColor = 'transparent';
    this.updateCanvasOpacity();

    // START HIDDEN: scale from 0 later at real cursor position
    this._radius = 0;

    // Start services AFTER canvas sizing
    this._tickService.init();
    this._mouseEventsService.init();

    this.addListeners();
  }

}

export default MouseFollower;
