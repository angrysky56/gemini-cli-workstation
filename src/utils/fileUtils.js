export async function readJsonFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error('No file provided.'));
    }

    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const text = event.target.result;
        if (text === null || typeof text !== 'string') {
          return reject(new Error('File content is not a string.'));
        }
        const json = JSON.parse(text);
        resolve(json);
      } catch (error) {
        reject(new Error(`Failed to parse JSON: ${error.message}`));
      }
    };

    reader.onerror = (event) => {
      reject(new Error(`File reading error: ${event.target.error || 'Unknown file reading error'}`));
    };

    reader.onabort = () => {
        reject(new Error('File reading was aborted.'));
    };

    try {
        reader.readAsText(file);
    } catch (error) {
        reject(new Error(`Error initiating file read: ${error.message}`));
    }
  });
}
