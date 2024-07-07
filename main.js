const Ffmpeg = require('fluent-ffmpeg');
const fs = require('fs/promises');
const extractFrames = require('ffmpeg-extract-frames');
var path = require('path');
import { log } from 'console';
import logger from './logger.js';
const { exec } = require('child_process');
const sharp = require('sharp');
const { promisify } = require('util');
const execAsync = promisify(exec);

const videoDirectory = '/mnt/f';
const screenshotOutputDirectory = '/mnt/c/git/LocalWeb/screenshots';
const previewOutputDirectory = '/mnt/c/git/LocalWeb/previews';
const framesPerVideo = 16;

async function processVideos() {
    logger.info('Processing videos...');
    let files = await fs.readdir(videoDirectory);
    const mp4Files = files.filter(file => file.endsWith('.mp4'));
    for (const file of mp4Files) {
        let isFileProcessed = await checkIfFileIsProcessed(file);
        if (isFileProcessed) {
            continue;
        } else {
            await processFile(file);
        }
    }
}

async function processFile(file) {
    const cleanFile = removeFileExtension(file);
    logger.info(`Processing file: ${file}`);

    let length = await getVideoLength(`${videoDirectory}/${file}`); 

    let offsets = buildOffsetsList(length);

    let screenshotPaths = await getVideoScreenshots(offsets, cleanFile);
    let imageDimensions = await getImageDimensions(screenshotPaths[0]);
    let previewPath = await getVideoPreview(screenshotPaths, cleanFile, imageDimensions);

    buildAndAddFileObject(file, screenshotPaths, previewPath);
}

async function buildAndAddFileObject(file, screenshotPaths, previewPath) {
    try {
        let processedFiles = await getProcessedFilesObject();

        let fileObj = {
            file: file,
            screenshots: screenshotPaths,
            preview: previewPath,
            categories: []
        };

        processedFiles.processedFiles[file] = fileObj;

        logger.debug(`Added file object for ${file}: ${fileObj}`);

        await fs.writeFile('processed_files.json', JSON.stringify(processedFiles, null, 2), 'utf8');
    } catch (error) {
        console.error('Failed to update processed files:', error);
    }
}

async function getProcessedFilesObject() {
    let json = {};
    try {
        let data = await fs.readFile('processed_files.json', 'utf8');
        if (!data) {
            await fs.writeFile('processed_files.json', JSON.stringify({ processedFiles: {} }));
            data = '{ "processedFiles": {} }'; 
            logger.debug(`Initialized processed files object: ${data}`);
        }
        json = JSON.parse(data);
        logger.debug("Found processedFiles object: ", json.processedFiles); 
    } catch (err) {
        await fs.writeFile('processed_files.json', JSON.stringify({ processedFiles: {} }));
        console.error('Error processing the JSON file:', err);
    }
    return json;
}

async function getVideoScreenshots(offsets, file) {
    let screenshots = [];
    for (const offset of offsets) {
        const outputPath = `${screenshotOutputDirectory}/${file}_${offset}.jpg`;
        screenshots.push(outputPath);
        const command = `ffmpeg -ss ${offset} -i ${videoDirectory}/${file}.mp4 -frames:v 1 ${outputPath}`;
        logger.debug(`Executing command: ${command}`);
        await execAsync(command, { maxBuffer: 1024 * 1024 * 100 });
    }
    logger.debug(`Screenshots for ${file}: ${screenshots}`);
    return screenshots;
}

function getImageDimensions(imagePath) {
    return sharp(imagePath)
        .metadata()
        .then(metadata => {
            logger.debug(`Image dimensions: ${metadata.width}x${metadata.height}`);
            return {
                width: metadata.width,
                height: metadata.height
            };
        })
        .catch(err => {
            console.error('Error retrieving image metadata:', err);
            throw err;
        });
}

function getVideoPreview(imagePaths, file, imageDimensions) {
    const originalWidth = imageDimensions.width; // Original width of the images
    const cropWidth = originalWidth / 2; // Crop to the left half
    const height = 500;  // Height of each image in the grid after cropping and resizing
    const width = 500;  // Width of each image in the grid after cropping and resizing
    const gridWidth = 4; // Number of images per row
    const outputPath = `${previewOutputDirectory}/${file}_preview.png`; // Path to save the generated grid
    logger.info(`Generating preview for ${file}...`);
    logger.debug(`Preview for ${file} will be saved at: ${outputPath}`);

    const imagePromises = imagePaths.map(path =>
        sharp(path)
            .extract({ width: cropWidth, height: imageDimensions.height, left: 0, top: 0 }) // Crop to the left half
            .resize(width, height) // Resize the cropped image
            .toBuffer()
    );

    return Promise.all(imagePromises)
        .then(images => {
            const compositeOptions = images.map((img, index) => {
                const row = Math.floor(index / gridWidth);
                const col = index % gridWidth;
                return {
                    input: img,
                    left: col * width,
                    top: row * height
                };
            });

            return sharp({
                create: {
                    width: width * gridWidth,
                    height: height * gridWidth,
                    channels: 4,
                    background: { r: 255, g: 255, b: 255, alpha: 1 }
                }
            })
            .composite(compositeOptions)
            .toFile(outputPath);
        })
        .then(() => outputPath) // Return the path to the generated image
        .catch(err => {
            console.error('Error creating grid image:', err);
            throw err; // Propagate error if something goes wrong
        });
}

function removeFileExtension(filename) {
    const lastIndex = filename.lastIndexOf('.');
    
    // Check if there is a period and it's not at the start of the filename
    if (lastIndex > 0) {
        return filename.slice(0, lastIndex);
    }
    
    // Return the original filename if no period was found, or it was at the start
    return filename;
}

async function checkIfFileIsProcessed(file) {
    let object = await getProcessedFilesObject();
    let processedFiles = object.processedFiles;
    for (const key in processedFiles) {
        if (processedFiles.hasOwnProperty(key)) {
          if (key === file) {
            logger.info(`File ${file} is already processed. Skipping...`);
            return true;
          }
        }
    }
    logger.info(`File ${file} is not processed. Processing...`);
    return false;
}

function setCategories(videoPath, categories) {
    video = {
        path: videoPath,
        categories: categories
    }
    return video;
}

function getVideoLength(videoPath) {
    return new Promise((resolve, reject) => {
        Ffmpeg.ffprobe(videoPath, (err, metadata) => {
            if (err) {
                reject(err);
            } else {
                let length = metadata.format.duration;
                logger.debug(`Video length: ${length}`);
                resolve(length);
            }
        });
    });
}

function buildOffsetsList(length) {
    let offsets = [];
    let increment = Math.floor(length / framesPerVideo);
    for (let i = 1; i < framesPerVideo + 1; i++) {
        offsets.push(i * increment);
    }
    logger.debug(`Offsets: ${offsets}`);
    return offsets;
}

// checkIfFileIsProcessed('a_lasting_impression_newts_HD__p_badoinkvr__180_lr.mp4');
processVideos();