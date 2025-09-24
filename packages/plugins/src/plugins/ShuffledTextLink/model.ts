import PluginBase from "../_PluginBase/model";
import { PluginOptions } from "../_lib/ts/types";
import SplitTextService from "../_lib/services/SplitTextService";
import MouseEventsService, { EMouseEvent } from "../_lib/services/MouseEventsService";

interface IShuffledTextLinkOptions {
  duration?: number; // Duration of the shuffle animation in seconds
  steps?: number;    // Number of shuffle 
}

interface IShuffledTextLink {
  init(): void;
  destroy(): void;
}

class ShuffledTextLink extends PluginBase<IShuffledTextLinkOptions> implements IShuffledTextLink {
  protected allowedOptions: (keyof IShuffledTextLinkOptions)[] = [];
  private options: PluginOptions<IShuffledTextLinkOptions>;
  private splitSvc?: SplitTextService;
  private originalText: string = "";
  private isAnimating: boolean = false;
  private shuffleTimeout: number | null = null;
  private originalChars: string[] = [];
  private mouseEventsService?: MouseEventsService;

  private readonly duration: number = 0.3;
  private readonly steps: number = 4;

  constructor(container: HTMLElement, options: PluginOptions<IShuffledTextLinkOptions> = {}) {
    super(container, 'ShuffledTextLink');
    this.options = this.validateOptions(options);
  }

  protected validateOptions(
    options: PluginOptions<IShuffledTextLinkOptions>
  ): PluginOptions<IShuffledTextLinkOptions> {
    // Default duration: 0.5s
    const mergedOptions = this.mergeOptions({ duration: this.duration, steps: this.steps }, options);
    return mergedOptions;
  }

  init(): void {
    this.setupPlugin();
  }

  private setupPlugin(): void {
    this.container.setAttribute('data-candlelight-shuffled-text-link', 'true');
    this.originalText = this.container.textContent || "";
    this.splitSvc = new SplitTextService(this.container, { mode: 'chars', charClass: 'st-char' });

    // If the container uses flex layout (flex or inline-flex) and no gap is defined, apply a small gap
    try {
      const cs = window.getComputedStyle(this.container);
      if (cs && typeof cs.display === 'string' && cs.display.indexOf('flex') !== -1) {
        // Only set gap if not already set inline
        if (!this.container.style.gap) {
          this.container.style.gap = '0.25em';
        }
      }
    } catch (e) {
      // Ignore any errors accessing computed style
    }

    // Use MouseEventsService for hover events
    this.mouseEventsService = new MouseEventsService(this.container, [
      { event: EMouseEvent.Enter, handler: this.handleHover },
      { event: EMouseEvent.Leave, handler: this.handleMouseLeave }
    ]);
    this.mouseEventsService.init();
  }

  private handleHover = (event: Event): void => {
    console.log('hovered!!!');
    console.log('isAnimating:', this.isAnimating);
    console.log('splitSvc:', this.splitSvc);
    if (this.isAnimating || !this.splitSvc) return;
    this.isAnimating = true;

    const chars = Array.from(this.container.querySelectorAll('.st-char')) as HTMLElement[];
    this.originalChars = chars.map(c => c.textContent || "");

    const duration = this.options.duration ?? this.duration;
    const frameDelay = duration * 1000 / this.steps;
    let frame = 0;

    // Build groups of character indices grouped by .st-word
    const wordEls = Array.from(this.container.querySelectorAll('.st-word')) as HTMLElement[];
    const groups: number[][] = [];
    if (wordEls.length > 0) {
      wordEls.forEach(word => {
        const wordChars = Array.from(word.querySelectorAll('.st-char')) as HTMLElement[];
        const indices = wordChars
          .map(c => chars.indexOf(c))
          .filter(i => i >= 0);
        if (indices.length) groups.push(indices);
      });
    }
    // Fallback to single group containing all characters
    if (groups.length === 0) {
      groups.push(chars.map((_, i) => i));
    }

    const shuffle = () => {
      if (!this.isAnimating) return; // Stop if mouseleave

      // Start from originalChars each frame so shuffling per frame is consistent
      const shuffled = [...this.originalChars];

      // Shuffle values within each group only
      groups.forEach(indices => {
        // Extract values for this group
        const values = indices.map(idx => shuffled[idx]);
        // Fisher-Yates on the values array
        for (let i = values.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [values[i], values[j]] = [values[j], values[i]];
        }
        // Write back shuffled values into the appropriate global indices
        indices.forEach((globalIdx, k) => {
          shuffled[globalIdx] = values[k];
        });
      });

      // Apply to DOM
      for (let i = 0; i < chars.length; i++) {
        chars[i].textContent = shuffled[i];
      }

      frame++;
      if (frame < this.steps) {
        this.shuffleTimeout = window.setTimeout(shuffle, frameDelay);
      } else {
        // restore original
        for (let i = 0; i < chars.length; i++) {
          chars[i].textContent = this.originalChars[i];
        }
        this.isAnimating = false;
        this.shuffleTimeout = null;
      }
    };
    shuffle();
  };

  private handleMouseLeave = (): void => {
    if (!this.isAnimating) return;
    this.isAnimating = false;
    if (this.shuffleTimeout !== null) {
      clearTimeout(this.shuffleTimeout);
      this.shuffleTimeout = null;
    }
    // Restore original text using originalChars
    const chars = Array.from(this.container.querySelectorAll('.st-char')) as HTMLElement[];
    for (let i = 0; i < chars.length; i++) {
      chars[i].textContent = this.originalChars[i];
    }
  };

  destroy(): void {
    if (this.mouseEventsService) {
      this.mouseEventsService.destroy();
      this.mouseEventsService = undefined;
    }
    this.container.removeAttribute('data-candlelight-shuffled-text-link');
    if (this.splitSvc) {
      this.splitSvc.destroy();
      this.splitSvc = undefined;
    }
    if (this.shuffleTimeout !== null) {
      clearTimeout(this.shuffleTimeout);
      this.shuffleTimeout = null;
    }
    this.container.textContent = this.originalText;
    this.isAnimating = false;
    console.log('ShuffledTextLink destroyed');
  }
}

export default ShuffledTextLink;
