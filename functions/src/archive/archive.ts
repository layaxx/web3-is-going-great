import axios from "axios";
import * as moment from "moment";

import { firestore } from "../config/firebase";
import * as functions from "firebase-functions";
import { CloudTasksClient, protos } from "@google-cloud/tasks";

import { WBMJobCompletionError } from "./errors";

const WAYBACK_SAVE_URL = "https://web.archive.org/save";

type ArchiveRequestBody = {
  url: string;
  id: string;
  linkIndex: number;
};

type UpdateDocumentResponse = {
  success: boolean;
  message?: string;
  errorDetails?: string;
};

const wait = function (ms = 1000) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
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
        console.log("Recent capture found", closest.url);
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
 * Check the status of an ongoing capture job with ID jobId
 *
 * @param jobId Wayback Machine job ID
 * @returns {Promise<string | false>} Promise resolving to a timestamp of the completed capture, or false if the capture is still pending
 * @throws {WBMJobCompletionError} Error details of failed capture
 */
const checkJobCompletion = async (jobId: string): Promise<string | false> => {
  const statusResp = await axios.get(`${WAYBACK_SAVE_URL}/status/${jobId}`);
  if (statusResp.data.status === "success") {
    console.log("Capture success");
    return statusResp.data.timestamp;
  } else if (statusResp.data.status === "error") {
    console.log("Capture error");
    throw new WBMJobCompletionError(statusResp.data.status_ext);
  }
  console.log("Capture pending");
  return false;
};

/**
 * Poll for status of an ongoing capture job with ID jobId
 *
 * @param jobId Wayback Machine job ID
 * @returns {Promise<string>} Promise resolving to a timestamp of the completed capture
 * @throws {WBMJobCompletionError} Error details of failed capture
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
 * Capture a new archived copy of this URL
 *
 * @param url URL to capture
 * @returns Promise<string> Promise resolving to the archive URL
 * @throws {WBMJobCompletionError} Error details of failed capture
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

  console.log("Capture job:", job_id);
  // Poll for the archive to complete
  const timestamp = await pollForCaptureCompletion(job_id);

  return `https://web.archive.org/web/${timestamp}/${url}`;
};

const updateEntryWithArchivedUrl = async (
  archivedUrl: string,
  requestBody: ArchiveRequestBody
): Promise<UpdateDocumentResponse> => {
  try {
    const { id, linkIndex } = requestBody;
    const collection = await firestore.collection("entries");
    const documentRef = collection.doc(id);
    const document = (await documentRef.get()).data();
    if (document) {
      const links = document.links;
      if (links.length > linkIndex) {
        links[linkIndex].archiveHref = archivedUrl;
        if ("archiveTaskQueued" in links[linkIndex]) {
          delete links[linkIndex].archiveTaskQueued;
        }
        await documentRef.update({ links });
        return { success: true };
      } else {
        return {
          success: false,
          message: `Link index to update was out of range. ID: ${id}, index: ${linkIndex}`,
        };
      }
    } else {
      return {
        success: false,
        message: `Document to update couldn't be found. ID: ${id}`,
      };
    }
  } catch (err) {
    return {
      success: false,
      message: "Something went wrong trying to update the document.",
      errorDetails: err instanceof Error ? err.message : String(err),
    };
  }
};

/**
 * Either retrieve an existing, recent archive of a given URL or create a new one.
 * This is triggered from the task queue and shouldn't be invoked directly.
 */
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
        if (err instanceof WBMJobCompletionError) {
          if (err.isRetryable) {
            // On non-2xx status codes, Task Queues will retry
            res.status(500).send({
              error: err.message,
            });
          } else {
            // This sucks, but anything outside of the 2xx range will cause the task to be retried,
            // which we don't want if we already know retries will fail.
            res.status(200).send({ success: false });
          }
        } else if (axios.isAxiosError(err)) {
          res
            .status(500)
            .send({ error: err.response || err.request || err.message });
        } else {
          res.status(500).send({ error: err });
        }
        return;
      }
    }

    // Update the entry with the archive URL
    const updateResponse = await updateEntryWithArchivedUrl(
      archiveUrl,
      req.body
    );
    console.log(updateResponse);

    res.status(200).send(updateResponse);
  });

const enqueueTask = async (payload: ArchiveRequestBody): Promise<null> => {
  const client = new CloudTasksClient();
  const parent = client.queuePath(
    "web3-334501",
    "us-central1",
    "archive-queue"
  );
  const task = {
    appEngineHttpRequest: {
      httpMethod: protos.google.cloud.tasks.v2.HttpMethod.POST,
      relativeUri: "/archive",
      body: Buffer.from(JSON.stringify(payload)).toString("base64"),
    },
  };
  const [response] = await client.createTask({ parent, task });
  console.log(`Created task ${response.name}`);
  return null;
};

/**
 * Anytime an entry is written, check if a URL needs archiving and add it to the task queue if so.
 */
export const enqueueArchiveTasks = functions.firestore
  .document("/entries/{docId}")
  .onWrite(async (change) => {
    if (change.after.exists) {
      const afterChangeData =
        change.after.data() as FirebaseFirestore.DocumentData; // Already did exists check above
      let shouldWriteChangesToDb = false; // Flag to mark if any changes need to be written

      if ("links" in afterChangeData && afterChangeData.links.length > 0) {
        const linksCopy = JSON.parse(JSON.stringify(afterChangeData.links));
        for (let i = 0; i < afterChangeData.links.length; i++) {
          const link = afterChangeData.links[i];
          if (!link.archiveHref && !link.archiveTaskQueued) {
            // Enqueue task
            const payload = {
              url: link.href,
              id: afterChangeData.id,
              linkIndex: i,
            };
            await enqueueTask(payload);

            // Mark that there is a task queued for this link
            linksCopy[i].archiveTaskQueued = true;
            shouldWriteChangesToDb = true;
          }
        }

        if (shouldWriteChangesToDb) {
          await change.after.ref.update({ links: linksCopy });
        }
      }
    } else {
      // Document deleted, no archiving needed.
      // TODO (?) Remove queued archive tasks for this document
    }
  });
