const express = require("express");

const app = express();
const PORT = 3000;

app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        message: "Welcome to UniCrate API",
        status: "running"
    });
});

app.listen(PORT, () => {
    console.log(`UniCrate server running at http://localhost:${PORT}`);
});