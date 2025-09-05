import { has } from "lodash";
import PluginService from "./PluginService";

export enum EPointerEvent {
  Enter = "PointerEnter",
  Leave = "PointerLeave",
  Out = "PointerOut",
  Over = "PointerOver",
  Move = "PointerMove",
  Down = "PointerDown",
  Up = "PointerUp",
  Cancel = "PointerCancel",
  GotCapture = "GotPointerCapture",
  LostCapture = "LostPointerCapture",
}

interface IPointerEventOption {
  event: EPointerEvent;
  handler?: (event: PointerEvent) => void;
}

type TPointerEventHandler = (event: PointerEvent) => void;

interface IPointerEventOption {
  event: EPointerEvent;
  handler?: TPointerEventHandler;
}

// Combine the interfaces using a union type to allow only one of the keys
class PointerEventsService extends PluginService {
  private _prevClientX = 0; // Previous pointer X position
  private _prevClientY = 0; // Previous pointer Y position
  private _prevTime = Date.now(); // Timestamp of the last pointer move
  private _pointerSpeed = 0; // Pointer speed in pixels per second

  clientX = 0;
  clientY = 0;
  pointerId = -1;
  pointerType = "";
  pressure = 0;
  tangentialPressure = 0;
  tiltX = 0;
  tiltY = 0;
  twist = 0;
  width = 0;
  height = 0;

  isHovering = false;
  isPointerMoving = false;
  isPointerDown = false;

  private _element: Window | HTMLElement;
  private _options?: IPointerEventOption[];
  private _pointerMoveTimeOut?: number; // Timeout ID for debouncing
  private _debounceDelay = 300; // Delay in milliseconds
  private _eventListeners: Array<{
    event: string;
    listener: EventListenerOrEventListenerObject;
  }> = [];

  private _maxSpeed = 1000; // This value might need adjustment
  private _isListening: boolean = false;

  constructor(element: Window | HTMLElement, options?: IPointerEventOption[]) {
    super();
    this._element = element;
    this._options = options;

    // Bind event handlers to ensure 'this' context is preserved when called as event listeners
    this.onPointerEnter = this.onPointerEnter.bind(this);
    this.onPointerLeave = this.onPointerLeave.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerOut = this.onPointerOut.bind(this);
    this.onPointerOver = this.onPointerOver.bind(this);
    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    this.onPointerCancel = this.onPointerCancel.bind(this);
    this.onGotPointerCapture = this.onGotPointerCapture.bind(this);
    this.onLostPointerCapture = this.onLostPointerCapture.bind(this);
  }

  private addEventListeners(options: IPointerEventOption[]): void {
    options.forEach(({ event, handler }) => {
      const listener = (e: PointerEvent) => this[`on${event}`](e, handler);
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

  getAvailableEvents(): EPointerEvent[] {
    return Object.values(EPointerEvent);
  }

  onPointerEnter(event: PointerEvent, callback?: TPointerEventHandler): void {
    if (!this.isHovering) this.isHovering = true;
    this.updatePointerProperties(event);
    callback?.(event);
  }

  onPointerLeave(event: PointerEvent, callback?: TPointerEventHandler): void {
    if (this.isHovering) this.isHovering = false;
    this.updatePointerProperties(event);
    callback?.(event);
  }

  onPointerMove(event: PointerEvent, callback?: TPointerEventHandler): void {
    if (!this.isHovering) this.isHovering = true;
    this.updatePointerProperties(event);
    this.calculatePointerSpeed(event.clientX, event.clientY);
    this.isPointerMoving = true;
    clearTimeout(this._pointerMoveTimeOut); // Clear existing timer
    this._pointerMoveTimeOut = window.setTimeout(() => {
      this.isPointerMoving = false; // Set to false after a period of inactivity
    }, this._debounceDelay);
    callback?.(event);
  }

  onPointerOut(event: PointerEvent, callback?: TPointerEventHandler): void {
    if (this.isHovering) this.isHovering = false;
    this.updatePointerProperties(event);
    callback?.(event);
  }

  onPointerOver(event: PointerEvent, callback?: TPointerEventHandler): void {
    if (!this.isHovering) this.isHovering = true;
    this.updatePointerProperties(event);
    callback?.(event);
  }

  onPointerDown(event: PointerEvent, callback?: TPointerEventHandler): void {
    this.isPointerDown = true;
    this.updatePointerProperties(event);
    callback?.(event);
  }

  onPointerUp(event: PointerEvent, callback?: TPointerEventHandler): void {
    this.isPointerDown = false;
    this.updatePointerProperties(event);
    callback?.(event);
  }

  onPointerCancel(event: PointerEvent, callback?: TPointerEventHandler): void {
    this.isPointerDown = false;
    this.updatePointerProperties(event);
    callback?.(event);
  }

  onGotPointerCapture(event: PointerEvent, callback?: TPointerEventHandler): void {
    this.updatePointerProperties(event);
    callback?.(event);
  }

  onLostPointerCapture(event: PointerEvent, callback?: TPointerEventHandler): void {
    this.updatePointerProperties(event);
    callback?.(event);
  }

  private updatePointerProperties(event: PointerEvent): void {
    this.clientX = event.clientX;
    this.clientY = event.clientY;
    this.pointerId = event.pointerId;
    this.pointerType = event.pointerType;
    this.pressure = event.pressure;
    this.tangentialPressure = event.tangentialPressure;
    this.tiltX = event.tiltX;
    this.tiltY = event.tiltY;
    this.twist = event.twist;
    this.width = event.width;
    this.height = event.height;
  }
  
  private calculatePointerSpeed(currentX: number, currentY: number): void {
    const currentTime = Date.now();
    const timeElapsed = (currentTime - this._prevTime) / 1000; // Time in seconds
    const distance = Math.sqrt(
      (currentX - this._prevClientX) ** 2 + (currentY - this._prevClientY) ** 2
    );

    // Calculate speed in pixels per second
    let speed = timeElapsed > 0 ? distance / timeElapsed : 0;

    // Normalize the speed to a value between 0 and 1
    this._pointerSpeed = Math.min(speed / this._maxSpeed, 1);

    // Update previous position and time for the next calculation
    this._prevClientX = currentX;
    this._prevClientY = currentY;
    this._prevTime = currentTime;
  }

  getPointerSpeed(): number {
    return this._pointerSpeed;
  }

  getPointerType(): string {
    return this.pointerType;
  }

  getPointerId(): number {
    return this.pointerId;
  }

  getPressure(): number {
    return this.pressure;
  }

  getTiltX(): number {
    return this.tiltX;
  }

  getTiltY(): number {
    return this.tiltY;
  }

  getTwist(): number {
    return this.twist;
  }

  getPointerSize(): { width: number; height: number } {
    return { width: this.width, height: this.height };
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

export default PointerEventsService;
