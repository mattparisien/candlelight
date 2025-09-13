export type ProgressCallback = (progress: number) => void;


export default class ScrollProgressService {
    private onUpdate: ProgressCallback;
    private ticking = false;
    private startPx = 0;
    private endPx = 0;
    private rafBound = this.onScroll.bind(this);


    constructor(onUpdate: ProgressCallback) {
        this.onUpdate = onUpdate;
    }


    setRange(startPx: number, endPx: number) {
        this.startPx = startPx;
        this.endPx = endPx;
    }


    attach() {
        window.addEventListener("scroll", this.rafBound, { passive: true });
        this.onScroll();
    }


    detach() {
        window.removeEventListener("scroll", this.rafBound);
    }


    private onScroll() {
        if (!this.ticking) {
            this.ticking = true;
            requestAnimationFrame(() => {
                const y = window.scrollY || window.pageYOffset;
                const raw = (y - this.startPx) / Math.max(1, this.endPx - this.startPx);
                const progress = Math.max(0, Math.min(1, raw));
                this.onUpdate(progress);
                this.ticking = false;
            });
        }
    }
}