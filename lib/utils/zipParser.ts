const AdmZip = require('adm-zip');

export interface ParsedFile {
  path: string;
  content: string;
}

const IGNORED_PATTERNS = [
  /node_modules/,
  /\.git\//,
  /dist\//,
  /build\//,
  /coverage\//,
  /\.next\//,
  /\.nuxt\//,
  /\.cache\//,
  /\.vscode\//,
  /\.idea\//,
  /\.DS_Store/,
  /\.env$/,
  /package-lock\.json$/,
  /yarn\.lock$/,
  /\.png$/, /\.jpg$/, /\.jpeg$/, /\.gif$/, /\.svg$/, /\.ico$/,
  /\.woff$/, /\.woff2$/, /\.ttf$/, /\.eot$/,
  /\.mp4$/, /\.mp3$/, /\.avi$/,
  /\.pdf$/, /\.zip$/, /\.tar$/, /\.gz$/,
];

const MAX_FILE_SIZE = 1024 * 1024; // 1MB на файл
const MAX_TOTAL_FILES = 1000;

export async function parseZipFile(buffer: Buffer): Promise<{
  files: ParsedFile[];
  tree: string;
}> {
  try {
    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries();
    
    const files: ParsedFile[] = [];
    const treePaths: string[] = [];
    
    for (const entry of zipEntries) {
      if (entry.isDirectory) {
        continue;
      }
      
      const path = entry.entryName;
      
      if (IGNORED_PATTERNS.some(pattern => pattern.test(path))) {
        continue;
      }
      
      if (entry.header.size > MAX_FILE_SIZE) {
        console.log(`⏭️  Skipping large file: ${path} (${entry.header.size} bytes)`);
        continue;
      }
      
      if (files.length >= MAX_TOTAL_FILES) {
        console.log(`⚠️  Reached max files limit (${MAX_TOTAL_FILES})`);
        break;
      }
      
      try {
        const content = entry.getData().toString('utf8');
        
        if (isTextFile(content)) {
          files.push({ path, content });
          treePaths.push(path);
        }
      } catch (err) {
        console.log(`⏭️  Skipping binary file: ${path}`);
        continue;
      }
    }
    
    const tree = treePaths.sort().join('\n');
    
    console.log(`✅ Parsed ZIP: ${files.length} files extracted`);
    
    return { files, tree };
    
  } catch (error: any) {
    throw new Error(`Failed to parse ZIP file: ${error.message}`);
  }
}

function isTextFile(content: string): boolean {
  const nullByteIndex = content.indexOf('\0');
  if (nullByteIndex !== -1 && nullByteIndex < 1000) {
    return false;
  }
  
  const textChars = content.split('').filter(char => {
    const code = char.charCodeAt(0);
    return (code >= 32 && code <= 126) || code === 9 || code === 10 || code === 13 || code > 127;
  }).length;
  
  return textChars / content.length > 0.9;
}
