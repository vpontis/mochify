/**
 * Template literal tag that removes common leading whitespace from each line.
 * Useful for multiline strings with indentation in code that you want to output without the indentation.
 *
 * @example
 * const text = dedent`
 *   Hello world
 *   This is indented
 *     But this line has extra indent
 * `;
 * // Result: "Hello world\nThis is indented\n  But this line has extra indent"
 */
export const dedent = (
  strings: TemplateStringsArray,
  ...values: any[]
): string => {
  // Use String.raw to get the raw template string
  const str = String.raw({ raw: strings }, ...values);

  // Split into lines and remove leading/trailing empty lines
  const lines = str.split("\n");
  while (lines.length > 0 && lines[0]?.trim() === "") {
    lines.shift();
  }
  while (lines.length > 0 && lines[lines.length - 1]?.trim() === "") {
    lines.pop();
  }

  if (lines.length === 0) {
    return "";
  }
  if (lines.length === 1) {
    return lines[0]?.trim() ?? "";
  }

  // Find minimum indentation from non-empty lines
  const nonEmptyLines = lines.filter((line) => line.trim() !== "");
  if (nonEmptyLines.length === 0) {
    return "";
  }

  const indents = nonEmptyLines.map((line) => {
    const match = line.match(/^(\s*)/);
    return match?.[1]?.length ?? 0;
  });
  const minIndent = Math.min(...indents);

  // Remove common indentation from all lines
  return lines
    .map((line) => {
      const isEmpty = line.trim() === "";
      return isEmpty ? "" : line.slice(minIndent);
    })
    .join("\n");
};

/**
 * Wrapper around the dedent template tag to work with regular strings.
 */
export const dedentString = (str: string): string => {
  return dedent`${str}`;
};
