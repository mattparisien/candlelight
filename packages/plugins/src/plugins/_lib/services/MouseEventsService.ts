import { has } from "lodash";
import PluginService from "./PluginService";

export enum EMouseEvent {
  Enter = "MouseEnter",
  Leave = "MouseLeave",
  Out = "MouseOut",
  Over = "MouseOver",
  Move = "MouseMove",
}

interface IMouseEventOption {
  event: EMouseEvent;
  handler?: (event: MouseEvent) => void;
}

type TMouseEventHandler = (event: MouseEvent) => void;

interface IMouseEventOption {
  event: EMouseEvent;
  handler?: TMouseEventHandler;
}

// Combine the interfaces using a union type to allow only one of the keys
class MouseEventsService extends PluginService {
  private _prevClientX = 0; // Previous mouse X position
  private _prevClientY = 0; // Previous mouse Y position
  private _prevTime = Date.now(); // Timestamp of the last mouse move
  private _mouseSpeed = 0; // Mouse speed in pixels per second

  clientX = 0;
  clientY = 0;

  isHovering = false;
  isMouseMoving = false;

  private _element: Window | HTMLElement;
  private _options?: IMouseEventOption[];
  private _mouseMoveTimeOut?: number; // Timeout ID for debouncing
  private _debounceDelay = 300; // Delay in milliseconds
  private _eventListeners: Array<{
    event: string;
    listener: EventListenerOrEventListenerObject;
  }> = [];

  private _maxSpeed = 1000; // This value might need adjustment
  private _isListening: boolean = false;

  constructor(element: Window | HTMLElement, options?: IMouseEventOption[]) {
    super();
    this._element = element;
    this._options = options;

    // Bind event handlers to ensure 'this' context is preserved when called as event listeners
    this.onMouseEnter = this.onMouseEnter.bind(this);
    this.onMouseLeave = this.onMouseLeave.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseOut = this.onMouseOut.bind(this);
  }

  private addEventListeners(options: IMouseEventOption[]): void {
    options.forEach(({ event, handler }) => {
      const listener = (e: MouseEvent) => this[`on${event}`](e, handler);
      this._element.addEventListener(event.toLowerCase(), listener);
      this._eventListeners.push({ event: event.toLowerCase(), listener });
    });
  }

  private removeEventListeners(): void {
    this._eventListeners.forEach(({ event, listener }) => {
      this._element.removeEventListener(event, listener);
    });
    this._eventListeners = [];
  }

  isListening(): boolean {
    return this._isListening;
  }

  getAvailableEvents(): EMouseEvent[] {
    return Object.values(EMouseEvent);
  }

  onMouseEnter(event: MouseEvent, callback?: TMouseEventHandler): void {
    if (!this.isHovering) this.isHovering = true;
    callback?.(event);
  }

  onMouseLeave(event: MouseEvent, callback?: TMouseEventHandler): void {
    if (this.isHovering) this.isHovering = false;
    callback?.(event);
  }

  onMouseMove(event: MouseEvent, callback?: TMouseEventHandler): void {
    if (!this.isHovering) this.isHovering = true;
    this.clientX = event.clientX;
    this.clientY = event.clientY;
    this.calculateMouseSpeed(event.clientX, event.clientY);
    this.isMouseMoving = true;
    clearTimeout(this._mouseMoveTimeOut); // Clear existing timer
    this._mouseMoveTimeOut = window.setTimeout(() => {
      this.isMouseMoving = false; // Set to false after a period of inactivity
    }, this._debounceDelay);
    callback?.(event);
  }

  onMouseOut(event: MouseEvent, callback?: TMouseEventHandler): void {
    if (this.isHovering) this.isHovering = false;
    callback?.(event);
  }
  
  private calculateMouseSpeed(currentX: number, currentY: number): void {
    const currentTime = Date.now();
    const timeElapsed = (currentTime - this._prevTime) / 1000; // Time in seconds
    const distance = Math.sqrt(
      (currentX - this._prevClientX) ** 2 + (currentY - this._prevClientY) ** 2
    );

    // Calculate speed in pixels per second
    let speed = timeElapsed > 0 ? distance / timeElapsed : 0;

    // Normalize the speed to a value between 0 and 1
    this._mouseSpeed = Math.min(speed / this._maxSpeed, 1);

    // Update previous position and time for the next calculation
    this._prevClientX = currentX;
    this._prevClientY = currentY;
    this._prevTime = currentTime;
  }

  getMouseSpeed(): number {
    return this._mouseSpeed;
  }

  init(): void {
    this.addEventListeners(this._options);
    this._isListening = true;
  }

  // Ensure to call removeEventListeners when the service is no longer needed
  destroy(): void {
    this.removeEventListeners();
    this._isListening = false;
  }
}

export default MouseEventsService;
