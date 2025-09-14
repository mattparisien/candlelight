export interface ClipPathOptions {
  svgPath?: string;
  center?: { x: number; y: number };
  morphPaths?: string[];
}

export default class ClipPathService {
  private usesSvg = false;
  private svg?: SVGSVGElement;
  private pathEl?: SVGPathElement;
  private topSection!: HTMLElement;
  private opt: Required<Pick<ClipPathOptions, "center">> & ClipPathOptions;
  private _clipPathId = `bsr-clippath-${Math.random().toString(36).slice(2)}`;
  private morphPaths: string[] = [];

  constructor(topSection: HTMLElement, options: ClipPathOptions) {
    this.topSection = topSection;
    this.opt = {
      center: options.center || { x: 50, y: 50 },
      ...options,
    };
    this.morphPaths = options.morphPaths || [];
  }

  mount() {
    if (this.opt.svgPath) {
      this.usesSvg = true;
      const svgNS = "http://www.w3.org/2000/svg";
      this.svg = document.createElementNS(svgNS, "svg");
      this.svg.setAttribute("class", "bsr-svg-clippath");
      this.svg.setAttribute("aria-hidden", "true");
      this.svg.setAttribute("width", "0");
      this.svg.setAttribute("height", "0");
      this.svg.setAttribute("viewBox", "0 0 200 200");

      const defs = document.createElementNS(svgNS, "defs");
      const clipPath = document.createElementNS(svgNS, "clipPath");
      clipPath.setAttribute("id", this._clipPathId);
      // Use userSpaceOnUse to work in pixel space
      clipPath.setAttribute("clipPathUnits", "userSpaceOnUse");

      this.pathEl = document.createElementNS(svgNS, "path");
      // Use the original path, but we'll transform it in the update method
      this.pathEl.setAttribute("d", this.opt.svgPath);
      this.pathEl.setAttribute("transform-origin", "0 0");

      clipPath.appendChild(this.pathEl);
      defs.appendChild(clipPath);
      this.svg.appendChild(defs);

      document.body.appendChild(this.svg);

      // Apply clip-path to top section
      this.topSection.style.clipPath = `url(#${this._clipPathId})`;
      this.topSection.classList.add("bsr-top--use-svg-clippath");
    } else {
      this.topSection.classList.add("bsr-top--use-radial-clippath");
      this.topSection.style.setProperty("--bsr-center-x", this.opt.center.x + "%");
      this.topSection.style.setProperty("--bsr-center-y", this.opt.center.y + "%");
    }
  }



  update(progress: number, radiusPx: number, scale: number) {
    if (this.usesSvg && this.pathEl) {
      // Handle morphing between paths if available
      if (this.morphPaths.length > 1) {
        const morphedPath = this.interpolatePaths(progress);
        this.pathEl.setAttribute("d", morphedPath);
      }

      // Position the blob at center of viewport and scale from its own center
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      
      // Convert scale (0-20) to reasonable pixel scale for the blob
      // At scale 0, blob is invisible; at scale 20, blob covers viewport
      const pixelScale = scale * 2; // Scale 0-40 range
      
      // Proper transform: translate to viewport center, scale from blob center (0,0), then offset back
      this.pathEl.setAttribute(
        "transform",
        `translate(${centerX} ${centerY}) scale(${pixelScale})`
      );
    } else {
      // Use CSS circle() for radial clip-path
      const radius = Math.min(radiusPx, 2000); // Cap radius for performance
      this.topSection.style.clipPath = `circle(${radius}px at ${this.opt.center.x}% ${this.opt.center.y}%)`;
    }
  }

  unmount() {
    if (this.svg && this.svg.parentNode) {
      this.svg.parentNode.removeChild(this.svg);
    }
    this.topSection.style.clipPath = '';
    this.topSection.classList.remove("bsr-top--use-svg-clippath", "bsr-top--use-radial-clippath");
  }

  private interpolatePaths(progress: number): string {
    if (this.morphPaths.length < 2) {
      return this.morphPaths[0] || "";
    }

    const numPaths = this.morphPaths.length;
    
    // Calculate morph completion percentage based on number of paths
    // For 2 paths: complete by 20%, for 3 paths: complete by 30%, etc.
    const morphCompletionPercentage = (numPaths - 1) * 0.025 + 0.025; // 0.2 for 2 paths, 0.3 for 3 paths, etc.
    
    // Scale progress so morphing completes by the calculated percentage
    const morphProgress = Math.min(progress / morphCompletionPercentage, 1.0);
    
    if (morphProgress <= 0) return this.morphPaths[0];
    if (morphProgress >= 1) return this.morphPaths[numPaths - 1];

    // Calculate which two paths to interpolate between
    const scaledProgress = morphProgress * (numPaths - 1);
    const fromIndex = Math.floor(scaledProgress);
    const toIndex = Math.min(fromIndex + 1, numPaths - 1);
    const localProgress = scaledProgress - fromIndex;
    
    console.log('Interpolating paths:', { 
      originalProgress: progress, 
      morphProgress, 
      morphCompletionPercentage, 
      scaledProgress, 
      fromIndex, 
      toIndex, 
      localProgress, 
      numPaths 
    });

    return this.interpolateTwoPaths(
      this.morphPaths[fromIndex],
      this.morphPaths[toIndex],
      localProgress
    );
  }

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

  private normalizePaths(pathA: Array<{type: string, coords: number[]}>, pathB: Array<{type: string, coords: number[]}>): [Array<{type: string, coords: number[]}>, Array<{type: string, coords: number[]}>] {
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

  private interpolateCommand(cmdA: {type: string, coords: number[]}, cmdB: {type: string, coords: number[]}, t: number): {type: string, coords: number[]} {
    const type = cmdA.type;
    
    const coords = cmdA.coords.map((coordA, index) => {
      const coordB = cmdB.coords[index] || coordA;
      return coordA + (coordB - coordA) * t;
    });

    return { type, coords };
  }

  private commandsToPath(commands: Array<{type: string, coords: number[]}>): string {
    return commands.map(cmd => {
      const coordsStr = cmd.coords.map(n => n.toFixed(3)).join(' ');
      return `${cmd.type}${coordsStr}`;
    }).join('');
  }
}
