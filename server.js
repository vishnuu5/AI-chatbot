
require("dotenv").config(); 
const express = require("express"); 
const path = require("path"); 
const multer = require("multer");
const fs = require("fs"); 


const { GoogleGenerativeAI } = require("@google/generative-ai");


const app = express();

// Set up Multer for file uploads. Uploaded files will be stored in "uploads/" directory.
const uploads = multer({ dest: "uploads/" });


if (!process.env.GEMINI_API_KEY) {
  console.error("Error: env file is missing the API KEY");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Middleware to parse URL-encoded and JSON payloads
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, "public")));

// POST endpoint to handle user input and optional file upload
app.post("/get", uploads.single("file"), async (req, res) => {
  const userInput = req.body.msg; 
  const file = req.file; 

  try {
    // Get the Generative AI model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Initialize the prompt with user input
    let prompt = [userInput];

    // If a file is uploaded, read its contents and prepare it as inline image data
    if (file) {
      const fileData = fs.readFileSync(file.path); // Read file from the temporary location
      const image = {
        inlineData: {
          data: fileData.toString("base64"), // Convert file data to Base64
          mimeType: file.mimetype, // Specify the MIME type of the file
        },
      };
      prompt.push(image); // Append the image data to the prompt
    }

    // Generate content using the AI model
    const response = await model.generateContent(prompt);

    // Send the generated text response to the client
    res.send(response.response.text());
  } catch (error) {
    console.error("Error generating response: ", error); // Log any errors
    res.status(500).send("An error occurred while generating the response");
  } finally {
    // Cleanup: Delete the uploaded file to free up space
    if (file) {
      fs.unlinkSync(file.path);
    }
  }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
