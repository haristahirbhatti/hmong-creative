export type FontConfig = { param: string; family: string };

export const BODY_FONTS: Record<string, FontConfig> = {
  'DM Sans':           { param: 'DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700', family: "'DM Sans', 'Inter', system-ui, sans-serif" },
  'Inter':             { param: 'Inter:wght@400;500;600;700',                                  family: "'Inter', system-ui, sans-serif" },
  'Outfit':            { param: 'Outfit:wght@400;500;600;700;800',                             family: "'Outfit', system-ui, sans-serif" },
  'Poppins':           { param: 'Poppins:wght@400;500;600;700',                               family: "'Poppins', system-ui, sans-serif" },
  'Nunito':            { param: 'Nunito:wght@400;500;600;700;800',                            family: "'Nunito', system-ui, sans-serif" },
  'Roboto':            { param: 'Roboto:wght@400;500;700',                                    family: "'Roboto', system-ui, sans-serif" },
  'Plus Jakarta Sans': { param: 'Plus+Jakarta+Sans:wght@400;500;600;700',                     family: "'Plus Jakarta Sans', system-ui, sans-serif" },
};

export const HEADING_FONTS: Record<string, FontConfig> = {
  'Syne':          { param: 'Syne:wght@400;600;700;800',          family: "'Syne', 'Futura', system-ui, sans-serif" },
  'Space Grotesk': { param: 'Space+Grotesk:wght@400;500;600;700', family: "'Space Grotesk', system-ui, sans-serif" },
  'Manrope':       { param: 'Manrope:wght@400;600;700;800',       family: "'Manrope', system-ui, sans-serif" },
  'Raleway':       { param: 'Raleway:wght@400;600;700;800',       family: "'Raleway', system-ui, sans-serif" },
  'Montserrat':    { param: 'Montserrat:wght@400;600;700;800',    family: "'Montserrat', system-ui, sans-serif" },
  'Oswald':        { param: 'Oswald:wght@400;600;700',            family: "'Oswald', system-ui, sans-serif" },
};

/** Combined Google Fonts URL for all fonts — used in admin preview */
export const ALL_FONTS_PREVIEW_URL =
  'https://fonts.googleapis.com/css2?' +
  [...Object.values(BODY_FONTS), ...Object.values(HEADING_FONTS)]
    .map(f => `family=${f.param}`)
    .join('&') +
  '&display=swap';
