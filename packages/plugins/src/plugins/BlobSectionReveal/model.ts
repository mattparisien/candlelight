import PluginBase from "../_PluginBase/model";
import { PluginOptions } from "../_lib/ts/types";
import ScrollProgressService from "../_lib/services/ScrollProgressService";
import StickyService from "../_lib/services/StickyService";
import ClipPathService, { ClipPathOptions } from "../_lib/services/ClipPathService";
import DomUtils from "../_lib/utils/DomUtils";
import { HTML_SELECTOR_MAP } from "../_lib/config/domMappings";
import AnimationFrameService from "../_lib/services/AnimationFrameService";


export interface IBlobSectionRevealOptions extends ClipPathOptions {
  durationVh?: number; // pin duration in viewport heights
  easing?: string; // 'linear' | 'ease-in' | 'ease-out' (simple keywords)
  startRadiusPx?: number; // initial radial hole (px)
  endRadiusViewportFactor?: number; // final radius factor vs min viewport dimension
  smoothing?: number; // 0 disables smoothing, 0-1 lerp factor per frame
  morphPaths?: string[]; // Array of SVG paths to morph between during scroll
}


export interface IBlobSectionReveal {
  init(): void;
  destroy(): void;
}

class BlobSectionReveal extends PluginBase<IBlobSectionRevealOptions> implements IBlobSectionReveal {
  protected allowedOptions: (keyof IBlobSectionRevealOptions)[] = [
    "durationVh",
    "easing",
    "startRadiusPx",
    "endRadiusViewportFactor",
    "svgPath",
    "center",
    "smoothing",
    "morphPaths",
  ];

  private options: PluginOptions<IBlobSectionRevealOptions>;
  private sticky!: HTMLDivElement;
  private topSection!: HTMLElement;
  private bottomSection!: HTMLElement;

  private scrollSvc!: ScrollProgressService;
  private stickySvc!: StickyService;
  private clipPathSvc!: ClipPathService;
  private resizeObserver?: ResizeObserver;
  private afSvc?: AnimationFrameService;

  // Progress smoothing state
  private targetProgress = 0;
  private displayProgress = 0;

  constructor(container: HTMLElement, options: PluginOptions<IBlobSectionRevealOptions> = {}) {

    super(container, "BlobSectionReveal");

    this.options = {
      durationVh: 1,
      easing: "ease-out",
      startRadiusPx: 40,
      endRadiusViewportFactor: 0.9,
      center: { x: 50, y: 50 },
      smoothing: 0.15,
      svgPath: "M49.3,-18.8C53.6,-2.9,39.6,16.2,25.9,23.3C12.1,30.4,-1.4,25.4,-19.3,15.1C-37.3,4.8,-59.6,-10.9,-57.1,-24.4C-54.6,-37.9,-27.3,-49.2,-2.4,-48.4C22.5,-47.6,45,-34.8,49.3,-18.8Z",
      morphPaths: [
        "M49.3,-18.8C53.6,-2.9,39.6,16.2,25.9,23.3C12.1,30.4,-1.4,25.4,-19.3,15.1C-37.3,4.8,-59.6,-10.9,-57.1,-24.4C-54.6,-37.9,-27.3,-49.2,-2.4,-48.4C22.5,-47.6,45,-34.8,49.3,-18.8Z",
        "M63.4,-24.1C68.9,-3.8,50.8,20.6,29,35.4C7.1,50.2,-18.5,55.5,-34.6,44.5C-50.7,33.5,-57.3,6.4,-50,-16.5C-42.6,-39.5,-21.3,-58.2,3.8,-59.4C29,-60.7,58,-44.5,63.4,-24.1Z",
        "M44,-17C51.6,9.2,48.6,36,33.9,46.8C19.1,57.6,-7.5,52.3,-26.3,38.2C-45,24.1,-55.9,1.2,-50.2,-22.3C-44.5,-45.9,-22.3,-70,-2,-69.3C18.2,-68.7,36.3,-43.2,44,-17Z"
      ],
      ...options,
    };
  }

  protected validateOptions(userOptions: Partial<PluginOptions<IBlobSectionRevealOptions>>, defaultOptions: PluginOptions<IBlobSectionRevealOptions>): void | PluginOptions<IBlobSectionRevealOptions> {
    const opts = { ...defaultOptions, ...userOptions };

    if (opts.durationVh !== undefined) {
      if (typeof opts.durationVh !== "number" || opts.durationVh <= 0) {
        throw new Error("BlobSectionReveal: 'durationVh' must be a positive number.");
      }
    }

    if (opts.smoothing !== undefined) {
      if (typeof opts.smoothing !== "number" || Number.isNaN(opts.smoothing)) {
        throw new Error("BlobSectionReveal: 'smoothing' must be a number between 0 and 1.");
      }
      if (opts.smoothing < 0 || opts.smoothing > 1) {
        throw new Error("BlobSectionReveal: 'smoothing' must be within [0, 1].");
      }
    }
  }

