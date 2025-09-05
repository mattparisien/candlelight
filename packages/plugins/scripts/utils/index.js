const fs = require("fs");
const path = require("path");

const getCommandLineArgs = () => {
  return process.argv.slice(2);
};

const getCommandLineArg = () => {
  if (index < 0) {
    console.error("Please provide a non-negative index.");
    return undefined;
  }

  const adjustedIndex = index + 2;

  if (adjustedIndex >= process.argv.length) {
    console.error("The specified index is out of range.");
    return undefined;
  }

  return process.argv[adjustedIndex];
};

const writeFile = (path, content) => {
  fs.writeFile(path, content, (err) => {
    if (err) {
      console.error("Error writing file:", err);
      process.exit(1);
    }
    console.log(`File has been saved as ${path}`);
  });
};

const appendToFile = (filePath, content) => {
  fs.appendFile(filePath, content, (err) => {
    if (err) {
      console.error(`Error appending to file: ${err}`);
      return;
    }
    console.log("Content successfully appended to file.");
  });
};

const appendToIndexFile = (fileName, filePath) => {
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      console.error(`Error reading file: ${err}`);
      return;
    }

    // Construct the import statement
    const importStatement = `import ${fileName} from "./${fileName}";\n`;

    // Insert the import statement at the beginning
    let newData = importStatement + data;

    // Construct the new export statement
    const exportRegex = /export { ([\s\S]*?) };/;
    const match = newData.match(exportRegex);

    if (match) {
      // Extract existing exports and add the new one
      const existingExports = match[1].split(",").map((e) => e.trim());
      existingExports.push(fileName);
      const newExports = `export { ${existingExports.join(", ")} };`;

      // Replace the old export statement with the new one
      newData = newData.replace(exportRegex, newExports);
    } else {
      // If the export statement does not exist, create a new one.
      newData += `\nexport { ${fileName} };`;
    }

    // Write the updated content back to the file
    fs.writeFile(filePath, newData, "utf8", (err) => {
      if (err) {
        console.error(`Error writing file: ${err}`);
        return;
      }
      console.log(
        `${fileName} has been successfully added to the index file.`
      );
    });
  });
};

const createDirectory = async (path) => {
  return await fs.mkdirSync(path, { recursive: true });
};

module.exports = {
  getCommandLineArg,
  getCommandLineArgs,
  writeFile,
  appendToFile,
  appendToIndexFile,
  createDirectory,
};
