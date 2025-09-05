import { HTML_SELECTOR_MAP, SQSP_ENV_SELECTOR_MAP } from "../_lib/config/domMappings";
import {
  AnimationFrameService
} from "../_lib/services";
import { PluginOptions } from "../_lib/ts/types";
import DomUtils from "../_lib/utils/DomUtils";
import PluginBase from "../_PluginBase/model";
import maskSvg from "./assets/mask.svg";

interface ILayeredSectionsOptions {
  radius?: number;
  blur?: number;
}

interface ILayeredSections {
  codeBlock: HTMLElement | null;
  init(): void;
  destroy(): void;

}

class LayeredSections
  extends PluginBase<ILayeredSectionsOptions>
  implements ILayeredSections {

  private _color: string = "red";
  private _radius: number = 80;
  private _blur: number = 0;
  private _step: number = 10;
  private _tickService: AnimationFrameService;
  private _destroyed: boolean = false;

  codeBlock = null;
  svg = null;
  sections: HTMLElement[] = [];
  originalDomState: {
    parent: HTMLElement | null;
    nextSibling: Node | null;
    codeBlockDisplay: string;
    sectionsData: Array<{
      element: HTMLElement;
      parent: HTMLElement | null;
      nextSibling: Node | null;
    }>;
  } = {
    parent: null,
    nextSibling: null,
    codeBlockDisplay: '',
    sectionsData: []
  };

  allowedOptions: (keyof ILayeredSectionsOptions)[] = ['radius', 'blur']

  constructor(container: any, options: PluginOptions<ILayeredSectionsOptions>) {
    super(container, "");

    this.codeBlock = DomUtils.traverseUpTo(this.container, HTML_SELECTOR_MAP.get("section"));

    if (!this.codeBlock) {
      console.warn("LayeredSections: No parent section found for the plugin container.");
      return;
    }

    this.sections = DomUtils.getNextSiblings(this.codeBlock, HTML_SELECTOR_MAP.get("section"), 0);

    // Ensure we have sections to work with
    if (!this.sections?.length) {
      console.warn("LayeredSections: No sibling sections found.");
      return;
    }

    // Capture DOM state before wrapping
    this.captureDomState();
    
    // Hide the code block
    if (this.codeBlock) {
      (this.codeBlock as HTMLElement).style.display = 'none';
    }
    
    this.container = DomUtils.wrapSiblings(this.sections[0], "div", 0, { "data-candlelight-plugin-layered-sections-container": "true" }, true);
    this.sections = Array.from(this.container.children).filter((child) => child.matches(HTML_SELECTOR_MAP.get("section"))) as HTMLElement[];

    // Append the SVG mask to the container
    this.svg = this.appendSvgMask();
    this._tickService = new AnimationFrameService(this.onTick.bind(this));

  }

  protected validateOptions(options: PluginOptions<ILayeredSectionsOptions>) {
    this.setOptions(options);
    
    // Apply options
    if (options.radius !== undefined) {
      this._radius = options.radius;
    }
    if (options.blur !== undefined) {
      this._blur = options.blur;
    }
  }

  private captureDomState(): void {
    if (!this.sections.length) return;

    // Store the original parent of the first section (where we'll insert the wrapper)
    const firstSection = this.sections[0];
    this.originalDomState.parent = firstSection.parentElement;
    this.originalDomState.nextSibling = firstSection.nextSibling;

    // Store the original display style of the code block
    if (this.codeBlock) {
      this.originalDomState.codeBlockDisplay = (this.codeBlock as HTMLElement).style.display || '';
    }

    // Store data for each section that will be wrapped
    this.originalDomState.sectionsData = this.sections.map(section => ({
      element: section,
      parent: section.parentElement,
      nextSibling: section.nextSibling
    }));

    console.log('DOM state captured:', this.originalDomState);
  }

  restoreDomState(): void {
    if (!this.originalDomState.parent || !this.originalDomState.sectionsData.length) {
      console.warn('No original DOM state to restore');
      return;
    }

    try {
      // Restore the code block display style
      if (this.codeBlock) {
        (this.codeBlock as HTMLElement).style.display = this.originalDomState.codeBlockDisplay;
      }

      // Remove the wrapper container
      if (this.container && this.container.parentElement) {
        this.container.parentElement.removeChild(this.container);
      }

      // Restore each section to its original position
      this.originalDomState.sectionsData.forEach(({ element, parent, nextSibling }) => {
        if (parent) {
          if (nextSibling) {
            parent.insertBefore(element, nextSibling);
          } else {
            parent.appendChild(element);
          }
        }
      });

      console.log('DOM state restored successfully');
    } catch (error) {
      console.error('Error restoring DOM state:', error);
    }
  }

  private appendSvgMask(): SVGElement {
    if (!this.container) return;

    // Create a temporary div to parse the SVG string
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = maskSvg;

    // Get the SVG element and append it to the container
    const svgElement = tempDiv.querySelector('svg');
    if (svgElement) {
      // Add blur filter if blur is specified
      if (this._blur > 0) {
        const defs = svgElement.querySelector('defs');
        if (defs) {
          // Create blur filter
          const filter = document.createElementNS("http://www.w3.org/2000/svg", "filter");
          filter.setAttribute("id", "blur-filter");
          
          const feGaussianBlur = document.createElementNS("http://www.w3.org/2000/svg", "feGaussianBlur");
          feGaussianBlur.setAttribute("stdDeviation", String(this._blur));
          
          filter.appendChild(feGaussianBlur);
          defs.appendChild(filter);
          
          // Apply filter to the mask group
          const maskGroup = svgElement.querySelector('mask g');
          if (maskGroup) {
            maskGroup.setAttribute("filter", "url(#blur-filter)");
          }
        }
      }
      
      this.container.appendChild(svgElement);
    }

    return svgElement as SVGElement;
  }

  private getLocalXY = (e: PointerEvent) => {
    const rect = this.container.getBoundingClientRect();
    // Map pointer to container coordinate space
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    return { x, y };
  };

  onTick() { }

  init() {
    if (!this.svg || !this.container) return;

    // Get the mask group element for drawing
    const stamps = this.svg.querySelector('mask g');
    if (!stamps) return;

    // Style the container for proper layering
    this.container.style.position = 'relative';
    this.container.style.overflow = 'hidden';

    // Apply mask to all sections in the container and style them properly
    this.sections.forEach((section, index) => {
      const sectionElement = section as HTMLElement & {
        style: CSSStyleDeclaration & {
          mask?: string;
          webkitMask?: string;
        }
      };

      // Position sections absolutely so they can overlap
      sectionElement.style.position = 'absolute';
      sectionElement.style.top = '0';
      sectionElement.style.left = '0';
      sectionElement.style.width = '100%';
      sectionElement.style.height = '100%';
      sectionElement.style.zIndex = String(index + 1);

      // Apply the mask to reveal sections (skip the bottom layer)
      if (index > 0) {
        sectionElement.style.mask = "url(#reveal-mask)";
        sectionElement.style.webkitMask = "url(#reveal-mask)";
      }
    });

    // Position SVG absolutely to overlay the sections
    this.svg.style.position = 'absolute';
    this.svg.style.top = '0';
    this.svg.style.left = '0';
    this.svg.style.pointerEvents = 'none'; // Allow clicks to pass through
    this.svg.style.zIndex = '9999';

    // Brush settings
    const RADIUS = this._radius;
    const STEP = this._step;

    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let isErasing = false;

    const distance = (x1: number, y1: number, x2: number, y2: number) =>
      Math.hypot(x2 - x1, y2 - y1);

    const stamp = (x: number, y: number) => {
      if (isErasing) {
        // Erase mode: create a black circle to hide the mask (black = hidden)
        const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        c.setAttribute("cx", String(x));
        c.setAttribute("cy", String(y));
        c.setAttribute("r", String(RADIUS));
        c.setAttribute("fill", "black");
        stamps.appendChild(c);
      } else {
        // Normal mode: create a white circle in the mask (white = visible)
        const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        c.setAttribute("cx", String(x));
        c.setAttribute("cy", String(y));
        c.setAttribute("r", String(RADIUS));
        c.setAttribute("fill", "white");
        stamps.appendChild(c);
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      dragging = true;
      this.container.setPointerCapture(e.pointerId);
      document.body.style.userSelect = "none";
      document.body.style.cursor = "grabbing";

      const { x, y } = this.getLocalXY(e);
      lastX = x;
      lastY = y;
      stamp(x, y); // initial stamp
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      const { x, y } = this.getLocalXY(e);

      // stamp every STEP pixels along the path (for smooth lines)
      const d = distance(lastX, lastY, x, y);
      if (d >= STEP) {
        // interpolate multiple stamps if the move was large
        const n = Math.floor(d / STEP);
        for (let i = 1; i <= n; i++) {
          const t = i / n;
          const ix = lastX + (x - lastX) * t;
          const iy = lastY + (y - lastY) * t;
          stamp(ix, iy);
        }
        lastX = x;
        lastY = y;
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      dragging = false;
      try {
        this.container.releasePointerCapture(e.pointerId);
      } catch { }
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'e') {
        isErasing = true;
        // Update cursor to indicate erase mode
        if (dragging) {
          document.body.style.cursor = "crosshair";
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'e') {
        isErasing = false;
        // Restore normal cursor
        if (dragging) {
          document.body.style.cursor = "grabbing";
        }
      }
    };

    this.container.style.cursor = "grab";
    this.container.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    // Handle resize: keep SVG sized to the viewport/container
    const resize = () => {
      // Check if in dev mode and destroy plugin if needed (only once)
      if (!this._destroyed && document.querySelector(SQSP_ENV_SELECTOR_MAP.get("DEV"))) {
        this.destroy();
        return;
      }

      const rect = this.container.getBoundingClientRect();
      this.svg.setAttribute("width", String(rect.width));
      this.svg.setAttribute("height", String(rect.height));
      this.svg.setAttribute("viewBox", `0 0 ${rect.width} ${rect.height}`);
    };

    resize();
    window.addEventListener("resize", resize);
  }

  destroy(): void {
    if (this._destroyed) {
      console.log('LayeredSections plugin already destroyed');
      return;
    }

    console.log('Destroying LayeredSections plugin...');
    this._destroyed = true;
    
    // Remove event listeners
    this.container?.removeEventListener("pointerdown", () => {});
    window.removeEventListener("pointermove", () => {});
    window.removeEventListener("pointerup", () => {});
    window.removeEventListener("pointercancel", () => {});
    window.removeEventListener("keydown", () => {});
    window.removeEventListener("keyup", () => {});
    window.removeEventListener("resize", () => {});
    
    // Stop animation service
    this._tickService?.stopAnimation();
    
    // Restore original DOM state
    this.restoreDomState();
    
    console.log('LayeredSections plugin destroyed');
  }
}

export default LayeredSections;
