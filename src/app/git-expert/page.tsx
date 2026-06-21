import { execSync } from 'child_process';
import path from 'path';

export const dynamic = 'force-dynamic';

export default async function GitExpertPage({ searchParams }: { searchParams: Promise<{ action?: string; message?: string }> }) {
  const params = await searchParams;
  const action = params.action;
  const message = params.message || 'chore: updates from git-expert';

  const appPath = path.resolve(process.cwd());
  let command = '';
  let output = '';
  let errorMsg = '';

  if (action) {
    try {
      if (action === 'status') {
        command = 'git status';
      } else if (action === 'diff') {
        command = 'git diff';
      } else if (action === 'add') {
        command = 'git add .';
      } else if (action === 'commit') {
        const safeMessage = message.replace(/"/g, '\\"');
        command = `git commit -m "${safeMessage}"`;
      } else if (action === 'push') {
        command = 'git push';
      }

      if (command) {
        output = execSync(command, { cwd: appPath, encoding: 'utf-8', stdio: 'pipe' });
      }
    } catch (e: any) {
      errorMsg = e.message;
      if (e.stderr) errorMsg += '\nSTDERR: ' + e.stderr.toString();
      if (e.stdout) output = e.stdout.toString();
    }
  }

  return (
    <div style={{ padding: 20, fontFamily: 'monospace' }}>
      <h1>Git Expert Console</h1>
      <p>CWD: {appPath}</p>
      {command && <p>Command: <code>{command}</code></p>}
      
      {errorMsg && (
        <div style={{ color: 'red', border: '1px solid red', padding: 10, margin: '10px 0' }}>
          <h3>Error</h3>
          <pre>{errorMsg}</pre>
        </div>
      )}

      {output && (
        <div style={{ color: 'green', border: '1px solid green', padding: 10, margin: '10px 0' }}>
          <h3>Output</h3>
          <pre>{output}</pre>
        </div>
      )}
      
      {!action && <p>Nenhuma ação executada. Use ?action=status|diff|add|commit|push</p>}
    </div>
  );
}
