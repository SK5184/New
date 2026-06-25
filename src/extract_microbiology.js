const fs = require('fs');
const readline = require('readline');

const transcriptPath = 'C:\\Users\\Quality\\.gemini\\antigravity\\brain\\4ac8ce8f-fbad-4b2a-a4e9-63cfb6f355bd\\.system_generated\\logs\\transcript_full.jsonl';

const rl = readline.createInterface({
  input: fs.createReadStream(transcriptPath),
  crlfDelay: Infinity
});

let matches = [];

rl.on('line', (line) => {
  try {
    const data = JSON.parse(line);
    if (data.type === 'VIEW_FILE' && data.content && data.content.toLowerCase().includes('microbiologydashboard.jsx')) {
      matches.push({
        step: data.step_index,
        length: data.content.length,
        content: data.content
      });
    }
  } catch (e) {
    // Ignore invalid JSON
  }
});

rl.on('close', () => {
  console.log(`Found ${matches.length} matching steps.`);
  
  // Sort matches by length descending to find the fullest view
  matches.sort((a, b) => b.length - a.length);
  
  if (matches.length > 0) {
    const best = matches[0];
    console.log(`Best match: Step ${best.step}, length ${best.length}`);
    
    // The content looks like:
    // Created At: ...
    // Completed At: ...
    // File Path: `file://...`
    // Total Lines: ...
    // Total Bytes: ...
    // Showing lines 1 to ...
    // The following code has been modified to include a line number before every line...
    // <line_number>: <original_line>
    
    // We need to parse from the line after "The following code..." or strip line numbers from the output
    const rawLines = best.content.split('\n');
    let cleanedLines = [];
    let startCollecting = false;
    
    for (const line of rawLines) {
      if (line.includes('The following code has been modified to include a line number')) {
        startCollecting = true;
        continue;
      }
      if (startCollecting) {
        // Strip the "line_number: " prefix
        const match = line.match(/^\s*(\d+):\s*(.*)$/);
        if (match) {
          cleanedLines.push(match[2]);
        } else if (line.trim() === '') {
          cleanedLines.push('');
        }
      }
    }
    
    // If the file was not shown with line numbers or if startCollecting was not triggered:
    if (cleanedLines.length === 0) {
      // Just extract everything after the headers
      cleanedLines = rawLines.filter(line => !line.startsWith('Created At:') && !line.startsWith('Completed At:') && !line.startsWith('File Path:') && !line.startsWith('Total Lines:') && !line.startsWith('Total Bytes:') && !line.startsWith('Showing lines'));
    }
    
    const finalContent = cleanedLines.join('\n');
    const outputPath = 'C:\\Users\\Quality\\.gemini\\antigravity\\scratch\\recovered_MicrobiologyDashboard.jsx';
    fs.writeFileSync(outputPath, finalContent);
    console.log(`Wrote recovered content of step ${best.step} to ${outputPath}`);
  } else {
    console.log('No matches found.');
  }
});
