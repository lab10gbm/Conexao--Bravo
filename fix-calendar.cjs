const fs = require('fs');
let content = fs.readFileSync('src/components/CalendarHighlights.tsx', 'utf8');

// Insert import
content = content.replace(
    /import \{ useAppConfig \} from '\.\.\/contexts\/ConfigContext';/,
    "import { useAppConfig } from '../contexts/ConfigContext';\nimport { getAlaForDate } from '../lib/utils';"
);

fs.writeFileSync('src/components/CalendarHighlights.tsx', content);
