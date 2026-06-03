/**
 * Theme application — write .themerc and update _config.yml
 * All theme application side effects go through here.
 */
import * as fs from 'fs';
import * as path from 'path';

export interface ApplyThemeResult {
  success: boolean;
  error?: string;
}

/**
 * Apply a theme to a project: write .themerc and update _config.yml.
 */
export function applyTheme(projectRoot: string, themeName: string): ApplyThemeResult {
  try {
    // Write .themerc
    fs.writeFileSync(path.join(projectRoot, '.themerc'), themeName);

    // Update _config.yml theme line if it exists
    const cfgPath = path.join(projectRoot, '_config.yml');
    if (fs.existsSync(cfgPath)) {
      let cfg = fs.readFileSync(cfgPath, 'utf-8');
      cfg = cfg.replace(/^theme:.*$/m, `theme: ${themeName}`);
      fs.writeFileSync(cfgPath, cfg);
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}