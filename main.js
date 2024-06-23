const Ffmpeg = require('fluent-ffmpeg');
const fs = require('fs/promises');
const extractFrames = require('ffmpeg-extract-frames');
var path = require('path');
const logger = require('./logger');
const { exec } = require('child_process');
const sharp = require('sharp');

const videoDirectory = '/mnt/e/test';
const outputDirectory = '/mnt/e/previews'; 
const framesPerVideo = 16;

async function processVideos() {
    let files = await fs.readdir(videoDirectory);
    for (const file of files) {
        await checkIfFileIsProcessed(file);
        await sleep(2000);
    }
}

async function extractImages() {
    let files = fs.readdirSync(videoDirectory);

    for (const file of files) {
        await checkIfFileIsProcessed(file);
        logger.debug(`Processing file: ${file}`);
        let length = await getVideoLength(`${videoDirectory}/${file}`); 
        logger.debug(`Video length: ${length}`);
        let offsets = buildOffsetsList(length);
        logger.debug(`Offsets: ${offsets}`);
        let outputFiles = [];


        for (const offset of offsets) {
            const outputPath = `${outputDirectory}/${file}_${offset}.jpg`;
            outputFiles.push(outputPath);
            // const command = `ffmpeg -ss ${offset} -i ${videoDirectory}/${file} -frames:v 1 ${outputPath}`;   
            // await executeCommand(command);
        }
        let fileObj = {
            file: file,
            screenshots: outputFiles,
            categories: []
        };
        await processFile(fileObj);
        // makeImageGrid(outputFiles, outputDirectory)
    }
}

async function processFile(file) {
    logger.debug(`Processing file: ${file.file}`);
}

async function checkIfFileIsProcessed(file) {
    logger.debug(`Checking if file is processed: ${file}`);
    await fs.readFile('processed_files.json').then(buffer => {
        const data = buffer.toString('utf8');
        if (!data) {
            logger.debug('JSON file is empty. Initializing with default structure.');
            fs.writeFile('processed_files.json', JSON.stringify({ processedFiles: {} }));
            data = '{}';
        }
        const json = JSON.parse(data);
        logger.debug('JSON file contents:', json);
    }).catch(err => {
        console.log('Error reading or writing JSON file:', err);
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function executeCommand(command) {
    try {
        const {stdout, stderr } = await execPromisify(command);
        if (stderr) {
            console.error('stderr:', stderr);
        }
        await checkFileExists(outputPath);
    } catch (error) {
        
    }
}

async function checkFileExists(filePath) {
    try {
        await fs.access(filePath);
        logger.debug(`File exists at ${filePath}`);
    } catch (error) {
        console.error(`File does not exist at ${filePath}:`, error);
    }
}

async function makeImageGrid(imagePaths, outputDirectory) {
    let outputFilesLength = fs.readdirSync(outputDirectory).length;
    logger.debug(`Output files length: ${outputFilesLength}`);
    // await while (files.length !== framesPerVideo) {
        
    // }
    // if (imagePaths.length !== 16) {
    //     throw new Error('Exactly 16 image paths are required.');
    // }

    // const imageWidth = 200; // Width of each image in the grid
    // const imageHeight = 200; // Height of each image in the grid
    // const gridWidth = 4; // Number of images per row

    // // Load all images and resize them
    // const images = await Promise.all(
    //     imagePaths.map(path => sharp(path).resize(imageWidth, imageHeight).toBuffer())
    // );

    // // Create a blank image to hold the grid
    // const grid = sharp({
    //     create: {
    //         width: imageWidth * gridWidth,
    //         height: imageHeight * gridWidth,
    //         channels: 4,
    //         background: { r: 255, g: 255, b: 255, alpha: 1 } // white background
    //     }
    // });

    // // Composite images onto the blank grid
    // const composite = [];
    // images.forEach((img, index) => {
    //     const x = (index % gridWidth) * imageWidth;
    //     const y = Math.floor(index / gridWidth) * imageHeight;
    //     composite.push({
    //         input: img,
    //         top: y,
    //         left: x
    //     });
    // });

    // // Combine the images on the grid and save the output
    // await grid
    //     .composite(composite)
    //     .toFile(outputFilePath);

    // console.log('Grid image created successfully:', outputFilePath);
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
    return offsets;
}

processVideos();