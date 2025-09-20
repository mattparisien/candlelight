import PluginBase from "../_PluginBase/model";
import { PluginOptions } from "../_lib/ts/types";
import SplitTextService from "../_lib/services/SplitTextService";

interface IShuffledTextLinkOptions {
  duration?: number; // Duration of the shuffle animation in seconds
  steps?: number;    // Number of shuffle steps
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
    this.container.addEventListener('mouseenter', this.handleHover);
    this.container.addEventListener('mouseleave', this.handleMouseLeave);
  }

  private handleHover = (event: Event): void => {
    if (this.isAnimating || !this.splitSvc) return;
    this.isAnimating = true;
    const chars = Array.from(this.container.querySelectorAll('.st-char')) as HTMLElement[];
    const originalChars = chars.map(c => c.textContent || "");
    const duration = this.options.duration ?? this.duration;
  
    const frameDelay = duration * 1000 / this.steps;
    let frame = 0;

    const shuffle = () => {
      if (!this.isAnimating) return; // Stop if mouseleave
      const shuffled = [...originalChars];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      for (let i = 0; i < chars.length; i++) {
        chars[i].textContent = shuffled[i];
      }
      frame++;
      if (frame < this.steps) {
        this.shuffleTimeout = window.setTimeout(shuffle, frameDelay);
      } else {
        for (let i = 0; i < chars.length; i++) {
          chars[i].textContent = originalChars[i];
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
    // Restore original text
    const chars = Array.from(this.container.querySelectorAll('.st-char')) as HTMLElement[];
    const originalChars = this.originalText.split("");
    for (let i = 0; i < chars.length; i++) {
      chars[i].textContent = originalChars[i];
    }
  };

  destroy(): void {
    this.container.removeEventListener('mouseenter', this.handleHover);
    this.container.removeEventListener('mouseleave', this.handleMouseLeave);
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
