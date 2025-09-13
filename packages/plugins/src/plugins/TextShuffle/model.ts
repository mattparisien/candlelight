import gsap from "gsap";
import PluginBase from "../_PluginBase/model";
import { PluginOptions } from "../_lib/ts/types";

interface ITextShuffleOptions {
  // List of heading tags to target within the container (e.g., ["h1", "h2"]).
  // Defaults to all headings h1–h6.
  els?: string | string[];
}

interface ITextShuffle {
  init(): void;
  destroy(): void;
}

class TextShuffle extends PluginBase<ITextShuffleOptions> implements ITextShuffle {
  protected allowedOptions: (keyof ITextShuffleOptions)[] = ["els"];
  private options: PluginOptions<ITextShuffleOptions>;

  // Normalized list of heading selectors to target (e.g., ["h1","h2"]) 
  private _els: string[] = ["h1", "h2", "h3", "h4", "h5", "h6"];

  // Runtime state
  private _targets: HTMLElement[] = [];
  private _originalText = new Map<HTMLElement, string>();
  private _tweens: gsap.core.Tween[] = [];
  private _calls: gsap.core.Tween[] = []; // delayedCall handles

  constructor(container: HTMLElement, options: PluginOptions<ITextShuffleOptions> = {}) {
    super(container, 'TextShuffle');
    this.options = this.validateOptions(options);
  }

  protected validateOptions(options: PluginOptions<ITextShuffleOptions>): PluginOptions<ITextShuffleOptions> {
    // Normalize incoming `els` to an array of valid heading tags (h1–h6)
    const defaultEls = ["h1", "h2", "h3", "h4", "h5", "h6"];
    let normalized = defaultEls.slice();

    const input = options?.els;
    if (Array.isArray(input)) {
      normalized = input;
    } else if (typeof input === "string") {
      normalized = input.split(",").map(s => s.trim()).filter(Boolean);
    }

    normalized = normalized
      .map(s => s.toLowerCase())
      .filter(s => /^h[1-6]$/.test(s));

    if (normalized.length === 0) normalized = defaultEls;

    this._els = normalized;
    this.options = { els: normalized };
    return this.options;
  }

  init(): void {
    // Collect targets within the container based on configured heading selectors
    this._targets = this.collectTargets();
    if (this._targets.length === 0) return;

    // Store originals
    this._targets.forEach(el => {
      this._originalText.set(el, el.textContent ?? "");
    });

    // Run one-time shuffle with a small stagger
    const stagger = 0.06;
    this._targets.forEach((el, i) => {
      const call = gsap.delayedCall(i * stagger, () => {
        const tween = this.shuffleOnce(el, 3);
        this._tweens.push(tween);
      });
      this._calls.push(call);
    });
  }

  private collectTargets(): HTMLElement[] {
    const result: HTMLElement[] = [];
    const selectors = this._els && this._els.length ? this._els : ["h1","h2","h3","h4","h5","h6"];

    selectors.forEach(sel => {
      const nodes = this.container.querySelectorAll(sel);
      nodes.forEach(n => {
        if (n instanceof HTMLElement) {
          result.push(n);
        }
      });
    });

    // De-duplicate while preserving order
    return Array.from(new Set(result));
  }

  private shuffleOnce(el: HTMLElement, duration = 0.8): gsap.core.Tween {
    const original = this._originalText.get(el) ?? el.textContent ?? "";
    const chars = Array.from(original);
    const alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    const state = { p: 0 };

    const render = (progress: number) => {
      const revealCount = Math.floor(progress * chars.length);
      let out = "";
      for (let i = 0; i < chars.length; i++) {
        const ch = chars[i];
        if (i < revealCount || !this.isAlphaNumeric(ch)) {
          out += ch; // reveal original or keep non-alphanumerics
        } else {
          // shuffle
          const rnd = alpha[Math.floor(Math.random() * alpha.length)];
          // match case if letter
          out += this.matchCase(rnd, ch);
        }
      }
      el.textContent = out;
    };

    // Start with a quick scramble, then reveal
    render(0);

    return gsap.to(state, {
      p: 1,
      duration,
      ease: "power2.out",
      onUpdate: () => render(state.p),
      onComplete: () => {
        el.textContent = original;
      },
    });
  }

  private isAlphaNumeric(ch: string): boolean {
    return /[A-Za-z0-9]/.test(ch);
  }

  private matchCase(rnd: string, ref: string): string {
    if (/[a-z]/.test(ref)) return rnd.toLowerCase();
    return rnd.toUpperCase();
  }

  destroy(): void {
    // Kill scheduled calls and tweens
    this._calls.forEach(c => c.kill());
    this._calls = [];

    this._tweens.forEach(t => t.kill());
    this._tweens = [];

    // Restore original text
    this._targets.forEach(el => {
      const original = this._originalText.get(el);
      if (original != null) el.textContent = original;
    });

    this._originalText.clear();
    this._targets = [];
  }
}

export default TextShuffle;
