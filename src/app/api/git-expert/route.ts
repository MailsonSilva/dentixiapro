import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const message = searchParams.get('message') || 'chore: updates from git-expert';
  const files = searchParams.get('files') || '.';

  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Apenas em desenvolvimento' }, { status: 403 });
  }

  // Resolve os caminhos absolutos para o repositório Git
  const repoPath = 'd:\\m_fer\\Documents\\DaLua Apps\\SISTEMAS\\PRODUCAO\\DentixiaPro\\app';
  const gitDir = path.join(repoPath, '.git');

  // Limpa variáveis de ambiente do Git para evitar conflitos da IDE/Next.js
  const cleanEnv = { ...process.env };
  Object.keys(cleanEnv).forEach(key => {
    if (key.startsWith('GIT_')) {
      delete cleanEnv[key];
    }
  });

  try {
    let command = '';
    const gitBase = `git --git-dir="${gitDir}" --work-tree="${repoPath}"`;

    if (action === 'status') {
      command = `${gitBase} status`;
    } else if (action === 'diff') {
      command = `${gitBase} diff`;
    } else if (action === 'add') {
      // Força a inclusão de todos os arquivos modificados/deletados
      command = `${gitBase} add -A`;
    } else if (action === 'commit') {
      const safeMessage = message.replace(/"/g, '\\"');
      command = `${gitBase} commit -m "${safeMessage}"`;
    } else if (action === 'push') {
      command = `${gitBase} push`;
    } else {
      return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
    }

    const output = execSync(command, { 
      cwd: repoPath, 
      env: cleanEnv,
      encoding: 'utf-8', 
      stdio: 'pipe' 
    });
    return NextResponse.json({ success: true, command, cwd: repoPath, output });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      command: error.cmd,
      cwd: repoPath,
      error: error.message, 
      stdout: error.stdout?.toString(), 
      stderr: error.stderr?.toString() 
    }, { status: 200 });
  }
}
