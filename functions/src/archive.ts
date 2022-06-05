import axios from "axios";
import * as moment from "moment";

import * as functions from "firebase-functions";
const WAYBACK_SAVE_URL = "https://web.archive.org/save";

const wait = function (ms = 1000) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};

const checkJobCompletion = async (jobId: string) => {
  const statusResp = await axios.get(`${WAYBACK_SAVE_URL}/status/${jobId}`);
  if (statusResp.data.status === "success") {
    return statusResp.data.timestamp;
  } else if (statusResp.data.status === "error") {
    throw new Error(statusResp.data.status_ext);
  }
  return false;
};

const pollForCaptureCompletion = async (jobId: string) => {
  let result = await checkJobCompletion(jobId);
  while (!result) {
    console.log("polling...");
    await wait(5000);
    result = await checkJobCompletion(jobId);
  }
  return result;
};

export const archive = functions
  .runWith({ timeoutSeconds: 300 }) // 5 minute timeout, WBM is slooow
  .https.onRequest(async (req, res) => {
    const secret = process.env.WAYBACK;
    const HEADERS = {
      Accept: "application/json",
      Authorization: `LOW ${secret}`,
    };
    const url = req.body.url;
    let archiveUrl;

    // Check if the URL was already archived by the Wayback Machine relatively recently
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
        archiveUrl = closest.url;
      }
    }

    // Archive the URL if it's not archived, or if the archive is older than 24h
    if (!archiveUrl) {
      try {
        const archiveResp = await axios.post(
          WAYBACK_SAVE_URL,
          `url=${url}&skip_first_archive=1&js_behavior_timeout=10`,
          {
            headers: HEADERS,
            timeout: 30000,
          }
        );

        const job_id = archiveResp.data.job_id;

        const timestamp = await pollForCaptureCompletion(job_id);
        archiveUrl = `https://web.archive.org/web/${timestamp}/${url}`;

        // TODO: update entry with archive URL

        res.status(200).send(archiveUrl);
      } catch (err) {
        if (axios.isAxiosError(err)) {
          res.status(500).send(err.message);
        } else {
          res.status(500).send(err);
        }
      }
    }
    res.status(200).end();
  });
