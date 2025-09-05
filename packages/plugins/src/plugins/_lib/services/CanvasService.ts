import PluginService from "./PluginService";

type TCanvasContext = "2d" | "webgl";

interface ICanvasOptions {
  blendMode: "exclusion";
}

interface ICanvasService {
  canvas: HTMLCanvasElement;
  context: RenderingContext | null;
  initializeCanvas(element: HTMLCanvasElement): void;
}

class CanvasService extends PluginService implements ICanvasService {
  public canvas: HTMLCanvasElement;
  public context: RenderingContext | null = null;
  public options: ICanvasOptions | null = null;

  private _devicePixelRatio : number = window.devicePixelRatio || 1;

  constructor(
    container: HTMLCanvasElement,
    context?: TCanvasContext,
    options?: ICanvasOptions
  ) {
    super();
    this.canvas = container;
    this.context = this.canvas.getContext(context || "2d");
    this.options = options;
    this.canvas.style.mixBlendMode = options?.blendMode ?? "normal";
    this.addListeners();
  }

  init(): void {
    this.sizeCanvas();
  }

  initializeCanvas(element: HTMLCanvasElement): void {
    this.canvas = element;
  }

  sizeCanvas() {
    this.canvas.style.width = window.innerWidth + "px";
    this.canvas.style.height = window.innerHeight + "px";
    this.canvas.width = window.innerWidth * window.devicePixelRatio;
    this.canvas.height = window.innerHeight * window.devicePixelRatio;
  }

  onResize() {
    this.sizeCanvas();
  }

  addListeners() {
    window.addEventListener("resize", this.onResize.bind(this));
  }
}

export default CanvasService;
