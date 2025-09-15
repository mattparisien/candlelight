import PluginBase from "../_PluginBase/model";
import { PluginOptions } from "../_lib/ts/types";
import ScrollProgressService from "../_lib/services/ScrollProgressService";
import StickyService from "../_lib/services/StickyService";
import ClipPathService, { ClipPathOptions } from "../_lib/services/ClipPathService";
import DomUtils from "../_lib/utils/DomUtils";
import { HTML_SELECTOR_MAP } from "../_lib/config/domMappings";
import AnimationFrameService from "../_lib/services/AnimationFrameService";


export interface IBlobSectionRevealOptions extends ClipPathOptions {
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
      easing: "ease-out",
      startRadiusPx: 40,
      endRadiusViewportFactor: 0.9,
      center: { x: 50, y: 50 },
      smoothing: 0.15,
      svgPath: "M35.7,-29.4C43.8,-18.2,46.5,-3.5,42.8,8.7C39.2,20.9,29.3,30.6,15.4,40.7C1.4,50.8,-16.6,61.3,-32.6,57.5C-48.7,53.7,-62.8,35.6,-69.6,13.7C-76.3,-8.2,-75.7,-34,-62.9,-46.3C-50,-58.6,-25,-57.3,-5.6,-52.8C13.7,-48.3,27.5,-40.6,35.7,-29.4Z",
      morphPaths: [
        "M55,-36.6C70.5,-24.4,81.8,-1.6,78,18.8C74.1,39.2,55.1,57.1,34.4,64.3C13.7,71.6,-8.8,68.2,-28.5,58.9C-48.3,49.5,-65.4,34.2,-70.3,15.3C-75.2,-3.6,-67.9,-26,-54.2,-37.8C-40.5,-49.6,-20.2,-50.9,-0.3,-50.7C19.7,-50.5,39.4,-48.8,55,-36.6Z",
        "M46.4,-41.2C55.3,-25.8,54.3,-6.8,48.9,8.9C43.5,24.5,33.6,36.9,20.4,43.9C7.1,50.9,-9.5,52.6,-24.5,46.9C-39.4,41.2,-52.7,28.1,-58.3,11.2C-63.9,-5.8,-61.8,-26.7,-50.8,-42.6C-39.8,-58.5,-19.9,-69.3,-0.6,-68.8C18.7,-68.3,37.5,-56.6,46.4,-41.2Z",
        "M52.2,-36.5C67.6,-22.4,80,-0.6,75.2,16C70.5,32.6,48.6,44.1,29.2,49C9.8,53.9,-7.2,52.1,-27.8,46.5C-48.5,40.9,-72.7,31.5,-80.7,13.5C-88.6,-4.4,-80.4,-31,-64.3,-45.3C-48.1,-59.7,-24.1,-61.8,-2.8,-59.5C18.4,-57.3,36.8,-50.7,52.2,-36.5Z",
        "M53.2,-42.2C67.2,-24.8,75.7,-2.8,70.7,14.9C65.7,32.5,47.1,45.9,27.6,54.1C8,62.2,-12.5,65.3,-32.2,58.9C-52,52.4,-71,36.5,-75.7,17C-80.4,-2.6,-70.8,-25.7,-55.8,-43.3C-40.8,-60.9,-20.4,-73,-0.4,-72.6C19.6,-72.3,39.1,-59.6,53.2,-42.2Z",
        "M55.3,-41C68.6,-27.5,74,-4.7,67.7,12.4C61.4,29.5,43.2,40.8,24.1,50C4.9,59.2,-15.2,66.3,-34.3,61.1C-53.4,55.8,-71.3,38.1,-73.9,19C-76.5,0,-63.8,-20.4,-48.9,-34.3C-34.1,-48.1,-17,-55.6,2,-57.2C21,-58.8,42.1,-54.5,55.3,-41Z"
      ],
      ...options,
    };
  }

  protected validateOptions(userOptions: Partial<PluginOptions<IBlobSectionRevealOptions>>, defaultOptions: PluginOptions<IBlobSectionRevealOptions>): void | PluginOptions<IBlobSectionRevealOptions> {
    const opts = { ...defaultOptions, ...userOptions };

    // Validate and cap smoothing (min: 0, max: 1)
    if (opts.smoothing !== undefined) {
      if (typeof opts.smoothing !== "number" || Number.isNaN(opts.smoothing)) {
        console.warn("BlobSectionReveal: 'smoothing' must be a number. Using default value.");
        opts.smoothing = defaultOptions.smoothing;
      } else {
        opts.smoothing = Math.max(0, Math.min(1, opts.smoothing));
        if (opts.smoothing !== userOptions.smoothing) {
          console.warn(`BlobSectionReveal: 'smoothing' capped to ${opts.smoothing} (range: 0-1)`);
        }
      }
    }

    // Validate and cap startRadiusPx (min: 0, max: 500)
    if (opts.startRadiusPx !== undefined) {
      if (typeof opts.startRadiusPx !== "number" || Number.isNaN(opts.startRadiusPx)) {
        console.warn("BlobSectionReveal: 'startRadiusPx' must be a number. Using default value.");
        opts.startRadiusPx = defaultOptions.startRadiusPx;
      } else {
        opts.startRadiusPx = Math.max(0, Math.min(500, opts.startRadiusPx));
        if (opts.startRadiusPx !== userOptions.startRadiusPx) {
          console.warn(`BlobSectionReveal: 'startRadiusPx' capped to ${opts.startRadiusPx} (range: 0-500)`);
        }
      }
    }

    // Validate and cap endRadiusViewportFactor (min: 0.1, max: 3.0)
    if (opts.endRadiusViewportFactor !== undefined) {
      if (typeof opts.endRadiusViewportFactor !== "number" || Number.isNaN(opts.endRadiusViewportFactor)) {
        console.warn("BlobSectionReveal: 'endRadiusViewportFactor' must be a number. Using default value.");
        opts.endRadiusViewportFactor = defaultOptions.endRadiusViewportFactor;
      } else {
        opts.endRadiusViewportFactor = Math.max(0.1, Math.min(3.0, opts.endRadiusViewportFactor));
        if (opts.endRadiusViewportFactor !== userOptions.endRadiusViewportFactor) {
          console.warn(`BlobSectionReveal: 'endRadiusViewportFactor' capped to ${opts.endRadiusViewportFactor} (range: 0.1-3.0)`);
        }
      }
    }

    // Validate center coordinates (min: 0, max: 100)
    if (opts.center !== undefined) {
      if (typeof opts.center !== "object" || opts.center === null) {
        console.warn("BlobSectionReveal: 'center' must be an object with x and y properties. Using default value.");
        opts.center = defaultOptions.center;
      } else {
        const originalCenter = { ...opts.center };
        opts.center.x = Math.max(0, Math.min(100, opts.center.x || 50));
        opts.center.y = Math.max(0, Math.min(100, opts.center.y || 50));
        
        if (opts.center.x !== originalCenter.x || opts.center.y !== originalCenter.y) {
          console.warn(`BlobSectionReveal: 'center' coordinates capped to {x: ${opts.center.x}, y: ${opts.center.y}} (range: 0-100)`);
        }
      }
    }

    // Validate morphPaths array length (max: 10 paths for performance)
    if (opts.morphPaths !== undefined) {
      if (!Array.isArray(opts.morphPaths)) {
        console.warn("BlobSectionReveal: 'morphPaths' must be an array. Using default value.");
        opts.morphPaths = defaultOptions.morphPaths;
      } else if (opts.morphPaths.length > 10) {
        console.warn(`BlobSectionReveal: 'morphPaths' limited to 10 paths for performance (provided: ${opts.morphPaths.length})`);
        opts.morphPaths = opts.morphPaths.slice(0, 10);
      }
    }

    return opts;
  }

  init(): void {
    this.setupDOM();
    // Always use 1 viewport height (100vh) for scroll distance
    this.stickySvc = new StickyService(this.container, 1);
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
    return DomUtils.wrapSiblings(section, "div", 0, { class: "bsr-wrapper" }, true);
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
    // Always use 1 viewport height (100vh) for scroll distance
    const end = start + window.innerHeight;

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

    // Calculate radius needed to just cover the viewport diagonal
    const diagonal = Math.sqrt(window.innerWidth ** 2 + window.innerHeight ** 2);
    
    // Cap the end radius to just what's needed to cover the screen
    const maxNeededRadius = diagonal * 0.7; // Slightly more than needed for full coverage
    const radiusPx = maxNeededRadius * Math.min(t, 1); // Don't exceed what's needed

    // For SVG blob: scale more conservatively to avoid over-scaling
    // Stop scaling aggressively once we've covered the viewport
    const maxScale = Math.min(15.0, (diagonal / 50)); // Scale based on viewport size, max 15
    const scale = maxScale * Math.min(t, 1); // Cap at 1 to prevent over-scaling


    this.sticky.style.setProperty("--bsr-progress", String(progress));
    this.sticky.style.setProperty("--bsr-progress-eased", String(t));

    // Check if blob has fully covered the viewport (early completion)
    const viewportDiagonal = Math.sqrt(window.innerWidth ** 2 + window.innerHeight ** 2);
    const isFullyCovered = radiusPx >= viewportDiagonal * 0.6;
    const effectiveProgress = isFullyCovered ? 1 : progress;

    if (effectiveProgress <= 0) {
      this.topSection.classList.remove("bsr-top--revealing", "bsr-top--done");
    } else if (effectiveProgress < 1) {
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
// new BlobSectionReveal(document.getElementById('container')!, { easing: 'ease-out' });
// Note: Scroll distance is always 100vh (one viewport height)
