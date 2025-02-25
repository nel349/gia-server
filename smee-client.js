import SmeeClient from "smee-client";
import process from "node:process";

const NODE_ENV = process.env.NODE_ENV;

// Only start smee client if in development mode
if (NODE_ENV === "development") {
    const smee = new SmeeClient({
        source: "https://smee.io/W3smMl5p3K6fVLqR",
        target: "http://localhost:3000/api/webhook",
        logger: console,
    });

    smee.start();
    console.log("Smee client started for local development");
} else {
    console.log("Smee client not started for production environment");
    console.log(`Set NODE_ENV=development to start the smee client`);
    console.log(`Command: export NODE_ENV=development`);
}
