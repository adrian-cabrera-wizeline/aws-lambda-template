const fs = require('fs');

// Read all input from the pipe (stdin)
const chunks = [];
process.stdin.on('data', chunk => chunks.push(chunk));

process.stdin.on('end', () => {
  const input = Buffer.concat(chunks).toString();
  
  // Find the JSON. It's usually the last line.
  // We split by newline and try to parse backwards until we find the response.
  const lines = input.trim().split('\n');
  let data = null;

  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const candidate = JSON.parse(lines[i]);
      // Simple check: API Gateway responses usually have 'statusCode'
      if (candidate.statusCode) {
        data = candidate;
        break;
      }
    } catch (e) {

    }
  }

  if (!data) {
    console.error("Could not find valid JSON response in output.");
    console.log(input);
    process.exit(1);
  }


  if (data.body && typeof data.body === 'string') {
    try {
      data.body = JSON.parse(data.body);
    } catch (e) {

    }
  }

  // 3. Output clean, pretty JSON
  console.log(JSON.stringify(data, null, 2));
});