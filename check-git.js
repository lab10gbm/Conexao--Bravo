import { execSync } from 'child_process';

try {
  const log = execSync('git log -n 5 --pretty=format:"%h %ad | %s%d [%an]" --date=iso').toString();
  console.log("GIT LOG:", log);
  
  const diff = execSync('git diff HEAD~1 firebase-applet-config.json').toString();
  console.log("DIFF:", diff.substring(0, 500));
} catch(e) {
  console.error("No git history", e);
}
