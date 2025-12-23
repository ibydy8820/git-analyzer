import { Octokit } from "@octokit/rest";

export interface RepoFile {
  path: string;
  content: string;
  size: number;
  preview: string;
}

export interface RepoStructure {
  files: RepoFile[];
  totalFiles: number;
  tree: string;
  owner: string;
  repo: string;
  defaultBranch: string;
}

// Папки которые ВСЕГДА игнорируем
const IGNORED_DIRS = [
  'node_modules', 'dist', 'build', '.next', '.git', 'coverage',
  '__pycache__', '.pytest_cache', 'venv', 'env', '.venv',
  'vendor', 'target', 'out', '.turbo', '.vercel', '.cache',
  'public/assets', 'static/assets', 'assets/images', 'images',
  '.angular', '.nuxt', '.output', '.parcel-cache',
];

// Расширения файлов которые ПОЛЕЗНЫ для анализа
const VALUABLE_EXTENSIONS = [
  // JavaScript/TypeScript
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
  // Python
  '.py', '.pyw',
  // Go
  '.go',
  // Rust
  '.rs',
  // Java/Kotlin
  '.java', '.kt', '.kts',
  // Ruby
  '.rb', '.rake',
  // PHP
  '.php',
  // C/C++
  '.c', '.cpp', '.h', '.hpp', '.cc',
  // C#
  '.cs',
  // Swift
  '.swift',
  // Scala
  '.scala',
  // Elixir
  '.ex', '.exs',
  // Mobile
  '.dart', '.m', '.mm',
  // Frontend frameworks
  '.vue', '.svelte',
  // Конфиги
  '.json', '.yaml', '.yml', '.toml', '.ini', '.conf',
  '.xml', '.properties',
  // Документация
  '.md', '.txt', '.rst', '.adoc',
  // Базы данных
  '.sql', '.prisma', '.graphql', '.gql',
  // Скрипты
  '.sh', '.bash', '.zsh', '.fish', '.ps1',
  // HTML/CSS
  '.html', '.htm', '.css', '.scss', '.sass', '.less',
  // Конфиг файлы без расширения
  'Dockerfile', 'Makefile', 'Rakefile', 'Procfile',
  '.gitignore', '.dockerignore', '.editorconfig',
];

// Файлы которые ВСЕГДА пропускаем
const IGNORED_EXTENSIONS = [
  // Медиа
  '.jpg', '.jpeg', '.png', '.gif', '.svg', '.ico', '.webp', '.avif', '.bmp',
  '.mp4', '.mp3', '.wav', '.avi', '.mov', '.flv', '.webm',
  // Шрифты
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  // Архивы
  '.zip', '.tar', '.gz', '.rar', '.7z', '.bz2', '.xz',
  // Документы
  '.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx',
  // Бинарники
  '.exe', '.dll', '.so', '.dylib', '.bin', '.jar', '.war',
  // Lock файлы
  '.lock', '-lock.json', '-lock.yaml',
  // Минифицированные
  '.min.js', '.min.css', '.bundle.js', '.chunk.js',
  // Source maps
  '.map',
];

function isValuableFile(path: string): boolean {
  const lower = path.toLowerCase();
  const filename = path.split('/').pop() || '';
  
  // Проверяем игнорируемые директории
  const pathParts = path.split('/');
  if (IGNORED_DIRS.some(dir => pathParts.includes(dir))) {
    return false;
  }
  
  // Проверяем игнорируемые расширения
  if (IGNORED_EXTENSIONS.some(ext => lower.endsWith(ext))) {
    return false;
  }
  
  // Проверяем ценные расширения
  if (VALUABLE_EXTENSIONS.some(ext => {
    if (ext.startsWith('.')) {
      return lower.endsWith(ext);
    } else {
      return filename === ext || filename.startsWith(ext);
    }
  })) {
    return true;
  }
  
  return false;
}

export async function fetchRepoStructure(
  repoUrl: string,
  accessToken?: string
): Promise<RepoStructure> {
  const octokit = new Octokit({ auth: accessToken });

  const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!match) {
    throw new Error('Invalid GitHub URL');
  }

  const [, owner, repoName] = match;
  const repo = repoName.replace(/\.git$/, '');

  console.log(`📦 Fetching repo: ${owner}/${repo}`);

  const { data: repoData } = await octokit.repos.get({ owner, repo });
  const defaultBranch = repoData.default_branch;

  const { data: treeData } = await octokit.git.getTree({
    owner,
    repo,
    tree_sha: defaultBranch,
    recursive: 'true',
  });

  console.log(`📂 Total files in repo: ${treeData.tree.length}`);

  // Фильтруем по расширениям - мгновенно!
  const valuableFilePaths: string[] = [];
  
  for (const item of treeData.tree) {
    if (item.type !== 'blob' || !item.path) continue;
    
    if (isValuableFile(item.path)) {
      valuableFilePaths.push(item.path);
    }
  }

  console.log(`📊 Filtered: ${valuableFilePaths.length} valuable files (from ${treeData.tree.length} total)`);
  console.log(`⚡ Downloading content (batches of 100)...`);

  const files: RepoFile[] = [];
  const batchSize = 100;

  for (let i = 0; i < valuableFilePaths.length; i += batchSize) {
    const batch = valuableFilePaths.slice(i, i + batchSize);
    
    const batchResults = await Promise.allSettled(
      batch.map(async (path) => {
        try {
          const { data: fileData } = await octokit.repos.getContent({
            owner,
            repo,
            path,
          });

          if ('content' in fileData && fileData.content) {
            const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
            const lines = content.split('\n');
            const preview = lines.slice(0, 200).join('\n');

            return { path, content, size: fileData.size, preview };
          }
        } catch (error: any) {
          return null;
        }
      })
    );

    batchResults.forEach((result) => {
      if (result.status === 'fulfilled' && result.value) {
        files.push(result.value);
      }
    });

    console.log(`  ✅ Downloaded ${files.length}/${valuableFilePaths.length} files`);
  }

  console.log(`✅ Total files ready for analysis: ${files.length}`);

  const tree = generateTree(files.map(f => f.path));

  return {
    files,
    totalFiles: files.length,
    tree,
    owner,
    repo,
    defaultBranch,
  };
}

function generateTree(paths: string[]): string {
  const tree: Record<string, any> = {};

  paths.forEach(path => {
    const parts = path.split('/');
    let current = tree;

    parts.forEach((part, i) => {
      if (i === parts.length - 1) {
        current[part] = null;
      } else {
        if (!current[part]) current[part] = {};
        current = current[part];
      }
    });
  });

  return JSON.stringify(tree, null, 2);
}

export async function getUserGithubToken(userId: string): Promise<string | null> {
  const { prisma } = await import('@/lib/db/prisma');
  
  const account = await prisma.account.findFirst({
    where: {
      userId,
      provider: 'github',
    },
    select: {
      access_token: true,
    },
  });

  return account?.access_token || null;
}
