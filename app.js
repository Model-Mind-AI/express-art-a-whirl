const express = require('express');
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

const app = express();
const port = 3000;

// Ensure the images folder and JSON file exist
const imagesFolder = path.join(__dirname, 'images');
const jsonFile = path.join(__dirname, 'images.json');

fs.ensureDirSync(imagesFolder);
fs.ensureFileSync(jsonFile);

// Middleware to parse JSON requests
app.use(express.json());

// saveImage endpoint
app.post('/saveImage', async (req, res) => {
    const { imageUrl } = req.body;
    if (!imageUrl) {
        return res.status(400).send('Image URL is required');
    }

    try {
        // Download the image
        const response = await axios({
            url: imageUrl,
            responseType: 'stream',
        });

        // Generate a unique filename
        const timestamp = new Date().toISOString();
        const filename = `${timestamp}.jpg`;
        const filepath = path.join(imagesFolder, filename);

        // Save the image to the images folder
        const writer = fs.createWriteStream(filepath);
        response.data.pipe(writer);

        writer.on('finish', async () => {
            // Update the JSON file with the image URL and timestamp
            const imagesData = await fs.readJson(jsonFile, { throws: false }) || [];
            imagesData.push({ url: imageUrl, timestamp });
            await fs.writeJson(jsonFile, imagesData);

            res.status(200).send('Image saved successfully');
        });

        writer.on('error', (err) => {
            res.status(500).send('Error saving the image');
        });
    } catch (error) {
        res.status(500).send('Error downloading the image');
    }
});

// getLastImages endpoint
app.get('/getLastImages', async (req, res) => {
    const { count } = req.query;
    const numImages = parseInt(count, 10);

    if (isNaN(numImages) || numImages <= 0) {
        return res.status(400).send('Invalid count parameter');
    }

    try {
        const imagesData = await fs.readJson(jsonFile, { throws: false }) || [];
        const sortedImages = imagesData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        const lastImages = sortedImages.slice(0, numImages);

        res.status(200).json(lastImages);
    } catch (error) {
        res.status(500).send('Error retrieving images');
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
