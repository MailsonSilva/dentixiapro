import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import path from 'path';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const message = searchParams.get('message') || 'chore: updates from git-expert';

  // Verifica se o ambiente é desenvolvimento
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Apenas em modo de desenvolvimento' }, { status: 403 });
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
      // Evita injeção de comando escapando as aspas
      const safeMessage = message.replace(/"/g, '\\"');
      command = `git commit -m "${safeMessage}"`;
    } else if (action === 'push') {
      command = 'git push';
    } else {
      return NextResponse.json({ error: 'Ação inválida. Use status, diff, add, commit ou push.' }, { status: 400 });
    }

    const output = execSync(command, { cwd: appPath, encoding: 'utf-8', stdio: 'pipe' });
    return NextResponse.json({ success: true, command, output });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message, 
      stdout: error.stdout?.toString(), 
      stderr: error.stderr?.toString() 
    }, { status: 500 });
  }
}
