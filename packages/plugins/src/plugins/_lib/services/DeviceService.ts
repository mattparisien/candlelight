export enum DeviceType {
  MOBILE = 'mobile',
  TABLET = 'tablet',
  DESKTOP = 'desktop'
}

export enum OperatingSystem {
  IOS = 'ios',
  ANDROID = 'android',
  WINDOWS = 'windows',
  MACOS = 'macos',
  LINUX = 'linux',
  UNKNOWN = 'unknown'
}

export enum Browser {
  CHROME = 'chrome',
  FIREFOX = 'firefox',
  SAFARI = 'safari',
  EDGE = 'edge',
  OPERA = 'opera',
  UNKNOWN = 'unknown'
}

export interface DeviceInfo {
  type: DeviceType;
  os: OperatingSystem;
  browser: Browser;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouchDevice: boolean;
  screenWidth: number;
  screenHeight: number;
  pixelRatio: number;
  userAgent: string;
}

class DeviceService {
  private static instance: DeviceService;
  private deviceInfo: DeviceInfo;

  private constructor() {
    this.deviceInfo = this.detectDevice();
    this.setupEventListeners();
  }

  static getInstance(): DeviceService {
    if (!DeviceService.instance) {
      DeviceService.instance = new DeviceService();
    }
    return DeviceService.instance;
  }

  private detectDevice(): DeviceInfo {
    const userAgent = navigator.userAgent.toLowerCase();
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;
    const pixelRatio = window.devicePixelRatio || 1;

    // Detect device type
    const type = this.detectDeviceType(userAgent, screenWidth);
    
    // Detect operating system
    const os = this.detectOperatingSystem(userAgent);
    
    // Detect browser
    const browser = this.detectBrowser(userAgent);

    // Check for touch support
    const isTouchDevice = 'ontouchstart' in window || 
                         navigator.maxTouchPoints > 0 || 
                         'msMaxTouchPoints' in navigator;

    return {
      type,
      os,
      browser,
      isMobile: type === DeviceType.MOBILE,
      isTablet: type === DeviceType.TABLET,
      isDesktop: type === DeviceType.DESKTOP,
      isTouchDevice,
      screenWidth,
      screenHeight,
      pixelRatio,
      userAgent: navigator.userAgent
    };
  }

  private detectDeviceType(userAgent: string, screenWidth: number): DeviceType {
    // Mobile patterns
    const mobilePatterns = [
      /android.*mobile/,
      /iphone/,
      /ipod/,
      /blackberry/,
      /opera mini/,
      /iemobile/,
      /mobile/
    ];

    // Tablet patterns
    const tabletPatterns = [
      /ipad/,
      /android(?!.*mobile)/,
      /tablet/,
      /kindle/,
      /silk/,
      /playbook/
    ];

    // Check user agent first
    if (mobilePatterns.some(pattern => pattern.test(userAgent))) {
      return DeviceType.MOBILE;
    }
    
    if (tabletPatterns.some(pattern => pattern.test(userAgent))) {
      return DeviceType.TABLET;
    }

    // Fallback to screen width detection
    if (screenWidth < 768) {
      return DeviceType.MOBILE;
    } else if (screenWidth >= 768 && screenWidth < 1024) {
      return DeviceType.TABLET;
    } else {
      return DeviceType.DESKTOP;
    }
  }

  private detectOperatingSystem(userAgent: string): OperatingSystem {
    if (/iphone|ipad|ipod/.test(userAgent)) {
      return OperatingSystem.IOS;
    }
    if (/android/.test(userAgent)) {
      return OperatingSystem.ANDROID;
    }
    if (/windows/.test(userAgent)) {
      return OperatingSystem.WINDOWS;
    }
    if (/macintosh|mac os x/.test(userAgent)) {
      return OperatingSystem.MACOS;
    }
    if (/linux/.test(userAgent)) {
      return OperatingSystem.LINUX;
    }
    return OperatingSystem.UNKNOWN;
  }

  private detectBrowser(userAgent: string): Browser {
    if (/chrome/.test(userAgent) && !/edge|opr/.test(userAgent)) {
      return Browser.CHROME;
    }
    if (/firefox/.test(userAgent)) {
      return Browser.FIREFOX;
    }
    if (/safari/.test(userAgent) && !/chrome/.test(userAgent)) {
      return Browser.SAFARI;
    }
    if (/edge/.test(userAgent)) {
      return Browser.EDGE;
    }
    if (/opr/.test(userAgent)) {
      return Browser.OPERA;
    }
    return Browser.UNKNOWN;
  }

  private setupEventListeners(): void {
    // Listen for orientation changes and window resize
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        this.updateDeviceInfo();
      }, 100); // Small delay to ensure screen dimensions are updated
    });

    window.addEventListener('resize', () => {
      this.updateDeviceInfo();
    });
  }

  private updateDeviceInfo(): void {
    const oldInfo = { ...this.deviceInfo };
    this.deviceInfo = this.detectDevice();
    
    // Dispatch custom event if device type changed
    if (oldInfo.type !== this.deviceInfo.type) {
      window.dispatchEvent(new CustomEvent('devicechange', {
        detail: {
          oldDevice: oldInfo,
          newDevice: this.deviceInfo
        }
      }));
    }
  }

  // Public API methods
  getDeviceInfo(): DeviceInfo {
    return { ...this.deviceInfo };
  }

  getDeviceType(): DeviceType {
    return this.deviceInfo.type;
  }

  getOperatingSystem(): OperatingSystem {
    return this.deviceInfo.os;
  }

  getBrowser(): Browser {
    return this.deviceInfo.browser;
  }

  isMobile(): boolean {
    return this.deviceInfo.isMobile;
  }

  isTablet(): boolean {
    return this.deviceInfo.isTablet;
  }

  isDesktop(): boolean {
    return this.deviceInfo.isDesktop;
  }

  isTouchDevice(): boolean {
    return this.deviceInfo.isTouchDevice;
  }

  isIOS(): boolean {
    return this.deviceInfo.os === OperatingSystem.IOS;
  }

  isAndroid(): boolean {
    return this.deviceInfo.os === OperatingSystem.ANDROID;
  }

  getScreenDimensions(): { width: number; height: number } {
    return {
      width: this.deviceInfo.screenWidth,
      height: this.deviceInfo.screenHeight
    };
  }

  getPixelRatio(): number {
    return this.deviceInfo.pixelRatio;
  }

  // Utility methods
  isRetina(): boolean {
    return this.deviceInfo.pixelRatio > 1;
  }

  supportsHover(): boolean {
    return window.matchMedia('(hover: hover)').matches;
  }

  getViewportWidth(): number {
    return Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
  }

  getViewportHeight(): number {
    return Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
  }

  // Breakpoint helpers
  isMobileBreakpoint(): boolean {
    return this.getViewportWidth() < 768;
  }

  isTabletBreakpoint(): boolean {
    const width = this.getViewportWidth();
    return width >= 768 && width < 1024;
  }

  isDesktopBreakpoint(): boolean {
    return this.getViewportWidth() >= 1024;
  }

  // Event listener helpers
  onDeviceChange(callback: (event: CustomEvent) => void): void {
    window.addEventListener('devicechange', callback as EventListener);
  }

  offDeviceChange(callback: (event: CustomEvent) => void): void {
    window.removeEventListener('devicechange', callback as EventListener);
  }
}

export default DeviceService.getInstance();
