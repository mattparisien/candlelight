export default class StickyService {
    constructor(private container: HTMLElement, private durationVh: number) {
        this.container = container;
        this.durationVh = durationVh;
        this.applyBaseLayout();
    }


    applyBaseLayout() {
        this.container.classList.add("bsr-container");
        this.container.style.setProperty("--bsr-duration-vh", String(this.durationVh));
    }
}