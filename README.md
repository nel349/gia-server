# Git Issue Agent

Git issue agent helps you resolve your issues based on your code repository. It works like a Jr developer who can read your code and help you resolve your issues. It works as a product developer who can recommend changes based on your code. It works as a product manager who can help you prioritize your issues. It works as a project manager who can help you manage your issues. It works as a QA who can help you test your code. It works as a designer who can help you design your code. It works as a technical writer who can help you write your code. It works as a technical lead who can help you lead your code. It works as a senior developer who can help you develop your code.

## Requirements

- **Node.js**: Version 20 or higher is required to run this application. You can download it from [nodejs.org](https://nodejs.org/).

- **GitHub App**: You need to create a GitHub App with the following configurations:
  - **Subscribed Events**: Ensure the app is subscribed to the following events:
    - **Pull Request**: To handle pull request events.
    - **Issues**: To handle issue events.
    - **Issue Comment**: To handle comments on issues.
  - **Permissions**:
    - **Pull requests**: Read & write
    - **Metadata**: Read-only
    - **Issues**: Read & write

- **Environment Variables**: Set up a `.env` file in the root of your project with the following variables:
  - `APP_ID`: Your GitHub App's ID.
  - `PRIVATE_KEY_PATH`: Path to your GitHub App's private key file.
  - `WEBHOOK_SECRET`: Your GitHub App's webhook secret.
  - `ENTERPRISE_HOSTNAME` (optional): If using GitHub Enterprise, set this to your enterprise hostname.
  - `PORT` (optional): The port your server will listen on (default is 3000).

- **Local Development Tunnel**: For local development, use a tunneling service to expose your local server to the internet. Options include:
  - [Smee](https://smee.io/)
  - [Ngrok](https://ngrok.com/)
  - [Cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/tunnel-guide/local/)

- **Dependencies**: Ensure all necessary npm packages are installed by running `npm install` in your project directory.

## Setup

1. Clone this repository.
2. Create a `.env` file similar to `.env.example` and set actual values. If you are using GitHub Enterprise Server, also include a `ENTERPRISE_HOSTNAME` variable and set the value to the name of your GitHub Enterprise Server instance.
3. Install dependencies with `npm install`.
4. Start the server with `npm run server`.
5. Ensure your server is reachable from the internet.
    - If you're using `smee`, run `smee -u <smee_url> -t http://localhost:3000/api/webhook`.
6. Ensure your GitHub App includes at least one repository on its installations.

## Usage

With your server running, you can now create a pull request on any repository that
your app can access. GitHub will emit a `pull_request.opened` event and will deliver
the corresponding Webhook [payload](https://docs.github.com/webhooks-and-events/webhooks/webhook-events-and-payloads#pull_request) to your server.

The server in this example listens for `pull_request.opened` events and acts on
them by creating a comment on the pull request, with the message in `message.md`,
using the [octokit.js rest methods](https://github.com/octokit/octokit.js#octokitrest-endpoint-methods).

## Security considerations

To keep things simple, this example reads the `GITHUB_APP_PRIVATE_KEY` from the
environment. A more secure and recommended approach is to use a secrets management system
like [Vault](https://www.vaultproject.io/use-cases/key-management), or one offered
by major cloud providers:
[Azure Key Vault](https://learn.microsoft.com/en-us/azure/key-vault/secrets/quick-create-node?tabs=windows),
[AWS Secrets Manager](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-secrets-manager/),
[Google Secret Manager](https://cloud.google.com/nodejs/docs/reference/secret-manager/latest),
etc.
