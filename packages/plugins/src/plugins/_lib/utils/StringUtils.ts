class StringUtils {
  static toPascalCase(str: string): string {
    return str
      .match(/[a-zA-Z0-9]+/g)
      .map(
        (word) => word.charAt(0).toUpperCase() + word.substr(1).toLowerCase()
      )
      .join("");
  }
}

export default StringUtils;
