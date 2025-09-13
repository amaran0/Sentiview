/**
 * A simple Webpack loader that adds a displayName to React components.
 * This is just an example; customize as needed.
 */
module.exports = function(source) {
  // Only process files that look like React components
  if (/export\s+default\s+function\s+([A-Za-z0-9_]+)/.test(source)) {
    const match = source.match(/export\s+default\s+function\s+([A-Za-z0-9_]+)/);
    const componentName = match[1];
    // Add displayName after the function
    return (
      source +
      `\n${componentName}.displayName = "${componentName}";\n`
    );
  }
  return source;
};