  init(): void {
    this.setupDOM();
    const durationVh = this.options.durationVh ?? 1;
    this.stickySvc = new StickyService(this.container, durationVh);
    this.stickySvc.applyBaseLayout();

    this.clipPathSvc = new ClipPathService(this.bottomSection, this.options as ClipPathOptions);
    this.clipPathSvc.mount();

    this.scrollSvc = new ScrollProgressService((p) => this.setTargetProgress(p));
    this.computeRanges();
    this.scrollSvc.attach();

    this.resizeObserver = new ResizeObserver(() => this.computeRanges());
    this.resizeObserver.observe(document.documentElement);

    // Start animation loop for smoothing (only if enabled)
    const smoothing = this.options.smoothing ?? 0;
    if (smoothing > 0) {
      this.afSvc = new AnimationFrameService((ts) => this.onTick(ts));
      this.afSvc.startAnimation();
    }
  }

  destroy(): void {
    this.scrollSvc?.detach();
    this.resizeObserver?.disconnect();
    this.clipPathSvc?.unmount();
    this.afSvc?.stopAnimation();

    this.container.classList.remove("bsr-container");
    if (this.sticky && this.sticky.parentNode === this.container) {
      while (this.sticky.firstChild) this.container.appendChild(this.sticky.firstChild);
      this.container.removeChild(this.sticky);
    }
  }

  private getParentSection(anchorEl) {
    return DomUtils.traverseUpTo(anchorEl, HTML_SELECTOR_MAP.get("section"));
  }

  private wrapSections(section) {
    return DomUtils.wrapSiblings(section, "div", 1, { class: "bsr-wrapper" }, true);
  }

  // ───────────────────────────────────────────────────────────────────────────
  private setupDOM() {
    const section = this.getParentSection(this.container);
    if (!section) throw new Error("BlobSectionReveal must be inside a <section>.");

    const wrapper = this.wrapSections(section);

    if (!wrapper) throw new Error("BlobSectionReveal did not wrap the sections.");

    this.container = wrapper;

    const children = Array.from(this.container.children) as HTMLElement[];
    if (children.length < 2) throw new Error("BlobSectionReveal requires two direct children.");

    this.topSection = children[0];
    this.bottomSection = children[1];

    this.sticky = document.createElement("div");
    this.sticky.className = "bsr-sticky";

    this.sticky.appendChild(this.topSection);
    this.sticky.appendChild(this.bottomSection);

    this.container.appendChild(this.sticky);
    this.container.setAttribute('data-candlelight-blob-section-reveal', 'true');
  }

  private computeRanges() {
    const rect = this.container.getBoundingClientRect();
    const start = window.scrollY + rect.top;
    const end = start + (this.options.durationVh! * window.innerHeight);

    this.scrollSvc.setRange(start, end);

    const y = window.scrollY || window.pageYOffset;
    const raw = (y - start) / Math.max(1, end - start);
    const progress = Math.max(0, Math.min(1, raw));

    this.setTargetProgress(progress);
  }

  private setTargetProgress(progress: number) {
    this.targetProgress = progress;
    const smoothing = this.options.smoothing ?? 0;
    // If smoothing is disabled, update immediately
    if (!smoothing || smoothing <= 0) {
      this.displayProgress = this.targetProgress;
      this.onProgress(this.displayProgress);
    }
  }

  private onTick(_timestamp: number) {
    const smoothing = this.options.smoothing ?? 0;
    if (!smoothing || smoothing <= 0) {
      return; // handled immediately in setTargetProgress
    }

    // Lerp display toward target
    const diff = this.targetProgress - this.displayProgress;
    if (Math.abs(diff) < 0.0001) {
      this.displayProgress = this.targetProgress;
    } else {
      this.displayProgress += diff * smoothing; // simple frame-based lerp
    }

    this.onProgress(this.displayProgress);
  }

  private onProgress(progress: number) {

    const t = this.sampleEase(progress);

    // Calculate radius to cover entire viewport diagonal
    const diagonal = Math.sqrt(window.innerWidth ** 2 + window.innerHeight ** 2);
    const endR = diagonal * 0.6; // Ensure full coverage
    const radiusPx = endR * t; // Start at 0, scale to full diagonal
    
    // For SVG blob: start at scale 0 (invisible), grow to large
    // t ranges from 0 to 1, we want scale to go from 0 to large
    const scale = 20.0 * t; // Start at 0 (invisible), grow to 20.0


    this.sticky.style.setProperty("--bsr-progress", String(progress));
    this.sticky.style.setProperty("--bsr-progress-eased", String(t));

    if (progress <= 0) {
      this.topSection.classList.remove("bsr-top--revealing", "bsr-top--done");
    } else if (progress < 1) {
      this.topSection.classList.add("bsr-top--revealing");
      this.topSection.classList.remove("bsr-top--done");
    } else {
      this.topSection.classList.add("bsr-top--done");
      this.topSection.classList.remove("bsr-top--revealing");
    }

    this.clipPathSvc.update(progress, radiusPx, scale);
  }

  private sampleEase(t: number): number {
    const easing = (this.options.easing || "ease-out").trim();
    switch (easing) {
      case "linear":
        return t;
      case "ease-in":
        return t * t;
      case "ease-out":
      default:
        return 1 - (1 - t) * (1 - t);
    }
  }
}

export default BlobSectionReveal;

// Usage:
// 1) Import styles once: import "./styles/main.scss";
// 2) Structure:
// <div id="container">
//   <section>Top</section>
//   <section>Bottom</section>
// </div>
// 3) Init:
// new BlobSectionReveal(document.getElementById('container')!, { durationVh: 1 });
