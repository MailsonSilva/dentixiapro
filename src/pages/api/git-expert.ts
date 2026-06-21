import type { NextApiRequest, NextApiResponse } from 'next';
import { execSync } from 'child_process';
import path from 'path';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { action, message } = req.query;
  const commitMessage = (message as string) || 'chore: updates from git-expert';

  // Apenas desenvolvimento
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ error: 'Apenas em modo de desenvolvimento' });
  }

  const appPath = path.resolve(process.cwd());

  try {
    let command = '';
    if (action === 'status') {
      command = 'git status';
    } else if (action === 'diff') {
      command = 'git diff';
    } else if (action === 'add') {
      command = 'git add .';
    } else if (action === 'commit') {
      const safeMessage = commitMessage.replace(/"/g, '\\"');
      command = `git commit -m "${safeMessage}"`;
    } else if (action === 'push') {
      command = 'git push';
    } else {
      return res.status(400).json({ error: 'Ação inválida. Use status, diff, add, commit ou push.' });
    }

    const output = execSync(command, { cwd: appPath, encoding: 'utf-8', stdio: 'pipe' });
    return res.status(200).json({ success: true, command, output });
  } catch (error: any) {
    return res.status(500).json({ 
      success: false, 
      error: error.message, 
      stdout: error.stdout?.toString(), 
      stderr: error.stderr?.toString() 
    });
  }
}
