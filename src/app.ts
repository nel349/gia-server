import dotenv from "dotenv";
import fs from "node:fs";
import http from "node:http";
import { Octokit, App } from "octokit";
import { createNodeMiddleware, EmitterWebhookEvent } from "@octokit/webhooks";
import process from "node:process";
import { AgentResponse } from "./models/AgentResponse.ts";
import { currentNetworkConfigURL } from "./configs.ts";
import { getIssueContext, getWelcomeMessage } from "./issues/helpers.ts";

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

// Health check function
function healthcheck() {
    return {
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || 'unknown'
    };
}

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
            body: getWelcomeMessage(),
        });
    });
    // monitor if the comment has "@git-issue-agent"
    app.webhooks.on("issue_comment.created", async ({ octokit, payload }) => {
        console.log(
            `Received an issue comment event for #${payload.issue.number}`
        );
        console.log(`Comment: ${payload.comment.body}`);

        // Get current repository name
        const repositoryName = payload.repository.name;
        console.log(`Repository name: ${repositoryName}`);

        // Get current branch name
        // const branchName = payload.repository.default_branch;
        // console.log(`Branch name: ${branchName}`);

        const issueContext = await getIssueContext(
            octokit,
            payload.repository.owner.login,
            repositoryName,
            payload.issue.number
        );
        // console.log(`Issue context: ${issueContext}`);

        // Ignore comments made by the bot itself
        if (payload.comment.user.type === "Bot") {
            return;
        }

        // Check for various trigger patterns
        const triggerPatterns = ["@gia", "@git-issue-agent", "/gia", "/ask"];

        const commentLower = payload.comment.body.toLowerCase();
        const isTriggerFound = triggerPatterns.some((pattern) =>
            commentLower.includes(pattern.toLowerCase())
        );

        // Check for the mention and respond
        if (isTriggerFound) {
            console.log("Received trigger command");

            // Create quoted response by adding '>' before each line
            const originalComment = payload.comment.body;
            const quotedComment = originalComment
                .split("\n")
                .map((line) => `> ${line}`)
                .join("\n");

            let responseMessage: AgentResponse = {
                response: "",
                chat_history: [],
            };

            try {
                // make call to agent api
                const response = await fetch(
                    `${currentNetworkConfigURL}/agent/chat`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            message: originalComment,
                            chat_history: [],
                            initial_state: {
                                user_name: payload.comment.user.login,
                                repository_name: repositoryName,
                                issue_context: issueContext,
                            },
                        }),
                    }
                );

                console.log("Response:", response);
                responseMessage = (await response.json()) as AgentResponse;
            } catch (error) {
                console.error("Error calling agent API:", error);
                responseMessage.response = `Error calling agent API: ${error}`;
            }

            const responseBody = `${quotedComment}\n\n${responseMessage.response}`;
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
    // Update this line to use the actual host from environment or default to 0.0.0.0
    const host: string = process.env.HOST || "0.0.0.0";
    const localWebhookUrl: string = `http://${host}:${port}${path}`;

    const middleware = createNodeMiddleware(app.webhooks, { path });

    const server = http.createServer((req, res) => {
        // Handle healthcheck endpoint
        if (req.url === '/healthcheck' || req.url === '/health') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(healthcheck()));
            return;
        }
        
        // Pass all other requests to the webhook middleware
        middleware(req, res);
    });

    server.listen(port, host, () => {
        console.log(`Server is listening for events at: ${localWebhookUrl}`);
        console.log(`Healthcheck available at: ${localWebhookUrl}/healthcheck`);
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
