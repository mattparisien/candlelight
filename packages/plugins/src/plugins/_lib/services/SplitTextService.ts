import PluginService from "./PluginService";
import WindowResizeService from "./WindowResizeService";

interface SplitTextOptions {
  mode?: 'lines' | 'words' | 'chars';
  lineClass?: string;
  wordClass?: string;
  charClass?: string;
  debounce?: number;
}

interface Token {
  type: 'word' | 'space';
  value: string;
}

class SplitTextService extends PluginService {
/**
 * Initializes the SplitTextService by performing an initial split and setting up observers.
 * If already initialized, does nothing.
 */
init(): void {
    if (this._isDestroyed) {
        throw new Error("SplitTextService: Cannot initialize a destroyed instance.");
    }
    // Re-observe in case destroy() was called previously
    if (!this._resizeObserver) {
        this._resizeObserver = new ResizeObserver(this._onResize);
        this._resizeObserver.observe(this.el);
    }
    window.addEventListener('resize', this._onResize, { passive: true });
    this.split();
}
  private el: HTMLElement;
  private options: Required<SplitTextOptions>;
  private _originalText: string;
  private _isDestroyed: boolean;
  private _resizeObserver: ResizeObserver;
  private _onResize: () => void;
  private _dt?: ReturnType<typeof setTimeout>;

  /**
   * @param {HTMLElement} el - The element whose text you want to split
   * @param {SplitTextOptions} options
   */
  constructor(el: HTMLElement, {
    mode = 'lines',
    lineClass = 'st-line',
    wordClass = 'st-word',
    charClass = 'st-char',
    debounce = 120,
  }: SplitTextOptions = {}) {
    super();
    if (!el) throw new Error('SplitTextService: element is required');
    this.el = el;
    this.options = { mode, lineClass, wordClass, charClass, debounce };
    this._originalText = (el.textContent || '').replace(/\s+/g, ' ').trim();
    this._isDestroyed = false;

    // Bindings
    this._onResize = this._debounce(() => this.split(), debounce);

    // Observe element size changes (handles font loads, container changes)
    this._resizeObserver = new ResizeObserver(this._onResize);
    this._resizeObserver.observe(this.el);

    // Use WindowResizeService for window resize events
    WindowResizeService.subscribe(this._onResize, debounce);

    // Initial split
    this.split();
  }

  setMode(mode: 'lines' | 'words' | 'chars') {
    this.options.mode = mode;
    this.split();
  }

  destroy() {
    if (this._isDestroyed) return;
    this._isDestroyed = true;
    this._resizeObserver.disconnect();
    WindowResizeService.unsubscribe(this._onResize);
    this.el.textContent = this._originalText; // restore
  }

  split() {
    if (this._isDestroyed) return;
    // Start fresh from the original, to guarantee correct reflow-based line calc
    this.el.textContent = this._originalText;

    // Step 1: word-wrap (and keep spaces as text nodes between words)
    const tokens = this._tokenizeWords(this._originalText);
    this.el.innerHTML = ''; // clear
    const wordSpans: HTMLSpanElement[] = [];

    for (const t of tokens) {
      if (t.type === 'word') {
        const w = document.createElement('span');
        w.className = this.options.wordClass;
        w.textContent = t.value;
        // inline-block helps more stable line calculations
        w.style.display = 'inline';
        this.el.appendChild(w);
        wordSpans.push(w);
      } else {
        // preserve the exact spaces/newlines as a single text node
        this.el.appendChild(document.createTextNode(t.value));
      }
    }

    if (this.options.mode === 'words') return; // done

    if (this.options.mode === 'chars') {
      this._splitChars(wordSpans);
      return;
    }

    if (this.options.mode === 'lines') {
      this._groupLines(wordSpans);
      return;
    }
  }

  // --- helpers ---

  private _tokenizeWords(text: string): Token[] {
    // Returns [{type:'word'|'space', value:string}, ...]
    // Keep every non-space run as a word, and spaces/newlines as space tokens.
    const out: Token[] = [];
    const re = /\S+|\s+/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      const v = m[0];
      if (/\S/.test(v)) out.push({ type: 'word', value: v });
      else out.push({ type: 'space', value: v });
    }
    return out;
  }

  private _splitChars(wordSpans: HTMLSpanElement[]) {
    for (const w of wordSpans) {
      const text = w.textContent || '';
      w.textContent = '';
      for (let i = 0; i < text.length; i++) {
        const ch = text.charAt(i);
        const c = document.createElement('span');
        c.className = this.options.charClass;
        c.textContent = ch;
        // keep inline-block for more predictable layout/animation hooks
        c.style.display = 'inline';
        w.appendChild(c);
      }
    }
  }

  private _groupLines(wordSpans: HTMLSpanElement[]) {
    if (wordSpans.length === 0) return;

    // Measure each word's top to detect line breaks
    const tops = wordSpans.map(w => w.getBoundingClientRect().top);
    const groups: number[][] = [];
    let current: number[] = [0];

    for (let i = 1; i < tops.length; i++) {
      // If the top Y changed (allow tiny sub-pixel noise), it's a new line
      if (Math.abs(tops[i] - tops[i - 1]) > 0.5) {
        groups.push(current);
        current = [i];
      } else {
        current.push(i);
      }
    }
    groups.push(current);

    // Rebuild DOM: wrap each line (contiguously) with a line span.
    // The element children are [wordSpan, (space text), wordSpan, ...].
    // We'll walk through, moving nodes into line wrappers until the last wordSpan for that line.
    const host = this.el;
    const allChildren = Array.from(host.childNodes);
    let cursor = 0;

    const frag = document.createDocumentFragment();

    for (const idxs of groups) {
      const lineWrap = document.createElement('span');
      lineWrap.className = this.options.lineClass;
      lineWrap.style.display = 'block'; // each line on its own row

      // We need to move all nodes up to & including the last word span for this line.
      const lastWord = wordSpans[idxs[idxs.length - 1]];
      // Find lastWord's position in allChildren (from current cursor forward)
      let lastPos = cursor;
      for (let p = cursor; p < allChildren.length; p++) {
        if (allChildren[p] === lastWord) { lastPos = p; break; }
      }

      // Move nodes [cursor .. lastPos] into the line wrapper
      for (let p = cursor; p <= lastPos; p++) {
        lineWrap.appendChild(allChildren[p]);
      }
      frag.appendChild(lineWrap);
      cursor = lastPos + 1;
    }

    // Append any trailing nodes (e.g., trailing spaces)
    while (cursor < allChildren.length) {
      frag.appendChild(allChildren[cursor++]);
    }

    host.innerHTML = '';
    host.appendChild(frag);
  }

  private _debounce<T extends (...args: any[]) => void>(fn: T, wait = 120): (...args: Parameters<T>) => void {
    let t: number | null = null;
    return (...args: Parameters<T>) => {
      if (t) cancelAnimationFrame(t);
      t = requestAnimationFrame(() => {
        if (this._dt) clearTimeout(this._dt);
        this._dt = setTimeout(() => fn.apply(this, args), wait);
      });
    };
  }
}

export default SplitTextService;