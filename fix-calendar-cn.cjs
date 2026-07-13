const fs = require('fs');
let content = fs.readFileSync('src/components/CalendarHighlights.tsx', 'utf8');

// Insert import
content = content.replace(
    /import \{ getAlaForDate \} from '\.\.\/lib\/utils';/,
    "import { getAlaForDate, cn } from '../lib/utils';"
);

fs.writeFileSync('src/components/CalendarHighlights.tsx', content);
