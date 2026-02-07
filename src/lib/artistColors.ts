// Function to generate a color based on artist UUID
export const getArtistColor = (uuid: string) => {
  // Generate a consistent hash from the UUID
  const hash = Array.from(uuid).reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);

  // Use HSL color model for more systematic and beautiful variations
  // Hue: 0-360 (full color spectrum)
  // Saturation: 60-80% (more vibrant than before)
  // Lightness: 55-75% (slightly darker for more vibrant appearance)
  const hue = Math.abs(hash) % 360;
  const saturation = 60 + (Math.abs(hash >> 8) % 20); // Increased from 40-60% to 60-80%
  const lightness = 55 + (Math.abs(hash >> 16) % 20); // Adjusted from 65-85% to 55-75%

  // Return the color in HSL format
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

// Function to generate a gradient based on artist UUID
export const getArtistGradient = (uuid: string) => {
  // Generate a base color using HSL for better control
  const baseColor = getArtistColor(uuid);

  // Create a second hash for the complementary color
  const secondHash = Array.from(uuid).reduce(
    (acc, char, i) => char.charCodeAt(0) + ((acc << ((i % 5) + 3)) - acc),
    0
  );

  // Generate complementary colors using color theory
  // Options: analogous (±30°), complementary (180°), triadic (120°), split-complementary (±150°)
  const colorSchemes = [
    30, // analogous 1
    -30, // analogous 2
    60, // harmonious 1
    -60, // harmonious 2
    120, // triadic 1
    -120, // triadic 2
    // 150, // split-complementary 1
    // -150, // split-complementary 2
    180, // complementary (used less frequently for pastels)
  ];

  // Extract HSL values from the base color
  const baseHSLMatch = baseColor.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  const baseHue = baseHSLMatch ? parseInt(baseHSLMatch[1]) : 0;
  const baseSaturation = baseHSLMatch ? parseInt(baseHSLMatch[2]) : 60;
  const baseLightness = baseHSLMatch ? parseInt(baseHSLMatch[3]) : 55;

  // Select a color scheme based on the hash
  const schemeOffset = colorSchemes[Math.abs(secondHash) % colorSchemes.length];

  // Create a complementary hue and adjust saturation/lightness for vibrant effect
  const secondHue = (baseHue + schemeOffset + 360) % 360;
  // Higher saturation but still balanced
  const secondSaturation = Math.min(Math.max(baseSaturation - (secondHash % 10), 75), 75); // Increased from 35-55% to 55-75%
  const secondLightness = Math.min(Math.max(baseLightness + (secondHash % 10), 60), 75); // Adjusted from 70-85% to 60-75%

  // Create second color in HSL format
  const secondColor = `hsl(${secondHue}, ${secondSaturation}%, ${secondLightness}%)`;

  const gradientString = `linear-gradient(135deg, ${baseColor}, ${secondColor})`;

  return gradientString;
};
