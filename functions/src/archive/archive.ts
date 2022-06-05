import axios from "axios";
import * as moment from "moment";

import * as functions from "firebase-functions";
import { WBMJobCompletionError } from "./errors";
const WAYBACK_SAVE_URL = "https://web.archive.org/save";

const wait = function (ms = 1000) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};

/**
 * Check the status of an ongoing capture job with ID jobId
 *
 * @param jobId Wayback Machine job ID
 * @returns {Promise<string | false>} Promise resolving to a timestamp of the completed capture, or false if the capture is still pending
 * @throws {Error} Error details of failed capture
 */
const checkJobCompletion = async (jobId: string): Promise<string | false> => {
  const statusResp = await axios.get(`${WAYBACK_SAVE_URL}/status/${jobId}`);
  if (statusResp.data.status === "success") {
    return statusResp.data.timestamp;
  } else if (statusResp.data.status === "error") {
    throw new WBMJobCompletionError(statusResp.data.status_ext);
  }
  return false;
};

/**
 * Poll for status of an ongoing capture job with ID jobId
 *
 * @param jobId Wayback Machine job ID
 * @returns {Promise<string>} Promise resolving to a timestamp of the completed capture
 * @throws {Error} Error details of failed capture
 */
const pollForCaptureCompletion = async (jobId: string): Promise<string> => {
  let result = await checkJobCompletion(jobId);
  while (!result) {
    console.log("polling...");
    await wait(5000);
    result = await checkJobCompletion(jobId);
  }
  return result;
};

/**
 * Check if there's a capture <24h old for this URL, and return it if so.
 * @param url URL to capture
 * @returns Promise<string | null> Promise resolving to the archive URL, or null if there's no capture meeting the criteria
 */
const getRecentCapture = async (url: string): Promise<string | null> => {
  try {
    const snapshotsResp = await axios.get(
      `http://archive.org/wayback/available?url=${url}`
    );
    const closest = snapshotsResp?.data?.archived_url?.closest;
    if (
      closest?.timestamp &&
      closest.status === "200" &&
      closest.available === true
    ) {
      const timestamp = moment(closest.timestamp, "YYYYMMDDhhmmss");
      if (timestamp.isAfter(moment().subtract(1, "day"))) {
        // If the snapshot is less than a day old, no need to make a new one
        return closest.url;
      }
    }
  } catch (err) {
    // If anything goes wrong, we'll just re-capture
    return null;
  }
  return null;
};

/**
 * Capture a new archived copy of this URL
 *
 * @param url URL to capture
 * @returns Promise<string> Promise resolving to the archive URL
 */
const capture = async (url: string): Promise<string> => {
  const secret = process.env.WAYBACK;
  const HEADERS = {
    Accept: "application/json",
    Authorization: `LOW ${secret}`,
  };
  const archiveResp = await axios.post(
    WAYBACK_SAVE_URL,
    `url=${url}&skip_first_archive=1&js_behavior_timeout=10`,
    {
      headers: HEADERS,
      timeout: 30000,
    }
  );

  const job_id = archiveResp.data.job_id;

  // Poll for the archive to complete
  const timestamp = await pollForCaptureCompletion(job_id);

  return `https://web.archive.org/web/${timestamp}/${url}`;
};

export const archive = functions
  .runWith({ timeoutSeconds: 300 }) // 5 minute timeout, WBM is slooow
  .https.onRequest(async (req, res) => {
    const url = req.body.url;

    // Check if the URL was already archived by the Wayback Machine relatively recently
    let archiveUrl = await getRecentCapture(url);

    // Archive the URL if there's no existing capture <24h old
    if (!archiveUrl) {
      try {
        archiveUrl = await capture(url);
      } catch (err) {
        // Return !2xx if something went wrong but we should retry
        // Return 2xx if something went wrong and we shouldn't retry
        // Pass if we captured the URL and should update the entry
      }
    }

    // Update the entry with the archive URL

    res.status(200).end();
  });
