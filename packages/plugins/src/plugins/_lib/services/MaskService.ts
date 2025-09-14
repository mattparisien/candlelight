export interface MaskOptions {
  svgPath?: string;
  center?: { x: number; y: number };
}

export default class MaskService {
  private usesSvg = false;
  private svg?: SVGSVGElement;
  private pathEl?: SVGPathElement;
  private topSection!: HTMLElement;
  private opt: Required<Pick<MaskOptions, "center">> & MaskOptions;
  private _maskId = `bsr-mask-${Math.random().toString(36).slice(2)}`;

  constructor(topSection: HTMLElement, options: MaskOptions) {
    this.topSection = topSection;
    this.opt = {
      center: options.center || { x: 50, y: 60 },
      ...options,
    };
  }

  mount() {
    if (this.opt.svgPath) {
      this.usesSvg = true;
      const svgNS = "http://www.w3.org/2000/svg";
      this.svg = document.createElementNS(svgNS, "svg");
      this.svg.setAttribute("class", "bsr-svg-mask");
      this.svg.setAttribute("aria-hidden", "true");
      this.svg.setAttribute("width", "0");
      this.svg.setAttribute("height", "0");

      const defs = document.createElementNS(svgNS, "defs");
      const mask = document.createElementNS(svgNS, "mask");
      mask.setAttribute("id", this._maskId);

      // For blob reveal: black background (hidden), white blob path (visible)
      const rect = document.createElementNS(svgNS, "rect");
      rect.setAttribute("x", "0");
      rect.setAttribute("y", "0");
      rect.setAttribute("width", "100%");
      rect.setAttribute("height", "100%");
      rect.setAttribute("fill", "black");

      const g = document.createElementNS(svgNS, "g");
      g.setAttribute("class", "bsr-mask-group");

      this.pathEl = document.createElementNS(svgNS, "path");
      this.pathEl.setAttribute("d", this.opt.svgPath);
      this.pathEl.setAttribute("fill", "white");
      this.pathEl.setAttribute("transform-origin", `${this.opt.center.x}% ${this.opt.center.y}%`);

      g.appendChild(this.pathEl);
      mask.appendChild(rect);
      mask.appendChild(g);
      defs.appendChild(mask);
      this.svg.appendChild(defs);

      document.body.appendChild(this.svg);

      // Apply mask to top section
      (this.topSection.style as any).webkitMask = `url(#${this._maskId})`;
      (this.topSection.style as any).mask = `url(#${this._maskId})`;
      this.topSection.classList.add("bsr-top--use-svg-mask");
    } else {
      this.topSection.classList.add("bsr-top--use-radial-mask");
      this.topSection.style.setProperty("--bsr-center-x", this.opt.center.x + "%");
      this.topSection.style.setProperty("--bsr-center-y", this.opt.center.y + "%");
    }
  }

  update(progress: number, radiusPx: number, scale: number) {
    if (this.usesSvg && this.pathEl) {
      const tx = this.opt.center!.x;
      const ty = this.opt.center!.y;
      this.pathEl.setAttribute(
        "transform",
        `translate(${tx} ${ty}) scale(${scale}) translate(${-tx} ${-ty})`
      );
    } else {
      this.topSection.style.setProperty("--bsr-radius-px", `${radiusPx}px`);
      this.topSection.style.setProperty("--bsr-progress", String(progress));
    }
  }

  unmount() {
    if (this.svg && this.svg.parentNode) this.svg.parentNode.removeChild(this.svg);
  }
}
