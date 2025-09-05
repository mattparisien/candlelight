class ColorUtils {
  // Converts a hex color code to an RGB object.
  static hexToRgb(hex: string): { r: number; g: number; b: number } {
    let r = 0,
      g = 0,
      b = 0;
    // 3 digits
    if (hex.length === 4) {
      r = parseInt(hex[1] + hex[1], 16);
      g = parseInt(hex[2] + hex[2], 16);
      b = parseInt(hex[3] + hex[3], 16);
    }
    // 6 digits
    else if (hex.length === 7) {
      r = parseInt(hex[1] + hex[2], 16);
      g = parseInt(hex[3] + hex[4], 16);
      b = parseInt(hex[5] + hex[6], 16);
    }
    return { r, g, b };
  }

  // Checks if a string is a valid hex color code.
  static isHex(hex: string): boolean {
    // Regular expression to check if it is a valid hex color (3 or 6 digits, with or without '#').
    return /^#?([0-9A-F]{3}){1,2}$/i.test(hex);
  }

  // Checks if a string is a valid RGB color.
  static isRgb(rgb: string): boolean {
    // Regular expression to check if it is a valid RGB color ('rgb(r, g, b)').
    return /^rgb\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})\)$/.test(rgb);
  }

  // Checks if a string is a valid RGBA color.
  static isRgba(rgba: string): boolean {
    // Regular expression to check if it is a valid RGBA color ('rgba(r, g, b, a)').
    return /^rgba\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3}),\s*((0|1|0?\.\d+))\)$/.test(rgba);
  }

  // Checks if a string is a valid color in hex, RGB, or RGBA format.
  static isColor(color: string): boolean {
    // Checks all formats.
    return ColorUtils.isHex(color) || ColorUtils.isRgb(color) || ColorUtils.isRgba(color);
  }
}

export default ColorUtils;
