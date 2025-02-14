import dotenv from "dotenv";
import fs from "node:fs";
import http from "node:http";
import { Octokit, App } from "octokit";
import { createNodeMiddleware, EmitterWebhookEvent } from "@octokit/webhooks";
import process from "node:process";

// Load environment variables from .env file
dotenv.config();

// Set configured values
const appId: string = process.env.APP_ID || "";
const privateKeyPath: string = process.env.PRIVATE_KEY_PATH || "";
const privateKey: string = fs.readFileSync(privateKeyPath, "utf8");
const secret: string = process.env.WEBHOOK_SECRET || "";
const enterpriseHostname: string | undefined = process.env.ENTERPRISE_HOSTNAME;
const messageForNewPRs: string = fs.readFileSync("./message.md", "utf8");

// Create app configuration
const appConfig = {
    appId,
    privateKey,
    webhooks: {
        secret,
    },
    ...(enterpriseHostname && {
        Octokit: Octokit.defaults({
            baseUrl: `https://${enterpriseHostname}/api/v3`,
        }),
    }),
};

// Create an authenticated Octokit client
const app = new App(appConfig);

// Configure webhook handlers
async function configureWebhooks() {
    // Get & log the authenticated app's name
    const { data } = await app.octokit.request("/app");
    app.octokit.log.debug(`Authenticated as '${data.name}'`);

    app.webhooks.on("pull_request.opened", async ({ octokit, payload }) => {
        console.log(
            `Received a pull request event for #${payload.pull_request.number}`
        );
        try {
            await octokit.rest.issues.createComment({
                owner: payload.repository.owner.login,
                repo: payload.repository.name,
                issue_number: payload.pull_request.number,
                body: messageForNewPRs,
            });
        } catch (error: unknown) {
            if (error && typeof error === "object" && "response" in error) {
                const apiError = error as {
                    response: { status: number; data: { message: string } };
                };
                console.error(
                    `Error! Status: ${apiError.response.status}. Message: ${apiError.response.data.message}`
                );
            } else {
                console.error("An unknown error occurred");
            }
        }
    });

    app.webhooks.on("issues.opened", ({ octokit, payload }) => {
        console.log(
            `Received an issue opened event for #${payload.issue.number}`
        );

        // use octokit to create a comment on the issue
        octokit.rest.issues.createComment({
            owner: payload.repository.owner.login,
            repo: payload.repository.name,
            issue_number: payload.issue.number,
            body: "This is an initial comment",
        });
    });
    // monitor if the comment has "@git-issue-agent"
    app.webhooks.on("issue_comment.created", ({ octokit, payload }) => {
      console.log(
          `Received an issue comment event for #${payload.issue.number}`
      );
      console.log(`Comment: ${payload.comment.body}`);

      // Ignore comments made by the bot itself
      if (payload.comment.user.type === "Bot") {
          return;
        }

        // Check for the mention and respond
        if (payload.comment.body.includes("@git-issue-agent")) {
            console.log("Received a comment with @git-issue-agent");

          // Create quoted response by adding '>' before each line
          const originalComment = payload.comment.body;
          const quotedComment = originalComment
              .split("\n")
              .map((line) => `> ${line}`)
              .join("\n");

          const responseBody = `${quotedComment}\n\nThis is a response to the comment`;
          // use octokit to respond to the comment
          octokit.rest.issues.createComment({
              owner: payload.repository.owner.login,
              repo: payload.repository.name,
              issue_number: payload.issue.number,
              body: responseBody,
          });
      }
  });

    app.webhooks.onError((error: Error & { event?: EmitterWebhookEvent }) => {
        if (error.name === "AggregateError") {
            console.log(`Error processing request: ${error.event}`);
        } else {
            console.log(error);
        }
    });
}

// Start the server
function startServer() {
    const port: number = parseInt(process.env.PORT || "3000", 10);
    const path: string = "/api/webhook";
    const localWebhookUrl: string = `http://localhost:${port}${path}`;

    const middleware = createNodeMiddleware(app.webhooks, { path });

    http.createServer(middleware).listen(port, () => {
        console.log(`Server is listening for events at: ${localWebhookUrl}`);
        console.log("Press Ctrl + C to quit.");
    });
}

// Initialize the application
async function init() {
    try {
        await configureWebhooks();
        startServer();
    } catch (error) {
        console.error("Failed to initialize the application:", error);
        process.exit(1);
    }
}

// Start the application
init();
