import * as path from 'path';

export const HEALTH_BASE_URL = 'health';

/**
 * Root path for disk space checks. `/` is invalid on Windows (needs e.g. `C:\`).
 * Override with env `HEALTH_DISK_PATH` when needed (e.g. `D:\`).
 */
export function getDefaultDiskHealthPath(): string {
  if (process.platform === 'win32') {
    const root = path.parse(process.cwd()).root;
    return root || 'C:\\';
  }
  return '/';
}

export const HEALTH_INDICATORS = {
  connectivity: {
    database: {
      name: 'mongodb',
      timeout: 5000,
    },
  },
  memory: {
    heap: {
      name: 'memory_heap',
      threshold: 300 * 1024 * 1024,
    },
    rss: {
      name: 'memory_rss',
      threshold: 500 * 1024 * 1024,
    },
    diskAbsolute: {
      name: 'storage',
      threshold: 100 * 1024 * 1024 * 1024,
    },
    diskPercentage: {
      name: 'storage_percent',
      threshold: 0.8,
    },
  },
};
