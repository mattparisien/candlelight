import PluginBase from "../_PluginBase/model";
import { PluginOptions } from "../_lib/ts/types";
import ScrollProgressService from "../_lib/services/ScrollProgressService";
import StickyService from "../_lib/services/StickyService";
import MaskService, { MaskOptions } from "../_lib/services/MaskService";
import DomUtils from "../_lib/utils/DomUtils";
import { HTML_SELECTOR_MAP } from "../_lib/config/domMappings";


export interface IBlobSectionRevealOptions extends MaskOptions {
  durationVh?: number; // pin duration in viewport heights
  easing?: string; // 'linear' | 'ease-in' | 'ease-out' (simple keywords)
  startRadiusPx?: number; // initial radial hole (px)
  endRadiusViewportFactor?: number; // final radius factor vs min viewport dimension
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
  ];

  private options: PluginOptions<IBlobSectionRevealOptions>;
  private sticky!: HTMLDivElement;
  private topSection!: HTMLElement;
  private bottomSection!: HTMLElement;

  private scrollSvc!: ScrollProgressService;
  private stickySvc!: StickyService;
  private maskSvc!: MaskService;
  private resizeObserver?: ResizeObserver;

  constructor(container: HTMLElement, options: PluginOptions<IBlobSectionRevealOptions> = {}) {

    super(container, "BlobSectionReveal");

    this.options = {
      durationVh: 1,
      easing: "ease-out",
      startRadiusPx: 40,
      endRadiusViewportFactor: 0.9,
      center: { x: 50, y: 60 },
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
  }

  init(): void {
    this.setupDOM();

    const durationVh = this.options.durationVh ?? 1;
    this.stickySvc = new StickyService(this.container, durationVh);
    this.stickySvc.applyBaseLayout();

    this.maskSvc = new MaskService(this.topSection, this.options as MaskOptions);
    this.maskSvc.mount();

    this.scrollSvc = new ScrollProgressService((p) => this.onProgress(p));
    this.computeRanges();
    this.scrollSvc.attach();

    this.resizeObserver = new ResizeObserver(() => this.computeRanges());
    this.resizeObserver.observe(document.documentElement);
  }

  destroy(): void {
    this.scrollSvc?.detach();
    this.resizeObserver?.disconnect();
    this.maskSvc?.unmount();

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
    this.container.setAttribute('data-candlelight-plugin-blob-section-reveal', 'true');
  }

  private computeRanges() {
    const rect = this.container.getBoundingClientRect();
    const start = window.scrollY + rect.top;
    const end = start + (this.options.durationVh! * window.innerHeight);
    this.scrollSvc.setRange(start, end);

    const y = window.scrollY || window.pageYOffset;
    const raw = (y - start) / Math.max(1, end - start);
    this.onProgress(Math.max(0, Math.min(1, raw)));
  }

  private onProgress(progress: number) {
    const t = this.sampleEase(progress);

    const minViewport = Math.min(window.innerWidth, window.innerHeight);
    const endR = (this.options.endRadiusViewportFactor || 0.9) * minViewport * 0.5;
    const startR = this.options.startRadiusPx || 40;
    const radiusPx = startR + (endR - startR) * t;
    const scale = 0.1 + 3.0 * t; // used for SVG-path blob

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

    this.maskSvc.update(progress, radiusPx, scale);
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
