import MouseEventsService from "../_lib/services/MouseEventsService";
import MagneticService from "../_lib/services/MagneticService";
import { EMouseEvent } from "../_lib/services/MouseEventsService";
import { PluginOptions } from "../_lib/ts/types";
import PluginBase from "../_PluginBase/model";

interface IMagneticButtonOptions {
  strength: number; 
}

// Constants for strength validation
const MIN_STRENGTH = 0;
const MAX_STRENGTH = 300;
const DEFAULT_STRENGTH = 100;

class MagneticButton extends PluginBase<IMagneticButtonOptions> {
  private _magneticService: MagneticService;
  private _mouseEventsService: MouseEventsService;

  name: string = "Magnetic Button";

  options: PluginOptions<IMagneticButtonOptions> = {
    strength: DEFAULT_STRENGTH,
  };

  allowedOptions: (keyof IMagneticButtonOptions)[] = ['strength']

  constructor(container: any, options: PluginOptions<IMagneticButtonOptions>) {
    super(container, "Magnetic Button");

    this.options = this.validateOptions(options);
    this._magneticService = new MagneticService();
    this._mouseEventsService = new MouseEventsService(this.container, [
      {
        event: EMouseEvent.Move,
        handler: this.onMouseMove.bind(this),
      },
      {
        event: EMouseEvent.Leave,
        handler: this.onMouseLeave.bind(this),
      },
    ]);
  }

  init(): void {
    // Set the magnetic strength from options
    this._magneticService.setMagneticStrength(this.options.strength);
    this._magneticService.init();
    this._mouseEventsService.init();
  }

  protected validateOptions(
    options: PluginOptions<IMagneticButtonOptions>
  ): PluginOptions<IMagneticButtonOptions> {
    const mergedOptions = this.mergeOptions(options, this.options);
    
    // Validate strength with min/max constraints
    if (mergedOptions.strength !== undefined) {
      if (mergedOptions.strength < MIN_STRENGTH) {
        console.warn(`MagneticButton: strength ${mergedOptions.strength} is below minimum ${MIN_STRENGTH}. Setting to minimum.`);
        mergedOptions.strength = MIN_STRENGTH;
      } else if (mergedOptions.strength > MAX_STRENGTH) {
        console.warn(`MagneticButton: strength ${mergedOptions.strength} is above maximum ${MAX_STRENGTH}. Setting to maximum.`);
        mergedOptions.strength = MAX_STRENGTH;
      }
    }
    
    return mergedOptions;
  }

  onMouseMove(event: MouseEvent): void {
    this._magneticService.applyMagneticEffect(
      this.container,
      this._mouseEventsService.clientX,
      this._mouseEventsService.clientY
    );
  }

  onMouseLeave(event: MouseEvent): void {
    this._magneticService.removeMagneticEffect(this.container);
  }

  /**
   * Update the magnetic strength dynamically
   * @param strength - New strength value (will be clamped to min/max)
   */
  setStrength(strength: number): void {
    // Validate and clamp the new strength value
    const clampedStrength = Math.max(MIN_STRENGTH, Math.min(MAX_STRENGTH, strength));
    
    if (clampedStrength !== strength) {
      console.warn(`MagneticButton: strength ${strength} was clamped to ${clampedStrength} (min: ${MIN_STRENGTH}, max: ${MAX_STRENGTH})`);
    }
    
    this.options.strength = clampedStrength;
    this._magneticService.setMagneticStrength(clampedStrength);
  }
}

export default MagneticButton;
