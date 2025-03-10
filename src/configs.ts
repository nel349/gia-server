/**
 *  This is a configuration file for the Git Issue Agent.
 *  It contains network configartions such local network URL and github enterprise URL.
 */

import process from "node:process";
import dotenv from "dotenv";

dotenv.config();

/**
 *  This is a configuration object for the Git Issue Agent.
 *  It contains the local network URL and the GitHub enterprise URL.
 */
const AGENT_NETWORK_CONFIG = {
    LOCAL_NETWORK_URL: process.env.LOCAL_NETWORK_URL || "http://localhost:8000",
    GITHUB_ENTERPRISE_URL: process.env.GITHUB_ENTERPRISE_URL || "",
};

export const currentNetworkConfig = AGENT_NETWORK_CONFIG;
export const currentNetworkConfigURL =
    AGENT_NETWORK_CONFIG.GITHUB_ENTERPRISE_URL && AGENT_NETWORK_CONFIG.GITHUB_ENTERPRISE_URL.trim() !== ""
        ? AGENT_NETWORK_CONFIG.GITHUB_ENTERPRISE_URL
        : AGENT_NETWORK_CONFIG.LOCAL_NETWORK_URL;
