// Fetch associated pull requests for this issue
import { graphql } from "@octokit/graphql";
import process from "node:process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Example response:
 * 

{
  "repository": {
    "issue": {
      "title": "Test issue",
      "number": 20,
      "url": "https://github.com/nel349/banana-zone/issues/20",
      "state": "OPEN",
      "linkedBranches": {
        "totalCount": 1,
        "edges": [
          {
            "node": {
              "id": "LB_kwDOqgNG-c4AeAvV",
              "ref": {
                "id": "REF_kwDOMmJOvbhyZWZzL2hlYWRzLzIwLXRlc3QtaXNzdWU",
                "name": "20-test-issue",
                "prefix": "refs/heads/"
              }
            }
          }
        ]
      }
    }
  }
}
 */

type IssueDataResponse = {
    repository: {
        issue: {
            title: string;
            number: number;
            url: string;
            state: string;
            linkedBranches: {
                totalCount: number;
                edges: Array<{
                    node: {
                        id: string;
                        ref: {
                            id: string;
                            name: string;
                            prefix: string;
                        };
                    };
                }>;
            };
        };
    };
};

/**
 * Get the associated linked branches for an issue
 * @param owner - The owner of the repository
 * @param repositoryName - The name of the repository
 * @param issueNumber - The number of the issue
 * @returns The associated linked branches array
 */
export async function getAssociatedLinkedBranches(
    owner: string,
    repositoryName: string,
    issueNumber: number
): Promise<Array<string>> {
    try {
        const graphqlWithAuth = graphql.defaults({
            headers: {
                authorization: `token ${process.env.GITHUB_TOKEN_CLASSIC}`,
            },
        });

        const query = `
            query ($owner: String!, $repo: String!, $number: Int!) {
                repository(owner: $owner, name: $repo) {
                    issue(number: $number) {
                    title
                    number
                    url
                    state
                    linkedBranches(first: 10) {
                        totalCount
                            edges {
                                node {
                                    id
                                    ref {
                                        id
                                        name
                                        prefix
                                    }
                                }
                            }
                        }
                    }
                }
            }
        `;

        const response: IssueDataResponse = await graphqlWithAuth(query, {
            owner: owner,
            repo: repositoryName,
            number: issueNumber,
        });

        const linkedBranches =
            response.repository.issue.linkedBranches.edges.map(
                (edge) => edge.node.ref.name
            );
        console.log(`Linked branches: ${linkedBranches}`);
        console.log(JSON.stringify(response, null, 2));
        return linkedBranches;
    } catch (error) {
        console.error("Error fetching associated pull requests:", error);
        return [];
    }
}

/**
 * Get welcome message for an issue
 * @returns The welcome message
 */
export function getWelcomeMessage(): string {
    // Update the message loading section
    const issueWelcomeMessage: string = fs.readFileSync(
        path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "templates", "issueWelcome.md"),
        "utf8"
    );
    return issueWelcomeMessage;
}
