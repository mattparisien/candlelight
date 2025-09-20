type ResizeCallback = () => void;

class WindowResizeService {
  private static listeners: Set<ResizeCallback> = new Set();
  private static initialized = false;
  private static debounceMs = 120;
  private static _dt?: ReturnType<typeof setTimeout>;

  static subscribe(cb: ResizeCallback, debounce: number = WindowResizeService.debounceMs) {
    WindowResizeService.listeners.add(cb);
    if (!WindowResizeService.initialized) {
      WindowResizeService.initGlobalListener(debounce);
    }
  }

  static unsubscribe(cb: ResizeCallback) {
    WindowResizeService.listeners.delete(cb);
    // Optionally, remove global listener if no listeners remain
    // (not strictly necessary for most apps)
  }

  private static initGlobalListener(debounce: number) {
    if (WindowResizeService.initialized) return;
    WindowResizeService.initialized = true;
    window.addEventListener('resize', () => {
      if (WindowResizeService._dt) clearTimeout(WindowResizeService._dt);
      WindowResizeService._dt = setTimeout(() => {
        WindowResizeService.listeners.forEach(cb => cb());
      }, debounce);
    }, { passive: true });
  }
}

export default WindowResizeService;
