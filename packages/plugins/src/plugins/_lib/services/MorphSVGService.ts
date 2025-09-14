export interface MorphSVGOptions {
  paths: string[]; // Array of SVG path strings to morph between
  duration?: number; // Duration in milliseconds for complete morph cycle
  loop?: boolean; // Whether to loop the animation
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

export default class MorphSVGService {
  private pathEl?: SVGPathElement;
  private paths: string[] = [];
  private currentProgress = 0; // 0-1 representing position in morph sequence
  private options: Required<MorphSVGOptions>;

  constructor(pathElement: SVGPathElement, options: MorphSVGOptions) {
    this.pathEl = pathElement;
    this.paths = options.paths || [];
    
    this.options = {
      duration: 2000,
      loop: true,
      easing: 'ease-in-out',
      ...options
    };

    if (this.paths.length < 2) {
      throw new Error('MorphSVGService requires at least 2 paths to morph between');
    }
  }

  /**
   * Set the morph progress (0-1)
   * 0 = first path, 1 = last path, with interpolation between
   */
  setProgress(progress: number): void {
    this.currentProgress = Math.max(0, Math.min(1, progress));
    this.updatePath();
  }

  /**
   * Get current progress (0-1)
   */
  getProgress(): number {
    return this.currentProgress;
  }

  /**
   * Interpolate between paths based on current progress
   */
  private updatePath(): void {
    if (!this.pathEl || this.paths.length < 2) return;

    const morphedPath = this.interpolatePaths(this.currentProgress);
    this.pathEl.setAttribute('d', morphedPath);
  }

  /**
   * Interpolate between multiple paths based on progress (0-1)
   */
  private interpolatePaths(progress: number): string {
    const numPaths = this.paths.length;
    
    if (progress <= 0) return this.paths[0];
    if (progress >= 1) return this.paths[numPaths - 1];

    // Calculate which two paths to interpolate between
    const scaledProgress = progress * (numPaths - 1);
    const fromIndex = Math.floor(scaledProgress);
    const toIndex = Math.min(fromIndex + 1, numPaths - 1);
    const localProgress = scaledProgress - fromIndex;

    // Apply easing to local progress
    const easedProgress = this.applyEasing(localProgress);

    return this.interpolateTwoPaths(
      this.paths[fromIndex],
      this.paths[toIndex],
      easedProgress
    );
  }

  /**
   * Interpolate between two specific paths
   */
  private interpolateTwoPaths(pathA: string, pathB: string, t: number): string {
    // Parse both paths into command arrays
    const commandsA = this.parsePath(pathA);
    const commandsB = this.parsePath(pathB);

    // Normalize paths to have same number of commands
    const [normalizedA, normalizedB] = this.normalizePaths(commandsA, commandsB);

    // Interpolate between normalized paths
    const interpolatedCommands = normalizedA.map((cmdA, index) => {
      const cmdB = normalizedB[index];
      return this.interpolateCommand(cmdA, cmdB, t);
    });

    // Convert back to path string
    return this.commandsToPath(interpolatedCommands);
  }

  /**
   * Parse SVG path string into array of commands
   */
  private parsePath(pathString: string): Array<{type: string, coords: number[]}> {
    const commands: Array<{type: string, coords: number[]}> = [];
    const regex = /([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g;
    let match;

    while ((match = regex.exec(pathString)) !== null) {
      const type = match[1];
      const coordsStr = match[2].trim();
      const coords = coordsStr ? coordsStr.split(/[\s,]+/).map(Number).filter(n => !isNaN(n)) : [];
      
      commands.push({ type, coords });
    }

    return commands;
  }

  /**
   * Normalize two path command arrays to have same structure for interpolation
   */
  private normalizePaths(pathA: Array<{type: string, coords: number[]}>, pathB: Array<{type: string, coords: number[]}>): [Array<{type: string, coords: number[]}>, Array<{type: string, coords: number[]}>] {
    // Simple normalization - ensure both paths have same number of commands
    // More advanced normalization would convert all commands to cubic bezier curves
    const maxLength = Math.max(pathA.length, pathB.length);
    
    const normalizedA = [...pathA];
    const normalizedB = [...pathB];

    // Pad shorter path by repeating last command
    while (normalizedA.length < maxLength) {
      const lastCmd = normalizedA[normalizedA.length - 1];
      normalizedA.push({ ...lastCmd });
    }

    while (normalizedB.length < maxLength) {
      const lastCmd = normalizedB[normalizedB.length - 1];
      normalizedB.push({ ...lastCmd });
    }

    // Ensure matching coordinate array lengths
    for (let i = 0; i < maxLength; i++) {
      const cmdA = normalizedA[i];
      const cmdB = normalizedB[i];
      const maxCoords = Math.max(cmdA.coords.length, cmdB.coords.length);

      // Pad coordinate arrays
      while (cmdA.coords.length < maxCoords) {
        cmdA.coords.push(cmdA.coords[cmdA.coords.length - 1] || 0);
      }
      while (cmdB.coords.length < maxCoords) {
        cmdB.coords.push(cmdB.coords[cmdB.coords.length - 1] || 0);
      }
    }

    return [normalizedA, normalizedB];
  }

  /**
   * Interpolate between two commands
   */
  private interpolateCommand(cmdA: {type: string, coords: number[]}, cmdB: {type: string, coords: number[]}, t: number): {type: string, coords: number[]} {
    // Use the command type from the first path
    const type = cmdA.type;
    
    // Interpolate coordinates
    const coords = cmdA.coords.map((coordA, index) => {
      const coordB = cmdB.coords[index] || coordA;
      return coordA + (coordB - coordA) * t;
    });

    return { type, coords };
  }

  /**
   * Convert command array back to SVG path string
   */
  private commandsToPath(commands: Array<{type: string, coords: number[]}>): string {
    return commands.map(cmd => {
      const coordsStr = cmd.coords.map(n => n.toFixed(3)).join(' ');
      return `${cmd.type}${coordsStr}`;
    }).join('');
  }

  /**
   * Apply easing function to progress value
   */
  private applyEasing(t: number): number {
    switch (this.options.easing) {
      case 'linear':
        return t;
      case 'ease-in':
        return t * t;
      case 'ease-out':
        return 1 - (1 - t) * (1 - t);
      case 'ease-in-out':
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      default:
        return t;
    }
  }

  /**
   * Add a new path to the morph sequence
   */
  addPath(pathString: string): void {
    this.paths.push(pathString);
  }

  /**
   * Remove a path from the morph sequence
   */
  removePath(index: number): void {
    if (index >= 0 && index < this.paths.length && this.paths.length > 2) {
      this.paths.splice(index, 1);
    }
  }

  /**
   * Update the paths array
   */
  setPaths(paths: string[]): void {
    if (paths.length < 2) {
      throw new Error('MorphSVGService requires at least 2 paths');
    }
    this.paths = paths;
    this.updatePath();
  }

  /**
   * Get current paths array
   */
  getPaths(): string[] {
    return [...this.paths];
  }
}
