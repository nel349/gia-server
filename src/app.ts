import dotenv from 'dotenv'
import fs from 'node:fs'
import http from 'node:http'
import { Octokit, App } from 'octokit'
import { createNodeMiddleware } from '@octokit/webhooks'
import process from "node:process";

(async () => {
  // Load environment variables from .env file
  dotenv.config()

  // Set configured values
  const appId: string = process.env.APP_ID || ''
  const privateKeyPath: string = process.env.PRIVATE_KEY_PATH || ''
  const privateKey: string = fs.readFileSync(privateKeyPath, 'utf8')
  const secret: string = process.env.WEBHOOK_SECRET || ''
  const enterpriseHostname: string | undefined = process.env.ENTERPRISE_HOSTNAME
  const messageForNewPRs: string = fs.readFileSync('./message.md', 'utf8')

  // Create an authenticated Octokit client authenticated as a GitHub App
  const app = new App({
    appId,
    privateKey,
    webhooks: {
      secret
    },
    ...(enterpriseHostname && {
      Octokit: Octokit.defaults({
        baseUrl: `https://${enterpriseHostname}/api/v3`
      })
    })
  })

  // Optional: Get & log the authenticated app's name
  const { data } = await app.octokit.request('/app')

  // Read more about custom logging: https://github.com/octokit/core.js#logging
  app.octokit.log.debug(`Authenticated as '${data.name}'`)

  // Subscribe to the "pull_request.opened" webhook event
  app.webhooks.on('pull_request.opened', async ({ octokit, payload }) => {
    console.log(`Received a pull request event for #${payload.pull_request.number}`)
    try {
      await octokit.rest.issues.createComment({
        owner: payload.repository.owner.login,
        repo: payload.repository.name,
        issue_number: payload.pull_request.number,
        body: messageForNewPRs
      })
    } catch (error: any) {
      if (error.response) {
        console.error(`Error! Status: ${error.response.status}. Message: ${error.response.data.message}`)
      } else {
        console.error(error)
      }
    }
  })

  // subscribe to issue opened and also any comments added to the issue
  app.webhooks.on('issues.opened', ({ octokit, payload }) => {
    console.log(`Received an issue opened event for #${payload.issue.number}`)
  })

  // subscribe to any comments added to any issue
  app.webhooks.on('issue_comment.created', ({ octokit, payload }) => {
    console.log(`Received an issue comment event for #${payload.issue.number}`)
    console.log(`Comment: ${payload.comment.body}`)
  })

  // Optional: Handle errors
  app.webhooks.onError((error: any) => {
    if (error.name === 'AggregateError') {
      // Log Secret verification errors
      console.log(`Error processing request: ${error.event}`)
    } else {
      console.log(error)
    }
  })

  // Launch a web server to listen for GitHub webhooks
  const port: number = parseInt(process.env.PORT || '3000', 10)
  const path: string = '/api/webhook'
  const localWebhookUrl: string = `http://localhost:${port}${path}`

  // See https://github.com/octokit/webhooks.js/#createnodemiddleware for all options
  const middleware = createNodeMiddleware(app.webhooks, { path })

  http.createServer(middleware).listen(port, () => {
    console.log(`Server is listening for events at: ${localWebhookUrl}`)
    console.log('Press Ctrl + C to quit.')
  })
})() 