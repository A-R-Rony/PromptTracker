import open from 'open';

export function openFileInEditor(filePath: string): void {
  open(filePath, { app: { name: ['code', 'code-insiders'] } }).catch(() => {
    open(filePath).catch(() => {});
  });
}
