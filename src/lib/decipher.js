export async function printGridFromGoogleDoc(url) {
  function getTextUrl(docUrl) {
    if (docUrl.includes('output=txt')) return docUrl;
    if (docUrl.includes('?')) return `${docUrl}&output=txt`;
    return `${docUrl}?output=txt`;
  }

  function decodeHtmlEntities(text) {
    return text
      .replace(/&nbsp;/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
  }

  function extractLines(rawText) {
    const withoutScriptsAndStyles = rawText
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '');
    return withoutScriptsAndStyles
      .replace(/<[^>]+>/g, '\n')
      .split('\n')
      .map((line) => decodeHtmlEntities(line.trim()))
      .filter(Boolean);
  }

  async function fetchDocumentText(docUrl) {
    const urlsToTry = [getTextUrl(docUrl), docUrl];
    let lastError = '';
    for (const candidateUrl of urlsToTry) {
      try {
        const response = await fetch(candidateUrl);
        if (!response.ok) {
          lastError = `Request failed with status ${response.status}`;
          continue;
        }
        return await response.text();
      } catch (error) {
        lastError =
          error instanceof Error ? error.message : 'Unknown fetch error';
      }
      throw new Error(lastError || 'Unable to fetch document');
    }
  }

  const rawText = await fetchDocumentText(url);
  const lines = extractLines(rawText);

  const xHeaderIndex = lines.findIndex(
    (line) => line.toLowerCase() === 'x-coordinate',
  );

  if (xHeaderIndex === -1) {
    throw new Error('Could not find x-coordinate header');
  }

  const dataStartIndex = xHeaderIndex + 3;

  const grid = new Map();

  let maxX = 0;
  let maxY = 0;

  for (let i = dataStartIndex; i < lines.length; i += 3) {
    const xValue = lines[i];
    const character = lines[i + 1];
    const yValue = lines[i + 2];

    if (
      xValue === undefined ||
      character === undefined ||
      yValue === undefined
    ) {
      continue;
    }

    const x = Number(xValue);
    const y = Number(yValue);

    if (!Number.isInteger(x) || !Number.isInteger(y)) {
      continue;
    }

    grid.set(`${x},${y}`, character);

    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }

  const rows = [];

  for (let y = 0; y <= maxY; y++) {
    let row = '';
    for (let x = 0; x <= maxX; x++) {
      row += grid.get(`${x},${y}`) ?? ' ';
    }
    rows.push(row);
  }
  return rows.join('\n');
}
