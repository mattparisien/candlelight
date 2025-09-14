export interface ClipPathOptions {
  svgPath?: string;
  center?: { x: number; y: number };
}

export default class ClipPathService {
  private usesSvg = false;
  private svg?: SVGSVGElement;
  private pathEl?: SVGPathElement;
  private topSection!: HTMLElement;
  private opt: Required<Pick<ClipPathOptions, "center">> & ClipPathOptions;
  private _clipPathId = `bsr-clippath-${Math.random().toString(36).slice(2)}`;

  constructor(topSection: HTMLElement, options: ClipPathOptions) {
    this.topSection = topSection;
    this.opt = {
      center: options.center || { x: 50, y: 50 },
      ...options,
    };
  }

  mount() {
    if (this.opt.svgPath) {
      this.usesSvg = true;
      const svgNS = "http://www.w3.org/2000/svg";
      this.svg = document.createElementNS(svgNS, "svg");
      this.svg.setAttribute("class", "bsr-svg-clippath");
      this.svg.setAttribute("aria-hidden", "true");
      this.svg.setAttribute("width", "0");
      this.svg.setAttribute("height", "0");
      this.svg.setAttribute("viewBox", "0 0 200 200");

      const defs = document.createElementNS(svgNS, "defs");
      const clipPath = document.createElementNS(svgNS, "clipPath");
      clipPath.setAttribute("id", this._clipPathId);
      // Use userSpaceOnUse to work in pixel space
      clipPath.setAttribute("clipPathUnits", "userSpaceOnUse");

      this.pathEl = document.createElementNS(svgNS, "path");
      // Use the original path, but we'll transform it in the update method
      this.pathEl.setAttribute("d", this.opt.svgPath);
      this.pathEl.setAttribute("transform-origin", "0 0");

      clipPath.appendChild(this.pathEl);
      defs.appendChild(clipPath);
      this.svg.appendChild(defs);

      document.body.appendChild(this.svg);

      // Apply clip-path to top section
      this.topSection.style.clipPath = `url(#${this._clipPathId})`;
      this.topSection.classList.add("bsr-top--use-svg-clippath");
    } else {
      this.topSection.classList.add("bsr-top--use-radial-clippath");
      this.topSection.style.setProperty("--bsr-center-x", this.opt.center.x + "%");
      this.topSection.style.setProperty("--bsr-center-y", this.opt.center.y + "%");
    }
  }



  update(progress: number, radiusPx: number, scale: number) {
    if (this.usesSvg && this.pathEl) {
      // Position the blob at center of viewport and scale from its own center
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      
      // Convert scale (0-20) to reasonable pixel scale for the blob
      // At scale 0, blob is invisible; at scale 20, blob covers viewport
      const pixelScale = scale * 2; // Scale 0-40 range
      
      // Proper transform: translate to viewport center, scale from blob center (0,0), then offset back
      this.pathEl.setAttribute(
        "transform",
        `translate(${centerX} ${centerY}) scale(${pixelScale})`
      );
    } else {
      // Use CSS circle() for radial clip-path
      const radius = Math.min(radiusPx, 2000); // Cap radius for performance
      this.topSection.style.clipPath = `circle(${radius}px at ${this.opt.center.x}% ${this.opt.center.y}%)`;
    }
  }

  unmount() {
    if (this.svg && this.svg.parentNode) {
      this.svg.parentNode.removeChild(this.svg);
    }
    this.topSection.style.clipPath = '';
    this.topSection.classList.remove("bsr-top--use-svg-clippath", "bsr-top--use-radial-clippath");
  }
}
